# Codebase Structure

**Analysis Date:** 2026-02-02

## Directory Layout

```
GD_playground/
├── deal-quest-bot/                # Main application monorepo
│   ├── bot/                       # Python Telegram bot
│   ├── packages/                  # TypeScript workspaces
│   │   ├── webapp/                # React TMA
│   │   └── shared/                # Shared types
│   ├── functions/                 # Edge functions
│   ├── data/                      # Knowledge base & configs
│   ├── migrations/                # Database migrations
│   └── docs/                      # Documentation
├── insforge/                      # Self-hosted backend
│   ├── insforge/                  # InsForge application
│   │   ├── backend/               # Node.js API
│   │   ├── frontend/              # React admin UI
│   │   └── functions/             # Backend functions
│   └── migrations/                # Backend migrations
└── .planning/                     # GSD project tracking
```

## Directory Purposes

**`deal-quest-bot/`:**
- Purpose: Root of Deal Quest application monorepo
- Contains: Bot, webapp, shared types, functions, data, migrations
- Workspace: pnpm monorepo (packages/webapp, packages/shared)
- Key files: `package.json`, `pnpm-workspace.yaml`, `requirements.txt`, `.env`

**`deal-quest-bot/bot/`:**
- Purpose: Python Telegram bot with AI agent system
- Contains: Handlers, agents, services, storage, pipeline, tracing
- Key files:
  - `main.py`: Entry point with DI wiring and polling loop
  - `config.py`: Pydantic settings loaded from .env
  - `middleware.py`: Username authorization
  - `states.py`: FSM state definitions
  - `utils.py`: Telegram formatting helpers

**`deal-quest-bot/bot/handlers/`:**
- Purpose: Telegram command handlers for bot features
- Contains: start.py, support.py, learn.py, train.py, stats.py, settings.py, leads.py, admin.py, progress.py
- Pattern: One router per feature area, uses aiogram Router, FSM for state management

**`deal-quest-bot/bot/agents/`:**
- Purpose: AI agents for pipeline execution
- Contains:
  - `base.py`: BaseAgent ABC with AgentInput/AgentOutput types
  - `strategist.py`: Deal analysis & strategy generation
  - `trainer.py`: Scenario evaluation & scoring
  - `memory.py`: User memory updates
  - `registry.py`: Agent name → instance lookup

**`deal-quest-bot/bot/services/`:**
- Purpose: Business logic and external integrations
- Contains:
  - `llm_router.py`: LLM provider abstraction (Claude/OpenRouter)
  - `knowledge.py`: Playbook & knowledge base loader
  - `casebook.py`: Reusable response retrieval
  - `scoring.py`: XP calculation
  - `crypto.py`: Fernet encryption for API keys
  - `transcription.py`: AssemblyAI voice transcription
  - `progress.py`: Real-time progress updates
  - `analytics.py`: Team analytics
  - `engagement.py`: Engagement tracking
  - `followup_scheduler.py`: Follow-up scheduling
  - `scenario_generator.py`: Dynamic scenario generation

**`deal-quest-bot/bot/pipeline/`:**
- Purpose: YAML-defined agent pipeline execution
- Contains:
  - `runner.py`: PipelineRunner (sequential/parallel/background)
  - `context.py`: PipelineContext (shared state)
  - `config_loader.py`: YAML pipeline config loader

**`deal-quest-bot/bot/storage/`:**
- Purpose: Data access layer with repository pattern
- Contains:
  - `insforge_client.py`: Async HTTP client for PostgREST API
  - `repositories.py`: 11 repository classes (UserRepo, AttemptRepo, etc.)
  - `models.py`: Pydantic data models for all tables

**`deal-quest-bot/bot/tracing/`:**
- Purpose: Pipeline observability system
- Contains:
  - `context.py`: TraceContext (async context manager), traced_span decorator
  - `collector.py`: TraceCollector (batched background flush)
  - `models.py`: TraceModel, SpanModel (Pydantic)

**`deal-quest-bot/packages/webapp/`:**
- Purpose: React Telegram Mini App frontend
- Contains: src/, public/, vite.config.ts, package.json
- Key files:
  - `index.html`: Entry HTML
  - `src/main.tsx`: React DOM mount point
  - `src/app/App.tsx`: Root with providers (Auth, Query)
  - `src/app/Router.tsx`: Route definitions with lazy loading

**`deal-quest-bot/packages/webapp/src/pages/`:**
- Purpose: TMA page components
- Contains: Dashboard.tsx, Learn.tsx, Train.tsx, Support.tsx, Casebook.tsx, Leads.tsx, Profile.tsx, Admin.tsx

**`deal-quest-bot/packages/webapp/src/app/`:**
- Purpose: Application shell and routing
- Contains:
  - `App.tsx`: Root component with provider nesting
  - `Router.tsx`: Route definitions with lazy loading and BackButton integration
  - `providers/`: AuthProvider, QueryProvider

**`deal-quest-bot/packages/webapp/src/lib/`:**
- Purpose: Shared utilities and clients
- Contains:
  - `insforge.ts`: InsForge SDK client wrapper
  - `telegram.ts`: Telegram SDK initialization

**`deal-quest-bot/packages/webapp/src/shared/`:**
- Purpose: Shared UI components and hooks
- Contains: layouts/, ui/, hooks/, utils/

**`deal-quest-bot/packages/shared/`:**
- Purpose: Shared TypeScript types for bot and webapp
- Contains:
  - `src/tables.ts`: Table row types (UserRow, AttemptRow, etc.)
  - `src/enums.ts`: Enum-like string literal types
  - `src/constants.ts`: Game constants (XP_PER_LEVEL, RANK_TITLES)
  - `src/index.ts`: Barrel export

**`deal-quest-bot/functions/`:**
- Purpose: InsForge edge functions
- Contains:
  - `db-proxy.js`: Database proxy function
  - `verify-telegram/`: Telegram auth verification (HMAC validation)

**`deal-quest-bot/data/`:**
- Purpose: Knowledge base and pipeline configurations
- Contains:
  - `playbook.md`: Sales playbook (gitignored)
  - `company_knowledge.md`: Company info (gitignored)
  - `scenarios.json`: Training scenarios (gitignored)
  - `pipelines/`: YAML agent pipeline definitions (support.yaml, learn.yaml, train.yaml)
  - `user_memory/`: User memory YAML files

**`deal-quest-bot/migrations/`:**
- Purpose: Database migrations for core tables
- Contains: `001_enable_rls_and_policies.sql`

**`insforge/`:**
- Purpose: Self-hosted Supabase-like backend
- Contains: insforge/ (application), migrations/ (observability tables)

**`insforge/insforge/backend/`:**
- Purpose: Node.js backend service
- Contains: src/ (TypeScript backend code), package.json, tsconfig.json

**`insforge/insforge/frontend/`:**
- Purpose: React admin frontend for InsForge management
- Contains: src/features/ (feature modules), src/components/ (shared UI), src/lib/ (utilities)

**`insforge/insforge/frontend/src/features/`:**
- Purpose: Feature-based organization for admin UI
- Contains: database/, auth/, storage/, functions/, realtime/, logs/, ai/, login/, onboard/, dashboard/, visualizer/, deployments/, settings/
- Pattern: Each feature has pages/, components/, hooks/, services/, contexts/

**`insforge/insforge/functions/`:**
- Purpose: Backend serverless functions
- Contains: InsForge edge function implementations

**`insforge/migrations/`:**
- Purpose: Observability database migrations
- Contains: `001_pipeline_traces.sql` (pipeline_traces, pipeline_spans tables)

**`.planning/`:**
- Purpose: GSD project tracking and codebase documentation
- Contains:
  - `PROJECT.md`: Project definition
  - `ROADMAP.md`: Phase breakdown
  - `STATE.md`: Current state
  - `REQUIREMENTS.md`: Requirement traceability
  - `phases/`: Phase-specific planning documents
  - `codebase/`: Codebase analysis documents (this file)

## Key File Locations

**Entry Points:**
- `deal-quest-bot/bot/main.py`: Bot entry point
- `deal-quest-bot/packages/webapp/src/main.tsx`: Webapp entry point
- `insforge/insforge/backend/src/`: InsForge backend entry

**Configuration:**
- `deal-quest-bot/.env`: Bot environment variables
- `deal-quest-bot/bot/config.py`: Pydantic settings loader
- `deal-quest-bot/packages/webapp/vite.config.ts`: Vite build config
- `deal-quest-bot/package.json`: Monorepo root config
- `deal-quest-bot/pnpm-workspace.yaml`: Workspace definition
- `deal-quest-bot/requirements.txt`: Python dependencies
- `deal-quest-bot/railway.toml`: Railway deployment config
- `deal-quest-bot/nixpacks.toml`: Nixpacks build config

**Core Logic:**
- `deal-quest-bot/bot/pipeline/runner.py`: Pipeline execution engine
- `deal-quest-bot/bot/agents/base.py`: Agent abstraction
- `deal-quest-bot/bot/storage/insforge_client.py`: Database client
- `deal-quest-bot/bot/tracing/context.py`: Observability system
- `deal-quest-bot/bot/services/llm_router.py`: LLM provider abstraction

**Testing:**
- No test files detected in bot/
- No test files detected in packages/webapp/
- Testing infrastructure: Not implemented

## Naming Conventions

**Files:**
- Python modules: snake_case.py (e.g., `llm_router.py`, `insforge_client.py`)
- TypeScript components: PascalCase.tsx (e.g., `Dashboard.tsx`, `App.tsx`)
- TypeScript utilities: camelCase.ts (e.g., `insforge.ts`, `telegram.ts`)
- Config files: lowercase with dots (e.g., `vite.config.ts`, `pnpm-workspace.yaml`)
- Data files: lowercase with underscores (e.g., `company_knowledge.md`, `playbook.md`)

**Directories:**
- Python packages: snake_case (e.g., `bot`, `pipeline`, `tracing`)
- TypeScript packages: kebab-case (e.g., `webapp`, `shared`)
- Feature directories: lowercase (e.g., `handlers`, `agents`, `services`, `pages`)

**Python Naming:**
- Classes: PascalCase (e.g., `BaseAgent`, `PipelineRunner`, `InsForgeClient`)
- Functions/methods: snake_case (e.g., `load_settings()`, `get_by_telegram_id()`)
- Variables: snake_case (e.g., `user_repo`, `trace_id`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`, `RETRY_DELAYS`)
- Private methods: Leading underscore (e.g., `_run_step()`, `_get_client()`)

**TypeScript Naming:**
- Components: PascalCase (e.g., `Dashboard`, `AppRouter`)
- Functions/hooks: camelCase (e.g., `initTelegramSDK()`, `useBackButton()`)
- Variables: camelCase (e.g., `root`, `AppRouter`)
- Types: PascalCase (e.g., `UserRow`, `AttemptRow`)
- Constants: UPPER_SNAKE_CASE (e.g., `XP_PER_LEVEL`, `MAX_LEVEL`)

## Where to Add New Code

**New Bot Handler:**
- Primary code: `deal-quest-bot/bot/handlers/{feature}.py`
- Router: Create aiogram Router, register in `bot/main.py`
- Tests: `deal-quest-bot/bot/handlers/{feature}_test.py` (future)

**New Agent:**
- Implementation: `deal-quest-bot/bot/agents/{agent_name}.py`
- Inherit from: `BaseAgent` in `bot/agents/base.py`
- Register: Add to AgentRegistry in `bot/main.py`
- Decorate run() method with `@traced_span("{agent_name}")`

**New Service:**
- Implementation: `deal-quest-bot/bot/services/{service_name}.py`
- Pattern: Class with async methods, inject dependencies via __init__
- Wire in: Add to DI container in `bot/main.py` workflow_data

**New Repository:**
- Implementation: Add class to `deal-quest-bot/bot/storage/repositories.py`
- Model: Add Pydantic model to `deal-quest-bot/bot/storage/models.py`
- Pattern: Inherit from base repo pattern, wrap InsForgeClient methods
- Wire in: Instantiate in `bot/main.py`, add to workflow_data

**New Pipeline:**
- Definition: `deal-quest-bot/data/pipelines/{pipeline_name}.yaml`
- Format: YAML with name, description, steps (agent, mode, input_mapping)
- Invoke: PipelineRunner.run(load_pipeline("{pipeline_name}"), ctx)

**New Webapp Page:**
- Implementation: `deal-quest-bot/packages/webapp/src/pages/{Feature}.tsx`
- Route: Add to `src/app/Router.tsx` with lazy loading
- Pattern: Use lazy() + Suspense for code splitting

**New Shared Type:**
- Implementation: `deal-quest-bot/packages/shared/src/tables.ts` or `enums.ts`
- Export: Add to `src/index.ts` barrel
- Pattern: Export type keyword for type-only imports

**New Edge Function:**
- Implementation: `deal-quest-bot/functions/{function-name}/`
- Entry: Create index.js or index.ts with default export handler
- Deploy: InsForge automatically discovers and serves functions

**New Migration:**
- Core tables: `deal-quest-bot/migrations/{NNN}_description.sql`
- Observability: `insforge/migrations/{NNN}_description.sql`
- Pattern: SQL file with CREATE TABLE, indexes, RLS policies
- Run: Apply via psql or InsForge migration tool

**Utilities:**
- Bot shared helpers: `deal-quest-bot/bot/utils.py`
- Webapp shared helpers: `deal-quest-bot/packages/webapp/src/shared/utils/`

## Special Directories

**`deal-quest-bot/data/`:**
- Purpose: Contains knowledge base and configuration files
- Generated: No (manually authored)
- Committed: No (gitignored for privacy)
- Pattern: Markdown for knowledge, JSON for scenarios, YAML for pipelines

**`deal-quest-bot/node_modules/`:**
- Purpose: pnpm dependencies for workspace packages
- Generated: Yes (run `pnpm install`)
- Committed: No (listed in .gitignore)

**`deal-quest-bot/packages/webapp/dist/`:**
- Purpose: Vite production build output
- Generated: Yes (run `pnpm build`)
- Committed: No

**`deal-quest-bot/.venv/`:**
- Purpose: Python virtual environment
- Generated: Yes (run `python3 -m venv .venv`)
- Committed: No

**`deal-quest-bot/bot/__pycache__/`:**
- Purpose: Python bytecode cache
- Generated: Yes (automatic)
- Committed: No

**`insforge/insforge/docker-init/`:**
- Purpose: Docker initialization scripts and data
- Generated: Yes (Docker Compose volumes)
- Committed: No

**`.planning/`:**
- Purpose: GSD project tracking and documentation
- Generated: No (manually authored)
- Committed: Yes
- Pattern: Markdown files with structured templates

---

*Structure analysis: 2026-02-02*
