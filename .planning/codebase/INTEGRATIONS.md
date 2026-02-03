# External Integrations

**Analysis Date:** 2026-02-02

## APIs & External Services

**LLM Providers:**
- OpenRouter - AI model provider (free models, team-wide key)
  - SDK/Client: `httpx` async HTTP client
  - Auth: `OPENROUTER_API_KEY` environment variable (bot), `OPENROUTER_API_KEY` (InsForge)
  - Implementation: `deal-quest-bot/bot/services/llm_router.py` (OpenRouterProvider class)
  - Models: `moonshotai/kimi-k2.5` (default), `openai/gpt-oss-120b`, `google/gemini-flash`
  - Endpoint: `https://openrouter.ai/api/v1`
  - Web research: `x-ai/grok-4.1-fast` with web plugin for prospect research
  - Retry logic: 3 attempts with exponential backoff (1s, 3s, 8s)

- Anthropic Claude API - Premium LLM provider
  - SDK/Client: `anthropic` package (Python), `httpx` for direct API calls
  - Auth: User-provided API key (stored encrypted with Fernet)
  - Implementation: `deal-quest-bot/bot/services/llm_router.py` (ClaudeProvider class)
  - Model: `claude-sonnet-4-20250514`
  - Endpoint: `https://api.anthropic.com/v1/messages`
  - API version: `2023-06-01`

- OpenRouter (InsForge) - AI integration for InsForge backend
  - SDK: `openai` package (OpenAI-compatible)
  - Implementation: `insforge/insforge/backend/src/providers/ai/openrouter.provider.ts`
  - Route: `POST /api/ai/chat` - Chat completions endpoint

**Voice Transcription:**
- AssemblyAI - Speech-to-text transcription service
  - SDK/Client: `httpx` async HTTP client
  - Auth: `ASSEMBLYAI_API_KEY` environment variable
  - Implementation: `deal-quest-bot/bot/services/transcription.py` (TranscriptionService class)
  - Upload endpoint: `https://api.assemblyai.com/v2/upload`
  - Transcript endpoint: `https://api.assemblyai.com/v2/transcript`
  - Polling: 1.5s interval, 60s max timeout
  - Use case: Voice message transcription for bot users

**Telegram Bot API:**
- Telegram Bot Platform - Chat bot framework
  - SDK/Client: `aiogram` 3.4.0+ (async Python framework)
  - Auth: `TELEGRAM_BOT_TOKEN` (get from @BotFather)
  - Mode: Long polling (not webhooks)
  - Implementation: `deal-quest-bot/bot/main.py` (Dispatcher, Bot)
  - File download: Telegram Bot API file endpoint

**Telegram Mini App API:**
- Telegram Mini App Platform - In-chat web app
  - SDK/Client: `@telegram-apps/sdk-react` 3.3.9
  - Implementation: `deal-quest-bot/packages/webapp/src/lib/telegram.ts`
  - Features: BackButton, MainButton, SecondaryButton, ThemeParams, Viewport, SwipeBehavior
  - Launch params: `retrieveLaunchParams()` for initData extraction
  - Authentication: HMAC-SHA256 signature validation in Edge Function

**OAuth & Identity Providers (InsForge):**
- Google OAuth 2.0
  - Auth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - Implementation: `insforge/insforge/backend/src/providers/oauth/google.provider.ts`
  - SDK: `google-auth-library` 10.1.0

- GitHub OAuth
  - Auth: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
  - Implementation: `insforge/insforge/backend/src/providers/oauth/github.provider.ts`

- Microsoft Azure OAuth
  - Auth: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`
  - Implementation: `insforge/insforge/backend/src/providers/oauth/microsoft.provider.ts`

- Discord OAuth
  - Auth: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`
  - Implementation: `insforge/insforge/backend/src/providers/oauth/discord.provider.ts`

- LinkedIn OAuth
  - Auth: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`
  - Implementation: `insforge/insforge/backend/src/providers/oauth/linkedin.provider.ts`

- X (Twitter) OAuth
  - Auth: `X_CLIENT_ID`, `X_CLIENT_SECRET`
  - Implementation: `insforge/insforge/backend/src/providers/oauth/x.provider.ts`

- Apple OAuth
  - Auth: `APPLE_CLIENT_ID` (Services ID), `APPLE_CLIENT_SECRET` (JSON with teamId, keyId, privateKey)
  - Implementation: `insforge/insforge/backend/src/providers/oauth/apple.provider.ts`

- Facebook OAuth (stub)
  - Implementation: `insforge/insforge/backend/src/providers/oauth/facebook.provider.ts`

**Base OAuth Architecture:**
- Abstract base class: `insforge/insforge/backend/src/providers/oauth/base.provider.ts`
- Service management: `insforge/insforge/backend/src/services/auth/oauth-config.service.ts`
- PKCE flow support: `insforge/insforge/backend/src/services/auth/oauth-pkce.service.ts`

## Data Storage

**Primary Database:**
- PostgreSQL 15.13.1 (self-hosted via InsForge)
  - Connection config (bot): `INSFORGE_BASE_URL`, `INSFORGE_ANON_KEY`
  - Connection config (InsForge): `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
  - Client (bot): `httpx` via PostgREST API wrapper
  - Client (InsForge): `pg` 8.16.3 (node-postgres)
  - Implementation (bot): `deal-quest-bot/bot/storage/insforge_client.py` (InsForgeClient class)
  - Implementation (InsForge): `insforge/insforge/backend/src/infra/database/database.manager.ts`
  - API endpoint: `/api/database/records/{table}` (PostgREST proxy)
  - Connection pool: 20 max connections, 30s idle timeout, 2s connection timeout
  - Migrations: `node-pg-migrate` (location: `insforge/insforge/backend/src/infra/database/migrations/`)
  - Schema validation: `libpg-query` 17.6.0 for SQL parsing

**Database Features:**
- System schema for migrations: `system.migrations` table
- Multi-tenant support: Cloud provider integration at `insforge/insforge/backend/src/providers/database/cloud.provider.ts`
- Type mapping utilities: `DatabaseManager.getColumnTypeMap()` for schema introspection
- Row-level security (RLS): JWT-based policies (anon/authenticated roles)
- Anon key: Full-access policies for bot (security compromise, see verify-telegram TODO)

**Database Tables (deal-quest-bot):**
9 tables total:
- `users` - User profiles and Telegram info
- `user_memory` - Conversation history and context
- `scenarios_seen` - Training scenario tracking
- `attempts` - Training attempt records
- `support_sessions` - Deal analysis sessions
- `track_progress` - Learning track progress
- `casebook` - Reusable response library
- `pipeline_traces` - Pipeline execution traces (observability)
- `pipeline_spans` - Step-level timing spans (observability)

**File Storage:**

*Option 1: AWS S3 (Cloud)*
- Service: AWS S3 or S3-compatible services (MinIO, DigitalOcean Spaces, etc.)
- Config: `AWS_S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- Custom endpoint: `AWS_ENDPOINT_URL` (for S3-compatible services)
- SDK/Client: `@aws-sdk/client-s3` 3.713.0
- Implementation: `insforge/insforge/backend/src/providers/storage/s3.provider.ts`
- Features:
  - Presigned URLs (7-day expiration by default)
  - Presigned POST uploads
  - CloudFront URL signing with `@aws-sdk/cloudfront-signer`
  - Max upload size: 10MB default

*Option 2: Local Filesystem*
- Location: `./data/storage` directory (created at startup)
- Implementation: `insforge/insforge/backend/src/providers/storage/local.provider.ts`
- Fallback: Used when AWS credentials not provided
- Service: `insforge/insforge/backend/src/services/storage/storage.service.ts`
- Config: `STORAGE_DIR` environment variable (defaults to `/insforge-storage` in Docker)

**Caching:**
- Application-level only: `@tanstack/react-query` on frontend (TMA webapp, InsForge dashboard)
- No Redis or Memcached detected

## Authentication & Identity

**Bot Authentication:**
- Access control: Username whitelist
  - Config: `ADMIN_USERNAMES`, `ALLOWED_USERNAMES` (comma-separated, without @)
  - Implementation: `deal-quest-bot/bot/middleware.py` (username authorization)
  - Behavior: Empty ALLOWED_USERNAMES allows everyone

**TMA Authentication:**
- Telegram Mini App signature validation
  - Algorithm: HMAC-SHA256 with bot token
  - Implementation: `deal-quest-bot/functions/verify-telegram/index.ts` (Deno Edge Function)
  - Steps: Parse initData → Verify hash → Check freshness (1 hour max) → Upsert user → Mint JWT
  - JWT signing: `jose` package (HS256, 1 hour expiry)
  - JWT secret: `JWT_SECRET` environment variable
  - Response: JWT + user object

**InsForge Authentication:**
- Custom JWT-based (self-hosted)
  - Token management: `insforge/insforge/backend/src/infra/security/token.manager.ts`
  - Signup/login: `insforge/insforge/backend/src/api/routes/auth/`
  - Implementation: `jsonwebtoken` 9.0.2 and `jose` 6.1.0 packages
  - Admin user: Configured via `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables
  - Password hashing: `bcryptjs` 3.0.2

**Built-in Auth UI:**
- Auth service: `insforge/insforge/auth/` workspace
  - Provides dedicated authentication pages
  - Uses `@insforge/react` 1.1.7 and `@insforge/sdk` 1.1.3 packages

**Token Encryption:**
- Secret: `JWT_SECRET` (32+ character requirement)
- Fallback encryption key: `ENCRYPTION_KEY` (falls back to JWT_SECRET if not provided)
- Used for: JWT signing, database secret encryption, sensitive data storage
- Bot API keys: Fernet encryption (cryptography package, `ENCRYPTION_KEY`)

**API Key Storage (Bot):**
- User-provided API keys stored encrypted in `users` table
- Encryption: Fernet symmetric encryption (cryptography package)
- Implementation: `deal-quest-bot/bot/services/crypto.py`
- Key: `ENCRYPTION_KEY` environment variable (32-byte base64)

## Monitoring & Observability

**Error Tracking & Analytics:**
- PostHog - Product analytics and error tracking (optional, feature-flagged)
  - SDK: `posthog-js` 1.302.2
  - Config key: `VITE_PUBLIC_POSTHOG_KEY` (frontend only)
  - Enabled only if key is provided
  - Implementation: `insforge/insforge/frontend/src/lib/analytics/posthog.tsx`
  - Session recording available (can capture cross-origin iframes)

**Logging:**

*Option 1: AWS CloudWatch (Production)*
- Service: AWS CloudWatch Logs
- Config: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- Log group: `CLOUDWATCH_LOG_GROUP` env var (defaults to `/insforge/local`)
- SDK/Client: `@aws-sdk/client-cloudwatch-logs` 3.713.0
- Features:
  - Log stream queries
  - Log filtering
  - Insights queries
  - Automatic log group creation if needed
- Implementation: `insforge/insforge/backend/src/providers/logs/cloudwatch.provider.ts`

*Option 2: File-based Logging (Local/Self-hosted)*
- Directory: `LOGS_DIR` environment variable (defaults to `./logs`)
- Framework: `winston` 3.17.0 (logging library)
- Implementation: `insforge/insforge/backend/src/providers/logs/local.provider.ts`
- Fallback: Used when AWS credentials not provided
- Bot logging: Python logging module with `LOG_LEVEL` (default: INFO)

*Option 3: Docker Log Collection*
- Service: Vector.dev (timberio/vector:0.28.1-alpine)
- Config: `docker-compose.yml` vector service
- Collects logs from all Docker containers
- Ships to AWS CloudWatch or file-based storage

**Application Logging:**
- Logger utility: `insforge/insforge/backend/src/utils/logger.ts` (winston-based)
- Bot logger: Python logging module configured in `deal-quest-bot/bot/main.py`
- Used throughout backend for debug, info, and error logging

**Pipeline Tracing (Bot):**
- Custom tracing system for agent pipelines
  - Context manager: `deal-quest-bot/bot/tracing/context.py` (TraceContext, async context manager)
  - Decorator: `@traced_span` for agent steps and LLM calls
  - Collector: `deal-quest-bot/bot/tracing/collector.py` (TraceCollector, batched background flush)
  - Models: `deal-quest-bot/bot/tracing/models.py` (TraceModel, SpanModel)
  - Storage: `pipeline_traces`, `pipeline_spans` tables in InsForge
  - Implementation: ContextVar propagation across async calls

## Real-time Communication

**WebSocket (Socket.IO):**
- Library: `socket.io` 4.8.1 (backend), `socket.io-client` 4.8.1 (frontend)
- Manager: `insforge/insforge/backend/src/infra/socket/socket.manager.ts`
- Features:
  - CORS enabled for cross-origin connections
  - Authentication via JWT tokens
  - Channel-based subscriptions
  - Event-driven architecture
- Message types: `insforge/insforge/backend/src/types/socket.ts`
- Use case: Real-time dashboard updates, notifications

**Webhook Delivery (Outgoing Events):**
- Sender: `insforge/insforge/backend/src/infra/realtime/webhook-sender.ts`
- HTTP client: `axios` 1.11.0
- Features:
  - Retry logic (up to 2 retries)
  - 10-second timeout per request
  - Custom headers: `X-InsForge-Event`, `X-InsForge-Channel`, `X-InsForge-Message-Id`
  - Parallel delivery to multiple webhook URLs
- Use case: Event notifications to external systems

## CI/CD & Deployment

**Bot Hosting:**
- Platform: Railway
- Builder: Nixpacks
- Config: `deal-quest-bot/railway.toml`
- Start command: `python3 -m bot.main`
- Restart policy: ON_FAILURE (max 10 retries)
- Python version: 3.11

**TMA Webapp Hosting:**
- Platform: Railway (static SPA via `serve` package)
- Config: `deal-quest-bot/packages/webapp/railway.toml`
- Root directory: `packages/webapp` (Railway `root_dir` isolation — cannot access `../shared`)
- Build command: `pnpm install && pnpm build`
- Start command: `serve dist -s -l tcp://0.0.0.0:${PORT:-8080}`
- Build output: `dist/` (ES2020 target)
- Build env vars: `VITE_INSFORGE_URL`, `VITE_INSFORGE_ANON_KEY` (baked into client bundle)
- Shared types: Inlined into `packages/webapp/src/types/` (copy of `packages/shared/src/`) due to root_dir isolation
- HTTPS required: Telegram Mini Apps require secure context
- Deploy trigger: Push to remote branch — Railway auto-deploys on push

**InsForge Hosting:**
- Platform: Self-hosted Node.js application or Docker
- Container-ready: Express server
- Build output: `dist/server.js` (ESM format)
- Ports: 7130 (backend), 7131 (frontend), 7132 (auth), 7133 (Deno functions)

**Serverless Functions:**
- Platform: Deno Deploy via Deno Subhosting (InsForge)
- Platform: InsForge Deno runtime (deal-quest-bot)
- Config: `DENO_SUBHOSTING_TOKEN`, `DENO_SUBHOSTING_ORG_ID` (cloud)
- Implementation: `insforge/insforge/backend/src/providers/functions/deno-subhosting.provider.ts`
- Runtime: Deno (TypeScript-native)
- Configuration: `insforge/insforge/functions/deno.json`
- Base API: `https://api.deno.com/v1` (cloud)
- Local: Docker container on port 7133

**Edge Functions (deal-quest-bot):**
- Runtime: Deno 2.0.6 (InsForge runtime)
- Functions:
  - `db-proxy.js` - Database proxy for Python bot (CommonJS)
  - `verify-telegram/index.ts` - Telegram Mini App auth verification (TypeScript)
- Injected globals: `createClient` (InsForge SDK factory)
- Environment: `TELEGRAM_BOT_TOKEN`, `JWT_SECRET`, `ANON_KEY`, `INSFORGE_INTERNAL_URL`

**Release Management:**
- Tool: `release-it` 19.0.4 with conventional changelog
- Automated versioning and release notes generation
- Location: InsForge monorepo only

## Multi-tenant Cloud Configuration (InsForge)

**Cloud Deployment Variables:**
- `DEPLOYMENT_ID` - Unique deployment identifier
- `PROJECT_ID` - Cloud project identifier
- `APP_KEY` - Application API key for cloud integration
- `CLOUD_API_HOST` - Cloud API endpoint (default: https://api.insforge.dev)
- `ACCESS_API_KEY` - Access API key (starts with `ik_`)

**Cloud Database Provider:**
- Implementation: `insforge/insforge/backend/src/providers/database/cloud.provider.ts`
- Uses Axios for cloud API communication
- Handles cloud-hosted database connections

**Cloud Email Provider:**
- Implementation: `insforge/insforge/backend/src/providers/email/cloud.provider.ts`
- Base provider interface: `insforge/insforge/backend/src/providers/email/base.provider.ts`
- Route: `POST /api/email/send`
- Features:
  - Template-based email sending
  - Raw email support (optional)
  - Email validation and throttling

## Environment-Based Integration Selection

The application uses environment variables to dynamically select integration providers:

**LLM Provider Selection (Bot):**
- OpenRouter: `OPENROUTER_API_KEY` (shared team key, free models)
- Claude: User-provided API key (stored encrypted)
- Default model: `DEFAULT_OPENROUTER_MODEL` (default: `openai/gpt-oss-120b`)

**Storage Decision Logic:**
- If `AWS_S3_BUCKET` and AWS credentials provided → Use S3
- Otherwise → Use local filesystem

**Logging Decision Logic:**
- If `AWS_REGION` and AWS credentials provided → Use CloudWatch
- Otherwise → Use file-based logging in `LOGS_DIR`

**Email Provider Selection:**
- Cloud environment: Cloud provider implementation
- Self-hosted: Custom provider implementation

**AI Provider Selection (InsForge):**
- OpenRouter (via `OPENROUTER_API_KEY`)
- Cloud credentials fallback available

## Environment Configuration

**Bot Required:**
- `TELEGRAM_BOT_TOKEN` - Bot token from @BotFather
- `ENCRYPTION_KEY` - Fernet key for API key encryption (32-byte base64)
- `INSFORGE_BASE_URL` - InsForge project URL
- `INSFORGE_ANON_KEY` - InsForge anonymous JWT

**Bot Optional:**
- `OPENROUTER_API_KEY` - Shared OpenRouter key for Quick Setup
- `DEFAULT_OPENROUTER_MODEL` - Default model for new users
- `ADMIN_USERNAMES` - Admin Telegram usernames (comma-separated)
- `ALLOWED_USERNAMES` - Allowed Telegram usernames (empty = allow all)
- `ASSEMBLYAI_API_KEY` - AssemblyAI for voice transcription
- `LOG_LEVEL` - Logging level (default: INFO)

**TMA Required:**
- `VITE_INSFORGE_URL` - InsForge URL for TMA frontend
- `VITE_INSFORGE_ANON_KEY` - InsForge anonymous key for TMA frontend

**InsForge Required:**
- `JWT_SECRET` - JWT signing secret (32+ chars)
- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` - Admin account credentials

**Secrets Location:**
- Bot: `.env` file (gitignored)
- TMA: `.env` file with `VITE_*` prefix (exposed to client bundle)
- InsForge: `.env` file or environment variables
- Docker: `docker-compose.yml` environment section

---

*Integration audit: 2026-02-02*
