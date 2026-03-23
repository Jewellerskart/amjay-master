# Backend Standards

## Technology
- Node.js + Express + TypeScript
- MongoDB + Mongoose
- Zod validation

## Layering
- `route`: endpoint registration + middleware chaining
- `controller`: request parsing, validation response handling
- `model/service`: DB operations + business logic
- `utils`: reusable cross-cutting logic

## Request Processing Standards
- Validate body/query using schemas.
- Normalize critical fields:
  - email: lowercase, case-insensitive matching
  - string identifiers: trimmed/normalized
- Use shared date-range and query-filter utilities.

## Security/Access
- Protected endpoints via auth middleware.
- Enforce role restrictions in controller/service.
- Sensitive updates (KYC/user management) limited to admin roles.

## Response Contract
- Consistent structured payload:
  - `status_code`
  - `message`
  - `data`
  - `success` where applicable

## File Uploads
- Use shared multer config (`config/multer.ts`) for consistency.
- Preserve one-file-per-document-type logic in KYC flows.
- Keep cloud path conventions deterministic (e.g., `businessName/kyc`).

## Quality Checklist
- `npm run build` must pass.
- Validation and normalization in place for new endpoints.
- No duplicate query/filter logic when reusable utility exists.
- Logs and error handling are non-breaking and safe.

