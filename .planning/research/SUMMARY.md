# Project Research Summary

**Project:** Deal Quest Bot - Pipeline Observability & Automated Testing
**Domain:** AI Agent Observability & Testing for Async Python Telegram Bots
**Researched:** 2026-02-02
**Confidence:** HIGH

## Executive Summary

Deal Quest Bot is an aiogram 3 async Telegram bot with three AI agent pipelines (learn/train/support). Research reveals that modern pipeline observability for async Python bots requires a four-tier architecture: instrumentation via decorators/context managers, in-process trace collection with batching, PostgreSQL-based storage leveraging existing InsForge infrastructure, and a simple admin interface for visualization. The 2026 standard emphasizes structured logging with contextvars for async context propagation, lightweight tracing using OpenTelemetry span models without full distributed tracing overhead, and native Python timing instrumentation.

For testing, the recommended approach is async-first with pytest-asyncio 1.x, aiogram-specific mocking via aiogram-tests, and LLM-specific evaluation using deepeval for synthetic test case generation. The critical insight is to avoid distributed tracing complexity (Jaeger, Zipkin) since this is a single-process application, and instead focus on in-process instrumentation with PostgreSQL-based trace storage. The key risk is async context loss during trace propagation across task boundaries, which requires explicit context management using Python's contextvars and careful testing of context propagation patterns.

The architecture must follow the existing ProgressUpdater pattern: wrap call sites with decorators/context managers without modifying PipelineRunner internals, ensuring minimal invasiveness. Storage explosion from full I/O capture and Telegram's 4096-character message limit for admin commands are critical constraints that must inform schema design and UI implementation from day one.

## Key Findings

### Recommended Stack

The 2025-2026 standard stack for single-process async Python applications with LLM pipelines emphasizes lightweight, in-process observability tools over distributed tracing infrastructure. Key technologies include structlog 25.5.0+ for structured logging with native contextvars support (5x faster than stdlib in async apps), OpenTelemetry SDK 1.29.0+ for industry-standard trace generation without external collectors, and time.perf_counter() for high-precision timing per PEP 418. For testing, pytest-asyncio 1.3.0+ provides modern async patterns, aiogram-tests 1.2.0+ handles bot-specific mocking, respx 0.22.0+ mocks httpx async calls, and deepeval 3.8.3+ enables LLM pipeline evaluation with synthetic test generation.

**Core technologies:**
- **structlog 25.5.0+**: Structured logging with async support - native contextvars for per-request context propagation, JSON output for queryability
- **OpenTelemetry SDK 1.29.0+**: Core tracing library - vendor-neutral, generates traces without external collectors, works in single-process mode
- **pytest-asyncio 1.3.0+**: Async test support - modern 1.x release with clean API, handles async setup/teardown
- **aiogram-tests 1.2.0+**: aiogram-specific mocking - MockedBot pattern for testing Telegram interactions without real API
- **respx 0.22.0+**: HTTPX mocking - clean async support for mocking Anthropic API and PostgREST calls
- **deepeval 3.8.3+**: LLM evaluation - pytest integration, 14+ RAG metrics, synthetic test case generation
- **postgrest-py 0.18.0+**: PostgREST client - official Supabase client with async support for InsForge integration
- **asyncpg 0.31.0+ (optional)**: Direct PostgreSQL access - 5x faster than psycopg3 for complex trace queries

**Critical principle:** Avoid distributed tracing complexity (Jaeger, Zipkin, Datadog APM) - overkill for single-process bot. Focus on in-process instrumentation, structured logging, and PostgreSQL-based trace storage.

### Expected Features

Pipeline observability and automated testing for AI agent systems in 2026 distinguish between table stakes (basic visibility without which the system is unmanageable) and differentiators (advanced features providing competitive advantage). For Deal Quest Bot's admin needs, the baseline includes real-time health visibility, error tracking with structured logging, per-step timing for bottleneck identification, request/response logging for debugging, basic synthetic test runner, token usage tracking, and alerting via Telegram. Differentiators include trace visualization (timeline/flamegraph), RAG quality monitoring, hallucination detection, and agentic anomaly detection.

**Must have (table stakes):**
- **Health Status Dashboard** - Overall system status, per-pipeline status, last successful runs, error counts (users expect this)
- **Error Tracking & Logging** - Structured JSON logs with stack traces, error rate monitoring, Telegram alerts (essential for operations)
- **Per-Step Timing** - Track execution time for each pipeline step, calculate p50/p95/p99 latencies (bottleneck identification)
- **Request/Response Logging** - Full agent I/O capture with trace_id correlation (debugging requires seeing exact inputs/outputs)
- **Basic Synthetic Test Runner** - 3-5 critical user journeys per pipeline, manual trigger only (catch regressions before users)
- **Token Usage & Cost Tracking** - Track tokens per request, calculate costs, daily/weekly aggregation (LLM costs can explode)
- **Basic Alerting System** - Telegram notifications for system down, error spikes, test failures (admins can't monitor 24/7)

**Should have (competitive differentiators):**
- **Trace Visualization** - Gantt chart timeline showing execution flow, flamegraph for performance analysis (reduces MTTR by 50%+)
- **Bottleneck Analysis Dashboard** - Automatically identify slowest components, trend analysis over time (nice to have, can query manually)
- **RAG Quality Monitoring** - Track retrieval metrics, relevance scores, alert on poor retrieval (critical for RAG-heavy bots)
- **Hallucination Detection** - Compare outputs to source documents, flag unsupported claims (protects reputation)
- **User Satisfaction Tracking** - In-chat thumbs up/down feedback, correlate with technical metrics (bridges technical and business)

**Defer (v2+ or only if proven need):**
- **Prompt Effectiveness Tracking** - A/B test prompts, track success rates per template (helpful but not critical)
- **Self-Healing Test Automation** - AI-powered test maintenance and auto-updating (nice to have, manual maintenance acceptable for MVP)
- **Agentic Anomaly Detection** - ML model learns normal behavior, predicts failures (powerful but requires significant data volume)
- **Multi-Modal Trace Support** - Store images/voice/files in traces (only needed if bot becomes multi-modal)

**MVP recommendation:** Focus on all table stakes features in Phase 1-2 (3-4 weeks), defer differentiators to Phase 3+ after validating core system works. Start with Telegram /admin commands, consider Telegram Mini App dashboard later if user base justifies investment.

### Architecture Approach

Pipeline observability systems for async Python applications follow a four-tier architecture: Instrumentation (wraps call sites without modifying internals), Collector (aggregates spans with batching), Storage (persists to PostgreSQL/InsForge), and Visualization (admin UI for viewing traces). The optimal approach for Deal Quest Bot uses decorator/context-manager-based instrumentation similar to the existing ProgressUpdater pattern, an in-process TraceCollector service for batching and background flushing, normalized PostgreSQL schema with separate tables for traces/spans/attributes/events, and a React admin panel integrated with existing /admin routes.

**Major components:**

1. **Instrumentation Layer** - Python decorators and context managers (TraceContext) that wrap PipelineRunner methods to capture trace data. Uses contextvars for async-safe context propagation. Creates hierarchical spans (pipeline → steps → agents). Records timing, inputs, outputs, errors. Follows ProgressUpdater pattern: wraps call sites, doesn't modify PipelineRunner internals.

2. **Trace Collector (In-Process Service)** - Receives spans from instrumentation, batches them to reduce database write frequency (buffer of 50 spans or 10-second flush interval), enriches spans with metadata, handles async background flushing. Implemented as Python class with asyncio background task. NOT a separate OpenTelemetry Collector process - simpler deployment, lower latency, direct PostgreSQL integration.

3. **Storage Layer (PostgreSQL/InsForge)** - Four tables: traces (one per pipeline run), spans (hierarchical operations), span_attributes (flexible key-value metadata), span_events (point-in-time occurrences like exceptions). Uses PostgreSQL partitioning by timestamp for efficient querying. BRIN indexes for time-series data. Retention policies: 30 days for traces, 7 days for full I/O data.

4. **Admin UI (React + InsForge API)** - Trace list view with filters (date range, user, status, duration), trace detail view with Gantt timeline and span tree, error drill-down with stack traces, performance dashboard showing p50/p95/p99 latencies. Integrated with existing /admin route. Respects Telegram 4096-character limit with pagination and progressive disclosure.

**Key design principle:** Follow existing ProgressUpdater pattern - wrap call sites with context managers, don't modify PipelineRunner internals. Minimal invasiveness, easy to disable if needed.

### Critical Pitfalls

Research identified 12 pitfalls across critical/moderate/minor severity levels. The top five critical pitfalls that can cause rewrites or outages are: async context loss in trace propagation (68% of production incidents in async Python apps), storage explosion from full I/O capture (5GB+/month at moderate scale), Telegram 4096-char limit overflow in admin commands, test isolation failure with shared event loop state (flaky tests), and LLM cost runaway in synthetic tests (60% of teams overpay 5-10x).

1. **Async Context Loss in Trace Propagation** - Trace IDs get lost crossing async boundaries (task creation, background tasks), resulting in orphaned spans. Use contextvars explicitly, store trace_id in aiogram middleware data dict, copy context when creating tasks. Test context propagation with integration tests. Address in Phase 1 (Foundation).

2. **Storage Explosion from Full I/O Capture** - Storing complete LLM prompts/responses causes PostgreSQL bloat and cost spikes. Store only metadata in main traces table, put full I/O in separate table with 7-day retention. Implement sampling (100% errors, 10% success). Use PostgreSQL partitioning by timestamp. Address in Phase 1 (Schema Design).

3. **Telegram 4096-Char Limit Overflow** - Admin command output exceeds Telegram message limit, causing truncation. Design for pagination from day one with inline keyboards. Show summaries in list view (10 traces/page), full details on demand. Test with 50+ traces before deployment. Address in Phase 2 (Admin Commands).

4. **Test Isolation Failure with Shared Event Loop State** - Async fixtures share state across tests, causing flaky tests that pass individually but fail in suite. Use pytest-asyncio with function-scoped fixtures, explicitly cancel background tasks in teardown. Use pytest-random-order to catch isolation issues early. Address in Phase 2 (Test Infrastructure Setup).

5. **LLM Cost Runaway in Synthetic Tests** - Real LLM calls in tests cost $5-20 per run, developers run 50 times, accidentally spend $100-1000. Manual trigger only (/admin test command), never automated. Add cost tracking and confirmation prompt. Use dry-run mode with mocked responses for development. Address in Phase 2 (Test Implementation).

**Additional key pitfalls:**
- Synchronous tracing overhead in hot path (50-200ms latency increase) - use async background writes with batching
- No partitioning strategy for time-series data (queries slow from 50ms to 2000ms) - implement daily/weekly partitions from day one
- Missing correlation between ProgressUpdater and traces (conflicting information) - share step names between both systems

## Implications for Roadmap

Based on research findings, pipeline observability and testing naturally decompose into three phases with clear dependencies. Phase 1 establishes the foundation (storage, instrumentation, collection), Phase 2 adds operational maturity (admin commands, synthetic tests, alerting), and Phase 3 focuses on advanced features and optimization (visualization, AI-powered features, performance tuning).

### Phase 1: Foundation - Tracing Infrastructure & Storage

**Rationale:** All other components depend on storage schema and trace collection infrastructure. Must be designed correctly from day one to avoid costly migrations. Schema design must address storage explosion and partitioning from the start to prevent performance degradation at scale.

**Delivers:**
- PostgreSQL tables in InsForge (traces, spans, span_attributes, span_events)
- In-process TraceCollector service with batching and background flushing
- Decorator/context-manager instrumentation (TraceContext) following ProgressUpdater pattern
- Structured logging with structlog configured for JSON output and contextvars
- Basic timing instrumentation using time.perf_counter()
- Context propagation strategy for async boundaries (explicitly tested)

**Addresses features:**
- Storage foundation for all observability features
- Per-step timing tracking (table stakes)
- Error tracking & logging (table stakes)
- Request/response logging (table stakes)

**Avoids pitfalls:**
- Pitfall #2: Storage explosion from full I/O capture - separate tables with different retention policies
- Pitfall #1: Async context loss - explicit contextvars usage and testing
- Pitfall #7: No partitioning strategy - implement daily/weekly partitions from day one
- Pitfall #12: Timestamp precision mismatch - normalize to milliseconds everywhere

**Stack elements used:**
- structlog 25.5.0+ for structured logging
- OpenTelemetry span model (not full OTel ecosystem)
- PostgreSQL via InsForge (postgrest-py client)
- time.perf_counter() for timing

**Architecture component:** Instrumentation Layer + Trace Collector + Storage Layer

**Complexity:** Medium (2-3 weeks)

**Research flag:** STANDARD PATTERNS - Well-documented async instrumentation and PostgreSQL storage patterns. Skip deep research, implement based on current findings.

---

### Phase 2: Operations - Admin Commands & Synthetic Testing

**Rationale:** With trace collection working, add operational tools that admins need daily. Admin commands provide immediate value for debugging, while synthetic tests prevent regressions. Must address Telegram API constraints (4096-char limit, rate limits) and LLM cost management from the start.

**Delivers:**
- Telegram /admin commands: /status, /errors, /traces, /test
- Health status dashboard (via /admin status)
- Error tracking with pagination and filtering
- Trace list view with inline keyboard pagination
- Basic synthetic test runner (manual trigger only)
- Test cost tracking and confirmation prompts
- Basic alerting to Telegram channel (critical errors, test failures)
- Token usage and cost tracking

**Addresses features:**
- Health Status Dashboard (table stakes)
- Error Tracking & Logging (table stakes)
- Basic Synthetic Test Runner (table stakes)
- Token Usage & Cost Tracking (table stakes)
- Basic Alerting System (table stakes)

**Avoids pitfalls:**
- Pitfall #3: Telegram 4096-char limit overflow - pagination with inline keyboards from day one
- Pitfall #5: LLM cost runaway - manual trigger only, cost tracking, confirmation prompt
- Pitfall #4: Test isolation failures - function-scoped fixtures, pytest-random-order
- Pitfall #9: Telegram API rate limits - use aiogram rate limiter, edit messages instead of sending new ones
- Pitfall #11: No dry-run mode - implement mocked responses for development

**Stack elements used:**
- pytest 8.3.0+ with pytest-asyncio 1.3.0+ for test framework
- aiogram-tests 1.2.0+ for bot mocking (MockedBot pattern)
- respx 0.22.0+ for mocking httpx calls to Anthropic API and PostgREST
- deepeval 3.8.3+ for LLM evaluation (optional in Phase 2, focus on basic tests first)

**Architecture component:** Admin UI (Telegram commands) + Test Infrastructure

**Complexity:** Medium (2-3 weeks)

**Research flag:** STANDARD PATTERNS - Telegram bot commands and pytest testing are well-documented. Some trial-and-error expected with aiogram-tests (sparse docs) and respx patterns for PostgREST mocking.

---

### Phase 3: Enhancement - Visualization & Optimization

**Rationale:** Core system is operational. Now add advanced features that improve developer experience and system performance. Focus on proven needs from Phase 1-2 usage. Trace visualization and bottleneck analysis reduce MTTR significantly. Performance optimization ensures tracing overhead remains <5%.

**Delivers:**
- Trace visualization (Gantt timeline, flamegraph)
- Bottleneck analysis dashboard (slowest operations, trends)
- User satisfaction tracking (in-chat thumbs up/down)
- Performance optimization (sampling strategy, batch tuning)
- Advanced alerting (error rate thresholds, anomaly detection basics)
- Trace export and comparison features
- Retention policy automation (delete old traces)

**Addresses features:**
- Trace Visualization (differentiator - high value)
- Bottleneck Analysis Dashboard (differentiator - medium value)
- User Satisfaction Tracking (differentiator - bridges technical and business)

**Avoids pitfalls:**
- Pitfall #6: Synchronous tracing overhead - implement sampling (100% errors, 10% success)
- Pitfall #8: Missing correlation between ProgressUpdater and traces - ensure consistent step names
- Anti-pattern: "Store everything for later analysis" - aggressive retention policies

**Stack elements used:**
- React components for visualization (integrate with existing admin panel)
- Recharts or similar for timeline/flamegraph rendering
- PostgreSQL aggregation queries for bottleneck analysis

**Architecture component:** Admin UI (Web visualization) + Performance optimization layer

**Complexity:** High (3-4 weeks)

**Research flag:** NEEDS RESEARCH - Trace visualization UI patterns need deeper investigation. Evaluate existing open-source components (Jaeger UI, Grafana traces) vs custom implementation. Performance optimization for async Python needs profiling-driven approach.

---

### Phase 4 (Future): AI-Powered Features

**Defer to post-MVP unless proven need emerges:**
- RAG Quality Monitoring (if retrieval quality becomes concern)
- Hallucination Detection (if accuracy issues arise)
- Prompt Effectiveness Tracking (if A/B testing prompts)
- Self-Healing Test Automation (if test maintenance becomes burden)
- Agentic Anomaly Detection (requires significant data volume)

**Rationale:** These features require substantial data volume (months of traces) and advanced ML/AI capabilities. Implement only if specific pain points emerge from Phase 1-3 usage. Most are "nice to have" rather than critical for operations.

---

### Phase Ordering Rationale

**Why this order:**
1. **Phase 1 first** - Storage schema and instrumentation are foundational. Everything depends on them. Schema mistakes are expensive to fix later (migrations, downtime). Async context propagation must work from day one or traces are useless.

2. **Phase 2 second** - Admin commands and tests provide immediate operational value. Admins need debugging tools as soon as tracing is collecting data. Synthetic tests prevent regressions during active development. Both have critical constraints (Telegram limits, LLM costs) that must be addressed before deployment.

3. **Phase 3 third** - Visualization and optimization are valuable but not blocking. Can operate effectively with /admin commands and SQL queries initially. Build advanced UI only after validating that basic system works and identifying real bottlenecks from usage data.

4. **Phase 4 deferred** - AI-powered features require data volume and sophistication that won't exist at launch. Implement reactively based on proven needs, not speculatively.

**Dependency chain:**
- Phase 2 depends on Phase 1 (needs trace storage to query)
- Phase 3 depends on Phase 1-2 (needs data and basic UI foundation)
- Phase 4 depends on months of Phase 1-3 usage data

**How this avoids pitfalls:**
- Addresses storage design and async context issues in Phase 1 before they cause problems
- Implements Telegram constraints and cost controls in Phase 2 before deployment
- Defers expensive visualization work until validating core system
- Prevents over-engineering by deferring AI features until proven need

### Research Flags

**Phases with standard patterns (skip deep research):**
- **Phase 1 (Foundation)** - Async Python instrumentation and PostgreSQL storage are well-documented. OpenTelemetry concepts are industry-standard. Proceed with implementation based on current research findings.
- **Phase 2 (Operations)** - Telegram bot commands are straightforward. pytest-asyncio testing has clear patterns. Some trial-and-error expected with aiogram-tests and respx mocking, but manageable.

**Phases needing deeper research:**
- **Phase 3 (Visualization)** - Trace visualization UI is complex. Research needed on: existing open-source components (Jaeger UI components, Grafana traces panel, Tempo traces), React libraries for timeline/Gantt charts, flamegraph rendering libraries, integration with Telegram Mini App if going that route. Investigate before implementation to avoid reinventing solved problems.
- **Phase 4 (AI Features)** - Only research if implementing. RAG quality metrics, hallucination detection algorithms, anomaly detection for observability data all require specialized investigation. Defer research until proven need.

**Ongoing research needs:**
- Monitor postgrest-py async patterns during Phase 1 implementation (docs are sparse, may need experimentation)
- Track aiogram 3 middleware patterns for context injection during Phase 1
- Validate performance overhead claims during Phase 3 (profile actual impact, not just estimates)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | All libraries verified via PyPI as of 2026-02-02. structlog, OpenTelemetry, pytest-asyncio, deepeval are current 2025-2026 releases with mature async support. Only postgrest-py has sparse async docs (MEDIUM confidence), may require trial-and-error. |
| Features | **HIGH** | Consistent findings across 20+ current sources (2025-2026 research). Table stakes vs differentiators clear from industry consensus. MVP priorities validated against AI agent observability best practices. |
| Architecture | **HIGH** | Four-tier architecture (instrumentation/collector/storage/visualization) is industry-standard pattern. Decorator-based instrumentation verified in multiple sources (Langfuse, OpenTelemetry). In-process collector recommended for single-process apps. PostgreSQL storage schema validated against OpenTelemetry trace model. |
| Pitfalls | **HIGH** | Critical pitfalls verified with authoritative sources: async context loss (Python docs, OpenTelemetry GitHub issues), storage bloat (ClickHouse, Observe Inc studies), Telegram limits (official API docs), test isolation (pytest-asyncio official docs), LLM costs (industry benchmarks). Medium pitfalls based on community practices and APM tool documentation. |

**Overall confidence:** **HIGH**

All recommendations use 2025-2026 current technologies and patterns. No outdated libraries or deprecated approaches. Primary risk areas:
- postgrest-py async usage (MEDIUM confidence - official client but docs are limited)
- aiogram-tests integration (MEDIUM confidence - active repo but sparse documentation)
- Performance overhead estimates (need validation through profiling)

### Gaps to Address

Research identified several areas needing validation or decision during planning/implementation:

1. **Data retention specifics** - Research recommends 30 days for traces, 7 days for full I/O, but exact numbers should be validated against expected usage volume and storage costs. Calculate: 100 users × 10 interactions/day × 5KB per trace = 5GB/month at full retention. Adjust retention based on actual budget.

2. **Sampling strategy details** - "100% errors, 10% success" is recommended starting point, but optimal sampling rate depends on traffic volume and debugging needs. Start with 100% tracing at launch, add sampling if performance overhead exceeds 5% or storage costs spike.

3. **PostgreSQL vs specialized time-series DB** - Research recommends PostgreSQL with partitioning for MVP (sufficient for 100K+ traces/day), but migration path to TimescaleDB or ClickHouse should be considered if scale exceeds expectations. Monitor query performance at 10K, 50K, 100K traces to validate.

4. **Telegram Mini App vs Web Admin vs /admin commands** - Research suggests starting with /admin commands for MVP, consider Mini App later. Decision should factor in: user base size (worthwhile for 100+ users), mobile-first usage patterns, development time trade-off (Mini App = 2-3 weeks extra). Validate /admin command UX with real admins before investing in Mini App.

5. **Full OpenTelemetry vs custom lightweight tracing** - Research strongly recommends custom lightweight approach for single-process bot, but migration path to full OTel should be documented if bot becomes multi-service or needs integration with external observability platforms. Document: how to upgrade from custom TraceContext to OTel SDK if needed.

6. **LLM evaluation scope** - deepeval offers 14+ metrics (faithfulness, hallucination, answer relevance, tool correctness). Which metrics are most valuable for Deal Quest Bot's specific use cases? Needs domain expert input during Phase 2. Start with faithfulness and hallucination detection for casebook accuracy.

7. **Privacy and PII handling** - Research mentions need for redacting PII from logs. Deal Quest Bot processes negotiation scenarios - what constitutes PII? User messages, deal terms, company information? Define PII policy and implement structlog processors for auto-redaction in Phase 1.

## Sources

### Primary Sources (HIGH confidence)

**Technology Stack:**
- [structlog PyPI](https://pypi.org/project/structlog/) - Current version 25.5.0, features, async support
- [Structlog ContextVars: Python Async Logging 2026](https://johal.in/structlog-contextvars-python-async-logging-2026/) - Best practices for async context
- [OpenTelemetry asyncio Instrumentation](https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/asyncio/asyncio.html) - Official docs
- [opentelemetry-instrumentation-asyncio PyPI](https://pypi.org/project/opentelemetry-instrumentation-asyncio/) - Version 0.60b1 (Dec 2025)
- [PEP 418 – Add monotonic time, performance counter](https://peps.python.org/pep-0418/) - Official timing recommendation
- [pytest-asyncio PyPI](https://pypi.org/project/pytest-asyncio/) - Current version 1.3.0
- [aiogram-tests PyPI](https://pypi.org/project/aiogram-tests/) - Bot testing library
- [deepeval PyPI](https://pypi.org/project/deepeval/) - LLM evaluation framework

**Feature Landscape:**
- [Top 5 AI Agent Observability Platforms 2026](https://o-mega.ai/articles/top-5-ai-agent-observability-platforms-the-ultimate-2026-guide) - Industry comparison
- [15 AI Agent Observability Tools](https://research.aimultiple.com/agentic-monitoring/) - AgentOps, Langfuse analysis
- [AI Agent Monitoring Best Practices 2026](https://uptimerobot.com/knowledge-hub/monitoring/ai-agent-monitoring-best-practices-tools-and-metrics/) - Table stakes features
- [AI Observability Complete Guide 2026](https://uptimerobot.com/knowledge-hub/observability/ai-observability-the-complete-guide/) - Comprehensive overview
- [7 Best LLM Tracing Tools 2026](https://www.braintrust.dev/articles/best-llm-tracing-tools-2026) - Trace visualization patterns
- [Complete Guide to LLM Observability 2026](https://portkey.ai/blog/the-complete-guide-to-llm-observability/) - Best practices

**Architecture:**
- [Observability Pipeline: What It Is & How to Build One](https://spacelift.io/blog/observability-pipeline) - Build order and dependencies
- [OpenTelemetry Traces Concepts](https://opentelemetry.io/docs/concepts/signals/traces/) - Trace and span model
- [OpenTelemetry Context Propagation](https://opentelemetry.io/docs/concepts/context-propagation/) - Core concepts
- [Langfuse Decorator-Based Python Integration](https://langfuse.com/docs/sdk/python/decorators) - Context manager patterns
- [Using Decorators to Instrument Python Code With OpenTelemetry Traces](https://digma.ai/using-decorators-to-instrument-python-code-with-opentelemetry-traces/) - Non-invasive instrumentation

**Pitfalls:**
- [Structlog ContextVars: Python Async Logging 2026](https://johal.in/structlog-contextvars-python-async-logging-2026/) - Context propagation (68% of async Python issues)
- [Context detach error - OpenTelemetry Python Issue #2606](https://github.com/open-telemetry/opentelemetry-python/issues/2606) - Async context issues
- [Telegram Limits — Telegram Info](https://limits.tginfo.me/en) - Official 4096-char limit documentation
- [pytest-asyncio test isolation concepts](https://pytest-asyncio.readthedocs.io/en/stable/concepts.html) - Test isolation patterns
- [LLM Cost Optimization: Stop Overpaying 5-10x in 2026](https://byteiota.com/llm-cost-optimization-stop-overpaying-5-10x-in-2026/) - Cost management
- [Lost Logs: Log Retention vs Observability Cost](https://www.observeinc.com/blog/lost-logs-retention-vs-cost) - Storage bloat economics
- [Observability Antipatterns Official Site](https://observability-antipatterns.github.io/) - Common mistakes

### Secondary Sources (MEDIUM confidence)

**Testing:**
- [12 Best AI Test Automation Tools 2026](https://testguild.com/7-innovative-ai-test-automation-tools-future-third-wave/) - Testing landscape
- [Essential pytest asyncio tips](https://articles.mergify.com/pytest-asyncio-2/) - 2025 testing patterns
- [Synthetic Monitoring Tests - Engineering Fundamentals](https://microsoft.github.io/code-with-engineering-playbook/automated-testing/synthetic-monitoring-tests/) - Best practices

**Performance:**
- [Python Performance Monitoring - SigNoz](https://signoz.io/guides/python-performance-monitoring/) - Overhead estimates
- [Tuning PostgreSQL for Write Heavy Workloads](https://www.cloudraft.io/blog/tuning-postgresql-for-write-heavy-workloads) - Storage optimization
- [Tracing asynchronous Python code with Datadog APM](https://www.datadoghq.com/blog/tracing-async-python-code/) - Async tracing challenges

**Observability Patterns:**
- [Chatbot Monitoring with Advanced Observability](https://langfuse.com/faq/all/chatbot-analytics) - Bot-specific patterns
- [How to Measure Agent Performance: Key Metrics](https://www.datarobot.com/blog/how-to-measure-agent-performance/) - Performance metrics

### Tertiary Sources (context only, low confidence)

**General Background:**
- [Telegram Bot Security Best Practices](https://alexhost.com/faq/what-are-the-best-practices-for-building-secure-telegram-bots/) - Bot development context
- [postgrest-py Documentation](https://postgrest-py.readthedocs.io/en/latest/api/client.html) - Client API (sparse async docs)

---

**Research completed:** 2026-02-02
**Ready for roadmap:** Yes

**Next steps:**
1. Use SUMMARY.md as input for roadmap creation
2. Create Phase 1 (Foundation) detailed plans focusing on storage schema and instrumentation
3. Consider `/gsd:research-phase` for Phase 3 (Visualization) when ready - needs deeper investigation of UI components
4. Validate postgrest-py async patterns through prototyping in Phase 1
5. Monitor actual usage data from Phase 1-2 to inform Phase 3-4 priorities
