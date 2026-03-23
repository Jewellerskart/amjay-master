# Security and Access Control

## Authentication
- Token-based authentication with refresh flow.
- Protected routes should always verify authenticated context.

## Authorization
- Use explicit role checks for privileged operations.
- Admin/super-admin only operations:
  - user creation/onboarding controls
  - KYC updates for users
  - master-level administrative actions

## Data Safety
- Normalize and sanitize incoming data.
- Avoid exposing sensitive fields in list responses.
- Restrict profile/update payloads to allowed keys only.

## Upload Safety
- Validate file type and size.
- Use common multer config to avoid inconsistent policies.
- Ensure deterministic storage path conventions.

## Session & Logout
- Logout must clear local and cookie session artifacts.
- Unauthorized sessions should redirect to sign-in safely.

## Audit Recommendations
- Maintain activity logs for admin updates.
- Record who changed KYC verification status and when.

