import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { getPlans, getSubscription, cancelSubscription, getPaymentHistory } from '../../services/payment.service.js';
import { Check, CreditCard, Calendar, Download, AlertCircle, Loader2, RefreshCw, ArrowUpRight } from 'lucide-react';

const Subscription = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const sidebarLinks = sidebarConfig[user?.role]?.links || sidebarConfig.company_superadmin.links;

  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subRes, plansRes, historyRes] = await Promise.all([
        getSubscription().catch(() => ({ data: { subscription: null } })),
        getPlans().catch(() => ({ data: { plans: [] } })),
        getPaymentHistory().catch(() => ({ data: { subscriptions: [] } }))
      ]);

      if (subRes.data?.subscription) {
        setSubscription(subRes.data.subscription);
      }
      if (plansRes.data?.plans) {
        setPlans(plansRes.data.plans);
      }
      if (historyRes.data?.subscriptions) {
        setPaymentHistory(historyRes.data.subscriptions);
      }
    } catch (err) {
      console.error('Error fetching subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!cancelReason.trim()) {
      return;
    }

    setCancelling(true);
    try {
      await cancelSubscription(cancelReason);
      await fetchData();
      setShowCancelModal(false);
      setCancelReason('');
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPrice = (price, currency) => {
    const symbols = { INR: '₹', AED: 'د.إ', USD: '$' };
    const symbol = symbols[currency] || '$';
    return `${symbol}${price?.toLocaleString() || '0'}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'trial':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanById = (planId) => {
    return plans.find(p => p._id === planId);
  };

  // Check if user can change/buy plan
  const canChangePlan = subscription?.status === 'active' || subscription?.status === 'trial';
  const needsNewPlan = !subscription || subscription?.status === 'cancelled' || subscription?.status === 'expired';

  const currentPlan = subscription?.planId ? (typeof subscription.planId === 'object' ? subscription.planId : getPlanById(subscription.planId)) : null;

  if (loading) {
    return (
      <DashboardLayout sidebarLinks={sidebarLinks} title="Subscription" subtitle="Manage your subscription and billing" color="indigo">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarLinks={sidebarLinks} title="Subscription" subtitle="Manage your subscription and billing" color="indigo">
      <div className="space-y-6">
        {/* Current Plan Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {currentPlan?.name || 'No Active Plan'}
                  </h2>
                  {subscription?.status && (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
                      {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                    </span>
                  )}
                </div>
                {currentPlan && (
                  <p className="text-gray-600">{currentPlan.description}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {canChangePlan && (
                  <button
                    onClick={() => navigate('/company/payment')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Change Plan
                  </button>
                )}
                {needsNewPlan && (
                  <button
                    onClick={() => navigate('/company/payment')}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-2"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Buy Plan
                  </button>
                )}
              </div>
            </div>

            {currentPlan && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">Current Plan</p>
                    <p className="font-medium text-gray-900 truncate">{formatPrice(currentPlan.price, currentPlan.currency)}/{currentPlan.billingPeriod || 'month'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">Billing Period</p>
                    <p className="font-medium text-gray-900 text-sm">
                      {formatDate(subscription?.currentPeriodStart)} - {formatDate(subscription?.currentPeriodEnd)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">Features</p>
                    <p className="font-medium text-gray-900">{currentPlan.features?.length || 0} included</p>
                  </div>
                </div>
              </div>
            )}

            {/* Trial Warning */}
            {subscription?.status === 'trial' && subscription?.trialEndsAt && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Trial Period Active</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Your trial ends on {formatDate(subscription.trialEndsAt)}. Upgrade now to continue using all features.
                    </p>
                    <button
                      onClick={() => navigate('/company/payment')}
                      className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Upgrade Now
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Cancelled/Expired Warning */}
            {(subscription?.status === 'cancelled' || subscription?.status === 'expired') && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      {subscription?.status === 'cancelled' ? 'Subscription Cancelled' : 'Subscription Expired'}
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      {subscription?.status === 'cancelled'
                        ? `Your subscription was cancelled. Access ends on ${formatDate(subscription?.currentPeriodEnd)}.`
                        : 'Your subscription has expired. Purchase a new plan to continue using all features.'}
                    </p>
                    <button
                      onClick={() => navigate('/company/payment')}
                      className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Buy New Plan
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* No Subscription Warning */}
            {!subscription && (
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">No Active Subscription</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Choose a plan to activate your account and access all features.
                    </p>
                    <button
                      onClick={() => navigate('/company/payment')}
                      className="mt-3 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Choose a Plan
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Available Plans Preview */}
        {plans.length > 0 && (needsNewPlan || canChangePlan) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Available Plans</h2>
              <button
                onClick={() => navigate('/company/payment')}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                View All →
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.slice(0, 3).map((plan) => (
                  <div
                    key={plan._id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      currentPlan?._id === plan._id
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                      {plan.isPopular && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Popular</span>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatPrice(plan.price, plan.currency)}
                      <span className="text-sm font-normal text-gray-500">/mo</span>
                    </p>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{plan.description}</p>
                    {currentPlan?._id === plan._id && (
                      <span className="inline-block mt-2 text-xs bg-indigo-600 text-white px-2 py-1 rounded">Current Plan</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Plan Features */}
        {currentPlan && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Plan Features</h2>
            </div>
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {currentPlan.features?.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Plan Limits */}
              {currentPlan.limits && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Plan Limits</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Properties</p>
                      <p className="font-medium text-gray-900">
                        {currentPlan.limits.maxProperties === -1 ? 'Unlimited' : currentPlan.limits.maxProperties}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Duration</p>
                      <p className="font-medium text-gray-900">
                        {currentPlan.limits.maxDays || 30} days
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment History */}
        {paymentHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paymentHistory.map((sub, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(sub.currentPeriodStart)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sub.planId?.name || 'N/A'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPrice(sub.amount, sub.currency)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(sub.status)}`}>
                          {sub.status?.charAt(0).toUpperCase() + sub.status?.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <button className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                          <Download className="w-4 h-4" />
                          <span className="text-sm hidden sm:inline">Download</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cancel Subscription - Only show for active plans */}
        {subscription?.status === 'active' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Cancel Subscription</h2>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                You can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
              </p>
              <button
                onClick={() => setShowCancelModal(true)}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg transition-colors border border-red-200"
              >
                Cancel Subscription
              </button>
            </div>
          </div>
        )}

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Cancel Subscription</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to cancel your subscription? You'll continue to have access until {formatDate(subscription?.currentPeriodEnd)}.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for cancellation (required)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={3}
                  placeholder="Please tell us why you're cancelling..."
                  required
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancelling || !cancelReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelling ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cancelling...
                    </span>
                  ) : (
                    'Cancel Subscription'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Subscription;