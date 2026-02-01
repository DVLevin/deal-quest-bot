# Codebase Structure

**Analysis Date:** 2026-02-02

## Directory Layout

```
deal-quest-bot/
├── .planning/                          # GSD planning documents
│   └── codebase/
├── bot/                               # Python Telegram bot backend
│   ├── agents/                        # AI agent implementations
│   ├── handlers/                      # Telegram command & event handlers
│   ├── pipeline/                      # Agent orchestration & YAML config
│   ├── services/                      # Domain logic & infrastructure
│   ├── storage/                       # Database repositories & models
│   ├── config.py                      # Settings/environment loading
│   ├── main.py                        # Entry point & DI wiring
│   ├── middleware.py                  # Authorization middleware
│   ├── states.py                      # FSM state definitions
│   ├── utils.py                       # Shared utilities
│   └── __init__.py
├── packages/                          # Monorepo packages
│   ├── shared/                        # Shared TypeScript types & constants
│   │   └── src/
│   │       ├── tables.ts              # Database schema interfaces
│   │       ├── constants.ts           # Shared constants
│   │       ├── enums.ts               # Enum definitions
│   │       └── index.ts               # Barrel export
│   └── webapp/                        # React Telegram Mini App frontend
│       ├── src/
│       │   ├── app/                   # App root & layout
│       │   ├── features/              # Feature-specific logic
│       │   ├── lib/                   # Utilities & integrations
│       │   ├── pages/                 # Page components
│       │   ├── shared/                # Reusable components & hooks
│       │   └── main.tsx               # Entry point
│       ├── dist/                      # Built output (generated)
│       ├── public/                    # Static assets
│       ├── vite.config.ts             # Build config
│       └── package.json
├── data/                              # Content & configuration data
│   ├── pipelines/                     # YAML pipeline definitions
│   │   ├── train.yaml
│   │   ├── learn.yaml
│   │   └── support.yaml
│   ├── scenarios.json                 # Training scenario pool
│   ├── playbook.md                    # Sales playbook
│   ├── company_knowledge.md           # Company context
│   └── user_memory/                   # User-specific memory dumps (not committed)
├── docs/                              # Documentation
│   ├── tma/                           # Telegram Mini App docs
│   └── ux/                            # UX/design docs
├── functions/                         # Cloud functions (Firebase-compatible)
│   └── verify-telegram/               # Telegram signature verification function
├── migrations/                        # Database migrations (if any)
├── prompts/                           # AI prompts (reference material)
├── .env                               # Environment config (not committed)
├── .env.example                       # Example env template
├── package.json                       # Root workspace manifest
├── pnpm-workspace.yaml                # pnpm monorepo config
├── pnpm-lock.yaml                     # Lock file
├── requirements.txt                   # Python dependencies
├── CLAUDE.md                          # Project instructions
└── README.md                          # Project overview
```

## Directory Purposes

**`bot/`:**
- Purpose: Core Telegram bot application
- Contains: Handlers, services, data access layer, pipeline orchestration
- Key files: `main.py` (startup), `config.py` (env loading), `states.py` (FSM), `middleware.py` (auth)

**`bot/agents/`:**
- Purpose: AI agent implementations for pipeline execution
- Contains: BaseAgent ABC, TrainerAgent, StrategistAgent, MemoryAgent, AgentRegistry
- Key files: `base.py` (abstract interface), `trainer.py`, `strategist.py`, `memory.py`, `registry.py`

**`bot/handlers/`:**
- Purpose: Telegram command and event handlers
- Contains: One module per command group (start.py, train.py, learn.py, support.py, leads.py, stats.py, settings.py, admin.py, progress.py)
- Key files: `train.py` (145 lines, core training workflow), `leads.py` (lead engagement), `support.py` (Q&A)

**`bot/pipeline/`:**
- Purpose: Pipeline execution engine and YAML configuration
- Contains: Runner (orchestrates steps), context (shared state), config loader (parses YAML)
- Key files: `runner.py` (executes agent steps sequentially/parallel/background), `context.py` (pipeline state), `config_loader.py` (YAML → PipelineConfig)

**`bot/services/`:**
- Purpose: Domain-specific business logic and external integrations
- Contains: 12 service modules (crypto, knowledge, scoring, transcription, engagement, scenario generation, etc.)
- Key files: `llm_router.py` (Anthropic/OpenRouter abstraction), `crypto.py` (Fernet encryption), `knowledge.py` (loads markdown), `scoring.py` (XP calculation)

**`bot/storage/`:**
- Purpose: Database abstraction and data models
- Contains: Repositories (UserRepo, AttemptRepo, CasebookRepo, etc.), Pydantic models, InsForge client
- Key files: `repositories.py` (11 repository classes), `models.py` (Pydantic models), `insforge_client.py` (async HTTP client)

**`packages/shared/src/`:**
- Purpose: Centralized TypeScript database schema definitions and shared constants
- Contains: Database table interfaces (UserRow, AttemptRow, etc.), enums, constants
- Key files: `tables.ts` (217 lines, all table interfaces), `enums.ts` (enum definitions), `constants.ts` (API URLs, pagination limits)

**`packages/webapp/src/`:**
- Purpose: React Telegram Mini App user interface
- Contains: Page components, feature logic, shared UI components, providers, hooks
- Key files: `main.tsx` (entry point with SDK init), `app/App.tsx` (root router), `pages/*.tsx` (Dashboard, Train, Learn, Support, Leads, Casebook, Profile, Admin)

**`packages/webapp/src/app/`:**
- Purpose: Application root structure
- Contains: App component (router), layout component, providers (Auth, Query)
- Key files: `App.tsx` (router definition), `Router.tsx` (route declarations), `providers/` (AuthProvider, QueryProvider)

**`packages/webapp/src/features/`:**
- Purpose: Feature-specific state and logic (separate from UI)
- Contains: Auth feature (store.ts for Zustand, useAuth.ts hook)
- Key files: `auth/store.ts` (Zustand auth store), `auth/useAuth.ts` (hook wrapper)

**`packages/webapp/src/pages/`:**
- Purpose: Page components (one per route)
- Contains: Dashboard, Train, Learn, Support, Casebook, Leads, Profile, Admin pages
- Key files: Dashboard (overview), Train (training interface), Leads (lead management), Support (Q&A)

**`packages/webapp/src/shared/`:**
- Purpose: Reusable components, hooks, and utilities
- Contains: UI components (NavBar, Card, Button, Badge, Skeleton), hooks (useMainButton, useBackButton, useSessionResilience), utilities (cn classname helper)
- Key files: `ui/` (Tailwind-based components), `hooks/` (TMA integration), `lib/` (utilities)

**`data/`:**
- Purpose: Content, configuration, and training data
- Contains: YAML pipelines, scenario JSON, markdown knowledge bases
- Key files: `pipelines/train.yaml` (agent orchestration config), `scenarios.json` (training scenarios), `playbook.md` (sales reference), `company_knowledge.md` (company context)

**`data/pipelines/`:**
- Purpose: YAML pipeline definitions
- Contains: One YAML per pipeline (train, learn, support)
- Key files: `train.yaml` (trainer sequential → memory background), `support.yaml` (engagement agent), `learn.yaml` (learning pipeline)

**`functions/`:**
- Purpose: Standalone serverless functions
- Contains: `verify-telegram/` function for signature verification
- Usage: Deployed to cloud (Firebase Functions, Vercel, etc.) for webhook handlers

**`docs/`:**
- Purpose: Project documentation
- Contains: UX specs, Telegram Mini App integration guide
- Key files: Architecture diagrams, API docs, design specs

## Key File Locations

**Entry Points:**
- `bot/main.py`: Start bot with `python -m bot.main`
- `packages/webapp/src/main.tsx`: React app entry, initializes Telegram SDK

**Configuration:**
- `bot/config.py`: Pydantic settings loader, reads .env
- `.env`: Runtime environment variables (secrets, API keys, URLs)
- `packages/webapp/vite.config.ts`: Vite build configuration

**Core Logic:**
- `bot/handlers/train.py`: Training scenario execution (pick → score → feedback → XP)
- `bot/handlers/leads.py`: Lead engagement (create → analyze → track → followup)
- `bot/pipeline/runner.py`: Agent orchestration engine
- `bot/services/engagement.py`: LLM-based engagement service
- `packages/webapp/src/pages/Train.tsx`: Frontend training UI

**Testing:** No test files present in codebase

**Data Models:**
- `bot/storage/models.py`: Pydantic models for database rows
- `packages/shared/src/tables.ts`: TypeScript schema mirrors
- `packages/shared/src/enums.ts`: Shared enum definitions

## Naming Conventions

**Files:**
- Python modules: `snake_case.py` (e.g., `llm_router.py`, `insforge_client.py`)
- TypeScript modules: `camelCase.ts` (e.g., `tables.ts`, `constants.ts`)
- Component modules: `PascalCase.tsx` (e.g., `App.tsx`, `Train.tsx`, `NavBar.tsx`)
- Page modules: `PascalCase.tsx` in `pages/` directory (e.g., `Dashboard.tsx`, `Leads.tsx`)
- Handler modules: `snake_case.py` matching command (e.g., `train.py`, `leads.py`, `support.py`)
- Service modules: `snake_case.py` (e.g., `crypto.py`, `scoring.py`, `transcription.py`)

**Directories:**
- Feature folders: `snake_case/` (e.g., `bot/agents/`, `bot/handlers/`, `bot/services/`)
- Page routes: `PascalCase/` or directly in `pages/` as `PascalCase.tsx`
- Utility folders: `snake_case/` (e.g., `lib/`, `shared/`, `utils/`)

**Code Style:**
- Python: Type hints on functions, docstrings on classes and modules, f-strings for formatting
- TypeScript: Explicit types on interfaces, `export const`/`export function` for barrel exports, React.FC for components

## Where to Add New Code

**New Handler Command:**
- Primary code: `bot/handlers/{command}.py` (e.g., `bot/handlers/fitness.py` for /fitness)
- Pattern: Create Router(), register handlers with `@router.message(Command("command"))`, use FSM states from `bot/states.py` (add new StateGroup if needed)
- Wire-up: Add to imports and `dp.include_router()` call in `bot/main.py`

**New Service:**
- Implementation: `bot/services/{service_name}.py` (e.g., `bot/services/email.py`)
- Injection: Instantiate in `bot/main.py` main() function, add to workflow_data dict
- Usage: Pass via handler signature or access from workflow_data in context

**New Agent:**
- Implementation: `bot/agents/{agent_name}.py` (e.g., `bot/agents/email_sender.py`)
- Pattern: Subclass BaseAgent, implement `async def run(input: AgentInput, ctx: PipelineContext) -> AgentOutput`
- Registration: Instantiate in `bot/main.py` and call `agent_registry.register()`

**New Page/Feature (Web App):**
- Page implementation: `packages/webapp/src/pages/{FeatureName}.tsx`
- Feature logic: `packages/webapp/src/features/{feature}/` (store.ts, hook.ts)
- Shared components: `packages/webapp/src/shared/ui/` (if reusable across pages)
- Route registration: Add to `packages/webapp/src/app/Router.tsx`

**New Utility:**
- Shared Python: `bot/utils.py` (or `bot/services/` if domain-specific)
- Shared TypeScript: `packages/shared/src/` (constants.ts, enums.ts, tables.ts)
- Web app utilities: `packages/webapp/src/lib/` (e.g., `lib/telegram.ts`, `lib/insforge.ts`)

**Database Changes:**
- Pydantic model: `bot/storage/models.py` (add class inheriting from BaseModel)
- Repository: `bot/storage/repositories.py` (add class with InsForgeClient operations)
- TypeScript schema: `packages/shared/src/tables.ts` (mirror as Row interface)
- Insert/update/query logic: Add methods to repository class

**New Pipeline:**
- YAML definition: `data/pipelines/{name}.yaml` (specify agent steps, execution modes, input mappings)
- Loading: Already auto-loaded by `load_all_pipelines()` in `bot/pipeline/config_loader.py`
- Usage: Call from handler with `load_pipeline("{name}")` and `PipelineRunner.run()`

## Special Directories

**`data/user_memory/`:**
- Purpose: User-specific memory JSON files (not committed to git)
- Generated: Yes (at runtime by memory services)
- Committed: No

**`packages/webapp/dist/`:**
- Purpose: Built/bundled web app (JavaScript, CSS, HTML)
- Generated: Yes (by `vite build`)
- Committed: No (in .gitignore)

**`node_modules/`:**
- Purpose: npm/pnpm dependencies
- Generated: Yes (by `pnpm install`)
- Committed: No (in .gitignore)

**`.venv/`:**
- Purpose: Python virtual environment
- Generated: Yes (by `python -m venv .venv`)
- Committed: No (in .gitignore)

**`migrations/`:**
- Purpose: Database schema change scripts (if using a migration tool)
- Current status: Empty; schema managed directly via InsForge UI
- Committed: Yes (for future schema versions)

---

*Structure analysis: 2026-02-02*
