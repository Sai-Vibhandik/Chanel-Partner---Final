import Plan from '../models/Plan.js';
import { ApiError } from '../middlewares/error.middleware.js';

/**
 * @desc    Get all active plans (Public - for pricing page)
 * @route   GET /api/plans
 * @access  Public
 */
export const getPlans = async (req, res, next) => {
  try {
    const { billingPeriod } = req.query;

    // Build query - only active plans
    const query = { isActive: true };

    if (billingPeriod) {
      query.billingPeriod = billingPeriod;
    }

    // Get plans sorted by display order
    const plans = await Plan.find(query)
      .sort({ displayOrder: 1, price: 1 })
      .select('-createdBy -__v');

    res.status(200).json({
      success: true,
      data: {
        plans
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all plans including inactive (Platform Admin)
 * @route   GET /api/plans/all
 * @access  Private (Platform Admin)
 */
export const getAllPlans = async (req, res, next) => {
  try {
    const { status, billingPeriod, page = 1, limit = 10 } = req.query;

    // Build query
    const query = {};

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    if (billingPeriod) {
      query.billingPeriod = billingPeriod;
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Plan.countDocuments(query);
    const plans = await Plan.find(query)
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      data: {
        plans,
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
 * @desc    Get single plan by ID (Platform Admin)
 * @route   GET /api/plans/:id
 * @access  Private (Platform Admin)
 */
export const getPlanById = async (req, res, next) => {
  try {
    const plan = await Plan.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!plan) {
      throw new ApiError(404, 'Plan not found');
    }

    res.status(200).json({
      success: true,
      data: {
        plan
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new plan (Platform Admin)
 * @route   POST /api/plans
 * @access  Private (Platform Admin)
 */
export const createPlan = async (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      currency,
      billingPeriod,
      isPopular,
      displayOrder,
      features,
      limits,
      capabilities,
      razorpayPlanId
    } = req.body;

    // Check if plan with same name already exists
    const existingPlan = await Plan.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existingPlan) {
      throw new ApiError(400, 'Plan with this name already exists');
    }

    // Create plan
    const plan = await Plan.create({
      name,
      description,
      price,
      currency: currency || 'INR',
      billingPeriod: billingPeriod || 'monthly',
      isPopular: isPopular || false,
      displayOrder: displayOrder || 0,
      features: features || [],
      limits: limits || {},
      capabilities: capabilities || {},
      razorpayPlanId,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: {
        plan
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update existing plan (Platform Admin)
 * @route   PUT /api/plans/:id
 * @access  Private (Platform Admin)
 */
export const updatePlan = async (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      currency,
      billingPeriod,
      isPopular,
      displayOrder,
      features,
      limits,
      capabilities,
      razorpayPlanId,
      isActive
    } = req.body;

    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      throw new ApiError(404, 'Plan not found');
    }

    // Check for duplicate name if name is being changed
    if (name && name !== plan.name) {
      const existingPlan = await Plan.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: plan._id }
      });

      if (existingPlan) {
        throw new ApiError(400, 'Plan with this name already exists');
      }
    }

    // Update fields
    if (name) plan.name = name;
    if (description !== undefined) plan.description = description;
    if (price !== undefined) plan.price = price;
    if (currency) plan.currency = currency;
    if (billingPeriod) plan.billingPeriod = billingPeriod;
    if (isPopular !== undefined) plan.isPopular = isPopular;
    if (displayOrder !== undefined) plan.displayOrder = displayOrder;
    if (features) plan.features = features;
    if (limits) plan.limits = { ...plan.limits, ...limits };
    if (capabilities) plan.capabilities = { ...plan.capabilities, ...capabilities };
    if (razorpayPlanId !== undefined) plan.razorpayPlanId = razorpayPlanId;
    if (isActive !== undefined) plan.isActive = isActive;

    await plan.save();

    res.status(200).json({
      success: true,
      message: 'Plan updated successfully',
      data: {
        plan
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Soft delete plan (Platform Admin)
 * @route   DELETE /api/plans/:id
 * @access  Private (Platform Admin)
 */
export const deletePlan = async (req, res, next) => {
  try {
    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      throw new ApiError(404, 'Plan not found');
    }

    // Check if plan is already inactive
    if (!plan.isActive) {
      throw new ApiError(400, 'Plan is already deactivated');
    }

    // Soft delete by setting isActive to false
    plan.isActive = false;
    await plan.save();

    res.status(200).json({
      success: true,
      message: 'Plan deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};