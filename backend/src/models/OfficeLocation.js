import mongoose from 'mongoose';

/**
 * Office Location Model
 * Stores office locations for visit scheduling
 */
const officeLocationSchema = new mongoose.Schema(
  {
    // Company reference (for multi-tenant)
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },

    // Office Details
    name: {
      type: String,
      required: [true, 'Office name is required'],
      trim: true,
      maxlength: [100, 'Office name cannot exceed 100 characters']
    },

    // Address
    address: {
      street: {
        type: String,
        required: [true, 'Street address is required']
      },
      city: {
        type: String,
        required: [true, 'City is required']
      },
      state: String,
      country: {
        type: String,
        required: [true, 'Country is required']
      },
      zipCode: String
    },

    // Contact
    phone: String,
    email: String,

    // Google Maps link
    googleMapsUrl: String,

    // Calendly integration
    calendlyUrl: {
      type: String,
      trim: true,
      default: ''
      // Example: https://calendly.com/company-name/office-visit
    },

    // Operating hours (default)
    operatingHours: {
      start: {
        type: String,
        default: '09:00' // Format: HH:MM (24-hour)
      },
      end: {
        type: String,
        default: '18:00'
      }
    },

    // Status
    isActive: {
      type: Boolean,
      default: true
    },

    // Display order
    displayOrder: {
      type: Number,
      default: 0
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

// Index for company queries
officeLocationSchema.index({ companyId: 1, isActive: 1 });
officeLocationSchema.index({ companyId: 1, displayOrder: 1 });

const OfficeLocation = mongoose.model('OfficeLocation', officeLocationSchema);
export default OfficeLocation;