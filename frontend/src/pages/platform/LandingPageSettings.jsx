import { useState, useEffect } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { sidebarConfig } from "../../config/sidebar";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import {
  Twitter,
  Linkedin,
  Facebook,
  Instagram,
  Youtube,
  Github,
  Globe,
  Link as LinkIcon,
  Plus,
  X
} from "lucide-react";

const LandingPageSettings = () => {
  const { user } = useAuth();
  const config = sidebarConfig.platform_admin;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("hero");

  const [formData, setFormData] = useState({
    hero: {
      badge: { text: "", show: true },
      title: "",
      highlightWord: "",
      subtitle: "",
      primaryCta: "",
      primaryCtaLink: "",
      secondaryCta: "",
      secondaryCtaLink: "",
      stats: [],
    },
    features: {
      badge: "",
      title: "",
      subtitle: "",
      items: [],
    },
    howItWorks: {
      badge: "",
      title: "",
      subtitle: "",
      steps: [],
    },
    cta: {
      badge: "",
      title: "",
      subtitle: "",
      primaryCta: "",
      primaryCtaLink: "",
      secondaryCta: "",
      secondaryCtaLink: "",
    },
    footer: {
      brandName: "",
      brandHighlight: "",
      tagline: "",
      supportEmail: "",
      copyright: "",
      quickLinks: [], // Array of {label, url}
      legalLinks: [], // Array of {label, url}
      socialLinks: [], // Array of {platform, url}
    },
    navigation: {
      brandName: "",
      brandHighlight: "",
      loginText: "",
      ctaText: "",
      links: [],
    },
    testimonials: {
      badge: "",
      title: "",
      subtitle: "",
      items: [],
    },
    faqs: {
      badge: "",
      title: "",
      subtitle: "",
      items: [],
    },
  });

  useEffect(() => {
    fetchLandingPage();
  }, []);

  const fetchLandingPage = async () => {
    try {
      setLoading(true);
      const response = await api.get("/landing");
      if (response.data.data?.landingPage) {
        const lp = response.data.data.landingPage;

        // Migrate old footer format to new format
        let footerData = lp.footer || {};

        // Convert old productLinks/companyLinks strings to quickLinks objects
        if (!footerData.quickLinks || footerData.quickLinks.length === 0) {
          const quickLinks = [];

          // Migrate productLinks
          if (footerData.productLinks && Array.isArray(footerData.productLinks)) {
            footerData.productLinks.forEach(link => {
              if (typeof link === 'string') {
                quickLinks.push({ label: link, url: `#${link.toLowerCase()}` });
              }
            });
          }

          // Migrate companyLinks
          if (footerData.companyLinks && Array.isArray(footerData.companyLinks)) {
            footerData.companyLinks.forEach(link => {
              if (typeof link === 'string') {
                quickLinks.push({ label: link, url: `#${link.toLowerCase()}` });
              }
            });
          }

          footerData.quickLinks = quickLinks;
        }

        // Convert old legalLinks strings to objects
        if (footerData.legalLinks && footerData.legalLinks.length > 0) {
          if (typeof footerData.legalLinks[0] === 'string') {
            footerData.legalLinks = footerData.legalLinks.map(link => ({
              label: link,
              url: `#${link.toLowerCase()}`
            }));
          }
        }

        // Migrate old socialLinks object format to array format
        if (footerData.socialLinks && !Array.isArray(footerData.socialLinks)) {
          const socialArray = [];
          const oldSocial = footerData.socialLinks;
          if (oldSocial.twitter) socialArray.push({ platform: 'twitter', url: oldSocial.twitter });
          if (oldSocial.linkedin) socialArray.push({ platform: 'linkedin', url: oldSocial.linkedin });
          if (oldSocial.facebook) socialArray.push({ platform: 'facebook', url: oldSocial.facebook });
          if (oldSocial.instagram) socialArray.push({ platform: 'instagram', url: oldSocial.instagram });
          footerData.socialLinks = socialArray;
        }

        // Migrate description to tagline
        if (!footerData.tagline && footerData.description) {
          footerData.tagline = footerData.description;
        }

        setFormData({
          hero: lp.hero || formData.hero,
          features: lp.features || formData.features,
          howItWorks: lp.howItWorks || formData.howItWorks,
          cta: lp.cta || formData.cta,
          footer: footerData,
          navigation: lp.navigation || formData.navigation,
          testimonials: lp.testimonials || formData.testimonials,
          faqs: lp.faqs || formData.faqs,
        });
      }
    } catch (err) {
      setError("Failed to load landing page settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await api.put("/landing", formData);
      setSuccess("Landing page updated successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update landing page");
    } finally {
      setSaving(false);
    }
  };

  const updateHero = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      hero: { ...prev.hero, [field]: value },
    }));
  };

  const updateFeatures = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      features: { ...prev.features, [field]: value },
    }));
  };

  const updateHowItWorks = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      howItWorks: { ...prev.howItWorks, [field]: value },
    }));
  };

  const updateCta = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      cta: { ...prev.cta, [field]: value },
    }));
  };

  const updateFooter = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      footer: { ...prev.footer, [field]: value },
    }));
  };

  const updateNavigation = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      navigation: { ...prev.navigation, [field]: value },
    }));
  };

  const updateTestimonials = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      testimonials: { ...prev.testimonials, [field]: value },
    }));
  };

  // Stats handlers
  const addStat = () => {
    setFormData((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        stats: [...prev.hero.stats, { value: "", label: "", description: "" }],
      },
    }));
  };

  const updateStat = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        stats: prev.hero.stats.map((stat, i) =>
          i === index ? { ...stat, [field]: value } : stat,
        ),
      },
    }));
  };

  const removeStat = (index) => {
    setFormData((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        stats: prev.hero.stats.filter((_, i) => i !== index),
      },
    }));
  };

  // Feature handlers
  const addFeature = () => {
    setFormData((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        items: [
          ...prev.features.items,
          {
            icon: "building",
            title: "",
            description: "",
            gradient: "from-indigo-500 to-purple-500",
          },
        ],
      },
    }));
  };

  const updateFeature = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        items: prev.features.items.map((feature, i) =>
          i === index ? { ...feature, [field]: value } : feature,
        ),
      },
    }));
  };

  const removeFeature = (index) => {
    setFormData((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        items: prev.features.items.filter((_, i) => i !== index),
      },
    }));
  };

  // Step handlers
  const addStep = () => {
    setFormData((prev) => ({
      ...prev,
      howItWorks: {
        ...prev.howItWorks,
        steps: [
          ...prev.howItWorks.steps,
          {
            number: String(prev.howItWorks.steps.length + 1).padStart(2, "0"),
            title: "",
            description: "",
            icon: "✨",
          },
        ],
      },
    }));
  };

  const updateStep = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      howItWorks: {
        ...prev.howItWorks,
        steps: prev.howItWorks.steps.map((step, i) =>
          i === index ? { ...step, [field]: value } : step,
        ),
      },
    }));
  };

  const removeStep = (index) => {
    setFormData((prev) => ({
      ...prev,
      howItWorks: {
        ...prev.howItWorks,
        steps: prev.howItWorks.steps.filter((_, i) => i !== index),
      },
    }));
  };

  const iconOptions = [
    { value: "building", label: "Building" },
    { value: "users", label: "Users" },
    { value: "money", label: "Money" },
    { value: "calendar", label: "Calendar" },
    { value: "document", label: "Document" },
    { value: "chart", label: "Chart" },
  ];

  // Navigation link handlers
  const addNavLink = () => {
    setFormData((prev) => ({
      ...prev,
      navigation: {
        ...prev.navigation,
        links: [...(prev.navigation.links || []), { label: "", href: "" }],
      },
    }));
  };

  const updateNavLink = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      navigation: {
        ...prev.navigation,
        links: prev.navigation.links.map((link, i) =>
          i === index ? { ...link, [field]: value } : link,
        ),
      },
    }));
  };

  const removeNavLink = (index) => {
    setFormData((prev) => ({
      ...prev,
      navigation: {
        ...prev.navigation,
        links: prev.navigation.links.filter((_, i) => i !== index),
      },
    }));
  };

  // Testimonial handlers
  const addTestimonial = () => {
    setFormData((prev) => ({
      ...prev,
      testimonials: {
        ...prev.testimonials,
        items: [
          ...(prev.testimonials.items || []),
          { quote: "", author: "", role: "", company: "", avatar: "" },
        ],
      },
    }));
  };

  const updateTestimonial = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      testimonials: {
        ...prev.testimonials,
        items: prev.testimonials.items.map((item, i) =>
          i === index ? { ...item, [field]: value } : item,
        ),
      },
    }));
  };

  const removeTestimonial = (index) => {
    setFormData((prev) => ({
      ...prev,
      testimonials: {
        ...prev.testimonials,
        items: prev.testimonials.items.filter((_, i) => i !== index),
      },
    }));
  };

  // FAQs handlers
  const updateFaqs = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      faqs: { ...prev.faqs, [field]: value },
    }));
  };

  const addFaq = () => {
    setFormData((prev) => ({
      ...prev,
      faqs: {
        ...prev.faqs,
        items: [
          ...(prev.faqs.items || []),
          { question: "", answer: "", category: "general" },
        ],
      },
    }));
  };

  const updateFaq = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      faqs: {
        ...prev.faqs,
        items: prev.faqs.items.map((item, i) =>
          i === index ? { ...item, [field]: value } : item,
        ),
      },
    }));
  };

  const removeFaq = (index) => {
    setFormData((prev) => ({
      ...prev,
      faqs: {
        ...prev.faqs,
        items: prev.faqs.items.filter((_, i) => i !== index),
      },
    }));
  };

  const gradientOptions = [
    { value: "from-indigo-500 to-purple-500", label: "Indigo to Purple" },
    { value: "from-blue-500 to-cyan-500", label: "Blue to Cyan" },
    { value: "from-emerald-500 to-teal-500", label: "Emerald to Teal" },
    { value: "from-orange-500 to-red-500", label: "Orange to Red" },
    { value: "from-purple-500 to-pink-500", label: "Purple to Pink" },
    { value: "from-rose-500 to-pink-500", label: "Rose to Pink" },
  ];

  const sectionLinkOptions = [
    { label: "Hero", value: "#hero" },
    { label: "Features", value: "#features" },
    { label: "How It Works", value: "#how-it-works" },
    { label: "Pricing", value: "#pricing" },
    { label: "Testimonials", value: "#testimonials" },
    { label: "FAQs", value: "#faqs" },
    { label: "CTA", value: "#cta" },
  ];

  // Legal page link options for footer
  const legalPageOptions = [
    { label: "Privacy Policy", value: "/privacy-policy" },
    { label: "Terms of Service", value: "/terms-of-service" },
    { label: "Cookie Policy", value: "/cookie-policy" },
  ];

  // Check if a URL is a legal page link
  const isLegalPageLink = (url) => legalPageOptions.some(opt => opt.value === url);

  // Social platform options with icons
  const socialPlatformOptions = [
    { value: "twitter", label: "Twitter (X)", icon: Twitter },
    { value: "linkedin", label: "LinkedIn", icon: Linkedin },
    { value: "facebook", label: "Facebook", icon: Facebook },
    { value: "instagram", label: "Instagram", icon: Instagram },
    { value: "youtube", label: "YouTube", icon: Youtube },
    { value: "github", label: "GitHub", icon: Github },
  ];

  // Social link handlers
  const addSocialLink = () => {
    setFormData((prev) => ({
      ...prev,
      footer: {
        ...prev.footer,
        socialLinks: [...(prev.footer.socialLinks || []), { platform: "twitter", url: "" }],
      },
    }));
  };

  const updateSocialLink = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      footer: {
        ...prev.footer,
        socialLinks: prev.footer.socialLinks.map((link, i) =>
          i === index ? { ...link, [field]: value } : link
        ),
      },
    }));
  };

  const removeSocialLink = (index) => {
    setFormData((prev) => ({
      ...prev,
      footer: {
        ...prev.footer,
        socialLinks: prev.footer.socialLinks.filter((_, i) => i !== index),
      },
    }));
  };

  // Quick Links handlers
  const addQuickLink = () => {
    setFormData((prev) => ({
      ...prev,
      footer: {
        ...prev.footer,
        quickLinks: [...(prev.footer.quickLinks || []), { label: "", url: "" }],
      },
    }));
  };

  const updateQuickLink = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      footer: {
        ...prev.footer,
        quickLinks: prev.footer.quickLinks.map((link, i) =>
          i === index ? { ...link, [field]: value } : link
        ),
      },
    }));
  };

  const removeQuickLink = (index) => {
    setFormData((prev) => ({
      ...prev,
      footer: {
        ...prev.footer,
        quickLinks: prev.footer.quickLinks.filter((_, i) => i !== index),
      },
    }));
  };

  // Legal Links handlers
  const addLegalLink = () => {
    setFormData((prev) => ({
      ...prev,
      footer: {
        ...prev.footer,
        legalLinks: [...(prev.footer.legalLinks || []), { label: "", url: "" }],
      },
    }));
  };

  const updateLegalLink = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      footer: {
        ...prev.footer,
        legalLinks: prev.footer.legalLinks.map((link, i) =>
          i === index ? { ...link, [field]: value } : link
        ),
      },
    }));
  };

  const removeLegalLink = (index) => {
    setFormData((prev) => ({
      ...prev,
      footer: {
        ...prev.footer,
        legalLinks: prev.footer.legalLinks.filter((_, i) => i !== index),
      },
    }));
  };

  // Check if a link is a section anchor
  const isSectionLink = (link) => link && link.startsWith("#");

  // Get display value for CTA link input
  const getCtaLinkDisplay = (link) => {
    if (!link) return "";
    if (isSectionLink(link)) {
      const option = sectionLinkOptions.find(opt => opt.value === link);
      return option ? option.label : link;
    }
    return link;
  };

  if (loading) {
    return (
      <DashboardLayout
        sidebarLinks={config.links}
        title="Landing Page"
        subtitle="Loading..."
        color={config.color}
      >
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebarLinks={config.links}
      title="Landing Page Settings"
      subtitle="Manage your public landing page"
      color={config.color}
    >
      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-4 -mb-px flex-wrap">
          {[
            "hero",
            "features",
            "howItWorks",
            "testimonials",
            "faqs",
            "cta",
            "navigation",
            "footer",
          ].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "howItWorks"
                ? "How It Works"
                : tab === "faqs"
                  ? "FAQs"
                  : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Hero Section */}
      {activeTab === "hero" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Hero Section</h3>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="showBadge"
              checked={formData.hero.badge?.show}
              onChange={(e) =>
                updateHero("badge", {
                  ...formData.hero.badge,
                  show: e.target.checked,
                })
              }
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <label
              htmlFor="showBadge"
              className="text-sm font-medium text-gray-700"
            >
              Show badge
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Badge Text
            </label>
            <input
              type="text"
              value={formData.hero.badge?.text || ""}
              onChange={(e) =>
                updateHero("badge", {
                  ...formData.hero.badge,
                  text: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={formData.hero.title}
              onChange={(e) => updateHero("title", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Highlight Word (gradient text)
            </label>
            <input
              type="text"
              value={formData.hero.highlightWord}
              onChange={(e) => updateHero("highlightWord", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subtitle
            </label>
            <textarea
              value={formData.hero.subtitle}
              onChange={(e) => updateHero("subtitle", e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary CTA</label>
              <input
                type="text"
                value={formData.hero.primaryCta}
                onChange={(e) => updateHero('primaryCta', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secondary CTA</label>
              <input
                type="text"
                value={formData.hero.secondaryCta}
                onChange={(e) => updateHero('secondaryCta', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div> */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary CTA
              </label>

              <input
                type="text"
                placeholder="Button Text"
                value={formData.hero.primaryCta}
                onChange={(e) => updateHero("primaryCta", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2"
              />

              <div className="space-y-2">
                <select
                  value={isSectionLink(formData.hero.primaryCtaLink) ? formData.hero.primaryCtaLink : ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      updateHero("primaryCtaLink", e.target.value);
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Select Section Link...</option>
                  {sectionLinkOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">or custom URL:</span>
                  <input
                    type="text"
                    placeholder="https://example.com"
                    value={!isSectionLink(formData.hero.primaryCtaLink) ? formData.hero.primaryCtaLink || "" : ""}
                    onChange={(e) => updateHero("primaryCtaLink", e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secondary CTA
              </label>

              <input
                type="text"
                placeholder="Button Text"
                value={formData.hero.secondaryCta}
                onChange={(e) => updateHero("secondaryCta", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2"
              />

              <div className="space-y-2">
                <select
                  value={isSectionLink(formData.hero.secondaryCtaLink) ? formData.hero.secondaryCtaLink : ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      updateHero("secondaryCtaLink", e.target.value);
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Select Section Link...</option>
                  {sectionLinkOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">or custom URL:</span>
                  <input
                    type="text"
                    placeholder="https://example.com"
                    value={!isSectionLink(formData.hero.secondaryCtaLink) ? formData.hero.secondaryCtaLink || "" : ""}
                    onChange={(e) => updateHero("secondaryCtaLink", e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Stats
              </label>
              <button
                onClick={addStat}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                + Add Stat
              </button>
            </div>
            <div className="space-y-3">
              {formData.hero.stats?.map((stat, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <input
                    type="text"
                    placeholder="Value (e.g., 500+)"
                    value={stat.value}
                    onChange={(e) => updateStat(index, "value", e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Label"
                    value={stat.label}
                    onChange={(e) => updateStat(index, "label", e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={stat.description}
                    onChange={(e) =>
                      updateStat(index, "description", e.target.value)
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={() => removeStat(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Features Section */}
      {activeTab === "features" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Features Section
          </h3>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Badge
              </label>
              <input
                type="text"
                value={formData.features.badge}
                onChange={(e) => updateFeatures("badge", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={formData.features.title}
                onChange={(e) => updateFeatures("title", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subtitle
            </label>
            <textarea
              value={formData.features.subtitle}
              onChange={(e) => updateFeatures("subtitle", e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Features */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Features
              </label>
              <button
                onClick={addFeature}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                + Add Feature
              </button>
            </div>
            <div className="space-y-4">
              {formData.features.items?.map((feature, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-lg space-y-3"
                >
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Feature {index + 1}
                    </span>
                    <button
                      onClick={() => removeFeature(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={feature.title}
                        onChange={(e) =>
                          updateFeature(index, "title", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Gradient
                      </label>
                      <select
                        value={feature.gradient}
                        onChange={(e) =>
                          updateFeature(index, "gradient", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        {gradientOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Description
                    </label>
                    <textarea
                      value={feature.description}
                      onChange={(e) =>
                        updateFeature(index, "description", e.target.value)
                      }
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* How It Works Section */}
      {activeTab === "howItWorks" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">
            How It Works Section
          </h3>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Badge
              </label>
              <input
                type="text"
                value={formData.howItWorks.badge}
                onChange={(e) => updateHowItWorks("badge", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={formData.howItWorks.title}
                onChange={(e) => updateHowItWorks("title", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subtitle
            </label>
            <textarea
              value={formData.howItWorks.subtitle}
              onChange={(e) => updateHowItWorks("subtitle", e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Steps
              </label>
              <button
                onClick={addStep}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                + Add Step
              </button>
            </div>
            <div className="space-y-4">
              {formData.howItWorks.steps?.map((step, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-lg space-y-3"
                >
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Step {step.number}
                    </span>
                    <button
                      onClick={() => removeStep(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) =>
                          updateStep(index, "title", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Icon (emoji)
                      </label>
                      <input
                        type="text"
                        value={step.icon}
                        onChange={(e) =>
                          updateStep(index, "icon", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Description
                    </label>
                    <textarea
                      value={step.description}
                      onChange={(e) =>
                        updateStep(index, "description", e.target.value)
                      }
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CTA Section */}
      {activeTab === "cta" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Call to Action Section
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Badge
            </label>
            <input
              type="text"
              value={formData.cta.badge}
              onChange={(e) => updateCta("badge", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={formData.cta.title}
              onChange={(e) => updateCta("title", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subtitle
            </label>
            <textarea
              value={formData.cta.subtitle}
              onChange={(e) => updateCta("subtitle", e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary CTA
              </label>
              <input
                type="text"
                value={formData.cta.primaryCta}
                onChange={(e) => updateCta("primaryCta", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secondary CTA
              </label>
              <input
                type="text"
                value={formData.cta.secondaryCta}
                onChange={(e) => updateCta("secondaryCta", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div> */}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary CTA
              </label>

              <input
                type="text"
                placeholder="Button Text"
                value={formData.cta.primaryCta}
                onChange={(e) => updateCta("primaryCta", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2"
              />

              <div className="space-y-2">
                <select
                  value={isSectionLink(formData.cta.primaryCtaLink) ? formData.cta.primaryCtaLink : ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      updateCta("primaryCtaLink", e.target.value);
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Select Section Link...</option>
                  {sectionLinkOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">or custom URL:</span>
                  <input
                    type="text"
                    placeholder="https://example.com"
                    value={!isSectionLink(formData.cta.primaryCtaLink) ? formData.cta.primaryCtaLink || "" : ""}
                    onChange={(e) => updateCta("primaryCtaLink", e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secondary CTA
              </label>

              <input
                type="text"
                placeholder="Button Text"
                value={formData.cta.secondaryCta}
                onChange={(e) => updateCta("secondaryCta", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2"
              />

              <div className="space-y-2">
                <select
                  value={isSectionLink(formData.cta.secondaryCtaLink) ? formData.cta.secondaryCtaLink : ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      updateCta("secondaryCtaLink", e.target.value);
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Select Section Link...</option>
                  {sectionLinkOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">or custom URL:</span>
                  <input
                    type="text"
                    placeholder="https://example.com"
                    value={!isSectionLink(formData.cta.secondaryCtaLink) ? formData.cta.secondaryCtaLink || "" : ""}
                    onChange={(e) => updateCta("secondaryCtaLink", e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Section */}
      {activeTab === "footer" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Footer Section
          </h3>

          {/* Brand Section */}
          <div className="pb-6 border-b border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-4">Brand</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={formData.footer.brandName || ""}
                  onChange={(e) => updateFooter("brandName", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Channel"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand Highlight
                </label>
                <input
                  type="text"
                  value={formData.footer.brandHighlight || ""}
                  onChange={(e) => updateFooter("brandHighlight", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Partner"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tagline
              </label>
              <textarea
                value={formData.footer.tagline || ""}
                onChange={(e) => updateFooter("tagline", e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="The complete real estate partner management platform for modern businesses."
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Support Email
              </label>
              <input
                type="email"
                value={formData.footer.supportEmail || ""}
                onChange={(e) => updateFooter("supportEmail", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="support@channelpartner.com"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Copyright Text
              </label>
              <input
                type="text"
                value={formData.footer.copyright || ""}
                onChange={(e) => updateFooter("copyright", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="© 2024 ChannelPartner. All rights reserved."
              />
            </div>
          </div>

          {/* Quick Links Section */}
          <div className="pb-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700">Quick Links</h4>
              <button
                type="button"
                onClick={addQuickLink}
                className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
              >
                <Plus className="w-4 h-4" />
                Add Link
              </button>
            </div>
            <div className="space-y-3">
              {formData.footer.quickLinks?.map((link, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    placeholder="Label (e.g., Features)"
                    value={link.label || ""}
                    onChange={(e) => updateQuickLink(index, "label", e.target.value)}
                    className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <div className="flex-1 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-gray-400" />
                    <select
                      value={isSectionLink(link.url) ? link.url : ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          updateQuickLink(index, "url", e.target.value);
                        }
                      }}
                      className="w-40 px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                      <option value="">Section...</option>
                      {sectionLinkOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="or custom URL"
                      value={!isSectionLink(link.url) ? link.url || "" : ""}
                      onChange={(e) => updateQuickLink(index, "url", e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeQuickLink(index)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {(!formData.footer.quickLinks || formData.footer.quickLinks.length === 0) && (
                <div className="text-center py-6 text-gray-500 text-sm bg-gray-50 rounded-lg">
                  No quick links added. Click "Add Link" to add one.
                </div>
              )}
            </div>
          </div>

          {/* Legal Links Section */}
          <div className="pb-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700">Legal Links</h4>
              <button
                type="button"
                onClick={addLegalLink}
                className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
              >
                <Plus className="w-4 h-4" />
                Add Link
              </button>
            </div>
            <div className="space-y-3">
              {formData.footer.legalLinks?.map((link, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="text"
                      placeholder="Label (e.g., Privacy Policy)"
                      value={link.label || ""}
                      onChange={(e) => updateLegalLink(index, "label", e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeLegalLink(index)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={isLegalPageLink(link.url) ? link.url : ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          updateLegalLink(index, "url", e.target.value);
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Select Legal Page...</option>
                      {legalPageOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs text-gray-500 whitespace-nowrap">or custom:</span>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={!isLegalPageLink(link.url) ? link.url || "" : ""}
                        onChange={(e) => updateLegalLink(index, "url", e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {(!formData.footer.legalLinks || formData.footer.legalLinks.length === 0) && (
                <div className="text-center py-6 text-gray-500 text-sm bg-gray-50 rounded-lg">
                  No legal links added. Click "Add Link" to add one.
                </div>
              )}
            </div>
          </div>

          {/* Social Links Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700">Social Links</h4>
              <button
                type="button"
                onClick={addSocialLink}
                className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
              >
                <Plus className="w-4 h-4" />
                Add Social Link
              </button>
            </div>
            <div className="space-y-3">
              {formData.footer.socialLinks?.map((link, index) => {
                const PlatformIcon = socialPlatformOptions.find(p => p.value === link.platform)?.icon || Globe;
                return (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    {/* Platform Selector */}
                    <div className="flex items-center gap-2 w-40">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <PlatformIcon className="w-4 h-4 text-indigo-600" />
                      </div>
                      <select
                        value={link.platform || "twitter"}
                        onChange={(e) => updateSocialLink(index, "platform", e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                      >
                        {socialPlatformOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* URL Input */}
                    <div className="flex-1 flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="https://twitter.com/yourcompany"
                        value={link.url || ""}
                        onChange={(e) => updateSocialLink(index, "url", e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => removeSocialLink(index)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              {(!formData.footer.socialLinks || formData.footer.socialLinks.length === 0) && (
                <div className="text-center py-6 text-gray-500 text-sm bg-gray-50 rounded-lg">
                  No social links added. Click "Add Social Link" to add one.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Section */}
      {activeTab === "navigation" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Navigation Section
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand Name
              </label>
              <input
                type="text"
                value={formData.navigation.brandName || ""}
                onChange={(e) => updateNavigation("brandName", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Channel"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand Highlight
              </label>
              <input
                type="text"
                value={formData.navigation.brandHighlight || ""}
                onChange={(e) =>
                  updateNavigation("brandHighlight", e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Partner"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Login Button Text
              </label>
              <input
                type="text"
                value={formData.navigation.loginText || ""}
                onChange={(e) => updateNavigation("loginText", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Sign in"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CTA Button Text
              </label>
              <input
                type="text"
                value={formData.navigation.ctaText || ""}
                onChange={(e) => updateNavigation("ctaText", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Get Started"
              />
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Navigation Links
              </label>
              <button
                onClick={addNavLink}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                + Add Link
              </button>
            </div>
            <div className="space-y-3">
              {formData.navigation.links?.map((link, index) => (
                <div key={index} className="flex gap-3 items-center">
                  <input
                    type="text"
                    placeholder="Label (e.g., Features)"
                    value={link.label || ""}
                    onChange={(e) =>
                      updateNavLink(index, "label", e.target.value)
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Href (e.g., #features)"
                    value={link.href || ""}
                    onChange={(e) =>
                      updateNavLink(index, "href", e.target.value)
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={() => removeNavLink(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Testimonials Section */}
      {activeTab === "testimonials" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Testimonials Section
          </h3>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Badge
              </label>
              <input
                type="text"
                value={formData.testimonials.badge || ""}
                onChange={(e) => updateTestimonials("badge", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Testimonials"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={formData.testimonials.title || ""}
                onChange={(e) => updateTestimonials("title", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Trusted by industry leaders"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subtitle
            </label>
            <textarea
              value={formData.testimonials.subtitle || ""}
              onChange={(e) => updateTestimonials("subtitle", e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="See what our partners say about their experience."
            />
          </div>

          {/* Testimonial Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Testimonials
              </label>
              <button
                onClick={addTestimonial}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                + Add Testimonial
              </button>
            </div>
            <div className="space-y-4">
              {formData.testimonials.items?.map((item, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-lg space-y-3"
                >
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Testimonial {index + 1}
                    </span>
                    <button
                      onClick={() => removeTestimonial(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Quote
                    </label>
                    <textarea
                      value={item.quote || ""}
                      onChange={(e) =>
                        updateTestimonial(index, "quote", e.target.value)
                      }
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="What the customer said..."
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Author Name
                      </label>
                      <input
                        type="text"
                        value={item.author || ""}
                        onChange={(e) =>
                          updateTestimonial(index, "author", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Role
                      </label>
                      <input
                        type="text"
                        value={item.role || ""}
                        onChange={(e) =>
                          updateTestimonial(index, "role", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="CEO"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Company
                      </label>
                      <input
                        type="text"
                        value={item.company || ""}
                        onChange={(e) =>
                          updateTestimonial(index, "company", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Company Inc."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FAQs Section */}
      {activeTab === "faqs" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">FAQs Section</h3>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Badge
              </label>
              <input
                type="text"
                value={formData.faqs.badge || ""}
                onChange={(e) => updateFaqs("badge", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="FAQs"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={formData.faqs.title || ""}
                onChange={(e) => updateFaqs("title", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Frequently asked questions"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subtitle
            </label>
            <textarea
              value={formData.faqs.subtitle || ""}
              onChange={(e) => updateFaqs("subtitle", e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Everything you need to know about ChannelPartner."
            />
          </div>

          {/* FAQ Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                FAQs
              </label>
              <button
                onClick={addFaq}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                + Add FAQ
              </button>
            </div>
            <div className="space-y-4">
              {formData.faqs.items?.map((item, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-lg space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-gray-600">
                      Question {index + 1}
                    </span>
                    <button
                      onClick={() => removeFaq(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Question
                    </label>
                    <input
                      type="text"
                      value={item.question || ""}
                      onChange={(e) =>
                        updateFaq(index, "question", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="What is ChannelPartner?"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Answer
                    </label>
                    <textarea
                      value={item.answer || ""}
                      onChange={(e) =>
                        updateFaq(index, "answer", e.target.value)
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="ChannelPartner is a comprehensive platform..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Category
                    </label>
                    <select
                      value={item.category || "general"}
                      onChange={(e) =>
                        updateFaq(index, "category", e.target.value)
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="general">General</option>
                      <option value="pricing">Pricing</option>
                      <option value="features">Features</option>
                      <option value="support">Support</option>
                      <option value="security">Security</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
        <button
          onClick={fetchLandingPage}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </DashboardLayout>
  );
};

export default LandingPageSettings;
