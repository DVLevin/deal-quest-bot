# Technology Stack

**Analysis Date:** 2026-02-02

## Languages

**Primary:**
- Python 3.11+ (deployed) / 3.13 (local) - Telegram bot backend (`deal-quest-bot/bot/`)
- TypeScript 5.3.3+ - InsForge backend, frontend, auth service
- TypeScript 5.9+ - TMA webapp, shared types

**Secondary:**
- JavaScript (ES2022+) - InsForge Edge Functions (CommonJS modules), runtime execution
- Deno TypeScript - Serverless function runtime

## Runtime

**Python Bot:**
- Python 3.11 (Railway deployment via `deal-quest-bot/railway.toml`)
- Python 3.13.0 (local development environment)
- Virtual environment: `.venv` (not tracked in repo)

**Node.js Ecosystem:**
- Node.js 23.3.0 (local), Node 20-alpine (InsForge Docker)
- Package Manager: pnpm 10.28.2 (deal-quest-bot monorepo)
- Package Manager: npm (InsForge monorepo)
- Lockfile: `pnpm-lock.yaml` (deal-quest-bot), `package-lock.json` (InsForge)

**Edge Functions:**
- Deno 2.0.6 (alpine) - InsForge serverless runtime
- Config: `insforge/insforge/functions/deno.json`
- Runtime container: port 7133

**Database Runtime:**
- PostgreSQL 15.13.1 (ghcr.io/insforge/postgres:v15.13.1)
- PostgREST v12.2.12 (postgrest/postgrest container)

## Frameworks

**Python Bot (deal-quest-bot/bot/):**
- aiogram 3.4.0+ - Async Telegram bot framework (polling-based)
- pydantic 2.6.0+ - Data validation and settings management
- pydantic-settings 2.2.0+ - Environment variable loading with BaseSettings

**TMA Webapp (deal-quest-bot/packages/webapp/):**
- React 18.3.1 - UI framework
- Vite 7.3.0 - Build tool and dev server
- React Router 7.12.0 - Client-side routing
- @vitejs/plugin-react-swc - Fast React transforms with SWC

**InsForge Backend (insforge/insforge/backend/):**
- Express 4.19.2 - Node.js web framework
- PostgREST v12.2.12 - PostgreSQL REST API (via Docker container)
- Socket.IO 4.8.1 - Real-time bidirectional communication

**InsForge Frontend (insforge/insforge/frontend/):**
- React 19.2.1 - Admin dashboard
- Vite 7.0.5 - Build tool
- React Router DOM 7.7.0 - Routing

**InsForge Auth (insforge/insforge/auth/):**
- React 19.2.1 - Authentication UI
- @insforge/react 1.1.7 - InsForge React components
- @insforge/sdk 1.1.3 - InsForge client SDK
- Vite 7.0.5 - Build tool

**Testing:**
- Vitest 3.2.4 - Test runner (InsForge backend, frontend)
- Testing Library (React) 16.3.0 - Component testing utilities
- jsdom 26.1.0 - DOM environment for tests

**Build/Dev:**
- tsup 8.5.0 - TypeScript bundler (InsForge backend)
- tsx 4.7.1 - TypeScript execution for Node.js
- Tailwind CSS 4.1.0+ - Utility-first CSS framework
- @tailwindcss/vite 4.1.11 - Vite plugin for Tailwind 4
- Concurrently 8.2.2 - Run multiple npm scripts in parallel

**Code Quality:**
- ESLint 9.31.0 - Linting (with TypeScript and React plugins)
- Prettier 3.6.2 - Code formatting
- TypeScript ESLint 8.38.0 - TypeScript-aware linting rules

## Key Dependencies

**Python Bot:**
- httpx 0.27.0+ - Async HTTP client (InsForge, OpenRouter, AssemblyAI)
- anthropic 0.40.0+ - Claude API client
- cryptography 42.0.0+ - Fernet encryption for API key storage
- python-dotenv 1.0.1+ - Environment variable loading
- pyyaml 6.0.1+ - YAML parsing for pipelines and memory

**TMA Webapp:**
- @insforge/sdk latest - InsForge client SDK
- @telegram-apps/sdk-react 3.3.9 - Telegram Mini App SDK
- @tanstack/react-query 5.90.0 - Server state management
- zustand 5.0.10 - Client state management
- lucide-react 0.562.0 - Icon library
- class-variance-authority 0.7.0 - Variant-based component styling
- tailwind-merge 3.0.0 - Tailwind class merging utility
- clsx 2.0.0 - Conditional classname utility
- eruda 3.4.3 - Mobile browser dev tools
- vite-plugin-mkcert 1.17.8 - HTTPS dev server certificates
- vite-tsconfig-paths latest - TypeScript path resolution

**Shared Types:**
- TypeScript 5.9.0 - Type definitions only (no runtime dependencies)

**InsForge Backend:**
- pg 8.16.3 - PostgreSQL client
- pg-format 1.0.4 - SQL query formatting
- node-pg-migrate 8.0.3 - Database migration tool
- jsonwebtoken 9.0.2 - JWT signing/verification
- jose 6.1.0 - JWT utilities (used in Edge Functions)
- bcryptjs 3.0.2 - Password hashing
- winston 3.17.0 - Logging framework
- zod 3.23.8 - Schema validation
- @aws-sdk/client-s3 3.713.0 - S3 storage client
- @aws-sdk/client-cloudwatch-logs 3.713.0 - CloudWatch logging
- @aws-sdk/cloudfront-signer 3.901.0 - CloudFront URL signing
- express-rate-limit 7.1.5 - API rate limiting
- multer 2.0.2 - File upload handling
- openai 5.19.1 - OpenRouter/OpenAI SDK for AI integration
- axios 1.11.0 - HTTP client for external APIs
- cors 2.8.5 - CORS middleware
- cookie-parser 1.4.7 - Cookie parsing middleware
- libpg-query 17.6.0 - SQL parsing and validation
- @databases/sql 3.3.0 - SQL query builder
- @databases/split-sql-query 1.0.4 - SQL parsing utilities
- google-auth-library 10.1.0 - Google OAuth integration
- cron-parser 5.4.0 - Cron expression parsing
- csv-parse 6.1.0 - CSV parsing
- adm-zip 0.5.16 - ZIP file operations
- dotenv 16.4.5 - Environment variable loading

**InsForge Frontend:**
- @radix-ui/* - Headless UI components (dialogs, dropdowns, etc.)
- @tanstack/react-query 5.83.0 - Server state management
- socket.io-client 4.8.1 - WebSocket client for real-time updates
- @uiw/react-codemirror 4.25.2 - Code editor component
- @codemirror/lang-javascript 6.2.4 - JavaScript syntax highlighting
- @codemirror/lang-sql 6.10.0 - SQL syntax highlighting
- @xyflow/react 12.8.4 - Flow diagram visualization
- react-data-grid 7.0.0-beta.47 - Data grid component
- react-hook-form 7.61.1 - Form state management
- @hookform/resolvers 5.1.1 - Validation resolvers
- posthog-js 1.302.2 - Product analytics (optional)
- uuid 11.1.0 - UUID generation
- date-fns 4.1.0 - Date manipulation
- clsx 2.1.1 - Conditional classname utility
- tailwind-merge 3.3.1 - TailwindCSS utility merging
- tailwindcss-animate 1.0.7 - Tailwind animation utilities

**Monorepo Tooling:**
- pnpm workspaces - Monorepo package management (deal-quest-bot)
- npm workspaces - Monorepo package management (InsForge)
- concurrently 8.2.2 - Run multiple dev servers
- rimraf 5.0.5 - Cross-platform file deletion
- release-it 19.0.4 - Automated versioning and changelog
- @release-it/conventional-changelog 10.0.1 - Changelog generation
- dotenv-cli 10.0.0 - CLI for dotenv
- cross-env 7.0.3 - Cross-platform environment variable setting

## Configuration

**Environment:**
- Python: `.env` via pydantic-settings (`deal-quest-bot/bot/config.py`)
- Node.js: `.env` via dotenv (InsForge)
- Vite: `VITE_*` prefix for client-side exposure
- Docker: `docker-compose.yml` with env interpolation

**Build:**
- Python: No build step (interpreted)
- TMA Webapp: `vite.config.ts` - ES2020 target, SWC transforms, Tailwind 4, mkcert, path aliases
- InsForge Backend: `tsup.config.ts` - ESM output, node20 target
- InsForge Frontend/Auth: `vite.config.ts` - Tailwind 4, React

**TypeScript:**
- Monorepo root: `insforge/insforge/tsconfig.json` (shared base config)
- TMA: `deal-quest-bot/packages/webapp/tsconfig.json` - ES2020, bundler resolution, path aliases (`@/*` → `./src/*`)
- Shared types: `deal-quest-bot/packages/shared/tsconfig.json` - No emit, type definitions only
- InsForge: Per-package tsconfig.json files with workspace references

**Python:**
- Package manifest: `requirements.txt` (pinned minimum versions with `>=`)
- Config: `deal-quest-bot/bot/config.py` (pydantic-settings BaseSettings)
- Virtual environment: `.venv` (created locally, not tracked)

**Linting/Formatting:**
- ESLint: `insforge/insforge/eslint.config.js` (ESLint 9 flat config)
- Prettier: Version 3.6.2 (InsForge monorepo) - 2-space indent, semicolons, single quotes, 100-char line width
- No linting config in deal-quest-bot root (webapp inherits Vite defaults)

**Python Runtime Config:**
- Entry point: `python3 -m bot.main` (`deal-quest-bot/bot/main.py`)
- Logging: Python logging module with configurable `LOG_LEVEL` (default: INFO)

**Edge Functions Config:**
- Runtime: Deno 2.0.6
- Config: `insforge/insforge/functions/deno.json`
- Lint rules: recommended
- Format: 2-space indent, single quotes, 100-char line width

## Platform Requirements

**Development:**
- Python 3.11+ with pip
- Node.js 20+ (InsForge Docker) / 23+ (local)
- pnpm 10+ (workspace support)
- Docker + Docker Compose (for InsForge local development)
- PostgreSQL 15.13.1 (via Docker or managed)

**Production:**
- Python bot: Railway (Nixpacks builder, start command: `python3 -m bot.main`)
- TMA webapp: Static hosting (Vite build output, ES2020 target)
- InsForge: Self-hosted Docker stack or managed deployment
- PostgreSQL: Managed instance or Docker container
- Deno: Serverless functions runtime (port 7133)

**Database:**
- PostgreSQL 15.13.1 (ghcr.io/insforge/postgres:v15.13.1)
- PostgREST v12.2.12 for REST API (port 5430 → 3000)
- Required extensions: pgcrypto, pgjwt (for JWT signing)
- Connection pooling: 20 max connections, 30s idle timeout, 2s connection timeout

**Edge Runtime:**
- Deno 2.0.6 (alpine) for serverless functions
- InsForge Deno runtime container (port 7133)
- Environment: `DENO_ENV`, `WORKER_TIMEOUT_MS` (60s default)

**Docker Services (InsForge Local Dev):**
- `postgres` - PostgreSQL database (port 5432)
- `postgrest` - PostgREST API (port 5430)
- `insforge` - Main backend (ports 7130, 7131, 7132)
- `deno` - Edge functions runtime (port 7133)
- `vector` - Log collection and shipping (timberio/vector:0.28.1-alpine)

---

*Stack analysis: 2026-02-02*
