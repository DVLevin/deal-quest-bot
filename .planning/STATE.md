# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-04)

**Core value:** Sales reps can see their progress, practice scenarios, get deal support, and track leads through a visually engaging mobile interface
**Current focus:** Milestone v1.1 — Quick & Medium Wins. Phases 8-9 complete, Phase 10 in progress.

## Previous Milestone (v1.0)

Phase: 7 of 7 (Bot Integration) — COMPLETE
Plans completed: 18/18 (100%)
Total execution time: 74m

## Current Position

Milestone: v1.1 — Quick & Medium Wins
Phase: 10 of 8-11 — IN PROGRESS (Error Handling & UX)
Plans completed: 23/26 total (1/4 in Phase 10)
Status: Executing Phase 10 Wave 1
Last activity: 2026-02-04 -- Completed 10-01-PLAN.md

Progress: [██████████░░░░░░░░░] 10/19 v1.1 requirements (53%)

## Performance Metrics

**Velocity:**
- Total plans completed: 23
- Average duration: 3.7m
- Total execution time: 86m

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation & Auth | 4/4 | 18m | 4.5m |
| 2. Dashboard & Profile | 2/2 | 10m | 5m |
| 3. Learn & Train | 3/3 | 16m | 5.3m |
| 4. Support & Casebook | 2/2 | 6m | 3m |
| 5. Leads & Settings | 2/2 | 6m | 3m |
| 6. Gamification & Admin | 3/3 | 10m | 3.3m |
| 7. Bot Integration | 2/2 | 8m | 4m |
| 8. Lead Management | 2/2 | 5m | 2.5m |
| 9. Training Experience | 2/2 | 5m | 2.5m |
| 10. Error Handling & UX | 1/4 | 2m | 2m |

**Recent Trend:**
- Last 5 plans: 2m, 3m, 3m, 2m, 2m
- Trend: stable (fast)

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
- [05-01]: LeadStatus fixed to 6 values matching bot (meeting_booked, closed_won, closed_lost)
- [05-01]: EngagementPlanStep fixed to step_id/description/timing/status matching bot data model
- [05-01]: First TMA mutation pattern: useMutation with onMutate optimistic update, onError rollback, onSettled invalidation
- [05-01]: Status changes write activity_log entries (status_change type) for TMA-initiated changes
- [05-01]: Lead TEXT fields (strategy, tactics, draft) treated as plain text, only prospect_analysis needs JSON.parse
- [05-01]: Engagement plan displayed read-only (step toggling deferred to bot)
- [05-02]: Notes section always visible (not conditional), allows adding notes to any lead
- [05-02]: API key management via bot deep-link only (TMA cannot access Fernet ENCRYPTION_KEY)
- [05-02]: Settings queries users table directly, no separate settings table needed
- [05-02]: 4 OpenRouter models match bot MODEL_KEYBOARD exactly
- [06-01]: BadgeWall replaces BadgeCollection on Profile page (BadgeCollection preserved for compact use)
- [06-01]: 3-column grid (grid-cols-3) for mobile badge display; rarity label on earned only
- [06-01]: Epic/legendary glow via shadow with CSS var tokens (shadow-[0_0_Xpx_var(--color-rarity-*)])
- [06-02]: canvas-confetti with disableForReducedMotion for accessibility-safe celebrations
- [06-02]: sessionStorage guard prevents level-up re-triggers on page reload
- [06-02]: CSS @property --xp-value reuses existing integer interpolation pattern from ScoreDisplay
- [06-02]: LevelUpOverlay auto-dismisses after 5 seconds with manual dismiss option
- [06-03]: Client-side admin access control via VITE_ADMIN_USERNAMES env var (v1 security limitation)
- [06-03]: SVG micro-charts for admin dashboard (no charting library dependency)
- [06-03]: 5-minute staleTime and .limit() on all admin queries
- [06-03]: AdminGuard reuses existing user query key for TanStack Query deduplication
- [07-01]: Empty tma_url string as graceful skip (no validation, no error)
- [07-01]: Open in App always appended as LAST row, never replaces existing buttons
- [07-01]: setup_menu_button called before polling, after auth middleware
- [07-02]: tgWebAppStartParam property name (SDK v3 uses raw Telegram query param names, not camelCase)
- [07-02]: WebAppInfo URL path routing takes priority over startParam (location.pathname check)
- [07-02]: replace: true on deep link navigate to prevent root in browser history
- [08-01]: lead_source column uses TEXT DEFAULT 'support_analysis' for automatic backfill of existing rows
- [08-01]: lead_source in LeadRegistryRow TypeScript type uses string | null matching DB column convention
- [08-01]: Stale threshold set to 7 days, uses updated_at with created_at fallback
- [08-01]: useLeads limit increased from 30 to 100 to prepare for Plan 02 client-side search
- [08-02]: Reused SearchBar from casebook (controlled component with external debounce)
- [08-02]: Filter chips built inline (not CasebookFilters) for domain-specific lead status filtering
- [08-02]: Client-side filtering with useMemo -- no PostgREST query changes needed with 100-row limit
- [08-02]: Company groups sorted by contact count descending
- [09-01]: Client-side difficulty join via Map<string, number> (no DB migration for attempts table)
- [09-01]: Threshold constants: MIN_ATTEMPTS=3, PROMOTE=70, DEMOTE=40 (easily tunable)
- [09-01]: DifficultyRecommendation returns null when insufficient data (clean UI for new users)
- [09-01]: ScenarioVariety replaces plain pool count with unseen/total + low-pool nudge
- [09-01]: useScenarioPool(undefined) reused for full-pool difficulty map (TanStack Query dedup)
- [09-02]: TrackStats is pure presentational (receives LevelWithProgress[] props, no internal hooks)
- [09-02]: WeakAreasCard threshold at 50 with minimum 2 attempts to filter noise
- [09-02]: WeakAreasCard returns null for new users (no empty card clutter)
- [09-02]: Practice CTA routes contextually: /train for difficulty, /learn for track-level weak areas
- [09-02]: Max 3 weak areas displayed on dashboard to avoid overwhelming
- [10-01]: ErrorBoundary uses React class component (functional components cannot be error boundaries in React 18)
- [10-01]: Toast store uses Zustand standalone store (not React Context) -- no provider wrapper needed
- [10-01]: ErrorBoundary outermost in App.tsx; ToastContainer inside QueryProvider above AppRouter
- [10-01]: Max 3 visible toasts with 4-second auto-dismiss and oldest-first eviction
- [10-01]: ErrorCard compact variant: boolean prop switches between inline row and card block display

### Pending Todos

- [01-02]: Deploy verify-telegram Edge Function via InsForge MCP/Dashboard -- DONE (active since 2026-02-03)
- [01-02]: Execute RLS migration (migrations/001_enable_rls_and_policies.sql) -- DONE (43 policies across 11 tables)
- [01-02]: Set TELEGRAM_BOT_TOKEN and JWT_SECRET as InsForge environment secrets (hardcoded fallbacks in Edge Function currently)
- [07-01]: Set TMA_URL env var in Railway to enable Open in App buttons

### Blockers/Concerns

- [01-02]: Custom JWT acceptance by InsForge PostgREST needs runtime validation
- [01-02]: If InsForge doesn't support current_setting('request.jwt.claims'), RLS authenticated policies may need adjustment
- [deploy]: Railway deployment pending verification -- inlined shared types should fix build

### Pending Todos (quick tasks)

- [quick-002]: Run migration `migrations/002_lead_person_company_fields.sql` on InsForge database
- [08-01]: Run migration `migrations/003_lead_source_field.sql` on InsForge database

## Quick Tasks

| Task | Status | Summary |
|------|--------|---------|
| 001-bot-button-audit | Task 1/3 done | 87-trigger test matrix generated, awaiting manual testing (Task 2) |
| 002-lead-company-enrichment | Complete (3/3) | Structured prospect info (first/last name, geography) with enriched web research |

## Session Continuity

Last session: 2026-02-04
Stopped at: Completed 10-01-PLAN.md (Error Handling Foundation)
Resume file: None
Next action: Execute 10-02-PLAN.md (integrate error/empty states into pages)
