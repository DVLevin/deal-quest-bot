# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-01)

**Core value:** Sales reps can see their progress, practice scenarios, get deal support, and track leads through a visually engaging mobile interface
**Current focus:** Phase 4 complete. Ready for Phase 5 (Leads & Settings).

## Current Position

Phase: 4 of 7 (Support & Casebook)
Plan: 2 of 2 in current phase
Status: Phase complete
Last activity: 2026-02-03 -- Completed 04-02-PLAN.md (Casebook browser)

Progress: [███████████░░░░░░░░] 11/18 (61%)

## Performance Metrics

**Velocity:**
- Total plans completed: 11
- Average duration: 4.5m
- Total execution time: 50m

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation & Auth | 4/4 | 18m | 4.5m |
| 2. Dashboard & Profile | 2/2 | 10m | 5m |
| 3. Learn & Train | 3/3 | 16m | 5.3m |
| 4. Support & Casebook | 2/2 | 6m | 3m |

**Recent Trend:**
- Last 5 plans: 5m, 6m, 5m, 3m, 3m
- Trend: improving

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
- [01-04]: miniApp.isActive signal over raw WebApp events for session resilience
- [01-04]: Wildcard route suffixes (/*) on pages with future sub-routes
- [01-04]: SecondaryButton position default 'left' for A/B scenario branching
- [02-01]: Client-side badge evaluation with static definitions (no badges table until Phase 6)
- [02-01]: Leaderboard fetches 10 rows, displays top 5, finds user position; graceful RLS fallback
- [02-01]: XP progress within current level (total_xp - level threshold), MAX LEVEL at level 8
- [02-01]: Added @deal-quest/shared workspace dependency to webapp
- [02-02]: Client-side stats aggregation from last 100 attempts
- [02-02]: Paginated attempt history using range() with keepPreviousData
- [02-02]: Badge collection reuses evaluateBadges(), shows earned/locked states
- [deploy]: Inlined shared types into webapp/src/types/ for Railway root_dir isolation
- [03-01]: Static TRACKS constant compiled into bundle (browser cannot access scenarios.json)
- [03-01]: Deep link to bot for response submission (TMA is display layer)
- [03-01]: Empty track_progress defaults first level unlocked, rest locked
- [03-02]: openTelegramLink for bot deep links (native Telegram handling)
- [03-02]: Advisory-only timer (does NOT block submission on expiry)
- [03-02]: ABBranching is infrastructure-ready, activates via branchingOptions field
- [03-02]: Clock-based timing (Date.now + visibilitychange) for background drift immunity
- [03-03]: CSS @property --score-value for zero-JS integer counter animation
- [03-03]: parseFeedback() with typeof guards on every field (never trust LLM JSONB)
- [03-03]: refetchOnWindowFocus: true on attempt queries for auto-refresh when returning from bot
- [03-03]: attempts.latest query key for scenario-specific lookups by mode
- [04-01]: parseOutputJson with nested typeof guards for defensive LLM JSONB parsing
- [04-01]: Dual CTA in SupportInput: primary Start Analysis + secondary Send Screenshot with Camera icon
- [04-01]: Clipboard copy with textarea fallback for older Telegram WebViews
- [04-01]: refetchOnWindowFocus on support session queries for auto-refresh after bot interaction
- [04-02]: Team-wide casebook by default, My Entries toggle adds .eq('created_from_user', telegramId)
- [04-02]: useCasebookFilterOptions with 5min staleTime for filter chip values
- [04-02]: Search debouncing in parent via useDebouncedValue, SearchBar is pure controlled component
- [04-02]: escapeIlike utility for PostgREST ilike special character safety

### Pending Todos

- [01-02]: Deploy verify-telegram Edge Function via InsForge MCP/Dashboard -- DONE (active since 2026-02-03)
- [01-02]: Execute RLS migration (migrations/001_enable_rls_and_policies.sql) -- DONE (43 policies across 11 tables)
- [01-02]: Set TELEGRAM_BOT_TOKEN and JWT_SECRET as InsForge environment secrets (hardcoded fallbacks in Edge Function currently)

### Blockers/Concerns

- [01-02]: Custom JWT acceptance by InsForge PostgREST needs runtime validation
- [01-02]: If InsForge doesn't support current_setting('request.jwt.claims'), RLS authenticated policies may need adjustment
- [deploy]: Railway deployment pending verification -- inlined shared types should fix build

## Quick Tasks

| Task | Status | Summary |
|------|--------|---------|
| 001-bot-button-audit | Task 1/3 done | 87-trigger test matrix generated, awaiting manual testing (Task 2) |

## Session Continuity

Last session: 2026-02-03
Stopped at: Completed 04-02-PLAN.md (Casebook browser). Phase 4 complete. Next: Phase 5 (Leads & Settings).
Resume file: None
