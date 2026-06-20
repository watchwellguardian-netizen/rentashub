# A4 Governance Evidence Toolkit

Status: Credential-readiness tooling only.

The A4 Governance Evidence Toolkit helps review A4-01 through A4-05 evidence without connecting to Supabase, reading secrets, running live migrations, or activating production infrastructure.

## What The Toolkit Validates

- A4-01 ownership evidence completeness.
- Missing Supabase project names and project IDs.
- Placeholder values such as pending, TBD, fake, sample, example, blank, and `<actual Supabase ID>`.
- Project ID format safety.
- Secret-like values accidentally pasted into evidence.
- A4 evidence package completeness.
- A4 gate readiness scoring.
- Evidence manifest generation.
- Migration file presence and static migration safety.
- RLS/RBAC SQL static coverage.
- Secret exposure across source, server, docs, tests, scripts, dist when present, and packageable artifact surfaces.

## What The Toolkit Cannot Validate

- That a Supabase account exists.
- That Supabase projects are accessible.
- That submitted project IDs are real.
- That secrets are stored in a real vault.
- That migrations executed successfully against Supabase.
- That RLS is enforced by a live database.
- That Supabase Auth registration, login, password reset, email verification, MFA, or session lifecycle works.
- That storage buckets exist.
- That signed URL behavior works.
- That backup and restore succeeded.

## Commands

Validate A4-01 evidence:

```bash
npm run a4:governance:validate -- evidence/a4-01.json
```

Score A4 evidence readiness:

```bash
npm run a4:governance:score -- evidence/a4-package.md
```

Generate the A4 evidence manifest:

```bash
npm run a4:governance:manifest -- --input evidence/a4-package.md --output docs/a4-evidence-manifest.md
```

Scan for secret exposure:

```bash
npm run a4:governance:secrets
```

Check migration readiness:

```bash
npm run a4:governance:migration
```

Run static RLS/RBAC SQL analysis:

```bash
npm run a4:governance:rls-rbac
```

Score A4-02 environment evidence templates:

```bash
npm run a4:governance:a4-02-score
```

Generate the A4-03 migration evidence checklist:

```bash
npm run a4:governance:a4-03-checklist
```

Generate the A4-04 infrastructure certification evidence index:

```bash
npm run a4:governance:a4-04-index
```

Generate the A4-05 final infrastructure review report:

```bash
npm run a4:governance:a4-05-report
```

Check Supabase project references across local docs and config-like files:

```bash
npm run a4:governance:project-refs
```

Verify generated reports do not expose credential-like values:

```bash
npm run a4:governance:redaction
```

## A4-01 Still Requires Real Supabase Project IDs

A4-01 cannot pass with planned names, placeholder IDs, pending IDs, screenshots with secrets, or statements that projects will be created later.

The required evidence remains:

- Organization name.
- Infrastructure owner.
- Billing owner.
- Access owner.
- Development project name.
- Development project ID.
- UAT/Staging project name.
- UAT/Staging project ID.
- Production project name.
- Production project ID.

## No Live Activation Claimed

This toolkit does not activate live Supabase infrastructure and must not be used to claim production readiness. It supports credential-readiness review only. RentasHub remains RC-0.6A Infrastructure Activation Hold until A4 execution evidence is submitted and approved.
