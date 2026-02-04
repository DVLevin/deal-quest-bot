---
phase: 11-performance-and-reliability
plan: 02
subsystem: infra
tags: [httpx, asyncio, retry, background-tasks, insforge]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "InsForge HTTP client and bot main entry point"
provides:
  - "InsForge retry with exponential backoff on transient failures"
  - "Safe background task management with reference tracking and error logging"
  - "KB caching verification (already implemented)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Exponential backoff retry for HTTP transient failures"
    - "Module-level task set with done_callback for fire-and-forget safety"

key-files:
  created:
    - "bot/task_utils.py"
  modified:
    - "bot/storage/insforge_client.py"
    - "bot/main.py"
    - "bot/pipeline/runner.py"
    - "bot/handlers/support.py"

key-decisions:
  - "No external retry library (tenacity/httpx-retries) — 20 lines of hand-rolled retry is simpler for one call site"
  - "Shared task_utils.py module over per-file helpers — 3 call sites across 3 files justifies shared utility"
  - "upload_file and rpc excluded from retry — separate client instances, binary uploads shouldn't auto-retry"

patterns-established:
  - "create_background_task() for all fire-and-forget asyncio tasks"
  - "_request_with_retry() for InsForge HTTP calls"

# Metrics
duration: 4min
completed: 2026-02-05
---

# Phase 11 Plan 02: Bot Reliability Summary

**InsForge HTTP retry with exponential backoff + safe background task management with GC protection and error logging**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-05T21:28:00Z
- **Completed:** 2026-02-05T21:32:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- InsForge HTTP client retries transient failures (429, 500, 502, 503) up to 3 times with exponential backoff (0.5s, 1s, 2s)
- Non-retryable errors (400, 401, 403, 404, 406, 409) propagate immediately without retry
- All 4 bare `asyncio.create_task()` calls replaced with `create_background_task()` helper
- Background tasks have descriptive names, module-level reference tracking, and ERROR-level failure logging
- PERF-V11-02 verified: KB loaded once at startup via `knowledge.load()`, cached instance reused across all handlers

## Task Commits

Each task was committed atomically:

1. **Task 1: Add retry with exponential backoff** - `2fa4c67` (perf)
2. **Task 2: Protect background tasks** - `af37bd9` (perf)

## Files Created/Modified
- `bot/task_utils.py` - New: create_background_task helper with reference set and done callback
- `bot/storage/insforge_client.py` - _request_with_retry method, retry constants, 5 methods updated
- `bot/main.py` - 2 create_task calls replaced (followup_scheduler, scenario_generation_loop)
- `bot/pipeline/runner.py` - 1 create_task call replaced (background agent step)
- `bot/handlers/support.py` - 1 create_task call replaced (lead enrichment)

## Decisions Made
- [11-02]: No external retry library — 20 lines of hand-rolled retry avoids dependency for single use site
- [11-02]: Shared bot/task_utils.py over per-file helpers — 3 consumers justify shared module
- [11-02]: upload_file and rpc excluded from retry — separate one-shot clients, binary uploads shouldn't auto-retry
- [11-02]: PERF-V11-02 (KB caching) confirmed as already implemented — no code changes needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Bot HTTP layer is resilient to transient InsForge failures
- Background tasks are properly managed (no GC risk, errors are logged)
- Phase 11 complete — all v1.1 requirements addressed

---
*Phase: 11-performance-and-reliability*
*Completed: 2026-02-05*
