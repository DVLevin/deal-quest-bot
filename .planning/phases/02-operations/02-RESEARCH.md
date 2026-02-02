# Phase 2: Operations - Admin Commands & Synthetic Testing - Research

**Researched:** 2026-02-02
**Domain:** Operations, observability, admin interfaces, testing
**Confidence:** HIGH

## Summary

Phase 2 extends Phase 1's tracing infrastructure with admin commands for health monitoring, error tracking, synthetic testing, and cost analysis. The foundation is already in place - tracing, span collection, and basic performance views are operational.

**Key findings:**

1. **Admin commands** should follow the existing callback_data pattern (`admin:health`, `admin:errors`, `admin:test`) - not new /commands - to maintain consistency with the existing admin panel
2. **Token usage data** is automatically returned by both OpenRouter (with cost!) and Claude APIs in their response JSON - no special configuration needed
3. **Synthetic tests** can execute through real pipelines using a dedicated test telegram_id (e.g., -1) to avoid polluting real user data - aiogram doesn't require real Message objects for pipeline code
4. **Error classification** should use a simple enum-based approach with pattern matching on error messages for backward compatibility with existing traces
5. **Uptime tracking** uses in-memory start time (simple, works for Railway's persistent containers)

**Primary recommendation:** Extend existing tables with minimal schema additions (error_type, token counts in JSONB), build admin handlers following the current callback pattern, implement synthetic tests as service functions that bypass Telegram entirely.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| aiogram | 3.x | Telegram bot framework | Production framework, callback_query patterns for admin UI |
| PostgreSQL | Latest | Data persistence via InsForge | Existing traces/spans tables, JSONB for flexible data |
| httpx | Latest | HTTP client | Already used for LLM APIs, extracting token data |
| pydantic | Latest | Data models | Existing TraceModel/SpanModel, validation |

### Supporting (For This Phase)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Python datetime | stdlib | Timestamp filtering | "Last 24 hours" queries with NOW() - INTERVAL |
| Python time | stdlib | Uptime tracking | Record start time with time.monotonic() |
| Python enum | stdlib | Error classification | Type-safe error categories |
| Python traceback | stdlib | Stack trace capture | Format exceptions for storage |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| In-memory uptime | DB-persisted start time | In-memory is simpler; Railway containers persist |
| Callback buttons | Bot commands (/admin_health) | Callbacks are cleaner UI, already established |
| Pattern matching errors | Separate error_type column | Pattern matching allows classifying existing traces retroactively |
| aiogram-tests | Mock objects manually | aiogram-tests adds dependency; manual mocking is simpler for this use case |

**Installation:**
```bash
# No new dependencies required - all stdlib or already installed
# Existing: aiogram, httpx, pydantic, pyyaml, psycopg2 (via InsForge)
```

## Architecture Patterns

### Recommended Project Structure
```
bot/
├── handlers/
│   └── admin.py               # EXTEND: Add health, errors, test handlers
├── services/
│   ├── synthetic_test.py      # NEW: Test runner service
│   └── error_classifier.py    # NEW: Error type classification
├── tracing/
│   ├── context.py             # EXTEND: Capture full stack traces
│   └── models.py              # EXTEND: Add token fields to SpanModel
└── storage/
    ├── repositories.py        # EXTEND: TraceRepo query methods
    └── models.py              # EXTEND: Token fields in PipelineSpanModel
```

### Pattern 1: Admin Callback Handlers
**What:** Admin commands as callback_data handlers, not bot commands
**When to use:** All Phase 2 admin features (health, errors, test)
**Example:**
```python
# Source: bot/handlers/admin.py (existing pattern)
@router.callback_query(F.data == "admin:health")
async def on_admin_health(
    callback: CallbackQuery,
    trace_repo: TraceRepo,
    admin_usernames: list[str],
) -> None:
    """Show bot health: uptime, trace counts, error rate."""
    username = (callback.from_user.username or "").lower()
    if username not in admin_usernames:
        await callback.answer("🔒 Admin only", show_alert=True)
        return

    # Compute stats from trace_repo
    # ...

    await callback.message.edit_text(text, parse_mode="Markdown", reply_markup=keyboard)
    await callback.answer()
```

### Pattern 2: Token Capture in @traced_span
**What:** Extract token usage from LLM API responses, store in span output_data
**When to use:** Every LLM call (OpenRouter, Claude) within traced spans
**Example:**
```python
# Source: bot/services/llm_router.py (extend complete() methods)
@traced_span("llm:openrouter")
async def complete(self, system_prompt: str, user_message: str, *, image_b64: str | None = None) -> dict[str, Any]:
    resp = await self._client.post("/chat/completions", json={...})
    data = resp.json()

    # Extract token usage (OpenRouter includes usage + cost automatically)
    usage = data.get("usage", {})
    tokens = {
        "prompt_tokens": usage.get("prompt_tokens", 0),
        "completion_tokens": usage.get("completion_tokens", 0),
        "total_tokens": usage.get("total_tokens", 0),
        "cost": usage.get("cost", 0.0),  # OpenRouter returns cost in credits
    }

    result = _extract_json(data["choices"][0]["message"]["content"])
    result["_token_usage"] = tokens  # Attach to output
    return result
```

### Pattern 3: Synthetic Test as Service Function
**What:** Test scenarios execute through pipeline code, not Telegram handlers
**When to use:** `/admin test` button triggers manual test suite
**Example:**
```python
# Source: NEW bot/services/synthetic_test.py
from bot.pipeline.context import PipelineContext
from bot.pipeline.runner import PipelineRunner
from bot.tracing import TraceContext

TEST_TELEGRAM_ID = -1  # Dedicated test user ID

async def run_test_scenario(
    scenario_id: str,
    test_input: str,
    *,
    agent_registry: AgentRegistry,
    knowledge: KnowledgeService,
    llm_provider: LLMProvider,
) -> dict[str, Any]:
    """Run a single synthetic test through the real pipeline."""

    # Create pipeline context (no Telegram Message needed)
    ctx = PipelineContext(
        user_input=test_input,
        telegram_id=TEST_TELEGRAM_ID,
        user_id=0,  # Test user
        llm_provider=llm_provider,
        knowledge=knowledge,
        memory={},
    )

    pipeline_config = load_pipeline("support")  # or learn/train
    runner = PipelineRunner(agent_registry)

    # Trace execution (produces real trace + spans)
    async with TraceContext(pipeline_name=f"test:{scenario_id}", telegram_id=TEST_TELEGRAM_ID, user_id=0):
        await runner.run(pipeline_config, ctx)

    result = ctx.get_result("strategist")  # or trainer
    return {
        "scenario_id": scenario_id,
        "success": result.success if result else False,
        "output": result.data if result else None,
        "trace_id": ctx.trace_id,  # From TraceContext
    }
```

### Pattern 4: Error Classification with Enum
**What:** Classify errors by type using enum + pattern matching
**When to use:** Displaying errors in `/admin errors`, filtering by type
**Example:**
```python
# Source: NEW bot/services/error_classifier.py
from enum import Enum

class ErrorType(str, Enum):
    LLM_FAILURE = "llm_failure"
    DB_ERROR = "db_error"
    TRANSCRIPTION_FAILURE = "transcription_failure"
    TELEGRAM_API_ERROR = "telegram_api_error"
    TIMEOUT = "timeout"
    UNKNOWN = "unknown"

def classify_error(error_message: str) -> ErrorType:
    """Classify error by message content."""
    if not error_message:
        return ErrorType.UNKNOWN

    lower = error_message.lower()

    # LLM failures
    if any(x in lower for x in ["openrouter", "claude", "anthropic", "max_tokens", "rate limit", "api key"]):
        return ErrorType.LLM_FAILURE

    # Database errors
    if any(x in lower for x in ["insforge", "postgrest", "database", "query", "sql"]):
        return ErrorType.DB_ERROR

    # Transcription failures
    if any(x in lower for x in ["assemblyai", "transcription", "audio"]):
        return ErrorType.TRANSCRIPTION_FAILURE

    # Telegram API errors
    if any(x in lower for x in ["telegram", "bot", "aiogram", "message"]):
        return ErrorType.TELEGRAM_API_ERROR

    # Timeouts
    if any(x in lower for x in ["timeout", "timed out", "connection"]):
        return ErrorType.TIMEOUT

    return ErrorType.UNKNOWN
```

### Pattern 5: PostgreSQL Time-Range Queries
**What:** Query traces from "last 24 hours" using PostgreSQL interval syntax
**When to use:** Admin health stats, error counts
**Example:**
```python
# Source: EXTEND bot/storage/repositories.py TraceRepo
async def get_traces_since(
    self,
    hours_ago: int = 24,
    *,
    success_only: bool | None = None,
    pipeline_name: str | None = None,
) -> list[PipelineTraceModel]:
    """Get traces from the last N hours."""

    # PostgREST filter: created_at >= NOW() - INTERVAL '24 hours'
    # Use ISO timestamp calculation in Python instead
    from datetime import datetime, timedelta, timezone
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours_ago)).isoformat()

    filters: dict[str, Any] = {}
    if pipeline_name:
        filters["pipeline_name"] = pipeline_name
    if success_only is not None:
        filters["success"] = success_only

    # PostgREST doesn't support >= on timestamps easily, so fetch recent and filter in Python
    rows = await self.client.query(
        self.traces_table,
        filters=filters if filters else None,
        order="created_at.desc",
        limit=500,  # Fetch more than needed, filter in Python
    )

    if rows and isinstance(rows, list):
        traces = [PipelineTraceModel(**r) for r in rows]
        # Filter to cutoff time in Python
        return [t for t in traces if t.created_at and t.created_at >= cutoff]
    return []
```

### Anti-Patterns to Avoid

- **Don't create real Telegram messages for tests** — Synthetic tests should call pipeline code directly, not simulate Telegram interactions
- **Don't store full stack traces** — Capture first 10 lines + last 5 lines to avoid bloating the error column
- **Don't add FK constraints** — Phase 1 decision: no FK spans→traces for PostgREST ordering flexibility
- **Don't use separate error tracking table** — Store error data in existing pipeline_traces.error + classify at query time

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Admin UI flow | Custom command routing | Callback buttons (InlineKeyboardMarkup) | aiogram pattern, existing admin panel uses this |
| Token tracking | Custom token counter | API response parsing | OpenRouter/Claude return usage automatically |
| Uptime tracking | DB-persisted process monitoring | In-memory start time (time.monotonic()) | Railway containers persist; DB adds complexity |
| Error classification | ML-based classifier | Keyword pattern matching | Simple, works retroactively, maintainable |
| Time-range filtering | Custom date logic | PostgreSQL INTERVAL + Python datetime | Standard SQL feature |
| Stack trace formatting | Custom formatter | Python traceback.format_exception() | stdlib, handles all edge cases |

**Key insight:** Phase 1 already solved the hard problems (tracing, span collection, batched persistence). Phase 2 is primarily data aggregation and presentation - use stdlib and existing patterns.

## Common Pitfalls

### Pitfall 1: Token Cost Calculation Without Provider Data
**What goes wrong:** Trying to calculate LLM costs by manually tracking model pricing tables
**Why it happens:** Assumption that APIs don't return cost information
**How to avoid:** OpenRouter includes `usage.cost` in credits, Claude returns `usage` with token counts - extract from API responses
**Warning signs:** Hard-coded pricing tables, manual token * price calculations

### Pitfall 2: Real Telegram Messages for Synthetic Tests
**What goes wrong:** Attempting to create mock Message objects or send real Telegram messages for tests
**Why it happens:** Thinking tests must go through Telegram handlers
**How to avoid:** Pipeline code (PipelineRunner, agents) doesn't depend on aiogram types - call directly with PipelineContext
**Warning signs:** Imports of aiogram.types.Message in test code, trying to use Bot.send_message()

### Pitfall 3: Storing Full Stack Traces
**What goes wrong:** Database column bloat, slow queries, storage costs
**Why it happens:** Python's traceback.format_exception() can produce 50+ lines for deep stacks
**How to avoid:** Truncate to first 10 + last 5 lines, or just store exception type + message + file:line
**Warning signs:** Error column > 5KB, slow admin error queries

### Pitfall 4: Separate Error Tracking Table
**What goes wrong:** Duplicate data, sync issues between traces and errors
**Why it happens:** Thinking "errors are special" and deserve their own table
**How to avoid:** Use existing pipeline_traces.success=false + error column, classify at query time
**Warning signs:** Creating error_log table, trying to keep traces and errors in sync

### Pitfall 5: Bot Uptime in Database
**What goes wrong:** Unnecessary DB writes, potential for stale data if bot crashes before updating
**Why it happens:** Wanting "persistent" uptime across restarts
**How to avoid:** Railway containers are long-lived; track start time in-memory with time.monotonic()
**Warning signs:** Creating bot_status table, heartbeat updates every N seconds

### Pitfall 6: PostgREST Complex Filters
**What goes wrong:** Hitting PostgREST filter limitations (no >=, complex date math)
**Why it happens:** Assuming REST API has full SQL capabilities
**How to avoid:** Fetch recent records (limit=500) and filter in Python with datetime comparison
**Warning signs:** Trying to use `gte.` or date functions in PostgREST filters

## Code Examples

Verified patterns from Phase 1 and recommended approaches:

### Token Capture in LLM Providers

```python
# Source: EXTEND bot/services/llm_router.py

# OpenRouter - usage is automatic
@traced_span("llm:openrouter")
async def complete(self, system_prompt: str, user_message: str, *, image_b64: str | None = None) -> dict[str, Any]:
    resp = await self._client.post("/chat/completions", json={...})
    data = resp.json()

    # OpenRouter returns full usage + cost automatically
    usage = data.get("usage", {})
    # {
    #   "prompt_tokens": 1234,
    #   "completion_tokens": 567,
    #   "total_tokens": 1801,
    #   "cost": 0.0234  # in credits
    # }

    result = _extract_json(data["choices"][0]["message"]["content"])
    result["_token_usage"] = usage  # Attach to span output
    return result

# Claude - usage in response body
@traced_span("llm:claude")
async def complete(self, system_prompt: str, user_message: str, *, image_b64: str | None = None) -> dict[str, Any]:
    resp = await self._client.post("/v1/messages", json={...})
    data = resp.json()

    # Claude returns usage object with detailed breakdown
    usage = data.get("usage", {})
    # {
    #   "input_tokens": 100,
    #   "output_tokens": 50,
    #   "cache_creation_input_tokens": 0,
    #   "cache_read_input_tokens": 0
    # }

    result = _extract_json(data["content"][0]["text"])
    result["_token_usage"] = usage  # Attach to span output
    return result
```

### Admin Health Handler

```python
# Source: EXTEND bot/handlers/admin.py

# Add to ADMIN_MENU keyboard
ADMIN_MENU = InlineKeyboardMarkup(
    inline_keyboard=[
        [InlineKeyboardButton(text="⏱ Pipeline Performance", callback_data="admin:perf")],
        [InlineKeyboardButton(text="💚 Health", callback_data="admin:health")],  # NEW
        [InlineKeyboardButton(text="🚨 Errors", callback_data="admin:errors")],  # NEW
        [InlineKeyboardButton(text="🧪 Run Tests", callback_data="admin:test")],  # NEW
        # ... existing buttons
    ]
)

# Track bot start time (at module level)
from datetime import datetime, timezone
import time

_BOT_START_TIME = datetime.now(timezone.utc)
_BOT_START_MONOTONIC = time.monotonic()

@router.callback_query(F.data == "admin:health")
async def on_admin_health(
    callback: CallbackQuery,
    trace_repo: TraceRepo,
    admin_usernames: list[str],
) -> None:
    """Show bot health stats."""
    username = (callback.from_user.username or "").lower()
    if username not in admin_usernames:
        await callback.answer("🔒 Admin only", show_alert=True)
        return

    # Compute uptime
    uptime_seconds = time.monotonic() - _BOT_START_MONOTONIC
    uptime_hours = uptime_seconds / 3600

    # Get traces from last 24h
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    recent = await trace_repo.get_traces(limit=500)
    recent_24h = [t for t in recent if t.created_at and t.created_at >= cutoff]

    total_traces = len(recent_24h)
    failed_traces = [t for t in recent_24h if not t.success]
    error_count = len(failed_traces)
    error_rate = (error_count / total_traces * 100) if total_traces > 0 else 0

    # Per-pipeline avg duration
    by_pipeline: dict[str, list[float]] = {}
    for t in recent_24h:
        dur = float(t.duration_ms) if t.duration_ms else 0
        by_pipeline.setdefault(t.pipeline_name, []).append(dur)

    pipeline_stats = "\n".join(
        f"  • {name}: {sum(durations)/len(durations)/1000:.1f}s avg"
        for name, durations in sorted(by_pipeline.items())
    )

    text = (
        f"💚 *Bot Health*\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        f"⏱ Uptime: *{uptime_hours:.1f}h*\n"
        f"📊 Traces (24h): *{total_traces}*\n"
        f"🚨 Errors (24h): *{error_count}* ({error_rate:.1f}%)\n\n"
        f"*Avg Duration by Pipeline:*\n{pipeline_stats}\n"
    )

    await callback.message.edit_text(
        text,
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Back", callback_data="admin:back")],
        ]),
    )
    await callback.answer()
```

### Synthetic Test Runner

```python
# Source: NEW bot/services/synthetic_test.py

from typing import Any
from bot.pipeline.context import PipelineContext
from bot.pipeline.runner import PipelineRunner
from bot.pipeline.config_loader import load_pipeline
from bot.tracing import TraceContext
from bot.agents.registry import AgentRegistry
from bot.services.knowledge import KnowledgeService
from bot.services.llm_router import LLMProvider

TEST_TELEGRAM_ID = -1  # Dedicated test user

class SyntheticTestService:
    """Service for running synthetic test scenarios through real pipelines."""

    def __init__(
        self,
        agent_registry: AgentRegistry,
        knowledge: KnowledgeService,
        llm_provider: LLMProvider,
    ) -> None:
        self.agent_registry = agent_registry
        self.knowledge = knowledge
        self.llm_provider = llm_provider

    async def run_test(self, scenario: dict[str, Any]) -> dict[str, Any]:
        """Run a single test scenario."""

        scenario_id = scenario["id"]
        test_input = scenario["input"]
        pipeline_name = scenario["pipeline"]  # "support", "learn", or "train"

        # Create context (no Telegram Message needed)
        ctx = PipelineContext(
            user_input=test_input,
            telegram_id=TEST_TELEGRAM_ID,
            user_id=0,
            llm_provider=self.llm_provider,
            knowledge=self.knowledge,
            memory={},  # Empty memory for tests
        )

        pipeline_config = load_pipeline(pipeline_name)
        runner = PipelineRunner(self.agent_registry)

        # Execute with tracing
        try:
            async with TraceContext(
                pipeline_name=f"test:{scenario_id}",
                telegram_id=TEST_TELEGRAM_ID,
                user_id=0,
            ) as trace_ctx:
                await runner.run(pipeline_config, ctx)

            # Get result (agent name depends on pipeline)
            agent_name = "strategist" if pipeline_name == "support" else "trainer"
            result = ctx.get_result(agent_name)

            return {
                "scenario_id": scenario_id,
                "pipeline": pipeline_name,
                "success": result.success if result else False,
                "duration_ms": trace_ctx.duration_ms,
                "trace_id": trace_ctx.trace_id,
                "output": result.data if result and result.success else None,
                "error": result.error if result and not result.success else None,
            }

        except Exception as e:
            return {
                "scenario_id": scenario_id,
                "pipeline": pipeline_name,
                "success": False,
                "error": str(e),
            }

    async def run_test_suite(self) -> list[dict[str, Any]]:
        """Run all predefined test scenarios."""

        # Define test scenarios
        scenarios = [
            {
                "id": "support_text",
                "pipeline": "support",
                "input": "I'm talking to Sarah Chen, VP of Sales at TechCorp. She said they're looking to scale their SDR team but worried about onboarding costs. How should I respond?",
            },
            {
                "id": "learn_objection_handling",
                "pipeline": "learn",
                "input": "Walk me through handling the 'not interested' objection.",
            },
            {
                "id": "train_discovery",
                "pipeline": "train",
                "input": "Role-play a discovery call with me. You be the prospect.",
            },
        ]

        results = []
        for scenario in scenarios:
            result = await self.run_test(scenario)
            results.append(result)

        return results

# Admin handler for triggering tests
@router.callback_query(F.data == "admin:test")
async def on_admin_test(
    callback: CallbackQuery,
    agent_registry: AgentRegistry,
    knowledge: KnowledgeService,
    admin_usernames: list[str],
    openrouter_api_key: str,  # Shared key for tests
) -> None:
    """Run synthetic test suite."""
    username = (callback.from_user.username or "").lower()
    if username not in admin_usernames:
        await callback.answer("🔒 Admin only", show_alert=True)
        return

    await callback.message.edit_text("🧪 Running test suite...")

    # Create test service with shared OpenRouter key
    from bot.services.llm_router import OpenRouterProvider
    test_llm = OpenRouterProvider(openrouter_api_key, model="openai/gpt-oss-120b")
    test_service = SyntheticTestService(agent_registry, knowledge, test_llm)

    # Run tests
    results = await test_service.run_test_suite()
    await test_llm.close()

    # Format results
    lines = ["🧪 *Test Results*\n━━━━━━━━━━━━━━━━━━━━━━━━\n"]
    total_duration = 0
    passed = 0

    for r in results:
        status = "✅" if r["success"] else "❌"
        duration = r.get("duration_ms", 0) / 1000
        total_duration += duration
        if r["success"]:
            passed += 1

        lines.append(f"{status} `{r['scenario_id']}` — {duration:.1f}s")
        if not r["success"]:
            lines.append(f"   Error: {r.get('error', 'Unknown')[:100]}")

    lines.append(f"\n*Summary:* {passed}/{len(results)} passed, {total_duration:.1f}s total")

    await callback.message.edit_text(
        "\n".join(lines),
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Back", callback_data="admin:back")],
        ]),
    )
    await callback.answer()
```

### Error Classification and Admin Errors View

```python
# Source: NEW bot/services/error_classifier.py

from enum import Enum

class ErrorType(str, Enum):
    LLM_FAILURE = "llm_failure"
    DB_ERROR = "db_error"
    TRANSCRIPTION_FAILURE = "transcription_failure"
    TELEGRAM_API_ERROR = "telegram_api_error"
    TIMEOUT = "timeout"
    UNKNOWN = "unknown"

def classify_error(error_message: str) -> ErrorType:
    """Classify error by message content."""
    if not error_message:
        return ErrorType.UNKNOWN

    lower = error_message.lower()

    if any(x in lower for x in ["openrouter", "claude", "anthropic", "max_tokens", "rate limit", "api key"]):
        return ErrorType.LLM_FAILURE
    if any(x in lower for x in ["insforge", "postgrest", "database", "query", "sql"]):
        return ErrorType.DB_ERROR
    if any(x in lower for x in ["assemblyai", "transcription", "audio"]):
        return ErrorType.TRANSCRIPTION_FAILURE
    if any(x in lower for x in ["telegram", "bot", "aiogram", "message"]):
        return ErrorType.TELEGRAM_API_ERROR
    if any(x in lower for x in ["timeout", "timed out", "connection"]):
        return ErrorType.TIMEOUT

    return ErrorType.UNKNOWN

# Admin handler
@router.callback_query(F.data == "admin:errors")
async def on_admin_errors(
    callback: CallbackQuery,
    trace_repo: TraceRepo,
    admin_usernames: list[str],
) -> None:
    """Show recent pipeline errors."""
    username = (callback.from_user.username or "").lower()
    if username not in admin_usernames:
        await callback.answer("🔒 Admin only", show_alert=True)
        return

    # Get recent failed traces
    from datetime import datetime, timedelta, timezone
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

    all_traces = await trace_repo.get_traces(limit=500)
    recent_24h = [t for t in all_traces if t.created_at and t.created_at >= cutoff]
    failed = [t for t in recent_24h if not t.success][:20]  # Last 20 errors

    if not failed:
        text = "🚨 *Recent Errors*\n\nNo errors in the last 24 hours. 🎉"
    else:
        from bot.services.error_classifier import classify_error

        lines = ["🚨 *Recent Errors (last 24h)*\n━━━━━━━━━━━━━━━━━━━━━━━━\n"]

        for t in failed:
            error_type = classify_error(t.error or "")
            timestamp = t.created_at[:16] if t.created_at else "?"
            error_msg = (t.error or "Unknown error")[:100]

            lines.append(f"• {timestamp} | {error_type.value}")
            lines.append(f"  `{t.pipeline_name}` — {error_msg}")
            lines.append(f"  Trace: `{t.trace_id[:8]}...`\n")

        text = "\n".join(lines)

    await callback.message.edit_text(
        text,
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Back", callback_data="admin:back")],
        ]),
    )
    await callback.answer()
```

### Stack Trace Capture (Improved)

```python
# Source: EXTEND bot/tracing/context.py __aexit__

async def __aexit__(
    self,
    exc_type: type[BaseException] | None,
    exc_val: BaseException | None,
    exc_tb: Any,
) -> None:
    """Record end time, duration, and persist trace."""
    # ... existing timing code ...

    # Record success/failure with detailed error capture
    if exc_type is not None:
        self.success = False

        # Capture stack trace (truncated to first 10 + last 5 lines)
        import traceback
        tb_lines = traceback.format_exception(exc_type, exc_val, exc_tb)

        if len(tb_lines) > 15:
            # Truncate middle
            truncated = tb_lines[:10] + ["... (truncated) ...\n"] + tb_lines[-5:]
            tb_str = "".join(truncated)
        else:
            tb_str = "".join(tb_lines)

        # Store: type, message, truncated traceback
        self.error = f"{exc_type.__name__}: {exc_val}\n\n{tb_str}"[:2000]  # Max 2KB

    # ... rest of existing code ...
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual cost tracking tables | Extract from API responses | 2024+ | OpenRouter/Claude return usage + cost automatically |
| Separate test database | Test with telegram_id=-1 | Modern | Avoid data pollution, simpler setup |
| Bot commands for admin | Callback buttons | aiogram 3.x | Cleaner UI, better state management |
| DB-persisted uptime | In-memory start time | Container era | Simpler, Railway containers are long-lived |
| Regex error parsing | Keyword pattern matching | Current | Simpler, works retroactively |

**Deprecated/outdated:**
- OpenRouter `usage: {include: true}` parameter — now deprecated, usage always included (2025+)
- Creating mock aiogram.types.Message for tests — pipeline code doesn't need Telegram types
- Separate error tracking tables — store in traces, classify at query time

## Open Questions

Things that couldn't be fully resolved:

1. **Token cost pricing for Claude**
   - What we know: Claude API returns token counts (input_tokens, output_tokens), Anthropic publishes pricing per model
   - What's unclear: Whether to hard-code pricing tables or fetch from API
   - Recommendation: Start with hard-coded pricing for Claude (OpenRouter already returns cost); consider Anthropic pricing API if it exists

2. **Test scenario mocking for voice/image inputs**
   - What we know: Voice requires AssemblyAI transcription, images use base64 in LLM calls
   - What's unclear: Best way to mock audio/image without real files
   - Recommendation: Pre-transcribe test audio to text, use small base64-encoded test images (1x1 pixel) for image tests

3. **Error deduplication**
   - What we know: Same error can occur multiple times (e.g., API rate limit)
   - What's unclear: Whether to deduplicate in UI or show all occurrences
   - Recommendation: Show all occurrences initially; add filtering/grouping later if needed

4. **Test assertion criteria**
   - What we know: Tests execute pipelines and get results
   - What's unclear: What makes a test "pass" vs "fail" — just success flag, or validate output structure?
   - Recommendation: Start with success flag only; add output validation (JSON structure checks) in future iteration

## Sources

### Primary (HIGH confidence)
- [OpenRouter API Reference](https://openrouter.ai/docs/api/reference/overview) - Token usage response format with automatic cost
- [OpenRouter Usage Accounting](https://openrouter.ai/docs/guides/guides/usage-accounting) - Usage data inclusion
- [Claude API Messages](https://platform.claude.com/docs/en/api/messages) - Response format with usage object
- [Anthropic API Pricing](https://www.metacto.com/blogs/anthropic-api-pricing-a-full-breakdown-of-costs-and-integration) - Token pricing breakdown
- [Python traceback module](https://docs.python.org/3/library/traceback.html) - Stack trace formatting (official docs)
- [PostgreSQL time filtering](https://www.atlassian.com/data/sql/how-to-select-records-from-the-last-24-hours-postgresql) - NOW() - INTERVAL queries

### Secondary (MEDIUM confidence)
- [aiogram-tests PyPI](https://pypi.org/project/aiogram-tests/) - Testing library for aiogram 3
- [Python asyncio monitoring](https://superfastpython.com/asyncio-stuck-long-running-tasks/) - Uptime tracking patterns
- [Error classification patterns](https://docs.litellm.ai/docs/exception_mapping) - liteLLM exception types
- [PostgreSQL Group by Time](https://popsql.com/learn-sql/postgresql/how-to-group-by-time-in-postgresql) - date_trunc for time-series queries

### Tertiary (LOW confidence)
- Web search results on Python asyncio monitoring - General best practices
- Dev blog posts on Telegram bot testing - Conceptual approaches

## Metadata

**Confidence breakdown:**
- Token tracking: HIGH - Official API docs confirm automatic usage data in responses
- Synthetic testing: HIGH - Verified that pipelines don't depend on Telegram types
- Error classification: HIGH - Pattern matching is standard approach, works retroactively
- Uptime tracking: HIGH - Standard Python stdlib approach (time.monotonic())
- PostgreSQL queries: MEDIUM - PostgREST has limitations, Python filtering is workaround
- Test assertions: LOW - Implementation-specific, needs user validation criteria

**Research date:** 2026-02-02
**Valid until:** 30 days (stable domain - observability patterns change slowly)
