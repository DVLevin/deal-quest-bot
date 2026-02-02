# Requirements: Deal Quest Bot — Pipeline Observability & Testing

**Defined:** 2026-02-02
**Core Value:** Know exactly where time is spent and what went wrong in every pipeline execution

## v1 Requirements

### Tracing Infrastructure

- [x] **TRACE-01**: Every pipeline execution generates a trace with unique trace_id, capturing start/end timestamps and overall duration
- [x] **TRACE-02**: Each pipeline step (handler entry, LLM call, DB write, Telegram API call, transcription) is recorded as a span with name, start/end time, and parent trace_id
- [x] **TRACE-03**: Trace context propagates across async boundaries using contextvars so spans created in subtasks link to the correct parent trace
- [x] **TRACE-04**: Agent I/O is captured per span — full prompt sent to LLM and full response received, stored alongside timing data
- [x] **TRACE-05**: Traces persist in an InsForge `pipeline_traces` table with spans in a `pipeline_spans` table, queryable by trace_id, telegram_id, pipeline name, and date range
- [x] **TRACE-06**: Trace instrumentation wraps existing call sites (context manager pattern like ProgressUpdater) without modifying PipelineRunner internals

### Admin Health

- [ ] **ADMIN-01**: `/admin health` displays bot uptime, total traces in last 24h, error count in last 24h, and average end-to-end pipeline duration per pipeline type
- [ ] **ADMIN-02**: `/admin traces` shows the 10 most recent pipeline executions with: pipeline name, user, total duration, step count, and success/fail status
- [ ] **ADMIN-03**: `/admin traces` supports drill-down — tapping a trace shows per-step breakdown with step name and duration for that specific trace
- [ ] **ADMIN-04**: `/admin test` triggers the synthetic test suite and reports results inline with per-test timing and pass/fail status
- [ ] **ADMIN-05**: Failed pipelines surface in `/admin health` with error message and the trace_id for drill-down

### Error Tracking

- [ ] **ERR-01**: Pipeline exceptions are captured in the trace with error type, message, and truncated stack trace
- [ ] **ERR-02**: `/admin errors` shows recent pipeline failures with timestamp, pipeline name, user, error message, and trace_id link
- [ ] **ERR-03**: Errors are classified by type (LLM failure, DB error, transcription failure, Telegram API error, timeout) for filtering

### Synthetic Testing

- [ ] **TEST-01**: 5-10 predefined test scenarios exist covering: learn text, learn voice (mock audio), train text, train voice (mock audio), support text, support voice (mock audio), support photo (mock image), support regeneration
- [ ] **TEST-02**: Each synthetic test executes through the real pipeline with real LLM calls, producing a trace identical to a real user interaction
- [ ] **TEST-03**: `/admin test` is manual-trigger only — never automated or scheduled — to control LLM costs
- [ ] **TEST-04**: Test results show per-test: scenario name, total duration, per-step timing, pass/fail, and estimated token cost
- [ ] **TEST-05**: Tests use the shared OpenRouter API key (not user keys) and a dedicated test telegram_id to avoid polluting real user data

### Real Interaction Recording

- [ ] **REC-01**: Every real user pipeline execution is automatically traced and stored (not just synthetic tests)
- [ ] **REC-02**: Real interaction traces include the same step-level timing and agent I/O as synthetic tests
- [ ] **REC-03**: Traces are linked to telegram_id so admin can filter traces by specific user

### Cost Tracking

- [ ] **COST-01**: Each trace records estimated token usage (prompt tokens + completion tokens) for LLM calls within the pipeline
- [ ] **COST-02**: `/admin test` results include per-test estimated cost based on token count and model pricing

## v2 Requirements

### Trace Visualization (TMA)

- **VIZ-01**: Trace timeline/Gantt view showing parallel and sequential spans visually in the Telegram Mini App
- **VIZ-02**: Flamegraph view for identifying time distribution across pipeline steps
- **VIZ-03**: Full agent I/O viewer — expand any span to see complete prompt and response text

### Analytics (TMA)

- **ANAL-01**: Bottleneck analysis dashboard — aggregate timing data across traces to identify systemic slow steps
- **ANAL-02**: Historical cost trends — token usage and estimated cost over time, per pipeline type
- **ANAL-03**: Per-user cost breakdown — which users consume the most LLM resources

## Out of Scope

| Feature | Reason |
|---------|--------|
| Distributed tracing (OpenTelemetry/Jaeger) | Single-process bot, overkill complexity |
| Real-time alerting (PagerDuty/Slack) | Manual /admin checks sufficient at current scale |
| Web dashboard | Deferred to TMA, not a standalone web app |
| Automated/scheduled test runs | LLM cost control — manual trigger only |
| Load testing | Not needed at current user count |
| Log aggregation service (ELK/Loki) | stdout logging sufficient, InsForge for structured traces |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TRACE-01 | Phase 1 | Complete |
| TRACE-02 | Phase 1 | Complete |
| TRACE-03 | Phase 1 | Complete |
| TRACE-04 | Phase 1 | Complete |
| TRACE-05 | Phase 1 | Complete |
| TRACE-06 | Phase 1 | Complete |
| ADMIN-01 | Phase 2 | Pending |
| ADMIN-02 | Phase 2 | Pending |
| ADMIN-03 | Phase 2 | Pending |
| ADMIN-04 | Phase 2 | Pending |
| ADMIN-05 | Phase 2 | Pending |
| ERR-01 | Phase 2 | Pending |
| ERR-02 | Phase 2 | Pending |
| ERR-03 | Phase 2 | Pending |
| TEST-01 | Phase 2 | Pending |
| TEST-02 | Phase 2 | Pending |
| TEST-03 | Phase 2 | Pending |
| TEST-04 | Phase 2 | Pending |
| TEST-05 | Phase 2 | Pending |
| REC-01 | Phase 2 | Pending |
| REC-02 | Phase 2 | Pending |
| REC-03 | Phase 2 | Pending |
| COST-01 | Phase 2 | Pending |
| COST-02 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

---
*Requirements defined: 2026-02-02*
*Last updated: 2026-02-02 after Phase 1 completion*
