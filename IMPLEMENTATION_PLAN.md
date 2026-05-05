# Channel Partner Portal - Implementation Plan (Aligned with Original Requirements)

**Created:** 2026-04-30
**Status:** Needs Alignment

---

## Executive Summary

This document outlines the correct implementation plan based on the original requirements. The current system has deviated significantly from requirements and needs major restructuring.

---

## Part 1: What Needs to Change from Current System

### 1.1 Roles to REMOVE

| Role | Current Status | Action | Reason |
|------|---------------|--------|--------|
| Operations Manager | ❌ Implemented | **DELETE** | Not in requirements |
| Legal Manager | ❌ Implemented | **DELETE** | Not in requirements |
| Viewer | ⚠️ Implemented | Keep | In requirements |

### 1.2 Roles to KEEP (with adjustments)

| Role | Current Status | Changes Needed |
|------|-----------------|----------------|
| Platform Admin | ✅ Exists | Keep as-is |
| Company SuperAdmin | ✅ Exists | Rename to "Super Admin" |
| Property Manager | ✅ Exists | Keep, verify permissions |
| Partner Manager | ✅ Exists | Keep, verify permissions |
| Finance Manager | ✅ Exists | Simplify - remove Legal review workflow |
| Partner | ✅ Exists | Keep, add missing features |

### 1.3 Commission System - COMPLETE REWRITE

**Current (WRONG):**
```javascript
// Simple tier-based rates
tierCommissionRates: {
  bronze: 1,      // 1% of sale price
  silver: 1.5,    // 1.5% of sale price
  gold: 2,        // 2% of sale price
  platinum: 2.5   // 2.5% of sale price
}
```

**Required (CORRECT):**
```javascript
// Two-level commission system
// Property has base commission (e.g., 5%)
// Partner has tier percentage (e.g., Gold = 50%)
// Partner's commission = Property Base × Partner Tier %

// Example:
// Property: 5% base commission
// Partner: Gold tier (50% share)
// Partner earns: 5% × 50% = 2.5% of sale value

// Property Schema
property.commission.baseCommission: 5  // 5% base

// PartnerCompany Schema
partnership.tierPercentage: 50  // Gold = 50%

// Calculation
partnerCommission = property.baseCommission × partnership.tierPercentage
// 5% × 50% = 2.5%
```

### 1.4 Commission Approval - SIMPLIFY

**Current (OVER-ENGINEERED):**
```
Partner closes deal
  → Commission created (pending_legal_review)
  → Legal Manager reviews documents
  → Legal Manager approves (pending_approval)
  → Finance Manager approves
  → Finance Manager marks paid
```

**Required (SIMPLE):**
```
Partner closes deal
  → Commission created (pending)
  → Finance Manager marks as paid (enters payment reference)
  → Done
```

### 1.5 Features to REMOVE

| Feature | Current Status | Action |
|---------|----------------|--------|
| Legal Manager Dashboard | ❌ Implemented | DELETE |
| Legal Review Workflow | ❌ Implemented | DELETE |
| Document Upload for Commission | ❌ Implemented | DELETE (or repurpose for KYC) |
| Operations Manager Visits | ❌ Implemented | Move to Partner Manager |

### 1.6 Features to ADD

| Feature | Priority | Description |
|---------|----------|-------------|
| Chat System | HIGH | Real-time messaging Admin ↔ Partner |
| Suggest Property | HIGH | Partner submits property leads |
| Email Notifications | HIGH | Notify partners of new properties |
| Email Logs | HIGH | Track all sent emails |
| Login Logs | HIGH | Track partner logins (IP, browser, device) |
| Analytics Dashboard | HIGH | Graphs: registrations, logins, commissions over time |
| Office Locations | MEDIUM | Manage office locations for visits |
| Calendar Slots | MEDIUM | Define available slots, prevent double-booking |
| Export CSV | MEDIUM | Export data from all tables |
| Archive/Delete | MEDIUM | Soft delete with restore option |

---

## Part 2: Database Schema Changes

### 2.1 Models to MODIFY

#### Company Schema
```javascript
// ADD: Admin team management
adminUsers: [{
  user: { type: ObjectId, ref: 'User' },
  role: { type: String, enum: ['super_admin', 'property_manager', 'partner_manager', 'finance', 'viewer'] },
  permissions: [String], // Granular permissions
  addedAt: Date,
  addedBy: { type: ObjectId, ref: 'User' }
}]

// ADD: Office locations
officeLocations: [{
  name: String,
  address: String,
  city: String,
  coordinates: { lat: Number, lng: Number },
  availableDays: [String], // ['monday', 'tuesday', ...]
  availableHours: {
    start: String, // "09:00"
    end: String     // "18:00"
  },
  isActive: Boolean
}]

// ADD: Email settings
emailSettings: {
  smtpHost: String,
  smtpPort: Number,
  smtpUser: String,
  smtpPassword: String,
  fromEmail: String,
  fromName: String
}

// ADD: Legal agreement templates (NEW COLLECTION)
```

#### Property Schema
```javascript
// MODIFY: Commission structure
commission: {
  basePercentage: { type: Number, required: true }, // e.g., 5 for 5%
  currency: { type: String, default: 'INR' }
}

// ADD: Visibility control
visibility: {
  type: { type: String, enum: ['all', 'selected', 'exclude'], default: 'all' },
  selectedPartners: [{ type: ObjectId, ref: 'PartnerCompany' }] // for 'selected' or 'exclude'
}

// ADD: Location
location: {
  address: String,
  city: String,
  state: String,
  country: String,
  postalCode: String,
  googleMapsUrl: String,
  appleMapsUrl: String,
  coordinates: { lat: Number, lng: Number }
}

// ADD: Media
media: {
  images: [{ url: String, publicId: String }],
  videos: [{ title: String, url: String }],
  brochure: { url: String, publicId: String },
  floorPlans: [{ name: String, url: String }]
}
```

#### PartnerCompany Schema
```javascript
// MODIFY: Commission tier
tier: {
  name: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'bronze' },
  percentage: { type: Number, default: 25 }, // Bronze = 25%, Silver = 50%, etc.
  assignedAt: Date,
  assignedBy: { type: ObjectId, ref: 'User' }
}

// ADD: Commission overrides per property
commissionOverrides: [{
  property: { type: ObjectId, ref: 'Property' },
  overridePercentage: Number, // Custom % for this partner on this property
  reason: String,
  createdAt: Date
}]

// ADD: Profile
profile: {
  logo: String, // Company logo URL
  description: String,
  website: String,
  specialization: [String] // ['Residential', 'Commercial', 'Land', etc.]
}
```

#### Commission Schema - REWRITE
```javascript
const commissionSchema = new mongoose.Schema({
  companyId: { type: ObjectId, ref: 'Company', required: true },
  partnershipId: { type: ObjectId, ref: 'PartnerCompany', required: true },
  partner: { type: ObjectId, ref: 'User', required: true },
  property: { type: ObjectId, ref: 'Property', required: true },
  visit: { type: ObjectId, ref: 'Visit' },

  // Sale details
  saleDetails: {
    salePrice: { type: Number, required: true },
    saleDate: { type: Date, default: Date.now },
    buyerName: { type: String, required: true },
    buyerPhone: { type: String, required: true },
    buyerEmail: String
  },

  // Commission calculation (SIMPLIFIED)
  commission: {
    propertyBasePercentage: { type: Number, required: true }, // e.g., 5%
    partnerTierPercentage: { type: Number, required: true },   // e.g., 50%
    effectivePercentage: { type: Number, required: true },    // e.g., 2.5%
    calculatedAmount: { type: Number, required: true },       // e.g., ₹1,25,000
    currency: { type: String, default: 'INR' }
  },

  // Status (SIMPLIFIED)
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending'
  },

  // Payout details
  payout: {
    paidAt: Date,
    paymentMethod: { type: String, enum: ['bank_transfer', 'cheque', 'cash', 'other'] },
    paymentReference: String,
    paidBy: { type: ObjectId, ref: 'User' }
  },

  // Audit
  createdBy: { type: ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});
```

### 2.2 Models to CREATE

#### AgreementTemplate Schema (NEW)
```javascript
const agreementTemplateSchema = new mongoose.Schema({
  companyId: { type: ObjectId, ref: 'Company', required: true },

  name: { type: String, required: true }, // "NDA", "Channel Partner Agreement", etc.
  type: {
    type: String,
    enum: ['nda', 'nca', 'channel_partner_agreement', 'code_of_conduct', 'gdpr_consent'],
    required: true
  },

  content: { type: String, required: true }, // HTML content

  version: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },

  createdBy: { type: ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});
```

#### AgreementSignature Schema (NEW)
```javascript
const agreementSignatureSchema = new mongoose.Schema({
  partnershipId: { type: ObjectId, ref: 'PartnerCompany', required: true },
  agreementTemplateId: { type: ObjectId, ref: 'AgreementTemplate', required: true },

  version: { type: Number, required: true },

  // Signature details
  signedAt: { type: Date, default: Date.now },
  ipAddress: String,
  userAgent: String,
  typedName: String, // Partner typed their name as signature

  // Document
  signedDocumentUrl: String, // PDF with signature

  status: {
    type: String,
    enum: ['pending', 'signed', 'expired'],
    default: 'pending'
  }
});
```

#### Chat Schema (NEW)
```javascript
const chatMessageSchema = new mongoose.Schema({
  companyId: { type: ObjectId, ref: 'Company', required: true },
  partnershipId: { type: ObjectId, ref: 'PartnerCompany', required: true },

  sender: {
    type: { type: String, enum: ['admin', 'partner'], required: true },
    userId: { type: ObjectId, ref: 'User' }
  },

  message: { type: String, required: true },
  attachments: [{
    name: String,
    url: String,
    type: String // 'image', 'document', etc.
  }],

  readAt: Date,
  readBy: { type: ObjectId, ref: 'User' },

  createdAt: { type: Date, default: Date.now }
});

// Index for conversation
chatMessageSchema.index({ companyId: 1, partnershipId: 1, createdAt: -1 });
```

#### SuggestedProperty Schema (NEW)
```javascript
const suggestedPropertySchema = new mongoose.Schema({
  companyId: { type: ObjectId, ref: 'Company', required: true },
  partnershipId: { type: ObjectId, ref: 'PartnerCompany', required: true },
  partner: { type: ObjectId, ref: 'User', required: true },

  // Property details
  propertyName: String,
  propertyType: { type: String, enum: ['apartment', 'villa', 'plot', 'commercial', 'other'] },
  location: {
    address: String,
    city: String,
    state: String,
    coordinates: { lat: Number, lng: Number }
  },

  // Owner details
  ownerName: { type: String, required: true },
  ownerPhone: { type: String, required: true },
  ownerEmail: String,

  // Property specs
  expectedPrice: Number,
  area: Number, // sq ft
  bedrooms: Number,
  bathrooms: Number,

  description: String,
  images: [String],

  // Admin review
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'converted'],
    default: 'pending'
  },
  reviewedBy: { type: ObjectId, ref: 'User' },
  reviewedAt: Date,
  reviewNotes: String,

  // If converted to property
  convertedToProperty: { type: ObjectId, ref: 'Property' },

  createdAt: { type: Date, default: Date.now }
});
```

#### EmailLog Schema (NEW)
```javascript
const emailLogSchema = new mongoose.Schema({
  companyId: { type: ObjectId, ref: 'Company', required: true },

  type: {
    type: String,
    enum: ['property_notification', 'agreement_update', 'visit_confirmation', 'commission_paid', 'system'],
    required: true
  },

  recipients: [{ type: ObjectId, ref: 'User' }],
  subject: { type: String, required: true },
  body: { type: String, required: true },

  relatedTo: {
    type: { type: String, enum: ['property', 'agreement', 'visit', 'commission'] },
    id: ObjectId
  },

  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  sentAt: Date,
  errorMessage: String,

  isArchived: { type: Boolean, default: false },

  createdBy: { type: ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});
```

#### LoginLog Schema (NEW)
```javascript
const loginLogSchema = new mongoose.Schema({
  userId: { type: ObjectId, ref: 'User', required: true },
  userRole: { type: String, required: true },
  companyId: { type: ObjectId, ref: 'Company' },

  loginAt: { type: Date, default: Date.now },
  logoutAt: Date,

  // Device info
  ipAddress: String,
  userAgent: String,
  browser: String,    // Parsed from user agent
  os: String,          // Parsed from user agent
  device: String,       // 'desktop', 'mobile', 'tablet'

  // Location (from IP)
  city: String,
  country: String,

  // Session
  sessionId: String,
  status: { type: String, enum: ['success', 'failed'], default: 'success' }
});
```

#### OfficeLocation Schema (NEW)
```javascript
const officeLocationSchema = new mongoose.Schema({
  companyId: { type: ObjectId, ref: 'Company', required: true },

  name: { type: String, required: true },
  address: { type: String, required: true },
  city: String,
  state: String,
  postalCode: String,

  // Coordinates
  coordinates: {
    lat: Number,
    lng: Number
  },

  // Availability
  availableDays: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  }],

  workingHours: {
    start: { type: String, default: '09:00' },
    end: { type: String, default: '18:00' }
  },

  // Slot duration in minutes
  slotDuration: { type: Number, default: 60 },

  isActive: { type: Boolean, default: true },

  createdAt: { type: Date, default: Date.now }
});
```

---

## Part 3: API Endpoints

### 3.1 New/Modified Endpoints

#### Agreement Templates
```
GET    /api/agreements                    - List all agreement templates
POST   /api/agreements                    - Create agreement template
PUT    /api/agreements/:id                - Update agreement template
DELETE /api/agreements/:id                - Delete agreement template
GET    /api/agreements/:id/versions       - Get all versions
POST   /api/agreements/:id/new-version    - Create new version
```

#### Agreement Signatures
```
GET    /api/partnership/:id/agreements           - Get agreements to sign
POST   /api/partnership/:id/agreements/:agreementId/sign  - Sign agreement
GET    /api/partnership/:id/agreements/signed    - Get signed agreements
```

#### Chat
```
GET    /api/chat/conversations            - Get all conversations (Admin)
GET    /api/chat/conversations/:id        - Get conversation messages
POST   /api/chat/conversations/:id/send   - Send message
PUT    /api/chat/messages/:id/read        - Mark message as read
```

#### Suggested Properties
```
POST   /api/properties/suggest            - Partner suggests property
GET    /api/properties/suggested          - Get all suggestions (Admin)
PUT    /api/properties/suggested/:id/review  - Admin reviews suggestion
```

#### Email
```
POST   /api/email/send                    - Send email notification
GET    /api/email/logs                    - Get email logs
PUT    /api/email/logs/:id/archive        - Archive email log
DELETE /api/email/logs/:id                - Delete email log
```

#### Login Logs
```
GET    /api/logs/logins                   - Get login logs (Admin)
GET    /api/logs/logins/export            - Export to CSV
```

#### Analytics
```
GET    /api/analytics/overview            - Dashboard overview
GET    /api/analytics/registrations       - Registration trends
GET    /api/analytics/logins              - Login trends
GET    /api/analytics/commissions         - Commission trends
GET    /api/analytics/properties          - Property trends
```

#### Office Locations
```
GET    /api/office-locations              - List office locations
POST   /api/office-locations              - Create office location
PUT    /api/office-locations/:id          - Update office location
DELETE /api/office-locations/:id          - Delete office location
GET    /api/office-locations/:id/slots    - Get available slots
```

---

## Part 4: Frontend Pages

### 4.1 Admin Pages to KEEP

| Page | Status | Changes Needed |
|------|--------|----------------|
| Dashboard | ✅ Keep | Add analytics graphs |
| Partners | ✅ Keep | Add archive, export |
| Partner Details | ✅ Keep | Add agreements tab |
| Properties | ✅ Keep | Add visibility controls, export |
| Property Form | ✅ Keep | Add location fields, media gallery |
| Team | ✅ Keep | Verify roles match requirements |
| Settings | ✅ Keep | Add email settings, agreement templates |

### 4.2 Admin Pages to REMOVE

| Page | Status | Action |
|------|--------|--------|
| Legal Manager Dashboard | ❌ Remove | DELETE |
| Legal Manager Commissions | ❌ Remove | DELETE |
| Operations Manager Visits | ⚠️ Move | Move to Partner Manager |

### 4.3 Admin Pages to ADD

| Page | Priority | Description |
|------|----------|-------------|
| Agreement Templates | HIGH | CRUD for NDA, NCA, etc. |
| Chat | HIGH | Conversation threads per partner |
| Suggested Properties | HIGH | Review partner suggestions |
| Email Logs | MEDIUM | View sent emails |
| Login Logs | MEDIUM | View login history |
| Analytics | HIGH | Graphs and charts |
| Office Locations | MEDIUM | Manage office locations |

### 4.4 Partner Pages to ADD

| Page | Priority | Description |
|------|----------|-------------|
| Sign Agreements | HIGH | Sign pending agreements |
| Chat | HIGH | Message with admin |
| Suggest Property | MEDIUM | Submit property leads |

---

## Part 5: Implementation Priority

### Phase 1: Critical Fixes (Week 1-2)

1. **Fix Commission Formula**
   - Update Property model to use `baseCommission`
   - Update PartnerCompany to use `tierPercentage`
   - Rewrite commission calculation logic
   - Update all commission-related pages

2. **Remove Unnecessary Roles**
   - Delete Operations Manager role
   - Delete Legal Manager role
   - Update routes and middleware
   - Clean up frontend pages

3. **Simplify Commission Workflow**
   - Remove Legal review status
   - Remove document upload from commission
   - Simplify to: pending → paid

### Phase 2: Core Features (Week 3-4)

4. **Agreement Templates System**
   - Create AgreementTemplate model
   - Create AgreementSignature model
   - Admin: CRUD for templates
   - Partner: Sign agreements flow
   - Version control and re-sign

5. **Chat System**
   - Create ChatMessage model
   - Admin: View all conversations
   - Partner: Chat with admin
   - Real-time updates (Socket.IO or polling)
   - File attachments

### Phase 3: Additional Features (Week 5-6)

6. **Suggest Property**
   - Create SuggestedProperty model
   - Partner: Submit property form
   - Admin: Review and convert to property

7. **Email System**
   - Configure SMTP
   - Email on new property
   - Email log tracking
   - Archive/delete logs

8. **Login Logs**
   - Track every login
   - Parse user agent
   - Get location from IP
   - Admin view and export

### Phase 4: Analytics & Polish (Week 7-8)

9. **Analytics Dashboard**
   - Registration charts
   - Login activity graphs
   - Commission trends
   - Weekly/Monthly/Yearly views

10. **Office Locations & Slots**
    - Create OfficeLocation model
    - Admin: Manage locations
    - Partner: Select location when booking
    - Slot availability check

11. **Export & Archive**
    - CSV export on all tables
    - Soft delete with archive
    - Restore functionality

---

## Part 6: Migration Plan

### 6.1 Data Migration

```javascript
// Migration: Fix Commission Formula
// Run once to convert existing data

// Step 1: Add tierPercentage to PartnerCompany
db.partnercompanies.updateMany(
  { tier: 'bronze' },
  { $set: { tierPercentage: 25 } }
);
db.partnercompanies.updateMany(
  { tier: 'silver' },
  { $set: { tierPercentage: 50 } }
);
db.partnercompanies.updateMany(
  { tier: 'gold' },
  { $set: { tierPercentage: 75 } }
);
db.partnercompanies.updateMany(
  { tier: 'platinum' },
  { $set: { tierPercentage: 100 } }
);

// Step 2: Add baseCommission to Properties (default 5%)
db.properties.updateMany(
  {},
  { $set: { 'commission.basePercentage': 5 } }
);

// Step 3: Delete Operations Manager and Legal Manager users
db.users.deleteMany({ role: { $in: ['operations_manager', 'legal_manager'] } });

// Step 4: Simplify Commission status
db.commissions.updateMany(
  { status: 'pending_legal_review' },
  { $set: { status: 'pending' } }
);
db.commissions.updateMany(
  { status: 'pending_approval' },
  { $set: { status: 'pending' } }
);
```

### 6.2 Code Cleanup

1. Remove Operations Manager and Legal Manager folders
2. Remove unused routes
3. Update sidebar configuration
4. Remove commission document upload functionality
5. Simplify commission controller

---

## Part 7: Testing Checklist

### 7.1 Partner Registration Flow
- [ ] Partner registers with company details
- [ ] Partner sees agreement templates to sign
- [ ] Partner signs all agreements (typed signature)
- [ ] Partner uploads KYC documents
- [ ] Admin reviews and approves/rejects
- [ ] Partner gets email notification
- [ ] Partner can access properties after approval

### 7.2 Property Management
- [ ] Admin creates property with all details
- [ ] Admin sets base commission %
- [ ] Admin sets visibility (all/selected/exclude)
- [ ] Partner sees only authorized properties
- [ ] Partner sees correct commission (base × tier)
- [ ] Admin can override commission per partner

### 7.3 Visit Scheduling
- [ ] Partner books visit (site/office)
- [ ] Admin approves/rejects
- [ ] Calendar shows available slots
- [ ] No double-booking

### 7.4 Commission System
- [ ] Commission calculated correctly (base × tier)
- [ ] Admin marks as paid
- [ ] Partner sees commission history
- [ ] Dashboard shows commission stats

### 7.5 Chat System
- [ ] Partner sends message to admin
- [ ] Admin receives notification
- [ ] Admin replies
- [ ] Partner sees message
- [ ] File attachments work

### 7.6 Email & Logs
- [ ] Login tracked with IP/browser
- [ ] Emails sent for new properties
- [ ] Email logs recorded
- [ ] Export to CSV works

---

## Part 8: File Structure

```
backend/
├── src/
│   ├── models/
│   │   ├── AgreementTemplate.js      (NEW)
│   │   ├── AgreementSignature.js     (NEW)
│   │   ├── ChatMessage.js            (NEW)
│   │   ├── SuggestedProperty.js      (NEW)
│   │   ├── EmailLog.js               (NEW)
│   │   ├── LoginLog.js               (NEW)
│   │   ├── OfficeLocation.js         (NEW)
│   │   ├── Commission.js              (MODIFY)
│   │   ├── Property.js                (MODIFY)
│   │   ├── PartnerCompany.js          (MODIFY)
│   │   └── ...
│   ├── controllers/
│   │   ├── agreement.controller.js    (NEW)
│   │   ├── chat.controller.js        (NEW)
│   │   ├── suggestion.controller.js   (NEW)
│   │   ├── email.controller.js        (NEW)
│   │   ├── analytics.controller.js    (NEW)
│   │   ├── office.controller.js       (NEW)
│   │   └── ...
│   ├── routes/
│   │   ├── agreement.routes.js        (NEW)
│   │   ├── chat.routes.js            (NEW)
│   │   ├── suggestion.routes.js      (NEW)
│   │   ├── email.routes.js           (NEW)
│   │   ├── analytics.routes.js       (NEW)
│   │   ├── office.routes.js          (NEW)
│   │   └── ...

frontend/
├── src/
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── Agreements.jsx        (NEW)
│   │   │   ├── AgreementForm.jsx      (NEW)
│   │   │   ├── Chat.jsx               (NEW)
│   │   │   ├── SuggestedProperties.jsx (NEW)
│   │   │   ├── EmailLogs.jsx          (NEW)
│   │   │   ├── LoginLogs.jsx          (NEW)
│   │   │   ├── Analytics.jsx          (NEW)
│   │   │   ├── OfficeLocations.jsx    (NEW)
│   │   │   └── ...
│   │   ├── partner/
│   │   │   ├── SignAgreements.jsx     (NEW)
│   │   │   ├── Chat.jsx               (NEW)
│   │   │   ├── SuggestProperty.jsx    (NEW)
│   │   │   └── ...
│   │   └── ...
│   └── ...
```

---

## Part 9: Summary of Changes

### What to DELETE
1. Operations Manager role and pages
2. Legal Manager role and pages
3. Commission approval workflow (Legal/Finance)
4. Document upload from commission

### What to MODIFY
1. Commission formula (complete rewrite)
2. Property visibility controls
3. Partner commission display
4. Visit scheduling (add office locations)

### What to CREATE
1. Agreement template system
2. Chat system
3. Suggest property feature
4. Email notification system
5. Email logs
6. Login logs
7. Analytics dashboard
8. Office locations management
9. Export functionality
10. Archive/delete functionality

---

**Document End**