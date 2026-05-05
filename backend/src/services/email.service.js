import nodemailer from 'nodemailer';
import EmailLog from '../models/EmailLog.js';
import Company from '../models/Company.js';

// Store transporter instance
let transporterInstance = null;

// Create transporter based on environment (called lazily)
const getTransporter = () => {
  // Return existing instance if already created
  if (transporterInstance) {
    return transporterInstance;
  }

  console.log('📧 Email service: Creating new SMTP transporter');
  console.log('   SMTP_HOST:', process.env.SMTP_HOST);
  console.log('   SMTP_PORT:', process.env.SMTP_PORT);
  console.log('   SMTP_USER:', process.env.SMTP_USER);
  console.log('   SMTP_PASS:', process.env.SMTP_PASS ? 'SET' : 'NOT SET');

  // For development, use console output if no SMTP config
  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
    console.log('📧 Email service: Using console logging (no SMTP configured)');
    transporterInstance = {
      sendMail: async (mailOptions) => {
        console.log('📧 Email would be sent:');
        console.log('   To:', mailOptions.to);
        console.log('   Subject:', mailOptions.subject);
        return { messageId: 'dev-' + Date.now(), response: 'Logged to console' };
      },
      verify: async () => {
        console.log('📧 Email service: Console mode - no verification needed');
        return true;
      }
    };
    return transporterInstance;
  }

  // Production SMTP configuration
  const smtpConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    logger: process.env.NODE_ENV === 'development',
    debug: process.env.NODE_ENV === 'development'
  };

  console.log('📧 Email service: SMTP config');
  console.log('   Host:', smtpConfig.host);
  console.log('   Port:', smtpConfig.port);
  console.log('   User:', smtpConfig.auth.user || 'NOT SET');
  console.log('   Pass:', smtpConfig.auth.pass ? 'configured' : 'NOT SET');

  transporterInstance = nodemailer.createTransport(smtpConfig);
  return transporterInstance;
};

// Verify SMTP connection on startup
export const verifyEmailConnection = async () => {
  try {
    const transporter = getTransporter();
    if (transporter.verify) {
      await transporter.verify();
      console.log('✅ Email service: SMTP connection verified successfully');
      return true;
    }
    return true; // Console mode
  } catch (error) {
    console.error('❌ Email service: SMTP connection failed:', error.message);
    console.error('   Please check your SMTP configuration in .env file');
    return false;
  }
};

// Email templates (hardcoded)
const getEmailTemplate = (type, data, companyBranding = {}) => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const companyName = data.companyName || 'Channel Partner Portal';

  // Get branding colors with defaults
  const primaryColor = companyBranding.primaryColor || '#4F46E5';
  const secondaryColor = companyBranding.secondaryColor || '#764BA2';
  const buttonColor = companyBranding.buttonColor || primaryColor;
  const headerBg = companyBranding.headerBackgroundColor || primaryColor;
  const logoUrl = companyBranding.logoUrl || '';
  const showLogo = companyBranding.showLogoInEmails !== false && logoUrl;
  const footerText = companyBranding.footerText || '';

  const templates = {
    // Email verification for new registrations
    verifyEmail: {
      subject: `Verify your email - ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            ${showLogo ? `<img src="${logoUrl}" alt="${companyName}" style="max-width: 150px; height: auto; margin-bottom: 10px;" />` : ''}
            <h1 style="color: white; margin: 0;">Welcome to ${companyName}!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p>Hello ${data.userName},</p>
            <p>Thank you for registering with us. Please verify your email address to get started.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/verify-email/${data.token}"
                 style="background: ${buttonColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Verify Email Address
              </a>
            </div>

            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: ${primaryColor}; font-size: 14px;">${baseUrl}/verify-email/${data.token}</p>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
            </p>
          </div>
          <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            ${footerText ? `<p>${footerText}</p>` : ''}
            <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
          </div>
        </body>
        </html>
      `
    },

    // Password reset
    resetPassword: {
      subject: `Reset your password - ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            ${showLogo ? `<img src="${logoUrl}" alt="${companyName}" style="max-width: 150px; height: auto; margin-bottom: 10px;" />` : ''}
            <h1 style="color: white; margin: 0;">Reset Your Password</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p>Hello ${data.userName},</p>
            <p>We received a request to reset your password. Click the button below to create a new password.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/reset-password/${data.token}"
                 style="background: ${buttonColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>

            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: ${primaryColor}; font-size: 14px;">${baseUrl}/reset-password/${data.token}</p>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
            </p>
          </div>
          <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            ${footerText ? `<p>${footerText}</p>` : ''}
            <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
          </div>
        </body>
        </html>
      `
    },

    // New property notification for partners
    newPropertyPartner: {
      subject: `New Property Available: ${data.propertyName} - ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Property</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            ${showLogo ? `<img src="${logoUrl}" alt="${companyName}" style="max-width: 150px; height: auto; margin-bottom: 10px;" />` : ''}
            <h1 style="color: white; margin: 0;">🏠 New Property Listed!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p>Hello ${data.partnerName},</p>
            <p>Great news! A new property has been added that you might be interested in.</p>

            <div style="background: white; border-radius: 10px; padding: 20px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h2 style="margin-top: 0; color: ${primaryColor};">${data.propertyName}</h2>
              <p><strong>Price:</strong> <span style="color: #10b981;">${data.propertyPrice || 'Contact for Price'}</span></p>
              <p><strong>Commission:</strong> ${data.commission || 'Standard rates apply'}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/partner/properties/${data.propertyId}"
                 style="background: ${buttonColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Property Details
              </a>
            </div>
          </div>
          <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            ${footerText ? `<p>${footerText}</p>` : ''}
            <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
          </div>
        </body>
        </html>
      `
    },

    // Partnership approved notification
    partnershipApproved: {
      subject: `Your Partnership has been Approved! - ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Partnership Approved</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            ${showLogo ? `<img src="${logoUrl}" alt="${companyName}" style="max-width: 150px; height: auto; margin-bottom: 10px;" />` : ''}
            <h1 style="color: white; margin: 0;">🎉 Congratulations!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p>Hello ${data.partnerName},</p>
            <p>Great news! Your partnership application with <strong>${data.companyName}</strong> has been approved!</p>

            <div style="background: white; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="color: #6b7280; margin: 0;">Your Tier</p>
              <p style="font-size: 24px; font-weight: bold; color: ${data.tier === 'platinum' ? '#9333ea' : data.tier === 'gold' ? '#eab308' : data.tier === 'silver' ? '#6b7280' : '#f97316'}; margin: 10px 0; text-transform: capitalize;">${data.tier || 'Bronze'}</p>
              <p style="color: #10b981; font-weight: bold;">${data.commissionRate || 'Standard'} Commission Rate</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/partner/properties"
                 style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Browse Properties
              </a>
            </div>
          </div>
          <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            ${footerText ? `<p>${footerText}</p>` : ''}
            <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
          </div>
        </body>
        </html>
      `
    },

    // Visit scheduled notification
    visitScheduled: {
      subject: `New Visit Scheduled - ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Visit Scheduled</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            ${showLogo ? `<img src="${logoUrl}" alt="${companyName}" style="max-width: 150px; height: auto; margin-bottom: 10px;" />` : ''}
            <h1 style="color: white; margin: 0;">📅 New Visit Scheduled</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p>Hello ${data.recipientName},</p>
            <p>A new visit has been scheduled. Here are the details:</p>

            <div style="background: white; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: ${primaryColor};">${data.propertyName}</h3>
              <p><strong>Date:</strong> ${data.visitDate}</p>
              <p><strong>Time:</strong> ${data.visitTime}</p>
              <p><strong>Type:</strong> ${data.visitType}</p>
              <p><strong>Client:</strong> ${data.clientName}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}${data.viewLink}"
                 style="background: ${buttonColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Details
              </a>
            </div>
          </div>
          <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            ${footerText ? `<p>${footerText}</p>` : ''}
            <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
          </div>
        </body>
        </html>
      `
    }
  };

  return templates[type] || { subject: 'Notification', html: '<p>No content</p>' };
};

/**
 * Send an email
 */
export const sendEmail = async (options) => {
  const { to, subject, type, data, companyId, userId } = options;

  if (!to) {
    console.error('Email error: No recipient specified');
    return { success: false, error: 'No recipient specified' };
  }

  // Fetch company branding if companyId provided
  let companyBranding = {};
  if (companyId) {
    try {
      const company = await Company.findById(companyId).select('name logo emailBranding');
      if (company) {
        companyBranding = {
          primaryColor: company.emailBranding?.primaryColor || '#4F46E5',
          secondaryColor: company.emailBranding?.secondaryColor || '#764BA2',
          buttonColor: company.emailBranding?.buttonColor || company.emailBranding?.primaryColor || '#4F46E5',
          headerBackgroundColor: company.emailBranding?.headerBackgroundColor || company.emailBranding?.primaryColor || '#4F46E5',
          footerText: company.emailBranding?.footerText || '',
          showLogoInEmails: company.emailBranding?.showLogoInEmails !== false,
          logoUrl: company.logo?.url || ''
        };
        // Use company name if not provided in data
        if (!data.companyName) {
          data.companyName = company.name;
        }
      }
    } catch (err) {
      console.error('Error fetching company branding:', err.message);
    }
  }

  // Get template with branding
  const template = getEmailTemplate(type, data, companyBranding);

  // Create email log entry
  const emailLogData = {
    companyId: companyId || null,
    recipient: {
      email: to,
      userId: userId || null,
      name: data.userName || data.recipientName || null
    },
    type: type || 'other',
    status: 'pending'
  };

  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Channel Partner Portal'}" <${process.env.EMAIL_FROM || 'noreply@example.com'}>`,
      to,
      subject: subject || template.subject,
      html: template.html
    };

    console.log("📤 Sending email to:", to);

    const result = await getTransporter().sendMail(mailOptions);

    // Update email log with success
    emailLogData.status = 'sent';
    emailLogData.providerId = result.messageId;
    emailLogData.sentAt = new Date();
    emailLogData.subject = mailOptions.subject;
    emailLogData.content = { html: template.html };

    // Save log asynchronously (don't wait for it)
    EmailLog.create(emailLogData).catch(err => {
      console.error('Failed to save email log:', err.message);
    });

    console.log(`✅ Email sent successfully to ${to} (${type})`);
    return { success: true, messageId: result.messageId };

  } catch (error) {
    console.error('❌ Email sending failed:', error.message);

    // Update email log with failure
    emailLogData.status = 'failed';
    emailLogData.errorMessage = error.message;
    emailLogData.subject = subject || type;

    // Save log asynchronously
    EmailLog.create(emailLogData).catch(err => {
      console.error('Failed to save email log:', err.message);
    });

    return { success: false, error: error.message };
  }
};

/**
 * Send email verification
 */
export const sendVerificationEmail = async (user, token) => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  return sendEmail({
    to: user.email,
    type: 'verifyEmail',
    companyId: user.companyId?._id || user.companyId || null,
    userId: user._id,
    data: {
      userName: user.firstName,
      token,
      companyName: user.companyId?.name || 'Channel Partner Portal'
    }
  });
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (user, token) => {
  return sendEmail({
    to: user.email,
    type: 'resetPassword',
    companyId: user.companyId?._id || user.companyId || null,
    userId: user._id,
    data: {
      userName: user.firstName,
      token
    }
  });
};

/**
 * Send new property notification to partners
 */
export const sendNewPropertyEmail = async (partners, property, company) => {
  const results = [];

  for (const partner of partners) {
    const result = await sendEmail({
      to: partner.email,
      type: 'newPropertyPartner',
      companyId: company?._id || null,
      userId: partner._id,
      data: {
        partnerName: partner.firstName,
        propertyName: property.name,
        propertyType: property.type,
        propertyLocation: property.location?.city,
        propertyPrice: property.pricing?.basePrice
          ? `${property.pricing.currency === 'INR' ? '₹' : 'AED '}${(property.pricing.basePrice / 100000).toFixed(1)} Lac`
          : 'Contact for Price',
        commission: property.commission?.basePercentage
          ? `${property.commission.basePercentage}% base commission`
          : 'Standard rates apply',
        propertyDescription: property.description,
        propertyId: property._id,
        companyName: company?.name || 'Channel Partner Portal'
      }
    });

    results.push({ partner: partner.email, ...result });
  }

  return results;
};

/**
 * Send partnership approval email
 */
export const sendPartnershipApprovedEmail = async (partner, company, tier, commissionRate) => {
  const tierRates = {
    bronze: '30%',
    silver: '35%',
    gold: '50%',
    platinum: '75%'
  };

  return sendEmail({
    to: partner.email,
    type: 'partnershipApproved',
    companyId: company?._id || null,
    userId: partner._id,
    data: {
      partnerName: partner.firstName,
      companyName: company?.name,
      tier,
      commissionRate: commissionRate || tierRates[tier]
    }
  });
};

export default {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendNewPropertyEmail,
  sendPartnershipApprovedEmail
};