# Architecture

## Monorepo Layout
- `frontend/`: React SPA (TypeScript, Vite, RTK Query)
- `backend/`: Express API (TypeScript, MongoDB/Mongoose)
- `docs/`: project governance and implementation standards

## Frontend High-Level
- Routing: `src/app/router`
- API access: `src/api` with centralized exports via `api.index.ts`
- Feature modules under `src/components/*`
- Shared constants/config: `src/shared/*`
- Theme and global UI styles: `src/styles/redesign.css`

## Backend High-Level
- Entry: `src/index.ts`, app bootstrap in `src/app.ts`
- Modules: `src/module/*` (currently auth-focused domain)
- Controller-Service-Model layering
- Validation layer (`zod`) in controller validation files
- Utilities: `src/utils/*` for date range, normalization, query filtering

## Data & Flow
1. UI triggers action from feature component.
2. RTK Query hook calls backend endpoint.
3. Backend validation + normalization.
4. Service applies query/filter/business rules.
5. Response follows common API shape with status/message/data.

## Non-Functional Goals
- Case-insensitive handling for emails and unique identifiers.
- Strict role access for sensitive operations (admin/super-admin).
- Reusable utilities for date filtering and search.
- Modular frontend pages with hooks + presentational components.

