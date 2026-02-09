---
phase: 21-seamless-tma-bot-integration
plan: 03
subsystem: ui
tags: [react, tanstack-query, polling, toasts, insforge, fire-and-forget]

# Dependency graph
requires:
  - phase: 21-02
    provides: tma_events table and bot-side event poller for confirmations
provides:
  - emitTmaEvent helper for fire-and-forget event insertion from TMA
  - useBotNotifications polling hook for async work completion toasts
  - TMA mutation hooks wired to emit events on success
affects: [21-04-bot-confirmation-messages]

# Tech tracking
tech-stack:
  added: []
  patterns: [fire-and-forget event emission via .catch(() => {}), polling with seen-ID dedup via useRef<Set>]

key-files:
  created:
    - packages/webapp/src/lib/tmaEvents.ts
    - packages/webapp/src/features/leads/hooks/useBotNotifications.ts
  modified:
    - packages/webapp/src/features/leads/hooks/useUpdatePlanStep.ts
    - packages/webapp/src/features/leads/hooks/useUpdateLeadStatus.ts
    - packages/webapp/src/features/admin/hooks/useAssignLead.ts
    - packages/webapp/src/features/admin/components/AssignMemberModal.tsx
    - packages/webapp/src/features/leads/components/LeadDetail.tsx
    - packages/webapp/src/pages/Dashboard.tsx

key-decisions:
  - "emitTmaEvent uses double fire-and-forget: try/catch in helper + .catch at call site"
  - "useBotNotifications polls at 10s interval (lighter than 3s draft polling) with 60s window"
  - "Seen-ID dedup uses useRef<Set<string>> with 'draft:{id}' / 'plan:{id}' keys"
  - "memberName added as optional field to AssignVars for event payload enrichment"

patterns-established:
  - "Fire-and-forget event pattern: emitTmaEvent in onSettled with .catch(() => {})"
  - "Polling notification pattern: useQuery + useRef<Set> dedup + useEffect toast display"

# Metrics
duration: 4min
completed: 2026-02-09
---

# Phase 21 Plan 03: TMA Event Wiring Summary

**Fire-and-forget event emission from TMA mutations to tma_events table, plus polling hook for bot async work completion toasts with navigation links**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-09T16:11:37Z
- **Completed:** 2026-02-09T16:16:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- TMA mutation hooks (step update, status change, lead assignment) emit events to tma_events table on success for bot-side Telegram confirmations
- useBotNotifications hook polls draft_requests and plan_requests for completed async work, showing toast notifications with "View" navigation buttons
- All event emissions are completely non-blocking -- failures never affect mutation flows

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TMA event emitter and wire into mutation hooks** - `ee5c01e` (feat)
2. **Task 2: Create bot notification polling hook and wire toasts** - `10be683` (feat)

## Files Created/Modified
- `packages/webapp/src/lib/tmaEvents.ts` - Fire-and-forget event emitter inserting rows into tma_events
- `packages/webapp/src/features/leads/hooks/useBotNotifications.ts` - Polling hook for bot async work with toast display
- `packages/webapp/src/features/leads/hooks/useUpdatePlanStep.ts` - Added step_completed/step_skipped event emission
- `packages/webapp/src/features/leads/hooks/useUpdateLeadStatus.ts` - Added status_changed event emission
- `packages/webapp/src/features/admin/hooks/useAssignLead.ts` - Added lead_assigned event emission
- `packages/webapp/src/features/admin/components/AssignMemberModal.tsx` - Passes memberName to assign mutation
- `packages/webapp/src/features/leads/components/LeadDetail.tsx` - Wired useBotNotifications hook
- `packages/webapp/src/pages/Dashboard.tsx` - Wired useBotNotifications hook

## Decisions Made
- emitTmaEvent uses double fire-and-forget: try/catch in the helper function plus .catch(() => {}) at each call site for maximum safety
- useBotNotifications polls at 10-second intervals (lighter than the 3-second polling used by active draft generation)
- 60-second window for completed items keeps query result sets tiny
- memberName added as optional field to AssignVars so the modal can pass the display name for richer bot notifications
- LeadDetail.tsx and Dashboard.tsx wiring was already present from a prior plan-04 execution (commit 6546046) -- no-op edits confirmed existing integration

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added memberName to AssignMemberModal caller**
- **Found during:** Task 1 (useAssignLead wiring)
- **Issue:** Plan specified `member_name` in the event payload but AssignVars only had leadId/telegramId -- no way to get the display name
- **Fix:** Added optional `memberName` field to AssignVars and updated AssignMemberModal to pass `displayName` when calling assign.mutate
- **Files modified:** packages/webapp/src/features/admin/hooks/useAssignLead.ts, packages/webapp/src/features/admin/components/AssignMemberModal.tsx
- **Verification:** grep confirms memberName flows from modal to event payload
- **Committed in:** ee5c01e (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Minor interface extension to support payload enrichment. No scope creep.

## Issues Encountered
- LeadDetail.tsx and Dashboard.tsx already had useBotNotifications wiring from a prior commit (6546046 from plan-04 pre-execution). The hook file itself was not yet created, so the commit added the new file while the component wiring was already in place.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- TMA-to-bot event pipeline complete: mutations emit events, bot poller picks them up
- Bot async work completion toasts working with navigation
- Ready for plan 04 (final integration testing and polish)

---
*Phase: 21-seamless-tma-bot-integration*
*Completed: 2026-02-09*

## Self-Check: PASSED

All 9 files verified present. Both task commits (ee5c01e, 10be683) found in git history.
