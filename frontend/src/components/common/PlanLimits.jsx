import { useState, useEffect } from 'react';
import { getPlanLimits } from '../../services/planLimits.service.js';
import { AlertCircle, Check, X, Home, Calendar, TrendingUp } from 'lucide-react';

const PlanLimits = ({ compact = false }) => {
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLimits();
  }, []);

  const fetchLimits = async () => {
    try {
      setLoading(true);
      const response = await getPlanLimits();
      setLimits(response.data);
    } catch (err) {
      setError('Failed to load plan limits');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!limits) return null;

  const { subscription, limits: planLimits, capabilities } = limits;

  // Compact version for dashboard cards
  if (compact) {
    const propertyLimit = planLimits.properties;
    const isNearPropertyLimit = propertyLimit.limit !== 'unlimited' && propertyLimit.percentage >= 80;

    return (
      <div className="space-y-2">
        {/* Days remaining warning */}
        {subscription.remainingDays <= 7 && subscription.remainingDays > 0 && (
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{subscription.remainingDays} days remaining</span>
          </div>
        )}

        {/* Property limit warning */}
        {isNearPropertyLimit && (
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">
              Properties: {propertyLimit.used}/{propertyLimit.limit === 'unlimited' ? '∞' : propertyLimit.limit}
            </span>
          </div>
        )}

        {/* All OK */}
        {!isNearPropertyLimit && subscription.remainingDays > 7 && (
          <div className="flex items-center gap-2 text-green-600">
            <Check className="w-4 h-4" />
            <span className="text-sm">All limits OK</span>
          </div>
        )}
      </div>
    );
  }

  // Full version
  const capabilityItems = [
    { key: 'analytics', label: 'Analytics' },
    { key: 'advancedAnalytics', label: 'Advanced Analytics' },
    { key: 'apiAccess', label: 'API Access' },
    { key: 'whiteLabel', label: 'White Label' },
    { key: 'customDomain', label: 'Custom Domain' },
    { key: 'prioritySupport', label: 'Priority Support' }
  ];

  return (
    <div className="space-y-6">
      {/* Subscription Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Current Plan</p>
            <p className="text-lg font-semibold text-gray-900">
              {subscription.plan || 'Trial'}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            subscription.status === 'active' ? 'bg-green-100 text-green-800' :
            subscription.status === 'trial' ? 'bg-blue-100 text-blue-800' :
            'bg-red-100 text-red-800'
          }`}>
            {subscription.status?.charAt(0).toUpperCase() + subscription.status?.slice(1)}
          </span>
        </div>
        {subscription.trialEndsAt && (
          <p className="text-sm text-gray-500 mt-2">
            Trial ends: {new Date(subscription.trialEndsAt).toLocaleDateString()}
          </p>
        )}
        {subscription.currentPeriodEnd && (
          <p className="text-sm text-gray-500 mt-2">
            Renews: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
          </p>
        )}

        {/* Days remaining */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Days Remaining</span>
            <span className={`text-sm font-semibold ${
              subscription.remainingDays <= 7 ? 'text-red-600' :
              subscription.remainingDays <= 14 ? 'text-amber-600' :
              'text-gray-900'
            }`}>
              {subscription.remainingDays} days
            </span>
          </div>
        </div>
      </div>

      {/* Property Limit */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Property Limit</h3>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Properties</span>
            </div>
            <span className="text-sm text-gray-500">
              {planLimits.properties.used} / {planLimits.properties.limit === 'unlimited' ? '∞' : planLimits.properties.limit}
            </span>
          </div>
          {planLimits.properties.limit !== 'unlimited' && (
            <>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    planLimits.properties.percentage >= 90 ? 'bg-red-500' :
                    planLimits.properties.percentage >= 70 ? 'bg-amber-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, planLimits.properties.percentage)}%` }}
                />
              </div>
              {planLimits.properties.remaining <= 5 && planLimits.properties.remaining >= 0 && (
                <p className="text-xs text-amber-600 mt-2">
                  Only {planLimits.properties.remaining} properties remaining
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Features */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Plan Features</h3>
        <div className="grid grid-cols-2 gap-2">
          {capabilityItems.map(({ key, label }) => (
            <div
              key={key}
              className={`flex items-center gap-2 p-2 rounded-lg ${
                capabilities[key]
                  ? 'bg-green-50 text-green-700'
                  : 'bg-gray-50 text-gray-400'
              }`}
            >
              {capabilities[key] ? (
                <Check className="w-4 h-4" />
              ) : (
                <X className="w-4 h-4" />
              )}
              <span className="text-sm">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade CTA */}
      {!subscription.isActive && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-900">Upgrade your plan</p>
              <p className="text-sm text-blue-700">Get more properties and features</p>
            </div>
            <a
              href="/company/payment"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              View Plans
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanLimits;