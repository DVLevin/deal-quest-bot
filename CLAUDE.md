# CLAUDE.md — Project Instructions

## Repository Overview

This repository contains **two projects** that share the same InsForge backend:

1. **Deal Quest Bot** (`bot/`) — Python aiogram 3 Telegram bot for AI-powered sales training and deal support
2. **Deal Quest TMA** (`packages/webapp/`) — React/TypeScript Telegram Mini App (frontend companion to the bot)

There may be more projects added in the future. Each project has its own tech stack but they share:
- The same InsForge (PostgreSQL) database
- A shared TypeScript types package (`packages/shared/`)
- InsForge serverless functions (`functions/`)
- Database migrations (`migrations/`, `insforge/migrations/`)

### Active Development Initiatives

Check `.planning/` for the current GSD (Get Shit Done) project tracking:
- `.planning/PROJECT.md` — Project definition and key decisions
- `.planning/ROADMAP.md` — Phase breakdown and progress
- `.planning/STATE.md` — Current position and session continuity
- `.planning/REQUIREMENTS.md` — Requirement traceability

## Git Workflow

- **Every feature must be developed on a separate branch** (e.g. `feature/voice-transcription`).
- Never commit feature work directly to `main`.
- Only merge to `main` after **manual tests by the user** confirm the feature works.
- When testing locally, run the bot from the **feature branch**.
- Run the bot from `main` **only** when the user explicitly asks, or when there are no active feature branches.
- **CRITICAL: Always push to remote after committing.** Railway deploys from the remote branch — local-only commits will never appear in the deployed app. After any batch of commits (including GSD plan execution), run `git push origin <branch>` before considering the work done.

## Deployment

### TMA Webapp (Railway)
- **Platform**: Railway (static SPA serving)
- **Config**: `packages/webapp/railway.toml` — root directory `packages/webapp`, build with `pnpm install && pnpm build`, serve with `serve dist -s`
- **Branch**: Railway deploys from the current remote branch (currently `gsd/phase-01-foundation-and-auth`)
- **Build env vars**: `VITE_INSFORGE_URL` and `VITE_INSFORGE_ANON_KEY` must be set in Railway dashboard (baked into bundle at build time)
- **Shared types**: `packages/shared/` types are inlined into `packages/webapp/src/types/` because Railway's `root_dir` isolation prevents accessing `../shared` during build

### Bot (Railway)
- **Platform**: Railway (long-running process)
- **Config**: `railway.toml` at repo root — Nixpacks builder, `python3 -m bot.main`
- **Restart policy**: ON_FAILURE (max 10 retries)

### Edge Functions (InsForge)
- **Runtime**: Deno 2.0.6 (InsForge runtime)
- **Functions**: `functions/verify-telegram/` (Telegram auth), `functions/db-proxy.js` (database proxy)
- **Deploy**: Via InsForge dashboard or MCP — not auto-deployed from git
- **Required secrets**: `TELEGRAM_BOT_TOKEN`, `JWT_SECRET` must be set as InsForge environment secrets

## Running the Bot

```bash
source .venv/bin/activate && python3 -m bot.main
```

## Project Structure

```
deal-quest-bot/
├── bot/                            # Python Telegram bot
│   ├── main.py                     # Entry point, DI wiring, polling
│   ├── config.py                   # Pydantic settings from .env
│   ├── middleware.py               # Username-based authorization
│   ├── states.py                   # FSM state definitions
│   ├── utils.py                    # Telegram formatting helpers
│   ├── agents/                     # AI agents for pipelines
│   │   ├── base.py                 # BaseAgent ABC + typed I/O (AgentInput/AgentOutput)
│   │   ├── registry.py             # Agent name -> instance lookup
│   │   ├── strategist.py           # /support analysis & strategy (@traced_span)
│   │   ├── trainer.py              # /learn + /train scoring (@traced_span)
│   │   └── memory.py               # Background memory updates (@traced_span)
│   ├── pipeline/                   # Pipeline execution system
│   │   ├── context.py              # PipelineContext — shared state between agents
│   │   ├── runner.py               # PipelineRunner — sequential/parallel/background steps
│   │   └── config_loader.py        # YAML pipeline definitions loader
│   ├── handlers/                   # Telegram command handlers
│   │   ├── start.py                # Onboarding + API key setup
│   │   ├── support.py              # Deal analysis flow (text/voice/image)
│   │   ├── learn.py                # Structured training with tracks
│   │   ├── train.py                # Random scenario practice
│   │   ├── leads.py                # Lead management
│   │   ├── stats.py                # Progress display
│   │   ├── settings.py             # Provider management
│   │   ├── admin.py                # Admin panel (restricted)
│   │   └── progress.py             # Progress utilities
│   ├── services/                   # Business logic services
│   │   ├── llm_router.py           # LLM provider abstraction (OpenRouter/Claude) (@traced_span)
│   │   ├── knowledge.py            # Playbook + company KB loader
│   │   ├── casebook.py             # Reusable response retrieval
│   │   ├── scoring.py              # XP calculation
│   │   ├── crypto.py               # Fernet encryption for API keys
│   │   ├── transcription.py        # AssemblyAI voice transcription
│   │   ├── progress.py             # ProgressUpdater for real-time status
│   │   ├── analytics.py            # Analytics service
│   │   ├── engagement.py           # Engagement tracking
│   │   ├── followup_scheduler.py   # Follow-up scheduling
│   │   └── scenario_generator.py   # Dynamic scenario generation
│   ├── tracing/                    # Pipeline observability (Phase 1)
│   │   ├── __init__.py             # Exports: TraceContext, traced_span, init_collector, get_collector
│   │   ├── context.py              # TraceContext (async ctx mgr), traced_span decorator, ContextVar propagation
│   │   ├── collector.py            # TraceCollector — batched background flush to InsForge
│   │   └── models.py               # TraceModel, SpanModel (Pydantic)
│   └── storage/                    # Data persistence (InsForge)
│       ├── insforge_client.py      # Async HTTP client for InsForge PostgREST
│       ├── repositories.py         # 11 repository classes (User, Memory, Attempts, Traces, etc.)
│       └── models.py               # Pydantic data models (including PipelineTraceModel, PipelineSpanModel)
├── packages/                       # Frontend (TMA)
│   ├── webapp/                     # React + TypeScript Telegram Mini App
│   │   ├── src/
│   │   │   ├── pages/              # Dashboard, Support, Learn, Train, Admin, etc.
│   │   │   ├── app/                # App shell, routing
│   │   │   ├── shared/             # Shared UI components
│   │   │   └── lib/                # InsForge client, utilities
│   │   └── package.json            # React 18, Tailwind CSS 4, Zustand, React Router 7
│   └── shared/                     # Shared TypeScript types
├── functions/                      # InsForge serverless functions
│   ├── db-proxy.js                 # Database proxy function
│   └── verify-telegram/            # Telegram auth verification
├── data/                           # Knowledge base & pipeline configs
│   ├── playbook.md                 # Sales playbook (gitignored)
│   ├── company_knowledge.md        # Company info (gitignored)
│   ├── scenarios.json              # Training scenarios (gitignored)
│   └── pipelines/                  # YAML agent pipeline definitions
│       ├── support.yaml
│       ├── learn.yaml
│       └── train.yaml
├── prompts/                        # Agent system prompts
├── docs/                           # Original design documentation
├── migrations/                     # Database migrations (original tables)
├── insforge/migrations/            # Observability migrations (pipeline_traces, pipeline_spans)
├── .planning/                      # GSD project tracking (observability initiative)
├── .env.example                    # Environment template
├── requirements.txt                # Python dependencies
├── railway.toml                    # Railway deployment config
├── package.json                    # pnpm workspace root
└── pnpm-workspace.yaml             # Workspace: packages/*
```

## Tech Stack

### Bot (Python)
- **Framework**: aiogram 3.x (async Telegram bot)
- **Database**: InsForge (PostgreSQL via PostgREST)
- **LLM**: OpenRouter (free) / Claude API (premium)
- **Voice**: AssemblyAI transcription
- **Config**: pydantic-settings
- **Encryption**: cryptography (Fernet)

### TMA (TypeScript)
- **Framework**: React 18 + Vite 7
- **Styling**: Tailwind CSS 4
- **State**: Zustand + React Query
- **Routing**: React Router 7
- **Backend**: InsForge SDK (@insforge/sdk)
- **Telegram**: @telegram-apps/sdk-react

## Key Patterns

- **Pipeline system**: YAML-defined agent flows executed by PipelineRunner (sequential/parallel/background steps)
- **Context stuffing**: Full playbook + company knowledge loaded into every LLM prompt (~70K tokens)
- **ProgressUpdater**: Real-time Telegram message updates during pipeline execution
- **TraceContext**: Async context manager wrapping pipeline calls for observability (outside ProgressUpdater)
- **traced_span**: Decorator for step-level timing on agent .run() and LLM .complete() methods
- **Repository pattern**: Each InsForge table has a Repo class in storage/repositories.py

## Database Tables (InsForge)

9 tables total:
- `users`, `user_memory`, `scenarios_seen`, `attempts`, `support_sessions`, `track_progress`, `casebook` — core bot data
- `pipeline_traces`, `pipeline_spans` — observability data (Phase 1)

## Dependencies

- aiogram 3 (Telegram bot framework)
- httpx (HTTP client for InsForge + OpenRouter)
- pydantic / pydantic-settings (config + models)
- cryptography (Fernet encryption for API keys)
- anthropic (Claude API client)
- pyyaml (pipeline configs + memory)
