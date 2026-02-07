# Deal Quest

**AI-powered sales co-pilot — training, deal support, and active engagement coaching, delivered through Telegram.**

Deal Quest turns your sales playbook into an interactive training academy and living sales assistant. Team members get real-time closing strategies for live deals, practice with scored scenarios, track leads through engagement plans with timed reminders, and execute step-by-step outreach guided by AI-generated draft messages — all inside Telegram.

---

## The Problem

Sales teams struggle with:
- **Slow onboarding** — New hires take weeks to learn the playbook
- **Inconsistent messaging** — Everyone pitches differently
- **No practice environment** — Real deals are the only training ground
- **Follow-up fatigue** — Engagement plans are created but never executed
- **Founder bottleneck** — Leadership answers the same questions repeatedly

## The Solution

Deal Quest is a Telegram bot + Mini App that acts as an always-available sales co-pilot. It loads your entire playbook and company knowledge into every interaction, scores responses against rubrics, schedules and coaches step-by-step engagement plans, generates AI-powered outreach drafts from screenshots, and remembers each user's strengths and weaknesses over time.

**Cost to operate: $0** — Uses free LLM models by default (OpenRouter).

---

## Repository Structure

This repository contains two projects sharing the same InsForge backend:

| Project | Path | Stack | Description |
|---------|------|-------|-------------|
| **Bot** | `bot/` | Python, aiogram 3 | Telegram bot — commands, pipelines, AI agents |
| **TMA** | `packages/webapp/` | React, TypeScript, Vite | Telegram Mini App — web companion UI |

They share an InsForge (PostgreSQL) database, serverless functions (`functions/`), and a shared types package (`packages/shared/`).

---

## Features

### Deal Support (`/support`)
Paste any prospect situation — text, voice, screenshot, or forwarded message — and get a complete closing strategy:
- **Smart Lead Creation** — Screenshot a LinkedIn profile, email, or business card and get a fully analyzed lead with zero manual typing
- **Prospect Analysis** — Buyer type, seniority, buying signals, key concerns
- **Closing Strategy** — Multi-step approach tailored to the prospect
- **Engagement Plan** — Timed step-by-step outreach plan with automated reminders
- **Engagement Tactics** — Platform-specific actions (LinkedIn, email, DM warmup)
- **Draft Response** — Ready-to-send message using your playbook language
- **Conversational Re-analysis** — Forward prospect responses or meeting notes, and the AI re-analyzes the strategy with full deal context

### Active Engagement Execution (TMA)
Execute engagement plans step by step from the Mini App:
- **Step Action Screens** — Guided interface showing lead context, proof upload, and AI drafts
- **AI Draft Generation** — Upload a screenshot, and the bot generates multi-platform draft messages (LinkedIn, email, Twitter/X, Slack, etc.) displayed in a tabbed view
- **Post-copy Nudge** — After copying a draft, a toast prompts you to mark the step as done
- **Can't Perform Flow** — Progressive disclosure for skipping steps with reason capture

### Timed Reminders & Coaching
- **Automatic Scheduling** — Engagement plan steps become timed reminders with concrete due dates
- **Rich Reminders** — Bot sends formatted reminders with lead name, step description, and draft preview
- **Done/Snooze/Skip** — Inline button interactions on each reminder message
- **Escalation** — Reminders escalate through 3 levels before auto-snoozing
- **Deep Links** — "Open in App" button on reminders jumps directly to the step in the TMA

### Structured Training (`/learn`)
Work through curriculum tracks with progressive difficulty:
- Track-based lessons with scenarios and scoring
- Rubric-based evaluation with specific feedback
- Smart difficulty recommendations based on your history
- Auto-unlock next levels on completion
- XP accumulation and progress tracking

### Random Practice (`/train`)
Case-interview style scenario practice:
- Random scenarios with difficulty filter (Easy/Medium/Hard)
- Quick Start mode with smart difficulty recommendation
- Scored with detailed feedback and ideal responses
- Never repeats until all scenarios are exhausted

### Today's Actions Dashboard (TMA)
The Mini App opens to your most relevant view:
- **Smart Landing** — Auto-detects context and surfaces overdue leads, today's actions, or training streaks
- **Today's Actions Widget** — Aggregates overdue and due-today engagement steps across all leads
- **Lead Pipeline** — Searchable, filterable list with progress bars, overdue badges, and screenshot proof counts
- **Plan-first Lead Detail** — Opens to the engagement plan (not analysis), with Intelligence and Activity as secondary sections

### Agent Observatory & Model Config (Admin)
Full visibility into AI behavior:
- **Langfuse Tracing** — Every pipeline run produces hierarchical traces with prompts, I/O, tokens, and costs
- **Per-agent Model Config** — Set which OpenRouter model each agent uses from the TMA admin panel
- **Zero-deploy Changes** — Model overrides take effect immediately from the database (60s cache TTL)

### Progress Dashboard (`/stats`)
Track your growth:
- XP, level, rank, and streak counter
- Badge wall with rarity tiers (common, rare, epic, legendary)
- Level-up celebrations with confetti
- Team leaderboard and weak area identification

### Admin Panel (`/admin`)
Restricted panel for team leads:
- Team-wide statistics and user overview
- Performance charts and weak area identification
- Agent model configuration (OpenRouter model browser)
- Activity feed across all members

---

## Architecture

```
Telegram User
     |
     v
+--------------------+     +---------------------+
|   aiogram 3.x      |     |  TMA (React)        |
|   Dispatcher        |     |  Vite + TypeScript   |
+----+---------------+     +---------+-----------+
     |                                |
     v                                v
+--------------------+     +---------------------+
|   Handler Layer     |     |  InsForge SDK        |
|   (commands, FSM,   |     |  React Query hooks   |
|    callbacks)       |     |  Zustand stores      |
+----+---------------+     +---------+-----------+
     |                                |
     v                                v
+---------------------------------------------------+
|             InsForge (PostgreSQL)                   |
|                                                    |
|  15+ tables: users, leads, reminders, drafts, etc. |
|  PostgREST API + Storage (prospect photos)         |
+----+----------------------------------------------+
     |
     v
+--------------------+     +------------------+
|   Pipeline Runner   |     |  Background Tasks |
|   (YAML-defined)    |     |                  |
|                     |     |  Plan Scheduler  |
|   Sequential /      |     |  Draft Poller    |
|   Parallel /        |     |  Followup Loop   |
|   Background steps  |     |  Scenario Gen    |
+----+---------------+     +------------------+
     |
     v
+--------------------+     +------------------+
|   Agent Registry    |     |  Langfuse        |
|                     |     |                  |
|  7 agents:          |     |  Trace hierarchy |
|   Strategist        |     |  @observe spans  |
|   Extraction        |     |  Token/cost      |
|   ReanalysisStrat.  |     |  Per-agent model |
|   Trainer           |     +------------------+
|   Memory            |
|   CommentGenerator  |
+----+---------------+
     |
     v
+--------------------+     +------------------+
|  LLM Router        |     |  Knowledge Layer  |
|                     |     |                  |
|  OpenRouter (free)  |     |  Playbook        |
|  Claude API         |     |  Company KB      |
|  ModelConfigService |     |  User Memory     |
|  Per-agent override |     |  Casebook        |
+--------------------+     +------------------+
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
| TMA-Bot communication | DB message bus (polling) | No HTTP server needed on bot, simple and reliable |
| Background processing | asyncio.create_task | No Celery/Redis needed |
| Observability | Langfuse (cloud/self-hosted) | Full prompt/I-O/cost visibility, zero-code debugging |
| Model config | Per-agent DB overrides | Admin can swap models from TMA without code deploys |
| TMA frontend | React + Vite + InsForge SDK | Same DB, Telegram-native auth |

---

## Observability

Every pipeline execution is traced with full observability via Langfuse:

- **@observe decorators** on all 7 agents capture system prompts, user input, LLM output, model used, token count, and cost
- **Generation observations** record per-LLM-call details including OpenRouter cost breakups
- **Trace hierarchy**: Pipeline > Agent span > LLM generation
- **Admin access**: Open the Langfuse dashboard to drill into any trace — no code access needed
- **Self-host ready**: Switch from cloud to self-hosted Langfuse by changing one environment variable

---

## Project Structure

```
deal-quest-bot/
├── bot/
│   ├── main.py                 # Entry point, DI wiring, polling, background tasks
│   ├── config.py               # pydantic-settings from .env
│   ├── middleware.py            # Username-based authorization
│   ├── states.py               # FSM state definitions
│   ├── utils.py                # Telegram formatting helpers
│   ├── utils_tma.py            # TMA deep link helper (Open in App buttons)
│   ├── task_utils.py           # Background task safety (GC-safe references)
│   ├── agents/
│   │   ├── base.py             # BaseAgent ABC + typed I/O (AgentInput/AgentOutput)
│   │   ├── registry.py         # Agent name -> instance lookup
│   │   ├── strategist.py       # /support analysis & strategy (@observe)
│   │   ├── extraction.py       # Screenshot OCR extraction (@observe)
│   │   ├── reanalysis_strategist.py  # Re-analysis with deal evolution (@observe)
│   │   ├── trainer.py          # /learn + /train scoring (@observe)
│   │   ├── memory.py           # Background memory updates (@observe)
│   │   └── comment_generator.py # Multi-platform draft generation (@observe)
│   ├── pipeline/
│   │   ├── context.py          # PipelineContext -- shared state, model config
│   │   ├── runner.py           # Sequential / parallel / background execution
│   │   └── config_loader.py    # YAML pipeline definitions
│   ├── handlers/
│   │   ├── start.py            # Onboarding + API key setup
│   │   ├── support.py          # Deal analysis flow (text/voice/image/forward)
│   │   ├── learn.py            # Structured training
│   │   ├── train.py            # Random scenario practice
│   │   ├── leads.py            # Lead management
│   │   ├── reminders.py        # Done/Snooze/Skip/ViewDraft callbacks
│   │   ├── comment.py          # /comment command for post screenshots
│   │   ├── stats.py            # Progress display
│   │   ├── settings.py         # Provider management
│   │   ├── admin.py            # Admin panel (restricted)
│   │   └── progress.py         # Progress utilities
│   ├── services/
│   │   ├── llm_router.py       # LLM provider abstraction + Langfuse generation obs
│   │   ├── model_config.py     # ModelConfigService (per-agent model overrides)
│   │   ├── knowledge.py        # Playbook + company KB loader (cached at startup)
│   │   ├── casebook.py         # Reusable response retrieval
│   │   ├── scoring.py          # XP calculation
│   │   ├── crypto.py           # Fernet encryption for API keys
│   │   ├── transcription.py    # AssemblyAI voice transcription
│   │   ├── progress.py         # ProgressUpdater (real-time status)
│   │   ├── analytics.py        # Analytics service
│   │   ├── engagement.py       # Engagement tracking
│   │   ├── plan_scheduler.py   # Timed reminder scheduling + dispatch
│   │   ├── followup_scheduler.py # Follow-up scheduling
│   │   ├── draft_poller.py     # Draft request poller (DB message bus)
│   │   ├── image_utils.py      # Image pre-resize for vision models
│   │   └── scenario_generator.py # Dynamic scenario generation
│   └── storage/
│       ├── insforge_client.py  # Async HTTP client for InsForge PostgREST
│       ├── repositories.py     # 15 repository classes (User, Lead, Reminder, Draft, etc.)
│       └── models.py           # Pydantic data models
├── packages/
│   ├── webapp/                 # Telegram Mini App (React)
│   │   ├── src/
│   │   │   ├── app/            # App shell, routing, ErrorBoundary
│   │   │   ├── features/       # Feature modules (leads, admin, auth, training)
│   │   │   ├── shared/         # Shared UI components, hooks, stores
│   │   │   ├── lib/            # InsForge client, query keys, utilities
│   │   │   ├── pages/          # Dashboard, Support, Learn, Train, Admin, etc.
│   │   │   └── types/          # TypeScript types (tables, enums)
│   │   └── package.json
│   └── shared/                 # Shared TypeScript types
├── functions/                  # InsForge serverless functions
│   └── verify-telegram/        # Telegram auth verification (edge function)
├── prompts/                    # Agent system prompts (strategist, trainer, etc.)
├── data/
│   ├── playbook.md             # Your sales playbook (gitignored)
│   ├── company_knowledge.md    # Company info (gitignored)
│   ├── scenarios.json          # Training scenarios (gitignored)
│   ├── *.example.*             # Templates showing expected format
│   └── pipelines/              # YAML agent pipeline definitions
├── migrations/                 # Original DB migrations (core tables)
├── insforge/migrations/        # Extended migrations (reminders, drafts, config, etc.)
├── .planning/                  # GSD project tracking
├── .env.example
├── requirements.txt
├── railway.toml                # Railway deployment config (bot)
├── package.json                # pnpm workspace root
└── pnpm-workspace.yaml
```

---

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+ and pnpm
- A Telegram bot token (from [@BotFather](https://t.me/BotFather))
- An [InsForge](https://insforge.com) project (for the database)
- An [OpenRouter](https://openrouter.ai) API key (free tier available)

### 1. Clone and install

```bash
git clone https://github.com/dvlevin/deal-quest-bot.git
cd deal-quest-bot

# Bot
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# TMA
pnpm install
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

Run the migrations in your InsForge project (in order):

```bash
# Core tables
migrations/001_initial_schema.sql

# Extended tables
insforge/migrations/002_scheduled_reminders.sql
insforge/migrations/003_web_research_versions.sql
insforge/migrations/004_lead_analysis_history.sql
insforge/migrations/005_agent_model_config.sql
insforge/migrations/006_draft_requests.sql
```

### 5. Deploy the edge function

Deploy `functions/verify-telegram/` to your InsForge project for Telegram auth verification.

### 6. Run

```bash
# Bot
python3 -m bot.main

# TMA (development)
pnpm --filter webapp dev
```

---

## Deployment

### Railway

The project includes pre-configured `railway.toml` files for deployment:

**Bot** (root `railway.toml`):
```bash
railway login && railway up
```

**TMA** (`packages/webapp/railway.toml`):
- Static SPA serving with `serve`
- Set `VITE_INSFORGE_URL` and `VITE_INSFORGE_ANON_KEY` in Railway dashboard (baked into bundle at build time)

Set all environment variables from `.env.example` in the Railway dashboard.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | Bot token from BotFather |
| `INSFORGE_URL` | Yes | InsForge project URL |
| `INSFORGE_SERVICE_KEY` | Yes | InsForge service role key |
| `ENCRYPTION_KEY` | Yes | Fernet key for API key encryption |
| `OPENROUTER_API_KEY` | Yes | Shared team key for free LLM access |
| `ALLOWED_USERNAMES` | No | Comma-separated Telegram usernames |
| `ADMIN_USERNAMES` | No | Comma-separated admin usernames |
| `TMA_URL` | No | TMA URL for "Open in App" deep links |
| `LANGFUSE_SECRET_KEY` | No | Langfuse secret key for tracing |
| `LANGFUSE_PUBLIC_KEY` | No | Langfuse public key for tracing |
| `LANGFUSE_BASE_URL` | No | Langfuse host (default: cloud) |

---

## LLM Providers

### OpenRouter (Default — Free)

Free models available:
- `openai/gpt-oss-120b` — Fast non-reasoning model (default)
- `moonshotai/kimi-k2.5` — Strong reasoning
- `google/gemini-flash` — Fast responses

Users can self-configure during onboarding, or the admin can set a shared team key for zero-friction setup. Admin can override models per-agent from the TMA admin panel.

### Claude API (Premium)

For highest quality interactions. Users provide their own Anthropic API key during onboarding. Supports vision (screenshots) via multipart content arrays.

---

## How It Works

### Multi-Agent Pipeline

Each command triggers a YAML-defined pipeline with specialized agents:

```yaml
# data/pipelines/support.yaml
name: support
steps:
  - agent: extraction    # OCR from screenshots (sequential)
    mode: sequential
  - agent: strategist    # Full analysis & strategy (sequential)
    mode: sequential
  - agent: memory        # Background memory update (fire & forget)
    mode: background
```

7 agents total: Strategist, Extraction, ReanalysisStrategist, Trainer, Memory, CommentGenerator, and more. Adding a new agent is one Python file + one YAML entry.

### DB Message Bus (TMA → Bot)

For async operations like AI draft generation, the TMA and bot communicate via a database polling pattern:

1. TMA inserts a row into `draft_requests` with `status: 'pending'`
2. Bot poller (3s interval) claims the request atomically
3. Bot processes via `CommentGeneratorAgent` with vision model
4. Bot writes result back (structured JSON with platform + options)
5. TMA polls until completion and displays tabbed draft options

### Engagement Plan Lifecycle

1. `/support` generates a lead with engagement plan (timed steps)
2. Plan scheduler creates `scheduled_reminders` with concrete due dates
3. Background poller (15min) finds due reminders and sends to user
4. User executes steps from TMA (screenshot proof + AI draft) or bot (inline buttons)
5. Reminders escalate through 3 levels before auto-snoozing overdue steps
6. Re-analysis available when new context emerges (prospect response, meeting notes)

### Knowledge System

The bot uses **context stuffing** — loading the full playbook and company knowledge into every LLM prompt. At ~70K tokens total, this fits well within modern context windows and avoids the quality loss from RAG chunking. Knowledge is cached at startup for performance.

### Access Control

- **Allowed Users** — Set `ALLOWED_USERNAMES` in `.env`. Only these Telegram usernames can use the bot. Leave empty to allow everyone.
- **Admin Users** — Set `ADMIN_USERNAMES` in `.env`. These users get access to `/admin` with team statistics, model configuration, and management features.
- **TMA Admin** — Navigate to `/admin` in the Mini App. Protected by `VITE_ADMIN_USERNAMES` env var.

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Bot Framework | [aiogram 3.x](https://docs.aiogram.dev/) |
| Language (Bot) | Python 3.11+ (async) |
| Language (TMA) | TypeScript (React 18 + Vite 7) |
| Styling | Tailwind CSS 4 |
| State Management | Zustand + React Query |
| Database | PostgreSQL via [InsForge](https://insforge.com) |
| LLM (Free) | [OpenRouter](https://openrouter.ai) |
| LLM (Premium) | [Anthropic Claude API](https://console.anthropic.com) |
| Observability | [Langfuse](https://langfuse.com) (cloud or self-hosted) |
| Voice | [AssemblyAI](https://www.assemblyai.com) |
| Encryption | cryptography (Fernet) |
| Image Processing | Pillow (vision model pre-resize) |
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
