# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-24)

**Core value:** A salesperson can chat naturally in Telegram about any sales need and the AI partner understands, routes, and acts
**Current focus:** Phase 3 — Agent Infrastructure (v2.0 AI Sales Partner)

## Current Position

Phase: 3 of 9 (Agent Infrastructure)
Plan: 1 of 2 in current phase
Status: In progress
Last activity: 2026-02-25 — Completed 03-01 (agent framework: agents.yaml, config.py, complete_with_tools, ToolUseAgent)

Progress: [█░░░░░░░░░] 10% (v2.0 plans: 1/TBD)

## Performance Metrics

**Velocity:**
- Total plans completed: 4 (3 from v1.0, 1 from v2.0)
- v2.0 plans completed: 1

**By Milestone:**

| Milestone | Phases | Plans | Status |
|-----------|--------|-------|--------|
| v1.0 Observability | 1 shipped | 3/3 | Complete |
| v2.0 AI Sales Partner | 7 planned (3-9) | 1/TBD | In progress |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Key decisions for v2.0:

- [v2.0] Multi-agent orchestrator pattern — inspired by ClickUp MCP bot, proven in production
- [v2.0] Bot is the CRM (InsForge) — external CRM sync deferred to future milestone
- [v2.0] Existing commands kept as shortcuts — backward compatibility constraint from day one
- [v2.0] Confirmation-first for all CRM writes — inline keyboards before any deal mutation
- [v2.0] apscheduler>=3.10,<4.0 — only new dependency; v4 is pre-release alpha, must not be used
- [v2.0] Orchestrator gets no knowledge base — routing prompt target <2000 tokens; specialists get domain knowledge
- [03-01] ToolUseAgent is a separate hierarchy from v1.0 BaseAgent — both coexist, no inheritance link
- [03-01] ClaudeProvider.complete_with_tools() raises NotImplementedError — tool support deferred to future phase
- [03-01] Tool schemas built dynamically from AgentConfig.tools at loop entry — config-driven tool sets
- [03-01] Agent defaults merged at load time (not runtime) — single validated AgentConfig per agent

### Pending Todos

- Verify PostgREST operator support (gte, lt, date arithmetic) against live InsForge instance before Phase 4 deal query tools
- Decide pipeline stage enum values before Phase 4 deals table migration (7 values suggested: lead/qualified/proposal/negotiation/won/lost/stalled)
- Decide orchestrator model selection — cheap/fast model for routing classification vs openai/gpt-oss-120b default
- Assess Railway restart frequency — if high, conversation history needs InsForge persistence (Phase 3 scope expansion)
- Decide /support backward compat path — route through orchestrator as shortcut vs keep parallel StrategistAgent path

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-25
Stopped at: Completed 03-01-PLAN.md — agent framework (agents.yaml, config.py, complete_with_tools, ToolUseAgent)
Resume file: None
