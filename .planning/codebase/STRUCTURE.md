# Codebase Structure

**Analysis Date:** 2026-02-06

## Directory Layout

```
GD_playground/
├── bot/                              # Python Telegram bot (aiogram 3)
│   ├── agents/                       # AI agent implementations
│   │   ├── base.py                   # BaseAgent ABC + AgentInput/AgentOutput
│   │   ├── strategist.py             # StrategistAgent (deal analysis)
│   │   ├── trainer.py                # TrainerAgent (scenario scoring)
│   │   ├── memory.py                 # MemoryAgent (background updates)
│   │   ├── extraction.py             # ExtractionAgent (focused OCR extraction)
│   │   ├── reanalysis_strategist.py  # ReanalysisStrategistAgent (strategy re-analysis)
│   │   └── registry.py               # AgentRegistry (name → instance lookup)
│   ├── handlers/                     # Command handlers (support, learn, leads, etc.)
│   │   ├── start.py                  # /start onboarding + API key setup
│   │   ├── support.py                # /support deal analysis flow
│   │   ├── learn.py                  # /learn structured training
│   │   ├── train.py                  # /train random scenario practice
│   │   ├── leads.py                  # /leads lead management
│   │   ├── stats.py                  # /stats progress display
│   │   ├── settings.py               # /settings provider management
│   │   ├── admin.py                  # /admin team analytics (restricted)
│   │   ├── progress.py               # Progress utilities
│   │   ├── context_input.py          # Multimodal context collection for re-analysis
│   │   ├── comment.py                # Standalone comment flow
│   │   └── reminders.py              # Reminder callback handlers (Done/Snooze/Skip/Draft)
│   ├── pipeline/                     # YAML-driven pipeline orchestration
│   │   ├── runner.py                 # PipelineRunner (sequential/parallel/background)
│   │   ├── context.py                # PipelineContext (shared state)
│   │   └── config_loader.py          # YAML config loader
│   ├── services/                     # Business logic services
│   │   ├── llm_router.py             # LLMProvider ABC (Claude/OpenRouter)
│   │   ├── knowledge.py              # Playbook + company KB loader
│   │   ├── casebook.py               # Reusable response retrieval
│   │   ├── crypto.py                 # Fernet encryption for API keys
│   │   ├── transcription.py          # AssemblyAI voice transcription
│   │   ├── progress.py               # ProgressUpdater (real-time status)
│   │   ├── analytics.py              # Team analytics service
│   │   ├── engagement.py             # Engagement tracking
│   │   ├── followup_scheduler.py     # Follow-up scheduling
│   │   ├── scenario_generator.py     # Dynamic scenario generation
│   │   ├── scoring.py                # XP calculation
│   │   ├── plan_scheduler.py         # Plan step reminder scheduler with timing parser
│   │   ├── diff_utils.py             # JSON diff computation
│   │   └── image_utils.py            # Image pre-resize utility
│   ├── storage/                      # InsForge client + repositories
│   │   ├── insforge_client.py        # Async HTTP client for PostgREST
│   │   ├── repositories.py           # 12 repo classes (User, Lead, Reminder, etc.)
│   │   └── models.py                 # Pydantic data models
│   ├── tracing/                      # Observability (Phase 1)
│   │   ├── __init__.py               # Exports (TraceContext, traced_span, collectors)
│   │   ├── context.py                # TraceContext + traced_span decorator
│   │   ├── collector.py              # TraceCollector (batched background flush)
│   │   └── models.py                 # TraceModel, SpanModel
│   ├── main.py                       # Entry point, DI wiring, polling
│   ├── config.py                     # Pydantic settings from .env
│   ├── middleware.py                 # Username authorization
│   ├── states.py                     # FSM state definitions
│   ├── utils.py                      # Telegram formatting helpers
│   ├── utils_tma.py                  # TMA menu button setup
│   ├── utils_validation.py           # Shared input validation
│   └── task_utils.py                 # Background task protection
├── packages/
│   ├── webapp/                       # React TMA (Vite + React Router 7)
│   │   ├── src/
│   │   │   ├── app/                  # App shell, Router, providers
│   │   │   │   ├── App.tsx           # Root component with provider hierarchy
│   │   │   │   ├── Router.tsx        # Lazy-loaded routes + BackButton
│   │   │   │   └── providers/        # AuthProvider, QueryProvider
│   │   │   ├── features/             # Feature modules (one per domain)
│   │   │   │   ├── auth/             # Telegram auth (useAuth, store)
│   │   │   │   ├── casebook/         # Casebook browser
│   │   │   │   ├── dashboard/        # Dashboard widgets (Progress, Badges, Leaderboard, WeakAreas)
│   │   │   │   ├── leads/            # Lead management (hooks, components)
│   │   │   │   ├── learn/            # Structured learning (tracks, lessons)
│   │   │   │   ├── profile/          # User profile (stats, badges, history)
│   │   │   │   ├── scoring/          # Scoring display components
│   │   │   │   ├── settings/         # Settings panel
│   │   │   │   ├── support/          # Support session display
│   │   │   │   ├── train/            # Training scenarios (difficulty, variety)
│   │   │   │   ├── gamification/     # XP, level-up, badges, confetti
│   │   │   │   └── admin/            # Admin panel (team stats, leaderboard)
│   │   │   ├── lib/                  # Shared utilities
│   │   │   │   ├── insforge.ts       # InsForge client setup (anon + auth)
│   │   │   │   ├── telegram.ts       # Telegram SDK initialization
│   │   │   │   └── queries.ts        # TanStack Query key factory
│   │   │   ├── pages/                # Top-level route pages
│   │   │   │   ├── Dashboard.tsx     # Main landing page
│   │   │   │   ├── Support.tsx       # Support session history
│   │   │   │   ├── Learn.tsx         # Learning tracks
│   │   │   │   ├── Train.tsx         # Training scenarios
│   │   │   │   ├── Casebook.tsx      # Casebook browser
│   │   │   │   ├── Leads.tsx         # Lead registry
│   │   │   │   ├── Profile.tsx       # User profile
│   │   │   │   └── Admin.tsx         # Admin panel
│   │   │   ├── shared/               # Shared UI components, hooks, layouts
│   │   │   │   ├── ui/               # UI components (Button, Card, Badge, ErrorBoundary, Toast, etc.)
│   │   │   │   ├── hooks/            # useBackButton, useMainButton, useDeepLink, etc.
│   │   │   │   ├── layouts/          # AppLayout (NavBar wrapper)
│   │   │   │   ├── stores/           # Zustand stores (toastStore)
│   │   │   │   └── data/             # Static data (badges)
│   │   │   ├── types/                # TypeScript types (inlined from ../shared)
│   │   │   │   ├── index.ts          # Database model interfaces
│   │   │   │   ├── tables.ts         # Table row types
│   │   │   │   ├── enums.ts          # Enum types
│   │   │   │   └── constants.ts      # Constants
│   │   │   └── main.tsx              # React root entry point
│   │   ├── package.json
│   │   └── railway.toml              # Railway deployment config
│   └── shared/                       # Shared TypeScript types (source of truth)
│       └── types/                    # Database model interfaces
├── functions/                        # InsForge serverless functions (Deno)
│   ├── verify-telegram/              # Telegram auth + JWT minting
│   │   ├── index.ts
│   │   └── deploy.js
│   └── db-proxy.js                   # Database proxy
├── data/                             # Knowledge base + pipeline configs
│   ├── playbook.md                   # Sales playbook (gitignored)
│   ├── company_knowledge.md          # Company info (gitignored)
│   ├── scenarios.json                # Training scenarios (gitignored)
│   └── pipelines/                    # YAML agent pipeline definitions
│       ├── support.yaml              # Deal analysis pipeline (strategist + memory)
│       ├── support_photo.yaml        # Photo-based deal analysis
│       ├── reanalysis.yaml           # Re-analysis pipeline with diff computation
│       ├── learn.yaml                # Structured learning pipeline
│       └── train.yaml                # Training scenario pipeline
├── prompts/                          # Agent system prompts
├── migrations/                       # Original database migrations
│   ├── 001_enable_rls_and_policies.sql
│   └── 002_lead_person_company_fields.sql
├── insforge/migrations/              # Observability migrations
│   ├── 001_pipeline_traces.sql       # Pipeline traces table
│   ├── 002_scheduled_reminders.sql   # Reminder scheduling table
│   ├── 003_web_research_versions.sql # Web research versioning
│   └── 004_lead_analysis_history.sql # Lead analysis history
├── docs/                             # Original design documentation
├── .planning/                        # GSD project tracking
│   ├── PROJECT.md                    # Project definition
│   ├── ROADMAP.md                    # Phase breakdown
│   ├── STATE.md                      # Current position
│   ├── REQUIREMENTS.md               # Requirement traceability
│   ├── codebase/                     # Codebase analysis docs
│   │   ├── ARCHITECTURE.md
│   │   ├── STRUCTURE.md
│   │   ├── STACK.md
│   │   ├── INTEGRATIONS.md
│   │   ├── CONVENTIONS.md
│   │   ├── TESTING.md
│   │   └── CONCERNS.md
│   ├── phases/                       # Phase planning docs
│   ├── quick/                        # Quick task tracking
│   └── research/                     # Research notes
├── .env.example                      # Environment template
├── requirements.txt                  # Python dependencies
├── package.json                      # pnpm workspace root
├── pnpm-workspace.yaml               # Workspace definition
├── railway.toml                      # Bot deployment config
└── CLAUDE.md                         # Project instructions for Claude
```

## Directory Purposes

**`bot/`:**
- Purpose: Python Telegram bot application (aiogram 3)
- Contains: Entry point, handlers, agents, services, storage layer
- Key files: `main.py` (DI + polling), `config.py` (env loading), `middleware.py` (auth)

**`bot/agents/`:**
- Purpose: AI agent implementations for pipeline execution
- Contains: `base.py` (ABC), `strategist.py`, `trainer.py`, `memory.py`, `extraction.py`, `reanalysis_strategist.py`, `registry.py`
- Key files: `base.py` (AgentInput/AgentOutput/BaseAgent), `registry.py` (name → instance lookup)

**`bot/handlers/`:**
- Purpose: Telegram command handlers
- Contains: `start.py`, `support.py`, `learn.py`, `train.py`, `stats.py`, `settings.py`, `leads.py`, `admin.py`, `progress.py`, `context_input.py`, `comment.py`, `reminders.py`
- Key files: `support.py` (deal analysis with strategist), `leads.py` (lead management), `context_input.py` (multimodal re-analysis), `reminders.py` (reminder callbacks)

**`bot/pipeline/`:**
- Purpose: Agent pipeline orchestration system
- Contains: `runner.py`, `context.py`, `config_loader.py`
- Key files: `runner.py` (sequential/parallel/background execution), `context.py` (shared state)

**`bot/services/`:**
- Purpose: Reusable business logic services
- Contains: `llm_router.py`, `knowledge.py`, `casebook.py`, `crypto.py`, `transcription.py`, `progress.py`, `analytics.py`, `engagement.py`, `followup_scheduler.py`, `scenario_generator.py`, `scoring.py`, `plan_scheduler.py`, `diff_utils.py`, `image_utils.py`
- Key files: `llm_router.py` (LLMProvider ABC + Claude/OpenRouter), `progress.py` (ProgressUpdater), `plan_scheduler.py` (reminder scheduling)

**`bot/storage/`:**
- Purpose: Database persistence layer
- Contains: `insforge_client.py` (async HTTP), `repositories.py` (12 repo classes), `models.py` (Pydantic)
- Key files: `insforge_client.py` (query/create/update/upsert/delete), `repositories.py` (UserRepo, LeadRegistryRepo, ScheduledReminderRepo, LeadAnalysisHistoryRepo, etc.)

**`bot/tracing/`:**
- Purpose: Pipeline observability system
- Contains: `context.py` (TraceContext, traced_span), `collector.py` (background flush), `models.py` (Pydantic)
- Key files: `context.py` (async context manager + decorator), `collector.py` (batched writes)

**`packages/webapp/src/app/`:**
- Purpose: React app shell and routing
- Contains: `App.tsx`, `Router.tsx`, `providers/` (Auth, Query)
- Key files: `App.tsx` (provider hierarchy), `Router.tsx` (lazy-loaded routes + BackButton)

**`packages/webapp/src/features/`:**
- Purpose: Feature modules (one per domain)
- Contains: `auth/`, `casebook/`, `dashboard/`, `leads/`, `learn/`, `profile/`, `scoring/`, `settings/`, `support/`, `train/`, `gamification/`, `admin/`
- Key files: Each feature has `hooks/`, `components/`, sometimes `pages/`

**`packages/webapp/src/features/dashboard/`:**
- Purpose: Dashboard widgets
- Contains: `components/` (ProgressCard, BadgePreview, LeaderboardWidget, WeakAreasCard), `hooks/`
- Key files: `components/WeakAreasCard.tsx` (displays weak skill areas)

**`packages/webapp/src/features/leads/`:**
- Purpose: Lead management feature
- Contains: `components/` (LeadCard, LeadDetail, LeadList, ActivityTimeline), `hooks/` (useLeads, useLead, useUpdatePlanStep, etc.), `types.ts`
- Key files: `hooks/useUpdatePlanStep.ts` (mutation for plan step updates)

**`packages/webapp/src/features/train/`:**
- Purpose: Training scenario feature
- Contains: `components/` (ScenarioCard, ScoreResults, DifficultyFilter, DifficultyRecommendation, ScenarioVariety), `hooks/`, `data/`
- Key files: `components/DifficultyRecommendation.tsx`, `components/ScenarioVariety.tsx`

**`packages/webapp/src/lib/`:**
- Purpose: Shared utilities and client setup
- Contains: `insforge.ts`, `telegram.ts`, `queries.ts`
- Key files: `insforge.ts` (anon + auth client creation), `queries.ts` (query key factory)

**`packages/webapp/src/pages/`:**
- Purpose: Top-level route components
- Contains: `Dashboard.tsx`, `Support.tsx`, `Learn.tsx`, `Train.tsx`, `Casebook.tsx`, `Leads.tsx`, `Profile.tsx`, `Admin.tsx`
- Key files: All lazy-loaded by Router.tsx

**`packages/webapp/src/shared/`:**
- Purpose: Shared UI components, hooks, layouts
- Contains: `ui/`, `hooks/`, `layouts/`, `stores/`, `data/`
- Key files: `layouts/AppLayout.tsx`, `hooks/useBackButton.ts`, `ui/ErrorBoundary.tsx`, `ui/ErrorCard.tsx`, `ui/EmptyState.tsx`, `ui/Toast.tsx`

**`packages/webapp/src/types/`:**
- Purpose: TypeScript type definitions (inlined from ../shared)
- Contains: Database model interfaces
- Key files: `index.ts`, `tables.ts`, `enums.ts`, `constants.ts` (copied from `packages/shared/types/` due to Railway root_dir isolation)

**`packages/shared/`:**
- Purpose: Shared TypeScript types (source of truth)
- Contains: `types/` (database models)
- Key files: Source for webapp inlined types

**`functions/`:**
- Purpose: InsForge serverless functions (Deno runtime)
- Contains: `verify-telegram/` (auth), `db-proxy.js` (database operations)
- Key files: `verify-telegram/index.ts` (HMAC validation + JWT), `db-proxy.js` (PostgREST proxy)

**`data/`:**
- Purpose: Knowledge base content and pipeline configs
- Contains: `playbook.md`, `company_knowledge.md`, `scenarios.json`, `pipelines/`
- Key files: `pipelines/*.yaml` (agent orchestration definitions including `reanalysis.yaml`, `support_photo.yaml`)

**`prompts/`:**
- Purpose: Agent system prompts
- Contains: Markdown files with LLM system prompts
- Key files: One per agent type

**`migrations/`:**
- Purpose: Original database schema migrations
- Contains: SQL files for core tables
- Key files: Initial schema setup

**`insforge/migrations/`:**
- Purpose: Observability and feature schema migrations
- Contains: `001_pipeline_traces.sql`, `002_scheduled_reminders.sql`, `003_web_research_versions.sql`, `004_lead_analysis_history.sql`
- Key files: Tracing table definitions, reminder scheduling, analysis history

**`.planning/`:**
- Purpose: GSD project tracking
- Contains: `PROJECT.md`, `ROADMAP.md`, `STATE.md`, `REQUIREMENTS.md`, `codebase/`, `phases/`, `quick/`, `research/`
- Key files: `PROJECT.md` (project definition), `ROADMAP.md` (phase breakdown), `codebase/` (architecture docs)

## Key File Locations

**Entry Points:**
- `bot/main.py`: Bot application entry (DI, polling, background schedulers)
- `packages/webapp/src/main.tsx`: TMA entry (React render)
- `functions/verify-telegram/index.ts`: Auth Edge Function
- `functions/db-proxy.js`: Database proxy Edge Function

**Configuration:**
- `.env.example`: Environment variable template
- `bot/config.py`: Pydantic settings loader
- `packages/webapp/src/lib/insforge.ts`: InsForge client config
- `railway.toml`: Bot deployment config
- `packages/webapp/railway.toml`: TMA deployment config
- `data/pipelines/*.yaml`: Agent pipeline definitions

**Core Logic:**
- `bot/pipeline/runner.py`: Agent pipeline orchestration
- `bot/agents/*.py`: Agent implementations
- `bot/services/llm_router.py`: LLM provider abstraction
- `bot/storage/insforge_client.py`: Database client
- `bot/tracing/context.py`: Observability instrumentation
- `packages/webapp/src/app/Router.tsx`: TMA routing

**Testing:**
- Not detected

## Naming Conventions

**Files:**
- Python: `snake_case.py` (e.g., `llm_router.py`, `insforge_client.py`, `context_input.py`)
- TypeScript: `PascalCase.tsx` for components (e.g., `Dashboard.tsx`, `WeakAreasCard.tsx`), `camelCase.ts` for utilities (e.g., `insforge.ts`, `useUpdatePlanStep.ts`)
- YAML: `lowercase.yaml` (e.g., `support.yaml`, `reanalysis.yaml`)
- Markdown: `UPPERCASE.md` for project docs (e.g., `CLAUDE.md`), `lowercase.md` for data (e.g., `playbook.md`)

**Directories:**
- Python: `lowercase` (e.g., `agents/`, `services/`)
- TypeScript: `lowercase` (e.g., `features/`, `shared/`)

**Python Functions:**
- Public: `snake_case` (e.g., `load_settings()`, `run_pipeline()`)
- Private: `_snake_case` (e.g., `_run_step()`, `_safe_serialize()`)

**Python Classes:**
- `PascalCase` (e.g., `UserRepo`, `BaseAgent`, `TraceContext`, `ScheduledReminderRepo`)

**TypeScript:**
- Components: `PascalCase` (e.g., `AppRouter`, `Dashboard`, `WeakAreasCard`)
- Functions: `camelCase` (e.g., `createAuthenticatedClient`, `getInsforge`)
- Hooks: `use` prefix (e.g., `useBackButton`, `useAuth`, `useUpdatePlanStep`)

## Where to Add New Code

**New Bot Command:**
- Primary code: `bot/handlers/<command>.py` (router + handlers)
- Register: `bot/main.py` (dp.include_router)
- States: `bot/states.py` (if FSM needed)

**New Agent:**
- Implementation: `bot/agents/<agent_name>.py` (inherit BaseAgent)
- Register: `bot/main.py` (agent_registry.register)
- System prompt: `prompts/<agent_name>.md`

**New Pipeline:**
- Configuration: `data/pipelines/<pipeline_name>.yaml`
- Agents: Reference existing or create new in `bot/agents/`

**New Service:**
- Implementation: `bot/services/<service_name>.py`
- DI wiring: `bot/main.py` (workflow_data.update)

**New Repository:**
- Model: Add to `bot/storage/models.py` (Pydantic)
- Repo: Add class to `bot/storage/repositories.py`
- DI wiring: `bot/main.py` (instantiate + add to workflow_data)

**New TMA Page:**
- Component: `packages/webapp/src/pages/<PageName>.tsx`
- Route: Add to `packages/webapp/src/app/Router.tsx` (lazy import + <Route>)
- Feature: Create `packages/webapp/src/features/<feature>/` if complex

**New TMA Feature Module:**
- Directory: `packages/webapp/src/features/<feature>/`
- Structure: Create `hooks/`, `components/`, optionally `pages/`
- Hooks: `packages/webapp/src/features/<feature>/hooks/use<Feature>.ts`
- Components: `packages/webapp/src/features/<feature>/components/<Component>.tsx`

**New TMA Hook:**
- Feature-specific: `packages/webapp/src/features/<feature>/hooks/use<Hook>.ts`
- Shared: `packages/webapp/src/shared/hooks/use<Hook>.ts`

**New TMA UI Component:**
- Shared: `packages/webapp/src/shared/ui/<Component>.tsx`
- Feature-specific: `packages/webapp/src/features/<feature>/components/<Component>.tsx`
- Export: Add to `packages/webapp/src/shared/ui/index.ts` if shared

**New Edge Function:**
- Implementation: `functions/<function_name>/index.ts`
- Deploy: Via InsForge dashboard or MCP
- Secrets: Set in InsForge environment

**New Database Table:**
- Migration: `migrations/<timestamp>_<table_name>.sql` (or `insforge/migrations/` for observability/feature-specific)
- Model: `bot/storage/models.py` (Pydantic)
- Repository: `bot/storage/repositories.py` (class with InsForgeClient)
- TypeScript types: `packages/shared/types/` (then inline to webapp)

**Utilities:**
- Bot general: `bot/utils.py` (Telegram formatting)
- Bot TMA: `bot/utils_tma.py` (TMA menu button setup)
- Bot validation: `bot/utils_validation.py` (input validation)
- Bot tasks: `bot/task_utils.py` (background task protection)
- TMA: `packages/webapp/src/lib/cn.ts` or `packages/webapp/src/lib/<utility>.ts`

## Special Directories

**`node_modules/`:**
- Purpose: Node dependencies (webapp, workspace root)
- Generated: Yes (pnpm install)
- Committed: No (.gitignored)

**`.venv/`:**
- Purpose: Python virtual environment
- Generated: Yes (python3 -m venv)
- Committed: No (.gitignored)

**`packages/webapp/dist/`:**
- Purpose: Vite build output (static bundle)
- Generated: Yes (pnpm build)
- Committed: No (.gitignored)

**`data/`:**
- Purpose: Knowledge base content (gitignored due to sensitive business data)
- Generated: No (manually authored)
- Committed: No (only .example files committed)

**`.planning/`:**
- Purpose: GSD project tracking
- Generated: Yes (by /gsd:* commands)
- Committed: Yes

**`insforge/`:**
- Purpose: InsForge self-hosted instance artifacts (not part of bot/TMA)
- Generated: Yes (InsForge CLI)
- Committed: Yes (migrations only)

**`deal-quest-bot/`:**
- Purpose: Legacy directory or archived snapshot
- Generated: Unknown
- Committed: Partially (appears in tree but not actively used)

---

*Structure analysis: 2026-02-06*
