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
      primaryCtaLink: { type: String, default: '' },
      secondaryCta: { type: String, default: 'Access Dashboard' },
      secondaryCtaLink: { type: String, default: '' },
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

    // CTA Section
    cta: {
      badge: { type: String, default: 'Join the revolution' },
      title: { type: String, default: 'Ready to redefine your real estate journey' },
      subtitle: { type: String, default: 'Join hundreds of forward-thinking real estate companies already scaling with ChannelPartner.' },
      primaryCta: { type: String, default: 'Start Free Trial' },
      primaryCtaLink: { type: String, default: '' },
      secondaryCta: { type: String, default: 'Talk to Sales' },
      secondaryCtaLink: { type: String, default: '' }
    },

    // Footer Section
    footer: {
      brandName: { type: String, default: 'Channel' },
      brandHighlight: { type: String, default: 'Partner' },
      tagline: { type: String, default: 'The complete real estate partner management platform for modern businesses.' },
      supportEmail: { type: String, default: 'support@channelpartner.com' },
      copyright: { type: String, default: '© 2024 ChannelPartner. All rights reserved.' },
      // Quick Links - array of {label, url}
      quickLinks: [{
        label: { type: String },
        url: { type: String }
      }],
      // Legal Links - array of {label, url}
      legalLinks: [{
        label: { type: String },
        url: { type: String }
      }],
      // Dynamic social links - each has platform and url
      socialLinks: [{
        platform: { type: String, enum: ['twitter', 'linkedin', 'facebook', 'instagram', 'youtube', 'github'] },
        url: { type: String }
      }]
    },

    // Navigation
    navigation: {
      brandName: { type: String, default: 'Channel' },
      brandHighlight: { type: String, default: 'Partner' },
      loginText: { type: String, default: 'Sign in' },
      ctaText: { type: String, default: 'Get Started' },
      links: [{
        label: { type: String },
        href: { type: String }
      }]
    },

    // Testimonials Section
    testimonials: {
      badge: { type: String, default: 'Testimonials' },
      title: { type: String, default: 'Trusted by industry leaders' },
      subtitle: { type: String, default: 'See what our partners say about their experience.' },
      items: [{
        quote: { type: String },
        author: { type: String },
        role: { type: String },
        company: { type: String },
        avatar: { type: String }
      }]
    },

    // FAQs Section
    faqs: {
      badge: { type: String, default: 'FAQs' },
      title: { type: String, default: 'Frequently asked questions' },
      subtitle: { type: String, default: 'Everything you need to know about ChannelPartner.' },
      items: [{
        question: { type: String },
        answer: { type: String },
        category: { type: String, default: 'general' }
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