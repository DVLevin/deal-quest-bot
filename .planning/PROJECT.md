# Deal Quest Bot — Pipeline Observability & Testing

## What This Is

An observability, tracing, and automated testing system for Deal Quest Bot's AI pipelines. Lets the admin and developer see exactly what every pipeline step does, how long it takes, and whether anything is broken — first via Telegram `/admin` commands, later surfaced in the Telegram Mini App.

## Core Value

Know exactly where time is spent and what went wrong in every pipeline execution, so bottlenecks can be identified and fixed before users notice.

## Requirements

### Validated

- ✓ Telegram bot with aiogram 3 FSM-based handlers — existing
- ✓ Agent pipeline system (PipelineRunner, YAML configs, sequential/parallel/background execution) — existing
- ✓ Three agent pipelines: learn (trainer), train (trainer), support (strategist) — existing
- ✓ Voice transcription via AssemblyAI — existing
- ✓ InsForge (PostgREST) data layer with repository pattern — existing
- ✓ Admin handler with username-based authorization — existing
- ✓ Real-time progress updates during processing (ProgressUpdater) — existing
- ✓ User API key encryption/decryption (CryptoService) — existing
- ✓ Background tasks (followup scheduler, scenario generation) — existing

### Active

- [ ] Pipeline tracing — instrument every step (handler entry, LLM call, DB write, message edit) with timing
- [ ] Trace persistence — store traces in InsForge `pipeline_traces` table
- [ ] Admin health command — `/admin health` shows bot uptime, recent error rate, avg response times
- [ ] Admin traces command — `/admin traces` shows recent pipeline executions with per-step timing
- [ ] Admin test command — `/admin test` runs predefined synthetic test cases through real pipelines with real LLM calls
- [ ] Synthetic test suite — 5-10 predefined test scenarios covering learn text, learn voice, train text, train voice, support text, support voice, support photo, support regeneration
- [ ] Real interaction recording — capture traces from actual user sessions for later analysis
- [ ] Per-step timing breakdown — see time for: message parsing, LLM generation, DB operations, Telegram API calls
- [ ] Agent I/O capture — store full prompt/response for each agent step (for later TMA deep-dive)
- [ ] Summary view in /admin — step name + timing per step + total end-to-end timing
- [ ] Error tracking — surface failed pipelines with error context in /admin

### Out of Scope

- Web dashboard — will be in TMA (Telegram Mini App) later, not this project
- Full I/O display in /admin — Telegram messages too small for full prompts; save data for TMA
- Distributed tracing (OpenTelemetry/Jaeger) — overkill for single-process bot
- Real-time alerting/PagerDuty — manual /admin checks sufficient for current scale
- Load testing — not needed at current user count

## Context

- Bot runs as a single Python async process with aiogram long polling
- All data persists in InsForge (PostgREST over PostgreSQL)
- Three main pipelines: learn, train, support — each runs 2-3 agents sequentially/in parallel
- Voice messages add a transcription step before pipeline execution
- The ProgressUpdater already touches the status message during processing — tracing hooks into the same flow
- Admin handler already exists at `bot/handlers/admin.py` with team analytics
- A Telegram Mini App (TMA) is being built in `packages/webapp/` — trace data should be structured for future TMA consumption
- Synthetic tests will use the shared OpenRouter API key and a real pipeline execution path

## Constraints

- **Stack**: Python/aiogram — must integrate with existing async patterns
- **Storage**: InsForge tables — consistent with existing data layer
- **Telegram limits**: /admin output must fit 4096-char messages; use pagination or summaries
- **LLM costs**: Synthetic tests call real LLMs — must be triggered manually, never automated/scheduled
- **No PipelineRunner rewrite**: Instrument via wrapping/hooks, don't restructure the runner itself

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| InsForge for trace storage | Consistent with existing data layer, accessible from future TMA | — Pending |
| Real LLM calls for synthetic tests | Need actual latency data, not just plumbing tests | — Pending |
| Summary-only in /admin, full I/O stored for TMA | Telegram message limits make full I/O impractical | — Pending |
| Instrument at handler level, not runner internals | Minimal code changes, wrap call sites like ProgressUpdater does | — Pending |

---
*Last updated: 2026-02-02 after initialization*
