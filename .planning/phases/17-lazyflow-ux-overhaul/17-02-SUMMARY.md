---
phase: 17-lazyflow-ux-overhaul
plan: 02
subsystem: ui
tags: [react, useEffect, smart-defaults, one-tap, training]

# Dependency graph
requires:
  - phase: 09-training-experience
    provides: "DifficultyFilter, DifficultyRecommendation, useTrainingStats"
provides:
  - "Train page auto-selects recommended difficulty on mount"
  - "Quick Start button for one-tap training with smart defaults"
affects: [17-lazyflow-ux-overhaul]

# Tech tracking
tech-stack:
  added: []
  patterns: ["LazyFlow smart defaults via useEffect auto-select"]

key-files:
  created: []
  modified: ["packages/webapp/src/pages/Train.tsx"]

key-decisions:
  - "Quick Start reuses handleStart (pool already filtered by auto-selected difficulty)"
  - "Auto-select only fires when selectedDifficulty is null (user override preserved)"
  - "Start Training button demoted to secondary variant when Quick Start visible"

patterns-established:
  - "LazyFlow auto-select: useEffect sets smart default only when user hasn't chosen yet"

# Metrics
duration: 1min
completed: 2026-02-06
---

# Phase 17 Plan 02: Quick Start Training Summary

**Auto-select recommended difficulty on mount with one-tap Quick Start button for frictionless training**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-06T14:30:50Z
- **Completed:** 2026-02-06T14:32:04Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Train page auto-selects recommended difficulty when stats load (no manual tap needed)
- Quick Start button visible for users with training history, hidden for new users
- Manual difficulty override still works (useEffect checks selectedDifficulty === null)
- Start Training button demoted to secondary when Quick Start is prominent
- Empty pool edge case disables Quick Start button

## Task Commits

Each task was committed atomically:

1. **Task 1: Add auto-select difficulty and Quick Start button to Train page** - `61b1734` (feat)

## Files Created/Modified
- `packages/webapp/src/pages/Train.tsx` - Added useEffect auto-select, Quick Start button, secondary variant logic

## Decisions Made
- Quick Start simply calls `handleStart` -- the intelligence is in the auto-select useEffect that pre-sets the recommended difficulty, so the pool is already filtered correctly by the time the user taps Quick Start
- Auto-select guard `selectedDifficulty === null` ensures user manual choice is never overridden
- Quick Start only renders when `stats.recommendedDifficulty !== null` (users with sufficient training history)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Train page now supports LazyFlow one-tap training
- Ready for Phase 17 Plan 03 (next LazyFlow improvements)
- All existing functionality preserved (DifficultyFilter, DifficultyRecommendation, ScenarioVariety)

---
*Phase: 17-lazyflow-ux-overhaul*
*Completed: 2026-02-06*
