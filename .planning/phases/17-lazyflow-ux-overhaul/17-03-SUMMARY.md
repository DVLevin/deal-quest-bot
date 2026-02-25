---
phase: 17-lazyflow-ux-overhaul
plan: 03
subsystem: ui
tags: [react, smart-defaults, lead-management, pipeline-status, ux]

# Dependency graph
requires:
  - phase: 05-leads-settings
    provides: LeadStatusSelector, LeadNotes, LeadDetail components
  - phase: 16-tma-lead-experience
    provides: Lead detail collapsible section layout, status config
provides:
  - suggestNextStatus utility for pipeline status progression
  - getNotePlaceholder utility for context-aware note placeholders
  - Visual accent ring on suggested next status in LeadStatusSelector
  - Status-specific placeholder text in LeadNotes textarea
affects: [17-04, future lead management UX improvements]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Smart defaults pattern: utility functions in types.ts provide suggestions, components apply visual cues"
    - "Non-intrusive suggestion pattern: visual hints (ring accent) without forcing selection"

key-files:
  created: []
  modified:
    - packages/webapp/src/features/leads/types.ts
    - packages/webapp/src/features/leads/components/LeadStatusSelector.tsx
    - packages/webapp/src/features/leads/components/LeadNotes.tsx
    - packages/webapp/src/features/leads/components/LeadDetail.tsx

key-decisions:
  - "Pipeline progression order: analyzed -> reached_out -> meeting_booked -> in_progress -> closed_won"
  - "closed_lost is terminal with no suggested next status"
  - "Visual-only suggestion (ring-2 ring-accent/40) -- no forced selection or extra labels"
  - "Backward-compatible status prop on LeadNotes (optional, falls back to default placeholder)"

patterns-established:
  - "Smart defaults: utility functions compute suggestions, components render visual cues"
  - "Context-aware placeholders: status-specific hint text guides user input"

# Metrics
duration: 2min
completed: 2026-02-06
---

# Phase 17 Plan 03: Smart Defaults Summary

**Pipeline status suggestion with accent ring highlight and context-aware note placeholders per lead stage**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-06T14:31:38Z
- **Completed:** 2026-02-06T14:33:09Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added `suggestNextStatus` utility that computes the next logical pipeline status
- Added `getNotePlaceholder` utility that returns stage-specific note placeholder text
- LeadStatusSelector now highlights suggested next status with a subtle accent ring
- LeadNotes textarea shows context-aware placeholder based on current lead status (e.g., "How did the outreach go?" for reached_out)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add suggestNextStatus and getNotePlaceholder utilities** - `9482f26` (feat)
2. **Task 2: Wire smart defaults into LeadStatusSelector and LeadNotes** - `7258a05` (feat)

## Files Created/Modified
- `packages/webapp/src/features/leads/types.ts` - Added suggestNextStatus and getNotePlaceholder utility functions
- `packages/webapp/src/features/leads/components/LeadStatusSelector.tsx` - Added suggested next status visual highlight with accent ring
- `packages/webapp/src/features/leads/components/LeadNotes.tsx` - Added status prop and context-aware placeholder
- `packages/webapp/src/features/leads/components/LeadDetail.tsx` - Passes lead.status to LeadNotes component

## Decisions Made
- Pipeline progression follows LEAD_STATUS_CONFIG order: analyzed -> reached_out -> meeting_booked -> in_progress -> closed_won
- closed_lost is a terminal state with no suggested next (returns null)
- Visual cue is ring-2 ring-accent/40 with bg-accent/10 -- subtle enough not to confuse with active state
- LeadNotes status prop is optional for backward compatibility

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Smart defaults pattern established for reuse in other form components
- Ready for plan 04 (remaining LazyFlow UX features)

---
*Phase: 17-lazyflow-ux-overhaul*
*Completed: 2026-02-06*
