import mongoose from 'mongoose';

const propertySchema = new mongoose.Schema(
  {
    // ========== TENANT (Company) ==========
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },

    // ========== BASIC INFO ==========
    name: {
      type: String,
      required: [true, 'Property name is required'],
      trim: true,
      maxlength: [100, 'Property name cannot exceed 100 characters']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    type: {
      type: String,
      enum: ['apartment', 'villa', 'plot', 'commercial', 'office', 'retail', 'warehouse', 'land'],
      required: [true, 'Property type is required']
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'sold_out', 'off_market'],
      default: 'draft'
    },

    // ========== SALE INFO (when sold) ==========
    soldAt: {
      type: Date
    },
    soldBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    salePrice: {
      type: Number
    },
    commissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Commission'
    },

    // ========== REGION & LOCATION ==========
    region: {
      type: String,
      enum: ['india', 'dubai'],
      required: [true, 'Region is required']
    },

    // Location details
    location: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String }, // For India
      emirate: { type: String }, // For Dubai
      country: { type: String, required: true },
      zipCode: { type: String },
      landmark: { type: String },
      mapUrl: { type: String }
    },

    // ========== PRICING ==========
    pricing: {
      basePrice: { type: Number, required: true },
      pricePerSqFt: { type: Number },
      pricePerSqM: { type: Number }, // For Dubai
      currency: {
        type: String,
        enum: ['INR', 'AED'],
        required: true
      },
      priceOnRequest: { type: Boolean, default: false },
      bookingAmount: { type: Number },
      maintenanceCharges: { type: Number },
      otherCharges: { type: Number }
    },

    // ========== PROPERTY DETAILS ==========
    details: {
      // Common fields
      bedrooms: { type: Number },
      bathrooms: { type: Number },
      balconies: { type: Number },

      // Area
      superBuiltUpArea: { type: Number }, // in sq ft or sq m
      builtUpArea: { type: Number },
      carpetArea: { type: Number },
      plotArea: { type: Number },
      areaUnit: {
        type: String,
        enum: ['sqft', 'sqm'],
        default: 'sqft'
      },

      // Floors
      totalFloors: { type: Number },
      floorNumber: { type: Number },

      // Amenities
      furnishing: {
        type: String,
        enum: ['unfurnished', 'semifurnished', 'fullyfurnished']
      },
      parking: {
        covered: { type: Number, default: 0 },
        open: { type: Number, default: 0 }
      },
      facing: { type: String },
      ageOfProperty: { type: Number }, // in years

      // Features
      powerBackup: { type: Boolean, default: false },
      lift: { type: Boolean, default: false },
      security: { type: Boolean, default: false },
      swimmingPool: { type: Boolean, default: false },
      gym: { type: Boolean, default: false },
      clubHouse: { type: Boolean, default: false },
      garden: { type: Boolean, default: false },
      childrenPlayArea: { type: Boolean, default: false },
      joggingTrack: { type: Boolean, default: false },
      indoorGames: { type: Boolean, default: false },
      fireSafety: { type: Boolean, default: false },
      rainWaterHarvesting: { type: Boolean, default: false },
      sewageTreatment: { type: Boolean, default: false },

      // Custom amenities
      customAmenities: [{ type: String }]
    },

    // ========== INDIA-SPECIFIC ==========
    indiaDetails: {
      reraNumber: { type: String },
      reraProjectName: { type: String },
      reraWebsite: { type: String },
      gstNumber: { type: String },

      // Ownership
      ownershipType: {
        type: String,
        enum: ['freehold', 'leasehold', 'cooperative', 'powerofattorney']
      },

      // Transaction type
      transactionType: {
        type: String,
        enum: ['newbooking', 'resale', 'rent']
      },

      // Possession
      possessionStatus: {
        type: String,
        enum: ['underconstruction', 'readytomove', 'ocreceived']
      },
      possessionDate: { type: Date },

      // Builder info
      builderName: { type: String },

      // Legal
      approvedBy: [{
        type: String,
        enum: ['bank', 'rera', 'developmentauthority', 'township']
      }]
    },

    // ========== DUBAI-SPECIFIC ==========
    dubaiDetails: {
      dldPermitNumber: { type: String },
      dldPropertyId: { type: String },

      // Developer
      developerName: { type: String },
      projectName: { type: String },

      // Property status
      propertyStatus: {
        type: String,
        enum: ['offplan', 'ready', 'secondary']
      },
      completionDate: { type: Date },

      // Title deed
      titleDeedNumber: { type: String },

      // Service charges
      serviceCharges: { type: Number }, // per sq ft

      // Freehold/Leasehold
      ownershipType: {
        type: String,
        enum: ['freehold', 'leasehold']
      },

      // Escrow
      escrowAccountNumber: { type: String }
    },

    // ========== MEDIA ==========
    images: [{
      url: { type: String, required: true },
      publicId: { type: String },
      caption: { type: String },
      isPrimary: { type: Boolean, default: false }
    }],
    videos: [{
      url: { type: String },
      publicId: { type: String },
      title: { type: String },
      thumbnail: { type: String }
    }],
    brochure: {
      url: { type: String },
      publicId: { type: String },
      name: { type: String }
    },
    floorPlans: [{
      url: { type: String },
      publicId: { type: String },
      name: { type: String }
    }],

    // ========== VISIBILITY ==========
    visibility: {
      type: {
        type: String,
        enum: ['all', 'selected', 'hidden'],
        default: 'all'
      },
      showPrice: { type: Boolean, default: true },
      showContact: { type: Boolean, default: true },
      partnerIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }]
    },

    // ========== COMMISSION ==========
    // Base commission percentage for this property
    // Partner's actual commission = basePercentage × partnerTierPercentage
    // Example: 5% base × 50% (Gold tier) = 2.5% effective rate
    commission: {
      basePercentage: { type: Number, default: 0 }, // e.g., 5 for 5%
    },

    // ========== METADATA ==========
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    // ========== STATS ==========
    stats: {
      totalViews: { type: Number, default: 0 },
      totalInquiries: { type: Number, default: 0 },
      totalVisits: { type: Number, default: 0 },
      totalBookings: { type: Number, default: 0 }
    },

    // ========== TIMESTAMPS ==========
    publishedAt: { type: Date },
    soldAt: { type: Date }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for multi-tenancy and filtering
propertySchema.index({ companyId: 1, status: 1 });
propertySchema.index({ companyId: 1, region: 1 });
propertySchema.index({ companyId: 1, type: 1 });
propertySchema.index({ companyId: 1, 'pricing.currency': 1 });
propertySchema.index({ 'location.city': 1 });
propertySchema.index({ 'location.state': 1 });
propertySchema.index({ 'location.emirate': 1 });

// Virtual for primary image
propertySchema.virtual('primaryImage').get(function() {
  if (!this.images || !Array.isArray(this.images) || this.images.length === 0) {
    return null;
  }
  const primary = this.images.find(img => img.isPrimary);
  return primary || this.images[0] || null;
});

// Virtual for formatted price
propertySchema.virtual('formattedPrice').get(function() {
  if (!this.pricing) {
    return 'Price not available';
  }

  const symbol = this.pricing.currency === 'INR' ? '₹' : 'AED ';
  if (this.pricing.priceOnRequest) {
    return 'Price on Request';
  }

  const price = this.pricing.basePrice || 0;
  if (price >= 10000000) {
    return `${symbol}${(price / 10000000).toFixed(2)} Cr`;
  } else if (price >= 100000) {
    return `${symbol}${(price / 100000).toFixed(2)} Lac`;
  }
  return `${symbol}${price.toLocaleString()}`;
});

const Property = mongoose.model('Property', propertySchema);
export default Property;