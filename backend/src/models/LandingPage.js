import mongoose from 'mongoose';

const landingPageSchema = new mongoose.Schema(
  {
    // Hero Section
    hero: {
      badge: {
        text: { type: String, default: 'Now serving 200+ real estate leaders' },
        show: { type: Boolean, default: true }
      },
      title: { type: String, default: 'Transform your partner ecosystem' },
      highlightWord: { type: String, default: 'partner' },
      subtitle: { type: String, default: 'The complete real estate partner management platform. Onboard partners, manage properties, track commissions, and grow your business across India and Dubai markets.' },
      primaryCta: { type: String, default: 'Start Free Trial' },
      secondaryCta: { type: String, default: 'Access Dashboard' },
      stats: [{
        value: { type: String },
        label: { type: String },
        description: { type: String }
      }]
    },

    // Features Section
    features: {
      badge: { type: String, default: 'Platform Capabilities' },
      title: { type: String, default: 'Everything you need to scale your partnership' },
      subtitle: { type: String, default: 'A comprehensive suite of tools designed to optimize every aspect of your partner management.' },
      items: [{
        icon: { type: String, default: 'building' }, // icon name
        title: { type: String },
        description: { type: String },
        gradient: { type: String, default: 'from-indigo-500 to-purple-500' }
      }]
    },

    // How It Works Section
    howItWorks: {
      badge: { type: String, default: 'Simple Process' },
      title: { type: String, default: 'From setup to success in four steps' },
      subtitle: { type: String, default: 'Get your real estate business running on our platform with our streamlined onboarding process.' },
      steps: [{
        number: { type: String },
        title: { type: String },
        description: { type: String },
        icon: { type: String }
      }]
    },

    // Pricing Section
    pricing: {
      badge: { type: String, default: 'Pricing Plans' },
      title: { type: String, default: 'Choose the plan that fits your ambition' },
      subtitle: { type: String, default: 'Transparent pricing with no hidden fees. All plans include core features and premium support.' },
      plans: [{
        name: { type: String },
        price: { type: String },
        period: { type: String },
        description: { type: String },
        features: [{ type: String }],
        popular: { type: Boolean, default: false },
        buttonText: { type: String },
        gradient: { type: String }
      }]
    },

    // CTA Section
    cta: {
      badge: { type: String, default: 'Join the revolution' },
      title: { type: String, default: 'Ready to redefine your real estate journey' },
      subtitle: { type: String, default: 'Join hundreds of forward-thinking real estate companies already scaling with ChannelPartner.' },
      primaryCta: { type: String, default: 'Start Free Trial' },
      secondaryCta: { type: String, default: 'Talk to Sales' }
    },

    // Footer Section
    footer: {
      description: { type: String, default: 'The complete real estate partner management platform for modern businesses.' },
      productLinks: [{ type: String }],
      companyLinks: [{ type: String }],
      legalLinks: [{ type: String }],
      socialLinks: {
        twitter: { type: String, default: '' },
        linkedin: { type: String, default: '' },
        facebook: { type: String, default: '' },
        instagram: { type: String, default: '' }
      }
    },

    // Navigation
    navigation: {
      links: [{
        label: { type: String },
        href: { type: String }
      }]
    },

    // SEO
    seo: {
      title: { type: String, default: 'ChannelPartner - Real Estate Partner Management Platform' },
      description: { type: String, default: 'The complete real estate partner management platform. Manage partners, properties, commissions, and grow your business.' },
      keywords: [{ type: String }]
    },

    // Status
    isActive: { type: Boolean, default: true },

    // Last updated by
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Ensure only one landing page document exists
landingPageSchema.statics.getSingleton = async function() {
  let landingPage = await this.findOne();
  if (!landingPage) {
    landingPage = await this.create({});
  }
  return landingPage;
};

const LandingPage = mongoose.model('LandingPage', landingPageSchema);
export default LandingPage;