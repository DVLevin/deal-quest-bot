---
phase: 16-tma-lead-experience-dashboard
plan: 03
subsystem: ui
tags: [react, tanstack-query, dashboard, leads, engagement-plan, scheduled-reminders]

# Dependency graph
requires:
  - phase: 16-01
    provides: Lead card with reminder-based progress, useLeadReminders hook, queryKeys.leads.reminders
  - phase: 12-01
    provides: scheduled_reminders table with pending/sent status tracking
provides:
  - useTodayActions hook aggregating overdue/due-today engagement steps across leads
  - TodayActionsCard dashboard widget with overdue/today badges and navigation
  - Cache invalidation for todayActions on step completion
affects: [16-04, phase-17]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cross-entity aggregation hook pattern (query multiple tables, enrich, filter)"
    - "Dashboard widget with inline action navigation via query params"

key-files:
  created:
    - packages/webapp/src/features/leads/hooks/useTodayActions.ts
    - packages/webapp/src/features/dashboard/components/TodayActionsCard.tsx
  modified:
    - packages/webapp/src/lib/queries.ts
    - packages/webapp/src/pages/Dashboard.tsx
    - packages/webapp/src/features/leads/hooks/useUpdatePlanStep.ts

key-decisions:
  - "60-second refetch interval for todayActions to keep dashboard current"
  - "Max 5 actions shown in widget with 'View all' link to /leads"
  - "Overdue items sorted first (ascending by due_at from DB query)"

patterns-established:
  - "Cross-lead aggregation: query scheduled_reminders then enrich with lead_registry data"
  - "Step navigation via query param: /leads/:id?step=:stepId"

# Metrics
duration: 2min
completed: 2026-02-06
---

# Phase 16 Plan 03: Dashboard Today's Actions Widget Summary

**Today's Actions dashboard widget aggregating overdue/due-today engagement steps with lead navigation and cache invalidation on step completion**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-06T13:18:08Z
- **Completed:** 2026-02-06T13:20:35Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- useTodayActions hook fetches pending/sent reminders, enriches with lead names and step descriptions, filters to overdue/due-today
- TodayActionsCard shows count badges (overdue in red, due-today in blue), action list with lead name and step description, navigation on tap
- Dashboard widget integrated after ProgressCard; step completion invalidates todayActions and reminders caches

## Task Commits

Each task was committed atomically:

1. **Task 1: Add todayActions query key and create useTodayActions hook** - `98e0523` (feat)
2. **Task 2: Create TodayActionsCard dashboard widget** - `535daf0` (feat)
3. **Task 3: Integrate TodayActionsCard into Dashboard and wire cache invalidation** - `c8c4b8b` (feat)

**Plan metadata:** (pending)

## Files Created/Modified
- `packages/webapp/src/features/leads/hooks/useTodayActions.ts` - Cross-lead action aggregation hook with TodayAction[] return type
- `packages/webapp/src/features/dashboard/components/TodayActionsCard.tsx` - Dashboard widget with loading/error/empty/populated states
- `packages/webapp/src/lib/queries.ts` - Added todayActions query key to leads factory
- `packages/webapp/src/pages/Dashboard.tsx` - Added TodayActionsCard after ProgressCard
- `packages/webapp/src/features/leads/hooks/useUpdatePlanStep.ts` - Added todayActions and reminders cache invalidation on step change

## Decisions Made
- 60-second refetch interval balances freshness with performance for dashboard polling
- Max 5 actions shown in widget; overflow links to /leads page for full list
- Overdue items naturally sort first via ascending due_at ordering from database

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unused telegramId in onMutate destructuring**
- **Found during:** Task 3 (useUpdatePlanStep cache invalidation wiring)
- **Issue:** Pre-existing TS6133 error -- `telegramId` destructured in onMutate but never used, causing TypeScript compilation to report an error
- **Fix:** Removed unused `telegramId` from onMutate destructuring parameter
- **Files modified:** packages/webapp/src/features/leads/hooks/useUpdatePlanStep.ts
- **Verification:** `npx tsc --noEmit` now reports zero errors
- **Committed in:** c8c4b8b (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor fix to pre-existing TS error. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Dashboard now shows actionable lead steps alongside progress and training widgets
- TodayActionsCard navigation uses ?step= query param ready for LeadDetail step highlighting (built in 16-02)
- Ready for 16-04 (final plan in phase)

---
*Phase: 16-tma-lead-experience-dashboard*
*Completed: 2026-02-06*
