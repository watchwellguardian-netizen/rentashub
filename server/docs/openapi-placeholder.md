# RentasHub API Contract Placeholder

OpenAPI generation is not implemented yet. This placeholder captures the API groups exposed by the scaffold:

- `/api/health`
- `/api/auth`
- `/api/users`
- `/api/assets`
- `/api/bookings`
- `/api/inspections`
- `/api/payments`
- `/api/messages`
- `/api/notifications`
- `/api/suppliers`
- `/api/verifications`
- `/api/reviews`
- `/api/disputes`
- `/api/marketplace`
- `/api/trust`
- `/api/protection`
- `/api/claims`
- `/api/admin`

## Module 22 Implemented Repository-Backed Endpoints

```text
GET    /api/health
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/refresh
POST   /api/auth/request-password-reset
POST   /api/auth/reset-password
POST   /api/files/upload-intent
POST   /api/files/metadata
GET    /api/files
GET    /api/files/:id
PATCH  /api/files/:id
DELETE /api/files/:id
GET    /api/assets
GET    /api/assets/:id
POST   /api/assets
PATCH  /api/assets/:id
DELETE /api/assets/:id
GET    /api/bookings
GET    /api/bookings/:id
POST   /api/bookings
PATCH  /api/bookings/:id
```

Asset, booking, and file metadata `POST`, `PATCH`, and `DELETE` use bearer-token or simulated development RBAC and write audit-log records. Auth endpoints use salted password hashing and expiring signed development tokens. File endpoints are metadata-only placeholders and do not return binary file content. Password reset routes are controlled placeholders. Validation failures return controlled `400` responses, missing resources return controlled `404` responses, and unauthorized writes return controlled `401` or `403` responses.

All API groups outside health, auth, files, assets, and bookings remain scaffold-only contract endpoints. Strict OpenAPI schema generation should be added after more controllers move beyond scaffold status.
