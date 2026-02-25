---
phase: 16-tma-lead-experience-dashboard
plan: 04
subsystem: bot
tags: [telegram, deep-link, tma, inline-keyboard, engagement-reminders]

# Dependency graph
requires:
  - phase: 07-bot-integration
    provides: "add_open_in_app_row utility in utils_tma.py"
  - phase: 12-scheduling-and-reminder-infrastructure
    provides: "plan_scheduler.py with reminder polling loop"
provides:
  - "query_params support in add_open_in_app_row for deep-link URLs"
  - "Open in App button on reminder messages linking to lead detail with step highlight"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "URL query param deep-linking: path + query_params dict for TMA navigation"
    - "DI parameter threading: tma_url passed through scheduler chain via function args"

key-files:
  created: []
  modified:
    - "bot/utils_tma.py"
    - "bot/services/plan_scheduler.py"
    - "bot/main.py"

key-decisions:
  - "tma_url passed as function parameter through scheduler chain (not imported from config)"
  - "query_params uses urllib.parse.urlencode for proper URL encoding"
  - "add_open_in_app_row returns existing keyboard unchanged when tma_url empty (graceful degradation)"

patterns-established:
  - "Deep-link query params: add_open_in_app_row(kb, url, path, query_params={'step': str(id)})"

# Metrics
duration: 2min
completed: 2026-02-06
---

# Phase 16 Plan 04: Open in App Deep Link Button Summary

**Reminder messages include Open in App button deep-linking to lead detail with step highlighted via query_params**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-06T13:18:14Z
- **Completed:** 2026-02-06T13:19:46Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Extended `add_open_in_app_row` with optional `query_params` dict for URL query string generation
- Added Open in App button to plan_scheduler reminder keyboards, deep-linking to `leads/{lead_id}?step={step_id}`
- Threaded `tma_url` through scheduler chain via DI function parameters (not config import)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend add_open_in_app_row with query_params support** - `f5188cb` (feat)
2. **Task 2: Add Open in App button to reminder messages** - `c5a49b8` (feat)

## Files Created/Modified
- `bot/utils_tma.py` - Added `query_params: dict[str, str] | None = None` parameter with `urlencode` support
- `bot/services/plan_scheduler.py` - Imported `add_open_in_app_row`, threaded `tma_url` through functions, added button to reminder keyboard
- `bot/main.py` - Pass `cfg.tma_url` to `start_plan_scheduler` call

## Decisions Made
- Passed `tma_url` as function parameter through the scheduler chain (`start_plan_scheduler` -> `_process_due_plan_reminders` -> `_reminder_action_keyboard`) rather than importing from config module. This follows the existing DI pattern and avoids the `from bot.config import settings` crash (no `settings` singleton exists).
- Used `urllib.parse.urlencode` for proper URL encoding of query parameters instead of manual string concatenation.
- All parameters have defaults (`tma_url=""`, `query_params=None`) ensuring full backward compatibility.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. TMA_URL env var setup was already tracked in earlier phases.

## Next Phase Readiness
- Phase 16 is now fully complete (all 4 plans executed)
- All bot-side deep-link integration for TMA lead experience is in place
- Ready for Phase 17 (LazyFlow UX Overhaul)

---
*Phase: 16-tma-lead-experience-dashboard*
*Completed: 2026-02-06*
