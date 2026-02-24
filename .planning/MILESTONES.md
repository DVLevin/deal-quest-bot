# Milestones

## v1.0 — Pipeline Observability Foundation

**Completed:** 2026-02-02
**Phases:** 1 (of 2 planned — Phase 2 merged into v2.0)

**What shipped:**
- Pipeline tracing infrastructure (TraceContext, traced_span, TraceCollector)
- InsForge storage layer (pipeline_traces, pipeline_spans tables)
- Handler instrumentation (learn, train, support wrapped with tracing)
- Step-level instrumentation (@traced_span on agent .run() and LLM .complete())

**What carried forward:**
- Phase 2 (admin commands, synthetic tests) → folded into v2.0 as debugging tools for new agent system

**Last phase number:** 2

---

## v2.0 — AI Sales Partner (Current)

**Started:** 2026-02-24
**Phases:** TBD (defining requirements)

**Goal:** Transform command-driven bot into conversation-driven AI sales partner with multi-agent orchestration, CRM capabilities, and proactive coaching.
