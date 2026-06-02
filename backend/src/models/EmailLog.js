import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema(
  {
    // Company reference
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    },

    // Recipient info
    recipient: {
      email: {
        type: String,
        required: true
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      name: String
    },

    // Email details
    subject: {
      type: String,
      required: true
    },

    type: {
      type: String,
      enum: [
        'verifyEmail',
        'resetPassword',
        'newPropertyPartner',
        'partnershipApproved',
        'visitScheduled',
        'visitApproved',
        'visitRejected',
        'visitCancelledPropertyStatus',
        'partnerVisitCancelled',
        'teamInvite',
        'commission_created',
        'commission_approved',
        'commission_paid',
        'commission_cancelled',
        'custom',
        'other'
      ],
      required: true
    },

    // Template used
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmailTemplate'
    },

    // Content
    content: {
      html: String,
      text: String
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'bounced'],
      default: 'pending'
    },

    // Error message if failed
    errorMessage: String,

    // Provider response
    providerId: String, // Message ID from email provider

    // Timestamps
    sentAt: Date,
    openedAt: Date,
    clickedAt: Date,

    // Tracking
    trackingPixel: String,
    links: [{
      url: String,
      clicked: { type: Boolean, default: false },
      clickedAt: Date
    }]
  },
  {
    timestamps: true
  }
);

// Indexes
emailLogSchema.index({ companyId: 1, createdAt: -1 });
emailLogSchema.index({ 'recipient.email': 1 });
emailLogSchema.index({ type: 1 });
emailLogSchema.index({ status: 1 });
emailLogSchema.index({ 'recipient.userId': 1 });

const EmailLog = mongoose.model('EmailLog', emailLogSchema);
export default EmailLog;