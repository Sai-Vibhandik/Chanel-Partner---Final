import mongoose from 'mongoose';

/**
 * Agreement Template Model
 *
 * Each company creates their own agreement templates (NDA, NCA, CPA, etc.)
 * When updated, version increases and partners must re-sign
 */
const agreementTemplateSchema = new mongoose.Schema(
  {
    // Company that owns this template
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },

    // Agreement details
    name: {
      type: String,
      required: true,
      trim: true
      // e.g., "Non-Disclosure Agreement", "Channel Partner Agreement"
    },

    type: {
      type: String,
      required: true,
      enum: ['nda', 'nca', 'cpa', 'code_of_conduct', 'gdpr_consent', 'other'],
      index: true
    },

    // HTML content with placeholders
    // Placeholders: {{partnerName}}, {{companyName}}, {{date}}, {{partnerPhone}}, etc.
    content: {
      type: String,
      required: true
    },

    // Version tracking
    version: {
      type: Number,
      default: 1
    },

    // Whether this template is active
    isActive: {
      type: Boolean,
      default: true
    },

    // Whether this agreement must be signed before partner can view properties
    isRequired: {
      type: Boolean,
      default: true
    },

    // Order in which agreements are shown during registration
    displayOrder: {
      type: Number,
      default: 0
    },

    // Description shown to partner before signing
    description: {
      type: String,
      default: ''
    },

    // Audit
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

// Index for company-level queries
agreementTemplateSchema.index({ companyId: 1, type: 1 });
agreementTemplateSchema.index({ companyId: 1, isActive: 1 });

// Virtual for signed count
agreementTemplateSchema.virtual('signedCount', {
  ref: 'AgreementSignature',
  localField: '_id',
  foreignField: 'agreementTemplateId',
  count: true
});

const AgreementTemplate = mongoose.model('AgreementTemplate', agreementTemplateSchema);
export default AgreementTemplate;