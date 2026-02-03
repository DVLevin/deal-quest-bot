# Architecture

**Analysis Date:** 2026-02-02

## Pattern Overview

**Overall:** Multi-language Monorepo with Service-Oriented Architecture

**Key Characteristics:**
- Python backend (Telegram bot) with async agent pipeline system
- TypeScript frontend (React TMA) with client-side routing
- Shared InsForge PostgreSQL backend (PostgREST API)
- YAML-configured agent pipelines with sequential/parallel/background execution
- Repository pattern for data access across all components

## Layers

**Telegram Bot Layer (Python):**
- Purpose: Handle Telegram interactions and orchestrate AI-powered workflows
- Location: `deal-quest-bot/bot/`
- Contains: Command handlers, FSM states, middleware, agent pipelines
- Depends on: InsForge database, LLM providers (OpenRouter/Claude), AssemblyAI
- Used by: Telegram users via bot commands

**Web Application Layer (TypeScript):**
- Purpose: Telegram Mini App companion interface
- Location: `deal-quest-bot/packages/webapp/`
- Contains: React pages, UI components, client-side routing, state management
- Depends on: InsForge SDK, Telegram SDK, shared types package
- Used by: Telegram users via Mini App button

**Agent Pipeline Layer (Python):**
- Purpose: Execute AI workflows with configurable step ordering
- Location: `deal-quest-bot/bot/pipeline/`, `deal-quest-bot/bot/agents/`
- Contains: Pipeline runner, agent implementations, YAML config loader
- Depends on: LLM router service, knowledge service, tracing system
- Used by: Command handlers (support, learn, train)

**Data Access Layer (Python/TypeScript):**
- Purpose: Abstract database operations via repository pattern
- Location: `deal-quest-bot/bot/storage/`, `deal-quest-bot/packages/webapp/src/lib/insforge.ts`
- Contains: InsForge client wrappers, repository classes, data models
- Depends on: InsForge PostgREST API
- Used by: All business logic layers

**Business Services Layer (Python):**
- Purpose: Encapsulate domain logic and external integrations
- Location: `deal-quest-bot/bot/services/`
- Contains: LLM router, knowledge loader, crypto, transcription, scoring, analytics
- Depends on: External APIs (OpenRouter, Claude, AssemblyAI), repositories
- Used by: Handlers and agents

**InsForge Backend Layer:**
- Purpose: Self-hosted Supabase-like backend providing database, auth, storage, functions
- Location: `insforge/insforge/`
- Contains: Node.js backend, React admin frontend, PostgREST proxy, edge functions
- Depends on: PostgreSQL, OAuth providers
- Used by: Bot and webapp via HTTP API

**Edge Functions Layer:**
- Purpose: Serverless functions for specialized operations
- Location: `deal-quest-bot/functions/`
- Contains: Database proxy (`db-proxy.js`), Telegram auth verification (`verify-telegram/`)
- Depends on: InsForge runtime
- Used by: Webapp for auth validation and proxied queries

## Data Flow

**Support Flow (Deal Analysis):**

1. User sends `/support` command or message to bot
2. Handler validates user, captures input (text/voice/image)
3. If voice: TranscriptionService → AssemblyAI → text
4. If image: Upload to InsForge storage bucket
5. PipelineRunner loads `support.yaml` config
6. TraceContext wraps pipeline execution for observability
7. StrategistAgent: LLMRouter → OpenRouter/Claude with playbook context → analysis JSON
8. MemoryAgent (background): Updates user memory in database
9. Handler formats response with inline keyboard actions
10. ProgressUpdater provides real-time Telegram message updates during pipeline

**Learn Flow (Structured Training):**

1. User selects track and lesson from inline keyboard
2. Handler loads scenario from `data/scenarios.json`
3. PipelineRunner executes `learn.yaml` (TrainerAgent)
4. TrainerAgent sends scenario to LLM with user response
5. LLM returns scoring JSON (rubric-based evaluation)
6. ScoringService calculates XP and streak bonuses
7. AttemptRepo and TrackProgressRepo persist results
8. Handler displays score, feedback, next lesson

**Train Flow (Random Practice):**

1. User triggers `/train` command
2. ScenarioGeneratorService checks generated scenario pool
3. If pool low: Background task generates new scenarios via LLM
4. Handler fetches unseen scenario from GeneratedScenarioRepo
5. PipelineRunner executes `train.yaml` (TrainerAgent)
6. Scoring and persistence identical to Learn flow

**Webapp Flow (TMA):**

1. Telegram opens Mini App with initData
2. AuthProvider validates initData via `verify-telegram` edge function
3. QueryProvider sets up TanStack Query with InsForge SDK client
4. AppRouter lazy-loads page components
5. Pages fetch data via useQuery hooks → InsForge PostgREST API
6. User interactions trigger mutations → InsForge API → PostgreSQL

**State Management:**
- Bot: aiogram FSMContext (in-memory per-user state)
- Webapp: Zustand stores for client state, TanStack Query for server state
- Database: PostgreSQL as source of truth for persistent data

## Key Abstractions

**BaseAgent:**
- Purpose: Abstract base for pipeline agents
- Examples: `deal-quest-bot/bot/agents/strategist.py`, `deal-quest-bot/bot/agents/trainer.py`, `deal-quest-bot/bot/agents/memory.py`
- Pattern: ABC with typed I/O (AgentInput → AgentOutput), `@traced_span` decorator for observability

**PipelineRunner:**
- Purpose: Execute YAML-defined agent workflows
- Examples: `deal-quest-bot/bot/pipeline/runner.py`
- Pattern: Interprets StepConfig, handles sequential/parallel/background modes, manages PipelineContext

**InsForgeClient:**
- Purpose: Async HTTP wrapper for PostgREST API
- Examples: `deal-quest-bot/bot/storage/insforge_client.py`
- Pattern: CRUD methods (query/create/update/upsert/delete), PostgREST operator handling, file upload

**Repository Classes:**
- Purpose: Table-specific data access with type safety
- Examples: `UserRepo`, `AttemptRepo`, `TraceRepo` (11 total in `deal-quest-bot/bot/storage/repositories.py`)
- Pattern: One repo per table, Pydantic models for row types, wraps InsForgeClient methods

**LLMProvider:**
- Purpose: Abstract LLM API calls (Claude/OpenRouter)
- Examples: `ClaudeProvider`, `OpenRouterProvider` in `deal-quest-bot/bot/services/llm_router.py`
- Pattern: ABC with `complete()` and `validate_key()`, automatic JSON extraction, retry logic, `@traced_span` instrumentation

**TraceContext:**
- Purpose: Pipeline observability with hierarchical span tracking
- Examples: `deal-quest-bot/bot/tracing/context.py`
- Pattern: Async context manager, ContextVar propagation, `@traced_span` decorator for agent/LLM methods

## Entry Points

**Bot Entry Point:**
- Location: `deal-quest-bot/bot/main.py`
- Triggers: `python3 -m bot.main` or Railway/deployment
- Responsibilities: DI wiring (repositories, services, agents), middleware registration, handler routers, polling loop, background tasks (followup scheduler, scenario generator)

**Webapp Entry Point:**
- Location: `deal-quest-bot/packages/webapp/src/main.tsx`
- Triggers: Vite dev server (local) or production build served by Railway (`serve dist -s`)
- Deployment: Railway auto-deploys from remote branch; `packages/webapp/railway.toml` sets root_dir
- Responsibilities: Telegram SDK initialization, eruda debug console (dev only), React root rendering

**InsForge Entry Point:**
- Location: `insforge/insforge/backend/src/` (Node.js server)
- Triggers: Docker Compose or manual start
- Responsibilities: PostgREST proxy, auth middleware, storage API, edge function runtime, admin frontend serving

**Edge Function Entry Points:**
- Location: `deal-quest-bot/functions/db-proxy.js`, `deal-quest-bot/functions/verify-telegram/`
- Triggers: HTTP requests from webapp
- Responsibilities: Telegram initData verification (HMAC validation), proxied database queries

## Error Handling

**Strategy:** Graceful degradation with logging

**Patterns:**
- Bot handlers: Try-catch with user-friendly error messages, state cleanup
- Agents: Return `AgentOutput(success=False, error=str)` on failure
- Pipeline runner: Catches agent exceptions, stores error in context, continues if possible
- LLM providers: Exponential backoff retry (3 attempts), JSON extraction fallback
- Repositories: HTTP exceptions logged and re-raised, caller handles
- Webapp: React error boundaries (future), TanStack Query error states

## Cross-Cutting Concerns

**Logging:** Python `logging` module (configured in `deal-quest-bot/bot/main.py`), console output for frontend

**Validation:** Pydantic models for all data structures (Settings, AgentInput/Output, table rows), Telegram user authorization middleware

**Authentication:**
- Bot: Username-based allowlist (`deal-quest-bot/bot/middleware.py`)
- Webapp: Telegram initData HMAC verification via edge function
- InsForge: OAuth (GitHub/Google) for admin panel

**Tracing:** `TraceContext` async context manager wraps pipeline execution, `@traced_span` decorator on agent/LLM methods, batched flush to `pipeline_traces`/`pipeline_spans` tables

**Configuration:** Pydantic Settings from `.env` files, YAML for pipeline definitions, JSON for static data (scenarios, knowledge)

**Encryption:** Fernet symmetric encryption for user API keys stored in database

---

*Architecture analysis: 2026-02-02*
