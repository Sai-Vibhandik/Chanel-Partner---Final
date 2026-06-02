import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters']
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true
    },
    email: {
      type: String,
      required: [true, 'Company email is required'],
      unique: true,
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
    logo: {
      url: String,
      publicId: String
    },

    // Operating Regions
    regions: [{
      type: String,
      enum: ['india', 'dubai'],
      required: true
    }],

    // Default Currency
    defaultCurrency: {
      type: String,
      enum: ['INR', 'AED'],
      default: 'INR'
    },

    // Address
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    },

    // Region-Specific Configuration - India
    indiaConfig: {
      gstNumber: String,
      reraNumber: String,
      cinNumber: String,
      panNumber: String
    },

    // Region-Specific Configuration - Dubai
    dubaiConfig: {
      tradeLicenseNumber: String,
      dldNumber: String,
      vatNumber: String,
      tasheelNumber: String
    },

    // Documents
    documents: [{
      type: {
        type: String,
        enum: ['trade_license', 'rera_certificate', 'company_registration', 'other']
      },
      name: String,
      url: String,
      publicId: String,
      verifiedAt: Date,
      status: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
      }
    }],

    // Subscription
    subscription: {
      planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plan'
      },
      subscriptionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription'
      },
      status: {
        type: String,
        enum: ['trial', 'active', 'inactive', 'suspended', 'expired', 'cancelled'],
        default: 'trial'
      },
      trialEndsAt: Date,
      currentPeriodStart: Date,
      currentPeriodEnd: Date,
      // Razorpay
      razorpayCustomerId: String,
      razorpaySubscriptionId: String
    },

    // Settings
    settings: {
      // Tier share percentages - what percentage of property's base commission each tier gets
      // Example: If property has 5% base, Gold tier (50%) gets 2.5% effective rate
      tierPercentages: {
        bronze: { type: Number, default: 25 },     // 25% of base
        silver: { type: Number, default: 35 },    // 35% of base
        gold: { type: Number, default: 50 },      // 50% of base
        platinum: { type: Number, default: 75 }    // 75% of base
      },
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false }
      }
    },

    // Email Branding Settings
    emailBranding: {
      primaryColor: { type: String, default: '#4F46E5' },     // Primary brand color
      secondaryColor: { type: String, default: '#764BA2' },   // Secondary/gradient color
      headerBackgroundColor: { type: String, default: '#4F46E5' }, // Email header background
      buttonColor: { type: String, default: '#4F46E5' },      // CTA button color
      footerText: { type: String, default: '' }                // Custom footer text
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'pending_verification', 'active', 'suspended'],
      default: 'pending'
    },

    // Stats
    stats: {
      totalPartners: { type: Number, default: 0 },
      totalProperties: { type: Number, default: 0 },
      totalVisits: { type: Number, default: 0 },
      totalCommissionPaid: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Generate slug from name before saving
companySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

const Company = mongoose.model('Company', companySchema);
export default Company;