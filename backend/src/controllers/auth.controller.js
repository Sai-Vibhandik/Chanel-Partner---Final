import crypto from 'crypto';
import User from '../models/User.js';
import Company from '../models/Company.js';
import AgreementTemplate from '../models/AgreementTemplate.js';
import LoginLog from '../models/LoginLog.js';
import PartnerCompany from '../models/PartnerCompany.js';
import { generateToken, verifyToken } from '../utils/token.js';
import {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  getTokensFromRequest,
  verifyRefreshToken,
  blacklistToken
} from '../utils/cookieTokens.js';
import { ApiError } from '../middlewares/error.middleware.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.service.js';
import { parseUserAgent } from '../utils/userAgent.js';
import { getGeoFromIP } from '../services/geo.service.js';

/**
 * Log login attempt
 * @param {Object} params - Login attempt details
 */
const logLoginAttempt = async (params) => {
  try {
    const { email, user, status, failureReason, req } = params;

    // Parse user agent
    const userAgent = req.headers['user-agent'];
    const parsedUA = parseUserAgent(userAgent);

    // Get IP address - check multiple sources
    const ip = req.ip ||
               req.connection?.remoteAddress ||
               req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               'unknown';

    // Get geolocation from IP
    const location = await getGeoFromIP(ip);

    // Determine companyIds - for partners, look up from PartnerCompany collection
    let companyIds = [];
    if (user && user.companyId) {
      // User has direct company association
      companyIds = [user.companyId];
    } else if (user && user.role === 'partner') {
      // Get all partner's companies from PartnerCompany collection (any status)
      // This allows company admins to see login attempts from pending partners too
      const partnerships = await PartnerCompany.find({
        partnerId: user._id
      }).select('companyId').lean();
      companyIds = partnerships.map(p => p.companyId).filter(id => id); // Filter out null/undefined
    }

    // If no company found, use null (for platform admins, unaffiliated partners, etc.)
    if (companyIds.length === 0) {
      companyIds = [null];
    }

    // Create login log for each company the partner belongs to
    const loginLogData = {
      userId: user?._id || null,
      email: email.toLowerCase(),
      status,
      device: parsedUA.device,
      os: parsedUA.os,
      browser: parsedUA.browser,
      ip: ip === 'unknown' ? '127.0.0.1' : ip,
      location,
      userAgent,
      loginMethod: 'password',
      failureReason: status === 'failed' ? failureReason : null,
      timestamp: new Date()
    };

    // Create a log entry for each company
    await Promise.all(
      companyIds.map(companyId =>
        LoginLog.create({
          ...loginLogData,
          companyId
        })
      )
    );
  } catch (error) {
    // Don't throw error - logging is optional
    console.error('Failed to log login attempt:', error.message);
  }
};

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
 * Create default agreement templates for a new company
 */
const createDefaultAgreementTemplates = async (companyId, userId) => {
  const defaultTemplates = [
    {
      companyId,
      type: 'nda',
      name: 'Non-Disclosure Agreement (NDA)',
      isRequired: true,
      displayOrder: 1,
      createdBy: userId,
      content: `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into as of {{date}} by and between:

DISCLOSING PARTY:
{{companyName}}
("Company")

RECEIVING PARTY:
{{partnerName}}
("Partner")

WHEREAS, the Company desires to share certain confidential information with the Partner for the purpose of establishing a business relationship for the marketing and sale of real estate properties;

NOW, THEREFORE, in consideration of the mutual covenants contained herein, the parties agree as follows:

1. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" means any and all information or data that has or could have commercial value or other utility in the business in which Disclosing Party is engaged. If Confidential Information includes information belonging to a third party, the Disclosing Party will so identify such information.

2. OBLIGATIONS OF RECEIVING PARTY
Receiving Party shall:
a) Maintain the confidentiality of the Confidential Information and not disclose it to any third party
b) Use the Confidential Information only for the purposes contemplated by this Agreement
c) Restrict disclosure of Confidential Information to its employees who have a need to know

3. EXCLUSIONS
The obligations of confidentiality shall not apply to information that:
a) Is or becomes publicly known through no fault of the Receiving Party
b) Is already known to the Receiving Party prior to disclosure
c) Is independently developed by the Receiving Party
d) Is approved for release by written authorization of the Disclosing Party

4. TERM
This Agreement shall remain in effect for a period of three (3) years from the date of signing.

5. RETURN OF MATERIALS
Upon termination of this Agreement, or upon request of the Disclosing Party, the Receiving Party shall promptly return or destroy all Confidential Information.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

Company: {{companyName}}
Signature: _________________________
Date: _________________________

Partner: {{partnerName}}
Signature: _________________________
Date: _________________________`
    },
    {
      companyId,
      type: 'nca',
      name: 'Non-Compete Agreement (NCA)',
      isRequired: true,
      displayOrder: 2,
      createdBy: userId,
      content: `NON-COMPETE AGREEMENT

This Non-Compete Agreement ("Agreement") is entered into as of {{date}} by and between:

COMPANY:
{{companyName}}
("Company")

PARTNER:
{{partnerName}}
("Partner")

WHEREAS, the Company is engaged in the business of real estate development and marketing;

WHEREAS, the Partner will have access to confidential information, trade secrets, and business relationships of the Company;

NOW, THEREFORE, in consideration of the mutual covenants contained herein, the parties agree as follows:

1. NON-COMPETE COVENANT
During the term of this Agreement and for a period of one (1) year following termination, the Partner shall not:
a) Directly or indirectly engage in any business that competes with the Company within the designated territory
b) Solicit or attempt to solicit any client, customer, or prospect of the Company
c) Divert or attempt to divert any business away from the Company

2. NON-SOLICITATION
The Partner shall not, during the term of this Agreement and for one (1) year thereafter:
a) Solicit, recruit, or hire any employee of the Company
b) Encourage any client or customer to terminate their relationship with the Company

3. TERRITORY
The restrictions set forth herein shall apply to all areas where the Company conducts business or has active marketing efforts.

4. REASONABLENESS
The Partner acknowledges that the restrictions contained herein are reasonable and necessary to protect the Company's legitimate business interests.

5. DURATION
This Agreement shall remain in effect during the term of the business relationship and for one (1) year following its termination.

6. REMEDIES
In the event of a breach, the Company shall be entitled to injunctive relief and any other remedies available at law or equity.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

Company: {{companyName}}
Signature: _________________________
Date: _________________________

Partner: {{partnerName}}
Signature: _________________________
Date: _________________________`
    },
    {
      companyId,
      type: 'cpa',
      name: 'Channel Partner Agreement',
      isRequired: true,
      displayOrder: 3,
      createdBy: userId,
      content: `CHANNEL PARTNER AGREEMENT

This Channel Partner Agreement ("Agreement") is entered into as of {{date}} by and between:

COMPANY:
{{companyName}}
("Company")

CHANNEL PARTNER:
{{partnerName}}
("Partner")

WHEREAS, the Company is engaged in the business of real estate development and wishes to engage Partners to market and sell its properties;

WHEREAS, the Partner has the necessary expertise and resources to market and sell real estate properties;

NOW, THEREFORE, in consideration of the mutual covenants contained herein, the parties agree as follows:

1. APPOINTMENT
The Company hereby appoints the Partner as a non-exclusive channel partner for the marketing and sale of the Company's properties, subject to the terms and conditions of this Agreement.

2. PARTNER'S RESPONSIBILITIES
The Partner shall:
a) Market and promote the Company's properties to potential buyers
b) Provide accurate information about the properties to prospective buyers
c) Facilitate site visits for interested buyers
d) Maintain professional conduct in all dealings with buyers and the Company
e) Comply with all applicable laws and regulations

3. COMMISSION
The Partner shall be entitled to commission on successful sales as per the Company's tier-based commission structure. Commission rates may vary based on the Partner's tier and property type.

4. TERM AND TERMINATION
This Agreement shall remain in effect until terminated by either party with thirty (30) days written notice. Upon termination, the Partner shall be entitled to commissions on sales completed prior to termination.

5. CONFIDENTIALITY
The Partner agrees to maintain the confidentiality of all proprietary information shared by the Company.

6. INDEPENDENT CONTRACTOR STATUS
The Partner is an independent contractor and not an employee, agent, or partner of the Company.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

Company: {{companyName}}
Signature: _________________________
Date: _________________________

Partner: {{partnerName}}
Signature: _________________________
Date: _________________________`
    },
    {
      companyId,
      type: 'code_of_conduct',
      name: 'Code of Conduct',
      isRequired: true,
      displayOrder: 4,
      createdBy: userId,
      content: `CODE OF CONDUCT

This Code of Conduct establishes the standards of behavior expected from all Channel Partners associated with {{companyName}}.

PARTNER:
{{partnerName}}

Effective Date: {{date}}

1. PROFESSIONAL CONDUCT
The Partner shall:
a) Conduct all business activities with integrity, honesty, and professionalism
b) Represent the Company and its properties accurately and fairly
c) Comply with all applicable laws, regulations, and industry standards
d) Maintain appropriate licensing and certifications required for real estate activities

2. ANTI-BRIBERY AND CORRUPTION
The Partner shall NOT:
a) Offer, give, or accept bribes or improper payments
b) Engage in any form of corruption or unethical business practice
c) Make false or misleading statements to customers or authorities

3. CONFLICT OF INTEREST
The Partner shall:
a) Disclose any potential conflicts of interest to the Company
b) Avoid situations that could compromise their objectivity or loyalty
c) Not engage in competing activities without prior written consent

4. CUSTOMER RELATIONS
The Partner shall:
a) Treat all customers fairly and with respect
b) Provide accurate and complete information about properties
c) Not engage in discriminatory practices
d) Promptly address customer complaints and concerns

5. CONFIDENTIAL INFORMATION
The Partner shall protect all confidential and proprietary information of the Company, its customers, and business partners.

6. DATA PROTECTION
The Partner shall comply with all applicable data protection and privacy laws when handling personal information.

7. REPORTING VIOLATIONS
The Partner shall promptly report any known or suspected violations of this Code to the Company.

8. CONSEQUENCES OF VIOLATIONS
Violations of this Code may result in:
a) Termination of the partnership agreement
b) Forfeiture of commissions
c) Legal action, if applicable

ACKNOWLEDGMENT

I, {{partnerName}}, acknowledge that I have read and understood this Code of Conduct and agree to abide by its terms.

Partner Signature: _________________________
Date: _________________________

Company Representative: {{companyName}}
Signature: _________________________
Date: _________________________`
    },
    {
      companyId,
      type: 'gdpr_consent',
      name: 'GDPR Consent Form',
      isRequired: true,
      displayOrder: 5,
      createdBy: userId,
      content: `GDPR CONSENT AND DATA PROCESSING AGREEMENT

This GDPR Consent Form ("Form") is entered into as of {{date}} by and between:

DATA CONTROLLER:
{{companyName}}
("Company")

DATA SUBJECT:
{{partnerName}}
("Partner")

1. PURPOSE OF DATA COLLECTION
The Company collects and processes the Partner's personal data for the following purposes:
a) Managing the channel partnership relationship
b) Processing commissions and payments
c) Communicating about properties and business opportunities
d) Compliance with legal and regulatory requirements
e) Providing support and training

2. TYPES OF DATA COLLECTED
The Company may collect the following types of personal data:
a) Identity data (name, email, phone number, address)
b) Financial data (bank details for commission payments)
c) Professional data (qualifications, experience)
d) KYC documents (government ID, proof of address)
e) Communication records

3. LEGAL BASIS FOR PROCESSING
The Company processes personal data based on:
a) Performance of the contract (partnership agreement)
b) Legitimate business interests
c) Legal obligations
d) Explicit consent where required

4. DATA SHARING
Personal data may be shared with:
a) Property developers and third-party service providers
b) Regulatory authorities as required by law
c) Professional advisors (accountants, lawyers)

5. DATA RETENTION
Personal data will be retained for:
a) Duration of the partnership plus 7 years
b) As required by applicable laws and regulations

6. PARTNER'S RIGHTS
The Partner has the right to:
a) Access their personal data
b) Correct inaccurate data
c) Request deletion of data (subject to legal requirements)
d) Object to certain processing activities
e) Data portability

7. CONTACT FOR DATA PROTECTION
For any questions or concerns about data processing, contact:
{{companyName}}
Email: [Company Email]

CONSENT DECLARATION

I, {{partnerName}}, hereby consent to the collection and processing of my personal data as described above. I understand my rights regarding my personal data and how to exercise them.

Partner Name: {{partnerName}}
Partner Signature: _________________________
Date: _________________________

Company Representative: {{companyName}}
Signature: _________________________
Date: _________________________`
    }
  ];

  try {
    await AgreementTemplate.insertMany(defaultTemplates);
  } catch (error) {
    console.error('Error creating default agreement templates:', error);
    // Don't throw error - company registration should succeed even if templates fail
  }
};

/**
 * @desc    Register new company (self-registration)
 * @route   POST /api/auth/register/company
 * @access  Public
 */
export const registerCompany = async (req, res, next) => {
  try {
    const {
      companyName,
      email,
      phone,
      website,
      regions,
      defaultCurrency,
      address,
      // SuperAdmin account
      firstName,
      lastName,
      password
    } = req.body;

    // Check if company email already exists
    const existingCompany = await Company.findOne({ email });
    if (existingCompany) {
      throw new ApiError(400, 'Company with this email already exists');
    }

    // Check if user email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }

    // Generate slug and check if it already exists
    const slug = generateSlug(companyName);
    const existingSlug = await Company.findOne({ slug });
    if (existingSlug) {
      throw new ApiError(400, 'A company with a similar name already exists. Please use a different name.');
    }

    // Create company
    const company = await Company.create({
      name: companyName,
      slug,
      email,
      phone,
      website,
      regions: regions || ['india'],
      defaultCurrency: defaultCurrency || 'INR',
      address,
      status: 'active' // Auto-approve new companies
    });

    // Create company superadmin
    const user = await User.create({
      companyId: company._id,
      email,
      password,
      firstName,
      lastName,
      phone,
      role: 'company_superadmin',
      isEmailVerified: false
    });

    // Create default agreement templates for the new company
    await createDefaultAgreementTemplates(company._id, user._id);

    // Generate email verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Send verification email
    await sendVerificationEmail(user, verificationToken);

    // Don't return token - user must verify email first
    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account before logging in.',
      data: {
        company: {
          id: company._id,
          name: company.name,
          email: company.email,
          status: company.status
        },
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      }
    });
  } catch (error) {
    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      if (field === 'email') {
        return next(new ApiError(400, 'Email already registered'));
      }
      if (field === 'slug') {
        return next(new ApiError(400, 'A company with a similar name already exists'));
      }
    }
    next(error);
  }
};

/**
 * @desc    Register new partner
 * @route   POST /api/auth/register/partner
 * @access  Public
 */
export const registerPartner = async (req, res, next) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      // Partner profile
      companyName,
      companyType,
      operatingRegion,
      // Address
      address,
      // Contact person
      contactPerson,
      // Bank details
      bankDetails
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }

    // Create partner user (no company association yet)
    // Status is 'active' - partner can login immediately and browse companies
    // Approval happens at the partnership level when company approves their application
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone,
      role: 'partner',
      partnerProfile: {
        companyName,
        companyType,
        operatingRegion,
        address,
        contactPerson,
        bankDetails,
        status: 'active'
      }
    });

    // Generate email verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Send verification email
    await sendVerificationEmail(user, verificationToken);

    // Don't return token - user must verify email first
    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account before logging in.',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          partnerProfile: user.partnerProfile
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email || !password) {
      // Log failed attempt - missing credentials
      await logLoginAttempt({
        email: email || 'unknown',
        user: null,
        status: 'failed',
        failureReason: 'invalid_credentials',
        req
      });
      throw new ApiError(400, 'Please provide email and password');
    }

    // Find user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      // Log failed attempt - user not found
      await logLoginAttempt({
        email,
        user: null,
        status: 'failed',
        failureReason: 'user_not_found',
        req
      });
      throw new ApiError(401, 'Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      // Log failed attempt - account inactive
      await logLoginAttempt({
        email,
        user,
        status: 'failed',
        failureReason: 'account_inactive',
        req
      });
      throw new ApiError(401, 'Your account has been deactivated');
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      // Log failed attempt - email not verified
      await logLoginAttempt({
        email,
        user,
        status: 'failed',
        failureReason: 'email_not_verified',
        req
      });
      throw new ApiError(401, 'Please verify your email address to login. Check your inbox for the verification link.');
    }

    // Check password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      // Log failed attempt - invalid password
      await logLoginAttempt({
        email,
        user,
        status: 'failed',
        failureReason: 'invalid_password',
        req
      });
      throw new ApiError(401, 'Invalid credentials');
    }

    // For company users (not partners), check if company is active
    // Partners use PartnerCompany collection for associations, not direct companyId
    if (user.role !== 'platform_admin' && user.role !== 'partner' && user.companyId) {
      const company = await Company.findById(user.companyId);
      if (!company) {
        await logLoginAttempt({
          email,
          user,
          status: 'failed',
          failureReason: 'unknown',
          req
        });
        throw new ApiError(401, 'Company not found');
      }
      if (company.status !== 'active') {
        await logLoginAttempt({
          email,
          user,
          status: 'failed',
          failureReason: 'account_suspended',
          req
        });
        throw new ApiError(401, 'Company account is not active');
      }
    }

    // Log successful login
    await logLoginAttempt({
      email,
      user,
      status: 'success',
      req
    });

    // Update last login
    user.lastLogin = new Date();
    user.loginHistory.push({
      ip: req.ip,
      device: req.headers['user-agent'],
      browser: req.headers['user-agent'],
      timestamp: new Date()
    });
    await user.save({ validateBeforeSave: false });

    // Generate tokens
    const tokenPayload = {
      userId: user._id,
      companyId: user.companyId,
      role: user.role
    };

    // Generate both access token (short-lived) and refresh token (long-lived)
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Set tokens in httpOnly cookies
    setAuthCookies(res, accessToken, refreshToken);

    // Response without token in body (token is in cookie)
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          companyId: user.companyId
        }
        // Token is now in httpOnly cookie, not in response body
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Get company if not platform admin
    let company = null;
    if (user.role !== 'platform_admin' && user.companyId) {
      company = await Company.findById(user.companyId);
    }

    res.status(200).json({
      success: true,
      data: {
        user,
        company
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = async (req, res, next) => {
  try {
    // Blacklist the current access token
    if (req.accessToken) {
      blacklistToken(req.accessToken);
    }

    // Clear auth cookies
    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Generate reset token
    const resetToken = user.generateResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Send reset password email
    await sendPasswordResetEmail(user, resetToken);

    res.status(200).json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      throw new ApiError(400, 'Invalid or expired reset token');
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Generate tokens and set cookies
    const tokenPayload = {
      userId: user._id,
      companyId: user.companyId,
      role: user.role
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Set tokens in httpOnly cookies
    setAuthCookies(res, accessToken, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify email
 * @route   POST /api/auth/verify-email/:token
 * @access  Public
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
      throw new ApiError(400, 'Invalid or expired verification token');
    }

    // Verify email
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now login.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend verification email
 * @route   POST /api/auth/resend-verification
 * @access  Public
 */
export const resendVerificationEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ApiError(400, 'Email is required');
    }

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists or not
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a verification email has been sent.'
      });
      return;
    }

    // Check if already verified
    if (user.isEmailVerified) {
      res.status(200).json({
        success: true,
        message: 'Your email is already verified. You can login now.'
      });
      return;
    }

    // Generate new verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Send verification email
    await sendVerificationEmail(user, verificationToken);

    res.status(200).json({
      success: true,
      message: 'Verification email sent. Please check your inbox.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refresh token
 * @route   POST /api/auth/refresh-token
 * @access  Public (requires refresh token in cookie)
 */
export const refreshToken = async (req, res, next) => {
  try {
    // Get refresh token from cookies
    const { refreshToken } = getTokensFromRequest(req);

    if (!refreshToken) {
      throw new ApiError(401, 'Refresh token not found. Please log in again.');
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded || decoded.type !== 'refresh') {
      throw new ApiError(401, 'Invalid refresh token. Please log in again.');
    }

    // Get user
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      throw new ApiError(401, 'User not found or inactive. Please log in again.');
    }

    // Generate new tokens
    const tokenPayload = {
      userId: user._id,
      companyId: user.companyId,
      role: user.role
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // Set new tokens in cookies
    setAuthCookies(res, newAccessToken, newRefreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          companyId: user.companyId
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone } = req.body;

    // Build update object with only provided fields
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;

    // Use findByIdAndUpdate to avoid validation issues with password field
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/auth/password
 * @access  Private
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Verify current password
    const isPasswordCorrect = await user.comparePassword(currentPassword);
    if (!isPasswordCorrect) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Invalidate all existing tokens by blacklisting current token
    if (req.accessToken) {
      blacklistToken(req.accessToken);
    }

    // Generate new tokens
    const tokenPayload = {
      userId: user._id,
      companyId: user.companyId,
      role: user.role
    };

    const accessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // Set new tokens in cookies
    setAuthCookies(res, accessToken, newRefreshToken);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Test email sending
 * @route   POST /api/auth/test-email
 * @access  Private
 */
export const testEmail = async (req, res, next) => {
  try {
    const { sendEmail } = await import('../services/email.service.js');
    const user = req.user;

    console.log('📧 Testing email service...');
    console.log('   User:', user.email);
    console.log('   Company ID:', user.companyId);

    const result = await sendEmail({
      to: user.email,
      subject: 'Test Email - Channel Partner Portal',
      type: 'verifyEmail', // Using existing template
      data: {
        userName: user.firstName,
        token: 'test-token-12345',
        companyName: 'Channel Partner Portal'
      },
      companyId: user.companyId,
      userId: user._id
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        message: `Test email sent successfully to ${user.email}`,
        data: {
          messageId: result.messageId,
          email: user.email
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Test email error:', error);
    next(error);
  }
};