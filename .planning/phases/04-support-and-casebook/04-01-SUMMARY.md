---
phase: 04-support-and-casebook
plan: 01
subsystem: ui
tags: [react, telegram-mini-app, support, insforge, clipboard, deep-link]

# Dependency graph
requires:
  - phase: 01-foundation-and-auth
    provides: InsForge client, auth store, query keys, shared UI components, Router with wildcard routes
provides:
  - Support feature directory with types, hooks, and display components
  - Defensive parseOutputJson parser for LLM JSONB output
  - Support page with 3 sub-routes (index, session detail, history)
  - Bot deep links for text analysis and screenshot analysis
  - Clipboard copy with textarea fallback
affects: [04-02 casebook may share SessionCard patterns, Phase 5 leads page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "parseOutputJson defensive parser pattern for nested LLM JSONB"
    - "Dual CTA pattern (primary action + secondary screenshot button)"
    - "Session detail with stacked analysis sections and dividers"

key-files:
  created:
    - packages/webapp/src/features/support/types.ts
    - packages/webapp/src/features/support/hooks/useSupportSessions.ts
    - packages/webapp/src/features/support/hooks/useSupportSession.ts
    - packages/webapp/src/features/support/components/SupportInput.tsx
    - packages/webapp/src/features/support/components/AnalysisDisplay.tsx
    - packages/webapp/src/features/support/components/StrategyDisplay.tsx
    - packages/webapp/src/features/support/components/TacticsDisplay.tsx
    - packages/webapp/src/features/support/components/DraftDisplay.tsx
    - packages/webapp/src/features/support/components/SessionCard.tsx
  modified:
    - packages/webapp/src/lib/queries.ts
    - packages/webapp/src/pages/Support.tsx

key-decisions:
  - "parseOutputJson with nested typeof guards following parseFeedback pattern from Phase 3"
  - "Dual CTA in SupportInput: primary Start Analysis + secondary Send Screenshot with Camera icon"
  - "openTelegramLink for all bot deep links (consistent with Phase 3 decision)"
  - "Clipboard copy with textarea fallback for older Telegram WebViews"
  - "refetchOnWindowFocus on both session queries for auto-refresh after bot interaction"

patterns-established:
  - "Support output parsing: nested defensive parser with helper functions per sub-object"
  - "Screenshot CTA button: secondary styled button with Camera icon deep-linking to bot"
  - "Session card: extract display data from JSONB via parser, never raw access"

# Metrics
duration: 3min
completed: 2026-02-03
---

# Phase 4 Plan 1: Support Mode Summary

**Support page with CTA deep links (text + screenshot), structured analysis display, engagement tactics, copyable draft response, and session history browsing**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-03T22:09:26Z
- **Completed:** 2026-02-03T22:12:40Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Support feature types with defensive parseOutputJson parser for all LLM JSONB fields
- Dual CTA: "Start Analysis in Bot" primary button + "Send Screenshot for Analysis" secondary button with Camera icon
- Full structured analysis display: prospect analysis, closing strategy, engagement tactics, draft response
- Copy-to-clipboard with textarea fallback, regenerate and save-to-casebook bot deep links
- Session history browsing with prospect info extracted from output_json

## Task Commits

Each task was committed atomically:

1. **Task 1: Support types, hooks, and query keys** - `c2de401` (feat)
2. **Task 2: Support page with display components, screenshot button, and sub-routes** - `4122662` (feat)

## Files Created/Modified
- `packages/webapp/src/features/support/types.ts` - SupportOutput interface with defensive parseOutputJson parser
- `packages/webapp/src/features/support/hooks/useSupportSessions.ts` - Paginated session list hook with refetchOnWindowFocus
- `packages/webapp/src/features/support/hooks/useSupportSession.ts` - Single session detail hook
- `packages/webapp/src/features/support/components/SupportInput.tsx` - Dual CTA with text analysis + screenshot deep links
- `packages/webapp/src/features/support/components/AnalysisDisplay.tsx` - Prospect analysis with signal strength badges
- `packages/webapp/src/features/support/components/StrategyDisplay.tsx` - Numbered closing strategy steps with objection handling
- `packages/webapp/src/features/support/components/TacticsDisplay.tsx` - LinkedIn actions, comment suggestion, timing
- `packages/webapp/src/features/support/components/DraftDisplay.tsx` - Draft message with copy/regenerate/save actions
- `packages/webapp/src/features/support/components/SessionCard.tsx` - Session preview card with prospect info from parseOutputJson
- `packages/webapp/src/lib/queries.ts` - Added support query key factory entries
- `packages/webapp/src/pages/Support.tsx` - Full page with 3 sub-routes (index, session/:sessionId, history)

## Decisions Made
- parseOutputJson follows exact parseFeedback pattern from Phase 3: typeof guards on every field, nested object validation
- Dual CTA pattern for SupportInput: primary button for text analysis, secondary button with Camera icon for screenshot analysis
- openTelegramLink (not openLink) for all bot deep links, consistent with Phase 3 decision
- Clipboard copy uses navigator.clipboard.writeText with textarea fallback for older WebViews
- refetchOnWindowFocus: true on both session hooks for auto-refresh when returning from bot

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Support feature complete, ready for Phase 4 Plan 2 (Casebook)
- SessionCard pattern can be reused/adapted for Casebook entry cards
- parseOutputJson pattern established for any future LLM JSONB parsing

---
*Phase: 04-support-and-casebook*
*Completed: 2026-02-03*
