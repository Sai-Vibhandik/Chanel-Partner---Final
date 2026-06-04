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
    primaryCta: 'Get Started',
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
  cta: {
    badge: 'Join the revolution',
    title: 'Ready to transform your real estate business?',
    subtitle: 'Join hundreds of forward-thinking real estate companies already scaling with ChannelPartner.',
    primaryCta: 'Get Started',
    secondaryCta: 'Talk to Sales'
  },
  testimonials: {
    badge: 'Testimonials',
    title: 'Trusted by industry leaders',
    subtitle: 'See what our partners say about their experience with ChannelPartner.',
    items: [
      {
        quote: 'ChannelPartner transformed our partner management. We saw 3x growth in just 6 months. The platform is intuitive and the support team is incredibly responsive.',
        author: 'Rahul Sharma',
        role: 'CEO',
        company: 'PropertyPro India'
      },
      {
        quote: 'The commission tracking alone saved us countless hours every week. Our partners love the transparency and real-time updates.',
        author: 'Priya Patel',
        role: 'Operations Head',
        company: 'RealtyGroup'
      },
      {
        quote: 'We expanded from Mumbai to Dubai in record time. The multi-market support and automated workflows made it seamless.',
        author: 'Ahmed Khan',
        role: 'Managing Director',
        company: 'Global Properties'
      }
    ]
  },
  faqs: {
    badge: 'FAQs',
    title: 'Frequently asked questions',
    subtitle: 'Everything you need to know about ChannelPartner.',
    items: [
      {
        question: 'What is ChannelPartner and how can it help my business?',
        answer: 'ChannelPartner is a comprehensive real estate partner management platform that helps you onboard partners, manage properties, track commissions, and grow your business across India and Dubai markets. Our platform streamlines operations, reduces manual work, and provides real-time insights.',
        category: 'general'
      },
      {
        question: 'How does the pricing work?',
        answer: 'We offer flexible pricing plans starting from ₹9,999/month for the Essential plan with 50 property listings and 10 partner accounts. The Pro plan at ₹24,999/month includes unlimited properties, advanced analytics, and priority support. Enterprise plans are custom-tailored to your needs.',
        category: 'pricing'
      },
      {
        question: 'Can I switch between plans?',
        answer: 'Yes, you can upgrade or downgrade your plan at any time. When upgrading, you\'ll be charged the prorated difference. When downgrading, the credit will be applied to your next billing cycle.',
        category: 'pricing'
      },
      {
        question: 'Is my data secure on ChannelPartner?',
        answer: 'Absolutely. We use enterprise-grade AES-256 encryption, regular security audits, and comply with industry standards. Your data is stored in secure data centers with 99.9% uptime guarantee and regular backups.',
        category: 'security'
      },
      {
        question: 'What kind of support do you offer?',
        answer: 'All plans include email support. Pro and Enterprise plans include priority support with faster response times. Enterprise customers also get a dedicated success manager and custom onboarding.',
        category: 'support'
      },
      {
        question: 'How long does it take to get started?',
        answer: 'Most companies are up and running within 24 hours. Our onboarding team will help you import your existing data, set up your team, and configure your commission structures.',
        category: 'general'
      }
    ]
  },
  footer: {
    brandName: 'Channel',
    brandHighlight: 'Partner',
    description: 'The complete real estate partner management platform for modern businesses.',
    copyright: 'ChannelPartner. All rights reserved.',
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
    loginText: 'Sign In',
    ctaText: 'Get Started',
    links: [
      { label: 'Features', href: 'features' },
      { label: 'Solutions', href: 'solutions' },
      { label: 'Pricing', href: 'pricing' }
    ]
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
    console.log('   - CTA section');
    console.log('   - 3 testimonials');
    console.log('   - 6 FAQs');
    console.log('   - Footer with brand, links & social');
    console.log('   - Navigation with brand & links');
    console.log('   - SEO metadata');
    console.log('\n💡 Note: Plans are managed separately via Platform Admin > Plans');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding landing page:', error);
    process.exit(1);
  }
}

seedLandingPage();