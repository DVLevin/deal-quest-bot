---
phase: 09-training-experience
plan: 01
subsystem: ui
tags: [react, tanstack-query, training, difficulty-recommendation, scenario-variety]

# Dependency graph
requires:
  - phase: 03-learn-and-train
    provides: "Train page step machine, DifficultyFilter, useScenarioPool, TRAIN_POOL static data"
  - phase: 02-dashboard-and-profile
    provides: "Client-side stats aggregation pattern (useUserStats), query key factory"
provides:
  - "useTrainingStats hook: cross-references attempts with scenario pool for avg score per difficulty, recommended difficulty, unseen count"
  - "DifficultyRecommendation component: contextual recommendation card with Try it CTA"
  - "ScenarioVariety component: unseen scenario count with low-pool nudge"
  - "training.stats query key in centralized factory"
affects:
  - "09-02 (if exists): weak areas and learn track stats can reuse useTrainingStats data"
  - "dashboard: WeakAreasCard can consume same difficulty map pattern"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client-side join: cross-reference attempts with scenario pool via Map<string, number> for difficulty lookup"
    - "Shared stats hook: single useTrainingStats hook consumed by multiple UI components"
    - "Threshold-based recommendation: MIN_ATTEMPTS=3, promote at avg>=70, demote at avg<40"

key-files:
  created:
    - "packages/webapp/src/features/train/hooks/useTrainingStats.ts"
    - "packages/webapp/src/features/train/components/DifficultyRecommendation.tsx"
    - "packages/webapp/src/features/train/components/ScenarioVariety.tsx"
  modified:
    - "packages/webapp/src/lib/queries.ts"
    - "packages/webapp/src/pages/Train.tsx"

key-decisions:
  - "Client-side difficulty join via Map<string, number> (no DB migration needed for attempts table)"
  - "Threshold constants: MIN_ATTEMPTS=3, PROMOTE=70, DEMOTE=40 (easily tunable)"
  - "DifficultyRecommendation returns null when insufficient data (no 'Not enough data' clutter for new users)"
  - "ScenarioVariety replaces plain pool count text with richer unseen/total + nudge"
  - "useScenarioPool(undefined) reused for full-pool difficulty map (no duplicate fetching via TanStack Query dedup)"

patterns-established:
  - "Cross-reference join pattern: build Map from dual sources (static + DB), join with attempts"
  - "Recommendation engine: simple threshold-based with MIN_ATTEMPTS guard"

# Metrics
duration: 3min
completed: 2026-02-04
---

# Phase 9 Plan 1: Training Stats and Difficulty Recommendation Summary

**useTrainingStats hook with client-side difficulty join, threshold-based recommendation card, and unseen scenario variety indicator on the Train page**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-04T19:46:21Z
- **Completed:** 2026-02-04T19:48:54Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created useTrainingStats hook that cross-references train-mode attempts with scenario pool to compute avg score per difficulty, recommended difficulty, and unseen scenario count
- DifficultyRecommendation card shows contextual recommendation with average score and "Try it" CTA above the difficulty filter buttons
- ScenarioVariety indicator replaces plain "X scenarios available" with "X of Y unseen" and a warning nudge when <= 3 remain
- All computations guarded against NaN/Infinity with count > 0 checks; new users see no recommendation (graceful null)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useTrainingStats hook and add query keys** - `b52502a` (feat)
2. **Task 2: Create DifficultyRecommendation and ScenarioVariety, wire into Train page** - `b7fb3c1` (feat)

## Files Created/Modified

- `packages/webapp/src/features/train/hooks/useTrainingStats.ts` - Shared hook: fetches attempts + seen, cross-references with scenario pool, computes all training stats
- `packages/webapp/src/features/train/components/DifficultyRecommendation.tsx` - Card showing recommended difficulty with avg score context and Try it CTA
- `packages/webapp/src/features/train/components/ScenarioVariety.tsx` - Unseen scenario count with low-pool nudge at <= 3
- `packages/webapp/src/lib/queries.ts` - Added training.stats query key section
- `packages/webapp/src/pages/Train.tsx` - Wired both new components into filter step

## Decisions Made

- **Client-side difficulty join via Map**: The attempts table has no difficulty column. Built a `Map<string, number>` from TRAIN_POOL + DB generated_scenarios to look up difficulty per scenario_id. This avoids any migration.
- **Threshold constants as module-level consts**: MIN_ATTEMPTS=3, PROMOTE_THRESHOLD=70, DEMOTE_THRESHOLD=40 are easily tunable without code changes.
- **DifficultyRecommendation returns null for new users**: Instead of showing "Not enough data" text, the component simply doesn't render. Keeps the UI clean for new users with no training history.
- **ScenarioVariety replaces plain count**: The existing "X scenario(s) available" text was replaced with the richer ScenarioVariety component that shows unseen/total ratio plus low-pool nudge.
- **Reuse useScenarioPool(undefined) for full pool**: The full-pool query is already deduplicated by TanStack Query's cache, so calling it from useTrainingStats incurs no extra network request.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unused parameter TypeScript error in findContextDifficulty**
- **Found during:** Task 2 (DifficultyRecommendation component)
- **Issue:** `recommended` parameter was declared but never read in the helper function, causing TS6133
- **Fix:** Prefixed with underscore (`_recommended`) since the parameter documents intent in the signature
- **Files modified:** `packages/webapp/src/features/train/components/DifficultyRecommendation.tsx`
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** b7fb3c1 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial TypeScript lint fix. No scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- useTrainingStats hook is ready to be consumed by future components (Dashboard WeakAreasCard, per-track stats)
- The difficulty map pattern can be reused for category-based weak area identification
- Train page filter step has clear composition points for future enhancements

---
*Phase: 09-training-experience*
*Completed: 2026-02-04*
