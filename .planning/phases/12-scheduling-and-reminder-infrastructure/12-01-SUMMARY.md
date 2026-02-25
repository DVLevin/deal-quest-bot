---
phase: 12-scheduling-and-reminder-infrastructure
plan: 01
subsystem: database
tags: [postgresql, pydantic, repository-pattern, rls, scheduled-reminders]

# Dependency graph
requires:
  - phase: 08-lead-management
    provides: Lead registry table and repo for referential context
provides:
  - scheduled_reminders table with RLS policies
  - ScheduledReminderModel Pydantic model (13 fields)
  - ScheduledReminderRepo (8 data access methods)
  - delay_days field in engagement plan prompt
affects: [12-02-scheduler-integration, 14-reminder-ux, 16-tma-experience]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Repository pattern for scheduled_reminders (same as other repos)
    - Partial index for polling hot path (status filtering)
    - Defensive fallback from PostgREST filters to Python filtering

key-files:
  created:
    - insforge/migrations/002_scheduled_reminders.sql
  modified:
    - bot/storage/models.py
    - bot/storage/repositories.py
    - prompts/engagement_plan.md

key-decisions:
  - "No foreign keys in migration (app handles referential integrity)"
  - "Partial index on due_at WHERE status IN (pending, sent) for polling efficiency"
  - "TMA authenticated policies for read/update scoped to telegram_id from JWT"

patterns-established:
  - "Engagement plan JSON includes delay_days for scheduling"
  - "Monotonically increasing delay_days rule for proper step ordering"

# Metrics
duration: 4min
completed: 2026-02-05
---

# Phase 12 Plan 01: Data Foundation Summary

**scheduled_reminders table with RLS, ScheduledReminderModel/Repo, and delay_days field in engagement plan prompt**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-05T08:49:00Z
- **Completed:** 2026-02-05T08:53:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created scheduled_reminders migration with table, 3 indexes (polling, lead, telegram), RLS, grants
- Added ScheduledReminderModel with 13 fields matching table schema
- Added ScheduledReminderRepo with 8 methods (create, get_due_reminders, cancel_pending_for_lead, mark_reminded, update_status, delete_for_lead, get_for_lead, get_by_lead_and_step)
- Updated engagement plan prompt with delay_days integer field and rules 8-10

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration SQL, Pydantic model, and repository class** - `606eec8` (feat)
2. **Task 2: Update engagement plan prompt with delay_days field** - `3a9d6ab` (feat)

## Files Created/Modified
- `insforge/migrations/002_scheduled_reminders.sql` - Table creation with polling index, RLS policies, authenticated user policies
- `bot/storage/models.py` - ScheduledReminderModel with 13 fields
- `bot/storage/repositories.py` - ScheduledReminderRepo with 8 data access methods
- `prompts/engagement_plan.md` - Added delay_days to output format and rules 8-10

## Decisions Made
- No FK constraints in migration (codebase pattern handles referential integrity in application code)
- Partial index for polling (due_at WHERE status IN pending/sent) optimizes the hot path
- Added TMA authenticated policies for user-scoped read/update (future TMA integration)
- Monotonically increasing delay_days rule ensures proper step ordering in engagement plans

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

**Migration execution required.** Run the following on InsForge:
- Execute `insforge/migrations/002_scheduled_reminders.sql` via InsForge dashboard SQL editor

## Next Phase Readiness
- Data layer complete: table, model, repo ready for scheduler integration
- Engagement plan prompt updated: new leads will have delay_days in their plans
- Ready for 12-02: Scheduler integration (polling loop, reminder creation from engagement plans)

---
*Phase: 12-scheduling-and-reminder-infrastructure*
*Completed: 2026-02-05*
