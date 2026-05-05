import Visit from '../models/Visit.js';
import Property from '../models/Property.js';
import PartnerCompany from '../models/PartnerCompany.js';
import Company from '../models/Company.js';
import Commission from '../models/Commission.js';
import { ApiError } from '../middlewares/error.middleware.js';

// Default tier percentages (what % of property's base commission each tier gets)
const DEFAULT_TIER_PERCENTAGES = {
  bronze: 25,
  silver: 35,
  gold: 50,
  platinum: 75
};

/**
 * Calculate commission based on property base percentage and partner tier percentage
 * Formula: Commission = Sale Price × (Property Base % × Partner Tier %)
 * Example: ₹50L × (5% × 50%) = ₹50L × 2.5% = ₹1.25L
 */
const calculateCommission = async (salePrice, partnerTier, companyId, propertyBasePercentage, currency = 'INR') => {
  const company = await Company.findById(companyId);
  const tierPercentages = company?.settings?.tierPercentages || DEFAULT_TIER_PERCENTAGES;

  // Get partner's tier percentage (e.g., 50% for Gold)
  const partnerTierPercentage = tierPercentages[partnerTier] || DEFAULT_TIER_PERCENTAGES[partnerTier] || 25;

  // Use property's base commission percentage (e.g., 5%)
  const basePercentage = propertyBasePercentage || 0;

  // Calculate effective percentage (e.g., 5% × 50% = 2.5%)
  const effectivePercentage = (basePercentage * partnerTierPercentage) / 100;

  // Calculate commission amount
  const calculatedAmount = Math.round(salePrice * (effectivePercentage / 100));

  return {
    propertyBasePercentage: basePercentage,
    partnerTierPercentage,
    partnerTier,
    effectivePercentage,
    calculatedAmount,
    currency
  };
};

// ==================== PARTNER ROUTES ====================

/**
 * @desc    Get partner's visits
 * @route   GET /api/visits
 * @access  Private (Partner)
 */
export const getMyVisits = async (req, res, next) => {
  try {
    const { status, upcoming, page = 1, limit = 10 } = req.query;

    const query = { partner: req.user._id };

    if (status) query.status = status;
    if (upcoming === 'true') {
      query.scheduledDate = { $gte: new Date() };
      query.status = { $in: ['pending', 'approved'] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Visit.countDocuments(query);

    const visits = await Visit.find(query)
      .populate('property', 'name type region location pricing images')
      .populate('companyId', 'name logo address')
      .populate('officeLocation', 'name address phone email')
      .sort({ scheduledDate: 1, scheduledTime: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        visits,
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
 * @desc    Book a new visit
 * @route   POST /api/visits
 * @access  Private (Partner)
 */
export const bookVisit = async (req, res, next) => {
  try {
    const {
      propertyId,
      partnershipId,
      visitType,
      scheduledDate,
      scheduledTime,
      officeLocation,
      timeSlot,
      clientDetails,
      partnerNotes
    } = req.body;

    // Verify partnership exists and is active
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

    // Verify property exists and belongs to the partnership's company
    const property = await Property.findById(propertyId);
    if (!property) {
      throw new ApiError(404, 'Property not found');
    }

    if (property.companyId.toString() !== partnership.companyId.toString()) {
      throw new ApiError(400, 'Property does not belong to this partnership');
    }

    if (property.status !== 'active') {
      throw new ApiError(400, 'Property is not available for visits');
    }

    // Validate office location for office visits
    if (visitType === 'office' && officeLocation) {
      const OfficeLocation = (await import('../models/OfficeLocation.js')).default;
      const office = await OfficeLocation.findOne({
        _id: officeLocation,
        companyId: partnership.companyId,
        isActive: true
      });
      if (!office) {
        throw new ApiError(400, 'Invalid or inactive office location');
      }
    }

    // Check for scheduling conflicts (same partner, same date/time)
    const existingVisit = await Visit.findOne({
      partner: req.user._id,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingVisit) {
      throw new ApiError(400, 'You already have a visit scheduled at this time');
    }

    // Create visit
    const visit = await Visit.create({
      companyId: partnership.companyId,
      property: propertyId,
      partner: req.user._id,
      partnershipId,
      visitType: visitType || 'site',
      officeLocation: visitType === 'office' ? officeLocation : undefined,
      timeSlot: visitType === 'office' ? timeSlot : undefined,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      clientDetails,
      partnerNotes
    });

    // Populate for response
    await visit.populate([
      { path: 'property', select: 'name type region location pricing images' },
      { path: 'companyId', select: 'name logo address' },
      { path: 'officeLocation', select: 'name address phone email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Visit booked successfully',
      data: { visit }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single visit details
 * @route   GET /api/visits/:id
 * @access  Private (Partner or Operations Manager)
 */
export const getVisit = async (req, res, next) => {
  try {
    const visit = await Visit.findById(req.params.id)
      .populate('property')
      .populate('partner', 'firstName lastName email phone partnerProfile')
      .populate('companyId', 'name logo address')
      .populate('handledBy', 'firstName lastName')
      .populate('officeLocation', 'name address phone email googleMapsUrl operatingHours');

    if (!visit) {
      throw new ApiError(404, 'Visit not found');
    }

    // Access control
    if (req.user.role === 'partner') {
      if (visit.partner._id.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    } else if (req.user.role !== 'platform_admin') {
      // Company staff - verify company access
      if (visit.companyId._id.toString() !== req.user.companyId?.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    }

    res.status(200).json({
      success: true,
      data: { visit }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update visit (Partner only - before approval)
 * @route   PUT /api/visits/:id
 * @access  Private (Partner)
 */
export const updateVisit = async (req, res, next) => {
  try {
    const { scheduledDate, scheduledTime, clientDetails, partnerNotes } = req.body || {};

    const visit = await Visit.findById(req.params.id);

    if (!visit) {
      throw new ApiError(404, 'Visit not found');
    }

    if (visit.partner.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Can only update pending visits
    if (visit.status !== 'pending') {
      throw new ApiError(400, 'Cannot update a visit that is already processed');
    }

    // Update fields
    if (scheduledDate) visit.scheduledDate = new Date(scheduledDate);
    if (scheduledTime) visit.scheduledTime = scheduledTime;
    if (clientDetails) visit.clientDetails = { ...visit.clientDetails, ...clientDetails };
    if (partnerNotes) visit.partnerNotes = partnerNotes;

    await visit.save();

    await visit.populate([
      { path: 'property', select: 'name type region location' },
      { path: 'companyId', select: 'name logo' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Visit updated successfully',
      data: { visit }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel visit (Partner only)
 * @route   PUT /api/visits/:id/cancel
 * @access  Private (Partner)
 */
export const cancelVisit = async (req, res, next) => {
  try {
    const { reason } = req.body || {};

    const visit = await Visit.findById(req.params.id);

    if (!visit) {
      throw new ApiError(404, 'Visit not found');
    }

    if (visit.partner.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Can only cancel pending or approved visits
    if (!['pending', 'approved'].includes(visit.status)) {
      throw new ApiError(400, 'Cannot cancel this visit');
    }

    visit.status = 'cancelled';
    visit.cancellationReason = reason || 'Cancelled by partner';
    await visit.save();

    res.status(200).json({
      success: true,
      message: 'Visit cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==================== OPERATIONS MANAGER ROUTES ====================

/**
 * @desc    Get all visits for company
 * @route   GET /api/visits/company
 * @access  Private (Operations Manager, Partner Manager)
 */
export const getCompanyVisits = async (req, res, next) => {
  try {
    const { status, date, upcoming, partnerId, page = 1, limit = 10 } = req.query;

    console.log('getCompanyVisits called by user:', req.user._id, 'role:', req.user.role, 'companyId:', req.user.companyId);

    // Check if user has companyId
    if (!req.user.companyId) {
      console.log('User has no companyId assigned');
      // Return empty array instead of error for users without company assignment
      return res.status(200).json({
        success: true,
        data: {
          visits: [],
          pagination: { total: 0, page: 1, pages: 0 }
        }
      });
    }

    const query = { companyId: req.user.companyId };

    if (status) query.status = status;
    if (partnerId) query.partner = partnerId;
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.scheduledDate = { $gte: start, $lte: end };
    }
    if (upcoming === 'true') {
      query.scheduledDate = { $gte: new Date() };
      query.status = { $in: ['pending', 'approved'] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Visit.countDocuments(query);

    const visits = await Visit.find(query)
      .populate('property', 'name type region location pricing images')
      .populate('partner', 'firstName lastName email phone partnerProfile')
      .populate('handledBy', 'firstName lastName')
      .sort({ scheduledDate: 1, scheduledTime: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        visits,
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
 * @desc    Get calendar data
 * @route   GET /api/visits/calendar
 * @access  Private (Operations Manager)
 */
export const getCalendarData = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // Check if user has companyId
    if (!req.user.companyId) {
      return res.status(200).json({
        success: true,
        data: { calendarData: {} }
      });
    }

    const query = { companyId: req.user.companyId };

    if (startDate && endDate) {
      query.scheduledDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      // Default to current month
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      query.scheduledDate = { $gte: start, $lte: end };
    }

    const visits = await Visit.find(query)
      .populate('property', 'name type')
      .populate('partner', 'firstName lastName')
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    // Group by date
    const calendarData = {};
    visits.forEach(visit => {
      const dateKey = visit.scheduledDate.toISOString().split('T')[0];
      if (!calendarData[dateKey]) {
        calendarData[dateKey] = [];
      }
      calendarData[dateKey].push({
        _id: visit._id,
        time: visit.scheduledTime,
        status: visit.status,
        visitType: visit.visitType,
        property: visit.property,
        partner: visit.partner
      });
    });

    res.status(200).json({
      success: true,
      data: { calendarData }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve visit
 * @route   PUT /api/visits/:id/approve
 * @access  Private (Operations Manager)
 */
export const approveVisit = async (req, res, next) => {
  try {
    const { adminNotes } = req.body || {};

    const visit = await Visit.findById(req.params.id);

    if (!visit) {
      throw new ApiError(404, 'Visit not found');
    }

    // Verify company access
    if (visit.companyId.toString() !== req.user.companyId?.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    if (visit.status !== 'pending') {
      throw new ApiError(400, 'Only pending visits can be approved');
    }

    visit.status = 'approved';
    visit.handledBy = req.user._id;
    if (adminNotes) visit.adminNotes = adminNotes;
    await visit.save();

    res.status(200).json({
      success: true,
      message: 'Visit approved successfully',
      data: { visit }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject visit
 * @route   PUT /api/visits/:id/reject
 * @access  Private (Operations Manager)
 */
export const rejectVisit = async (req, res, next) => {
  try {
    const { reason } = req.body || {};

    if (!reason) {
      throw new ApiError(400, 'Rejection reason is required');
    }

    const visit = await Visit.findById(req.params.id);

    if (!visit) {
      throw new ApiError(404, 'Visit not found');
    }

    // Verify company access
    if (visit.companyId.toString() !== req.user.companyId?.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    if (visit.status !== 'pending') {
      throw new ApiError(400, 'Only pending visits can be rejected');
    }

    visit.status = 'rejected';
    visit.rejectionReason = reason;
    visit.handledBy = req.user._id;
    await visit.save();

    res.status(200).json({
      success: true,
      message: 'Visit rejected',
      data: { visit }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark visit as completed
 * @route   PUT /api/visits/:id/complete
 * @access  Private (Operations Manager)
 */
export const completeVisit = async (req, res, next) => {
  try {
    const { completionNotes, followUpRequired, followUpDate } = req.body || {};

    const visit = await Visit.findById(req.params.id);

    if (!visit) {
      throw new ApiError(404, 'Visit not found');
    }

    // Verify company access
    if (visit.companyId.toString() !== req.user.companyId?.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    if (visit.status !== 'approved') {
      throw new ApiError(400, 'Only approved visits can be marked as completed');
    }

    visit.status = 'completed';
    visit.completedAt = new Date();
    if (completionNotes) visit.completionNotes = completionNotes;
    if (followUpRequired) {
      visit.followUpRequired = true;
      visit.followUpDate = followUpDate ? new Date(followUpDate) : undefined;
    }
    await visit.save();

    // Update property visit stats
    await Property.findByIdAndUpdate(visit.property, {
      $inc: { 'stats.totalVisits': 1 }
    });

    // Update partner visit stats via PartnerCompany
    await PartnerCompany.findByIdAndUpdate(visit.partnershipId, {
      $inc: { 'stats.totalVisits': 1 },
      'stats.lastVisitAt': new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Visit marked as completed',
      data: { visit }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark visit as deal closed (creates commission automatically)
 * @route   PUT /api/visits/:id/deal-closed
 * @access  Private (Partner Manager, Company SuperAdmin)
 */
export const markDealClosed = async (req, res, next) => {
  try {
    const { salePrice, saleDate, buyerName, buyerPhone, buyerEmail, notes } = req.body;

    // Validate required fields
    if (!salePrice || !buyerName || !buyerPhone) {
      throw new ApiError(400, 'Sale price, buyer name, and buyer phone are required');
    }

    const visit = await Visit.findById(req.params.id)
      .populate('property')
      .populate('partnershipId');

    if (!visit) {
      throw new ApiError(404, 'Visit not found');
    }

    // Verify company access
    if (visit.companyId.toString() !== req.user.companyId?.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Only completed or approved visits can be marked as deal closed
    if (!['completed', 'approved'].includes(visit.status)) {
      throw new ApiError(400, 'Only completed or approved visits can be marked as deal closed');
    }

    // Get property's base commission percentage and currency
    const propertyBasePercentage = visit.property?.commission?.basePercentage || 0;
    const currency = visit.property?.pricing?.currency || 'INR';

    // Calculate commission using new formula
    const commissionData = await calculateCommission(
      salePrice,
      visit.partnershipId.tier,
      visit.companyId,
      propertyBasePercentage,
      currency
    );

    // Create commission entry
    const commission = await Commission.create({
      companyId: visit.companyId,
      partnershipId: visit.partnershipId._id,
      partner: visit.partner,
      property: visit.property._id,
      visit: visit._id,
      saleDetails: {
        salePrice,
        saleDate: saleDate ? new Date(saleDate) : new Date(),
        buyerName,
        buyerPhone,
        buyerEmail
      },
      commission: commissionData,
      notes,
      createdBy: req.user._id
    });

    // Update visit status
    visit.status = 'deal_closed';
    visit.dealDetails = {
      salePrice,
      saleDate: saleDate ? new Date(saleDate) : new Date(),
      buyerName,
      buyerPhone,
      buyerEmail,
      notes,
      closedBy: req.user._id,
      closedAt: new Date(),
      commissionId: commission._id
    };
    await visit.save();

    // Update partner's deal count
    await PartnerCompany.findByIdAndUpdate(visit.partnershipId._id, {
      $inc: { 'stats.totalDeals': 1 }
    });

    // Populate for response
    await commission.populate([
      { path: 'partner', select: 'firstName lastName email phone' },
      { path: 'property', select: 'name type location pricing' },
      { path: 'partnershipId', select: 'tier status' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Deal marked as closed. Commission entry created and sent for Legal review.',
      data: {
        visit,
        commission
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Partner marks their visit as deal closed
 * @route   PUT /api/visits/:id/partner-deal-closed
 * @access  Private (Partner)
 */
export const partnerMarkDealClosed = async (req, res, next) => {
  try {
    const { salePrice, saleDate, buyerName, buyerPhone, buyerEmail, notes, documents } = req.body;

    // Validate required fields
    if (!salePrice || !buyerName || !buyerPhone) {
      throw new ApiError(400, 'Sale price, buyer name, and buyer phone are required');
    }

    const visit = await Visit.findById(req.params.id)
      .populate('property')
      .populate('partnershipId');

    if (!visit) {
      throw new ApiError(404, 'Visit not found');
    }

    // Verify partner owns this visit
    if (visit.partner.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Only completed or approved visits can be marked as deal closed
    if (!['completed', 'approved'].includes(visit.status)) {
      throw new ApiError(400, 'Only completed or approved visits can be marked as deal closed');
    }

    // Get property's base commission percentage and currency
    const propertyBasePercentage = visit.property?.commission?.basePercentage || 0;
    const currency = visit.property?.pricing?.currency || 'INR';

    // Calculate commission using new formula
    const commissionData = await calculateCommission(
      salePrice,
      visit.partnershipId.tier,
      visit.companyId,
      propertyBasePercentage,
      currency
    );

    // Create commission entry
    const commission = await Commission.create({
      companyId: visit.companyId,
      partnershipId: visit.partnershipId._id,
      partner: visit.partner,
      property: visit.property._id,
      visit: visit._id,
      saleDetails: {
        salePrice,
        saleDate: saleDate ? new Date(saleDate) : new Date(),
        buyerName,
        buyerPhone,
        buyerEmail
      },
      commission: commissionData,
      notes,
      createdBy: req.user._id
    });

    // Update visit status
    visit.status = 'deal_closed';
    visit.dealDetails = {
      salePrice,
      saleDate: saleDate ? new Date(saleDate) : new Date(),
      buyerName,
      buyerPhone,
      buyerEmail,
      notes,
      closedBy: req.user._id,
      closedAt: new Date(),
      commissionId: commission._id
    };
    await visit.save();

    // Update partner's deal count
    await PartnerCompany.findByIdAndUpdate(visit.partnershipId._id, {
      $inc: { 'stats.totalDeals': 1 }
    });

    // Populate for response
    await commission.populate([
      { path: 'partner', select: 'firstName lastName email phone' },
      { path: 'property', select: 'name type location pricing' },
      { path: 'partnershipId', select: 'tier status' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Deal marked as closed. Commission entry created successfully.',
      data: {
        visit,
        commission
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get visit statistics
 * @route   GET /api/visits/stats
 * @access  Private (Partner Manager, Company SuperAdmin)
 */
export const getVisitStats = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      // Return empty stats instead of error for users without company assignment
      return res.status(200).json({
        success: true,
        data: {
          statusCounts: { pending: 0, approved: 0, rejected: 0, completed: 0, deal_closed: 0, cancelled: 0 },
          todayVisits: 0,
          upcomingVisits: 0,
          pendingApprovals: 0,
          total: 0
        }
      });
    }

    const stats = await Visit.aggregate([
      { $match: { companyId: companyId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayVisits = await Visit.countDocuments({
      companyId: companyId,
      scheduledDate: { $gte: today, $lt: tomorrow },
      status: { $in: ['pending', 'approved'] }
    });

    const upcomingVisits = await Visit.countDocuments({
      companyId: companyId,
      scheduledDate: { $gte: today },
      status: { $in: ['pending', 'approved'] }
    });

    const pendingApprovals = await Visit.countDocuments({
      companyId: companyId,
      status: 'pending'
    });

    // Format stats
    const statusCounts = {
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
      deal_closed: 0,
      cancelled: 0
    };

    stats.forEach(s => {
      statusCounts[s._id] = s.count;
    });

    res.status(200).json({
      success: true,
      data: {
        statusCounts,
        todayVisits,
        upcomingVisits,
        pendingApprovals,
        approved: statusCounts.approved || 0,
        completed: statusCounts.completed || 0,
        total: Object.values(statusCounts).reduce((a, b) => a + b, 0)
      }
    });
  } catch (error) {
    next(error);
  }
};