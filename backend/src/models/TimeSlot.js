import mongoose from 'mongoose';

/**
 * Time Slot Model
 * Defines available time slots for visits
 * Can be general (apply to all offices) or specific to an office
 */
const timeSlotSchema = new mongoose.Schema(
  {
    // Company reference
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },

    // Slot name (e.g., "Morning Slot", "Afternoon Slot")
    name: {
      type: String,
      required: [true, 'Slot name is required'],
      trim: true
    },

    // Optional: Link to specific office (if null, applies to all offices)
    officeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OfficeLocation',
      default: null // null means it's a general slot for all offices
    },

    // Day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    dayOfWeek: {
      type: Number,
      required: [true, 'Day of week is required'],
      min: 0,
      max: 6
    },

    // Time range
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM (24-hour)']
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM (24-hour)']
    },

    // Maximum concurrent visits for this slot
    maxBookings: {
      type: Number,
      default: 1
    },

    // Slot duration in minutes (for display purposes)
    durationMinutes: {
      type: Number,
      default: 60
    },

    // Status
    isActive: {
      type: Boolean,
      default: true
    },

    // Created by
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
timeSlotSchema.index({ companyId: 1, dayOfWeek: 1, isActive: 1 });
timeSlotSchema.index({ companyId: 1, officeId: 1, dayOfWeek: 1 });

// Virtual for day name
timeSlotSchema.virtual('dayName').get(function() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[this.dayOfWeek];
});

// Static method to get available slots for a specific date
timeSlotSchema.statics.getAvailableSlots = async function(companyId, officeId, date) {
  const dayOfWeek = new Date(date).getDay();
  const Visits = mongoose.model('Visit');

  // Get all active slots for this day and company
  const query = {
    companyId,
    dayOfWeek,
    isActive: true
  };

  // If officeId provided, get slots specific to that office OR general slots (null)
  if (officeId) {
    query.$or = [
      { officeId: null },
      { officeId: officeId }
    ];
  } else {
    query.officeId = null; // Only general slots
  }

  const slots = await this.find(query).sort({ startTime: 1 });

  // For each slot, count existing bookings
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const slotsWithAvailability = await Promise.all(slots.map(async (slot) => {
    // Count visits for this date and time range
    const bookingCount = await Visits.countDocuments({
      companyId,
      scheduledDate: { $gte: startOfDay, $lte: endOfDay },
      scheduledTime: slot.startTime,
      officeLocation: officeId,
      status: { $in: ['pending', 'approved'] } // Only count active bookings
    });

    return {
      ...slot.toObject(),
      bookedCount: bookingCount,
      availableSpots: Math.max(0, slot.maxBookings - bookingCount),
      isAvailable: bookingCount < slot.maxBookings
    };
  }));

  return slotsWithAvailability;
};

const TimeSlot = mongoose.model('TimeSlot', timeSlotSchema);
export default TimeSlot;