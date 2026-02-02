---
phase: 01-foundation
plan: 02
subsystem: tracing
tags: [python, aiogram, telegram, dependency-injection, lifecycle, observability]

# Dependency graph
requires:
  - phase: 01-01
    provides: "TraceContext, TraceCollector, TraceRepo infrastructure"
provides:
  - "End-to-end tracing integration in bot lifecycle"
  - "TraceCollector started at bot startup, stopped at shutdown"
  - "All pipeline executions wrapped with TraceContext"
  - "trace_repo available via DI for admin commands"
affects: [02-admin-commands, 02-trace-analysis]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Context manager wrapping pattern (TraceContext wraps ProgressUpdater)"
    - "Lifecycle management (start async background task, graceful shutdown)"
    - "DI wiring via workflow_data dictionary"

key-files:
  created: []
  modified:
    - "bot/main.py"
    - "bot/handlers/learn.py"
    - "bot/handlers/train.py"
    - "bot/handlers/support.py"

key-decisions:
  - "TraceContext goes outside ProgressUpdater (trace the full execution including progress)"
  - "Collector starts after pipelines load but before polling starts"
  - "Collector stops in finally block before InsForge client closes (flush buffer)"
  - "Transcription blocks NOT wrapped (not pipeline calls, just AssemblyAI API)"

patterns-established:
  - "TraceContext(pipeline_name, telegram_id, user_id) at every runner.run() call"
  - "Outer TraceContext, inner ProgressUpdater pattern"
  - "trace_repo injected via workflow_data for future admin handler access"

# Metrics
duration: 1.8min
completed: 2026-02-02
---

# Phase 01 Plan 02: Handler Instrumentation Summary

**TraceCollector lifecycle wired into bot startup/shutdown, all pipeline handlers wrapped with TraceContext for end-to-end trace generation**

## Performance

- **Duration:** 1.8 min
- **Started:** 2026-02-02T02:10:13Z
- **Completed:** 2026-02-02T02:12:02Z
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments

- TraceCollector initialized during bot startup and gracefully stopped during shutdown
- TraceRepo available via DI for Phase 2 admin commands
- All learn, train, and support pipeline executions now generate trace records
- TraceContext correctly wraps outside ProgressUpdater (full execution traced)
- Transcription blocks correctly left unwrapped (not pipeline calls)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire TraceCollector lifecycle and TraceRepo DI into main.py** - `df9be21` (feat)
2. **Task 2: Instrument learn, train, and support handlers with TraceContext** - `80c5d17` (feat)

## Files Created/Modified

**Modified:**
- `bot/main.py` - Added TraceRepo init, TraceCollector lifecycle (start/stop), trace_repo DI wiring
- `bot/handlers/learn.py` - Wrapped learn pipeline runner.run() with TraceContext
- `bot/handlers/train.py` - Wrapped train pipeline runner.run() with TraceContext
- `bot/handlers/support.py` - Wrapped support and support_regen pipeline runner.run() with TraceContext

## Decisions Made

**TraceContext placement:**
- Wraps OUTSIDE ProgressUpdater (outer context manager)
- Rationale: Trace should capture the full pipeline execution including progress updates, not just the runner.run() call

**Collector lifecycle timing:**
- Start after pipeline loading, before polling starts
- Stop in finally block before InsForge client closes
- Rationale: Ensures all traces are flushed before shutdown, prevents data loss

**Transcription blocks excluded:**
- ProgressUpdater(Phase.TRANSCRIPTION) blocks NOT wrapped with TraceContext
- Rationale: These are AssemblyAI API calls, not pipeline executions - they don't involve agents or LLM calls that need span tracing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed successfully, all verification tests passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 01-03 (Agent Instrumentation):**
- TraceContext is working in handlers and propagating trace_id via ContextVar
- @traced_span decorator can be applied to agent .run() methods
- Collector is buffering and flushing spans

**Ready for Phase 2 (Operations):**
- trace_repo is available via DI for admin commands
- Traces and spans are being persisted to InsForge (after SQL migration is executed)
- Full trace→span relationship established

**Blockers:** None

**Concerns:** SQL migration from 01-01 must be executed manually before traces persist (table creation is one-time manual step via InsForge dashboard)

---
*Phase: 01-foundation*
*Completed: 2026-02-02*
