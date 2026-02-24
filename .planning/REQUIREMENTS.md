# Requirements: Deal Quest Bot — AI Sales Partner

**Defined:** 2026-02-24
**Core Value:** A salesperson can chat naturally in Telegram about any sales need and the AI partner understands, routes, and acts

## v1 Requirements (v1.0 — Observability)

### Tracing Infrastructure

- [x] **TRACE-01**: Every pipeline execution generates a trace with unique trace_id, capturing start/end timestamps and overall duration
- [x] **TRACE-02**: Each pipeline step is recorded as a span with name, start/end time, and parent trace_id
- [x] **TRACE-03**: Trace context propagates across async boundaries using contextvars
- [x] **TRACE-04**: Agent I/O is captured per span — full prompt and response stored alongside timing data
- [x] **TRACE-05**: Traces persist in InsForge pipeline_traces/pipeline_spans tables, queryable by trace_id, telegram_id, pipeline name, and date range
- [x] **TRACE-06**: Trace instrumentation wraps existing call sites without modifying PipelineRunner internals

## v2 Requirements (v2.0 — AI Sales Partner)

### Natural Language Routing

- [ ] **NLR-01**: User can send any text message and the orchestrator routes it to the correct specialist agent
- [ ] **NLR-02**: User can send voice messages that get transcribed and routed through the orchestrator
- [ ] **NLR-03**: Conversation history persists across messages within a session (sliding window per user)
- [ ] **NLR-04**: Existing /learn, /train, /support commands continue to work as shortcuts alongside natural language
- [ ] **NLR-05**: Orchestrator gracefully falls back to direct response when specialist fails or times out

### Deal Management

- [ ] **DEAL-01**: User can create a deal through natural language ("I just got off a call with Acme, 50K deal")
- [ ] **DEAL-02**: User can query deal status ("What's the status of my Acme deal?")
- [ ] **DEAL-03**: User can update deal stage with confirmation ("Move Acme to negotiation" → confirm button)
- [ ] **DEAL-04**: User can log notes on a deal ("Log that Acme wants a discount")
- [ ] **DEAL-05**: User can view multi-deal portfolio ("Show me all active deals" / "Deals at risk this week")
- [ ] **DEAL-06**: All CRM write operations require inline keyboard confirmation before execution
- [ ] **DEAL-07**: Deals have structured stages (lead → qualified → proposal → negotiation → closed-won/lost)

### Coaching

- [ ] **COACH-01**: User can request objection handling practice through natural language
- [ ] **COACH-02**: User can request training on specific topics ("Teach me about cold calling")
- [ ] **COACH-03**: Coach Agent wraps existing /learn and /train pipelines for natural language access
- [ ] **COACH-04**: User can ask for skill assessment ("How am I doing on objection handling?")

### Strategy

- [ ] **STRAT-01**: User can request call preparation ("Prep me for my Acme call")
- [ ] **STRAT-02**: User can ask for competitive intel ("What do we say when they compare us to CompetitorX?")
- [ ] **STRAT-03**: User can request re-engagement drafts ("Draft a follow-up for the cold Acme deal")
- [ ] **STRAT-04**: User can get deal risk assessment (qualitative flags, not hard percentages)
- [ ] **STRAT-05**: Strategy Agent leverages deal context and company knowledge for advice

### Memory

- [ ] **MEM-01**: Memory Agent learns salesperson's patterns and preferences over time
- [ ] **MEM-02**: Memory updates happen in the background (inactivity timer, not per-message)
- [ ] **MEM-03**: Memory context is injected into specialist agent prompts for personalization
- [ ] **MEM-04**: Memory persists across sessions in InsForge

### Proactive

- [ ] **PRO-01**: Daily combined morning briefing (deal status + coaching nudge + alerts)
- [ ] **PRO-02**: Stale deal detection and nudge when deal hasn't moved in N days
- [ ] **PRO-03**: Context-triggered alerts (deal went silent, practice streak breaking)
- [ ] **PRO-04**: Proactive messages use per-user error isolation (one failure doesn't kill scheduler)

### Admin & Observability

- [ ] **ADM-01**: Admin can view recent agent execution traces via /admin traces
- [ ] **ADM-02**: Admin can check bot health and agent performance via /admin health
- [ ] **ADM-03**: Admin can see agent routing statistics and error rates

## Future Requirements

### External CRM Sync

- **CRM-01**: Bot syncs deals bidirectionally with external CRM (HubSpot/Pipedrive)
- **CRM-02**: CRM status changes reflected in bot deal data automatically
- **CRM-03**: Bot can create tasks/activities in external CRM

### Trace Visualization (TMA)

- **VIZ-01**: Trace timeline view in Telegram Mini App
- **VIZ-02**: Full agent I/O viewer — expand any span to see complete prompt and response
- **VIZ-03**: Bottleneck analysis dashboard

### Team Features

- **TEAM-01**: Deals shared between team members with permissions
- **TEAM-02**: Team performance dashboard for managers

## Out of Scope

| Feature | Reason |
|---------|--------|
| External CRM sync (HubSpot, Pipedrive) | Planned for future milestone — bot is the CRM for now |
| TMA changes | This milestone is purely Telegram chat |
| Autonomous email sending | Trust/legal risk — bot drafts text, user sends manually |
| Calendar/scheduling integration | Complex APIs, not core value |
| Multi-user team features | Requires permissions model — future milestone |
| Win probability as hard percentage | LLM confidence scores unreliable without calibration data |
| Distributed tracing (OpenTelemetry) | Overkill for single-process bot |
| Automated/scheduled synthetic tests | LLM cost control |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TRACE-01 | Phase 1 (v1.0) | Complete |
| TRACE-02 | Phase 1 (v1.0) | Complete |
| TRACE-03 | Phase 1 (v1.0) | Complete |
| TRACE-04 | Phase 1 (v1.0) | Complete |
| TRACE-05 | Phase 1 (v1.0) | Complete |
| TRACE-06 | Phase 1 (v1.0) | Complete |
| NLR-01 | Phase 5 | Pending |
| NLR-02 | Phase 5 | Pending |
| NLR-03 | Phase 3 | Pending |
| NLR-04 | Phase 5 | Pending |
| NLR-05 | Phase 5 | Pending |
| DEAL-01 | Phase 4 | Pending |
| DEAL-02 | Phase 4 | Pending |
| DEAL-03 | Phase 4 | Pending |
| DEAL-04 | Phase 4 | Pending |
| DEAL-05 | Phase 4 | Pending |
| DEAL-06 | Phase 4 | Pending |
| DEAL-07 | Phase 4 | Pending |
| COACH-01 | Phase 6 | Pending |
| COACH-02 | Phase 6 | Pending |
| COACH-03 | Phase 6 | Pending |
| COACH-04 | Phase 6 | Pending |
| STRAT-01 | Phase 6 | Pending |
| STRAT-02 | Phase 6 | Pending |
| STRAT-03 | Phase 6 | Pending |
| STRAT-04 | Phase 6 | Pending |
| STRAT-05 | Phase 6 | Pending |
| MEM-01 | Phase 7 | Pending |
| MEM-02 | Phase 7 | Pending |
| MEM-03 | Phase 7 | Pending |
| MEM-04 | Phase 7 | Pending |
| PRO-01 | Phase 8 | Pending |
| PRO-02 | Phase 8 | Pending |
| PRO-03 | Phase 8 | Pending |
| PRO-04 | Phase 8 | Pending |
| ADM-01 | Phase 9 | Pending |
| ADM-02 | Phase 9 | Pending |
| ADM-03 | Phase 9 | Pending |

**Coverage:**
- v2 requirements: 32 total (NLR: 5, DEAL: 7, COACH: 4, STRAT: 5, MEM: 4, PRO: 4, ADM: 3)
- Mapped to phases: 32/32
- Unmapped: 0

---
*Requirements defined: 2026-02-24*
*Last updated: 2026-02-24 — traceability complete after v2.0 roadmap*
