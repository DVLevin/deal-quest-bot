# Technology Stack

**Analysis Date:** 2026-02-01

## Languages

**Primary:**
- TypeScript 5.3.3+ - All backend and frontend source code
- JavaScript (ES2022) - Runtime execution

**Secondary:**
- Deno TypeScript - Serverless function workers in `insforge/functions/`

## Runtime

**Environment:**
- Node.js 20+ (tsup target: node20, inferred from build configuration)
- Deno - For serverless function execution via Deno Deploy Subhosting

**Package Manager:**
- npm (workspace monorepo with npm workspaces)
- Lockfile: `package-lock.json` (present)

## Frameworks

**Backend:**
- Express.js 4.19.2 - REST API server (`insforge/backend/src/server.ts`)
- Socket.IO 4.8.1 - Real-time WebSocket communication (`insforge/backend/src/infra/socket/socket.manager.ts`)

**Frontend:**
- React 19.2.1 - UI framework
- Vite 7.0.5 - Build tool and dev server
- TailwindCSS 4.1.11 - Styling
- React Router 7.7.0 - Client-side routing

**Authentication Service:**
- Vite 7.0.5 - Build tool for auth UI
- React 19.2.1 - UI components

**Testing:**
- Vitest 3.2.4 - Test runner and framework (backend and frontend)
- Testing Library (React) - Component testing utilities
- jsdom 26.1.0 - DOM environment for tests

**Build/Dev:**
- tsup 8.5.0 - TypeScript bundler (backend)
- tsx 4.7.1 - TypeScript executor for development
- Concurrently 8.2.2 - Run multiple npm scripts in parallel
- TypeScript 5.8.3 - Type checking and compilation

**Code Quality:**
- ESLint 9.31.0 - Linting (with TypeScript and React plugins)
- Prettier 3.6.2 - Code formatting
- TypeScript ESLint 8.38.0 - TypeScript-aware linting rules

## Key Dependencies

**Critical - Database:**
- pg 8.16.3 - PostgreSQL client
- node-pg-migrate 8.0.3 - Database migrations
- libpg-query 17.6.0 - SQL parsing and validation

**Critical - Authentication & Security:**
- jsonwebtoken 9.0.2 - JWT token generation and verification
- jose 6.1.0 - JWT handling (RFC standards)
- bcryptjs 3.0.2 - Password hashing
- google-auth-library 10.1.0 - Google OAuth integration

**Critical - API Integration:**
- axios 1.11.0 - HTTP client for external APIs and OAuth flows
- openai 5.19.1 - OpenRouter/OpenAI SDK for AI integration
- node-fetch 3.3.2 - Fetch API for Node.js

**Infrastructure - AWS:**
- @aws-sdk/client-s3 3.713.0 - S3 file storage
- @aws-sdk/client-cloudwatch-logs 3.713.0 - CloudWatch logging
- @aws-sdk/cloudfront-signer 3.901.0 - CloudFront URL signing
- @aws-sdk/s3-presigned-post 3.879.0 - S3 presigned POST URLs
- @aws-sdk/s3-request-presigner 3.879.0 - S3 presigned GET URLs

**Infrastructure - File Upload:**
- multer 2.0.2 - File upload handling middleware

**Data Validation & Schema:**
- zod 3.23.8 - Runtime type validation and schema definition

**Database Utilities:**
- @databases/sql 3.3.0 - SQL query builder
- @databases/split-sql-query 1.0.4 - SQL parsing utilities
- pg-format 1.0.4 - PostgreSQL query formatting

**Frontend UI Components:**
- @radix-ui/* (multiple modules) - Accessible component primitives
- lucide-react 0.536.0 - Icon library
- react-hook-form 7.61.1 - Form state management
- @hookform/resolvers 5.1.1 - Validation resolvers for hook-form
- react-data-grid 7.0.0-beta.47 - Data table component

**Frontend Data Management:**
- @tanstack/react-query 5.83.0 - Server state management and caching
- socket.io-client 4.8.1 - WebSocket client for real-time updates

**Frontend Code Editing:**
- @uiw/react-codemirror 4.25.2 - Code editor component
- @codemirror/lang-javascript 6.2.4 - JavaScript syntax highlighting
- @codemirror/lang-sql 6.10.0 - SQL syntax highlighting

**Observability:**
- winston 3.17.0 - Logging framework
- posthog-js 1.302.2 - Product analytics (optional, feature-flagged)

**Utilities:**
- uuid 11.1.0 - UUID generation
- date-fns 4.1.0 - Date manipulation
- clsx 2.1.1 - Conditional classname utility
- tailwind-merge 3.3.1 - TailwindCSS utility merging
- class-variance-authority 0.7.1 - CSS variant system
- adm-zip 0.5.16 - ZIP file operations
- csv-parse 6.1.0 - CSV parsing
- cron-parser 5.4.0 - Cron expression parsing

**Development Tools:**
- release-it 19.0.4 - Automated release management
- @release-it/conventional-changelog 10.0.1 - Changelog generation
- dotenv 16.4.5 - Environment variable loading
- dotenv-cli 10.0.0 - CLI for dotenv
- rimraf 5.0.5 - Cross-platform file deletion
- cross-env 7.0.3 - Cross-platform environment variable setting

**Schema Documentation:**
- @asteasolutions/zod-to-openapi 7.3.4 - OpenAPI schema generation from Zod

**Flow Visualization:**
- @xyflow/react 12.8.4 - Node/edge graph visualization (frontend)

## Configuration

**Environment Variables:**
- Port: `PORT` (default 7130)
- PostgreSQL: `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- JWT/Encryption: `JWT_SECRET` (32+ chars), `ENCRYPTION_KEY`
- API Keys: `ACCESS_API_KEY` (starts with `ik_`)
- AWS Storage: `AWS_S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL`
- CloudWatch Logging: `AWS_REGION`, AWS credentials
- OpenRouter AI: `OPENROUTER_API_KEY`
- OAuth Providers: `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`, `MICROSOFT_CLIENT_ID/SECRET`, `DISCORD_CLIENT_ID/SECRET`, `LINKEDIN_CLIENT_ID/SECRET`, `X_CLIENT_ID/SECRET`, `APPLE_CLIENT_ID/SECRET`
- Deno Subhosting: `DENO_SUBHOSTING_TOKEN`, `DENO_SUBHOSTING_ORG_ID`
- Analytics: `VITE_PUBLIC_POSTHOG_KEY`
- File Logs: `LOGS_DIR` (defaults to `./logs`)

**Prettier Configuration:**
- `insforge/.prettierrc`: 2-space indent, semicolons, single quotes, trailing commas (ES5), 100-char line width

**TypeScript Configuration:**
- Target: ES2022
- Module: ES2022
- Base path aliases: `@/*` maps to `src/*`
- Workspace references: `frontend`, `backend`, `shared-schemas`
- Backend specific path alias: `@insforge/shared-schemas` maps to `../shared-schemas/src/index.ts`

**Build Configuration:**
- Backend: `tsup` with entry point `src/server.ts`, ESM format, no external bundling except shared-schemas
- Frontend: Vite with React plugin
- Auth: Vite with React plugin

## Platform Requirements

**Development:**
- Node.js 20+
- npm 8+
- PostgreSQL 12+ (local or remote)
- Optional: AWS S3 bucket and credentials (local filesystem used as fallback)
- Optional: AWS CloudWatch (local file logging used as fallback)
- Optional: Deno account for serverless function deployment

**Production:**
- Node.js 20+ runtime
- PostgreSQL database (required)
- AWS S3 bucket (for file storage) or local filesystem
- AWS CloudWatch (for centralized logging) or file-based logging
- Deno Deploy account (for serverless functions)
- SMTP or cloud email service (for email provider)

---

*Stack analysis: 2026-02-01*
