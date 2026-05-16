import User from '../models/User.js';
import Company from '../models/Company.js';
import { ApiError } from '../middlewares/error.middleware.js';
import { sendTeamInviteEmail } from '../services/email.service.js';
import { createNotification } from './notification.controller.js';
import crypto from 'crypto';

/**
 * @desc    Get all team members for a company
 * @route   GET /api/company/:companyId/team
 * @access  Private (Company SuperAdmin)
 */
export const getTeamMembers = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { search, role, status } = req.query;

    // Verify access - only company superadmin can view team
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== companyId) {
      throw new ApiError(403, 'Access denied');
    }

    // Build query
    const query = { companyId, role: { $ne: 'partner' } }; // Exclude partners

    if (role) {
      query.role = role;
    }

    if (status !== undefined) {
      query.isActive = status === 'active';
    }

    let users = await User.find(query)
      .select('-password -resetPasswordToken -emailVerificationToken')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    // Search filter
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      users = users.filter(user =>
        searchRegex.test(user.firstName) ||
        searchRegex.test(user.lastName) ||
        searchRegex.test(user.email)
      );
    }

    res.status(200).json({
      success: true,
      data: { team: users }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single team member
 * @route   GET /api/company/:companyId/team/:id
 * @access  Private (Company SuperAdmin)
 */
export const getTeamMember = async (req, res, next) => {
  try {
    const { companyId, id } = req.params;

    // Verify access
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== companyId) {
      throw new ApiError(403, 'Access denied');
    }

    const user = await User.findOne({ _id: id, companyId })
      .select('-password -resetPasswordToken -emailVerificationToken')
      .populate('createdBy', 'firstName lastName');

    if (!user) {
      throw new ApiError(404, 'Team member not found');
    }

    res.status(200).json({
      success: true,
      data: { member: user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new team member
 * @route   POST /api/company/:companyId/team
 * @access  Private (Company SuperAdmin)
 */
export const createTeamMember = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { firstName, lastName, email, phone, role, password, sendInvite } = req.body;

    // Verify access
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== companyId) {
      throw new ApiError(403, 'Access denied');
    }

    // Verify company exists
    const company = await Company.findById(companyId);
    if (!company) {
      throw new ApiError(404, 'Company not found');
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(400, 'A user with this email already exists');
    }

    // Validate role - only company roles allowed
    const companyRoles = ['company_superadmin', 'partner_manager', 'property_manager', 'finance_manager', 'viewer'];
    if (!companyRoles.includes(role)) {
      throw new ApiError(400, 'Invalid role for team member');
    }

    // Generate temporary password if not provided
    const userPassword = password || crypto.randomBytes(8).toString('hex');

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      role,
      password: userPassword,
      companyId,
      createdBy: req.user._id,
      isEmailVerified: true,  // Auto-verify since admin is creating the account
      isActive: true
    });

    // If sendInvite is true, send invitation email with credentials
    if (sendInvite) {
      // Send invitation email with temporary password
      sendTeamInviteEmail(user, userPassword, company, req.user).catch(err => {
        console.error('Failed to send team invitation email:', err.message);
      });
    }

    // Create notification for the new team member
    const roleNames = {
      company_superadmin: 'Company Admin',
      partner_manager: 'Partner Manager',
      property_manager: 'Property Manager',
      finance_manager: 'Finance Manager',
      viewer: 'Viewer'
    };

    createNotification({
      recipientId: user._id,
      type: 'team_member_added',
      title: 'Welcome to the Team',
      message: `You have been added to ${company.name} as a ${roleNames[role] || role}. ${sendInvite ? 'Check your email for login credentials.' : ''}`,
      data: {
        companyId: company._id,
        userId: user._id
      },
      link: '/profile'
    }).catch(err => {
      console.error('Failed to create team member notification:', err.message);
    });

    // Remove sensitive fields from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.resetPasswordToken;
    delete userResponse.emailVerificationToken;

    res.status(201).json({
      success: true,
      message: 'Team member created successfully',
      data: { member: userResponse }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update team member
 * @route   PUT /api/company/:companyId/team/:id
 * @access  Private (Company SuperAdmin)
 */
export const updateTeamMember = async (req, res, next) => {
  try {
    const { companyId, id } = req.params;
    const { firstName, lastName, email, phone, role } = req.body;

    // Verify access
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== companyId) {
      throw new ApiError(403, 'Access denied');
    }

    const user = await User.findOne({ _id: id, companyId });
    if (!user) {
      throw new ApiError(404, 'Team member not found');
    }

    // Prevent changing own role if superadmin
    if (user._id.toString() === req.user._id.toString() && role && role !== user.role) {
      throw new ApiError(400, 'You cannot change your own role');
    }

    // Check if email is being changed and if it already exists
    if (email && email.toLowerCase() !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        throw new ApiError(400, 'A user with this email already exists');
      }
      user.email = email.toLowerCase();
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (role) {
      const companyRoles = ['company_superadmin', 'partner_manager', 'property_manager', 'finance_manager', 'viewer'];
      if (!companyRoles.includes(role)) {
        throw new ApiError(400, 'Invalid role for team member');
      }
      user.role = role;
    }

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.resetPasswordToken;
    delete userResponse.emailVerificationToken;

    res.status(200).json({
      success: true,
      message: 'Team member updated successfully',
      data: { member: userResponse }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete team member (permanently remove from database)
 * @route   DELETE /api/company/:companyId/team/:id
 * @access  Private (Company SuperAdmin)
 */
export const deleteTeamMember = async (req, res, next) => {
  try {
    const { companyId, id } = req.params;

    // Verify access
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== companyId) {
      throw new ApiError(403, 'Access denied');
    }

    // Prevent deleting self
    if (id === req.user._id.toString()) {
      throw new ApiError(400, 'You cannot delete your own account');
    }

    const user = await User.findOne({ _id: id, companyId });
    if (!user) {
      throw new ApiError(404, 'Team member not found');
    }

    // Permanently delete the user from the database
    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Team member permanently deleted'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle team member status (activate/deactivate)
 * @route   PUT /api/company/:companyId/team/:id/status
 * @access  Private (Company SuperAdmin)
 */
export const toggleTeamMemberStatus = async (req, res, next) => {
  try {
    const { companyId, id } = req.params;
    const { isActive, reason } = req.body;

    // Verify access
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== companyId) {
      throw new ApiError(403, 'Access denied');
    }

    // Prevent deactivating self
    if (id === req.user._id.toString()) {
      throw new ApiError(400, 'You cannot change your own status');
    }

    const user = await User.findOne({ _id: id, companyId });
    if (!user) {
      throw new ApiError(404, 'Team member not found');
    }

    user.isActive = isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Team member ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { member: user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend invitation to team member
 * @route   POST /api/company/:companyId/team/:id/resend-invite
 * @access  Private (Company SuperAdmin)
 */
export const resendInvite = async (req, res, next) => {
  try {
    const { companyId, id } = req.params;

    // Verify access
    if (req.user.role !== 'platform_admin' && req.user.companyId?.toString() !== companyId) {
      throw new ApiError(403, 'Access denied');
    }

    const user = await User.findOne({ _id: id, companyId });
    if (!user) {
      throw new ApiError(404, 'Team member not found');
    }

    if (user.isEmailVerified) {
      throw new ApiError(400, 'This team member has already verified their email');
    }

    // Get company info
    const company = await Company.findById(companyId);

    // Generate a new temporary password for resend
    const temporaryPassword = crypto.randomBytes(8).toString('hex');
    user.password = temporaryPassword;
    await user.save();

    // Send invitation email with new temporary password
    sendTeamInviteEmail(user, temporaryPassword, company, req.user).catch(err => {
      console.error('Failed to send team invitation email:', err.message);
    });

    res.status(200).json({
      success: true,
      message: 'Invitation resent successfully with new temporary password'
    });
  } catch (error) {
    next(error);
  }
};