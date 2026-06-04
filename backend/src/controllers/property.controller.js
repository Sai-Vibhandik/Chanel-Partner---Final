import mongoose from 'mongoose';
import Property from '../models/Property.js';
import Company from '../models/Company.js';
import PartnerCompany from '../models/PartnerCompany.js';
import User from '../models/User.js';
import Visit from '../models/Visit.js';
import { ApiError } from '../middlewares/error.middleware.js';
import { sendNewPropertyEmail, sendVisitCancelledEmail } from '../services/email.service.js';
import { createNotification, createNotificationsForRecipients } from './notification.controller.js';
import { checkAllRequiredAgreementsSigned } from '../utils/agreementValidation.js';
import { logActivity, getRequestMetadata, ActionTypes, ResourceTypes } from '../services/activityLog.service.js';

/**
 * @desc    Create new property
 * @route   POST /api/properties
 * @access  Private (Property Manager, Company SuperAdmin)
 */
export const createProperty = async (req, res, next) => {
  try {
    const {
      name, description, type, region,
      location, pricing, details,
      indiaDetails, dubaiDetails,
      visibility, commission,
      images, videos, brochure, floorPlans,
      status // Allow status to be passed
    } = req.body;

    // Validate region-specific details
    if (region === 'india' && indiaDetails?.reraNumber) {
      // Could add RERA validation here
    }
    if (region === 'dubai' && dubaiDetails?.dldPermitNumber) {
      // Could add DLD validation here
    }

    // Determine status (default to 'draft' if not provided)
    const propertyStatus = status || 'draft';

    const property = await Property.create({
      companyId: req.user.companyId,
      name,
      description,
      type,
      region,
      location,
      pricing,
      details,
      indiaDetails: region === 'india' ? indiaDetails : undefined,
      dubaiDetails: region === 'dubai' ? dubaiDetails : undefined,
      visibility: {
        type: visibility?.type || 'all',
        showPrice: visibility?.showPrice ?? true,
        showContact: visibility?.showContact ?? true,
        partnerIds: (visibility?.partnerIds || []).map(id => {
          // Convert to ObjectId if string, otherwise use as is
          return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
        })
      },
      commission: {
        basePercentage: parseFloat(commission?.basePercentage) || 0,
        isFixed: Boolean(commission?.isFixed),
        fixedAmount: commission?.fixedAmount !== undefined && commission?.fixedAmount !== null && commission?.fixedAmount !== ''
          ? parseFloat(commission.fixedAmount)
          : null
      },
      images: images || [],
      videos: videos || [],
      brochure: brochure || null,
      floorPlans: floorPlans || [],
      createdBy: req.user._id,
      status: propertyStatus,
      publishedAt: propertyStatus === 'active' ? new Date() : undefined
    });

    await property.populate('createdBy', 'firstName lastName');
    await property.populate('companyId', 'name logo regions');

    // Send email notification to partners if property is created as active
    if (propertyStatus === 'active') {
      try {
        // Get all active partners for this company
        const activePartnerships = await PartnerCompany.find({
          companyId: property.companyId,
          status: 'active'
        }).populate('partnerId', 'firstName lastName email');

        // Filter partners who should see this property based on visibility settings
        const partnersToNotify = activePartnerships.filter(partnership => {
          const propVisibility = property.visibility || { type: 'all' };

          // If visibility is 'all', notify everyone
          if (propVisibility.type === 'all') return true;

          // If visibility is 'selected', only notify selected partners
          if (propVisibility.type === 'selected' && propVisibility.partnerIds) {
            return propVisibility.partnerIds.some(id => id.toString() === partnership.partnerId._id.toString());
          }

          // If visibility is 'hidden', notify partners NOT in the hidden list
          if (propVisibility.type === 'hidden' && propVisibility.partnerIds) {
            return !propVisibility.partnerIds.some(id => id.toString() === partnership.partnerId._id.toString());
          }

          return true;
        }).map(p => p.partnerId);

        // Send emails (don't await, run in background)
        if (partnersToNotify.length > 0) {
          sendNewPropertyEmail(partnersToNotify, property, property.companyId).catch(err => {
            console.error('Failed to send property notification emails:', err);
          });

          // Create notifications for partners
          const recipientIds = partnersToNotify.map(p => p._id);
          createNotificationsForRecipients({
            recipientIds,
            type: 'new_property',
            title: 'New Property Available',
            message: `A new property "${property.name}" is now available for visits.`,
            data: {
              propertyId: property._id,
              companyId: property.companyId
            },
            link: '/partner/properties'
          }).catch(err => {
            console.error('Failed to create property notification:', err.message);
          });
        }
      } catch (emailError) {
        // Don't fail the request if email fails
        console.error('Error sending property notification:', emailError);
      }
    }

    res.status(201).json({
      success: true,
      message: propertyStatus === 'active'
        ? 'Property created and published successfully. Partners have been notified.'
        : 'Property created successfully',
      data: { property }
    });

    // Log activity
    await logActivity({
      userId: req.user._id,
      companyId: req.user.companyId,
      action: propertyStatus === 'active' ? ActionTypes.PROPERTY_PUBLISHED : ActionTypes.PROPERTY_CREATED,
      resourceType: ResourceTypes.PROPERTY,
      resourceId: property._id,
      resourceTitle: property.name,
      details: {
        propertyName: property.name,
        propertyType: property.type,
        status: propertyStatus,
        region: property.region
      },
      ...getRequestMetadata(req)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all properties for company
 * @route   GET /api/properties
 * @access  Private (Company staff, Partners)
 */
export const getProperties = async (req, res, next) => {
  try {
    const {
      status, type, region, city,
      minPrice, maxPrice, bedrooms,
      page = 1, limit = 10, search
    } = req.query;

    // Build query
    const query = {};

    // Company scope - for company staff, show their company's properties
    if (req.user.role !== 'platform_admin') {
      if (req.user.role === 'partner') {
        // Partners see properties from companies they have active partnerships with
        // Get all active partnerships for this partner
        const activePartnerships = await PartnerCompany.find({
          partnerId: req.user._id,
          status: 'active'
        }).select('companyId');

        const partneredCompanyIds = activePartnerships.map(p => p.companyId);

        if (partneredCompanyIds.length === 0) {
          // No active partnerships, return empty result
          return res.status(200).json({
            success: true,
            data: {
              properties: [],
              pagination: {
                total: 0,
                page: parseInt(page),
                pages: 0
              }
            }
          });
        }

        // Filter out companies with expired subscriptions
        const now = new Date();
        const activeCompanies = await Company.find({
          _id: { $in: partneredCompanyIds },
          status: 'active',
          'subscription.status': 'active'
        }).select('_id');

        const activeCompanyIds = activeCompanies.map(c => c._id);

        if (activeCompanyIds.length === 0) {
          // No companies with active subscriptions, return empty result
          return res.status(200).json({
            success: true,
            data: {
              properties: [],
              pagination: {
                total: 0,
                page: parseInt(page),
                pages: 0
              }
            }
          });
        }

        // Filter out companies where partner hasn't signed all required agreements
        const companiesWithAllAgreementsSigned = [];
        for (const partnership of activePartnerships) {
          // Only check companies that are in the active subscription list
          if (activeCompanyIds.some(id => id.toString() === partnership.companyId.toString())) {
            const agreementCheck = await checkAllRequiredAgreementsSigned(
              partnership._id,
              partnership.companyId
            );
            if (agreementCheck.allSigned) {
              companiesWithAllAgreementsSigned.push(partnership.companyId);
            }
          }
        }

        if (companiesWithAllAgreementsSigned.length === 0) {
          // Partner hasn't signed all agreements for any company
          return res.status(200).json({
            success: true,
            data: {
              properties: [],
              pagination: {
                total: 0,
                page: parseInt(page),
                pages: 0
              }
            }
          });
        }

        query.companyId = { $in: companiesWithAllAgreementsSigned };
        query.status = { $in: ['active', 'sold_out'] }; // Show active and sold properties to partners
        // Visibility logic: 'all' = show to all, 'selected' = show to selected partners, 'hidden' = hide from selected partners
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { 'visibility.type': 'all' },
            { 'visibility.type': { $exists: false } }, // Backward compatibility
            { 'visibility.type': 'selected', 'visibility.partnerIds': req.user._id },
            { 'visibility.type': 'hidden', 'visibility.partnerIds': { $ne: req.user._id } }
          ]
        });
      } else {
        // Company staff see their company's properties
        query.companyId = req.user.companyId;
      }
    }

    // Filters
    if (status) query.status = status;
    if (type) query.type = type;
    if (region) query.region = region;
    if (city) query['location.city'] = new RegExp(city, 'i');

    // Price range
    if (minPrice || maxPrice) {
      query['pricing.basePrice'] = {};
      if (minPrice) query['pricing.basePrice'].$gte = Number(minPrice);
      if (maxPrice) query['pricing.basePrice'].$lte = Number(maxPrice);
    }

    // Bedrooms
    if (bedrooms) {
      if (bedrooms === '4+') {
        query['details.bedrooms'] = { $gte: 4 };
      } else {
        query['details.bedrooms'] = Number(bedrooms);
      }
    }

    // Search
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { 'location.address': new RegExp(search, 'i') },
        { 'location.city': new RegExp(search, 'i') }
      ];
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Property.countDocuments(query);

    const properties = await Property.find(query)
      .populate('companyId', 'name logo regions')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        properties,
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
 * @desc    Get single property
 * @route   GET /api/properties/:id
 * @access  Private
 */
export const getProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('companyId', 'name logo regions address settings subscription')
      .populate('createdBy', 'firstName lastName');

    if (!property) {
      throw new ApiError(404, 'Property not found');
    }

    // Access control for partners
    if (req.user.role === 'partner') {
      // Partners can only view active properties
      if (property.status !== 'active') {
        throw new ApiError(403, 'This property is not available');
      }

      // Check if partner has active partnership with this property's company
      const activePartnership = await PartnerCompany.findOne({
        partnerId: req.user._id,
        companyId: property.companyId._id,
        status: 'active'
      });

      if (!activePartnership) {
        throw new ApiError(403, 'You do not have access to this property');
      }

      // Check if company has active subscription
      const company = property.companyId;
      const subscriptionStatus = company.subscription?.status;
      const now = new Date();
      let hasActiveSubscription = false;

      if (subscriptionStatus === 'active') {
        hasActiveSubscription = true;
      }

      if (!hasActiveSubscription) {
        throw new ApiError(403, 'This property is not available');
      }

      // Check visibility
      if (property.visibility?.type === 'selected') {
        if (!property.visibility.partnerIds.some(id => id.toString() === req.user._id.toString())) {
          throw new ApiError(403, 'This property is not visible to you');
        }
      } else if (property.visibility?.type === 'hidden') {
        if (property.visibility.partnerIds.some(id => id.toString() === req.user._id.toString())) {
          throw new ApiError(403, 'This property is hidden from you');
        }
      }
    } else if (req.user.role !== 'platform_admin') {
      // Company staff - check if property belongs to their company
      if (req.user.companyId?.toString() !== property.companyId._id.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    }

    // Increment view count only for partners (exclude internal users like property_manager, partner_manager, admin, etc.)
    const internalRoles = ['platform_admin', 'company_superadmin', 'property_manager', 'partner_manager', 'operations_manager', 'finance_manager', 'admin', 'viewer'];
    if (!internalRoles.includes(req.user.role)) {
      if (!property.stats) {
        property.stats = { totalViews: 0, totalInquiries: 0, totalVisits: 0, totalBookings: 0 };
      }
      property.stats.totalViews = (property.stats.totalViews || 0) + 1;
      property.markModified('stats'); // Required for Mongoose to detect nested object changes
      await property.save();
    }

    res.status(200).json({
      success: true,
      data: { property }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update property
 * @route   PUT /api/properties/:id
 * @access  Private (Property Manager, Company SuperAdmin)
 */
export const updateProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      throw new ApiError(404, 'Property not found');
    }

    // Check access
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== property.companyId.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Check if property is sold out - sold out properties cannot be edited
    if (property.status === 'sold_out') {
      throw new ApiError(400, 'Sold out properties cannot be edited');
    }

    // Update fields
    const updateFields = [
      'name', 'description', 'type', 'location', 'pricing',
      'details', 'indiaDetails', 'dubaiDetails', 'visibility', 'commission',
      'images', 'videos', 'brochure', 'floorPlans'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'commission') {
          // Handle commission specifically to ensure proper number parsing
          const commissionData = req.body[field];
          property.set('commission', {
            basePercentage: parseFloat(commissionData?.basePercentage) || 0,
            isFixed: Boolean(commissionData?.isFixed),
            fixedAmount: commissionData?.fixedAmount !== undefined && commissionData?.fixedAmount !== null && commissionData?.fixedAmount !== ''
              ? parseFloat(commissionData.fixedAmount)
              : null
          });
        } else if (field === 'visibility') {
          // Handle visibility specifically to ensure partnerIds are ObjectIds
          const visibilityData = req.body[field];
          property.set('visibility', {
            type: visibilityData?.type || 'all',
            showPrice: visibilityData?.showPrice ?? true,
            showContact: visibilityData?.showContact ?? true,
            partnerIds: (visibilityData?.partnerIds || []).map(id => {
              // Convert to ObjectId if string, otherwise use as is
              return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
            })
          });
        } else if (field === 'brochure') {
          // Handle brochure explicitly to ensure Mongoose detects changes
          const brochureData = req.body.brochure;
          if (brochureData && brochureData.url) {
            property.set('brochure', {
              url: String(brochureData.url),
              publicId: String(brochureData.publicId || ''),
              name: String(brochureData.name || '')
            });
          } else if (brochureData === null) {
            // Clear brochure if explicitly set to null
            property.brochure = undefined;
          } else {
            property.set('brochure', brochureData);
          }
        } else if (field === 'floorPlans') {
          // Handle floorPlans explicitly for arrays
          property.set('floorPlans', req.body.floorPlans);
        } else {
          property[field] = req.body[field];
        }
      }
    });

    property.updatedBy = req.user._id;
    await property.save();

    await property.populate('companyId', 'name logo regions');
    await property.populate('updatedBy', 'firstName lastName');

    // Log activity
    await logActivity({
      userId: req.user._id,
      companyId: req.user.companyId,
      action: ActionTypes.PROPERTY_UPDATED,
      resourceType: ResourceTypes.PROPERTY,
      resourceId: property._id,
      resourceTitle: property.name,
      details: {
        propertyName: property.name,
        propertyType: property.type
      },
      ...getRequestMetadata(req)
    });

    res.status(200).json({
      success: true,
      message: 'Property updated successfully',
      data: { property }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete property
 * @route   DELETE /api/properties/:id
 * @access  Private (Property Manager, Company SuperAdmin)
 */
export const deleteProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      throw new ApiError(404, 'Property not found');
    }

    // Check access
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== property.companyId.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    const propertyName = property.name;
    const propertyId = property._id;
    const companyId = property.companyId;

    await property.deleteOne();

    // Log activity
    await logActivity({
      userId: req.user._id,
      companyId: companyId,
      action: ActionTypes.PROPERTY_DELETED,
      resourceType: ResourceTypes.PROPERTY,
      resourceId: propertyId,
      resourceTitle: propertyName,
      details: {
        propertyName: propertyName
      },
      ...getRequestMetadata(req)
    });

    res.status(200).json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update property status
 * @route   PUT /api/properties/:id/status
 * @access  Private (Property Manager, Company SuperAdmin)
 */
export const updatePropertyStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const property = await Property.findById(req.params.id);

    if (!property) {
      throw new ApiError(404, 'Property not found');
    }

    // Check access
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== property.companyId.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    const validStatuses = ['draft', 'active', 'sold_out', 'off_market'];
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, 'Invalid status');
    }

    const previousStatus = property.status;
    property.status = status;

    if (status === 'active') {
      property.publishedAt = new Date();
    } else if (status === 'sold_out') {
      property.soldAt = new Date();
    }

    await property.save();

    // Handle visit cancellations when property becomes unavailable
    if (['off_market', 'sold_out'].includes(status)) {
      try {
        // Find ALL visits for this property (pending, approved, scheduled)
        // Note: We cancel ALL future visits, not just pending/approved
        const affectedVisits = await Visit.find({
          property: property._id,
          status: { $in: ['pending', 'approved', 'scheduled'] }
        }).populate('partner', 'firstName lastName email');

        if (affectedVisits.length > 0) {
          // Get company info for email
          const company = await Company.findById(property.companyId);

          // Determine cancellation reason
          const cancellationReason = status === 'sold_out'
            ? 'This property has been sold and is no longer available for visits.'
            : 'This property has been taken off the market and is no longer available for visits.';

          let cancelledCount = 0;
          let errorCount = 0;

          // Cancel each visit and notify partner
          for (const visit of affectedVisits) {
            try {
              // Update visit status
              visit.status = 'cancelled';
              visit.cancellationReason = cancellationReason;
              await visit.save();
              cancelledCount++;

              // Skip if no partner
              if (!visit.partner) continue;

              // Create in-app notification
              await createNotification({
                recipientId: visit.partner._id,
                type: 'visit_cancelled',
                title: 'Visit Cancelled',
                message: `Your visit to "${property.name}" on ${new Date(visit.scheduledDate).toLocaleDateString()} has been cancelled. ${cancellationReason}`,
                data: {
                  visitId: visit._id,
                  propertyId: property._id,
                  companyId: property.companyId
                },
                link: '/partner/visits'
              });

              // Send email notification
              if (visit.partner.email) {
                sendVisitCancelledEmail(visit, visit.partner, property, company, cancellationReason).catch(err => {
                  console.error('Failed to send visit cancellation email to', visit.partner.email, err);
                });
              }
            } catch (visitError) {
              errorCount++;
              console.error(`Error cancelling visit ${visit._id}:`, visitError);
            }
          }
        }
      } catch (cancelError) {
        // Log error but still continue with the response
        console.error('Error in visit cancellation process:', cancelError);
        // Don't throw - still return success for property status update
      }
    }

    // Send email notification to partners when property becomes active
    if (status === 'active' && previousStatus !== 'active') {
      try {
        // Get company info
        const company = await Company.findById(property.companyId);

        // Get all active partners for this company
        const activePartnerships = await PartnerCompany.find({
          companyId: property.companyId,
          status: 'active'
        }).populate('partnerId', 'firstName lastName email');

        // Filter partners who should see this property based on visibility settings
        const partnersToNotify = activePartnerships.filter(partnership => {
          const visibility = property.visibility || { type: 'all' };

          // If visibility is 'all', notify everyone
          if (visibility.type === 'all') return true;

          // If visibility is 'selected', only notify selected partners
          if (visibility.type === 'selected' && visibility.partnerIds) {
            return visibility.partnerIds.some(id => id.toString() === partnership.partnerId._id.toString());
          }

          // If visibility is 'hidden', notify partners NOT in the hidden list
          if (visibility.type === 'hidden' && visibility.partnerIds) {
            return !visibility.partnerIds.some(id => id.toString() === partnership.partnerId._id.toString());
          }

          return true;
        }).map(p => p.partnerId);

        // Send emails (don't await, run in background)
        if (partnersToNotify.length > 0) {
          sendNewPropertyEmail(partnersToNotify, property, company).catch(err => {
            console.error('Failed to send property notification emails:', err);
          });
        }
      } catch (emailError) {
        // Don't fail the request if email fails
        console.error('Error sending property notification:', emailError);
      }
    }

    // Log activity
    await logActivity({
      userId: req.user._id,
      companyId: property.companyId,
      action: status === 'active' && previousStatus !== 'active'
        ? ActionTypes.PROPERTY_PUBLISHED
        : ActionTypes.PROPERTY_STATUS_CHANGED,
      resourceType: ResourceTypes.PROPERTY,
      resourceId: property._id,
      resourceTitle: property.name,
      details: {
        propertyName: property.name,
        previousStatus: previousStatus,
        newStatus: status
      },
      ...getRequestMetadata(req)
    });

    res.status(200).json({
      success: true,
      message: `Property status updated to ${status}`,
      data: { property }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload property images
 * @route   POST /api/properties/:id/images
 * @access  Private (Property Manager, Company SuperAdmin)
 */
export const uploadPropertyImages = async (req, res, next) => {
  try {
    const { images } = req.body; // Array of { url, publicId, caption, isPrimary }

    const property = await Property.findById(req.params.id);

    if (!property) {
      throw new ApiError(404, 'Property not found');
    }

    // Check access
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== property.companyId.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // If setting a primary image, unset others
    const hasNewPrimary = images?.some(img => img.isPrimary);
    if (hasNewPrimary) {
      property.images.forEach(img => {
        img.isPrimary = false;
      });
    }

    // Add new images
    images.forEach(img => {
      property.images.push({
        url: img.url,
        publicId: img.publicId,
        caption: img.caption,
        isPrimary: img.isPrimary || false
      });
    });

    await property.save();

    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      data: { images: property.images }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete property image
 * @route   DELETE /api/properties/:id/images/:imageId
 * @access  Private (Property Manager, Company SuperAdmin)
 */
export const deletePropertyImage = async (req, res, next) => {
  try {
    const { id, imageId } = req.params;

    const property = await Property.findById(id);

    if (!property) {
      throw new ApiError(404, 'Property not found');
    }

    // Check access
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== property.companyId.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    const imageIndex = property.images.findIndex(img => img._id.toString() === imageId);
    if (imageIndex === -1) {
      throw new ApiError(404, 'Image not found');
    }

    property.images.splice(imageIndex, 1);
    await property.save();

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload property brochure
 * @route   POST /api/properties/:id/brochure
 * @access  Private (Property Manager, Company SuperAdmin)
 */
export const uploadPropertyBrochure = async (req, res, next) => {
  try {
    const { url, publicId, name } = req.body;

    const property = await Property.findById(req.params.id);

    if (!property) {
      throw new ApiError(404, 'Property not found');
    }

    // Check access
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== property.companyId.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    property.brochure = { url, publicId, name };
    await property.save();

    res.status(200).json({
      success: true,
      message: 'Brochure uploaded successfully',
      data: { brochure: property.brochure }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get property statistics
 * @route   GET /api/properties/stats
 * @access  Private (Company staff)
 */
export const getPropertyStats = async (req, res, next) => {
  try {
    const query = { companyId: req.user.companyId };

    const stats = await Property.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          draft: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
          soldOut: { $sum: { $cond: [{ $eq: ['$status', 'sold_out'] }, 1, 0] } }
        }
      }
    ]);

    const byType = await Property.aggregate([
      { $match: query },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const byRegion = await Property.aggregate([
      { $match: query },
      { $group: { _id: '$region', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: stats[0] || { total: 0, active: 0, draft: 0, soldOut: 0 },
        byType: byType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byRegion: byRegion.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get public properties (for partners)
 * @route   GET /api/properties/public
 * @access  Public
 */
export const getPublicProperties = async (req, res, next) => {
  try {
    const {
      companyId, region, type, city,
      minPrice, maxPrice, bedrooms,
      page = 1, limit = 10, search
    } = req.query;

    // Get list of companies with active subscriptions
    const activeCompanyIds = await Company.find({
      status: 'active',
      'subscription.status': 'active'
    }).select('_id');

    const activeCompanyIdsList = activeCompanyIds.map(c => c._id);

    const query = {
      status: 'active',
      'visibility.type': 'all',
      companyId: { $in: activeCompanyIdsList }
    };

    if (companyId) query.companyId = companyId;
    if (region) query.region = region;
    if (type) query.type = type;
    if (city) query['location.city'] = new RegExp(city, 'i');

    if (minPrice || maxPrice) {
      query['pricing.basePrice'] = {};
      if (minPrice) query['pricing.basePrice'].$gte = Number(minPrice);
      if (maxPrice) query['pricing.basePrice'].$lte = Number(maxPrice);
    }

    if (bedrooms) {
      if (bedrooms === '4+') {
        query['details.bedrooms'] = { $gte: 4 };
      } else {
        query['details.bedrooms'] = Number(bedrooms);
      }
    }

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { 'location.city': new RegExp(search, 'i') }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Property.countDocuments(query);

    const properties = await Property.find(query)
      .populate('companyId', 'name logo regions')
      .select('-stats -__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        properties,
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
 * @desc    Get properties for a specific partnership (Partner only)
 * @route   GET /api/properties/partnership/:partnershipId
 * @access  Private (Partner - own partnership only)
 */
export const getPropertiesForPartnership = async (req, res, next) => {
  try {
    const { partnershipId } = req.params;
    const {
      type, region, city,
      minPrice, maxPrice, bedrooms,
      page = 1, limit = 10, search
    } = req.query;

    // Verify partnership belongs to this partner
    const partnership = await PartnerCompany.findById(partnershipId);

    if (!partnership) {
      throw new ApiError(404, 'Partnership not found');
    }

    if (partnership.partnerId.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    if (partnership.status !== 'active') {
      throw new ApiError(403, 'Your partnership is not active');
    }

    // Check if company has active subscription
    const company = await Company.findById(partnership.companyId);
    if (!company) {
      throw new ApiError(404, 'Company not found');
    }

    const subscriptionStatus = company.subscription?.status;
    const hasActiveSubscription = subscriptionStatus === 'active';

    // If company subscription is expired, return empty properties
    if (!hasActiveSubscription) {
      return res.status(200).json({
        success: true,
        data: {
          properties: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            pages: 0
          }
        }
      });
    }

    // Build query for properties from this company
    // Show both active and sold_out properties (sold properties show with badge)
    const query = {
      companyId: partnership.companyId,
      status: { $in: ['active', 'sold_out'] }
    };

    // Add visibility filter for partner
    // 'all' = show to all, 'selected' = show to selected partners, 'hidden' = hide from selected partners
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { 'visibility.type': 'all' },
        { 'visibility.type': { $exists: false } }, // Backward compatibility
        { 'visibility.type': 'selected', 'visibility.partnerIds': req.user._id },
        { 'visibility.type': 'hidden', 'visibility.partnerIds': { $ne: req.user._id } }
      ]
    });

    // Filters
    if (type) query.type = type;
    if (region) query.region = region;
    if (city) query['location.city'] = new RegExp(city, 'i');

    if (minPrice || maxPrice) {
      query['pricing.basePrice'] = {};
      if (minPrice) query['pricing.basePrice'].$gte = Number(minPrice);
      if (maxPrice) query['pricing.basePrice'].$lte = Number(maxPrice);
    }

    if (bedrooms) {
      if (bedrooms === '4+') {
        query['details.bedrooms'] = { $gte: 4 };
      } else {
        query['details.bedrooms'] = Number(bedrooms);
      }
    }

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { 'location.city': new RegExp(search, 'i') }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Property.countDocuments(query);

    const properties = await Property.find(query)
      .populate('companyId', 'name logo regions address settings.tierPercentages')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get partner's tier and commission percentage for this partnership
    const tierPercentages = partnership.commissionPercentage
      ? { [partnership.tier]: partnership.commissionPercentage }
      : null;

    res.status(200).json({
      success: true,
      data: {
        properties,
        partnership: {
          _id: partnership._id,
          tier: partnership.tier,
          commissionPercentage: partnership.commissionPercentage,
          status: partnership.status
        },
        tierPercentages,
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
 * @desc    Get properties for all partnerships of the logged-in partner
 * @route   GET /api/properties/all-partnerships
 * @access  Private (Partner only)
 */
export const getPropertiesForAllPartnerships = async (req, res, next) => {
  try {
    const {
      type, region, city,
      minPrice, maxPrice, bedrooms,
      page = 1, limit = 10, search
    } = req.query;

    // Get all active partnerships for this partner
    const partnerships = await PartnerCompany.find({
      partnerId: req.user._id,
      status: 'active'
    }).populate('companyId', 'name logo regions address settings.tierPercentages subscription');

    if (partnerships.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          properties: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            pages: 0
          }
        }
      });
    }

    // Filter partnerships with active subscriptions
    const activeCompanyIds = partnerships
      .filter(p => {
        const company = p.companyId;
        if (!company) return false;
        if (company.subscription?.status === 'active') return true;
        return false;
      })
      .map(p => p.companyId._id);

    if (activeCompanyIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          properties: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            pages: 0
          }
        }
      });
    }

    // Build query for properties from all active companies
    const query = {
      companyId: { $in: activeCompanyIds },
      status: { $in: ['active', 'sold_out'] }
    };

    // Add visibility filter for partner
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { 'visibility.type': 'all' },
        { 'visibility.type': { $exists: false } },
        { 'visibility.type': 'selected', 'visibility.partnerIds': req.user._id },
        { 'visibility.type': 'hidden', 'visibility.partnerIds': { $ne: req.user._id } }
      ]
    });

    // Filters
    if (type) query.type = type;
    if (region) query.region = region;
    if (city) query['location.city'] = new RegExp(city, 'i');

    if (minPrice || maxPrice) {
      query['pricing.basePrice'] = {};
      if (minPrice) query['pricing.basePrice'].$gte = Number(minPrice);
      if (maxPrice) query['pricing.basePrice'].$lte = Number(maxPrice);
    }

    if (bedrooms) {
      if (bedrooms === '4+') {
        query['details.bedrooms'] = { $gte: 4 };
      } else {
        query['details.bedrooms'] = Number(bedrooms);
      }
    }

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { 'location.city': new RegExp(search, 'i') }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Property.countDocuments(query);

    const properties = await Property.find(query)
      .populate('companyId', 'name logo regions address settings.tierPercentages')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        properties,
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
 * @desc    Get property performance report
 * @route   GET /api/properties/reports/performance
 * @access  Private (Property Manager, Company SuperAdmin)
 */
export const getPropertyPerformanceReport = async (req, res, next) => {
  try {
    const { period = 'month', sortBy = 'totalVisits', sortOrder = 'desc', page = 1, limit = 10 } = req.query;

    // Calculate date range for the CURRENT period
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'week':
        // This week (from start of week to end of week)
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay()); // Start of this week (Sunday)
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6); // End of this week (Saturday)
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'quarter': {
        // This quarter (from start of quarter to end of quarter)
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0, 23, 59, 59, 999); // Last day of quarter
        break;
      }
      case 'year':
        // This year (from Jan 1 to Dec 31)
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      default: // month
        // This month (from 1st to last day of month)
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); // Last day of month
    }

    // Get all properties for the company
    const properties = await Property.find({ companyId: req.user.companyId })
      .select('_id name type status location city stats')
      .lean();

    // Get visit counts for each property
    const Visit = (await import('../models/Visit.js')).default;

    const visitStats = await Visit.aggregate([
      {
        $match: {
          companyId: req.user.companyId,
          scheduledDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$property',
          totalVisits: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
        }
      }
    ]);

    // Create a map of property visit stats
    const visitMap = {};
    visitStats.forEach(stat => {
      visitMap[stat._id.toString()] = stat;
    });

    // Merge property data with visit stats
    const propertyData = properties.map(prop => {
      const stats = visitMap[prop._id.toString()] || { totalVisits: 0, pending: 0, approved: 0, completed: 0, cancelled: 0 };
      return {
        _id: prop._id,
        name: prop.name,
        type: prop.type,
        status: prop.status,
        city: prop.location?.city || '',
        totalViews: prop.stats?.totalViews || 0,
        totalVisits: stats.totalVisits,
        pending: stats.pending,
        approved: stats.approved,
        completed: stats.completed,
        cancelled: stats.cancelled
      };
    });

    // Sort
    propertyData.sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // Summary
    const summary = {
      totalProperties: properties.length,
      totalVisits: propertyData.reduce((sum, p) => sum + p.totalVisits, 0),
      totalViews: propertyData.reduce((sum, p) => sum + p.totalViews, 0),
      avgVisitsPerProperty: properties.length > 0
        ? (propertyData.reduce((sum, p) => sum + p.totalVisits, 0) / properties.length).toFixed(1)
        : 0
    };

    // Pagination
    const total = propertyData.length;
    const pages = Math.ceil(total / parseInt(limit));
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const paginatedData = propertyData.slice(startIndex, startIndex + parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        summary,
        properties: paginatedData,
        pagination: {
          total,
          page: parseInt(page),
          pages
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get visit analytics
 * @route   GET /api/properties/reports/visit-analytics
 * @access  Private (Property Manager, Company SuperAdmin)
 */
export const getVisitAnalytics = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;

    // Calculate date range for the CURRENT period
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'week':
        // This week (from start of week to end of week)
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay()); // Start of this week (Sunday)
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6); // End of this week (Saturday)
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'quarter': {
        // This quarter (from start of quarter to end of quarter)
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0, 23, 59, 59, 999); // Last day of quarter
        break;
      }
      case 'year':
        // This year (from Jan 1 to Dec 31)
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      default: // month
        // This month (from 1st to last day of month)
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); // Last day of month
    }

    const Visit = (await import('../models/Visit.js')).default;

    // Determine date format based on period for better visualization
    let dateFormat;
    switch (period) {
      case 'year':
        dateFormat = '%Y-%m'; // Monthly for year view
        break;
      case 'quarter':
        dateFormat = '%Y-%m'; // Monthly for quarter view
        break;
      default:
        dateFormat = '%Y-%m-%d'; // Daily for week/month view
    }

    // Visit trends over time
    const visitTrends = await Visit.aggregate([
      {
        $match: {
          companyId: req.user.companyId,
          scheduledDate: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$scheduledDate' } },
          total: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Visits by status
    const visitsByStatus = await Visit.aggregate([
      {
        $match: {
          companyId: req.user.companyId,
          scheduledDate: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Visits by property type
    const visitsByPropertyType = await Visit.aggregate([
      {
        $match: {
          companyId: req.user.companyId,
          scheduledDate: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $lookup: {
          from: 'properties',
          localField: 'property',
          foreignField: '_id',
          as: 'propertyData'
        }
      },
      { $unwind: '$propertyData' },
      {
        $group: {
          _id: '$propertyData.type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Top performing properties
    const topProperties = await Visit.aggregate([
      {
        $match: {
          companyId: req.user.companyId,
          scheduledDate: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: '$property',
          totalVisits: { $sum: 1 }
        }
      },
      { $sort: { totalVisits: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'properties',
          localField: '_id',
          foreignField: '_id',
          as: 'propertyData'
        }
      },
      { $unwind: '$propertyData' },
      {
        $project: {
          _id: 1,
          name: '$propertyData.name',
          type: '$propertyData.type',
          totalVisits: 1
        }
      }
    ]);

    // Format data
    const visitsByStatusFormatted = visitsByStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const visitsByPropertyTypeFormatted = visitsByPropertyType.reduce((acc, item) => {
      acc[item._id || 'unknown'] = item.count;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        visitTrends,
        visitsByStatus: visitsByStatusFormatted,
        visitsByPropertyType: visitsByPropertyTypeFormatted,
        topProperties
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export property report
 * @route   GET /api/properties/reports/export
 * @access  Private (Property Manager, Company SuperAdmin)
 */
export const exportPropertyReport = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;

    // Calculate date range for the CURRENT period
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'week':
        // This week (from start of week to end of week)
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay()); // Start of this week (Sunday)
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6); // End of this week (Saturday)
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'quarter': {
        // This quarter (from start of quarter to end of quarter)
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0, 23, 59, 59, 999); // Last day of quarter
        break;
      }
      case 'year':
        // This year (from Jan 1 to Dec 31)
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      default: // month
        // This month (from 1st to last day of month)
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); // Last day of month
    }

    // Get all properties for the company
    const properties = await Property.find({ companyId: req.user.companyId })
      .select('_id name type status location stats')
      .lean();

    const Visit = (await import('../models/Visit.js')).default;

    // Get visit counts for each property
    const visitStats = await Visit.aggregate([
      {
        $match: {
          companyId: req.user.companyId,
          scheduledDate: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: '$property',
          totalVisits: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
        }
      }
    ]);

    // Create a map of property visit stats
    const visitMap = {};
    visitStats.forEach(stat => {
      visitMap[stat._id.toString()] = stat;
    });

    // Prepare report data
    const report = properties.map(prop => {
      const stats = visitMap[prop._id.toString()] || { totalVisits: 0, completed: 0 };
      return {
        name: prop.name,
        type: prop.type,
        status: prop.status,
        city: prop.location?.city || '',
        totalViews: prop.stats?.totalViews || 0,
        totalVisits: stats.totalVisits,
        completed: stats.completed
      };
    });

    res.status(200).json({
      success: true,
      data: { report }
    });
  } catch (error) {
    next(error);
  }
};