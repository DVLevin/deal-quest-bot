---
phase: 20-quick-wins-by-prody
plan: 04
subsystem: ui, bot
tags: [react, modal, telegram, scheduler, lead-management, closure-tracking]

# Dependency graph
requires:
  - phase: 05-leads-settings
    provides: LeadDetail component and lead_activity_log table
  - phase: 12-scheduling-reminder
    provides: followup_scheduler.py background loop
provides:
  - OutcomeCaptureModal component for closure reason capture
  - Stale lead daily digest in followup_scheduler
  - outcome_capture activity type in lead_activity_log
affects: [training-loop, analytics, pipeline-velocity]

# Tech tracking
tech-stack:
  added: []
  patterns: [closure-intercept-modal, stale-lead-digest, outcome-activity-logging]

key-files:
  created:
    - packages/webapp/src/features/leads/components/OutcomeCaptureModal.tsx
  modified:
    - packages/webapp/src/features/leads/components/LeadDetail.tsx
    - bot/services/followup_scheduler.py

key-decisions:
  - "Closure modal uses bottom-sheet pattern (items-end) for mobile-first UX"
  - "Outcome logging is best-effort (non-blocking) after status mutation succeeds"
  - "Stale digest capped at 10 leads per message with overflow indicator"
  - "24-hour interval guard for stale digest prevents over-messaging"

patterns-established:
  - "Closure intercept: handleStatusChange delegates to commitStatusChange with optional reason"
  - "Activity logging pattern: outcome_capture type with metadata JSONB {outcome, reason}"

# Metrics
duration: 7min
completed: 2026-02-08
---

# Phase 20 Plan 04: Outcome Capture & Stale Lead Digest Summary

**Closure reason modal with quick-select pills on lead close, plus daily stale lead digest for pipeline decay alerts**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-08T07:36:38Z
- **Completed:** 2026-02-08T07:43:38Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- OutcomeCaptureModal with 8 won reasons and 8 lost reasons as quick-select pills
- LeadDetail intercepts closed_won/closed_lost to show modal before committing status change
- Closure reasons stored as outcome_capture activity in lead_activity_log with structured metadata
- Stale lead daily digest groups inactive leads (7+ days) by user and sends Markdown summary

## Task Commits

Each task was committed atomically:

1. **Task 1: Outcome capture modal on lead closure** - `65e29f5` (feat)
2. **Task 2: Stale lead daily digest in followup_scheduler** - `e6108ae` (feat)

## Files Created/Modified
- `packages/webapp/src/features/leads/components/OutcomeCaptureModal.tsx` - Bottom-sheet modal with won/lost reason quick-select pills
- `packages/webapp/src/features/leads/components/LeadDetail.tsx` - Added closure intercept, commitStatusChange, outcome logging, modal render
- `bot/services/followup_scheduler.py` - Added _send_stale_digest function and 24h-guarded stale check in scheduler loop

## Decisions Made
- Bottom-sheet modal pattern (items-end) matches mobile-first Telegram Mini App UX
- Outcome logging is best-effort: status change succeeds even if activity insert fails
- Stale digest limited to 10 leads per message to avoid overly long Telegram messages
- 24-hour interval on stale digest prevents duplicate sends on 6-hour scheduler interval

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- LeadDetail.tsx was being concurrently modified by a linter/formatter, causing repeated edit failures. Resolved by using full file write instead of incremental edits.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Outcome capture data available for training loop analysis (future)
- Stale digest active immediately on next bot restart
- No new migrations required (uses existing metadata JSONB field)

---
*Phase: 20-quick-wins-by-prody*
*Completed: 2026-02-08*
