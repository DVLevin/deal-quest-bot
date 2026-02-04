# Codebase Structure

**Analysis Date:** 2026-02-04

## Directory Layout

```
GD_playground/
├── bot/                              # Python Telegram bot (aiogram 3)
│   ├── agents/                       # AI agent implementations
│   ├── handlers/                     # Command handlers (start, support, learn, etc.)
│   ├── pipeline/                     # YAML-driven pipeline orchestration
│   ├── services/                     # Business logic services
│   ├── storage/                      # InsForge client + repositories
│   ├── tracing/                      # Observability (TraceContext, traced_span)
│   ├── main.py                       # Entry point, DI wiring, polling
│   ├── config.py                     # Pydantic settings from .env
│   ├── middleware.py                 # Username authorization
│   ├── states.py                     # FSM state definitions
│   └── utils.py                      # Telegram formatting helpers
├── packages/
│   ├── webapp/                       # React TMA (Vite + React Router 7)
│   │   ├── src/
│   │   │   ├── app/                  # App shell, Router, providers
│   │   │   ├── features/             # Feature modules (auth, casebook, leads, etc.)
│   │   │   ├── lib/                  # InsForge client, utilities
│   │   │   ├── pages/                # Top-level route pages
│   │   │   ├── shared/               # Shared UI components, hooks, layouts
│   │   │   ├── types/                # TypeScript types (inlined from ../shared)
│   │   │   └── main.tsx              # React root entry point
│   │   ├── package.json
│   │   └── railway.toml              # Railway deployment config
│   └── shared/                       # Shared TypeScript types
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
│       ├── support.yaml
│       ├── learn.yaml
│       └── train.yaml
├── prompts/                          # Agent system prompts
├── migrations/                       # Original database migrations
├── insforge/migrations/              # Observability migrations (pipeline_traces, pipeline_spans)
├── docs/                             # Original design documentation
├── .planning/                        # GSD project tracking
│   ├── PROJECT.md
│   ├── ROADMAP.md
│   ├── STATE.md
│   ├── REQUIREMENTS.md
│   ├── codebase/                     # Codebase analysis docs
│   └── quick/                        # Quick task tracking
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
- Contains: `base.py` (ABC), `strategist.py`, `trainer.py`, `memory.py`, `registry.py`
- Key files: `base.py` (AgentInput/AgentOutput/BaseAgent), `registry.py` (name → instance lookup)

**`bot/handlers/`:**
- Purpose: Telegram command handlers
- Contains: `start.py`, `support.py`, `learn.py`, `train.py`, `stats.py`, `settings.py`, `leads.py`, `admin.py`, `progress.py`
- Key files: `support.py` (deal analysis with strategist), `learn.py` (structured training), `train.py` (random scenarios)

**`bot/pipeline/`:**
- Purpose: Agent pipeline orchestration system
- Contains: `runner.py`, `context.py`, `config_loader.py`
- Key files: `runner.py` (sequential/parallel/background execution), `context.py` (shared state)

**`bot/services/`:**
- Purpose: Reusable business logic services
- Contains: `llm_router.py`, `knowledge.py`, `casebook.py`, `crypto.py`, `transcription.py`, `progress.py`, `analytics.py`, `engagement.py`, `followup_scheduler.py`, `scenario_generator.py`, `scoring.py`
- Key files: `llm_router.py` (LLMProvider ABC + Claude/OpenRouter), `progress.py` (ProgressUpdater)

**`bot/storage/`:**
- Purpose: Database persistence layer
- Contains: `insforge_client.py` (async HTTP), `repositories.py` (11 repo classes), `models.py` (Pydantic)
- Key files: `insforge_client.py` (query/create/update/upsert/delete), `repositories.py` (UserRepo, AttemptRepo, etc.)

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
- Contains: `auth/`, `casebook/`, `dashboard/`, `leads/`, `learn/`, `profile/`, `scoring/`, `settings/`, `support/`, `train/`
- Key files: Each feature has `hooks/`, `components/`, sometimes `pages/`

**`packages/webapp/src/lib/`:**
- Purpose: Shared utilities and client setup
- Contains: `insforge.ts`, `utils.ts`
- Key files: `insforge.ts` (anon + auth client creation)

**`packages/webapp/src/pages/`:**
- Purpose: Top-level route components
- Contains: `Dashboard.tsx`, `Support.tsx`, `Learn.tsx`, `Train.tsx`, `Casebook.tsx`, `Leads.tsx`, `Profile.tsx`, `Admin.tsx`
- Key files: All lazy-loaded by Router.tsx

**`packages/webapp/src/shared/`:**
- Purpose: Shared UI components, hooks, layouts
- Contains: `ui/`, `hooks/`, `layouts/`
- Key files: `layouts/AppLayout.tsx`, `hooks/useBackButton.ts`

**`packages/webapp/src/types/`:**
- Purpose: TypeScript type definitions (inlined from ../shared)
- Contains: Database model interfaces
- Key files: Copied from `packages/shared/types/` due to Railway root_dir isolation

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
- Key files: `pipelines/*.yaml` (agent orchestration definitions)

**`prompts/`:**
- Purpose: Agent system prompts
- Contains: Markdown files with LLM system prompts
- Key files: One per agent type

**`migrations/`:**
- Purpose: Original database schema migrations
- Contains: SQL files for core tables
- Key files: Initial schema setup

**`insforge/migrations/`:**
- Purpose: Observability schema migrations
- Contains: `pipeline_traces.sql`, `pipeline_spans.sql`
- Key files: Tracing table definitions

**`.planning/`:**
- Purpose: GSD project tracking
- Contains: `PROJECT.md`, `ROADMAP.md`, `STATE.md`, `REQUIREMENTS.md`, `codebase/`, `quick/`
- Key files: `PROJECT.md` (project definition), `ROADMAP.md` (phase breakdown)

## Key File Locations

**Entry Points:**
- `bot/main.py`: Bot application entry (DI, polling)
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
- Python: `snake_case.py` (e.g., `llm_router.py`, `insforge_client.py`)
- TypeScript: `PascalCase.tsx` for components (e.g., `Dashboard.tsx`), `camelCase.ts` for utilities (e.g., `insforge.ts`)
- YAML: `lowercase.yaml` (e.g., `support.yaml`)
- Markdown: `UPPERCASE.md` for project docs (e.g., `CLAUDE.md`), `lowercase.md` for data (e.g., `playbook.md`)

**Directories:**
- Python: `lowercase` (e.g., `agents/`, `services/`)
- TypeScript: `lowercase` (e.g., `features/`, `shared/`)

**Python Functions:**
- Public: `snake_case` (e.g., `load_settings()`, `run_pipeline()`)
- Private: `_snake_case` (e.g., `_run_step()`, `_safe_serialize()`)

**Python Classes:**
- `PascalCase` (e.g., `UserRepo`, `BaseAgent`, `TraceContext`)

**TypeScript:**
- Components: `PascalCase` (e.g., `AppRouter`, `Dashboard`)
- Functions: `camelCase` (e.g., `createAuthenticatedClient`, `getInsforge`)
- Hooks: `use` prefix (e.g., `useBackButton`, `useAuth`)

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

**New Edge Function:**
- Implementation: `functions/<function_name>/index.ts`
- Deploy: Via InsForge dashboard or MCP
- Secrets: Set in InsForge environment

**New Database Table:**
- Migration: `migrations/<timestamp>_<table_name>.sql` (or `insforge/migrations/` for observability)
- Model: `bot/storage/models.py` (Pydantic)
- Repository: `bot/storage/repositories.py` (class with InsForgeClient)
- TypeScript types: `packages/shared/types/` (then inline to webapp)

**Utilities:**
- Bot: `bot/utils.py` (Telegram formatting)
- TMA: `packages/webapp/src/lib/utils.ts` (general helpers)

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

*Structure analysis: 2026-02-04*
