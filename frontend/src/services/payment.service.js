import api from '../utils/api';

/**
 * Get all active plans (public endpoint for landing page)
 */
export const getPublicPlans = async () => {
  const response = await api.get('/plans/public');
  return response.data;
};

/**
 * Get all active plans (authenticated)
 */
export const getPlans = async () => {
  const response = await api.get('/payments/plans');
  return response.data;
};

/**
 * Get plan by ID
 */
export const getPlanById = async (planId) => {
  const response = await api.get(`/payments/plans/${planId}`);
  return response.data;
};

// ============================================
// NEW REGISTRATION PAYMENT FLOW
// ============================================

/**
 * Initialize registration payment
 * Creates a pending registration and Razorpay order
 * @param {Object} data - Registration data
 */
export const initRegistrationPayment = async (data) => {
  const response = await api.post('/payments/registration/init', data);
  return response.data;
};

/**
 * Verify registration payment
 * Verifies Razorpay payment and returns payment token
 */
export const verifyRegistrationPayment = async (paymentData) => {
  const response = await api.post('/payments/registration/verify', paymentData);
  return response.data;
};

/**
 * Get pending registration details
 */
export const getPendingRegistration = async (token) => {
  const response = await api.get(`/payments/registration/${token}`);
  return response.data;
};

/**
 * Cancel pending registration
 */
export const cancelPendingRegistration = async (token) => {
  const response = await api.delete(`/payments/registration/${token}`);
  return response.data;
};

// ============================================
// EXISTING SUBSCRIPTION FLOW
// ============================================

/**
 * Create Razorpay order for subscription
 */
export const createOrder = async (planId, billingPeriod = 'monthly') => {
  const response = await api.post('/payments/create-order', { planId, billingPeriod });
  return response.data;
};

/**
 * Verify Razorpay payment
 */
export const verifyPayment = async (paymentData) => {
  const response = await api.post('/payments/verify', paymentData);
  return response.data;
};

/**
 * Get subscription details
 */
export const getSubscription = async () => {
  const response = await api.get('/payments/subscription');
  return response.data;
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (reason) => {
  const response = await api.post('/payments/cancel', { reason });
  return response.data;
};

/**
 * Get payment history
 */
export const getPaymentHistory = async () => {
  const response = await api.get('/payments/history');
  return response.data;
};

/**
 * Get company plan limits and usage
 */
export const getMyLimits = async () => {
  const response = await api.get('/companies/my-limits');
  return response.data;
};

/**
 * Load Razorpay script
 */
export const loadRazorpayScript = () => {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      reject(new Error('Failed to load Razorpay script'));
    };
    document.body.appendChild(script);
  });
};

/**
 * Open Razorpay checkout
 */
export const openRazorpayCheckout = async (options) => {
  await loadRazorpayScript();

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: options.keyId,
      amount: options.amount,
      currency: options.currency,
      order_id: options.orderId,
      name: options.name || 'Channel Partner Portal',
      description: options.description || 'Subscription Payment',
      prefill: {
        name: options.customerName,
        email: options.customerEmail,
        contact: options.customerPhone
      },
      theme: {
        color: '#7c3aed'
      },
      handler: function (response) {
        resolve({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature
        });
      },
      modal: {
        ondismiss: function() {
          reject(new Error('Payment cancelled by user'));
        }
      }
    });

    rzp.on('payment.failed', function (response) {
      reject(new Error(response.error.description || 'Payment failed'));
    });

    rzp.open();
  });
};

// Admin APIs
export const adminCreatePlan = async (planData) => {
  const response = await api.post('/payments/admin/plans', planData);
  return response.data;
};

export const adminGetAllPlans = async () => {
  const response = await api.get('/payments/admin/plans');
  return response.data;
};

export const adminUpdatePlan = async (planId, planData) => {
  const response = await api.put(`/payments/admin/plans/${planId}`, planData);
  return response.data;
};

export const adminDeletePlan = async (planId) => {
  const response = await api.delete(`/payments/admin/plans/${planId}`);
  return response.data;
};