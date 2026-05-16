import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const LandingPageSettings = () => {
  const { user } = useAuth();
  const config = sidebarConfig.platform_admin;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('hero');

  const [formData, setFormData] = useState({
    hero: {
      badge: { text: '', show: true },
      title: '',
      highlightWord: '',
      subtitle: '',
      primaryCta: '',
      secondaryCta: '',
      stats: []
    },
    features: {
      badge: '',
      title: '',
      subtitle: '',
      items: []
    },
    howItWorks: {
      badge: '',
      title: '',
      subtitle: '',
      steps: []
    },
    pricing: {
      badge: '',
      title: '',
      subtitle: '',
      plans: []
    },
    cta: {
      badge: '',
      title: '',
      subtitle: '',
      primaryCta: '',
      secondaryCta: ''
    },
    footer: {
      description: '',
      productLinks: [],
      companyLinks: [],
      legalLinks: [],
      socialLinks: {
        twitter: '',
        linkedin: '',
        facebook: '',
        instagram: ''
      }
    }
  });

  useEffect(() => {
    fetchLandingPage();
  }, []);

  const fetchLandingPage = async () => {
    try {
      setLoading(true);
      const response = await api.get('/landing');
      if (response.data.data?.landingPage) {
        const lp = response.data.data.landingPage;
        setFormData({
          hero: lp.hero || formData.hero,
          features: lp.features || formData.features,
          howItWorks: lp.howItWorks || formData.howItWorks,
          pricing: lp.pricing || formData.pricing,
          cta: lp.cta || formData.cta,
          footer: lp.footer || formData.footer
        });
      }
    } catch (err) {
      setError('Failed to load landing page settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await api.put('/landing', formData);
      setSuccess('Landing page updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update landing page');
    } finally {
      setSaving(false);
    }
  };

  const updateHero = (field, value) => {
    setFormData(prev => ({
      ...prev,
      hero: { ...prev.hero, [field]: value }
    }));
  };

  const updateFeatures = (field, value) => {
    setFormData(prev => ({
      ...prev,
      features: { ...prev.features, [field]: value }
    }));
  };

  const updateHowItWorks = (field, value) => {
    setFormData(prev => ({
      ...prev,
      howItWorks: { ...prev.howItWorks, [field]: value }
    }));
  };

  const updatePricing = (field, value) => {
    setFormData(prev => ({
      ...prev,
      pricing: { ...prev.pricing, [field]: value }
    }));
  };

  const updateCta = (field, value) => {
    setFormData(prev => ({
      ...prev,
      cta: { ...prev.cta, [field]: value }
    }));
  };

  const updateFooter = (field, value) => {
    setFormData(prev => ({
      ...prev,
      footer: { ...prev.footer, [field]: value }
    }));
  };

  // Stats handlers
  const addStat = () => {
    setFormData(prev => ({
      ...prev,
      hero: {
        ...prev.hero,
        stats: [...prev.hero.stats, { value: '', label: '', description: '' }]
      }
    }));
  };

  const updateStat = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      hero: {
        ...prev.hero,
        stats: prev.hero.stats.map((stat, i) =>
          i === index ? { ...stat, [field]: value } : stat
        )
      }
    }));
  };

  const removeStat = (index) => {
    setFormData(prev => ({
      ...prev,
      hero: {
        ...prev.hero,
        stats: prev.hero.stats.filter((_, i) => i !== index)
      }
    }));
  };

  // Feature handlers
  const addFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: {
        ...prev.features,
        items: [...prev.features.items, { icon: 'building', title: '', description: '', gradient: 'from-indigo-500 to-purple-500' }]
      }
    }));
  };

  const updateFeature = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      features: {
        ...prev.features,
        items: prev.features.items.map((feature, i) =>
          i === index ? { ...feature, [field]: value } : feature
        )
      }
    }));
  };

  const removeFeature = (index) => {
    setFormData(prev => ({
      ...prev,
      features: {
        ...prev.features,
        items: prev.features.items.filter((_, i) => i !== index)
      }
    }));
  };

  // Step handlers
  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      howItWorks: {
        ...prev.howItWorks,
        steps: [...prev.howItWorks.steps, { number: String(prev.howItWorks.steps.length + 1).padStart(2, '0'), title: '', description: '', icon: '✨' }]
      }
    }));
  };

  const updateStep = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      howItWorks: {
        ...prev.howItWorks,
        steps: prev.howItWorks.steps.map((step, i) =>
          i === index ? { ...step, [field]: value } : step
        )
      }
    }));
  };

  const removeStep = (index) => {
    setFormData(prev => ({
      ...prev,
      howItWorks: {
        ...prev.howItWorks,
        steps: prev.howItWorks.steps.filter((_, i) => i !== index)
      }
    }));
  };

  // Pricing handlers
  const addPlan = () => {
    setFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        plans: [...prev.pricing.plans, { name: '', price: '', period: '', description: '', features: [], popular: false, buttonText: '', gradient: 'from-gray-600 to-gray-700' }]
      }
    }));
  };

  const updatePlan = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        plans: prev.pricing.plans.map((plan, i) =>
          i === index ? { ...plan, [field]: value } : plan
        )
      }
    }));
  };

  const removePlan = (index) => {
    setFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        plans: prev.pricing.plans.filter((_, i) => i !== index)
      }
    }));
  };

  const iconOptions = [
    { value: 'building', label: 'Building' },
    { value: 'users', label: 'Users' },
    { value: 'money', label: 'Money' },
    { value: 'calendar', label: 'Calendar' },
    { value: 'document', label: 'Document' },
    { value: 'chart', label: 'Chart' }
  ];

  const gradientOptions = [
    { value: 'from-indigo-500 to-purple-500', label: 'Indigo to Purple' },
    { value: 'from-blue-500 to-cyan-500', label: 'Blue to Cyan' },
    { value: 'from-emerald-500 to-teal-500', label: 'Emerald to Teal' },
    { value: 'from-orange-500 to-red-500', label: 'Orange to Red' },
    { value: 'from-purple-500 to-pink-500', label: 'Purple to Pink' },
    { value: 'from-rose-500 to-pink-500', label: 'Rose to Pink' }
  ];

  if (loading) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Landing Page" subtitle="Loading..." color={config.color}>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarLinks={config.links} title="Landing Page Settings" subtitle="Manage your public landing page" color={config.color}>
      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-4 -mb-px">
          {['hero', 'features', 'howItWorks', 'pricing', 'cta', 'footer'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'howItWorks' ? 'How It Works' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Hero Section */}
      {activeTab === 'hero' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Hero Section</h3>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="showBadge"
              checked={formData.hero.badge?.show}
              onChange={(e) => updateHero('badge', { ...formData.hero.badge, show: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <label htmlFor="showBadge" className="text-sm font-medium text-gray-700">Show badge</label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Badge Text</label>
            <input
              type="text"
              value={formData.hero.badge?.text || ''}
              onChange={(e) => updateHero('badge', { ...formData.hero.badge, text: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.hero.title}
              onChange={(e) => updateHero('title', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Highlight Word (gradient text)</label>
            <input
              type="text"
              value={formData.hero.highlightWord}
              onChange={(e) => updateHero('highlightWord', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
            <textarea
              value={formData.hero.subtitle}
              onChange={(e) => updateHero('subtitle', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          {/* Stats */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">Stats</label>
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
                    onChange={(e) => updateStat(index, 'value', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Label"
                    value={stat.label}
                    onChange={(e) => updateStat(index, 'label', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={stat.description}
                    onChange={(e) => updateStat(index, 'description', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={() => removeStat(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Features Section */}
      {activeTab === 'features' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Features Section</h3>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Badge</label>
              <input
                type="text"
                value={formData.features.badge}
                onChange={(e) => updateFeatures('badge', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={formData.features.title}
                onChange={(e) => updateFeatures('title', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
            <textarea
              value={formData.features.subtitle}
              onChange={(e) => updateFeatures('subtitle', e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Features */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">Features</label>
              <button
                onClick={addFeature}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                + Add Feature
              </button>
            </div>
            <div className="space-y-4">
              {formData.features.items?.map((feature, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Feature {index + 1}</span>
                    <button
                      onClick={() => removeFeature(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Title</label>
                      <input
                        type="text"
                        value={feature.title}
                        onChange={(e) => updateFeature(index, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Gradient</label>
                      <select
                        value={feature.gradient}
                        onChange={(e) => updateFeature(index, 'gradient', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        {gradientOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Description</label>
                    <textarea
                      value={feature.description}
                      onChange={(e) => updateFeature(index, 'description', e.target.value)}
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
      {activeTab === 'howItWorks' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">How It Works Section</h3>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Badge</label>
              <input
                type="text"
                value={formData.howItWorks.badge}
                onChange={(e) => updateHowItWorks('badge', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={formData.howItWorks.title}
                onChange={(e) => updateHowItWorks('title', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
            <textarea
              value={formData.howItWorks.subtitle}
              onChange={(e) => updateHowItWorks('subtitle', e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">Steps</label>
              <button
                onClick={addStep}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                + Add Step
              </button>
            </div>
            <div className="space-y-4">
              {formData.howItWorks.steps?.map((step, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Step {step.number}</span>
                    <button
                      onClick={() => removeStep(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Title</label>
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) => updateStep(index, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Icon (emoji)</label>
                      <input
                        type="text"
                        value={step.icon}
                        onChange={(e) => updateStep(index, 'icon', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Description</label>
                    <textarea
                      value={step.description}
                      onChange={(e) => updateStep(index, 'description', e.target.value)}
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

      {/* Pricing Section */}
      {activeTab === 'pricing' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Pricing Section</h3>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Badge</label>
              <input
                type="text"
                value={formData.pricing.badge}
                onChange={(e) => updatePricing('badge', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={formData.pricing.title}
                onChange={(e) => updatePricing('title', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
            <textarea
              value={formData.pricing.subtitle}
              onChange={(e) => updatePricing('subtitle', e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Plans */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">Plans</label>
              <button
                onClick={addPlan}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                + Add Plan
              </button>
            </div>
            <div className="space-y-4">
              {formData.pricing.plans?.map((plan, index) => (
                <div key={index} className={`p-4 border rounded-lg space-y-3 ${plan.popular ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={plan.name}
                        onChange={(e) => updatePlan(index, 'name', e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium"
                        placeholder="Plan Name"
                      />
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={plan.popular}
                          onChange={(e) => updatePlan(index, 'popular', e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        Popular
                      </label>
                    </div>
                    <button
                      onClick={() => removePlan(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Price</label>
                      <input
                        type="text"
                        value={plan.price}
                        onChange={(e) => updatePlan(index, 'price', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="₹9,999"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Period</label>
                      <input
                        type="text"
                        value={plan.period}
                        onChange={(e) => updatePlan(index, 'period', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="/month"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Button Text</label>
                      <input
                        type="text"
                        value={plan.buttonText}
                        onChange={(e) => updatePlan(index, 'buttonText', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Get Started"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Description</label>
                    <input
                      type="text"
                      value={plan.description}
                      onChange={(e) => updatePlan(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Features (one per line)</label>
                    <textarea
                      value={plan.features?.join('\n') || ''}
                      onChange={(e) => updatePlan(index, 'features', e.target.value.split('\n').filter(f => f.trim()))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CTA Section */}
      {activeTab === 'cta' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Call to Action Section</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Badge</label>
            <input
              type="text"
              value={formData.cta.badge}
              onChange={(e) => updateCta('badge', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.cta.title}
              onChange={(e) => updateCta('title', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
            <textarea
              value={formData.cta.subtitle}
              onChange={(e) => updateCta('subtitle', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary CTA</label>
              <input
                type="text"
                value={formData.cta.primaryCta}
                onChange={(e) => updateCta('primaryCta', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secondary CTA</label>
              <input
                type="text"
                value={formData.cta.secondaryCta}
                onChange={(e) => updateCta('secondaryCta', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer Section */}
      {activeTab === 'footer' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Footer Section</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.footer.description}
              onChange={(e) => updateFooter('description', e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Links (comma separated)</label>
            <input
              type="text"
              value={formData.footer.productLinks?.join(', ') || ''}
              onChange={(e) => updateFooter('productLinks', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Features, Pricing, Solutions, Integrations"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Links (comma separated)</label>
            <input
              type="text"
              value={formData.footer.companyLinks?.join(', ') || ''}
              onChange={(e) => updateFooter('companyLinks', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="About, Blog, Careers, Press"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Legal Links (comma separated)</label>
            <input
              type="text"
              value={formData.footer.legalLinks?.join(', ') || ''}
              onChange={(e) => updateFooter('legalLinks', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Privacy, Terms, Security, Cookies"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Twitter URL</label>
              <input
                type="text"
                value={formData.footer.socialLinks?.twitter || ''}
                onChange={(e) => updateFooter('socialLinks', { ...formData.footer.socialLinks, twitter: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
              <input
                type="text"
                value={formData.footer.socialLinks?.linkedin || ''}
                onChange={(e) => updateFooter('socialLinks', { ...formData.footer.socialLinks, linkedin: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
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
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </DashboardLayout>
  );
};

export default LandingPageSettings;