import mongoose from 'mongoose';

const partnerCompanySchema = new mongoose.Schema(
  {
    // ========== RELATIONSHIPS ==========
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Partner is required']
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company is required']
    },

    // ========== STATUS ==========
    // Simplified status: pending -> active -> suspended
    // Use kycStatus for document verification tracking
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended'],
      default: 'pending'
    },

    // ========== TIER & COMMISSION ==========
    tier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      default: 'bronze'
    },
    // Optional override for tier percentage
    // If set, uses this instead of company's default tier percentage
    commissionOverride: {
      percentage: { type: Number }, // e.g., 60 for 60% of property base
      reason: { type: String },
      setBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      setAt: { type: Date }
    },

    // ========== KYC DOCUMENTS (Company-Specific) ==========
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
      uploadedAt: { type: Date, default: Date.now },
      verifiedAt: Date,
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      status: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
      },
      rejectionReason: String,
      region: {
        type: String,
        enum: ['india', 'dubai']
      }
    }],

    // ========== KYC SUMMARY ==========
    kycStatus: {
      type: String,
      enum: ['pending', 'submitted', 'under_review', 'verified', 'rejected'],
      default: 'pending'
    },
    kycSubmittedAt: Date,
    kycVerifiedAt: Date,

    // ========== NOTES ==========
    adminNotes: String,
    rejectionReason: String,

    // ========== TIMESTAMPS ==========
    joinedAt: {
      type: Date,
      default: Date.now
    },
    approvedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    // ========== STATS (Company-Specific) ==========
    stats: {
      totalVisits: { type: Number, default: 0 },
      totalDeals: { type: Number, default: 0 },
      totalCommissionEarned: { type: Number, default: 0 },
      lastVisitAt: Date
    },

    // ========== SETTINGS OVERRIDES ==========
    settings: {
      canViewAllProperties: { type: Boolean, default: true },
      canViewOtherPartners: { type: Boolean, default: false },
      receiveNotifications: { type: Boolean, default: true }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index - one partnership per partner-company pair
partnerCompanySchema.index({ partnerId: 1, companyId: 1 }, { unique: true });

// Indexes for common queries
partnerCompanySchema.index({ companyId: 1, status: 1 });
partnerCompanySchema.index({ partnerId: 1, status: 1 });
partnerCompanySchema.index({ companyId: 1, tier: 1 });

// Virtual for KYC completion percentage
partnerCompanySchema.virtual('kycCompletionPercentage').get(function() {
  if (!this.kycDocuments || this.kycDocuments.length === 0) return 0;
  const verified = this.kycDocuments.filter(doc => doc.status === 'verified').length;
  const required = 4; // Minimum required documents
  return Math.min(Math.round((verified / required) * 100), 100);
});

const PartnerCompany = mongoose.model('PartnerCompany', partnerCompanySchema);
export default PartnerCompany;