# Supabase Environment Inventory

Status: Required before live activation.

Do not store secrets in this document.

## Development Environment

| Field | Value |
| --- | --- |
| Supabase organization | To be supplied |
| Project name | RentasHub-Development |
| Region | To be supplied |
| Supabase URL | Secret-managed reference only |
| Database URL | Secret-managed reference only |
| Auth enabled | Pending |
| Storage enabled | Pending |
| Backup policy | Pending |
| Technical administrator | To be assigned |

## UAT/Staging Environment

| Field | Value |
| --- | --- |
| Supabase organization | To be supplied |
| Project name | RentasHub-Staging |
| Region | US East Virginia recommended |
| Supabase URL | Secret-managed reference only |
| Database URL | Secret-managed reference only |
| Auth enabled | Pending |
| Storage enabled | Pending |
| Backup policy | 7 days minimum recommended |
| Technical administrator | To be assigned |

## Production Environment

| Field | Value |
| --- | --- |
| Supabase organization | To be supplied |
| Project name | RentasHub-Production |
| Region | US East Virginia recommended unless hosting changes |
| Supabase URL | Secret-managed reference only |
| Database URL | Secret-managed reference only |
| Auth enabled | Pending UAT signoff |
| Storage enabled | Pending UAT signoff |
| Backup policy | 30 days minimum, 90 days preferred |
| Technical administrator | To be assigned |

## Bucket Inventory

| Bucket | Dev | UAT | Production | Access |
| --- | --- | --- | --- | --- |
| public-assets | Pending | Pending | Pending | Public |
| supplier-logos | Pending | Pending | Pending | Public or signed |
| private-verification | Pending | Pending | Pending | Private signed URL only |
| private-inspections | Pending | Pending | Pending | Private signed URL only |
| private-claims | Pending | Pending | Pending | Private signed URL only |
| private-disputes | Pending | Pending | Pending | Private signed URL only |

## Access Control Checklist

- Account owner assigned.
- Billing owner assigned.
- Technical administrator assigned.
- Production access restricted.
- Service role keys restricted to backend secret storage.
- CI/CD secrets masked.
- Emergency secret rotation documented.
