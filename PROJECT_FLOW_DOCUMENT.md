# Channel Partner Portal - Project Flow Document

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [User Roles & Permissions](#4-user-roles--permissions)
5. [Authentication Flow](#5-authentication-flow)
6. [Core Features & User Flows](#6-core-features--user-flows)
7. [Database Schema](#7-database-schema)
8. [API Endpoints](#8-api-endpoints)
9. [Frontend Structure](#9-frontend-structure)
10. [Key Business Rules](#10-key-business-rules)
11. [Third-Party Integrations](#11-third-party-integrations)
12. [Environment Setup](#12-environment-setup)

---

## 1. Project Overview

### Purpose
A comprehensive Channel Partner Portal for Real Estate Development Companies to manage their channel partners, properties, visits, commissions, and agreements in one unified platform.

### Business Model
- Real estate companies register on the platform
- Companies invite/manage channel partners (individual agents or agencies)
- Partners bring clients to view properties
- Companies pay commissions to partners on successful deals
- Platform tracks all interactions, visits, and agreements

### Key Stakeholders
| Stakeholder | Description |
|-------------|-------------|
| Platform Admin | Super administrators managing the entire platform |
| Company Super Admin | Company owners/administrators |
| Company Staff | Partner Managers, Property Managers, Finance Managers, Viewers |
| Channel Partners | Real estate agents/agencies bringing clients |

---

## 2. Technology Stack

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime environment |
| Express.js | Web framework |
| MongoDB | Database |
| Mongoose | ODM for MongoDB |
| Socket.IO | Real-time communication |
| JWT | Authentication tokens |
| Nodemailer | Email service |
| Cloudinary | File uploads (images, documents) |
| bcryptjs | Password hashing |

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| Vite | Build tool |
| React Router v6 | Routing |
| Tailwind CSS | Styling |
| Axios | HTTP client |
| Socket.IO Client | Real-time features |
| React Hot Toast | Notifications |
| React Context | State management |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT (React)                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│  │ Partner │ │ Company │ │ Partner │ │Property │ │ Finance │        │
│  │ Portal  │ │ Portal  │ │ Manager │ │ Manager │ │ Manager │        │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘        │
│       │           │           │           │           │              │
│  ┌────┴───────────┴───────────┴───────────┴───────────┴────┐        │
│  │                    AuthContext                            │        │
│  │                 (JWT Cookie-based)                        │        │
│  └───────────────────────────┬─────────────────────────────┘        │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                               │ HTTP/WebSocket
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Express.js)                          │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │                     Middleware Layer                         │     │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │     │
│  │  │  Auth    │ │  Rate    │ │ Validation│ │    Error      │  │     │
│  │  │Middleware│ │ Limiter  │ │Middleware │ │   Handler     │  │     │
│  │  └─────────┘ └──────────┘ └──────────┘ └───────────────┘  │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                               │                                       │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │                     Controller Layer                          │     │
│  │  ┌───────┐ ┌────────┐ ┌───────┐ ┌─────────┐ ┌──────────┐   │     │
│  │  │ Auth  │ │Company │ │Partner│ │Property │ │  Visit   │   │     │
│  │  └───────┘ └────────┘ └───────┘ └─────────┘ └──────────┘   │     │
│  │  ┌───────────┐ ┌───────────┐ ┌────────┐ ┌────────────┐    │     │
│  │  │Commission │ │ Agreement │ │ Office │ │  Chat/Notif │    │     │
│  │  └───────────┘ └───────────┘ └────────┘ └────────────┘    │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                               │                                       │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │                      Service Layer                            │     │
│  │         Email Service │ Upload Service │ Socket Service       │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                               │                                       │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │                       Data Layer                              │     │
│  │         MongoDB (Mongoose Models) │ Cloudinary (Files)        │     │
│  └─────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. User Roles & Permissions

### Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                    PLATFORM_ADMIN                                │
│                    (Super Admin)                                 │
│         - Full access to all companies and data                  │
│         - Can view/manage all companies on platform              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────────┐
│   COMPANY_SUPERADMIN   │     │         PARTNER                 │
│   (Company Owner)      │     │    (Channel Partner)            │
│ - Full company access  │     │ - Own profile/dashboard         │
│ - Manage all staff     │     │ - Submit partnership requests   │
│ - Manage partners      │     │ - Book visits                   │
│ - View all reports     │     │ - View assigned properties      │
└───────────┬─────────────┘     │ - Track commissions             │
            │                   └─────────────────────────────────┘
    ┌───────┴───────┬───────────────┬───────────────┐
    ▼               ▼               ▼               ▼
┌─────────┐   ┌──────────┐   ┌──────────┐   ┌────────┐
│PARTNER_ │   │PROPERTY_ │   │FINANCE_  │   │VIEWER  │
│MANAGER  │   │MANAGER   │   │MANAGER   │   │        │
└─────────┘   └──────────┘   └──────────┘   └────────┘
```

### Permission Matrix

| Feature | Platform Admin | Company Admin | Partner Manager | Property Manager | Finance Manager | Viewer | Partner |
|---------|----------------|---------------|-----------------|------------------|-----------------|--------|---------|
| **Company Management** |
| Create Company | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Edit Company | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Company | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Partner Management** |
| Approve/Reject Partners | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Partners | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | Own only |
| Edit Partner Details | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Property Management** |
| Create Property | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Edit Property | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| View Properties | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | Assigned |
| **Visit Management** |
| Create Visit Request | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Approve/Reject Visits | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Complete Visit | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Commission Management** |
| Create Commission | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Approve Commission | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| View Commissions | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | Own only |
| **Agreement Management** |
| Create/Edit Agreements | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Sign Agreements | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| View Agreements | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | Own |

---

## 5. Authentication Flow

### Registration Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                    REGISTRATION FLOW                                │
└────────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │────▶│  Fill Form  │────▶│  Submit to  │
│   Visit     │     │  (Register) │     │   /api/auth │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                 │
                    ┌────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Backend Processing                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐       │
│  │   Validate  │───▶│   Create    │───▶│   Send Verification │       │
│  │   Input     │    │   User      │    │   Email             │       │
│  └─────────────┘    └─────────────┘    └─────────────────────┘       │
│                                                                      │
│  User Status: PENDING (not verified)                                 │
│  No tokens issued yet                                                │
└──────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Email Verification                            │
│                                                                      │
│  User receives email with verification link:                         │
│  /verify-email/:token                                                │
│                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐       │
│  │   Click     │───▶│   Verify    │───▶│   Status: ACTIVE    │       │
│  │   Link      │    │   Token     │    │   Set tokens        │       │
│  └─────────────┘    └─────────────┘    └─────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

### Login Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                       LOGIN FLOW                                    │
└────────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────────────────────┐
│   User      │────▶│   Email &    │────▶│   POST /api/auth/login      │
│   Login     │     │   Password   │     │                             │
└─────────────┘     └─────────────┘     └──────────────┬──────────────┘
                                                         │
                    ┌────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Backend Processing                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐       │
│  │   Validate  │───▶│   Check     │───▶│   Generate Tokens   │       │
│  │   Request   │    │   Password  │    │   (Access + Refresh)│       │
│  └─────────────┘    └─────────────┘    └─────────────────────┘       │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │              Set HTTP-Only Cookies                            │     │
│  │  accessToken: 15 minutes (httpOnly, secure in production)    │     │
│  │  refreshToken: 7 days (httpOnly, secure in production)       │     │
│  └─────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend Response                             │
│                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐       │
│  │   Store     │───▶│   Redirect  │───▶│   Load Dashboard    │       │
│  │   User Data │    │   to Role   │    │   Based on Role     │       │
│  └─────────────┘    └─────────────┘    └─────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

### Token Refresh Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TOKEN REFRESH FLOW                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────────────────────┐
│   Access    │────▶│   401       │────▶│   POST /api/auth/           │
│   Token     │     │   Error     │     │   refresh-token             │
│   Expired   │     │             │     │   (cookie sent auto)       │
└─────────────┘     └─────────────┘     └──────────────┬──────────────┘
                                                         │
                    ┌────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Backend Processing                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐       │
│  │   Verify    │───▶│   Generate  │───▶│   Set New Access    │       │
│  │   Refresh   │    │   New       │    │   Token Cookie      │       │
│  │   Token     │    │   Tokens    │    │                      │       │
│  └─────────────┘    └─────────────┘    └─────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Retry Original Request                           │
│                                                                      │
│   Frontend automatically retries the failed request with new token  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Core Features & User Flows

### 6.1 Partnership Request Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                  PARTNERSHIP REQUEST FLOW                           │
└────────────────────────────────────────────────────────────────────┘

Partner                          Company Admin
  │                                    │
  │  ┌──────────────────┐              │
  │  │ Apply to Company │              │
  │  │ (Upload KYC)     │              │
  │  └────────┬─────────┘              │
  │           │                        │
  │           ▼                        │
  │  Status: PENDING                   │
  │                                    │
  │                    ┌───────────────┤
  │                    │ Review KYC    │
  │                    │ Documents     │
  │                    └───────┬───────┘
  │                            │
  │              ┌─────────────┴─────────────┐
  │              ▼                           ▼
  │        ┌──────────┐               ┌──────────┐
  │        │ APPROVE  │               │ REJECT  │
  │        └────┬─────┘               └────┬─────┘
  │             │                          │
  │             ▼                          ▼
  │      Status: ACTIVE              Status: REJECTED
  │      (Can book visits)          (Can reapply)
  │             │
  │             ▼
  │      ┌──────────────────┐
  │      │ Assign Properties │
  │      │ Set Commission    │
  │      │ Rate             │
  │      └──────────────────┘
  │
```

### 6.2 Visit Booking Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                      VISIT BOOKING FLOW                             │
└────────────────────────────────────────────────────────────────────┘

Partner                                    Company Staff
  │                                             │
  │  ┌────────────────────────────────┐         │
  │  │ Select Company (Partnership)   │         │
  │  └────────────────┬───────────────┘         │
  │                   │                         │
  │                   ▼                         │
  │  ┌────────────────────────────────┐         │
  │  │ Select Property                │         │
  │  │ (from assigned properties)     │         │
  │  └────────────────┬───────────────┘         │
  │                   │                         │
  │                   ▼                         │
  │  ┌────────────────────────────────┐         │
  │  │ Choose Visit Type:             │         │
  │  │ - Site Visit (at property)     │         │
  │  │ - Office Visit (at office)     │         │
  │  │ - Virtual Tour                 │         │
  │  └────────────────┬───────────────┘         │
  │                   │                         │
  │                   ▼                         │
  │  ┌────────────────────────────────┐         │
  │  │ Client Details (Optional):     │         │
  │  │ - Name, Phone, Email           │         │
  │  │ - Notes                        │         │
  │  └────────────────┬───────────────┘         │
  │                   │                         │
  │                   ▼                         │
  │  ┌────────────────────────────────┐         │
  │  │ Select Date & Time Slot        │         │
  │  │ (Check availability for office)│        │
  │  └────────────────┬───────────────┘         │
  │                   │                         │
  │                   ▼                         │
  │  Status: PENDING                             │
  │                                             │
  │                           ┌─────────────────┤
  │                           │ Review Request   │
  │                           └────────┬────────┘
  │                                    │
  │                      ┌─────────────┴──────────┐
  │                      ▼                          ▼
  │                ┌──────────┐              ┌──────────┐
  │                │ APPROVE  │              │ REJECT   │
  │                └────┬─────┘              └────┬─────┘
  │                     │                         │
  │                     ▼                         ▼
  │              Status: APPROVED          Status: REJECTED
  │                     │
  │                     ▼
  │              ┌──────────────────┐
  │              │ Visit Conducted  │
  │              └────────┬─────────┘
  │                       │
  │                       ▼
  │              ┌──────────────────────────┐
  │              │ Mark as COMPLETED or     │
  │              │ DEAL_CLOSED              │
  │              └──────────────────────────┘
  │
```

### 6.3 Commission Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                      COMMISSION FLOW                                │
└────────────────────────────────────────────────────────────────────┘

Partner                    Finance Manager              Company Admin
  │                              │                           │
  │                              │                           │
  │         (After deal closed)  │                           │
  │                              │                           │
  │                              ▼                           │
  │                    ┌──────────────────┐                │
  │                    │ Create Commission │                │
  │                    │ - Select Partner  │                │
  │                    │ - Select Property │                │
  │                    │ - Set Amount      │                │
  │                    │ - Set Status      │                │
  │                    └────────┬─────────┘                 │
  │                             │                           │
  │                             ▼                           │
  │                    Status: PENDING                       │
  │                             │                           │
  │                             │                           │
  │            ┌────────────────┴────────────────────┐     │
  │            │                                     │     │
  │            ▼                                     ▼     │
  │     ┌──────────────┐                    ┌──────────────┐
  │     │ Company Admin│                    │ Finance Mgr  │
  │     │ Approval     │                    │ Approval     │
  │     └──────┬───────┘                    └──────┬───────┘
  │            │                                     │
  │            └────────────────┬────────────────────┘
  │                             │
  │                             ▼
  │                    ┌──────────────────┐
  │                    │ Status: APPROVED │
  │                    └────────┬─────────┘
  │                             │
  │                             ▼
  │                    ┌──────────────────┐
  │                    │ Mark as PAID     │
  │                    │ (Finance Manager)│
  │                    └────────┬─────────┘
  │                             │
  │                             ▼
  │                    Status: PAID
  │                    (Partner notified)
  │
```

### 6.4 Agreement Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                      AGREEMENT FLOW                                 │
└────────────────────────────────────────────────────────────────────┘

Company Admin/Staff                    Partner
        │                                 │
        ▼                                 │
┌──────────────────┐                      │
│ Create Agreement │                      │
│ Template         │                      │
│ - Title          │                      │
│ - Content        │                      │
│ - Version        │                      │
└────────┬─────────┘                      │
         │                                │
         ▼                                │
┌──────────────────┐                      │
│ Assign to        │                      │
│ Partner(s)        │                      │
└────────┬─────────┘                      │
         │                                │
         ▼                                │
   Status: PENDING                        │
         │                                │
         │           Notification          │
         │────────────────────────────────▶│
         │                                │
         │                       ┌────────┴────────┐
         │                       │ View Agreement  │
         │                       │ Document        │
         │                       └────────┬────────┘
         │                                │
         │                                ▼
         │                       ┌────────────────┐
         │                       │ E-Signature    │
         │                       │ (Aadhaar/Digi)│
         │                       └────────┬───────┘
         │                                │
         │◀───────────────────────────────┤
         │                                │
         ▼                                │
   Status: SIGNED                         │
         │                                │
         ▼                                │
┌──────────────────┐                      │
│ Store Signed     │                      │
│ Document         │                      │
│ (Cloudinary)     │                      │
└──────────────────┘                      │
```

---

## 7. Database Schema

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATABASE SCHEMA                                │
└─────────────────────────────────────────────────────────────────────────┘

┌───────────────────┐         ┌───────────────────┐
│      User         │         │     Company       │
├───────────────────┤         ├───────────────────┤
│ _id               │────────▶│ _id               │
│ email             │         │ name              │
│ password          │         │ description       │
│ role              │         │ logo              │
│ companyId         │◀────────│ website           │
│ isEmailVerified   │         │ address           │
│ phone             │         │ contactEmail      │
│ profile           │         │ isActive          │
│ lastLogin         │         │ subscriptionPlan  │
│ preferences       │         │ settings          │
└───────────────────┘         └───────────────────┘
         │                            │
         │                            │
         ▼                            ▼
┌───────────────────┐         ┌───────────────────┐
│   Partnership     │         │    Property       │
├───────────────────┤         ├───────────────────┤
│ _id               │         │ _id               │
│ partnerId         │◀───────▶│ companyId         │
│ companyId         │         │ name              │
│ status            │         │ type              │
│ commissionRate    │         │ location          │
│ assignedProperties│         │ price             │
│ kycDocuments      │         │ status            │
│ agreementSigned   │         │ amenities          │
│ startDate         │         │ images             │
└───────────────────┘         │ documents         │
                              └───────────────────┘
                                      │
         ┌────────────────────────────┤
         │                            │
         ▼                            ▼
┌───────────────────┐         ┌───────────────────┐
│      Visit        │         │   Commission     │
├───────────────────┤         ├───────────────────┤
│ _id               │         │ _id               │
│ propertyId        │         │ partnerId         │
│ partnershipId     │         │ companyId         │
│ partnerId         │         │ propertyId        │
│ visitType         │         │ visitId           │
│ scheduledDate     │         │ amount             │
│ scheduledTime     │         │ percentage        │
│ status            │         │ status            │
│ clientDetails     │         │ dealValue         │
│ partnerNotes      │         │ paidDate          │
│ companyNotes      │         │ notes             │
│ officeLocation    │         └───────────────────┘
└───────────────────┘

┌───────────────────┐         ┌───────────────────┐
│    Agreement      │         │     Office        │
├───────────────────┤         ├───────────────────┤
│ _id               │         │ _id               │
│ title             │         │ companyId         │
│ content           │         │ name              │
│ type              │         │ address           │
│ version           │         │ phone             │
│ createdBy         │         │ capacity          │
│ signatures[]      │         │ isActive          │
│ isActive          │         │ workingHours      │
└───────────────────┘         │ availability      │
                              └───────────────────┘

┌───────────────────┐         ┌───────────────────┐
│    Notification   │         │   ChatMessage     │
├───────────────────┤         ├───────────────────┤
│ _id               │         │ _id               │
│ recipientId       │         │ senderId          │
│ type              │         │ recipientId       │
│ title             │         │ message           │
│ message           │         │ read              │
│ read              │         │ createdAt         │
│ link              │         └───────────────────┘
│ createdAt         │
└───────────────────┘
```

### Key Collections

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| **users** | All platform users | email, role, companyId, profile |
| **companies** | Real estate companies | name, subscription, settings |
| **properties** | Real estate properties | name, location, price, status |
| **partnerships** | Partner-Company relationships | partnerId, companyId, status, commissionRate |
| **visits** | Site visits booked by partners | propertyId, partnerId, status, clientDetails |
| **commissions** | Partner commissions | partnerId, amount, status |
| **agreements** | Legal agreements | title, content, signatures |
| **offices** | Company office locations | name, address, availability |
| **notifications** | User notifications | recipientId, type, read |
| **chatmessages** | Real-time chat | senderId, recipientId, message |

---

## 8. API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register/company` | Register new company | Public |
| POST | `/register/partner` | Register new partner | Public |
| POST | `/login` | User login | Public |
| POST | `/logout` | User logout | Protected |
| GET | `/me` | Get current user | Protected |
| POST | `/refresh-token` | Refresh access token | Public (cookie) |
| POST | `/forgot-password` | Request password reset | Public |
| POST | `/reset-password/:token` | Reset password | Public |
| POST | `/verify-email/:token` | Verify email address | Public |
| POST | `/resend-verification` | Resend verification email | Public |
| PUT | `/profile` | Update profile | Protected |
| PUT | `/password` | Change password | Protected |

### Company Routes (`/api/companies`)

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/` | List all companies | Platform Admin |
| GET | `/:id` | Get company details | Platform Admin |
| PUT | `/:id` | Update company | Company Admin |
| GET | `/me` | Get my company | Company Staff |
| PUT | `/me` | Update my company | Company Admin |

### Partner Routes (`/api/partners`)

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/` | List partners | Company Staff |
| GET | `/:id` | Get partner details | Company Staff |
| PUT | `/:id` | Update partner | Company Admin |

### Partnership Routes (`/api/partner-company`)

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/apply` | Apply for partnership | Partner |
| GET | `/my-companies` | Get my partnerships | Partner |
| GET | `/company/:companyId` | Get company partners | Company Staff |
| PUT | `/:id/status` | Update partnership status | Company Staff |
| PUT | `/:id/assign-properties` | Assign properties | Partner Manager |
| PUT | `/:id/commission` | Set commission rate | Company Admin |

### Property Routes (`/api/properties`)

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/` | List properties | All |
| GET | `/:id` | Get property details | All |
| POST | `/` | Create property | Property Manager |
| PUT | `/:id` | Update property | Property Manager |
| DELETE | `/:id` | Delete property | Property Manager |
| GET | `/partnership/:id` | Get partnership properties | Partner |
| GET | `/company/:companyId` | Get company properties | Company Staff |

### Visit Routes (`/api/visits`)

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/my` | Get my visits | Partner |
| GET | `/company` | Get company visits | Company Staff |
| GET | `/:id` | Get visit details | All |
| POST | `/` | Book a visit | Partner |
| PUT | `/:id/status` | Update visit status | Company Staff |
| PUT | `/:id/cancel` | Cancel visit | Partner |

### Commission Routes (`/api/commissions`)

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/` | List commissions | Finance Manager |
| GET | `/my` | Get my commissions | Partner |
| GET | `/:id` | Get commission details | All |
| POST | `/` | Create commission | Finance Manager |
| PUT | `/:id/status` | Update status | Finance Manager |
| PUT | `/:id/approve` | Approve commission | Company Admin |

### Agreement Routes (`/api/agreements`)

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/` | List agreements | All |
| GET | `/:id` | Get agreement details | All |
| POST | `/` | Create agreement | Company Admin |
| PUT | `/:id` | Update agreement | Company Admin |
| POST | `/:id/sign` | Sign agreement | Partner |

### Office Routes (`/api/offices`)

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/` | List offices | Company Staff |
| GET | `/available` | Get available offices | Partner |
| GET | `/:id/available-slots` | Get available time slots | Partner |
| POST | `/` | Create office | Company Admin |
| PUT | `/:id` | Update office | Company Admin |

---

## 9. Frontend Structure

### Directory Structure

```
frontend/
├── public/
│   └── favicon.png
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── BookVisitModal.jsx      # Reusable visit booking modal
│   │   │   ├── ExportButton.jsx        # Data export component
│   │   │   ├── PartnersList.jsx        # Partners list component
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── DashboardLayout.jsx     # Main layout wrapper
│   │   │   ├── Sidebar.jsx            # Navigation sidebar
│   │   │   └── Header.jsx              # Top header
│   │   └── chat/
│   │       ├── ConversationList.jsx   # Chat conversations
│   │       └── ChatWindow.jsx         # Chat messages
│   ├── config/
│   │   └── sidebar.jsx                # Sidebar configuration per role
│   ├── context/
│   │   ├── AuthContext.jsx           # Authentication state
│   │   └── SocketContext.jsx         # Socket.IO connection
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── Login.jsx
│   │   │   ├── RegisterCompany.jsx
│   │   │   ├── RegisterPartner.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   └── ProfileSettings.jsx
│   │   ├── admin/
│   │   │   ├── KYCVerification.jsx
│   │   │   └── KYCDetail.jsx
│   │   ├── company/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Partners.jsx
│   │   │   ├── Team.jsx
│   │   │   ├── OfficeManagement.jsx
│   │   │   └── Settings.jsx
│   │   ├── partner/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Properties.jsx
│   │   │   ├── Visits.jsx
│   │   │   ├── MyCompanies.jsx
│   │   │   ├── Profile.jsx
│   │   │   └── Chat.jsx
│   │   ├── partner-manager/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Partners.jsx
│   │   │   ├── Visits.jsx
│   │   │   └── Reports.jsx
│   │   ├── property-manager/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Properties.jsx
│   │   │   └── Reports.jsx
│   │   └── finance-manager/
│   │       ├── Dashboard.jsx
│   │       ├── Commissions.jsx
│   │       └── Reports.jsx
│   ├── utils/
│   │   ├── api.js                    # Axios configuration
│   │   └── validation.js             # Form validation utilities
│   ├── App.jsx                       # Main app with routes
│   └── main.jsx                      # Entry point
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

### Route Configuration

```javascript
// Main Routes Structure
const routes = {
  // Public Routes
  '/login': Login,
  '/register/company': RegisterCompany,
  '/register/partner': RegisterPartner,
  '/forgot-password': ForgotPassword,
  '/reset-password/:token': ResetPassword,
  '/verify-email/:token': VerifyEmail,

  // Platform Admin Routes
  '/platform/*': PlatformAdminPages,

  // Company Admin Routes
  '/company/*': CompanyAdminPages,

  // Partner Manager Routes
  '/partner-manager/*': PartnerManagerPages,

  // Property Manager Routes
  '/property-manager/*': PropertyManagerPages,

  // Finance Manager Routes
  '/finance-manager/*': FinanceManagerPages,

  // Viewer Routes
  '/viewer/*': ViewerPages,

  // Partner Routes
  '/partner/*': PartnerPages
};
```

---

## 10. Key Business Rules

### 10.1 Partnership Rules
- Partners must complete KYC verification before approval
- Only one active partnership per company per partner
- Commission rate is set at partnership level (default: company-specific)
- Partners can only see properties assigned to their partnership

### 10.2 Visit Booking Rules
- Partners can only book visits for assigned properties
- Office visits require checking slot availability
- Site visits can be scheduled without slot restrictions
- Visits can be cancelled only if status is `pending` or `approved`

### 10.3 Commission Rules
- Commissions can only be created for `deal_closed` visits
- Commission amount = Deal Value × Commission Rate
- Commission requires approval from Company Admin or Finance Manager
- Commission status flow: `pending` → `approved` → `paid`

### 10.4 Agreement Rules
- Only Company Admin and Partner Manager can create agreements
- Partners can only view and sign agreements assigned to them
- Signed agreements are stored as PDF in Cloudinary
- Agreement versioning is tracked for audit purposes

### 10.5 Office Booking Rules
- Office capacity is tracked per time slot
- Maximum concurrent bookings per slot: Office capacity
- Time slots: 30-minute intervals (configurable)
- Availability is calculated per date

---

## 11. Third-Party Integrations

### 11.1 Cloudinary (File Uploads)
- Used for: Property images, KYC documents, Agreement PDFs
- Upload endpoint: `/api/upload`
- Returns: Secure URL for file access

### 11.2 Nodemailer (Email Service)
- Used for: Email verification, Password reset, Notifications
- SMTP Configuration: Host, Port, User, Password
- Templates: Verification, Reset Password, Welcome

### 11.3 Socket.IO (Real-time)
- Used for: Chat, Notifications, Live updates
- Events: `connection`, `message`, `notification`

---

## 12. Environment Setup

### 12.1 Backend Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/channel-partner-portal

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 12.2 Frontend Environment Variables

```env
VITE_API_URL=http://localhost:5000/api
```

### 12.3 Installation Steps

```bash
# Clone repository
git clone <repository-url>
cd channel-partner-portal

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with your values
npm run dev

# Frontend setup
cd ../frontend
npm install
cp .env.example .env
# Edit .env with your values
npm run dev
```

---

## Appendix A: Status Codes

### Partnership Status
| Status | Description |
|--------|-------------|
| `pending` | Application submitted, awaiting review |
| `active` | Approved and active partnership |
| `rejected` | Application rejected |
| `suspended` | Temporarily suspended |

### Visit Status
| Status | Description |
|--------|-------------|
| `pending` | Booking requested |
| `approved` | Approved by company |
| `rejected` | Rejected by company |
| `completed` | Visit completed |
| `deal_closed` | Deal successfully closed |
| `cancelled` | Cancelled by partner |

### Commission Status
| Status | Description |
|--------|-------------|
| `pending` | Commission created, pending approval |
| `approved` | Approved by admin |
| `paid` | Payment completed |
| `rejected` | Rejected by admin |

---

## Appendix B: Error Handling

### API Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Common Error Codes
| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate resource |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Appendix C: Security Features

### Implemented Security Measures
1. **JWT Token in HTTP-Only Cookies** - Prevents XSS token theft
2. **CSRF Protection** - SameSite cookie attribute
3. **Rate Limiting** - Prevents brute force attacks
4. **Input Validation** - Server-side validation on all inputs
5. **Password Hashing** - bcrypt with salt rounds
6. **Email Verification** - Required before account activation
7. **Role-Based Access Control** - Middleware protection on routes
8. **Helmet.js** - Security headers
9. **CORS Configuration** - Origin whitelist

---

*Document Version: 1.0*
*Last Updated: May 2026*
*Author: Claude AI Assistant*