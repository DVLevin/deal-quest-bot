---
phase: 21-seamless-tma-bot-integration
plan: 02
subsystem: api
tags: [postgresql, polling, telegram, event-bus, bot]

# Dependency graph
requires:
  - phase: 19-active-engagement-execution
    provides: draft_requests/plan_requests polling pattern
provides:
  - tma_events database table for TMA-to-Bot real-time event communication
  - TmaEventModel Pydantic model
  - TmaEventRepo with claim/deliver pattern
  - Background poller processing events and sending Telegram confirmations
affects: [21-03-PLAN (TMA mutations write events), 21-04-PLAN (end-to-end integration)]

# Tech tracking
tech-stack:
  added: []
  patterns: [event-bus polling for cross-interface notifications, at-most-once delivery]

key-files:
  created:
    - insforge/migrations/010_tma_events.sql
    - bot/services/tma_event_poller.py
  modified:
    - bot/storage/models.py
    - bot/storage/repositories.py
    - bot/main.py

key-decisions:
  - "At-most-once delivery: always mark delivered even if Telegram send fails (no re-send on next poll)"
  - "3-second poll interval matching draft/plan pollers"
  - "Stale processing recovery with 2-minute threshold on startup"
  - "tma_events table uses created_at for stale detection (no updated_at column needed)"

patterns-established:
  - "TMA event bus: tma_events table with pending/processing/delivered/failed status flow"
  - "Event type dispatch: step_completed, step_skipped, status_changed, lead_assigned with flexible JSONB payload"

# Metrics
duration: 3min
completed: 2026-02-09
---

# Phase 21 Plan 02: TMA Event Bus Summary

**tma_events DB table with bot-side poller sending Telegram confirmations for step completion, status changes, and lead assignments**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-09T16:05:33Z
- **Completed:** 2026-02-09T16:08:21Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created tma_events table with pending/processing/delivered/failed status flow, indexed for efficient polling
- Built TmaEventRepo with claim_next + mark_delivered pattern matching proven draft/plan request repos
- Implemented TMA event poller with human-readable Telegram messages for 4 event types
- Wired poller into bot startup alongside existing background pollers

## Task Commits

Each task was committed atomically:

1. **Task 1: Create tma_events migration, model, and repository** - `8e01794` (feat)
2. **Task 2: Create TMA event poller and wire into bot startup** - `171763b` (feat)

## Files Created/Modified
- `insforge/migrations/010_tma_events.sql` - tma_events table with status columns, indexes, and RLS
- `bot/storage/models.py` - TmaEventModel with event_type, lead_id, payload, status fields
- `bot/storage/repositories.py` - TmaEventRepo with claim_next, mark_delivered, mark_failed, reset_stale_processing
- `bot/services/tma_event_poller.py` - Background poller with message formatting for all 4 event types
- `bot/main.py` - TmaEventRepo creation and poller startup as background task

## Decisions Made
- At-most-once delivery prevents duplicate Telegram messages on bot restart (mark delivered even on send failure)
- 3-second poll interval consistent with existing draft/plan pollers
- tma_events uses created_at for stale detection since events have no updated_at column
- Lead name resolved from lead_repo first, falling back to payload.lead_name, then "your lead"

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

- Run migration `insforge/migrations/010_tma_events.sql` on InsForge database

## Next Phase Readiness
- tma_events infrastructure ready for 21-03 (TMA mutations writing events)
- Bot poller running and ready to process any events inserted into the table
- All 4 event types handled: step_completed, step_skipped, status_changed, lead_assigned

## Self-Check: PASSED

All files exist. All commit hashes verified.

---
*Phase: 21-seamless-tma-bot-integration*
*Completed: 2026-02-09*
