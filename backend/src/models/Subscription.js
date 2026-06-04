import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    // Company Reference
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },

    // Plan Reference
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      required: true
    },

    // Razorpay IDs
    razorpaySubscriptionId: {
      type: String,
      trim: true
    },
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
    razorpayCustomerId: {
      type: String,
      trim: true
    },

    // Subscription Status
    status: {
      type: String,
      enum: [
        'created',      // Order created, awaiting payment
        'pending',      // Payment initiated but not completed
        'active',       // Subscription active
        'paused',       // Subscription paused
        'cancelled',    // Subscription cancelled
        'expired',      // Subscription expired
        'failed',       // Payment failed
        'replaced'      // Replaced by a new subscription (plan change)
      ],
      default: 'created'
    },

    // Subscription Period
    currentPeriodStart: {
      type: Date
    },
    currentPeriodEnd: {
      type: Date
    },

    // Payment Details
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    billingPeriod: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },

    // Payment History
    payments: [{
      razorpayPaymentId: String,
      razorpayOrderId: String,
      amount: Number,
      currency: String,
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
      },
      paidAt: Date,
      failedAt: Date,
      failureReason: String,
      refundId: String,
      refundedAt: Date,
      invoiceNumber: String,
      invoiceUrl: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],

    // Cancellation
    cancelledAt: {
      type: Date
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancellationReason: {
      type: String
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false
    },

    // Plan Change/Replacement
    replacedAt: {
      type: Date
    },
    replacedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    // Notes
    notes: {
      type: String
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
subscriptionSchema.index({ companyId: 1, status: 1 });
subscriptionSchema.index({ razorpaySubscriptionId: 1 });

// Virtual for remaining days
subscriptionSchema.virtual('remainingDays').get(function() {
  if (!this.currentPeriodEnd) return null;
  const now = new Date();
  const end = new Date(this.currentPeriodEnd);
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
});

// Method to check if subscription is active
subscriptionSchema.methods.isActive = function() {
  return this.status === 'active' &&
         this.currentPeriodEnd &&
         new Date(this.currentPeriodEnd) > new Date();
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;