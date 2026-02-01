# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-01)

**Core value:** Sales reps can see their progress, practice scenarios, get deal support, and track leads through a visually engaging mobile interface
**Current focus:** Phase 1 - Foundation & Auth

## Current Position

Phase: 1 of 7 (Foundation & Auth)
Plan: 3 of 4 in current phase
Status: In progress
Last activity: 2026-02-01 -- Completed 01-02-PLAN.md (InsForge Auth & RLS) and 01-03-PLAN.md (Design system)

Progress: [███░░░░░░░░░░░░░░░░] 3/18 (17%)

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 4.7m
- Total execution time: 14m

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation & Auth | 3/4 | 14m | 4.7m |

**Recent Trend:**
- Last 5 plans: 6m, 3m, 5m
- Trend: stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 7 phases derived from 58 requirements at standard depth
- [Roadmap]: Phases 4 and 5 can parallelize (both depend only on Phase 1)
- [Roadmap]: PROF-05 (settings) assigned to Phase 5 with Leads to keep Profile page display in Phase 2 and interactive settings separate
- [01-01]: Row suffix pattern for DB types (UserRow, AttemptRow) to distinguish from API/UI types
- [01-01]: Schema from actual InsForge DB, not Python models (AttemptRow omits transient fields)
- [01-01]: Tailwind v4 CSS-first via @tailwindcss/vite (no tailwind.config.js)
- [01-01]: mockEnv uses __telegram__initParams pattern for SDK v3 browser dev
- [01-02]: Used setAuthToken() on InsForge HttpClient instead of JWT-as-anonKey pattern
- [01-02]: Anon full-access RLS policies as interim security compromise for bot compatibility
- [01-02]: Validation query in useAuth.ts is non-blocking (warns but proceeds)
- [01-02]: Edge Function uses jose for JWT minting (Deno-compatible, HS256)
- [01-03]: Telegram SDK viewport CSS vars for safe area (not env() which fails in TG WebView on iOS)
- [01-03]: oklch color space for brand palette (perceptually uniform)
- [01-03]: 44px minimum touch targets on all interactive elements
- [01-03]: NavBar has 5 items (Dashboard/Learn/Train/Support/Leads)

### Pending Todos

- [01-02]: Deploy verify-telegram Edge Function via InsForge MCP/Dashboard
- [01-02]: Execute RLS migration (migrations/001_enable_rls_and_policies.sql)
- [01-02]: Set TELEGRAM_BOT_TOKEN and JWT_SECRET as InsForge environment secrets

### Blockers/Concerns

- [01-02]: Custom JWT acceptance by InsForge PostgREST needs runtime validation
- [01-02]: If InsForge doesn't support current_setting('request.jwt.claims'), RLS authenticated policies may need adjustment

## Session Continuity

Last session: 2026-02-01
Stopped at: Completed 01-02-PLAN.md and 01-03-PLAN.md
Resume file: None
