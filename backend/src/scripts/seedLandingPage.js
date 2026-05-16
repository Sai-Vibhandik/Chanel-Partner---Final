import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// Load environment variables - try multiple paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const possibleEnvPaths = [
  join(__dirname, '../../.env'),  // backend/.env
  join(__dirname, '../../../.env'), // root .env
  '.env'
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('📁 Loaded .env from:', envPath);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.log('⚠️ No .env file found, trying default dotenv config');
  dotenv.config();
}

// Import the LandingPage model
import LandingPage from '../models/LandingPage.js';

const defaultLandingPageData = {
  hero: {
    badge: {
      text: 'Now serving 200+ real estate leaders across India & Dubai',
      show: true
    },
    title: 'Transform your partner ecosystem',
    highlightWord: 'partner',
    subtitle: 'The complete real estate partner management platform. Onboard partners, manage properties, track commissions, and grow your business across India and Dubai markets.',
    primaryCta: 'Start Free Trial',
    secondaryCta: 'Access Dashboard',
    stats: [
      { value: '500+', label: 'Properties', description: 'Premium Listings' },
      { value: '200+', label: 'Partners', description: 'Active Network' },
      { value: '50+', label: 'Companies', description: 'Trusted Clients' },
      { value: '₹10Cr+', label: 'Commissions', description: 'Processed Seamlessly' }
    ]
  },
  features: {
    badge: 'Platform Capabilities',
    title: 'Everything you need to scale your partnership',
    subtitle: 'A comprehensive suite of tools designed to optimize every aspect of your partner management.',
    items: [
      {
        icon: 'building',
        title: 'Property Management',
        description: 'Centralized portfolio control with real-time analytics and market insights across India & Dubai.',
        gradient: 'from-indigo-500 to-purple-500'
      },
      {
        icon: 'users',
        title: 'Partner Network',
        description: 'Intelligent partner onboarding with automated KYC and performance-based tiering system.',
        gradient: 'from-blue-500 to-cyan-500'
      },
      {
        icon: 'money',
        title: 'Smart Commissions',
        description: 'Dynamic commission engine with multi-tier calculations and real-time earning notifications.',
        gradient: 'from-emerald-500 to-teal-500'
      },
      {
        icon: 'calendar',
        title: 'Smart Scheduling',
        description: 'AI-powered visit optimization with calendar sync and automated follow-ups.',
        gradient: 'from-orange-500 to-amber-500'
      },
      {
        icon: 'document',
        title: 'Digital Agreements',
        description: 'Secure contracts with e-signature and automated renewal workflows.',
        gradient: 'from-violet-500 to-purple-500'
      },
      {
        icon: 'chart',
        title: 'Predictive Analytics',
        description: 'Advanced forecasting with custom dashboards and actionable business intelligence.',
        gradient: 'from-rose-500 to-pink-500'
      }
    ]
  },
  howItWorks: {
    badge: 'Simple Process',
    title: 'From setup to success in four steps',
    subtitle: 'Get your real estate business running on our platform with our streamlined onboarding process.',
    steps: [
      {
        number: '01',
        title: 'Establish Your Presence',
        description: 'Configure your company profile, regions, and commission structures in minutes.',
        icon: '✨'
      },
      {
        number: '02',
        title: 'Curate Your Portfolio',
        description: 'Upload properties with rich media, dynamic pricing, and market-specific details.',
        icon: '🏢'
      },
      {
        number: '03',
        title: 'Expand Your Network',
        description: 'Invite partners, streamline KYC, and establish automated partnership agreements.',
        icon: '🤝'
      },
      {
        number: '04',
        title: 'Scale & Optimize',
        description: 'Leverage AI insights to maximize reach, track performance, and grow revenue.',
        icon: '📈'
      }
    ]
  },
  pricing: {
    badge: 'Pricing Plans',
    title: 'Choose the plan that fits your ambition',
    subtitle: 'Transparent pricing with no hidden fees. All plans include core features and premium support.',
    plans: [
      {
        name: 'Essential',
        price: '₹9,999',
        period: '/month',
        description: 'Perfect for emerging real estate ventures',
        features: ['50 Property Listings', '10 Partner Accounts', 'Core Analytics Suite', 'Priority Email Support', 'Single Market Access'],
        popular: false,
        buttonText: 'Start Essential'
      },
      {
        name: 'Pro',
        price: '₹24,999',
        period: '/month',
        description: 'The ultimate growth accelerator',
        features: ['Unlimited Properties', '50 Partner Accounts', 'Advanced AI Analytics', '24/7 Priority Support', 'Multi-Region Access', 'Custom Agreement Builder', 'Full API Integration'],
        popular: true,
        buttonText: 'Go Pro'
      },
      {
        name: 'Enterprise',
        price: 'Custom',
        period: '',
        description: 'Tailored solutions for industry leaders',
        features: ['Everything in Pro', 'Unlimited Partners', 'Dedicated Success Manager', 'Custom Development', 'White-Label Solution', 'SLA Guarantee', 'On-Premise Option'],
        popular: false,
        buttonText: 'Contact Sales'
      }
    ]
  },
  cta: {
    badge: 'Join the revolution',
    title: 'Ready to transform your real estate business?',
    subtitle: 'Join hundreds of forward-thinking real estate companies already scaling with ChannelPartner.',
    primaryCta: 'Start Free Trial',
    secondaryCta: 'Talk to Sales'
  },
  footer: {
    description: 'The complete real estate partner management platform for modern businesses.',
    productLinks: ['Features', 'Pricing', 'Solutions', 'Integrations'],
    companyLinks: ['About', 'Blog', 'Careers', 'Press'],
    legalLinks: ['Privacy', 'Terms', 'Security', 'Cookies'],
    socialLinks: {
      twitter: '',
      linkedin: '',
      facebook: '',
      instagram: ''
    }
  },
  navigation: {
    brandName: 'Channel',
    brandHighlight: 'Partner',
    links: [
      { label: 'Features', href: 'features' },
      { label: 'Solutions', href: 'solutions' },
      { label: 'Pricing', href: 'pricing' }
    ],
    loginText: 'Sign In',
    ctaText: 'Get Started'
  },
  seo: {
    title: 'ChannelPartner - Real Estate Partner Management Platform',
    description: 'The complete real estate partner management platform. Manage partners, properties, commissions, and grow your business across India and Dubai.',
    keywords: ['real estate', 'partner management', 'channel partner', 'property management', 'commissions', 'CRM']
  }
};

async function seedLandingPage() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if landing page already exists
    const existingPage = await LandingPage.findOne();

    if (existingPage) {
      console.log('⚠️ Landing page already exists. Updating with default data...');

      // Update existing document with default data
      await LandingPage.findOneAndUpdate({}, defaultLandingPageData, { new: true });
      console.log('✅ Landing page updated successfully');
    } else {
      // Create new document with default data
      await LandingPage.create(defaultLandingPageData);
      console.log('✅ Landing page created successfully with default data');
    }

    console.log('\n📝 Seeded data includes:');
    console.log('   - Hero section with stats');
    console.log('   - 6 feature items');
    console.log('   - 4 how-it-works steps');
    console.log('   - 3 pricing plans');
    console.log('   - CTA section');
    console.log('   - Footer with links');
    console.log('   - Navigation links');
    console.log('   - SEO metadata');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding landing page:', error);
    process.exit(1);
  }
}

seedLandingPage();