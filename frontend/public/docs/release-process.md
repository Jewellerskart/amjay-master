# Release Process

## Branch and PR Standards
- Use feature branches from main integration branch.
- Keep PR scope focused (feature/refactor/fix).
- Include docs updates for behavior or contract changes.

## Pre-Release Checklist
1. Pull latest and rebase.
2. Run backend and frontend build.
3. Validate migration/config impacts.
4. Run smoke tests for auth, user list, KYC, coupon flows.
5. Verify environment variables in deployment target.

## Versioning
- Use semantic versioning style:
  - patch: bugfix
  - minor: backward-compatible feature
  - major: breaking contract changes

## Deployment Steps (Generic)
1. Build artifacts.
2. Deploy backend first.
3. Validate API health.
4. Deploy frontend.
5. Execute post-deploy smoke tests.

## Rollback Strategy
- Keep last known stable build references.
- If critical regressions occur:
  - rollback frontend quickly
  - rollback backend if contract mismatch introduced

## Post-Release
- Monitor logs/errors for 24 hours.
- Track user-facing incidents and hotfix where needed.

