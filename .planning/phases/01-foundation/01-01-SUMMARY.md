---
phase: 01-foundation
plan: 01
subsystem: tracing
tags: [python, contextvars, asyncio, postgresql, insforge, observability]

# Dependency graph
requires:
  - phase: none
    provides: "Fresh start - first phase"
provides:
  - "TraceContext async context manager for pipeline instrumentation"
  - "ContextVar-based trace propagation across async boundaries"
  - "traced_span decorator for agent/LLM call instrumentation"
  - "TraceCollector with batched background flush to InsForge"
  - "TraceRepo for PostgreSQL persistence via InsForgeClient"
  - "SQL migration for pipeline_traces and pipeline_spans tables"
affects: [01-02-handler-instrumentation, 01-03-agent-instrumentation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ContextVar for async context propagation (Python stdlib)"
    - "Async context manager pattern (mirroring ProgressUpdater)"
    - "Decorator pattern for transparent instrumentation"
    - "Batched background flush with asyncio.Event-based stopping"
    - "time.perf_counter() for high-precision duration measurement"
    - "PostgreSQL JSONB for flexible I/O storage"

key-files:
  created:
    - "bot/tracing/__init__.py"
    - "bot/tracing/context.py"
    - "bot/tracing/collector.py"
    - "bot/tracing/models.py"
    - "insforge/migrations/001_pipeline_traces.sql"
  modified:
    - "bot/storage/models.py"
    - "bot/storage/repositories.py"

key-decisions:
  - "Use ContextVar instead of thread-local for async-safe propagation"
  - "Store both datetime.now() (for DB) and time.perf_counter() (for duration) to avoid clock mixing"
  - "Skip FK constraint from spans to traces to avoid insert ordering issues with PostgREST"
  - "Use _safe_serialize helper with 50KB limit to prevent storage explosion from large I/O"
  - "Start with simple tables (no partitioning) - can add reactively when volume increases"

patterns-established:
  - "TraceContext mirrors ProgressUpdater: async with context manager wrapping pipeline calls"
  - "Module-level ContextVar for trace_id propagation, avoiding explicit parameter passing"
  - "@traced_span decorator for zero-code-change instrumentation of agent methods"
  - "Collector singleton pattern (init_collector, get_collector) following service pattern"

# Metrics
duration: 3.4min
completed: 2026-02-02
---

# Phase 01 Plan 01: Tracing Infrastructure & Storage Summary

**ContextVar-based async tracing foundation with TraceContext context manager, batched collector, and PostgreSQL storage via InsForge**

## Performance

- **Duration:** 3.4 min
- **Started:** 2026-02-02T02:04:01Z
- **Completed:** 2026-02-02T02:07:26Z
- **Tasks:** 4/4
- **Files created:** 5
- **Files modified:** 2

## Accomplishments

- TraceContext async context manager captures pipeline execution timing and success/failure status
- ContextVar trace_id propagates correctly across asyncio.gather boundaries (verified by behavioral test)
- traced_span decorator ready for agent instrumentation with automatic I/O capture
- TraceCollector buffers traces/spans and flushes via background task or on stop()
- TraceRepo persists to InsForge following existing repository pattern
- SQL migration ready for InsForge table creation with proper indexes and RLS

## Task Commits

Each task was committed atomically:

1. **Task 1: Create tracing models and TraceContext** - `60235ae` (feat)
2. **Task 2: Create TraceCollector** - `84bbf7a` (feat)
3. **Task 3: Create TraceRepo and storage models** - `ad75c00` (feat)
4. **Task 4: Create SQL migration** - `177cec4` (feat)

## Files Created/Modified

**Created:**
- `bot/tracing/__init__.py` - Public API exports
- `bot/tracing/context.py` - TraceContext, traced_span, ContextVar propagation (276 lines)
- `bot/tracing/collector.py` - TraceCollector with background flush (141 lines)
- `bot/tracing/models.py` - TraceModel and SpanModel Pydantic models (42 lines)
- `insforge/migrations/001_pipeline_traces.sql` - DDL for pipeline_traces and pipeline_spans (49 lines)

**Modified:**
- `bot/storage/models.py` - Added PipelineTraceModel and PipelineSpanModel
- `bot/storage/repositories.py` - Added TraceRepo with create_trace, create_span, get_traces, get_spans_for_trace

## Decisions Made

**ContextVar vs thread-local:**
- Used Python's contextvars module for async-safe trace propagation
- Rationale: threading.local fails in asyncio (context lost across await), contextvars propagates automatically

**Dual timing approach:**
- Store both `datetime.now(timezone.utc)` for DB timestamps AND `time.perf_counter()` for duration calculation
- Rationale: Avoid clock mixing (time.time() can jump with NTP), perf_counter() is monotonic and high-precision

**No FK constraint:**
- Skipped foreign key from pipeline_spans.trace_id → pipeline_traces.trace_id
- Rationale: PostgREST works better without cross-table FKs for insert ordering, and collector may insert spans before trace

**I/O serialization limits:**
- _safe_serialize helper limits total serialized size to 50KB per span
- Rationale: Prevent storage explosion from large LLM prompts/responses (can be 10-50KB each)

**Simple schema initially:**
- No partitioning in initial migration
- Rationale: Partitioning adds complexity, can be added reactively when volume justifies it (research recommends starting simple)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed successfully, all verification tests passed.

## User Setup Required

**Manual step needed before tracing is functional:**

The SQL migration must be executed manually via InsForge dashboard:

1. Log into InsForge dashboard
2. Navigate to SQL editor
3. Execute `insforge/migrations/001_pipeline_traces.sql`
4. Verify tables created: `SELECT * FROM pipeline_traces LIMIT 1;`

**Verification:**
After SQL execution, the tables pipeline_traces and pipeline_spans will exist with proper indexes and RLS policies.

## Next Phase Readiness

**Ready for Plan 01-02 (Handler Instrumentation):**
- TraceContext is ready to wrap handler pipeline calls
- init_collector needs to be called during bot startup (add to bot/main.py)
- collector.start() and collector.stop() lifecycle management needed

**Ready for Plan 01-03 (Agent Instrumentation):**
- @traced_span decorator ready to apply to agent .run() methods
- ContextVar propagation verified across asyncio.gather (parallel agents will inherit trace_id)

**Blockers:** None

**Concerns:** SQL migration is manual step - consider automating in future (e.g., check table existence on startup and log warning if missing)

---
*Phase: 01-foundation*
*Completed: 2026-02-02*
