---
phase: 11-performance-and-reliability
plan: 01
subsystem: perf
tags: [vite, eruda, postgrest, query-optimization]

# Dependency graph
requires:
  - phase: 05-leads
    provides: "Lead hooks with select('*') queries"
  - phase: 01-foundation
    provides: "Eruda debug console setup in main.tsx"
provides:
  - "DEV-gated eruda (excluded from production bundle)"
  - "Explicit column selection for lead detail and activity queries"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "import.meta.env.DEV guard for dev-only dependencies"
    - "Explicit PostgREST column selection over select('*')"

key-files:
  created: []
  modified:
    - "packages/webapp/src/main.tsx"
    - "packages/webapp/package.json"
    - "packages/webapp/src/features/leads/hooks/useLead.ts"
    - "packages/webapp/src/features/leads/hooks/useLeadActivities.ts"

key-decisions:
  - "Cast through unknown for partial column selection (TypeScript requires it when excluding fields from a typed row)"
  - "eruda moved to devDependencies for intent signaling (Vite bundles from imports, not dep type)"

patterns-established:
  - "DEV-gated dynamic import: if (import.meta.env.DEV) { import('lib') }"
  - "Explicit column lists in PostgREST queries to prevent payload bloat"

# Metrics
duration: 3min
completed: 2026-02-05
---

# Phase 11 Plan 01: TMA Hardening Summary

**Eruda DEV-gated (~300KB removed from production bundle) + lead queries optimized with explicit column selection**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-05T21:24:00Z
- **Completed:** 2026-02-05T21:27:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Eruda debug console gated behind `import.meta.env.DEV` — Vite dead-code eliminates it from production builds
- Eruda moved from `dependencies` to `devDependencies` for correct dependency signaling
- Lead detail query (`useLead.ts`) uses 23 explicit columns, excluding `original_context`, `last_contacted`, `next_followup`, `followup_count`
- Lead activity query (`useLeadActivities.ts`) uses all 7 columns explicitly listed

## Task Commits

Each task was committed atomically:

1. **Task 1: Gate eruda behind DEV check** - `61e2089` (perf)
2. **Task 2: Replace select('*') with explicit columns** - `e7feea1` (perf)

## Files Created/Modified
- `packages/webapp/src/main.tsx` - DEV-gated eruda import with updated comment
- `packages/webapp/package.json` - eruda moved to devDependencies
- `packages/webapp/src/features/leads/hooks/useLead.ts` - 23 explicit columns, cast through unknown
- `packages/webapp/src/features/leads/hooks/useLeadActivities.ts` - 7 explicit columns

## Decisions Made
- [11-01]: Cast through `unknown` for partial column selection (TS requires intermediate cast when excluding columns from a typed row)
- [11-01]: eruda in devDependencies is cosmetic but signals intent — Vite tree-shakes based on imports

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `as unknown` cast for partial column selection**
- **Found during:** Task 2 (explicit column selection)
- **Issue:** TypeScript TS2352 — casting partial column result directly to `LeadRegistryRow[]` fails because excluded columns are missing
- **Fix:** Changed `(data ?? []) as LeadRegistryRow[]` to `(data ?? []) as unknown as LeadRegistryRow[]`
- **Files modified:** packages/webapp/src/features/leads/hooks/useLead.ts
- **Verification:** `npx tsc --noEmit` passes with 0 errors
- **Committed in:** e7feea1 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor type cast adjustment for TypeScript compatibility. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- TMA production bundle is now clean (no debug tooling)
- Lead queries are optimized for smaller payloads
- Ready for plan 11-02 (bot reliability)

---
*Phase: 11-performance-and-reliability*
*Completed: 2026-02-05*
