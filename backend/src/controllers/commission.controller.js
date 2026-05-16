import mongoose from 'mongoose';
import Commission from '../models/Commission.js';
import Property from '../models/Property.js';
import PartnerCompany from '../models/PartnerCompany.js';
import Company from '../models/Company.js';
import User from '../models/User.js';
import { ApiError } from '../middlewares/error.middleware.js';
import { createNotification, createNotificationsForRecipients } from './notification.controller.js';

// Default tier percentages (what % of property's base commission each tier gets)
// Example: If property has 5% base commission, Gold tier (50%) gets 2.5%
const DEFAULT_TIER_PERCENTAGES = {
  bronze: 25,    // 25% of base
  silver: 35,   // 35% of base
  gold: 50,     // 50% of base
  platinum: 75  // 75% of base
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate commission based on property base percentage and partner tier percentage
 * Formula: Commission = Sale Price × (Property Base % × Partner Tier %)
 * Example: ₹50,00,000 × (5% × 50%) = ₹50,00,000 × 2.5% = ₹1,25,000
 */
const calculateCommission = async (salePrice, partnerTier, companyId, propertyBasePercentage, currency = 'INR') => {
  // Get company's tier percentages
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

// ==================== FINANCE MANAGER ROUTES ====================

/**
 * @desc    Create a new commission entry
 * @route   POST /api/commissions
 * @access  Private (finance_manager, company_superadmin, partner_manager)
 */
export const createCommission = async (req, res, next) => {
  try {
    const {
      partnershipId,
      propertyId,
      visitId,
      saleDetails,
      source,
      notes
    } = req.body;

    // Verify partnership exists and belongs to company
    const partnership = await PartnerCompany.findById(partnershipId);
    if (!partnership) {
      throw new ApiError(404, 'Partnership not found');
    }

    // Validate partner exists
    if (!partnership.partnerId) {
      throw new ApiError(400, 'Partnership does not have an associated partner');
    }

    // Extract partner ObjectId - handle both populated and non-populated cases
    // If populated (User object), extract _id and convert to ObjectId
    // If not populated, it's already an ObjectId
    let partnerId;
    if (partnership.partnerId._id) {
      // Populated case - extract _id string and convert to ObjectId
      partnerId = new mongoose.Types.ObjectId(partnership.partnerId._id.toString());
    } else {
      // Non-populated case - already an ObjectId
      partnerId = partnership.partnerId;
    }

    console.log('Partnership partnerId extraction:', {
      rawPartnerId: partnership.partnerId,
      hasId: !!partnership.partnerId._id,
      extractedPartnerId: partnerId,
      partnerIdType: typeof partnerId
    });

    if (partnership.companyId.toString() !== req.user.companyId.toString()) {
      throw new ApiError(403, 'Access denied - partnership does not belong to your company');
    }

    if (partnership.status !== 'active') {
      throw new ApiError(400, 'Partnership is not active');
    }

    // Verify property exists and belongs to company
    const property = await Property.findById(propertyId);
    if (!property) {
      throw new ApiError(404, 'Property not found');
    }

    if (property.companyId.toString() !== req.user.companyId.toString()) {
      throw new ApiError(403, 'Access denied - property does not belong to your company');
    }

    // Check if property is already sold
    if (property.status === 'sold_out') {
      throw new ApiError(400, 'This property has already been sold');
    }

    // Get property's commission settings
    const currency = property.pricing?.currency || 'INR';
    let finalCommissionData;

    // Check if property has fixed commission
    if (property.commission?.isFixed && property.commission?.fixedAmount) {
      // Property has fixed commission amount
      const fixedAmount = property.commission.fixedAmount;
      finalCommissionData = {
        propertyBasePercentage: 0,
        partnerTierPercentage: 0,
        partnerTier: partnership.tier,
        effectivePercentage: 0,
        isFixed: true,
        fixedAmount: fixedAmount,
        calculatedAmount: fixedAmount,
        currency
      };
    } else {
      // Property has percentage-based commission
      const propertyBasePercentage = property.commission?.basePercentage || 0;

      // Calculate commission based on percentage
      const commissionData = await calculateCommission(
        saleDetails.salePrice,
        partnership.tier,
        req.user.companyId,
        propertyBasePercentage,
        currency
      );

      finalCommissionData = commissionData;
    }

    // Create commission
    console.log('Creating commission with data:', {
      companyId: req.user.companyId,
      partnershipId,
      partner: partnerId,
      property: propertyId,
      visit: visitId || null,
      source,
      saleDetails,
      commission: finalCommissionData
    });

    const commission = await Commission.create({
      companyId: req.user.companyId,
      partnershipId,
      partner: partnerId,
      property: propertyId,
      visit: visitId || null,
      source: {
        type: source?.type || 'direct',
        visitId: source?.visitId || visitId || null,
        notes: source?.notes
      },
      saleDetails: {
        salePrice: saleDetails.salePrice,
        saleDate: saleDetails.saleDate ? new Date(saleDetails.saleDate) : new Date(),
        buyerName: saleDetails.buyerName,
        buyerPhone: saleDetails.buyerPhone,
        buyerEmail: saleDetails.buyerEmail
      },
      commission: finalCommissionData,
      notes,
      createdBy: req.user._id
    });

    // Mark property as sold
    property.status = 'sold_out';
    property.soldAt = new Date();
    property.soldBy = partnership.partnerId;
    property.salePrice = saleDetails.salePrice;
    property.commissionId = commission._id;
    await property.save();

    // Notify partner about new commission
    const formattedAmount = finalCommissionData.isFixed
      ? `${currency === 'INR' ? '₹' : 'AED '}${finalCommissionData.fixedAmount.toLocaleString()} (Fixed)`
      : `${currency === 'INR' ? '₹' : 'AED '}${finalCommissionData.calculatedAmount.toLocaleString()}`;

    createNotification({
      recipientId: partnerId,
      type: 'commission_created',
      title: 'New Commission Created',
      message: `A commission of ${formattedAmount} has been created for "${property.name}". It will be processed after approval.`,
      data: {
        commissionId: commission._id,
        propertyId: propertyId,
        companyId: req.user.companyId
      },
      link: '/partner/commissions'
    }).catch(err => {
      console.error('Failed to create commission notification:', err.message);
    });

    // Populate for response
    await commission.populate([
      { path: 'partner', select: 'firstName lastName email phone' },
      { path: 'property', select: 'name type location pricing' },
      { path: 'partnershipId', select: 'tier status' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Commission created successfully',
      data: { commission }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all commissions for company
 * @route   GET /api/commissions
 * @access  Private (finance_manager, company_superadmin)
 */
export const getCompanyCommissions = async (req, res, next) => {
  try {
    const { status, partnerId, propertyId, startDate, endDate, page = 1, limit = 10 } = req.query;

    if (!req.user.companyId) {
      return res.status(200).json({
        success: true,
        data: {
          commissions: [],
          pagination: { total: 0, page: 1, pages: 0 }
        }
      });
    }

    const query = { companyId: req.user.companyId };

    if (status) query.status = status;
    if (partnerId) query.partner = partnerId;
    if (propertyId) query.property = propertyId;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Commission.countDocuments(query);

    const commissions = await Commission.find(query)
      .populate('partner', 'firstName lastName email phone')
      .populate('property', 'name type location pricing')
      .populate('partnershipId', 'tier status')
      .populate('createdBy', 'firstName lastName')
      .populate('payout.paidBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        commissions,
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
 * @desc    Get commission statistics
 * @route   GET /api/commissions/stats
 * @access  Private (finance_manager, company_superadmin)
 */
export const getCommissionStats = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(200).json({
        success: true,
        data: {
          overview: { total: 0 },
          statusCountsByCurrency: {
            INR: { pending: { count: 0, amount: 0 }, approved: { count: 0, amount: 0 }, paid: { count: 0, amount: 0 }, cancelled: { count: 0, amount: 0 } }
          },
          monthlyPaidByCurrency: { INR: { monthlyPaidAmount: 0, monthlyPaidCount: 0 } },
          activeCurrencies: ['INR'],
          recentTransactions: []
        }
      });
    }

    // Get stats grouped by status and currency
    const stats = await Commission.aggregate([
      { $match: { companyId: companyId } },
      {
        $group: {
          _id: { status: '$status', currency: '$commission.currency' },
          count: { $sum: 1 },
          totalAmount: { $sum: '$commission.calculatedAmount' }
        }
      }
    ]);

    // Get current month stats grouped by currency
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyStats = await Commission.aggregate([
      {
        $match: {
          companyId: companyId,
          createdAt: { $gte: monthStart },
          status: 'paid'
        }
      },
      {
        $group: {
          _id: '$commission.currency',
          monthlyPaidAmount: { $sum: '$commission.calculatedAmount' },
          monthlyPaidCount: { $sum: 1 }
        }
      }
    ]);

    // Get recent transactions (last 10)
    const recentTransactions = await Commission.aggregate([
      { $match: { companyId: companyId } },
      { $sort: { createdAt: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: 'partner',
          foreignField: '_id',
          as: 'partnerUser'
        }
      },
      { $unwind: '$partnerUser' },
      {
        $lookup: {
          from: 'properties',
          localField: 'property',
          foreignField: '_id',
          as: 'propertyData'
        }
      },
      {
        $project: {
          _id: 1,
          status: 1,
          amount: '$commission.calculatedAmount',
          currency: '$commission.currency',
          createdAt: 1,
          partnerName: { $concat: ['$partnerUser.firstName', ' ', '$partnerUser.lastName'] },
          propertyName: { $arrayElemAt: ['$propertyData.name', 0] }
        }
      }
    ]);

    // Get unique currencies
    const activeCurrencies = await Commission.distinct('commission.currency', { companyId: companyId });
    const currencies = activeCurrencies.length > 0 ? activeCurrencies : ['INR'];

    // Format stats by currency
    const statusCountsByCurrency = {};
    currencies.forEach(currency => {
      statusCountsByCurrency[currency] = {
        pending: { count: 0, amount: 0 },
        approved: { count: 0, amount: 0 },
        paid: { count: 0, amount: 0 },
        cancelled: { count: 0, amount: 0 }
      };
    });

    // Populate stats from aggregation results
    stats.forEach(s => {
      const status = s._id.status;
      const currency = s._id.currency || 'INR';
      if (statusCountsByCurrency[currency] && statusCountsByCurrency[currency][status] !== undefined) {
        statusCountsByCurrency[currency][status] = {
          count: s.count,
          amount: s.totalAmount || 0
        };
      }
    });

    // Format monthly stats by currency
    const monthlyPaidByCurrency = {};
    currencies.forEach(currency => {
      monthlyPaidByCurrency[currency] = { monthlyPaidAmount: 0, monthlyPaidCount: 0 };
    });
    monthlyStats.forEach(s => {
      const currency = s._id || 'INR';
      if (monthlyPaidByCurrency[currency]) {
        monthlyPaidByCurrency[currency] = {
          monthlyPaidAmount: s.monthlyPaidAmount || 0,
          monthlyPaidCount: s.monthlyPaidCount || 0
        };
      }
    });

    // Calculate total count (all currencies combined)
    const total = stats.reduce((sum, s) => sum + s.count, 0);

    res.status(200).json({
      success: true,
      data: {
        overview: { total },
        statusCountsByCurrency,
        monthlyPaidByCurrency,
        activeCurrencies: currencies,
        recentTransactions
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single commission details
 * @route   GET /api/commissions/:id
 * @access  Private (finance_manager, company_superadmin, partner)
 */
export const getCommissionById = async (req, res, next) => {
  try {
    const commission = await Commission.findById(req.params.id)
      .populate('partner', 'firstName lastName email phone partnerProfile')
      .populate('property', 'name type location pricing details')
      .populate('partnershipId', 'tier status commissionOverride')
      .populate('visit', 'visitType scheduledDate scheduledTime clientDetails status')
      .populate('createdBy', 'firstName lastName')
      .populate('payout.paidBy', 'firstName lastName');

    if (!commission) {
      throw new ApiError(404, 'Commission not found');
    }

    // Access control
    if (req.user.role === 'partner') {
      if (commission.partner._id.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    } else if (req.user.role !== 'platform_admin') {
      if (commission.companyId.toString() !== req.user.companyId?.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    }

    res.status(200).json({
      success: true,
      data: { commission }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve a commission
 * @route   PUT /api/commissions/:id/approve
 * @access  Private (finance_manager, company_superadmin)
 */
export const approveCommission = async (req, res, next) => {
  try {
    const { notes, overrideAmount, overridePercentage, overrideReason } = req.body || {};

    const commission = await Commission.findById(req.params.id);

    if (!commission) {
      throw new ApiError(404, 'Commission not found');
    }

    // Verify company access
    if (commission.companyId.toString() !== req.user.companyId?.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    if (commission.status !== 'pending') {
      throw new ApiError(400, 'Only pending commissions can be approved');
    }

    // Store original amount before any override
    const originalAmount = commission.commission.calculatedAmount;
    let finalAmount = originalAmount;
    let overrideData = null;

    // Handle commission override
    if (overrideAmount !== undefined && overrideAmount !== null) {
      const newAmount = parseFloat(overrideAmount);
      if (isNaN(newAmount) || newAmount < 0) {
        throw new ApiError(400, 'Invalid override amount');
      }

      finalAmount = newAmount;
      overrideData = {
        isOverridden: true,
        originalAmount: originalAmount,
        overriddenAmount: newAmount,
        overrideType: 'amount',
        reason: overrideReason || '',
        overriddenBy: req.user._id
      };

      // Update the commission amount
      commission.commission.calculatedAmount = newAmount;
    } else if (overridePercentage !== undefined && overridePercentage !== null) {
      const newPercentage = parseFloat(overridePercentage);
      if (isNaN(newPercentage) || newPercentage < 0 || newPercentage > 100) {
        throw new ApiError(400, 'Invalid override percentage (must be 0-100)');
      }

      // Recalculate based on new percentage
      const salePrice = commission.saleDetails.salePrice;
      finalAmount = Math.round(salePrice * (newPercentage / 100));

      overrideData = {
        isOverridden: true,
        originalAmount: originalAmount,
        overriddenAmount: finalAmount,
        overridePercentage: newPercentage,
        overrideType: 'percentage',
        reason: overrideReason || '',
        overriddenBy: req.user._id
      };

      // Update the commission amount and percentage
      commission.commission.calculatedAmount = finalAmount;
      commission.commission.overridePercentage = newPercentage;
    }

    commission.status = 'approved';
    commission.approval = {
      approvedBy: req.user._id,
      approvedAt: new Date(),
      notes,
      override: overrideData
    };
    commission.updatedBy = req.user._id;
    await commission.save();

    // Notify partner about commission approval
    const formattedAmount = commission.commission?.calculatedAmount
      ? `${commission.commission.currency === 'INR' ? '₹' : 'AED '}${commission.commission.calculatedAmount.toLocaleString()}`
      : 'Commission';

    createNotification({
      recipientId: commission.partner,
      type: 'commission_approved',
      title: 'Commission Approved',
      message: `Your commission of ${formattedAmount} for "${commission.property?.name || 'Property'}" has been approved and will be processed for payment.`,
      data: {
        commissionId: commission._id,
        propertyId: commission.property,
        companyId: commission.companyId
      },
      link: '/partner/commissions'
    }).catch(err => {
      console.error('Failed to create commission approval notification:', err.message);
    });

    await commission.populate([
      { path: 'partner', select: 'firstName lastName email phone' },
      { path: 'property', select: 'name type location pricing' },
      { path: 'partnershipId', select: 'tier status' },
      { path: 'approval.approvedBy', select: 'firstName lastName' },
      { path: 'approval.override.overriddenBy', select: 'firstName lastName' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Commission approved successfully',
      data: { commission }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark commission as paid
 * @route   PUT /api/commissions/:id/pay
 * @access  Private (finance_manager, company_superadmin)
 */
export const markAsPaid = async (req, res, next) => {
  try {
    const { paymentReference, paymentMethod, notes } = req.body || {};

    const commission = await Commission.findById(req.params.id);

    if (!commission) {
      throw new ApiError(404, 'Commission not found');
    }

    // Verify company access
    if (commission.companyId.toString() !== req.user.companyId?.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Only approved commissions can be paid
    if (commission.status !== 'approved') {
      throw new ApiError(400, 'Only approved commissions can be marked as paid');
    }

    // Payment reference is required for non-cash payment methods
    if (paymentMethod !== 'cash' && !paymentReference) {
      throw new ApiError(400, 'Payment reference is required for this payment method');
    }

    commission.status = 'paid';
    commission.payout = {
      paidAt: new Date(),
      paymentReference: paymentReference || `CASH-${Date.now()}`, // Generate reference for cash payments
      paymentMethod: paymentMethod || 'bank_transfer',
      notes,
      paidBy: req.user._id
    };
    if (notes) commission.notes = notes;
    commission.updatedBy = req.user._id;
    await commission.save();

    // Update partner's total commission earned
    await PartnerCompany.findByIdAndUpdate(commission.partnershipId, {
      $inc: { 'stats.totalCommissionEarned': commission.commission.calculatedAmount }
    });

    await commission.populate([
      { path: 'partner', select: 'firstName lastName email phone' },
      { path: 'property', select: 'name type location pricing' },
      { path: 'partnershipId', select: 'tier status' },
      { path: 'payout.paidBy', select: 'firstName lastName' }
    ]);

    // Create notification for partner
    if (commission.partner) {
      const formattedAmount = commission.commission?.calculatedAmount
        ? `${commission.commission.currency === 'INR' ? '₹' : 'AED '}${commission.commission.calculatedAmount.toLocaleString()}`
        : 'Commission';

      createNotification({
        recipientId: commission.partner._id,
        type: 'commission_paid',
        title: 'Commission Paid',
        message: `Your commission of ${formattedAmount} for "${commission.property?.name || 'Property'}" has been paid.`,
        data: {
          commissionId: commission._id,
          propertyId: commission.property?._id,
          companyId: commission.companyId
        },
        link: '/partner/commissions'
      }).catch(err => {
        console.error('Failed to create commission paid notification:', err.message);
      });
    }

    res.status(200).json({
      success: true,
      message: 'Commission marked as paid successfully',
      data: { commission }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel a commission
 * @route   PUT /api/commissions/:id/cancel
 * @access  Private (finance_manager, company_superadmin)
 */
export const cancelCommission = async (req, res, next) => {
  try {
    const { reason } = req.body || {};

    if (!reason) {
      throw new ApiError(400, 'Cancellation reason is required');
    }

    const commission = await Commission.findById(req.params.id);

    if (!commission) {
      throw new ApiError(404, 'Commission not found');
    }

    // Verify company access
    if (commission.companyId.toString() !== req.user.companyId?.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    if (commission.status === 'paid') {
      throw new ApiError(400, 'Cannot cancel a paid commission');
    }

    commission.status = 'cancelled';
    commission.notes = `${commission.notes || ''}\n[Cancellation] ${reason}`.trim();
    commission.updatedBy = req.user._id;
    await commission.save();

    await commission.populate([
      { path: 'partner', select: 'firstName lastName email phone' },
      { path: 'property', select: 'name type location pricing' },
      { path: 'partnershipId', select: 'tier status' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Commission cancelled',
      data: { commission }
    });
  } catch (error) {
    next(error);
  }
};

// ==================== PARTNER ROUTES ====================

/**
 * @desc    Get partner's commissions
 * @route   GET /api/commissions/my
 * @access  Private (partner)
 */
export const getPartnerCommissions = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = { partner: req.user._id };

    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Commission.countDocuments(query);

    const commissions = await Commission.find(query)
      .populate('property', 'name type location pricing')
      .populate('visit', 'visitType scheduledDate scheduledTime clientDetails status')
      .populate('partnershipId', 'tier status companyId')
      .populate({
        path: 'partnershipId',
        populate: { path: 'companyId', select: 'name logo' }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get stats for partner - grouped by status and currency
    const stats = await Commission.aggregate([
      { $match: { partner: req.user._id } },
      {
        $group: {
          _id: { status: '$status', currency: '$commission.currency' },
          count: { $sum: 1 },
          totalAmount: { $sum: '$commission.calculatedAmount' }
        }
      }
    ]);

    // Format stats by currency
    const currencies = ['INR', 'AED'];
    const statusStats = {};

    // Initialize stats for each currency
    currencies.forEach(currency => {
      statusStats[currency] = {
        pending: { count: 0, amount: 0 },
        approved: { count: 0, amount: 0 },
        paid: { count: 0, amount: 0 },
        cancelled: { count: 0, amount: 0 }
      };
    });

    // Populate stats from aggregation results
    stats.forEach(s => {
      const status = s._id.status;
      const currency = s._id.currency || 'INR';
      if (statusStats[currency] && statusStats[currency][status]) {
        statusStats[currency][status] = { count: s.count, amount: s.totalAmount };
      }
    });

    // Get unique currencies that have commissions
    const activeCurrencies = await Commission.distinct('commission.currency', { partner: req.user._id });

    res.status(200).json({
      success: true,
      data: {
        commissions,
        stats: statusStats,
        activeCurrencies: activeCurrencies.length > 0 ? activeCurrencies : ['INR'],
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
 * @desc    Get commission reports (overview, by status, by tier, by currency)
 * @route   GET /api/commissions/reports/overview
 * @access  Private (finance_manager, company_superadmin, partner_manager)
 */
export const getCommissionReports = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { period = 'month' } = req.query;

    // Get date range based on period
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    // Aggregate by status AND currency
    const byStatusRaw = await Commission.aggregate([
      { $match: { companyId } },
      {
        $group: {
          _id: { status: '$status', currency: '$commission.currency' },
          count: { $sum: 1 },
          amount: { $sum: '$commission.calculatedAmount' }
        }
      }
    ]);

    // Format byStatus with currency breakdown
    const statusMap = {};
    byStatusRaw.forEach(s => {
      const status = s._id.status || 'pending';
      const currency = s._id.currency || 'INR';
      if (!statusMap[status]) {
        statusMap[status] = { status, count: 0, byCurrency: {} };
      }
      statusMap[status].count += s.count;
      statusMap[status].byCurrency[currency] = {
        count: s.count,
        amount: s.amount || 0
      };
    });
    const statusData = Object.values(statusMap);

    // Aggregate by tier AND currency
    const byTierRaw = await Commission.aggregate([
      { $match: { companyId } },
      {
        $group: {
          _id: { tier: '$commission.partnerTier', currency: '$commission.currency' },
          count: { $sum: 1 },
          totalAmount: { $sum: '$commission.calculatedAmount' },
          paidAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$commission.calculatedAmount', 0]
            }
          }
        }
      }
    ]);

    // Format byTier with currency breakdown
    const tierMap = {};
    byTierRaw.forEach(t => {
      const tier = t._id.tier || 'bronze';
      const currency = t._id.currency || 'INR';
      if (!tierMap[tier]) {
        tierMap[tier] = { tier, count: 0, byCurrency: {} };
      }
      tierMap[tier].count += t.count;
      tierMap[tier].byCurrency[currency] = {
        count: t.count,
        totalAmount: t.totalAmount || 0,
        paidAmount: t.paidAmount || 0
      };
    });
    const tierData = Object.values(tierMap);

    // Aggregate by currency
    const byCurrency = await Commission.aggregate([
      { $match: { companyId } },
      {
        $group: {
          _id: '$commission.currency',
          count: { $sum: 1 },
          amount: { $sum: '$commission.calculatedAmount' }
        }
      }
    ]);

    // Monthly trend with currency breakdown
    const monthlyTrendRaw = await Commission.aggregate([
      {
        $match: {
          companyId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            currency: '$commission.currency'
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$commission.calculatedAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Format monthly trend with currency breakdown
    const trendMap = {};
    monthlyTrendRaw.forEach(t => {
      const period = `${t._id.year}-${String(t._id.month).padStart(2, '0')}`;
      const currency = t._id.currency || 'INR';
      if (!trendMap[period]) {
        trendMap[period] = { period, count: 0, byCurrency: {} };
      }
      trendMap[period].count += t.count;
      trendMap[period].byCurrency[currency] = {
        count: t.count,
        amount: t.totalAmount || 0
      };
    });
    const formattedTrend = Object.values(trendMap);

    // Top partners with per-currency breakdown
    const topPartnersRaw = await Commission.aggregate([
      { $match: { companyId } },
      {
        $group: {
          _id: { partner: '$partner', currency: '$commission.currency' },
          totalCommission: { $sum: '$commission.calculatedAmount' },
          paidCommission: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$commission.calculatedAmount', 0]
            }
          },
          approvedCommission: {
            $sum: {
              $cond: [{ $eq: ['$status', 'approved'] }, '$commission.calculatedAmount', 0]
            }
          },
          pendingCommission: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$commission.calculatedAmount', 0]
            }
          },
          commissionCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.partner',
          commissionsByCurrency: {
            $push: {
              currency: '$_id.currency',
              totalCommission: '$totalCommission',
              paidCommission: '$paidCommission',
              approvedCommission: '$approvedCommission',
              pendingCommission: '$pendingCommission',
              count: '$commissionCount'
            }
          },
          totalCommission: { $sum: '$totalCommission' },
          commissionCount: { $sum: '$commissionCount' }
        }
      },
      { $sort: { totalCommission: -1 } },
      { $limit: 10 },
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
      {
        $project: {
          partnerId: '$_id',
          partnerName: { $concat: ['$partnerUser.firstName', ' ', '$partnerUser.lastName'] },
          partnerEmail: '$partnerUser.email',
          tier: { $arrayElemAt: ['$partnership.tier', 0] },
          commissionsByCurrency: 1,
          totalCommission: 1,
          commissionCount: 1
        }
      }
    ]);

    // Calculate per-currency totals for summary
    const currencyData = {};
    byCurrency.forEach(c => {
      if (c._id) {
        currencyData[c._id] = {
          count: c.count,
          amount: c.amount || 0
        };
      }
    });

    // Get active currencies
    const activeCurrencies = byCurrency.map(c => c._id).filter(Boolean);
    if (activeCurrencies.length === 0) activeCurrencies.push('INR');

    // Calculate per-currency status totals
    const statusTotalsByCurrency = {};
    activeCurrencies.forEach(currency => {
      statusTotalsByCurrency[currency] = {
        paid: 0,
        approved: 0,
        pending: 0,
        cancelled: 0
      };
    });
    byStatusRaw.forEach(s => {
      const currency = s._id.currency || 'INR';
      const status = s._id.status || 'pending';
      if (statusTotalsByCurrency[currency] && statusTotalsByCurrency[currency][status] !== undefined) {
        statusTotalsByCurrency[currency][status] += s.amount || 0;
      }
    });

    // Format response based on request path
    const path = req.path;

    if (path.includes('/payouts')) {
      // Payout report format - calculate per-currency totals
      const payoutSummaryByCurrency = {};
      activeCurrencies.forEach(currency => {
        payoutSummaryByCurrency[currency] = {
          pendingPayouts: statusTotalsByCurrency[currency]?.pending || 0,
          approvedPayouts: statusTotalsByCurrency[currency]?.approved || 0,
          totalPayouts: currencyData[currency]?.amount || 0
        };
      });

      res.status(200).json({
        success: true,
        data: {
          summaryByCurrency: payoutSummaryByCurrency,
          activeCurrencies,
          partners: topPartnersRaw,
          pagination: {
            total: topPartnersRaw.length,
            page: 1,
            pages: 1
          }
        }
      });
    } else if (path.includes('/export')) {
      // Export format
      res.status(200).json({
        success: true,
        data: {
          report: topPartnersRaw.map(p => ({
            partnerName: p.partnerName,
            partnerEmail: p.partnerEmail,
            tier: p.tier || 'N/A',
            commissionsByCurrency: p.commissionsByCurrency,
            totalCommission: p.totalCommission,
            commissionCount: p.commissionCount
          }))
        }
      });
    } else {
      // Overview format
      res.status(200).json({
        success: true,
        data: {
          byStatus: statusData,
          byTier: tierData,
          byCurrency: currencyData,
          statusTotalsByCurrency,
          monthlyTrend: formattedTrend,
          topPartners: topPartnersRaw,
          activeCurrencies,
          period
        }
      });
    }
  } catch (error) {
    next(error);
  }
};