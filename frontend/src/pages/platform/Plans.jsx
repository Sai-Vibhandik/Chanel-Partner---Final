import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../utils/api';
import { Plus, Edit2, Trash2, Save, X, Check, Star, Eye, EyeOff } from 'lucide-react';

const Plans = () => {
  const { user } = useAuth();
  const config = sidebarConfig.platform_admin;
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const defaultPlan = {
    name: '',
    description: '',
    price: 0,
    currency: 'INR',
    billingPeriod: 'monthly',
    isPopular: false,
    displayOrder: 0,
    features: [],
    limits: {
      maxProperties: -1,
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
    },
    isActive: true
  };

  const [formData, setFormData] = useState(defaultPlan);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await api.get('/plans');
      if (response.data.success) {
        setPlans(response.data.data.plans);
      }
    } catch (err) {
      toast.error('Failed to load plans.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleFeatureChange = (index, value) => {
    setFormData(prev => {
      const features = [...(prev.features || [])];
      features[index] = value;
      return { ...prev, features };
    });
  };

  const addFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...(prev.features || []), '']
    }));
  };

  const removeFeature = (index) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setFormLoading(true);

      if (editingPlan) {
        // Update existing plan
        const response = await api.put(`/plans/${editingPlan._id}`, formData);
        if (response.data.success) {
          toast.success('Plan updated successfully.');
          fetchPlans();
        }
      } else {
        // Create new plan
        const response = await api.post('/plans', formData);
        if (response.data.success) {
          toast.success('Plan created successfully.');
          fetchPlans();
        }
      }

      setShowForm(false);
      setEditingPlan(null);
      setFormData(defaultPlan);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save plan');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name || '',
      description: plan.description || '',
      price: plan.price || 0,
      currency: plan.currency || 'INR',
      billingPeriod: plan.billingPeriod || 'monthly',
      isPopular: plan.isPopular || false,
      displayOrder: plan.displayOrder || 0,
      features: plan.features || [],
      limits: {
        maxProperties: plan.limits?.maxProperties ?? -1,
        maxDays: plan.limits?.maxDays ?? 30
      },
      capabilities: {
        analytics: plan.capabilities?.analytics ?? true,
        advancedAnalytics: plan.capabilities?.advancedAnalytics ?? false,
        apiAccess: plan.capabilities?.apiAccess ?? false,
        whiteLabel: plan.capabilities?.whiteLabel ?? false,
        customDomain: plan.capabilities?.customDomain ?? false,
        prioritySupport: plan.capabilities?.prioritySupport ?? false,
        dedicatedManager: plan.capabilities?.dedicatedManager ?? false
      },
      isActive: plan.isActive ?? true
    });
    setShowForm(true);
  };

  const handleDelete = async (planId) => {
    if (!window.confirm('Are you sure you want to deactivate this plan? It will no longer be available for new subscriptions.')) {
      return;
    }

    try {
      const response = await api.delete(`/plans/${planId}`);
      if (response.data.success) {
        toast.success('Plan deactivated successfully.');
        fetchPlans();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate plan');
    }
  };

  const handleCreateNew = () => {
    setEditingPlan(null);
    setFormData(defaultPlan);
    setShowForm(true);
  };

  const formatPrice = (price, currency) => {
    const symbols = { INR: '₹', AED: 'AED ', USD: '$' };
    const symbol = symbols[currency] || '$';
    if (price === 0) return 'Custom';
    return `${symbol}${price.toLocaleString()}`;
  };

  if (loading) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Plans" subtitle="Loading..." color={config.color}>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarLinks={config.links} title="Plans Management" subtitle="Manage subscription plans" color={config.color}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Subscription Plans</h2>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Plan
        </button>
      </div>

      {/* Plans Grid */}
      {!showForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan._id}
              className={`relative bg-white rounded-xl border-2 p-6 ${
                plan.isPopular ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'
              } ${!plan.isActive ? 'opacity-60' : ''}`}
            >
              {plan.isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}
              {!plan.isActive && (
                <span className="absolute top-2 right-2 bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded">
                  Inactive
                </span>
              )}

              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <p className="text-2xl font-bold text-indigo-600 mt-1">
                    {formatPrice(plan.price, plan.currency)}
                    <span className="text-sm font-normal text-gray-500">
                      /{plan.billingPeriod === 'yearly' ? 'year' : 'month'}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(plan)}
                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  {plan.isActive && (
                    <button
                      onClick={() => handleDelete(plan._id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-4">{plan.description}</p>

              {/* Limits */}
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Limits</h4>
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Properties:</span>{' '}
                    <span className="font-medium">{plan.limits?.maxProperties === -1 ? 'Unlimited' : plan.limits?.maxProperties}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration:</span>{' '}
                    <span className="font-medium">{plan.limits?.maxDays} days</span>
                  </div>
                </div>
              </div>

              {/* Capabilities */}
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Capabilities</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(plan.capabilities || {}).filter(([_, v]) => v).map(([key]) => (
                    <span key={key} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Features</h4>
                <ul className="space-y-1">
                  {(plan.features || []).slice(0, 4).map((feature, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                  {(plan.features || []).length > 4 && (
                    <li className="text-sm text-gray-400">+{plan.features.length - 4} more</li>
                  )}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plan Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingPlan ? 'Edit Plan' : 'Create New Plan'}
            </h2>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingPlan(null);
                setFormData(defaultPlan);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="AED">AED</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing Period</label>
                <select
                  value={formData.billingPeriod}
                  onChange={(e) => handleInputChange('billingPeriod', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPopular"
                  checked={formData.isPopular}
                  onChange={(e) => handleInputChange('isPopular', e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <label htmlFor="isPopular" className="text-sm text-gray-700">Mark as Popular</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => handleInputChange('displayOrder', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  min="0"
                />
              </div>
            </div>

            {/* Limits */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Limits</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Properties</label>
                  <input
                    type="number"
                    value={formData.limits.maxProperties === -1 ? '' : formData.limits.maxProperties}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty string (will be treated as unlimited)
                      if (value === '' || value === '-') {
                        handleInputChange('limits.maxProperties', -1);
                      } else {
                        const parsed = parseInt(value);
                        if (!isNaN(parsed)) {
                          handleInputChange('limits.maxProperties', parsed);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      // On blur, ensure we have a valid value
                      if (e.target.value === '' || formData.limits.maxProperties < 1) {
                        handleInputChange('limits.maxProperties', -1);
                      }
                    }}
                    placeholder="Leave empty for unlimited"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    min="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Duration (days)</label>
                  <input
                    type="number"
                    value={formData.limits.maxDays}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        handleInputChange('limits.maxDays', 30);
                      } else {
                        const parsed = parseInt(value);
                        if (!isNaN(parsed) && parsed >= 1) {
                          handleInputChange('limits.maxDays', parsed);
                        }
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    min="1"
                  />
                </div>
              </div>
            </div>

            {/* Capabilities */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Capabilities</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { key: 'analytics', label: 'Analytics' },
                  { key: 'advancedAnalytics', label: 'Advanced Analytics' },
                  { key: 'apiAccess', label: 'API Access' },
                  { key: 'whiteLabel', label: 'White Label' },
                  { key: 'customDomain', label: 'Custom Domain' },
                  { key: 'prioritySupport', label: 'Priority Support' },
                  { key: 'dedicatedManager', label: 'Dedicated Manager' }
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={key}
                      checked={formData.capabilities[key]}
                      onChange={(e) => handleInputChange(`capabilities.${key}`, e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <label htmlFor={key} className="text-sm text-gray-700">{label}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Features */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Features</h3>
              <div className="space-y-3">
                {(formData.features || []).map((feature, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => handleFeatureChange(index, e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter feature"
                    />
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addFeature}
                  className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
                >
                  <Plus className="w-5 h-5" />
                  Add Feature
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingPlan(null);
                  setFormData(defaultPlan);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {formLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {editingPlan ? 'Update Plan' : 'Create Plan'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Plans;