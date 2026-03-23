# Frontend Standards

## Technology
- React 18 + TypeScript
- Vite build tooling
- RTK Query for API layer

## Folder Structure
- `components/<feature>/...`: feature-specific UI
- `components/common/...`: shared UI
- `hooks/...`: reusable business hooks
- `api/apiHooks/...`: endpoint definitions
- `shared/constants`, `shared/config`: centralized config

## Page Design Pattern
- Keep pages thin.
- Move logic/state side effects into a `use<Feature>` hook.
- Keep presentational cards/forms in smaller components.
- Avoid 300+ line monolith page files.

## Naming Convention
- Components: `PascalCase` (e.g., `UserDetailsCard.tsx`)
- Hooks: `camelCase` with `use` prefix
- Types: explicit interfaces/types per feature (`types.ts`)
- Route constants: centralized under shared constants

## API Usage Rules
- Use only hooks exported from `api.index.ts`.
- No direct `fetch`/axios calls inside page components.
- Handle success/error messaging consistently.

## UI/UX Standards
- Use shared theme tokens from `redesign.css`.
- Prefer neutral enterprise palette for readability.
- Use subtle motion; no distracting effects.
- Ensure mobile behavior for header, menus, and filters.

## Listing Pages
- Keep filters in right-side flow card (`SearchFilter` sidebar variant).
- Keep table in main content area.
- Preserve pagination and sort behavior via URL params.

## Quality Checklist
- `npm run build` passes.
- Route navigation uses `Link`/`NavLink`.
- No dead imports/components after refactor.
- Role-based UI visibility matches backend permissions.

