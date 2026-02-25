# Architecture

**Analysis Date:** 2026-02-06

## Pattern Overview

**Overall:** Multi-layered event-driven architecture with pipeline orchestration

**Key Characteristics:**
- Agent-based pipeline execution for AI workflows (sequential/parallel/background modes)
- Repository pattern for data persistence with async HTTP client
- Dependency injection via aiogram dispatcher workflow_data
- Separate TMA (Telegram Mini App) client with shared backend
- Tracing instrumentation for observability (async context propagation)

## Layers

**Presentation Layer (Telegram Bot):**
- Purpose: Handles user interactions via Telegram bot protocol
- Location: `bot/handlers/`
- Contains: Command handlers, callback query handlers, FSM state handlers
- Depends on: Services, repositories, agents, pipeline runner
- Used by: Telegram users via aiogram dispatcher

**Presentation Layer (TMA Web Client):**
- Purpose: Rich web interface for bot features via Telegram Mini App
- Location: `packages/webapp/src/`
- Contains: React pages, feature components, hooks for data fetching
- Depends on: InsForge SDK (PostgREST client), Telegram SDK
- Used by: Telegram users via in-app browser

**Service Layer:**
- Purpose: Business logic and external integrations
- Location: `bot/services/`
- Contains: LLM routing, knowledge loading, encryption, transcription, scheduling
- Depends on: Repositories, external APIs (OpenRouter, Claude, AssemblyAI)
- Used by: Handlers, agents

**Agent Layer:**
- Purpose: AI-powered workflow steps with typed input/output
- Location: `bot/agents/`
- Contains: StrategistAgent, TrainerAgent, MemoryAgent, ExtractionAgent, ReanalysisStrategistAgent
- Depends on: Services (LLMRouter, KnowledgeService), BaseAgent ABC
- Used by: PipelineRunner

**Pipeline Orchestration:**
- Purpose: Execute multi-step AI workflows from YAML definitions
- Location: `bot/pipeline/`
- Contains: PipelineRunner (sequential/parallel/background execution), PipelineContext (shared state), config_loader (YAML parser)
- Depends on: AgentRegistry, agents
- Used by: Handlers (support, learn, train, context_input)

**Data Access Layer:**
- Purpose: Abstraction over InsForge PostgREST API
- Location: `bot/storage/`
- Contains: 12 repository classes (UserRepo, LeadRegistryRepo, SupportSessionRepo, etc.), InsForgeClient (async HTTP), Pydantic models
- Depends on: InsForgeClient, httpx
- Used by: Services, handlers, tracing

**Infrastructure Layer:**
- Purpose: Cross-cutting concerns (auth, tracing, error handling)
- Location: `bot/middleware.py`, `bot/tracing/`, `bot/task_utils.py`
- Contains: AuthorizationMiddleware (username allowlist), TraceContext (pipeline observability), background task protection
- Depends on: aiogram, contextvars
- Used by: All layers

## Data Flow

**Bot Command Execution:**

1. User sends `/support` command to Telegram bot
2. AuthorizationMiddleware checks username against allowlist
3. Handler (`bot/handlers/support.py`) receives message via aiogram router
4. Handler creates PipelineContext with user input + knowledge base
5. Handler wraps execution in TraceContext for observability
6. PipelineRunner executes YAML-defined pipeline (`data/pipelines/support.yaml`)
7. StrategistAgent calls LLMRouter → Claude/OpenRouter → returns strategy JSON
8. MemoryAgent updates user memory in background (fire-and-forget)
9. Handler formats response with `bot/utils.py::format_support_response()`
10. Response sent to Telegram with inline keyboard for actions

**TMA Data Fetch:**

1. TMA opens, `packages/webapp/src/main.tsx` initializes Telegram SDK
2. AuthProvider (`packages/webapp/src/app/providers/AuthProvider.tsx`) calls `authenticateWithTelegram()`
3. Edge Function `functions/verify-telegram/` validates HMAC-SHA256, upserts user, mints JWT
4. TanStack Query hook (e.g., `useLeads()`) fetches data via InsForge SDK
5. InsForge client makes GET to PostgREST with `telegram_id` filter
6. RLS policies enforce row-level access (anon role with full access, filters by telegram_id)
7. Data returned to component, rendered via feature components

**Pipeline Tracing Flow:**

1. Handler creates `async with TraceContext(pipeline_name, telegram_id, user_id)`
2. TraceContext sets trace_id in ContextVar for async propagation
3. Agent methods decorated with `@traced_span` capture input/output/timing
4. Spans pushed to stack, parent_span_id linked for hierarchy
5. On pipeline completion, TraceContext persists trace via TraceCollector
6. TraceCollector batches spans, flushes to `pipeline_traces` + `pipeline_spans` tables every 10s

**Lead Re-Analysis Flow (New in Phase 15):**

1. User selects "Add Context" on lead detail (`bot/handlers/leads.py`)
2. FSM enters ReanalysisState.awaiting_context_input
3. User sends text/voice/photo → `bot/handlers/context_input.py` collects data
4. Context stored in LeadActivityModel with type='context_addition'
5. User triggers "Re-analyze Strategy?" callback
6. Handler executes `data/pipelines/reanalysis.yaml` pipeline
7. ReanalysisStrategistAgent fetches all activities, computes diff from original strategy
8. New strategy persisted to LeadAnalysisHistoryModel, diff saved in activity record
9. Scheduled reminders updated via `bot/services/plan_scheduler.py`

**Reminder Scheduling Flow:**

1. Lead engagement plan created with timing expressions ("tomorrow 9am", "in 2 days")
2. `bot/services/plan_scheduler.py::schedule_plan_reminders()` parses timing → due_at timestamps
3. Reminders stored in `scheduled_reminders` table with status='pending'
4. Background scheduler polls every 15 minutes for due reminders
5. When reminder due, bot sends message with inline keyboard (Done/Snooze/Skip/Draft)
6. `bot/handlers/reminders.py` handles callbacks, updates reminder status
7. Snooze increments snooze_count, sets new due_at (+1 hour default)

**State Management:**
- Bot: aiogram FSM (MemoryStorage) for conversation state (SupportState, LeadEngagementState, ReanalysisState, etc.)
- TMA: Zustand store for auth state (`packages/webapp/src/features/auth/store.ts`), TanStack Query cache for server state

## Key Abstractions

**Agent:**
- Purpose: Encapsulates a single AI-powered workflow step
- Examples: `bot/agents/strategist.py`, `bot/agents/trainer.py`, `bot/agents/extraction.py`
- Pattern: Abstract base class (`BaseAgent`) with `run(AgentInput, PipelineContext) -> AgentOutput`, decorated with `@traced_span`

**Repository:**
- Purpose: Data access abstraction for InsForge tables
- Examples: `bot/storage/repositories.py::UserRepo`, `LeadRegistryRepo`, `SupportSessionRepo`, `ScheduledReminderRepo`
- Pattern: Class with async methods (get, create, update, delete), wraps InsForgeClient HTTP calls

**Pipeline:**
- Purpose: Declarative multi-step AI workflow
- Examples: `data/pipelines/support.yaml`, `data/pipelines/reanalysis.yaml`, `data/pipelines/support_photo.yaml`
- Pattern: YAML config defining agent steps (sequential/parallel/background), input_mapping from context or previous results

**Provider:**
- Purpose: Abstraction for LLM API clients
- Examples: `bot/services/llm_router.py::ClaudeProvider`, `OpenRouterProvider`
- Pattern: Abstract base class with `complete()` and `validate_key()` methods, decorated with `@traced_span`

**TraceContext:**
- Purpose: Async context manager for pipeline execution observability
- Examples: `bot/tracing/context.py::TraceContext`
- Pattern: Async context manager that sets trace_id in ContextVar, persists trace on exit

**ProgressUpdater:**
- Purpose: Real-time Telegram message editing during long operations
- Examples: `bot/services/progress.py::ProgressUpdater`
- Pattern: Async context manager with phase-based updates, NOT used for tracing (TraceContext is separate)

## Entry Points

**Bot Entry Point:**
- Location: `bot/main.py`
- Triggers: Python module execution (`python -m bot.main`)
- Responsibilities: DI wiring (inject repos/services into workflow_data), register handlers, start polling, initialize tracing collector, start background schedulers (followup, plan reminders, scenario generation)

**TMA Entry Point:**
- Location: `packages/webapp/src/main.tsx`
- Triggers: Vite dev server or Railway static serving
- Responsibilities: Initialize Telegram SDK, mount React app, setup error boundary

**Handler Entry Points (Bot):**
- Location: `bot/handlers/support.py`, `bot/handlers/leads.py`, `bot/handlers/context_input.py`, `bot/handlers/reminders.py`, etc.
- Triggers: Telegram commands (`/support`, `/leads`) or callback queries (`lead:view:123`, `reanalyze:start:456`)
- Responsibilities: Parse input, validate, execute pipeline, format response, manage FSM state

**Page Entry Points (TMA):**
- Location: `packages/webapp/src/pages/Dashboard.tsx`, `packages/webapp/src/pages/Leads.tsx`, etc.
- Triggers: React Router navigation
- Responsibilities: Compose feature components, trigger data fetching via TanStack Query hooks

## Error Handling

**Strategy:** Layered error handling with user-friendly messages

**Patterns:**
- Agent exceptions caught by PipelineRunner, wrapped in `AgentOutput(success=False, error=str(e))`
- Handler try/except blocks catch pipeline failures, send Telegram error message
- TMA uses ErrorBoundary (`packages/webapp/src/shared/ui/ErrorBoundary.tsx`) for component-level errors
- TanStack Query provides error states, components display ErrorCard (`packages/webapp/src/shared/ui/ErrorCard.tsx`)
- Tracing records failed spans with error message + stack trace sanitized
- Background tasks wrapped in `bot/task_utils.py::create_background_task()` with exception logging

## Cross-Cutting Concerns

**Logging:** Python `logging` module, configured in `bot/main.py::setup_logging()`, structured format with level/name/message

**Validation:** Input validation utility (`bot/utils_validation.py::validate_user_input()`) checks length limits, profanity, prevents prompt injection

**Authentication:**
- Bot: Username-based allowlist (`bot/middleware.py::AuthorizationMiddleware`)
- TMA: Telegram initData HMAC validation (`functions/verify-telegram/`) + JWT minting, stored in Zustand auth store

**Observability:** Pipeline tracing via TraceContext + traced_span decorator, batched async flush to InsForge (`bot/tracing/collector.py::TraceCollector`)

**Background Tasks:** Protected task creation (`bot/task_utils.py::create_background_task()`) with exception logging, prevents silent failures

**Progress Updates:** Real-time Telegram message editing during pipeline execution (`bot/services/progress.py::ProgressUpdater`), phase-based status messages

**Image Processing:** Pre-resize utility (`bot/services/image_utils.py::pre_resize_image()`) to reduce token costs before vision API calls

**Diff Computation:** JSON diff utility (`bot/services/diff_utils.py`) for computing strategy changes in re-analysis flow

---

*Architecture analysis: 2026-02-06*
