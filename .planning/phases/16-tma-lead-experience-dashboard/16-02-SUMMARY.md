---
phase: 16-tma-lead-experience-dashboard
plan: 02
subsystem: ui
tags: [react, collapsible, accordion, deep-link, engagement-plan, lead-detail]

# Dependency graph
requires:
  - phase: 05-leads-settings
    provides: "LeadDetail base component with flat section layout"
  - phase: 14-engagement-plan-execution
    provides: "Engagement plan steps with status toggle"
  - phase: 15.1-lead-enhancements
    provides: "Step status cycling (pending/done/skipped)"
provides:
  - "CollapsibleSection reusable UI component"
  - "Plan-first LeadDetail layout with three accordion sections"
  - "Deep link step highlighting via ?step=X query param"
affects: [16-03, 16-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Accordion pattern: single active section state with CollapsibleSection"
    - "Deep link highlighting: useSearchParams + scrollIntoView + timed visual pulse"

key-files:
  created:
    - "packages/webapp/src/shared/ui/CollapsibleSection.tsx"
  modified:
    - "packages/webapp/src/shared/ui/index.ts"
    - "packages/webapp/src/features/leads/components/LeadDetail.tsx"

key-decisions:
  - "Section component changed from Card-wrapped to plain div for nesting inside CollapsibleSection"
  - "Intelligence section only renders if any sub-content exists (analysis, strategy, tactics, draft, or web research)"
  - "Visual highlight clears after 3 seconds via useEffect timer"
  - "Progress badge shows overdue count (red) when available, otherwise completed/total (default)"

patterns-established:
  - "CollapsibleSection: icon + title + optional badge accordion with CSS max-h transition"
  - "Deep link step scroll: ?step=X param parsed via useSearchParams, scrollIntoView after 150ms delay"

# Metrics
duration: 2min
completed: 2026-02-06
---

# Phase 16 Plan 02: LeadDetail Plan-First Layout Summary

**Collapsible accordion layout for LeadDetail with Active Plan first, Intelligence and Activity as secondary sections, plus deep link step highlighting**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-06T13:12:17Z
- **Completed:** 2026-02-06T13:14:45Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created reusable CollapsibleSection component with icon, title, badge, and smooth expand/collapse animation
- Restructured LeadDetail from flat section list to three-section accordion (Active Plan / Intelligence / Activity)
- Active Plan section opens by default, making engagement steps immediately visible
- Deep link support: navigating to /leads/:id?step=X scrolls to and highlights the specified step with a 3-second pulse animation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CollapsibleSection UI component** - `e33080d` (feat)
2. **Task 2: Restructure LeadDetail with plan-first collapsible sections** - `1550e5a` (feat)

## Files Created/Modified
- `packages/webapp/src/shared/ui/CollapsibleSection.tsx` - Reusable accordion section with icon, title, badge, CSS transition
- `packages/webapp/src/shared/ui/index.ts` - Added CollapsibleSection export
- `packages/webapp/src/features/leads/components/LeadDetail.tsx` - Reorganized into three collapsible sections with deep link highlighting

## Decisions Made
- Changed inner Section component from Card-wrapped to plain div since it now nests inside CollapsibleSection (which already uses Card)
- Intelligence section conditionally rendered -- only shows if at least one sub-section has content
- Accordion allows only one section open at a time (clicking another section opens it and collapses the previous)
- Progress badge on Active Plan header shows overdue count in red or completed/total in default styling

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CollapsibleSection available for reuse in other views (e.g., Plan 03 dashboard)
- LeadDetail now has the plan-first layout ready for Plan 03 (Dashboard Overview) and Plan 04 (Plan Detail & Analytics)
- No blockers for subsequent plans

---
*Phase: 16-tma-lead-experience-dashboard*
*Completed: 2026-02-06*
