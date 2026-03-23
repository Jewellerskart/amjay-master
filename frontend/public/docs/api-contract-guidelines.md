# API Contract Guidelines

## Design Principles
- API-first development.
- Contract stability for frontend consumers.
- Backward-compatible changes preferred.

## Endpoint Definition Rules
- Resource-oriented naming.
- Use request schemas for query/body/params.
- Keep filtering/sorting/pagination consistent across list APIs.

## List API Contract (Recommended)
- Request:
  - `page`, `limit`
  - `sort`, `order`
  - `search`, `search_by`
  - `startDate`, `endDate`
- Response:
  - paginated `data`
  - `count`, `page`, `limit`
  - optional computed `summary` for global totals

## Error Contract
- Standardize semantic status codes:
  - `400` invalid input
  - `401` unauthorized/invalid credentials
  - `403` forbidden
  - `404` not found
  - `500` server error

## Case Sensitivity Rules
- Unique fields (email, business identifiers) must be treated case-insensitively.
- Normalize before persistence and query comparisons.

## Change Management
- Document any response shape changes.
- Update frontend hooks and related feature docs in same PR.
- Validate impacted flows with build + smoke tests.

