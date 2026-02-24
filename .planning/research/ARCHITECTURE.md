# Architecture Patterns: Multi-Agent Orchestrator for aiogram Bot

**Domain:** Multi-agent AI sales partner — Python/aiogram 3 Telegram bot
**Researched:** 2026-02-24
**Confidence:** HIGH (reference architecture directly examined, aiogram 3 patterns from production codebase)

---

## Executive Summary

This document describes how to integrate a multi-agent orchestrator system into the existing Deal Quest Bot v1.0 aiogram 3 architecture. The reference TypeScript implementation at `/Users/dmytrolevin/Desktop/clickup mcp/` provides a proven, working pattern that maps cleanly to Python. The core integration challenge is routing: the existing bot uses FSM states per command; the new system needs a catch-all natural language handler that runs before FSM state handlers but after command handlers.

The recommended approach preserves all existing /command behavior unchanged while adding a new `natural_language` Router registered after existing routers, using an in-process `Orchestrator` class that holds per-chat conversation history, runs a tool-use loop against OpenRouter, and dispatches to specialist agents that receive tool-call requests from the orchestrator LLM.

---

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AIOGRAM DISPATCHER                                │
│  Router priority (top = first match wins):                               │
│                                                                          │
│  1. start.router    — /start, /cancel, /help                            │
│  2. support.router  — /support + SupportState FSM                       │
│  3. learn.router    — /learn + LearnState FSM                           │
│  4. train.router    — /train + TrainState FSM                           │
│  5. leads.router    — /leads + inline callbacks                         │
│  6. stats.router    — /stats                                            │
│  7. settings.router — /settings + SettingsState FSM                     │
│  8. admin.router    — /admin + admin callbacks                          │
│  9. natural_language.router  ← NEW: catches all remaining text/voice   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    (unmatched text/voice messages)
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    NaturalLanguageHandler                                │
│  bot/handlers/natural_language.py                   NEW FILE            │
│                                                                          │
│  • Per-chat processing lock (Set[int])                                  │
│  • Per-chat message queue (latest-wins Map)                             │
│  • Voice → AssemblyAI transcription (reuse TranscriptionService)       │
│  • Photo → base64 encode + pass to orchestrator                        │
│  • Typing indicator loop (every 4s via asyncio.create_task)            │
│  • Calls Orchestrator.process_message() / .process_multimodal()        │
│  • Renders OrchestratorResponse: text, confirmation keyboard, error     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                         Orchestrator                                     │
│  bot/agents/orchestrator.py                         NEW FILE            │
│                                                                          │
│  • Singleton (module-level, initialized at startup)                     │
│  • Loads agents.yaml config (orchestrator entry)                        │
│  • Loads prompts/orchestrator.md prompt template                        │
│  • Builds AgentContext (user memory, knowledge, conversation history)   │
│  • Maintains per-chat ConversationHistory (sliding window, in-memory)   │
│  • Runs orchestrator tool-use loop (LLM → tool calls → results → LLM)  │
│  • Tool calls are invoke_* functions → dispatch to specialist agents    │
│  • Returns OrchestratorResponse to handler                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ↓               ↓               ↓
        invoke_deal_agent  invoke_coach_agent  invoke_strategy_agent
                    │               │               │
                    ↓               ↓               ↓
┌───────────────────────────────────────────────────────────────────────┐
│                     Specialist Agents (NEW)                            │
│                                                                        │
│  DealAgent        CoachAgent        StrategyAgent    MemoryAgent*      │
│  (deal ops)       (training/        (analysis +      (exists in v1,    │
│                    coaching)         call prep)        extend)          │
│                                                                        │
│  Each extends new ToolUseAgent base class (replaces old BaseAgent ABC) │
│  Each has own tool registry + tool-use loop                            │
│  Each reads config from agents.yaml                                    │
│  Each loads prompt from prompts/{agent}.md                             │
└───────────────────────────────────────────────────────────────────────┘
                    │
                    ↓ (CRM tools)
┌───────────────────────────────────────────────────────────────────────┐
│                      Tool Registry + Tools                             │
│  bot/agents/tools/                              NEW DIRECTORY          │
│                                                                        │
│  deal_tools.py   — create_deal, update_deal, list_deals, add_note     │
│  coach_tools.py  — start_practice, score_response, get_scenario       │
│  strategy_tools  — analyze_deal, prep_call, competitive_intel          │
│  memory_tools.py — get_user_memory, update_user_memory                │
│                                                                        │
│  All tools are async Python functions → InsForge repos                 │
│  Tool results are JSON strings (OpenAI function calling format)        │
└───────────────────────────────────────────────────────────────────────┘
                    │
                    ↓
┌───────────────────────────────────────────────────────────────────────┐
│               InsForge Storage + New CRM Tables                       │
│                                                                        │
│  EXISTING:  users, user_memory, attempts, support_sessions            │
│             pipeline_traces, pipeline_spans, lead_registry            │
│                                                                        │
│  NEW:       deals, deal_notes, conversation_history                   │
│             (conversation_history optional — can use in-memory first) │
└───────────────────────────────────────────────────────────────────────┘
                    │
                    ↓ (background)
┌───────────────────────────────────────────────────────────────────────┐
│              Proactive Messaging (Scheduler)                           │
│  bot/services/proactive.py                          NEW FILE           │
│                                                                        │
│  • Daily briefing: asyncio task, fires at 8am user-time               │
│  • Context triggers: hook in DealAgent/deal tools after mutations     │
│  • Uses existing bot instance (passed at startup)                     │
│  • Reuses existing followup_scheduler pattern                         │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

| Component | File | Responsibility | Communicates With |
|-----------|------|---------------|-------------------|
| NaturalLanguageHandler | `bot/handlers/natural_language.py` | Catch-all for non-command messages. Handles voice/photo/text routing. Per-chat lock + queue. | Orchestrator, TranscriptionService, ConversationHistory |
| Orchestrator | `bot/agents/orchestrator.py` | LLM routing loop. Builds context. Routes to specialists via invoke_* tool calls. Manages conversation history. | ToolUseAgent subclasses, ConversationHistory, AgentContext builder |
| ToolUseAgent (base) | `bot/agents/tool_use_agent.py` | New base class replacing old BaseAgent ABC for agent-level tool-use loops. Runs iterations: LLM call → tool execution → append results → repeat. | ToolRegistry, LLM router (OpenRouter direct calls) |
| DealAgent | `bot/agents/deal_agent.py` | CRM operations: create/update/list deals, add notes. Raises confirmation payloads for mutating ops. | DealRepo, DealNoteRepo, deal_tools.py |
| CoachAgent | `bot/agents/coach_agent.py` | Wraps existing TrainerAgent pipelines. Handles practice sessions, scenario scoring, skill assessments. | PipelineRunner (existing), AttemptRepo |
| StrategyAgent | `bot/agents/strategy_agent.py` | Wraps existing StrategistAgent pipeline. Call prep, competitive intel, deal analysis. | PipelineRunner (existing), DealRepo |
| MemoryAgent | `bot/agents/memory.py` | MODIFIED: extend to handle inactivity-triggered memory consolidation after conversation sessions. | UserMemoryRepo (existing) |
| ToolRegistry | `bot/agents/tool_registry.py` | Maps tool name → async callable. Agents look up tools by name. | All tool modules |
| deal_tools.py | `bot/agents/tools/deal_tools.py` | Async tool functions: create_deal, update_deal, list_deals, get_deal, add_note | DealRepo, DealNoteRepo |
| ConversationHistory | `bot/services/conversation_history.py` | In-memory per-chat sliding window. Stores message dicts in OpenAI format. | Orchestrator |
| AgentContext builder | `bot/agents/context_builder.py` | Assembles context for every orchestrator call: user memory, knowledge base, deal context, conversation history | UserMemoryRepo, DealRepo, KnowledgeService |
| ProactiveService | `bot/services/proactive.py` | Daily briefing scheduler. Context-triggered nudges (deal staleness, streak break). | Bot instance, DealRepo, UserMemoryRepo |
| agents.yaml | `data/agents.yaml` | YAML config: model, prompt_file, tools list, max_iterations per agent | Config loader |
| DealModel | `bot/storage/models.py` | MODIFIED: add DealModel, DealNoteModel | InsForge |
| DealRepo, DealNoteRepo | `bot/storage/repositories.py` | MODIFIED: add repo classes | InsForge |

---

## Pattern 1: The Tool-Use Loop (Core Pattern)

**What:** Iterative LLM call cycle where the model can invoke tools before giving a final answer.

**How it works in Python (adapted from TypeScript reference):**

```python
# bot/agents/tool_use_agent.py

from __future__ import annotations
import json
import logging
from dataclasses import dataclass, field
from typing import Any
import httpx

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

@dataclass
class ToolCallRecord:
    tool_name: str
    input: dict[str, Any]
    output: str

@dataclass
class AgentResult:
    content: str
    confirmation_payload: dict[str, Any] | None = None
    tool_call_history: list[ToolCallRecord] = field(default_factory=list)


class ToolUseAgent:
    """Base class for all v2 agents with tool-use loop capability."""

    name: str = "base"

    def __init__(self, agent_name: str, config: dict, tools: dict[str, Any]) -> None:
        self.agent_name = agent_name
        self.config = config          # from agents.yaml: model, max_iterations, prompt_file
        self.tools = tools            # name -> async callable
        self._system_prompt: str = "" # loaded from prompts/{agent_name}.md

    def load_prompt(self) -> str:
        """Load system prompt from prompts/ directory."""
        import pathlib
        prompt_path = pathlib.Path(__file__).parent.parent.parent / "prompts" / self.config["prompt_file"]
        if prompt_path.exists():
            return prompt_path.read_text()
        logger.warning("[%s] Prompt file not found: %s", self.agent_name, prompt_path)
        return f"You are the {self.agent_name} agent."

    async def _call_openrouter(
        self,
        messages: list[dict],
        tools_schema: list[dict],
        api_key: str,
    ) -> dict:
        """Single LLM call to OpenRouter with optional tools."""
        system_prompt = self._system_prompt or self.load_prompt()

        body: dict[str, Any] = {
            "model": self.config["model"],
            "messages": [
                {"role": "system", "content": system_prompt},
                *messages,
            ],
            "max_tokens": 4096,
        }
        if tools_schema:
            body["tools"] = tools_schema
            body["tool_choice"] = "auto"

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://getdeal.ai",
                    "X-Title": "Deal Quest Bot",
                },
                json=body,
            )
            resp.raise_for_status()
            data = resp.json()
            choice = data["choices"][0]["message"]
            return {
                "content": choice.get("content"),
                "tool_calls": choice.get("tool_calls", []),
            }

    async def run(self, message: str, context: "AgentContext", api_key: str) -> AgentResult:
        """Execute the tool-use loop for a single user message."""
        self._system_prompt = self._build_system_prompt(context)
        tools_schema = self._build_tools_schema()

        messages: list[dict] = [{"role": "user", "content": message}]
        iterations = 0
        max_iter = self.config.get("max_iterations", 10)
        tool_history: list[ToolCallRecord] = []
        last_confirmation: dict | None = None

        while iterations < max_iter:
            iterations += 1
            result = await self._call_openrouter(messages, tools_schema, api_key)

            # No tool calls — final response
            if not result["tool_calls"]:
                content = result["content"] or f"[{self.agent_name}] Empty response."
                return AgentResult(
                    content=content,
                    confirmation_payload=last_confirmation,
                    tool_call_history=tool_history,
                )

            # Execute tool calls
            tool_result_messages: list[dict] = []
            for tc in result["tool_calls"]:
                tool_name = tc["function"]["name"]
                try:
                    tool_input = json.loads(tc["function"]["arguments"])
                except json.JSONDecodeError:
                    tool_input = {}

                # Execute tool
                try:
                    tool_fn = self.tools.get(tool_name)
                    if tool_fn is None:
                        result_content = json.dumps({"error": f"Unknown tool: {tool_name}"})
                    else:
                        result_content = await tool_fn(tool_input, context)
                except Exception as e:
                    logger.warning("[%s] Tool %s failed: %s", self.agent_name, tool_name, e)
                    result_content = json.dumps({"error": str(e)[:300]})

                tool_history.append(ToolCallRecord(
                    tool_name=tool_name,
                    input=tool_input,
                    output=result_content,
                ))

                # Check for confirmation payload
                try:
                    parsed = json.loads(result_content)
                    if parsed.get("confirmation_needed"):
                        last_confirmation = {
                            "action": parsed["action"],
                            "details": parsed["details"],
                        }
                        # Short-circuit: return immediately with confirmation
                        return AgentResult(
                            content=_build_confirmation_message(
                                parsed["action"], parsed["details"]
                            ),
                            confirmation_payload=last_confirmation,
                            tool_call_history=tool_history,
                        )
                except (json.JSONDecodeError, KeyError):
                    pass

                tool_result_messages.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": result_content,
                })

            # Append assistant turn + tool results and loop
            messages.append({
                "role": "assistant",
                "content": result["content"],
                "tool_calls": result["tool_calls"],
            })
            messages.extend(tool_result_messages)

        # Max iterations hit
        logger.warning("[%s] Max iterations (%d) reached", self.agent_name, max_iter)
        return AgentResult(
            content=f"I've reached my processing limit. Work done so far has been applied.",
            tool_call_history=tool_history,
        )

    def _build_system_prompt(self, context: "AgentContext") -> str:
        """Override in subclasses to inject context into prompt template."""
        raise NotImplementedError

    def _build_tools_schema(self) -> list[dict]:
        """Convert tools dict to OpenAI function calling schema."""
        # Tools must expose a .schema property with name/description/parameters
        return [
            {
                "type": "function",
                "function": {
                    "name": name,
                    "description": fn.__doc__ or "",
                    "parameters": getattr(fn, "schema", {
                        "type": "object", "properties": {}, "required": []
                    }),
                },
            }
            for name, fn in self.tools.items()
        ]
```

**Key insight from reference:** The loop is simple — messages list grows with each iteration (`user → assistant+tool_calls → tool → assistant → ...`). The LLM sees the full accumulating conversation within a single agent invocation.

**Confidence:** HIGH — directly observed in working TypeScript implementation.

---

## Pattern 2: Orchestrator Integration with aiogram

**What:** How the orchestrator intercepts natural language messages without breaking FSM handlers.

**The routing priority in aiogram 3:**
- Routers are checked in registration order.
- Command filters (`Command("support")`) match before content filters.
- FSM state filters (`SupportState.waiting_input`) match only when user is in that state.
- A catch-all `F.text` filter registered last catches everything else.

```python
# bot/handlers/natural_language.py

import asyncio
from aiogram import F, Router
from aiogram.types import Message
from bot.agents.orchestrator import get_orchestrator

router = Router(name="natural_language")

# Per-chat processing lock
_processing: set[int] = set()
# Per-chat message queue — latest-wins
_pending: dict[int, dict] = {}


@router.message(F.text | F.voice | F.photo)
async def on_natural_language(
    message: Message,
    user_repo: "UserRepo",
    memory_repo: "UserMemoryRepo",
    deal_repo: "DealRepo",
    knowledge: "KnowledgeService",
    transcription: "TranscriptionService",
    shared_openrouter_key: str,
    # ... other injected deps
) -> None:
    """Catch-all handler for natural language messages."""
    chat_id = message.chat.id
    tg_id = message.from_user.id

    # Handle voice: transcribe first
    text = message.text or message.caption or ""
    photo_b64: str | None = None

    if message.voice:
        status = await message.answer("Transcribing...")
        try:
            audio = await _download_file(message.bot, message.voice.file_id)
            text = await transcription.transcribe(audio)
            await status.edit_text(f'I heard: "{text}"')
        except Exception as e:
            await status.edit_text(f"Transcription failed: {e}")
            return

    if message.photo:
        photo = message.photo[-1]
        photo_bytes = await _download_file(message.bot, photo.file_id)
        import base64
        photo_b64 = base64.b64encode(photo_bytes).decode()

    # Concurrent processing: queue if busy
    if chat_id in _processing:
        _pending[chat_id] = {"text": text, "photo_b64": photo_b64, "message": message}
        return

    _processing.add(chat_id)
    try:
        await _process_message(
            message=message,
            text=text,
            photo_b64=photo_b64,
            chat_id=chat_id,
            tg_id=tg_id,
            deps={...},  # injected deps
        )
    finally:
        _processing.discard(chat_id)
        # Drain queue
        if chat_id in _pending:
            queued = _pending.pop(chat_id)
            asyncio.create_task(_process_queued(queued, deps))
```

**Key aiogram integration points:**
1. Router registered LAST in `main.py` — after all command/FSM routers.
2. `F.text | F.voice | F.photo` filter — only fires when no other router claimed the message.
3. Voice handled inline before calling orchestrator — no changes to Orchestrator needed.
4. Per-chat lock prevents concurrent processing (same pattern as ClickUp reference).

**main.py change (minimal):**
```python
from bot.handlers import natural_language  # NEW import

# At the END of router registration:
dp.include_router(admin.router)
dp.include_router(natural_language.router)  # NEW — must be last

# Inject new deps into workflow_data:
dp.workflow_data.update({
    # ... existing deps unchanged ...
    "orchestrator": get_orchestrator(insforge, cfg),  # NEW singleton
    "deal_repo": deal_repo,                           # NEW
})
```

**Confidence:** HIGH — aiogram 3 router priority is documented and confirmed in existing code behavior.

---

## Pattern 3: Conversation History (Sliding Window)

**What:** Per-chat message store that gives the orchestrator LLM conversation context.

**Design from reference (conversation-history.ts adapted to Python):**

```python
# bot/services/conversation_history.py

from __future__ import annotations
from collections import deque
from typing import Literal

MAX_MESSAGES = 20  # Sliding window size

ChatRole = Literal["user", "assistant", "tool"]

class ChatMessage:
    def __init__(self, role: ChatRole, content: str) -> None:
        self.role = role
        self.content = content

    def to_dict(self) -> dict:
        return {"role": self.role, "content": self.content}


class ConversationHistory:
    """In-memory per-chat sliding window conversation store."""

    _store: dict[int, deque[ChatMessage]] = {}  # chat_id -> deque

    @classmethod
    def add_message(cls, chat_id: int, role: ChatRole, content: str) -> None:
        if chat_id not in cls._store:
            cls._store[chat_id] = deque(maxlen=MAX_MESSAGES)
        cls._store[chat_id].append(ChatMessage(role, content))

    @classmethod
    def get_messages(cls, chat_id: int) -> list[dict]:
        if chat_id not in cls._store:
            return []
        return [m.to_dict() for m in cls._store[chat_id]]

    @classmethod
    def clear(cls, chat_id: int) -> None:
        cls._store.pop(chat_id, None)
```

**Orchestrator usage:**
```python
# In Orchestrator.process_message():

history = ConversationHistory.get_messages(chat_id)

# Add current user message to history
ConversationHistory.add_message(chat_id, "user", message_text)

# Build messages for LLM call:
messages = [*history, {"role": "user", "content": message_text}]

# After final response, add to history:
ConversationHistory.add_message(chat_id, "assistant", final_response)
```

**Why in-memory (not InsForge table):**
- Bot runs as single async process — no multi-instance issue.
- Conversation history is ephemeral (lose on restart is acceptable for v2.0 MVP).
- Avoids per-message DB writes (every message would require a write).
- Add persistence later if needed (optional `conversation_history` InsForge table).

**Confidence:** HIGH — directly observed in ClickUp reference implementation.

---

## Pattern 4: Agents.yaml Configuration

**What:** YAML-driven agent config decoupled from code. Enables model/prompt changes without deploys.

**Location:** `data/agents.yaml` (NEW — separate from existing pipeline YAML files in `data/pipelines/`)

```yaml
# data/agents.yaml

agents:
  orchestrator:
    model: "z-ai/glm-5"
    prompt_file: "orchestrator.md"
    tools: ["invoke_deal_agent", "invoke_coach_agent", "invoke_strategy_agent"]
    description: "Routes user messages to specialist agents based on intent"
    max_iterations: 10

  deal:
    model: "z-ai/glm-5"
    prompt_file: "deal_agent.md"
    tools: ["list_deals", "get_deal", "create_deal", "update_deal", "add_note",
            "confirm_action"]
    description: "CRM operations: manage deals, pipeline stages, notes"
    max_iterations: 8

  coach:
    model: "z-ai/glm-5"
    prompt_file: "coach_agent.md"
    tools: ["start_practice_session", "get_scenario", "score_response",
            "get_learning_progress", "get_skill_assessment"]
    description: "Sales coaching: training scenarios, skill scoring, recommendations"
    max_iterations: 6

  strategy:
    model: "z-ai/glm-5"
    prompt_file: "strategy_agent.md"
    tools: ["analyze_deal", "prep_call", "get_deal_history", "research_prospect"]
    description: "Deal strategy: analysis, call prep, competitive intel"
    max_iterations: 8
```

**Config loader (reuse existing pattern from `bot/pipeline/config_loader.py`):**
```python
# bot/agents/config_loader.py

import yaml
from pathlib import Path
from functools import lru_cache

@lru_cache(maxsize=None)
def load_agents_config() -> dict:
    path = Path(__file__).parent.parent.parent / "data" / "agents.yaml"
    with open(path) as f:
        return yaml.safe_load(f)

def get_agent_config(agent_name: str) -> dict | None:
    config = load_agents_config()
    return config.get("agents", {}).get(agent_name)
```

**Confidence:** HIGH — directly observed working in reference. Existing project already uses YAML pipeline config pattern.

---

## Pattern 5: Confirmation-First CRM Writes

**What:** Before any CRM mutation (create deal, update stage), the agent returns a confirmation message with an inline keyboard. The actual write happens only after user approval.

**Flow:**
```
User: "Move my Acme deal to negotiation"
     ↓
DealAgent calls update_deal tool with dry_run=True
     ↓
update_deal returns: {
  "confirmation_needed": true,
  "action": "update_deal_stage",
  "details": {"deal": "Acme Corp", "from": "discovery", "to": "negotiation"},
  "confirmation_id": "conf_abc123"
}
     ↓
ToolUseAgent detects confirmation_needed, short-circuits loop
     ↓
NaturalLanguageHandler renders InlineKeyboard:
  [✓ Yes, update it] [✗ Cancel]
  callback_data: "confirm:conf_abc123" or "cancel:conf_abc123"
     ↓
User taps confirm
     ↓
callback handler: looks up pending_confirmations[conf_abc123],
executes actual InsForge write, replies "Done — Acme moved to negotiation"
```

**Python implementation:**
```python
# bot/handlers/natural_language.py

# Store pending confirmations (in-memory, expire after 5 min)
_pending_confirmations: dict[str, dict] = {}
import uuid

def _store_confirmation(action: str, details: dict) -> str:
    conf_id = str(uuid.uuid4())[:8]
    _pending_confirmations[conf_id] = {
        "action": action,
        "details": details,
        "created_at": time.time(),
    }
    return conf_id

@router.callback_query(F.data.startswith("confirm:"))
async def on_confirm(callback: CallbackQuery, deal_repo: "DealRepo") -> None:
    conf_id = callback.data.split(":")[1]
    pending = _pending_confirmations.pop(conf_id, None)
    if not pending:
        await callback.answer("This confirmation has expired.")
        return
    # Execute the confirmed action
    result = await _execute_confirmed_action(pending, deal_repo)
    await callback.message.edit_text(result)
    await callback.answer()

@router.callback_query(F.data.startswith("cancel:"))
async def on_cancel(callback: CallbackQuery) -> None:
    conf_id = callback.data.split(":")[1]
    _pending_confirmations.pop(conf_id, None)
    await callback.message.edit_text("Cancelled.")
    await callback.answer()
```

**Confidence:** HIGH — pattern directly observed in reference. Inline keyboard callbacks are standard aiogram 3.

---

## Pattern 6: CRM Data Models (InsForge)

**What:** New InsForge tables for deal management.

**Principle:** Minimal schema. The existing `lead_registry` table already stores prospect data. The new `deals` table adds structured pipeline tracking. `deal_notes` adds activity log per deal.

**New Pydantic models (add to `bot/storage/models.py`):**

```python
# Add to bot/storage/models.py

class DealModel(BaseModel):
    id: int | None = None
    user_id: int | None = None
    telegram_id: int
    prospect_name: str
    company: str | None = None
    stage: str = "prospecting"  # prospecting, discovery, proposal, negotiation, closed_won, closed_lost
    value: float | None = None
    currency: str = "USD"
    probability: int | None = None  # 0-100
    expected_close: str | None = None  # ISO date
    notes: str | None = None
    lead_registry_id: int | None = None  # optional link to existing lead_registry
    created_at: str | None = None
    updated_at: str | None = None


class DealNoteModel(BaseModel):
    id: int | None = None
    deal_id: int
    telegram_id: int
    note_type: str = "update"  # update, call_log, email, meeting, milestone
    content: str
    created_at: str | None = None
```

**New migration (add to `migrations/`):**
```sql
-- migrations/005_deals.sql

CREATE TABLE IF NOT EXISTS deals (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    telegram_id BIGINT NOT NULL,
    prospect_name TEXT NOT NULL,
    company TEXT,
    stage TEXT NOT NULL DEFAULT 'prospecting',
    value DECIMAL(15, 2),
    currency TEXT DEFAULT 'USD',
    probability INTEGER CHECK (probability BETWEEN 0 AND 100),
    expected_close DATE,
    notes TEXT,
    lead_registry_id BIGINT REFERENCES lead_registry(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deals_telegram_id ON deals(telegram_id, created_at DESC);
CREATE INDEX idx_deals_stage ON deals(telegram_id, stage);

CREATE TABLE IF NOT EXISTS deal_notes (
    id BIGSERIAL PRIMARY KEY,
    deal_id BIGINT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    telegram_id BIGINT NOT NULL,
    note_type TEXT NOT NULL DEFAULT 'update',
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deal_notes_deal_id ON deal_notes(deal_id, created_at DESC);
```

**New repo classes (add to `bot/storage/repositories.py`):**
```python
class DealRepo:
    def __init__(self, client: InsForgeClient) -> None:
        self.client = client
        self.table = "deals"

    async def create(self, deal: DealModel) -> DealModel: ...
    async def get_for_user(self, telegram_id: int, limit: int = 20) -> list[DealModel]: ...
    async def get_by_id(self, deal_id: int) -> DealModel | None: ...
    async def update(self, deal_id: int, **kwargs) -> DealModel | None: ...
    async def get_by_stage(self, telegram_id: int, stage: str) -> list[DealModel]: ...
    async def get_stale(self, telegram_id: int, days: int = 7) -> list[DealModel]: ...


class DealNoteRepo:
    def __init__(self, client: InsForgeClient) -> None:
        self.client = client
        self.table = "deal_notes"

    async def create(self, note: DealNoteModel) -> DealNoteModel: ...
    async def get_for_deal(self, deal_id: int, limit: int = 10) -> list[DealNoteModel]: ...
```

**Confidence:** HIGH — follows identical pattern to all existing repos.

---

## Pattern 7: Proactive Messaging Integration with aiogram

**What:** Scheduled background tasks that send messages without user initiating them.

**Two trigger types:**
1. **Daily briefing** — fixed-time scheduler (reuses existing `followup_scheduler.py` pattern).
2. **Context-triggered** — fires after CRM mutations (e.g., deal goes 7 days without update).

```python
# bot/services/proactive.py

import asyncio
import logging
from datetime import datetime, timezone, time as dt_time
from aiogram import Bot

logger = logging.getLogger(__name__)


async def start_proactive_scheduler(
    bot: Bot,
    deal_repo: "DealRepo",
    memory_repo: "UserMemoryRepo",
    user_repo: "UserRepo",
    openrouter_key: str,
) -> None:
    """Start all proactive messaging loops as background tasks."""
    asyncio.create_task(_daily_briefing_loop(bot, deal_repo, memory_repo, openrouter_key))
    asyncio.create_task(_stale_deal_check_loop(bot, deal_repo, user_repo))
    logger.info("Proactive scheduler started")


async def _daily_briefing_loop(bot: Bot, deal_repo, memory_repo, openrouter_key: str) -> None:
    """Send daily briefing to all active users at 8:00 AM."""
    while True:
        now = datetime.now(timezone.utc)
        # Calculate seconds until next 8am UTC
        next_8am = now.replace(hour=8, minute=0, second=0, microsecond=0)
        if now >= next_8am:
            next_8am = next_8am.replace(day=next_8am.day + 1)
        wait_secs = (next_8am - now).total_seconds()

        await asyncio.sleep(wait_secs)

        # Send briefing to all users with active deals
        try:
            await _send_daily_briefings(bot, deal_repo, memory_repo, openrouter_key)
        except Exception as e:
            logger.error("Daily briefing error: %s", e)


async def _stale_deal_check_loop(bot: Bot, deal_repo, user_repo) -> None:
    """Check for stale deals every 6 hours and nudge users."""
    while True:
        await asyncio.sleep(6 * 3600)
        try:
            await _send_stale_deal_nudges(bot, deal_repo, user_repo)
        except Exception as e:
            logger.error("Stale deal check error: %s", e)


async def send_context_triggered_nudge(
    bot: Bot,
    telegram_id: int,
    trigger: str,   # "deal_stale_7d", "no_practice_3d", etc.
    context: dict,
) -> None:
    """Fire-and-forget nudge triggered by CRM event. Called from tool execution."""
    try:
        message = _build_nudge_message(trigger, context)
        await bot.send_message(telegram_id, message)
    except Exception as e:
        logger.warning("Context nudge failed for user %s: %s", telegram_id, e)
```

**Integration in `main.py`:**
```python
from bot.services.proactive import start_proactive_scheduler

# After followup scheduler:
if cfg.openrouter_api_key:
    asyncio.create_task(
        start_proactive_scheduler(bot, deal_repo, memory_repo, user_repo, cfg.openrouter_api_key)
    )
```

**Confidence:** HIGH — follows exact pattern of existing `followup_scheduler.py` + `asyncio.create_task` background tasks.

---

## Pattern 8: Coexistence with Existing /command Handlers

**What:** /learn, /train, /support commands continue to work as direct shortcuts. The catch-all router only runs if no existing handler claimed the message.

**How it works automatically:**
- aiogram 3 Router priority: first matching router wins.
- Command filters (`Command("support")`) match before `F.text` filters.
- FSM state filters (`SupportState.waiting_input`) match only when user IS in that state.
- The `natural_language.router` registered last with `F.text | F.voice | F.photo` only fires for messages that didn't match any earlier router.

**The only edge case:** When a user is in an FSM state (e.g., `SupportState.waiting_input`) and sends natural language, the FSM handler catches it — not the orchestrator. This is correct behavior (the user is explicitly in the old flow).

**No code changes needed to existing handlers.** The catch-all router simply never fires when an FSM state or command filter matches first.

**Confidence:** HIGH — aiogram 3 router chain behavior is well-documented and matches existing code structure.

---

## Data Flow: Complete Request Lifecycle

```
1. User sends: "I have a demo with TechCorp tomorrow, what should I prepare?"

2. aiogram Dispatcher receives Message
   → Checks start.router (no Command match)
   → Checks support.router (no Command, user not in SupportState)
   → ... (all FSM/command routers skip)
   → natural_language.router matches F.text
   → on_natural_language() called

3. NaturalLanguageHandler:
   → Per-chat lock acquired (chat_id=12345)
   → status_msg = await message.answer("Thinking...")
   → Starts typing indicator loop

4. Orchestrator.process_message(chat_id=12345, tg_id=67890, text="I have a demo...")
   → Builds AgentContext: loads user memory, knowledge base, recent deals
   → Gets conversation history (last 20 msgs) from ConversationHistory
   → Adds current message to history
   → Loads orchestrator system prompt from prompts/orchestrator.md
   → Calls OpenRouter with tools: invoke_deal_agent, invoke_coach_agent, invoke_strategy_agent

5. Orchestrator LLM decides: invoke_strategy_agent
   → tool_call: invoke_strategy_agent(message="demo prep for TechCorp tomorrow")

6. Orchestrator tool loop:
   → Calls StrategyAgent.run("demo prep for TechCorp tomorrow", context, api_key)

7. StrategyAgent tool-use loop:
   → LLM call 1: decides to use get_deal tool for TechCorp context
   → tool result: deal data + last notes from InsForge
   → LLM call 2: no more tools needed, generates prep brief
   → Returns AgentResult(content="Here's your demo prep brief for TechCorp...")

8. Orchestrator receives specialist result
   → Adds result to current messages
   → LLM call: no more tools needed
   → Final response: formatted brief
   → Adds to ConversationHistory
   → Returns OrchestratorResponse(type="text", content="...")

9. NaturalLanguageHandler:
   → Cancels typing indicator
   → Deletes "Thinking..." status_msg
   → Sends final response (split if >4096 chars)
   → Per-chat lock released

10. Background (after 5min inactivity):
    → MemoryAgent.process_conversation() — updates user_memory with new context
```

---

## New vs. Modified Components

### New Files

| File | Type | Purpose |
|------|------|---------|
| `bot/handlers/natural_language.py` | Handler Router | Catch-all for non-command messages. Processing lock, queue, voice/photo routing, confirmation callbacks. |
| `bot/agents/orchestrator.py` | Agent | Orchestrator singleton. Tool-use loop. Manages ConversationHistory. Builds AgentContext. |
| `bot/agents/tool_use_agent.py` | Base class | New ToolUseAgent base. Replaces old BaseAgent ABC for v2 agents. Tool-use loop, confirmation handling. |
| `bot/agents/deal_agent.py` | Agent | CRM ops via tool-use loop. |
| `bot/agents/coach_agent.py` | Agent | Wraps existing TrainerAgent pipeline. New tool interface on top. |
| `bot/agents/strategy_agent.py` | Agent | Wraps existing StrategistAgent pipeline. New tool interface on top. |
| `bot/agents/config_loader.py` | Config | Loads agents.yaml. Distinct from existing `pipeline/config_loader.py`. |
| `bot/agents/tool_registry.py` | Registry | Maps tool name → async callable for each agent. |
| `bot/agents/tools/deal_tools.py` | Tools | create_deal, update_deal, list_deals, add_note tool functions. |
| `bot/agents/tools/coach_tools.py` | Tools | start_practice, score_response, get_scenario tool functions. |
| `bot/agents/tools/strategy_tools.py` | Tools | analyze_deal, prep_call, get_deal_history tool functions. |
| `bot/services/conversation_history.py` | Service | In-memory per-chat sliding window. |
| `bot/agents/context_builder.py` | Service | Builds AgentContext from user memory, deals, knowledge base. |
| `bot/services/proactive.py` | Service | Daily briefing + stale deal nudge background loops. |
| `data/agents.yaml` | Config | Model, prompt, tools, max_iterations per agent. |
| `prompts/orchestrator.md` | Prompt | Orchestrator system prompt with routing instructions. |
| `prompts/deal_agent.md` | Prompt | Deal agent system prompt. |
| `prompts/coach_agent.md` | Prompt | Coach agent system prompt. |
| `prompts/strategy_agent.md` | Prompt | Strategy agent system prompt. |
| `migrations/005_deals.sql` | Migration | deals + deal_notes tables. |

### Modified Files

| File | Change |
|------|--------|
| `bot/main.py` | Register `natural_language.router` last. Add `deal_repo`, `deal_note_repo`, `orchestrator` to `workflow_data`. Start `proactive_scheduler`. |
| `bot/storage/models.py` | Add `DealModel`, `DealNoteModel`. |
| `bot/storage/repositories.py` | Add `DealRepo`, `DealNoteRepo`. |
| `bot/agents/memory.py` | Extend to handle inactivity-based conversation consolidation. Add `process_conversation(snapshot, chat_id)` method. |
| `bot/agents/registry.py` | Register new v2 agents (deal, coach, strategy). |

### Unchanged Files

All existing handlers (`support.py`, `learn.py`, `train.py`, `leads.py`, `stats.py`, `settings.py`, `start.py`, `admin.py`), all existing pipeline agents (`strategist.py`, `trainer.py`), all existing services, all existing pipelines YAML, all existing migrations. The old `BaseAgent` ABC remains for the existing pipeline agents — it is not replaced, just supplemented by `ToolUseAgent`.

---

## Suggested Build Order

The dependencies form a clear chain. Build bottom-up.

### Step 1: Storage Foundation (No deps — build first)

**What:** Database tables + Pydantic models + repo classes for deals.

**Tasks:**
1. Add `DealModel`, `DealNoteModel` to `bot/storage/models.py`
2. Add `DealRepo`, `DealNoteRepo` to `bot/storage/repositories.py`
3. Write and apply `migrations/005_deals.sql`
4. Add `deal_repo`, `deal_note_repo` to `main.py` workflow_data
5. Smoke test: create a deal via Python shell

**Why first:** Every agent tool depends on repos. Agents can't run tools without this.

**Confidence:** HIGH — identical pattern to existing 11 repo classes.

---

### Step 2: Tool-Use Loop Infrastructure (Depends on Step 1)

**What:** `ToolUseAgent` base class + `ToolRegistry` + `agents.yaml` config loader.

**Tasks:**
1. Write `bot/agents/tool_use_agent.py` (ToolUseAgent base class with tool-use loop)
2. Write `bot/agents/config_loader.py` (loads agents.yaml)
3. Create `data/agents.yaml` (initial config, all agents, placeholder tool lists)
4. Write `bot/agents/tool_registry.py` (name → callable mapping)
5. Unit test: mock tool-use loop with a stub tool

**Why second:** Agents need this base class. Can't build DealAgent until ToolUseAgent exists.

**Confidence:** HIGH — pattern directly observed in TypeScript reference.

---

### Step 3: Deal Tools + DealAgent (Depends on Steps 1-2)

**What:** The first full specialist agent: deal management with CRM tools.

**Tasks:**
1. Write `bot/agents/tools/deal_tools.py` (create_deal, update_deal, list_deals, add_note)
   - Each tool function is an async callable with a `.schema` dict attribute
   - Each tool returns JSON string (success or error)
   - Mutating tools return `confirmation_needed: true` payload before executing
2. Write `prompts/deal_agent.md` — system prompt with instructions, tool usage guidance
3. Write `bot/agents/deal_agent.py` (extends ToolUseAgent, wires deal_tools)
4. Unit test: DealAgent with mocked OpenRouter call

**Why third:** Builds on infrastructure, is the simplest specialist (pure CRM, no pipeline wrapping).

---

### Step 4: Conversation History + Context Builder (Depends on Steps 1-2)

**What:** The context infrastructure the Orchestrator needs.

**Tasks:**
1. Write `bot/services/conversation_history.py` (in-memory sliding window)
2. Write `bot/agents/context_builder.py` (AgentContext dataclass + builder function)
   - Loads user memory from `UserMemoryRepo`
   - Loads recent deals from `DealRepo`
   - Loads knowledge base from `KnowledgeService`
3. Unit test: context builder with fixture data

**Why fourth:** Orchestrator needs both of these. Can't build Orchestrator without them.

---

### Step 5: Orchestrator (Depends on Steps 2-4)

**What:** The core routing engine.

**Tasks:**
1. Write `prompts/orchestrator.md` — system prompt with routing instructions for all specialists
2. Write `bot/agents/orchestrator.py` (Orchestrator class + singleton getter)
   - `process_message()` and `process_multimodal()` methods
   - Tool-use loop with `invoke_deal_agent`, `invoke_coach_agent`, `invoke_strategy_agent` tools
   - Each invoke_* tool calls the corresponding specialist's `.run()` method
   - 30-second timeout per specialist invocation (fallback to orchestrator handling directly)
3. Add `orchestrator` entry to `data/agents.yaml`
4. Integration test: mock OpenRouter, verify routing to correct specialist

**Why fifth:** Depends on ConversationHistory, AgentContext, and at least one specialist (DealAgent).

---

### Step 6: NaturalLanguageHandler (Depends on Step 5)

**What:** aiogram integration — the handler that catches messages and calls the Orchestrator.

**Tasks:**
1. Write `bot/handlers/natural_language.py`
   - Per-chat processing lock + message queue
   - Voice → AssemblyAI transcription (reuse existing `TranscriptionService`)
   - Photo → base64 encoding + multimodal orchestrator call
   - Confirmation keyboard rendering + callback handlers (`confirm:*`, `cancel:*`)
   - Typing indicator loop (asyncio task, sends every 4s)
   - Error handling with user-friendly messages
2. Register router in `main.py` (last, after `admin.router`)
3. Manual test: send a message, verify it reaches Orchestrator

**Why sixth:** Needs Orchestrator to be complete. This is the entry point — test end-to-end here.

---

### Step 7: CoachAgent + StrategyAgent (Depends on Steps 2, 5)

**What:** The remaining specialist agents, wrapping existing pipelines.

**Tasks (CoachAgent):**
1. Write `bot/agents/tools/coach_tools.py`
   - `start_practice_session(scenario_type)` — calls existing TrainerAgent pipeline
   - `get_learning_progress(telegram_id)` — reads AttemptRepo
   - `get_skill_assessment(telegram_id)` — reads user_memory skill data
2. Write `prompts/coach_agent.md`
3. Write `bot/agents/coach_agent.py`

**Tasks (StrategyAgent):**
1. Write `bot/agents/tools/strategy_tools.py`
   - `analyze_deal(deal_id)` — calls existing StrategistAgent pipeline
   - `prep_call(deal_id, call_type)` — specialized analysis prompt
   - `get_deal_context(prospect_name)` — reads DealRepo + lead_registry
2. Write `prompts/strategy_agent.md`
3. Write `bot/agents/strategy_agent.py`

**Why seventh:** These wrap existing pipelines. Depend on Steps 2 (ToolUseAgent) and optionally Step 5 (Orchestrator registers them as invoke targets).

---

### Step 8: Proactive Messaging (Depends on Step 3)

**What:** Daily briefing + stale deal nudges running as background asyncio tasks.

**Tasks:**
1. Write `bot/services/proactive.py`
   - `start_proactive_scheduler(bot, deal_repo, ...)` — creates background tasks
   - `_daily_briefing_loop()` — generates & sends morning brief per user
   - `_stale_deal_check_loop()` — detects and nudges on stale deals
   - `send_context_triggered_nudge()` — one-off call from deal tool after mutation
2. Wire into `main.py` alongside existing followup scheduler
3. Test: manually trigger via admin command

**Why last:** Nice-to-have feature, no other components depend on it. DealAgent can optionally call `send_context_triggered_nudge` after a deal mutation.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Rewriting Existing Pipeline Agents
**What goes wrong:** Replacing StrategistAgent/TrainerAgent with new tool-use agents.
**Why bad:** Breaks existing /support, /learn, /train commands that work perfectly. Regressions in v1 features.
**Instead:** Wrap them. CoachAgent and StrategyAgent call the existing pipeline runners via tool functions. Old agents remain unchanged.

### Anti-Pattern 2: Global FSM State Dependency in Orchestrator
**What goes wrong:** Making the Orchestrator check or set aiogram FSM states.
**Why bad:** FSM is managed per-user by aiogram. The Orchestrator has its own conversation history. Mixing them causes state conflicts — if the orchestrator sets a state, subsequent messages get routed to the FSM handler instead of the catch-all.
**Instead:** Orchestrator is FSM-agnostic. Natural language handler only fires when no FSM state is active.

### Anti-Pattern 3: Tool Results as Rich Objects
**What goes wrong:** Tool functions return Python dicts/objects directly to the agent.
**Why bad:** The tool-use loop feeds results back to the LLM as message content. The LLM only understands strings. Returning objects requires serialization everywhere.
**Instead:** ALL tool functions return `str` (JSON-serialized). The agent loop appends the string directly to the messages list. Consistent with OpenAI/OpenRouter protocol.

### Anti-Pattern 4: Per-Request LLM Provider Creation
**What goes wrong:** Creating `create_provider(user.provider, api_key)` for each orchestrator call.
**Why bad:** The orchestrator uses the shared `OPENROUTER_API_KEY` (not user-provided keys), needs connection pooling, and must handle retries centrally.
**Instead:** Orchestrator uses a single `httpx.AsyncClient` (or `httpx.AsyncClient(timeout=60)` per call) with the shared key from config. User-provided keys are still used by existing /command pipelines only.

### Anti-Pattern 5: Blocking the Event Loop During Tool Execution
**What goes wrong:** Tool functions making synchronous HTTP calls or heavy computation.
**Why bad:** aiogram runs on a single async event loop. Blocking kills responsiveness for all users.
**Instead:** All tool functions are `async def`. InsForge calls go through existing `httpx.AsyncClient`. Computation is kept minimal in tools; heavy work offloaded via `asyncio.create_task`.

### Anti-Pattern 6: Storing Conversation History in InsForge Per Message
**What goes wrong:** Writing every message to `conversation_history` InsForge table immediately.
**Why bad:** A 10-message conversation = 10 DB writes. High write pressure for a frequently chatty feature.
**Instead:** Keep in-memory for MVP. Add optional InsForge persistence only if cross-restart continuity becomes a requirement. Bot restarts are rare (once per deploy).

### Anti-Pattern 7: Orchestrator as a Single Giant Tool-Use Loop
**What goes wrong:** Having the orchestrator directly execute all CRM tools instead of routing to specialists.
**Why bad:** Prompt becomes enormous (all tools from all specialists). Context window fills up. No specialization — the orchestrator becomes a god object.
**Instead:** Orchestrator only has `invoke_*` tools. Each specialist agent has its own focused tool set and prompt. Clean separation of concerns matches the reference architecture.

---

## Scalability Considerations

| Concern | At 10 users (current) | At 100 users | At 1000 users |
|---------|----------------------|--------------|---------------|
| Conversation history memory | Negligible (~40KB total) | ~400KB — fine | ~4MB — still fine for single process |
| Concurrent processing | Per-chat lock, no issue | Per-chat lock, still fine | Per-chat lock, but may queue — add worker pool |
| OpenRouter rate limits | Not an issue | Monitor credits | Implement request queuing + backoff |
| InsForge DB writes | 2-5 writes/conversation | 20-50 writes/min | Add connection pool, batch writes |
| Daily briefing sends | Sequential, fast | Sequential, fast | Parallelize with asyncio.gather |

---

## Sources

**Reference Architecture (HIGH confidence — directly examined):**
- TypeScript implementation: `/Users/dmytrolevin/Desktop/clickup mcp/bot/src/agents/base-agent.ts`
- TypeScript orchestrator: `/Users/dmytrolevin/Desktop/clickup mcp/bot/src/agents/orchestrator.ts`
- TypeScript handler: `/Users/dmytrolevin/Desktop/clickup mcp/bot/src/handlers/copilot.ts`
- TypeScript agents config: `/Users/dmytrolevin/Desktop/clickup mcp/bot/src/agents/config/agents.yaml`

**Existing Codebase (HIGH confidence — directly read):**
- `bot/main.py` — DI wiring pattern, router registration order
- `bot/handlers/support.py` — FSM handler pattern, pipeline invocation
- `bot/agents/base.py` — existing BaseAgent ABC
- `bot/pipeline/runner.py` — PipelineRunner (unchanged by this milestone)
- `bot/storage/repositories.py` — Repo pattern (11 existing classes)
- `bot/storage/models.py` — Pydantic model pattern
- `bot/services/llm_router.py` — OpenRouter client (existing httpx pattern)
- `bot/middleware.py` — aiogram middleware, auth pattern
- `bot/pipeline/context.py` — PipelineContext pattern
- `bot/agents/registry.py` — AgentRegistry pattern

**aiogram 3 Docs (MEDIUM confidence — current behavior observed in existing code):**
- aiogram 3 Router priority: first-match-wins, registration order determines priority
- aiogram 3 Dispatcher.workflow_data: DI injection pattern for handlers
- aiogram 3 FSM: state-filtered handlers only match when user is in that FSM state
