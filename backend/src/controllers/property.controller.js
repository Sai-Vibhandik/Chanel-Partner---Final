import Property from '../models/Property.js';
import Company from '../models/Company.js';
import PartnerCompany from '../models/PartnerCompany.js';
import User from '../models/User.js';
import { ApiError } from '../middlewares/error.middleware.js';
import { sendNewPropertyEmail } from '../services/email.service.js';

/**
 * @desc    Create new property
 * @route   POST /api/properties
 * @access  Private (Property Manager, Company SuperAdmin)
 */
export const createProperty = async (req, res, next) => {
  try {
    console.log('Creating property - received data:', {
      hasImages: !!req.body.images,
      imagesCount: req.body.images?.length || 0,
      hasVideos: !!req.body.videos,
      videosCount: req.body.videos?.length || 0,
      hasBrochure: !!req.body.brochure,
      hasFloorPlans: !!req.body.floorPlans,
      floorPlansCount: req.body.floorPlans?.length || 0,
      commission: req.body.commission,
      status: req.body.status
    });

    const {
      name, description, type, region,
      location, pricing, details,
      indiaDetails, dubaiDetails,
      visibility, commission,
      images, videos, brochure, floorPlans,
      status // Allow status to be passed
    } = req.body;

    console.log('Commission data received:', commission);

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
      visibility: visibility || { type: 'all', showPrice: true, showContact: true, partnerIds: [] },
      commission: {
        basePercentage: parseFloat(commission?.basePercentage) || 0,
        isFixed: commission?.isFixed || false,
        fixedAmount: commission?.fixedAmount ? parseFloat(commission.fixedAmount) : null
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
      console.log('📧 Property created as active, sending notifications to partners...');
      console.log('   Property:', property.name);
      console.log('   Company:', property.companyId?.name);

      try {
        // Get all active partners for this company
        const activePartnerships = await PartnerCompany.find({
          companyId: property.companyId,
          status: 'active'
        }).populate('partnerId', 'firstName lastName email');

        console.log('   Active partnerships found:', activePartnerships.length);

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

        console.log('   Partners to notify:', partnersToNotify.length);
        console.log('   Partner emails:', partnersToNotify.map(p => p.email));

        // Send emails (don't await, run in background)
        if (partnersToNotify.length > 0) {
          console.log('   📧 Sending property notification emails...');
          sendNewPropertyEmail(partnersToNotify, property, property.companyId).catch(err => {
            console.error('   ❌ Failed to send property notification emails:', err);
          });
        } else {
          console.log('   ⚠️ No partners to notify');
        }
      } catch (emailError) {
        // Don't fail the request if email fails
        console.error('   ❌ Error sending property notification:', emailError);
      }
    }

    res.status(201).json({
      success: true,
      message: propertyStatus === 'active'
        ? 'Property created and published successfully. Partners have been notified.'
        : 'Property created successfully',
      data: { property }
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

        const companyIds = activePartnerships.map(p => p.companyId);

        if (companyIds.length === 0) {
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

        query.companyId = { $in: companyIds };
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
      .populate('companyId', 'name logo regions address settings')
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

    // Increment view count
    property.stats = property.stats || { totalViews: 0, totalInquiries: 0, totalVisits: 0, totalBookings: 0 };
    property.stats.totalViews = (property.stats.totalViews || 0) + 1;
    await property.save();

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
    console.log('Updating property - received data:', {
      hasImages: !!req.body.images,
      imagesCount: req.body.images?.length || 0,
      hasVideos: !!req.body.videos,
      videosCount: req.body.videos?.length || 0,
      hasBrochure: !!req.body.brochure,
      hasFloorPlans: !!req.body.floorPlans,
      floorPlansCount: req.body.floorPlans?.length || 0,
      commission: req.body.commission
    });

    const property = await Property.findById(req.params.id);

    if (!property) {
      throw new ApiError(404, 'Property not found');
    }

    // Check access
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== property.companyId.toString()) {
      throw new ApiError(403, 'Access denied');
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
          property[field] = {
            basePercentage: parseFloat(req.body[field]?.basePercentage) || 0,
            isFixed: req.body[field]?.isFixed || false,
            fixedAmount: req.body[field]?.fixedAmount ? parseFloat(req.body[field].fixedAmount) : null
          };
        } else {
          property[field] = req.body[field];
        }
      }
    });

    console.log('Commission after update:', property.commission);

    property.updatedBy = req.user._id;
    await property.save();

    await property.populate('companyId', 'name logo regions');
    await property.populate('updatedBy', 'firstName lastName');

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

    await property.deleteOne();

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

    // Send email notification to partners when property becomes active
    if (status === 'active' && previousStatus !== 'active') {
      console.log('📧 Property status changed to active, checking for partners to notify...');
      console.log('   Property:', property.name);
      console.log('   Company ID:', property.companyId);
      console.log('   Previous status:', previousStatus);

      try {
        // Get company info
        const company = await Company.findById(property.companyId);
        console.log('   Company:', company?.name);

        // Get all active partners for this company
        const activePartnerships = await PartnerCompany.find({
          companyId: property.companyId,
          status: 'active'
        }).populate('partnerId', 'firstName lastName email');

        console.log('   Active partnerships found:', activePartnerships.length);

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

        console.log('   Partners to notify:', partnersToNotify.length);
        console.log('   Partner emails:', partnersToNotify.map(p => p.email));

        // Send emails (don't await, run in background)
        if (partnersToNotify.length > 0) {
          console.log('   📧 Sending property notification emails...');
          sendNewPropertyEmail(partnersToNotify, property, company).catch(err => {
            console.error('   ❌ Failed to send property notification emails:', err);
          });
        } else {
          console.log('   ⚠️ No partners to notify');
        }
      } catch (emailError) {
        // Don't fail the request if email fails
        console.error('   ❌ Error sending property notification:', emailError);
      }
    } else if (status === 'active' && previousStatus === 'active') {
      console.log('📧 Property was already active, skipping email notification');
    }

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

    const query = {
      status: 'active',
      'visibility.type': 'all'
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

    // Build query for properties from this company
    // Show both active and sold_out properties (sold properties show with badge)
    const query = {
      companyId: partnership.companyId,
      status: { $in: ['active', 'sold_out'] }
    };

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

    console.log('Query for partnership properties:', JSON.stringify(query, null, 2));

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Property.countDocuments(query);

    const properties = await Property.find(query)
      .populate('companyId', 'name logo regions address settings.tierPercentages')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log(`Found ${properties.length} properties for partnership ${partnershipId}`);

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