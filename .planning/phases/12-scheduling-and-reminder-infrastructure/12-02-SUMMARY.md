---
phase: 12-scheduling-and-reminder-infrastructure
plan: 02
subsystem: scheduler
tags: [polling-scheduler, reminder-system, telegram-notifications, background-tasks]

# Dependency graph
requires:
  - phase: 12-01
    provides: scheduled_reminders table with ScheduledReminderRepo methods
provides:
  - Plan step scheduler service with timing parser
  - Per-step reminder scheduling on engagement plan creation
  - Polling loop sending Telegram notifications for due reminders
  - Reminder sync on step toggle and cascade delete on lead removal
affects: [14-reminder-ux, 16-tma-experience]

# Tech tracking
tech-stack:
  added: []
  patterns: [polling-scheduler, optimistic-update-before-send, duplicate-guard]

key-files:
  created:
    - bot/services/plan_scheduler.py
  modified:
    - bot/handlers/support.py
    - bot/handlers/leads.py
    - bot/main.py

key-decisions:
  - "15-minute polling interval balances responsiveness with resource usage"
  - "Optimistic update before send prevents duplicate reminders on bot restart"
  - "Timing parser prioritizes delay_days (reliable) over timing string (regex fallback)"

patterns-established:
  - "Timing parser: delay_days > timing regex > default 3-day spacing"
  - "Per-step reminders created atomically with idempotent cancel-and-recreate"
  - "Reminder-to-lead lifecycle sync (toggle, delete cascade)"

# Metrics
duration: 8min
completed: 2026-02-05
---

# Phase 12 Plan 02: Scheduler Integration Summary

**Plan scheduler with timing parser, reminder scheduling on plan creation, 15-minute polling loop with Telegram notifications, and lead lifecycle sync**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-05
- **Completed:** 2026-02-05
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created timing parser handling delay_days (primary), timing string regex (fallback), and 3-day default spacing
- Integrated schedule_plan_reminders() call into _background_enrich_lead after engagement plan generation
- Added 15-minute polling scheduler that sends basic Markdown Telegram notifications for due reminders
- Wired reminder sync on step toggle (done/pending status) and cascade delete on lead removal
- Both followup_scheduler (6h) and plan_scheduler (15m) now run concurrently

## Task Commits

Each task was committed atomically:

1. **Task 1: Create plan_scheduler.py** - `c6a8231` (feat)
2. **Task 2: Wire into support.py, leads.py, main.py** - `05ba247` (feat)

## Files Created/Modified

- `bot/services/plan_scheduler.py` - New file: timing parser (6 regex patterns), schedule_plan_reminders(), polling loop with duplicate guard and optimistic update
- `bot/handlers/support.py` - Added schedule_plan_reminders call after plan generation, passed reminder_repo through DI chain
- `bot/handlers/leads.py` - Added reminder sync on step toggle, cascade delete on lead removal
- `bot/main.py` - Initialized ScheduledReminderRepo, added to workflow_data, started plan_scheduler background task

## Decisions Made

- **15-minute polling interval:** Balances user notification responsiveness with server resource usage; can be tuned later
- **Optimistic update before send:** Marks reminder as reminded BEFORE sending message to prevent duplicates on bot restart/crash
- **Timing parser priority:** delay_days field (most reliable from LLM structured output) takes precedence over timing string regex parsing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

- **Migration required:** Run `insforge/migrations/002_scheduled_reminders.sql` on InsForge database (from Plan 01)

## Next Phase Readiness

- Phase 12 complete: Scheduling infrastructure is fully operational
- New engagement plans automatically create per-step reminders with computed due dates
- Polling scheduler sends basic Markdown notifications; Phase 14 will upgrade to rich interactive notifications
- Ready for parallel Phase 13 (Smart Lead Creation) or sequential Phase 14 (Reminder UX)

---
*Phase: 12-scheduling-and-reminder-infrastructure*
*Completed: 2026-02-05*
