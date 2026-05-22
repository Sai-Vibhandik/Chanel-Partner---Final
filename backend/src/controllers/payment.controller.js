import Razorpay from 'razorpay';
import crypto from 'crypto';
import Plan from '../models/Plan.js';
import Subscription from '../models/Subscription.js';
import Company from '../models/Company.js';
import User from '../models/User.js';
import PendingRegistration from '../models/PendingRegistration.js';
import { ApiError } from '../middlewares/error.middleware.js';
import { generateToken } from '../utils/token.js';

// Initialize Razorpay
let razorpay = null;

const getRazorpayInstance = () => {
  if (!razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new ApiError(500, 'Razorpay credentials not configured');
    }
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }
  return razorpay;
};

/**
 * Helper: Calculate subscription end date (fixes date mutation bug)
 */
const calculatePeriodEnd = (billingPeriod) => {
  const now = new Date();
  const endDate = new Date(now); // Clone to avoid mutation

  if (billingPeriod === 'yearly') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }

  return { start: now, end: endDate };
};

/**
 * Helper: Generate unique registration token
 */
const generateRegistrationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Helper: Generate payment verification token (signed JWT)
 */
const generatePaymentToken = (pendingRegId, orderId, paymentId) => {
  return generateToken(
    {
      pendingRegId,
      orderId,
      paymentId,
      type: 'payment_verification'
    },
    '1h' // Valid for 1 hour after payment
  );
};

/**
 * @desc    Get all available plans
 * @route   GET /api/payments/plans
 * @access  Public
 */
export const getPlans = async (req, res, next) => {
  try {
    const plans = await Plan.find({ isActive: true })
      .sort({ displayOrder: 1, price: 1 });

    res.status(200).json({
      success: true,
      data: { plans }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get plan by ID
 * @route   GET /api/payments/plans/:id
 * @access  Public
 */
export const getPlanById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const plan = await Plan.findById(id);
    if (!plan) {
      throw new ApiError(404, 'Plan not found');
    }

    res.status(200).json({
      success: true,
      data: { plan }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// NEW REGISTRATION PAYMENT FLOW
// ============================================

/**
 * @desc    Initialize registration payment (creates Razorpay order)
 * @route   POST /api/payments/registration/init
 * @access  Public
 *
 * This endpoint stores registration data temporarily and creates a Razorpay order.
 * Company/User are NOT created until payment is verified.
 */
export const initRegistrationPayment = async (req, res, next) => {
  try {
    const {
      // Plan selection
      planId,
      billingPeriod,
      // Company data
      companyName,
      email,
      phone,
      website,
      regions,
      defaultCurrency,
      address,
      // Admin user data
      firstName,
      lastName,
      password
    } = req.body;

    console.log('Initializing registration payment for:', email);

    // Validate required fields
    if (!planId || !companyName || !email || !firstName || !lastName || !password) {
      throw new ApiError(400, 'Missing required fields');
    }

    // Validate plan
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      throw new ApiError(404, 'Plan not found or inactive');
    }

    // Ensure plan has a price (all plans should be paid)
    if (plan.price <= 0) {
      throw new ApiError(400, 'Invalid plan selected. Please contact support.');
    }

    // Check if email already exists (both company and user)
    const existingCompany = await Company.findOne({ email: email.toLowerCase() });
    if (existingCompany) {
      throw new ApiError(400, `A company with email "${email}" already exists. Please use a different email.`);
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(400, `A user with email "${email}" already exists. Please use a different email.`);
    }

    // Check for existing pending registration with same email
    const existingPending = await PendingRegistration.findOne({
      'companyData.email': email.toLowerCase(),
      status: { $in: ['pending_payment', 'payment_processing'] },
      expiresAt: { $gt: new Date() }
    });

    if (existingPending) {
      // Return existing order if still valid
      if (existingPending.razorpayOrderId && existingPending.canProcessPayment()) {
        console.log('Returning existing pending registration for:', email);
        return res.status(200).json({
          success: true,
          data: {
            registrationToken: existingPending.registrationToken,
            orderId: existingPending.razorpayOrderId,
            amount: existingPending.paymentAmount * 100, // Convert to paise
            currency: existingPending.paymentCurrency,
            keyId: process.env.RAZORPAY_KEY_ID,
            plan: {
              id: plan._id,
              name: plan.name,
              price: plan.price
            },
            existing: true
          }
        });
      }
      // Mark existing as expired if can't process
      existingPending.status = 'expired';
      await existingPending.save();
    }

    // Generate unique slug
    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check slug uniqueness
    const existingSlug = await Company.findOne({ slug });
    if (existingSlug) {
      throw new ApiError(400, 'A company with a similar name already exists');
    }

    // Calculate amount
    const isYearly = billingPeriod === 'yearly';
    const amount = plan.price * (isYearly ? 12 : 1) * 100; // Convert to paise

    // Generate registration token
    const registrationToken = generateRegistrationToken();

    // Create pending registration record
    console.log('Creating pending registration...');
    const pendingRegistration = await PendingRegistration.create({
      registrationToken,
      companyData: {
        name: companyName,
        slug,
        email: email.toLowerCase(),
        phone,
        website,
        regions: regions || ['india'],
        defaultCurrency: defaultCurrency || 'INR',
        address
      },
      adminData: {
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone,
        password // Will be hashed when user is created
      },
      planId: plan._id,
      billingPeriod: billingPeriod || 'monthly',
      paymentAmount: amount / 100, // Store in rupees
      paymentCurrency: plan.currency || 'INR',
      status: 'pending_payment'
    });

    console.log('Pending registration created:', pendingRegistration._id);

    // Create Razorpay order
    console.log('Creating Razorpay order...');
    const rzp = getRazorpayInstance();

    // Generate short receipt ID (max 40 chars for Razorpay)
    const receiptId = `reg_${pendingRegistration._id.toString().slice(-12)}_${Date.now().toString().slice(-8)}`;
    console.log('Receipt ID:', receiptId, 'Length:', receiptId.length);

    const order = await rzp.orders.create({
      amount,
      currency: plan.currency || 'INR',
      receipt: receiptId,
      notes: {
        pendingRegId: pendingRegistration._id.toString(),
        planId: planId.toString(),
        billingPeriod: billingPeriod || 'monthly',
        type: 'registration'
      }
    });

    console.log('Razorpay order created:', order.id);

    // Update pending registration with order ID
    pendingRegistration.razorpayOrderId = order.id;
    await pendingRegistration.save();

    res.status(200).json({
      success: true,
      data: {
        registrationToken,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        plan: {
          id: plan._id,
          name: plan.name,
          price: plan.price,
          billingPeriod: billingPeriod || 'monthly'
        },
        expiresAt: pendingRegistration.expiresAt
      }
    });
  } catch (error) {
    console.error('Error in initRegistrationPayment:', error);
    // If it's already an ApiError, pass it through
    if (error instanceof ApiError) {
      return next(error);
    }
    // Otherwise, wrap it
    next(new ApiError(500, error.message || 'Failed to initialize payment'));
  }
};

/**
 * @desc    Verify registration payment and get completion token
 * @route   POST /api/payments/registration/verify
 * @access  Public
 */
export const verifyRegistrationPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      registrationToken
    } = req.body;

    if (!registrationToken) {
      throw new ApiError(400, 'Registration token is required');
    }

    // Find pending registration
    const pendingReg = await PendingRegistration.findOne({
      registrationToken,
      status: { $in: ['pending_payment', 'payment_processing'] }
    }).populate('planId');

    if (!pendingReg) {
      throw new ApiError(404, 'Registration not found or expired. Please start over.');
    }

    if (pendingReg.isExpired()) {
      pendingReg.status = 'expired';
      await pendingReg.save();
      throw new ApiError(400, 'Registration session expired. Please start over.');
    }

    // Verify Razorpay order ID matches
    if (pendingReg.razorpayOrderId !== razorpay_order_id) {
      throw new ApiError(400, 'Order ID mismatch');
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw new ApiError(400, 'Invalid payment signature');
    }

    // Fetch payment details from Razorpay
    const rzp = getRazorpayInstance();
    const payment = await rzp.payments.fetch(razorpay_payment_id);

    // Update pending registration with payment details
    pendingReg.razorpayPaymentId = razorpay_payment_id;
    pendingReg.razorpaySignature = razorpay_signature;
    pendingReg.status = 'payment_completed';

    // Generate payment token for completing registration
    const paymentToken = generatePaymentToken(
      pendingReg._id.toString(),
      razorpay_order_id,
      razorpay_payment_id
    );
    pendingReg.paymentToken = paymentToken;

    await pendingReg.save();

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        paymentToken,
        paymentId: razorpay_payment_id,
        amount: payment.amount / 100,
        currency: payment.currency
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get pending registration details by token
 * @route   GET /api/payments/registration/:token
 * @access  Public
 */
export const getPendingRegistration = async (req, res, next) => {
  try {
    const { token } = req.params;

    const pendingReg = await PendingRegistration.findOne({
      registrationToken: token
    }).populate('planId');

    if (!pendingReg) {
      throw new ApiError(404, 'Registration not found');
    }

    if (pendingReg.isExpired()) {
      pendingReg.status = 'expired';
      await pendingReg.save();
      throw new ApiError(400, 'Registration session expired');
    }

    res.status(200).json({
      success: true,
      data: {
        status: pendingReg.status,
        company: pendingReg.companyData,
        admin: {
          firstName: pendingReg.adminData.firstName,
          lastName: pendingReg.adminData.lastName,
          email: pendingReg.adminData.email
        },
        plan: pendingReg.planId,
        billingPeriod: pendingReg.billingPeriod,
        paymentAmount: pendingReg.paymentAmount,
        paymentCurrency: pendingReg.paymentCurrency,
        expiresAt: pendingReg.expiresAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel pending registration
 * @route   DELETE /api/payments/registration/:token
 * @access  Public
 */
export const cancelPendingRegistration = async (req, res, next) => {
  try {
    const { token } = req.params;

    const pendingReg = await PendingRegistration.findOneAndDelete({
      registrationToken: token
    });

    if (!pendingReg) {
      throw new ApiError(404, 'Registration not found');
    }

    res.status(200).json({
      success: true,
      message: 'Registration cancelled'
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// EXISTING COMPANY SUBSCRIPTION FLOW
// ============================================

/**
 * @desc    Create Razorpay order for subscription
 * @route   POST /api/payments/create-order
 * @access  Private (Company Admin)
 */
export const createOrder = async (req, res, next) => {
  try {
    const { planId, billingPeriod } = req.body;
    const companyId = req.user.companyId;
    const userId = req.user._id;

    // Validate plan
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      throw new ApiError(404, 'Plan not found or inactive');
    }

    const company = await Company.findById(companyId);

    // Check if company already has an active subscription with the SAME plan
    if (company.subscription?.status === 'active' &&
        company.subscription?.planId?.toString() === planId.toString()) {
      throw new ApiError(400, 'You are already subscribed to this plan.');
    }

    // Allow plan changes for active, cancelled, expired, or no subscription
    // Mark old subscription as replaced if exists
    if (company.subscription?.subscriptionId) {
      await Subscription.findByIdAndUpdate(company.subscription.subscriptionId, {
        status: 'replaced',
        replacedAt: new Date(),
        replacedBy: userId
      });
    }

    // Determine amount based on billing period
    const isYearly = billingPeriod === 'yearly';
    const amount = plan.price * (isYearly ? 12 : 1) * 100; // Convert to paise

    // Generate short receipt ID (max 40 chars for Razorpay)
    const receiptId = `sub_${companyId.toString().slice(-8)}_${Date.now().toString().slice(-8)}`;

    // Create order in Razorpay
    const rzp = getRazorpayInstance();
    const order = await rzp.orders.create({
      amount,
      currency: plan.currency || 'INR',
      receipt: receiptId,
      notes: {
        companyId: companyId.toString(),
        planId: planId.toString(),
        userId: userId.toString(),
        billingPeriod: billingPeriod || 'monthly',
        type: 'plan_change'
      }
    });

    // Create subscription record in database
    const subscription = await Subscription.create({
      companyId,
      planId,
      razorpayOrderId: order.id,
      status: 'created',
      amount: amount / 100, // Store in rupees
      currency: plan.currency || 'INR',
      billingPeriod: billingPeriod || 'monthly'
    });

    // Update company with subscription reference
    await Company.findByIdAndUpdate(companyId, {
      'subscription.subscriptionId': subscription._id,
      'subscription.planId': planId
    });

    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        subscriptionId: subscription._id,
        keyId: process.env.RAZORPAY_KEY_ID,
        plan: {
          name: plan.name,
          price: plan.price,
          billingPeriod: billingPeriod || 'monthly'
        },
        company: {
          name: company.name,
          email: company.email
        },
        isPlanChange: company.subscription?.status === 'active'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify Razorpay payment and activate subscription
 * @route   POST /api/payments/verify
 * @access  Private
 */
export const verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    const companyId = req.user.companyId;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw new ApiError(400, 'Invalid payment signature');
    }

    // Find subscription by order ID
    const subscription = await Subscription.findOne({ razorpayOrderId: razorpay_order_id });
    if (!subscription) {
      throw new ApiError(404, 'Subscription not found');
    }

    // Fetch payment details from Razorpay
    const rzp = getRazorpayInstance();
    const payment = await rzp.payments.fetch(razorpay_payment_id);

    // Update subscription
    subscription.razorpayPaymentId = razorpay_payment_id;
    subscription.razorpaySignature = razorpay_signature;
    subscription.status = 'active';

    // Set subscription period (using helper to avoid date mutation)
    const { start, end } = calculatePeriodEnd(subscription.billingPeriod);
    subscription.currentPeriodStart = start;
    subscription.currentPeriodEnd = end;

    // Add payment to history
    subscription.payments.push({
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      amount: payment.amount / 100,
      currency: payment.currency,
      status: 'completed',
      paidAt: new Date()
    });

    await subscription.save();

    // Update company subscription status
    await Company.findByIdAndUpdate(companyId, {
      'subscription.status': 'active',
      'subscription.subscriptionId': subscription._id,
      'subscription.planId': subscription.planId,
      'subscription.currentPeriodStart': subscription.currentPeriodStart,
      'subscription.currentPeriodEnd': subscription.currentPeriodEnd,
      status: 'active'
    });

    res.status(200).json({
      success: true,
      message: 'Payment verified and subscription activated successfully',
      data: {
        subscriptionId: subscription._id,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get subscription details for current company
 * @route   GET /api/payments/subscription
 * @access  Private (Company Admin)
 */
export const getSubscription = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const company = await Company.findById(companyId)
      .populate('subscription.planId')
      .populate('subscription.subscriptionId');

    if (!company) {
      throw new ApiError(404, 'Company not found');
    }

    res.status(200).json({
      success: true,
      data: {
        subscription: company.subscription
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel subscription
 * @route   POST /api/payments/cancel
 * @access  Private (Company Admin)
 */
export const cancelSubscription = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const companyId = req.user.companyId;
    const userId = req.user._id;

    const company = await Company.findById(companyId)
      .populate('subscription.subscriptionId');

    if (!company) {
      throw new ApiError(404, 'Company not found');
    }

    if (!company.subscription?.subscriptionId) {
      throw new ApiError(400, 'No active subscription found');
    }

    const subscription = company.subscription.subscriptionId;

    // Cancel at Razorpay if subscription exists
    if (subscription.razorpaySubscriptionId) {
      try {
        const rzp = getRazorpayInstance();
        await rzp.subscriptions.cancel(subscription.razorpaySubscriptionId);
      } catch (rzpError) {
        console.error('Razorpay cancellation error:', rzpError);
        // Continue with local cancellation even if Razorpay fails
      }
    }

    // Update subscription status
    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    subscription.cancelledBy = userId;
    subscription.cancellationReason = reason;
    subscription.cancelAtPeriodEnd = true;
    await subscription.save();

    // Update company status - keep active until period ends
    await Company.findByIdAndUpdate(companyId, {
      'subscription.status': 'cancelled'
    });

    res.status(200).json({
      success: true,
      message: 'Subscription cancelled. You can continue using the service until the current period ends.',
      data: {
        subscriptionId: subscription._id,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Handle Razorpay webhooks
 * @route   POST /api/payments/webhook
 * @access  Public (Razorpay)
 */
export const handleWebhook = async (req, res, next) => {
  try {
    const webhookBody = JSON.stringify(req.body);
    const webhookSignature = req.headers['x-razorpay-signature'];

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET)
      .update(webhookBody)
      .digest('hex');

    if (expectedSignature !== webhookSignature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ status: 'invalid signature' });
    }

    const event = req.body;
    const eventType = event.event;

    console.log(`Received Razorpay webhook: ${eventType}`);

    // Handle different webhook events
    switch (eventType) {
      case 'payment.captured':
        await handlePaymentCaptured(event);
        break;
      case 'payment.failed':
        await handlePaymentFailed(event);
        break;
      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event);
        break;
      case 'subscription.completed':
        await handleSubscriptionCompleted(event);
        break;
      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ status: 'error' });
  }
};

// Webhook Handlers
const handlePaymentCaptured = async (event) => {
  try {
    const payment = event.payload.payment.entity;
    const orderId = payment.order_id;

    const subscription = await Subscription.findOne({ razorpayOrderId: orderId });
    if (!subscription) return;

    subscription.razorpayPaymentId = payment.id;
    subscription.status = 'active';

    // Fix: Use helper to avoid date mutation
    const { start, end } = calculatePeriodEnd(subscription.billingPeriod);
    subscription.currentPeriodStart = start;
    subscription.currentPeriodEnd = end;

    subscription.payments.push({
      razorpayPaymentId: payment.id,
      razorpayOrderId: orderId,
      amount: payment.amount / 100,
      currency: payment.currency,
      status: 'completed',
      paidAt: new Date()
    });

    await subscription.save();

    await Company.findByIdAndUpdate(subscription.companyId, {
      'subscription.status': 'active',
      'subscription.currentPeriodStart': subscription.currentPeriodStart,
      'subscription.currentPeriodEnd': subscription.currentPeriodEnd
    });
  } catch (error) {
    console.error('Error handling payment.captured:', error);
  }
};

const handlePaymentFailed = async (event) => {
  try {
    const payment = event.payload.payment.entity;
    const orderId = payment.order_id;

    const subscription = await Subscription.findOne({ razorpayOrderId: orderId });
    if (!subscription) return;

    subscription.status = 'failed';

    subscription.payments.push({
      razorpayPaymentId: payment.id,
      razorpayOrderId: orderId,
      amount: payment.amount / 100,
      currency: payment.currency,
      status: 'failed',
      failedAt: new Date(),
      failureReason: payment.error_description || 'Payment failed'
    });

    await subscription.save();
  } catch (error) {
    console.error('Error handling payment.failed:', error);
  }
};

const handleSubscriptionCancelled = async (event) => {
  try {
    const rzpSubscription = event.payload.subscription.entity;
    const subscription = await Subscription.findOne({
      razorpaySubscriptionId: rzpSubscription.id
    });
    if (!subscription) return;

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    await subscription.save();

    await Company.findByIdAndUpdate(subscription.companyId, {
      'subscription.status': 'cancelled'
    });
  } catch (error) {
    console.error('Error handling subscription.cancelled:', error);
  }
};

const handleSubscriptionCompleted = async (event) => {
  try {
    const rzpSubscription = event.payload.subscription.entity;
    const subscription = await Subscription.findOne({
      razorpaySubscriptionId: rzpSubscription.id
    });
    if (!subscription) return;

    subscription.status = 'expired';
    await subscription.save();

    await Company.findByIdAndUpdate(subscription.companyId, {
      'subscription.status': 'expired'
    });
  } catch (error) {
    console.error('Error handling subscription.completed:', error);
  }
};

// ============================================
// ADMIN PLAN MANAGEMENT
// ============================================

/**
 * @desc    Admin: Create a new plan
 * @route   POST /api/payments/admin/plans
 * @access  Private (Platform Admin)
 */
export const createPlan = async (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      currency,
      billingPeriod,
      isPopular,
      displayOrder,
      features,
      limits,
      capabilities
    } = req.body;

    const plan = await Plan.create({
      name,
      description,
      price,
      currency: currency || 'INR',
      billingPeriod: billingPeriod || 'monthly',
      isPopular: isPopular || false,
      displayOrder: displayOrder || 0,
      features: features || [],
      limits: limits || {},
      capabilities: capabilities || {},
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: { plan }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin: Update a plan
 * @route   PUT /api/payments/admin/plans/:id
 * @access  Private (Platform Admin)
 */
export const updatePlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const plan = await Plan.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });

    if (!plan) {
      throw new ApiError(404, 'Plan not found');
    }

    res.status(200).json({
      success: true,
      message: 'Plan updated successfully',
      data: { plan }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin: Delete a plan
 * @route   DELETE /api/payments/admin/plans/:id
 * @access  Private (Platform Admin)
 */
export const deletePlan = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if any companies are using this plan
    const companiesUsingPlan = await Company.countDocuments({
      'subscription.planId': id,
      'subscription.status': { $in: ['active', 'trial'] }
    });

    if (companiesUsingPlan > 0) {
      throw new ApiError(400, 'Cannot delete plan. Companies are currently using this plan.');
    }

    const plan = await Plan.findByIdAndDelete(id);

    if (!plan) {
      throw new ApiError(404, 'Plan not found');
    }

    res.status(200).json({
      success: true,
      message: 'Plan deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin: Get all plans (including inactive)
 * @route   GET /api/payments/admin/plans
 * @access  Private (Platform Admin)
 */
export const getAllPlans = async (req, res, next) => {
  try {
    const plans = await Plan.find()
      .sort({ displayOrder: 1, price: 1 })
      .populate('createdBy', 'firstName lastName email');

    res.status(200).json({
      success: true,
      data: { plans }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get payment history for company
 * @route   GET /api/payments/history
 * @access  Private (Company Admin)
 */
export const getPaymentHistory = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const subscriptions = await Subscription.find({ companyId })
      .populate('planId', 'name price currency billingPeriod')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { subscriptions }
    });
  } catch (error) {
    next(error);
  }
};