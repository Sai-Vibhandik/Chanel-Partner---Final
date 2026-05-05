import Commission from '../models/Commission.js';
import Property from '../models/Property.js';
import PartnerCompany from '../models/PartnerCompany.js';
import Company from '../models/Company.js';
import User from '../models/User.js';
import { ApiError } from '../middlewares/error.middleware.js';

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

    // Get property's base commission percentage
    const propertyBasePercentage = property.commission?.basePercentage || 0;
    const currency = property.pricing?.currency || 'INR';

    // Calculate commission
    const commissionData = await calculateCommission(
      saleDetails.salePrice,
      partnership.tier,
      req.user.companyId,
      propertyBasePercentage,
      currency
    );

    // If partner has override, recalculate using override percentage
    let finalCommissionData = commissionData;
    if (partnership.commissionOverride?.percentage) {
      const overridePercentage = partnership.commissionOverride.percentage;
      const calculatedAmount = Math.round(saleDetails.salePrice * (overridePercentage / 100));
      finalCommissionData = {
        propertyBasePercentage,
        partnerTierPercentage: overridePercentage,
        partnerTier: partnership.tier,
        effectivePercentage: overridePercentage,
        overridePercentage: overridePercentage,
        calculatedAmount,
        currency
      };
    }

    // Create commission
    const commission = await Commission.create({
      companyId: req.user.companyId,
      partnershipId,
      partner: partnership.partnerId,
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
          overview: { total: 0, pending: 0, approved: 0, paid: 0 },
          statusCounts: {
            pending: { count: 0, amount: 0 },
            approved: { count: 0, amount: 0 },
            paid: { count: 0, amount: 0 },
            cancelled: { count: 0, amount: 0 }
          },
          pending: { count: 0, amount: 0 },
          monthlyPaid: { monthlyPaidAmount: 0, monthlyPaidCount: 0 },
          totalAmount: 0,
          total: 0
        }
      });
    }

    const stats = await Commission.aggregate([
      { $match: { companyId: companyId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$commission.calculatedAmount' }
        }
      }
    ]);

    // Get current month stats
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
          _id: null,
          monthlyPaidAmount: { $sum: '$commission.calculatedAmount' },
          monthlyPaidCount: { $sum: 1 }
        }
      }
    ]);

    // Format stats
    const statusCounts = {
      pending: { count: 0, amount: 0 },
      approved: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 }
    };

    stats.forEach(s => {
      if (statusCounts[s._id] !== undefined) {
        statusCounts[s._id] = {
          count: s.count,
          amount: s.totalAmount || 0
        };
      }
    });

    const total = stats.reduce((sum, s) => sum + s.count, 0);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          total,
          pending: statusCounts.pending.count,
          approved: statusCounts.approved?.count || 0,
          paid: statusCounts.paid.count
        },
        statusCounts,
        pending: statusCounts.pending,
        monthlyPaid: monthlyStats[0] || { monthlyPaidAmount: 0, monthlyPaidCount: 0 },
        total
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

    if (!paymentReference) {
      throw new ApiError(400, 'Payment reference is required');
    }

    commission.status = 'paid';
    commission.payout = {
      paidAt: new Date(),
      paymentReference,
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
      .populate('partnershipId', 'tier status companyId')
      .populate({
        path: 'partnershipId',
        populate: { path: 'companyId', select: 'name logo' }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get stats for partner
    const stats = await Commission.aggregate([
      { $match: { partner: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$commission.calculatedAmount' }
        }
      }
    ]);

    const statusStats = {
      pending: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 }
    };

    stats.forEach(s => {
      if (statusStats[s._id]) {
        statusStats[s._id] = { count: s.count, amount: s.totalAmount };
      }
    });

    res.status(200).json({
      success: true,
      data: {
        commissions,
        stats: statusStats,
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