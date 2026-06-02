import AgreementTemplate from '../models/AgreementTemplate.js';
import AgreementTemplateHistory from '../models/AgreementTemplateHistory.js';
import AgreementSignature from '../models/AgreementSignature.js';
import PartnerCompany from '../models/PartnerCompany.js';
import Company from '../models/Company.js';
import User from '../models/User.js';
import { ApiError } from '../middlewares/error.middleware.js';
import { createNotification, createNotificationsForRecipients } from './notification.controller.js';
import { logActivity, getRequestMetadata, ActionTypes, ResourceTypes } from '../services/activityLog.service.js';

// ==================== ADMIN ROUTES ====================

/**
 * @desc    Get all agreement templates for company (active only)
 * @route   GET /api/agreements
 * @access  Private (Company SuperAdmin, Partner Manager)
 */
export const getAgreementTemplates = async (req, res, next) => {
  try {
    const { type } = req.query;

    // Only fetch active templates - old versions are in history
    const query = {
      companyId: req.user.companyId,
      isActive: true
    };

    if (type) query.type = type;

    const templates = await AgreementTemplate.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ displayOrder: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { templates }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single agreement template
 * @route   GET /api/agreements/:id
 * @access  Private
 */
export const getAgreementTemplate = async (req, res, next) => {
  try {
    const template = await AgreementTemplate.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!template) {
      throw new ApiError(404, 'Agreement template not found');
    }

    // Check access
    // Platform admin can access any template
    if (req.user.role === 'platform_admin') {
      // Allow access
    }
    // Company staff can access their company's templates
    else if (req.user.companyId?.toString() === template.companyId.toString()) {
      // Allow access
    }
    // Partners can access templates of companies they have a partnership with
    else if (req.user.role === 'partner') {
      const partnership = await PartnerCompany.findOne({
        partnerId: req.user._id,
        companyId: template.companyId
      });

      if (!partnership) {
        throw new ApiError(403, 'Access denied');
      }
      // Allow access for partners with valid partnership
    }
    else {
      throw new ApiError(403, 'Access denied');
    }

    res.status(200).json({
      success: true,
      data: { template }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create agreement template
 * @route   POST /api/agreements
 * @access  Private (Company SuperAdmin)
 */
export const createAgreementTemplate = async (req, res, next) => {
  try {
    const { name, type, content, isRequired, displayOrder, description } = req.body;

    // Check if type already exists for this company
    const existing = await AgreementTemplate.findOne({
      companyId: req.user.companyId,
      type,
      isActive: true
    });

    if (existing) {
      throw new ApiError(400, `An active ${type.toUpperCase()} template already exists. Please deactivate it first or create a new version.`);
    }

    // Get max display order
    const maxOrder = await AgreementTemplate.findOne({ companyId: req.user.companyId })
      .sort('-displayOrder')
      .select('displayOrder');
    const order = displayOrder ?? (maxOrder?.displayOrder ?? 0) + 1;

    const template = await AgreementTemplate.create({
      companyId: req.user.companyId,
      name: name || getDefaultName(type),
      type,
      content,
      isRequired: isRequired ?? true,
      displayOrder: order,
      description,
      createdBy: req.user._id
    });

    await template.populate('createdBy', 'firstName lastName');

    // Log activity
    await logActivity({
      userId: req.user._id,
      companyId: req.user.companyId,
      action: ActionTypes.AGREEMENT_CREATED,
      resourceType: ResourceTypes.AGREEMENT,
      resourceId: template._id,
      resourceTitle: template.name,
      details: {
        agreementName: template.name,
        agreementType: template.type,
        isRequired: template.isRequired
      },
      ...getRequestMetadata(req)
    });

    res.status(201).json({
      success: true,
      message: 'Agreement template created successfully',
      data: { template }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update agreement template
 * @route   PUT /api/agreements/:id
 * @access  Private (Company SuperAdmin)
 */
export const updateAgreementTemplate = async (req, res, next) => {
  try {
    const { name, content, isRequired, displayOrder, description, isActive } = req.body;

    const template = await AgreementTemplate.findById(req.params.id);

    if (!template) {
      throw new ApiError(404, 'Agreement template not found');
    }

    // Check access
    if (req.user.role !== 'platform_admin' &&
        req.user.companyId?.toString() !== template.companyId.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Update fields
    if (name !== undefined) template.name = name;
    if (content !== undefined) template.content = content;
    if (isRequired !== undefined) template.isRequired = isRequired;
    if (displayOrder !== undefined) template.displayOrder = displayOrder;
    if (description !== undefined) template.description = description;
    if (isActive !== undefined) template.isActive = isActive;

    template.updatedBy = req.user._id;
    await template.save();

    await template.populate('createdBy', 'firstName lastName');
    await template.populate('updatedBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      message: 'Agreement template updated successfully',
      data: { template }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new version of agreement template
 * @route   POST /api/agreements/:id/new-version
 * @access  Private (Company SuperAdmin)
 */
export const createNewVersion = async (req, res, next) => {
  try {
    const { content, changeDescription } = req.body || {};

    const oldTemplate = await AgreementTemplate.findById(req.params.id);

    if (!oldTemplate) {
      throw new ApiError(404, 'Agreement template not found');
    }

    // Check access
    if (req.user.role !== 'platform_admin' &&
        req.user.companyId?.toString() !== oldTemplate.companyId.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Increment version
    const newVersion = oldTemplate.version + 1;

    // Move old template to history
    await AgreementTemplateHistory.create({
      originalTemplateId: oldTemplate._id,
      companyId: oldTemplate.companyId,
      name: oldTemplate.name,
      type: oldTemplate.type,
      content: oldTemplate.content,
      version: oldTemplate.version,
      isRequired: oldTemplate.isRequired,
      displayOrder: oldTemplate.displayOrder,
      description: oldTemplate.description,
      archiveReason: 'version_update',
      archivedBy: req.user._id,
      createdBy: oldTemplate.createdBy,
      originalCreatedAt: oldTemplate.createdAt,
      originalUpdatedAt: oldTemplate.updatedAt
    });

    // Find all signatures that need to be updated
    const affectedSignatures = await AgreementSignature.find({
      agreementTemplateId: oldTemplate._id,
      status: 'signed'
    });

    // Mark all existing signatures as expired
    await AgreementSignature.updateMany(
      { agreementTemplateId: oldTemplate._id, status: 'signed' },
      {
        isLatestVersion: false,
        newVersionAvailableAt: new Date(),
        status: 'expired'
      }
    );

    // Update the old template in place with new version and content
    oldTemplate.version = newVersion;
    oldTemplate.content = content || oldTemplate.content;
    oldTemplate.updatedBy = req.user._id;
    oldTemplate.updatedAt = new Date();
    await oldTemplate.save();

    // Get unique partner IDs from affected signatures
    if (affectedSignatures.length > 0) {
      // Get partnership IDs from affected signatures
      const partnershipIds = [...new Set(affectedSignatures.map(sig => sig.partnershipId.toString()))];

      // Get partner IDs from partnerships
      const partnerships = await PartnerCompany.find({
        _id: { $in: partnershipIds }
      }).select('partnerId');

      const recipientIds = partnerships
        .map(p => p.partnerId?.toString())
        .filter(Boolean);

      // Create notifications for affected partners
      if (recipientIds.length > 0) {
        await createNotificationsForRecipients({
          recipientIds,
          type: 'agreement_update',
          title: 'Agreement Updated',
          message: `The agreement "${oldTemplate.name}" has been updated. Please review and sign the new version.`,
          data: {
            agreementId: oldTemplate._id,
            companyId: oldTemplate.companyId
          },
          link: '/partner/agreements'
        });
      }
    }

    await oldTemplate.populate('createdBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      message: 'New version created. All partners who signed the previous version have been notified to sign the updated agreement.',
      data: {
        template: oldTemplate,
        previousVersion: newVersion - 1,
        affectedPartners: affectedSignatures.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete agreement template
 * @route   DELETE /api/agreements/:id
 * @access  Private (Company SuperAdmin)
 */
export const deleteAgreementTemplate = async (req, res, next) => {
  try {
    const template = await AgreementTemplate.findById(req.params.id);

    if (!template) {
      throw new ApiError(404, 'Agreement template not found');
    }

    // Check access
    if (req.user.role !== 'platform_admin' &&
        req.user.companyId?.toString() !== template.companyId.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Move to history before deleting
    await AgreementTemplateHistory.create({
      originalTemplateId: template._id,
      companyId: template.companyId,
      name: template.name,
      type: template.type,
      content: template.content,
      version: template.version,
      isRequired: template.isRequired,
      displayOrder: template.displayOrder,
      description: template.description,
      archiveReason: 'deletion',
      archivedBy: req.user._id,
      createdBy: template.createdBy,
      originalCreatedAt: template.createdAt,
      originalUpdatedAt: template.updatedAt
    });

    // Check if any signatures exist
    const signatureCount = await AgreementSignature.countDocuments({
      agreementTemplateId: template._id
    });

    if (signatureCount > 0) {
      // Keep signatures but mark template as removed from active list
      // The history record preserves the template info
      await template.deleteOne();

      res.status(200).json({
        success: true,
        message: 'Agreement template archived. Existing signatures are preserved in history.'
      });
    } else {
      // Hard delete if no signatures
      await template.deleteOne();

      res.status(200).json({
        success: true,
        message: 'Agreement template deleted successfully'
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all signed agreements (for admin to view)
 * @route   GET /api/agreements/signatures
 * @access  Private (Company SuperAdmin, Partner Manager)
 */
export const getSignedAgreements = async (req, res, next) => {
  try {
    const { partnershipId, type, status, page = 1, limit = 20 } = req.query;

    const query = { companyId: req.user.companyId };

    if (partnershipId) query.partnershipId = partnershipId;
    if (status) query.status = status;
    if (type) {
      // Find template IDs of this type
      const templates = await AgreementTemplate.find({
        companyId: req.user.companyId,
        type
      }).select('_id');
      query.agreementTemplateId = { $in: templates.map(t => t._id) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await AgreementSignature.countDocuments(query);

    const signatures = await AgreementSignature.find(query)
      .populate('agreementTemplateId', 'name type version')
      .populate('partnershipId', 'tier status')
      .populate('partnerId', 'firstName lastName email')
      .sort({ signedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        signatures,
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
 * @desc    Get partners who haven't signed latest version
 * @route   GET /api/agreements/:id/pending-signatures
 * @access  Private (Company SuperAdmin)
 */
export const getPendingSignatures = async (req, res, next) => {
  try {
    const template = await AgreementTemplate.findById(req.params.id);

    if (!template) {
      throw new ApiError(404, 'Agreement template not found');
    }

    // Check access
    if (req.user.role !== 'platform_admin' &&
        req.user.companyId?.toString() !== template.companyId.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Get all active partnerships for this company
    const allPartnerships = await PartnerCompany.find({
      companyId: template.companyId,
      status: 'active'
    }).populate('partnerId', 'firstName lastName email');

    // Get partnerships that have signed latest version
    const signedPartnershipIds = await AgreementSignature.distinct('partnershipId', {
      agreementTemplateId: template._id,
      version: template.version,
      status: 'signed'
    });

    // Filter to get pending partnerships
    const pendingPartnerships = allPartnerships.filter(
      p => !signedPartnershipIds.some(s => s.toString() === p._id.toString())
    );

    res.status(200).json({
      success: true,
      data: {
        template,
        pendingPartnerships,
        totalPending: pendingPartnerships.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==================== PARTNER ROUTES ====================

/**
 * @desc    Get agreements to sign (for partner during registration)
 * @route   GET /api/partner/agreements
 * @access  Private (Partner)
 */
export const getPartnerAgreements = async (req, res, next) => {
  try {
    const { partnershipId } = req.query;

    if (!partnershipId) {
      throw new ApiError(400, 'Partnership ID is required');
    }

    // Verify partnership belongs to this partner
    const partnership = await PartnerCompany.findById(partnershipId);

    if (!partnership) {
      throw new ApiError(404, 'Partnership not found');
    }

    if (partnership.partnerId.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Get all active required agreements for this company
    const templates = await AgreementTemplate.find({
      companyId: partnership.companyId,
      isActive: true,
      isRequired: true
    }).sort({ displayOrder: 1 });

    // Get all signatures for this partnership (including expired ones)
    const signatures = await AgreementSignature.find({
      partnershipId: partnershipId
    });

    // Map to include signature status
    const agreementsWithStatus = templates.map(template => {
      // Check if there's a valid signature for this EXACT template version
      const validSignature = signatures.find(
        s => s.agreementTemplateId.toString() === template._id.toString() &&
            s.status === 'signed' &&
            s.version === template.version
      );

      return {
        ...template.toObject(),
        isSigned: !!validSignature,
        signature: validSignature || null
      };
    });

    // Check if all required agreements are signed
    const allSigned = agreementsWithStatus.every(a => a.isSigned);

    // Get all signatures with template details for history
    const allSignatures = await AgreementSignature.find({
      partnershipId: partnershipId
    })
      .populate('agreementTemplateId', 'name type version')
      .sort({ signedAt: -1 });

    // Format signatures for history display - only show expired/old versions, not current
    const signatureHistory = allSignatures
      .filter(sig => {
        // Only include expired signatures or signatures with old versions
        const template = templates.find(t => t._id.toString() === sig.agreementTemplateId?._id?.toString());
        // Include if status is 'expired' OR version is older than current template version
        return sig.status === 'expired' || (template && sig.version < template.version);
      })
      .map(sig => ({
        _id: sig._id,
        agreementTemplateId: sig.agreementTemplateId,
        version: sig.version,
        typedName: sig.typedName,
        signedAt: sig.signedAt,
        ipAddress: sig.ipAddress,
        status: sig.status
      }));

    res.status(200).json({
      success: true,
      data: {
        agreements: agreementsWithStatus,
        allSigned,
        totalAgreements: templates.length,
        signedCount: agreementsWithStatus.filter(a => a.isSigned).length,
        signatureHistory // Only expired/old signatures
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Validate typed signature name
 */
const validateTypedName = (name) => {
  const trimmedName = name?.trim();

  // Check empty
  if (!trimmedName) {
    return 'Please type your name to sign.';
  }

  // Check minimum length
  if (trimmedName.length < 2) {
    return 'Name must be at least 2 characters long.';
  }

  // Check maximum length
  if (trimmedName.length > 100) {
    return 'Name must not exceed 100 characters.';
  }

  // Check for valid characters (letters, spaces, hyphens, apostrophes, and dots)
  const validNameRegex = /^[a-zA-Z\s\-'.]+$/;
  if (!validNameRegex.test(trimmedName)) {
    return 'Name can only contain letters, spaces, hyphens, apostrophes, and periods.';
  }

  // Check for at least one letter
  if (!/[a-zA-Z]/.test(trimmedName)) {
    return 'Name must contain at least one letter.';
  }

  // Check for consecutive special characters
  if (/[\-'.]{2,}/.test(trimmedName)) {
    return 'Name contains invalid consecutive special characters.';
  }

  return null; // No error
};

/**
 * @desc    Sign an agreement
 * @route   POST /api/partner/agreements/:id/sign
 * @access  Private (Partner)
 */
export const signAgreement = async (req, res, next) => {
  try {
    const { partnershipId, typedName } = req.body;

    if (!partnershipId) {
      throw new ApiError(400, 'Partnership ID is required');
    }

    // Validate typed name
    const nameError = validateTypedName(typedName);
    if (nameError) {
      throw new ApiError(400, nameError);
    }

    // Verify partnership
    const partnership = await PartnerCompany.findById(partnershipId);

    if (!partnership) {
      throw new ApiError(404, 'Partnership not found');
    }

    if (partnership.partnerId.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Get template
    const template = await AgreementTemplate.findById(req.params.id);

    if (!template || !template.isActive) {
      throw new ApiError(404, 'Agreement template not found');
    }

    if (template.companyId.toString() !== partnership.companyId.toString()) {
      throw new ApiError(403, 'This agreement does not belong to your company');
    }

    // Check if already signed this version
    const existingSignature = await AgreementSignature.findOne({
      partnershipId,
      agreementTemplateId: template._id,
      version: template.version,
      status: 'signed'
    });

    if (existingSignature) {
      throw new ApiError(400, 'You have already signed this agreement');
    }

    // Create signature record
    const signature = await AgreementSignature.create({
      partnershipId,
      agreementTemplateId: template._id,
      version: template.version,
      contentSnapshot: template.content, // Save content at time of signing
      typedName,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      partnerId: req.user._id,
      companyId: partnership.companyId,
      status: 'signed',
      isLatestVersion: true
    });

    await signature.populate('agreementTemplateId', 'name type version');

    // Check if all required agreements are now signed
    const requiredTemplates = await AgreementTemplate.countDocuments({
      companyId: partnership.companyId,
      isActive: true,
      isRequired: true
    });

    const signedCount = await AgreementSignature.countDocuments({
      partnershipId,
      status: 'signed',
      isLatestVersion: true
    });

    const allSigned = signedCount >= requiredTemplates;

    // Notify company admins about the signed agreement (non-blocking)
    const companyAdmins = await User.find({
      companyId: partnership.companyId,
      role: { $in: ['company_superadmin', 'partner_manager'] },
      isActive: true
    }).select('_id');

    const partner = await User.findById(req.user._id).select('firstName lastName');
    const partnerName = `${partner.firstName} ${partner.lastName}`;

    // Create notifications in parallel (non-blocking)
    const adminIds = companyAdmins.map(admin => admin._id);
    if (adminIds.length > 0) {
      createNotificationsForRecipients(adminIds, {
        type: 'agreement_signed',
        title: 'Agreement Signed',
        message: `${partnerName} has signed the "${template.name}" agreement.`,
        data: {
          agreementId: template._id,
          partnershipId: partnership._id,
          companyId: partnership.companyId,
          signatureId: signature._id
        },
        link: '/company/signed-agreements'
      }).catch(err => console.error('Failed to create agreement signed notifications:', err.message));
    }

    // Log activity
    await logActivity({
      userId: req.user._id,
      companyId: partnership.companyId,
      action: ActionTypes.AGREEMENT_SIGNED,
      resourceType: ResourceTypes.AGREEMENT,
      resourceId: template._id,
      resourceTitle: template.name,
      details: {
        agreementName: template.name,
        agreementType: template.type,
        version: template.version,
        partnerName: partnerName
      },
      ...getRequestMetadata(req)
    });

    res.status(200).json({
      success: true,
      message: 'Agreement signed successfully',
      data: {
        signature,
        allSigned,
        signedCount,
        totalRequired: requiredTemplates
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get partner's signed agreements
 * @route   GET /api/partner/agreements/signed
 * @access  Private (Partner)
 */
export const getSignedAgreementsForPartner = async (req, res, next) => {
  try {
    const { partnershipId } = req.query;

    if (!partnershipId) {
      throw new ApiError(400, 'Partnership ID is required');
    }

    // Verify partnership
    const partnership = await PartnerCompany.findById(partnershipId);

    if (!partnership || partnership.partnerId.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Get all signed agreements for this partnership
    const signatures = await AgreementSignature.find({
      partnershipId,
      status: 'signed'
    })
    .populate('agreementTemplateId', 'name type version')
    .select('agreementTemplateId version typedName signedAt ipAddress status contentSnapshot')
    .sort({ signedAt: -1 });

    res.status(200).json({
      success: true,
      data: { signatures }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get partners with their signed agreements (grouped by partner)
 * @route   GET /api/agreements/signatures/partners
 * @access  Private (Company SuperAdmin, Partner Manager)
 */
export const getPartnersWithSignatures = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;

    // Get all partnerships for this company
    const partnershipsQuery = { companyId: req.user.companyId };

    // Get partnerships with partner info
    let partnerships = await PartnerCompany.find(partnershipsQuery)
      .populate('partnerId', 'firstName lastName email phone avatar')
      .sort({ createdAt: -1 });

    // Filter by search if provided
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      partnerships = partnerships.filter(p =>
        searchRegex.test(p.partnerId?.firstName) ||
        searchRegex.test(p.partnerId?.lastName) ||
        searchRegex.test(p.partnerId?.email)
      );
    }

    // Get agreement templates for this company
    const templates = await AgreementTemplate.find({
      companyId: req.user.companyId,
      isActive: true
    }).sort({ displayOrder: 1 });

    // Get all signatures for this company
    const signatures = await AgreementSignature.find({ companyId: req.user.companyId })
      .populate('agreementTemplateId', 'name type version')
      .sort({ signedAt: -1 });

    // Group signatures by partnership
    const signaturesByPartnership = {};
    signatures.forEach(sig => {
      const pid = sig.partnershipId.toString();
      if (!signaturesByPartnership[pid]) {
        signaturesByPartnership[pid] = [];
      }
      signaturesByPartnership[pid].push(sig);
    });

    // Build partner list with signature info
    const partnersData = partnerships.map(partnership => {
      const partner = partnership.partnerId;
      const partnerSignatures = signaturesByPartnership[partnership._id.toString()] || [];

      // Check which templates are signed (latest version)
      const signedTemplateIds = new Set();

      partnerSignatures.forEach(sig => {
        const template = templates.find(t => t._id.toString() === sig.agreementTemplateId?._id?.toString());
        if (template && sig.version === template.version && sig.status === 'signed') {
          signedTemplateIds.add(template._id.toString());
        }
      });

      const requiredTemplates = templates.filter(t => t.isRequired);
      const signedRequired = requiredTemplates.filter(t => signedTemplateIds.has(t._id.toString()));
      const completionPercentage = requiredTemplates.length > 0
        ? Math.round((signedRequired.length / requiredTemplates.length) * 100)
        : 100;

      return {
        partnershipId: partnership._id,
        partner: {
          _id: partner?._id,
          firstName: partner?.firstName,
          lastName: partner?.lastName,
          email: partner?.email,
          phone: partner?.phone,
          avatar: partner?.avatar
        },
        tier: partnership.tier,
        partnershipStatus: partnership.status,
        createdAt: partnership.createdAt,
        totalTemplates: templates.length,
        requiredTemplates: requiredTemplates.length,
        signedTemplates: signedTemplateIds.size,
        signedRequired: signedRequired.length,
        completionPercentage,
        allSigned: signedRequired.length === requiredTemplates.length,
        signatures: partnerSignatures,
        recentSignature: partnerSignatures[0]?.signedAt || null
      };
    });

    // Pagination
    const total = partnersData.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedData = partnersData.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        partners: paginatedData,
        templates,
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
 * @desc    Get agreement details for a specific partnership (admin view)
 * @route   GET /api/agreements/signatures/partnership/:partnershipId
 * @access  Private (Company SuperAdmin, Partner Manager)
 */
export const getPartnershipAgreementDetails = async (req, res, next) => {
  try {
    const { partnershipId } = req.params;

    // Get partnership with partner and company info
    const partnership = await PartnerCompany.findById(partnershipId)
      .populate('partnerId', 'firstName lastName email phone')
      .populate('companyId', 'name');

    if (!partnership) {
      throw new ApiError(404, 'Partnership not found');
    }

    // Verify access
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== partnership.companyId._id.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Get all active agreement templates for this company
    const templates = await AgreementTemplate.find({
      companyId: partnership.companyId._id,
      isActive: true
    }).sort({ displayOrder: 1 });

    // Get all signatures for this partnership
    const allSignatures = await AgreementSignature.find({
      partnershipId: partnershipId
    })
      .populate('agreementTemplateId', 'name type version')
      .populate('partnerId', 'firstName lastName email')
      .select('agreementTemplateId version typedName signedAt ipAddress status contentSnapshot partnerId')
      .sort({ signedAt: -1 });

    // Separate current signatures from history
    // Current: signed and version matches current template version
    // History: expired or version older than current
    const currentSignatures = [];
    const signatureHistory = [];

    allSignatures.forEach(sig => {
      const template = templates.find(t => t._id.toString() === sig.agreementTemplateId?._id?.toString());
      const isCurrent = template && sig.version === template.version && sig.status === 'signed';

      if (isCurrent) {
        currentSignatures.push(sig);
      } else {
        signatureHistory.push(sig);
      }
    });

    res.status(200).json({
      success: true,
      data: {
        partner: partnership.partnerId,
        partnership: {
          _id: partnership._id,
          status: partnership.status,
          tier: partnership.tier,
          company: partnership.companyId
        },
        templates,
        currentSignatures,
        signatures: signatureHistory // Only expired/old signatures in history
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Get default name for agreement type
 */
const getDefaultName = (type) => {
  const names = {
    nda: 'Non-Disclosure Agreement',
    nca: 'Non-Compete Agreement',
    cpa: 'Channel Partner Agreement',
    code_of_conduct: 'Code of Conduct',
    gdpr_consent: 'GDPR Consent Form',
    other: 'Custom Agreement'
  };
  return names[type] || 'Agreement';
};

/**
 * @desc    Get archived agreement templates history
 * @route   GET /api/agreements/history
 * @access  Private (Company SuperAdmin)
 */
export const getAgreementTemplateHistory = async (req, res, next) => {
  try {
    const { type, archiveReason } = req.query;

    const query = { companyId: req.user.companyId };

    if (type) query.type = type;
    if (archiveReason) query.archiveReason = archiveReason;

    const history = await AgreementTemplateHistory.find(query)
      .populate('archivedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { history }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  // Admin routes
  getAgreementTemplates,
  getAgreementTemplate,
  createAgreementTemplate,
  updateAgreementTemplate,
  createNewVersion,
  deleteAgreementTemplate,
  getSignedAgreements,
  getPendingSignatures,
  getPartnersWithSignatures,
  getAgreementTemplateHistory,

  // Partner routes
  getPartnerAgreements,
  signAgreement,
  getSignedAgreementsForPartner
};