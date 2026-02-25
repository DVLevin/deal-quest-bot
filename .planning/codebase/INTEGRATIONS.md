# External Integrations

**Analysis Date:** 2026-02-04

## APIs & External Services

**LLM Providers:**
- OpenRouter - Free LLM tier (team-wide shared key)
  - SDK/Client: `httpx.AsyncClient` (custom implementation)
  - Auth: `OPENROUTER_API_KEY` (env var)
  - Default model: `openai/gpt-oss-120b` (free tier)
  - Endpoint: `https://openrouter.ai/api/v1/chat/completions`
  - Implementation: `bot/services/llm_router.py` (OpenRouterProvider class)
- Anthropic Claude - Premium LLM tier (user-provided keys)
  - SDK/Client: `httpx.AsyncClient` (custom implementation)
  - Auth: User's encrypted API key (stored in `users.encrypted_api_key`)
  - Default model: `claude-sonnet-4-20250514`
  - Endpoint: `https://api.anthropic.com/v1/messages`
  - Implementation: `bot/services/llm_router.py` (ClaudeProvider class)

**Voice Transcription:**
- AssemblyAI - Speech-to-text transcription
  - SDK/Client: `httpx.AsyncClient` (REST API)
  - Auth: `ASSEMBLYAI_API_KEY` (env var)
  - Endpoints: `https://api.assemblyai.com/v2/upload`, `https://api.assemblyai.com/v2/transcript`
  - Implementation: `bot/services/transcription.py` (TranscriptionService class)

**Telegram:**
- Telegram Bot API - Bot message handling
  - SDK/Client: aiogram 3.4.0+
  - Auth: `TELEGRAM_BOT_TOKEN` (env var, from @BotFather)
  - Implementation: `bot/main.py`, all handlers in `bot/handlers/`
- Telegram Mini App SDK - TMA frontend
  - SDK/Client: @telegram-apps/sdk-react 3.3.9
  - Auth: initData HMAC-SHA256 validation via `verify-telegram` edge function
  - Implementation: `packages/webapp/src/shared/hooks/` (useMainButton, useBackButton, etc.)

## Data Storage

**Databases:**
- InsForge (PostgreSQL via PostgREST)
  - Connection: `INSFORGE_BASE_URL` (env var)
  - Client (Python): `bot/storage/insforge_client.py` (InsForgeClient, custom httpx wrapper)
  - Client (TypeScript): @insforge/sdk (createClient)
  - Auth: `INSFORGE_ANON_KEY` (anon role with full-access RLS policies)
  - Tables: `users`, `user_memory`, `attempts`, `track_progress`, `support_sessions`, `scenarios_seen`, `lead_registry`, `lead_activity_log`, `casebook`, `pipeline_traces`, `pipeline_spans`
  - Repositories: `bot/storage/repositories.py` (11 repository classes)

**File Storage:**
- Local filesystem only
  - Knowledge base: `data/playbook.md`, `data/company_knowledge.md` (gitignored)
  - Training scenarios: `data/scenarios.json` (gitignored)
  - Pipeline configs: `data/pipelines/*.yaml` (committed)
  - Agent prompts: `prompts/*.txt` (committed)

**Caching:**
- None (in-memory only via Python/JS runtime)

## Authentication & Identity

**Auth Provider:**
- Custom Telegram-based authentication
  - Implementation: HMAC-SHA256 signature validation (Telegram's standard)
  - Bot: Username-based authorization via `bot/middleware.py` (AuthorizationMiddleware)
  - TMA: initData validation via `functions/verify-telegram/index.ts` edge function
  - JWT: Minted by verify-telegram function using HS256 with `JWT_SECRET`
  - Session: JWT stored in Zustand (memory-only, re-minted on TMA open)
  - User identity: `telegram_id` (bigint) as primary key across all tables

**Authorization:**
- Bot access: `ALLOWED_USERNAMES` (comma-separated list, no @ prefix)
- Admin access: `ADMIN_USERNAMES` (comma-separated list, no @ prefix)
- TMA access: All authenticated Telegram users (RLS policies filter by telegram_id)

## Monitoring & Observability

**Error Tracking:**
- None (Python logging only)

**Logs:**
- Python: Standard logging module (`bot/utils.py`, `bot/main.py`)
- Log level: `LOG_LEVEL` env var (default: INFO)
- Pipeline tracing: Custom tracing system (`bot/tracing/`) writing to `pipeline_traces` and `pipeline_spans` tables

## CI/CD & Deployment

**Hosting:**
- Railway (bot and TMA)
  - Bot: Long-running process (restart on failure, max 10 retries)
  - TMA: Static SPA serving via `serve` package
  - Auto-deploy: From remote git branch (currently `gsd/phase-01-foundation-and-auth` for TMA)

**CI Pipeline:**
- None (manual deploy via Railway git integration)

## Environment Configuration

**Required env vars:**
- `TELEGRAM_BOT_TOKEN` - Bot auth token
- `ENCRYPTION_KEY` - Fernet key for API key encryption
- `INSFORGE_BASE_URL` - InsForge project URL
- `INSFORGE_ANON_KEY` - InsForge anonymous JWT
- `OPENROUTER_API_KEY` - Shared team OpenRouter key
- `VITE_INSFORGE_URL` - TMA frontend InsForge URL (build-time)
- `VITE_INSFORGE_ANON_KEY` - TMA frontend anon key (build-time)
- `VITE_BOT_USERNAME` - Bot username for TMA deep links (build-time)

**Secrets location:**
- Bot: `.env` file (local), Railway env vars (production)
- TMA: Railway env vars (baked into bundle at build time)
- Edge functions: InsForge dashboard environment secrets (`TELEGRAM_BOT_TOKEN`, `JWT_SECRET`)

## Webhooks & Callbacks

**Incoming:**
- None (bot uses long polling, not webhooks)

**Outgoing:**
- None

## Database Access Patterns

**Bot → InsForge:**
- Protocol: HTTP(S) REST via PostgREST `/api/database/records` endpoint
- Auth: Bearer token (anon key)
- Client: Custom `InsForgeClient` wrapping httpx.AsyncClient
- Path: `bot/storage/insforge_client.py`

**TMA → InsForge:**
- Protocol: HTTP(S) REST via @insforge/sdk
- Auth: Anon key (no JWT used for queries despite verify-telegram minting one)
- Client: @insforge/sdk createClient
- Path: `packages/webapp/src/lib/insforge.ts`
- Note: Per-user isolation enforced at query level (filter by telegram_id from Zustand store)

**Edge Functions → InsForge:**
- Protocol: Internal HTTP via `INSFORGE_INTERNAL_URL` (http://insforge:7130)
- Auth: Anon key from `ANON_KEY` env var
- Client: Deno-injected createClient (InsForge runtime)
- Path: `functions/db-proxy.js`, `functions/verify-telegram/index.ts`

## Security Notes

**Known Compromise:**
- Bot uses anon key (not service role) for database access
- Anon key has full-access RLS policies (`anon_full_*` policies in `migrations/001_*.sql`)
- TMA frontend uses same anon key (exposed in JS bundle)
- Migration path: Move bot to service role key, remove anon full-access policies (future phase)
- Documented in: `functions/verify-telegram/index.ts` (TODO comment), `migrations/001_*.sql` (policy comments)

**Encryption:**
- User API keys: Encrypted with Fernet (symmetric encryption) before storage
- Key: `ENCRYPTION_KEY` env var (generated via `Fernet.generate_key()`)
- Implementation: `bot/services/crypto.py` (CryptoService class)

---

*Integration audit: 2026-02-04*
