---
phase: 01-foundation
plan: 03
subsystem: tracing
tags: [python, asyncio, decorator, observability, instrumentation]

# Dependency graph
requires:
  - phase: 01-01
    provides: "TraceContext context manager and traced_span decorator"
provides:
  - "Agent .run() methods instrumented with @traced_span for step-level timing"
  - "LLM provider .complete() methods instrumented with @traced_span for call-level timing"
  - "Automatic I/O capture for agent inputs/outputs and LLM prompts/responses"
  - "Parent-child span relationships via ContextVar span stack"
affects: [01-02-handler-instrumentation, future-observability-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Decorator pattern for transparent agent instrumentation"
    - "ContextVar-based span nesting for parent-child relationships"
    - "Zero-overhead instrumentation when not in traced context"

key-files:
  created: []
  modified:
    - "bot/agents/trainer.py"
    - "bot/agents/strategist.py"
    - "bot/agents/memory.py"
    - "bot/services/llm_router.py"

key-decisions:
  - "Decorator-only changes - no method body modifications for minimal risk"
  - "Span naming convention: agent:{name} for agents, llm:{provider} for LLM calls"
  - "LLM spans nest under agent spans automatically via _span_stack ContextVar"

patterns-established:
  - "Agent instrumentation: @traced_span decorator above .run() method"
  - "LLM provider instrumentation: @traced_span on .complete() methods only"
  - "No instrumentation on helper methods (validate_key, close, web_research_call)"

# Metrics
duration: 1.9min
completed: 2026-02-02
---

# Phase 01 Plan 03: Agent & LLM Instrumentation Summary

**Step-level tracing for agent .run() and LLM .complete() methods using @traced_span decorator with automatic I/O capture**

## Performance

- **Duration:** 1.9 min
- **Started:** 2026-02-02T02:10:03Z
- **Completed:** 2026-02-02T02:11:57Z
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments

- All three agent .run() methods decorated with @traced_span for automatic timing and I/O capture
- Both LLM provider .complete() methods decorated with @traced_span for call-level observability
- Zero-overhead instrumentation - decorators are no-op when not in TraceContext
- Automatic parent-child span nesting via ContextVar span stack
- Agent and LLM spans will appear in pipeline_spans table when handlers wrap pipeline calls with TraceContext

## Task Commits

Each task was committed atomically:

1. **Task 1: Instrument agent .run() methods** - `66a6121` (feat)
2. **Task 2: Instrument LLM provider .complete() methods** - `f24a2b2` (feat)

## Files Created/Modified

**Modified:**
- `bot/agents/trainer.py` - Added @traced_span("agent:trainer") decorator to .run() method
- `bot/agents/strategist.py` - Added @traced_span("agent:strategist") decorator to .run() method
- `bot/agents/memory.py` - Added @traced_span("agent:memory") decorator to .run() method
- `bot/services/llm_router.py` - Added @traced_span("llm:claude") and @traced_span("llm:openrouter") decorators to .complete() methods

## Decisions Made

**Decorator-only approach:**
- Applied decorators without modifying method bodies
- Rationale: Minimal risk of breaking existing logic, easy to verify, follows plan specification

**Span naming convention:**
- Agents: `agent:{agent_name}` (e.g., "agent:trainer", "agent:strategist", "agent:memory")
- LLM providers: `llm:{provider_name}` (e.g., "llm:claude", "llm:openrouter")
- Rationale: Clear categorization for filtering and analysis in TMA

**Selective instrumentation:**
- Instrumented only .run() and .complete() methods
- Did NOT instrument validate_key(), close(), or web_research_call()
- Rationale: Only core execution paths need tracing, helper methods are not part of pipeline flow

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed successfully, all verification tests passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 01-02 (Handler Instrumentation):**
- Agent and LLM instrumentation complete
- When handlers wrap pipeline calls with TraceContext, agent and LLM spans will be recorded automatically
- Span hierarchy will be: TraceContext (pipeline) → agent:trainer span → llm:openrouter span (nested parent-child)

**Integration point:**
- Plan 01-02 will add TraceContext wrapping in handlers (main.py or handler files)
- This plan's instrumentation is passive - waits for TraceContext to activate it

**Blockers:** None

**Concerns:** None - instrumentation is transparent and has zero overhead when not in traced context

---
*Phase: 01-foundation*
*Completed: 2026-02-02*
