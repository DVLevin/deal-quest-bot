# Deal Quest Bot — AI Sales Partner

## What This Is

A conversational AI sales partner inside Telegram that helps salespeople manage deals, prepare for calls, practice selling skills, and get proactive coaching — all through natural language. Instead of navigating commands, the salesperson just talks to the bot like a colleague. An orchestrator LLM routes requests to specialist agents (Deal, Coach, Strategy, Memory) that execute via tool-use loops.

## Core Value

A salesperson can chat naturally in Telegram about any sales need — deals, training, strategy, follow-ups — and the AI partner understands, routes to the right specialist, and acts. No commands required.

## Current Milestone: v2.0 AI Sales Partner

**Goal:** Transform the command-driven bot into a conversation-driven AI sales partner with multi-agent orchestration, CRM capabilities, and proactive coaching.

**Target features:**
- Natural language routing via Orchestrator → Specialist agents
- Deal management (CRM inside the bot — InsForge backend)
- Proactive coaching (daily combined brief + context-triggered nudges)
- Strategy assistance (call prep, deal analysis, competitive intel)
- Persistent memory (learns salesperson's patterns and context)
- Observability admin tools (folded from previous Phase 2)

## Requirements

### Validated

- ✓ Telegram bot with aiogram 3 FSM-based handlers — v1.0
- ✓ Agent pipeline system (PipelineRunner, YAML configs, sequential/parallel/background execution) — v1.0
- ✓ Three agent pipelines: learn (trainer), train (trainer), support (strategist) — v1.0
- ✓ Voice transcription via AssemblyAI — v1.0
- ✓ InsForge (PostgREST) data layer with repository pattern — v1.0
- ✓ Admin handler with username-based authorization — v1.0
- ✓ Real-time progress updates during processing (ProgressUpdater) — v1.0
- ✓ User API key encryption/decryption (CryptoService) — v1.0
- ✓ Background tasks (followup scheduler, scenario generation) — v1.0
- ✓ Pipeline tracing with step-level timing and agent I/O capture — v1.0
- ✓ Trace persistence to InsForge pipeline_traces/pipeline_spans tables — v1.0

### Active

- [ ] Orchestrator agent — LLM-driven message routing to specialist agents
- [ ] Deal Agent — CRM operations: create/update deals, log notes, track pipeline stages
- [ ] Coach Agent — training, practice sessions, objection handling, skill assessment
- [ ] Strategy Agent — deal analysis, call preparation, competitive intel, re-engagement plans
- [ ] Memory Agent — learns salesperson patterns, preferences, deal history context
- [ ] Natural language message handling — catch-all handler routes to orchestrator instead of FSM
- [ ] Tool-use loop architecture — agents execute tools iteratively until task complete
- [ ] Confirmation-first writes — inline keyboards for approval before CRM mutations
- [ ] Daily combined briefing — morning message with deal status + coaching nudge + alerts
- [ ] Context-triggered nudges — proactive messages when deals go stale or practice streaks break
- [ ] Admin traces/health commands — debugging tools for the new agent system
- [ ] Conversation history — sliding window context management per user

### Out of Scope

- External CRM sync (HubSpot, Pipedrive, etc.) — planned for future milestone, bot is CRM for now
- TMA changes — this milestone is purely Telegram chat, TMA evolves separately
- Distributed tracing (OpenTelemetry/Jaeger) — overkill for single-process bot
- Full PipelineRunner rewrite — new agent system works alongside existing pipelines
- Multi-language support — English only for now

## Context

- Bot runs as a single Python async process with aiogram long polling
- All data persists in InsForge (PostgREST over PostgreSQL)
- Existing pipelines (learn, train, support) will be wrapped by the new Coach/Strategy agents
- Voice messages supported via AssemblyAI transcription — should work with natural language routing
- Admin handler already exists at `bot/handlers/admin.py`
- Reference architecture: ClickUp MCP bot at `/Users/dmytrolevin/Desktop/clickup mcp/` — TypeScript/grammY implementation of the same pattern (Orchestrator + BaseAgent + tool-use loops + confirmation messages)
- The ClickUp bot uses OpenRouter for LLM calls, agents.yaml for config, markdown prompt templates with {{token}} substitution
- Current default LLM: z-ai/glm-5 via OpenRouter

## Constraints

- **Stack**: Python/aiogram 3 — must integrate with existing async patterns (ClickUp ref is TypeScript, needs adaptation)
- **Storage**: InsForge tables — consistent with existing data layer, no local SQLite
- **Telegram limits**: 4096-char messages, inline keyboards for confirmations
- **LLM costs**: All agent calls go through OpenRouter — cost-aware routing needed
- **Backward compatibility**: Existing /learn, /train, /support commands should still work as shortcuts alongside natural language

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| InsForge for trace storage | Consistent with existing data layer, accessible from future TMA | ✓ Good |
| Instrument at handler level, not runner internals | Minimal code changes, wrap call sites like ProgressUpdater does | ✓ Good |
| Bot is the CRM (InsForge) | External CRM sync deferred to future milestone | — Pending |
| Multi-agent orchestrator pattern (inspired by ClickUp MCP) | Proven architecture for natural language → action routing, already working in production | — Pending |
| Python adaptation of TypeScript BaseAgent pattern | Same concept (tool-use loops, agent config YAML) adapted to aiogram/async Python | — Pending |
| Confirmation-first for CRM writes | Prevents accidental deal mutations, builds user trust | — Pending |
| Existing commands as shortcuts | Backward compatibility, power users keep fast paths | — Pending |

---
*Last updated: 2026-02-24 after milestone v2.0 initialization*
