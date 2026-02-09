---
phase: 21-seamless-tma-bot-integration
plan: 01
subsystem: bot
tags: [telegram, reminders, engagement-plan, inline-keyboard, callbacks]

# Dependency graph
requires:
  - phase: 14-engagement-plan-execution
    provides: "Reminder scheduler and callback handlers for engagement steps"
  - phase: 19-active-engagement-execution
    provides: "Step action screens, draft copy, proof-of-action flows"
provides:
  - "Self-contained reminder messages with full draft text inline"
  - "Copy Draft callback handler sending draft as new copyable message"
  - "Next step info (name + relative due date) shown after marking done"
  - "Reorganized keyboard: [Mark Done][Snooze] / [Copy Draft][Skip] / [Open in App]"
affects: [21-seamless-tma-bot-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tuple return from message formatter to pass truncation state to keyboard builder"
    - "Markdown fallback for draft messages containing special characters"

key-files:
  created: []
  modified:
    - bot/services/plan_scheduler.py
    - bot/handlers/reminders.py

key-decisions:
  - "Full draft inline with 3500-char cap (leaves ~600 chars for message header within Telegram's 4096 limit)"
  - "Copy Draft sends as NEW message (answer, not edit) for native long-press copy"
  - "View Full Draft button only appears when draft exceeds 3500 chars (conditional row)"
  - "Next step lookup excludes current step_id and filters by status not in (done, skipped)"

patterns-established:
  - "_format_relative_date: reusable date helper for today/tomorrow/in N days/overdue"
  - "Tuple return from _format_reminder_message to pass truncation state downstream"

# Metrics
duration: 2min
completed: 2026-02-09
---

# Phase 21 Plan 01: Self-Contained Reminder Messages Summary

**Full draft text inline in bot reminders with Copy Draft button and next-step-due info after marking done**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-09T16:05:30Z
- **Completed:** 2026-02-09T16:08:03Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Reminder messages now display the full draft text inline instead of a truncated 150-char preview
- New Copy Draft button sends the full draft as a separate copyable message
- Done handler shows next pending step name and relative due date (or plan completion message)
- Reorganized keyboard reduces cognitive load: primary actions on row 1, secondary on row 2

## Task Commits

Each task was committed atomically:

1. **Task 1: Enhance reminder message format and keyboard** - `8f5e10b` (feat)
2. **Task 2: Add Copy Draft handler and enhance Done handler** - `afa9d2d` (feat)

## Files Created/Modified
- `bot/services/plan_scheduler.py` - Full draft inline in _format_reminder_message, reorganized keyboard with Copy Draft button
- `bot/handlers/reminders.py` - New on_reminder_copy_draft handler, enhanced on_reminder_done with next step info, _format_relative_date helper

## Decisions Made
- Full draft inline with 3500-char cap (leaves ~600 chars for message header within Telegram's 4096 limit)
- Copy Draft sends as NEW message (answer, not edit) for native long-press copy
- View Full Draft button only appears when draft exceeds 3500 chars (conditional row)
- Next step lookup excludes current step_id and filters by status not in (done, skipped)
- Markdown fallback for draft messages containing special characters that break Telegram parsing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Bot reminder messages are now self-contained action points
- Users can read full drafts, copy them, and mark steps done without leaving Telegram
- Ready for plan 02 (TMA-side enhancements)

## Self-Check: PASSED

All files verified present, all commit hashes confirmed in git log.

---
*Phase: 21-seamless-tma-bot-integration*
*Completed: 2026-02-09*
