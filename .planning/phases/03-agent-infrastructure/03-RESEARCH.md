# Phase 3: Agent Infrastructure - Research

**Researched:** 2026-02-25
**Domain:** Python async tool-use agent loops, YAML agent config, per-user conversation history, LLM function calling
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Single `agents.yaml` file for all agents (ClickUp pattern)
- Global defaults section — agents inherit and can override
- Extended fields: model, prompt_file, tools, max_iterations, timeout_seconds, temperature, description, fallback_behavior, context_sources
- Model is configurable per-agent
- Tool schemas defined fully in YAML (name, description, parameters JSON Schema) — not just tool names
- Config loaded once at startup — no hot-reload
- context_sources field per agent controls what data each agent receives
- Routing: auto-generated base routing table from agents.yaml descriptions + hand-written nuance in orchestrator.md
- Typing indicator + brief status message for operations >5s; status message replaced by final answer
- Brief tool activity indicators during execution (e.g., "Searching deals..." / "Found 3 deals")
- Max iterations failure → error signal back to orchestrator; orchestrator decides: retry, try different agent, or answer directly
- Direct agent-to-agent calls supported (agents have invoke_* tools for other specialists)
- Confirmation-first writes: agent returns confirmation payload; handler renders inline keyboard; actual API call happens on Confirm tap — outside the loop
- Per-user processing lock with latest-wins queueing
- Conversation history: sliding window, configurable size (default 20 messages)
- Hybrid persistence: in-memory dict[user_id, deque] + async background flush to InsForge for durability; on restart, load last N turns from DB
- Timestamps on every turn — stale context can be filtered
- Full turns stored: user message + tool calls + tool results + assistant response
- Time-based sessions: after N hours of inactivity, detect new session; offer bridge summary or start fresh

### Claude's Discretion

- Prompt file location (data/ vs bot/agents/config/)
- Agent naming convention in YAML
- Prompt templating approach ({{token}} vs Jinja2 vs f-strings)
- Streaming vs complete response
- Knowledge distribution across agents
- Error handling in tool execution (retry strategy, circuit breaking)
- Token budget management

### Deferred Ideas (OUT OF SCOPE)

- Token budget per agent turn (cost explosion prevention) — Phase 5 or Phase 9
- Error handling and circuit breaker patterns for tool execution — specialist agent phases (4-6)
- Agent hot-reload for development iteration
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NLR-03 | Conversation history persists across messages within a session (sliding window per user) | Hybrid in-memory + InsForge persistence pattern documented; ConversationHistoryService design ready; `conversation_history` InsForge table schema identified |
</phase_requirements>

---

## Summary

Phase 3 builds the shared foundation all specialist agents depend on: a `ToolUseAgent` base class that executes OpenAI-compatible tool-use loops, an `agents.yaml` config system, an extended `LLMProvider.complete_with_tools()` method, and a `ConversationHistoryService` for per-user sliding-window history with hybrid memory/InsForge persistence.

The existing codebase is well-prepared. The `BaseAgent` ABC, `AgentRegistry`, `PipelineRunner`, and `TraceCollector` from Phase 1 are all reusable anchors. The `LLMProvider` abstraction (`llm_router.py`) needs one new method: `complete_with_tools()`. OpenRouter uses the OpenAI-compatible tool-calling format (tools array, `finish_reason=tool_calls`, `role=tool` results), which is verified via official docs.

The primary architectural challenge is the tool-use loop itself: detect `finish_reason=tool_calls`, execute the tool locally, append the tool result to the message history, call the LLM again, and repeat until `finish_reason=stop` or `max_iterations` is exhausted. All iterations must participate in the existing `@traced_span` tracing infrastructure.

**Primary recommendation:** Build `ToolUseAgent` as a new `BaseAgent` subclass (not replacement) that encapsulates the loop logic. The `complete_with_tools()` method on `OpenRouterProvider` handles the raw API call; the loop logic lives in `ToolUseAgent.run()`. Config is loaded from `agents.yaml` at startup alongside the existing pipeline YAML system.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pyyaml | >=6.0.1 (already in requirements.txt) | Load agents.yaml config | Already in use for pipeline YAML; consistent pattern |
| pydantic v2 | >=2.6.0 (already in requirements.txt) | Validate AgentConfig from YAML, ConversationTurn models | Already in use; runtime type safety |
| httpx | >=0.27.0 (already in requirements.txt) | OpenRouter API calls for tool-use | Already in use; async HTTP |
| collections.deque | stdlib | Sliding window in-memory conversation history | O(1) append/pop, maxlen enforces window size |
| asyncio | stdlib | Per-user processing lock, background flush tasks | Already used throughout codebase |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| json | stdlib | Parse tool call arguments (tool_call.function.arguments is a JSON string) | Every tool invocation in the loop |
| asyncio.Lock / asyncio.Event | stdlib | Per-user processing lock for latest-wins queueing | In the message handler, not in the agent itself |
| datetime/timezone | stdlib | Timestamps on every conversation turn for staleness detection | ConversationTurn model |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| In-memory deque + background flush | Redis | Redis adds infra dependency; deque+InsForge sufficient for single-process bot |
| Custom YAML config loader | LangChain agent config | LangChain is a massive dependency; hand-rolled YAML is 50 lines and fully transparent |
| f-string prompt templates | Jinja2 | Jinja2 adds dependency and learning curve; f-strings/str.replace() are sufficient for structured placeholder substitution |

**Installation:** No new dependencies required. All needed libraries are already in `requirements.txt`.

---

## Architecture Patterns

### Recommended Project Structure

```
bot/
├── agents/
│   ├── base.py              # Existing BaseAgent ABC — no changes needed
│   ├── registry.py          # Existing AgentRegistry — no changes needed
│   ├── tool_use_agent.py    # NEW: ToolUseAgent base class (the loop)
│   └── ...existing agents...
├── services/
│   ├── conversation_history.py  # NEW: ConversationHistoryService
│   └── ...existing services...
└── storage/
    ├── models.py            # ADD: ConversationTurnModel
    └── repositories.py      # ADD: ConversationHistoryRepo

data/
└── agents.yaml              # NEW: agent config (alongside pipelines/)

bot/services/llm_router.py   # ADD: complete_with_tools() to OpenRouterProvider
```

---

### Pattern 1: agents.yaml Config Structure

**What:** Single YAML file declaring all agent configs, loaded at startup into Pydantic models.
**When to use:** Any time an agent needs to be instantiated from config (which is all of Phase 3+).

```yaml
# data/agents.yaml

defaults:
  model: openai/gpt-oss-120b
  max_iterations: 10
  timeout_seconds: 60
  temperature: 0.7
  fallback_behavior: return_error

agents:
  deal_agent:
    description: "Manages deals: create, query, update stage, log notes"
    prompt_file: prompts/deal_agent.md
    model: openai/gpt-oss-120b  # inherits from defaults, shown explicitly
    max_iterations: 8
    timeout_seconds: 45
    context_sources:
      - conversation_history
      - memory
    tools:
      - name: query_deals
        description: "Query active deals for the current user"
        parameters:
          type: object
          properties:
            status_filter:
              type: string
              enum: [active, all, at_risk]
              description: "Filter deals by status"
          required: []
      - name: create_deal
        description: "Create a new deal (requires confirmation before execution)"
        parameters:
          type: object
          properties:
            name: {type: string, description: "Deal or prospect name"}
            value: {type: number, description: "Deal value in USD"}
            stage: {type: string, enum: [lead, qualified, proposal, negotiation]}
          required: [name]

  coach_agent:
    description: "Sales coaching: objection handling, practice, skill assessment"
    prompt_file: prompts/coach_agent.md
    max_iterations: 5
    context_sources:
      - conversation_history
      - memory
      - knowledge
    tools:
      - name: start_practice_scenario
        description: "Begin an objection handling practice session"
        parameters:
          type: object
          properties:
            topic: {type: string, description: "e.g. cold calling, pricing objections"}
          required: []
```

**Pydantic models for loading:**

```python
# bot/agents/tool_use_agent.py

from pydantic import BaseModel
from typing import Any

class ToolParam(BaseModel):
    name: str
    description: str
    parameters: dict[str, Any]  # JSON Schema object

class AgentConfig(BaseModel):
    name: str  # injected from the YAML key
    description: str = ""
    prompt_file: str = ""
    model: str = "openai/gpt-oss-120b"
    max_iterations: int = 10
    timeout_seconds: int = 60
    temperature: float = 0.7
    fallback_behavior: str = "return_error"
    context_sources: list[str] = []
    tools: list[ToolParam] = []

class AgentsConfig(BaseModel):
    defaults: dict[str, Any] = {}
    agents: dict[str, AgentConfig] = {}
```

**Loading (in main.py or a config loader):**

```python
import yaml
from pathlib import Path

def load_agents_config() -> AgentsConfig:
    path = Path("data/agents.yaml")
    raw = yaml.safe_load(path.read_text())
    defaults = raw.get("defaults", {})
    agents = {}
    for name, cfg in raw.get("agents", {}).items():
        merged = {**defaults, **cfg, "name": name}
        agents[name] = AgentConfig(**merged)
    return AgentsConfig(defaults=defaults, agents=agents)
```

---

### Pattern 2: complete_with_tools() on OpenRouterProvider

**What:** New method on OpenRouterProvider that sends a single API call with tools and returns either a text response or tool call data. The loop logic stays in ToolUseAgent, not here.
**When to use:** Every iteration of the tool-use loop.

```python
# bot/services/llm_router.py — add to OpenRouterProvider

from dataclasses import dataclass
from typing import Union

@dataclass
class TextResponse:
    content: str

@dataclass
class ToolCallResponse:
    tool_call_id: str
    tool_name: str
    tool_args: dict[str, Any]  # already JSON-parsed
    raw_message: dict[str, Any]  # full assistant message for history

@traced_span("llm:openrouter:tools")
async def complete_with_tools(
    self,
    system_prompt: str,
    messages: list[dict[str, Any]],  # full conversation history
    tools: list[dict[str, Any]],     # OpenAI tool schema format
    *,
    temperature: float = 0.7,
    max_tokens: int = 4096,
) -> Union[TextResponse, ToolCallResponse]:
    """Single LLM call with tool definitions. Returns text OR tool call."""
    import asyncio, json

    payload = {
        "model": self.model,
        "messages": [{"role": "system", "content": system_prompt}] + messages,
        "tools": tools,
        "tool_choice": "auto",
        "max_tokens": max_tokens,
        "temperature": temperature,
    }

    for attempt in range(MAX_RETRIES):
        try:
            resp = await self._client.post("/chat/completions", json=payload)
            resp.raise_for_status()
            data = resp.json()
            choice = data["choices"][0]
            message = choice["message"]
            finish_reason = choice.get("finish_reason", "stop")

            if finish_reason == "tool_calls" and message.get("tool_calls"):
                tc = message["tool_calls"][0]  # handle first tool call
                return ToolCallResponse(
                    tool_call_id=tc["id"],
                    tool_name=tc["function"]["name"],
                    tool_args=json.loads(tc["function"]["arguments"]),
                    raw_message=message,
                )
            else:
                content = message.get("content", "")
                return TextResponse(content=content)

        except httpx.HTTPStatusError as e:
            if e.response.status_code in (429, 500, 502, 503) and attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAYS[attempt])
                continue
            raise

    return TextResponse(content="[Error: max retries exceeded]")
```

---

### Pattern 3: ToolUseAgent — The Loop

**What:** BaseAgent subclass that runs the tool-use loop using `complete_with_tools()`. Executes tools via a dispatch dict. Enforces max_iterations. Wires tracing on each iteration.
**When to use:** Every specialist agent in Phase 4+ subclasses this.

```python
# bot/agents/tool_use_agent.py

import asyncio
import logging
from typing import Any, Callable, Awaitable

from bot.agents.base import AgentInput, AgentOutput, BaseAgent
from bot.agents.tool_use_agent import AgentConfig, ToolCallResponse, TextResponse
from bot.pipeline.context import PipelineContext
from bot.tracing import traced_span

logger = logging.getLogger(__name__)

# Type alias for tool implementations
ToolHandler = Callable[[dict[str, Any]], Awaitable[Any]]


class ToolUseAgent(BaseAgent):
    """Base class for agents that use tool-use loops.

    Subclasses register tools and implement the loop via self.run_tool_loop().
    """

    def __init__(self, config: AgentConfig) -> None:
        self.config = config
        self._tool_handlers: dict[str, ToolHandler] = {}
        self._system_prompt: str = ""
        if config.prompt_file:
            from pathlib import Path
            p = Path(config.prompt_file)
            if p.exists():
                self._system_prompt = p.read_text(encoding="utf-8")

    @property
    def name(self) -> str:
        return self.config.name

    def register_tool(self, name: str, handler: ToolHandler) -> None:
        """Register a callable handler for a tool name."""
        self._tool_handlers[name] = handler

    @traced_span("agent:tool_use_loop")
    async def run_tool_loop(
        self,
        messages: list[dict[str, Any]],
        pipeline_ctx: PipelineContext,
        *,
        system_prompt: str | None = None,
    ) -> str:
        """Execute the tool-use loop. Returns final text response."""
        prompt = system_prompt or self._system_prompt
        tools = self._build_tool_schemas()
        history = list(messages)
        max_iter = self.config.max_iterations

        for iteration in range(max_iter):
            result = await pipeline_ctx.llm.complete_with_tools(
                system_prompt=prompt,
                messages=history,
                tools=tools,
                temperature=self.config.temperature,
            )

            if isinstance(result, TextResponse):
                return result.content

            if isinstance(result, ToolCallResponse):
                # Append assistant message with tool_call to history
                history.append(result.raw_message)

                # Execute tool
                tool_result = await self._execute_tool(result, pipeline_ctx)

                # Append tool result message to history
                history.append({
                    "role": "tool",
                    "tool_call_id": result.tool_call_id,
                    "content": str(tool_result),
                })

        # Max iterations exhausted
        logger.warning(
            "Agent %s hit max_iterations=%d — returning error signal",
            self.name,
            max_iter,
        )
        raise RuntimeError(f"Agent {self.name} exceeded max_iterations={max_iter}")

    async def _execute_tool(
        self, tool_call: ToolCallResponse, pipeline_ctx: PipelineContext
    ) -> Any:
        """Dispatch tool call to registered handler."""
        handler = self._tool_handlers.get(tool_call.tool_name)
        if not handler:
            return f"[Error: unknown tool '{tool_call.tool_name}']"
        try:
            return await handler(tool_call.tool_args)
        except Exception as e:
            logger.error("Tool %s failed: %s", tool_call.tool_name, e)
            return f"[Error executing {tool_call.tool_name}: {e}]"

    def _build_tool_schemas(self) -> list[dict[str, Any]]:
        """Convert AgentConfig tools to OpenAI-format tool defs."""
        return [
            {
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.parameters,
                },
            }
            for t in self.config.tools
        ]
```

---

### Pattern 4: ConversationHistoryService (NLR-03)

**What:** Manages per-user sliding window conversation history. In-memory deque for speed; async background flush to InsForge for durability. Loads from DB on restart.
**When to use:** Before every agent call to get context; after every complete turn to append.

```python
# bot/services/conversation_history.py

import asyncio
from collections import deque
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel


class ConversationTurn(BaseModel):
    """One complete interaction turn."""
    role: str  # "user" | "assistant" | "tool"
    content: str
    timestamp: str  # ISO 8601 UTC
    tool_calls: list[dict[str, Any]] | None = None
    tool_call_id: str | None = None


class ConversationHistoryService:
    """Per-user sliding window conversation history.

    Hybrid persistence: in-memory deque (fast reads) +
    background InsForge flush (durability across restarts).
    """

    def __init__(
        self,
        history_repo: Any,  # ConversationHistoryRepo
        *,
        window_size: int = 20,
        flush_interval: float = 30.0,
        session_timeout_hours: float = 4.0,
    ) -> None:
        self._repo = history_repo
        self._window = window_size
        self._flush_interval = flush_interval
        self._session_timeout_hours = session_timeout_hours
        # user_id -> deque[ConversationTurn]
        self._cache: dict[int, deque[ConversationTurn]] = {}
        self._dirty: set[int] = set()  # users with unflushed changes
        self._flush_task: asyncio.Task | None = None

    async def start(self) -> None:
        self._flush_task = asyncio.create_task(self._flush_loop())

    async def stop(self) -> None:
        if self._flush_task:
            self._flush_task.cancel()
        await self._flush_all()

    def get_messages(self, user_id: int) -> list[dict[str, Any]]:
        """Return conversation history as OpenAI-format message list."""
        turns = self._cache.get(user_id, deque())
        return [self._turn_to_message(t) for t in turns]

    async def load_from_db(self, user_id: int) -> None:
        """Load last N turns from InsForge (called on first access after restart)."""
        if user_id in self._cache:
            return
        turns = await self._repo.get_recent(user_id, limit=self._window)
        self._cache[user_id] = deque(turns, maxlen=self._window)

    def append_turn(self, user_id: int, turn: ConversationTurn) -> None:
        """Add a turn to the sliding window."""
        if user_id not in self._cache:
            self._cache[user_id] = deque(maxlen=self._window)
        self._cache[user_id].append(turn)
        self._dirty.add(user_id)

    def clear_session(self, user_id: int) -> None:
        """Clear history for /clear command or new session start."""
        self._cache.pop(user_id, None)
        self._dirty.add(user_id)

    def detect_new_session(self, user_id: int) -> bool:
        """True if last turn was more than session_timeout_hours ago."""
        turns = self._cache.get(user_id)
        if not turns:
            return False
        last = turns[-1]
        try:
            last_dt = datetime.fromisoformat(last.timestamp)
            delta = datetime.now(timezone.utc) - last_dt
            return delta.total_seconds() > self._session_timeout_hours * 3600
        except (ValueError, TypeError):
            return False

    def _turn_to_message(self, turn: ConversationTurn) -> dict[str, Any]:
        msg: dict[str, Any] = {"role": turn.role, "content": turn.content}
        if turn.tool_calls:
            msg["tool_calls"] = turn.tool_calls
        if turn.tool_call_id:
            msg["tool_call_id"] = turn.tool_call_id
        return msg

    async def _flush_loop(self) -> None:
        while True:
            await asyncio.sleep(self._flush_interval)
            await self._flush_all()

    async def _flush_all(self) -> None:
        dirty = list(self._dirty)
        self._dirty.clear()
        for user_id in dirty:
            turns = list(self._cache.get(user_id, []))
            await self._repo.save_turns(user_id, turns)
```

**InsForge table for conversation history:**

```sql
-- New migration: conversation_history table
CREATE TABLE conversation_history (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL,           -- InsForge user id
    telegram_id BIGINT NOT NULL,
    role        TEXT NOT NULL,             -- user | assistant | tool
    content     TEXT NOT NULL,
    tool_calls  JSONB,                     -- assistant tool_calls array
    tool_call_id TEXT,                     -- for role=tool messages
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_conv_history_user_ts ON conversation_history(telegram_id, timestamp DESC);
```

---

### Pattern 5: Per-User Processing Lock (latest-wins)

**What:** asyncio-based per-user lock that cancels in-flight requests when a new message arrives. Prevents race conditions without blocking new messages.
**When to use:** In the aiogram message handler that routes to ToolUseAgent.

```python
# In the message handler (NOT in the agent itself)

import asyncio
from typing import Any

# Module-level state
_user_tasks: dict[int, asyncio.Task[Any]] = {}

async def handle_message(message: Message, **deps) -> None:
    user_id = message.from_user.id

    # Cancel any in-flight task for this user
    existing = _user_tasks.get(user_id)
    if existing and not existing.done():
        existing.cancel()
        try:
            await existing
        except asyncio.CancelledError:
            pass

    # Start new task
    task = asyncio.create_task(_process_message(message, **deps))
    _user_tasks[user_id] = task
    try:
        await task
    except asyncio.CancelledError:
        pass  # superseded by newer message
    finally:
        if _user_tasks.get(user_id) is task:
            del _user_tasks[user_id]
```

---

### Anti-Patterns to Avoid

- **Putting loop logic in `complete_with_tools()`:** The provider method does ONE API call and returns. The loop is in `ToolUseAgent`. Clear separation of concerns.
- **Storing full conversation history in PipelineContext:** PipelineContext is per-pipeline-run. Conversation history is per-user-session. Use `ConversationHistoryService` injected via DI.
- **Loading tools from code, not YAML:** Tool schemas must come from agents.yaml so they can be changed without code changes.
- **Not including `tools` in follow-up requests:** OpenRouter requires the `tools` array in every request in a tool-use conversation, not just the first one. Omitting it causes schema validation errors.
- **Using `asyncio.Lock` for per-user locks:** A standard Lock would block the new message waiting for the old one to finish. Latest-wins requires cancelling the old task, which needs task cancellation, not a lock.
- **Parsing tool arguments as raw string:** `tool_call.function.arguments` is a JSON string — always `json.loads()` it before passing to the handler.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON Schema for tool parameters | Custom validation | pydantic / stdlib json | Tool parameters are already JSON Schema; pydantic validates the config model, not runtime args |
| Conversation window truncation | Manual list slicing | `collections.deque(maxlen=N)` | deque handles maxlen automatically; thread-safe append/pop |
| Retry logic for LLM calls | Custom retry loop | Existing `MAX_RETRIES / RETRY_DELAYS` in llm_router.py | Already proven; just add `complete_with_tools()` using the same pattern |
| Tracing for tool-use spans | New tracer | `@traced_span` from `bot.tracing` | Phase 1 infra; just decorate `run_tool_loop` and `complete_with_tools` |

**Key insight:** The hardest parts of tool-use loops (retry, backoff, JSON parsing, tracing) are already solved. This phase wires them together in a new shape, not from scratch.

---

## Common Pitfalls

### Pitfall 1: Infinite Tool-Use Loop
**What goes wrong:** Agent keeps calling tools; never reaches `finish_reason=stop`.
**Why it happens:** Poorly constrained tool definitions, or LLM doesn't know when to stop.
**How to avoid:** `max_iterations` is non-negotiable — fail loudly when hit. Log every iteration. Tool descriptions should include when NOT to use the tool.
**Warning signs:** Iteration counter climbing in logs; user sees "Still working..." indefinitely.

### Pitfall 2: Conversation History Growing Without Bound
**What goes wrong:** In-memory dict grows unbounded as users accumulate. Bot restarts lose all history.
**Why it happens:** Using a plain list instead of deque; forgetting to flush to InsForge.
**How to avoid:** Always use `deque(maxlen=N)`; verify flush is actually writing to InsForge in integration test. On startup, call `load_from_db()` before first agent invocation.
**Warning signs:** Memory creep on Railway; fresh-start conversations after deploy.

### Pitfall 3: Missing `tools` in Follow-Up Requests
**What goes wrong:** Second API call (after tool result) fails with OpenRouter schema error or model ignores tools.
**Why it happens:** Copying request structure without the tools array for the second call.
**How to avoid:** `complete_with_tools()` always includes the `tools` parameter — it's built from config, not from message history.
**Warning signs:** 422 error from OpenRouter on second call; `finish_reason` always `stop` even when tool calls expected.

### Pitfall 4: Race Condition When User Sends Multiple Messages
**What goes wrong:** Two concurrent agent invocations for the same user write to shared state (history, DB) in conflicting order.
**Why it happens:** Not implementing per-user processing lock.
**How to avoid:** Implement latest-wins task cancellation pattern in the message handler before any agent is invoked.
**Warning signs:** Out-of-order history entries; duplicate DB writes.

### Pitfall 5: Confirmation-First Writes Completing Inside the Loop
**What goes wrong:** A write tool (create_deal, update_stage) executes immediately inside the tool-use loop instead of returning a confirmation payload.
**Why it happens:** Tool handler performs the DB write directly.
**How to avoid:** Write tool handlers return `{"action": "confirm", "payload": {...}}` — the actual DB call happens in the aiogram callback handler when user taps Confirm. The agent loop receives and presents the confirmation, then ends.
**Warning signs:** Deals created without user seeing a confirmation dialog.

### Pitfall 6: System Prompt Token Explosion
**What goes wrong:** 70K token playbook injected into every tool-use loop turn.
**Why it happens:** Copying the existing context-stuffing pattern from StrategistAgent into every new agent.
**How to avoid:** `context_sources` in agents.yaml controls what each agent receives. Only the Strategy agent gets full playbook. Deal agent gets deal schema + recent deals only. The system prompt is assembled once per loop, not per iteration.
**Warning signs:** Slow responses, high token costs, OpenRouter context limit errors.

---

## Code Examples

### How Tool Call History is Built

```python
# Source: OpenRouter official docs (https://openrouter.ai/docs/guides/features/tool-calling)
# Adapted for this project's patterns

# Initial messages list (from ConversationHistoryService)
messages = history_service.get_messages(user_id)
# e.g. [{"role": "user", "content": "What's the status of my Acme deal?"}]

# After model returns ToolCallResponse:
messages.append(result.raw_message)
# e.g. {"role": "assistant", "tool_calls": [{"id": "call_abc", "function": {"name": "query_deals", "arguments": "{\"status_filter\": \"active\"}"}}]}

# After executing tool:
messages.append({
    "role": "tool",
    "tool_call_id": "call_abc",
    "content": json.dumps({"deals": [{"name": "Acme", "stage": "proposal", "value": 50000}]}),
})

# Next LLM call sees full context and returns TextResponse with final answer
```

### How agents.yaml Defaults Merge Works

```python
# Source: project pattern — same merge approach as ClickUp hierarchy.yaml
raw = yaml.safe_load(path.read_text())
defaults = raw.get("defaults", {})
agents = {}
for name, cfg in raw.get("agents", {}).items():
    # Agent-level values override defaults
    merged = {**defaults, **cfg, "name": name}
    agents[name] = AgentConfig(**merged)
```

### How ToolUseAgent is Registered in main.py

```python
# Alongside existing agent registry pattern
from bot.agents.tool_use_agent import ToolUseAgent, load_agents_config

agents_config = load_agents_config()
for name, agent_cfg in agents_config.agents.items():
    agent = ToolUseAgent(agent_cfg)
    # Subclass-specific tool handlers registered here in Phase 4-6
    agent_registry.register(agent)

# ConversationHistoryService injected via workflow_data
dp.workflow_data["history_service"] = history_service
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Function calling as JSON structured output | Native tool_calls in message format | OpenAI API 2023, adopted by OpenRouter | More reliable: no JSON extraction hacks needed |
| Storing full conversation in FSM state | Sliding window + DB flush | Became standard for production bots ~2024 | Bounded memory, survives restarts |
| Per-request context stuffing (70K tokens) | context_sources per agent | Standard since GPT-4 multi-agent patterns | Cost control, faster routing calls |

**Deprecated/outdated:**
- `_extract_json()` function in `llm_router.py`: Needed for current `complete()` method which forces JSON output. Not needed for `complete_with_tools()` — the response is either `content` (text) or structured `tool_calls` with JSON arguments parsed by stdlib `json`. The `complete_with_tools()` method doesn't use `_extract_json()`.

---

## Open Questions

1. **Where does the conversation_history table live in InsForge migrations?**
   - What we know: We need a new `conversation_history` table. Migration pattern exists in `migrations/` and `insforge/migrations/`.
   - What's unclear: Which migration directory is the right one — `migrations/` (core bot data) or `insforge/migrations/` (observability). Core bot data pattern implies `migrations/`.
   - Recommendation: Add to `migrations/` as `002_conversation_history.sql`.

2. **Does OpenRouter enforce `tools` must be non-empty or can we omit it for plain text calls?**
   - What we know: Official docs say "include tools in every request in a tool-use conversation." For non-tool calls (plain LLM), the existing `complete()` method is used unchanged.
   - What's unclear: Whether sending `tools: []` causes errors or if we should branch.
   - Recommendation: Use `complete()` for non-tool agents, `complete_with_tools()` only when tools are configured. The `context_sources` field already distinguishes agents.

3. **Railway restart frequency: does it justify loading history from DB on every message vs on first access?**
   - What we know: STATE.md notes "Assess Railway restart frequency — if high, conversation history needs InsForge persistence." Hybrid approach already decided.
   - What's unclear: Actual Railway restart cadence.
   - Recommendation: Load from DB on first access per user (lazy load) is the right approach regardless — it's already the plan.

4. **Session summary generation for "Last time we discussed X" bridge prompt**
   - What we know: The session bridge is a key UX moment (from CONTEXT.md). Detection via timestamp comparison is clear.
   - What's unclear: Who generates the summary — a quick LLM call, or truncated last assistant message?
   - Recommendation: Simplest viable: use the last assistant message content, truncated to 100 chars, as the bridge summary. Avoids extra LLM call. Can be upgraded later.

---

## Sources

### Primary (HIGH confidence)
- OpenRouter official docs — tool calling guide (https://openrouter.ai/docs/guides/features/tool-calling) — request/response format, tool_choice, tool result messages, tools-in-every-request requirement
- `bot/services/llm_router.py` — existing OpenRouterProvider pattern (httpx, retry, @traced_span)
- `bot/agents/base.py` — BaseAgent ABC, AgentInput/AgentOutput
- `bot/tracing/context.py` — traced_span decorator, TraceContext
- `bot/tracing/collector.py` — TraceCollector batched flush pattern (reused for conversation history flush)
- `bot/pipeline/config_loader.py` — YAML loading pattern with Pydantic
- `bot/main.py` — DI wiring pattern (workflow_data)

### Secondary (MEDIUM confidence)
- ClickUp MCP reference bot (`/Users/dmytrolevin/Desktop/clickup mcp/`) — agents.yaml pattern, confirmation-first CRM writes, per-user queueing concept
- Python stdlib `collections.deque` docs — maxlen behavior for sliding window

### Tertiary (LOW confidence)
- Railway restart frequency assumption (LOW — not verified against actual Railway logs; hybrid persistence is the right approach regardless)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use; no new dependencies
- Architecture patterns: HIGH — verified against OpenRouter official docs and existing codebase patterns
- Tool-use loop: HIGH — verified request/response format from OpenRouter docs
- Conversation history: HIGH — deque+flush pattern well-established; table schema is straightforward
- Pitfalls: HIGH — most derived from the codebase's own patterns and verified API behavior

**Research date:** 2026-02-25
**Valid until:** 2026-08-25 (stable domain — OpenRouter tool calling format is unlikely to change; 6 months)
