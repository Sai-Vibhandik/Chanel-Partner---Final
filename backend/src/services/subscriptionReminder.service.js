import Company from '../models/Company.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { sendEmail } from './email.service.js';

/**
 * Check for expiring subscriptions and send reminders
 * @param {number} daysBeforeExpiry - Days before expiry to check (7 or 1)
 */
export const checkExpiringSubscriptions = async (daysBeforeExpiry) => {
  try {
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysBeforeExpiry);

    // Set time to start and end of target day
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    console.log(`[Subscription Reminder] Checking for subscriptions expiring in ${daysBeforeExpiry} days...`);
    console.log(`[Subscription Reminder] Target date range: ${dayStart.toISOString()} to ${dayEnd.toISOString()}`);

    // Find companies with subscriptions expiring on the target date
    const companies = await Company.find({
      'subscription.status': 'active',
      'subscription.currentPeriodEnd': { $gte: dayStart, $lte: dayEnd }
    }).populate('subscription.planId', 'name displayName price currency');

    console.log(`[Subscription Reminder] Found ${companies.length} companies with expiring subscriptions`);

    for (const company of companies) {
      try {
        // Get all company admins (superadmin, admin, and finance manager)
        const admins = await User.find({
          companyId: company._id,
          role: { $in: ['company_superadmin', 'company_admin', 'finance_manager'] },
          isActive: true
        });

        if (!admins || admins.length === 0) {
          console.log(`[Subscription Reminder] No admins found for company: ${company.name}`);
          continue;
        }

        // Get expiry date
        const expiryDate = company.subscription.currentPeriodEnd;
        const planName = company.subscription.planId?.displayName || company.subscription.planId?.name || 'Current Plan';

        // Create notifications for all admins
        for (const admin of admins) {
          await Notification.create({
            recipientId: admin._id,
            type: 'subscription_reminder',
            title: `Subscription ${daysBeforeExpiry === 7 ? 'Expiring Soon' : 'Expiring Tomorrow'}`,
            message: `Your ${planName} subscription will expire on ${expiryDate.toLocaleDateString()}. Please renew to continue using all features.`,
            data: {
              companyId: company._id,
              daysRemaining: daysBeforeExpiry,
              expiryDate: expiryDate,
              planName: planName
            }
          });
        }

        // Send email to primary admin (superadmin)
        const primaryAdmin = admins.find(a => a.role === 'company_superadmin') || admins[0];

        await sendEmail({
          to: primaryAdmin.email,
          template: 'subscriptionExpiryReminder',
          data: {
            adminName: primaryAdmin.firstName || primaryAdmin.name || 'Admin',
            companyName: company.name,
            planName: planName,
            expiryDate: expiryDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            daysRemaining: daysBeforeExpiry,
            loginUrl: `${process.env.FRONTEND_URL}/login`
          },
          companyId: company._id
        });

        console.log(`[Subscription Reminder] Sent ${admins.length} notifications and email to ${primaryAdmin.email} for company: ${company.name}`);
      } catch (error) {
        console.error(`[Subscription Reminder] Error processing company ${company.name}:`, error.message);
      }
    }

    return { success: true, companiesNotified: companies.length };
  } catch (error) {
    console.error('[Subscription Reminder] Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Run subscription reminder checks for both 7-day and 1-day reminders
 */
export const runSubscriptionReminders = async () => {
  console.log('[Subscription Reminder] Running subscription expiry checks...');

  // Check 7-day reminders
  await checkExpiringSubscriptions(7);

  // Check 1-day reminders
  await checkExpiringSubscriptions(1);

  console.log('[Subscription Reminder] Completed all checks');
};