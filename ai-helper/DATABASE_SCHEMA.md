# Database Schema - Multi-Tenant SaaS Platform

## Collections Overview

| Collection | Description |
|------------|-------------|
| `companies` | Real estate companies (tenants) |
| `users` | All users (Platform Admin, Company Staff, Partners) |
| `properties` | Properties (scoped to company) |
| `visits` | Site visit bookings |
| `chats` | Chat messages |
| `agreements` | Agreement templates |
| `signedagreements` | Signed agreements |
| `commissions` | Commission records |
| `suggestions` | Property suggestions |
| `notifications` | System notifications |
| `auditlogs` | Activity logs |
| `subscriptions` | Company subscription/billing |

---

## Company Schema

```javascript
{
  _id: ObjectId,

  // Basic Information
  name: { type: String, required: true },
  slug: { type: String, unique: true },  // For subdomain: abc.portal.com
  email: { type: String, required: true },
  phone: String,
  website: String,
  logo: { url: String, publicId: String },

  // Operating Regions
  regions: [{
    type: String,
    enum: ['india', 'dubai'],
    required: true
  }],

  // Default currency (primary)
  defaultCurrency: {
    type: String,
    enum: ['INR', 'AED'],
    default: 'INR'
  },

  // Address
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },

  // Region-Specific Configuration
  indiaConfig: {
    gstNumber: String,
    reraNumber: String,
    cinNumber: String,  // Corporate Identity Number
    panNumber: String
  },

  dubaiConfig: {
    tradeLicenseNumber: String,
    dldNumber: String,  // Dubai Land Department
    vatNumber: String,
    tasheelNumber: String
  },

  // Documents
  documents: [{
    type: {
      type: String,
      enum: ['trade_license', 'rera_certificate', 'company_registration', 'other']
    },
    name: String,
    url: String,
    publicId: String,
    verifiedAt: Date,
    status: { type: String, enum: ['pending', 'verified', 'rejected'] }
  }],

  // Subscription
  subscription: {
    plan: {
      type: String,
      enum: ['trial', 'basic', 'professional', 'enterprise'],
      default: 'trial'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'trial'],
      default: 'trial'
    },
    trialEndsAt: Date,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    stripeCustomerId: String,
    stripeSubscriptionId: String
  },

  // Settings
  settings: {
    // Tier percentages (customizable per company)
    tierPercentages: {
      bronze: { type: Number, default: 30 },
      silver: { type: Number, default: 40 },
      gold: { type: Number, default: 50 },
      platinum: { type: Number, default: 60 }
    },

    // Commission settings
    defaultCommissionPercentage: { type: Number, default: 5 },

    // Feature flags
    features: {
      chatEnabled: { type: Boolean, default: true },
      suggestionsEnabled: { type: Boolean, default: true },
      analyticsEnabled: { type: Boolean, default: true }
    },

    // Notifications
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    }
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'cancelled'],
    default: 'pending'
  },

  // Stats (computed)
  stats: {
    totalPartners: { type: Number, default: 0 },
    totalProperties: { type: Number, default: 0 },
    totalVisits: { type: Number, default: 0 },
    totalCommissionPaid: { type: Number, default: 0 }
  },

  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:** slug (unique), status, regions

---

## User Schema (Unified - Multi-Tenant)

```javascript
{
  _id: ObjectId,

  // ========== TENANT (Company) ==========
  companyId: { type: ObjectId, ref: 'Company', required: true },
  // Note: Platform Admin has companyId = null (platform level)

  // ========== COMMON FIELDS ==========
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: String,
  avatar: { url: String, publicId: String },

  // ========== ROLE (Single Field) ==========
  role: {
    type: String,
    enum: [
      // Platform level
      'platform_admin',

      // Company level - Admin
      'company_superadmin',

      // Company level - Managers
      'partner_manager',
      'property_manager',
      'finance_manager',
      'legal_manager',
      'operations_manager',
      'viewer',

      // Partner
      'partner'
    ],
    required: true
  },

  // ========== STATUS ==========
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  lastLogin: Date,

  // ========== FOR PARTNER ROLE ONLY ==========
  partnerProfile: {
    // Company Information
    companyName: String,
    companyType: { type: String, enum: ['individual', 'proprietorship', 'partnership', 'llp', 'pvtltd', 'freelancer'] },

    // Region-specific identification
    // India
    gstNumber: String,
    panNumber: String,
    reraNumber: String,  // India RERA

    // Dubai
    tradeLicenseNumber: String,
    dubaiReraNumber: String,  // Dubai RERA
    emiratesId: String,
    passportNumber: String,

    // Contact Information
    phone: String,
    alternatePhone: String,
    website: String,

    // Region (which region this partner operates in)
    operatingRegion: { type: String, enum: ['india', 'dubai', 'both'] },

    // Address (flexible for both regions)
    address: {
      street: String,
      city: String,
      state: String,  // State for India, Emirate for Dubai
      country: String,
      zipCode: String,
      region: { type: String, enum: ['india', 'dubai'] }
    },

    // Primary Contact Person
    contactPerson: {
      name: String,
      designation: String,
      email: String,
      phone: String
    },

    // Bank Details (for commission payout)
    bankDetails: {
      accountHolder: String,
      accountNumber: String,
      ifscCode: String,      // India
      swiftCode: String,      // Dubai/International
      bankName: String,
      branchName: String,
      iban: String            // Dubai
    },

    // Tier & Commission
    tier: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'bronze' },
    commissionOverride: Number,

    // Status
    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'active', 'rejected', 'suspended'],
      default: 'pending'
    },

    // KYC Documents (Region-specific)
    kycDocuments: [{
      type: {
        type: String,
        enum: [
          // India documents
          'gst_certificate',
          'pan_card',
          'rera_certificate',
          'address_proof',
          'cancelled_cheque',
          // Dubai documents
          'trade_license',
          'rera_registration_card',
          'emirates_id',
          'passport_copy',
          'visa_copy',
          'other'
        ]
      },
      url: String,
      publicId: String,
      uploadedAt: Date,
      verifiedAt: Date,
      status: { type: String, enum: ['pending', 'verified', 'rejected'] },
      region: { type: String, enum: ['india', 'dubai'] }
    }],

    // Signed Agreements
    signedAgreements: [{
      agreement: { type: ObjectId, ref: 'Agreement' },
      signedAt: Date,
      documentUrl: String,
      version: String
    }],

    // Stats
    stats: {
      totalVisits: { type: Number, default: 0 },
      totalDeals: { type: Number, default: 0 },
      totalCommissionEarned: { type: Number, default: 0 }
    },

    adminNotes: String,
    rejectionReason: String
  },

  // ========== FOR COMPANY STAFF (Created by Company SuperAdmin) ==========
  createdBy: { type: ObjectId, ref: 'User' },

  // ========== AUTH FIELDS ==========
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  emailVerificationToken: String,

  // ========== LOGIN HISTORY ==========
  loginHistory: [{
    ip: String,
    device: String,
    browser: String,
    timestamp: Date
  }],

  timestamps: true
}
```

**Indexes:**
- email (unique)
- companyId + role
- companyId + 'partnerProfile.status'
- companyId + 'partnerProfile.tier'

---

## Property Schema (Multi-Tenant)

```javascript
{
  _id: ObjectId,

  // ========== TENANT ==========
  companyId: { type: ObjectId, ref: 'Company', required: true },
  createdBy: { type: ObjectId, ref: 'User', required: true },

  // ========== BASIC INFORMATION ==========
  title: { type: String, required: true },
  description: String,
  propertyType: {
    type: String,
    enum: ['apartment', 'villa', 'plot', 'commercial', 'shop', 'office', 'warehouse', 'townhouse', 'penthouse'],
    required: true
  },
  listingType: { type: String, enum: ['sale', 'rent', 'lease'], required: true },

  // ========== LOCATION (Region-Aware) ==========
  region: { type: String, enum: ['india', 'dubai'], required: true },

  location: {
    address: String,
    locality: String,
    city: String,
    // For India
    state: String,
    // For Dubai
    emirate: String,
    country: String,
    zipCode: String,
    coordinates: { type: { type: String }, coordinates: [Number] },
    landmark: String
  },

  // ========== PRICING (Multi-Currency) ==========
  price: {
    amount: { type: Number, required: true },
    currency: { type: String, enum: ['INR', 'AED'], required: true },
    pricePerSqFt: Number,
    pricePerSqM: Number,  // Dubai uses square meters
    maintenanceCharges: Number,
    maintenanceCurrency: { type: String, enum: ['INR', 'AED'] },
    bookingAmount: Number
  },

  // ========== PROPERTY DETAILS ==========
  details: {
    bedrooms: Number,
    bathrooms: Number,
    balconies: Number,
    totalFloors: Number,
    floorNumber: Number,
    ageOfProperty: Number,
    facing: String,
    ownershipType: { type: String, enum: ['freehold', 'leasehold', 'cooperative'] },

    // Area
    carpetArea: Number,
    builtUpArea: Number,
    superBuiltUpArea: Number,
    plotArea: Number,
    // Dubai uses different measurements
    plotSizeSqM: Number,
    builtUpAreaSqM: Number,

    // Features
    furnished: { type: String, enum: ['unfurnished', 'semi-furnished', 'fully-furnished'] },
    parking: { type: String, enum: ['none', 'covered', 'open', 'both'] },
    petFriendly: Boolean,
    wheelchairAccessible: Boolean,

    possessionDate: Date,
    possessionStatus: { type: String, enum: ['under-construction', 'ready-to-move', 'new-booking'] }
  },

  // ========== AMENITIES ==========
  amenities: {
    general: [String],
    nearby: [String]
  },

  // ========== REGION-SPECIFIC REGULATORY ==========
  // India - RERA
  reraDetails: {
    reraRegistered: Boolean,
    reraNumber: String,
    reraProjectName: String,
    reraWebsite: String
  },

  // Dubai - DLD
  dldDetails: {
    dldRegistered: Boolean,
    dldPermitNumber: String,
    projectName: String,
    developerName: String,
    escrowAccountNumber: String
  },

  // ========== COMMISSION ==========
  commission: {
    basePercentage: { type: Number, required: true },
    isFixed: { type: Boolean, default: false },
    fixedAmount: Number,
    fixedCurrency: { type: String, enum: ['INR', 'AED'] }
  },

  // ========== MEDIA ==========
  images: [{
    url: String,
    publicId: String,
    caption: String,
    isPrimary: Boolean
  }],
  videos: [{
    url: String,
    publicId: String,
    thumbnail: String,
    caption: String
  }],
  virtualTourUrl: String,
  brochure: { url: String, publicId: String },
  floorPlans: [{
    url: String,
    publicId: String,
    name: String
  }],

  // ========== VISIBILITY ==========
  visibility: {
    type: { type: String, enum: ['all', 'selected', 'exclude'], default: 'all' },
    partnerIds: [{ type: ObjectId, ref: 'User' }]
  },

  // ========== STATUS ==========
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive', 'sold', 'rented'],
    default: 'draft'
  },
  isFeatured: { type: Boolean, default: false },

  // ========== STATS ==========
  stats: {
    views: { type: Number, default: 0 },
    inquiries: { type: Number, default: 0 },
    totalVisits: { type: Number, default: 0 }
  },

  timestamps: true
}
```

**Indexes:**
- companyId + status
- companyId + region
- companyId + 'location.city'
- companyId + propertyType
- companyId + 'price.amount'

---

## Visit Schema

```javascript
{
  _id: ObjectId,

  // Tenant
  companyId: { type: ObjectId, ref: 'Company', required: true },

  // References
  property: { type: ObjectId, ref: 'Property', required: true },
  partner: { type: ObjectId, ref: 'User', required: true },

  // Visit Details
  visitType: { type: String, enum: ['site', 'office', 'virtual'], default: 'site' },
  scheduledDate: { type: Date, required: true },
  scheduledTime: { type: String, required: true },

  // Client Information
  clientDetails: {
    name: String,
    phone: String,
    email: String,
    notes: String,
    country: String  // Client can be from anywhere
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
    default: 'pending'
  },
  rejectionReason: String,
  cancellationReason: String,

  // Admin
  handledBy: { type: ObjectId, ref: 'User' },
  adminNotes: String,
  partnerNotes: String,

  // Follow-up
  followUpRequired: { type: Boolean, default: false },
  followUpDate: Date,

  timestamps: true
}
```

---

## Commission Schema

```javascript
{
  _id: ObjectId,

  // Tenant
  companyId: { type: ObjectId, ref: 'Company', required: true },

  // References
  partner: { type: ObjectId, ref: 'User', required: true },
  property: { type: ObjectId, ref: 'Property' },
  visit: { type: ObjectId, ref: 'Visit' },

  // Deal Details
  dealValue: { type: Number, required: true },
  dealCurrency: { type: String, enum: ['INR', 'AED'], required: true },

  // Commission Calculation
  propertyCommission: { type: Number, required: true },  // Base %
  partnerTier: { type: Number, required: true },         // Tier %
  finalCommissionPercentage: { type: Number, required: true },
  finalCommissionAmount: { type: Number, required: true },

  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'paid', 'rejected', 'cancelled'],
    default: 'pending'
  },

  // Payment
  paidAt: Date,
  transactionId: String,
  paymentMethod: String,

  // Approval
  approvedBy: { type: ObjectId, ref: 'User' },
  approvedAt: Date,

  notes: String,

  timestamps: true
}
```

---

## Agreement Schema

```javascript
{
  _id: ObjectId,

  // Tenant
  companyId: { type: ObjectId, ref: 'Company', required: true },

  // Details
  title: { type: String, required: true },
  type: {
    type: String,
    enum: ['nda', 'partner_agreement', 'confidentiality', 'compliance', 'custom'],
    required: true
  },
  content: String,  // HTML with placeholders

  // Version
  version: { type: String, required: true },

  // Region-specific (optional)
  applicableRegions: [{ type: String, enum: ['india', 'dubai'] }],

  // Status
  isActive: { type: Boolean, default: true },
  requiresSignature: { type: Boolean, default: true },

  createdBy: { type: ObjectId, ref: 'User' },

  timestamps: true
}
```

---

## Notification Schema

```javascript
{
  _id: ObjectId,

  // Tenant
  companyId: { type: ObjectId, ref: 'Company', required: true },

  // Recipient
  recipient: { type: ObjectId, ref: 'User', required: true },

  // Content
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['system', 'visit', 'property', 'commission', 'agreement', 'partner'],
    required: true
  },

  // Reference
  relatedId: ObjectId,
  relatedModel: String,

  // Status
  isRead: { type: Boolean, default: false },
  readAt: Date,

  // Delivery
  channels: {
    inApp: { sent: Boolean, sentAt: Date },
    email: { sent: Boolean, sentAt: Date },
    sms: { sent: Boolean, sentAt: Date }
  },

  createdAt: Date
}
```

---

## Audit Log Schema

```javascript
{
  _id: ObjectId,

  // Tenant
  companyId: { type: ObjectId, ref: 'Company' },  // null for platform-level actions

  // Actor
  actor: {
    type: { type: String, enum: ['platform_admin', 'company_user', 'partner'] },
    id: { type: ObjectId, ref: 'User' },
    name: String,
    email: String,
    role: String
  },

  // Action
  action: { type: String, required: true },
  resource: { type: String, required: true },
  resourceId: ObjectId,

  // Details
  details: Object,

  // Request Info
  ip: String,
  userAgent: String,

  timestamp: { type: Date, default: Date.now }
}
```

---

## Role Permissions Map (Updated for SaaS)

```javascript
const rolePermissions = {
  // Platform Level
  platform_admin: ['all_platform'],

  // Company Level - Full Access
  company_superadmin: ['all_company'],

  // Company Level - Managers
  partner_manager: [
    'view_partners',
    'manage_partners',
    'view_analytics'
  ],

  property_manager: [
    'view_properties',
    'manage_properties',
    'view_suggestions',
    'manage_suggestions',
    'view_analytics'
  ],

  finance_manager: [
    'view_commissions',
    'manage_commissions',
    'view_analytics'
  ],

  legal_manager: [
    'view_agreements',
    'manage_agreements',
    'view_partners',
    'view_analytics'
  ],

  operations_manager: [
    'view_visits',
    'manage_visits',
    'view_analytics'
  ],

  viewer: [
    'view_analytics'
  ],

  // Partner
  partner: [
    'view_properties',
    'book_visits',
    'view_own_commissions',
    'chat_with_admin',
    'sign_agreements',
    'manage_own_profile',
    'submit_suggestions'
  ]
};
```

---

## Data Isolation Middleware

```javascript
// Automatically filter by companyId for all queries
const companyScope = (req, res, next) => {
  // Platform admin can see all
  if (req.user.role === 'platform_admin') {
    return next();
  }

  // All other roles are scoped to their company
  req.query.companyId = req.user.companyId;
  next();
};
```

---

**Last Updated:** 2026-04-29