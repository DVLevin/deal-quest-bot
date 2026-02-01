# Technology Stack

**Analysis Date:** 2026-02-02

## Languages

**Primary:**
- Python 3.x - Telegram bot backend, AI agents, business logic
- TypeScript 5.9 - Monorepo frontend and shared types
- JavaScript - Runtime in webapp

**Secondary:**
- YAML - Pipeline configuration, schema definitions
- JSON - Configuration, environment variables

## Runtime

**Environment:**
- Python (async via asyncio) - Bot server
- Node.js + npm/pnpm - Frontend build and package management

**Package Manager:**
- pnpm (workspace:*) - Monorepo management
  - Lockfile: pnpm-lock.yaml (not present, inferred)
- pip/venv - Python dependencies
  - Virtual environment: `.venv/`
  - Lockfile: requirements.txt

## Frameworks

**Backend:**
- aiogram 3.4.0+ - Async Telegram bot framework
- httpx 0.27.0+ - Async HTTP client for external API integration

**Frontend:**
- React 18.3.1 - Component framework
- Vite 7.3.0 - Build tool and dev server
- Tailwind CSS 4.1.0 - Utility-first styling
- React Router 7.12.0 - Client-side routing
- TanStack React Query 5.90.0 - Server state management
- Zustand 5.0.10 - Client state management
- @telegram-apps/sdk-react 3.3.9 - Telegram Mini App SDK

**Shared:**
- TypeScript 5.9 - Type safety across packages
- Pydantic 2.6.0+ - Python data validation

## Key Dependencies

**Critical Backend:**
- pydantic-settings 2.2.0+ - Config management via environment variables
- cryptography 42.0.0+ - Fernet encryption for storing user API keys
- pyyaml 6.0.1+ - Pipeline YAML parsing
- python-dotenv 1.0.1+ - .env file loading

**Critical Frontend:**
- @insforge/sdk (latest) - InsForge database client
- @telegram-apps/sdk-react 3.3.9 - Telegram Mini App integration
- class-variance-authority 0.7.0 - CVA-based component styling
- lucide-react 0.562.0 - Icon library
- eruda 3.4.3 - Mobile debugging console (dev only)

**Critical Monorepo:**
- @deal-quest/shared (workspace) - Shared type definitions
- @deal-quest/webapp (workspace) - Telegram Mini App UI

## Configuration

**Environment:**
- `.env` file with required and optional variables
- pydantic-settings loads from `.env` in `bot/config.py`
- VITE_* prefixed env vars for Vite frontend exposure

**Key Environment Variables:**
- `TELEGRAM_BOT_TOKEN` - Bot authentication
- `ENCRYPTION_KEY` - Fernet key for user API key storage
- `INSFORGE_BASE_URL` - PostgREST database endpoint
- `INSFORGE_ANON_KEY` - Anonymous JWT for InsForge
- `OPENROUTER_API_KEY` - Shared LLM provider key
- `ASSEMBLYAI_API_KEY` - Voice transcription
- `DEFAULT_OPENROUTER_MODEL` - Default LLM model
- `ADMIN_USERNAMES` - Comma-separated admin list
- `ALLOWED_USERNAMES` - Comma-separated whitelist
- `LOG_LEVEL` - Logging verbosity
- `VITE_INSFORGE_URL` - InsForge URL for frontend
- `VITE_INSFORGE_ANON_KEY` - InsForge anon key for frontend

**Build:**
- `packages/webapp/vite.config.ts` - Vite config with React SWC, Tailwind, tsconfig paths
- `packages/webapp/tsconfig.json` - Strict mode, React JSX, ES2020 target
- `packages/shared/tsconfig.json` - Library mode, declaration maps
- Root `pnpm-workspace.yaml` - Monorepo workspace definition

## Platform Requirements

**Development:**
- Python 3.x (exact version not pinned)
- Node.js (exact version not pinned, pnpm required)
- pnpm package manager
- Virtual environment (.venv) for Python isolation

**Production:**
- Python 3.x async runtime
- Node.js for frontend build artifacts (or pre-built static bundle)
- Environment variables for all API keys and config
- Telegram Bot API access
- Network access to:
  - Telegram servers
  - InsForge backend
  - OpenRouter API
  - AssemblyAI API
  - Anthropic Claude API (optional)

---

*Stack analysis: 2026-02-02*
