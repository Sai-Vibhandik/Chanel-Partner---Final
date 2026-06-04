import cron from 'node-cron';
import { runSubscriptionReminders } from '../services/subscriptionReminder.service.js';

/**
 * Initialize all cron jobs
 */
export const initCronJobs = () => {
  console.log('🕐 Initializing cron jobs...');

  // Run subscription reminders daily at 9:00 AM
  // Checks for subscriptions expiring in 7 days and 1 day
  cron.schedule('0 9 * * *', async () => {
    console.log('🔔 Cron: Running daily subscription reminder check...');
    try {
      await runSubscriptionReminders();
    } catch (error) {
      console.error('❌ Cron: Error running subscription reminders:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata' // Adjust timezone as needed
  });

  console.log('✅ Cron jobs initialized successfully');
  console.log('   - Subscription reminders: Daily at 9:00 AM IST');
};

/**
 * Run subscription reminders manually (for testing)
 */
export const runRemindersManually = async () => {
  console.log('🔔 Running subscription reminders manually...');
  try {
    await runSubscriptionReminders();
    console.log('✅ Subscription reminders completed');
  } catch (error) {
    console.error('❌ Error running subscription reminders:', error);
  }
};