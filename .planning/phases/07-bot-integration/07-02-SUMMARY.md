---
phase: 07-bot-integration
plan: 02
subsystem: tma-routing
tags: [deep-link, startParam, telegram-sdk, react-router, hooks]
requires:
  - "01-04 (Router, BrowserRouter, useBackButton pattern)"
provides:
  - "startParam-based deep link navigation for direct TMA launches"
  - "useDeepLink hook with one-time execution guard"
affects:
  - "Future t.me/bot/app?startapp=X links route correctly"
  - "Bot handlers that generate direct links benefit from startParam routing"
tech-stack:
  added: []
  patterns:
    - "useRef guard for single-execution effects"
    - "tgWebAppStartParam from retrieveLaunchParams() for direct link routing"
key-files:
  created:
    - packages/webapp/src/shared/hooks/useDeepLink.ts
  modified:
    - packages/webapp/src/app/Router.tsx
key-decisions:
  - id: "07-02-01"
    decision: "tgWebAppStartParam property name (not startParam) matches SDK v3 LaunchParamsSchema"
    rationale: "SDK v3 uses raw Telegram query param names; startParam is only in initData context"
  - id: "07-02-02"
    decision: "WebAppInfo URL path routing takes priority over startParam"
    rationale: "location.pathname check skips startParam when inline button already navigated to correct path"
  - id: "07-02-03"
    decision: "replace: true on navigate to prevent root appearing in history"
    rationale: "Clean back-button behavior; user should not land on root when pressing back after deep link"
duration: 4m
completed: 2026-02-04
---

# Phase 7 Plan 02: Deep Link Routing Summary

**TMA deep link hook using tgWebAppStartParam with single-fire execution and WebAppInfo URL priority**

## Performance

| Metric | Value |
|--------|-------|
| Duration | 4m |
| Tasks | 1/1 |
| Deviations | 1 (auto-fixed SDK type mismatch) |

## Accomplishments

- Created `useDeepLink` hook that reads `tgWebAppStartParam` from Telegram launch params and navigates to the matching TMA route
- Mapped 7 startParam values (stats, dashboard, learn, train, support, leads, profile) to 5 unique routes
- Integrated hook into `AppRoutes` alongside existing `useBackButton()`
- `useRef(handled)` ensures the hook only fires once per app lifecycle, preventing re-triggers
- `location.pathname !== '/'` check gives WebAppInfo URL routing (inline buttons from Plan 01) priority over startParam
- TypeScript compiles cleanly with zero errors

## Task Commits

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Create useDeepLink hook and integrate into Router | 643d3c4 | New hook + Router.tsx integration |

## Files Created

| File | Purpose | Lines |
|------|---------|-------|
| `packages/webapp/src/shared/hooks/useDeepLink.ts` | startParam -> route navigation hook | 52 |

## Files Modified

| File | Changes |
|------|---------|
| `packages/webapp/src/app/Router.tsx` | Added useDeepLink import and call in AppRoutes |

## Decisions Made

1. **tgWebAppStartParam property name** -- SDK v3 `retrieveLaunchParams()` returns launch params with `tgWebApp*` prefixed keys (matching raw Telegram query parameters). The `startParam` name only exists inside `initData`. Using the correct property name with an `as string | undefined` cast for type safety.

2. **WebAppInfo URL priority** -- When the TMA is opened via an inline web_app button (Plan 01), BrowserRouter already routes to the correct path via WebAppInfo.url. The `location.pathname !== '/'` guard ensures startParam is only processed for direct link launches where the path is still root.

3. **replace: true navigation** -- Deep link navigation uses `replace: true` so the root path does not appear in browser history, providing clean back-button behavior.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SDK property name mismatch**
- **Found during:** Task 1 verification (TypeScript compilation)
- **Issue:** Plan specified `const { startParam } = retrieveLaunchParams()` but SDK v3 uses `tgWebAppStartParam` as the property name in the LaunchParamsSchema (valibot LooseObjectSchema). Destructuring `startParam` yielded type `{}` (from LooseObjectSchema's catch-all index), causing TS2538.
- **Fix:** Changed to `const lp = retrieveLaunchParams(); const startParam = lp.tgWebAppStartParam as string | undefined;`
- **Files modified:** `packages/webapp/src/shared/hooks/useDeepLink.ts`
- **Commit:** 643d3c4

## Issues Encountered

None beyond the SDK type deviation noted above.

## Next Phase Readiness

Plan 07-02 completes Phase 7 (Bot Integration). Both plans are done:
- 07-01: Bot inline button web_app URLs with path routing
- 07-02: Deep link fallback via startParam for direct launches

The TMA now supports both routing mechanisms:
1. **Inline buttons** (primary): WebAppInfo.url paths handled natively by BrowserRouter
2. **Direct links** (fallback): tgWebAppStartParam mapped to routes by useDeepLink hook
