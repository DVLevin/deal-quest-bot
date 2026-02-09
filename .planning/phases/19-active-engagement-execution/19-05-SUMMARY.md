---
phase: 19-active-engagement-execution
plan: 05
subsystem: ui
tags: [react, draft-generation, db-message-bus, segmented-control, clipboard, toast]

# Dependency graph
requires:
  - phase: 19-04
    provides: "draft_requests table, CommentGeneratorAgent, draft poller background service"
  - phase: 19-02
    provides: "StepActionScreen component with draft display and copy UI"
  - phase: 19-03
    provides: "StepActionScreen wiring into LeadDetail with deep link auto-expand"
provides:
  - "DB message bus draft generation (useGenerateDraft insert + poll pattern)"
  - "Tabbed DraftCopyCard with segmented control (Short/Medium/Detailed)"
  - "Post-copy Done nudge toast with 8-second duration"
  - "Undo regeneration toast with previous draft restore"
  - "Platform detection badge on draft cards"
  - "Custom duration support in toast store"
affects: [lead-management, engagement-execution]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DB message bus polling (insert row -> poll for completion -> display result)"
    - "Segmented control tabs with activeTab state for option switching"
    - "Local draftResult state wrapper for undo capability (activeDraftResult pattern)"
    - "Post-action nudge toast with extended duration and action button"

key-files:
  created: []
  modified:
    - packages/webapp/src/features/leads/hooks/useGenerateDraft.ts
    - packages/webapp/src/features/leads/components/DraftCopyCard.tsx
    - packages/webapp/src/features/leads/components/StepActionScreen.tsx
    - packages/webapp/src/features/leads/components/LeadDetail.tsx
    - packages/webapp/src/shared/stores/toastStore.ts
    - packages/webapp/src/shared/ui/Toast.tsx
  deleted:
    - functions/generate-draft/deploy.js

key-decisions:
  - "DB message bus pattern (polling draft_requests table) instead of adding HTTP server to bot"
  - "activeDraftResult local state wrapper enables undo without fighting react-query mutation cache"
  - "Toast store duration field is backward-compatible (defaults to 4000ms)"
  - "Edge function removed entirely — bot CommentGeneratorAgent is single source of truth"

# Metrics
duration: 3min
completed: 2026-02-09
---

# Phase 19 Plan 05: TMA DB Message Bus Migration Summary

**useGenerateDraft migrated to DB message bus with tabbed DraftCopyCard, post-copy nudge toast, undo regeneration, and edge function removal**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-09
- **Completed:** 2026-02-09
- **Tasks:** 2 auto + 1 checkpoint (human-verify)
- **Files modified:** 7 (1 deleted)

## Accomplishments
- Rewrote useGenerateDraft to insert into draft_requests table and poll for bot completion (replacing direct edge function call)
- Rebuilt DraftCopyCard with segmented control tabs for Short/Medium/Detailed draft options
- Added platform detection badge (LinkedIn, Email, Twitter/X, etc.) on draft cards
- Added post-copy "Done — I posted it" toast with 8-second duration and action button
- Mark Done button pulses and changes label after user copies a draft
- Added undo toast for regeneration with previous draft restore via activeDraftResult state pattern
- Extended toast store with custom duration support (backward-compatible)
- Deleted obsolete edge function (functions/generate-draft/deploy.js)

## Task Commits

1. **Task 1: Rewrite useGenerateDraft + DraftCopyCard + toast store** - `101a981` (feat)
2. **Task 2: Wire StepActionScreen, LeadDetail, remove edge function** - `d662b6a` (feat)
3. **Task 3: Human verification** - checkpoint approved

## Files Created/Modified
- `packages/webapp/src/features/leads/hooks/useGenerateDraft.ts` - DB message bus mutation with polling
- `packages/webapp/src/features/leads/components/DraftCopyCard.tsx` - Tabbed segmented control with platform badge
- `packages/webapp/src/features/leads/components/StepActionScreen.tsx` - Structured draft rendering, post-copy nudge, undo detection
- `packages/webapp/src/features/leads/components/LeadDetail.tsx` - activeDraftResult state, undo handler, wired new props
- `packages/webapp/src/shared/stores/toastStore.ts` - Custom duration field
- `packages/webapp/src/shared/ui/Toast.tsx` - Duration-aware auto-dismiss
- `functions/generate-draft/deploy.js` - DELETED (replaced by bot agent pipeline)

## Decisions Made
- Used activeDraftResult local state wrapper (not mutation.data) to enable undo without cache manipulation
- Toast duration defaults to 4000ms for backward compatibility, 8000ms for nudge toasts
- Edge function deleted entirely rather than deprecated — bot agent pipeline has full Langfuse tracing and multi-platform support

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Toast.tsx needed duration propagation**
- **Found during:** Task 1 (toast store extension)
- **Issue:** Toast UI component hardcoded 4-second auto-dismiss, ignoring store's duration field
- **Fix:** Updated Toast.tsx to read duration from toast object and pass to dismiss timer
- **Files modified:** packages/webapp/src/shared/ui/Toast.tsx
- **Verification:** Custom duration toasts now dismiss at correct time

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for custom duration toasts to work correctly. No scope creep.

## Issues Encountered
None

## Next Phase Readiness
- Phase 19 complete — all 5 plans executed
- Ready for phase verification or milestone completion
- Pending: draft_requests migration (insforge/migrations/006_draft_requests.sql) must be run before testing

---
*Phase: 19-active-engagement-execution*
*Completed: 2026-02-09*
