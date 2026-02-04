---
phase: 10-error-handling-and-ux
plan: 02
subsystem: ui
tags: [react, error-handling, tanstack-query, refetch, ErrorCard]

# Dependency graph
requires:
  - phase: 10-01
    provides: ErrorCard component with compact/full variants and retry support
provides:
  - Consistent ErrorCard usage across all 18 data-fetching components
  - onRetry wired to query refetch in every ErrorCard instance
  - isError handling added to 6 components that previously ignored errors
affects: [10-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ErrorCard compact for errors inside Card wrappers, full for standalone"
    - "Hook return objects expose refetch alongside isError for component-level retry"
    - "Props-based error forwarding for presentational components (CasebookList)"

key-files:
  created: []
  modified:
    - packages/webapp/src/features/dashboard/components/ProgressCard.tsx
    - packages/webapp/src/features/dashboard/components/LeaderboardWidget.tsx
    - packages/webapp/src/features/dashboard/components/BadgePreview.tsx
    - packages/webapp/src/features/gamification/components/BadgeWall.tsx
    - packages/webapp/src/features/profile/components/ProfileHeader.tsx
    - packages/webapp/src/features/profile/components/AttemptHistory.tsx
    - packages/webapp/src/features/profile/components/BadgeCollection.tsx
    - packages/webapp/src/features/profile/components/StatsOverview.tsx
    - packages/webapp/src/features/admin/components/TeamOverview.tsx
    - packages/webapp/src/features/admin/components/MemberLeaderboard.tsx
    - packages/webapp/src/features/admin/components/WeakAreas.tsx
    - packages/webapp/src/features/admin/components/ActivityFeed.tsx
    - packages/webapp/src/features/learn/components/TrackList.tsx
    - packages/webapp/src/features/leads/components/LeadList.tsx
    - packages/webapp/src/features/leads/components/LeadDetail.tsx
    - packages/webapp/src/features/leads/components/ActivityTimeline.tsx
    - packages/webapp/src/features/settings/components/SettingsPanel.tsx
    - packages/webapp/src/features/casebook/components/CasebookList.tsx
    - packages/webapp/src/features/profile/hooks/useUserBadges.ts
    - packages/webapp/src/features/profile/hooks/useAttemptHistory.ts
    - packages/webapp/src/features/profile/hooks/useUserStats.ts
    - packages/webapp/src/pages/Casebook.tsx

key-decisions:
  - "compact mode for ErrorCard when rendered inside existing Card wrapper; full mode for standalone"
  - "Added refetch to 3 custom hook return objects (useUserBadges, useAttemptHistory, useUserStats)"
  - "CasebookList receives isError/onRetry as props since it uses parent-driven data"
  - "Admin components preserve Card header above ErrorCard compact for context"

patterns-established:
  - "ErrorCard compact inside Card, full standalone: consistent across all 18 components"
  - "onRetry always wired to query refetch function"

# Metrics
duration: 5min
completed: 2026-02-04
---

# Phase 10 Plan 02: Consistent Error States Summary

**All 18 TMA data-fetching components standardized to use ErrorCard with retry, replacing 13 inline error patterns and adding isError handling to 6 components that ignored errors**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-04T20:28:07Z
- **Completed:** 2026-02-04T20:33:07Z
- **Tasks:** 2
- **Files modified:** 22

## Accomplishments
- Replaced inline error text with ErrorCard in 12 components (11 that checked isError + TrackList with custom error UI)
- Added isError handling to 6 components that previously ignored errors (LeadList, LeadDetail, ActivityTimeline, SettingsPanel, StatsOverview, CasebookList)
- Every ErrorCard has onRetry wired to its query's refetch function
- Added refetch to 3 custom hook return objects that only exposed isError

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace inline error states with ErrorCard in 12 components** - `4b83a1d` (feat)
2. **Task 2: Add isError handling to 6 components that previously ignored errors** - `35da887` (feat)

## Files Created/Modified
- `packages/webapp/src/features/dashboard/components/ProgressCard.tsx` - ErrorCard replaces inline Card error
- `packages/webapp/src/features/dashboard/components/LeaderboardWidget.tsx` - ErrorCard compact in Card
- `packages/webapp/src/features/dashboard/components/BadgePreview.tsx` - ErrorCard compact in Card
- `packages/webapp/src/features/gamification/components/BadgeWall.tsx` - ErrorCard compact in Card
- `packages/webapp/src/features/profile/components/ProfileHeader.tsx` - ErrorCard replaces div error
- `packages/webapp/src/features/profile/components/AttemptHistory.tsx` - ErrorCard compact in Card
- `packages/webapp/src/features/profile/components/BadgeCollection.tsx` - ErrorCard compact in Card
- `packages/webapp/src/features/profile/components/StatsOverview.tsx` - isError added with ErrorCard compact
- `packages/webapp/src/features/admin/components/TeamOverview.tsx` - ErrorCard replaces Card error
- `packages/webapp/src/features/admin/components/MemberLeaderboard.tsx` - ErrorCard compact with header preserved
- `packages/webapp/src/features/admin/components/WeakAreas.tsx` - ErrorCard compact with header preserved
- `packages/webapp/src/features/admin/components/ActivityFeed.tsx` - ErrorCard compact with header preserved
- `packages/webapp/src/features/learn/components/TrackList.tsx` - ErrorCard replaces custom error/retry UI
- `packages/webapp/src/features/leads/components/LeadList.tsx` - isError added with ErrorCard
- `packages/webapp/src/features/leads/components/LeadDetail.tsx` - isError added before !lead redirect
- `packages/webapp/src/features/leads/components/ActivityTimeline.tsx` - isError added with compact ErrorCard
- `packages/webapp/src/features/settings/components/SettingsPanel.tsx` - isError added with compact ErrorCard
- `packages/webapp/src/features/casebook/components/CasebookList.tsx` - isError/onRetry props added
- `packages/webapp/src/pages/Casebook.tsx` - passes isError/refetch to CasebookList
- `packages/webapp/src/features/profile/hooks/useUserBadges.ts` - refetch exposed in return
- `packages/webapp/src/features/profile/hooks/useAttemptHistory.ts` - refetch exposed in return
- `packages/webapp/src/features/profile/hooks/useUserStats.ts` - refetch exposed in return

## Decisions Made
- Used compact mode for ErrorCard when inside an existing Card wrapper (preserves Card header/context)
- Used full mode for ErrorCard when the error state replaces a standalone Card or top-level section
- Admin components (MemberLeaderboard, WeakAreas, ActivityFeed) preserve section headers above compact ErrorCard
- CasebookList uses props-based error forwarding since parent owns the hook
- 3 hooks needed refetch added to custom return objects; hooks that return raw useQuery() already expose it

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added refetch to 3 custom hook return objects**
- **Found during:** Task 1 (ErrorCard integration)
- **Issue:** useUserBadges, useAttemptHistory, useUserStats expose custom return objects without refetch
- **Fix:** Added `refetch: query.refetch` to all 3 hook return values
- **Files modified:** useUserBadges.ts, useAttemptHistory.ts, useUserStats.ts
- **Verification:** TypeScript compiles, components can destructure refetch
- **Committed in:** 4b83a1d (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix necessary for ErrorCard onRetry wiring. No scope creep.

## Issues Encountered
- Pre-commit hook auto-committed working tree changes from Plan 10-03 (EmptyState upgrades and toast wiring). These were not part of Plan 10-02 execution but were applied during the linter pass. The Plan 10-02 changes were preserved correctly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 18 components now use standardized ErrorCard with retry
- Ready for Plan 10-03 (empty states) -- some empty state work was auto-committed during this execution
- TypeScript compiles and Vite builds cleanly

---
*Phase: 10-error-handling-and-ux*
*Completed: 2026-02-04*
