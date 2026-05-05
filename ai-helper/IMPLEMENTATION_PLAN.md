# Implementation Plan - Multi-Tenant SaaS Platform

## Overview

This is a **Multi-Tenant SaaS Platform** for real estate channel partner management. Multiple real estate companies can register and use the platform, each with their own isolated data. Companies can operate in **India**, **Dubai**, or both regions.

---

## 🌍 Multi-Region Support

| Region | Currency | Regulatory | Documents |
|--------|----------|------------|-----------|
| **India** | INR (₹) | RERA | PAN, GST, RERA Certificate |
| **Dubai** | AED (د.إ) | DLD | Trade License, RERA Card, Emirates ID |

---

## 📅 Development Timeline

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 1 | Week 1-2 | Platform Foundation & Multi-Tenancy |
| Phase 2 | Week 3-4 | Company Management & Auth |
| Phase 3 | Week 5-6 | Core Modules (Partners, Properties) |
| Phase 4 | Week 7-8 | Workflow Modules (Visits, Commissions) |
| Phase 5 | Week 9-10 | Communication & Agreements |
| Phase 6 | Week 11-12 | Dashboards & Analytics |
| Phase 7 | Week 13-14 | Multi-Region Features |
| Phase 8 | Week 15-16 | Polish & Testing |

---

## 👥 Role System (SaaS Multi-Tenant)

### Platform Level

| Role | Description |
|------|-------------|
| **Platform Admin** | Platform owner - manages all companies, billing, platform analytics |

### Company Level

| Role | Description |
|------|-------------|
| **Company SuperAdmin** | Company owner - full access to their company |
| **Partner Manager** | Manages partners in their company |
| **Property Manager** | Manages properties in their company |
| **Finance Manager** | Manages commissions in their company |
| **Legal Manager** | Manages agreements in their company |
| **Operations Manager** | Manages visits in their company |
| **Viewer** | View analytics only |
| **Channel Partner** | Partner portal access for their company |

---

# PHASE 1: Platform Foundation & Multi-Tenancy

## Week 1: Project Setup & Database

### Day 1-3: Project Initialization

#### Backend Setup
- [ ] Initialize Node.js project with ES modules
- [ ] Configure Express.js 5.x server
- [ ] Setup MongoDB connection with Mongoose
- [ ] Configure environment variables
- [ ] Setup error handling middleware
- [ ] Configure CORS, Helmet, Rate limiting
- [ ] Setup Cloudinary for file uploads
- [ ] Configure Nodemailer for emails

#### Frontend Setup
- [ ] Initialize Vite + React 19 project
- [ ] Configure Tailwind CSS
- [ ] Setup project folder structure
- [ ] Configure React Router v7
- [ ] Setup Zustand for state management
- [ ] Setup Axios with interceptors
- [ ] Create base layout components

#### Database Models - Day 2-3
- [ ] Create Company model (tenant)
- [ ] Create User model (unified, multi-tenant)
- [ ] Create Property model
- [ ] Create Visit model
- [ ] Create Commission model
- [ ] Create Chat model
- [ ] Create Agreement model
- [ ] Create Notification model
- [ ] Create AuditLog model
- [ ] Create Subscription model
- [ ] Setup indexes for multi-tenancy (companyId)

### Day 4-5: Multi-Tenancy Middleware

#### Backend
- [ ] Company scope middleware
- [ ] Tenant isolation logic
- [ ] Subdomain/Slug-based company detection
- [ ] Platform admin bypass logic

```javascript
// Example middleware
const companyScope = (req, res, next) => {
  if (req.user.role === 'platform_admin') {
    return next();
  }
  req.query.companyId = req.user.companyId;
  next();
};
```

### Day 6-7: Platform Admin Setup

#### Backend
- [ ] Platform Admin seed script
- [ ] Platform Admin login
- [ ] Platform Admin middleware

#### Frontend
- [ ] Platform Admin layout
- [ ] Platform Admin dashboard placeholder

---

## Week 2: Company Management

### Day 8-10: Company Registration & Management

#### Backend
```
POST   /api/platform/companies           - Create company (Platform Admin)
GET    /api/platform/companies           - List all companies
GET    /api/platform/companies/:id       - Get company details
PUT    /api/platform/companies/:id       - Update company
PUT    /api/platform/companies/:id/status - Activate/Suspend company
DELETE /api/platform/companies/:id       - Delete company
```

#### Company Registration Flow
- [ ] Company self-registration endpoint
- [ ] Region selection (India/Dubai/Both)
- [ ] Region-specific configuration
- [ ] Company SuperAdmin creation
- [ ] Email verification

#### Frontend
- [ ] Company registration page (public)
- [ ] Company listing page (Platform Admin)
- [ ] Company detail page
- [ ] Region selection component
- [ ] Company settings page

### Day 11-12: Subscription System (Basic)

#### Backend
- [ ] Subscription model integration
- [ ] Trial period logic
- [ ] Subscription status middleware
- [ ] Plan limits enforcement

```
GET    /api/company/subscription         - Get subscription status
PUT    /api/company/subscription         - Update subscription (Platform Admin)
```

### Day 13-14: Testing Phase 1

- [ ] Test Platform Admin login
- [ ] Test company creation
- [ ] Test company isolation
- [ ] Test multi-tenancy middleware

---

# PHASE 2: Authentication System

## Week 3: Auth Implementation

### Day 15-17: Auth Controller

#### Backend
```
POST   /api/auth/register/company        - Company self-registration
POST   /api/auth/register/partner        - Partner registration
POST   /api/auth/login                    - Login (all roles)
POST   /api/auth/logout                   - Logout
POST   /api/auth/refresh-token            - Refresh token
POST   /api/auth/forgot-password          - Forgot password
POST   /api/auth/reset-password/:token    - Reset password
POST   /api/auth/verify-email/:token      - Email verification
GET    /api/auth/me                       - Get current user
```

#### Role-based Redirect
- [ ] Platform Admin → /platform/dashboard
- [ ] Company SuperAdmin → /company/dashboard
- [ ] Managers → /{role}/dashboard
- [ ] Partner → /partner/dashboard

### Day 18-19: Auth Frontend

#### Pages
- [ ] Login page (all roles)
- [ ] Company registration page (multi-step)
- [ ] Partner registration page (multi-step)
- [ ] Forgot password page
- [ ] Reset password page
- [ ] Email verification page

### Day 20-21: Company SuperAdmin Features

#### Backend
```
POST   /api/company/users                 - Create staff user
GET    /api/company/users                 - List company users
PUT    /api/company/users/:id             - Update user
DELETE /api/company/users/:id              - Delete user
PUT    /api/company/users/:id/status       - Activate/Deactivate
```

#### Frontend
- [ ] Company users list page
- [ ] Create user form (role selection)
- [ ] Edit user form

---

## Week 4: Partner Management

### Day 22-24: Partner Controller

#### Backend
```
GET    /api/partner-manager/partners              - List partners
GET    /api/partner-manager/partners/:id          - Get partner
PUT    /api/partner-manager/partners/:id          - Update partner
PUT    /api/partner-manager/partners/:id/status   - Update status
PUT    /api/partner-manager/partners/:id/tier     - Update tier
POST   /api/partner-manager/partners/:id/verify-kyc - Verify KYC
PUT    /api/partner-manager/partners/:id/override-commission
```

### Day 25-26: Region-Specific KYC

#### India KYC Documents
- [ ] PAN Card upload
- [ ] GST Certificate upload
- [ ] RERA Certificate (optional)
- [ ] Address Proof
- [ ] Cancelled Cheque

#### Dubai KYC Documents
- [ ] Trade License upload
- [ ] RERA Registration Card
- [ ] Emirates ID
- [ ] Passport Copy
- [ ] Visa Copy (optional)

### Day 27-28: Partner Frontend

#### Partner Manager Side
- [ ] Partners list page
- [ ] Filters: status, tier, region, city
- [ ] Partner detail page
- [ ] KYC viewer (region-aware)
- [ ] Status change modal
- [ ] Tier assignment

#### Partner Side
- [ ] Profile page
- [ ] KYC upload (region-specific forms)
- [ ] Document status view

---

# PHASE 3: Core Modules

## Week 5: Property Management

### Day 29-31: Property Controller

#### Backend
```
POST   /api/property-manager/properties           - Create property
GET    /api/property-manager/properties           - List properties
GET    /api/property-manager/properties/:id       - Get property
PUT    /api/property-manager/properties/:id       - Update property
DELETE /api/property-manager/properties/:id       - Delete property
PUT    /api/property-manager/properties/:id/status - Update status
PUT    /api/property-manager/properties/:id/visibility
POST   /api/property-manager/properties/:id/images
POST   /api/property-manager/properties/:id/brochure
```

### Day 32-33: Region-Specific Property Fields

#### India Properties
- [ ] RERA Number
- [ ] RERA Project Name
- [ ] GST Number
- [ ] State selection (28 states + 8 UTs)
- [ ] INR pricing

#### Dubai Properties
- [ ] DLD Permit Number
- [ ] Developer Name
- [ ] Project Name
- [ ] Emirate selection (7 emirates)
- [ ] AED pricing
- [ ] Square meters (instead of sq ft)

### Day 34-35: Property Frontend

#### Property Manager Side
- [ ] Properties list page
- [ ] Create property form (region-aware)
- [ ] Region selector
- [ ] Currency display (INR/AED)
- [ ] Visibility settings
- [ ] Image/video upload

#### Partner Side
- [ ] Properties list (with visibility filter)
- [ ] Property detail page
- [ ] Multi-currency display
- [ ] Brochure download

---

## Week 6: Commission Management

### Day 36-38: Commission Controller

#### Backend
```
POST   /api/finance-manager/commissions          - Create commission
GET    /api/finance-manager/commissions          - List commissions
GET    /api/finance-manager/commissions/:id      - Get commission
PUT    /api/finance-manager/commissions/:id/approve
PUT    /api/finance-manager/commissions/:id/pay
POST   /api/finance-manager/commissions/calculate

GET    /api/partner/commissions                  - List my commissions
```

### Day 39-40: Multi-Currency Commission

- [ ] Commission in INR
- [ ] Commission in AED
- [ ] Currency conversion display (optional)
- [ ] Tier-based calculation

### Day 41-42: Commission Frontend

#### Finance Manager Side
- [ ] Commissions list page
- [ ] Currency filter
- [ ] Commission detail
- [ ] Approve/Pay actions

#### Partner Side
- [ ] My commissions
- [ ] Currency display
- [ ] Download statement

---

# PHASE 4: Workflow Modules

## Week 7: Visit Scheduling

### Day 43-45: Visit Controller

#### Backend
```
POST   /api/partner/visits                        - Book visit
GET    /api/partner/visits                        - My visits
PUT    /api/partner/visits/:id/cancel             - Cancel visit

GET    /api/operations-manager/visits             - List visits
PUT    /api/operations-manager/visits/:id/approve
PUT    /api/operations-manager/visits/:id/reject
PUT    /api/operations-manager/visits/:id/complete
GET    /api/operations-manager/visits/calendar
```

### Day 46-47: Timezone Handling

- [ ] IST for India (UTC+5:30)
- [ ] GST for Dubai (UTC+4)
- [ ] Display times based on property region

### Day 48-49: Visit Frontend

#### Partner Side
- [ ] Book visit form
- [ ] My visits list

#### Operations Manager Side
- [ ] Visits list
- [ ] Calendar view
- [ ] Approve/Reject

---

## Week 8: Chat & Communication

### Day 50-52: Chat Controller

#### Backend
```
GET    /api/*/chats                        - List conversations
GET    /api/*/chats/:partnerId             - Get conversation
POST   /api/*/chats/:partnerId             - Send message
PUT    /api/*/chats/:partnerId/read        - Mark read

GET    /api/partner/chat                   - Partner chat
POST   /api/partner/chat                   - Send to admin
```

### Day 53-54: Real-time Chat

- [ ] Socket.io setup
- [ ] Real-time messaging
- [ ] File attachments

### Day 55-56: Chat Frontend

- [ ] Conversations sidebar
- [ ] Chat window
- [ ] Message input
- [ ] File attachments

---

# PHASE 5: Agreements & Notifications

## Week 9: Agreement Module

### Day 57-59: Agreement Controller

#### Backend
```
GET    /api/legal-manager/agreements       - List templates
POST   /api/legal-manager/agreements       - Create template
PUT    /api/legal-manager/agreements/:id   - Update template
PUT    /api/legal-manager/agreements/:id/version

GET    /api/partner/agreements             - List to sign
POST   /api/partner/agreements/:id/sign    - Sign agreement
GET    /api/partner/agreements/signed      - Signed list
```

### Day 60-61: Region-Specific Agreements

- [ ] India agreements (RERA compliance)
- [ ] Dubai agreements (DLD compliance)
- [ ] Agreement templates per region

### Day 62-63: Agreement Frontend

#### Legal Manager Side
- [ ] Agreements list
- [ ] Create/Edit form
- [ ] Region assignment
- [ ] Version management

#### Partner Side
- [ ] Pending agreements
- [ ] Sign flow
- [ ] Signed list

---

## Week 10: Notifications & Dashboards

### Day 64-66: Notification System

#### Backend
- [ ] Notification service
- [ ] In-app notifications
- [ ] Email notifications
- [ ] Notification triggers

### Day 67-70: Dashboard Implementation

#### Platform Admin Dashboard
- [ ] Total companies
- [ ] Companies by region
- [ ] Revenue by region
- [ ] Subscription stats

#### Company Dashboards
- [ ] Company SuperAdmin: Full company stats
- [ ] Managers: Role-specific stats
- [ ] Partner: Personal stats

---

# PHASE 6: Additional Features

## Week 11: Suggestions & Settings

### Day 71-73: Suggested Properties

#### Backend
```
POST   /api/partner/suggestions             - Submit suggestion
GET    /api/partner/suggestions             - My suggestions

GET    /api/property-manager/suggestions    - List all
PUT    /api/property-manager/suggestions/:id/accept
PUT    /api/property-manager/suggestions/:id/reject
```

### Day 74-75: Company Settings

#### Backend
```
GET    /api/company/settings               - Get settings
PUT    /api/company/settings               - Update settings
```

#### Settings
- [ ] Tier percentages
- [ ] Default commission
- [ ] Feature flags
- [ ] Notification preferences

### Day 76-77: Platform Settings

#### Backend
- [ ] Platform configuration
- [ ] Subscription plans
- [ ] Feature toggles

---

## Week 12: Multi-Region Enhancements

### Day 78-79: Currency System

- [ ] INR/AED support
- [ ] Currency display formatting
- [ ] Currency conversion (optional)
- [ ] Multi-currency reports

### Day 80-81: Location System

#### India
- [ ] States dropdown (28 + 8 UTs)
- [ ] Cities database
- [ ] PIN code validation

#### Dubai
- [ ] Emirates dropdown (7)
- [ ] Areas/localities
- [ ] Building name support

### Day 82-84: Regulatory Compliance

#### India
- [ ] RERA number validation
- [ ] RERA project linking
- [ ] GST validation

#### Dubai
- [ ] DLD permit validation
- [ ] Developer verification
- [ ] Escrow account linking

---

# PHASE 7: Polish & Security

## Week 13: Frontend Polish

- [ ] Loading states
- [ ] Error handling
- [ ] Form validation (region-aware)
- [ ] Empty states
- [ ] Confirmation dialogs
- [ ] Responsive design
- [ ] Mobile optimization

## Week 14: Security & Performance

- [ ] Multi-tenant security audit
- [ ] Data isolation verification
- [ ] Rate limiting per company
- [ ] Input validation (all endpoints)
- [ ] XSS/CSRF protection
- [ ] API caching
- [ ] Query optimization

---

# PHASE 8: Testing & Deployment

## Week 15: Testing

### Backend Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] Multi-tenancy tests
- [ ] Region-specific tests

### Frontend Testing
- [ ] Component tests
- [ ] E2E tests
- [ ] Cross-browser testing

## Week 16: Deployment

- [ ] Production environment setup
- [ ] Database migration
- [ ] SSL certificates
- [ ] Domain configuration
- [ ] Monitoring setup
- [ ] Backup configuration
- [ ] Final testing

---

# 📊 Module Completion Checklist

## Multi-Tenancy
- [ ] Company model and isolation
- [ ] Company scope middleware
- [ ] Platform Admin dashboard
- [ ] Company SuperAdmin dashboard
- [ ] Data isolation verified

## Authentication
- [ ] Multi-role login
- [ ] Company registration
- [ ] Partner registration
- [ ] Email verification
- [ ] Password reset

## Multi-Region
- [ ] India configuration
- [ ] Dubai configuration
- [ ] Region-specific KYC
- [ ] Region-specific property fields
- [ ] Multi-currency support
- [ ] Timezone handling

## Partner Management
- [ ] Partner CRUD
- [ ] KYC verification
- [ ] Tier assignment
- [ ] Status management

## Property Management
- [ ] Property CRUD
- [ ] Visibility control
- [ ] Region-specific fields
- [ ] Media uploads

## Visit Scheduling
- [ ] Visit booking
- [ ] Approval workflow
- [ ] Calendar view

## Commission Management
- [ ] Commission calculation
- [ ] Multi-currency
- [ ] Approval/Payment

## Chat
- [ ] Real-time messaging
- [ ] File attachments

## Agreements
- [ ] Template management
- [ ] Region-specific templates
- [ ] Signing workflow

## Dashboards
- [ ] Platform Admin dashboard
- [ ] Company dashboards
- [ ] Partner dashboard

---

# 🎯 Success Criteria

- Multiple companies can register and use platform
- Data is completely isolated between companies
- Platform Admin can manage all companies
- Companies can operate in India, Dubai, or both
- Partners see correct properties based on visibility
- Multi-currency (INR/AED) works correctly
- Region-specific KYC and compliance works
- All roles can access only their permitted features

---

**This plan covers the complete Multi-Tenant SaaS Platform with India and Dubai support.**