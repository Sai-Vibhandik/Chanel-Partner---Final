import PartnerCompany from '../models/PartnerCompany.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import AgreementTemplate from '../models/AgreementTemplate.js';
import AgreementSignature from '../models/AgreementSignature.js';
import Visit from '../models/Visit.js';
import Commission from '../models/Commission.js';
import { ApiError } from '../middlewares/error.middleware.js';
import { sendPartnershipApprovedEmail } from '../services/email.service.js';
import { createNotification } from './notification.controller.js';

/**
 * @desc    Partner applies to join a company
 * @route   POST /api/partner-company/apply
 * @access  Private (Partner only)
 */
export const applyToCompany = async (req, res, next) => {
  try {
    const { companyId } = req.body;
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
      throw new ApiError(400, 'This company is not accepting applications');
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
      tier: 'bronze'
    });

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
      .populate('companyId', 'name slug logo regions address settings.tierPercentages')
      .sort({ createdAt: -1 });

    // Check for unsigned agreements for each partnership
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

        return {
          ...partnership.toObject(),
          hasUnsignedAgreements
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
    const { status, tier, search, page = 1, limit = 10 } = req.query;

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
      .populate('partnerId', 'firstName lastName email phone avatar')
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
 * @desc    Update partnership status (approve/suspend)
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

    // Simplified status: pending -> active -> suspended
    const validStatuses = ['pending', 'active', 'suspended'];
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, 'Invalid status. Use: pending, active, or suspended');
    }

    const previousStatus = partnership.status;

    // Update status
    partnership.status = status;

    if (status === 'active') {
      partnership.approvedAt = new Date();
      partnership.approvedBy = req.user._id;
    }

    if (reason) {
      partnership.adminNotes = reason;
    }

    await partnership.save();

    // Send approval email to partner when partnership is approved
    if (status === 'active' && previousStatus === 'pending') {
      try {
        await sendPartnershipApprovedEmail(
          partnership.partnerId,
          partnership.companyId,
          partnership.tier
        );
      } catch (emailError) {
        console.error('Failed to send partnership approval email:', emailError);
        // Don't fail the request if email fails
      }

      // Create notification for partner
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

    // Create notification for partnership rejection/suspension
    if (status === 'suspended' && previousStatus === 'active') {
      createNotification({
        recipientId: partnership.partnerId._id,
        type: 'partnership_rejected',
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

    // Notify company admins about KYC document submission
    try {
      const companyAdmins = await User.find({
        companyId: partnership.companyId,
        role: { $in: ['company_superadmin', 'partner_manager'] },
        isActive: true
      });

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

      for (const admin of companyAdmins) {
        createNotification({
          recipientId: admin._id,
          type: 'kyc_submitted',
          title: 'KYC Document Submitted',
          message: `${partnerName} has submitted ${documentTypeNames[type] || type} for verification.`,
          data: {
            partnershipId: partnership._id,
            companyId: partnership.companyId
          },
          link: '/partner-manager/partners'
        }).catch(err => console.error('Failed to create KYC submission notification:', err.message));
      }
    } catch (notifyError) {
      console.error('Error sending KYC submission notifications:', notifyError.message);
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

    // Get company's operating regions
    const company = await Company.findById(partnership.companyId._id);

    // Define required documents based on regions
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

    const requiredDocs = getRequiredDocuments(company?.regions);

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

    // Get required document types
    const requiredTypes = requiredDocs.filter(d => d.required).map(d => d.type);

    // Count verified required documents (only count required docs for verification progress)
    const verifiedRequiredDocs = uploadedDocs.filter(
      doc => requiredTypes.includes(doc.type) && doc.status === 'verified'
    );

    // Build summary
    const summary = {
      kycStatus: partnership.kycStatus,
      totalRequired: requiredDocs.length, // Total documents (both required and optional)
      uploaded: uploadedDocs.length,
      verified: uploadedDocs.filter(d => d.status === 'verified').length, // All verified docs
      pending: uploadedDocs.filter(d => d.status === 'pending').length,
      rejected: uploadedDocs.filter(d => d.status === 'rejected').length,
      requiredDocuments: requiredDocs.map(reqDoc => {
        const uploaded = uploadedDocs.find(d => d.type === reqDoc.type && d.region === reqDoc.region);
        return {
          ...reqDoc,
          uploaded: !!uploaded,
          document: uploaded || null
        };
      }),
      uploadedDocuments: uploadedDocs
    };

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

    // Check if all required documents are verified based on company's regions
    const company = await Company.findById(partnership.companyId);
    const regions = company?.regions || ['india'];

    // Define required documents per region
    const requiredDocsPerRegion = {
      india: ['pan_card', 'gst_certificate', 'address_proof', 'cancelled_cheque'],
      dubai: ['trade_license', 'rera_registration_card', 'emirates_id', 'passport_copy']
    };

    // Check if all required documents for each region are verified
    let allRequiredVerified = true;

    for (const region of regions) {
      const requiredTypes = requiredDocsPerRegion[region] || [];
      for (const type of requiredTypes) {
        const doc = partnership.kycDocuments.find(
          d => d.type === type && d.region === region && d.status === 'verified'
        );
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
    const kycReviews = filteredPartnerships.map(partnership => {
      const partner = partnership.partnerId;
      const docs = partnership.kycDocuments || [];

      // Build document status
      const documents = requiredDocs.map(reqDoc => {
        const uploaded = docs.find(d => d.type === reqDoc.type && d.region === reqDoc.region);
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
        allRequiredVerified: verifiedRequired === requiredCount
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

    // Aggregation pipeline for partner performance
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
                    { $eq: ['$partnerId', '$$partnerId'] },
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
                input: '$commissions',
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

    // Calculate summary stats
    const summary = await PartnerCompany.aggregate([
      { $match: { companyId, status: 'active' } },
      {
        $group: {
          _id: null,
          totalPartners: { $sum: 1 }
        }
      }
    ]);

    // Calculate tier breakdown
    const tierBreakdown = await PartnerCompany.aggregate([
      { $match: { companyId, status: 'active' } },
      {
        $group: {
          _id: '$tier',
          count: { $sum: 1 }
        }
      }
    ]);

    // Calculate total visits and commissions
    const visitStats = await Visit.aggregate([
      {
        $match: {
          companyId,
          ...dateFilter
        }
      },
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

    const commissionStats = await Commission.aggregate([
      {
        $match: {
          companyId,
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
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

    res.status(200).json({
      success: true,
      data: {
        partners,
        summary: {
          totalPartners: summary[0]?.totalPartners || 0,
          totalVisits: visitStats[0]?.total || 0,
          completedVisits: visitStats[0]?.completed || 0,
          totalCommissions: commissionStats[0]?.totalAmount || 0,
          paidCommissions: commissionStats[0]?.paidAmount || 0,
          avgConversionRate: avgConversion
        },
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

    // Get summary stats
    const [
      totalCount,
      totalAmount,
      pendingStats,
      approvedStats,
      paidStats,
      cancelledStats,
      byStatus,
      byTier,
      byPeriod
    ] = await Promise.all([
      Commission.countDocuments({ companyId, ...dateFilter }),
      Commission.aggregate([
        { $match: { companyId, ...dateFilter } },
        { $group: { _id: null, total: { $sum: '$commission.calculatedAmount' } } }
      ]),
      Commission.aggregate([
        { $match: { companyId, status: 'pending', ...dateFilter } },
        { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$commission.calculatedAmount' } } }
      ]),
      Commission.aggregate([
        { $match: { companyId, status: 'approved', ...dateFilter } },
        { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$commission.calculatedAmount' } } }
      ]),
      Commission.aggregate([
        { $match: { companyId, status: 'paid', ...dateFilter } },
        { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$commission.calculatedAmount' } } }
      ]),
      Commission.aggregate([
        { $match: { companyId, status: 'cancelled', ...dateFilter } },
        { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$commission.calculatedAmount' } } }
      ]),
      Commission.aggregate([
        { $match: { companyId, ...dateFilter } },
        { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$commission.calculatedAmount' } } }
      ]),
      Commission.aggregate([
        { $match: { companyId, ...dateFilter } },
        { $group: { _id: '$commission.partnerTier', count: { $sum: 1 }, amount: { $sum: '$commission.calculatedAmount' } } }
      ]),
      Commission.aggregate([
        { $match: { companyId, ...dateFilter } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 },
            amount: { $sum: '$commission.calculatedAmount' },
            paidAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'paid'] }, '$commission.calculatedAmount', 0]
              }
            }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 12 }
      ])
    ]);

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
          totalCommissions: { $sum: '$commission.calculatedAmount' },
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
          commissionCount: { $sum: 1 }
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
          localField: '_id',
          foreignField: 'partnerId',
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
          commissionCount: 1
        }
      }
    ]);

    // Format by status
    const statusData = byStatus.map(item => ({
      status: item._id,
      count: item.count,
      amount: item.amount || 0
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
          totalAmount: totalAmount[0]?.total || 0,
          totalCount,
          pendingAmount: pendingStats[0]?.amount || 0,
          pendingCount: pendingStats[0]?.count || 0,
          approvedAmount: approvedStats[0]?.amount || 0,
          approvedCount: approvedStats[0]?.count || 0,
          paidAmount: paidStats[0]?.amount || 0,
          paidCount: paidStats[0]?.count || 0,
          cancelledAmount: cancelledStats[0]?.amount || 0,
          cancelledCount: cancelledStats[0]?.count || 0
        },
        byStatus: statusData,
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