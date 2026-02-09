---
phase: 21-seamless-tma-bot-integration
plan: 04
subsystem: ui
tags: [deep-links, session-resume, localStorage, query-params, telegram-mini-app]

# Dependency graph
requires:
  - phase: 21-01
    provides: Bot-to-TMA deep link infrastructure (add_open_in_app_row, WebApp inline buttons)
  - phase: 16-04
    provides: Open in App button with query_params support
  - phase: 17-01
    provides: useSmartLanding hook for dashboard focus mode
provides:
  - Enhanced bot deep links with action=execute and section=plan params
  - TMA session tracking via localStorage (useSessionTracker)
  - Session resume navigation on Dashboard mount (resumePath with 24h expiry)
  - Deep link query param handling in LeadDetail (auto-open StepActionScreen, auto-expand plan section)
affects: [engagement-plan-ux, bot-notifications, tma-navigation]

# Tech tracking
tech-stack:
  added: []
  patterns: [localStorage session tracking with JSON {path, ts}, one-shot consume pattern via useRef, deep link query param clearing after processing]

key-files:
  created: []
  modified:
    - bot/services/plan_scheduler.py
    - bot/services/plan_poller.py
    - packages/webapp/src/app/Router.tsx
    - packages/webapp/src/features/dashboard/hooks/useSmartLanding.ts
    - packages/webapp/src/pages/Dashboard.tsx
    - packages/webapp/src/features/leads/components/LeadDetail.tsx

key-decisions:
  - "One-shot consume pattern: localStorage entry removed immediately after reading (useRef cache survives re-renders)"
  - "NON_RESUMABLE paths: / (exact) and /admin (prefix) excluded from session tracking"
  - "Session resume skipped when startParam present (deep link takes priority over resume)"
  - "Query params cleared after deep link processing via navigate(pathname, { replace: true })"

patterns-established:
  - "useSessionTracker: lightweight localStorage write on navigation changes, debounced via useRef comparison"
  - "consumeResumePath: read-and-delete localStorage pattern with JSON {path, ts} and max-age validation"

# Metrics
duration: 3min
completed: 2026-02-09
---

# Phase 21 Plan 04: Deep Link Precision & Session Resume Summary

**Enhanced bot deep links with action=execute/section=plan params, localStorage session tracking with 24h expiry, and auto-resume navigation on Dashboard mount**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-09T16:11:39Z
- **Completed:** 2026-02-09T16:15:04Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Bot reminder deep links now include action=execute param, causing TMA to auto-open the StepActionScreen for the targeted step
- Plan-ready notification deep links include section=plan param to ensure the plan section is visible on arrival
- TMA tracks last-viewed path in localStorage (excludes / and /admin/* paths) via useSessionTracker in Router
- Dashboard auto-navigates to last-viewed page within 24 hours when opened via menu button (not deep link)
- LeadDetail processes action, section, and step query params, then clears them to prevent re-triggering on back navigation

## Task Commits

Each task was committed atomically:

1. **Task 1: Enhance bot deep links with section and action parameters** - `f53e211` (feat)
2. **Task 2: Enhance TMA deep link handling and add session resume** - `6546046` (feat)

## Files Created/Modified
- `bot/services/plan_scheduler.py` - Added action=execute query param to reminder Open in App button
- `bot/services/plan_poller.py` - Added section=plan query param to plan-ready Open in App button
- `packages/webapp/src/app/Router.tsx` - Added useSessionTracker hook (localStorage session write on navigation)
- `packages/webapp/src/features/dashboard/hooks/useSmartLanding.ts` - Added resumePath field with consumeResumePath one-shot reader
- `packages/webapp/src/pages/Dashboard.tsx` - Added session resume navigation on mount (skips if startParam present)
- `packages/webapp/src/features/leads/components/LeadDetail.tsx` - Enhanced deep link handling for action=execute, section=plan, and query param clearing

## Decisions Made
- One-shot consume pattern: localStorage entry removed immediately after reading, cached in useRef to survive re-renders during loading states
- NON_RESUMABLE paths: '/' (exact match) and '/admin' (prefix match) excluded from session tracking
- Session resume skipped when Telegram startParam is present (deep link navigation takes priority)
- Query params cleared after deep link processing via navigate(location.pathname, { replace: true }) to prevent re-triggering on back navigation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 21 is now fully complete (all 4 plans executed)
- Deep links from bot to TMA now support precise screen targeting
- Session resume enables continuity when users reopen the app via menu button

---
*Phase: 21-seamless-tma-bot-integration*
*Completed: 2026-02-09*
