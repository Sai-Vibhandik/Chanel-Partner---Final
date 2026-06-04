import PartnerCompany from '../models/PartnerCompany.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import AgreementTemplate from '../models/AgreementTemplate.js';
import AgreementSignature from '../models/AgreementSignature.js';
import Visit from '../models/Visit.js';
import Commission from '../models/Commission.js';
import { ApiError } from '../middlewares/error.middleware.js';
import { sendPartnershipApprovedEmail } from '../services/email.service.js';
import { createNotification, createNotificationsForRecipients } from './notification.controller.js';
import { checkAllRequiredAgreementsSigned, getPendingAgreementNames } from '../utils/agreementValidation.js';
import { logActivity, getRequestMetadata, ActionTypes, ResourceTypes } from '../services/activityLog.service.js';

/**
 * @desc    Partner applies to join a company
 * @route   POST /api/partner-company/apply
 * @access  Private (Partner only)
 */
export const applyToCompany = async (req, res, next) => {
  try {
    const { companyId, regions } = req.body;
    const partnerId = req.user._id;

    // Verify user is a partner
    if (req.user.role !== 'partner') {
      throw new ApiError(403, 'Only partners can apply to companies');
    }

    // Check if company exists and is active
    const company = await Company.findById(companyId);
    if (!company) {
      throw new ApiError(404, 'Company not found');
    }
    if (company.status !== 'active') {
      throw new ApiError(400, 'This company is not accepting applications at this time');
    }

    // Check if company has active subscription
    const subscriptionStatus = company.subscription?.status;
    if (subscriptionStatus !== 'active') {
      throw new ApiError(400, 'This company is not accepting applications at this time');
    }

    // Validate regions - partner can only select regions the company operates in
    const companyRegions = company.regions || ['india'];
    let partnerRegions = [];

    if (regions && Array.isArray(regions) && regions.length > 0) {
      // Validate each selected region is within company's regions
      for (const region of regions) {
        if (!companyRegions.includes(region)) {
          throw new ApiError(400, `Invalid region selected. Company does not operate in ${region}`);
        }
      }
      partnerRegions = regions;
    } else {
      // Default to company's first region if none selected
      partnerRegions = [companyRegions[0]];
    }

    // Check if already applied/joined
    const existing = await PartnerCompany.findOne({ partnerId, companyId });
    if (existing) {
      throw new ApiError(400, 'You have already applied to this company');
    }

    // Create partnership
    const partnership = await PartnerCompany.create({
      partnerId,
      companyId,
      status: 'pending',
      tier: 'bronze',
      regions: partnerRegions
    });

    // Get partner details for notification
    const partner = await User.findById(partnerId).select('firstName lastName email');
    const partnerName = partner ? `${partner.firstName} ${partner.lastName}` : 'A partner';

    // Notify company admins and partner managers about the new application
    const companyAdmins = await User.find({
      companyId,
      role: { $in: ['company_superadmin', 'partner_manager'] },
      isActive: true
    }).select('_id');

    if (companyAdmins.length > 0) {
      const recipientIds = companyAdmins.map(admin => admin._id);
      await createNotificationsForRecipients({
        recipientIds,
        type: 'partnership_application',
        title: 'New Partner Application',
        message: `${partnerName} has applied to join your company as a partner. Review and approve their application.`,
        data: {
          partnershipId: partnership._id,
          companyId: company._id,
          partnerId: partnerId
        },
        link: '/company/partners'
      });
    }

    // Populate details
    await partnership.populate('companyId', 'name slug');

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: { partnership }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get partner's companies (companies the partner has joined/applied to)
 * @route   GET /api/partner-company/my-companies
 * @access  Private (Partner only)
 */
export const getMyCompanies = async (req, res, next) => {
  try {
    const partnerId = req.user._id;

    const partnerships = await PartnerCompany.find({ partnerId })
      .populate('companyId', 'name slug logo regions address settings.tierPercentages subscription')
      .sort({ createdAt: -1 });

    // Check for unsigned agreements and subscription status for each partnership
    const now = new Date();
    const partnershipsAgreements = await Promise.all(
      partnerships.map(async (partnership) => {
        // Get all required agreement templates for this company
        const templates = await AgreementTemplate.find({
          companyId: partnership.companyId._id,
          isActive: true,
          isRequired: true
        }).select('_id type version');

        // Get all signatures for this partnership (including expired ones from old versions)
        const allSignatures = await AgreementSignature.find({
          partnershipId: partnership._id
        }).select('agreementTemplateId version status');

        // Check if any required agreement is unsigned or needs re-signing
        const hasUnsignedAgreements = templates.some(template => {
          // Check if there's a valid signature for this exact template version
          const hasValidSignature = allSignatures.some(
            signed => signed.agreementTemplateId.toString() === template._id.toString() &&
                     signed.status === 'signed'
          );

          if (hasValidSignature) {
            return false; // Has valid signature, no need to sign
          }

          // Check if there's any signature for this template (even expired)
          const hasAnySignature = allSignatures.some(
            signed => signed.agreementTemplateId.toString() === template._id.toString()
          );

          // If no signature at all, needs to sign
          // If has signature but not valid (expired), needs to re-sign
          return true;
        });

        // Check company subscription status
        const company = partnership.companyId;
        const subscriptionStatus = company.subscription?.status;
        const hasActiveSubscription = subscriptionStatus === 'active';

        return {
          ...partnership.toObject(),
          hasUnsignedAgreements,
          companySubscriptionActive: hasActiveSubscription
        };
      })
    );

    res.status(200).json({
      success: true,
      data: { partnerships: partnershipsAgreements }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get company's partners (for Partner Manager)
 * @route   GET /api/partner-company/company/:companyId/partners
 * @access  Private (Partner Manager, Company SuperAdmin)
 */
export const getCompanyPartners = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { status, tier, kycStatus, search, page = 1, limit = 10 } = req.query;

    // Verify access
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== companyId) {
      throw new ApiError(403, 'Access denied');
    }

    // Build query
    const query = { companyId };

    if (status) {
      query.status = status;
    }
    if (tier) {
      query.tier = tier;
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await PartnerCompany.countDocuments(query);

    const partnerships = await PartnerCompany.find(query)
      .populate('partnerId', 'firstName lastName email phone avatar partnerProfile')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Filter by search if provided
    let filteredPartnerships = partnerships;
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filteredPartnerships = partnerships.filter(p =>
        searchRegex.test(p.partnerId?.firstName) ||
        searchRegex.test(p.partnerId?.lastName) ||
        searchRegex.test(p.partnerId?.email)
      );
    }

    // Filter by KYC status if provided
    if (kycStatus) {
      filteredPartnerships = filteredPartnerships.filter(p => p.kycStatus === kycStatus);
    }

    res.status(200).json({
      success: true,
      data: {
        partnerships: filteredPartnerships,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get partnership details
 * @route   GET /api/partner-company/:id
 * @access  Private
 */
export const getPartnership = async (req, res, next) => {
  try {
    const { id } = req.params;

    const partnership = await PartnerCompany.findById(id)
      .populate('partnerId', 'firstName lastName email phone avatar partnerProfile')
      .populate('companyId', 'name slug logo regions address settings.tierPercentages')
      .populate('approvedBy', 'firstName lastName');

    if (!partnership) {
      throw new ApiError(404, 'Partnership not found');
    }

    // Verify access
    const isPartner = req.user._id.toString() === partnership.partnerId._id.toString();
    const isCompanyStaff = req.user.companyId?.toString() === partnership.companyId._id.toString() &&
                          ['company_superadmin', 'partner_manager', 'finance_manager'].includes(req.user.role);
    const isPlatformAdmin = req.user.role === 'platform_admin';

    if (!isPartner && !isCompanyStaff && !isPlatformAdmin) {
      throw new ApiError(403, 'Access denied');
    }

    res.status(200).json({
      success: true,
      data: { partnership }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update partnership status (approve/reject/suspend)
 * @route   PUT /api/partner-company/:id/status
 * @access  Private (Partner Manager, Company SuperAdmin)
 */
export const updatePartnershipStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const partnership = await PartnerCompany.findById(id)
      .populate('companyId')
      .populate('partnerId');

    if (!partnership) {
      throw new ApiError(404, 'Partnership not found');
    }

    // Verify access
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== partnership.companyId._id.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Status options: pending -> active/rejected, active -> suspended
    const validStatuses = ['pending', 'active', 'suspended', 'rejected'];
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, 'Invalid status. Use: pending, active, suspended, or rejected');
    }

    // Check if all required agreements are signed before approving to active status
    if (status === 'active' && partnership.status !== 'active') {
      const agreementCheck = await checkAllRequiredAgreementsSigned(
        partnership._id,
        partnership.companyId._id
      );

      if (!agreementCheck.allSigned) {
        const pendingNames = getPendingAgreementNames(agreementCheck.pendingAgreements);
        throw new ApiError(
          400,
          `Cannot approve partnership. Partner must sign the following required agreements: ${pendingNames}. ` +
          `Signed: ${agreementCheck.signedCount}/${agreementCheck.totalCount}`
        );
      }
    }

    const previousStatus = partnership.status;

    // Update status
    partnership.status = status;

    // Only set approvedAt if it's not already set (first-time approval)
    // This preserves the original approval date even if partner is suspended and reactivated
    if (status === 'active' && !partnership.approvedAt) {
      partnership.approvedAt = new Date();
      partnership.approvedBy = req.user._id;
    }

    // Store rejection reason when rejecting
    if (status === 'rejected' && reason) {
      partnership.rejectionReason = reason;
    }

    if (reason) {
      partnership.adminNotes = reason;
    }

    await partnership.save();

    // Send approval email to partner when partnership is approved (non-blocking)
    if (status === 'active' && previousStatus === 'pending') {
      // Send email in background (non-blocking for faster response)
      sendPartnershipApprovedEmail(
        partnership.partnerId,
        partnership.companyId,
        partnership.tier
      ).catch(emailError => {
        console.error('Failed to send partnership approval email:', emailError);
      });

      // Create notification for partner (non-blocking)
      createNotification({
        recipientId: partnership.partnerId._id,
        type: 'partnership_approved',
        title: 'Partnership Approved',
        message: `Your partnership with ${partnership.companyId?.name || 'the company'} has been approved! You can now access properties and book visits.`,
        data: {
          partnershipId: partnership._id,
          companyId: partnership.companyId
        },
        link: '/partner/my-companies'
      }).catch(err => {
        console.error('Failed to create partnership approval notification:', err.message);
      });
    }

    // Send notification when partner is rejected
    if (status === 'rejected' && previousStatus === 'pending') {
      createNotification({
        recipientId: partnership.partnerId._id,
        type: 'partnership_rejected',
        title: 'Partnership Application Rejected',
        message: `Your partnership application with ${partnership.companyId?.name || 'the company'} has been rejected. ${reason ? `Reason: ${reason}` : ''}`,
        data: {
          partnershipId: partnership._id,
          companyId: partnership.companyId
        },
        link: '/partner/my-companies'
      }).catch(err => {
        console.error('Failed to create partnership rejection notification:', err.message);
      });
    }

    // Send notification when status changes to pending (from active/suspended)
    if (status === 'pending' && previousStatus !== 'pending') {
      createNotification({
        recipientId: partnership.partnerId._id,
        type: 'partnership_pending',
        title: 'Partnership Status Updated',
        message: `Your partnership with ${partnership.companyId?.name || 'the company'} has been set to pending. ${reason ? `Reason: ${reason}` : 'Please wait for approval.'}`,
        data: {
          partnershipId: partnership._id,
          companyId: partnership.companyId
        },
        link: '/partner/my-companies'
      }).catch(err => {
        console.error('Failed to create partnership pending notification:', err.message);
      });
    }

    // Create notification for partnership suspension
    if (status === 'suspended' && previousStatus === 'active') {
      createNotification({
        recipientId: partnership.partnerId._id,
        type: 'partnership_suspended',
        title: 'Partnership Suspended',
        message: `Your partnership with ${partnership.companyId?.name || 'the company'} has been suspended. ${reason ? `Reason: ${reason}` : ''}`,
        data: {
          partnershipId: partnership._id,
          companyId: partnership.companyId
        },
        link: '/partner/my-companies'
      }).catch(err => {
        console.error('Failed to create partnership suspension notification:', err.message);
      });
    }

    // Create notification for partnership reactivation (from suspended to active)
    if (status === 'active' && previousStatus === 'suspended') {
      createNotification({
        recipientId: partnership.partnerId._id,
        type: 'partnership_reactivated',
        title: 'Partnership Reactivated',
        message: `Your partnership with ${partnership.companyId?.name || 'the company'} has been reactivated. ${reason ? `Note: ${reason}` : 'You can now access properties and book visits.'}`,
        data: {
          partnershipId: partnership._id,
          companyId: partnership.companyId
        },
        link: '/partner/my-companies'
      }).catch(err => {
        console.error('Failed to create partnership reactivation notification:', err.message);
      });
    }

    // Create notification for general status changes (with note)
    if (reason && status !== 'pending' && previousStatus === status) {
      createNotification({
        recipientId: partnership.partnerId._id,
        type: 'partnership_update',
        title: 'Partnership Updated',
        message: `Your partnership with ${partnership.companyId?.name || 'the company'} has been updated. Note: ${reason}`,
        data: {
          partnershipId: partnership._id,
          companyId: partnership.companyId
        },
        link: '/partner/my-companies'
      }).catch(err => {
        console.error('Failed to create partnership update notification:', err.message);
      });
    }

    res.status(200).json({
      success: true,
      message: `Partnership status updated to ${status}`,
      data: { partnership }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update partnership tier
 * @route   PUT /api/partner-company/:id/tier
 * @access  Private (Partner Manager, Company SuperAdmin)
 */
export const updatePartnershipTier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tier, commissionPercentage } = req.body;

    const partnership = await PartnerCompany.findById(id);

    if (!partnership) {
      throw new ApiError(404, 'Partnership not found');
    }

    // Verify access
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== partnership.companyId.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    const validTiers = ['bronze', 'silver', 'gold', 'platinum'];
    if (!validTiers.includes(tier)) {
      throw new ApiError(400, 'Invalid tier');
    }

    partnership.tier = tier;
    if (commissionPercentage !== undefined) {
      partnership.commissionPercentage = commissionPercentage;
    }

    await partnership.save();

    res.status(200).json({
      success: true,
      message: `Tier updated to ${tier}`,
      data: { partnership }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update partner's operating regions
 * @route   PUT /api/partner-company/:id/regions
 * @access  Private (Partner - own partnership only)
 */
export const updatePartnerRegions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { regions } = req.body;

    const partnership = await PartnerCompany.findById(id)
      .populate('companyId', 'name regions');

    if (!partnership) {
      throw new ApiError(404, 'Partnership not found');
    }

    // Verify ownership
    if (req.user._id.toString() !== partnership.partnerId.toString()) {
      throw new ApiError(403, 'You can only update your own partnership');
    }

    // Validate regions
    if (!regions || !Array.isArray(regions) || regions.length === 0) {
      throw new ApiError(400, 'At least one region must be selected');
    }

    // Validate that selected regions are within company's regions
    const companyRegions = partnership.companyId.regions || ['india'];
    for (const region of regions) {
      if (!companyRegions.includes(region)) {
        throw new ApiError(400, `Invalid region: ${region}. Company does not operate in this region.`);
      }
    }

    // Update regions
    partnership.regions = regions;
    await partnership.save();

    // Populate for response
    await partnership.populate('partnerId', 'firstName lastName email');
    await partnership.populate('companyId', 'name logo regions');

    res.status(200).json({
      success: true,
      message: 'Operating regions updated successfully',
      data: { partnership }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload KYC document for a partnership
 * @route   POST /api/partner-company/:id/kyc
 * @access  Private (Partner - own partnership only)
 */
export const uploadKYCForPartnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, url, publicId, region } = req.body;

    const partnership = await PartnerCompany.findById(id);

    if (!partnership) {
      throw new ApiError(404, 'Partnership not found');
    }

    // Verify ownership
    if (req.user._id.toString() !== partnership.partnerId.toString()) {
      throw new ApiError(403, 'You can only upload documents for your own partnerships');
    }

    // Validate document type
    const validTypes = [
      'gst_certificate', 'pan_card', 'rera_certificate', 'address_proof', 'cancelled_cheque',
      'trade_license', 'rera_registration_card', 'emirates_id', 'passport_copy', 'visa_copy', 'other'
    ];
    if (!validTypes.includes(type)) {
      throw new ApiError(400, 'Invalid document type');
    }

    // Check if document of this type already exists
    const existingDocIndex = partnership.kycDocuments.findIndex(
      doc => doc.type === type && doc.region === region
    );

    const documentData = {
      type,
      url,
      publicId,
      region,
      uploadedAt: new Date(),
      status: 'pending'
    };

    if (existingDocIndex > -1) {
      // Update existing document
      partnership.kycDocuments[existingDocIndex] = documentData;
    } else {
      // Add new document
      partnership.kycDocuments.push(documentData);
    }

    // Update KYC status
    if (partnership.kycStatus === 'pending') {
      partnership.kycStatus = 'submitted';
      partnership.kycSubmittedAt = new Date();
    }

    await partnership.save();

    // Notify company admins about KYC document submission (non-blocking)
    const companyAdmins = await User.find({
      companyId: partnership.companyId,
      role: { $in: ['company_superadmin', 'partner_manager'] },
      isActive: true
    }).select('_id');

    const partner = await User.findById(partnership.partnerId).select('firstName lastName');
    const partnerName = partner ? `${partner.firstName} ${partner.lastName}` : 'Partner';

    const documentTypeNames = {
      pan_card: 'PAN Card',
      gst_certificate: 'GST Certificate',
      rera_certificate: 'RERA Certificate',
      address_proof: 'Address Proof',
      cancelled_cheque: 'Cancelled Cheque',
      trade_license: 'Trade License',
      rera_registration_card: 'RERA Registration Card',
      emirates_id: 'Emirates ID',
      passport_copy: 'Passport Copy',
      visa_copy: 'Visa Copy',
      other: 'Other Document'
    };

    // Create notifications in parallel (non-blocking)
    const adminIds = companyAdmins.map(admin => admin._id);
    if (adminIds.length > 0) {
      createNotificationsForRecipients(adminIds, {
        type: 'kyc_submitted',
        title: 'KYC Document Submitted',
        message: `${partnerName} has submitted ${documentTypeNames[type] || type} for verification.`,
        data: {
          partnershipId: partnership._id,
          companyId: partnership.companyId
        },
        link: '/partner-manager/partners'
      }).catch(err => console.error('Failed to create KYC submission notifications:', err.message));
    }

    res.status(200).json({
      success: true,
      message: 'KYC document uploaded successfully',
      data: { partnership }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get KYC summary for a partnership
 * @route   GET /api/partner-company/:id/kyc
 * @access  Private
 */
export const getKYCForPartnership = async (req, res, next) => {
  try {
    const { id } = req.params;

    const partnership = await PartnerCompany.findById(id)
      .populate('partnerId', 'firstName lastName email phone partnerProfile')
      .populate('companyId', 'name regions');

    if (!partnership) {
      throw new ApiError(404, 'Partnership not found');
    }

    // Verify access
    const isPartner = req.user._id.toString() === partnership.partnerId._id.toString();
    const isCompanyStaff = req.user.companyId?.toString() === partnership.companyId._id.toString();
    const isPlatformAdmin = req.user.role === 'platform_admin';

    if (!isPartner && !isCompanyStaff && !isPlatformAdmin) {
      throw new ApiError(403, 'Access denied');
    }

    // Get company for reference
    const company = await Company.findById(partnership.companyId._id);

    // Determine which regions to use for KYC requirements
    let partnerRegions;
    if (partnership.regions && partnership.regions.length > 0) {
      // Partner has explicitly selected their operating regions
      partnerRegions = partnership.regions;
    } else {
      // If partner hasn't set regions, infer from uploaded documents
      const uploadedDocRegions = [...new Set(
        partnership.kycDocuments
          .map(doc => doc.region)
          .filter(region => region) // Remove undefined/null
      )];

      if (uploadedDocRegions.length > 0) {
        // Use regions from uploaded documents
        partnerRegions = uploadedDocRegions;
      } else if (company?.regions && company.regions.length > 0) {
        // Legacy fallback: use first company region only
        partnerRegions = [company.regions[0]];
      } else {
        // Default fallback
        partnerRegions = ['india'];
      }
    }

    // Define required documents based on partner's selected regions
    const getRequiredDocuments = (regions) => {
      const indiaDocs = [
        { type: 'pan_card', name: 'PAN Card', region: 'india', required: true },
        { type: 'gst_certificate', name: 'GST Certificate', region: 'india', required: true },
        { type: 'address_proof', name: 'Address Proof', region: 'india', required: true },
        { type: 'cancelled_cheque', name: 'Cancelled Cheque', region: 'india', required: true },
        { type: 'rera_certificate', name: 'RERA Certificate', region: 'india', required: false }
      ];

      const dubaiDocs = [
        { type: 'trade_license', name: 'Trade License', region: 'dubai', required: true },
        { type: 'rera_registration_card', name: 'RERA Registration Card', region: 'dubai', required: true },
        { type: 'emirates_id', name: 'Emirates ID', region: 'dubai', required: true },
        { type: 'passport_copy', name: 'Passport Copy', region: 'dubai', required: true },
        { type: 'visa_copy', name: 'Visa Copy', region: 'dubai', required: false }
      ];

      if (!regions || regions.length === 0) {
        return indiaDocs; // Default to India
      }

      let requiredDocs = [];
      if (regions.includes('india')) {
        requiredDocs = [...requiredDocs, ...indiaDocs];
      }
      if (regions.includes('dubai')) {
        requiredDocs = [...requiredDocs, ...dubaiDocs];
      }

      return requiredDocs;
    };

    const requiredDocs = getRequiredDocuments(partnerRegions);

    // Populate verifiedBy for documents
    await partnership.populate('kycDocuments.verifiedBy', 'firstName lastName email');

    // Map uploaded documents
    const uploadedDocs = partnership.kycDocuments.map(doc => ({
      _id: doc._id,
      type: doc.type,
      region: doc.region,
      status: doc.status,
      uploadedAt: doc.uploadedAt,
      verifiedAt: doc.verifiedAt,
      url: doc.url,
      rejectionReason: doc.rejectionReason,
      verifiedBy: doc.verifiedBy
    }));

    // Get required document types (only required ones, not optional)
    const requiredTypes = requiredDocs.filter(d => d.required).map(d => d.type);

    // Count verified required documents (only count required docs for verification progress)
    const verifiedRequiredDocs = uploadedDocs.filter(
      doc => requiredTypes.includes(doc.type) && doc.status === 'verified'
    );

    // If partner has only one region, be flexible with region matching
    const singleRegion = partnerRegions.length === 1 ? partnerRegions[0] : null;

    // Build summary
    const summary = {
      kycStatus: partnership.kycStatus,
      totalRequired: requiredDocs.length, // Total documents (both required and optional)
      uploaded: uploadedDocs.length,
      verified: uploadedDocs.filter(d => d.status === 'verified').length, // All verified docs
      pending: uploadedDocs.filter(d => d.status === 'pending').length,
      rejected: uploadedDocs.filter(d => d.status === 'rejected').length,
      requiredDocuments: requiredDocs.map(reqDoc => {
        // Find matching document - be flexible with region for single-region companies
        let uploaded;
        if (singleRegion) {
          // Single region - match by type only, or by type and matching region
          uploaded = uploadedDocs.find(d =>
            d.type === reqDoc.type &&
            (!d.region || d.region === singleRegion)
          );
        } else {
          // Multi-region - strict matching by type and region
          uploaded = uploadedDocs.find(d => d.type === reqDoc.type && d.region === reqDoc.region);
        }
        return {
          ...reqDoc,
          uploaded: !!uploaded,
          document: uploaded || null
        };
      }),
      uploadedDocuments: uploadedDocs
    };

    // Check and correct KYC status if needed
    // If all required documents are verified but status is not 'verified', update it
    const allRequiredDocsVerified = requiredDocs.filter(d => d.required).every(reqDoc => {
      let uploaded;
      if (singleRegion) {
        uploaded = uploadedDocs.find(d =>
          d.type === reqDoc.type && d.status === 'verified' && (!d.region || d.region === singleRegion)
        );
      } else {
        uploaded = uploadedDocs.find(d =>
          d.type === reqDoc.type && d.region === reqDoc.region && d.status === 'verified'
        );
      }
      return !!uploaded;
    });

    // If all required docs are verified but status is not 'verified', update it
    if (allRequiredDocsVerified && partnership.kycStatus !== 'verified') {
      partnership.kycStatus = 'verified';
      partnership.kycVerifiedAt = partnership.kycVerifiedAt || new Date();
      await partnership.save();
      summary.kycStatus = 'verified';
    }

    res.status(200).json({
      success: true,
      data: { kycSummary: summary, partnership }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify/reject KYC document
 * @route   PUT /api/partner-company/:id/kyc/:documentId/verify
 * @access  Private (Partner Manager, Company SuperAdmin)
 */
export const verifyKYCForPartnership = async (req, res, next) => {
  try {
    const { id, documentId } = req.params;
    const { status, reason } = req.body;

    const partnership = await PartnerCompany.findById(id);

    if (!partnership) {
      throw new ApiError(404, 'Partnership not found');
    }

    // Verify access
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== partnership.companyId.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    const document = partnership.kycDocuments.find(doc => doc._id.toString() === documentId);

    if (!document) {
      throw new ApiError(404, 'Document not found');
    }

    // Update document status
    document.status = status;
    if (status === 'verified') {
      document.verifiedAt = new Date();
      document.verifiedBy = req.user._id;
    }
    if (reason) {
      document.rejectionReason = reason;
    }

    // Check if all required documents are verified based on partner's selected regions
    const company = await Company.findById(partnership.companyId);

    // Determine which regions to check for required documents
    let partnerRegions;
    if (partnership.regions && partnership.regions.length > 0) {
      // Partner has explicitly selected their operating regions
      partnerRegions = partnership.regions;
    } else {
      // If partner hasn't set regions, infer from uploaded documents
      const uploadedDocRegions = [...new Set(
        partnership.kycDocuments
          .map(doc => doc.region)
          .filter(region => region) // Remove undefined/null
      )];

      if (uploadedDocRegions.length > 0) {
        // Use regions from uploaded documents
        partnerRegions = uploadedDocRegions;
      } else if (company?.regions && company.regions.length > 0) {
        // Legacy fallback: use first company region only
        // This avoids requiring docs for all company regions when partner hasn't specified
        partnerRegions = [company.regions[0]];
      } else {
        // Default fallback
        partnerRegions = ['india'];
      }
    }

    // Define required documents per region (only required docs, matching the KYC summary)
    const requiredDocsPerRegion = {
      india: ['pan_card', 'gst_certificate', 'address_proof', 'cancelled_cheque'],
      dubai: ['trade_license', 'rera_registration_card', 'emirates_id', 'passport_copy']
    };

    // Check if all required documents for each region are verified
    let allRequiredVerified = true;

    // If partner has only one region, be flexible with region matching
    // (for backward compatibility with documents that may not have region set)
    const singleRegion = partnerRegions.length === 1 ? partnerRegions[0] : null;

    for (const region of partnerRegions) {
      const requiredTypes = requiredDocsPerRegion[region] || [];
      for (const type of requiredTypes) {
        let doc;
        if (singleRegion) {
          // Single region partner - be flexible with region matching
          // Check for document with matching type and status, regardless of region
          // OR document with matching type, region, and status
          doc = partnership.kycDocuments.find(
            d => d.type === type && d.status === 'verified' && (!d.region || d.region === singleRegion)
          );
        } else {
          // Multi-region partner - strict region matching required
          doc = partnership.kycDocuments.find(
            d => d.type === type && d.region === region && d.status === 'verified'
          );
        }
        if (!doc) {
          allRequiredVerified = false;
          break;
        }
      }
      if (!allRequiredVerified) break;
    }

    if (allRequiredVerified && partnership.kycStatus !== 'verified') {
      partnership.kycStatus = 'verified';
      partnership.kycVerifiedAt = new Date();

      // Create notification for partner - KYC fully verified
      createNotification({
        recipientId: partnership.partnerId,
        type: 'kyc_approved',
        title: 'KYC Verification Complete',
        message: `Your KYC documents have been fully verified. You can now access all features.`,
        data: {
          partnershipId: partnership._id,
          companyId: partnership.companyId
        },
        link: '/partner/my-companies'
      }).catch(err => {
        console.error('Failed to create KYC approval notification:', err.message);
      });

      // Log activity for KYC approval
      const partnerUser = await User.findById(partnership.partnerId);
      await logActivity({
        userId: req.user._id,
        companyId: partnership.companyId,
        action: ActionTypes.PARTNER_KYC_APPROVED,
        resourceType: ResourceTypes.PARTNER,
        resourceId: partnership.partnerId,
        resourceTitle: `${partnerUser?.firstName || ''} ${partnerUser?.lastName || ''}`.trim(),
        details: {
          partnerEmail: partnerUser?.email,
          partnershipId: partnership._id
        },
        ...getRequestMetadata(req)
      });
    }

    // If document was rejected, notify the partner
    if (status === 'rejected') {
      const User = (await import('../models/User.js')).default;
      const partner = await User.findById(partnership.partnerId);

      createNotification({
        recipientId: partnership.partnerId,
        type: 'kyc_rejected',
        title: 'KYC Document Rejected',
        message: `Your ${document.type.replace(/_/g, ' ')} document was rejected. ${reason ? `Reason: ${reason}` : 'Please upload a new document.'}`,
        data: {
          partnershipId: partnership._id,
          companyId: partnership.companyId
        },
        link: '/partner/my-companies'
      }).catch(err => {
        console.error('Failed to create KYC rejection notification:', err.message);
      });

      // Log activity for KYC rejection
      await logActivity({
        userId: req.user._id,
        companyId: partnership.companyId,
        action: ActionTypes.PARTNER_KYC_REJECTED,
        resourceType: ResourceTypes.PARTNER,
        resourceId: partnership.partnerId,
        resourceTitle: `${partner?.firstName || ''} ${partner?.lastName || ''}`.trim(),
        details: {
          partnerEmail: partner?.email,
          documentType: document.type,
          reason: reason || undefined
        },
        ...getRequestMetadata(req)
      });
    }

    await partnership.save();

    res.status(200).json({
      success: true,
      message: `Document ${status === 'verified' ? 'verified' : 'rejected'} successfully`,
      data: { partnership }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all pending KYC reviews for a company (Admin)
 * @route   GET /api/partner-company/kyc-reviews
 * @access  Private (Partner Manager, Company SuperAdmin)
 */
export const getKYCReviews = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const companyId = req.user.companyId;

    // Build query
    const query = { companyId };

    // Get all partnerships with their KYC documents
    const partnerships = await PartnerCompany.find(query)
      .populate('partnerId', 'firstName lastName email phone')
      .populate('companyId', 'name')
      .sort({ createdAt: -1 });

    // Filter by search if provided
    let filteredPartnerships = partnerships;
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filteredPartnerships = partnerships.filter(p =>
        searchRegex.test(p.partnerId?.firstName) ||
        searchRegex.test(p.partnerId?.lastName) ||
        searchRegex.test(p.partnerId?.email)
      );
    }

    // Get company for regions
    const company = await Company.findById(companyId);
    const regions = company?.regions || ['india'];

    // Define required documents per region
    const requiredDocsPerRegion = {
      india: [
        { type: 'pan_card', name: 'PAN Card', required: true },
        { type: 'gst_certificate', name: 'GST Certificate', required: true },
        { type: 'address_proof', name: 'Address Proof', required: true },
        { type: 'cancelled_cheque', name: 'Cancelled Cheque', required: true },
        { type: 'rera_certificate', name: 'RERA Certificate', required: false }
      ],
      dubai: [
        { type: 'trade_license', name: 'Trade License', required: true },
        { type: 'rera_registration_card', name: 'RERA Registration Card', required: true },
        { type: 'emirates_id', name: 'Emirates ID', required: true },
        { type: 'passport_copy', name: 'Passport Copy', required: true },
        { type: 'visa_copy', name: 'Visa Copy', required: false }
      ]
    };

    // Get required docs for company's regions
    let requiredDocs = [];
    for (const region of regions) {
      requiredDocs = [...requiredDocs, ...(requiredDocsPerRegion[region] || []).map(d => ({ ...d, region }))];
    }

    // Build KYC review list
    // If company has only one region, be flexible with region matching
    const singleRegion = regions.length === 1 ? regions[0] : null;

    const kycReviews = filteredPartnerships.map(partnership => {
      const partner = partnership.partnerId;
      const docs = partnership.kycDocuments || [];

      // Build document status
      const documents = requiredDocs.map(reqDoc => {
        // Find matching document - be flexible with region for single-region companies
        let uploaded;
        if (singleRegion) {
          // Single region - match by type only, or by type and matching region
          uploaded = docs.find(d =>
            d.type === reqDoc.type &&
            d.status &&
            (!d.region || d.region === singleRegion)
          );
        } else {
          // Multi-region - strict matching by type and region
          uploaded = docs.find(d => d.type === reqDoc.type && d.region === reqDoc.region);
        }

        return {
          type: reqDoc.type,
          name: reqDoc.name,
          region: reqDoc.region,
          required: reqDoc.required,
          status: uploaded?.status || 'not_uploaded',
          uploadedAt: uploaded?.uploadedAt,
          verifiedAt: uploaded?.verifiedAt,
          verifiedBy: uploaded?.verifiedBy,
          rejectionReason: uploaded?.rejectionReason,
          documentId: uploaded?._id,
          url: uploaded?.url
        };
      });

      // Count by status
      const statusCounts = {
        verified: documents.filter(d => d.status === 'verified').length,
        pending: documents.filter(d => d.status === 'pending').length,
        rejected: documents.filter(d => d.status === 'rejected').length,
        notUploaded: documents.filter(d => d.status === 'not_uploaded').length
      };

      // Calculate completion percentage
      const requiredCount = documents.filter(d => d.required).length;
      const verifiedRequired = documents.filter(d => d.required && d.status === 'verified').length;
      const completionPercentage = Math.round((verifiedRequired / requiredCount) * 100);

      return {
        partnershipId: partnership._id,
        partner: {
          _id: partner?._id,
          firstName: partner?.firstName,
          lastName: partner?.lastName,
          email: partner?.email,
          phone: partner?.phone
        },
        partnershipStatus: partnership.status,
        tier: partnership.tier,
        kycStatus: partnership.kycStatus,
        kycSubmittedAt: partnership.kycSubmittedAt,
        documents,
        statusCounts,
        completionPercentage,
        allRequiredVerified: verifiedRequired === requiredCount,
        updatedAt: partnership.updatedAt || partnership.createdAt
      };
    });

    // Filter by KYC status if provided
    let result = kycReviews;
    if (status === 'pending') {
      result = kycReviews.filter(r => r.statusCounts.pending > 0 || r.statusCounts.notUploaded > 0);
    } else if (status === 'verified') {
      result = kycReviews.filter(r => r.allRequiredVerified);
    } else if (status === 'rejected') {
      result = kycReviews.filter(r => r.statusCounts.rejected > 0);
    }

    // Calculate overall stats (before pagination)
    const overallStats = {
      total: kycReviews.length,
      pending: kycReviews.filter(r => r.statusCounts.pending > 0 || r.statusCounts.notUploaded > 0).length,
      verified: kycReviews.filter(r => r.allRequiredVerified).length,
      hasRejected: kycReviews.filter(r => r.statusCounts.rejected > 0).length
    };

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = result.length;
    const paginatedResult = result.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        reviews: paginatedResult,
        requiredDocs,
        regions,
        stats: overallStats,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Leave a company (Partner)
 * @route   DELETE /api/partner-company/:id
 * @access  Private (Partner - own partnership only)
 */
export const leaveCompany = async (req, res, next) => {
  try {
    const { id } = req.params;

    const partnership = await PartnerCompany.findById(id);

    if (!partnership) {
      throw new ApiError(404, 'Partnership not found');
    }

    // Verify ownership
    if (req.user._id.toString() !== partnership.partnerId.toString()) {
      throw new ApiError(403, 'You can only leave your own partnerships');
    }

    // Don't delete, just set status to suspended
    partnership.status = 'suspended';
    await partnership.save();

    res.status(200).json({
      success: true,
      message: 'You have left the company'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Withdraw a pending partnership request (Partner)
 * @route   DELETE /api/partner-company/:id/withdraw
 * @access  Private (Partner - own partnership only, status must be pending)
 */
export const withdrawPartnershipRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const partnership = await PartnerCompany.findById(id)
      .populate('companyId', 'name')
      .populate('partnerId', 'firstName lastName email');

    if (!partnership) {
      throw new ApiError(404, 'Partnership request not found');
    }

    // Verify ownership
    if (req.user._id.toString() !== partnership.partnerId._id.toString()) {
      throw new ApiError(403, 'You can only withdraw your own partnership requests');
    }

    // Can only withdraw pending requests
    if (partnership.status !== 'pending') {
      throw new ApiError(400, 'Can only withdraw pending partnership requests');
    }

    // Store details before deletion
    const partnerName = `${partnership.partnerId.firstName} ${partnership.partnerId.lastName}`;
    const companyName = partnership.companyId.name;
    const companyId = partnership.companyId._id;

    // Delete the partnership
    await PartnerCompany.findByIdAndDelete(id);

    // Notify company admins and partner managers about the withdrawal
    try {
      const companyAdmins = await User.find({
        companyId: companyId,
        role: { $in: ['company_superadmin', 'partner_manager'] },
        isActive: true
      }).select('_id');

      if (companyAdmins.length > 0) {
        await createNotificationsForRecipients({
          recipientIds: companyAdmins.map(admin => admin._id),
          type: 'partnership_withdrawn',
          title: 'Partnership Request Withdrawn',
          message: `${partnerName} has withdrawn their partnership request to join ${companyName}.`,
          data: {
            partnerId: partnership.partnerId._id,
            companyId: companyId
          },
          link: '/company/partners'
        });
      }
    } catch (notifyError) {
      console.error('Failed to send withdrawal notification:', notifyError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Partnership request withdrawn successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get partner performance report
 * @route   GET /api/partner-company/reports/performance
 * @access  Private (Partner Manager, Company SuperAdmin, Finance Manager)
 */
export const getPerformanceReport = async (req, res, next) => {
  try {
    const { startDate, endDate, tier, sortBy = 'totalVisits', sortOrder = 'desc', page = 1, limit = 10 } = req.query;
    const companyId = req.user.companyId;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Build match query for partnerships
    const matchQuery = { companyId, status: 'active' };
    if (tier) matchQuery.tier = tier;

    // Get total count for pagination
    const totalPartnerships = await PartnerCompany.countDocuments(matchQuery);
    const totalPages = Math.ceil(totalPartnerships / parseInt(limit));
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get active currencies
    const activeCurrencies = await Commission.distinct('commission.currency', { companyId });

    // Aggregation pipeline for partner performance with currency breakdown
    const partners = await PartnerCompany.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'users',
          localField: 'partnerId',
          foreignField: '_id',
          as: 'partner'
        }
      },
      { $unwind: '$partner' },
      {
        $lookup: {
          from: 'visits',
          let: { partnerId: '$partnerId', companyId: '$companyId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$partner', '$$partnerId'] },
                    { $eq: ['$companyId', '$$companyId'] },
                    startDate ? { $gte: ['$createdAt', new Date(startDate)] } : { $ne: ['$createdAt', null] },
                    endDate ? { $lte: ['$createdAt', new Date(endDate)] } : { $ne: ['$createdAt', null] }
                  ]
                }
              }
            }
          ],
          as: 'visits'
        }
      },
      {
        $lookup: {
          from: 'commissions',
          let: { partnerId: '$partnerId', companyId: '$companyId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$partner', '$$partnerId'] },
                    { $eq: ['$companyId', '$$companyId'] },
                    startDate ? { $gte: ['$createdAt', new Date(startDate)] } : { $ne: ['$createdAt', null] },
                    endDate ? { $lte: ['$createdAt', new Date(endDate)] } : { $ne: ['$createdAt', null] }
                  ]
                }
              }
            }
          ],
          as: 'commissions'
        }
      },
      {
        $project: {
          partnershipId: '$_id',
          partnerId: '$partnerId',
          partnerName: { $concat: ['$partner.firstName', ' ', '$partner.lastName'] },
          partnerEmail: '$partner.email',
          tier: 1,
          kycStatus: 1,
          totalVisits: { $size: '$visits' },
          completedVisits: {
            $size: {
              $filter: {
                input: '$visits',
                as: 'visit',
                cond: { $eq: ['$$visit.status', 'completed'] }
              }
            }
          },
          totalCommissions: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$commissions',
                    as: 'commission',
                    cond: { $ne: ['$$commission.status', 'cancelled'] }
                  }
                },
                as: 'commission',
                in: '$$commission.commission.calculatedAmount'
              }
            }
          },
          paidCommissions: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$commissions',
                    as: 'commission',
                    cond: { $eq: ['$$commission.status', 'paid'] }
                  }
                },
                as: 'paidCommission',
                in: '$$paidCommission.commission.calculatedAmount'
              }
            }
          },
          // Per-currency breakdown
          commissionsByCurrency: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: ['$commissions.commission.currency', []] },
                as: 'currency',
                in: {
                  k: '$$currency',
                  v: {
                    total: {
                      $sum: {
                        $map: {
                          input: {
                            $filter: {
                              input: '$commissions',
                              as: 'c',
                              cond: {
                                $and: [
                                  { $eq: ['$$c.commission.currency', '$$currency'] },
                                  { $ne: ['$$c.status', 'cancelled'] }
                                ]
                              }
                            }
                          },
                          as: 'filtered',
                          in: '$$filtered.commission.calculatedAmount'
                        }
                      }
                    },
                    paid: {
                      $sum: {
                        $map: {
                          input: {
                            $filter: {
                              input: '$commissions',
                              as: 'c',
                              cond: {
                                $and: [
                                  { $eq: ['$$c.commission.currency', '$$currency'] },
                                  { $eq: ['$$c.status', 'paid'] }
                                ]
                              }
                            }
                          },
                          as: 'filtered',
                          in: '$$filtered.commission.calculatedAmount'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        $addFields: {
          conversionRate: {
            $cond: {
              if: { $gt: ['$totalVisits', 0] },
              then: { $multiply: [{ $divide: ['$completedVisits', '$totalVisits'] }, 100] },
              else: 0
            }
          }
        }
      },
      { $sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    // Build filter for summary stats (includes tier filter if provided)
    const summaryMatchQuery = { companyId, status: 'active' };
    if (tier) summaryMatchQuery.tier = tier;

    // Calculate summary stats
    const summary = await PartnerCompany.aggregate([
      { $match: summaryMatchQuery },
      {
        $group: {
          _id: null,
          totalPartners: { $sum: 1 }
        }
      }
    ]);

    // Calculate tier breakdown (filter by tier if provided)
    const tierBreakdown = await PartnerCompany.aggregate([
      { $match: summaryMatchQuery },
      {
        $group: {
          _id: '$tier',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get partner IDs for tier-filtered stats (visits and commissions)
    let partnerIdsForTier = null;
    if (tier) {
      const tierPartners = await PartnerCompany.find({ companyId, status: 'active', tier }, { partnerId: 1 }).lean();
      partnerIdsForTier = tierPartners.map(p => p.partnerId);
    }

    // Calculate total visits and commissions (filtered by tier if provided)
    const visitMatchQuery = { companyId, ...dateFilter };
    if (partnerIdsForTier) {
      visitMatchQuery.partner = { $in: partnerIdsForTier };
    }

    const visitStats = await Visit.aggregate([
      { $match: visitMatchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]);

    const commissionMatchQuery = { companyId, ...dateFilter };
    if (partnerIdsForTier) {
      commissionMatchQuery.partner = { $in: partnerIdsForTier };
    }

    const commissionStats = await Commission.aggregate([
      { $match: commissionMatchQuery },
      {
        $group: {
          _id: '$commission.currency',
          totalAmount: { $sum: '$commission.calculatedAmount' },
          paidAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$commission.calculatedAmount', 0]
            }
          }
        }
      }
    ]);

    // Format tier breakdown
    const tierMap = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    tierBreakdown.forEach(item => {
      if (item._id && tierMap.hasOwnProperty(item._id)) {
        tierMap[item._id] = item.count;
      }
    });

    // Calculate average conversion rate
    const avgConversion = partners.length > 0
      ? partners.reduce((sum, p) => sum + (p.conversionRate || 0), 0) / partners.length
      : 0;

    // Format commission stats by currency
    const commissionsByCurrency = {};
    commissionStats.forEach(item => {
      if (item._id) {
        commissionsByCurrency[item._id] = {
          totalAmount: item.totalAmount || 0,
          paidAmount: item.paidAmount || 0
        };
      }
    });

    res.status(200).json({
      success: true,
      data: {
        partners,
        summary: {
          totalPartners: summary[0]?.totalPartners || 0,
          totalVisits: visitStats[0]?.total || 0,
          completedVisits: visitStats[0]?.completed || 0,
          totalCommissions: Object.values(commissionsByCurrency).reduce((sum, c) => sum + c.totalAmount, 0),
          paidCommissions: Object.values(commissionsByCurrency).reduce((sum, c) => sum + c.paidAmount, 0),
          avgConversionRate: avgConversion
        },
        summaryByCurrency: commissionsByCurrency,
        activeCurrencies: activeCurrencies.length > 0 ? activeCurrencies : ['INR'],
        tierBreakdown: tierMap,
        pagination: {
          total: totalPartnerships,
          page: parseInt(page),
          pages: totalPages
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get commission report
 * @route   GET /api/partner-company/reports/commissions
 * @access  Private (Partner Manager, Company SuperAdmin, Finance Manager)
 */
export const getCommissionReport = async (req, res, next) => {
  try {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;
    const companyId = req.user.companyId;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Get active currencies
    const activeCurrencies = await Commission.distinct('commission.currency', { companyId });

    // Get summary stats by currency
    const [
      totalCount,
      summaryByCurrency,
      byStatusByCurrency,
      byTier,
      byPeriod
    ] = await Promise.all([
      Commission.countDocuments({ companyId, ...dateFilter, status: { $ne: 'cancelled' } }),
      // Summary by currency
      Commission.aggregate([
        { $match: { companyId, ...dateFilter } },
        {
          $group: {
            _id: '$commission.currency',
            totalAmount: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 0, '$commission.calculatedAmount'] }
            },
            count: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 0, 1] }
            },
            pendingAmount: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$commission.calculatedAmount', 0] }
            },
            pendingCount: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            approvedAmount: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$commission.calculatedAmount', 0] }
            },
            approvedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
            },
            paidAmount: {
              $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$commission.calculatedAmount', 0] }
            },
            paidCount: {
              $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
            },
            cancelledAmount: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, '$commission.calculatedAmount', 0] }
            },
            cancelledCount: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            }
          }
        }
      ]),
      // By status by currency
      Commission.aggregate([
        { $match: { companyId, ...dateFilter } },
        {
          $group: {
            _id: { status: '$status', currency: '$commission.currency' },
            count: { $sum: 1 },
            amount: { $sum: '$commission.calculatedAmount' }
          }
        }
      ]),
      // By tier
      Commission.aggregate([
        { $match: { companyId, ...dateFilter, status: { $ne: 'cancelled' } } },
        { $group: { _id: '$commission.partnerTier', count: { $sum: 1 }, amount: { $sum: '$commission.calculatedAmount' } } }
      ]),
      // By period (grouped by month and currency)
      Commission.aggregate([
        { $match: { companyId, ...dateFilter } },
        {
          $group: {
            _id: {
              period: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
              currency: { $ifNull: ['$commission.currency', 'INR'] }
            },
            count: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 0, 1] } },
            amount: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 0, '$commission.calculatedAmount'] } },
            paidAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'paid'] }, '$commission.calculatedAmount', 0]
              }
            }
          }
        },
        { $sort: { '_id.period': -1 } },
        { $limit: 24 }
      ])
    ]);

    // Format summary by currency
    const summaryByCurrencyMap = {};
    summaryByCurrency.forEach(item => {
      if (item._id) {
        summaryByCurrencyMap[item._id] = {
          totalAmount: item.totalAmount || 0,
          count: item.count || 0,
          pendingAmount: item.pendingAmount || 0,
          pendingCount: item.pendingCount || 0,
          approvedAmount: item.approvedAmount || 0,
          approvedCount: item.approvedCount || 0,
          paidAmount: item.paidAmount || 0,
          paidCount: item.paidCount || 0,
          cancelledAmount: item.cancelledAmount || 0,
          cancelledCount: item.cancelledCount || 0
        };
      }
    });

    // Format by status by currency
    const byStatusByCurrencyMap = {};
    byStatusByCurrency.forEach(item => {
      const currency = item._id?.currency || 'INR';
      const status = item._id?.status;
      if (!byStatusByCurrencyMap[currency]) {
        byStatusByCurrencyMap[currency] = {};
      }
      byStatusByCurrencyMap[currency][status] = {
        count: item.count || 0,
        amount: item.amount || 0
      };
    });

    // Get top partners by commission with pagination
    const totalPartners = await Commission.aggregate([
      { $match: { companyId, ...dateFilter } },
      { $group: { _id: '$partner' } },
      { $count: 'total' }
    ]);

    const total = totalPartners[0]?.total || 0;
    const totalPages = Math.ceil(total / parseInt(limit));
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const topPartners = await Commission.aggregate([
      { $match: { companyId, ...dateFilter } },
      {
        $group: {
          _id: '$partner',
          totalCommissions: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 0, '$commission.calculatedAmount'] }
          },
          paidCommissions: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$commission.calculatedAmount', 0]
            }
          },
          pendingCommissions: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$commission.calculatedAmount', 0]
            }
          },
          commissionCount: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 0, 1] } },
          commissions: { $push: '$$ROOT' }
        }
      },
      { $sort: { totalCommissions: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'partnerUser'
        }
      },
      { $unwind: '$partnerUser' },
      {
        $lookup: {
          from: 'partnercompanies',
          let: { partnerId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$partnerId', '$$partnerId'] },
                    { $eq: ['$companyId', companyId] }
                  ]
                }
              }
            }
          ],
          as: 'partnership'
        }
      },
      { $unwind: { path: '$partnership', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          partnerId: '$_id',
          partnerName: { $concat: ['$partnerUser.firstName', ' ', '$partnerUser.lastName'] },
          tier: { $ifNull: ['$partnership.tier', 'bronze'] },
          totalCommissions: 1,
          paidCommissions: 1,
          pendingCommissions: 1,
          commissionCount: 1,
          commissionsByCurrency: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: ['$commissions.commission.currency', []] },
                as: 'currency',
                in: {
                  k: '$$currency',
                  v: {
                    total: {
                      $sum: {
                        $map: {
                          input: {
                            $filter: {
                              input: '$commissions',
                              as: 'c',
                              cond: {
                                $and: [
                                  { $eq: ['$$c.commission.currency', '$$currency'] },
                                  { $ne: ['$$c.status', 'cancelled'] }
                                ]
                              }
                            }
                          },
                          as: 'filtered',
                          in: '$$filtered.commission.calculatedAmount'
                        }
                      }
                    },
                    paid: {
                      $sum: {
                        $map: {
                          input: {
                            $filter: {
                              input: '$commissions',
                              as: 'c',
                              cond: {
                                $and: [
                                  { $eq: ['$$c.commission.currency', '$$currency'] },
                                  { $eq: ['$$c.status', 'paid'] }
                                ]
                              }
                            }
                          },
                          as: 'filtered',
                          in: '$$filtered.commission.calculatedAmount'
                        }
                      }
                    },
                    pending: {
                      $sum: {
                        $map: {
                          input: {
                            $filter: {
                              input: '$commissions',
                              as: 'c',
                              cond: {
                                $and: [
                                  { $eq: ['$$c.commission.currency', '$$currency'] },
                                  { $eq: ['$$c.status', 'pending'] }
                                ]
                              }
                            }
                          },
                          as: 'filtered',
                          in: '$$filtered.commission.calculatedAmount'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]);

    // Format by status (for backward compatibility, use INR default)
    const byStatus = Object.entries(byStatusByCurrencyMap['INR'] || {}).map(([status, data]) => ({
      status,
      count: data.count,
      amount: data.amount
    }));

    // Format by tier
    const tierData = byTier.map(item => ({
      tier: item._id || 'bronze',
      count: item.count,
      amount: item.amount || 0
    }));

    // Format by period
    const periodData = byPeriod.map(item => ({
      period: item._id,
      count: item.count,
      amount: item.amount || 0,
      paidAmount: item.paidAmount || 0
    }));

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalAmount: Object.values(summaryByCurrencyMap).reduce((sum, s) => sum + s.totalAmount, 0),
          totalCount,
          pendingAmount: Object.values(summaryByCurrencyMap).reduce((sum, s) => sum + s.pendingAmount, 0),
          pendingCount: Object.values(summaryByCurrencyMap).reduce((sum, s) => sum + s.pendingCount, 0),
          approvedAmount: Object.values(summaryByCurrencyMap).reduce((sum, s) => sum + s.approvedAmount, 0),
          approvedCount: Object.values(summaryByCurrencyMap).reduce((sum, s) => sum + s.approvedCount, 0),
          paidAmount: Object.values(summaryByCurrencyMap).reduce((sum, s) => sum + s.paidAmount, 0),
          paidCount: Object.values(summaryByCurrencyMap).reduce((sum, s) => sum + s.paidCount, 0),
          cancelledAmount: Object.values(summaryByCurrencyMap).reduce((sum, s) => sum + s.cancelledAmount, 0),
          cancelledCount: Object.values(summaryByCurrencyMap).reduce((sum, s) => sum + s.cancelledCount, 0)
        },
        summaryByCurrency: summaryByCurrencyMap,
        byStatusByCurrency: byStatusByCurrencyMap,
        activeCurrencies: activeCurrencies.length > 0 ? activeCurrencies : ['INR'],
        byStatus,
        byTier: tierData,
        byPartner: topPartners,
        byPeriod: periodData,
        pagination: {
          total,
          page: parseInt(page),
          pages: totalPages
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard activity for company (new partners + KYC pending)
 * @route   GET /api/partner-company/dashboard/activity
 * @access  Private (Company SuperAdmin, Partner Manager)
 */
export const getDashboardActivity = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const limit = parseInt(req.query.limit) || 10;

    const activities = [];

    // Get recent new partners (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newPartners = await PartnerCompany.find({
      companyId,
      createdAt: { $gte: thirtyDaysAgo }
    })
      .populate('partnerId', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .limit(limit);

    // Add new partner activities
    newPartners.forEach(p => {
      activities.push({
        type: 'new_partner',
        id: p._id,
        partner: {
          firstName: p.partnerId?.firstName,
          lastName: p.partnerId?.lastName,
          email: p.partnerId?.email
        },
        tier: p.tier,
        status: p.status,
        createdAt: p.createdAt
      });
    });

    // Get recently activated partners (status changed to active in last 30 days)
    const recentlyActivePartners = await PartnerCompany.find({
      companyId,
      status: 'active',
      updatedAt: { $gte: thirtyDaysAgo },
      createdAt: { $lt: thirtyDaysAgo } // Not newly created, but status changed
    })
      .populate('partnerId', 'firstName lastName email phone')
      .sort({ updatedAt: -1 })
      .limit(limit);

    recentlyActivePartners.forEach(p => {
      activities.push({
        type: 'partner_activated',
        id: p._id,
        partner: {
          firstName: p.partnerId?.firstName,
          lastName: p.partnerId?.lastName,
          email: p.partnerId?.email
        },
        tier: p.tier,
        createdAt: p.updatedAt
      });
    });

    // Get recent properties added
    const Property = (await import('../models/Property.js')).default;
    const recentProperties = await Property.find({
      company: companyId,
      createdAt: { $gte: thirtyDaysAgo }
    })
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit);

    recentProperties.forEach(prop => {
      activities.push({
        type: 'property_added',
        id: prop._id,
        property: {
          name: prop.name,
          type: prop.type,
          city: prop.location?.city
        },
        createdBy: prop.createdBy ? {
          firstName: prop.createdBy.firstName,
          lastName: prop.createdBy.lastName
        } : null,
        createdAt: prop.createdAt
      });
    });

    // Get recent commissions paid
    const recentCommissions = await Commission.find({
      company: companyId,
      status: 'paid',
      paidAt: { $gte: thirtyDaysAgo }
    })
      .populate('partnerId', 'firstName lastName')
      .populate('propertyId', 'name')
      .sort({ paidAt: -1 })
      .limit(limit);

    recentCommissions.forEach(comm => {
      activities.push({
        type: 'commission_paid',
        id: comm._id,
        partner: comm.partnerId ? {
          firstName: comm.partnerId.firstName,
          lastName: comm.partnerId.lastName
        } : null,
        property: comm.propertyId ? { name: comm.propertyId.name } : null,
        amount: comm.commission?.calculatedAmount,
        currency: comm.currency || 'INR',
        createdAt: comm.paidAt
      });
    });

    // Get recent completed visits
    const recentVisits = await Visit.find({
      company: companyId,
      status: 'completed',
      updatedAt: { $gte: thirtyDaysAgo }
    })
      .populate('partnerId', 'firstName lastName')
      .populate('propertyId', 'name location.city')
      .sort({ updatedAt: -1 })
      .limit(limit);

    recentVisits.forEach(visit => {
      activities.push({
        type: 'visit_completed',
        id: visit._id,
        partner: visit.partnerId ? {
          firstName: visit.partnerId.firstName,
          lastName: visit.partnerId.lastName
        } : null,
        property: visit.propertyId ? {
          name: visit.propertyId.name,
          city: visit.propertyId.location?.city
        } : null,
        createdAt: visit.updatedAt
      });
    });

    // Sort all activities by date (most recent first) and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);

    res.status(200).json({
      success: true,
      data: {
        activities: sortedActivities
      }
    });
  } catch (error) {
    next(error);
  }
};