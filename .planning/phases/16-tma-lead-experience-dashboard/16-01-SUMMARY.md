---
phase: 16-tma-lead-experience-dashboard
plan: 01
subsystem: ui
tags: [react, tanstack-query, progress-bar, lead-card, engagement-plan]

# Dependency graph
requires:
  - phase: 12-scheduling-and-reminder
    provides: scheduled_reminders table with RLS policies for TMA reads
  - phase: 14-engagement-plan-execution
    provides: engagement_plan JSONB with step status (done/skipped/pending)
provides:
  - computePlanProgress utility for deriving overdue/completed/nextAction from plan steps
  - useLeadReminders hook for batched reminder queries (no N+1)
  - Enhanced LeadCard with progress bar, overdue badge, and next action preview
  - queryKeys.leads.reminders key factory
affects: [16-02, 16-03, 16-04, dashboard-widgets]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Batched reminder lookup via Map<lead_id, Map<step_id, due_at>> for O(1) access"
    - "Client-side derived data computation (computePlanProgress) to avoid schema changes"

key-files:
  created:
    - packages/webapp/src/features/leads/hooks/useLeadReminders.ts
  modified:
    - packages/webapp/src/features/leads/types.ts
    - packages/webapp/src/features/leads/hooks/useLeads.ts
    - packages/webapp/src/features/leads/components/LeadCard.tsx
    - packages/webapp/src/features/leads/components/LeadList.tsx
    - packages/webapp/src/lib/queries.ts

key-decisions:
  - "Batched reminder query in useLeadReminders avoids N+1 (one query for all leads)"
  - "computePlanProgress accepts nullable remindersDueAt to gracefully degrade when reminders are loading"
  - "Progress section aligned under lead info with pl-13 to match avatar offset"

patterns-established:
  - "Batched lookup hook pattern: fetch all, group by entity ID, pass down as Map"
  - "Optional progress prop on LeadCard (backward-compatible, renders nothing if absent)"

# Metrics
duration: 2min
completed: 2026-02-06
---

# Phase 16 Plan 01: LeadCard Engagement Plan Visibility Summary

**Enhanced LeadCard with engagement plan progress bar, overdue step count badge, and next action preview using batched reminder queries**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-06T13:11:39Z
- **Completed:** 2026-02-06T13:14:25Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Added computePlanProgress utility that derives total/completed/overdue/nextAction from engagement plan steps and scheduled reminder timestamps
- Created useLeadReminders hook that fetches all pending/sent reminders in a single query and groups by lead_id for O(1) per-card lookup
- Enhanced LeadCard to show progress bar, overdue badge, and next action preview below existing lead info
- Integrated batched reminders into LeadList to compute and pass progress for each card without N+1 queries

## Task Commits

Each task was committed atomically:

1. **Task 1: Add computePlanProgress utility and extend useLeads** - `d659d00` (feat)
2. **Task 2: Create useLeadReminders hook for batched reminder data** - `8ce34fa` (feat)
3. **Task 3: Enhance LeadCard with progress bar, overdue badge, next action** - `5b105f6` (feat)

## Files Created/Modified
- `packages/webapp/src/features/leads/types.ts` - Added PlanProgress interface and computePlanProgress function
- `packages/webapp/src/features/leads/hooks/useLeads.ts` - Added engagement_plan to select query and LeadListItem type
- `packages/webapp/src/lib/queries.ts` - Added queryKeys.leads.reminders key factory
- `packages/webapp/src/features/leads/hooks/useLeadReminders.ts` - New hook for batched scheduled_reminders query
- `packages/webapp/src/features/leads/components/LeadCard.tsx` - Enhanced with progress bar, overdue badge, next action
- `packages/webapp/src/features/leads/components/LeadList.tsx` - Integrated useLeadReminders and computePlanProgress

## Decisions Made
- Batched reminder query pattern: fetch all user's pending/sent reminders once, group by lead_id into Map, pass to computePlanProgress per-card. Avoids N+1 queries.
- computePlanProgress accepts nullable remindersDueAt parameter so it gracefully degrades (overdue=0) when reminders are still loading or unavailable.
- Progress section uses pl-13 to align under the lead info text, offset past the avatar column.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- LeadCard now displays plan progress, ready for Plan 02 (LeadDetail restructuring with collapsible sections)
- useLeadReminders hook available for reuse in LeadDetail's PlanSection and TodayActionsCard
- computePlanProgress utility ready for LeadDetail and Dashboard widgets

---
*Phase: 16-tma-lead-experience-dashboard*
*Completed: 2026-02-06*
