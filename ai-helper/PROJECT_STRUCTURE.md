# Project Structure

```
channel-partner-portal/
│
├── backend/                          # Backend (Node.js + Express)
│   ├── src/
│   │   ├── controllers/              # Request handlers
│   │   │   ├── admin.controller.js   # Admin operations
│   │   │   ├── partner.controller.js  # Partner operations
│   │   │   ├── property.controller.js # Property CRUD
│   │   │   ├── visit.controller.js    # Visit management
│   │   │   ├── commission.controller.js # Commission handling
│   │   │   ├── chat.controller.js     # Messaging
│   │   │   ├── agreement.controller.js # Agreement templates
│   │   │   ├── auth.controller.js     # Authentication
│   │   │   └── upload.controller.js    # File uploads
│   │   │
│   │   ├── models/                   # Mongoose schemas
│   │   │   ├── Admin.js              # Admin user model
│   │   │   ├── Partner.js            # Channel partner model
│   │   │   ├── Property.js           # Property listing model
│   │   │   ├── Visit.js              # Site visit model
│   │   │   ├── Chat.js               # Chat conversation model
│   │   │   ├── Agreement.js          # Agreement template model
│   │   │   ├── SignedAgreement.js    # Signed agreement model
│   │   │   ├── Commission.js         # Commission record model
│   │   │   ├── Notification.js       # Notification model
│   │   │   └── AuditLog.js           # Activity log model
│   │   │
│   │   ├── routes/                   # API routes
│   │   │   ├── admin.routes.js      # Admin routes
│   │   │   ├── partner.routes.js    # Partner routes
│   │   │   ├── auth.routes.js       # Auth routes
│   │   │   ├── property.routes.js   # Property routes
│   │   │   ├── visit.routes.js      # Visit routes
│   │   │   ├── commission.routes.js # Commission routes
│   │   │   ├── chat.routes.js       # Chat routes
│   │   │   ├── agreement.routes.js   # Agreement routes
│   │   │   └── upload.routes.js      # Upload routes
│   │   │
│   │   ├── middlewares/              # Express middlewares
│   │   │   ├── auth.middleware.js    # JWT verification
│   │   │   ├── rbac.middleware.js    # Role-based access
│   │   │   ├── error.middleware.js   # Error handling
│   │   │   ├── upload.middleware.js  # File upload handling
│   │   │   └── validation.middleware.js # Request validation
│   │   │
│   │   ├── services/                 # Business logic
│   │   │   ├── email.service.js     # Email operations
│   │   │   ├── cloudinary.service.js # Media operations
│   │   │   ├── commission.service.js # Commission calculation
│   │   │   └── notification.service.js # Push notifications
│   │   │
│   │   ├── config/                   # Configuration
│   │   │   ├── database.js           # DB connection
│   │   │   ├── cloudinary.js         # Cloudinary config
│   │   │   └── constants.js          # App constants
│   │   │
│   │   ├── utils/                    # Utility functions
│   │   │   ├── apiResponse.js       # Response formatter
│   │   │   ├── token.js              # JWT utilities
│   │   │   ├── helpers.js            # Helper functions
│   │   │   └── validators.js         # Custom validators
│   │   │
│   │   └── server.js                 # Entry point
│   │
│   ├── uploads/                      # Local uploads (temp)
│   ├── .env                          # Environment variables
│   ├── .env.example                  # Env template
│   └── package.json                  # Dependencies
│
├── frontend/                         # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/               # Reusable components
│   │   │   ├── common/               # Shared UI components
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Input.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   ├── Table.jsx
│   │   │   │   ├── Card.jsx
│   │   │   │   ├── Badge.jsx
│   │   │   │   ├── Loader.jsx
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── admin/                # Admin panel components
│   │   │   │   ├── Dashboard/
│   │   │   │   ├── Partners/
│   │   │   │   ├── Properties/
│   │   │   │   ├── Visits/
│   │   │   │   ├── Commissions/
│   │   │   │   ├── Chats/
│   │   │   │   └── Analytics/
│   │   │   │
│   │   │   ├── partner/              # Partner portal components
│   │   │   │   ├── Dashboard/
│   │   │   │   ├── Properties/
│   │   │   │   ├── Visits/
│   │   │   │   ├── Commissions/
│   │   │   │   ├── Chat/
│   │   │   │   └── Profile/
│   │   │   │
│   │   │   └── layout/               # Layout components
│   │   │       ├── AdminLayout.jsx
│   │   │       ├── PartnerLayout.jsx
│   │   │       ├── AdminSidebar.jsx
│   │   │       ├── PartnerSidebar.jsx
│   │   │       ├── AdminNavbar.jsx
│   │   │       └── PartnerNavbar.jsx
│   │   │
│   │   ├── pages/                    # Page components
│   │   │   ├── public/               # Public pages
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── Register.jsx
│   │   │   │   └── ForgotPassword.jsx
│   │   │   │
│   │   │   ├── admin/                # Admin pages
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── PartnersList.jsx
│   │   │   │   ├── PartnerDetails.jsx
│   │   │   │   ├── PropertiesList.jsx
│   │   │   │   ├── PropertyDetails.jsx
│   │   │   │   ├── VisitsList.jsx
│   │   │   │   ├── CommissionsList.jsx
│   │   │   │   ├── AgreementsList.jsx
│   │   │   │   ├── Chats.jsx
│   │   │   │   ├── Analytics.jsx
│   │   │   │   └── Settings.jsx
│   │   │   │
│   │   │   └── partner/              # Partner pages
│   │   │       ├── Dashboard.jsx
│   │   │       ├── PropertiesList.jsx
│   │   │       ├── PropertyDetails.jsx
│   │   │       ├── MyVisits.jsx
│   │   │       ├── BookVisit.jsx
│   │   │       ├── MyCommissions.jsx
│   │   │       ├── Chat.jsx
│   │   │       ├── Suggestions.jsx
│   │   │       └── Profile.jsx
│   │   │
│   │   ├── context/                   # React context
│   │   │   └── AuthContext.jsx
│   │   │
│   │   ├── stores/                    # Zustand stores
│   │   │   ├── authStore.js
│   │   │   ├── adminStore.js
│   │   │   ├── partnerStore.js
│   │   │   ├── propertyStore.js
│   │   │   ├── visitStore.js
│   │   │   └── uiStore.js
│   │   │
│   │   ├── hooks/                     # Custom hooks
│   │   │   ├── useAuth.js
│   │   │   ├── useProperties.js
│   │   │   ├── useVisits.js
│   │   │   ├── useChats.js
│   │   │   └── useApi.js
│   │   │
│   │   ├── utils/                     # Utility functions
│   │   │   ├── api.js                # API client
│   │   │   ├── constants.js          # App constants
│   │   │   ├── helpers.js            # Helper functions
│   │   │   └── formatters.js         # Data formatters
│   │   │
│   │   ├── assets/                    # Static assets
│   │   │   └── styles/
│   │   │       └── index.css          # Global styles
│   │   │
│   │   ├── App.jsx                    # Root component
│   │   └── main.jsx                   # Entry point
│   │
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
├── ai-helper/                         # AI context files
│   ├── README.md                      # Folder guide
│   ├── PROJECT_OVERVIEW.md            # Project description
│   ├── TECH_STACK.md                  # Technology details
│   ├── PROJECT_STRUCTURE.md           # This file
│   ├── DATABASE_SCHEMA.md             # DB models
│   ├── API_ENDPOINTS.md               # API documentation
│   ├── COMPONENTS.md                  # Component hierarchy
│   ├── IMPLEMENTATION_STATUS.md       # Progress tracker
│   └── SRS_SUMMARY.md                 # SRS summary
│
├── uploads/                           # Shared uploads
├── package.json                       # Root package.json
├── .gitignore
└── README.md                          # Project README
```

## Key Conventions

### Backend
- ES Modules syntax (`import/export`)
- Async/await for async operations
- Controller → Service pattern for complex logic
- Centralized error handling
- Request validation with express-validator
- JWT for authentication
- Role-based access control (RBAC)

### Frontend
- Functional components with hooks
- Zustand for global state management
- React Router v7 for routing
- Tailwind CSS for styling
- Component-based architecture
- Separated admin and partner portals

---

**Last Updated:** 2026-04-28