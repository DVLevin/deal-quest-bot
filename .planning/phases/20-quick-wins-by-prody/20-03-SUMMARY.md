---
phase: 20-quick-wins-by-prody
plan: 03
subsystem: ui
tags: [react, react-router, tanstack-query, toast, url-params]

requires:
  - phase: 17-lazyflow-ux-overhaul
    provides: "DifficultyRecommendation auto-select, suggestNextStatus, LeadStatusSelector visual ring suggestion"
provides:
  - "Difficulty-filtered training navigation from WeakAreasCard via URL params"
  - "Train page URL param reading for pre-selected difficulty"
  - "Smart status suggestion toast on engagement step completion (50% threshold)"
affects: [dashboard, train, leads]

tech-stack:
  added: []
  patterns:
    - "URL param navigation for pre-filtering (WeakAreasCard -> Train)"
    - "Query cache reading via getQueryData for fresh data-driven toasts"

key-files:
  created: []
  modified:
    - packages/webapp/src/features/dashboard/components/WeakAreasCard.tsx
    - packages/webapp/src/pages/Train.tsx
    - packages/webapp/src/features/leads/components/LeadDetail.tsx

key-decisions:
  - "URL param ?difficulty=N used for weak area -> train routing (simple, bookmarkable)"
  - "useState initializer reads URL param once (not useEffect) to avoid flash of wrong selection"
  - "checkStatusSuggestion reads optimistically-updated query cache via getQueryData (fresh after onMutate)"
  - "50% threshold for suggestion; only fires on 'done' status (not skip or reset)"
  - "6s toast duration with action button for direct status update"

patterns-established:
  - "URL param pre-filtering: navigate with query params, read with useSearchParams, initialize state"
  - "Post-mutation cache inspection: getQueryData after optimistic update for derived notifications"

duration: 4min
completed: 2026-02-08
---

# Phase 20 Plan 03: Weak Area Training Links & Smart Status Suggestion Summary

**Difficulty-filtered training navigation from dashboard weak areas and smart pipeline status suggestion toast after engagement step completion**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-08T07:36:09Z
- **Completed:** 2026-02-08T07:40:37Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- WeakAreasCard "Practice" button now navigates to `/train?difficulty=N` for difficulty-based weak areas
- Train page reads URL difficulty param and pre-selects it, overriding auto-recommendation
- Smart status suggestion toast fires at 50%+ step completion with direct "Update" action button

## Task Commits

Each task was committed atomically:

1. **Task 1: Weak area -> filtered training navigation + Train URL param reading** - `4e6a484` (feat)
2. **Task 2: Smart status suggestion toast on step completion** - `2c94f24` (feat)

## Files Created/Modified
- `packages/webapp/src/features/dashboard/components/WeakAreasCard.tsx` - Added difficulty field to WeakArea interface, navigate with ?difficulty=N param
- `packages/webapp/src/pages/Train.tsx` - Import useSearchParams, read URL difficulty param to initialize selectedDifficulty state
- `packages/webapp/src/features/leads/components/LeadDetail.tsx` - Added shouldSuggestStatusChange helper, checkStatusSuggestion callback, wired into handleStepToggle and handleStepComplete

## Decisions Made
- URL param `?difficulty=N` chosen for weak area to train routing (simple, works with browser history)
- `useState` initializer reads URL param once on mount (not a useEffect sync) to avoid flash of wrong selection
- `checkStatusSuggestion` reads query cache via `getQueryData` after optimistic update rather than waiting for server refetch
- 50% threshold for suggestion; only fires when step status transitions to 'done' (not skip or reset)
- 6-second toast duration (longer than default 4s) with action button for one-tap status update

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Parallel plan 20-01 was simultaneously modifying LeadDetail.tsx (adding OutcomeCaptureModal, closurePending, fireLevelUpConfetti). Changes were to different sections of the file. Task 2 commit includes some of 20-01's intermediate changes since both agents write to the same file. No conflicts.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Weak area practice routing ready for user testing
- Status suggestion toast ready for user testing
- No blockers for remaining phase 20 plans

## Self-Check: PASSED

- All 3 modified files exist on disk
- Commit `4e6a484` (Task 1) verified in git log
- Commit `2c94f24` (Task 2) verified in git log
- SUMMARY.md created at `.planning/phases/20-quick-wins-by-prody/20-03-SUMMARY.md`

---
*Phase: 20-quick-wins-by-prody*
*Completed: 2026-02-08*
