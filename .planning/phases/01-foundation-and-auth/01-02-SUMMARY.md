---
phase: 01-foundation-and-auth
plan: 02
subsystem: auth
tags: [telegram-auth, hmac-sha256, jwt, jose, rls, insforge, zustand, edge-function, tanstack-query]

requires:
  - phase: 01-01
    provides: monorepo scaffold, InsForge SDK, Telegram SDK, shared types
provides:
  - verify-telegram Edge Function (initData HMAC-SHA256 validation + JWT minting)
  - RLS migration for all 9 tables (anon + authenticated policies)
  - Client-side auth flow (Zustand store, authenticateWithTelegram, InsForge client with JWT)
  - AuthProvider and QueryProvider React components
affects:
  - 01-04 (routing shell wraps inside AuthProvider)
  - Phase 2+ (all authenticated data queries use getInsforge())
  - Future phases (bot migration to service role key removes anon_full_ policies)

tech-stack:
  added:
    - jose (Edge Function JWT minting, Deno runtime)
  patterns:
    - setAuthToken() on InsForge HttpClient for JWT auth (not JWT-as-anonKey)
    - Memory-only JWT storage via Zustand (no localStorage)
    - Edge Function for custom auth provider (Telegram initData -> JWT)
    - RLS with dual-access policies (anon for bot, authenticated for TMA)

key-files:
  created:
    - deal-quest-bot/functions/verify-telegram/index.ts
    - deal-quest-bot/migrations/001_enable_rls_and_policies.sql
    - deal-quest-bot/packages/webapp/src/lib/insforge.ts
    - deal-quest-bot/packages/webapp/src/features/auth/store.ts
    - deal-quest-bot/packages/webapp/src/features/auth/useAuth.ts
    - deal-quest-bot/packages/webapp/src/app/providers/AuthProvider.tsx
    - deal-quest-bot/packages/webapp/src/app/providers/QueryProvider.tsx
  modified:
    - deal-quest-bot/packages/webapp/src/app/App.tsx

key-decisions:
  - "Used setAuthToken() on InsForge HttpClient instead of JWT-as-anonKey pattern -- SDK supports proper auth token injection"
  - "Anon full-access RLS policies as interim security compromise for Python bot compatibility"
  - "Validation query in useAuth.ts is non-blocking -- warns on failure but proceeds if Edge Function succeeded"
  - "Edge Function uses jose for JWT minting (Deno-compatible, HS256)"

patterns-established:
  - "Edge Function pattern: module.exports + createClient injected + Deno.env.get() for secrets"
  - "Auth flow: initDataRaw -> Edge Function -> JWT -> Zustand store -> InsForge client"
  - "RLS policy naming: {table}_{operation}_{scope} (e.g., users_select_own, anon_full_users)"

duration: 5m
completed: 2026-02-01
---

# Phase 1 Plan 2: InsForge Auth & RLS Summary

**Telegram initData auth via Edge Function (HMAC-SHA256 + JWT), RLS on 9 tables with dual-access policies, and Zustand-based client auth flow using InsForge SDK's setAuthToken()**

## Performance

- **Duration:** ~5 minutes
- **Started:** 2026-02-01T13:56:11Z
- **Completed:** 2026-02-01T14:01:21Z
- **Tasks:** 4 (3 executed, 1 skipped as conditional)
- **Files created/modified:** 8

## Accomplishments

1. **verify-telegram Edge Function**: HMAC-SHA256 initData validation following Telegram's exact algorithm, auth_date freshness check, user upsert, JWT minting via jose (HS256, 1h expiry, role: authenticated)
2. **RLS migration**: All 9 tables get RLS with 9 anon full-access policies (bot compatibility) and 22 authenticated-role policies scoped to telegram_id from JWT claims
3. **Client-side auth flow**: InsForge client with proper JWT auth via setAuthToken(), Zustand store (memory-only), authenticateWithTelegram() with validation query, AuthProvider that gates app rendering
4. **TanStack Query setup**: QueryProvider with sensible TMA defaults (5min stale, no refetchOnWindowFocus, single retry)

## Task Commits

Each task was committed atomically:

1. **Task 1a: Create verify-telegram Edge Function** - `af9598b` (feat)
2. **Task 1b: RLS migration with anon and authenticated policies** - `0254614` (feat)
3. **Task 2a: Client-side auth flow** - `3c8356a` (feat)
4. **Task 2b: [SKIPPED]** - Conditional fallback not needed; SDK's setAuthToken() works
5. **Task 3: Bot compatibility verification** - No separate commit (covered by Task 1a TODO and Task 1b migration)

## Files Created/Modified

- `functions/verify-telegram/index.ts` -- Edge Function: initData HMAC-SHA256 validation, user upsert, JWT minting
- `migrations/001_enable_rls_and_policies.sql` -- RLS enablement + 31 policies (9 anon, 22 authenticated)
- `packages/webapp/src/lib/insforge.ts` -- InsForge client singleton with anon + authenticated modes
- `packages/webapp/src/features/auth/store.ts` -- Zustand auth store (jwt, telegramId, userId, loading, error)
- `packages/webapp/src/features/auth/useAuth.ts` -- authenticateWithTelegram() with validation query
- `packages/webapp/src/app/providers/AuthProvider.tsx` -- React provider gating app on auth state
- `packages/webapp/src/app/providers/QueryProvider.tsx` -- TanStack Query provider with TMA defaults
- `packages/webapp/src/app/App.tsx` -- Updated to wrap with AuthProvider -> QueryProvider

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Used setAuthToken() instead of JWT-as-anonKey | InsForge SDK's HttpClient has setAuthToken() method that sets Authorization: Bearer header properly. Discovered by reading SDK type definitions. Cleaner than creating a new client with JWT as anonKey. |
| Anon full-access RLS as interim compromise | Python bot uses anon key server-side and needs full DB access. Service role key migration planned for future phase. Documented with TODO in Edge Function. |
| Non-blocking validation query | If PostgREST rejects the custom JWT, we log a warning but don't block auth. The Edge Function itself validated initData successfully -- data queries will fail individually with clear errors. |
| SQL migration file instead of direct MCP execution | MCP tools not available in execution context. Migration SQL created as trackable file with verification queries and rollback instructions. |
| Task 2b skipped | JWT-as-anonKey fallback not needed since SDK supports proper setAuthToken(). No proxy Edge Function required. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Discovered nested git repository structure**

- **Found during:** Task 1a (first commit)
- **Issue:** `deal-quest-bot/` has its own `.git` directory -- it's a nested repository. The parent `GD_playground` repo tracks planning docs, while the nested repo tracks code. Previous 01-01 commits exist in the nested repo.
- **Fix:** Committed all code changes in the nested `deal-quest-bot` repo (on `main` branch) and planning docs in the parent repo (on `gsd/phase-01-foundation-and-auth` branch)
- **Files modified:** None (workflow adaptation)
- **Verification:** `git log --oneline` in nested repo shows all commits

**2. [Rule 3 - Blocking] Used setAuthToken() instead of JWT-as-anonKey**

- **Found during:** Task 2a (client auth flow)
- **Issue:** Plan specified JWT-as-anonKey approach, but reading the InsForge SDK type definitions revealed `HttpClient.setAuthToken(token)` -- a proper auth token injection method
- **Fix:** Used `getHttpClient().setAuthToken(jwt)` instead of creating a new client with JWT as anonKey. This eliminates the need for Task 2b entirely.
- **Files modified:** `packages/webapp/src/lib/insforge.ts`
- **Verification:** TypeScript compiles, build succeeds, SDK API correctly typed

**3. [Rule 3 - Blocking] SQL migration file instead of MCP tool execution**

- **Found during:** Task 1b (RLS enablement)
- **Issue:** MCP tools (mcp__insforge__run-raw-sql) not available in execution context
- **Fix:** Created `migrations/001_enable_rls_and_policies.sql` with all SQL statements, verification queries, and rollback instructions. Added to USER-SETUP.md for manual execution.
- **Files modified:** `migrations/001_enable_rls_and_policies.sql`
- **Verification:** SQL syntax verified, includes self-check queries

---

**Total deviations:** 3 auto-fixed (all Rule 3 - Blocking)
**Impact on plan:** Deviation #2 actually improved the design (proper SDK usage vs hack). Deviation #3 requires user action to apply RLS migration. No scope creep.

## Issues Encountered

- **MCP tools unavailable**: Could not deploy Edge Function or execute SQL via MCP tools. These are documented in USER-SETUP.md for manual execution.
- **No test of actual auth flow**: The auth flow cannot be tested without deploying the Edge Function and setting environment secrets. This will be validated when the TMA is first opened in Telegram.

## User Setup Required

**External services require manual configuration.** See [01-02-USER-SETUP.md](./01-02-USER-SETUP.md) for:
- Environment variables to add (TELEGRAM_BOT_TOKEN, JWT_SECRET)
- Edge Function deployment via InsForge MCP tools or dashboard
- RLS migration execution via InsForge SQL editor
- Verification commands

## Next Phase Readiness

**For Plan 01-03 (Design system):**
- Auth flow does not touch globals.css, shared/ui/*, or shared/layouts/* (parallel-safe)

**For Plan 01-04 (Routing shell):**
- AuthProvider wraps the app -- router will be placed inside it
- QueryProvider available for data-fetching routes

**For Phase 2+ (Data features):**
- `getInsforge()` provides authenticated client for all data queries
- `useAuthStore()` provides telegramId and userId for query scoping
- RLS policies enforce data isolation per user

**Blockers:**
- Edge Function must be deployed before auth works end-to-end
- RLS migration must be executed before security is enforced
- TELEGRAM_BOT_TOKEN and JWT_SECRET must be set as InsForge environment secrets

**Concerns:**
- Custom JWT acceptance by InsForge PostgREST needs runtime validation (may need JWT_SECRET alignment with InsForge's internal secret)
- If InsForge doesn't support `current_setting('request.jwt.claims')`, RLS authenticated policies may need adjustment

---
*Phase: 01-foundation-and-auth*
*Completed: 2026-02-01*
