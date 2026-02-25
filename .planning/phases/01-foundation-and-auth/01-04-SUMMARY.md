---
phase: 01-foundation-and-auth
plan: 04
subsystem: ui
tags: [react-router, telegram-sdk, hooks, code-splitting, session-resilience]

# Dependency graph
requires:
  - phase: 01-foundation-and-auth/02
    provides: AuthProvider, useAuthStore, InsForge client with JWT
  - phase: 01-foundation-and-auth/03
    provides: Design system (Card, Skeleton, NavBar, AppLayout), Tailwind v4 tokens
provides:
  - 8 lazy-loaded page stubs (Dashboard, Learn, Train, Support, Casebook, Leads, Profile, Admin)
  - BrowserRouter with BackButton integration and catch-all redirect
  - useBackButton hook syncing Telegram BackButton with react-router navigation
  - useMainButton hook for declarative MainButton configuration
  - useSecondaryButton hook for A/B branching (Bot API 7.10+)
  - useSessionResilience hook for background state persistence
  - Complete provider tree (AuthProvider -> QueryProvider -> AppRouter)
affects: [phase-02-profile-gamification, phase-03-learn-train, phase-04-support, phase-05-leads]

# Tech tracking
tech-stack:
  added: []
  patterns: [lazy-loading with React.lazy + Suspense, Telegram SDK hook wrappers with isAvailable() guards, sessionStorage-based resilience via miniApp.isActive signal]

key-files:
  created:
    - packages/webapp/src/shared/hooks/useBackButton.ts
    - packages/webapp/src/shared/hooks/useMainButton.ts
    - packages/webapp/src/shared/hooks/useSecondaryButton.ts
    - packages/webapp/src/shared/hooks/useSessionResilience.ts
    - packages/webapp/src/pages/Dashboard.tsx
    - packages/webapp/src/pages/Learn.tsx
    - packages/webapp/src/pages/Train.tsx
    - packages/webapp/src/pages/Support.tsx
    - packages/webapp/src/pages/Casebook.tsx
    - packages/webapp/src/pages/Leads.tsx
    - packages/webapp/src/pages/Profile.tsx
    - packages/webapp/src/pages/Admin.tsx
  modified:
    - packages/webapp/src/app/Router.tsx
    - packages/webapp/src/app/App.tsx

key-decisions:
  - "miniApp.isActive signal over raw WebApp events for session resilience (proper SDK v3 abstraction)"
  - "Wildcard route suffixes (/*) on pages with future sub-routes for Phase 2+ compatibility"
  - "SecondaryButton position default 'left' for A/B scenario branching in Train module"

patterns-established:
  - "Telegram SDK hook pattern: check isAvailable() before calling, clean up on unmount"
  - "Page stub pattern: default export, Card + useAuthStore, placeholder text describing future features"
  - "Route structure: /* suffix for expandable routes, single path for leaf pages"

# Metrics
duration: 4min
completed: 2026-02-02
---

# Phase 1 Plan 4: Routing Shell & Telegram Integration Summary

**React-router v7 with 8 lazy-loaded pages, Telegram BackButton/MainButton/SecondaryButton hooks, session resilience via miniApp.isActive, and complete AuthProvider->QueryProvider->AppRouter tree**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-02T01:05:19Z
- **Completed:** 2026-02-02T01:09:18Z
- **Tasks:** 2 auto tasks + 1 checkpoint
- **Files modified:** 14

## Accomplishments
- All 8 page routes render lazy-loaded stubs with authenticated user context (telegramId displayed)
- Telegram BackButton syncs with react-router: shows on non-root routes, hides on Dashboard
- MainButton and SecondaryButton hooks available for feature pages with full lifecycle management
- Session resilience hook ready for Phase 3+ training timer and support input state preservation
- Build produces 10 separate JS chunks (code splitting confirmed working)
- Complete provider tree: AuthProvider gates rendering -> QueryProvider enables data fetching -> BrowserRouter routes pages

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Telegram button hooks and session resilience hook** - `0ceb357` (feat)
2. **Task 2: Create page stubs, Router, and wire App.tsx provider tree** - `84c9b9e` (feat)
3. **Router fix: Add wildcard suffixes and catch-all redirect** - `792d7ae` (fix)

_Note: Tasks 1 and 2 were committed in the deal-quest-bot inner repo during prior plan executions. Task 3 (Router fix) was added during this execution to match plan specifications._

## Files Created/Modified
- `packages/webapp/src/shared/hooks/useBackButton.ts` - Syncs Telegram BackButton with react-router location
- `packages/webapp/src/shared/hooks/useMainButton.ts` - Declarative MainButton with text, visibility, loader, cleanup
- `packages/webapp/src/shared/hooks/useSecondaryButton.ts` - SecondaryButton for Bot API 7.10+ with mount/unmount lifecycle
- `packages/webapp/src/shared/hooks/useSessionResilience.ts` - Save/restore state via miniApp.isActive and visibilitychange
- `packages/webapp/src/pages/Dashboard.tsx` - Dashboard stub showing telegramId and progress placeholder
- `packages/webapp/src/pages/Learn.tsx` - Learn stub for playbook and learning modules
- `packages/webapp/src/pages/Train.tsx` - Train stub for role-play scenarios
- `packages/webapp/src/pages/Support.tsx` - Support stub for AI deal coaching
- `packages/webapp/src/pages/Casebook.tsx` - Casebook stub for company case studies
- `packages/webapp/src/pages/Leads.tsx` - Leads stub for pipeline management
- `packages/webapp/src/pages/Profile.tsx` - Profile stub for rank and badges
- `packages/webapp/src/pages/Admin.tsx` - Admin stub for user management
- `packages/webapp/src/app/Router.tsx` - BrowserRouter with lazy pages, BackButton, catch-all redirect
- `packages/webapp/src/app/App.tsx` - Provider tree: AuthProvider -> QueryProvider -> AppRouter

## Decisions Made
- Used miniApp.isActive signal from @telegram-apps/sdk-react instead of raw WebApp.onEvent('activated') for session resilience (proper SDK v3 abstraction, type-safe)
- Added /* wildcard suffix on 5 routes (learn, train, support, leads, admin) that will have sub-routes in future phases
- Casebook and Profile remain single-path routes (no sub-routes planned)
- catch-all route redirects unknown paths to Dashboard via Navigate with replace

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added wildcard route suffixes and catch-all redirect**
- **Found during:** Task 2 verification (Router.tsx review)
- **Issue:** Routes for learn, train, support, leads, admin lacked /* suffix needed for future sub-routes; no catch-all for unknown paths
- **Fix:** Added /* suffix to 5 expandable routes and <Navigate to="/" replace /> catch-all
- **Files modified:** packages/webapp/src/app/Router.tsx
- **Verification:** pnpm typecheck && pnpm build both pass
- **Committed in:** 792d7ae

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor route configuration fix for Phase 2+ compatibility. No scope creep.

## Issues Encountered
None - all files from prior plan executions were well-implemented and passed verification.

## User Setup Required

None - no external service configuration required for this plan.

## Next Phase Readiness
- Phase 1 Foundation & Auth is now fully complete (all 4 plans executed)
- TMA shell is fully navigable with 8 routes, auth, design system, and Telegram button integration
- Ready for Phase 2 (Profile & Gamification) - all page stubs exist, auth works, design system renders
- Pending from prior plans: InsForge Edge Function deployment, RLS migration, environment secrets (see 01-02-USER-SETUP.md)

---
*Phase: 01-foundation-and-auth*
*Completed: 2026-02-02*
