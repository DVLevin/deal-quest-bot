# Phase 18: Agent Observatory & Model Configuration - Research

**Researched:** 2026-02-06
**Domain:** LLM observability (Langfuse), per-agent model configuration, OpenRouter model API
**Confidence:** HIGH

## Summary

This phase replaces the existing custom tracing system (TraceContext + traced_span + TraceCollector -> InsForge) with Langfuse for rich LLM observability, and adds per-agent model configuration via a new database table + TMA admin UI.

The Langfuse Python SDK v3.12.1 provides decorator-based and context-manager-based instrumentation that maps cleanly onto the existing architecture. Since the bot uses raw httpx calls to Claude API and OpenRouter (not LangChain/OpenAI SDK), instrumentation requires manual `generation` observations with explicit model, input, output, and usage_details fields. The good news: both Claude API and OpenRouter return token counts in their response `usage` objects, and OpenRouter additionally returns a `cost` field.

For per-agent model configuration, a new `agent_model_config` database table stores admin overrides. The PipelineRunner needs refactoring so each agent can get its own LLM provider (currently all agents in a pipeline share one provider via PipelineContext.llm). OpenRouter provides a GET `/api/v1/models` endpoint returning 400+ models with full metadata including pricing, making a model browser straightforward.

**Primary recommendation:** Replace the custom tracing system with Langfuse's `@observe()` decorator + manual `generation` observations in the LLM providers. Keep the existing InsForge pipeline_traces/pipeline_spans tables as a lightweight backup but stop actively writing to them once Langfuse is verified. Store per-agent model overrides in a new `agent_model_config` table, cached in-memory with a 60-second TTL.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| langfuse | >=3.12.1 | LLM observability, tracing, cost tracking | Official SDK, decorator-based, async-friendly, OpenTelemetry-based since v3 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query | ^5.90.0 | TMA admin data fetching/caching | Already in project, use for model config CRUD |
| @insforge/sdk | latest | TMA database access for model config | Already in project, use for agent_model_config table |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Langfuse | OpenTelemetry + Jaeger | More general-purpose but lacks LLM-specific features (generation type, token/cost tracking, prompt display) |
| Langfuse | Custom InsForge tables (current) | Already exists but lacks: UI dashboard, prompt viewer, cost calculation, model filtering |
| Per-agent DB config | YAML config files | DB enables runtime changes without restart/deploy, which is a locked requirement |

**Installation:**
```bash
pip install langfuse>=3.12.1
```

No new TMA packages needed -- existing React Query + InsForge SDK suffice.

## Architecture Patterns

### Recommended Changes to Existing Architecture

```
bot/
├── tracing/                    # REPLACE internals, keep module interface
│   ├── __init__.py             # Export langfuse_trace (replaces TraceContext)
│   ├── langfuse_setup.py       # NEW: Langfuse client init + config
│   └── [context.py]            # DEPRECATED (keep for reference, remove later)
│   └── [collector.py]          # DEPRECATED (Langfuse handles buffering)
│   └── [models.py]             # DEPRECATED (Langfuse has its own models)
├── services/
│   ├── llm_router.py           # MODIFY: add Langfuse generation observations
│   └── model_config.py         # NEW: per-agent model config service
├── storage/
│   └── repositories.py         # ADD: AgentModelConfigRepo
├── pipeline/
│   ├── context.py              # MODIFY: support per-agent LLM providers
│   └── runner.py               # MODIFY: resolve agent-specific model before run
packages/webapp/src/
├── features/admin/
│   ├── components/
│   │   ├── ModelConfigPanel.tsx # NEW: per-agent model configuration UI
│   │   └── ModelBrowser.tsx     # NEW: OpenRouter model selector
│   └── hooks/
│       ├── useModelConfig.ts    # NEW: CRUD for agent_model_config
│       └── useOpenRouterModels.ts # NEW: fetch /api/v1/models
```

### Pattern 1: Langfuse Decorator Integration

**What:** Replace `@traced_span("agent:X")` with `@observe()`, and wrap LLM calls in `start_as_current_observation(as_type="generation")`.

**When to use:** Every agent `.run()` and every LLM `.complete()`.

**Example:**
```python
# Source: https://langfuse.com/docs/observability/sdk/python/decorators
from langfuse import observe, get_client

class StrategistAgent(BaseAgent):
    name = "strategist"

    @observe(name="agent:strategist")  # Replaces @traced_span
    async def run(self, input_data: AgentInput, pipeline_ctx: PipelineContext) -> AgentOutput:
        # ... build system_prompt ...
        result = await pipeline_ctx.get_llm_for_agent(self.name).complete(
            system_prompt, user_message, image_b64=pipeline_ctx.image_b64
        )
        return AgentOutput(success=True, data=result)
```

### Pattern 2: Manual Generation Observations for Raw HTTP LLM Calls

**What:** Wrap each httpx LLM call in a Langfuse generation context manager to capture model, input, output, tokens, and cost.

**When to use:** In `ClaudeProvider.complete()` and `OpenRouterProvider.complete()`.

**Example:**
```python
# Source: https://langfuse.com/docs/observability/sdk/instrumentation
from langfuse import get_client

class OpenRouterProvider(LLMProvider):
    @observe(as_type="generation", name="llm:openrouter")
    async def complete(self, system_prompt: str, user_message: str, *, image_b64: str | None = None) -> dict:
        langfuse = get_client()

        # Make HTTP request
        resp = await self._client.post("/chat/completions", json={...})
        data = resp.json()

        # Extract token usage from OpenRouter response
        usage = data.get("usage", {})
        cost_value = usage.get("cost")  # OpenRouter provides cost directly

        # Update the current generation with LLM-specific data
        langfuse.update_current_generation(
            model=self.model,
            input={"system": system_prompt, "user": user_message},
            output=data["choices"][0]["message"]["content"],
            usage_details={
                "input_tokens": usage.get("prompt_tokens", 0),
                "output_tokens": usage.get("completion_tokens", 0),
            },
            cost_details={"total": cost_value} if cost_value else None,
            metadata={"provider": "openrouter"},
        )

        return _extract_json(text)
```

### Pattern 3: Trace-Level Context with propagate_attributes

**What:** Set user_id, session_id, and trace name at the pipeline entry point so all nested observations inherit context.

**When to use:** In handlers where TraceContext is currently used.

**Example:**
```python
# Source: https://langfuse.com/docs/observability/sdk/python/decorators
from langfuse import propagate_attributes, observe

@observe(name="pipeline:support")
async def _run_support_pipeline(...):
    with propagate_attributes(
        user_id=str(tg_id),
        session_id=f"support_{tg_id}_{int(time.time())}",
        metadata={"pipeline": pipeline_name, "user_provider": user.provider},
    ):
        await runner.run(pipeline_config, ctx)
```

### Pattern 4: Per-Agent Model Resolution

**What:** Before running an agent, check the `agent_model_config` table for an override. If present, create a separate LLM provider for that agent. Otherwise, use the user's default.

**When to use:** In `PipelineRunner._run_step()` or via `PipelineContext`.

**Example:**
```python
class PipelineContext:
    def __init__(self, *, llm: LLMProvider, model_config_service: ModelConfigService, ...):
        self.default_llm = llm
        self._model_config = model_config_service

    async def get_llm_for_agent(self, agent_name: str) -> LLMProvider:
        override = await self._model_config.get_override(agent_name)
        if override:
            return create_provider("openrouter", self._shared_api_key, model=override.model_id)
        return self.default_llm
```

### Anti-Patterns to Avoid
- **Dual-writing to Langfuse AND InsForge traces simultaneously long-term:** Keep InsForge traces for a transition period only, then deprecate. Running two observability systems permanently adds complexity for no value.
- **Blocking on Langfuse calls:** The Langfuse SDK is async and buffers in the background. Never await Langfuse flush in the hot path.
- **Creating a new Langfuse client per request:** Use `get_client()` singleton. The SDK manages connection pooling and batching internally.
- **Caching model config forever:** Agent model overrides should have a short TTL (60s) so admin changes take effect quickly without restart.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LLM observability dashboard | Custom TMA trace viewer | Langfuse Cloud dashboard | Full-featured: filtering, search, drill-down, cost analysis, prompt comparison -- would take weeks to build |
| Token counting | Custom tokenizer integration | Langfuse's built-in inference + ingested usage | Langfuse auto-calculates costs from model definitions; OpenRouter provides token counts in responses |
| Trace batching & async flush | Custom buffer + background task (current TraceCollector) | Langfuse SDK internal buffering | SDK already implements batching, retry, and async flush -- the current TraceCollector reimplements this |
| Model pricing database | Custom pricing table per model | Langfuse's built-in model definitions + OpenRouter cost field | OpenRouter responses include `cost` directly; Langfuse has built-in pricing for Anthropic/OpenAI |
| OpenRouter model catalog | Manually maintained model list | OpenRouter GET /api/v1/models endpoint | Returns 400+ models with pricing, context_length, capabilities -- always up to date |

**Key insight:** The entire custom tracing system (TraceCollector, TraceContext, traced_span, InsForge pipeline_traces/pipeline_spans) was a good v1 approach but is now superseded by Langfuse, which provides a professional dashboard, token tracking, cost analysis, and prompt comparison out of the box.

## Common Pitfalls

### Pitfall 1: Langfuse Decorator on Async Methods Doesn't Auto-capture Generation Data
**What goes wrong:** Using `@observe(as_type="generation")` on a method but not calling `update_current_generation()` with model/usage data. The trace shows up but without token counts or costs.
**Why it happens:** Langfuse can only auto-capture from native OpenAI/Anthropic SDK calls. Raw httpx calls need manual updates.
**How to avoid:** Always call `langfuse.update_current_generation(model=..., usage_details=..., ...)` after the HTTP response is received.
**Warning signs:** Traces in Langfuse dashboard show "0 tokens" or no model name.

### Pitfall 2: Background Agents Lose Trace Context
**What goes wrong:** Background agents (memory agent) started via `create_background_task()` lose the Langfuse context because they run in a separate asyncio task.
**Why it happens:** Langfuse uses OpenTelemetry context propagation which doesn't automatically cross asyncio task boundaries.
**How to avoid:** Either (a) pass the trace context explicitly to background tasks, or (b) accept that background agent spans appear as separate traces and link them via metadata.
**Warning signs:** Background agent spans missing from parent trace.

### Pitfall 3: Langfuse Hobby Tier Limits
**What goes wrong:** Hitting the 50,000 units/month limit (units = traces + observations + scores). With 5 pipelines x ~4 observations each, that's ~20 units per pipeline run, allowing ~2,500 runs/month.
**Why it happens:** Each trace, span, and generation counts as a separate unit.
**How to avoid:** Monitor usage. For a small team this should be fine. If approaching limits, reduce observation granularity (skip memory agent tracing) or upgrade to Core ($29/month for 100k units).
**Warning signs:** Langfuse dashboard shows "nearing limit" warnings.

### Pitfall 4: Per-Agent Model Config Creates N Providers Per Pipeline
**What goes wrong:** If 3 agents have overrides, 3 separate httpx clients are created per pipeline run, each with its own connection pool.
**Why it happens:** Each model override requires a different provider instance.
**How to avoid:** Cache provider instances by (provider_type, api_key, model) tuple. Reuse across pipeline runs. Close idle providers periodically.
**Warning signs:** Memory growth, connection pool exhaustion.

### Pitfall 5: Comment Handler is Not Pipeline-Based
**What goes wrong:** The `/comment` handler calls `llm.complete()` directly (not through PipelineRunner), so it's easy to forget instrumenting it.
**Why it happens:** It was built as a simpler flow without the full pipeline system.
**How to avoid:** Either (a) wrap the comment handler's LLM call with `@observe()` explicitly, or (b) refactor it into a pipeline. Option (a) is simpler.
**Warning signs:** Comment traces missing from Langfuse.

### Pitfall 6: System Prompts Can Be Very Large
**What goes wrong:** The strategist prompt includes the full playbook (~70K tokens context stuffing). Logging the full system_prompt as generation input could hit Langfuse's data limits or cause slow dashboard loading.
**Why it happens:** Knowledge base and casebook text are injected into prompts.
**How to avoid:** Log a truncated version or use `capture_input=False` on heavy agents and log a hash/reference instead. Alternatively, log the raw prompt template and only the variable parts separately.
**Warning signs:** Langfuse dashboard loading slowly, data storage growing fast.

## Code Examples

### Langfuse Client Initialization
```python
# bot/tracing/langfuse_setup.py
# Source: https://langfuse.com/docs/observability/sdk/python/setup
import os
from langfuse import Langfuse

def init_langfuse() -> None:
    """Initialize Langfuse client via environment variables.

    Required env vars:
    - LANGFUSE_PUBLIC_KEY
    - LANGFUSE_SECRET_KEY
    - LANGFUSE_BASE_URL (default: https://cloud.langfuse.com)

    To switch to self-hosted, change LANGFUSE_BASE_URL only.
    """
    # Langfuse reads from env vars automatically when using get_client()
    # Just verify they exist at startup
    assert os.getenv("LANGFUSE_PUBLIC_KEY"), "LANGFUSE_PUBLIC_KEY not set"
    assert os.getenv("LANGFUSE_SECRET_KEY"), "LANGFUSE_SECRET_KEY not set"
    # LANGFUSE_BASE_URL defaults to EU cloud if not set
```

### Database Table for Agent Model Config
```sql
-- InsForge migration
CREATE TABLE agent_model_config (
    id SERIAL PRIMARY KEY,
    agent_name TEXT NOT NULL UNIQUE,  -- e.g., "strategist", "extraction", "trainer"
    provider TEXT NOT NULL DEFAULT 'openrouter',  -- "openrouter" or "claude"
    model_id TEXT NOT NULL,  -- e.g., "anthropic/claude-sonnet-4", "openai/gpt-4o-mini"
    is_active BOOLEAN NOT NULL DEFAULT true,
    set_by TEXT,  -- admin username who set this
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX idx_agent_model_config_agent ON agent_model_config(agent_name) WHERE is_active = true;
```

### Model Config Service with Caching
```python
# bot/services/model_config.py
import time
from typing import Any

class ModelConfigService:
    """Manages per-agent model overrides with in-memory caching."""

    CACHE_TTL = 60  # seconds

    def __init__(self, insforge_client):
        self._client = insforge_client
        self._cache: dict[str, Any] = {}
        self._cache_time: float = 0

    async def get_override(self, agent_name: str) -> dict | None:
        await self._refresh_if_stale()
        return self._cache.get(agent_name)

    async def get_all(self) -> dict[str, Any]:
        await self._refresh_if_stale()
        return dict(self._cache)

    async def _refresh_if_stale(self):
        if time.time() - self._cache_time < self.CACHE_TTL:
            return
        rows = await self._client.query(
            "agent_model_config",
            filters={"is_active": True}
        )
        self._cache = {
            r["agent_name"]: r for r in (rows or [])
        }
        self._cache_time = time.time()
```

### OpenRouter Models Fetch (TMA)
```typescript
// Source: https://openrouter.ai/docs/api/api-reference/models/get-models
interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number | null;
  pricing: {
    prompt: string;     // price per token (string number)
    completion: string;
  };
  architecture: {
    modality: string;
    tokenizer: string;
    instruct_type: string | null;
  };
}

async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  const resp = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  const data = await resp.json();
  return data.data;
}
```

### Claude API Response Token Extraction
```python
# Already in ClaudeProvider.complete() -- response structure:
# {
#   "usage": {"input_tokens": 2095, "output_tokens": 503},
#   "model": "claude-sonnet-4-20250514",
#   "content": [{"type": "text", "text": "..."}]
# }
# Source: https://docs.anthropic.com/en/api/messages

data = resp.json()
usage = data.get("usage", {})
input_tokens = usage.get("input_tokens", 0)
output_tokens = usage.get("output_tokens", 0)
model_used = data.get("model", self.model)
```

### OpenRouter Response Token & Cost Extraction
```python
# Already in OpenRouterProvider.complete() -- response structure:
# {
#   "usage": {
#     "prompt_tokens": 150,
#     "completion_tokens": 50,
#     "total_tokens": 200,
#     "cost": 0.00025
#   },
#   "choices": [{"message": {"content": "..."}}]
# }
# Source: https://openrouter.ai/docs/guides/guides/usage-accounting

data = resp.json()
usage = data.get("usage", {})
prompt_tokens = usage.get("prompt_tokens", 0)
completion_tokens = usage.get("completion_tokens", 0)
cost = usage.get("cost")  # Direct cost from OpenRouter
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Langfuse v2 (low-level SDK) | Langfuse v3 (OpenTelemetry-based) | June 2025 | Decorator-based, automatic context propagation, OTEL compatibility |
| `LANGFUSE_BASEURL` env var | `LANGFUSE_BASE_URL` env var | v3/v4 | Old var still works in v4 but deprecated |
| Custom TraceCollector pattern | Langfuse SDK buffering | Always available | SDK handles batching, retry, async flush natively |

**Deprecated/outdated:**
- Langfuse v2 decorator API (`@langfuse.observe()` on instance) is replaced by `@observe()` module-level import in v3
- `LANGFUSE_BASEURL` (without underscore before URL) still works but is deprecated in favor of `LANGFUSE_BASE_URL`

## Open Questions

Things that couldn't be fully resolved:

1. **Background task context propagation**
   - What we know: Langfuse v3 uses OpenTelemetry context which is tied to async context. `create_background_task()` spawns new asyncio tasks that may not inherit the trace context.
   - What's unclear: Whether Langfuse v3 specifically handles asyncio.create_task context propagation (Python's contextvars SHOULD propagate to child tasks, but OTEL context may not).
   - Recommendation: Test empirically. If background agent spans don't appear in the parent trace, either propagate context manually or accept separate traces with linking metadata.

2. **Langfuse Hobby Tier adequacy**
   - What we know: 50,000 units/month. With ~20 units per pipeline run, that's ~2,500 pipeline runs.
   - What's unclear: Exact usage pattern of the admin user(s). With 1-2 users, this should be ample. With a team of 10, could be tight.
   - Recommendation: Start with Hobby tier. Monitor. Upgrade to Core ($29/month) if approaching limits.

3. **Per-agent provider with user's API key**
   - What we know: Admin sets model overrides (e.g., "strategist uses anthropic/claude-sonnet-4"). But the API key is the user's encrypted key, not the admin's.
   - What's unclear: If admin sets an override to use Claude, but the user only has an OpenRouter key, the call will fail.
   - Recommendation: Model overrides should only apply within the same provider as the user's key (or use a shared API key for admin overrides). Alternatively, admin overrides only work for OpenRouter models since OpenRouter can route to any model including Claude. This needs a design decision.

4. **Shared API key for admin model overrides**
   - What we know: Config already has `shared_openrouter_key` (used for engagement service, scenario generation).
   - What's unclear: Should per-agent overrides use the shared key (admin-funded) or the user's key?
   - Recommendation: Use the shared OpenRouter key for admin model overrides. This makes it the admin's cost, not the user's, and avoids the cross-provider problem.

## Sources

### Primary (HIGH confidence)
- [Langfuse Python SDK Setup](https://langfuse.com/docs/observability/sdk/python/setup) - env vars, initialization, version
- [Langfuse Decorator Integration](https://langfuse.com/docs/observability/sdk/python/decorators) - @observe(), as_type="generation", update_current_generation
- [Langfuse SDK Instrumentation](https://langfuse.com/docs/observability/sdk/instrumentation) - manual generation observations for raw HTTP calls
- [Langfuse Pricing](https://langfuse.com/pricing) - Hobby tier: 50k units free, 30 day retention, 2 users
- [Langfuse Token/Cost Tracking](https://langfuse.com/docs/observability/features/token-and-cost-tracking) - usage_details, cost_details, OpenRouter cost capture
- [OpenRouter Models API](https://openrouter.ai/docs/api/api-reference/models/get-models) - GET /api/v1/models, full schema with pricing
- [OpenRouter Usage Accounting](https://openrouter.ai/docs/guides/guides/usage-accounting) - response usage object with cost field
- [Claude Messages API](https://docs.anthropic.com/en/api/messages) - response format with usage.input_tokens/output_tokens
- [PyPI langfuse](https://pypi.org/project/langfuse/) - v3.12.1, Python >=3.10

### Secondary (MEDIUM confidence)
- [Langfuse Self-Hosting Docker Compose](https://langfuse.com/self-hosting/deployment/docker-compose) - requires Postgres, ClickHouse, Redis, MinIO
- [Langfuse Advanced Usage](https://langfuse.com/docs/observability/sdk/python/advanced-usage) - data masking, sampling, multi-project routing
- [Langfuse SDK Configuration](https://langfuse.com/self-hosting/configuration) - server-side env vars for self-hosted

### Tertiary (LOW confidence)
- Background task context propagation behavior with Langfuse v3 + asyncio -- needs empirical testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Langfuse SDK docs are clear, versioned, and verified via PyPI
- Architecture (Langfuse integration): HIGH - decorator + manual generation pattern well-documented with raw HTTP examples
- Architecture (per-agent model config): MEDIUM - pattern is straightforward but the shared-key vs user-key question needs a design decision
- Pitfalls: MEDIUM - some based on general async context propagation knowledge, needs testing
- OpenRouter API: HIGH - official docs with full schema

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days -- Langfuse SDK is stable at v3)
