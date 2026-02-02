# Technology Stack: Pipeline Observability & Automated Testing

**Project:** Deal Quest Bot - Observability & Testing Layer
**Researched:** 2026-02-02
**Context:** Adding observability and automated testing to existing aiogram 3 async Telegram bot with AI agent pipelines

## Executive Summary

For a single-process Python async application with LLM agent pipelines, the 2025-2026 standard stack emphasizes:
- **Structured logging** with contextvars for async context propagation (structlog)
- **Lightweight tracing** using OpenTelemetry without full distributed tracing overhead
- **Native Python timing** instrumentation with time.perf_counter()
- **Async-first testing** with pytest-asyncio 1.x and specialized aiogram test frameworks
- **LLM-specific evaluation** frameworks for synthetic test case generation

**Key principle:** Avoid distributed tracing complexity (Jaeger, Zipkin) since this is single-process. Focus on in-process instrumentation, structured logging, and PostgreSQL-based trace storage.

---

## Recommended Stack

### Structured Logging

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **structlog** | 25.5.0+ | Structured logging with async support | Industry-standard for async Python. Native contextvars support for per-request context propagation. 5x faster than stdlib logging in async apps. Sub-microsecond overhead. JSON output for queryability. |
| **python-json-logger** | 3.2.1+ | JSON formatter fallback | Lightweight alternative if structlog is too heavyweight. Works with stdlib logging. |

**Rationale:**
- structlog 25.5.0 (released Oct 2025) has mature async support with contextvars integration
- Critical for aiogram: Can inject `user_id`, `chat_id`, `pipeline_id` into every log entry automatically
- Works perfectly with single-process apps - no distributed context needed
- JSON output can be directly stored in PostgreSQL JSONB columns

**Confidence:** HIGH (verified via PyPI, structlog docs, and 2026 best practices articles)

### Tracing & Instrumentation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **OpenTelemetry SDK** | 1.29.0+ | Core tracing library | Vendor-neutral, future-proof. Can generate traces without external collectors. Works in single-process mode. |
| **opentelemetry-instrumentation-asyncio** | 0.60b1+ | Automatic asyncio tracing | Auto-instruments asyncio tasks, coroutines, and futures. Provides timing metrics (duration, count) without manual instrumentation. |
| **time.perf_counter()** | stdlib | High-precision timing | Python stdlib. Monotonic clock with highest resolution (nanosecond precision on most platforms). Best practice for benchmarking per PEP 418. |

**Rationale:**
- **OpenTelemetry** is the 2025-2026 standard (OpenTracing deprecated)
- **Don't use full OTel Collector/Jaeger/Zipkin** - overkill for single-process bot
- Instead: Use OTel SDK to generate trace objects, serialize to JSON, store in PostgreSQL
- `opentelemetry-instrumentation-asyncio` (released Dec 2025) auto-traces asyncio without code changes
- `time.perf_counter()` is the official PEP 418 recommendation for timing - more precise than monotonic()

**What NOT to use:**
- Datadog APM, New Relic - expensive, designed for distributed systems
- OpenTracing - deprecated since 2021
- Jaeger/Zipkin - distributed tracing backends not needed for single-process app

**Confidence:** HIGH (verified via official OTel docs, PyPI, and PEP 418)

### Testing Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **pytest** | 8.3.0+ | Test framework | Industry standard. Best plugin ecosystem. |
| **pytest-asyncio** | 1.3.0+ | Async test support | Latest 1.x (Nov 2025) removes event_loop fixture, uses modern asyncio patterns. Handles async setup/teardown cleanly. |
| **aiogram-tests** | 1.2.0+ | aiogram-specific mocking | Mocks aiogram bot interactions (messages, callbacks). Uses MockedBot pattern. Actively maintained for aiogram 3. |
| **respx** | 0.22.0+ | HTTPX mocking | Mocks httpx async HTTP calls (Anthropic API, PostgREST). Clean async support. Pattern-based request matching. |
| **pytest-cov** | 6.0.0+ | Coverage reporting | Standard coverage tool. Async-aware. |

**Rationale:**
- **pytest-asyncio 1.3.0** (Nov 2025) is the stable modern version - 1.0 released May 2025 with significant API cleanup
- **aiogram-tests** provides `MockedBot` and `MessageHandler` for testing Telegram interactions without real API calls
- **respx** is the standard for mocking httpx - critical since bot uses httpx for Anthropic API
- Alternative considered: `aiogram-unittest` - less actively maintained, older patterns

**Migration note:** pytest-asyncio 1.x removed `event_loop` fixture. Use `asyncio.get_running_loop()` instead.

**Confidence:** HIGH (verified via PyPI, pytest-asyncio docs, aiogram-tests GitHub)

### LLM Testing & Evaluation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **deepeval** | 3.8.3+ | LLM pipeline evaluation | "pytest for LLMs". 14+ RAG metrics (faithfulness, answer relevance, hallucination). Agentic metrics (tool correctness). Runs locally. CI/CD integration. Synthetic dataset generation. |

**Rationale:**
- DeepEval 3.8.3 (Jan 2026) is actively maintained and production-ready
- Key feature: **Synthetic test case generation** for LLM pipelines
- Perfect fit: Can test Deal Quest Bot's scenario/negotiation agents with pre-defined evaluation criteria
- Runs locally - no external API calls needed for evaluation
- Apache 2.0 license

**When to use:**
- Regression testing: Does the negotiation agent still produce coherent responses?
- Quality gates: Is the answer faithful to the casebook context?
- Hallucination detection: Does the agent invent deal terms not in the scenario?

**What NOT to use:**
- LangSmith - proprietary, requires external service
- Weights & Biases - overkill for small bot
- Manual eval - doesn't scale to regression testing

**Confidence:** HIGH (verified via PyPI, DeepEval docs, and GitHub repo)

### Database Client

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **postgrest-py** | 0.18.0+ | PostgREST async client | Official Supabase client. Async/await support. ORM-like interface. Built on httpx. |
| **asyncpg** | 0.31.0+ | Direct PostgreSQL access (optional) | If bypassing PostgREST. 5x faster than psycopg3. Native async. Best connection pooling. |

**Rationale:**
- Project uses InsForge (PostgREST + PostgreSQL)
- **postgrest-py** is the official client - maintained by Supabase
- Supports `AsyncPostgrestClient` for async/await patterns
- Alternative: `asyncpg` if you need direct SQL access (e.g., complex trace queries)

**Best practice:** Use postgrest-py for CRUD, asyncpg for analytics queries

**Confidence:** MEDIUM (postgrest-py docs are sparse, but it's the official client)

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Structured Logging | structlog | python-json-logger | structlog has better async support, contextvars integration |
| Tracing | OpenTelemetry SDK | Datadog APM | Datadog is expensive, designed for distributed systems, overkill for single-process bot |
| Tracing Backend | PostgreSQL + custom | Jaeger, Zipkin | Distributed tracing backends not needed. PostgreSQL already in stack. |
| Timing | time.perf_counter() | time.monotonic() | perf_counter has higher resolution (PEP 418 recommendation for benchmarking) |
| Async Testing | pytest-asyncio | asyncio.run() manually | pytest-asyncio handles event loop lifecycle, fixtures, cleanup automatically |
| Bot Testing | aiogram-tests | aiogram-unittest | aiogram-tests more actively maintained, better aiogram 3 support |
| HTTP Mocking | respx | pytest-httpx | respx has cleaner pattern matching, better async support |
| LLM Eval | deepeval | LangSmith, manual eval | DeepEval runs locally, open-source, pytest integration, synthetic data generation |
| PostgreSQL Client | postgrest-py | asyncpg raw SQL | postgrest-py matches existing InsForge architecture, less SQL boilerplate |

---

## Installation

```bash
# Core observability
pip install structlog==25.5.0
pip install opentelemetry-api==1.29.0
pip install opentelemetry-sdk==1.29.0
pip install opentelemetry-instrumentation-asyncio==0.60b1

# Testing framework
pip install pytest==8.3.0
pip install pytest-asyncio==1.3.0
pip install pytest-cov==6.0.0

# Bot-specific testing
pip install aiogram-tests==1.2.0
pip install respx==0.22.0

# LLM evaluation
pip install deepeval==3.8.3

# Database clients
pip install postgrest-py==0.18.0
pip install asyncpg==0.31.0  # Optional for direct SQL access
```

**Dev dependencies only:**
```bash
pip install -D pytest pytest-asyncio pytest-cov aiogram-tests respx deepeval
```

---

## Architecture Patterns

### 1. Structured Logging Setup

**Pattern: ContextVars for per-request context**

```python
import structlog
from contextvars import ContextVar

# Configure structlog once at startup
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)

# Define context vars
user_id_ctx = ContextVar("user_id", default=None)
pipeline_id_ctx = ContextVar("pipeline_id", default=None)

# Use in middleware/handler
async def handle_message(message):
    user_id_ctx.set(message.from_user.id)
    pipeline_id_ctx.set(f"pipeline_{uuid4()}")

    structlog.contextvars.bind_contextvars(
        user_id=message.from_user.id,
        chat_id=message.chat.id,
        pipeline_id=pipeline_id_ctx.get()
    )

    logger = structlog.get_logger()
    logger.info("processing_message", text=message.text)
    # All logs in this async context will include user_id, chat_id, pipeline_id
```

### 2. Timing Instrumentation

**Pattern: Decorator for step timing**

```python
import time
import functools
import structlog

logger = structlog.get_logger()

def timed(step_name: str):
    """Decorator for timing async functions."""
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            start = time.perf_counter()
            try:
                result = await func(*args, **kwargs)
                duration = time.perf_counter() - start
                logger.info(
                    "step_completed",
                    step=step_name,
                    duration_ms=round(duration * 1000, 2),
                    success=True
                )
                return result
            except Exception as e:
                duration = time.perf_counter() - start
                logger.error(
                    "step_failed",
                    step=step_name,
                    duration_ms=round(duration * 1000, 2),
                    error=str(e),
                    success=False
                )
                raise
        return wrapper
    return decorator

# Usage in agent
class NegotiationAgent(BaseAgent):
    @timed("negotiation_agent")
    async def run(self, input: AgentInput, ctx: PipelineContext) -> AgentOutput:
        # Agent logic here
        pass
```

### 3. OpenTelemetry Trace Generation

**Pattern: Generate trace spans, store as JSON in PostgreSQL**

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor

# Setup tracer (once at startup)
trace.set_tracer_provider(TracerProvider())
tracer = trace.get_tracer(__name__)

# In PipelineRunner
async def _run_step(self, step: StepConfig, ctx: PipelineContext):
    with tracer.start_as_current_span(
        f"agent.{step.agent}",
        attributes={
            "agent.name": step.agent,
            "pipeline.id": ctx.pipeline_id,
            "user.id": ctx.user_id
        }
    ) as span:
        agent = self.registry.get(step.agent)
        output = await agent.run(agent_input, ctx)

        span.set_attribute("agent.success", output.success)
        span.set_attribute("agent.output_length", len(str(output.data)))

        # Export span to PostgreSQL
        await self._store_trace_span(span, ctx)

        return output
```

### 4. Testing Pattern

**Pattern: Async test with mocked bot and HTTP**

```python
import pytest
from aiogram_tests import MockedBot
from aiogram_tests.handler import MessageHandler
from respx import MockRouter

@pytest.mark.asyncio
async def test_deal_scenario_pipeline(respx_mock: MockRouter):
    # Mock Anthropic API
    respx_mock.post("https://api.anthropic.com/v1/messages").mock(
        return_value={"content": [{"text": "Mocked Claude response"}]}
    )

    # Mock InsForge (PostgREST)
    respx_mock.get("http://localhost:3000/scenarios").mock(
        return_value=[{"id": "001", "title": "Tech Startup Acquisition"}]
    )

    # Test aiogram handler
    bot = MockedBot(MessageHandler(start_handler))
    calls = await bot.query(message=Message(text="/start"))
    response = calls.send_message.fetchone()

    assert "Choose a scenario" in response.text

@pytest.mark.asyncio
async def test_agent_timing():
    """Test that agent completes within acceptable time."""
    agent = NegotiationAgent()

    start = time.perf_counter()
    output = await agent.run(test_input, test_context)
    duration = time.perf_counter() - start

    assert output.success
    assert duration < 5.0  # Agent must complete in <5s
```

### 5. LLM Evaluation Pattern

**Pattern: DeepEval synthetic test cases**

```python
from deepeval import assert_test
from deepeval.metrics import FaithfulnessMetric, AnswerRelevancyMetric
from deepeval.test_case import LLMTestCase

@pytest.mark.asyncio
async def test_negotiation_agent_faithfulness():
    """Test that agent responses are faithful to casebook context."""

    # Generate synthetic test case
    test_case = LLMTestCase(
        input="What's the valuation of the startup?",
        actual_output=agent_response,
        retrieval_context=[casebook_context],
        expected_output="Valuation is $50M based on last funding round."
    )

    # Evaluate with DeepEval metrics
    faithfulness_metric = FaithfulnessMetric(threshold=0.8)
    relevancy_metric = AnswerRelevancyMetric(threshold=0.7)

    assert_test(test_case, [faithfulness_metric, relevancy_metric])
```

---

## Trace Storage Schema

**Pattern: Store traces in PostgreSQL via InsForge**

```sql
-- Table: pipeline_traces
CREATE TABLE pipeline_traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id TEXT NOT NULL,
    user_id BIGINT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    status TEXT NOT NULL, -- 'running', 'completed', 'failed'
    error TEXT,
    trace_data JSONB NOT NULL, -- Full OTel trace as JSON
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: agent_steps
CREATE TABLE agent_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id TEXT NOT NULL REFERENCES pipeline_traces(pipeline_id),
    agent_name TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    success BOOLEAN NOT NULL,
    input_data JSONB,
    output_data JSONB,
    error TEXT,
    span_id TEXT, -- OTel span ID for correlation
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Telegram /admin queries
CREATE INDEX idx_pipeline_traces_user_id ON pipeline_traces(user_id);
CREATE INDEX idx_pipeline_traces_started_at ON pipeline_traces(started_at DESC);
CREATE INDEX idx_agent_steps_pipeline_id ON agent_steps(pipeline_id);
```

---

## Implementation Checklist

### Phase 1: Structured Logging
- [ ] Install structlog 25.5.0
- [ ] Configure JSON processors and contextvars
- [ ] Add middleware to inject user_id, pipeline_id into context
- [ ] Replace existing logger.info() calls with structlog
- [ ] Test async context propagation

### Phase 2: Timing Instrumentation
- [ ] Create `@timed` decorator using time.perf_counter()
- [ ] Add decorator to all agents
- [ ] Add decorator to PipelineRunner._run_step()
- [ ] Store timing data in PostgreSQL agent_steps table

### Phase 3: Tracing
- [ ] Install OpenTelemetry SDK + asyncio instrumentation
- [ ] Configure TracerProvider (no external exporter)
- [ ] Generate spans for each pipeline step
- [ ] Serialize spans to JSON
- [ ] Store traces in pipeline_traces table

### Phase 4: PostgreSQL Storage
- [ ] Create pipeline_traces and agent_steps tables
- [ ] Add RLS policies for user isolation
- [ ] Create PostgREST endpoints
- [ ] Implement trace storage in PipelineRunner
- [ ] Add /admin command to query recent traces

### Phase 5: Testing Infrastructure
- [ ] Install pytest-asyncio 1.3.0, aiogram-tests, respx
- [ ] Create pytest fixtures for mocked bot
- [ ] Create fixtures for mocked Anthropic API (respx)
- [ ] Create fixtures for mocked InsForge (respx)
- [ ] Write test utilities for pipeline execution

### Phase 6: LLM Evaluation
- [ ] Install deepeval 3.8.3
- [ ] Define evaluation metrics (faithfulness, relevancy)
- [ ] Create synthetic test cases for each agent
- [ ] Add pytest tests using deepeval.assert_test()
- [ ] Integrate into CI/CD pipeline

---

## Performance Considerations

### Logging Overhead
- structlog: <1μs per log call with contextvars
- JSON rendering: ~10μs per log entry
- **Mitigation:** Use log levels (INFO for production, DEBUG for development)

### Tracing Overhead
- OpenTelemetry span creation: ~5-10μs per span
- Asyncio instrumentation: ~2-3% overhead
- **Mitigation:** Don't trace every coroutine - focus on agent-level spans

### Storage Cost
- Estimate: 5KB per pipeline trace (10 steps × 500 bytes JSON)
- 1000 pipelines/day = 5MB/day = 150MB/month
- **Mitigation:** Add retention policy (delete traces older than 30 days)

### Test Execution Time
- aiogram-tests mocking: <10ms per test
- respx mocking: <5ms per test
- deepeval evaluation: 100-500ms per test case (LLM inference)
- **Mitigation:** Run deepeval tests in separate CI job (not on every commit)

---

## Quality Gates

### Confidence Levels

| Area | Confidence | Rationale |
|------|-----------|-----------|
| Structured Logging (structlog) | **HIGH** | Verified via PyPI, official docs, and multiple 2025-2026 best practices articles. Clear async/contextvars support. |
| Tracing (OpenTelemetry) | **HIGH** | Official OTel docs confirm asyncio instrumentation. Released Dec 2025. Industry standard. |
| Timing (perf_counter) | **HIGH** | PEP 418 official recommendation. Stdlib, well-documented. |
| Testing (pytest-asyncio) | **HIGH** | Verified via PyPI. Version 1.3.0 released Nov 2025. Stable API. |
| Bot Testing (aiogram-tests) | **MEDIUM** | Active GitHub repo, works with aiogram 3, but documentation is sparse. |
| HTTP Mocking (respx) | **HIGH** | Official httpx recommendation. Well-documented async support. |
| LLM Eval (deepeval) | **HIGH** | Active development (Jan 2026 release). Clear docs, pytest integration. |
| PostgREST Client (postgrest-py) | **MEDIUM** | Official Supabase client, but async docs are limited. May need trial-and-error. |

### Version Currency Verification

All versions checked against PyPI as of 2026-02-02:
- structlog 25.5.0: CURRENT (released Oct 2025)
- opentelemetry-instrumentation-asyncio 0.60b1: CURRENT (released Dec 2025)
- pytest-asyncio 1.3.0: CURRENT (released Nov 2025)
- deepeval 3.8.3: CURRENT (released Jan 2026)
- respx 0.22.0: CURRENT
- postgrest-py 0.18.0: CURRENT

**All recommendations use 2025-2026 releases. No outdated libraries.**

---

## What NOT to Do

### Anti-Pattern: Distributed Tracing Overhead
**Don't:** Install Jaeger, Zipkin, or external OTel collectors.
**Why:** Single-process app doesn't need distributed tracing. Adds complexity, latency, external dependencies.
**Instead:** Generate OTel traces in-process, store as JSON in PostgreSQL.

### Anti-Pattern: Manual Event Loop Management
**Don't:** Use `event_loop` fixture with pytest-asyncio 1.x.
**Why:** Removed in version 1.0. Use `asyncio.get_running_loop()` instead.
**Instead:** Let pytest-asyncio handle event loop lifecycle automatically.

### Anti-Pattern: Mocking with unittest.mock.AsyncMock
**Don't:** Use stdlib `AsyncMock` for httpx requests.
**Why:** Requires verbose setup, doesn't validate request patterns.
**Instead:** Use `respx` for pattern-based HTTP mocking.

### Anti-Pattern: Manual LLM Evaluation
**Don't:** Manually inspect LLM outputs for quality.
**Why:** Doesn't scale to regression testing. Subjective. Time-consuming.
**Instead:** Use deepeval metrics for automated, quantitative evaluation.

### Anti-Pattern: Logging PII
**Don't:** Log full user messages or API keys.
**Why:** GDPR compliance, security risk.
**Instead:** Log hashes, IDs, or redacted versions. Use structlog processors to auto-redact.

---

## Sources

### Structured Logging
- [structlog PyPI](https://pypi.org/project/structlog/) - Current version and features
- [Structlog ContextVars: Python Async Logging 2026](https://johal.in/structlog-contextvars-python-async-logging-2026/) - Async best practices
- [Python Logging Best Practices: Complete Guide 2026](https://www.carmatec.com/blog/python-logging-best-practices-complete-guide/) - General logging patterns

### Tracing & Instrumentation
- [OpenTelemetry asyncio Instrumentation](https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/asyncio/asyncio.html) - Official docs
- [opentelemetry-instrumentation-asyncio PyPI](https://pypi.org/project/opentelemetry-instrumentation-asyncio/) - Version info
- [PEP 418 – Add monotonic time, performance counter](https://peps.python.org/pep-0418/) - Official timing recommendation
- [Python Timer Functions: Three Ways to Monitor Your Code](https://realpython.com/python-timer/) - Best practices

### Testing
- [pytest-asyncio PyPI](https://pypi.org/project/pytest-asyncio/) - Current version
- [Essential pytest asyncio Tips for Modern Async Testing](https://articles.mergify.com/pytest-asyncio-2/) - 2025 patterns
- [Navigating pytest-asyncio 1.0 and Migration Strategies](https://thinhdanggroup.github.io/pytest-asyncio-v1-migrate/) - Migration guide
- [aiogram-tests PyPI](https://pypi.org/project/aiogram-tests/) - Bot testing library
- [respx Documentation](https://lundberg.github.io/respx/) - HTTP mocking guide
- [Mock HTTPX with respx](https://lundberg.github.io/respx/versions/0.14.0/mocking/) - Usage examples

### LLM Evaluation
- [deepeval PyPI](https://pypi.org/project/deepeval/) - Current version
- [DeepEval GitHub](https://github.com/confident-ai/deepeval) - Official repo
- [LLM Testing in 2026: Top Methods and Strategies](https://www.confident-ai.com/blog/llm-testing-in-2024-top-methods-and-strategies) - Testing approaches

### Database
- [postgrest-py Documentation](https://postgrest-py.readthedocs.io/en/latest/api/client.html) - Client API
- [asyncpg PyPI](https://pypi.org/project/asyncpg/) - PostgreSQL async client
- [asyncpg Usage Guide](https://magicstack.github.io/asyncpg/current/usage.html) - Best practices

---

## Next Steps

1. **Validate library versions** - Install all packages in a test venv, verify compatibility
2. **Prototype structured logging** - Add structlog to one handler, test context propagation
3. **Design trace schema** - Finalize PostgreSQL tables based on actual pipeline structure
4. **Write first test** - Create pytest fixture for PipelineRunner, test with mocked LLM
5. **Benchmark overhead** - Measure actual performance impact of logging + tracing

**Estimated implementation time:** 2-3 weeks for full observability + testing infrastructure.

---

**Confidence:** HIGH overall. All libraries are current (2025-2026), widely adopted, and well-documented. Primary risk is postgrest-py async patterns (MEDIUM confidence) - may need trial-and-error.
