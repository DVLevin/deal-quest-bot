# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-24)

**Core value:** A salesperson can chat naturally in Telegram about any sales need and the AI partner understands, routes, and acts
**Current focus:** Milestone v2.0 — AI Sales Partner (defining requirements)

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-02-24 — Milestone v2.0 started

## Performance Metrics

**Velocity:**
- Total plans completed: 3 (from v1.0)
- v2.0 plans completed: 0

**By Milestone:**

| Milestone | Phases | Plans | Status |
|-----------|--------|-------|--------|
| v1.0 Observability | 1/2 | 3/3 | Complete (Phase 2 merged into v2.0) |
| v2.0 AI Sales Partner | TBD | TBD | Defining requirements |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Carried forward from v1.0:

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 01-01 | Use ContextVar instead of thread-local | threading.local fails in asyncio, contextvars propagates automatically |
| 01-01 | Dual timing (datetime + perf_counter) | Avoid clock mixing, perf_counter is monotonic and high-precision |
| 01-01 | No FK constraint spans→traces | PostgREST ordering issues, collector may insert spans before trace |
| 01-01 | 50KB limit on I/O serialization | Prevent storage explosion from large LLM I/O |
| 01-02 | TraceContext outside ProgressUpdater | Trace full execution including progress updates |
| 01-03 | Span naming: agent:{name}, llm:{provider} | Clear categorization for filtering and analysis |
| v2.0 | Bot is the CRM (InsForge) | External CRM sync deferred to future milestone |
| v2.0 | Multi-agent orchestrator pattern | Inspired by ClickUp MCP bot — proven in production |
| v2.0 | Existing commands kept as shortcuts | Backward compatibility for power users |

### Pending Todos

- Execute SQL migration `insforge/migrations/001_pipeline_traces.sql` via InsForge dashboard before testing
- Future: External CRM sync (HubSpot/Pipedrive) — captured for future milestone

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-24
Stopped at: Milestone v2.0 initialization — moving to research + requirements
Resume file: None
