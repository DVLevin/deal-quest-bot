---
phase: quick
plan: 003
subsystem: integration
tags: [deep-link, telegram, tma, react, aiogram, fsm]

requires:
  - phase: 15 (Conversational Re-analysis)
    provides: ReanalysisState FSM and context_input handlers
  - phase: 16 (TMA Lead Experience)
    provides: LeadDetail component with collapsible sections
provides:
  - TMA-to-bot deep linking for 4 lead actions (reanalyze, context, reresearch, advice)
  - Reusable openBotDeepLink utility for TMA
  - Bot /start deep link routing for lead action payloads and TMA payloads
affects: []

tech-stack:
  added: []
  patterns:
    - "openBotDeepLink utility centralizes TMA->bot deep link pattern"
    - "ActionChip pill component for inline action buttons"
    - "_handle_lead_deep_link helper for /start deep link routing"

key-files:
  created:
    - packages/webapp/src/shared/lib/deepLink.ts
  modified:
    - bot/handlers/start.py
    - packages/webapp/src/features/leads/components/LeadDetail.tsx

key-decisions:
  - "Advice action uses inline button delegation (not FSM) to reuse existing lead:advice callback handler"
  - "Reanalyze deep link routes to ReanalysisState.collecting_context (same entry point as context:add callback)"
  - "BOT_USERNAME uses VITE_BOT_USERNAME env var with DealQuestBot fallback"

duration: 3min
completed: 2026-02-06
---

# Quick Task 003: TMA-Bot Deep Actions Summary

**TMA-to-bot deep linking for lead actions with ActionChip UI and /start routing for reanalyze, context, reresearch, and advice payloads**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-06T15:17:31Z
- **Completed:** 2026-02-06T15:20:31Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Bot /start handler parses `lead_{action}_{id}` deep link payloads and routes to correct FSM state
- LeadDetail page shows 4 action chips (Re-analyze, Add Context, Re-research, Get Advice) below status selector
- Reusable `openBotDeepLink` utility encapsulates TMA->bot deep link pattern
- Existing TMA deep links (support, support_photo, settings) now route correctly in /start handler
- Non-existent lead IDs and ownership mismatches produce graceful error messages

## Task Commits

Each task was committed atomically:

1. **Task 1: Bot deep link routing in /start handler** - `65400cc` (feat)
2. **Task 2: TMA deep link utility and LeadDetail action buttons** - `d8dd6ac` (feat)

## Files Created/Modified
- `packages/webapp/src/shared/lib/deepLink.ts` - Reusable openBotDeepLink utility using Telegram SDK
- `bot/handlers/start.py` - Deep link payload parsing and routing for lead actions and TMA payloads
- `packages/webapp/src/features/leads/components/LeadDetail.tsx` - ActionChip component and 4 action buttons row

## Decisions Made
- Advice action uses inline button with `lead:advice:{id}` callback data to delegate to existing handler (avoids duplicating generation logic)
- Reanalyze deep link routes to `ReanalysisState.collecting_context` with same prompt as `context:add` callback (consistent UX)
- Context deep link routes to `LeadEngagementState.adding_context` (simpler text-only context flow)
- Bot username comes from `VITE_BOT_USERNAME` env var with `DealQuestBot` fallback (no hardcoding)
- ActionChip uses rounded-full pill design with surface-secondary palette (lightweight, horizontally scrollable)

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Deep linking is fully operational once TMA_URL and VITE_BOT_USERNAME are configured
- All 4 action flows reuse existing bot handlers (no new backend logic needed)

---
*Quick Task: 003-tma-bot-deep-actions*
*Completed: 2026-02-06*
