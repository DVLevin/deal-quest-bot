# Roadmap: Deal Quest Bot — Pipeline Observability & Testing

## Overview

Build observability and testing infrastructure for Deal Quest Bot's AI pipelines. Phase 1 establishes the foundation with trace collection, storage, and instrumentation. Phase 2 adds operational maturity with admin commands, synthetic tests, and error tracking. The system enables admins to see exactly where time is spent and what went wrong in every pipeline execution.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation - Tracing Infrastructure & Storage** - Instrument pipelines, collect traces, persist to InsForge
- [ ] **Phase 2: Operations - Admin Commands & Synthetic Testing** - Query traces via /admin, run synthetic tests, track errors and costs

## Phase Details

### Phase 1: Foundation - Tracing Infrastructure & Storage

**Goal**: Every pipeline execution generates a trace with step-level timing and agent I/O, persisted to InsForge for later analysis

**Depends on**: Nothing (first phase)

**Requirements**: TRACE-01, TRACE-02, TRACE-03, TRACE-04, TRACE-05, TRACE-06

**Success Criteria** (what must be TRUE):
  1. Pipeline execution creates a trace with unique trace_id, capturing start/end timestamps and overall duration
  2. Each pipeline step (handler entry, LLM call, DB write, Telegram API call) is recorded as a span with timing data
  3. Trace context propagates correctly across async boundaries so spans created in background tasks link to the parent trace
  4. Agent prompts and responses are captured and stored alongside timing data
  5. Traces can be queried from InsForge by trace_id, telegram_id, pipeline name, and date range

**Plans**: TBD (to be refined during planning)

Plans:
- [ ] 01-01: TBD
- [ ] 01-02: TBD
- [ ] 01-03: TBD

### Phase 2: Operations - Admin Commands & Synthetic Testing

**Goal**: Admins can debug pipelines via /admin commands, run synthetic tests manually, and track errors and costs

**Depends on**: Phase 1

**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ERR-01, ERR-02, ERR-03, TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, REC-01, REC-02, REC-03, COST-01, COST-02

**Success Criteria** (what must be TRUE):
  1. Admin can run /admin health and see bot uptime, error count, and average pipeline duration
  2. Admin can run /admin traces and see the 10 most recent pipeline executions with status and timing
  3. Admin can drill down into a specific trace to see per-step timing breakdown
  4. Admin can run /admin test to trigger synthetic tests through real pipelines and see pass/fail results
  5. Admin can run /admin errors to see recent pipeline failures with error messages
  6. Every real user pipeline execution is automatically traced and queryable
  7. Test results show estimated token cost per test scenario

**Plans**: TBD (to be refined during planning)

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation - Tracing Infrastructure & Storage | 0/TBD | Not started | - |
| 2. Operations - Admin Commands & Synthetic Testing | 0/TBD | Not started | - |

---
*Last updated: 2026-02-02 after initial roadmap creation*
