# Components Hierarchy

## App Architecture

```
App.jsx
│
├── AuthProvider (Context) - Auth state management
├── ToastProvider - Notifications
│
├── Router
│   │
│   ├── Public Routes
│   │   ├── LoginPage
│   │   ├── RegisterPage
│   │   └── ForgotPasswordPage
│   │
│   ├── Admin Routes (Protected - Admin Layout)
│   │   ├── AdminLayout
│   │   │   ├── AdminSidebar
│   │   │   ├── AdminNavbar
│   │   │   └── Outlet
│   │   │
│   │   ├── Dashboard (Overview)
│   │   ├── Partners (Partner Management)
│   │   ├── Properties (Property Management)
│   │   ├── Visits (Visit Management)
│   │   ├── Commissions (Commission Management)
│   │   ├── Agreements (Agreement Templates)
│   │   ├── Chats (Partner Communication)
│   │   ├── Analytics (Reports & Insights)
│   │   └── Settings (System Settings)
│   │
│   └── Partner Routes (Protected - Partner Layout)
│       ├── PartnerLayout
│       │   ├── PartnerNavbar
│       │   ├── PartnerSidebar
│       │   └── Outlet
│       │
│       ├── Dashboard (Overview)
│       ├── Properties (Available Properties)
│       ├── Visits (My Visits)
│       ├── Commissions (My Earnings)
│       ├── Chat (Admin Communication)
│       ├── Suggestions (Submit Deals)
│       └── Profile (Settings)
```

---

## Common Components (`/components/common/`)

| Component | Props | Description |
|-----------|-------|-------------|
| `Button` | variant, size, loading, disabled, icon, onClick | Reusable button |
| `Input` | type, label, error, icon, disabled | Form input |
| `Select` | options, value, onChange, placeholder | Dropdown select |
| `Textarea` | label, error, rows | Text area |
| `Checkbox` | label, checked, onChange | Checkbox |
| `Radio` | name, options, value, onChange | Radio group |
| `Modal` | isOpen, onClose, title, size, children | Modal dialog |
| `Card` | title, subtitle, children, footer | Card container |
| `Badge` | text, variant, size | Status badge |
| `Loader` | size, color | Loading spinner |
| `Skeleton` | width, height | Loading skeleton |
| `Table` | columns, data, pagination, sortable | Data table |
| `Pagination` | currentPage, totalPages, onPageChange | Pagination |
| `EmptyState` | icon, title, message, action | Empty data state |
| `Avatar` | src, alt, size, fallback | User avatar |
| `FileUpload` | accept, multiple, onUpload, preview | File uploader |
| `SearchBar` | placeholder, onSearch, filters | Search input |
| `DatePicker` | value, onChange, min, max | Date picker |
| `TimePicker` | slots, selected, onSelect | Time slot picker |
| `Toast` | type, message, duration | Toast notification |
| `ConfirmDialog` | isOpen, title, message, onConfirm, onCancel | Confirmation |
| `Dropdown` | trigger, items, align | Dropdown menu |
| `Tabs` | tabs, activeTab, onChange | Tab navigation |
| `StatsCard` | title, value, change, icon | Statistics card |

---

## Admin Components (`/components/admin/`)

### Dashboard
| Component | Description |
|-----------|-------------|
| `DashboardStats` | Overview statistics cards |
| `RecentActivity` | Latest actions feed |
| `PartnerChart` | Partner growth chart |
| `VisitChart` | Visit trends chart |
| `CommissionChart` | Commission trends |
| `QuickActions` | Action shortcuts |

### Partner Management
| Component | Description |
|-----------|-------------|
| `PartnerTable` | Partners list with filters |
| `PartnerDetails` | Partner profile view |
| `PartnerForm` | Add/Edit partner form |
| `KYCViewer` | KYC document viewer |
| `TierSelector` | Partner tier assignment |
| `AgreementSigner` | Agreement status view |

### Property Management
| Component | Description |
|-----------|-------------|
| `PropertyTable` | Properties list |
| `PropertyForm` | Add/Edit property |
| `PropertyPreview` | Property preview card |
| `VisibilitySettings` | Partner visibility control |
| `CommissionSettings` | Commission configuration |
| `MediaUploader` | Images/videos upload |
| `BrochureUpload` | Brochure file upload |

### Visit Management
| Component | Description |
|-----------|-------------|
| `VisitTable` | Visits list with status |
| `VisitCalendar` | Calendar view of visits |
| `VisitDetails` | Visit request details |
| `VisitApproval` | Approve/Reject actions |
| `VisitFilters` | Date, status, partner filters |

### Commission Management
| Component | Description |
|-----------|-------------|
| `CommissionTable` | Commission records |
| `CommissionCalculator` | Calculate commission |
| `CommissionDetails` | Commission breakdown |
| `PaymentForm` | Mark as paid form |

### Chat
| Component | Description |
|-----------|-------------|
| `ChatList` | Conversations sidebar |
| `ChatWindow` | Message view |
| `MessageInput` | Send message with attachments |
| `ChatHeader` | Partner info in chat |

---

## Partner Components (`/components/partner/`)

### Dashboard
| Component | Description |
|-----------|-------------|
| `PartnerStats` | Personal statistics |
| `UpcomingVisits` | Scheduled visits |
| `RecentCommissions` | Latest earnings |
| `QuickLinks` | Action shortcuts |

### Properties
| Component | Description |
|-----------|-------------|
| `PropertyCard` | Property listing card |
| `PropertyGrid` | Grid view of properties |
| `PropertyDetail` | Full property view |
| `PropertyFilters` | Filter sidebar |
| `BrochureDownload` | Download brochure |

### Visits
| Component | Description |
|-----------|-------------|
| `VisitCard` | Visit booking card |
| `VisitForm` | Book visit form |
| `VisitList` | My visits list |
| `TimeSlotPicker` | Select visit slot |
| `ClientForm` | Client details form |

### Commissions
| Component | Description |
|-----------|-------------|
| `CommissionCard` | Commission record card |
| `CommissionHistory` | Earnings history |
| `EarningsChart` | Earnings visualization |

### Profile
| Component | Description |
|-----------|-------------|
| `ProfileForm` | Edit profile form |
| `KYCUpload` | Upload KYC documents |
| `BankDetails` | Bank information form |
| `AgreementList` | Agreements to sign |

---

## Layout Components (`/components/layout/`)

| Component | Description |
|-----------|-------------|
| `AdminLayout` | Admin panel wrapper |
| `PartnerLayout` | Partner portal wrapper |
| `AdminSidebar` | Admin navigation sidebar |
| `PartnerSidebar` | Partner navigation sidebar |
| `AdminNavbar` | Admin top navigation |
| `PartnerNavbar` | Partner top navigation |
| `PublicLayout` | Public pages wrapper |
| `ProtectedRoute` | Auth guard |
| `RoleRoute` | Role-based guard |

---

## Form Components (`/components/forms/`)

| Component | Description |
|-----------|-------------|
| `LoginForm` | Admin/Partner login |
| `RegisterForm` | Partner registration |
| `ForgotPasswordForm` | Password reset request |
| `ResetPasswordForm` | New password form |
| `PartnerOnboardingForm` | Multi-step registration |
| `PropertyForm` | Property creation/edit |
| `VisitBookingForm` | Visit booking form |
| `CommissionForm` | Commission entry form |

---

## Utility Components (`/components/utils/`)

| Component | Description |
|-----------|-------------|
| `ErrorBoundary` | Error handling wrapper |
| `LoadingScreen` | Full page loader |
| `NetworkStatus` | Online/offline indicator |
| `FilePreview` | Document/image preview |
| `PDFViewer` | View PDF documents |
| `Map` | Google Maps integration |

---

## Page Structure

### Admin Pages
```
/admin
├── /dashboard          → Dashboard.jsx
├── /partners
│   ├── /               → PartnersList.jsx
│   ├── /:id            → PartnerDetails.jsx
│   └── /new            → AddPartner.jsx
├── /properties
│   ├── /               → PropertiesList.jsx
│   ├── /:id            → PropertyDetails.jsx
│   └── /new            → AddProperty.jsx
├── /visits
│   ├── /               → VisitsList.jsx
│   ├── /calendar       → VisitCalendar.jsx
│   └── /:id            → VisitDetails.jsx
├── /commissions
│   ├── /               → CommissionsList.jsx
│   └── /:id            → CommissionDetails.jsx
├── /agreements
│   ├── /               → AgreementsList.jsx
│   └── /new            → CreateAgreement.jsx
├── /chats
│   ├── /               → ChatsList.jsx
│   └── /:partnerId     → ChatConversation.jsx
├── /analytics          → Analytics.jsx
├── /settings           → Settings.jsx
└── /logs
    ├── /audit          → AuditLogs.jsx
    └── /login          → LoginLogs.jsx
```

### Partner Pages
```
/partner
├── /dashboard          → PartnerDashboard.jsx
├── /properties
│   ├── /               → PropertiesList.jsx
│   └── /:id            → PropertyDetails.jsx
├── /visits
│   ├── /               → MyVisits.jsx
│   ├── /book           → BookVisit.jsx
│   └── /:id            → VisitDetails.jsx
├── /commissions        → MyCommissions.jsx
├── /chat               → AdminChat.jsx
├── /suggestions
│   ├── /               → MySuggestions.jsx
│   └── /new            → NewSuggestion.jsx
└── /profile
    ├── /               → MyProfile.jsx
    ├── /documents      → KYCDocuments.jsx
    └── /agreements     → MyAgreements.jsx
```

---

## State Management (Zustand Stores)

| Store | Purpose |
|-------|---------|
| `useAuthStore` | Auth state, user data |
| `useAdminStore` | Admin dashboard state |
| `usePartnerStore` | Partner data |
| `usePropertyStore` | Property listings |
| `useVisitStore` | Visit management |
| `useChatStore` | Chat messages |
| `useUIStore` | UI state (modals, sidebars) |

---

**Last Updated:** 2026-04-28