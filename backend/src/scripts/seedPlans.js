import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Plan from '../models/Plan.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const defaultPlans = [
  {
    name: 'Essential',
    description: 'For growing real estate businesses',
    price: 9999, // ₹9,999
    currency: 'INR',
    billingPeriod: 'monthly',
    isPopular: false,
    displayOrder: 1,
    features: [
      '50 Property Listings',
      'Unlimited Partners',
      'Unlimited Team Members',
      'Core Analytics',
      'Email Support',
      'Single Market'
    ],
    limits: {
      maxProperties: 50,
      maxDays: 30
    },
    capabilities: {
      analytics: true,
      advancedAnalytics: false,
      apiAccess: false,
      whiteLabel: false,
      customDomain: false,
      prioritySupport: false,
      dedicatedManager: false
    }
  },
  {
    name: 'Professional',
    description: 'For scaling partner networks',
    price: 24999, // ₹24,999
    currency: 'INR',
    billingPeriod: 'monthly',
    isPopular: true,
    displayOrder: 2,
    features: [
      'Unlimited Properties',
      'Unlimited Partners',
      'Unlimited Team Members',
      'Advanced Analytics',
      'Priority Support',
      'Multi-Region',
      'Custom Agreements',
      'API Access'
    ],
    limits: {
      maxProperties: -1, // unlimited
      maxDays: 30
    },
    capabilities: {
      analytics: true,
      advancedAnalytics: true,
      apiAccess: true,
      whiteLabel: false,
      customDomain: false,
      prioritySupport: true,
      dedicatedManager: false
    }
  },
  {
    name: 'Enterprise',
    description: 'For industry leaders',
    price: 0, // Custom pricing
    currency: 'INR',
    billingPeriod: 'monthly',
    isPopular: false,
    displayOrder: 3,
    features: [
      'Everything in Professional',
      'Unlimited Everything',
      'Dedicated Manager',
      'Custom Development',
      'White-Label',
      'SLA Guarantee',
      'On-Premise Option'
    ],
    limits: {
      maxProperties: -1,
      maxDays: 365
    },
    capabilities: {
      analytics: true,
      advancedAnalytics: true,
      apiAccess: true,
      whiteLabel: true,
      customDomain: true,
      prioritySupport: true,
      dedicatedManager: true
    }
  }
];

const seedPlans = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing plans
    await Plan.deleteMany({});
    console.log('🗑️ Cleared existing plans');

    // Insert default plans one by one to trigger pre-save hooks
    const plans = [];
    for (const planData of defaultPlans) {
      const plan = await Plan.create(planData);
      plans.push(plan);
      console.log(`   ✅ Created: ${plan.name}`);
    }

    console.log('\n🎉 Seeding completed successfully!');

    // Show Razorpay plan creation instructions
    console.log('\n📋 Next Steps:');
    console.log('   1. Add your Razorpay credentials to .env:');
    console.log('      RAZORPAY_KEY_ID=your_key_id');
    console.log('      RAZORPAY_KEY_SECRET=your_key_secret');
    console.log('   2. Create Razorpay plans in the Razorpay dashboard');
    console.log('   3. Update the razorpayPlanId field for each plan in the database');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    process.exit(1);
  }
};

// Run seed function
seedPlans();

export default seedPlans;