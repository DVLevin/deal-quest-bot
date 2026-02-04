# Architecture

**Analysis Date:** 2026-02-04

## Pattern Overview

**Overall:** Dual-application monorepo with shared backend infrastructure

**Key Characteristics:**
- Two independent applications (Python bot, React TMA) sharing the same InsForge PostgreSQL database
- YAML-driven agent pipeline orchestration with async execution modes (sequential/parallel/background)
- Repository pattern for data persistence with PostgREST HTTP client
- Decorator-based distributed tracing with async context propagation
- Dependency injection via aiogram's workflow_data dictionary

## Layers

**Bot Layer (Python/aiogram):**
- Purpose: Telegram bot server handling user commands and agent orchestration
- Location: `bot/`
- Contains: Command handlers, FSM states, middleware, agent pipeline system
- Depends on: InsForge client, agent registry, service layer, storage repositories
- Used by: Telegram API (polling), Railway deployment

**Agent Layer (Python):**
- Purpose: AI agent implementations for business logic (strategist, trainer, memory)
- Location: `bot/agents/`
- Contains: BaseAgent ABC, concrete agent implementations, agent registry
- Depends on: LLM router, pipeline context, tracing decorators
- Used by: Pipeline runner

**Pipeline Layer (Python):**
- Purpose: YAML-defined workflow orchestration for multi-agent tasks
- Location: `bot/pipeline/`
- Contains: PipelineRunner, PipelineContext, YAML config loader
- Depends on: Agent registry, tracing system
- Used by: Command handlers

**Service Layer (Python):**
- Purpose: Reusable business logic (LLM routing, knowledge loading, encryption, transcription)
- Location: `bot/services/`
- Contains: LLMProvider abstraction, KnowledgeService, CryptoService, ProgressUpdater, EngagementService
- Depends on: External APIs (OpenRouter, Claude, AssemblyAI), InsForge repositories
- Used by: Agents, handlers

**Storage Layer (Python):**
- Purpose: Data persistence abstraction over InsForge PostgREST API
- Location: `bot/storage/`
- Contains: InsForgeClient (async HTTP), 11 repository classes, Pydantic models
- Depends on: httpx, InsForge API
- Used by: Services, agents, handlers

**Tracing Layer (Python):**
- Purpose: Pipeline observability with distributed tracing
- Location: `bot/tracing/`
- Contains: TraceContext (async context manager), traced_span decorator, TraceCollector (background flush)
- Depends on: ContextVars, TraceRepo
- Used by: Handlers (wrap pipelines), agents/LLM (decorators)

**TMA Layer (React/TypeScript):**
- Purpose: Telegram Mini App frontend for dashboard, support, leads, training
- Location: `packages/webapp/`
- Contains: React pages, features (auth, casebook, leads, support, etc.), InsForge SDK client
- Depends on: @insforge/sdk, Telegram SDK, Zustand, React Query
- Used by: Telegram WebView

**Edge Functions Layer (Deno):**
- Purpose: Serverless functions for auth and database proxying
- Location: `functions/`
- Contains: verify-telegram (Telegram initData auth + JWT minting), db-proxy (database operations)
- Depends on: Deno runtime, InsForge secrets
- Used by: TMA auth flow, TMA data fetching

**Shared Types Layer (TypeScript):**
- Purpose: Type definitions shared between TMA and edge functions
- Location: `packages/shared/`
- Contains: TypeScript interfaces for database models
- Depends on: None
- Used by: TMA (inlined into webapp/src/types due to Railway root_dir isolation)

## Data Flow

**Bot Command Flow:**

1. User sends Telegram message → aiogram router → AuthorizationMiddleware (username check)
2. Handler retrieves user from UserRepo → checks encrypted_api_key
3. Handler sets FSM state → waits for user input
4. Handler creates PipelineContext (LLM provider, knowledge base, user memory)
5. PipelineRunner executes YAML-defined steps (sequential/parallel/background)
6. Agents call LLM via traced LLMProvider.complete() → OpenRouter/Claude API
7. Agent updates context.results → next agent reads results
8. Background MemoryAgent updates user_memory table
9. Handler formats response → sends to Telegram → updates repositories
10. TraceCollector flushes trace/span data to InsForge in background

**TMA Auth Flow:**

1. User opens Mini App → Telegram SDK provides initData
2. AuthProvider calls verify-telegram Edge Function with initData
3. Edge Function validates HMAC using TELEGRAM_BOT_TOKEN → mints JWT (HS256)
4. AuthProvider stores JWT + user metadata in Zustand store
5. InsForge client created with anon key (custom JWT not used for PostgREST)
6. All queries filter by telegram_id from auth store (enforced client-side)

**TMA Data Flow:**

1. React Query hook calls InsForge SDK → PostgREST query with telegram_id filter
2. Data rendered in React components
3. User action → mutation via InsForge SDK → database update
4. React Query invalidates cache → UI refreshes

**State Management:**
- Bot: aiogram FSM (MemoryStorage) + workflow_data for DI + PipelineContext for inter-agent state
- TMA: Zustand for auth, React Query for server state, component state for UI

## Key Abstractions

**BaseAgent:**
- Purpose: Polymorphic agent interface for pipeline orchestration
- Examples: `bot/agents/strategist.py`, `bot/agents/trainer.py`, `bot/agents/memory.py`
- Pattern: ABC with async run(AgentInput, PipelineContext) → AgentOutput (Pydantic)

**InsForgeClient:**
- Purpose: Async HTTP abstraction over PostgREST API
- Examples: `bot/storage/insforge_client.py`
- Pattern: Methods for query/create/update/upsert/delete with PostgREST filter syntax

**Repository:**
- Purpose: Table-specific data access layer
- Examples: `UserRepo`, `AttemptRepo`, `LeadRegistryRepo` (11 total in `bot/storage/repositories.py`)
- Pattern: Class per table with typed methods (get, create, update, delete) returning Pydantic models

**LLMProvider:**
- Purpose: Vendor-agnostic LLM completion interface
- Examples: `ClaudeProvider`, `OpenRouterProvider` in `bot/services/llm_router.py`
- Pattern: ABC with async complete(system_prompt, user_message) → dict, decorated with @traced_span

**PipelineContext:**
- Purpose: Shared mutable state container for pipeline execution
- Examples: `bot/pipeline/context.py`
- Pattern: Dictionary-like object with LLM, knowledge_base, user_memory, results storage

**ProgressUpdater:**
- Purpose: Real-time Telegram message updates during long operations
- Examples: `bot/services/progress.py`
- Pattern: Async context manager with phase updates and animations

**TraceContext:**
- Purpose: Async context manager for pipeline-level observability
- Examples: `bot/tracing/context.py`
- Pattern: Wraps pipeline execution, sets ContextVar for span propagation, persists trace on exit

## Entry Points

**Bot Entry Point:**
- Location: `bot/main.py`
- Triggers: `python3 -m bot.main` (Railway or local)
- Responsibilities: DI wiring (repos, services, agents), dispatcher setup, router registration, polling start, background scheduler launch

**TMA Entry Point:**
- Location: `packages/webapp/src/main.tsx`
- Triggers: Vite dev server or Railway static serve
- Responsibilities: React root render, provider hierarchy (Auth → Query → Router)

**Pipeline Entry Point:**
- Location: YAML configs in `data/pipelines/`
- Triggers: PipelineRunner.run() called from handlers
- Responsibilities: Define agent sequence, execution mode, input mappings

**Edge Function Entry Points:**
- Location: `functions/verify-telegram/index.ts`, `functions/db-proxy.js`
- Triggers: HTTP POST from TMA
- Responsibilities: Telegram auth validation + JWT minting, database proxying

## Error Handling

**Strategy:** Layered error handling with logging, user feedback, and graceful degradation

**Patterns:**
- Handlers: try/except with user-friendly message + logger.error
- Agents: AgentOutput with success=False + error field
- LLM calls: Retry logic (3 attempts with exponential backoff) in LLMProvider
- Pipeline: Continues execution even if background steps fail (fire-and-forget)
- TMA: React error boundaries (implied by lazy loading), toast notifications for mutations
- Tracing: Span records error field, trace marks success=False, doesn't suppress exceptions

## Cross-Cutting Concerns

**Logging:** Python logging module with structured format (timestamp | level | module | message), INFO default level

**Validation:** Pydantic models for all data structures (bot/storage/models.py), aiogram FSM for command flow validation

**Authentication:**
- Bot: Username-based middleware (AuthorizationMiddleware) checking allowed_usernames from env
- TMA: Telegram initData HMAC validation in verify-telegram Edge Function, anon RLS policies with client-side telegram_id filtering

**Authorization:**
- Bot: admin_usernames list for admin panel access
- TMA: Client-side filtering by telegram_id (all data scoped to authenticated user)

**Observability:**
- Bot: TraceContext + traced_span decorators → pipeline_traces and pipeline_spans tables
- TMA: Not instrumented (frontend only)

**Configuration:**
- Bot: pydantic-settings loading from .env
- TMA: Vite env vars (VITE_INSFORGE_URL, VITE_INSFORGE_ANON_KEY) baked into bundle

**Knowledge Management:**
- Bot: KnowledgeService loads playbook.md + company_knowledge.md into memory, stuffs full text (~70K tokens) into every LLM prompt
- TMA: Not applicable

---

*Architecture analysis: 2026-02-04*
