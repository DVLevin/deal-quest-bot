---
phase: 14-engagement-plan-execution
plan: 01
subsystem: notifications
tags: [aiogram, inline-keyboard, escalation, reminders, telegram]

# Dependency graph
requires:
  - phase: 12-scheduling-and-reminder
    provides: scheduled_reminders table and basic notification dispatch
provides:
  - Rich Markdown reminder messages with lead context
  - Inline action keyboard (Done/Snooze/Skip/ViewDraft/ViewLead)
  - 3-level escalation logic with auto-snooze
  - ScheduledReminderRepo.snooze() method
affects: [14-02-reminder-action-handlers, phase-16-tma-experience]

# Tech tracking
tech-stack:
  added: []
  patterns: [escalation-tone-mapping, callback-data-format]

key-files:
  created: []
  modified:
    - bot/storage/repositories.py
    - bot/services/plan_scheduler.py

key-decisions:
  - "3 reminders before auto-snooze (MAX_ESCALATION=3)"
  - "7-day auto-snooze period for unacknowledged reminders"
  - "Callback data format: reminder:{action}:{lead_id}:{step_id}"

patterns-established:
  - "Escalation tone mapping: level 0 (initial), level 1 (nudge), level 2+ (final)"
  - "Draft preview truncation: 150 chars with ellipsis"

# Metrics
duration: 1min
completed: 2026-02-05
---

# Phase 14 Plan 01: Rich Reminder Messages Summary

**Inline action keyboards with Done/Snooze/Skip buttons and 3-level escalation logic that auto-snoozes after 3 reminders**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-05T09:41:30Z
- **Completed:** 2026-02-05T09:43:11Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Rich Markdown reminder messages with lead name, company, step description, and draft preview
- Inline keyboard with Done/Snooze 24h/Skip buttons (row 1), View Full Draft (row 2), View Lead (row 3)
- Escalation tone changes from initial to nudge to final based on reminder_count
- Auto-snooze for 7 days after 3 reminders with user notification
- snooze() method in ScheduledReminderRepo for programmatic snoozing

## Task Commits

Each task was committed atomically:

1. **Task 1: Add snooze() method to ScheduledReminderRepo** - `85b8d44` (feat)
2. **Task 2: Upgrade plan_scheduler.py with rich messages and escalation** - `63b75e8` (feat)

## Files Created/Modified
- `bot/storage/repositories.py` - Added snooze() method to ScheduledReminderRepo
- `bot/services/plan_scheduler.py` - Rich messages, inline keyboards, escalation logic

## Decisions Made
- MAX_ESCALATION = 3: After 3 reminder sends without response, auto-snooze for 7 days
- Callback data format `reminder:{action}:{lead_id}:{step_id}` enables handler parsing
- Draft preview truncated to 150 chars to keep messages readable

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Inline keyboards are rendered but button callbacks are not yet handled
- Plan 14-02 will implement callback handlers for Done/Snooze/Skip/ViewDraft actions
- Ready for handler implementation

---
*Phase: 14-engagement-plan-execution*
*Completed: 2026-02-05*
