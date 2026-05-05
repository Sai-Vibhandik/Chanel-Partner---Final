import PartnerCompany from '../models/PartnerCompany.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import AgreementTemplate from '../models/AgreementTemplate.js';
import AgreementSignature from '../models/AgreementSignature.js';
import { ApiError } from '../middlewares/error.middleware.js';
import { sendPartnershipApprovedEmail } from '../services/email.service.js';

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
      totalRequired: requiredDocs.filter(d => d.required).length,
      uploaded: uploadedDocs.length,
      verified: verifiedRequiredDocs.length,
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