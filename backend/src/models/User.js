import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema(
  {
    // ========== TENANT (Company) ==========
    // For partners: null until they join a company
    // For company staff: required
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: function() {
        // Required for company staff, not for platform_admin or partners
        return !['platform_admin', 'partner'].includes(this.role);
      }
    },

    // ========== COMMON FIELDS ==========
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    phone: {
      type: String,
      trim: true
    },
    avatar: {
      url: String,
      publicId: String
    },

    // ========== ROLE ==========
    role: {
      type: String,
      enum: [
        'platform_admin',
        'company_superadmin',
        'partner_manager',
        'property_manager',
        'finance_manager',
        'viewer',
        'partner'
      ],
      required: [true, 'Role is required']
    },

    // ========== STATUS ==========
    isActive: {
      type: Boolean,
      default: true
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    lastLogin: Date,

    // ========== FOR PARTNER ROLE ONLY ==========
    partnerProfile: {
      // Company Information
      companyName: String,
      companyType: {
        type: String,
        enum: ['individual', 'proprietorship', 'partnership', 'llp', 'pvtltd', 'freelancer']
      },

      // Region-specific identification - India
      gstNumber: String,
      panNumber: String,
      reraNumber: String,

      // Region-specific identification - Dubai
      tradeLicenseNumber: String,
      dubaiReraNumber: String,
      emiratesId: String,
      passportNumber: String,

      // Contact Information
      phone: String,
      alternatePhone: String,
      website: String,

      // Operating Region
      operatingRegion: {
        type: String,
        enum: ['india', 'dubai', 'both']
      },

      // Address
      address: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String,
        region: {
          type: String,
          enum: ['india', 'dubai']
        }
      },

      // Contact Person
      contactPerson: {
        name: String,
        designation: String,
        email: String,
        phone: String
      },

      // Bank Details
      bankDetails: {
        accountHolder: String,
        accountNumber: String,
        ifscCode: String,
        swiftCode: String,
        bankName: String,
        branchName: String,
        iban: String
      },

      // Tier & Commission
      tier: {
        type: String,
        enum: ['bronze', 'silver', 'gold', 'platinum'],
        default: 'bronze'
      },
      commissionOverride: Number,

      // Status
      status: {
        type: String,
        enum: ['pending', 'under_review', 'approved', 'active', 'rejected', 'suspended'],
        default: 'pending'
      },

      // KYC Documents
      kycDocuments: [{
        type: {
          type: String,
          enum: [
            'gst_certificate',
            'pan_card',
            'rera_certificate',
            'address_proof',
            'cancelled_cheque',
            'trade_license',
            'rera_registration_card',
            'emirates_id',
            'passport_copy',
            'visa_copy',
            'other'
          ]
        },
        url: String,
        publicId: String,
        uploadedAt: Date,
        verifiedAt: Date,
        status: {
          type: String,
          enum: ['pending', 'verified', 'rejected'],
          default: 'pending'
        },
        region: {
          type: String,
          enum: ['india', 'dubai']
        }
      }],

      // Signed Agreements
      signedAgreements: [{
        agreement: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Agreement'
        },
        signedAt: Date,
        documentUrl: String,
        version: String
      }],

      // Stats
      stats: {
        totalVisits: { type: Number, default: 0 },
        totalDeals: { type: Number, default: 0 },
        totalCommissionEarned: { type: Number, default: 0 }
      },

      adminNotes: String,
      rejectionReason: String
    },

    // ========== FOR COMPANY STAFF ==========
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    // ========== AUTH FIELDS ==========
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    emailVerificationToken: String,
    emailVerificationExpire: Date,

    // ========== LOGIN HISTORY ==========
    loginHistory: [{
      ip: String,
      device: String,
      browser: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ companyId: 1, role: 1 });
userSchema.index({ companyId: 1, 'partnerProfile.status': 1 });
userSchema.index({ companyId: 1, 'partnerProfile.tier': 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = token;
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

// Generate reset password token
userSchema.methods.generateResetPasswordToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = token;
  this.resetPasswordExpire = Date.now() + 1 * 60 * 60 * 1000; // 1 hour
  return token;
};

const User = mongoose.model('User', userSchema);
export default User;