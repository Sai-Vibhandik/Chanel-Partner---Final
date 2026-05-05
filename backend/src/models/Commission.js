import mongoose from 'mongoose';

/**
 * Commission Model
 *
 * Simplified commission system:
 * - Property has base commission percentage (e.g., 5%)
 * - Partner has tier percentage (e.g., Gold = 50%)
 * - Partner's commission = Property Base % × Partner Tier %
 *
 * Example:
 * - Property: 5% base
 * - Partner: Gold tier (50%)
 * - Sale: ₹50,00,000
 * - Commission: 5% × 50% = 2.5% → ₹1,25,000
 *
 * Flow: pending → approved → paid (or cancelled)
 */

const commissionSchema = new mongoose.Schema(
  {
    // ========== TENANT (Company) ==========
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },

    // ========== REFERENCES ==========
    partnershipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PartnerCompany',
      required: true
    },
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true
    },
    visit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Visit'
    },

    // ========== SOURCE (NEW) ==========
    source: {
      type: {
        type: String,
        enum: ['visit', 'direct', 'referral', 'marketing'],
        default: 'direct'
      },
      visitId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Visit'
      },
      notes: String  // How the deal came
    },

    // ========== SALE DETAILS ==========
    saleDetails: {
      salePrice: {
        type: Number,
        required: true
      },
      saleDate: {
        type: Date,
        default: Date.now
      },
      buyerName: {
        type: String,
        required: true
      },
      buyerPhone: {
        type: String,
        required: true
      },
      buyerEmail: String
    },

    // ========== COMMISSION CALCULATION ==========
    commission: {
      // Property's base commission percentage (e.g., 5%)
      propertyBasePercentage: {
        type: Number,
        required: true
      },
      // Partner's tier percentage share (e.g., Gold = 50%)
      partnerTierPercentage: {
        type: Number,
        required: true
      },
      // Partner's tier name for reference
      partnerTier: {
        type: String,
        enum: ['bronze', 'silver', 'gold', 'platinum'],
        required: true
      },
      // Effective percentage (propertyBase × partnerTier / 100)
      // e.g., 5% × 50% = 2.5%
      effectivePercentage: {
        type: Number,
        required: true
      },
      // Override percentage if set specifically for this partner-property
      overridePercentage: Number,
      // Final calculated amount
      calculatedAmount: {
        type: Number,
        required: true
      },
      currency: {
        type: String,
        enum: ['INR', 'AED'],
        default: 'INR'
      }
    },

    // ========== STATUS (UPDATED) ==========
    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'cancelled'],
      default: 'pending',
      index: true
    },

    // ========== APPROVAL (NEW) ==========
    approval: {
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      approvedAt: Date,
      notes: String,
      // Commission override at approval time
      override: {
        isOverridden: {
          type: Boolean,
          default: false
        },
        originalAmount: Number,  // The calculated amount before override
        overriddenAmount: Number, // The new amount set by admin
        overridePercentage: Number, // If override is by percentage
        overrideType: {
          type: String,
          enum: ['amount', 'percentage']
        },
        reason: String,  // Why the override was made
        overriddenBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      }
    },

    // ========== PAYOUT DETAILS ==========
    payout: {
      paidAt: Date,
      paymentMethod: {
        type: String,
        enum: ['bank_transfer', 'cheque', 'cash', 'other']
      },
      paymentReference: String,
      notes: String,
      paidBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },

    // ========== NOTES ==========
    notes: String,

    // ========== AUDIT ==========
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
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

// Indexes for common queries
commissionSchema.index({ companyId: 1, status: 1 });
commissionSchema.index({ companyId: 1, createdAt: -1 });
commissionSchema.index({ partner: 1, status: 1 });
commissionSchema.index({ partnershipId: 1 });
commissionSchema.index({ property: 1 });

// Virtual for formatted commission amount
commissionSchema.virtual('formattedAmount').get(function() {
  if (!this.commission) return '';
  const { calculatedAmount, currency } = this.commission;
  const symbol = currency === 'INR' ? '₹' : 'AED ';

  if (calculatedAmount >= 10000000) {
    return `${symbol}${(calculatedAmount / 10000000).toFixed(2)} Cr`;
  } else if (calculatedAmount >= 100000) {
    return `${symbol}${(calculatedAmount / 100000).toFixed(2)} Lac`;
  }
  return `${symbol}${calculatedAmount?.toLocaleString() || '0'}`;
});

// Virtual for formatted sale price
commissionSchema.virtual('formattedSalePrice').get(function() {
  if (!this.saleDetails) return '';
  const { salePrice } = this.saleDetails;
  const currency = this.commission?.currency || 'INR';
  const symbol = currency === 'INR' ? '₹' : 'AED ';

  if (salePrice >= 10000000) {
    return `${symbol}${(salePrice / 10000000).toFixed(2)} Cr`;
  } else if (salePrice >= 100000) {
    return `${symbol}${(salePrice / 100000).toFixed(2)} Lac`;
  }
  return `${symbol}${salePrice?.toLocaleString() || '0'}`;
});

const Commission = mongoose.model('Commission', commissionSchema);
export default Commission;