import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { getPlans, createOrder, verifyPayment, getSubscription, openRazorpayCheckout, loadRazorpayScript } from '../../services/payment.service.js';
import { Check, Loader2, AlertCircle, CreditCard, Building2, Shield } from 'lucide-react';

const Payment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planIdFromUrl = searchParams.get('plan');
  const sidebarLinks = sidebarConfig[user?.role]?.links || sidebarConfig.company_superadmin.links;

  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState(null);

  // Fetch plans and current subscription on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, subRes] = await Promise.all([
          getPlans().catch(() => ({ data: { plans: [] } })),
          getSubscription().catch(() => ({ data: { subscription: null } }))
        ]);

        if (plansRes.data?.plans) {
          setPlans(plansRes.data.plans);

          // If planId is provided in URL, select it
          if (planIdFromUrl) {
            const plan = plansRes.data.plans.find(p => p._id === planIdFromUrl);
            if (plan) setSelectedPlan(plan);
          } else if (plansRes.data.plans.length > 0) {
            // Select popular plan or first plan
            const popularPlan = plansRes.data.plans.find(p => p.isPopular);
            setSelectedPlan(popularPlan || plansRes.data.plans[0]);
          }
        }

        if (subRes.data?.subscription) {
          setCurrentSubscription(subRes.data.subscription);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load plans. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [planIdFromUrl]);

  const formatPrice = (price, currency) => {
    const symbols = { INR: '₹', AED: 'د.إ', USD: '$' };
    const symbol = symbols[currency] || '$';
    if (price === 0) return 'Custom';
    return `${symbol}${price.toLocaleString()}`;
  };

  const getTotalAmount = () => {
    if (!selectedPlan) return 0;
    const total = billingPeriod === 'yearly' ? selectedPlan.price * 12 : selectedPlan.price;
    return total;
  };

  const handlePayment = async () => {
    if (!selectedPlan) {
      setError('Please select a plan');
      return;
    }

    // For free/enterprise plans, skip payment
    if (selectedPlan.price === 0) {
      navigate('/company/dashboard');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // Load Razorpay script
      await loadRazorpayScript();

      // Create order
      const orderRes = await createOrder(selectedPlan._id, billingPeriod);

      if (!orderRes.success) {
        throw new Error(orderRes.message || 'Failed to create order');
      }

      const { orderId, amount, currency, keyId, company } = orderRes.data;

      // Open Razorpay checkout
      const paymentResult = await openRazorpayCheckout({
        keyId,
        amount,
        currency,
        orderId,
        name: 'Channel Partner Portal',
        description: `${selectedPlan.name} - ${billingPeriod === 'yearly' ? 'Yearly' : 'Monthly'} Subscription`,
        customerName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || company?.name,
        customerEmail: user?.email || company?.email
      });

      // Verify payment
      const verifyRes = await verifyPayment({
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature
      });

      if (verifyRes.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/company/subscription');
        }, 3000);
      } else {
        throw new Error(verifyRes.message || 'Payment verification failed');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.response?.data?.message || err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout sidebarLinks={sidebarLinks} title="Plans & Billing" subtitle="Choose a plan for your company" color="indigo">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (success) {
    return (
      <DashboardLayout sidebarLinks={sidebarLinks} title="Plans & Billing" subtitle="Payment successful" color="indigo">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-6">
              Your subscription has been activated. You can now access all features of your plan.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to subscription page...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarLinks={sidebarLinks} title="Plans & Billing" subtitle="Choose a plan for your company" color="indigo">
      <div className="space-y-6">
        {/* Current Subscription Warning */}
        {currentSubscription && currentSubscription.status === 'active' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800">
                  You already have an active subscription. Changing plans will take effect at the end of your current billing period.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Billing Period Toggle */}
        <div className="flex justify-center">
          <div className="bg-gray-100 p-1 rounded-xl inline-flex">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                billingPeriod === 'yearly'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs text-green-600 font-semibold">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {plans.map((plan) => (
            <div
              key={plan._id}
              onClick={() => setSelectedPlan(plan)}
              className={`relative bg-white rounded-xl border-2 p-4 sm:p-6 cursor-pointer transition-all ${
                selectedPlan?._id === plan._id
                  ? 'border-indigo-600 ring-2 ring-indigo-600 ring-offset-2'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {plan.isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                  Most Popular
                </span>
              )}

              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{plan.description}</p>
              </div>

              <div className="text-center mb-4">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {formatPrice(plan.price, plan.currency)}
                  {plan.price > 0 && (
                    <span className="text-base font-normal text-gray-500">
                      /{billingPeriod === 'yearly' ? 'year' : 'month'}
                    </span>
                  )}
                </div>
                {billingPeriod === 'yearly' && plan.price > 0 && (
                  <div className="text-sm text-gray-500 mt-1">
                    {formatPrice(plan.price * 12, plan.currency)} billed annually
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                {plan.features?.slice(0, 5).map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </div>
                ))}
                {plan.features?.length > 5 && (
                  <p className="text-xs text-gray-400">+{plan.features.length - 5} more features</p>
                )}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPlan(plan);
                }}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${
                  selectedPlan?._id === plan._id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {plan.price === 0 ? 'Contact Sales' : 'Select Plan'}
              </button>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        {selectedPlan && selectedPlan.price > 0 && (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-medium text-gray-900">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Billing</span>
                  <span className="font-medium text-gray-900">
                    {billingPeriod === 'yearly' ? 'Yearly' : 'Monthly'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Price</span>
                  <span className="font-medium text-gray-900">
                    {formatPrice(selectedPlan.price, selectedPlan.currency)}/{billingPeriod === 'yearly' ? 'yr' : 'mo'}
                  </span>
                </div>
                {billingPeriod === 'yearly' && (
                  <div className="flex justify-between text-green-600">
                    <span>Annual Discount</span>
                    <span>-20%</span>
                  </div>
                )}
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-bold text-xl text-gray-900">
                    {formatPrice(getTotalAmount(), selectedPlan.currency)}
                  </span>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={processing}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Pay Now
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                By proceeding, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>

            {/* Trust Badges */}
            <div className="flex justify-center gap-6 mt-6">
              <div className="flex items-center gap-2 text-gray-500">
                <Shield className="w-4 h-4" />
                <span className="text-xs">Secure Payment</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <Building2 className="w-4 h-4" />
                <span className="text-xs">Razorpay</span>
              </div>
            </div>
          </div>
        )}

        {/* Enterprise CTA */}
        {selectedPlan && selectedPlan.price === 0 && (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 text-center">
              <Building2 className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Contact Our Sales Team</h3>
              <p className="text-gray-600 mb-6">
                Let's discuss how we can tailor our enterprise solution to meet your specific needs.
              </p>
              <button
                onClick={() => navigate('/company/dashboard')}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
              >
                Go to Dashboard
              </button>
              <p className="text-xs text-gray-500 mt-4">
                Our team will reach out to you within 24 hours
              </p>
            </div>
          </div>
        )}

        {/* Back to Subscription */}
        <div className="text-center">
          <button
            onClick={() => navigate('/company/subscription')}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            ← Back to Subscription
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Payment;