---
phase: 09-training-experience
plan: 02
subsystem: ui
tags: [react, tanstack-query, training, learn, weak-areas, track-stats, dashboard]

# Dependency graph
requires:
  - phase: 03-learn-and-train
    provides: "TrackList, LevelCard, useTrackProgress, TRACKS static data"
  - phase: 09-training-experience
    provides: "useTrainingStats hook with avgScoreByDifficulty, recommendedDifficulty"
provides:
  - "TrackStats component: per-track completion summary (completed/total, avg score, best score)"
  - "WeakAreasCard component: identifies weak difficulty levels and Learn track levels, with Practice CTA"
affects:
  - "dashboard: WeakAreasCard positioned between QuickActions and BadgePreview"
  - "learn: TrackStats positioned between track header and level cards"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure presentational stats component: TrackStats receives LevelWithProgress[] props, no internal fetching"
    - "Cross-feature hook reuse: WeakAreasCard consumes useTrainingStats (train feature) + useTrackProgress (learn feature)"
    - "Threshold-based weak area detection: WEAK_THRESHOLD=50, minimum 2 attempts for significance"

key-files:
  created:
    - "packages/webapp/src/features/learn/components/TrackStats.tsx"
    - "packages/webapp/src/features/dashboard/components/WeakAreasCard.tsx"
  modified:
    - "packages/webapp/src/features/learn/components/TrackList.tsx"
    - "packages/webapp/src/pages/Dashboard.tsx"

key-decisions:
  - "TrackStats is pure presentational (receives data as props, no hooks) for reusability"
  - "WeakAreasCard threshold at 50 (below-average) with minimum 2 attempts to filter noise"
  - "WeakAreasCard returns null when no training data exists (no empty card clutter for new users)"
  - "Practice CTA routes to /train for difficulty weak areas, /learn for track-level weak areas"
  - "WeakAreasCard capped at 3 weak areas max to avoid overwhelming the dashboard"

patterns-established:
  - "Cross-feature component: dashboard card consuming hooks from train and learn features"
  - "Encouraging null state: show positive message when no weak areas instead of hiding entirely"

# Metrics
duration: 2min
completed: 2026-02-04
---

# Phase 9 Plan 2: Track Stats and Weak Area Identification Summary

**Per-track completion stats on Learn page header and weak area identification card on Dashboard with Practice CTA routing to Train/Learn**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-04T19:52:06Z
- **Completed:** 2026-02-04T19:53:52Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created TrackStats component showing completed/total levels, average score, and best score above the Learn page level list
- Created WeakAreasCard that identifies difficulties with avg score below 50 and weakest completed Learn levels, with "Practice" CTA
- WeakAreasCard shows encouraging "No weak spots" message when user has no weak areas
- Both components handle empty/new-user data gracefully (null returns, dash placeholders)

## Task Commits

Each task was committed atomically:

1. **Task 1: TrackStats component on Learn page** - `e5994de` (feat)
2. **Task 2: WeakAreasCard on Dashboard** - `8637328` (feat)

## Files Created/Modified

- `packages/webapp/src/features/learn/components/TrackStats.tsx` - Per-track summary card: completed count, avg score, best score
- `packages/webapp/src/features/dashboard/components/WeakAreasCard.tsx` - Dashboard card identifying weak difficulty levels and track levels with Practice CTA
- `packages/webapp/src/features/learn/components/TrackList.tsx` - Wired TrackStats between header and level cards
- `packages/webapp/src/pages/Dashboard.tsx` - Wired WeakAreasCard between QuickActions and BadgePreview

## Decisions Made

- **TrackStats is pure presentational**: Receives `LevelWithProgress[]` as props instead of calling hooks internally. This keeps it reusable and testable.
- **Weak area threshold at 50 with minimum 2 attempts**: Lower than the recommendation promote threshold (70) to only flag genuinely weak areas. Requires at least 2 attempts to avoid flagging first-time low scores.
- **WeakAreasCard returns null for new users**: Instead of showing an empty card, the component doesn't render until the user has some training data.
- **Practice CTA routes contextually**: Difficulty weak areas link to /train, Learn track weak areas link to /learn.
- **Max 3 weak areas displayed**: Caps the list to avoid overwhelming the dashboard; sorted by weakest first.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 9 (Training Experience) is now complete: all 4 TRAIN-V11 requirements implemented
- useTrainingStats hook is consumed by both Train page (Plan 01) and Dashboard (Plan 02)
- TrackStats pattern ready to extend for future multi-track support
- Ready to proceed with Phase 10 (Error Handling & UX) or Phase 11 (Performance & Reliability)

---
*Phase: 09-training-experience*
*Completed: 2026-02-04*
