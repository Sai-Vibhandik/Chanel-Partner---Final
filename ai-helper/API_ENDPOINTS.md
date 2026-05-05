# API Endpoints - Multi-Tenant SaaS Platform

## Base URL
`/api`

---

## User Roles

### Platform Level
| Role | Description |
|------|-------------|
| `platform_admin` | Platform owner - manages all companies |

### Company Level
| Role | Description |
|------|-------------|
| `company_superadmin` | Company owner - full company access |
| `partner_manager` | Manages partners |
| `property_manager` | Manages properties |
| `finance_manager` | Manages commissions |
| `legal_manager` | Manages agreements |
| `operations_manager` | Manages visits |
| `viewer` | View analytics only |
| `partner` | Channel partner - portal access |

---

## Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register/company` | Company self-registration | No |
| POST | `/register/partner` | Partner registration | No |
| POST | `/login` | Login (all roles) | No |
| POST | `/logout` | Logout | Yes |
| POST | `/refresh-token` | Refresh access token | Yes |
| POST | `/forgot-password` | Request password reset | No |
| POST | `/reset-password/:token` | Reset password | No |
| POST | `/verify-email/:token` | Verify email | No |
| GET | `/me` | Get current user | Yes |

---

## Platform Admin Routes (`/api/platform`)

### Company Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/companies` | List all companies |
| GET | `/companies/:id` | Get company details |
| POST | `/companies` | Create company |
| PUT | `/companies/:id` | Update company |
| DELETE | `/companies/:id` | Delete company |
| PUT | `/companies/:id/status` | Activate/Suspend company |
| GET | `/companies/:id/users` | Get company users |
| GET | `/companies/:id/stats` | Get company stats |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Platform dashboard stats |
| GET | `/analytics/companies` | Company analytics |
| GET | `/analytics/revenue` | Revenue analytics |
| GET | `/analytics/regions` | Region-wise analytics |

### Subscriptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/subscriptions` | List all subscriptions |
| PUT | `/subscriptions/:companyId` | Update subscription |
| GET | `/subscriptions/:companyId` | Get subscription details |

### Platform Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/settings` | Get platform settings |
| PUT | `/settings` | Update platform settings |

### Audit Logs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/logs` | All platform logs |
| GET | `/logs/:companyId` | Company-specific logs |

---

## Company SuperAdmin Routes (`/api/company`)

### User Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List company users |
| GET | `/users/:id` | Get user details |
| POST | `/users` | Create user (any role) |
| PUT | `/users/:id` | Update user |
| DELETE | `/users/:id` | Delete user |
| PUT | `/users/:id/status` | Activate/Deactivate user |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Company dashboard stats |
| GET | `/analytics` | Company analytics |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/settings` | Get company settings |
| PUT | `/settings` | Update company settings |
| GET | `/subscription` | Get subscription status |

---

## Partner Manager Routes (`/api/partner-manager`)

### Partner Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/partners` | List all partners |
| GET | `/partners/:id` | Get partner details |
| PUT | `/partners/:id` | Update partner |
| PUT | `/partners/:id/status` | Update status |
| PUT | `/partners/:id/tier` | Update tier |
| PUT | `/partners/:id/override-commission` | Override commission |
| POST | `/partners/:id/verify-kyc` | Verify KYC document |
| GET | `/partners/:id/documents` | Get KYC documents |
| GET | `/partners/:id/agreements` | Get signed agreements |
| GET | `/partners/:id/commissions` | Get commissions |
| GET | `/partners/:id/visits` | Get visits |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Dashboard stats |

---

## Property Manager Routes (`/api/property-manager`)

### Property Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/properties` | List all properties |
| POST | `/properties` | Create property |
| GET | `/properties/:id` | Get property details |
| PUT | `/properties/:id` | Update property |
| DELETE | `/properties/:id` | Delete property |
| PUT | `/properties/:id/status` | Update status |
| PUT | `/properties/:id/visibility` | Update visibility |
| POST | `/properties/:id/images` | Upload images |
| DELETE | `/properties/:id/images/:imageId` | Delete image |
| POST | `/properties/:id/videos` | Upload video |
| POST | `/properties/:id/brochure` | Upload brochure |

### Suggestions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/suggestions` | List all suggestions |
| GET | `/suggestions/:id` | Get suggestion |
| PUT | `/suggestions/:id/accept` | Accept (convert to property) |
| PUT | `/suggestions/:id/reject` | Reject suggestion |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Dashboard stats |

---

## Finance Manager Routes (`/api/finance-manager`)

### Commission Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/commissions` | List all commissions |
| GET | `/commissions/:id` | Get commission details |
| PUT | `/commissions/:id/approve` | Approve commission |
| PUT | `/commissions/:id/pay` | Mark as paid |
| PUT | `/commissions/:id/reject` | Reject commission |
| POST | `/commissions/calculate` | Calculate preview |
| GET | `/reports` | Commission reports |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Dashboard stats |

---

## Legal Manager Routes (`/api/legal-manager`)

### Agreement Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/agreements` | List all templates |
| POST | `/agreements` | Create template |
| GET | `/agreements/:id` | Get template |
| PUT | `/agreements/:id` | Update template |
| DELETE | `/agreements/:id` | Delete template |
| PUT | `/agreements/:id/version` | Create new version |

### Partners (View Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/partners` | List partners (view agreements) |
| GET | `/partners/:id/agreements` | Partner's agreements |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Dashboard stats |

---

## Operations Manager Routes (`/api/operations-manager`)

### Visit Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/visits` | List all visits |
| GET | `/visits/:id` | Get visit details |
| PUT | `/visits/:id/approve` | Approve visit |
| PUT | `/visits/:id/reject` | Reject visit |
| PUT | `/visits/:id/complete` | Mark completed |
| GET | `/visits/calendar` | Calendar view |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Dashboard stats |

---

## Viewer Routes (`/api/viewer`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | View dashboard |
| GET | `/analytics` | View analytics |

---

## Partner Routes (`/api/partner`)

### Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile` | Get profile |
| PUT | `/profile` | Update profile |
| PUT | `/profile/password` | Change password |
| POST | `/profile/documents` | Upload KYC |
| GET | `/profile/documents` | Get documents |
| GET | `/profile/agreements` | Agreements to sign |
| POST | `/profile/agreements/:id/sign` | Sign agreement |
| GET | `/profile/signed-agreements` | Signed agreements |

### Properties
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/properties` | List visible properties |
| GET | `/properties/:id` | Get property |
| GET | `/properties/:id/brochure` | Download brochure |

### Visits
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/visits` | My visits |
| POST | `/visits` | Book visit |
| GET | `/visits/:id` | Get visit |
| PUT | `/visits/:id` | Update visit |
| PUT | `/visits/:id/cancel` | Cancel visit |

### Commissions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/commissions` | My commissions |
| GET | `/commissions/:id` | Get commission |
| GET | `/commissions/statement` | Download statement |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/chat` | Conversation with admin |
| POST | `/chat` | Send message |
| PUT | `/chat/read` | Mark read |

### Suggestions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/suggestions` | Submit suggestion |
| GET | `/suggestions` | My suggestions |
| GET | `/suggestions/:id` | Get suggestion |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Dashboard stats |

---

## Chat Routes (All Manager Roles)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/chats` | List conversations |
| GET | `/chats/:partnerId` | Get conversation |
| POST | `/chats/:partnerId` | Send message |
| PUT | `/chats/:partnerId/read` | Mark read |

---

## Upload Routes (`/api/upload`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/image` | Upload image | All |
| POST | `/images` | Multiple images | All |
| POST | `/video` | Upload video | Property Mgr |
| POST | `/document` | Upload document | All |
| DELETE | `/:publicId` | Delete file | Owner/Admin |

---

## Notification Routes (`/api/notifications`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get notifications | All |
| GET | `/unread` | Unread count | All |
| PUT | `/:id/read` | Mark read | All |
| PUT | `/read-all` | Mark all read | All |

---

## Multi-Tenancy Headers

All requests (except Platform Admin) include company context:

```
Headers:
  Authorization: Bearer <token>
  X-Company-Id: <company_id>  // Extracted from token
```

---

## Region-Specific Responses

### Property Response (India)
```json
{
  "title": "Luxury 3BHK",
  "region": "india",
  "price": {
    "amount": 15000000,
    "currency": "INR"
  },
  "location": {
    "state": "Maharashtra",
    "city": "Mumbai"
  },
  "reraDetails": {
    "reraNumber": "P52100001234",
    "reraProjectName": "ABC Heights"
  }
}
```

### Property Response (Dubai)
```json
{
  "title": "Luxury Villa",
  "region": "dubai",
  "price": {
    "amount": 5000000,
    "currency": "AED"
  },
  "location": {
    "emirate": "Dubai",
    "city": "Dubai"
  },
  "dldDetails": {
    "dldPermitNumber": "DLD-12345",
    "developerName": "EMAAR"
  }
}
```

---

## Query Parameters

### Pagination
```
?page=1&limit=10
```

### Region Filter
```
?region=india
?region=dubai
```

### Currency Display
```
?currency=INR
?currency=AED
```

### Status Filter
```
?status=active
?status=pending
```

---

## Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error
```json
{
  "success": false,
  "message": "Error description",
  "errors": [...]
}
```

### Paginated
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

---

**Last Updated:** 2026-04-29