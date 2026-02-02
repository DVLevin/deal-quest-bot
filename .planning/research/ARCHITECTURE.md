# Pipeline Observability Architecture for Async Python Bots

**Domain:** Distributed tracing and observability for async Python pipelines
**Researched:** 2026-02-02
**Confidence:** HIGH

## Executive Summary

Pipeline observability systems for async Python applications follow a four-tier architecture: **Instrumentation → Collector → Storage → Visualization**. For Deal Quest Bot's PipelineRunner system, the optimal approach uses decorator/context-manager-based instrumentation (similar to existing ProgressUpdater pattern), OpenTelemetry for standardized trace collection, InsForge (PostgreSQL) for storage, and a self-hosted admin UI for visualization. This architecture minimally impacts existing code while providing comprehensive observability.

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    TIER 1: INSTRUMENTATION                       │
│  Wraps existing call sites without modifying PipelineRunner     │
├─────────────────────────────────────────────────────────────────┤
│  • TraceContext (decorator/context manager for agents)          │
│  • Auto-instrumentation hooks (pipeline entry/exit)             │
│  • Async-safe context propagation (Python contextvars)          │
│  • Span creation: pipeline → steps → agent.run()                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     TIER 2: TRACE COLLECTOR                      │
│  Aggregates spans, enriches with metadata, manages batching     │
├─────────────────────────────────────────────────────────────────┤
│  • In-process TraceCollector service (not separate process)     │
│  • Batching buffer (prevents DB write storms)                   │
│  • Async background flushing (every 5-10 seconds)               │
│  • Span enrichment (user_id, pipeline_name, agent hierarchy)    │
│  • Error capture & stack trace attachment                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      TIER 3: STORAGE LAYER                       │
│  Persists trace data to InsForge (PostgreSQL)                   │
├─────────────────────────────────────────────────────────────────┤
│  • traces table: trace_id, start_time, duration, status         │
│  • spans table: span_id, trace_id, parent_id, operation_name   │
│  • span_attributes table: key-value pairs (flexible schema)     │
│  • span_events table: timestamped events within spans           │
│  • Indexes: trace_id, user_id, timestamp, duration              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   TIER 4: VISUALIZATION & ADMIN                  │
│  Admin interface for viewing traces, debugging failures         │
├─────────────────────────────────────────────────────────────────┤
│  • React admin panel (integrates with existing /admin route)    │
│  • Trace timeline view (Gantt-style, shows parallel execution)  │
│  • Flamegraph visualization (performance bottlenecks)           │
│  • Trace search/filter (by user, pipeline, status, duration)    │
│  • Error drill-down (stack traces, context)                     │
│  • Performance metrics (P50/P95/P99 latencies)                  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Boundaries & Responsibilities

### 1. Instrumentation Layer

**What it does:**
- Wraps existing agent execution points to capture trace data
- Creates spans for pipeline runs, steps, and individual agent executions
- Propagates context through async calls automatically
- Records timing, inputs, outputs, and errors

**Communicates with:**
- TraceCollector (sends completed spans)
- PipelineRunner (wraps execution methods)
- BaseAgent implementations (decorates run() methods)

**Integration approach (non-invasive):**
```python
# Example: Decorator-based instrumentation (like ProgressUpdater pattern)

class TraceContext:
    """Context manager + decorator for tracing agent execution."""

    def __init__(self, operation_name: str, **attributes):
        self.operation_name = operation_name
        self.attributes = attributes
        self.span = None

    async def __aenter__(self):
        # Create span, attach to current context
        self.span = create_span(self.operation_name, self.attributes)
        return self.span

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        # Finalize span, send to collector
        if exc_val:
            self.span.record_exception(exc_val)
        self.span.end()
        await collector.record_span(self.span)

# Usage in PipelineRunner (minimal changes):
async def _run_step(self, step: StepConfig, ctx: PipelineContext):
    async with TraceContext(f"agent.{step.agent}",
                           agent_name=step.agent,
                           user_id=ctx.user_id):
        agent = self.registry.get(step.agent)
        agent_input = self._build_input(step, ctx)
        output = await agent.run(agent_input, ctx)
        return output
```

**Key design principle:** Follows the ProgressUpdater pattern — wrap call sites with context managers, don't modify PipelineRunner internals.

### 2. Trace Collector (In-Process Service)

**What it does:**
- Receives span data from instrumentation layer
- Batches spans to reduce database write frequency
- Enriches spans with metadata (user info, pipeline config)
- Handles async background flushing to storage
- Manages sampling (if needed for high-volume systems)

**Communicates with:**
- Instrumentation hooks (receives spans)
- Storage layer (writes batched spans)
- Configuration system (sampling rates, batch sizes)

**Why in-process (not separate OpenTelemetry Collector):**
- Simpler deployment (no separate service to manage)
- Lower latency (no network hop for local development)
- Direct PostgreSQL integration (no need for OTLP protocol)
- Can upgrade to separate collector later if needed

**Architecture pattern:**
```python
class TraceCollector:
    """In-process service for batching and storing spans."""

    def __init__(self, insforge_client: InsForgeClient, batch_size=50, flush_interval=10):
        self.client = insforge_client
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self._buffer: List[Span] = []
        self._flush_task = None

    async def start(self):
        """Start background flush loop."""
        self._flush_task = asyncio.create_task(self._flush_loop())

    async def record_span(self, span: Span):
        """Add span to buffer, flush if batch is full."""
        self._buffer.append(span)
        if len(self._buffer) >= self.batch_size:
            await self._flush()

    async def _flush_loop(self):
        """Periodically flush buffer to storage."""
        while True:
            await asyncio.sleep(self.flush_interval)
            if self._buffer:
                await self._flush()

    async def _flush(self):
        """Write buffered spans to InsForge."""
        spans_to_write = self._buffer[:]
        self._buffer.clear()
        await self.client.bulk_insert('spans', spans_to_write)
```

### 3. Storage Schema (PostgreSQL/InsForge)

**What it does:**
- Persists trace data for historical analysis
- Supports efficient querying by trace ID, user, time range
- Stores span relationships (parent-child hierarchy)
- Enables flexible attribute storage (key-value pairs)

**Communicates with:**
- Collector (receives batched writes)
- Admin UI (serves queries for visualization)

**Schema design:**

```sql
-- Main traces table (one row per pipeline execution)
CREATE TABLE traces (
    id BIGSERIAL PRIMARY KEY,
    trace_id TEXT NOT NULL UNIQUE,
    user_id INTEGER,
    telegram_id BIGINT,
    pipeline_name TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_ms INTEGER,
    status TEXT NOT NULL, -- 'success', 'error', 'partial'
    total_spans INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_traces_user_time ON traces(user_id, start_time DESC);
CREATE INDEX idx_traces_telegram_id ON traces(telegram_id, start_time DESC);
CREATE INDEX idx_traces_status ON traces(status, start_time DESC);
CREATE INDEX idx_traces_duration ON traces(duration_ms DESC); -- for performance analysis

-- Spans table (one row per operation: pipeline, step, agent)
CREATE TABLE spans (
    id BIGSERIAL PRIMARY KEY,
    span_id TEXT NOT NULL UNIQUE,
    trace_id TEXT NOT NULL REFERENCES traces(trace_id),
    parent_span_id TEXT, -- NULL for root span
    operation_name TEXT NOT NULL, -- e.g., "pipeline.support", "agent.strategist"
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_ms INTEGER,
    status TEXT NOT NULL, -- 'ok', 'error'
    span_kind TEXT, -- 'pipeline', 'step', 'agent'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_spans_trace ON spans(trace_id, start_time);
CREATE INDEX idx_spans_parent ON spans(parent_span_id);
CREATE INDEX idx_spans_operation ON spans(operation_name, start_time DESC);

-- Span attributes (flexible key-value storage)
CREATE TABLE span_attributes (
    id BIGSERIAL PRIMARY KEY,
    span_id TEXT NOT NULL REFERENCES spans(span_id),
    key TEXT NOT NULL,
    value TEXT, -- JSON-encoded for complex values
    value_type TEXT, -- 'string', 'int', 'float', 'bool', 'json'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_span_attrs_span ON span_attributes(span_id);
CREATE INDEX idx_span_attrs_key ON span_attributes(key); -- for filtering by attribute

-- Span events (timestamped events within a span)
CREATE TABLE span_events (
    id BIGSERIAL PRIMARY KEY,
    span_id TEXT NOT NULL REFERENCES spans(span_id),
    timestamp TIMESTAMPTZ NOT NULL,
    name TEXT NOT NULL, -- e.g., "exception", "status_update"
    attributes JSONB, -- event-specific data
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_span_events_span ON span_events(span_id, timestamp);
CREATE INDEX idx_span_events_name ON span_events(name); -- for finding all exceptions
```

**Storage patterns:**

1. **Trace = one pipeline run** (e.g., /support request)
2. **Spans = hierarchical operations**:
   - Root span: `pipeline.support`
   - Child spans: `step.strategist`, `step.memory`
   - Grandchild spans: `agent.strategist.run`
3. **Attributes = flexible metadata**:
   - `user_id`, `telegram_id`, `provider`, `model`
   - `input_length`, `output_length`, `tokens_used`
   - `error_type`, `error_message`, `stack_trace`
4. **Events = point-in-time occurrences**:
   - Exceptions, warnings, progress updates

### 4. Admin UI (React + InsForge API)

**What it does:**
- Displays traces in various formats (timeline, flamegraph, table)
- Allows searching/filtering by user, time, status, duration
- Shows error details with stack traces and context
- Provides performance metrics and trends

**Communicates with:**
- InsForge API (queries trace/span tables)
- User session (for auth/permissions)

**UI Components:**

1. **Trace List View** (default landing page)
   - Table showing recent traces
   - Columns: timestamp, pipeline, user, duration, status
   - Filters: date range, user ID, status, pipeline type
   - Sort: by time, duration, error count

2. **Trace Detail View** (click a trace)
   - Gantt chart showing span timeline (like Chrome DevTools)
   - Flamegraph for performance analysis
   - Span tree view (hierarchical)
   - Attributes panel (key-value pairs)
   - Events timeline (exceptions, warnings)

3. **Error Drill-Down**
   - List of failed traces
   - Grouped by error type
   - Stack traces and context
   - Replay button (rerun with same inputs)

4. **Performance Dashboard**
   - P50/P95/P99 latencies by pipeline type
   - Throughput (traces per hour)
   - Error rates over time
   - Slowest operations (by span duration)

**Integration with existing /admin:**
- Add new route: `/admin/traces`
- Reuse existing auth from admin handler
- Use same React component architecture

## Data Flow (Request to Display)

```
1. User sends /support request
   ↓
2. Handler creates status_msg, enters SupportState
   ↓
3. PipelineRunner.run() is called
   ├─> TraceContext.__aenter__() creates root span
   ├─> Span ID stored in PipelineContext (for child spans)
   ↓
4. For each step in pipeline:
   ├─> _run_step() wrapped with TraceContext
   ├─> Child span created (linked to root)
   ├─> Agent.run() executes
   ├─> On completion/error, span finalized
   ├─> Span sent to TraceCollector.record_span()
   ↓
5. TraceCollector buffers spans
   ├─> When buffer full OR timer expires:
   ├─> Batch insert to InsForge (spans table)
   ├─> Update trace record with final status/duration
   ↓
6. Admin UI queries InsForge
   ├─> SELECT traces + spans + attributes
   ├─> Reconstruct trace hierarchy
   ├─> Render timeline/flamegraph
   ↓
7. Developer views trace, identifies bottleneck or error
```

## Component Build Order & Dependencies

### Phase 1: Storage Foundation (Build First)
**What:** Define and create PostgreSQL tables in InsForge
**Why first:** All other components depend on storage schema
**Tasks:**
- Write SQL migrations for `traces`, `spans`, `span_attributes`, `span_events`
- Create InsForge client methods: `insert_trace()`, `insert_spans()`, `query_traces()`
- Add indexes for efficient querying
- Test with mock data

**Dependencies:** None (foundational layer)

### Phase 2: Trace Collector Service (Build Second)
**What:** In-process service for batching and storing spans
**Why second:** Needed before instrumentation can send spans
**Tasks:**
- Implement TraceCollector class with buffering
- Add async flush loop (background task)
- Create Span data model (Pydantic)
- Integrate with InsForge client
- Add configuration (batch size, flush interval)

**Dependencies:** Phase 1 (storage schema)

### Phase 3: Instrumentation Hooks (Build Third)
**What:** Decorators and context managers for tracing
**Why third:** Requires collector to be ready to receive spans
**Tasks:**
- Create TraceContext context manager (like ProgressUpdater)
- Add OpenTelemetry-compatible span model
- Implement context propagation (Python contextvars)
- Add instrumentation to PipelineRunner:
  - Wrap `run()` with root span
  - Wrap `_run_step()`, `_run_parallel()`, `_run_background()` with child spans
- Add optional decorator for BaseAgent.run()
- Handle error capture and exception recording

**Dependencies:** Phase 2 (collector service)

### Phase 4: Basic Query API (Build Fourth)
**What:** InsForge endpoints for retrieving trace data
**Why fourth:** Needed before UI can display anything
**Tasks:**
- Add repository methods: `get_traces()`, `get_trace_by_id()`, `get_spans_for_trace()`
- Add filtering/sorting support
- Implement pagination for large result sets
- Add aggregation queries (error counts, latency percentiles)

**Dependencies:** Phase 1 (storage schema)

### Phase 5: Admin UI Components (Build Fifth)
**What:** React components for trace visualization
**Why fifth:** Requires both storage and query API to be functional
**Tasks:**
- Create TraceListView component (table with filters)
- Create TraceDetailView component (timeline/flamegraph)
- Add route to existing admin panel (`/admin/traces`)
- Implement search/filter UI
- Add error highlighting and drill-down
- Create performance dashboard

**Dependencies:** Phase 4 (query API)

### Phase 6: Enhancements (Build Last)
**What:** Advanced features like sampling, retention policies, alerting
**Why last:** Core system must work first
**Tasks:**
- Add sampling (only trace X% of requests)
- Implement trace retention policy (delete old traces)
- Add alerting (notify on error spike)
- Add trace export (download as JSON for debugging)
- Add trace comparison (before/after optimization)

**Dependencies:** Phases 1-5 (full system operational)

## Integration Pattern: Non-Invasive Changes

**Key Principle:** Follow the ProgressUpdater pattern — wrap call sites, don't modify internals.

### Current PipelineRunner (unchanged internals):
```python
async def run(self, config: PipelineConfig, ctx: PipelineContext):
    # Existing logic stays the same
    i = 0
    while i < len(config.steps):
        step = config.steps[i]
        if step.mode == "sequential":
            await self._run_step(step, ctx)
            i += 1
        # ... rest of logic unchanged
```

### Instrumented PipelineRunner (only wrappers added):
```python
async def run(self, config: PipelineConfig, ctx: PipelineContext):
    # ADDED: Wrap entire pipeline execution
    async with TraceContext(f"pipeline.{config.name}",
                           pipeline_name=config.name,
                           user_id=ctx.user_id) as trace:
        ctx.trace_id = trace.trace_id  # Propagate to child spans

        # Original logic (unchanged)
        i = 0
        while i < len(config.steps):
            step = config.steps[i]
            if step.mode == "sequential":
                await self._run_step(step, ctx)
                i += 1
            # ... rest unchanged

async def _run_step(self, step: StepConfig, ctx: PipelineContext):
    # ADDED: Wrap step execution
    async with TraceContext(f"step.{step.agent}",
                           agent_name=step.agent,
                           mode="sequential",
                           parent_trace_id=ctx.trace_id):

        # Original logic (unchanged)
        agent = self.registry.get(step.agent)
        agent_input = self._build_input(step, ctx)
        output = await agent.run(agent_input, ctx)
        ctx.set_result(step.agent, output)
        return output
```

**Lines of code changed:** ~10 lines added (all wrappers)
**Lines of code unchanged:** ~100+ lines (all business logic)

### Optional: Agent-Level Instrumentation

For more granular tracing, agents can opt-in to instrumentation:

```python
class StrategistAgent(BaseAgent):
    name = "strategist"

    @traced_agent  # Decorator creates span automatically
    async def run(self, input_data: AgentInput, ctx: PipelineContext):
        # Agent logic unchanged
        # Decorator handles span creation/finalization
        pass
```

## Architectural Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Separate OpenTelemetry Collector Process
**What:** Running OpenTelemetry Collector as a separate service
**Why bad:**
- Adds deployment complexity (Docker container, health checks)
- Requires network calls for local development
- Overkill for single-process bot application
- Complicates error handling (what if collector is down?)

**Instead:** Use in-process collector, upgrade later if needed

### ❌ Anti-Pattern 2: Modifying PipelineRunner Internals
**What:** Rewriting PipelineRunner methods to add tracing calls
**Why bad:**
- Violates project constraint ("must not restructure PipelineRunner internals")
- Creates merge conflicts with other features
- Harder to remove/disable tracing if needed
- Couples tracing to business logic

**Instead:** Use decorators and context managers (wrapper pattern)

### ❌ Anti-Pattern 3: Real-Time Trace Processing
**What:** Writing spans to database synchronously on completion
**Why bad:**
- Adds latency to user-facing operations
- Database write storms during high traffic
- Blocks async event loop
- No resilience if database is slow/unavailable

**Instead:** Use buffered collector with async background flushing

### ❌ Anti-Pattern 4: Complex Span Schema (NoSQL-style)
**What:** Storing entire span as JSON blob in single table
**Why bad:**
- Hard to query/filter efficiently
- No indexes on span attributes
- Wasted storage for repeated keys
- Difficult to aggregate/analyze

**Instead:** Use normalized schema (spans + attributes tables)

### ❌ Anti-Pattern 5: Building Custom Visualization from Scratch
**What:** Writing custom D3.js code for trace visualization
**Why bad:**
- Reinventing well-solved problems
- Time-consuming to build and maintain
- Missing standard features (zoom, search, export)
- Not mobile-friendly

**Instead:** Use existing open-source UI components (see below)

## Recommended Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Instrumentation** | Python decorators + contextvars | Native async support, minimal overhead |
| **Trace format** | OpenTelemetry span model | Industry standard, future-proof |
| **Collector** | Custom in-process (Python) | Simple deployment, low latency |
| **Storage** | PostgreSQL (via InsForge) | Already in stack, SQL queries, relational model |
| **Admin UI** | React + Recharts | Already in use, good charting library |
| **Visualization** | Recharts + custom components | Timeline/Gantt for traces, bar charts for metrics |

**Why NOT full OpenTelemetry ecosystem?**
- OpenTelemetry Collector: Overkill for single-process app
- OTLP protocol: Unnecessary network overhead
- Jaeger/Tempo: Separate services to maintain

**Why YES to OpenTelemetry span model?**
- Industry-standard format (portable)
- Well-documented structure
- Can upgrade to full OTel later if needed
- Compatible with other tools

## Scalability Considerations

### At Current Scale (MVP)
- **Traces per day:** ~100-1000 (assuming 10-100 active users)
- **Spans per trace:** 5-20 (pipeline + steps + agents)
- **Storage:** ~1MB per day (with 30-day retention = 30MB)
- **Query performance:** Sub-100ms with proper indexes

**Architecture:** In-process collector, PostgreSQL storage, React admin UI

### At 10K Users
- **Traces per day:** ~100K-1M
- **Spans per trace:** 5-20
- **Storage:** ~100MB-1GB per day (30-day retention = 3-30GB)
- **Query performance:** May need partitioning by date

**Upgrades needed:**
- Add sampling (trace 10% of requests)
- Partition spans table by month
- Add trace retention policy (delete after 30 days)
- Consider read replicas for admin queries

### At 100K+ Users
- **Traces per day:** 1M-10M+
- **Spans per trace:** 5-20
- **Storage:** 1GB-10GB per day

**Upgrades needed:**
- Switch to separate OpenTelemetry Collector
- Use Jaeger or Tempo for specialized trace storage
- Add trace aggregation (store summaries, sample details)
- Implement distributed tracing (if bot becomes multi-service)

## Open Questions & Future Research

1. **Sampling strategy:** Should we trace 100% of requests or sample? (Probably 100% for MVP, sample later)
2. **Trace retention:** How long to keep traces? (Suggest 30 days for MVP, configurable later)
3. **Performance impact:** What's the overhead of tracing? (Need to benchmark, but async should minimize impact)
4. **Alerting integration:** Should traces trigger alerts? (Phase 6 feature, not MVP)
5. **User privacy:** Should we anonymize user IDs in traces? (Depends on compliance requirements)

## Success Metrics

How to know if observability system is working:

1. **Adoption:** Developers use admin UI to debug issues (not just logs)
2. **MTTR:** Time to identify root cause of errors decreases
3. **Performance:** Identifies slow agents/steps for optimization
4. **Reliability:** Captures 99%+ of pipeline executions
5. **Overhead:** Tracing adds <5% latency to pipeline execution

## Sources

### Architecture Patterns & Build Order
- [Observability Pipeline: What It Is & How to Build One](https://spacelift.io/blog/observability-pipeline) - Build order and dependencies
- [Google Cloud Instrumentation and Observability](https://docs.cloud.google.com/stackdriver/docs/instrumentation/overview) - Component architecture
- [Grafana: The open and composable observability platform](https://grafana.com/) - Visualization patterns

### Python Async Instrumentation
- [OpenTelemetry asyncio Instrumentation](https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/asyncio/asyncio.html) - Async instrumentation
- [Tracing asynchronous Python code with Datadog APM](https://www.datadoghq.com/blog/tracing-async-python-code/) - Async tracing challenges
- [How to Use Async Agnostic Decorators in Python](https://www.patreon.com/posts/how-to-use-async-124658443) - Decorator patterns
- [Using Decorators to Instrument Python Code With OpenTelemetry Traces](https://digma.ai/using-decorators-to-instrument-python-code-with-opentelemetry-traces/) - Non-invasive instrumentation
- [Langfuse Decorator-Based Python Integration](https://langfuse.com/docs/sdk/python/decorators) - Context manager patterns

### Storage & Data Models
- [OpenTelemetry Traces Concepts](https://opentelemetry.io/docs/concepts/signals/traces/) - Trace and span model
- [What Are Spans in Distributed Tracing?](https://www.logicmonitor.com/blog/what-are-spans-in-distributed-tracing) - Span structure
- [GitHub - DataDog/pg_tracing](https://github.com/DataDog/pg_tracing) - PostgreSQL trace storage schema
- [Distributed tracing for asynchronous workflows using Opentelemetry](https://medium.com/hiver-engineering/distributed-tracing-for-asynchronous-workflows-using-opentelemetry-67e701685134) - Async context propagation

### Context Propagation
- [OpenTelemetry Context Propagation](https://opentelemetry.io/docs/concepts/context-propagation/) - Core concepts
- [OpenTelemetry Context Propagation Explained](https://betterstack.com/community/guides/observability/otel-context-propagation/) - Practical implementation

### Visualization & Admin UI
- [Top 15 Distributed Tracing Tools for Microservices in 2026](https://signoz.io/blog/distributed-tracing-tools/) - Tool comparison
- [7 Open Source Distributed Tracing Tools for Microservices in 2026](https://www.dash0.com/comparisons/open-source-distributed-tracing-tools) - Self-hosted options
- [12 Best Distributed Tracing Tools for Microservices in 2026](https://www.dash0.com/comparisons/best-distributed-tracing-tools) - UI patterns

### OpenTelemetry Ecosystem
- [OpenTelemetry Python Instrumentation](https://opentelemetry.io/docs/languages/python/instrumentation/) - Official docs
- [How to Trace Database Queries with OpenTelemetry](https://oneuptime.com/blog/post/2026-01-07-opentelemetry-database-tracing/view) - PostgreSQL integration
- [Monitor your Python data pipelines with OTEL](https://www.elastic.co/observability-labs/blog/monitor-your-python-data-pipelines-with-otel) - Pipeline patterns

### AI Agent Observability (Emerging Pattern)
- [Top 5 AI Agent Observability Platforms 2026 Guide](https://o-mega.ai/articles/top-5-ai-agent-observability-platforms-the-ultimate-2026-guide) - AI-specific tracing
- [Tracing - OpenAI Agents SDK](https://openai.github.io/openai-agents-python/tracing/) - Agent tracing patterns
- [Get Started with Tracing - Langfuse](https://langfuse.com/docs/observability/get-started) - LLM observability
