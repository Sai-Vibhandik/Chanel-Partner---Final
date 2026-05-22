import mongoose from 'mongoose';

/**
 * PendingRegistration Model
 *
 * Stores temporary registration data during the payment process.
 * This ensures payment is completed before company/user is created.
 *
 * Flow:
 * 1. User submits registration form
 * 2. PendingRegistration created with status 'pending_payment'
 * 3. Razorpay order created and stored
 * 4. On payment success, status → 'payment_completed'
 * 5. Company/User created, PendingRegistration deleted
 */

const pendingRegistrationSchema = new mongoose.Schema(
  {
    // Unique token for this registration session
    registrationToken: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    // Company Information
    companyData: {
      name: {
        type: String,
        required: true,
        trim: true
      },
      slug: {
        type: String,
        lowercase: true
      },
      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
      },
      phone: {
        type: String,
        trim: true
      },
      website: {
        type: String,
        trim: true
      },
      regions: [{
        type: String,
        enum: ['india', 'dubai']
      }],
      defaultCurrency: {
        type: String,
        default: 'INR'
      },
      address: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String
      }
    },

    // Admin User Information
    adminData: {
      firstName: {
        type: String,
        required: true,
        trim: true
      },
      lastName: {
        type: String,
        required: true,
        trim: true
      },
      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
      },
      phone: {
        type: String,
        trim: true
      },
      password: {
        type: String,
        required: true
      }
    },

    // Plan Information
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      required: true
    },
    billingPeriod: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },

    // Payment Information
    razorpayOrderId: {
      type: String,
      trim: true
    },
    razorpayPaymentId: {
      type: String,
      trim: true
    },
    razorpaySignature: {
      type: String,
      trim: true
    },
    paymentAmount: {
      type: Number
    },
    paymentCurrency: {
      type: String,
      default: 'INR'
    },

    // Status
    status: {
      type: String,
      enum: [
        'pending_payment',      // Order created, awaiting payment
        'payment_processing',   // Payment in progress
        'payment_completed',    // Payment successful, ready to create company
        'payment_failed',       // Payment failed
        'registration_completed', // Company created successfully
        'expired'               // Token expired
      ],
      default: 'pending_payment'
    },

    // Payment completion token (generated after successful payment)
    paymentToken: {
      type: String,
      trim: true
    },

    // Expiry (24 hours from creation)
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  },
  {
    timestamps: true
  }
);

// Indexes
pendingRegistrationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
pendingRegistrationSchema.index({ status: 1, createdAt: 1 });
pendingRegistrationSchema.index({ 'companyData.email': 1 });

// Method to check if expired
pendingRegistrationSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Method to check if can proceed with payment
pendingRegistrationSchema.methods.canProcessPayment = function() {
  return this.status === 'pending_payment' && !this.isExpired();
};

// Method to check if can create company
pendingRegistrationSchema.methods.canCreateCompany = function() {
  return this.status === 'payment_completed' && !this.isExpired();
};

const PendingRegistration = mongoose.model('PendingRegistration', pendingRegistrationSchema);
export default PendingRegistration;