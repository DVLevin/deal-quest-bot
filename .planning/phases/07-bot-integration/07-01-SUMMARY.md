---
phase: "07"
plan: "01"
subsystem: "bot"
tags: ["telegram-bot", "tma", "webapp", "inline-keyboard", "webappinfo"]
requires: []
provides: ["tma-bot-buttons", "tma-menu-button", "tma-url-config"]
affects: ["07-02"]
tech-stack:
  added: []
  patterns: ["WebAppInfo inline buttons", "graceful TMA degradation"]
key-files:
  created: ["bot/utils_tma.py"]
  modified: ["bot/config.py", "bot/main.py", "bot/handlers/stats.py", "bot/handlers/learn.py", "bot/handlers/train.py", "bot/handlers/support.py", "bot/handlers/leads.py"]
key-decisions:
  - id: "07-01-01"
    decision: "Empty tma_url string as graceful skip (no validation, no error)"
  - id: "07-01-02"
    decision: "Open in App always appended as LAST row, never replaces existing buttons"
  - id: "07-01-03"
    decision: "setup_menu_button called before polling, after auth middleware"
duration: "4m"
completed: "2026-02-04"
---

# Phase 7 Plan 1: TMA Bot Integration -- Open in App Buttons Summary

WebAppInfo inline buttons on all 5 bot commands (/stats, /learn, /train, /support, /leads) plus programmatic menu button at startup, with graceful degradation when TMA_URL is not configured.

## Performance

- Duration: ~4 minutes
- Tasks: 2/2 complete
- Deviations: 0

## Accomplishments

1. **Config field**: Added `tma_url` to Settings with empty string default -- no env var required for existing deployments
2. **Helper module**: Created `bot/utils_tma.py` with `add_open_in_app_row` (keyboard builder) and `setup_menu_button` (bot startup)
3. **DI wiring**: Injected `tma_url` into `workflow_data` and called `setup_menu_button` at bot startup
4. **5 command handlers**: Each appends "Open in App" as the last keyboard row, linking to the correct TMA page path
5. **Graceful degradation**: When `TMA_URL` is empty, all handlers behave exactly as before (no buttons, no errors)

## Task Commits

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Bot infrastructure (config, helper, main.py) | `6eb63ed` | config.py, utils_tma.py, main.py |
| 2 | Open in App buttons on all 5 handlers | `847c5d4` | stats.py, learn.py, train.py, support.py, leads.py |

## Files Created

| File | Purpose |
|------|---------|
| `bot/utils_tma.py` | Reusable TMA helpers: add_open_in_app_row, setup_menu_button |

## Files Modified

| File | Changes |
|------|---------|
| `bot/config.py` | Added `tma_url: str = ""` field |
| `bot/main.py` | Import setup_menu_button, inject tma_url to workflow_data, call setup at startup |
| `bot/handlers/stats.py` | Import helper, add tma_url param, append Open in App row (path: root) |
| `bot/handlers/learn.py` | Import helper, add tma_url param, append Open in App row (path: learn) |
| `bot/handlers/train.py` | Import helper, add tma_url param, append Open in App row (path: train) |
| `bot/handlers/support.py` | Import helper, add tma_url param, add keyboard with Open in App (path: support) |
| `bot/handlers/leads.py` | Import helper, add tma_url param, append Open in App row (path: leads) |

## Decisions Made

1. **Empty string = skip** (07-01-01): Using empty string rather than Optional[str] or None for tma_url. Simple falsy check in helper. No need to set env var on existing deployments.
2. **Append, never replace** (07-01-02): Open in App is always the LAST row of the keyboard. Existing action buttons (difficulty picker, navigation, etc.) are untouched.
3. **Startup menu button** (07-01-03): setup_menu_button runs once at bot startup (before polling), after auth middleware setup. Uses try/except so failure doesn't crash the bot.

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- **Ready for 07-02**: Deep link handling and TMA-to-bot navigation can build on the TMA_URL config and utils_tma module
- **Deployment note**: Set `TMA_URL` env var in Railway to enable the buttons (e.g., `https://dealquest.up.railway.app`)
