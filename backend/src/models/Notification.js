import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  // Recipient
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Notification type
  type: {
    type: String,
    enum: [
      'agreement_update',
      'agreement_sign_required',
      'agreement_signed',
      'kyc_approved',
      'kyc_rejected',
      'kyc_submitted',
      'partnership_application',
      'partnership_approved',
      'partnership_rejected',
      'partnership_pending',
      'partnership_suspended',
      'partnership_reactivated',
      'partnership_update',
      'commission_created',
      'commission_approved',
      'commission_paid',
      'commission_cancelled',
      'visit',
      'visit_approved',
      'visit_rejected',
      'visit_cancelled',
      'visit_reminder',
      'new_property',
      'team_member_added',
      'system'
    ],
    required: true
  },

  // Title
  title: {
    type: String,
    required: true
  },

  // Message
  message: {
    type: String,
    required: true
  },

  // Related data
  data: {
    agreementId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgreementTemplate' },
    partnershipId: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerCompany' },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    signatureId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgreementSignature' },
    visitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit' },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    commissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Commission' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },

  // Link to navigate to
  link: {
    type: String
  },

  // Read status
  isRead: {
    type: Boolean,
    default: false
  },

  // When it was created
  createdAt: {
    type: Date,
    default: Date.now
  },

  // When it was read
  readAt: {
    type: Date
  }
});

// Index for efficient queries
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);