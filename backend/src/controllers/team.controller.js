import User from '../models/User.js';
import Company from '../models/Company.js';
import { ApiError } from '../middlewares/error.middleware.js';
import { sendTeamInviteEmail } from '../services/email.service.js';
import { createNotification } from './notification.controller.js';
import { logActivity, getRequestMetadata, ActionTypes, ResourceTypes } from '../services/activityLog.service.js';
import crypto from 'crypto';

/**
 * @desc    Get all team members for a company
 * @route   GET /api/company/:companyId/team
 * @access  Private (Company SuperAdmin)
 */
export const getTeamMembers = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { search, role, status, page = 1, limit = 10 } = req.query;

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

    // Search filter
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex }
      ];
    }

    // Get total count for pagination
    const total = await User.countDocuments(query);
    const pages = Math.ceil(total / limit);
    const currentPage = Math.max(1, Math.min(parseInt(page), pages || 1));

    const users = await User.find(query)
      .select('-password -resetPasswordToken -emailVerificationToken')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        team: users,
        pagination: {
          total,
          pages,
          currentPage,
          limit: parseInt(limit)
        }
      }
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
    // Send email asynchronously (don't wait for it)
    console.log('📧 Team member created. sendInvite:', sendInvite, 'Type:', typeof sendInvite);
    if (sendInvite) {
      console.log('📧 Preparing to send team invitation email to:', user.email);
      sendTeamInviteEmail(user, userPassword, company, req.user)
        .then(() => {
          console.log(`✅ Team invitation email sent to ${user.email}`);
        })
        .catch(err => {
          console.error('❌ Failed to send team invitation email:', err.message);
        });
    } else {
      console.log('📧 sendInvite is false/undefined, skipping email');
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

    // Log activity
    await logActivity({
      userId: req.user._id,
      companyId: companyId,
      action: ActionTypes.TEAM_MEMBER_ADDED,
      resourceType: ResourceTypes.TEAM_MEMBER,
      resourceId: user._id,
      resourceTitle: `${user.firstName} ${user.lastName}`,
      details: {
        memberEmail: user.email,
        memberRole: role,
        inviteSent: sendInvite || false
      },
      ...getRequestMetadata(req)
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

    // Track if email is being changed
    let emailChanged = false;
    const oldEmail = user.email;

    // Check if email is being changed and if it already exists
    if (email && email.toLowerCase() !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        throw new ApiError(400, 'A user with this email already exists');
      }
      user.email = email.toLowerCase();
      emailChanged = true;
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

    // Log activity
    await logActivity({
      userId: req.user._id,
      companyId: companyId,
      action: ActionTypes.TEAM_MEMBER_UPDATED,
      resourceType: ResourceTypes.TEAM_MEMBER,
      resourceId: user._id,
      resourceTitle: `${user.firstName} ${user.lastName}`,
      details: {
        memberEmail: user.email,
        changes: {
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          email: email || undefined,
          phone: phone || undefined,
          role: role || undefined
        }
      },
      ...getRequestMetadata(req)
    });

    // Send notification and email if email was changed
    if (emailChanged) {
      const company = await Company.findById(companyId);
      const updatedBy = req.user;

      // Create notification for the team member
      createNotification({
        recipientId: user._id,
        type: 'system',
        title: 'Email Address Updated',
        message: `Your email address has been changed from ${oldEmail} to ${user.email}. If you did not make this change, please contact your administrator.`,
        data: {
          companyId: company._id,
          userId: user._id,
          oldEmail,
          newEmail: user.email
        },
        link: '/profile'
      }).catch(err => {
        console.error('Failed to create email change notification:', err.message);
      });

      // Send email notification to new email address
      const { sendEmail } = await import('../services/email.service.js');
      sendEmail({
        to: user.email,
        subject: `Email Address Updated - ${company.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">Email Address Updated</h2>
            <p>Hello ${user.firstName},</p>
            <p>Your email address has been updated in <strong>${company.name}</strong>'s team.</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Previous Email:</strong> ${oldEmail}</p>
              <p style="margin: 5px 0;"><strong>New Email:</strong> ${user.email}</p>
            </div>
            <p>This change was made by ${updatedBy.firstName} ${updatedBy.lastName}.</p>
            <p>If you did not request this change, please contact your administrator immediately.</p>
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
              Best regards,<br>${company.name} Team
            </p>
          </div>
        `
      }).catch(err => {
        console.error('Failed to send email change notification:', err.message);
      });

      // Also send notification to old email for security
      sendEmail({
        to: oldEmail,
        subject: `Email Address Changed - ${company.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Security Notice: Email Address Changed</h2>
            <p>Hello ${user.firstName},</p>
            <p>This is a security notification to inform you that your email address has been changed.</p>
            <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <p style="margin: 5px 0;"><strong>Previous Email:</strong> ${oldEmail}</p>
              <p style="margin: 5px 0;"><strong>New Email:</strong> ${user.email}</p>
            </div>
            <p>If you did not make this change, please contact your administrator immediately.</p>
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
              Best regards,<br>${company.name} Team
            </p>
          </div>
        `
      }).catch(err => {
        console.error('Failed to send old email notification:', err.message);
      });
    }

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

    // Log activity
    await logActivity({
      userId: req.user._id,
      companyId: companyId,
      action: ActionTypes.TEAM_MEMBER_DELETED,
      resourceType: ResourceTypes.TEAM_MEMBER,
      resourceId: id,
      resourceTitle: `${user.firstName} ${user.lastName}`,
      details: {
        memberEmail: user.email,
        memberRole: user.role
      },
      ...getRequestMetadata(req)
    });

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

    // Log activity
    await logActivity({
      userId: req.user._id,
      companyId: companyId,
      action: isActive ? ActionTypes.TEAM_MEMBER_ACTIVATED : ActionTypes.TEAM_MEMBER_DEACTIVATED,
      resourceType: ResourceTypes.TEAM_MEMBER,
      resourceId: user._id,
      resourceTitle: `${user.firstName} ${user.lastName}`,
      details: {
        memberEmail: user.email,
        reason: reason || undefined
      },
      ...getRequestMetadata(req)
    });

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
    sendTeamInviteEmail(user, temporaryPassword, company, req.user)
      .then(() => {
        console.log(`✅ Team invitation email resent to ${user.email}`);
      })
      .catch(err => {
        console.error('❌ Failed to resend team invitation email:', err.message);
      });

    // Log activity
    await logActivity({
      userId: req.user._id,
      companyId: companyId,
      action: ActionTypes.TEAM_INVITE_RESENT,
      resourceType: ResourceTypes.TEAM_MEMBER,
      resourceId: user._id,
      resourceTitle: `${user.firstName} ${user.lastName}`,
      details: {
        memberEmail: user.email
      },
      ...getRequestMetadata(req)
    });

    res.status(200).json({
      success: true,
      message: 'Invitation resent successfully with new temporary password'
    });
  } catch (error) {
    next(error);
  }
};