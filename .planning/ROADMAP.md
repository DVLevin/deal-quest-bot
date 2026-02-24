# Roadmap: Deal Quest Bot — AI Sales Partner

## Milestones

- [x] **v1.0 Pipeline Observability** - Phases 1-2 (Phase 1 complete 2026-02-02; Phase 2 merged into v2.0)
- [ ] **v2.0 AI Sales Partner** - Phases 3-9 (in progress)

## Phases

<details>
<summary>v1.0 Pipeline Observability (Phase 1 complete, Phase 2 merged into v2.0)</summary>

### Phase 1: Foundation - Tracing Infrastructure & Storage

**Goal**: Every pipeline execution generates a trace with step-level timing and agent I/O, persisted to InsForge for later analysis

**Depends on**: Nothing (first phase)

**Requirements**: TRACE-01, TRACE-02, TRACE-03, TRACE-04, TRACE-05, TRACE-06

**Success Criteria** (what must be TRUE):
  1. Pipeline execution creates a trace with unique trace_id, capturing start/end timestamps and overall duration
  2. Each pipeline step is recorded as a span with timing data
  3. Trace context propagates correctly across async boundaries
  4. Agent prompts and responses are captured and stored alongside timing data
  5. Traces can be queried from InsForge by trace_id, telegram_id, pipeline name, and date range

**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Tracing core module (TraceContext, traced_span, TraceCollector) + storage layer (TraceRepo, SQL migration)
- [x] 01-02-PLAN.md — Handler instrumentation (wire TraceCollector lifecycle in main.py, wrap learn/train/support call sites)
- [x] 01-03-PLAN.md — Step-level instrumentation (apply @traced_span to agent .run() methods and LLM .complete() calls)

### Phase 2: Operations - Admin Commands & Synthetic Testing (MERGED INTO v2.0)

Merged into v2.0 as Phase 9 (Admin & Observability). Admin tooling is more valuable once the new agent system exists to observe.

</details>

---

### v2.0 AI Sales Partner

**Milestone Goal:** Transform the command-driven bot into a conversation-driven AI sales partner with multi-agent orchestration, CRM capabilities, and proactive coaching.

## Phases (v2.0)

- [ ] **Phase 3: Agent Infrastructure** - ToolUseAgent base class, agents.yaml config, complete_with_tools() extension, conversation history store
- [ ] **Phase 4: Deal Storage + Deal Agent** - InsForge deals/deal_notes tables, DealAgent with full CRM lifecycle and confirmation flow
- [ ] **Phase 5: Orchestrator + Natural Language Handler** - LLM-driven routing, catch-all handler, voice routing, backward compat, fallback
- [ ] **Phase 6: Coach + Strategy Agents** - Wrap existing pipelines, add coaching and strategy tool-use loops
- [ ] **Phase 7: Memory Agent** - Persistent memory with inactivity-timer updates and context injection into specialist prompts
- [ ] **Phase 8: Proactive Features** - Daily brief, stale deal nudges, context-triggered alerts, APScheduler integration
- [ ] **Phase 9: Admin & Observability** - Admin traces/health/agent-stats commands for the new agent system

## Phase Details

### Phase 3: Agent Infrastructure

**Goal**: The foundation for all specialist agents exists — ToolUseAgent base class runs tool-use loops, agents.yaml configures agent behavior, LLM provider supports function calling, and per-user conversation history accumulates across turns

**Depends on**: Phase 1 (tracing infrastructure, existing LLM router, existing InsForge client)

**Requirements**: NLR-03

**Success Criteria** (what must be TRUE):
  1. A ToolUseAgent subclass can be instantiated from agents.yaml config and execute a tool-use loop against OpenRouter without infinite looping (max_iterations enforced)
  2. Conversation history stores the last N turns per user in memory and returns them as ordered message context for any agent call
  3. The LLM provider's complete_with_tools() method sends function definitions to OpenRouter and returns either a text response or a tool call for the caller to execute
  4. All agent infrastructure components have tracing wired in so every tool-use loop generates observable spans

**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Deal Storage + Deal Agent

**Goal**: A salesperson can manage their full deal portfolio through the bot — creating, querying, updating, and annotating deals — with all writes protected by an inline confirmation step before execution

**Depends on**: Phase 3 (ToolUseAgent base class, agents.yaml, complete_with_tools())

**Requirements**: DEAL-01, DEAL-02, DEAL-03, DEAL-04, DEAL-05, DEAL-06, DEAL-07

**Success Criteria** (what must be TRUE):
  1. User can describe a new deal in natural language and it gets created in InsForge with correct fields (company, value, stage, date)
  2. User can query deal status for a named deal and receive current stage, last update, and any logged notes
  3. User can request a stage update, receive a confirmation keyboard, and the deal stage only changes after tapping Confirm
  4. User can log a note on a deal and it persists in InsForge linked to the correct deal
  5. User can request portfolio view ("show my active deals" or "deals at risk") and receive a formatted list capped at 10 results
  6. Deals progress through defined stages (lead → qualified → proposal → negotiation → closed-won/lost) with the stage validated at the DB level

**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD
- [ ] 04-03: TBD

### Phase 5: Orchestrator + Natural Language Handler

**Goal**: Any message the user sends — text or voice — is intelligently routed to the correct specialist agent, existing commands continue working exactly as before, and the orchestrator recovers gracefully when a specialist fails

**Depends on**: Phase 3 (ToolUseAgent, conversation history, complete_with_tools()), Phase 4 (DealAgent registered and available)

**Requirements**: NLR-01, NLR-02, NLR-04, NLR-05

**Success Criteria** (what must be TRUE):
  1. User sends a free-form text message and the bot routes it to the correct specialist (deal, coach, strategy) without the user invoking any command
  2. User sends a voice message and it gets transcribed, routed through the orchestrator, and answered by the appropriate specialist
  3. User runs /learn, /train, or /support and the original pipeline handler fires — not the orchestrator
  4. When a specialist agent fails or times out (90s), the orchestrator returns a graceful fallback message rather than silently hanging or throwing an error
  5. A typing indicator appears within 2 seconds of any message being sent to the orchestrator and continues every 4 seconds until a response is delivered

**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD
- [ ] 05-03: TBD

### Phase 6: Coach + Strategy Agents

**Goal**: A salesperson can request any coaching or strategy assistance through natural language and the bot delivers it by wrapping the existing training and strategy pipelines — no duplication of existing logic

**Depends on**: Phase 5 (orchestrator routing to specialist agents)

**Requirements**: COACH-01, COACH-02, COACH-03, COACH-04, STRAT-01, STRAT-02, STRAT-03, STRAT-04, STRAT-05

**Success Criteria** (what must be TRUE):
  1. User can say "practice pricing objections" in natural language and receive an objection handling scenario from the existing training pipeline
  2. User can request coaching on a specific topic ("teach me cold calling") and receive structured training content
  3. User can ask for skill assessment ("how am I doing on objection handling?") and receive qualitative feedback based on past attempts
  4. User can say "prep me for my Acme call" and receive a call briefing that draws on deal context and company knowledge
  5. User can ask for competitive intel or a re-engagement draft and receive a response grounded in the company knowledge base

**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

### Phase 7: Memory Agent

**Goal**: The bot learns a salesperson's patterns and preferences over time and injects that context into specialist responses — memory updates happen quietly in the background, not after every message

**Depends on**: Phase 5 (orchestrator running, conversation history accumulated), Phase 4 (deal context available)

**Requirements**: MEM-01, MEM-02, MEM-03, MEM-04

**Success Criteria** (what must be TRUE):
  1. After a series of conversations, the bot's responses reflect awareness of the user's recurring patterns (preferred objection tactics, deal types, common scenarios) without the user restating them
  2. Memory updates trigger on an inactivity timer (5 minutes after last message) rather than after every message — no extra LLM call per turn
  3. A specialist agent prompt includes a memory context block with personalized user context drawn from InsForge
  4. Memory persists across bot restarts — stored in InsForge, not in-process memory

**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD

### Phase 8: Proactive Features

**Goal**: The bot surfaces deal and coaching intelligence proactively — a morning briefing every day and nudges when deals go stale — without any one user failure stopping delivery for other users

**Depends on**: Phase 4 (deal data), Phase 6 (coach/strategy output), Phase 7 (memory personalization)

**Requirements**: PRO-01, PRO-02, PRO-03, PRO-04

**Success Criteria** (what must be TRUE):
  1. User receives a morning briefing at a consistent time each day containing deal status, a coaching nudge, and any stale deal alerts
  2. When a deal has not moved in N days, the user receives an unprompted nudge identifying the deal and suggesting a next action
  3. When a practice streak is about to break, the user receives a context-triggered alert encouraging engagement
  4. If one user's proactive message fails (blocked bot, network error), all other users still receive their messages that day

**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD

### Phase 9: Admin & Observability

**Goal**: An admin can inspect the health and behavior of the new multi-agent system — viewing recent traces, checking per-agent error rates, and getting a bot health snapshot — all through existing /admin commands

**Depends on**: Phase 5 (orchestrator traces flowing), Phase 6 (specialist agent traces)

**Requirements**: ADM-01, ADM-02, ADM-03

**Success Criteria** (what must be TRUE):
  1. Admin runs /admin traces and sees the 10 most recent orchestrator + specialist agent executions with routing decisions, step timing, and any errors
  2. Admin runs /admin health and sees bot uptime, total messages routed today, per-agent call counts, and average response time
  3. Admin runs /admin stats (or /admin agents) and sees routing distribution across specialists, error rates per agent, and any agents above threshold error rate

**Plans**: TBD

Plans:
- [ ] 09-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 3 → 4 → 5 → 6 → 7 → 8 → 9

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation - Tracing Infrastructure & Storage | v1.0 | 3/3 | Complete | 2026-02-02 |
| 2. Operations - Admin Commands (MERGED) | v1.0 | -/- | Merged into Phase 9 | - |
| 3. Agent Infrastructure | v2.0 | 0/TBD | Not started | - |
| 4. Deal Storage + Deal Agent | v2.0 | 0/TBD | Not started | - |
| 5. Orchestrator + Natural Language Handler | v2.0 | 0/TBD | Not started | - |
| 6. Coach + Strategy Agents | v2.0 | 0/TBD | Not started | - |
| 7. Memory Agent | v2.0 | 0/TBD | Not started | - |
| 8. Proactive Features | v2.0 | 0/TBD | Not started | - |
| 9. Admin & Observability | v2.0 | 0/TBD | Not started | - |

---
*Last updated: 2026-02-24 — v2.0 roadmap created*
