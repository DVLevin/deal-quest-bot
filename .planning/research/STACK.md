# Technology Stack — Multi-Agent AI Sales Partner (v2.0)

**Project:** Deal Quest Bot v2.0 — Multi-Agent Orchestration Milestone
**Researched:** 2026-02-24
**Scope:** NEW additions only. Existing validated stack is NOT re-researched.

---

## What Is Already In Place (Do Not Re-Add)

These are validated, production-running dependencies. The roadmap must NOT replace or duplicate them:

| Capability | Already Solved By |
|---|---|
| Telegram bot framework | `aiogram>=3.4.0` |
| HTTP client for LLM calls | `httpx>=0.27.0` (AsyncClient, connection pooling, retry) |
| LLM provider abstraction | `bot/services/llm_router.py` (ClaudeProvider + OpenRouterProvider) |
| YAML pipeline config | `pyyaml>=6.0.1` + `bot/pipeline/config_loader.py` |
| Data validation + models | `pydantic>=2.6.0` + `pydantic-settings>=2.2.0` |
| Database (all tables) | InsForge PostgREST via `bot/storage/insforge_client.py` |
| Background interval tasks | `asyncio.create_task()` + `while True` loops in `followup_scheduler.py` |
| Tracing/observability | `bot/tracing/` (TraceContext, traced_span, TraceCollector) |
| Agent ABC + registry | `bot/agents/base.py`, `bot/agents/registry.py` |
| Pipeline execution | `bot/pipeline/runner.py` (sequential/parallel/background) |
| Voice transcription | AssemblyAI via `bot/services/transcription.py` |
| Encryption | `cryptography>=42.0.0` (Fernet) |

---

## New Capabilities Required

### 1. Tool-Use Loop Engine (OpenRouter Function Calling)

**What is needed:** The existing `OpenRouterProvider.complete()` returns parsed JSON from a single LLM call. The new orchestrator agents need multi-turn tool-use loops: call LLM with tools array → execute tool calls → append results → call LLM again → repeat until no more tool calls (or `max_iterations` reached).

**Verdict: Extend existing `llm_router.py` with a new method — no new library.**

The existing `httpx.AsyncClient` in `OpenRouterProvider` already handles the HTTP transport. OpenRouter supports OpenAI-compatible function calling natively (verified at openrouter.ai/docs/api/reference). The reference TypeScript ClickUp bot uses raw `fetch` with this exact format — the Python equivalent is identical except using `httpx`.

**New method to add to `OpenRouterProvider`:**

```python
async def complete_with_tools(
    self,
    messages: list[dict],   # full OpenAI-format message thread
    tools: list[dict],       # JSON Schema tool definitions (type: "function")
    *,
    tool_choice: str = "auto",
) -> dict:
    """Single LLM call returning raw choice message with possible tool_calls list."""
    resp = await self._client.post("/chat/completions", json={
        "model": self.model,
        "messages": messages,
        "tools": tools,
        "tool_choice": tool_choice,
        "max_tokens": 4096,
    })
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]
    # Returns: {"role": "assistant", "content": str|None, "tool_calls": [...]}
```

The tool-use loop logic (while iterations < max_iterations) lives in each agent class, not in the provider — matching the TypeScript pattern exactly. The provider is just an HTTP call wrapper.

**OpenRouter tool_calls response format** (verified from official docs):
```json
{
  "role": "assistant",
  "content": null,
  "tool_calls": [
    {
      "id": "call_abc123",
      "type": "function",
      "function": {
        "name": "create_deal",
        "arguments": "{\"title\": \"Acme Corp\", \"stage\": \"qualified\"}"
      }
    }
  ]
}
```

**Confidence:** HIGH — OpenRouter tool calling format is documented and matches OpenAI spec. Existing httpx client handles it without changes.

---

### 2. Agent Config Loader (agents.yaml)

**What is needed:** YAML-defined agent configs: model, prompt_file, tools list, max_iterations, description. Reference: `bot/src/agents/config-loader.ts` in ClickUp bot.

**Verdict: No new library — reuse existing `pyyaml`.**

The existing bot uses PyYAML for pipeline configs (`bot/pipeline/config_loader.py`). Add `bot/agents/config_loader.py` following the same module-level cache pattern. The new `data/agents.yaml` mirrors the TypeScript `AgentConfig` interface.

**`data/agents.yaml` structure:**

```yaml
agents:
  orchestrator:
    model: "openai/gpt-oss-120b"
    prompt_file: "orchestrator.md"
    tools:
      - "invoke_deal_agent"
      - "invoke_coach_agent"
      - "invoke_strategy_agent"
      - "invoke_memory_agent"
    description: "Routes user messages to specialist agents"
    max_iterations: 5

  deal_agent:
    model: "openai/gpt-oss-120b"
    prompt_file: "deal_agent.md"
    tools:
      - "create_deal"
      - "update_deal"
      - "list_deals"
      - "add_deal_note"
      - "update_deal_stage"
    description: "CRM: create/update deals, log notes, track pipeline"
    max_iterations: 8

  coach_agent:
    model: "openai/gpt-oss-120b"
    prompt_file: "coach_agent.md"
    tools:
      - "start_training_session"
      - "run_practice_scenario"
      - "get_progress_summary"
    description: "Training, practice, objection handling"
    max_iterations: 5

  strategy_agent:
    model: "openai/gpt-oss-120b"
    prompt_file: "strategy_agent.md"
    tools:
      - "analyze_deal"
      - "prep_call"
      - "generate_re_engagement"
    description: "Deal analysis, call prep, competitive intel"
    max_iterations: 6

  memory_agent:
    model: "openai/gpt-oss-120b"
    prompt_file: "memory_agent.md"
    tools:
      - "read_memory"
      - "update_memory"
    description: "Learns salesperson patterns, maintains long-term context"
    max_iterations: 4
```

**`bot/agents/config_loader.py` pattern:**

```python
from __future__ import annotations
import yaml
from pathlib import Path
from dataclasses import dataclass

@dataclass
class AgentConfig:
    model: str
    prompt_file: str
    tools: list[str]
    description: str
    max_iterations: int

_cache: dict[str, AgentConfig] | None = None

def load_agent_configs() -> dict[str, AgentConfig]:
    global _cache
    if _cache is not None:
        return _cache
    path = Path(__file__).parent.parent.parent / "data" / "agents.yaml"
    raw = yaml.safe_load(path.read_text())
    _cache = {
        name: AgentConfig(**cfg)
        for name, cfg in raw["agents"].items()
    }
    return _cache

def get_agent_config(name: str) -> AgentConfig | None:
    return load_agent_configs().get(name)
```

**Confidence:** HIGH — direct adaptation of validated TypeScript pattern using already-present PyYAML.

---

### 3. Conversation History Manager

**What is needed:** Per-user sliding window of the last N message turns in OpenAI format, persisted across handler calls within a process lifetime. Must handle concurrent async access safely.

**Verdict: Custom Python class using stdlib `collections.deque` — no new library.**

The TypeScript reference (`conversation-history.ts`) is a 149-line in-memory class using a `Map`. The Python equivalent uses a module-level `dict[int, deque[dict]]` keyed by `chat_id`. Python's `deque(maxlen=N)` gives O(1) append with automatic eviction — no manual shifting required.

**`bot/services/conversation_history.py`:**

```python
from __future__ import annotations
from collections import deque
from typing import Any

_histories: dict[int, deque[dict[str, Any]]] = {}
WINDOW_SIZE = 20  # 10 user+assistant turn pairs

class ConversationHistory:
    @classmethod
    def add_message(cls, chat_id: int, message: dict[str, Any]) -> None:
        if chat_id not in _histories:
            _histories[chat_id] = deque(maxlen=WINDOW_SIZE)
        _histories[chat_id].append(message)

    @classmethod
    def get_messages(cls, chat_id: int) -> list[dict[str, Any]]:
        return list(_histories.get(chat_id, []))

    @classmethod
    def clear(cls, chat_id: int) -> None:
        _histories.pop(chat_id, None)

    @classmethod
    def cleanup_stale(cls, max_age_sec: int = 3600) -> int:
        # Implement timestamp tracking for stale entry cleanup
        ...
```

**Why NOT persist to InsForge:** Conversation history is ephemeral session context, not business data. Process restart = natural session boundary for a sales partner. InsForge round-trips (100-300ms) on every message would add unacceptable latency. The existing `user_memory` table handles structured long-term memory (deals, patterns, preferences) separately.

**Why NOT use aiogram `MemoryStorage`:** FSM storage is key-value per state machine. Conversation history is a list of N messages — a different data structure. Mixing them adds complexity with no benefit.

**Concurrency safety:** Python asyncio is single-threaded event loop. Concurrent async handler calls serialize through the event loop, so read-modify-write on the `dict` is safe without explicit locking — same reasoning the TypeScript implementation uses for Node.js.

**Confidence:** HIGH — standard Python stdlib pattern, direct port of validated TypeScript design.

---

### 4. Proactive Scheduling (Daily Brief + Stale Deal Nudges)

**What is needed:** Send a morning briefing to each active user at a configured UTC time. Also send context-triggered nudges when deals go stale.

**Verdict: Add `APScheduler 3.x` for cron-triggered jobs. Keep existing `asyncio.create_task()` loops for interval jobs.**

**Why APScheduler 3.x and NOT 4.x:**
APScheduler 4.0 is explicitly pre-release alpha. The official migration guide states verbatim: "do NOT use this release in production." (Verified at apscheduler.readthedocs.io/en/master/migration.html.) APScheduler 3.x (`>=3.10`) has a stable `AsyncIOScheduler` that integrates directly with the running asyncio event loop — no additional thread or process required.

**Why APScheduler and NOT raw `asyncio.sleep()`:**
The existing `followup_scheduler.py` uses `while True` + `asyncio.sleep(6 * 60 * 60)` — fine for fixed interval jobs. For time-of-day jobs (daily brief at 09:00), `asyncio.sleep(seconds_until_9am)` is fragile: it drifts on restart, does not handle DST changes, and requires manual calculation. APScheduler's cron trigger handles this correctly.

**When to use what:**
- Keep `asyncio.create_task()` + `while True` + `asyncio.sleep()` for: followup checks (every 6h), scenario pool generation (every 6h). These are already working and don't need cron semantics.
- Use `APScheduler AsyncIOScheduler` + cron trigger for: daily brief (specific time of day).

**Installation:**
```
apscheduler>=3.10,<4.0
```

**Integration pattern (fits into existing `main.py`):**

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# In main() after bot initialization:
scheduler = AsyncIOScheduler(timezone="UTC")
scheduler.add_job(
    send_daily_brief,
    "cron",
    hour=6,  # 06:00 UTC
    kwargs={"bot": bot, "user_repo": user_repo, "deal_repo": deal_repo},
)
scheduler.start()

try:
    await dp.start_polling(bot)
finally:
    scheduler.shutdown(wait=False)
    await insforge.close()
```

**Confidence:** MEDIUM — APScheduler 3.x is widely used with aiogram (community pattern confirmed). Version pin `<4.0` is essential. The `scheduler.start()` call must happen after the event loop is running (inside an async context or after `asyncio.run()` starts).

---

### 5. CRM Data Models (New InsForge Tables)

**What is needed:** Pydantic models for `deals` and `deal_notes` tables. The existing `LeadRegistryModel` covers basic prospect analysis but lacks structured deal lifecycle: pipeline stages, deal value, probability, next actions.

**Verdict: New Pydantic models in `bot/storage/models.py` — no new library.**

Direct extension of existing pattern (11 existing models, all `pydantic.BaseModel`).

**Models to add to `bot/storage/models.py`:**

```python
class DealModel(BaseModel):
    id: int | None = None
    telegram_id: int
    user_id: int | None = None
    title: str                          # "Acme Corp — Enterprise License"
    prospect_name: str | None = None
    prospect_company: str | None = None
    prospect_title: str | None = None
    stage: str = "prospecting"
    # Stage values: prospecting | qualified | proposal | negotiation | closed_won | closed_lost
    value: float | None = None
    currency: str = "USD"
    probability: int = 0                # 0-100
    expected_close_date: str | None = None
    source: str | None = None           # referral | inbound | outbound | linkedin
    next_action: str | None = None
    next_action_due: str | None = None  # ISO datetime
    lead_id: int | None = None          # Optional link to existing lead_registry row
    created_at: str | None = None
    updated_at: str | None = None


class DealNoteModel(BaseModel):
    id: int | None = None
    deal_id: int
    telegram_id: int
    note_type: str = "note"
    # note_type values: note | call_log | meeting | email | stage_change | ai_insight
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: str | None = None
```

**New repositories to add to `bot/storage/repositories.py`:**
- `DealRepo` — CRUD for `deals` table, filter by `telegram_id`, `stage`, `next_action_due`
- `DealNoteRepo` — append-only log for `deal_notes`, query by `deal_id`

**Database migrations needed:** Two new InsForge tables: `deals` and `deal_notes`. These follow the same PostgREST-accessible pattern as existing tables.

**Confidence:** HIGH — direct extension of existing Pydantic model + repository pattern, proven by 11 existing repository classes.

---

### 6. Inline Keyboard Confirmation Flow (Confirmation-First CRM Writes)

**What is needed:** Before executing a CRM mutation (create deal, update stage, add note), show the user a confirmation keyboard. The confirmation payload must survive between the agent response and the user's button press.

**Verdict: Use existing `aiogram` inline keyboards + `aiogram.fsm` state storage — no new library.**

The existing bot already uses:
- `aiogram.types.InlineKeyboardMarkup`, `InlineKeyboardButton` for callback keyboards
- `aiogram.fsm.storage.memory.MemoryStorage` for FSM state
- `@router.callback_query()` handlers for button presses

The TypeScript ClickUp bot's `confirmationPayload` pattern maps directly to aiogram FSM state:

```python
# In orchestrator handler, when agent returns confirmation_payload:
if result.get("confirmation_payload"):
    await state.set_state(OrchestratorStates.awaiting_confirmation)
    await state.update_data(pending_action=result["confirmation_payload"])
    keyboard = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="Confirm", callback_data="confirm_action"),
        InlineKeyboardButton(text="Cancel", callback_data="cancel_action"),
    ]])
    await message.answer(result["content"], reply_markup=keyboard)

# In callback_query handler:
@router.callback_query(OrchestratorStates.awaiting_confirmation, F.data == "confirm_action")
async def on_confirm(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    pending = data["pending_action"]
    # Execute the CRM mutation
    await execute_pending_action(pending)
    await state.clear()
```

**Confidence:** HIGH — aiogram FSM + inline keyboards are core framework features, zero new dependencies.

---

### 7. Catch-All Message Handler (Natural Language Entry Point)

**What is needed:** A handler that catches any text message not claimed by command handlers or active FSM states, and routes it to the Orchestrator.

**Verdict: Use existing aiogram router with `StateFilter(default_state)` — no new library.**

In aiogram 3, handlers are matched in registration order. The catch-all handler uses:

```python
from aiogram.filters import StateFilter
from aiogram.fsm.state import default_state

@router.message(StateFilter(default_state), F.text)
async def handle_natural_language(message: Message, state: FSMContext, ...):
    result = await orchestrator.process_message(
        chat_id=message.chat.id,
        telegram_id=message.from_user.id,
        text=message.text,
    )
    # Handle result: text response, confirmation, or error
```

**Critical: this router must be registered LAST in `main.py`** after all command routers. aiogram matches the first handler that passes all filters — command handlers registered earlier will consume `/learn`, `/train`, etc. before the catch-all fires.

```python
# main.py — registration order matters:
dp.include_router(start.router)
dp.include_router(support.router)
dp.include_router(learn.router)
dp.include_router(train.router)
dp.include_router(stats.router)
dp.include_router(settings.router)
dp.include_router(leads.router)
dp.include_router(admin.router)
dp.include_router(orchestrator.router)  # LAST — catches everything else
```

**Confidence:** HIGH — aiogram filter ordering is documented behavior, verified in official docs.

---

## Summary: Net-New Dependencies

| Package | Version Pin | Purpose | Justification |
|---|---|---|---|
| `apscheduler` | `>=3.10,<4.0` | Daily brief cron scheduling | Only stable asyncio-native cron scheduler; v4 is pre-release alpha; raw `asyncio.sleep()` is fragile for time-of-day jobs |

**Everything else uses existing dependencies or Python stdlib. Zero other new packages.**

---

## Full `requirements.txt` After Milestone

```
# Deal Quest Bot - Dependencies

# Telegram Bot Framework (async, v3)
aiogram>=3.4.0

# LLM Providers
anthropic>=0.40.0
httpx>=0.27.0

# Config & Validation
pydantic>=2.6.0
pydantic-settings>=2.2.0

# Memory/Config
pyyaml>=6.0.1
python-dotenv>=1.0.1

# Security
cryptography>=42.0.0

# Proactive scheduling (daily brief at specific time of day)
apscheduler>=3.10,<4.0
```

---

## Alternatives Considered and Rejected

| Category | Rejected Option | Reason |
|---|---|---|
| Scheduling | `APScheduler>=4.0` | Pre-release alpha. Official docs: "do NOT use in production." |
| Scheduling | `aiocron` | Small library, limited production track record, no persistent job store |
| Scheduling | `asyncio.sleep()` raw | Adequate for fixed intervals; fragile for time-of-day (drift on restart, no DST handling) |
| Conversation history | LangChain `ConversationBufferWindowMemory` | Massive transitive dependency graph for a 20-line dict class; LangChain takes over the architecture |
| Conversation history | Redis | No Redis in existing stack; InsForge is the single data store; in-memory is correct for per-session context |
| Conversation history | InsForge persistence | 100-300ms round-trip per message is unacceptable for history reads; ephemeral is semantically correct |
| Tool use | OpenAI Python SDK (`openai` package) | Already have raw httpx client; SDK adds ~20MB dependency + different async lifecycle; OpenRouter is the provider, not OpenAI |
| Tool use | LangChain agents / LangGraph | Framework takeover incompatible with existing YAML pipeline system; adds 100+ transitive deps; no benefit for this pattern |
| CRM models | External CRM SDK (HubSpot, Pipedrive) | Explicitly out of scope per PROJECT.md: "External CRM sync deferred to future milestone" |
| Confirmation flow | Separate state database | MemoryStorage already handles FSM state; overkill for single-process bot |
| Agent orchestration | AutoGen, CrewAI, Agentflow | Framework-level take-over; incompatible with existing `BaseAgent` ABC; would require rewriting v1.0 agents |

---

## System Integration Diagram

```
aiogram Dispatcher (existing)
  │
  ├── Command routers (existing — registered first, highest priority):
  │   /start, /support, /learn, /train, /stats, /settings, /leads, /admin
  │
  └── Orchestrator router (NEW — registered last, lowest priority)
        └── catch-all: F.text + StateFilter(default_state)
              │
              └── OrchestratorAgent.process_message()
                    │
                    ├── ConversationHistory.get_messages() [NEW in-memory]
                    ├── AgentConfigLoader.get_agent_config() [NEW — uses existing PyYAML]
                    ├── Tool-use loop via OpenRouterProvider.complete_with_tools() [EXTENDED]
                    │     │
                    │     ├── invoke_deal_agent → DealAgent.run()
                    │     │     └── Tool calls: create_deal, update_deal, list_deals, ...
                    │     │
                    │     ├── invoke_coach_agent → CoachAgent.run()
                    │     │     └── Wraps existing: PipelineRunner(learn/train pipelines)
                    │     │
                    │     ├── invoke_strategy_agent → StrategyAgent.run()
                    │     │     └── Wraps existing: StrategistAgent pipelines
                    │     │
                    │     └── invoke_memory_agent → MemoryAgent.run()
                    │           └── Reads/writes user_memory via existing UserMemoryRepo
                    │
                    └── Returns: text | confirmation_payload (triggers FSM keyboard)

Background jobs (existing pattern — keep as-is):
  ├── asyncio.create_task(): followup_scheduler (every 6h)
  └── asyncio.create_task(): scenario_generator (every 6h)

NEW background jobs:
  └── APScheduler AsyncIOScheduler
        └── daily_brief_job (cron: hour=6, UTC)
              └── Reads all active users → sends morning briefing via bot.send_message()

InsForge tables:
  Existing: users, user_memory, scenarios_seen, attempts, support_sessions,
            track_progress, casebook, pipeline_traces, pipeline_spans,
            lead_registry, lead_activity_log
  NEW:      deals, deal_notes
```

---

## Sources

- OpenRouter API tool calling format: https://openrouter.ai/docs/api/reference/overview (HIGH — official docs, verified)
- APScheduler 3.x AsyncIOScheduler: https://apscheduler.readthedocs.io/en/3.x/userguide.html (HIGH — official docs, verified)
- APScheduler 4.x pre-release warning: https://apscheduler.readthedocs.io/en/master/migration.html (HIGH — official docs state "do NOT use in production")
- Reference architecture: `/Users/dmytrolevin/Desktop/clickup mcp/bot/src/agents/base-agent.ts` + `orchestrator.ts` + `conversation-history.ts` (HIGH — production code, read directly)
- aiogram 3 handler/router registration: https://docs.aiogram.dev/en/latest/dispatcher/router.html (MEDIUM — WebSearch confirmed, official docs)
- aiogram 3 FSM StateFilter: https://docs.aiogram.dev/en/latest/dispatcher/finite_state_machine/index.html (MEDIUM — WebSearch confirmed, official docs)
- Existing bot code (HIGH — read directly): `bot/services/llm_router.py`, `bot/pipeline/runner.py`, `bot/storage/models.py`, `bot/main.py`, `bot/services/followup_scheduler.py`
