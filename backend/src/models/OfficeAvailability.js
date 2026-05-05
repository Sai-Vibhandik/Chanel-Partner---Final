import mongoose from 'mongoose';

const officeAvailabilitySchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  officeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OfficeLocation',
    required: true
  },
  workingHours: {
    monday: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '18:00' },
      isActive: { type: Boolean, default: true }
    },
    tuesday: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '18:00' },
      isActive: { type: Boolean, default: true }
    },
    wednesday: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '18:00' },
      isActive: { type: Boolean, default: true }
    },
    thursday: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '18:00' },
      isActive: { type: Boolean, default: true }
    },
    friday: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '18:00' },
      isActive: { type: Boolean, default: true }
    },
    saturday: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '14:00' },
      isActive: { type: Boolean, default: false }
    },
    sunday: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '14:00' },
      isActive: { type: Boolean, default: false }
    }
  },
  slotDuration: {
    type: Number,
    default: 30, // minutes
    min: 15,
    max: 120
  },
  bufferTime: {
    type: Number,
    default: 0, // minutes between slots
    min: 0,
    max: 60
  },
  maxVisitsPerSlot: {
    type: Number,
    default: 3,
    min: 1,
    max: 20
  },
  blockedDates: [{
    date: { type: Date, required: true },
    reason: { type: String }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for quick lookup
officeAvailabilitySchema.index({ companyId: 1, officeId: 1 }, { unique: true });

const OfficeAvailability = mongoose.model('OfficeAvailability', officeAvailabilitySchema);
export default OfficeAvailability;