# S5-LRW-002 SBOM and License Register

This register is generated from repository-controlled package metadata. It does not replace a formal legal license review.

## SBOM Generation

| Component Source | Manifest | Status |
| --- | --- | --- |
| Frontend/root package | `package.json` | Ready |
| Server package | `server/package.json` | Ready |
| Lockfiles | `package-lock.json`, `server/package-lock.json` | Pending if absent |
| SBOM JSON | `docs/launch-readiness/security-certification-manifest.json` | Ready |

## Dependency Inventory

| Package | Scope | Version | License Status |
| --- | --- | --- | --- |
| @vitejs/plugin-react | root dependency | 6.0.2 | Pending license confirmation |
| lucide-react | root dependency | ^0.475.0 | Pending license confirmation |
| react | root dependency | ^18.2.0 | Pending license confirmation |
| react-dom | root dependency | ^18.2.0 | Pending license confirmation |
| react-router-dom | root dependency | ^6.26.0 | Pending license confirmation |
| typescript | root dependency | ^5.8.2 | Pending license confirmation |
| vite | root dependency | 8.0.16 | Pending license confirmation |

## Prohibited-License Policy

Packages with the following licenses require legal review before production use:

- AGPL
- GPL
- LGPL where dynamic/static linking obligations are unclear
- Commons Clause
- SSPL
- BUSL or time-delayed source licenses
- Unknown or custom commercial licenses

## Package Provenance Checks

| Check | Status |
| --- | --- |
| Package names match expected manifests | Ready |
| Dependency versions recorded | Ready |
| Lockfiles present | Pending if absent |
| Registry provenance verified | Pending CI/network audit |
| Maintainer/reputation review | Pending assessor review |
| Transitive dependency review | Pending SBOM tooling execution |

## Build-Artifact Hash Manifest

| Artifact | Hash Evidence | Status |
| --- | --- | --- |
| Frontend bundle | CI artifact hash | Pending runtime/CI execution |
| ZIP/release package | Artifact integrity report | Pending release package execution |
| Runtime evidence artifacts | GitHub Actions artifacts | Pending runtime execution |
| SBOM manifest | Repository JSON | Ready |

## Third-Party Component Register

| Component | Purpose | Provider Activation |
| --- | --- | --- |
| Supabase | Database/Auth/Storage target | Not active |
| Sentry | Error monitoring target | Not active |
| Better Stack | Uptime/log drain target | Not active |
| Stripe/WiPay | Payment provider targets | Not active |
| KYC vendor | Identity verification target | Not active |
| GitHub Actions | CI/runtime evidence target | Pending repository remote |

## Dependency-Exception Register

| Package | Exception | Approver | Status |
| --- | --- | --- | --- |
| None recorded |  |  | No exception |
