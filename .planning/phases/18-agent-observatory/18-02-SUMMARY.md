---
phase: 18-agent-observatory
plan: 02
subsystem: observability
tags: [langfuse, tracing, observe, pipeline-traces, model-config-wiring]
dependency-graph:
  requires: [18-01, 18-03]
  provides: [full-langfuse-tracing, handler-observe-wrappers, model-config-wiring]
  affects: [18-04]
tech-stack:
  added: []
  patterns: [@observe wrapper functions, hierarchical trace nesting, model_config DI passthrough]
key-files:
  created: []
  modified:
    - bot/tracing/__init__.py
    - bot/agents/strategist.py
    - bot/agents/trainer.py
    - bot/agents/memory.py
    - bot/agents/extraction.py
    - bot/agents/reanalysis_strategist.py
    - bot/handlers/support.py
    - bot/handlers/learn.py
    - bot/handlers/train.py
    - bot/handlers/comment.py
    - bot/handlers/context_input.py
    - bot/main.py
decisions:
  - id: 18-02-01
    decision: "@observe wrapper functions placed at module level (not inline lambdas)"
    reason: "Langfuse @observe must decorate a named function for proper trace naming"
  - id: 18-02-02
    decision: "ProgressUpdater kept OUTSIDE @observe wrappers"
    reason: "Telegram message editing should not be nested inside Langfuse trace spans"
  - id: 18-02-03
    decision: "SimplePipelineCtx does not get model_config (documented limitation)"
    reason: "Re-analysis bypasses PipelineRunner so per-agent overrides would require separate handling; acceptable for power-user feature"
  - id: 18-02-04
    decision: "model_config_service=None default on all handler signatures"
    reason: "Graceful degradation if service not available; works with aiogram DI"
metrics:
  duration: 7m
  completed: 2026-02-06
---

# Phase 18 Plan 02: Langfuse Handler Integration & Model Config Wiring Summary

**One-liner:** Replaced all custom tracing (TraceContext, @traced_span) with Langfuse @observe decorators across 5 agents and 6 pipeline entry points, wired Langfuse lifecycle in main.py, and passed model_config_service to PipelineContext in all handlers.

## What Was Done

### Task 1: Replace @traced_span with @observe on all agents and update tracing module

Updated `bot/tracing/__init__.py` to re-export `observe`, `init_langfuse`, and `shutdown_langfuse` from the Langfuse SDK and setup module. Removed `traced_span` from `__all__` (deprecated).

Replaced `@traced_span("agent:X")` with `@observe(name="agent:X")` on the `run()` method of all 5 agents:
- `strategist.py` -- `@observe(name="agent:strategist")`
- `trainer.py` -- `@observe(name="agent:trainer")`
- `memory.py` -- `@observe(name="agent:memory")`
- `extraction.py` -- `@observe(name="agent:extraction")`
- `reanalysis_strategist.py` -- `@observe(name="agent:reanalysis_strategist")`

Agents are spans (not generations) -- only LLM calls use `as_type="generation"`.

### Task 2: Replace TraceContext in handlers, pass model_config_service, wire Langfuse lifecycle

Created `@observe`-decorated wrapper functions for each pipeline entry point:
- `_traced_support_run` (pipeline:support) in support.py
- `_traced_support_regen_run` (pipeline:support_regen) in support.py
- `_traced_learn_run` (pipeline:learn) in learn.py
- `_traced_train_run` (pipeline:train) in train.py
- `_traced_comment_generate` (pipeline:comment) in comment.py
- `_traced_reanalysis_run` (pipeline:reanalysis) in context_input.py

Each wrapper sets Langfuse trace-level metadata (user_id, session_id, pipeline name) via `get_client().update_current_observation()`, wrapped in try/except to never break pipelines for observability.

Passed `model_config_service` through the handler chain:
- Added `model_config_service=None` parameter to all handler functions that construct PipelineContext
- Added `model_config=model_config_service` to all PipelineContext() constructors
- Threaded through from outer handlers (photo, voice, forward, text) to inner `_run_*` functions

Wired Langfuse lifecycle in `main.py`:
- `init_langfuse(cfg)` called after `setup_logging()` at startup
- `shutdown_langfuse()` called in `finally` block before InsForge close

### Hierarchical Trace Structure

The `@observe` decorator automatically creates parent-child relationships via Python's async context propagation:

```
trace (pipeline:support)
  -> span (agent:extraction)
    -> generation (llm:openrouter)
  -> span (agent:strategist)
    -> generation (llm:openrouter)
  -> span (agent:memory)
    -> generation (llm:openrouter)
```

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| 18-02-01 | @observe wrapper functions at module level | Langfuse needs named functions for trace naming |
| 18-02-02 | ProgressUpdater outside @observe wrappers | Telegram message editing not part of trace span |
| 18-02-03 | SimplePipelineCtx skips model_config | Re-analysis bypasses PipelineRunner; documented limitation |
| 18-02-04 | model_config_service=None default on handlers | Graceful DI degradation via aiogram workflow_data |

## Commits

| Hash | Message |
|------|---------|
| f7c776d | feat(18-02): replace @traced_span with @observe on all agents and update tracing module |
| c29938f | feat(18-02): replace TraceContext with @observe in handlers, wire Langfuse lifecycle, pass model_config_service |

## Next Phase Readiness

Plan 18-04 (TMA Admin Observatory UI) can proceed. All backend instrumentation is complete:
- Every pipeline run produces Langfuse traces with hierarchical spans
- Per-agent model overrides are wired through all pipeline handlers
- Comment and re-analysis flows are also instrumented
- Langfuse initializes on startup and flushes on shutdown
