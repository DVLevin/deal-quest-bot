# Project Research Summary

**Project:** Deal Quest Bot v2.0 — Multi-Agent AI Sales Partner
**Domain:** AI sales partner / conversational CRM / multi-agent orchestration on Telegram
**Researched:** 2026-02-24
**Confidence:** HIGH

## Executive Summary

Deal Quest Bot v2.0 transforms an existing, production-grade v1.0 Telegram bot (commands, FSM flows, pipeline-based agents) into a conversational AI sales partner. The core shift is from discrete command-triggered pipelines to a natural language orchestrator that routes any user message to one of four specialist agents: Deal, Coach, Strategy, and Memory. The research has a concrete reference architecture to port from: the ClickUp MCP TypeScript bot (`/Users/dmytrolevin/Desktop/clickup mcp/`), which implements the exact same multi-agent pattern (Orchestrator + BaseAgent tool-use loops + confirmation-first writes + graph memory) in production. All major patterns transfer directly to Python/aiogram 3.

The recommended approach is additive, not a rewrite. All existing /command handlers remain unchanged. A single new `natural_language.router` is registered last in `main.py`, catching all non-FSM messages and routing them through the Orchestrator. The Orchestrator runs a tool-use loop against OpenRouter using the existing `llm_router.py` HTTP client (extended with a `complete_with_tools()` method). Specialist agents each implement their own tool-use loops. The only new dependency is `apscheduler>=3.10,<4.0` for cron-based daily briefings. Everything else reuses existing libraries, patterns, and infrastructure.

The primary risks are architectural, not technical. Seven compounding complexities are added simultaneously: LLM-driven routing (vs FSM), tool-use loops (vs single-pass pipelines), CRM schema (vs flat lead registry), proactive messaging (vs reactive only), conversation history (vs stateless), cost-per-message (vs cost-per-command), and backward compatibility. The three most dangerous failure modes are (1) catch-all handler eating command messages due to wrong router registration order, (2) infinite tool-use loops without hard iteration caps, and (3) LLM routing misclassification sending messages to the wrong specialist. All three have clear prevention strategies detailed in PITFALLS.md.

---

## Key Findings

### Recommended Stack

The v2.0 stack adds exactly one new dependency to what already runs in production. The existing `httpx` async client in `llm_router.py` is extended with a `complete_with_tools()` method to support OpenAI-compatible function calling on OpenRouter. Agent configuration moves to `data/agents.yaml` using the already-present `pyyaml`. Per-user conversation history is an in-memory `dict[int, deque]` using Python stdlib — no Redis, no new framework. The sole new package is `apscheduler>=3.10,<4.0` (pinned below v4 alpha) for time-of-day cron scheduling that raw `asyncio.sleep()` cannot handle reliably.

See `.planning/research/STACK.md` for full details, code patterns, and rejected alternatives.

**Core technologies:**
- `OpenRouterProvider.complete_with_tools()` (extend existing): single-method addition enabling tool-use loops — no new HTTP library
- `collections.deque` (Python stdlib): O(1) sliding-window conversation history per user — no Redis, no DB round-trips
- `apscheduler>=3.10,<4.0`: only new dependency; `AsyncIOScheduler` + cron trigger for daily briefings; v4 is explicitly pre-release alpha and must not be used
- `pyyaml` (existing): new `data/agents.yaml` config file following identical pattern to existing `data/pipelines/*.yaml`
- `aiogram` FSM + inline keyboards (existing): confirmation flow uses `InlineKeyboardMarkup` + FSM state storage — zero new patterns
- New Pydantic models `DealModel`, `DealNoteModel` in existing `bot/storage/models.py` — direct extension of the 11 existing model classes

### Expected Features

The 2026 AI sales tool landscape (Gong, Highspot, Pipedrive AI, Salesloft) defines what individual sales reps expect from an AI partner. The ClickUp MCP reference confirms which patterns are validated in production.

See `.planning/research/FEATURES.md` for the full feature table with sources.

**Must have (table stakes):**
- Natural language message routing — the core premise: any message gets handled intelligently
- Conversational deal creation — "just got off a call with Acme, 50K, Q2 close"
- Deal status queries and stage updates with confirmation keyboard before any write
- Note logging on deals (call logs, meeting notes, insights)
- Stale deal detection and nudge — proactive alert when deal goes cold
- Daily morning briefing — deals + coaching nudge combined
- Conversation history (sliding window) — context carries across messages in a session
- Backward compatibility — `/learn`, `/train`, `/support`, `/leads` must keep working as command shortcuts

**Should have (differentiators):**
- Memory Agent that learns rep patterns — top objections, preferred close tactics, deal history
- Competitive intel retrieval from `company_knowledge.md`
- Re-engagement email drafting for cold deals
- Call prep briefing using deal context + playbook
- Multi-deal portfolio view ("show me all deals at risk")
- Specialist timeout + fallback so provider flakiness does not surface as user-facing errors

**Defer to future milestone:**
- External CRM sync (HubSpot, Pipedrive) — full OAuth + API scope; explicitly out of scope per PROJECT.md
- Win probability as a hard number — requires calibrated data not yet available
- Multi-user team features — needs a permissions model
- Calendar/scheduling agent — Google/Outlook APIs add scope without core value
- Deal pattern recognition — requires weeks of accumulated data
- Context-triggered nudges beyond stale deals — complex signal detection

### Architecture Approach

The architecture is a clean layered addition to the existing dispatcher tree. A new `natural_language.router` (registered last) catches all non-FSM text/voice messages and routes them to a singleton `Orchestrator` class. The Orchestrator builds context (conversation history + user memory + minimal deal context — no 70K-token knowledge base), runs a tool-use loop via `complete_with_tools()`, and dispatches to specialist agents via `invoke_*` tool calls. Specialist agents each run their own tool-use loops against domain-specific tools. All tools write to InsForge via the existing repository pattern. A new `ProactiveService` handles scheduled messaging using `APScheduler`. Existing v1.0 pipelines (strategist, trainer) are wrapped by specialist agents, not replaced.

See `.planning/research/ARCHITECTURE.md` for component boundaries, full code patterns, and data flow diagrams.

**Major components:**
1. `NaturalLanguageHandler` (`bot/handlers/natural_language.py`) — catch-all entry point; per-chat processing lock + queue; voice/photo preprocessing; typing indicator every 4s; renders orchestrator response as Telegram message or confirmation keyboard
2. `Orchestrator` (`bot/agents/orchestrator.py`) — singleton; builds AgentContext (no knowledge base); runs tool-use loop; routes to specialists via `invoke_*` tools; holds per-chat `ConversationHistory`; returns `OrchestratorResponse`
3. `ToolUseAgent` base class (`bot/agents/tool_use_agent.py`) — new base class replacing old `BaseAgent` ABC for v2 agents; implements `while iterations < max_iterations` loop; loads config from `agents.yaml`; exits immediately on confirmation payload (no extra LLM call)
4. `DealAgent` (`bot/agents/deal_agent.py`) — CRM operations; confirmation-first writes; reads/writes `deals` and `deal_notes` via new `DealRepo`/`DealNoteRepo`
5. `CoachAgent` (`bot/agents/coach_agent.py`) — wraps existing `TrainerAgent` pipelines for NL routing; no duplication of training logic
6. `StrategyAgent` (`bot/agents/strategy_agent.py`) — wraps existing `StrategistAgent` pipeline; adds call prep and competitive intel tools
7. `MemoryAgent` (`bot/agents/memory.py`) — MODIFIED: add inactivity-timer trigger (5 min after last message) replacing per-pipeline background trigger
8. `AgentContextBuilder` (`bot/agents/context_builder.py`) — assembles orchestrator context; critical: NO knowledge base for orchestrator (routing only); full domain knowledge for specialist agents only
9. `ProactiveService` (`bot/services/proactive.py`) — APScheduler-based daily briefing; per-user try/except to prevent a single failure halting all deliveries
10. Two new InsForge tables: `deals` (with PostgreSQL CHECK constraint on stage enum), `deal_notes`

### Critical Pitfalls

See `.planning/research/PITFALLS.md` for all 18 pitfalls with full prevention strategies and per-phase warnings.

1. **Catch-all router registered before command routers** — All `/learn`, `/train`, `/support` commands route to the LLM orchestrator instead of their dedicated handlers. Prevention: `dp.include_router(natural_language.router)` must be the LAST include call in `main.py`; add `StateFilter(default_state)`; smoke test on day one that `/learn` hits `TrainerAgent`, not the orchestrator.

2. **Tool-use loop with no hard iteration cap** — Agent loops indefinitely; per-message LLM cost spikes to $1–2; Telegram user gets no response. Prevention: `max_iterations` per agent in `agents.yaml` (default 5); `asyncio.wait_for(90s)` on all specialist invocations; detect repetitive tool call sequences and short-circuit.

3. **LLM routing misclassification** — "Move Acme to Proposal stage" routes to Coach Agent instead of Deal Agent. Prevention: non-overlapping specialist descriptions with explicit negative examples in orchestrator prompt; lightweight keyword pre-filter before LLM routing call; log and review first 50 real routing decisions.

4. **Confirmation flow race condition** — User sends a revision before confirming; stale confirmation executes the wrong CRM mutation. Prevention: TTL-keyed pending confirmations dict (5-min expiry); invalidate any pending confirmation on any new user message; verify `confirmation_id` on button press.

5. **Full 70K-token knowledge base injected into orchestrator** — Routing call costs 10x more than needed; context rot degrades routing accuracy. Prevention: orchestrator prompt contains NO knowledge base — only agent descriptions and conversation history (target <2000 tokens); specialists receive only domain-relevant knowledge.

6. **Memory agent triggered on every message** — At 20 msgs/day/user, doubles total LLM cost. Prevention: inactivity timer pattern from ClickUp reference — fire memory update 5 minutes after last user message, not after every message; abort in-flight update when user sends a new message.

7. **CRM stage stored as freeform string** — Future migrations are painful; filter queries are fragile. Prevention: PostgreSQL CHECK constraint enum (`prospecting | qualified | proposal | negotiation | won | lost | stalled`) from day one; validate at repository layer, never pass raw strings from agent output.

---

## Implications for Roadmap

All four research files converge on the same three-phase structure. The feature dependency graph, architectural component ordering, and pitfall phase-mapping all align.

### Phase 1: NL Routing Foundation

**Rationale:** Everything in v2.0 depends on the orchestrator existing and routing correctly. No specialist agent, CRM feature, or proactive feature can be built or tested without this layer in place. This phase also establishes all critical infrastructure guards (processing lock, iteration cap, router ordering) that prevent the highest-severity pitfalls. The ClickUp reference architecture shows this is exactly the right starting point — routing reliability must be proven before adding domain complexity.

**Delivers:** Any text or voice message routes to the correct specialist agent. Conversation context carries across turns within a session. Existing commands are fully unaffected. A `"thinking..."` typing indicator shows during LLM calls. All orchestrator calls are traced.

**Addresses (from FEATURES.md):**
- Natural language message routing (table stakes)
- Conversation history sliding window (table stakes)
- Voice message routing via existing AssemblyAI integration
- Backward compatibility for all existing /commands

**Implements (from ARCHITECTURE.md):**
- `NaturalLanguageHandler` with per-chat processing lock + queue
- `Orchestrator` singleton with tool-use loop and `max_iterations` cap
- `ToolUseAgent` base class
- `AgentContextBuilder` (no knowledge base for orchestrator)
- `ConversationHistory` in-memory store (`collections.deque`)
- `agents.yaml` config system using existing `pyyaml`
- `complete_with_tools()` method on existing `OpenRouterProvider`

**Avoids (from PITFALLS.md):**
- Pitfall 1: Router ordering — register NL router LAST; add StateFilter
- Pitfall 2: Infinite loops — max_iterations from day one; 90s wait_for timeout
- Pitfall 3: Routing misclassification — precise non-overlapping descriptions + keyword pre-filter
- Pitfall 5: FSM dead zone — design FSM/NL boundary at implementation time; document `/cancel` in FSM entry messages
- Pitfall 7: In-memory history restart loss — document explicitly; keep window short (10 turns)
- Pitfall 9: Duplicate concurrent requests — `processing_users: set[int]` + latest-wins queue before first deploy
- Pitfall 11: Context window bloat — orchestrator gets no knowledge base; orchestrator prompt target <2000 tokens
- Pitfall 12: Memory agent per-message — design inactivity timer before first memory update call
- Pitfall 15: No typing indicator — 4-second repeating `send_chat_action` on NL handler entry
- Pitfall 16: Missing traces — wrap orchestrator invocations in `TraceContext` from first deployment

**Research flag:** Standard patterns. Router registration, aiogram FSM, in-memory deque, and `complete_with_tools()` extension are all documented and validated. Skip `/gsd:research-phase` for this phase.

---

### Phase 2: CRM Writes and Specialist Integration

**Rationale:** Phase 1 proves routing works. Phase 2 adds the primary value-delivering features: full deal lifecycle management and NL access to all coaching and strategy capabilities. The confirmation flow (highest-risk new interaction pattern) is built here, isolated to Deal Agent writes before any other feature depends on it. Existing v1.0 agents are wrapped by specialists, not rewritten — this is the lowest-risk integration approach.

**Delivers:** Full deal lifecycle in-bot (create, update, log notes, query portfolio). Natural language access to coaching (objection practice, skill assessment). Natural language access to strategy (call prep, competitive intel, re-engagement drafts). Background memory consolidation after conversations end.

**Addresses (from FEATURES.md):**
- Conversational deal creation with confirmation keyboard
- Deal status queries and stage updates
- Note logging (call logs, meeting notes, AI insights)
- Objection handling practice via NL ("practice pricing objection")
- Call preparation briefing
- Competitive intel retrieval from company knowledge
- Re-engagement email drafting
- Memory Agent learning rep patterns and preferences

**Implements (from ARCHITECTURE.md):**
- `DealAgent` with confirmation-first write tools
- `CoachAgent` wrapping existing `TrainerAgent`
- `StrategyAgent` wrapping existing `StrategistAgent`
- `MemoryAgent` modification with inactivity-timer trigger
- `deal_tools.py`, `coach_tools.py`, `strategy_tools.py`, `memory_tools.py` in `bot/agents/tools/`
- `DealModel`, `DealNoteModel` in `bot/storage/models.py`
- `DealRepo`, `DealNoteRepo` in `bot/storage/repositories.py`
- `deals` and `deal_notes` InsForge table migrations with stage CHECK constraint
- Extended `InsForgeClient` with PostgREST comparison operators (`gte`, `lt`, date arithmetic)

**Avoids (from PITFALLS.md):**
- Pitfall 4: Confirmation race condition — TTL dict + invalidate on new user message + confirmation_id verification
- Pitfall 6: Freeform CRM stages — PostgreSQL CHECK constraint written into migration, not application layer
- Pitfall 8: Per-message LLM cost — cheap routing model for orchestrator; expensive models for specialist execution only
- Pitfall 13: PostgREST filtering limitations — extend `InsForgeClient` before building Deal Agent query tools
- Pitfall 14: Tool output too long — cap all list tools at 10 items; return text summary, not raw JSON
- Pitfall 17: /support backward compat — decide and document whether /support becomes an orchestrator shortcut
- Pitfall 18: Duplicate deal race condition — `UNIQUE(user_id, prospect_company)` constraint at DB level

**Research flag:** One gap requires early validation. Verify PostgREST operator syntax (`gte`, `lt`, date arithmetic) against the live InsForge instance before writing Deal Agent query tools. The existing `InsForgeClient.query()` only exposes equality filters — the extension is straightforward but the exact operator format must be confirmed before tool design is finalized.

---

### Phase 3: Proactive Features

**Rationale:** Proactive messaging is what makes the bot feel like a persistent sales partner rather than a reactive tool. It requires all specialist agents to be working and stable — daily briefings aggregate Deal Agent and Coach Agent output; stale deal nudges require Deal Agent read queries. These are the differentiators. Building them last ensures the foundation is solid before adding scheduled complexity.

**Delivers:** Bot proactively surfaces deal status every morning. Users are nudged when deals go stale. The bot feels like a sales partner that monitors the pipeline independently, not just a Q&A interface. Admin tooling gives visibility into the new agent system.

**Addresses (from FEATURES.md):**
- Daily morning briefing (deal summary + coaching nudge + stale alerts)
- Stale deal detection and nudge
- Multi-deal portfolio view ("show me all deals at risk")
- Admin tooling: `/admin agents` health status, `/admin traces` for new agent system

**Implements (from ARCHITECTURE.md):**
- `ProactiveService` (`bot/services/proactive.py`) with `APScheduler AsyncIOScheduler`
- Daily briefing job: cron at 06:00 UTC; per-user try/except; outer crash recovery loop
- Stale deal detection: query deals inactive >5 days; nudge via bot
- Admin command extensions to `bot/handlers/admin.py`

**Avoids (from PITFALLS.md):**
- Pitfall 10: Scheduler crash silently stops delivery — per-user `try/except TelegramForbiddenError`; mark blocked users as inactive; outer `while True` wrapper with 60s sleep on crash
- Pitfall 8: LLM cost guardrails — per-user daily NL message limit; command shortcuts remain free; cheap routing model for orchestrator

**Research flag:** Low risk. APScheduler 3.x `AsyncIOScheduler` + aiogram is a documented community pattern. Confirm `scheduler.start()` timing relative to event loop start in Railway deployment before Phase 3 goes live — minimal investigation, not a full research phase.

---

### Phase Ordering Rationale

- **Dependency graph drives order.** The orchestrator must exist before any specialist can be invoked. CRM tables must exist before the Deal Agent can write. Specialists must be stable before proactive features can aggregate their outputs. This ordering is not arbitrary — it follows hard technical dependencies.

- **Pitfall severity drives guard sequencing.** The three critical pitfalls (router ordering, infinite loops, routing misclassification) all belong to Phase 1. Building their guards into Phase 1 prevents them from being discovered in Phase 2 or 3 when they are harder to isolate and fix.

- **Backward compat is a Phase 1 constraint, not Phase 3 cleanup.** The catch-all router design must account for all existing FSM states and command handlers from day one. Retrofitting this after Phase 2 is written would require touching every handler.

- **Confirmation flow belongs to Phase 2, isolated.** The highest-risk new interaction pattern (inline keyboard + pending state + TTL + race condition prevention) is introduced on the first CRM write operation, where it can be tested in isolation before being depended on by more tools.

- **Proactive features are last because they depend on everything.** Daily briefings aggregate Deal Agent and Coach Agent output. Stale deal nudges require Deal Agent. Memory personalization of briefings requires Memory Agent. All must be independently stable first.

- **The ClickUp MCP reference confirms this ordering.** The TypeScript implementation was built in exactly this sequence: routing first, CRM writes second, proactive third. This is not coincidental — it reflects the natural dependency graph of the domain.

---

### Research Flags

Phases needing `/gsd:research-phase` during planning:

- **Phase 2 (CRM tools — one specific gap):** Verify PostgREST operator support (`gte`, `lt`, `cs`, date arithmetic) against the live InsForge instance before writing Deal Agent query tools. The existing `InsForgeClient.query()` only supports equality filters and this gap must be confirmed before tool schema is designed. Not a full research phase — targeted validation only.

Phases with standard, well-documented patterns (skip research):

- **Phase 1 (NL routing):** aiogram router registration order, `StateFilter`, FSM interaction, in-memory `deque`, OpenRouter function calling format — all documented and validated in existing codebase and ClickUp reference. No unknowns.

- **Phase 3 (proactive messaging):** APScheduler 3.x `AsyncIOScheduler` + cron + aiogram is documented and widely used. The pattern fits directly into existing `main.py`. Confirm Railway deployment timing but do not run a research phase.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | One new dependency (`apscheduler`). All other decisions extend existing validated code. Official docs confirmed for OpenRouter tool calling and APScheduler 3.x. ClickUp reference provides working TypeScript equivalents for every new Python pattern. |
| Features | HIGH | Multiple 2026 industry sources (Highspot, Salesloft, Vivun, aimultiple, Hyperbound) plus direct ClickUp reference code inspection. Feature table has traceable sources for every entry. Anti-features validated by 2026 AI pilot failure analysis. |
| Architecture | HIGH | Reference TypeScript implementation read and analyzed line by line. Component boundaries, file names, and Python equivalents all specified with code samples. aiogram 3 patterns confirmed from official docs and existing production codebase. |
| Pitfalls | HIGH | 18 pitfalls documented. Top 7 confirmed from multiple independent sources: ClickUp reference code (direct observation), arxiv study 2503.13657 (150+ production multi-agent traces), ZenML production report, and direct codebase inspection of `support.py`, `main.py`, `followup_scheduler.py`. |

**Overall confidence:** HIGH

### Gaps to Address

- **PostgREST operator support:** InsForge's actual support for `gte`, `lt`, and date arithmetic operators is not confirmed against the live instance. Validate early in Phase 2 before writing Deal Agent query tools.

- **Pipeline stage enum definition:** The exact stage set (e.g., whether "prospecting" and "qualified" are separate stages, or whether "stalled" is a stage vs a flag) must be decided before the `deals` table migration is written. PITFALLS.md suggests 7 values; finalize before Phase 2 schema work begins.

- **Orchestrator model selection:** The `openai/gpt-oss-120b` default (set in a recent commit) should be validated as sufficient for routing quality. The orchestrator performs classification, not generation — a cheaper, faster model may produce better routing. Decide before Phase 1 deployment, not after.

- **Conversation history persistence decision:** In-memory history is lost on Railway restarts. If restart frequency is high (Railway free tier restarts frequently), adding an InsForge `conversation_history` table becomes Phase 1 scope, not Phase 3+. Assess Railway restart frequency before finalizing Phase 1 scope.

- **`/support` backward compat decision:** Two parallel paths will exist post-v2.0 for deal analysis: `/support` → StrategistAgent pipeline, and NL "analyze my Acme deal" → Orchestrator → StrategyAgent (PITFALLS.md Pitfall 17). This divergence must be resolved before Phase 2. Recommended resolution: `/support` injects a context hint and routes through the orchestrator, eliminating the parallel path.

---

## Sources

### Primary (HIGH confidence — official docs or direct code inspection)

- ClickUp MCP reference bot (`/Users/dmytrolevin/Desktop/clickup mcp/bot/src/`) — direct code inspection of `orchestrator.ts`, `base-agent.ts`, `conversation-history.ts`, `copilot.ts`, `circuit-breaker.ts`, `graph/memory.ts`, `write-tools.ts`, `confirmation-message.ts`
- OpenRouter API tool calling format: https://openrouter.ai/docs/api/reference/overview
- APScheduler 3.x AsyncIOScheduler: https://apscheduler.readthedocs.io/en/3.x/userguide.html
- APScheduler 4.x pre-release warning: https://apscheduler.readthedocs.io/en/master/migration.html
- aiogram 3 Router documentation: https://docs.aiogram.dev/en/latest/dispatcher/router.html
- aiogram 3 FSM documentation: https://docs.aiogram.dev/en/latest/dispatcher/finite_state_machine/index.html
- Existing codebase (direct read): `bot/services/llm_router.py`, `bot/pipeline/runner.py`, `bot/storage/models.py`, `bot/main.py`, `bot/services/followup_scheduler.py`, `bot/handlers/support.py`

### Secondary (HIGH confidence — multiple 2026 industry sources agree)

- AI Sales Coaching — Highspot: https://www.highspot.com/blog/ai-sales-coaching/
- AI Deal Intelligence — Salesloft: https://www.salesloft.com/resources/guides/how-ai-reshapes-deal-management
- Inside the AI Sales Agent — Vivun: https://www.vivun.com/blog/inside-the-ai-sales-agent-memory-reasoning-real-work
- Agentic CRM 2026 — aimultiple: https://aimultiple.com/agentic-crm
- Sales Coaching Benchmarks 2026 — Hyperbound: https://www.hyperbound.ai/blog/sales-coaching-benchmarks-2026
- 13 AI Sales Assistant Tools 2026 — Outdoo AI: https://www.outdoo.ai/blog/ai-sales-assistants

### Research reports (HIGH confidence — academic and production analysis)

- "Why Do Multi-Agent LLM Systems Fail?" arxiv 2503.13657: https://arxiv.org/html/2503.13657v1 — 18 failure modes from 150+ production traces
- ZenML "The Agent Deployment Gap": https://www.zenml.io/blog/the-agent-deployment-gap — infinite loop examples, state management failures
- 2026 AI Pilot Failure Analysis — The AI Hat: https://theaihat.com/the-2026-sales-reckoning-why-95-of-ai-pilots-fail-and-how-to-join-the-5-who-win/
- Agentic AI Failure Patterns — Concentrix: https://www.concentrix.com/insights/blog/12-failure-patterns-of-agentic-ai-systems/

---
*Research completed: 2026-02-24*
*Ready for roadmap: yes*
