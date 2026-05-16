import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.21, 0.45, 0.27, 0.9] } }
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.21, 0.45, 0.27, 0.9] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
};

const staggerGrid = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.15 } }
};

// Default data
const defaultFeatures = [
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
];

const defaultSteps = [
  { number: '01', title: 'Establish Your Presence', description: 'Configure your company profile, regions, and commission structures in minutes.', icon: '✨' },
  { number: '02', title: 'Curate Your Portfolio', description: 'Upload properties with rich media, dynamic pricing, and market-specific details.', icon: '🏢' },
  { number: '03', title: 'Expand Your Network', description: 'Invite partners, streamline KYC, and establish automated partnership agreements.', icon: '🤝' },
  { number: '04', title: 'Scale & Optimize', description: 'Leverage AI insights to maximize reach, track performance, and grow revenue.', icon: '📈' }
];

const defaultStats = [
  { value: '500+', label: 'Properties', description: 'Premium Listings' },
  { value: '200+', label: 'Partners', description: 'Active Network' },
  { value: '50+', label: 'Companies', description: 'Trusted Clients' },
  { value: '₹10Cr+', label: 'Commissions', description: 'Processed Seamlessly' }
];

const defaultPricing = [
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
];

// Icon mapping for features
const getFeatureIcon = (iconName) => {
  const icons = {
    building: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    users: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    money: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    calendar: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    document: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    chart: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  };
  return icons[iconName] || icons.building;
};

const Landing = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [pageData, setPageData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  const { scrollYProgress } = useScroll();
  const smoothScroll = useSpring(scrollYProgress, { damping: 30, stiffness: 300 });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch landing page data
  useEffect(() => {
    const fetchLandingPage = async () => {
      try {
        const response = await api.get('/landing');
        if (response.data.data?.landingPage) {
          setPageData(response.data.data.landingPage);
        }
      } catch (error) {
        console.error('Failed to fetch landing page data:', error);
      } finally {
        setDataLoading(false);
      }
    };
    fetchLandingPage();
  }, []);

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      const dashboardPaths = {
        platform_admin: '/platform/dashboard',
        company_superadmin: '/company/dashboard',
        partner_manager: '/partner-manager/dashboard',
        property_manager: '/property-manager/dashboard',
        finance_manager: '/finance-manager/dashboard',
        viewer: '/viewer/dashboard',
        partner: '/partner/dashboard'
      };
      navigate(dashboardPaths[user.role] || '/login');
    }
  }, [loading, isAuthenticated, user, navigate]);

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Use dynamic data or fall back to defaults
  const hero = pageData?.hero || {};
  const features = pageData?.features?.items || defaultFeatures;
  const steps = pageData?.howItWorks?.steps || defaultSteps;
  const stats = pageData?.hero?.stats || defaultStats;
  const pricing = pageData?.pricing?.plans || defaultPricing;
  const cta = pageData?.cta || {};
  const navigation = pageData?.navigation || {};
  const footer = pageData?.footer || {};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-white/80'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">
                {navigation?.brandName || 'Channel'}<span className="text-indigo-600">{navigation?.brandHighlight || 'Partner'}</span>
              </span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              {(navigation?.links || ['Features', 'Solutions', 'Pricing']).map((item, index) => (
                <a
                  key={index}
                  href={`#${typeof item === 'string' ? item.toLowerCase().replace(' ', '-') : item?.href?.toLowerCase().replace(' ', '-')}`}
                  className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  {typeof item === 'string' ? item : item?.label || item}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
              >
                {navigation?.loginText || 'Sign In'}
              </button>
              <button
                onClick={() => navigate('/register/company')}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
              >
                {navigation?.ctaText || 'Get Started'}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50"></div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-100/50 to-transparent"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center"
          >
            {hero?.badge?.show !== false && (hero?.badge?.text || hero?.badge) && (
              <motion.div variants={fadeInUp} className="mb-6">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full text-sm text-indigo-700 font-medium">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  {typeof hero.badge === 'object' ? hero.badge.text : hero.badge}
                </span>
              </motion.div>
            )}

            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6"
            >
              {hero?.title?.split('partner')[0] || 'Transform your'}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                {hero?.title?.includes('partner') ? 'partner' : 'partner'}
              </span>
              <br />
              {hero?.title?.split('partner')[1]?.replace('ecosystem', '').trim() || 'ecosystem'}
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-lg text-gray-600 max-w-2xl mx-auto mb-8"
            >
              {hero?.subtitle || 'The complete real estate partner management platform. Onboard partners, manage properties, track commissions, and grow your business.'}
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <button
                onClick={() => navigate('/register/company')}
                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all"
              >
                {hero?.ctaPrimary || 'Start Free Trial'}
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 transition-all"
              >
                {hero?.ctaSecondary || 'Access Dashboard'}
              </button>
            </motion.div>

            {/* Stats */}
            <motion.div
              variants={staggerGrid}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.description}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.span variants={fadeIn} className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-full mb-4">
              {pageData?.features?.badge || 'Platform Capabilities'}
            </motion.span>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {pageData?.features?.title || 'Everything you need to scale'}
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-gray-600 max-w-2xl mx-auto">
              {pageData?.features?.subtitle || 'A comprehensive suite of tools designed to optimize every aspect of your partner management.'}
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerGrid}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={scaleIn}
                whileHover={{ y: -4 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-indigo-100 transition-all group"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.gradient || 'from-indigo-500 to-purple-500'} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                  {typeof feature.icon === 'string' ? getFeatureIcon(feature.icon) : feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.span variants={fadeIn} className="inline-block px-4 py-1.5 bg-purple-50 text-purple-700 text-sm font-medium rounded-full mb-4">
              {pageData?.howItWorks?.badge || 'Simple Process'}
            </motion.span>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {pageData?.howItWorks?.title || 'Get started in four steps'}
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-gray-600 max-w-2xl mx-auto">
              {pageData?.howItWorks?.subtitle || 'Get your real estate business running on our platform with our streamlined onboarding process.'}
            </motion.p>
          </motion.div>

          <div className="relative">
            <div className="hidden lg:block absolute top-16 left-12 right-12 h-0.5 bg-gradient-to-r from-indigo-200 via-purple-200 to-indigo-200"></div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerGrid}
              className="grid grid-cols-1 lg:grid-cols-4 gap-8"
            >
              {steps.map((step, index) => (
                <motion.div key={index} variants={fadeInUp} className="relative text-center">
                  <div className="relative inline-flex mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-white shadow-lg border border-gray-100 flex items-center justify-center text-2xl">
                      {step.icon}
                    </div>
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
                      {step.number}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-600">{step.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.span variants={fadeIn} className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-full mb-4">
              {pageData?.pricing?.badge || 'Pricing Plans'}
            </motion.span>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {pageData?.pricing?.title || 'Choose the right plan'}
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-gray-600 max-w-2xl mx-auto">
              {pageData?.pricing?.subtitle || 'Transparent pricing with no hidden fees. All plans include core features.'}
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerGrid}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          >
            {pricing.map((plan, index) => (
              <motion.div
                key={index}
                variants={scaleIn}
                whileHover={{ y: -4 }}
                className={`relative rounded-2xl p-6 ${
                  plan.popular
                    ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/25'
                    : 'bg-white border border-gray-200 shadow-sm'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-bold rounded-full shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className={`text-xl font-bold mb-2 ${plan.popular ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className={`text-4xl font-bold ${plan.popular ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                    <span className={plan.popular ? 'text-indigo-200' : 'text-gray-500'}>{plan.period}</span>
                  </div>
                  <p className={`text-sm mt-2 ${plan.popular ? 'text-indigo-200' : 'text-gray-500'}`}>{plan.description}</p>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-2 text-sm">
                      <svg className={`w-4 h-4 flex-shrink-0 ${plan.popular ? 'text-indigo-200' : 'text-indigo-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={plan.popular ? 'text-indigo-100' : 'text-gray-600'}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/register/company')}
                  className={`w-full py-2.5 rounded-lg font-medium transition-all ${
                    plan.popular
                      ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {plan.buttonText}
                </button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.span variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              {cta?.badge || 'Join the revolution'}
            </motion.span>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {cta?.title || 'Ready to transform your real estate business?'}
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-indigo-100 mb-8 max-w-2xl mx-auto">
              {cta?.subtitle || 'Join hundreds of forward-thinking real estate companies already scaling with ChannelPartner.'}
            </motion.p>
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/register/company')}
                className="px-8 py-3 bg-white text-indigo-600 font-medium rounded-lg shadow-lg hover:shadow-xl transition-all"
              >
                {cta?.primaryButton || 'Start Free Trial'}
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3 bg-white/10 backdrop-blur-sm text-white font-medium rounded-lg border border-white/30 hover:bg-white/20 transition-all"
              >
                {cta?.secondaryButton || 'Talk to Sales'}
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-white">
                  {footer?.brandName || 'Channel'}<span className="text-indigo-400">{footer?.brandHighlight || 'Partner'}</span>
                </span>
              </div>
              <p className="text-sm leading-relaxed mb-4">
                {footer?.description || 'The complete real estate partner management platform for modern businesses.'}
              </p>
              <div className="flex gap-4">
                {(Array.isArray(footer?.socialLinks)
                  ? footer.socialLinks
                  : [
                      { name: 'twitter', url: footer?.socialLinks?.twitter || '#' },
                      { name: 'linkedin', url: footer?.socialLinks?.linkedin || '#' },
                      { name: 'github', url: '#' }
                    ]
                ).map((social, index) => (
                  <a key={index} href={typeof social === 'string' ? '#' : social?.url || '#'} className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
            {(footer?.linkColumns && footer.linkColumns.length > 0
              ? footer.linkColumns
              : [
                  { title: 'Product', links: footer?.productLinks || ['Features', 'Pricing', 'Solutions', 'Integrations'] },
                  { title: 'Company', links: footer?.companyLinks || ['About', 'Blog', 'Careers', 'Press'] },
                  { title: 'Legal', links: footer?.legalLinks || ['Privacy', 'Terms', 'Security', 'Cookies'] }
                ]
            ).map((column, colIndex) => (
              <div key={colIndex}>
                <h4 className="text-white font-semibold text-sm mb-4">{column.title}</h4>
                <ul className="space-y-2">
                  {column.links.map((item, itemIndex) => (
                    <li key={itemIndex}>
                      <a href={`#${typeof item === 'string' ? item.toLowerCase() : item?.label?.toLowerCase()}`} className="text-sm hover:text-white transition-colors">
                        {typeof item === 'string' ? item : item?.label || item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-gray-800 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} {footer?.copyright || 'ChannelPartner. All rights reserved.'}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;