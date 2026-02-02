# Deal Quest Bot

**AI-powered sales training and deal support platform, delivered through Telegram.**

Deal Quest turns your sales playbook into an interactive training academy. Team members get real-time closing strategies for live deals, practice with scored scenarios, and progress through structured learning tracks — all inside Telegram.

---

## The Problem

Sales teams struggle with:
- **Slow onboarding** — New hires take weeks to learn the playbook
- **Inconsistent messaging** — Everyone pitches differently
- **No practice environment** — Real deals are the only training ground
- **Founder bottleneck** — Leadership answers the same questions repeatedly

## The Solution

Deal Quest is a Telegram bot that acts as an always-available sales coach. It loads your entire playbook and company knowledge into every interaction, scores responses against rubrics, and remembers each user's strengths and weaknesses over time.

**Cost to operate: $0** — Uses free LLM models by default (OpenRouter).

---

## Repository Structure

This repository contains two projects sharing the same InsForge backend:

| Project | Path | Stack | Description |
|---------|------|-------|-------------|
| **Bot** | `bot/` | Python, aiogram 3 | Telegram bot — commands, pipelines, agents |
| **TMA** | `packages/webapp/` | React, TypeScript, Vite | Telegram Mini App — web companion UI |

They share an InsForge (PostgreSQL) database, serverless functions (`functions/`), and a shared types package (`packages/shared/`).

---

## Features

### `/support` — Deal Closing Assistant
Paste any prospect situation and get a complete closing strategy:
- **Prospect Analysis** — Buyer type, seniority, buying signals, key concerns
- **Closing Strategy** — Multi-step approach tailored to the prospect
- **Engagement Tactics** — LinkedIn likes, comment drafts, pre-outreach warmup
- **Draft Response** — Ready-to-send message using your playbook language

Supports text, voice messages, and images.

### `/learn` — Structured Training
Work through curriculum tracks with progressive difficulty:
- Track-based lessons with scenarios and scoring
- Rubric-based evaluation with specific feedback
- Auto-unlock next levels on completion
- XP accumulation and progress tracking

### `/train` — Random Practice
Case-interview style scenario practice:
- Random scenarios from a pool of 20+
- **Never repeats** until all scenarios are exhausted
- Pool auto-resets with notification
- Scored with detailed feedback and ideal responses

### `/stats` — Progress Dashboard
Track your growth:
- XP, level, and rank
- Track completion progress
- Performance averages across attempts

### `/admin` — Team Management (Admin Only)
Restricted panel for team leads:
- Team-wide statistics and user overview
- Recent activity across all members
- Knowledge base status and scenario analytics
- Casebook quality monitoring

### `/settings` — Configuration
- Switch between OpenRouter (free) and Claude API (premium)
- Change LLM model
- Update API keys
- Reset progress or delete account

---

## Architecture

```
Telegram User
     |
     v
+--------------------+
|   aiogram 3.x      |   Authorization Middleware
|   Dispatcher        |   (username allowlist)
+----+---------------+
     |
     v
+--------------------+     +------------------+
|   Handler Layer     |---->|  Pipeline Runner  |
|                     |     |  (YAML-defined)   |
|  start, support,    |     +--+----------+----+
|  learn, train,      |        |          |
|  stats, settings,   |        v          v
|  admin, leads       |   Sequential  Background
+--------------------+    execution    (fire & forget)
     |
     v
+--------------------+     +------------------+
|   Agent Registry    |---->|  Agents          |
|                     |     |                  |
|  Name-based lookup  |     |  Strategist      |
|  Typed I/O models   |     |  Trainer         |
+--------------------+     |  Memory          |
     |                      +------------------+
     v                           |
+--------------------+           v
|  LLM Router        |     +------------------+
|                     |     |  Knowledge Layer  |
|  OpenRouter (free)  |     |                  |
|  Claude API         |     |  Playbook        |
|  Provider factory   |     |  Company KB      |
|  Retry + backoff    |     |  User Memory     |
+--------------------+     |  Casebook        |
     |                      +------------------+
     v
+--------------------+     +------------------+
|  InsForge DB       |     |  Tracing Layer   |
|  (PostgreSQL)      |     |                  |
|                    |     |  TraceContext     |
|  9 tables:         |     |  traced_span     |
|  users, attempts,  |     |  TraceCollector  |
|  user_memory,      |     |  (async batch    |
|  scenarios_seen,   |     |   flush to DB)   |
|  support_sessions, |     |                  |
|  track_progress,   |     |  pipeline_traces |
|  casebook,         |     |  pipeline_spans  |
|  pipeline_traces,  |     +------------------+
|  pipeline_spans    |
+--------------------+
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Bot framework | aiogram 3.x | Modern async Python, FSM built-in, Router pattern |
| Database | InsForge (PostgreSQL) | Managed BaaS, no infra to maintain |
| Agent system | Custom BaseAgent + Registry | Framework-agnostic, YAML-configurable, no heavy deps |
| Pipeline config | YAML files | Change agent flows without code changes |
| LLM integration | User-provided keys (encrypted) | Cost on users, supports free models |
| Knowledge approach | Context stuffing (~70K tokens) | No chunking, no vector DB, instant retrieval |
| Background processing | asyncio.create_task | No Celery/Redis needed |
| Tracing | stdlib contextvars + perf_counter | Zero external deps, async-safe propagation |
| TMA frontend | React + Vite + InsForge SDK | Same DB, Telegram-native auth |

---

## Observability

Every pipeline execution is traced with step-level timing and agent I/O:

- **TraceContext** wraps each pipeline call (learn, train, support)
- **traced_span** decorator records timing on agent `.run()` and LLM `.complete()` methods
- **TraceCollector** batches spans and flushes to InsForge in the background
- Traces are queryable by `trace_id`, `telegram_id`, `pipeline_name`, and date range

Span hierarchy: `TraceContext (pipeline)` > `agent:trainer` > `llm:openrouter`

---

## Project Structure

```
deal-quest-bot/
├── bot/
│   ├── main.py                 # Entry point, DI wiring, polling
│   ├── config.py               # pydantic-settings from .env
│   ├── middleware.py            # Username-based authorization
│   ├── states.py               # FSM state definitions
│   ├── utils.py                # Telegram formatting helpers
│   ├── agents/
│   │   ├── base.py             # BaseAgent ABC + typed I/O
│   │   ├── registry.py         # Agent name -> instance lookup
│   │   ├── strategist.py       # /support analysis & strategy
│   │   ├── trainer.py          # /learn + /train scoring
│   │   └── memory.py           # Background memory updates
│   ├── pipeline/
│   │   ├── context.py          # Shared state between agents
│   │   ├── runner.py           # Sequential / parallel / background
│   │   └── config_loader.py    # YAML pipeline definitions
│   ├── handlers/
│   │   ├── start.py            # Onboarding + API key setup
│   │   ├── support.py          # Deal analysis flow
│   │   ├── learn.py            # Structured training
│   │   ├── train.py            # Random scenario practice
│   │   ├── leads.py            # Lead management
│   │   ├── stats.py            # Progress display
│   │   ├── settings.py         # Provider management
│   │   ├── admin.py            # Admin panel (restricted)
│   │   └── progress.py         # Progress utilities
│   ├── services/
│   │   ├── llm_router.py       # LLM provider abstraction
│   │   ├── knowledge.py        # Playbook + company KB loader
│   │   ├── casebook.py         # Reusable response retrieval
│   │   ├── scoring.py          # XP calculation
│   │   ├── crypto.py           # Fernet encryption for API keys
│   │   ├── transcription.py    # AssemblyAI voice transcription
│   │   ├── progress.py         # ProgressUpdater (real-time status)
│   │   ├── analytics.py        # Analytics service
│   │   ├── engagement.py       # Engagement tracking
│   │   ├── followup_scheduler.py # Follow-up scheduling
│   │   └── scenario_generator.py # Dynamic scenario generation
│   ├── tracing/
│   │   ├── __init__.py         # Public API exports
│   │   ├── context.py          # TraceContext + traced_span
│   │   ├── collector.py        # Background flush to InsForge
│   │   └── models.py           # Trace/Span Pydantic models
│   └── storage/
│       ├── insforge_client.py  # Async HTTP client for InsForge
│       ├── repositories.py     # 11 repository classes
│       └── models.py           # Pydantic data models
├── packages/
│   ├── webapp/                 # Telegram Mini App (React)
│   │   ├── src/pages/          # Dashboard, Support, Learn, Train, Admin, etc.
│   │   └── package.json
│   └── shared/                 # Shared TypeScript types
├── functions/                  # InsForge serverless functions
├── data/
│   ├── playbook.md             # Your sales playbook (gitignored)
│   ├── company_knowledge.md    # Company info (gitignored)
│   ├── scenarios.json          # Training scenarios (gitignored)
│   ├── *.example.*             # Templates showing expected format
│   └── pipelines/              # YAML agent pipeline definitions
│       ├── support.yaml
│       ├── learn.yaml
│       └── train.yaml
├── prompts/                    # Agent system prompts
├── docs/                       # Design documentation
├── migrations/                 # Original DB migrations
├── insforge/migrations/        # Observability DB migrations
├── .planning/                  # GSD project tracking
├── .env.example
├── requirements.txt
├── railway.toml
├── package.json                # pnpm workspace root
└── pnpm-workspace.yaml
```

---

## Setup

### Prerequisites

- Python 3.11+
- A Telegram bot token (from [@BotFather](https://t.me/BotFather))
- An [InsForge](https://insforge.com) project (for the database)
- An [OpenRouter](https://openrouter.ai) API key (free tier available)

### 1. Clone and install

```bash
git clone https://github.com/dvlevin/deal-quest-bot.git
cd deal-quest-bot
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values. See `.env.example` for descriptions of each variable.

Generate an encryption key:
```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 3. Add your content

Copy the example data files and fill in your own content:

```bash
cp data/playbook.example.md data/playbook.md
cp data/company_knowledge.example.md data/company_knowledge.md
cp data/scenarios.example.json data/scenarios.json
```

The example files document the expected format. The bot loads these into every LLM interaction via context stuffing.

### 4. Set up the database

Create the required tables in your InsForge project:
- **Core tables** (7): `users`, `user_memory`, `scenarios_seen`, `attempts`, `support_sessions`, `track_progress`, `casebook` — see `migrations/`
- **Observability tables** (2): `pipeline_traces`, `pipeline_spans` — see `insforge/migrations/001_pipeline_traces.sql`

### 5. Run

```bash
python3 -m bot.main
```

---

## Deployment

### Railway

The project includes a `railway.toml` pre-configured for deployment:

```bash
railway login
railway init
railway up
```

Set all environment variables from `.env.example` in the Railway dashboard.

### Other Platforms

The bot is a standard Python process with no special infrastructure requirements. It works anywhere you can run `python3 -m bot.main` with the environment variables set.

---

## LLM Providers

### OpenRouter (Default — Free)

Free models available:
- `qwen/qwen3-coder` — Good general purpose (default)
- `deepseek/deepseek-r1` — Strong reasoning
- `google/gemini-flash` — Fast responses

Users can self-configure during onboarding, or the admin can set a shared team key for zero-friction setup.

### Claude API (Premium)

For highest quality interactions. Users provide their own Anthropic API key during onboarding. Typical cost: ~$0.01-0.05 per interaction.

---

## How It Works

### Onboarding (`/start`)

New users get two paths:
1. **Quick Setup** — Uses the shared team OpenRouter key. One tap, no configuration.
2. **Custom Setup** — User provides their own API key for OpenRouter or Claude.

Keys are encrypted with Fernet before storage.

### Multi-Agent Pipeline

Each command triggers a YAML-defined pipeline:

```yaml
# data/pipelines/support.yaml
name: support
steps:
  - agent: strategist    # Runs synchronously, returns strategy
    mode: sequential
  - agent: memory        # Fires in background, updates user memory
    mode: background
```

Agents are registered by name, receive typed inputs, and return structured outputs. Adding a new agent is one Python file + one YAML entry.

### Knowledge System

The bot uses **context stuffing** — loading the full playbook and company knowledge into every LLM prompt. At ~70K tokens total, this fits well within modern context windows and avoids the quality loss from RAG chunking.

### Memory

Each user has a memory record in the database (JSON). The Memory Agent runs in the background after interactions to update:
- Learning profile (strengths, weaknesses)
- Interaction history
- Preferences (response length, tone)

---

## Access Control

The bot supports two levels of access:

- **Allowed Users** — Set `ALLOWED_USERNAMES` in `.env`. Only these Telegram usernames can use the bot. Leave empty to allow everyone.
- **Admin Users** — Set `ADMIN_USERNAMES` in `.env`. These users get access to `/admin` with team statistics and management features.

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Bot Framework | [aiogram 3.x](https://docs.aiogram.dev/) |
| Language (Bot) | Python 3.11+ (async) |
| Language (TMA) | TypeScript (React 18 + Vite 7) |
| Database | PostgreSQL via [InsForge](https://insforge.com) |
| LLM (Free) | [OpenRouter](https://openrouter.ai) |
| LLM (Premium) | [Anthropic Claude API](https://console.anthropic.com) |
| Voice | [AssemblyAI](https://www.assemblyai.com) |
| Encryption | cryptography (Fernet) |
| Config | pydantic-settings |
| Deployment | Railway / any Python host |

---

## Contributing

1. Fork the repo
2. Create a feature branch
3. Add your content files (`data/playbook.md`, etc.)
4. Submit a PR

---

## License

MIT
