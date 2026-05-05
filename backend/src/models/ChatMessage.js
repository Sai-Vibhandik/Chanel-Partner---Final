import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  // Company and Partnership
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  partnershipId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PartnerCompany',
    required: true
  },

  // Admin type determines which chat thread this belongs to
  // 'company_superadmin' = SuperAdmin <-> Partner chat
  // 'partner_manager' = Partner Manager <-> Partner chat
  adminType: {
    type: String,
    enum: ['company_superadmin', 'partner_manager'],
    required: true
  },

  // Sender information
  sender: {
    type: {
      type: String,
      enum: ['admin', 'partner'],
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },

  // Message content
  message: {
    type: String,
    default: '',
    trim: true
  },

  // File attachments
  attachments: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: {
      type: String,
      enum: ['image', 'document', 'video', 'other'],
      default: 'other'
    },
    size: Number // in bytes
  }],

  // Read status
  readAt: {
    type: Date
  },
  readBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient conversation queries
chatMessageSchema.index({
  companyId: 1,
  partnershipId: 1,
  adminType: 1,
  createdAt: -1
});

// Index for unread message queries
chatMessageSchema.index({
  companyId: 1,
  partnershipId: 1,
  adminType: 1,
  senderType: 1,
  readAt: { $exists: false }
});

export default mongoose.model('ChatMessage', chatMessageSchema);