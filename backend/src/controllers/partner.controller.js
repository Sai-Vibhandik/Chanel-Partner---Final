import User from '../models/User.js';
import Company from '../models/Company.js';
import { ApiError } from '../middlewares/error.middleware.js';
import { logActivity, getRequestMetadata, ActionTypes, ResourceTypes } from '../services/activityLog.service.js';

/**
 * @desc    Get all partners (Company staff)
 * @route   GET /api/partners
 * @access  Private (Company roles)
 */
export const getPartners = async (req, res, next) => {
  try {
    const { status, tier, kycStatus, search, page = 1, limit = 10 } = req.query;

    // Build query - filter by company
    const query = { role: 'partner' };

    // Platform admin can see all partners
    if (req.user.role !== 'platform_admin') {
      query.companyId = req.user.companyId;
    }

    // Add filters
    if (status) {
      query['partnerProfile.status'] = status;
    }
    if (tier) {
      query['partnerProfile.tier'] = tier;
    }
    if (kycStatus) {
      query['partnerProfile.kycStatus'] = kycStatus;
    }
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'partnerProfile.companyName': { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(query);
    const partners = await User.find(query)
      .populate('companyId', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        partners,
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
 * @desc    Get single partner
 * @route   GET /api/partners/:id
 * @access  Private
 */
export const getPartner = async (req, res, next) => {
  try {
    const partner = await User.findById(req.params.id)
      .populate('companyId', 'name email phone');

    if (!partner || partner.role !== 'partner') {
      throw new ApiError(404, 'Partner not found');
    }

    // Check access - platform admin, same company, or own profile
    const isPlatformAdmin = req.user.role === 'platform_admin';
    const isSameCompany = req.user.companyId?.toString() === partner.companyId?._id?.toString();
    const isOwnProfile = req.user._id.toString() === partner._id.toString();

    if (!isPlatformAdmin && !isSameCompany && !isOwnProfile) {
      throw new ApiError(403, 'Access denied');
    }

    res.status(200).json({
      success: true,
      data: { partner }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update partner status (approve/reject/suspend)
 * @route   PUT /api/partners/:id/status
 * @access  Private (Partner Manager, Company SuperAdmin)
 */
export const updatePartnerStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;

    const partner = await User.findById(req.params.id);

    if (!partner || partner.role !== 'partner') {
      throw new ApiError(404, 'Partner not found');
    }

    // Check access
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== partner.companyId?.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    const validStatuses = ['pending', 'under_review', 'approved', 'active', 'rejected', 'suspended'];
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, 'Invalid status');
    }

    // Update status
    partner.partnerProfile.status = status;
    if (reason) {
      if (status === 'rejected') {
        partner.partnerProfile.rejectionReason = reason;
      } else {
        partner.partnerProfile.adminNotes = reason;
      }
    }

    // If approved, set active
    if (status === 'approved' || status === 'active') {
      partner.isActive = true;
    } else if (status === 'suspended' || status === 'rejected') {
      partner.isActive = false;
    }

    await partner.save();

    // Determine activity action based on status
    let action;
    switch (status) {
      case 'approved':
      case 'active':
        action = ActionTypes.PARTNER_STATUS_ACTIVATED;
        break;
      case 'rejected':
        action = ActionTypes.PARTNER_STATUS_REJECTED;
        break;
      case 'suspended':
        action = ActionTypes.PARTNER_STATUS_SUSPENDED;
        break;
      default:
        action = ActionTypes.PARTNER_STATUS_ACTIVATED;
    }

    // Log activity
    await logActivity({
      userId: req.user._id,
      companyId: partner.companyId,
      action: action,
      resourceType: ResourceTypes.PARTNER,
      resourceId: partner._id,
      resourceTitle: `${partner.firstName} ${partner.lastName}`,
      details: {
        partnerEmail: partner.email,
        newStatus: status,
        reason: reason || undefined
      },
      ...getRequestMetadata(req)
    });

    res.status(200).json({
      success: true,
      message: `Partner status updated to ${status}`,
      data: { partner }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update partner tier
 * @route   PUT /api/partners/:id/tier
 * @access  Private (Partner Manager, Company SuperAdmin)
 */
export const updatePartnerTier = async (req, res, next) => {
  try {
    const { tier, reason } = req.body;

    const partner = await User.findById(req.params.id);

    if (!partner || partner.role !== 'partner') {
      throw new ApiError(404, 'Partner not found');
    }

    // Check access
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== partner.companyId?.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    const validTiers = ['bronze', 'silver', 'gold', 'platinum'];
    if (!validTiers.includes(tier)) {
      throw new ApiError(400, 'Invalid tier');
    }

    const previousTier = partner.partnerProfile.tier;
    partner.partnerProfile.tier = tier;

    if (reason) {
      partner.partnerProfile.adminNotes = reason;
    }

    await partner.save();

    // Log activity
    await logActivity({
      userId: req.user._id,
      companyId: partner.companyId,
      action: ActionTypes.PARTNER_TIER_CHANGED,
      resourceType: ResourceTypes.PARTNER,
      resourceId: partner._id,
      resourceTitle: `${partner.firstName} ${partner.lastName}`,
      details: {
        partnerEmail: partner.email,
        previousTier: previousTier,
        newTier: tier,
        reason: reason || undefined
      },
      ...getRequestMetadata(req)
    });

    res.status(200).json({
      success: true,
      message: `Partner tier updated from ${previousTier} to ${tier}`,
      data: { partner }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update partner profile (Partner self-update)
 * @route   PUT /api/partners/:id/profile
 * @access  Private (Partner - own profile only)
 */
export const updatePartnerProfile = async (req, res, next) => {
  try {
    const partner = await User.findById(req.params.id);

    if (!partner || partner.role !== 'partner') {
      throw new ApiError(404, 'Partner not found');
    }

    // Only own profile or company admin can update
    const isOwnProfile = req.user._id.toString() === partner._id.toString();
    const isCompanyAdmin = req.user.role === 'company_superadmin' &&
                          req.user.companyId?.toString() === partner.companyId?.toString();

    if (!isOwnProfile && !isCompanyAdmin && req.user.role !== 'platform_admin') {
      throw new ApiError(403, 'Access denied');
    }

    // Update allowed fields
    const allowedUpdates = [
      'firstName', 'lastName', 'phone'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        partner[field] = req.body[field];
      }
    });

    // Update partner profile fields
    if (req.body.partnerProfile) {
      const profileFields = [
        'companyName', 'companyType', 'operatingRegion',
        'gstNumber', 'panNumber', 'reraNumber',
        'tradeLicenseNumber', 'dubaiReraNumber', 'emiratesId',
        'phone', 'alternatePhone', 'website'
      ];

      profileFields.forEach(field => {
        if (req.body.partnerProfile[field] !== undefined) {
          partner.partnerProfile[field] = req.body.partnerProfile[field];
        }
      });

      // Update address
      if (req.body.partnerProfile.address) {
        partner.partnerProfile.address = {
          ...partner.partnerProfile.address,
          ...req.body.partnerProfile.address
        };
      }

      // Update bank details
      if (req.body.partnerProfile.bankDetails) {
        partner.partnerProfile.bankDetails = {
          ...partner.partnerProfile.bankDetails,
          ...req.body.partnerProfile.bankDetails
        };
      }
    }

    await partner.save();

    res.status(200).json({
      success: true,
      message: 'Partner profile updated successfully',
      data: { partner }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get partner statistics (Company staff)
 * @route   GET /api/partners/stats
 * @access  Private (Company roles)
 */
export const getPartnerStats = async (req, res, next) => {
  try {
    // Import PartnerCompany model
    const PartnerCompany = (await import('../models/PartnerCompany.js')).default;

    // Platform admin can see all partners across all companies
    if (req.user.role === 'platform_admin') {
      // For platform admin, count all users with role 'partner'
      const query = { role: 'partner' };

      // Get total counts
      const totalPartners = await User.countDocuments(query);
      const activePartners = await User.countDocuments({
        ...query,
        isActive: true,
        'partnerProfile.status': 'active'
      });
      const pendingPartners = await User.countDocuments({
        ...query,
        'partnerProfile.status': 'pending'
      });

      // Get counts by status
      const statusStats = await User.aggregate([
        { $match: query },
        { $group: { _id: '$partnerProfile.status', count: { $sum: 1 } } }
      ]);

      // Get counts by tier
      const tierStats = await User.aggregate([
        { $match: query },
        { $group: { _id: '$partnerProfile.tier', count: { $sum: 1 } } }
      ]);

      // Recent registrations
      const recentPartners = await User.find(query)
        .sort({ createdAt: -1 })
        .limit(5)
        .select('firstName lastName email createdAt partnerProfile.status partnerProfile.tier');

      return res.status(200).json({
        success: true,
        data: {
          overview: {
            total: totalPartners,
            active: activePartners,
            pending: pendingPartners
          },
          byStatus: statusStats.reduce((acc, item) => {
            acc[item._id || 'unknown'] = item.count;
            return acc;
          }, {}),
          byTier: tierStats.reduce((acc, item) => {
            acc[item._id || 'unknown'] = item.count;
            return acc;
          }, {}),
          recent: recentPartners
        }
      });
    }

    // For company users, get partners associated with this company through partnerships
    const partnerships = await PartnerCompany.find({
      companyId: req.user.companyId
    }).select('partnerId status tier');

    // Get stats from partnerships directly
    const totalPartners = partnerships.length;
    const activePartners = partnerships.filter(p => p.status === 'active').length;
    const pendingPartners = partnerships.filter(p => p.status === 'pending').length;

    // Get tier stats from partnerships
    const tierStats = partnerships.reduce((acc, p) => {
      const tier = p.tier || 'bronze';
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    }, {});

    // Get recent partners
    const recentPartnerships = await PartnerCompany.find({
      companyId: req.user.companyId
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('partnerId', 'firstName lastName email createdAt');

    const recentPartners = recentPartnerships
      .filter(p => p.partnerId)
      .map(p => ({
        _id: p.partnerId._id,
        firstName: p.partnerId.firstName,
        lastName: p.partnerId.lastName,
        email: p.partnerId.email,
        createdAt: p.partnerId.createdAt,
        partnershipStatus: p.status,
        tier: p.tier
      }));

    res.status(200).json({
      success: true,
      data: {
        overview: {
          total: totalPartners,
          active: activePartners,
          pending: pendingPartners
        },
        byStatus: {
          active: activePartners,
          pending: pendingPartners,
          suspended: partnerships.filter(p => p.status === 'suspended').length
        },
        byTier: tierStats,
        recent: recentPartners
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete partner (soft delete)
 * @route   DELETE /api/partners/:id
 * @access  Private (Company SuperAdmin, Platform Admin)
 */
export const deletePartner = async (req, res, next) => {
  try {
    const partner = await User.findById(req.params.id);

    if (!partner || partner.role !== 'partner') {
      throw new ApiError(404, 'Partner not found');
    }

    // Check access
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== partner.companyId?.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Soft delete - deactivate
    partner.isActive = false;
    partner.partnerProfile.status = 'suspended';
    await partner.save();

    res.status(200).json({
      success: true,
      message: 'Partner deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload KYC document
 * @route   POST /api/partners/:id/kyc
 * @access  Private (Partner - own profile only)
 */
export const uploadKYCDocument = async (req, res, next) => {
  try {
    const partner = await User.findById(req.params.id);

    if (!partner || partner.role !== 'partner') {
      throw new ApiError(404, 'Partner not found');
    }

    // Only own profile can upload KYC
    if (req.user._id.toString() !== partner._id.toString()) {
      throw new ApiError(403, 'You can only upload documents for your own profile');
    }

    const { type, url, publicId, region } = req.body;

    // Validate document type
    const validTypes = [
      'gst_certificate', 'pan_card', 'rera_certificate', 'address_proof', 'cancelled_cheque',
      'trade_license', 'rera_registration_card', 'emirates_id', 'passport_copy', 'visa_copy', 'other'
    ];
    if (!validTypes.includes(type)) {
      throw new ApiError(400, 'Invalid document type');
    }

    // Validate region
    const validRegions = ['india', 'dubai'];
    if (!validRegions.includes(region)) {
      throw new ApiError(400, 'Invalid region');
    }

    // Check if document of this type already exists
    const existingDocIndex = partner.partnerProfile.kycDocuments.findIndex(
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
      partner.partnerProfile.kycDocuments[existingDocIndex] = documentData;
    } else {
      // Add new document
      partner.partnerProfile.kycDocuments.push(documentData);
    }

    await partner.save();

    res.status(200).json({
      success: true,
      message: 'KYC document uploaded successfully',
      data: {
        document: documentData,
        kycDocuments: partner.partnerProfile.kycDocuments
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete KYC document
 * @route   DELETE /api/partners/:id/kyc/:documentId
 * @access  Private (Partner - own profile only)
 */
export const deleteKYCDocument = async (req, res, next) => {
  try {
    const partner = await User.findById(req.params.id);

    if (!partner || partner.role !== 'partner') {
      throw new ApiError(404, 'Partner not found');
    }

    // Only own profile can delete KYC
    if (req.user._id.toString() !== partner._id.toString()) {
      throw new ApiError(403, 'You can only delete documents from your own profile');
    }

    const documentIndex = partner.partnerProfile.kycDocuments.findIndex(
      doc => doc._id.toString() === req.params.documentId
    );

    if (documentIndex === -1) {
      throw new ApiError(404, 'Document not found');
    }

    // Don't allow deletion of verified documents
    if (partner.partnerProfile.kycDocuments[documentIndex].status === 'verified') {
      throw new ApiError(400, 'Cannot delete a verified document');
    }

    partner.partnerProfile.kycDocuments.splice(documentIndex, 1);
    await partner.save();

    res.status(200).json({
      success: true,
      message: 'KYC document deleted successfully',
      data: {
        kycDocuments: partner.partnerProfile.kycDocuments
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify/Reject KYC document
 * @route   PUT /api/partners/:id/kyc/:documentId/verify
 * @access  Private (Partner Manager, Company SuperAdmin)
 */
export const verifyKYCDocument = async (req, res, next) => {
  try {
    const { status, reason } = req.body;

    const partner = await User.findById(req.params.id);

    if (!partner || partner.role !== 'partner') {
      throw new ApiError(404, 'Partner not found');
    }

    // Check access
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== partner.companyId?.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    const document = partner.partnerProfile.kycDocuments.find(
      doc => doc._id.toString() === req.params.documentId
    );

    if (!document) {
      throw new ApiError(404, 'Document not found');
    }

    // Update document status
    document.status = status;
    if (status === 'verified') {
      document.verifiedAt = new Date();
    }
    if (reason) {
      document.rejectionReason = reason;
    }

    // Check if all required documents are verified
    const allVerified = checkAllKYCVerified(partner);
    if (allVerified && partner.partnerProfile.status === 'pending') {
      partner.partnerProfile.status = 'under_review';
    }

    await partner.save();

    res.status(200).json({
      success: true,
      message: `Document ${status === 'verified' ? 'verified' : 'rejected'} successfully`,
      data: {
        document,
        partner: {
          _id: partner._id,
          status: partner.partnerProfile.status
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get KYC summary for partner
 * @route   GET /api/partners/:id/kyc
 * @access  Private
 */
export const getKYCSummary = async (req, res, next) => {
  try {
    const partner = await User.findById(req.params.id);

    if (!partner || partner.role !== 'partner') {
      throw new ApiError(404, 'Partner not found');
    }

    // Check access
    const isPlatformAdmin = req.user.role === 'platform_admin';
    const isSameCompany = req.user.companyId?.toString() === partner.companyId?.toString();
    const isOwnProfile = req.user._id.toString() === partner._id.toString();

    if (!isPlatformAdmin && !isSameCompany && !isOwnProfile) {
      throw new ApiError(403, 'Access denied');
    }

    // Get required documents based on operating region
    const requiredDocs = getRequiredDocuments(partner.partnerProfile.operatingRegion);

    // Map uploaded documents
    const uploadedDocs = partner.partnerProfile.kycDocuments.map(doc => ({
      _id: doc._id,
      type: doc.type,
      region: doc.region,
      status: doc.status,
      uploadedAt: doc.uploadedAt,
      verifiedAt: doc.verifiedAt,
      url: doc.url,
      rejectionReason: doc.rejectionReason
    }));

    // Build summary
    const summary = {
      operatingRegion: partner.partnerProfile.operatingRegion,
      totalRequired: requiredDocs.length,
      uploaded: uploadedDocs.length,
      verified: uploadedDocs.filter(d => d.status === 'verified').length,
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
      data: { kycSummary: summary }
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to get required documents based on region
const getRequiredDocuments = (operatingRegion) => {
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

  if (operatingRegion === 'india') {
    return indiaDocs;
  } else if (operatingRegion === 'dubai') {
    return dubaiDocs;
  } else if (operatingRegion === 'both') {
    return [...indiaDocs, ...dubaiDocs];
  }

  return indiaDocs; // Default to India
};

// Helper function to check if all required KYC documents are verified
const checkAllKYCVerified = (partner) => {
  const requiredDocs = getRequiredDocuments(partner.partnerProfile.operatingRegion);
  const requiredTypes = requiredDocs.filter(d => d.required).map(d => d.type);

  const uploadedDocs = partner.partnerProfile.kycDocuments;

  for (const requiredType of requiredTypes) {
    const doc = uploadedDocs.find(d => d.type === requiredType && d.status === 'verified');
    if (!doc) {
      return false;
    }
  }

  return true;
};

/**
 * @desc    Get recent activities for partner manager dashboard
 * @route   GET /api/partners/recent-activities
 * @access  Private (Partner Manager, Company SuperAdmin)
 */
export const getRecentActivities = async (req, res, next) => {
  try {
    const PartnerCompany = (await import('../models/PartnerCompany.js')).default;
    const Visit = (await import('../models/Visit.js')).default;
    const Commission = (await import('../models/Commission.js')).default;
    const AgreementSignature = (await import('../models/AgreementSignature.js')).default;

    const companyId = req.user.companyId;
    const limit = parseInt(req.query.limit) || 10;
    const activities = [];

    // Get recent partner registrations (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newPartners = await PartnerCompany.find({
      companyId,
      createdAt: { $gte: sevenDaysAgo }
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('partnerId', 'firstName lastName email');

    newPartners.forEach(partnership => {
      if (partnership.partnerId) {
        activities.push({
          type: 'partner_registered',
          title: 'New Partner Registered',
          description: `${partnership.partnerId.firstName} ${partnership.partnerId.lastName} joined as a partner`,
          timestamp: partnership.createdAt,
          partnerId: partnership.partnerId._id,
          partnershipId: partnership._id
        });
      }
    });

    // Get recent visits (scheduled, completed, cancelled in last 7 days)
    const recentVisits = await Visit.find({
      companyId,
      updatedAt: { $gte: sevenDaysAgo }
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('partner', 'firstName lastName')
      .populate('property', 'name');

    recentVisits.forEach(visit => {
      if (visit.partner && visit.property) {
        const statusText = visit.status === 'completed' ? 'completed' :
                          visit.status === 'cancelled' ? 'cancelled' :
                          visit.status === 'approved' ? 'approved' : 'scheduled';
        activities.push({
          type: 'visit',
          title: `Visit ${statusText}`,
          description: `${visit.partner.firstName} ${visit.partner.lastName}'s visit to ${visit.property.name} was ${statusText}`,
          timestamp: visit.updatedAt,
          visitId: visit._id
        });
      }
    });

    // Get recent KYC verifications
    const recentKYC = await PartnerCompany.find({
      companyId,
      kycStatus: 'verified',
      updatedAt: { $gte: sevenDaysAgo }
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('partnerId', 'firstName lastName');

    recentKYC.forEach(partnership => {
      if (partnership.partnerId) {
        activities.push({
          type: 'kyc_verified',
          title: 'KYC Verified',
          description: `${partnership.partnerId.firstName} ${partnership.partnerId.lastName}'s KYC was verified`,
          timestamp: partnership.updatedAt,
          partnerId: partnership.partnerId._id,
          partnershipId: partnership._id
        });
      }
    });

    // Get recently signed agreements
    const recentAgreements = await AgreementSignature.find({
      companyId,
      status: 'signed',
      updatedAt: { $gte: sevenDaysAgo }
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('partnerId', 'firstName lastName');

    recentAgreements.forEach(agreement => {
      if (agreement.partnerId) {
        activities.push({
          type: 'agreement_signed',
          title: 'Agreement Signed',
          description: `${agreement.partnerId.firstName} ${agreement.partnerId.lastName} signed the agreement`,
          timestamp: agreement.updatedAt,
          agreementId: agreement._id
        });
      }
    });

    // Get recent commission approvals
    const recentCommissions = await Commission.find({
      companyId,
      status: { $in: ['approved', 'paid'] },
      updatedAt: { $gte: sevenDaysAgo }
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('partner', 'firstName lastName');

    recentCommissions.forEach(commission => {
      if (commission.partner) {
        const statusText = commission.status === 'paid' ? 'paid' : 'approved';
        activities.push({
          type: 'commission',
          title: `Commission ${statusText}`,
          description: `Commission of ${commission.commission?.currency || 'INR'} ${commission.commission?.calculatedAmount?.toLocaleString() || 0} for ${commission.partner.firstName} ${commission.partner.lastName} was ${statusText}`,
          timestamp: commission.updatedAt,
          commissionId: commission._id
        });
      }
    });

    // Sort all activities by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedActivities = activities.slice(0, limit);

    res.status(200).json({
      success: true,
      data: {
        activities: limitedActivities
      }
    });
  } catch (error) {
    next(error);
  }
};