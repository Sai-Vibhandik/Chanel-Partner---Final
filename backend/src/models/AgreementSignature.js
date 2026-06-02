import mongoose from 'mongoose';

/**
 * Agreement Signature Model
 *
 * Tracks when a partner signs an agreement template
 * Stores both current and historical signatures
 */
const agreementSignatureSchema = new mongoose.Schema(
  {
    // The partnership (partner + company)
    partnershipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PartnerCompany',
      required: true,
      index: true
    },

    // The agreement template that was signed
    agreementTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgreementTemplate',
      required: true,
      index: true
    },

    // Version of the template that was signed
    version: {
      type: Number,
      required: true
    },

    // Content snapshot at the time of signing (preserves original content)
    contentSnapshot: {
      type: String,
      required: true
    },

    // Signature details
    signedAt: {
      type: Date,
      default: Date.now
    },

    // Partner typed their name as signature
    typedName: {
      type: String,
      required: true
    },

    // IP address from which they signed
    ipAddress: {
      type: String
    },

    // Browser user agent
    userAgent: {
      type: String
    },

    // Generated PDF URL with signature
    signedDocumentUrl: {
      type: String
    },

    // Cloudinary public ID for document
    signedDocumentPublicId: {
      type: String
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'signed', 'expired'],
      default: 'signed'
    },

    // If a new version is available, this marks old signature
    isLatestVersion: {
      type: Boolean,
      default: true
    },

    // When a new version became available
    newVersionAvailableAt: {
      type: Date
    },

    // Partner who signed
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Company
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound indexes
agreementSignatureSchema.index({ partnershipId: 1, agreementTemplateId: 1, version: -1 });
agreementSignatureSchema.index({ companyId: 1, status: 1 });
agreementSignatureSchema.index({ agreementTemplateId: 1, isLatestVersion: 1 });

// Virtual for agreement template
agreementSignatureSchema.virtual('agreementTemplate', {
  ref: 'AgreementTemplate',
  localField: 'agreementTemplateId',
  foreignField: '_id',
  justOne: true
});

const AgreementSignature = mongoose.model('AgreementSignature', agreementSignatureSchema);
export default AgreementSignature;