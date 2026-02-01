# Architecture

**Analysis Date:** 2026-02-02

## Pattern Overview

**Overall:** Event-driven agent pipeline architecture with layered Telegram bot + web app backend.

**Key Characteristics:**
- **Event-driven FSM**: Telegram handlers use aiogram 3 finite state machines (FSM) to manage user conversation flows
- **Agent-based processing**: YAML-configured pipelines orchestrate AI agents (Trainer, Strategist, Memory) with sequential/parallel/background execution modes
- **Repository pattern**: Async repositories abstract InsForge (PostgreSQL API) database access
- **Monorepo structure**: Separate Python bot backend and TypeScript web app frontend with shared type definitions
- **Service-oriented**: Modular services handle domain logic (scoring, transcription, crypto, analytics, knowledge management)

## Layers

**Handler Layer:**
- Purpose: Parse Telegram events and coordinate with FSM state transitions
- Location: `bot/handlers/`
- Contains: Command handlers (/start, /train, /learn, /support, /admin, /stats, /leads, etc.), message/callback handlers, state-based routing
- Depends on: Services, repositories, pipeline runner, FSM states
- Used by: Dispatcher receives events from Telegram API, routes to handlers

**Service Layer:**
- Purpose: Implement domain business logic and infrastructure concerns
- Location: `bot/services/`
- Contains: LLM routing, transcription, encryption, scoring, knowledge management, analytics, engagement, scenario generation, progress tracking
- Depends on: External APIs (Anthropic, OpenRouter, AssemblyAI), repositories, utilities
- Used by: Handlers, pipeline agents, other services

**Agent Pipeline Layer:**
- Purpose: Execute YAML-defined multi-agent workflows with typed I/O
- Location: `bot/pipeline/`, `bot/agents/`
- Contains: Pipeline runner (orchestrator), pipeline context (shared state), YAML config loader, and concrete agents (Trainer, Strategist, Memory)
- Depends on: Base agent ABC, services, repositories
- Used by: Handlers via `_run_train_answer()`, `_run_support_answer()`, etc.

**Repository Layer:**
- Purpose: Abstract database operations and provide type-safe data access
- Location: `bot/storage/repositories.py`
- Contains: Repository classes (UserRepo, AttemptRepo, CasebookRepo, LeadRegistryRepo, etc.) that wrap InsForge client
- Depends on: InsForge HTTP client, Pydantic models
- Used by: Services, handlers, agents

**Data Access Layer:**
- Purpose: Handle raw HTTP communication with InsForge (PostgREST API)
- Location: `bot/storage/insforge_client.py`
- Contains: Async HTTP client wrapper, PostgREST filter building, query parameter marshaling
- Depends on: httpx (async HTTP), external InsForge service
- Used by: All repositories

**Frontend (Web App):**
- Purpose: Telegram Mini App interface for training, leads management, casebook, analytics
- Location: `packages/webapp/src/`
- Contains: Pages (Dashboard, Train, Learn, Support, Leads, Casebook, Profile, Admin), providers (Auth, Query), shared UI components
- Depends on: React, React Router, TanStack Query, Zustand, Telegram SDK, InsForge SDK
- Used by: End users via Telegram Mini App

**Shared Types:**
- Purpose: Centralize TypeScript database schema and constant definitions
- Location: `packages/shared/src/`
- Contains: Database table interfaces (UserRow, AttemptRow, etc.), enums, constants
- Depends on: None (type-only)
- Used by: Web app, Python models reference these conceptually

## Data Flow

**Training Scenario Execution:**

1. User invokes `/train` command → `cmd_train` handler
2. Handler loads combined scenario pool (static JSON + generated from DB)
3. User selects difficulty → `on_difficulty_chosen` → presents scenario, sets `TrainState.answering_scenario`
4. User sends response (text or voice) → FSM routes to `on_train_answer()` or `on_train_voice()`
5. Voice handler transcribes via AssemblyAI → `_run_train_answer()` with transcribed text
6. `_run_train_answer()` creates PipelineContext with:
   - LLM provider (decrypted user API key)
   - Knowledge base (loaded company/playbook knowledge)
   - User memory (from DB)
   - Scenario data
   - User response
7. PipelineRunner executes train.yaml:
   - **Sequential**: TrainerAgent scores response against scenario rubric
   - **Background**: MemoryAgent updates user memory with learnings
8. Handler calculates XP, saves attempt to DB, updates user level, marks scenario as seen
9. Handler formats feedback and presents inline buttons (Next, Retry, View Stats)

**Lead Engagement Flow:**

1. User provides prospect info via `/leads` → LeadEngagementState
2. Handler collects context, optional screenshot
3. Handler invokes StrategistAgent via pipeline to analyze prospect and generate engagement strategy
4. Handler saves lead to lead_registry, schedules follow-up tasks
5. FollowupScheduler background task sends periodic engagement prompts
6. Handler displays lead card with analysis, closing strategy, engagement tactics

**Support/Question Answering:**

1. User sends message in `/support` context → SupportState.waiting_input
2. Handler loads user's casebook entries as context
3. PipelineRunner executes support.yaml with EngagementAgent
4. Agent synthesizes response using company knowledge + casebook + user memory
5. Response saved to support_sessions table
6. Handler presents formatted answer with citations/references

**State Management:**

- **FSM States**: aiogram FSM manages conversation flows (OnboardingState, TrainState, SupportState, LeadEngagementState, etc.)
- **User Memory**: JSONB field in users_memory table persists learned facts, progress, preferences across sessions
- **Database State**: Repositories handle transactional state updates (XP, levels, scenarios seen, lead tracking)
- **Pipeline Context**: Ephemeral in-memory state shared during single pipeline execution; discarded after handler response

## Key Abstractions

**BaseAgent:**
- Purpose: Define agent contract with typed input/output
- Examples: `bot/agents/trainer.py`, `bot/agents/strategist.py`, `bot/agents/memory.py`
- Pattern: Subclass with `async def run(input: AgentInput, ctx: PipelineContext) -> AgentOutput`

**Repository:**
- Purpose: Provide table-specific async CRUD operations
- Examples: UserRepo, AttemptRepo, CasebookRepo (all in `bot/storage/repositories.py`)
- Pattern: Each repository wraps InsForgeClient, maps rows to Pydantic models, encodes filtering/ordering logic

**LLMProvider (ABC):**
- Purpose: Abstract different LLM backends (Anthropic, OpenRouter)
- Location: `bot/services/llm_router.py`
- Pattern: Implementations handle authentication, prompt formatting, response parsing for specific models

**Service:**
- Purpose: Encapsulate domain-specific logic or infrastructure concerns
- Examples: KnowledgeService (loads/caches markdown files), CryptoService (Fernet encryption), EngagementService (calls shared OpenRouter), CasebookService
- Pattern: Injected via workflow_data into handlers and used by agents

## Entry Points

**Telegram Bot:**
- Location: `bot/main.py`
- Triggers: User interaction (messages, callbacks, commands) in Telegram
- Responsibilities:
  - Load settings and initialize DI containers
  - Wire up InsForge repositories and services
  - Register agent registry and load pipeline YAMLs
  - Register handlers and middleware
  - Start long polling loop

**Web App:**
- Location: `packages/webapp/src/main.tsx`
- Triggers: Telegram Mini App launch
- Responsibilities:
  - Initialize Telegram SDK
  - Set up React Router and providers
  - Render main App component with auth/query context

**Background Scheduler:**
- Location: `bot/services/followup_scheduler.py` and `bot/main.py` task spawning
- Triggers: Timer-based events (every 6 hours for scenario generation, per-lead schedule for follow-ups)
- Responsibilities: Ensure generated scenario pool, send periodic follow-up messages

## Error Handling

**Strategy:** Fail-safe with user feedback and logging.

**Patterns:**

- **Handler errors**: Catch exceptions, edit status message with error text, clear FSM state, log with `logger.error()`
- **Database errors**: Try-catch in critical paths, skip DB save but still deliver feedback (e.g., train.py lines 322–340), retry logic not implemented (stateless)
- **LLM failures**: Agent returns AgentOutput(success=False, error=str), handler checks `.success` before using data, falls back to generic error message
- **Pipeline failures**: PipelineRunner catches agent exceptions, logs, stores error in AgentOutput, runner continues or halts based on agent criticality
- **Auth failures**: Middleware silently blocks unauthorized users with alert; handlers check user existence and return early

## Cross-Cutting Concerns

**Logging:**
- Framework: Python `logging` module configured in `setup_logging()` with ISO timestamp + level + logger name + message
- Pattern: All modules use `logger = logging.getLogger(__name__)`, log at INFO/WARNING/ERROR levels
- Key points: Startup messages, handler entry/exit, pipeline step execution, DB errors, API failures

**Validation:**
- Pydantic models in `bot/storage/models.py` enforce schema on DB rows
- Handlers validate user state (check for user.encrypted_api_key, check FSM state)
- YAML pipeline configs validated by `PipelineConfig` dataclass on load

**Authentication:**
- Telegram username whitelist enforced by AuthorizationMiddleware
- API keys encrypted with Fernet (CryptoService) and decrypted on-demand
- User stored in DB after /start, retrieved by telegram_id
- No session-based auth; identity tied to Telegram user_id

**Rate Limiting:** Not implemented. Bot is open to authorized users without request throttling.

**Observability:**
- Error tracking: Exceptions logged with traceback
- Metrics: Attempt scores saved to attempts table, user XP/level tracked
- Analytics: TeamAnalyticsService queries attempts to compute team stats

---

*Architecture analysis: 2026-02-02*
