# External Integrations

**Analysis Date:** 2026-02-02

## APIs & External Services

**Telegram:**
- Telegram Bot API - Primary communication channel for bot
  - SDK/Client: aiogram 3.4.0+
  - Auth: `TELEGRAM_BOT_TOKEN` (required)
  - Implementation: `bot/main.py` via aiogram dispatcher and polling

**LLM Providers (dual-provider architecture):**
- OpenRouter - Default shared LLM provider for team (MVP stage)
  - Client: Custom httpx-based `OpenRouterProvider` in `bot/services/llm_router.py`
  - Auth: `OPENROUTER_API_KEY` (required)
  - Endpoint: https://openrouter.ai/api/v1/chat/completions
  - Models: moonshotai/kimi-k2.5 (default), qwen/qwen3-coder, deepseek/deepseek-r1, google/gemini-flash
  - Used by: Agents (trainer, strategist, memory), engagement service

- Anthropic Claude API - Alternative provider for future per-user integration
  - Client: Custom httpx-based `ClaudeProvider` in `bot/services/llm_router.py`
  - Auth: `ANTHROPIC_API_KEY` (optional)
  - Endpoint: https://api.anthropic.com/v1/messages
  - Model: claude-sonnet-4-20250514
  - Status: Code path exists but not actively used in MVP

**Voice Processing:**
- AssemblyAI - Speech-to-text transcription service
  - Client: Custom httpx-based `TranscriptionService` in `bot/services/transcription.py`
  - Auth: `ASSEMBLYAI_API_KEY` (required)
  - Endpoint: https://api.assemblyai.com/v2 (upload, transcript endpoints)
  - Process: Upload audio → Create transcription job → Poll until completion
  - Used by: `/voice` handler in `bot/handlers/support.py`, `bot/handlers/train.py`

## Data Storage

**Databases:**
- InsForge (PostgreSQL backend)
  - Type: Multi-tenant PostgreSQL with PostgREST API
  - Connection: HTTP/REST via PostgREST
  - Base URL: `INSFORGE_BASE_URL` env var (e.g., https://wz7ymxxu.eu-central.insforge.app)
  - Client (Backend): Custom `InsForgeClient` in `bot/storage/insforge_client.py` using httpx
  - Client (Frontend): `@insforge/sdk` (npm package) imported in `packages/webapp/src/lib/insforge.ts`
  - Authentication:
    - Anonymous requests: `INSFORGE_ANON_KEY` (JWT)
    - Authenticated requests: User JWT obtained via Edge Function (Telegram auth flow)
  - API Style: PostgREST (PostgreSQL queryable via REST)
  - Filter Operators: eq., neq., gt., gte., lt., lte., like., ilike., is., in., cs., cd., not., or., and.
  - Tables accessed via repositories:
    - `users` → `UserRepo`
    - `leads` → `LeadRegistryRepo`
    - `lead_activity` → `LeadActivityRepo`
    - `casebooks` → `CasebookRepo`
    - `support_sessions` → `SupportSessionRepo`
    - `user_memory` → `UserMemoryRepo`
    - `track_progress` → `TrackProgressRepo`
    - `attempts` → `AttemptRepo`
    - `generated_scenarios` → `GeneratedScenarioRepo`
    - `scenarios_seen` → `ScenariosSeenRepo`

**File Storage:**
- Local filesystem - Prompt templates, pipelines, scenarios, playbook
  - Location: `prompts/`, `data/` directories
  - Usage: YAML-based pipeline configs, scenario definitions, knowledge base

**Caching:**
- In-memory only via Python dict/Pydantic models
- No external cache layer (Redis, Memcached) configured

## Authentication & Identity

**Telegram Mini App (TMA):**
- Provider: Telegram auth data passed via InitData
- Implementation: `bot/middleware.py` validates Telegram auth
  - Location: `bot/middleware.py` - `AuthorizationMiddleware`
  - Validation: Telegram hash verification for user identity
- Flow:
  1. User opens Telegram Mini App
  2. InitData includes Telegram user info + hash
  3. TMA frontend: `/auth` Edge Function verifies hash, returns JWT
  4. JWT stored in memory (not localStorage)
  5. JWT used for all authenticated InsForge requests

**Authorization:**
- Username-based whitelist access control
  - `ALLOWED_USERNAMES` env var (comma-separated)
  - `ADMIN_USERNAMES` env var (comma-separated)
  - Checked in `bot/middleware.py` and handlers
- Admin-only features: `/admin`, `/stats`

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Rollbar, etc.)
- Logging via Python logging module

**Logs:**
- Python logging to stdout
  - Config: `bot/main.py` - `setup_logging()`
  - Format: "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
  - Level: Configurable via `LOG_LEVEL` env var (default INFO)
  - Loggers by module: `bot.main`, `bot.storage.insforge_client`, `bot.services.*`, etc.

**Metrics:**
- None configured (no Prometheus, CloudWatch, etc.)

## CI/CD & Deployment

**Hosting:**
- Not explicitly defined in codebase
- Expected: Cloud VM or serverless (Telegram polling requires persistent connection)

**CI Pipeline:**
- None detected (.github/workflows/, .gitlab-ci.yml absent)

**Deployment Strategy:**
- Manual (no automated pipeline)
- Python bot: Run via `source .venv/bin/activate && python -m bot.main`
- Frontend: Build with `pnpm build` → static files served as Telegram Mini App

## Environment Configuration

**Required env vars:**
- `TELEGRAM_BOT_TOKEN` - Telegram Bot API token
- `ENCRYPTION_KEY` - Fernet encryption key (base64)
- `INSFORGE_BASE_URL` - InsForge PostgREST endpoint
- `INSFORGE_ANON_KEY` - InsForge anonymous JWT
- `OPENROUTER_API_KEY` - OpenRouter LLM API key
- `ASSEMBLYAI_API_KEY` - AssemblyAI API key

**Recommended env vars:**
- `ADMIN_USERNAMES` - Admin access control
- `ALLOWED_USERNAMES` - User whitelist
- `LOG_LEVEL` - Logging verbosity
- `DEFAULT_OPENROUTER_MODEL` - Default LLM model for new users

**Optional env vars:**
- `ANTHROPIC_API_KEY` - Claude API key (for future per-user integration)

**Secrets location:**
- `.env` file (root) - Contains actual secrets, not committed
- `.env.example` - Template with placeholders for documentation

**Vite frontend env vars (prefixed with VITE_):**
- `VITE_INSFORGE_URL` - InsForge base URL for browser
- `VITE_INSFORGE_ANON_KEY` - InsForge anon key for browser
  - Exposed at build time via Vite's `import.meta.env`

## Webhooks & Callbacks

**Incoming:**
- Telegram updates: Polling mode (not webhooks)
  - Handler: `bot/main.py` - `Dispatcher.start_polling()`
  - No webhook URL or Telegram callback configuration

**Outgoing:**
- Telegram message sends: Via Telegram Bot API
  - Async requests from handlers/services
  - No callback URLs configured

**Internal Callbacks:**
- Pipeline execution callbacks in `bot/pipeline/runner.py`
- FSM state transitions via aiogram FSM

## Rate Limiting & Quotas

**Telegram:**
- Bot API rate limits (Telegram's default throttling)
- No custom rate limiting layer in code

**OpenRouter:**
- Shared key (team-wide) - MVP stage (planning per-user keys)
- No local rate limiting or quota tracking

**AssemblyAI:**
- API rate limits per plan
- No local rate limiting

**InsForge:**
- PostgREST query limits
- No explicit pagination or cursor logic observed

## Error Handling & Retries

**LLM Provider Retries:**
- Max 3 retries with exponential backoff: [1s, 3s, 8s]
  - Location: `bot/services/llm_router.py` - `MAX_RETRIES`, `RETRY_DELAYS`
  - Retries on: 429, 500, 502, 503 status codes + generic exceptions

**Transcription Retries:**
- Polling with 1.5s interval, 60s max timeout
  - Location: `bot/services/transcription.py` - `_POLL_INTERVAL`, `_MAX_POLL_TIME`

**InsForge Client:**
- httpx client timeout: 30 seconds (default)
  - Location: `bot/storage/insforge_client.py`
- No automatic retry logic (handled at service level)

---

*Integration audit: 2026-02-02*
