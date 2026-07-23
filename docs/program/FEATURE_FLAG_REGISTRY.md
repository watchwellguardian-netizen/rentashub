# Feature Flag Registry

Source of truth module: `src/lib/featureFlags.js`

| Flag key | Description | Owner | Default | Development | UAT | Production | Prerequisites | Removal condition | Expiry review |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `rental_core_backend_path` | Enables backend-persisted rental vertical slice once A4 persistence exists. | WS2 | false | false | false | false | A4-04 persistence/Auth/Storage evidence | Core rental path uses backend in all environments | 2026-09-30 |
| `finance_sandbox_mode` | Enables sandbox-only financial backbone once provider sandbox evidence exists. | WS3 | false | false | false | false | Payment sandbox and ledger tests | Replaced by provider-specific certified flags | 2026-09-30 |
| `escrow_state_engine` | Enables escrow state engine without live funds movement. | WS3 | true | true | true | false | Legal review before production | Live escrow provider certified | 2026-09-30 |
| `auction_engine_simulation` | Keeps auction features simulation-safe until live auction gates pass. | WS5 | true | true | true | false | None for local simulation | Live auction engine certified | 2026-09-30 |
| `recovery_private_treaty_readiness` | Enables repossession/private treaty readiness workflows only. | WS5 | false | false | false | false | Legal authority workflow | Legal and settlement gates pass | 2026-10-31 |
| `ecosystem_provider_marketplaces` | Enables inspection, transport, and financing provider-ready workflows. | WS6 | true | true | true | false | Provider onboarding evidence before live use | Provider marketplaces certified | 2026-09-30 |
| `external_ai_gateway` | Enables external AI provider gateway after governance and credentials. | WS6 | false | false | false | false | AI safety, provider credentials, audit logging | AI gateway certified | 2026-10-31 |
| `live_notifications` | Enables real email/SMS/push providers. | WS6 | false | false | false | false | Provider credentials and delivery evidence | Notification providers certified | 2026-09-30 |

Feature flags must not be used to hide unfinished production-critical defects. They are a rollout and safety control, not a substitute for certification.
