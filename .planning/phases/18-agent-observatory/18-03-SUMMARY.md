---
phase: 18-agent-observatory
plan: 03
subsystem: model-configuration
tags: [per-agent-model, openrouter, pipeline, ttl-cache, admin-override]
dependency-graph:
  requires: []
  provides: [agent-model-config-table, model-config-service, per-agent-llm-resolution]
  affects: [18-02, 18-04]
tech-stack:
  added: []
  patterns: [ttl-cache-60s, provider-instance-caching, llm-property-backward-compat, save-restore-swap]
key-files:
  created:
    - insforge/migrations/005_agent_model_config.sql
    - bot/services/model_config.py
  modified:
    - bot/storage/models.py
    - bot/storage/repositories.py
    - bot/pipeline/context.py
    - bot/pipeline/runner.py
    - bot/main.py
decisions:
  - id: "18-03-01"
    description: "Admin overrides always use shared OpenRouter API key (no provider column needed)"
  - id: "18-03-02"
    description: "60-second TTL cache for model config; provider instances cached by model_id"
  - id: "18-03-03"
    description: "PipelineContext.llm property + setter for backward compat; default_llm as backing store"
  - id: "18-03-04"
    description: "Save-restore pattern in PipelineRunner for LLM swap (original_llm / finally restore)"
  - id: "18-03-05"
    description: "Parallel agents pre-resolve overrides before asyncio.gather to avoid race conditions"
metrics:
  duration: 4m
  completed: 2026-02-06
---

# Phase 18 Plan 03: Per-Agent Model Configuration Summary

**One-liner:** Database-backed per-agent model overrides with 60s TTL cache, PipelineContext/Runner refactored for transparent LLM swap via save-restore pattern.

## What Was Done

### Task 1: Database migration, model, repository, and ModelConfigService (869a790)

- Created `insforge/migrations/005_agent_model_config.sql` with:
  - `agent_model_config` table: id, agent_name (UNIQUE), model_id, is_active, set_by, created_at, updated_at
  - Partial index on agent_name WHERE is_active = true for fast lookup
- Added `AgentModelConfigModel` to `bot/storage/models.py` (Pydantic model)
- Added `AgentModelConfigRepo` to `bot/storage/repositories.py` with:
  - `get_all_active()` -- fetches all active overrides (used by cache refresh)
  - `upsert(agent_name, model_id, set_by)` -- creates or updates agent config
  - `deactivate(agent_name)` -- soft-deletes by setting is_active=false
- Created `bot/services/model_config.py` with `ModelConfigService`:
  - 60-second TTL in-memory cache (avoids DB queries on every agent call)
  - `get_override(agent_name)` -- returns config dict or None
  - `get_provider_for_agent(agent_name)` -- returns cached OpenRouterProvider or None
  - Provider instances cached by model_id (reused across agents sharing same model)
  - `close()` -- cleans up cached provider httpx clients

### Task 2: Refactor PipelineContext and PipelineRunner (4feca3a)

- **PipelineContext refactored:**
  - `__init__` now accepts optional `model_config: ModelConfigService | None = None`
  - Internal storage renamed to `self.default_llm`
  - `llm` is now a property/setter pair for backward compatibility (agents still use `ctx.llm.complete()`)
  - New `async get_llm_for_agent(agent_name)` method queries ModelConfigService for override
  - TYPE_CHECKING import for ModelConfigService to avoid circular imports
- **PipelineRunner refactored:**
  - `_run_step()`: saves original_llm, resolves override via `ctx.get_llm_for_agent()`, swaps `ctx.default_llm`, restores in finally block
  - `_run_parallel()`: pre-resolves all agent overrides before asyncio.gather, each task saves/restores independently
  - `_run_background()`: same save-restore pattern inside the background coroutine
  - Added `LLMProvider` import for type annotation in parallel resolution dict
- **main.py wiring:**
  - `AgentModelConfigRepo` created alongside other repos
  - `ModelConfigService` initialized with shared OpenRouter key (or empty string if no key)
  - Injected into `dp.workflow_data` as `model_config_service`
  - `model_config_service.close()` called in finally block before insforge.close()

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| 18-03-01 | Admin overrides always use shared OpenRouter key | Avoids cross-provider complications (Claude vs OpenRouter key formats, rate limits) |
| 18-03-02 | 60s TTL cache with provider instance caching | Balances freshness (admin changes take effect within 1 minute) with performance (no DB query per agent call) |
| 18-03-03 | llm property/setter for backward compat | All 4 agents use `pipeline_ctx.llm.complete()` -- changing them all is out of scope and fragile |
| 18-03-04 | Save-restore pattern in PipelineRunner | Simpler than passing LLM as agent.run() parameter (would require changing BaseAgent interface) |
| 18-03-05 | Pre-resolve overrides before asyncio.gather | Prevents potential async race conditions if multiple tasks query the cache simultaneously |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- `bot/storage/models.py`: AgentModelConfigModel added, syntax valid
- `bot/storage/repositories.py`: AgentModelConfigRepo import and class added, import verified
- `bot/services/model_config.py`: ModelConfigService created, syntax valid via AST parse
- `bot/pipeline/context.py`: get_llm_for_agent method present, llm property/setter for backward compat
- `bot/pipeline/runner.py`: get_llm_for_agent called in _run_step, _run_parallel, _run_background
- `bot/main.py`: model_config_service created, injected into workflow_data, closed in finally
- `insforge/migrations/005_agent_model_config.sql`: valid SQL with CREATE TABLE and partial index
- Note: Full import verification blocked by langfuse dependency (plan 18-01) not installed locally; all files pass AST syntax validation

## Next Phase Readiness

Plan 18-02 (pipeline tracing) can now:
- Pass `model_config_service` to PipelineContext constructors in handler files
- The `model_config=None` default means existing code continues working without changes

Plan 18-04 (startup integration) can:
- Reference `model_config_service` from `dp.workflow_data`
- Add admin commands for managing agent model configs via `AgentModelConfigRepo`

Pending migration: `insforge/migrations/005_agent_model_config.sql` needs to be run on InsForge database.
