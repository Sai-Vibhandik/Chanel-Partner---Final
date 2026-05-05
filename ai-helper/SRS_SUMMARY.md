# SRS Summary - Channel Partner Management Portal

**Document Source:** Real Estate SRS (interpreted for this project)

---

## 1. Project Purpose

### The Problem
Real estate developers rely on external channel partners (brokers/agents) to sell properties. Managing these partners is fragmented across:
- WhatsApp for communication
- Emails for documents
- Spreadsheets for commissions
- Phone calls for visit coordination

### The Solution
A **centralized digital platform** that streamlines all partner-related operations:
- Partner onboarding & verification
- Property distribution with visibility control
- Commission management
- Visit scheduling
- Communication
- Analytics

---

## 2. User Roles

| Role | Who | Access |
|------|-----|--------|
| **Admin** | Company staff | Full system access, manages everything |
| **Partner** | External brokers/agents | Portal access, limited to own data |

---

## 3. Module Breakdown

### Module 1: Partner Registration & Onboarding

**Flow:**
```
Partner registers → Uploads KYC documents → Admin reviews
→ Admin approves/rejects → Partner signs agreements → Account activated
```

**Features:**
- Company details (name, GST, PAN, RERA)
- Bank details for commission payout
- KYC document uploads
- Admin verification workflow
- Legal agreement signing (NDA, Channel Partner Agreement, Confidentiality)
- Agreement version control
- Auto re-sign on updates

---

### Module 2: Property Management

**Admin Side:**
- Create/edit properties
- Upload images, videos, brochures
- Set pricing and commission percentage
- Configure RERA details
- **Visibility Control:**
  - Show to all partners
  - Show to selected partners only
  - Hide from specific partners

**Partner Side:**
- View available properties
- See commission per property
- Download brochures
- View property details

---

### Module 3: Commission Management

**Commission Formula:**
```
Final Commission = Property Base Commission (%) × Partner Tier (%)

Example:
- Property offers: 5% commission
- Partner tier: Gold (50% share)
- Partner earns: 5% × 50% = 2.5% of sale value
```

**Features:**
- Automatic calculation
- Partner tier assignment (Bronze, Silver, Gold, Platinum)
- Partner-specific overrides
- Commission tracking and payout

---

### Module 4: Chat & Communication

**Features:**
- Direct messaging: Admin ↔ Partner
- Conversation history
- File attachments
- Real-time updates
- Read receipts

**Replaces:** WhatsApp, email threads

---

### Module 5: Visit Scheduling

**Partner Actions:**
- Book site visit
- Book office visit
- Select date and time
- Add client details

**Admin Actions:**
- View all visit requests
- Approve/reject requests
- Assign staff for visits
- Mark visits as completed

---

### Module 6: Dashboard & Analytics

**Admin Dashboard:**
- Total partners count
- Active partners
- Property statistics
- Visit trends (daily/weekly/monthly)
- Commission insights
- Revenue tracking

**Partner Dashboard:**
- Personal statistics
- Upcoming visits
- Commission earnings
- Quick actions

---

### Module 7: Suggested Properties

**Flow:**
```
Partner suggests a deal → Admin reviews → Admin converts to property listing
```

**Purpose:** Leverage partner network for new business opportunities

---

### Module 8: Security & Logs

**Security Features:**
- Role-based access control (RBAC)
- JWT authentication
- Password encryption

**Audit Features:**
- Login tracking (IP, device, browser)
- Email logs
- Activity audit logs
- Document access logs

---

## 4. Key Business Rules

### Partner Tiers
| Tier | Commission Share |
|------|------------------|
| Bronze | 30% |
| Silver | 40% |
| Gold | 50% |
| Platinum | 60% |

*Percentages are configurable*

### Agreement Workflow
1. Partner must sign all required agreements after approval
2. Agreements have versions
3. When agreement updates, partners must re-sign
4. Signed documents stored permanently

### Visibility Control
- **"All"**: Visible to every approved partner
- **"Selected"**: Only specified partners can see
- **"Exclude"**: All except specified partners can see

---

## 5. Technical Requirements

### Performance
- Page load < 3 seconds
- API response < 500ms
- Support 500+ concurrent users

### Security
- HTTPS for all communications
- Password hashing (bcrypt)
- JWT token-based auth
- Rate limiting
- Input validation
- CORS configuration

### Scalability
- Horizontal scaling ready
- CDN for static assets
- Database indexing

---

## 6. External Integrations

| Service | Purpose |
|---------|---------|
| Cloudinary | Image/document storage |
| Razorpay/Stripe | Commission payments |
| SMTP Service | Email notifications |
| Google Maps | Property locations |

---

## 7. Success Metrics

- Reduced onboarding time (from days to hours)
- 100% agreement compliance
- Centralized communication
- Accurate commission tracking
- Real-time analytics

---

**Last Updated:** 2026-04-28