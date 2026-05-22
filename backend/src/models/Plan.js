import mongoose from 'mongoose';

const planSchema = new mongoose.Schema(
  {
    // Plan Identification
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
      unique: true
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true
    },
    description: {
      type: String,
      trim: true
    },

    // Pricing
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'AED', 'USD']
    },
    billingPeriod: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },

    // Display
    isPopular: {
      type: Boolean,
      default: false
    },
    displayOrder: {
      type: Number,
      default: 0
    },

    // Features & Limits
    features: [{
      type: String,
      trim: true
    }],
    limits: {
      maxProperties: {
        type: Number,
        default: -1 // -1 means unlimited
      },
      maxDays: {
        type: Number,
        default: 30 // Default subscription duration in days
      }
    },

    // Feature Flags
    capabilities: {
      analytics: {
        type: Boolean,
        default: true
      },
      advancedAnalytics: {
        type: Boolean,
        default: false
      },
      apiAccess: {
        type: Boolean,
        default: false
      },
      whiteLabel: {
        type: Boolean,
        default: false
      },
      customDomain: {
        type: Boolean,
        default: false
      },
      prioritySupport: {
        type: Boolean,
        default: false
      },
      dedicatedManager: {
        type: Boolean,
        default: false
      }
    },

    // Razorpay Integration
    razorpayPlanId: {
      type: String,
      trim: true
    },

    // Status
    isActive: {
      type: Boolean,
      default: true
    },

    // Created By (Platform Admin)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Generate slug from name before saving
planSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Virtual for formatted price
planSchema.virtual('formattedPrice').get(function() {
  const symbols = { INR: '₹', AED: 'د.إ', USD: '$' };
  const symbol = symbols[this.currency] || '';
  const period = this.billingPeriod === 'yearly' ? '/year' : '/month';
  return `${symbol}${this.price.toLocaleString()}${period}`;
});

const Plan = mongoose.model('Plan', planSchema);
export default Plan;