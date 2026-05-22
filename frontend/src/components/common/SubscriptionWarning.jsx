import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CreditCard, RefreshCw } from 'lucide-react';
import api from '../../utils/api';

/**
 * SubscriptionWarning - Shows a warning banner when subscription is expired/inactive
 * Used in company dashboards to alert admins about subscription status
 */
const SubscriptionWarning = () => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await api.get('/payments/subscription');
      setSubscription(response.data?.subscription);
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  // Don't show anything while loading or if subscription is active
  if (loading) return null;

  // Check if subscription is active or valid trial
  const status = subscription?.status;
  const trialEndsAt = subscription?.trialEndsAt;
  const currentPeriodEnd = subscription?.currentPeriodEnd;

  // Determine if subscription is inactive
  let isInactive = false;
  let warningType = null;
  let daysRemaining = 0;

  if (status === 'expired' || status === 'cancelled' || status === 'suspended') {
    isInactive = true;
    warningType = 'expired';
  } else if (status === 'trial') {
    const trialEnd = new Date(trialEndsAt);
    const now = new Date();
    if (trialEnd < now) {
      isInactive = true;
      warningType = 'trial_expired';
    } else {
      daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
      if (daysRemaining <= 3) {
        warningType = 'trial_ending';
      }
    }
  } else if (status === 'active') {
    const periodEnd = new Date(currentPeriodEnd);
    const now = new Date();
    daysRemaining = Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24));
    if (daysRemaining <= 7 && daysRemaining > 0) {
      warningType = 'renewing_soon';
    }
  }

  // Don't show banner if everything is fine
  if (!isInactive && !warningType) return null;

  // Render expired/inactive warning
  if (isInactive) {
    return (
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-red-800 font-semibold text-lg">
              Subscription {status === 'trial' ? 'Trial Expired' : 'Inactive'}
            </h3>
            <p className="text-red-700 mt-1">
              Your subscription has {status === 'trial' ? 'expired' : 'become inactive'}.
              Some features are currently restricted. Partners cannot view your properties or book new visits.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/company/subscription')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Renew Subscription
              </button>
              <button
                onClick={() => navigate('/company/subscription')}
                className="px-4 py-2 bg-white text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                View Plans
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render trial ending soon warning
  if (warningType === 'trial_ending') {
    return (
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-amber-800 font-semibold text-lg">
              Trial Ending Soon
            </h3>
            <p className="text-amber-700 mt-1">
              Your trial period ends in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}.
              Choose a plan to continue using all features.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/company/subscription')}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Choose Plan
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render renewal soon warning
  if (warningType === 'renewing_soon') {
    return (
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <RefreshCw className="w-6 h-6 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-blue-800 font-semibold text-lg">
              Subscription Renewal Soon
            </h3>
            <p className="text-blue-700 mt-1">
              Your subscription renews in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}.
              Ensure your payment method is up to date to avoid any interruption.
            </p>
            <button
              onClick={() => navigate('/company/subscription')}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Manage Subscription
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default SubscriptionWarning;