import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { validateEmail, validatePhone, validateName, validatePassword, handlePhoneInput } from '../../utils/validation';
import {
  getPlans,
  initRegistrationPayment,
  openRazorpayCheckout,
  verifyRegistrationPayment
} from '../../services/payment.service.js';
import { Check, Loader2, CreditCard, AlertCircle } from 'lucide-react';

const RegisterCompany = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    phone: '',
    website: '',
    regions: [],
    defaultCurrency: 'INR',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    selectedPlan: null,
    billingPeriod: 'monthly'
  });

  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Payment states
  const [registrationToken, setRegistrationToken] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentToken, setPaymentToken] = useState(null);

  const { registerCompany } = useAuth();
  const navigate = useNavigate();

  // Fetch plans on mount
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await getPlans();
        if (response.data?.plans) {
          setPlans(response.data.plans);
          // Auto-select popular plan or first plan
          const popularPlan = response.data.plans.find(p => p.isPopular);
          if (popularPlan) {
            setFormData(prev => ({ ...prev, selectedPlan: popularPlan._id }));
          } else if (response.data.plans.length > 0) {
            setFormData(prev => ({ ...prev, selectedPlan: response.data.plans[0]._id }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch plans:', err);
      } finally {
        setPlansLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        regions: checked
          ? [...prev.regions, value]
          : prev.regions.filter((r) => r !== value)
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePhoneChange = (e) => {
    const value = handlePhoneInput(e, null, null);
    setFormData(prev => ({ ...prev, phone: value }));
    if (fieldErrors.phone) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.phone;
        return newErrors;
      });
    }
  };

  const validateStep0 = () => {
    if (!formData.selectedPlan) {
      setError('Please select a plan to continue');
      return false;
    }
    setError('');
    return true;
  };

  const validateStep1 = () => {
    const errors = {};

    if (!formData.companyName.trim()) {
      errors.companyName = 'Company name is required';
    }

    const emailError = validateEmail(formData.email);
    if (emailError) errors.email = emailError;

    if (formData.phone) {
      const phoneError = validatePhone(formData.phone);
      if (phoneError) errors.phone = phoneError;
    }

    if (!formData.regions.length) {
      errors.regions = 'Please select at least one region';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors = {};

    const firstNameError = validateName(formData.firstName, 'First name');
    if (firstNameError) errors.firstName = firstNameError;

    const lastNameError = validateName(formData.lastName, 'Last name');
    if (lastNameError) errors.lastName = lastNameError;

    const passwordError = validatePassword(formData.password);
    if (passwordError) errors.password = passwordError;

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (step === 0) {
      if (!validateStep0()) return;
      setStep(1);
      return;
    }

    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!validateStep2()) return;
      setStep(3); // Go to payment step
      return;
    }
  };

  // Clear error when going back
  const handleBack = (targetStep) => {
    setError('');
    setFieldErrors({});
    setRegistrationToken(null); // Clear any previous registration token
    setStep(targetStep);
  };

  const handlePayment = async () => {
    const selectedPlan = getSelectedPlan();
    if (!selectedPlan) {
      setError('Please select a plan');
      return;
    }

    setPaymentProcessing(true);
    setError('');

    try {
      // Initialize registration payment
      const initResponse = await initRegistrationPayment({
        planId: selectedPlan._id,
        billingPeriod: formData.billingPeriod,
        companyName: formData.companyName,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        regions: formData.regions,
        defaultCurrency: formData.defaultCurrency,
        firstName: formData.firstName,
        lastName: formData.lastName,
        password: formData.password
      });

      if (!initResponse.success) {
        throw new Error(initResponse.message || 'Failed to initialize payment');
      }

      const { registrationToken: token, orderId, amount, currency, keyId } = initResponse.data;
      setRegistrationToken(token);

      // Open Razorpay checkout
      const paymentResult = await openRazorpayCheckout({
        keyId,
        amount,
        currency,
        orderId,
        name: 'Channel Partner Portal',
        description: `${selectedPlan.name} - ${formData.billingPeriod === 'yearly' ? 'Yearly' : 'Monthly'} Subscription`,
        customerName: `${formData.firstName} ${formData.lastName}`,
        customerEmail: formData.email,
        customerPhone: formData.phone
      });

      // Verify payment
      const verifyResponse = await verifyRegistrationPayment({
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature,
        registrationToken: token
      });

      if (!verifyResponse.success) {
        throw new Error(verifyResponse.message || 'Payment verification failed');
      }

      setPaymentToken(verifyResponse.data.paymentToken);
      setPaymentSuccess(true);

      // Now register the company with payment token
      await completeRegistration(verifyResponse.data.paymentToken);

    } catch (err) {
      console.error('Payment error:', err);
      // Extract error message from axios response or error object
      const errorMessage = err.response?.data?.message || err.message || 'Payment failed. Please try again.';
      setError(errorMessage);
    } finally {
      setPaymentProcessing(false);
    }
  };

  const completeRegistration = async (token) => {
    setLoading(true);
    try {
      await registerCompany({ paymentToken: token });
      // Registration complete, show success screen
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed. Please contact support.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedPlan = () => {
    return plans.find(p => p._id === formData.selectedPlan);
  };

  const formatPrice = (price, currency, billingPeriod) => {
    const symbols = { INR: '₹', AED: 'د.إ', USD: '$' };
    const symbol = symbols[currency] || '$';
    const total = billingPeriod === 'yearly' ? price * 12 : price;
    return `${symbol}${total.toLocaleString()}`;
  };

  // Success Screen
  if (paymentSuccess) {
    return (
      <div className="min-h-screen flex">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />
            </svg>
          </div>
          <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4">
              Welcome<br />Aboard!
            </h1>
            <p className="text-lg text-blue-200 max-w-md">
              Your company has been registered successfully. Verify your email to get started.
            </p>
          </div>
        </div>

        {/* Right Side - Success Message */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
          <div className="w-full max-w-md text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Registration Complete!</h2>
            <p className="text-gray-600 mb-6">
              We've sent a verification link to <strong>{formData.email}</strong>. Please click the link in the email to verify your account before logging in.
            </p>
            <div className="bg-gray-100 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-500">
                Didn't receive the email? Check your spam folder or
              </p>
              <button
                onClick={() => navigate('/login')}
                className="text-sm font-medium text-blue-600 hover:text-blue-500 mt-1"
              >
                go to login
              </button>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="mb-8">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4">
              Start Your<br />Journey Today
            </h1>
            <p className="text-lg text-blue-200 max-w-md">
              Join our network of leading real estate developers and connect with trusted channel partners.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-3xl font-bold text-white">Multi-Region</div>
              <div className="text-blue-200 text-sm mt-1">India & Dubai</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-3xl font-bold text-white">Secure</div>
              <div className="text-blue-200 text-sm mt-1">Enterprise-grade</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-3xl font-bold text-white">24/7</div>
              <div className="text-blue-200 text-sm mt-1">Support Available</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-3xl font-bold text-white">Analytics</div>
              <div className="text-blue-200 text-sm mt-1">Real-time Insights</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Register Your Company</h2>
            <p className="text-gray-500 mt-2">Create your account to get started</p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'} font-semibold transition-colors`}>
                {step > 0 ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : '1'}
              </div>
              <span className={`ml-2 text-sm font-medium ${step >= 0 ? 'text-blue-600' : 'text-gray-400'}`}>Plan</span>
            </div>
            <div className={`w-8 h-0.5 mx-2 ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'} font-semibold transition-colors`}>
                {step > 1 ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : '2'}
              </div>
              <span className={`ml-2 text-sm font-medium ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>Company</span>
            </div>
            <div className={`w-8 h-0.5 mx-2 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'} font-semibold transition-colors`}>
                {step > 2 ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : '3'}
              </div>
              <span className={`ml-2 text-sm font-medium ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>Account</span>
            </div>
            <div className={`w-8 h-0.5 mx-2 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'} font-semibold transition-colors`}>
                4
              </div>
              <span className={`ml-2 text-sm font-medium ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>Payment</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 0: Plan Selection */}
          {step === 0 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-sm text-gray-600 mb-4">
                Choose a plan that best fits your business needs. You can upgrade or change later.
              </p>

              {/* Billing Period Toggle */}
              <div className="flex items-center justify-center mb-6">
                <div className="bg-gray-100 p-1 rounded-lg flex">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, billingPeriod: 'monthly' }))}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      formData.billingPeriod === 'monthly'
                        ? 'bg-white text-gray-900 shadow'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, billingPeriod: 'yearly' }))}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      formData.billingPeriod === 'yearly'
                        ? 'bg-white text-gray-900 shadow'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Yearly <span className="text-green-600 text-xs">Save 20%</span>
                  </button>
                </div>
              </div>

              {plansLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {plans.map((plan) => (
                    <div
                      key={plan._id}
                      onClick={() => setFormData(prev => ({ ...prev, selectedPlan: plan._id }))}
                      className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        formData.selectedPlan === plan._id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {plan.isPopular && (
                        <span className="absolute -top-2 right-4 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                          Popular
                        </span>
                      )}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {plan.features?.slice(0, 3).map((feature, idx) => (
                              <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                {feature}
                              </span>
                            ))}
                            {plan.features?.length > 3 && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                +{plan.features.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-2xl font-bold text-gray-900">
                            {formatPrice(plan.price, plan.currency, formData.billingPeriod)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {`/${formData.billingPeriod === 'yearly' ? 'year' : 'month'}`}
                          </div>
                        </div>
                        {formData.selectedPlan === plan._id && (
                          <div className="absolute top-4 right-4">
                            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={!formData.selectedPlan || plansLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue with Selected Plan
              </button>
            </form>
          )}

          {/* Step 1: Company Information */}
          {step === 1 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {getSelectedPlan() && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Selected Plan:</span>
                      <span className="font-semibold text-gray-900">{getSelectedPlan().name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBack(0)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name *
                </label>
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={handleChange}
                  maxLength={100}
                  className={`block w-full px-4 py-3 border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 ${fieldErrors.companyName ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  placeholder="ABC Developers"
                />
                {fieldErrors.companyName && <p className="mt-1 text-sm text-red-600">{fieldErrors.companyName}</p>}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Email *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  maxLength={100}
                  className={`block w-full px-4 py-3 border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 ${fieldErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  placeholder="info@company.com"
                />
                {fieldErrors.email && <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    maxLength={16}
                    className={`block w-full px-4 py-3 border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 ${fieldErrors.phone ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    placeholder="10-digit mobile number"
                  />
                  {fieldErrors.phone && <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>}
                </div>
                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    id="website"
                    name="website"
                    type="url"
                    value={formData.website}
                    onChange={handleChange}
                    maxLength={200}
                    className={`block w-full px-4 py-3 border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 ${fieldErrors.website ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    placeholder="https://..."
                  />
                  {fieldErrors.website && <p className="mt-1 text-sm text-red-600">{fieldErrors.website}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operating Regions *
                </label>
                <div className="space-y-3">
                  <label className="flex items-center p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      name="regions"
                      value="india"
                      checked={formData.regions.includes('india')}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-gray-700">India (INR, RERA Compliance)</span>
                  </label>
                  <label className="flex items-center p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      name="regions"
                      value="dubai"
                      checked={formData.regions.includes('dubai')}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-gray-700">Dubai/UAE (AED, DLD Compliance)</span>
                  </label>
                </div>
                {fieldErrors.regions && <p className="mt-1 text-sm text-red-600">{fieldErrors.regions}</p>}
              </div>

              <div>
                <label htmlFor="defaultCurrency" className="block text-sm font-medium text-gray-700 mb-2">
                  Default Currency
                </label>
                <select
                  id="defaultCurrency"
                  name="defaultCurrency"
                  value={formData.defaultCurrency}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="AED">AED (د.إ) - UAE Dirham</option>
                </select>
              </div>

              <div className="flex space-x-4 pt-2">
                <button
                  type="button"
                  onClick={() => handleBack(0)}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Next Step
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Admin Account */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-sm text-gray-600 mb-4">
                Create your administrator account. This will be the primary account for managing your company.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    maxLength={50}
                    className={`block w-full px-4 py-3 border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 ${fieldErrors.firstName ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    placeholder="John"
                  />
                  {fieldErrors.firstName && <p className="mt-1 text-sm text-red-600">{fieldErrors.firstName}</p>}
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    maxLength={50}
                    className={`block w-full px-4 py-3 border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 ${fieldErrors.lastName ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    placeholder="Doe"
                  />
                  {fieldErrors.lastName && <p className="mt-1 text-sm text-red-600">{fieldErrors.lastName}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    maxLength={128}
                    className={`block w-full px-4 py-3 pr-12 border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 ${fieldErrors.password ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    placeholder="Min 8 chars, uppercase, lowercase, number"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.0 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.475a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-3.795 5.603M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {fieldErrors.password && <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    maxLength={128}
                    className={`block w-full px-4 pr-12 py-3 border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 ${fieldErrors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    placeholder="Confirm password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.0 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.475a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-3.795 5.603M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {fieldErrors.confirmPassword && <p className="mt-1 text-sm text-red-600">{fieldErrors.confirmPassword}</p>}
              </div>

              <div className="flex space-x-4 pt-2">
                <button
                  type="button"
                  onClick={() => handleBack(1)}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Proceed to Payment
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <div className="space-y-5">
              <p className="text-sm text-gray-600 mb-4">
                Complete your payment to finish registration. Your account will be created after successful payment.
              </p>

              {/* Order Summary */}
              <div className="bg-gray-100 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-gray-900">Order Summary</h3>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Plan:</span>
                  <span className="font-medium text-gray-900">{getSelectedPlan()?.name}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Billing:</span>
                  <span className="font-medium text-gray-900">
                    {formData.billingPeriod === 'yearly' ? 'Yearly' : 'Monthly'}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Company:</span>
                  <span className="font-medium text-gray-900">{formData.companyName}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Admin Email:</span>
                  <span className="font-medium text-gray-900">{formData.email}</span>
                </div>

                <hr className="border-gray-200" />

                <div className="flex justify-between font-semibold">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-gray-900">
                    {formatPrice(getSelectedPlan()?.price, getSelectedPlan()?.currency, formData.billingPeriod)}
                    <span className="text-sm font-normal text-gray-500">
                      /{formData.billingPeriod === 'yearly' ? 'year' : 'month'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Payment Button */}
              <button
                onClick={handlePayment}
                disabled={paymentProcessing}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {paymentProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5 mr-2" />
                    Pay {formatPrice(getSelectedPlan()?.price, getSelectedPlan()?.currency, formData.billingPeriod)} & Register
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center">
                Secure payment powered by Razorpay
              </p>

              <div className="flex space-x-4 pt-2">
                <button
                  type="button"
                  onClick={() => handleBack(2)}
                  disabled={paymentProcessing}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterCompany;