# Project Overview - Multi-Tenant SaaS Platform

## Project Name
Channel Partner Management Portal (SaaS Platform)

---

## What This Project Is

A **Multi-Tenant SaaS Platform** for real estate companies to manage their channel partners. Multiple real estate companies can register and use the platform, each with their own isolated data, partners, and properties.

---

## The Problem It Solves

Real estate companies rely on external brokers (channel partners) to sell properties. Managing these partners is fragmented across WhatsApp, emails, and spreadsheets. This platform centralizes everything and allows multiple companies to use the same system with complete data isolation.

---

## Multi-Region Support

The platform supports operations in both **India** and **Dubai**:

| Aspect | India | Dubai |
|--------|-------|-------|
| **Currency** | INR (₹) | AED (د.إ) |
| **Regulatory Body** | RERA | DLD |
| **Phone Code** | +91 | +971 |
| **States/Regions** | 28 States + 8 UTs | 7 Emirates |
| **Tax** | GST | VAT (5%) |
| **Timezone** | IST (UTC+5:30) | GST (UTC+4) |
| **Area Unit** | Square Feet | Square Meters |

---

## Platform Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      PLATFORM ADMIN                              │
│                   (Platform Owner - You)                          │
│                                                                  │
│  • Manages ALL companies                                         │
│  • Handles billing/subscriptions                                 │
│  • Views platform-wide analytics                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Manages
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        COMPANIES                                  │
│         (Real Estate Companies using the platform)               │
│                                                                  │
│  Company A: ABC Developers (India only)                          │
│  Company B: XYZ Builders (Dubai only)                            │
│  Company C: DEF Properties (India + Dubai)                       │
│  Company D: GHI Realty (India + Dubai)                           │
│  ... and more                                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Each company has isolated
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    COMPANY DATA (Isolated)                        │
│                                                                  │
│  • Company Staff (SuperAdmin, Managers, Viewers)                │
│  • Channel Partners                                              │
│  • Properties                                                    │
│  • Visits, Commissions, Agreements                               │
│  • Settings & Configuration                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## User Roles

### Platform Level

| Role | Description |
|------|-------------|
| **Platform Admin** | Platform owner - manages all companies, billing, platform analytics |

### Company Level

| Role | Description |
|------|-------------|
| **Company SuperAdmin** | Company owner - full access to their company |
| **Partner Manager** | Manages partners - approval, verification, tier assignment |
| **Property Manager** | Manages properties - create, edit, visibility control |
| **Finance Manager** | Manages commissions - approve, pay, track |
| **Legal Manager** | Manages agreements - templates, versions |
| **Operations Manager** | Manages visits - approve, reject, complete |
| **Viewer** | View only - dashboard and analytics |
| **Channel Partner** | External broker - partner portal access |

---

## Key Features

### Multi-Tenancy
- Complete data isolation between companies
- Each company has its own partners, properties, settings
- Platform Admin can view/manage all companies

### Multi-Region
- Companies can operate in India, Dubai, or both
- Region-specific KYC documents
- Region-specific property fields (RERA for India, DLD for Dubai)
- Multi-currency support (INR, AED)
- Timezone-aware scheduling

### Partner Management
- Self-registration for partners
- Region-specific KYC verification
- Tier-based commission system
- Agreement signing workflow

### Property Management
- Create properties with region-specific fields
- Visibility control (show to selected/exclude partners)
- Cross-region visibility for multi-region companies
- Multi-currency pricing

### Commission System
- Automatic calculation based on tier
- Multi-currency support
- Approval and payment tracking

### Communication
- Real-time chat between admin and partners
- In-app and email notifications

### Analytics
- Platform-wide analytics (Platform Admin)
- Company-specific analytics (Company roles)
- Personal dashboard (Partners)

---

## Commission Logic

```
Final Commission = Property Base Commission (%) × Partner Tier (%)

Example:
- Property commission: 5%
- Partner tier: Gold (50% share)
- Final commission: 5% × 50% = 2.5% of sale value

Tier Percentages (configurable per company):
- Bronze: 30%
- Silver: 40%
- Gold: 50%
- Platinum: 60%
```

---

## Visibility Control

Properties can have visibility settings:
- **All Partners** - Visible to all active partners in the company
- **Selected Partners** - Only specified partners can see
- **Exclude Partners** - All partners except specified ones can see

---

## Region-Specific Features

### India-Specific

**Partner KYC Documents:**
- PAN Card
- GST Certificate
- RERA Registration (optional)
- Address Proof
- Cancelled Cheque

**Property Fields:**
- RERA Number
- RERA Project Name
- GST Number
- State (28 states + 8 UTs)
- PIN Code

### Dubai-Specific

**Partner KYC Documents:**
- Trade License
- RERA Registration Card
- Emirates ID
- Passport Copy
- Visa Copy (optional)

**Property Fields:**
- DLD Permit Number
- Developer Name
- Project Name
- Emirate (7 emirates)
- Escrow Account Number

---

## Technology Stack

### Backend
- **Runtime:** Node.js 22 (LTS)
- **Framework:** Express.js 5.x
- **Database:** MongoDB + Mongoose 8.x
- **Authentication:** JWT
- **File Storage:** Cloudinary
- **Email:** Nodemailer
- **Payments:** Stripe (for SaaS subscriptions)

### Frontend
- **Framework:** React 19
- **Build Tool:** Vite 6.x
- **Styling:** Tailwind CSS 3.x
- **State Management:** Zustand 5.x
- **Routing:** React Router 7.x
- **HTTP Client:** Axios

### Infrastructure
- **Hosting:** Cloud-based (AWS/GCP/Azure)
- **Database:** MongoDB Atlas
- **CDN:** For static assets
- **Monitoring:** Application monitoring

---

## Data Isolation

Every data model includes `companyId` field for tenant isolation:

```javascript
// All queries are automatically filtered by company
const companyScope = (req, res, next) => {
  if (req.user.role === 'platform_admin') {
    return next(); // Platform admin sees all
  }
  req.query.companyId = req.user.companyId;
  next();
};
```

---

## Subscription Plans

| Plan | Features | Price |
|------|----------|-------|
| **Trial** | 14 days, limited features | Free |
| **Basic** | Up to 50 partners, 100 properties | $X/month |
| **Professional** | Up to 200 partners, 500 properties | $Y/month |
| **Enterprise** | Unlimited, custom features | Custom |

---

## Success Metrics

- Multiple companies successfully using platform
- Complete data isolation between companies
- Companies operating in both India and Dubai
- Partners seeing correct properties based on visibility
- Multi-currency working correctly
- All roles accessing only permitted features

---

**Last Updated:** 2026-04-29