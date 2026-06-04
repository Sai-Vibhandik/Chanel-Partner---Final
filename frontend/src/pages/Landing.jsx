import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import {
  ArrowRight,
  Play,
  Sparkles,
  Zap,
  Shield,
  Globe,
  ChevronDown,
  Building2,
  Users,
  Wallet,
  Calendar,
  FileCheck,
  BarChart3,
  Check,
  ArrowUpRight,
  Menu,
  X,
  Star,
  Twitter,
  Linkedin,
  Github,
  Facebook,
  Instagram,
  Youtube,
  Quote,
} from "lucide-react";
import api from "../utils/api";
import { getPublicPlans } from "../services/payment.service.js";

gsap.registerPlugin(ScrollTrigger);

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

// Default data - comprehensive fallbacks
const defaultFeatures = [
  {
    icon: "building",
    title: "Property Intelligence",
    description:
      "AI-powered portfolio management with predictive market insights across India & Dubai markets.",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: "users",
    title: "Partner Ecosystem",
    description:
      "Intelligent onboarding, automated KYC verification, and performance-based partner tiering.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: "wallet",
    title: "Commission Engine",
    description:
      "Multi-tier commission calculations with real-time tracking and automated payouts.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: "calendar",
    title: "Visit Orchestration",
    description:
      "Smart scheduling with AI-optimized routes, calendar sync, and automated follow-ups.",
    color: "from-orange-500 to-amber-500",
  },
  {
    icon: "filecheck",
    title: "Digital Agreements",
    description:
      "Blockchain-verified contracts with e-signature and automated compliance workflows.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: "barchart",
    title: "Analytics Suite",
    description:
      "Real-time dashboards with predictive modeling and actionable business intelligence.",
    color: "from-indigo-500 to-blue-500",
  },
];

const defaultStats = [
  {
    value: "500+",
    label: "Active Properties",
    description: "Premium Listings",
  },
  { value: "200+", label: "Channel Partners", description: "Active Network" },
  {
    value: "₹10Cr+",
    label: "Commissions",
    description: "Processed Seamlessly",
  },
  {
    value: "50+",
    label: "Enterprise Clients",
    description: "Trusted Companies",
  },
];

const defaultPricing = [
  {
    name: "Essential",
    price: "₹9,999",
    period: "/month",
    description: "For growing real estate businesses",
    features: [
      "50 Property Listings",
      "10 Partner Accounts",
      "Core Analytics",
      "Email Support",
      "Single Market",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Professional",
    price: "₹24,999",
    period: "/month",
    description: "For scaling partner networks",
    features: [
      "Unlimited Properties",
      "50 Partner Accounts",
      "Advanced Analytics",
      "Priority Support",
      "Multi-Region",
      "Custom Agreements",
      "API Access",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For industry leaders",
    features: [
      "Everything in Professional",
      "Unlimited Partners",
      "Dedicated Manager",
      "Custom Development",
      "White-Label",
      "SLA Guarantee",
      "On-Premise",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const defaultSteps = [
  {
    number: "01",
    title: "Establish Your Presence",
    description:
      "Configure your company profile, regions, and commission structures.",
    icon: "✨",
  },
  {
    number: "02",
    title: "Curate Your Portfolio",
    description:
      "Upload properties with rich media, dynamic pricing, and market details.",
    icon: "🏢",
  },
  {
    number: "03",
    title: "Expand Your Network",
    description: "Invite partners, streamline KYC, and establish agreements.",
    icon: "🤝",
  },
  {
    number: "04",
    title: "Scale & Optimize",
    description: "Leverage AI insights to maximize reach and grow revenue.",
    icon: "📈",
  },
];

const defaultTestimonials = [
  {
    quote:
      "ChannelPartner transformed our partner management. We saw 3x growth in just 6 months.",
    author: "Rahul Sharma",
    role: "CEO, PropertyPro India",
  },
  {
    quote: "The commission tracking alone saved us countless hours every week.",
    author: "Priya Patel",
    role: "Operations Head, RealtyGroup",
  },
];

const defaultFaqs = [
  {
    question: "What is ChannelPartner?",
    answer:
      "ChannelPartner is a comprehensive real estate partner management platform that helps you onboard partners, manage properties, track commissions, and grow your business across India and Dubai markets.",
    category: "general",
  },
  {
    question: "How does the pricing work?",
    answer:
      "We offer flexible pricing plans starting from ₹9,999/month for the Essential plan. All plans include core features, and you can upgrade or downgrade anytime. Contact us for custom Enterprise solutions.",
    category: "pricing",
  },
  {
    question: "Is my data secure?",
    answer:
      "Absolutely. We use enterprise-grade encryption, regular security audits, and comply with industry standards to ensure your data is always protected.",
    category: "security",
  },
];



// Icon map for dynamic icons
const iconMap = {
  building: Building2,
  users: Users,
  wallet: Wallet,
  calendar: Calendar,
  filecheck: FileCheck,
  barchart: BarChart3,
  sparkles: Sparkles,
  zap: Zap,
  shield: Shield,
  globe: Globe,
};

// Get icon component from string
const getIconComponent = (iconName) => {
  const name =
    typeof iconName === "string" ? iconName.toLowerCase() : "building";
  return iconMap[name] || Building2;
};

// Social icon map
const socialIconMap = {
  twitter: Twitter,
  linkedin: Linkedin,
  github: Github,
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
};

// Magnetic Button Component
const MagneticButton = ({ children, className, onClick }) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Disable on touch devices
    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    const handleMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(el, {
        x: x * 0.3,
        y: y * 0.3,
        duration: 0.3,
        ease: "power2.out",
      });
    };

    const handleMouseLeave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.5)" });
    };

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <button ref={ref} className={className} onClick={onClick}>
      {children}
    </button>
  );
};

// Animated Counter
const AnimatedCounter = ({ value }) => {
  const ref = useRef(null);
  const valueStr = String(value);
  const numericValue = parseInt(valueStr.replace(/[^0-9]/g, ""));
  const prefix = valueStr.match(/^[^0-9]*/)?.[0] || "";
  const suffix = valueStr.match(/[0-9,.]+(.*)/)?.[1] || "";

  useEffect(() => {
    if (!ref.current || isNaN(numericValue)) return;

    const obj = { value: 0 };
    gsap.to(obj, {
      value: numericValue,
      duration: 2,
      ease: "power2.out",
      scrollTrigger: { trigger: ref.current, start: "top 80%" },
      onUpdate: () => {
        ref.current.textContent = `${prefix}${Math.floor(obj.value).toLocaleString()}${suffix}`;
      },
    });
  }, [numericValue, prefix, suffix]);

  return <span ref={ref}>{value}</span>;
};

// Icon Renderer Component
const IconRenderer = ({ icon, className }) => {
  if (typeof icon === "string") {
    const IconComponent = getIconComponent(icon);
    return IconComponent ? <IconComponent className={className} /> : null;
  }
  // If icon is already a component
  const IconComponent = icon;
  return IconComponent ? <IconComponent className={className} /> : null;
};

// Noise Overlay
const NoiseOverlay = () => (
  <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.015] hidden lg:block">
    <svg className="w-full h-full">
      <filter id="noise">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.8"
          numOctaves="4"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noise)" />
    </svg>
  </div>
);

// Grid Background
const GridBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:80px_80px]" />
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0A0A0F]" />
  </div>
);

// Glowing Orb
const GlowingOrb = ({ className }) => (
  <div
    className={`absolute rounded-full blur-[100px] bg-gradient-radial from-violet-500/30 to-transparent ${className}`}
  />
);

// Section wrapper
const RevealSection = ({ children, className = "", id = "" }) => {
  return (
    <section id={id} className={className}>
      {children}
    </section>
  );
};

// Main Landing Component
const Landing = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, loading } = useAuth();
  const [pageData, setPageData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedTestimonial, setSelectedTestimonial] = useState(null);

  const containerRef = useRef(null);
  const cursorRef = useRef(null);

  // Smooth scroll - desktop only
  useEffect(() => {
    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: "vertical",
      smooth: true,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, []);

  // Fetch landing page data and plans
  useEffect(() => {
    const fetchLandingPage = async () => {
      try {
        const [landingResponse, plansResponse] = await Promise.all([
          api.get("/landing").catch(() => ({ data: { data: {} } })),
          getPublicPlans().catch(() => ({ data: { plans: [] } })),
        ]);

        if (landingResponse.data.data?.landingPage) {
          setPageData(landingResponse.data.data.landingPage);
        }

        if (plansResponse.data?.plans && plansResponse.data.plans.length > 0) {
          setPlans(plansResponse.data.plans);
        }
      } catch (error) {
      } finally {
        setDataLoading(false);
      }
    };
    fetchLandingPage();
  }, []);

  // Redirect authenticated users
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      const dashboardPaths = {
        platform_admin: "/platform/dashboard",
        company_superadmin: "/company/dashboard",
        partner_manager: "/partner-manager/dashboard",
        property_manager: "/property-manager/dashboard",
        finance_manager: "/finance-manager/dashboard",
        viewer: "/viewer/dashboard",
        partner: "/partner/dashboard",
      };
      navigate(dashboardPaths[user.role] || "/login");
    }
  }, [loading, isAuthenticated, user, navigate]);

  // Cursor glow - desktop only
  useEffect(() => {
    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    const container = containerRef.current;
    const cursor = cursorRef.current;
    if (!container || !cursor) return;

    const handleMouseMove = (e) => {
      gsap.to(cursor, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.3,
        ease: "power2.out",
      });
    };

    container.addEventListener("mousemove", handleMouseMove);
    return () => container.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Extract dynamic data with fallbacks
  const hero = pageData?.hero || {};
  const features = pageData?.features?.items || defaultFeatures;
  const featuresSection = pageData?.features || {};
  const howItWorks = pageData?.howItWorks || { steps: defaultSteps };
  const stats = hero?.stats || defaultStats;
  // Use fetched plans from Plans collection (managed by platform admin)
  const pricing =
    plans.length > 0
      ? plans.map((plan) => ({
          _id: plan._id,
          name: plan.name,
          price:
            plan.price === 0 ? "Custom" : `₹${plan.price.toLocaleString()}`,
          period:
            plan.price === 0
              ? ""
              : `/${plan.billingPeriod === "yearly" ? "year" : "month"}`,
          description: plan.description,
          features: plan.features,
          cta: plan.price === 0 ? "Contact Sales" : "Get Started",
          popular: plan.isPopular,
        }))
      : defaultPricing;
  const cta = pageData?.cta || {};
  const navigation = pageData?.navigation || {};
  const footer = pageData?.footer || {};

  // Navigation links
  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
    { label: "Testimonials", href: "#testimonials" },
    { label: "FAQs", href: "#faqs" },
  ];
  const navBrandName = navigation?.brandName || "Channel";
  const navBrandHighlight = navigation?.brandHighlight || "Partner";
  const navLoginText = navigation?.loginText || "Sign in";
  const navCtaText = navigation?.ctaText || "Get Started";
  const testimonials = pageData?.testimonials || { items: defaultTestimonials };
  const faqs = pageData?.faqs || { items: defaultFaqs };

  // Footer data - use quickLinks from backend or defaults
  // Handle migration from old format
  const getQuickLinks = () => {
    if (footer?.quickLinks?.length > 0) {
      return footer.quickLinks;
    }

    // Migrate old productLinks/companyLinks format
    const links = [];

    if (footer?.productLinks && Array.isArray(footer.productLinks)) {
      footer.productLinks.forEach(link => {
        if (typeof link === 'string') {
          links.push({ label: link, url: `#${link.toLowerCase()}` });
        }
      });
    }

    if (footer?.companyLinks && Array.isArray(footer.companyLinks)) {
      footer.companyLinks.forEach(link => {
        if (typeof link === 'string') {
          links.push({ label: link, url: `#${link.toLowerCase()}` });
        }
      });
    }

    if (links.length > 0) return links;

    // Defaults
    return [
      { label: "Features", url: "#features" },
      { label: "Pricing", url: "#pricing" },
      { label: "How It Works", url: "#how-it-works" },
      { label: "Testimonials", url: "#testimonials" },
      { label: "FAQs", url: "#faqs" },
    ];
  };

  const getLegalLinks = () => {
    if (footer?.legalLinks?.length > 0) {
      // Check if it's the old string format
      if (typeof footer.legalLinks[0] === 'string') {
        return footer.legalLinks.map(link => ({
          label: link,
          url: `#${link.toLowerCase()}`
        }));
      }
      return footer.legalLinks;
    }

    return [
      { label: "Privacy Policy", url: "#privacy" },
      { label: "Terms of Service", url: "#terms" },
      { label: "Cookie Policy", url: "#cookies" },
    ];
  };

  const getSocialLinks = () => {
    if (Array.isArray(footer?.socialLinks)) {
      return footer.socialLinks.filter(link => link.url);
    }

    // Migrate old object format
    if (footer?.socialLinks && typeof footer.socialLinks === 'object') {
      const links = [];
      if (footer.socialLinks.twitter) links.push({ platform: 'twitter', url: footer.socialLinks.twitter });
      if (footer.socialLinks.linkedin) links.push({ platform: 'linkedin', url: footer.socialLinks.linkedin });
      if (footer.socialLinks.facebook) links.push({ platform: 'facebook', url: footer.socialLinks.facebook });
      if (footer.socialLinks.instagram) links.push({ platform: 'instagram', url: footer.socialLinks.instagram });
      return links;
    }

    return [];
  };

  const quickLinks = getQuickLinks();
  const legalLinks = getLegalLinks();
  const socialLinksArray = getSocialLinks();

  // Get tagline (use description as fallback)
  const footerTagline = footer?.tagline || footer?.description || "The complete real estate partner management platform for modern businesses.";

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-2 border-white/10 rounded-full" />
          <div className="absolute inset-0 w-16 h-16 border-2 border-transparent border-t-violet-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#0A0A0F] text-white overflow-x-hidden"
    >
      <NoiseOverlay />

      {/* Cursor Glow - Desktop Only */}
      <div
        ref={cursorRef}
        className="hidden lg:block fixed w-96 h-96 pointer-events-none z-30 opacity-30"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
          transform: "translate(-50%, -50%)",
          left: 0,
          top: 0,
        }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-500">
        <div className="absolute inset-0 bg-[#0A0A0F]/80 backdrop-blur-xl border-b border-white/5" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <a
              href="#hero"
              className="flex items-center gap-2 sm:gap-3 cursor-pointer"
            >
              {navigation?.showLogo && navigation?.logo ? (
                <img
                  src={navigation.logo}
                  alt="Logo"
                  className="w-auto object-contain"
                  style={{ height: `${navigation?.logoWidth || 40}px`, maxWidth: '200px' }}
                />
              ) : (
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg sm:rounded-xl blur-lg opacity-60" />
                  <div className="relative w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                </div>
              )}
              {!(navigation?.showLogo && navigation?.logo) && (
                <span className="text-lg sm:text-xl font-semibold tracking-tight">
                  {navBrandName}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
                    {navBrandHighlight}
                  </span>
                </span>
              )}
            </a>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              {navLinks.map((item, i) => {
                const label = item.label;
                const href = item.href;
                return (
                  <a
                    key={i}
                    href={href}
                    className="text-sm text-white/60 hover:text-white transition-colors relative group"
                  >
                    {label}
                    <span className="absolute -bottom-1 left-0 w-0 h-px bg-gradient-to-r from-violet-400 to-indigo-400 group-hover:w-full transition-all duration-300" />
                  </a>
                );
              })}
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3 lg:gap-4">
              <button
                onClick={() => navigate("/login")}
                className="text-sm text-white/70 hover:text-white transition-colors px-3 lg:px-4 py-2"
              >
                {navLoginText}
              </button>
              <MagneticButton
                onClick={() => {
                  const link = hero?.primaryCtaLink;
                  if (link) {
                    if (link.startsWith('#')) {
                      document.querySelector(link)?.scrollIntoView({ behavior: 'smooth' });
                    } else if (link.startsWith('http')) {
                      window.open(link, '_blank');
                    } else {
                      navigate(link);
                    }
                  } else {
                    navigate("/register/company");
                  }
                }}
                className="relative group px-4 lg:px-5 py-2 lg:py-2.5 text-sm font-medium text-white rounded-lg overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600" />
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative flex items-center gap-2">
                  {navCtaText} <ArrowRight className="w-4 h-4" />
                </span>
              </MagneticButton>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-white/70 hover:text-white"
            >
              {menuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#0A0A0F]/95 backdrop-blur-xl border-b border-white/5"
            >
              <div className="px-4 py-4 space-y-3">
                {navLinks.map((item, i) => {
                  const label = item.label;
                  const href = item.href;
                  return (
                    <a
                      key={i}
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className="block py-2 text-white/70 hover:text-white"
                    >
                      {label}
                    </a>
                  );
                })}
                <hr className="border-white/10" />
                <button
                  onClick={() => navigate("/login")}
                  className="block w-full py-2 text-white/70 hover:text-white"
                >
                  {navLoginText}
                </button>
                <button
                  onClick={() => {
                    const link = hero?.primaryCtaLink;
                    if (link) {
                      if (link.startsWith('#')) {
                        document.querySelector(link)?.scrollIntoView({ behavior: 'smooth' });
                      } else if (link.startsWith('http')) {
                        window.open(link, '_blank');
                      } else {
                        navigate(link);
                      }
                    } else {
                      navigate("/register/company");
                    }
                    setMenuOpen(false);
                  }}
                  className="block w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg text-white font-medium"
                >
                  {navCtaText}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section
        id="hero"
        className="relative min-h-screen flex items-center pt-20 pb-4 lg:pt-20 lg:pb-8"
      >
        <GridBackground />
        <GlowingOrb className="hidden lg:block w-[600px] h-[600px] top-[-10%] left-[-10%]" />
        <GlowingOrb className="hidden lg:block w-[500px] h-[500px] bottom-[-5%] right-[-5%]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Column - Text */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="relative z-10"
            >
              {/* Badge */}
              {hero?.badge?.show !== false && (
                <motion.div
                  variants={fadeIn}
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/5 border border-white/10 mb-4 sm:mb-8"
                >
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-violet-400" />
                  <span className="text-xs sm:text-sm text-white/80">
                    {typeof hero?.badge === "object"
                      ? hero.badge.text
                      : hero?.badge || "Trusted by 200+ real estate leaders"}
                  </span>
                </motion.div>
              )}

              {/* Headline */}
              <motion.h1
                variants={fadeInUp}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight sm:leading-[1.1] tracking-tight mb-4 sm:mb-6"
              >
                <span className="block">
                  {hero?.title?.split("partner")[0] || "Transform your"}
                </span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400">
                  partner
                </span>
                <span className="block">
                  {hero?.title
                    ?.split("partner")[1]
                    ?.replace("ecosystem", "")
                    .trim() || "ecosystem"}
                </span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                variants={fadeInUp}
                className="text-base sm:text-lg text-white/50 max-w-xl mb-6 sm:mb-10 leading-relaxed"
              >
                {hero?.subtitle ||
                  "The complete real estate partner management platform. Onboard partners, manage properties, and track commissions."}
              </motion.p>

              {/* CTA Buttons */}
              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4">
                <MagneticButton
                  onClick={() => {
                    const link = hero?.primaryCtaLink;
                    if (link) {
                      if (link.startsWith('#')) {
                        document.querySelector(link)?.scrollIntoView({ behavior: 'smooth' });
                      } else if (link.startsWith('http')) {
                        window.open(link, '_blank');
                      } else {
                        navigate(link);
                      }
                    } else {
                      navigate("/register/company");
                    }
                  }}
                  className="relative group px-8 sm:px-12 py-3.5 sm:py-4 rounded-lg sm:rounded-xl overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600" />
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative flex items-center justify-center gap-2 text-white font-medium text-sm sm:text-base">
                    {hero?.primaryCta || "Start Free Trial"}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </MagneticButton>
                {hero?.secondaryCta && (
                  <MagneticButton
                    onClick={() => {
                      const link = hero?.secondaryCtaLink;
                      if (link) {
                        if (link.startsWith('#')) {
                          document.querySelector(link)?.scrollIntoView({ behavior: 'smooth' });
                        } else if (link.startsWith('http')) {
                          window.open(link, '_blank');
                        } else {
                          navigate(link);
                        }
                      } else {
                        navigate("/login");
                      }
                    }}
                    className="relative group px-8 sm:px-12 py-3.5 sm:py-4 rounded-lg sm:rounded-xl overflow-hidden border border-white/10 hover:border-white/20 bg-white/5"
                  >
                    <span className="relative flex items-center justify-center gap-2 text-white font-medium text-sm sm:text-base">
                      {hero?.secondaryCta}
                      <ArrowUpRight className="w-4 h-4" />
                    </span>
                  </MagneticButton>
                )}
              </motion.div>
            </motion.div>

            {/* Right Column - Visual - Desktop Only */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="relative hidden lg:block"
            >
              <div className="relative">
                <div className="relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] rounded-3xl border border-white/10 p-6 backdrop-blur-xl">
                  <div className="absolute -inset-px bg-gradient-to-br from-violet-500/20 to-indigo-500/20 rounded-3xl blur-xl opacity-50" />
                  <div className="relative space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500" />
                        <div>
                          <div className="h-3 w-24 bg-white/20 rounded" />
                          <div className="h-2 w-16 bg-white/10 rounded mt-1" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white/5" />
                        <div className="w-8 h-8 rounded-lg bg-white/5" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Properties", value: "248", change: "+12%" },
                        { label: "Partners", value: "156", change: "+8%" },
                        { label: "Revenue", value: "₹2.4Cr", change: "+24%" },
                      ].map((s, i) => (
                        <div key={i} className="bg-white/5 rounded-xl p-3">
                          <div className="text-xs text-white/40 mb-1">
                            {s.label}
                          </div>
                          <div className="text-lg font-semibold">{s.value}</div>
                          <div className="text-xs text-emerald-400">
                            {s.change}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="h-32 bg-white/5 rounded-xl flex items-end justify-between p-4 gap-2">
                      {[40, 65, 45, 80, 55, 70, 90, 60, 85, 75, 95, 70].map(
                        (h, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-gradient-to-t from-violet-500/50 to-violet-500 rounded-t"
                            style={{ height: `${h}%` }}
                          />
                        ),
                      )}
                    </div>
                  </div>
                </div>
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="hidden xl:block absolute left-0 xl:left-[-3rem] top-1/4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-4 shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        Partner Verified
                      </div>
                      <div className="text-xs text-white/40">KYC Complete</div>
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="hidden xl:block absolute right-0 xl:right-[-2rem] bottom-1/4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-4 shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">₹4.2L</div>
                      <div className="text-xs text-white/40">
                        Commission Paid
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Stats - Centered on full page */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="mt-12 sm:mt-16 pt-8 sm:pt-10 border-t border-white/5"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 max-w-3xl mx-auto text-center">
              {stats.map((stat, i) => (
                <div key={i}>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">
                    <AnimatedCounter value={stat.value} />
                  </div>
                  <div className="text-xs sm:text-sm text-white/40">
                    {stat.description || stat.label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator - Desktop Only */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="hidden lg:flex absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-xs text-white/30 tracking-widest uppercase">
              Scroll
            </span>
            <ChevronDown className="w-5 h-5 text-white/30" />
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <RevealSection id="features" className="relative py-12 lg:py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/5 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12 lg:mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-4 sm:mb-6"
            >
              <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-violet-400" />
              <span className="text-xs sm:text-sm text-violet-300">
                {featuresSection?.badge || "Platform Capabilities"}
              </span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6"
            >
              {featuresSection?.title?.split("scale")[0] || "Built for"}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
                {featuresSection?.title?.includes("scale") ? "scale" : "scale"}
              </span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-base sm:text-lg text-white/40 max-w-2xl mx-auto px-4 lg:px-0"
            >
              {featuresSection?.subtitle ||
                "Enterprise-grade infrastructure with consumer-grade simplicity. Everything you need to manage partners at scale."}
            </motion.p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, index) => {
              // Cycle through gradient colors based on index
              const gradients = [
                "from-violet-500 to-purple-500",
                "from-blue-500 to-cyan-500",
                "from-emerald-500 to-teal-500",
                "from-orange-500 to-red-500",
                "from-pink-500 to-rose-500",
                "from-indigo-500 to-blue-500",
              ];
              const gradient = gradients[index % gradients.length];

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] rounded-2xl border border-white/10 p-5 sm:p-6 relative overflow-hidden group hover:border-white/20 transition-colors"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 sm:mb-4`}
                    >
                      <IconRenderer
                        icon={feature.icon}
                        className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                      />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-white/50">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </RevealSection>

      {/* How It Works Section */}
      {howItWorks?.steps?.length > 0 && (
        <RevealSection
          id="how-it-works"
          className="relative py-12 lg:py-20 bg-[#0F0F1A]"
        >
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 lg:mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4 sm:mb-6"
              >
                <span className="text-xs sm:text-sm text-purple-300">
                  {howItWorks?.badge || "Simple Process"}
                </span>
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6"
              >
                {howItWorks?.title?.split("four")[0] || "Get started in"}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                  {howItWorks?.title?.includes("four")
                    ? "four steps"
                    : "four steps"}
                </span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-base sm:text-lg text-white/40 max-w-2xl mx-auto px-4 lg:px-0"
              >
                {howItWorks?.subtitle ||
                  "Get your real estate business running with our streamlined onboarding."}
              </motion.p>
            </div>
            <div className="relative hidden lg:block absolute top-12 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {howItWorks.steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="relative text-center"
                >
                  <div className="relative inline-flex mb-4 sm:mb-6">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl sm:text-3xl">
                      {step.icon}
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-[10px] sm:text-xs font-bold text-white">
                      {step.number}
                    </div>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-white/50">
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </RevealSection>
      )}

      {/* Pricing Section */}
      <RevealSection id="pricing" className="relative py-12 lg:py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4 sm:mb-6"
            >
              <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-400" />
              <span className="text-xs sm:text-sm text-indigo-300">
                Transparent Pricing
              </span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6"
            >
              Simple, predictable{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
                pricing
              </span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-base sm:text-lg text-white/40 max-w-2xl mx-auto px-4 lg:px-0"
            >
              No hidden fees. No surprises. All plans include core features and
              premium support.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {pricing.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`relative rounded-2xl sm:rounded-3xl p-5 sm:p-6 ${plan.popular ? "bg-gradient-to-br from-violet-600/30 to-indigo-600/30 border-2 border-violet-500/50" : "bg-white/[0.05] border border-white/10"}`}
              >
                {plan.popular && (
                  <div className="absolute -top-2 sm:-top-3 left-1/2 -translate-x-1/2">
                    <div className="px-2 sm:px-3 py-0.5 sm:py-1 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap">
                      Most Popular
                    </div>
                  </div>
                )}
                <div className="text-center mb-4 sm:mb-6">
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl sm:text-4xl font-bold">
                      {plan.price}
                    </span>
                    <span className="text-white/40 text-sm">{plan.period}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-white/40 mt-2">
                    {plan.description}
                  </p>
                </div>
                <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                  {plan.features.map((feature, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-xs sm:text-sm text-white/60"
                    >
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <MagneticButton
                  onClick={() => navigate("/register/company")}
                  className={`w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base ${plan.popular ? "bg-white text-gray-900 hover:bg-white/90" : "bg-white/10 hover:bg-white/20 text-white"}`}
                >
                  {plan.cta}
                </MagneticButton>
              </motion.div>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* Testimonials Section */}
      {testimonials?.items?.length > 0 && (
        <RevealSection
          id="testimonials"
          className="relative py-12 lg:py-20 bg-[#0F0F1A]"
        >
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 lg:mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4 sm:mb-6"
              >
                <span className="text-xs sm:text-sm text-emerald-300">
                  {testimonials?.badge || "Testimonials"}
                </span>
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6"
              >
                {testimonials?.title || "Trusted by industry leaders"}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-base sm:text-lg text-white/40 max-w-2xl mx-auto px-4 lg:px-0"
              >
                {testimonials?.subtitle ||
                  "See what our partners say about their experience."}
              </motion.p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {testimonials.items.map((testimonial, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] rounded-2xl border border-white/10 p-5 sm:p-6 overflow-hidden cursor-pointer hover:border-white/20 transition-colors"
                  onClick={() => setSelectedTestimonial(testimonial)}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm sm:text-base flex-shrink-0">
                      {testimonial.author?.charAt(0) || "U"}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-white truncate">
                        {testimonial.author || "Anonymous"}
                      </h4>
                      <p className="text-xs sm:text-sm text-white/50 truncate">
                        {testimonial.role}
                        {testimonial.company ? `, ${testimonial.company}` : ""}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm sm:text-base text-white/70 italic line-clamp-4 break-words">
                    "{testimonial.quote}"
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </RevealSection>
      )}

      {/* Testimonial Modal */}
      <AnimatePresence>
        {selectedTestimonial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedTestimonial(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0F0F1A] rounded-2xl border border-white/10 p-6 sm:p-8 max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                  {selectedTestimonial.author?.charAt(0) || "U"}
                </div>
                <div className="min-w-0">
                  <h4 className="text-lg font-semibold text-white">
                    {selectedTestimonial.author || "Anonymous"}
                  </h4>
                  <p className="text-sm text-white/50">
                    {selectedTestimonial.role}
                    {selectedTestimonial.company ? `, ${selectedTestimonial.company}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTestimonial(null)}
                  className="ml-auto text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="relative">
                <Quote className="absolute -top-2 -left-1 w-8 h-8 text-violet-500/20" />
                <p className="text-base text-white/80 italic pl-8">
                  "{selectedTestimonial.quote}"
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAQs Section */}
      {faqs?.items?.length > 0 && (
        <RevealSection id="faqs" className="relative py-12 lg:py-20">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/5 to-transparent" />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 lg:mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-4 sm:mb-6"
              >
                <span className="text-xs sm:text-sm text-violet-300">
                  {faqs?.badge || "FAQs"}
                </span>
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6"
              >
                {faqs?.title || "Frequently asked questions"}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-base sm:text-lg text-white/40 max-w-2xl mx-auto px-4 lg:px-0"
              >
                {faqs?.subtitle ||
                  "Everything you need to know about ChannelPartner."}
              </motion.p>
            </div>
            <div className="space-y-4">
              {faqs.items.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white/[0.05] rounded-xl border border-white/10 overflow-hidden"
                >
                  <details className="group">
                    <summary className="flex items-center justify-between p-4 sm:p-5 cursor-pointer list-none">
                      <h3 className="text-sm sm:text-base font-medium text-white pr-4">
                        {faq.question}
                      </h3>
                      <div className="flex-shrink-0 w-5 h-5 text-white/50 group-open:rotate-180 transition-transform">
                        <svg
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </summary>
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0">
                      <p className="text-sm sm:text-base text-white/60">
                        {faq.answer}
                      </p>
                    </div>
                  </details>
                </motion.div>
              ))}
            </div>
          </div>
        </RevealSection>
      )}

      {/* CTA Section */}
      <RevealSection
        id="cta"
        className="relative py-12 lg:py-20 overflow-hidden"
      >
        <GlowingOrb className="hidden lg:block w-[800px] h-[800px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6 sm:space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/5 border border-white/10">
              <Globe className="w-3 h-3 sm:w-4 sm:h-4 text-violet-400" />
              <span className="text-xs sm:text-sm text-white/60">
                {cta?.badge || "India & Dubai Markets"}
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold px-4 lg:px-0">
              {cta?.title || "Ready to transform your business?"}
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-white/40 max-w-2xl mx-auto px-4 lg:px-0">
              {cta?.subtitle ||
                "Join hundreds of forward-thinking real estate companies already scaling with ChannelPartner."}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4 lg:px-0">
              <MagneticButton
                onClick={() => {
                  const link = cta?.primaryCtaLink;
                  if (link) {
                    if (link.startsWith('#')) {
                      document.querySelector(link)?.scrollIntoView({ behavior: 'smooth' });
                    } else if (link.startsWith('http')) {
                      window.open(link, '_blank');
                    } else {
                      navigate(link);
                    }
                  } else {
                    navigate("/register/company");
                  }
                }}
                className="relative group px-6 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl overflow-hidden w-full sm:w-auto"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600" />
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative flex items-center justify-center gap-2 text-white font-medium text-sm sm:text-base">
                  {cta?.primaryCta || "Start Free Trial"}
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </MagneticButton>
              <button
                onClick={() => {
                  const link = cta?.secondaryCtaLink;
                  if (link) {
                    if (link.startsWith('#')) {
                      document.querySelector(link)?.scrollIntoView({ behavior: 'smooth' });
                    } else if (link.startsWith('http')) {
                      window.open(link, '_blank');
                    } else {
                      navigate(link);
                    }
                  } else {
                    navigate("/login");
                  }
                }}
                className="px-6 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-sm sm:text-base w-full sm:w-auto"
              >
                {cta?.secondaryCta || "Talk to Sales"}
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      </RevealSection>

      {/* Footer */}
      <footer className="py-12 bg-slate-900 text-slate-400 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                {footer?.showLogo && footer?.logo ? (
                  <img
                    src={footer.logo}
                    alt="Logo"
                    className="w-auto object-contain"
                    style={{ height: `${footer?.logoWidth || 40}px`, maxWidth: '200px' }}
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                )}
                {!(footer?.showLogo && footer?.logo) && (
                  <span className="text-xl font-semibold text-white">
                    {footer?.brandName || "Channel"}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
                      {footer?.brandHighlight || "Partner"}
                    </span>
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm mb-4 max-w-sm">
                {footerTagline}
              </p>
              {footer?.supportEmail && (
                <a
                  href={`mailto:${footer.supportEmail}`}
                  className="text-slate-400 hover:text-white text-sm flex items-center gap-2 transition"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  {footer.supportEmail}
                </a>
              )}
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                {quickLinks.map((link, i) => (
                  <li key={i}>
                    <a
                      href={link.url}
                      className="text-slate-400 hover:text-white text-sm transition"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Social Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Follow Us</h4>
              <div className="flex gap-3">
                {socialLinksArray.length === 0 ? (
                  <span className="text-slate-500 text-sm">
                    No social links configured
                  </span>
                ) : (
                  socialLinksArray.map((link, index) => {
                    const SocialIcon = socialIconMap[link.platform] || Globe;
                    return (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition"
                        aria-label={link.platform}
                      >
                        <SocialIcon className="w-4 h-4" />
                      </a>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              {footer?.copyright || `© ${new Date().getFullYear()} ChannelPartner. All rights reserved.`}
            </p>
            <div className="flex gap-6 text-xs">
              {legalLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  className="hover:text-white transition"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
