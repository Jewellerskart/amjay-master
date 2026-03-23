# Testing and QA

## Build Gates
- Backend: `cd backend && npm run build`
- Frontend: `cd frontend && npm run build`

## Core Functional Smoke Tests
- Auth
  - login success and invalid password response
  - logout clears session and redirects
- Users
  - user list pagination/sort/search/date filters
  - summary values reflect filtered dataset (not only current page)
  - user detail route by email works for case variations
- KYC
  - existing doc type pre-fills number/verified fields
  - update without new file keeps previous file URL
  - one file per document type behavior
- Coupons
  - coupon list loads data and filter sidebar works
  - discount selection mapping to coupon master values

## UI/UX QA
- Header behavior:
  - desktop dropdowns
  - mobile dynamic-island menu open/close
  - sticky scroll animation
- List pages:
  - right-side filter panel
  - mobile responsiveness
- Accessibility baseline:
  - readable color contrast
  - keyboard focus for interactive elements

## Regression Checklist Before Merge
- Build passes for both apps.
- No console errors in key screens.
- Route links are SPA (`Link`/`NavLink`) where applicable.
- Role-restricted actions hidden and blocked correctly.

