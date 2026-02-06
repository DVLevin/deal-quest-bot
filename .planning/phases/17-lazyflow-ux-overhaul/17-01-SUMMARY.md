---
phase: 17-lazyflow-ux-overhaul
plan: 01
subsystem: ui
tags: [react, tanstack-query, prefetch, dashboard, smart-landing, hooks]

# Dependency graph
requires:
  - phase: 16-tma-lead-experience
    provides: TodayActionsCard widget, useTodayActions hook, lead detail page
provides:
  - useSmartLanding hook for context-aware dashboard focus
  - Conditional card ordering based on urgency
  - Contextual header reflecting overdue actions or active streak
  - Lead detail prefetching for instant navigation from Today's Actions
affects: [17-02, 17-03, 17-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Smart landing hook composition (useSmartLanding composing useTodayActions + useUserProgress)"
    - "Prefetch pattern with queryClient.prefetchQuery matching useLead cache key"

key-files:
  created:
    - packages/webapp/src/features/dashboard/hooks/useSmartLanding.ts
  modified:
    - packages/webapp/src/pages/Dashboard.tsx
    - packages/webapp/src/features/dashboard/components/TodayActionsCard.tsx

key-decisions:
  - "LandingFocus as simple hook composition, not Zustand store"
  - "Prefetch limited to 3 leads max to prevent API overload on mount"
  - "60s staleTime on prefetched queries matches useLead behavior"

patterns-established:
  - "Smart landing: hook composition pattern for dashboard context detection"
  - "Prefetch on mount: useEffect + queryClient.prefetchQuery for predictive data loading"

# Metrics
duration: 2min
completed: 2026-02-06
---

# Phase 17 Plan 01: Smart Landing & Dashboard Context Summary

**useSmartLanding hook with conditional card ordering, contextual urgency header, and lead detail prefetching for instant Today's Actions navigation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-06T14:30:12Z
- **Completed:** 2026-02-06T14:32:15Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created useSmartLanding hook that composes useTodayActions and useUserProgress to determine dashboard focus mode
- Dashboard conditionally reorders cards: TodayActionsCard promoted to first position when overdue actions exist
- Contextual header shows overdue count (error style) or streak encouragement (accent style)
- Skeleton placeholder during loading prevents cumulative layout shift
- TodayActionsCard prefetches first 3 lead details for instant navigation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useSmartLanding hook and update Dashboard layout** - `5a6735a` (feat)
2. **Task 2: Add lead detail prefetching to TodayActionsCard** - `61b1734` (feat)

## Files Created/Modified
- `packages/webapp/src/features/dashboard/hooks/useSmartLanding.ts` - Smart landing hook determining dashboard focus mode (actions-focus, streak-focus, default)
- `packages/webapp/src/pages/Dashboard.tsx` - Dashboard with conditional card ordering and contextual header
- `packages/webapp/src/features/dashboard/components/TodayActionsCard.tsx` - Added lead detail prefetching via useQueryClient + prefetchQuery

## Decisions Made
- LandingFocus implemented as simple hook composition (not Zustand store) -- local derived state, no need for global store
- Prefetch limited to 3 unique lead IDs from first 5 actions to prevent API overload on dashboard mount
- Prefetch queryFn matches useLead's exact select columns and query key for cache compatibility
- 60s staleTime on prefetched queries to balance freshness with request reduction

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness
- Smart landing hook ready for future focus modes (e.g., "training-focus" for training session context)
- Prefetch pattern established for reuse in other navigation-heavy components
- Dashboard layout supports any number of focus modes via simple conditional rendering

---
*Phase: 17-lazyflow-ux-overhaul*
*Completed: 2026-02-06*
