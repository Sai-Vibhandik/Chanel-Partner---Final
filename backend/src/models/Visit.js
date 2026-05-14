import mongoose from 'mongoose';

const visitSchema = new mongoose.Schema(
  {
    // ========== TENANT ==========
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },

    // ========== REFERENCES ==========
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true
    },
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    partnershipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PartnerCompany',
      required: true
    },

    // ========== VISIT DETAILS ==========
    visitType: {
      type: String,
      enum: ['office', 'virtual'],
      default: 'office'
    },
    // Office location for 'office' type visits
    officeLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OfficeLocation'
    },
    scheduledDate: {
      type: Date,
      required: true
    },
    scheduledTime: {
      type: String,
      required: true // Format: "HH:MM" (24-hour)
    },
    // Reference to the time slot (if booked through slot system)
    timeSlot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TimeSlot'
    },

    // ========== CLIENT INFORMATION ==========
    clientDetails: {
      name: {
        type: String
      },
      phone: {
        type: String
      },
      email: String,
      notes: String,
      country: String,
      preferredLanguage: String
    },

    // ========== STATUS ==========
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
      default: 'pending',
      index: true
    },
    rejectionReason: String,
    cancellationReason: String,

    // ========== ADMIN ==========
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    adminNotes: String,
    partnerNotes: String,

    // ========== FOLLOW-UP ==========
    followUpRequired: {
      type: Boolean,
      default: false
    },
    followUpDate: Date,
    followUpNotes: String,

    // ========== COMPLETION ==========
    completedAt: Date,
    completionNotes: String,
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String
    },

    // ========== NOTIFICATIONS ==========
    remindersSent: {
      oneDayBefore: { type: Boolean, default: false },
      oneHourBefore: { type: Boolean, default: false }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for common queries
visitSchema.index({ companyId: 1, status: 1 });
visitSchema.index({ companyId: 1, scheduledDate: 1 });
visitSchema.index({ partner: 1, status: 1 });
visitSchema.index({ property: 1 });
visitSchema.index({ partnershipId: 1 });

// Virtual for formatted date time
visitSchema.virtual('formattedDateTime').get(function() {
  const date = this.scheduledDate?.toLocaleDateString();
  return `${date} at ${this.scheduledTime}`;
});

const Visit = mongoose.model('Visit', visitSchema);
export default Visit;