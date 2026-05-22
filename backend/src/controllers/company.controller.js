import Company from '../models/Company.js';
import User from '../models/User.js';
import { ApiError } from '../middlewares/error.middleware.js';
import { getLimitsAndUsage, isSubscriptionActive } from '../services/planLimits.service.js';

/**
 * Generate slug from company name
 */
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

/**
 * @desc    Get all companies (Platform Admin)
 * @route   GET /api/companies
 * @access  Private (Platform Admin)
 */
export const getCompanies = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;

    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Company.countDocuments(query);
    const companies = await Company.find(query)
      .populate('subscription.planId', 'name displayName price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        companies,
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
 * @desc    Get single company
 * @route   GET /api/companies/:id
 * @access  Private
 */
export const getCompany = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      throw new ApiError(404, 'Company not found');
    }

    // Check access for non-platform admins
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== req.params.id) {
      throw new ApiError(403, 'Access denied');
    }

    // Get company stats
    const totalPartners = await User.countDocuments({
      companyId: company._id,
      role: 'partner'
    });
    const totalStaff = await User.countDocuments({
      companyId: company._id,
      role: { $ne: 'partner' }
    });

    res.status(200).json({
      success: true,
      data: {
        company,
        stats: {
          totalPartners,
          totalStaff
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update company status (Platform Admin)
 * @route   PUT /api/companies/:id/status
 * @access  Private (Platform Admin)
 */
export const updateCompanyStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;

    const company = await Company.findById(req.params.id);

    if (!company) {
      throw new ApiError(404, 'Company not found');
    }

    const validStatuses = ['pending', 'active', 'suspended'];
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, 'Invalid status');
    }

    company.status = status;
    if (reason) {
      company.statusReason = reason;
    }
    await company.save();

    // If company is activated, also activate the company admin
    if (status === 'active') {
      await User.updateOne(
        { companyId: company._id, role: 'company_superadmin' },
        { isActive: true }
      );
    }

    res.status(200).json({
      success: true,
      message: `Company status updated to ${status}`,
      data: { company }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update company details
 * @route   PUT /api/companies/:id
 * @access  Private (Company SuperAdmin / Platform Admin)
 */
export const updateCompany = async (req, res, next) => {
  try {
    const { name, phone, website, address, indiaConfig, dubaiConfig } = req.body;

    const company = await Company.findById(req.params.id);

    if (!company) {
      throw new ApiError(404, 'Company not found');
    }

    // Check access
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== req.params.id) {
      throw new ApiError(403, 'Access denied');
    }

    // Update fields
    if (name) {
      company.name = name;
      company.slug = generateSlug(name);
    }
    if (phone) company.phone = phone;
    if (website) company.website = website;
    if (address) company.address = { ...company.address, ...address };
    if (indiaConfig) company.indiaConfig = { ...company.indiaConfig, ...indiaConfig };
    if (dubaiConfig) company.dubaiConfig = { ...company.dubaiConfig, ...dubaiConfig };

    await company.save();

    res.status(200).json({
      success: true,
      message: 'Company updated successfully',
      data: { company }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update company settings (Master Settings)
 * @route   PUT /api/companies/:id/settings
 * @access  Private (Company SuperAdmin / Platform Admin)
 */
export const updateCompanySettings = async (req, res, next) => {
  try {
    const { tierPercentages, features, notifications, emailBranding } = req.body;

    const company = await Company.findById(req.params.id);

    if (!company) {
      throw new ApiError(404, 'Company not found');
    }

    // Check access
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== req.params.id) {
      throw new ApiError(403, 'Access denied');
    }

    // Update settings - use tierPercentages (percentage of base commission each tier receives)
    if (tierPercentages) {
      company.settings.tierPercentages = { ...company.settings.tierPercentages, ...tierPercentages };
    }
    if (features) {
      company.settings.features = { ...company.settings.features, ...features };
    }
    if (notifications) {
      company.settings.notifications = { ...company.settings.notifications, ...notifications };
    }

    // Update email branding
    if (emailBranding) {
      company.emailBranding = { ...company.emailBranding, ...emailBranding };
    }

    await company.save();

    res.status(200).json({
      success: true,
      message: 'Company settings updated successfully',
      data: {
        settings: company.settings,
        emailBranding: company.emailBranding
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get company settings
 * @route   GET /api/companies/:id/settings
 * @access  Private (Company users)
 */
export const getCompanySettings = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id).select('settings emailBranding logo');

    if (!company) {
      throw new ApiError(404, 'Company not found');
    }

    // Check access
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== req.params.id) {
      throw new ApiError(403, 'Access denied');
    }

    res.status(200).json({
      success: true,
      data: {
        settings: company.settings,
        emailBranding: company.emailBranding,
        logo: company.logo
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get my company settings (for logged-in company users)
 * @route   GET /api/companies/my-settings
 * @access  Private (Company users)
 */
export const getMyCompanySettings = async (req, res, next) => {
  try {
    if (!req.user.companyId) {
      throw new ApiError(400, 'You are not associated with any company');
    }

    const company = await Company.findById(req.user.companyId).select('settings');

    if (!company) {
      throw new ApiError(404, 'Company not found');
    }

    res.status(200).json({
      success: true,
      data: { settings: company.settings }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete company (Platform Admin only)
 * @route   DELETE /api/companies/:id
 * @access  Private (Platform Admin)
 */
export const deleteCompany = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      throw new ApiError(404, 'Company not found');
    }

    // Check if company has active partners
    const activePartners = await User.countDocuments({
      companyId: company._id,
      role: 'partner',
      isActive: true
    });

    if (activePartners > 0) {
      throw new ApiError(400, 'Cannot delete company with active partners');
    }

    // Soft delete - mark as suspended
    company.status = 'suspended';
    await company.save();

    // Deactivate all company users
    await User.updateMany(
      { companyId: company._id },
      { isActive: false }
    );

    res.status(200).json({
      success: true,
      message: 'Company deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get active companies for partner registration (Public)
 * @route   GET /api/companies/public/list
 * @access  Public
 */
export const getActiveCompaniesForRegistration = async (req, res, next) => {
  try {
    const { search, region } = req.query;
    const now = new Date();

    // Build query - only active companies with active subscriptions accepting partners
    const query = {
      status: 'active',
      // Subscription must be active or trial (and not expired)
      $or: [
        { 'subscription.status': 'active' },
        {
          'subscription.status': 'trial',
          'subscription.trialEndsAt': { $gt: now }
        }
      ]
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (region) {
      query.regions = region;
    }

    // Get companies with limited fields (public info only)
    const companies = await Company.find(query)
      .select('name slug logo regions address.city address.country settings.tierPercentages stats.totalPartners')
      .sort({ name: 1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: {
        companies
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get company statistics (Platform Admin)
 * @route   GET /api/companies/stats
 * @access  Private (Platform Admin)
 */
export const getCompanyStats = async (req, res, next) => {
  try {
    const totalCompanies = await Company.countDocuments();
    const activeCompanies = await Company.countDocuments({ status: 'active' });
    const pendingCompanies = await Company.countDocuments({ status: 'pending' });
    const suspendedCompanies = await Company.countDocuments({ status: 'suspended' });

    // Get companies by region
    const indiaCompanies = await Company.countDocuments({ regions: 'india' });
    const dubaiCompanies = await Company.countDocuments({ regions: 'dubai' });

    // Get companies by subscription plan
    const subscriptionStats = await Company.aggregate([
      { $group: { _id: '$subscription.plan', count: { $sum: 1 } } }
    ]);

    // Recent registrations
    const recentCompanies = await Company.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email status createdAt');

    res.status(200).json({
      success: true,
      data: {
        overview: {
          total: totalCompanies,
          active: activeCompanies,
          pending: pendingCompanies,
          suspended: suspendedCompanies
        },
        byRegion: {
          india: indiaCompanies,
          dubai: dubaiCompanies
        },
        bySubscription: subscriptionStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        recent: recentCompanies
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get company plan limits and usage
 * @route   GET /api/companies/my-limits
 * @access  Private (Company users)
 */
export const getMyPlanLimits = async (req, res, next) => {
  try {
    if (!req.user.companyId) {
      throw new ApiError(400, 'You are not associated with any company');
    }

    const limitsAndUsage = await getLimitsAndUsage(req.user.companyId);

    res.status(200).json({
      success: true,
      data: limitsAndUsage
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Check if company subscription is active
 * @route   GET /api/companies/subscription-status
 * @access  Private (Company users)
 */
export const getSubscriptionStatus = async (req, res, next) => {
  try {
    if (!req.user.companyId) {
      throw new ApiError(400, 'You are not associated with any company');
    }

    const isActive = await isSubscriptionActive(req.user.companyId);
    const company = await Company.findById(req.user.companyId)
      .populate('subscription.planId')
      .select('subscription');

    res.status(200).json({
      success: true,
      data: {
        isActive,
        status: company.subscription?.status || 'trial',
        plan: company.subscription?.planId || null,
        trialEndsAt: company.subscription?.trialEndsAt,
        currentPeriodEnd: company.subscription?.currentPeriodEnd
      }
    });
  } catch (error) {
    next(error);
  }
};