# Feature Landscape: AI Sales Partner Bot (v2.0)

**Domain:** AI Sales Partner / Conversational CRM / Sales Coaching Bot
**Project:** Deal Quest Bot v2.0 — multi-agent natural language sales partner
**Researched:** 2026-02-24
**Overall Confidence:** HIGH

---

## Context: What This Milestone Is

This is a SUBSEQUENT MILESTONE research file. v1.0 already shipped:
- `/learn` — structured training with learning tracks
- `/train` — random scenario practice with scoring
- `/support` — deal analysis flow (text/voice/image)
- `/leads` — basic lead management
- `/stats` — progress display
- `/settings` — provider management
- `/admin` — admin panel with analytics
- Voice transcription, XP scoring, pipeline tracing

v2.0 transforms this into a **conversation-driven AI sales partner** with:
- Natural language routing (Orchestrator → specialist agents)
- Deal management (lightweight CRM inside the bot)
- Proactive coaching and daily briefings
- Persistent memory that learns the salesperson's patterns

**Reference architecture analyzed:** ClickUp MCP bot (`/Users/dmytrolevin/Desktop/clickup mcp/`) — production TypeScript/grammY implementation of the exact multi-agent pattern planned here (Orchestrator + BaseAgent tool-use loops + confirmation-first writes + graph memory). Patterns documented below transfer directly.

---

## Table Stakes

Features the target users (individual salespeople) will expect. Missing any of these
makes the bot feel unfinished relative to existing AI sales tools (Gong, Highspot, Pipedrive AI).

| Feature | Why Expected | Complexity | Depends On |
|---------|--------------|------------|------------|
| Natural language message routing | The whole premise: "just talk to it" | High | Orchestrator agent |
| Conversational deal creation | "I just got off a call with Acme, 50K deal, Q2 close" | Medium | Deal Agent + InsForge deals table |
| Deal status queries | "What's the status of my Acme deal?" | Low | Deal Agent read tools |
| Deal stage updates | "Move Acme to negotiation" + confirmation inline keyboard | Medium | Deal Agent write tools + confirmation flow |
| Note logging on deals | "Log that Acme wants a discount" | Low | Deal Agent write tools |
| Stale deal detection & nudge | Proactive alert when deal hasn't moved in N days | Medium | Background scheduler + Deal Agent |
| Daily morning briefing | Combined deal status + coaching nudge + alerts | Medium | Background scheduler + all agents |
| Objection handling practice | "Practice the pricing objection" | Low | Wraps existing /train Coach Agent |
| Call preparation briefing | "Prep me for my Acme call in 30 min" | Medium | Strategy Agent + deal context |
| Backward compat: /learn, /train, /support | Power users keep fast paths | Low | Existing handlers as shortcuts |
| Conversation history (sliding window) | Context carries across messages | Medium | ConversationHistory store per user |
| Confirmation before CRM writes | "Create deal: Acme $50K Q2 — Confirm?" + keyboard | Medium | Inline keyboard + write tools |
| Voice message routing | Send voice note, gets routed to right agent | Low | Existing AssemblyAI → transcribe → orchestrator |

**Sources:**
- [13 AI Sales Assistant Tools 2026](https://www.outdoo.ai/blog/ai-sales-assistants) — "AI sales assistants aren't just nice-to-haves anymore" + CRM automation as table stakes
- [AI Deal Intelligence](https://www.salesloft.com/resources/guides/how-ai-reshapes-deal-management) — stale deal detection and next-best-action as expected features
- [AI Sales Coaching 2026](https://www.highspot.com/blog/ai-sales-coaching/) — call prep, objection practice, real-time guidance as minimum expectations
- ClickUp MCP bot (`bot/src/agents/orchestrator.ts`) — confirmation-first write pattern in production

---

## Differentiators

Features that set this bot apart from generic AI assistants and existing v1.0.
Not expected by default, but create clear "wow" moments.

| Feature | Value Proposition | Complexity | Depends On |
|---------|-------------------|------------|------------|
| Memory Agent — learns rep's patterns | Knows preferred close tactics, top objections, historical deal context | High | Memory Agent + structured InsForge memory table |
| Deal win probability scoring | LLM-assessed probability based on deal age, stage, engagement | Medium | Deal Agent + Strategy Agent analysis |
| Competitive intel retrieval | "What do we say when they compare us to Competitor X?" | Medium | Strategy Agent + company_knowledge.md |
| Re-engagement drafting | "Draft a follow-up email for the Acme deal that went cold" | Medium | Strategy Agent |
| Context-triggered nudges | "Your Acme deal has been silent 5 days — want to draft a follow-up?" | High | Background scheduler + Memory Agent + Deal Agent |
| Deal pattern recognition | "You tend to lose deals when pricing is raised before value is established" | High | Memory Agent + long-term data |
| Multi-deal portfolio briefing | "Show me all deals at risk this week" | Medium | Deal Agent multi-query tools |
| Admin traces/health tools | `/admin traces`, `/admin agents` for debugging new agent system | Low | Extends existing admin handler |
| Orchestrator fallback to direct answer | If specialist fails/times out, orchestrator answers from context | Medium | Circuit breaker + fallback in orchestrator |

**Sources:**
- [Inside the AI Sales Agent](https://www.vivun.com/blog/inside-the-ai-sales-agent-memory-reasoning-real-work) — knowledge graphs tracking objections, stakeholders, deal events as differentiator
- [AI Sales Coaching Benchmarks 2026](https://www.hyperbound.ai/blog/sales-coaching-benchmarks-2026) — personalized coaching based on rep-specific patterns
- [Agentic CRM 2026](https://aimultiple.com/agentic-crm) — predictive churn prevention, proactive intervention as differentiators
- ClickUp MCP (`bot/src/agents/orchestrator.ts` L200-230) — timeout + fallback pattern in production

---

## Anti-Features

Features to explicitly NOT build in this milestone. Common traps in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| External CRM sync (HubSpot, Pipedrive) | API complexity, OAuth dance, mapping mismatch — full scope bloat | Bot is the CRM for now; sync is its own future milestone |
| Autonomous deal mutations without confirmation | Users lose trust instantly if bot changes their data without asking | Always confirm writes via inline keyboard (ClickUp pattern proven) |
| Win probability as hard number ("73% chance") | LLM confidence scores are noise without calibration data; users will rely on them wrong | Qualitative risk flags ("at risk: no activity 7 days") instead |
| Full pipeline funnel analytics dashboard | Admin complexity overkill for a Telegram bot at this scale | Simple portfolio summary: "5 active deals, 2 at risk" |
| Replacing /learn, /train, /support commands | Breaks existing power user workflows; FSM handlers are fast and reliable | Keep them as shortcuts; Coach Agent wraps them for NL routing |
| Auto-sending follow-up emails | Autonomous external communication is a trust/legal risk before product-market fit | Draft email text for rep to send manually |
| Multi-user team features | Sharing deals between reps requires permissions model — high scope | Single-user bot for now; team features are future milestone |
| LLM-only memory (no persistence) | Conversation window memory = amnesia between sessions | InsForge-backed structured memory: user_memory table, deals table |
| Building a scheduling/calendar agent | Calendar APIs (Google, Outlook) are complex integrations that add scope without core value | "Prep for my call in 30 min" = deal context brief, not calendar booking |
| Over-engineering agent routing (12 specialist agents) | Too many agents = routing errors + latency + complexity | 4 specialists max (Deal, Coach, Strategy, Memory) — ClickUp uses 3 successfully |

**Sources:**
- [2026 AI Pilots Failure Analysis](https://theaihat.com/the-2026-sales-reckoning-why-95-of-ai-pilots-fail-and-how-to-join-the-5-who-win/) — autonomous agent failures from lack of human-in-the-loop
- [Agentic AI Failure Patterns](https://www.concentrix.com/insights/blog/12-failure-patterns-of-agentic-ai-systems/) — escalation/handoff problems, bot detection, over-automation
- [AI Oversell Reality](https://www.isaca.org/resources/news-and-trends/industry-news/2025/the-reality-of-ai-oversold-and-underdelivered) — validation failures from building without customer discovery
- PROJECT.md `Out of Scope` section — these are explicitly deferred by design

---

## Feature Dependencies

What must exist before what else can be built. Build order follows the dependency graph.

```
FOUNDATION — Build first, everything depends on this
├── Orchestrator Agent
│   ├── Natural language routing
│   ├── Conversation history (sliding window)
│   ├── Context building (workspace + memory context)
│   └── Fallback to direct answer on specialist timeout
│
├── InsForge deals table (new schema)
│   ├── Deal creation
│   ├── Deal stage tracking
│   └── Deal notes/activity log
│
└── Catch-all message handler (replaces FSM for non-command messages)

SPECIALIST AGENTS — Require Foundation
├── Deal Agent (requires: Orchestrator + deals table)
│   ├── create_deal tool
│   ├── update_deal tool (confirmation-first)
│   ├── log_note tool
│   ├── list_deals tool
│   └── get_deal_details tool
│
├── Coach Agent (requires: Orchestrator + existing /learn, /train pipelines)
│   ├── objection_practice tool (wraps existing train pipeline)
│   ├── skill_assessment tool (wraps existing learn pipeline)
│   └── get_coaching_tip tool
│
├── Strategy Agent (requires: Orchestrator + deals table + playbook)
│   ├── deal_analysis tool (extends existing /support pipeline)
│   ├── call_prep tool (uses deal context + playbook)
│   ├── competitive_intel tool (uses company_knowledge.md)
│   └── draft_followup tool
│
└── Memory Agent (requires: Orchestrator + user_memory table)
    ├── update_memory tool (background, no confirmation needed)
    ├── get_memory_context tool (read-only)
    └── pattern_recognition (long-term, accumulative)

PROACTIVE FEATURES — Require Specialist Agents
├── Daily Briefing (requires: Deal Agent + Coach Agent + background scheduler)
│   ├── Morning deal portfolio summary
│   ├── Coaching tip of the day
│   └── Stale deal alerts
│
├── Context-Triggered Nudges (requires: Deal Agent + Memory Agent + scheduler)
│   ├── Stale deal detection (deal inactive > N days)
│   ├── Practice streak break alert
│   └── Re-engagement prompt
│
└── Admin Tools (requires: Orchestrator + all agents)
    ├── /admin agents — agent health status
    └── /admin traces — trace viewer for new agent system
```

**Critical path for working MVP:**
Orchestrator → deals table → Deal Agent → Confirmation flow → Conversation history

Everything else builds on top of that sequence.

---

## ClickUp MCP Patterns That Transfer Directly

The ClickUp bot is a production reference for the exact architecture being built.
These patterns transfer to the sales domain with adaptation notes.

### Pattern 1: BaseAgent Tool-Use Loop
**What (ClickUp):** `BaseAgent.run()` — while loop calling LLM, executing tools, accumulating
messages until no tool calls returned. Max iterations cap prevents runaway loops.

**Transfer to Sales:** Identical pattern. Each sales specialist (Deal, Coach, Strategy, Memory)
extends the same loop. Config-driven via agents.yaml (model, tools list, max_iterations, prompt_file).

**Python adaptation:** Replace TypeScript class with Python async class. `while iterations < max_iterations:`
loop with `await llm_router.complete()` + tool dispatch dict.

**Source:** `bot/src/agents/base-agent.ts` L205-471

---

### Pattern 2: Confirmation-First Writes
**What (ClickUp):** Write tools return `{confirmation_needed: true, action, details}` JSON instead
of executing. Orchestrator short-circuits, calls `buildConfirmationMessage()`, returns inline keyboard.
On user "Confirm" tap, handler executes the actual write.

**Transfer to Sales:** All Deal Agent write tools (create_deal, update_deal, log_note) use this
pattern. "Create deal: Acme $50K Q2 close — Confirm?" before any InsForge mutation.

**Python adaptation:** `InlineKeyboardBuilder` in aiogram 3, callback_query handler executes
pending action stored in user session or in a `pending_confirmations` InsForge table keyed by user_id.

**Source:** `bot/src/tools/write-tools.ts` (all write tools), `bot/src/agents/confirmation-message.ts`,
`bot/src/agents/orchestrator.ts` L757-775 (short-circuit on confirmation payload)

---

### Pattern 3: Orchestrator Summary Injection
**What (ClickUp):** Orchestrator builds `orchestratorSummary` string, injects it into specialist
agent system prompt via `{{orchestrator_context}}` placeholder. Specialist gets routing context
("user wants to update a task in the Engineering list") without re-reading full conversation.

**Transfer to Sales:** Orchestrator summarizes intent before invoking Deal/Coach/Strategy agents.
"User wants to log a note on their Acme deal — they mentioned competitor pricing came up."

**Source:** `bot/src/agents/base-agent.ts` L252-254 (prompt template substitution)

---

### Pattern 4: Specialist Timeout + Fallback
**What (ClickUp):** Each specialist invocation has a 30s timeout. On timeout or error,
orchestrator receives `{error: "Specialist timed out — handle directly"}` and LLM answers from
its workspace context knowledge without the specialist.

**Transfer to Sales:** Same pattern. If Deal Agent times out during "What are my active deals?",
orchestrator answers from memory context. Prevents user-facing errors on LLM provider flakiness.

**Source:** `bot/src/agents/orchestrator.ts` L191-229 (`invokeSpecialistTool` with `Promise.race`)

---

### Pattern 5: Graph Memory + Short-Term Activity Digest
**What (ClickUp):** Two memory layers injected into every prompt:
1. `graphContext` — PostgreSQL knowledge graph (persons, projects, decisions, blockers) queried
   by keyword analysis on current message
2. `recentActivityDigest` — last 24h sessions summary (what was worked on recently)

**Transfer to Sales:** Translate directly:
1. `dealContext` — deals table + user_memory table (patterns, preferences, top objections)
2. `recentActivityDigest` — last session summary (what deals were discussed, what was practiced)

Keyword routing for graph queries is a proven shortcut to avoid LLM for memory retrieval.

**Source:** `bot/src/graph/memory.ts` L36-80, `bot/src/agents/orchestrator.ts` L289-306

---

### Pattern 6: Agents.yaml Config-Driven Architecture
**What (ClickUp):** `agents.yaml` defines each agent: `model`, `prompt_file`, `tools: [list]`,
`max_iterations`. `config-loader.ts` reads this at startup. Adding a new agent = new YAML entry.

**Transfer to Sales:** Same structure. `bot/data/agents.yaml` (or alongside existing pipelines).
Each agent definition says which model, which prompt file, which tools it can call.

**Source:** `bot/src/agents/config-loader.ts`, ClickUp `agent/config/` directory

---

## MVP Recommendation

### Phase 1: Core Infrastructure (Build first — everything depends on this)

**Must Have:**
1. Orchestrator Agent — routes natural language to specialists
2. Catch-all message handler — intercepts non-command messages, sends to orchestrator
3. Conversation history — sliding window (last 10 turns) per user in memory
4. InsForge deals table — schema for deals, stages, notes
5. Basic Deal Agent — read tools only (list deals, get deal details)
6. Agents.yaml config — Python adaptation of ClickUp config pattern

**Why this order:** Can demo "tell me about my deals" without write tools yet. Validates
routing before adding CRM mutations.

**Existing features preserved as:** Commands stay as shortcuts. `/support` still works. NL
"help me with my Acme deal" → Strategy Agent → wraps existing support pipeline.

---

### Phase 2: CRM Writes + Coaching Integration (Add value)

**Must Have:**
7. Deal Agent write tools (create_deal, update_deal, log_note) + confirmation flow
8. Coach Agent — wraps /learn and /train for NL routing ("practice the pricing objection")
9. Strategy Agent — wraps /support + adds call prep + competitive intel tools
10. Memory Agent — background memory updates after each conversation

**Why this order:** Confirmation flow is highest-risk implementation (inline keyboards, pending
state management) — get it right before adding more write operations.

---

### Phase 3: Proactive Features (The differentiators)

**Must Have:**
11. Daily briefing — morning combined message (deal summary + coaching nudge)
12. Stale deal nudges — background scheduler checks deals inactive > 5 days

**Defer until proven need:**
- Win probability scoring (requires enough deal history to be meaningful)
- Deal pattern recognition (requires weeks of data)
- Context-triggered nudges beyond stale deals (complex signal detection)
- Admin agent traces tools (can extend existing admin handler ad hoc)

---

## Complexity Assessment

| Feature | Dev Time | Risk | Value | Phase |
|---------|----------|------|-------|-------|
| Orchestrator Agent | 3-4 days | High (LLM routing quality) | Critical | 1 |
| Catch-all handler + routing | 1 day | Low | Critical | 1 |
| Conversation history | 1 day | Low | High | 1 |
| Deals InsForge table | 1-2 days | Low | Critical | 1 |
| Deal Agent read tools | 2 days | Low | High | 1 |
| Agents.yaml config system | 1 day | Low | High | 1 |
| Deal Agent write tools + confirmation | 2-3 days | Medium | High | 2 |
| Coach Agent (wraps existing) | 1-2 days | Low | High | 2 |
| Strategy Agent (wraps existing) | 2 days | Low | High | 2 |
| Memory Agent | 2-3 days | Medium | Medium | 2 |
| Daily briefing scheduler | 1-2 days | Low | High | 3 |
| Stale deal nudges | 1 day | Low | High | 3 |
| Admin agent health tools | 1 day | Low | Medium | 3 |

**Total Phase 1:** ~8-10 days (2 weeks)
**Total Phase 2:** ~7-10 days (2 weeks)
**Total Phase 3:** ~3-4 days (1 week)

**Total v2.0:** 5-6 weeks

---

## Feature-to-Existing-Code Dependencies

Existing v1.0 code that v2.0 builds on (do not break):

| Existing Feature | How v2.0 Uses It |
|-----------------|-----------------|
| `bot/agents/strategist.py` | Strategy Agent wraps this — `/support` pipeline still fires, just routed via NL |
| `bot/agents/trainer.py` | Coach Agent wraps this — `/learn` + `/train` pipelines reused |
| `bot/agents/memory.py` | Memory Agent extends this — background memory updates continue |
| `bot/services/llm_router.py` | All new agents use this for LLM calls — no new HTTP client needed |
| `bot/pipeline/runner.py` | Existing pipelines still run through PipelineRunner for /learn /train /support |
| `bot/tracing/` | `@traced_span` decorators apply to new agents unchanged |
| `bot/storage/repositories.py` | New repositories extend same pattern (DealRepo, ConversationRepo) |
| `bot/handlers/admin.py` | New admin commands (traces, agents) extend existing admin handler |
| `followup_scheduler.py` | Daily briefing and stale deal nudges extend existing scheduler pattern |

**Critical constraint:** New orchestrator catch-all handler must NOT intercept messages
intended for existing FSM-based flows (/learn, /train wizard steps). Solution from ClickUp:
orchestrator only handles messages NOT in active FSM state. Check `state is None` before routing.

---

## Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| Table stakes features | HIGH | Multiple 2026 sources agree; ClickUp production reference confirms patterns |
| Differentiator features | HIGH | Vivun, Highspot, aimultiple sources confirm; ClickUp graph memory is working production code |
| Anti-features | HIGH | 2026 failure analysis + PROJECT.md explicit out-of-scope decisions |
| ClickUp pattern transfer | HIGH | Source code analyzed directly; same language patterns (LLM tool-use, confirmation, memory) |
| Complexity estimates | MEDIUM | Estimates based on ClickUp implementation scale + existing bot codebase familiarity |
| Phase ordering | HIGH | Dependency graph is clear; confirmed by working ClickUp implementation order |

---

## Open Questions

1. **Deals table schema:** What pipeline stages match this product's domain? (e.g., Prospecting → Qualifying → Proposal → Negotiation → Closed Won/Lost) — define before building Deal Agent write tools.

2. **Conversation history storage:** ClickUp uses in-memory `ConversationHistory` singleton (lost on restart). Should v2.0 persist to InsForge for durability? For a single-process aiogram bot, in-memory is fine; flag if restart frequency is a concern.

3. **Orchestrator model selection:** ClickUp uses OpenRouter with a capable model for orchestrator (routing quality matters most here). Current default `z-ai/glm-5` may not be strong enough for reliable routing — consider using `openai/gpt-oss-120b` (already the new default from recent commit) specifically for orchestrator.

4. **Memory Agent trigger:** When does Memory Agent run — after every message (costly), or only on conversation end signal? ClickUp runs background memory updates. Recommend: background task after each agent response, same pattern as existing `bot/agents/memory.py`.

5. **Stale deal threshold:** What is "stale" — 3 days? 7 days? Should be configurable per user or per deal stage. Define sensible defaults in config.

---

## Sources

### AI Sales Assistant Feature Landscape (2026)
- [13 AI Sales Assistant Tools 2026 — Outdoo AI](https://www.outdoo.ai/blog/ai-sales-assistants) — table stakes vs differentiators
- [Top 11 AI Sales Assistants 2026 — Sintra AI](https://sintra.ai/blog/top-11-ai-sales-assistants-in-2025) — feature comparison
- [Best AI Sales Tools 2026 — Sybill](https://www.sybill.ai/blogs/ai-sales-tools) — deal management features
- [15 Best AI Sales Tools 2026 — SPOTIO](https://spotio.com/blog/ai-sales-tools/) — coaching and pipeline features

### AI Sales Coaching
- [AI Sales Coaching — Highspot](https://www.highspot.com/blog/ai-sales-coaching/) — must-have features, 36% win rate improvement
- [AI Sales Coaching Platforms 2026 — Cirrus Insight](https://www.cirrusinsight.com/blog/ai-sales-coaching) — proactive coaching trend
- [Sales Coaching Benchmarks 2026 — Hyperbound](https://www.hyperbound.ai/blog/sales-coaching-benchmarks-2026) — objection practice, roleplay

### Agentic CRM / Deal Management
- [Agentic CRM Platforms 2026 — aimultiple](https://aimultiple.com/agentic-crm) — agentic vs traditional CRM
- [Agentic AI CRM 2026 — SaasPodium](https://www.saaspodium.com/crm-software/agentic-ai-crm-agentic-ai-sales-automation-2026) — explainable AI, human-in-loop as table stakes
- [AI Deal Intelligence — Salesloft](https://www.salesloft.com/resources/guides/how-ai-reshapes-deal-management) — stale deal detection, next-best-action

### AI Sales Agent Memory & Architecture
- [Inside the AI Sales Agent — Vivun](https://www.vivun.com/blog/inside-the-ai-sales-agent-memory-reasoning-real-work) — persistent memory, knowledge graphs, proactive action
- [AI Agent Memory — IBM](https://www.ibm.com/think/topics/ai-agent-memory) — LTM vs STM patterns
- [Context Personalization — OpenAI Cookbook](https://cookbook.openai.com/examples/agents_sdk/context_personalization) — state management with long-term memory

### Multi-Agent Architecture Reference
- ClickUp MCP Bot source: `/Users/dmytrolevin/Desktop/clickup mcp/bot/src/agents/` — production implementation
  - `base-agent.ts` — tool-use loop pattern
  - `orchestrator.ts` — routing, timeout/fallback, confirmation short-circuit
  - `confirmation-message.ts` — confirmation message builder
  - `graph/memory.ts` — dual-memory (graph + session) pattern
  - `memory/store.ts` — SQLite-backed memory index (adapt to InsForge)

### Failure Analysis (Anti-Features)
- [2026 AI Pilot Failure — The AI Hat](https://theaihat.com/the-2026-sales-reckoning-why-95-of-ai-pilots-fail-and-how-to-join-the-5-who-win/)
- [Agentic AI Failure Patterns — Concentrix](https://www.concentrix.com/insights/blog/12-failure-patterns-of-agentic-ai-systems/)
- [AI Oversell Reality 2025 — ISACA](https://www.isaca.org/resources/news-and-trends/industry-news/2025/the-reality-of-ai-oversold-and-underdelivered)
