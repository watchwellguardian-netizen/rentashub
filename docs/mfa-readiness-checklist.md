# MFA Readiness Checklist

Status: Draft security readiness artifact.

MFA is not live. This checklist defines the evidence required before MFA can be considered operational.

## Provider Selection

- [ ] MFA provider selected.
- [ ] Supported factors documented: authenticator app, email OTP, SMS OTP, passkeys.
- [ ] Recovery-code strategy approved.
- [ ] Admin break-glass process approved.

## Role Requirements

- [ ] Admin MFA required.
- [ ] Supplier/vendor MFA policy approved.
- [ ] Dealer/broker MFA policy approved.
- [ ] Inspector, transport provider, and financing partner MFA policy approved.
- [ ] Customer MFA optional or risk-based policy approved.

## User Experience

- [ ] Enrollment flow validated.
- [ ] Challenge flow validated.
- [ ] Recovery flow validated.
- [ ] Device/session remember policy approved.
- [ ] Failed challenge messages do not leak account state.

## Security Evidence

- [ ] MFA events written to audit log.
- [ ] Failed MFA attempts rate-limited.
- [ ] Session elevation after MFA is time-limited.
- [ ] MFA reset requires admin/security approval.

## Boundary

This checklist does not activate live MFA, SMS, email, push, passkeys, or identity-provider enforcement.
