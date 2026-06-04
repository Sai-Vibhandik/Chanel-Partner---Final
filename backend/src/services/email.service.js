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
  const footerText = companyBranding.footerText || '';
  const showLogo = companyBranding.showLogo || false;
  const logoUrl = companyBranding.logoUrl || '';

  // Footer HTML: use custom footer if provided, otherwise use default copyright
  const footerHtml = footerText
    ? `<p>${footerText}</p>`
    : `<p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>`;

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
            ${footerHtml}
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
            ${footerHtml}
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
            <h1 style="color: white; margin: 0;">🏠 New Property Listed!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p>Hello ${data.partnerName},</p>
            <p>Great news! A new property has been added that you might be interested in.</p>

            <div style="background: white; border-radius: 10px; padding: 20px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h2 style="margin-top: 0; color: ${primaryColor};">${data.propertyName}</h2>
              <p><strong>Price:</strong> <span style="color: #10b981;">${data.propertyPrice || 'Contact for Price'}</span></p>
              <p><strong>Commission:</strong> ${data.commission || 'Commission based on partner tier'}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/partner/properties/${data.propertyId}"
                 style="background: ${buttonColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Property Details
              </a>
            </div>
          </div>
          <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            ${footerHtml}
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
              <p style="color: #10b981; font-weight: bold;">Commission Rate: ${data.commissionRate || '30%'}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/partner/properties"
                 style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Browse Properties
              </a>
            </div>
          </div>
          <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            ${footerHtml}
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
            <h1 style="color: white; margin: 0;">New Visit Scheduled</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p>Hello ${data.adminName},</p>
            <p>A new visit has been scheduled. Here are the details:</p>

            <div style="background: white; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: ${primaryColor};">${data.propertyName}</h3>
              <p><strong>Location:</strong> ${data.propertyLocation}</p>
              <p><strong>Date:</strong> ${data.visitDate}</p>
              <p><strong>Time:</strong> ${data.visitTime}</p>
              <p><strong>Type:</strong> ${data.visitType}</p>
              <p><strong>Client:</strong> ${data.clientName}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.loginUrl}"
                 style="background: ${buttonColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Details
              </a>
            </div>
          </div>
          <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            ${footerHtml}
          </div>
        </body>
        </html>
      `
    },

    // Visit approved notification
    visitApproved: {
      subject: `Your Visit has been Approved - ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Visit Approved</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            ${showLogo ? `<img src="${logoUrl}" alt="${companyName}" style="max-width: 150px; height: auto; margin-bottom: 10px;" />` : ''}
            <h1 style="color: white; margin: 0;">✅ Visit Approved</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p>Hello ${data.partnerName},</p>
            <p>Great news! Your visit request has been <strong style="color: #10b981;">approved</strong>.</p>

            <div style="background: white; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: ${primaryColor};">${data.propertyName}</h3>
              <p><strong>Location:</strong> ${data.propertyLocation}</p>
              <p><strong>Date:</strong> ${data.visitDate}</p>
              <p><strong>Time:</strong> ${data.visitTime}</p>
              <p><strong>Visit Type:</strong> ${data.visitType === 'virtual' ? 'Virtual Meeting' : 'Office Visit'}</p>
              ${data.officeName ? `<p><strong>Office Location:</strong> ${data.officeName}</p>` : ''}
              ${data.officeAddress ? `<p><strong>Address:</strong> ${data.officeAddress}</p>` : ''}
              ${data.clientName ? `<p><strong>Client:</strong> ${data.clientName}</p>` : ''}
              ${data.adminNotes ? `<p><strong>Notes:</strong> ${data.adminNotes}</p>` : ''}
            </div>

            ${data.visitType === 'office' && data.googleMapsUrl ? `
            <div style="text-align: center; margin: 20px 0;">
              <a href="${data.googleMapsUrl}" target="_blank"
                 style="background: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                📍 Get Directions
              </a>
            </div>
            ` : ''}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/partner/visits"
                 style="background: ${buttonColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View My Visits
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px;">
              Please arrive 10 minutes early for your appointment. If you need to reschedule or cancel, please do so at least 24 hours in advance.
            </p>
          </div>
          <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            ${footerHtml}
          </div>
        </body>
        </html>
      `
    },

    // Visit rejected notification
    visitRejected: {
      subject: `Your Visit Request was not Approved - ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Visit Request Update</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            ${showLogo ? `<img src="${logoUrl}" alt="${companyName}" style="max-width: 150px; height: auto; margin-bottom: 10px;" />` : ''}
            <h1 style="color: white; margin: 0;">Visit Request Update</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p>Hello ${data.partnerName},</p>
            <p>We regret to inform you that your visit request could not be <strong style="color: #ef4444;">approved</strong> at this time.</p>

            <div style="background: white; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: ${primaryColor};">${data.propertyName}</h3>
              <p><strong>Location:</strong> ${data.propertyLocation}</p>
              <p><strong>Requested Date:</strong> ${data.visitDate}</p>
              <p><strong>Requested Time:</strong> ${data.visitTime}</p>
            </div>

            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0;"><strong>Reason:</strong> ${data.rejectionReason || 'Unfortunately, we could not accommodate your visit request at this time.'}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/partner/properties"
                 style="background: ${buttonColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Browse Other Properties
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px;">
              You can try booking a visit for a different date or explore other properties. If you have questions, please contact our support team.
            </p>
          </div>
          <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            ${footerHtml}
          </div>
        </body>
        </html>
      `
    },

    // Visit cancelled due to property status change (off_market/sold_out)
    visitCancelledPropertyStatus: {
      subject: `Visit Cancelled - Property No Longer Available - ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Visit Cancelled</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            ${showLogo ? `<img src="${logoUrl}" alt="${companyName}" style="max-width: 150px; height: auto; margin-bottom: 10px;" />` : ''}
            <h1 style="color: white; margin: 0;">⚠️ Visit Cancelled</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p>Hello ${data.partnerName},</p>
            <p>We regret to inform you that your scheduled visit has been <strong style="color: #f97316;">automatically cancelled</strong> due to a change in property availability.</p>

            <div style="background: white; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: ${primaryColor};">${data.propertyName}</h3>
              <p><strong>Location:</strong> ${data.propertyLocation}</p>
              <p><strong>Visit Date:</strong> ${data.visitDate}</p>
              <p><strong>Visit Time:</strong> ${data.visitTime}</p>
              <p><strong>Visit Type:</strong> ${data.visitType === 'office' ? 'Office Visit' : 'Virtual Meeting'}</p>
            </div>

            <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0;"><strong>Reason:</strong> ${data.cancellationReason || 'The property is no longer available for visits.'}</p>
            </div>

            <p>We apologize for any inconvenience this may cause. If you have any questions, please contact our support team.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/partner/properties"
                 style="background: ${buttonColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Browse Other Properties
              </a>
            </div>
          </div>
          <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            ${footerHtml}
          </div>
        </body>
        </html>
      `
    },

    // Team invitation email
    teamInvite: {
      subject: `You've been invited to join ${companyName} - Your Account Credentials`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Team Invitation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">👋 Welcome to the Team!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p>Hello ${data.userName},</p>
            <p><strong>${data.inviterName}</strong> has invited you to join <strong>${companyName}</strong> as a <strong>${data.roleName}</strong>.</p>

            <div style="background: white; border-radius: 10px; padding: 25px; margin: 20px 0; border: 2px solid ${primaryColor};">
              <h3 style="margin-top: 0; color: ${primaryColor}; text-align: center;">Your Login Credentials</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Role:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>${data.roleName}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Email:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${data.email}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; font-weight: bold; color: #6b7280;">Password:</td>
                  <td style="padding: 10px;">
                    <code style="background: #f3f4f6; padding: 5px 10px; border-radius: 4px; font-size: 14px; word-break: break-all;">${data.temporaryPassword}</code>
                  </td>
                </tr>
              </table>
            </div>

            <p style="text-align: center; margin: 20px 0;">
              <a href="${baseUrl}/login"
                 style="background: ${buttonColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Login Now
              </a>
            </p>

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0; font-size: 14px;"><strong>⚠️ Security Recommendation:</strong> Please change your password after your first login for account security.</p>
            </div>

            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0; font-size: 14px;"><strong>Login URL:</strong> <a href="${baseUrl}/login" style="color: ${primaryColor};">${baseUrl}/login</a></p>
            </div>

            <p style="color: #6b7280; font-size: 14px;">
              If you didn't expect this invitation, please contact your administrator or safely ignore this email.
            </p>
          </div>
          <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            ${footerHtml}
          </div>
        </body>
        </html>
      `
    },

    // Commission created notification
    commission_created: {
      subject: `New Commission Created - ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Commission Created</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">💰 New Commission Created</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p>Hello ${data.partnerName},</p>
            <p>Great news! A new commission has been created for your property transaction.</p>

            <div style="background: white; border-radius: 10px; padding: 20px; margin: 20px 0; border: 2px solid ${primaryColor};">
              <h3 style="margin-top: 0; color: ${primaryColor};">${data.propertyName}</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Commission Amount:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 18px; color: #10b981; font-weight: bold;">${data.commissionAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Details:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${data.commissionDetails}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Sale Price:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${data.salePrice}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; font-weight: bold; color: #6b7280;">Buyer:</td>
                  <td style="padding: 10px;">${data.buyerName}</td>
                </tr>
              </table>
            </div>

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0;"><strong>Status:</strong> ${data.status}</p>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">Your commission will be processed after approval.</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.loginUrl}"
                 style="background: ${buttonColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Commission Details
              </a>
            </div>
          </div>
          <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            ${footerHtml}
          </div>
        </body>
        </html>
      `
    },

    // Commission approved notification
    commission_approved: {
      subject: `Commission Approved - ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Commission Approved</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            ${showLogo ? `<img src="${logoUrl}" alt="${companyName}" style="max-width: 150px; height: auto; margin-bottom: 10px;" />` : ''}
            <h1 style="color: white; margin: 0;">✅ Commission Approved</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p>Hello ${data.partnerName},</p>
            <p>Great news! Your commission has been approved and is now being processed for payment.</p>

            <div style="background: white; border-radius: 10px; padding: 20px; margin: 20px 0; border: 2px solid #10b981;">
              <h3 style="margin-top: 0; color: #10b981;">${data.propertyName}</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Approved Amount:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 24px; color: #10b981; font-weight: bold;">${data.commissionAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; font-weight: bold; color: #6b7280;">Approved Date:</td>
                  <td style="padding: 10px;">${data.approvedDate}</td>
                </tr>
              </table>
              ${data.overrideInfo || ''}
            </div>

            <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0;"><strong>Status:</strong> ${data.status}</p>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">Your payment will be processed according to your company's payment schedule.</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.loginUrl}"
                 style="background: ${buttonColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Commission Details
              </a>
            </div>
          </div>
          <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            ${footerHtml}
          </div>
        </body>
        </html>
      `
    },

    // Commission paid notification
    commission_paid: {
      subject: `Commission Paid - ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Commission Paid</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            ${showLogo ? `<img src="${logoUrl}" alt="${companyName}" style="max-width: 150px; height: auto; margin-bottom: 10px;" />` : ''}
            <h1 style="color: white; margin: 0;">🎉 Commission Paid!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p>Hello ${data.partnerName},</p>
            <p>Excellent news! Your commission has been paid successfully.</p>

            <div style="background: white; border-radius: 10px; padding: 20px; margin: 20px 0; border: 2px solid #10b981;">
              <h3 style="margin-top: 0; color: #10b981;">${data.propertyName}</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Amount Paid:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 24px; color: #10b981; font-weight: bold;">${data.commissionAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Payment Method:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${data.paymentMethod}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Reference:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><code style="background: #f3f4f6; padding: 5px 10px; border-radius: 4px;">${data.paymentReference}</code></td>
                </tr>
                <tr>
                  <td style="padding: 10px; font-weight: bold; color: #6b7280;">Paid Date:</td>
                  <td style="padding: 10px;">${data.paidDate}</td>
                </tr>
              </table>
            </div>

            <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0;">The payment has been processed to your registered account. If you have any questions about this payment, please contact your company administrator.</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.loginUrl}"
                 style="background: ${buttonColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Commission History
              </a>
            </div>
          </div>
          <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            ${footerHtml}
          </div>
        </body>
        </html>
      `
    },

    // Commission cancelled notification
    commission_cancelled: {
      subject: `Commission Cancelled - ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Commission Cancelled</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            ${showLogo ? `<img src="${logoUrl}" alt="${companyName}" style="max-width: 150px; height: auto; margin-bottom: 10px;" />` : ''}
            <h1 style="color: white; margin: 0;">❌ Commission Cancelled</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p>Hello ${data.partnerName},</p>
            <p>Unfortunately, your commission has been cancelled.</p>

            <div style="background: white; border-radius: 10px; padding: 20px; margin: 20px 0; border: 2px solid #ef4444;">
              <h3 style="margin-top: 0; color: #ef4444;">${data.propertyName}</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Commission Amount:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 20px; color: #ef4444; font-weight: bold;">${data.commissionAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; font-weight: bold; color: #6b7280;">Reason:</td>
                  <td style="padding: 10px;">${data.reason}</td>
                </tr>
              </table>
            </div>

            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0;">If you believe this was an error or have questions, please contact your company administrator.</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.loginUrl}"
                 style="background: ${buttonColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Commission History
              </a>
            </div>
          </div>
          <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            ${footerHtml}
          </div>
        </body>
        </html>
      `
    },

    // Partner visit cancelled notification (to company admin)
    partnerVisitCancelled: {
      subject: `Visit Cancelled by Partner - ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Visit Cancelled</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            ${showLogo ? `<img src="${logoUrl}" alt="${companyName}" style="max-width: 150px; height: auto; margin-bottom: 10px;" />` : ''}
            <h1 style="color: white; margin: 0;">❌ Visit Cancelled</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p>Hello ${data.adminName},</p>
            <p>A partner has cancelled their scheduled visit.</p>

            <div style="background: white; border-radius: 10px; padding: 20px; margin: 20px 0; border: 2px solid #ef4444;">
              <h3 style="margin-top: 0; color: #ef4444;">${data.propertyName}</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Partner:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${data.partnerName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Location:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${data.propertyLocation}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Visit Date:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${data.visitDate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Visit Time:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${data.visitTime}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Visit Type:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${data.visitType === 'office' ? 'Office Visit' : 'Virtual Meeting'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Client Name:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${data.clientName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; font-weight: bold; color: #6b7280;">Client Phone:</td>
                  <td style="padding: 10px;">${data.clientPhone}</td>
                </tr>
              </table>
            </div>

            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0; font-weight: bold; color: #991b1b;">Cancellation Reason:</p>
              <p style="margin: 5px 0 0 0;">${data.cancellationReason}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.loginUrl}"
                 style="background: ${buttonColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View All Visits
              </a>
            </div>
          </div>
          <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            ${footerHtml}
          </div>
        </body>
        </html>
      `
    },

    // Subscription expiry reminder
    subscriptionExpiryReminder: {
      subject: `${data.daysRemaining === 1 ? '⚠️ Your Subscription Expires Tomorrow!' : '🔔 Your Subscription Expires in 7 Days'} - ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Subscription Expiry Reminder</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, ${data.daysRemaining === 1 ? '#ef4444' : '#f59e0b'} 0%, ${data.daysRemaining === 1 ? '#dc2626' : '#d97706'} 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            ${showLogo ? `<img src="${logoUrl}" alt="${companyName}" style="max-width: 150px; height: auto; margin-bottom: 10px;" />` : ''}
            <h1 style="color: white; margin: 0;">${data.daysRemaining === 1 ? '⏰ Final Reminder!' : '📅 Subscription Reminder'}</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p>Hello ${data.adminName},</p>
            <p>This is a friendly reminder that your <strong>${data.planName}</strong> subscription will expire ${data.daysRemaining === 1 ? '<strong style="color: #ef4444;">tomorrow</strong>' : 'in <strong style="color: #f59e0b;">7 days</strong>'}.</p>

            <div style="background: white; border-radius: 10px; padding: 20px; margin: 20px 0; border: 2px solid ${data.daysRemaining === 1 ? '#ef4444' : '#f59e0b'};">
              <h3 style="margin-top: 0; color: ${data.daysRemaining === 1 ? '#ef4444' : '#f59e0b'};">Subscription Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Plan:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${data.planName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; font-weight: bold; color: #6b7280;">Expiry Date:</td>
                  <td style="padding: 10px;">${data.expiryDate}</td>
                </tr>
              </table>
            </div>

            ${data.daysRemaining === 1 ? `
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0; font-weight: bold; color: #991b1b;">⚠️ Action Required Today!</p>
              <p style="margin: 5px 0 0 0;">Your subscription will expire tomorrow. Renew now to ensure uninterrupted access to all features.</p>
            </div>
            ` : `
            <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0; font-weight: bold; color: #92400e;">📅 Don't Wait Until the Last Minute</p>
              <p style="margin: 5px 0 0 0;">Renew your subscription early to avoid any service interruptions.</p>
            </div>
            `}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.loginUrl}"
                 style="background: ${buttonColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Manage Subscription
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px;">
              If you have any questions about your subscription, please contact our support team.
            </p>
          </div>
          <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            ${footerHtml}
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
  let resolvedCompanyId = companyId;

  if (companyId) {
    try {
      const company = await Company.findById(companyId).select('name emailBranding');
      if (company) {
        companyBranding = {
          primaryColor: company.emailBranding?.primaryColor || '#4F46E5',
          secondaryColor: company.emailBranding?.secondaryColor || '#764BA2',
          buttonColor: company.emailBranding?.buttonColor || company.emailBranding?.primaryColor || '#4F46E5',
          headerBackgroundColor: company.emailBranding?.headerBackgroundColor || company.emailBranding?.primaryColor || '#4F46E5',
          footerText: company.emailBranding?.footerText || ''
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

  // Create email log entry - only if companyId is provided
  const emailLogData = {
    companyId: resolvedCompanyId,
    recipient: {
      email: to,
      userId: userId || null,
      name: data.userName || data.recipientName || null
    },
    type: type || 'other',
    subject: subject || template.subject,
    status: 'pending'
  };

  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Channel Partner Portal'}" <${process.env.EMAIL_FROM || 'noreply@example.com'}>`,
      to,
      subject: subject || template.subject,
      html: template.html
    };

    console.log("📤 Sending email to:", to, "Type:", type);

    const result = await getTransporter().sendMail(mailOptions);

    // Update email log with success
    emailLogData.status = 'sent';
    emailLogData.providerId = result.messageId;
    emailLogData.sentAt = new Date();
    emailLogData.content = { html: template.html };

    // Save log asynchronously (only if companyId exists)
    if (resolvedCompanyId) {
      EmailLog.create(emailLogData).catch(err => {
        console.error('Failed to save email log:', err.message);
      });
    }

    console.log(`✅ Email sent successfully to ${to} (${type})`);
    return { success: true, messageId: result.messageId };

  } catch (error) {
    console.error('❌ Email sending failed:', error.message);

    // Update email log with failure
    emailLogData.status = 'failed';
    emailLogData.errorMessage = error.message;

    // Save log asynchronously (only if companyId exists)
    if (resolvedCompanyId) {
      EmailLog.create(emailLogData).catch(err => {
        console.error('Failed to save email log:', err.message);
      });
    }

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
      userName: user.firstName || user.name || 'User',
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
      userName: user.firstName || user.name || 'User',
      token
    }
  });
};

/**
 * Send new property notification to partners
 */
export const sendNewPropertyEmail = async (partners, property, company) => {
  const results = [];

  // Format commission info for display
  let commissionDisplay;
  if (property.commission?.isFixed && property.commission?.fixedAmount) {
    // Fixed commission amount
    const currency = property.pricing?.currency === 'AED' ? 'AED ' : '₹';
    commissionDisplay = `Fixed commission: ${currency}${property.commission.fixedAmount.toLocaleString()}`;
  } else if (property.commission?.basePercentage) {
    // Percentage-based commission
    commissionDisplay = `${property.commission.basePercentage}% base commission`;
  } else {
    // No commission set - will use tier-based rates
    commissionDisplay = 'Commission based on partner tier';
  }

  for (const partner of partners) {
    const result = await sendEmail({
      to: partner.email,
      type: 'newPropertyPartner',
      companyId: company?._id || null,
      userId: partner._id,
      data: {
        partnerName: partner.firstName || 'Partner',
        propertyName: property.name,
        propertyType: property.type,
        propertyLocation: property.location?.city,
        propertyPrice: property.pricing?.basePrice
          ? `${property.pricing.currency === 'INR' ? '₹' : 'AED '}${(property.pricing.basePrice / 100000).toFixed(1)} Lac`
          : 'Contact for Price',
        commission: commissionDisplay,
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
    silver: '40%',
    gold: '50%',
    platinum: '60%'
  };

  // Ensure tier has a valid value
  const validTier = tier || 'bronze';
  // Always calculate commission rate based on tier if not provided
  const effectiveCommissionRate = commissionRate || tierRates[validTier] || '30%';

  return sendEmail({
    to: partner.email,
    type: 'partnershipApproved',
    companyId: company?._id || null,
    userId: partner._id,
    data: {
      partnerName: partner.firstName || 'Partner',
      companyName: company?.name,
      tier: validTier,
      commissionRate: effectiveCommissionRate
    }
  });
};

/**
 * Send visit approved email to partner
 */
export const sendVisitApprovedEmail = async (visit, partner, property, company, officeLocation = null) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return sendEmail({
    to: partner.email,
    type: 'visitApproved',
    companyId: company?._id || null,
    userId: partner._id,
    data: {
      partnerName: partner.firstName || 'Partner',
      propertyName: property.name,
      propertyLocation: property.location?.city || property.location?.emirate || property.location?.address || 'N/A',
      visitDate: formatDate(visit.scheduledDate),
      visitTime: formatTime(visit.scheduledTime),
      visitType: visit.visitType || 'office',
      officeName: officeLocation?.name || null,
      officeAddress: officeLocation?.address || null,
      googleMapsUrl: officeLocation?.googleMapsUrl || null,
      clientName: visit.clientDetails?.name || null,
      adminNotes: visit.adminNotes || null,
      companyName: company?.name || 'Channel Partner Portal'
    }
  });
};

/**
 * Send visit rejected email to partner
 */
export const sendVisitRejectedEmail = async (visit, partner, property, company, rejectionReason) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return sendEmail({
    to: partner.email,
    type: 'visitRejected',
    companyId: company?._id || null,
    userId: partner._id,
    data: {
      partnerName: partner.firstName || 'Partner',
      propertyName: property.name,
      propertyLocation: property.location?.city || property.location?.emirate || property.location?.address || 'N/A',
      visitDate: formatDate(visit.scheduledDate),
      visitTime: formatTime(visit.scheduledTime),
      rejectionReason: rejectionReason || 'Unfortunately, we could not accommodate your visit request at this time.',
      companyName: company?.name || 'Channel Partner Portal'
    }
  });
};

/**
 * Send team invitation email
 */
export const sendTeamInviteEmail = async (user, temporaryPassword, company, inviter = null) => {
  // Role display names
  const roleNames = {
    company_superadmin: 'Company Admin',
    partner_manager: 'Partner Manager',
    property_manager: 'Property Manager',
    finance_manager: 'Finance Manager',
    viewer: 'Viewer'
  };

  console.log('📧 Sending team invite email to:', user.email);
  console.log('   Company:', company?.name || 'Unknown');
  console.log('   Role:', roleNames[user.role] || user.role);
  console.log('   CompanyId:', company?._id || 'null');

  const result = await sendEmail({
    to: user.email,
    type: 'teamInvite',
    companyId: company?._id || null,
    userId: user._id,
    data: {
      userName: user.firstName || user.name || 'User',
      email: user.email,
      temporaryPassword,
      roleName: roleNames[user.role] || user.role,
      inviterName: inviter ? `${inviter.firstName || ''} ${inviter.lastName || ''}`.trim() || 'The team' : 'The team',
      companyName: company?.name || 'Channel Partner Portal'
    }
  });

  console.log('📧 Team invite email result:', result.success ? 'Success' : 'Failed', result.messageId || result.error);
  return result;
};

/**
 * Send visit cancelled email to partner (due to property status change)
 */
export const sendVisitCancelledEmail = async (visit, partner, property, company, cancellationReason) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return sendEmail({
    to: partner.email,
    type: 'visitCancelledPropertyStatus',
    companyId: company?._id || null,
    userId: partner._id,
    data: {
      partnerName: partner.firstName || 'Partner',
      propertyName: property.name,
      propertyLocation: property.location?.city || property.location?.emirate || property.location?.address || 'N/A',
      visitDate: formatDate(visit.scheduledDate),
      visitTime: formatTime(visit.scheduledTime),
      visitType: visit.visitType || 'office',
      cancellationReason: cancellationReason || 'The property is no longer available for visits.',
      companyName: company?.name || 'Channel Partner Portal'
    }
  });
};

/**
 * Send visit cancellation notification to company admin (when partner cancels)
 */
export const sendPartnerVisitCancelledEmail = async (adminUser, visit, partner, property, company, cancellationReason) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const partnerName = `${partner.firstName || ''} ${partner.lastName || ''}`.trim() || 'Partner';

  return sendEmail({
    to: adminUser.email,
    type: 'partnerVisitCancelled',
    companyId: company?._id || null,
    userId: adminUser._id,
    data: {
      adminName: adminUser.firstName || adminUser.name || 'Admin',
      partnerName: partnerName,
      propertyName: property.name,
      propertyLocation: property.location?.city || property.location?.emirate || property.location?.address || 'N/A',
      visitDate: formatDate(visit.scheduledDate),
      visitTime: formatTime(visit.scheduledTime),
      visitType: visit.visitType || 'office',
      cancellationReason: cancellationReason || 'No reason provided',
      clientName: visit.clientDetails?.name || 'N/A',
      clientPhone: visit.clientDetails?.phone || 'N/A',
      companyName: company?.name || 'Channel Partner Portal',
      loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/operations/visits`
    }
  });
};

/**
 * Send commission created email to partner
 */
export const sendCommissionCreatedEmail = async (partner, commission, property, company) => {
  const currency = commission.commission?.currency || 'INR';
  const currencySymbol = currency === 'INR' ? '₹' : 'AED ';
  const amount = commission.commission?.calculatedAmount || 0;
  const formattedAmount = `${currencySymbol}${amount.toLocaleString()}`;

  const commissionDetails = commission.commission?.isFixed
    ? `Fixed Amount: ${formattedAmount}`
    : `${commission.commission?.effectivePercentage || 0}% of sale price`;

  return sendEmail({
    to: partner.email,
    type: 'commission_created',
    companyId: company?._id || null,
    userId: partner._id,
    data: {
      partnerName: partner.firstName || 'Partner',
      propertyName: property.name,
      commissionAmount: formattedAmount,
      commissionDetails: commissionDetails,
      salePrice: commission.saleDetails?.salePrice
        ? `${currencySymbol}${commission.saleDetails.salePrice.toLocaleString()}`
        : 'N/A',
      buyerName: commission.saleDetails?.buyerName || 'N/A',
      status: 'Pending Approval',
      companyName: company?.name || 'Channel Partner Portal',
      loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/partner/commissions`
    }
  });
};

/**
 * Send commission approved email to partner
 */
export const sendCommissionApprovedEmail = async (partner, commission, property, company) => {
  const currency = commission.commission?.currency || 'INR';
  const currencySymbol = currency === 'INR' ? '₹' : 'AED ';
  const amount = commission.commission?.calculatedAmount || 0;
  const formattedAmount = `${currencySymbol}${amount.toLocaleString()}`;

  // Check if amount was overridden
  let overrideInfo = '';
  if (commission.approval?.override?.isOverridden) {
    const originalAmount = commission.approval.override.originalAmount?.toLocaleString() || 'N/A';
    const reason = commission.approval.override.reason || '';
    overrideInfo = `
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; border-radius: 5px;">
        <p style="margin: 0; color: #92400e; font-weight: bold;">⚠️ Commission Adjusted</p>
        <p style="margin: 5px 0 0 0; color: #78350f;">
          Original Amount: <del>${currencySymbol}${originalAmount}</del><br>
          Adjusted Amount: <strong>${formattedAmount}</strong>
        </p>
        ${reason ? `<p style="margin: 10px 0 0 0; color: #78350f;"><strong>Reason:</strong> ${reason}</p>` : ''}
      </div>
    `;
  }

  return sendEmail({
    to: partner.email,
    type: 'commission_approved',
    companyId: company?._id || null,
    userId: partner._id,
    data: {
      partnerName: partner.firstName || 'Partner',
      propertyName: property.name,
      commissionAmount: formattedAmount,
      overrideInfo: overrideInfo,
      approvedDate: new Date(commission.approval?.approvedAt || Date.now()).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      status: 'Approved - Pending Payment',
      companyName: company?.name || 'Channel Partner Portal',
      loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/partner/commissions`
    }
  });
};

/**
 * Send commission paid email to partner
 */
export const sendCommissionPaidEmail = async (partner, commission, property, company) => {
  const currency = commission.commission?.currency || 'INR';
  const currencySymbol = currency === 'INR' ? '₹' : 'AED ';
  const amount = commission.commission?.calculatedAmount || 0;
  const formattedAmount = `${currencySymbol}${amount.toLocaleString()}`;

  const paymentMethod = commission.payout?.paymentMethod === 'cash'
    ? 'Cash'
    : commission.payout?.paymentMethod === 'bank_transfer'
    ? 'Bank Transfer'
    : commission.payout?.paymentMethod || 'Bank Transfer';

  const paymentRef = commission.payout?.paymentReference || 'N/A';

  return sendEmail({
    to: partner.email,
    type: 'commission_paid',
    companyId: company?._id || null,
    userId: partner._id,
    data: {
      partnerName: partner.firstName || 'Partner',
      propertyName: property.name,
      commissionAmount: formattedAmount,
      paymentMethod: paymentMethod,
      paymentReference: paymentRef,
      paidDate: new Date(commission.payout?.paidAt || Date.now()).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      companyName: company?.name || 'Channel Partner Portal',
      loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/partner/commissions`
    }
  });
};

/**
 * Send commission cancelled email to partner
 */
export const sendCommissionCancelledEmail = async (partner, commission, property, company, reason) => {
  const currency = commission.commission?.currency || 'INR';
  const currencySymbol = currency === 'INR' ? '₹' : 'AED ';
  const amount = commission.commission?.calculatedAmount || 0;
  const formattedAmount = `${currencySymbol}${amount.toLocaleString()}`;

  return sendEmail({
    to: partner.email,
    type: 'commission_cancelled',
    companyId: company?._id || null,
    userId: partner._id,
    data: {
      partnerName: partner.firstName || 'Partner',
      propertyName: property.name,
      commissionAmount: formattedAmount,
      reason: reason || 'No reason provided',
      companyName: company?.name || 'Channel Partner Portal',
      loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/partner/commissions`
    }
  });
};

/**
 * Send visit scheduled notification email to company admins/partner managers
 * when a partner books a visit
 */
export const sendVisitScheduledEmail = async (adminUser, visit, partner, property, company, officeLocation = null) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return sendEmail({
    to: adminUser.email,
    type: 'visitScheduled',
    companyId: company?._id || null,
    userId: adminUser._id,
    data: {
      adminName: adminUser.firstName || adminUser.name || 'Admin',
      partnerName: `${partner.firstName || ''} ${partner.lastName || ''}`.trim() || 'Partner',
      partnerEmail: partner.email,
      partnerPhone: partner.phone || 'N/A',
      propertyName: property.name,
      propertyLocation: property.location?.city || property.location?.emirate || property.location?.address || 'N/A',
      visitDate: formatDate(visit.scheduledDate),
      visitTime: formatTime(visit.scheduledTime),
      visitType: visit.visitType === 'site' ? 'Site Visit' : 'Office Visit',
      officeName: officeLocation?.name || null,
      officeAddress: officeLocation?.address || null,
      clientName: visit.clientDetails?.name || 'N/A',
      clientPhone: visit.clientDetails?.phone || 'N/A',
      clientEmail: visit.clientDetails?.email || 'N/A',
      partnerNotes: visit.partnerNotes || null,
      companyName: company?.name || 'Channel Partner Portal',
      loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/partner-manager/visits`
    }
  });
};

export default {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendNewPropertyEmail,
  sendPartnershipApprovedEmail,
  sendVisitApprovedEmail,
  sendVisitRejectedEmail,
  sendVisitCancelledEmail,
  sendPartnerVisitCancelledEmail,
  sendTeamInviteEmail,
  sendCommissionCreatedEmail,
  sendCommissionApprovedEmail,
  sendCommissionPaidEmail,
  sendCommissionCancelledEmail,
  sendVisitScheduledEmail
};