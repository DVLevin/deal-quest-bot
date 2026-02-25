---
phase: 18-agent-observatory
plan: 01
subsystem: observability
tags: [langfuse, tracing, llm, generation-observations]
dependency-graph:
  requires: []
  provides: [langfuse-sdk, langfuse-config, llm-generation-observations]
  affects: [18-02, 18-03, 18-04]
tech-stack:
  added: [langfuse>=3.12.1]
  patterns: [@observe decorator, update_current_generation, env-var-auto-config]
key-files:
  created:
    - bot/tracing/langfuse_setup.py
  modified:
    - requirements.txt
    - bot/config.py
    - bot/services/llm_router.py
decisions:
  - id: "18-01-01"
    description: "Use update_current_generation (not update_current_observation which does not exist in v3)"
  - id: "18-01-02"
    description: "Input truncated to 500 chars, output to 2000 chars to avoid Langfuse storage explosion from 70K playbook prompts"
  - id: "18-01-03"
    description: "Langfuse env vars set via os.environ in init_langfuse() for SDK auto-configuration (no manual Langfuse() instance)"
  - id: "18-01-04"
    description: "OpenRouter cost_details only included when usage.cost is present in response"
metrics:
  duration: 3m
  completed: 2026-02-06
---

# Phase 18 Plan 01: Langfuse SDK & LLM Generation Observations Summary

**One-liner:** Langfuse SDK installed with env-var auto-config, both LLM providers (Claude + OpenRouter) emit generation observations with model, truncated I/O, token usage, and cost.

## What Was Done

### Task 1: Install Langfuse SDK and create initialization module (af16b14)

- Added `langfuse>=3.12.1` to requirements.txt
- Added 3 Langfuse env vars to `bot/config.py` Settings class:
  - `langfuse_public_key` (empty = disabled)
  - `langfuse_secret_key`
  - `langfuse_base_url` (defaults to `https://cloud.langfuse.com`, swappable for self-hosted)
- Created `bot/tracing/langfuse_setup.py` with:
  - `init_langfuse(settings)` -- sets LANGFUSE_PUBLIC_KEY/SECRET_KEY/BASE_URL env vars for SDK auto-config, returns False if no key
  - `shutdown_langfuse()` -- calls `get_client().flush()` wrapped in try/except

### Task 2: Instrument LLM providers with Langfuse generation observations (8b3f6ef)

- Replaced `from bot.tracing import traced_span` with `from langfuse import get_client, observe`
- **ClaudeProvider.complete():**
  - `@observe(as_type="generation", name="llm:claude")` decorator
  - After successful response, calls `update_current_generation()` with model, truncated input (500 chars), truncated output (2000 chars), usage_details (input/output tokens), metadata (provider: claude)
- **OpenRouterProvider.complete():**
  - `@observe(as_type="generation", name="llm:openrouter")` decorator
  - Same observation pattern plus `cost_details` when OpenRouter provides cost in response
- All observation updates wrapped in try/except -- Langfuse failures never break LLM flow

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| 18-01-01 | Use `update_current_generation()` not `update_current_observation()` | The latter does not exist in Langfuse v3 SDK -- plan had incorrect API reference |
| 18-01-02 | Truncate input to 500 chars, output to 2000 chars | Strategist prompt includes ~70K of playbook text; logging full prompts would blow up Langfuse storage |
| 18-01-03 | Set env vars in init_langfuse() for SDK auto-config | Langfuse v3 reads LANGFUSE_PUBLIC_KEY/SECRET_KEY/BASE_URL automatically; no manual client needed |
| 18-01-04 | Conditionally include cost_details for OpenRouter | Only OpenRouter provides cost directly in API response; Claude cost computed by Langfuse from model/tokens |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan referenced non-existent `update_current_observation()` API**
- **Found during:** Task 2
- **Issue:** Plan instructed to use `get_client().update_current_observation()` which does not exist in Langfuse v3. The SDK has `update_current_generation()` for generation-type observations.
- **Fix:** Used `update_current_generation()` instead, verified signature via introspection
- **Files modified:** bot/services/llm_router.py
- **Commit:** 8b3f6ef

## Verification Results

- `pip show langfuse` -- version 3.13.0
- `python3 -c "from bot.services.llm_router import create_provider; from bot.tracing.langfuse_setup import init_langfuse; print('All imports OK')"` -- passes
- Zero references to `traced_span` in `bot/services/llm_router.py`
- `bot/config.py` has all 3 Langfuse fields (langfuse_public_key, langfuse_secret_key, langfuse_base_url)
- 2 `@observe` decorators in llm_router.py (one per provider)
- 2 `update_current_generation` calls (one per provider)

## Next Phase Readiness

Plans 18-02 (pipeline trace decoration) and 18-04 (startup integration) can now build on:
- The `langfuse` dependency in requirements.txt
- The `init_langfuse()` / `shutdown_langfuse()` functions in `bot/tracing/langfuse_setup.py`
- The `@observe` decorator pattern established on LLM providers
- The Settings fields for Langfuse configuration

Plan 18-03 (per-agent model config) runs in parallel and does not depend on this plan.
