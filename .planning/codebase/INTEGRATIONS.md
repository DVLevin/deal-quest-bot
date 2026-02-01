# External Integrations

**Analysis Date:** 2026-02-01

## APIs & External Services

**AI/LLM Services:**
- OpenRouter - AI model provider for LLM completions
  - SDK/Client: `openai` package (SDK compatible with OpenRouter)
  - Auth: `OPENROUTER_API_KEY` environment variable
  - Implementation: `insforge/backend/src/providers/ai/openrouter.provider.ts`
  - Route: `POST /api/ai/chat` - Chat completions endpoint

**OAuth & Identity Providers:**
- Google OAuth 2.0
  - Auth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` environment variables
  - Implementation: `insforge/backend/src/providers/oauth/google.provider.ts`
  - SDK: `google-auth-library`

- GitHub OAuth
  - Auth: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` environment variables
  - Implementation: `insforge/backend/src/providers/oauth/github.provider.ts`

- Microsoft Azure OAuth
  - Auth: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` environment variables
  - Implementation: `insforge/backend/src/providers/oauth/microsoft.provider.ts`

- Discord OAuth
  - Auth: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` environment variables
  - Implementation: `insforge/backend/src/providers/oauth/discord.provider.ts`

- LinkedIn OAuth
  - Auth: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` environment variables
  - Implementation: `insforge/backend/src/providers/oauth/linkedin.provider.ts`

- X (Twitter) OAuth
  - Auth: `X_CLIENT_ID`, `X_CLIENT_SECRET` environment variables
  - Implementation: `insforge/backend/src/providers/oauth/x.provider.ts`

- Apple OAuth
  - Auth: `APPLE_CLIENT_ID` (Services ID), `APPLE_CLIENT_SECRET` (JSON with teamId, keyId, privateKey)
  - Implementation: `insforge/backend/src/providers/oauth/apple.provider.ts`

- Facebook OAuth (stub)
  - Implementation: `insforge/backend/src/providers/oauth/facebook.provider.ts`

**Base OAuth Architecture:**
- Abstract base class: `insforge/backend/src/providers/oauth/base.provider.ts`
- Service management: `insforge/backend/src/services/auth/oauth-config.service.ts`
- PKCE flow support: `insforge/backend/src/services/auth/oauth-pkce.service.ts`

## Data Storage

**Primary Database:**
- PostgreSQL 12+
  - Connection config: `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
  - Client: `pg` package
  - Manager: `insforge/backend/src/infra/database/database.manager.ts` (singleton pattern)
  - Connection pool: 20 max connections, 30s idle timeout, 2s connection timeout
  - Migrations: `node-pg-migrate` (location: `insforge/backend/src/infra/database/migrations/`)
  - Schema validation: `libpg-query` for SQL parsing and validation

**Database Features:**
- System schema for migrations: `system.migrations` table
- Multi-tenant support: Cloud provider integration at `insforge/backend/src/providers/database/cloud.provider.ts`
- Type mapping utilities: `DatabaseManager.getColumnTypeMap()` for schema introspection

**File Storage:**

*Option 1: AWS S3 (Cloud)*
- Service: AWS S3 or S3-compatible services (MinIO, DigitalOcean Spaces, etc.)
- Config: `AWS_S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- Custom endpoint: `AWS_ENDPOINT_URL` (for S3-compatible services)
- SDK/Client: `@aws-sdk/client-s3`
- Implementation: `insforge/backend/src/providers/storage/s3.provider.ts`
- Features:
  - Presigned URLs (7-day expiration by default)
  - Presigned POST uploads
  - CloudFront URL signing with `@aws-sdk/cloudfront-signer`
  - Max upload size: 10MB default

*Option 2: Local Filesystem*
- Location: `./data/storage` directory (created at startup)
- Implementation: `insforge/backend/src/providers/storage/local.provider.ts`
- Fallback: Used when AWS credentials not provided
- Service: `insforge/backend/src/services/storage/storage.service.ts`

**Caching:**
- Not detected - relies on application-level caching with @tanstack/react-query on frontend

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based (self-hosted)
  - Token management: `insforge/backend/src/infra/security/token.manager.ts`
  - Signup/login: `insforge/backend/src/api/routes/auth/`
  - Implementation: `jsonwebtoken` and `jose` packages
  - Admin user: Configured via `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables

**Built-in Auth UI:**
- Auth service: `insforge/auth/` workspace
  - Provides dedicated authentication pages
  - Uses @insforge/react and @insforge/sdk packages

**Token Encryption:**
- Secret: `JWT_SECRET` (32+ character requirement)
- Fallback encryption key: `ENCRYPTION_KEY` (falls back to JWT_SECRET if not provided)
- Used for: JWT signing, database secret encryption, sensitive data storage

## Monitoring & Observability

**Error Tracking & Analytics:**
- PostHog - Product analytics and error tracking (optional, feature-flagged)
  - SDK: `posthog-js`
  - Config key: `VITE_PUBLIC_POSTHOG_KEY` (frontend only)
  - Enabled only if key is provided
  - Implementation: `insforge/frontend/src/lib/analytics/posthog.tsx`
  - Session recording available (can capture cross-origin iframes)

**Logging:**

*Option 1: AWS CloudWatch (Production)*
- Service: AWS CloudWatch Logs
- Config: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- Log group: `CLOUDWATCH_LOG_GROUP` env var (defaults to `/insforge/local`)
- SDK/Client: `@aws-sdk/client-cloudwatch-logs`
- Features:
  - Log stream queries
  - Log filtering
  - Insights queries
  - Automatic log group creation if needed
- Implementation: `insforge/backend/src/providers/logs/cloudwatch.provider.ts`

*Option 2: File-based Logging (Local/Self-hosted)*
- Directory: `LOGS_DIR` environment variable (defaults to `./logs`)
- Framework: `winston` (logging library)
- Implementation: `insforge/backend/src/providers/logs/local.provider.ts`
- Fallback: Used when AWS credentials not provided

**Application Logging:**
- Logger utility: `insforge/backend/src/utils/logger.ts` (winston-based)
- Used throughout backend for debug, info, and error logging

## Real-time Communication

**WebSocket (Socket.IO):**
- Library: `socket.io` 4.8.1 (backend), `socket.io-client` 4.8.1 (frontend)
- Manager: `insforge/backend/src/infra/socket/socket.manager.ts`
- Features:
  - CORS enabled for cross-origin connections
  - Authentication via JWT tokens
  - Channel-based subscriptions
  - Event-driven architecture
- Message types: `insforge/backend/src/types/socket.ts`

**Webhook Delivery (Outgoing Events):**
- Sender: `insforge/backend/src/infra/realtime/webhook-sender.ts`
- HTTP client: `axios`
- Features:
  - Retry logic (up to 2 retries)
  - 10-second timeout per request
  - Custom headers: `X-InsForge-Event`, `X-InsForge-Channel`, `X-InsForge-Message-Id`
  - Parallel delivery to multiple webhook URLs
- Use case: Event notifications to external systems

## CI/CD & Deployment

**Hosting:**
- Self-hosted Node.js application
- Container-ready (Express server)
- Build output: `dist/server.js` (ESM format)

**Serverless Functions:**
- Platform: Deno Deploy via Deno Subhosting
- Config: `DENO_SUBHOSTING_TOKEN`, `DENO_SUBHOSTING_ORG_ID`
- Implementation: `insforge/backend/src/providers/functions/deno-subhosting.provider.ts`
- Runtime: Deno (TypeScript-native)
- Configuration: `insforge/functions/deno.json`
- Base API: `https://api.deno.com/v1`

**Release Management:**
- Tool: `release-it` with conventional changelog
- Automated versioning and release notes generation

## Multi-tenant Cloud Configuration

**Cloud Deployment Variables:**
- `DEPLOYMENT_ID` - Unique deployment identifier
- `PROJECT_ID` - Cloud project identifier
- `APP_KEY` - Application API key for cloud integration
- `CLOUD_API_HOST` - Cloud API endpoint (default: https://api.insforge.dev)

**Cloud Database Provider:**
- Implementation: `insforge/backend/src/providers/database/cloud.provider.ts`
- Uses Axios for cloud API communication
- Handles cloud-hosted database connections

## Email Service

**Email Delivery:**
- Base provider interface: `insforge/backend/src/providers/email/base.provider.ts`
- Cloud provider implementation: `insforge/backend/src/providers/email/cloud.provider.ts`
- Route: `POST /api/email/send`
- Features:
  - Template-based email sending
  - Raw email support (optional)
  - Email validation and throttling

## Environment-Based Integration Selection

The application uses environment variables to dynamically select integration providers:

**Storage Decision Logic:**
- If `AWS_S3_BUCKET` and AWS credentials provided → Use S3
- Otherwise → Use local filesystem

**Logging Decision Logic:**
- If `AWS_REGION` and AWS credentials provided → Use CloudWatch
- Otherwise → Use file-based logging in `LOGS_DIR`

**Email Provider Selection:**
- Cloud environment: Cloud provider implementation
- Self-hosted: Custom provider implementation

**AI Provider Selection:**
- OpenRouter (via `OPENROUTER_API_KEY`)
- Cloud credentials fallback available

---

*Integration audit: 2026-02-01*
