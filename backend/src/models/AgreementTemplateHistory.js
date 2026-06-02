import mongoose from 'mongoose';

/**
 * Agreement Template History Model
 *
 * Stores archived versions of agreement templates:
 * - Old versions when new versions are created
 * - Soft-deleted templates
 * - Deactivated templates
 */
const agreementTemplateHistorySchema = new mongoose.Schema(
  {
    // Reference to the original template (if still exists)
    originalTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgreementTemplate'
    },

    // Company that owns this template
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },

    // Agreement details (copied from original)
    name: {
      type: String,
      required: true,
      trim: true
    },

    type: {
      type: String,
      required: true,
      enum: ['nda', 'nca', 'cpa', 'code_of_conduct', 'gdpr_consent', 'other'],
      index: true
    },

    content: {
      type: String,
      required: true
    },

    version: {
      type: Number,
      default: 1
    },

    isRequired: {
      type: Boolean,
      default: true
    },

    displayOrder: {
      type: Number,
      default: 0
    },

    description: {
      type: String,
      default: ''
    },

    // Reason for archiving
    archiveReason: {
      type: String,
      enum: ['version_update', 'deletion', 'deactivation'],
      required: true
    },

    // Who performed the archive action
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Original creator
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    // Timestamps from original
    originalCreatedAt: {
      type: Date
    },

    originalUpdatedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for efficient queries
agreementTemplateHistorySchema.index({ companyId: 1, type: 1 });
agreementTemplateHistorySchema.index({ originalTemplateId: 1 });
agreementTemplateHistorySchema.index({ archiveReason: 1 });

const AgreementTemplateHistory = mongoose.model('AgreementTemplateHistory', agreementTemplateHistorySchema);
export default AgreementTemplateHistory;