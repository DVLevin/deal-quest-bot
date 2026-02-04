---
phase: 05-leads-and-profile-settings
plan: 01
subsystem: ui
tags: [react, tanstack-query, useMutation, optimistic-update, leads, pipeline, defensive-parsing]

# Dependency graph
requires:
  - phase: 01-foundation-and-auth
    provides: InsForge client, auth store, query key factory, shared types, UI components
  - phase: 04-support-and-casebook
    provides: SupportAnalysis type, parseOutputJson pattern, copyToClipboard pattern, Section component pattern
provides:
  - Lead list view with status badges
  - Lead detail view with all analysis sections
  - Lead status management with first TMA mutation (useMutation pattern)
  - Defensive parsers for lead TEXT JSON fields
  - Corrected LeadStatus enum (6 values matching bot)
  - LEAD_STATUS_CONFIG record for pipeline stage rendering
  - Query keys for leads and settings
affects: [05-02-settings, 06-admin, lead-activity-timeline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useMutation with optimistic cache update and rollback (first TMA write operation)
    - Activity log insertion on TMA-initiated status changes
    - TEXT JSON field defensive parsing (JSON.parse with try/catch, distinct from JSONB)

key-files:
  created:
    - packages/webapp/src/features/leads/types.ts
    - packages/webapp/src/features/leads/hooks/useLeads.ts
    - packages/webapp/src/features/leads/hooks/useLead.ts
    - packages/webapp/src/features/leads/hooks/useUpdateLeadStatus.ts
    - packages/webapp/src/features/leads/components/LeadCard.tsx
    - packages/webapp/src/features/leads/components/LeadList.tsx
    - packages/webapp/src/features/leads/components/LeadDetail.tsx
    - packages/webapp/src/features/leads/components/LeadStatusSelector.tsx
  modified:
    - packages/shared/src/enums.ts
    - packages/webapp/src/types/enums.ts
    - packages/webapp/src/types/tables.ts
    - packages/webapp/src/lib/queries.ts
    - packages/webapp/src/pages/Leads.tsx

key-decisions:
  - "LeadStatus fixed to 6 values matching bot: analyzed, reached_out, meeting_booked, in_progress, closed_won, closed_lost"
  - "EngagementPlanStep fixed to match bot structure: step_id, description, timing, status, suggested_text, completed_at"
  - "Lead TEXT fields parsed with JSON.parse try/catch; plain text fields (strategy, tactics, draft) returned as-is"
  - "First TMA mutation pattern: useMutation with onMutate optimistic update, onError rollback, onSettled invalidation"
  - "Status changes write activity_log entries so TMA-initiated changes are tracked"
  - "Engagement plan displayed read-only (step toggling deferred to bot)"

patterns-established:
  - "useMutation pattern: optimistic cache update with rollback for TMA write operations"
  - "Activity log entry creation on mutation: status_change type with old->new description"
  - "LeadListItem type: Pick<LeadRegistryRow, lightweight columns> for list performance"

# Metrics
duration: 3min
completed: 2026-02-04
---

# Phase 5 Plan 1: Lead Pipeline Summary

**Lead pipeline list/detail views with first TMA mutation, defensive TEXT JSON parsers, and corrected 6-value LeadStatus enum**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-04T01:32:05Z
- **Completed:** 2026-02-04T01:35:31Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Fixed critical LeadStatus enum mismatch (5 incorrect values -> 6 correct values matching bot)
- Built complete lead pipeline UI with list view (status badges, photo/avatar, relative dates) and detail view (7 content sections)
- Established first TMA mutation pattern with useMutation, optimistic cache updates, error rollback, and activity log creation
- Defensive parsers for all lead TEXT JSON fields with typeof guards and safe fallbacks

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix enums, create lead types, hooks, and query keys** - `0033982` (feat)
2. **Task 2: Lead list, detail, status selector, and Leads page** - `c3b1ed1` (feat)

## Files Created/Modified
- `packages/shared/src/enums.ts` - Fixed LeadStatus (6 values), added status_change to LeadActivityType
- `packages/webapp/src/types/enums.ts` - Same fixes (build-time copy)
- `packages/webapp/src/types/tables.ts` - Fixed EngagementPlanStep to match bot structure
- `packages/webapp/src/lib/queries.ts` - Added leads and settings query key factories
- `packages/webapp/src/features/leads/types.ts` - LEAD_STATUS_CONFIG, defensive parsers, formatLeadDate
- `packages/webapp/src/features/leads/hooks/useLeads.ts` - Paginated lead list hook (lightweight columns)
- `packages/webapp/src/features/leads/hooks/useLead.ts` - Single lead detail hook
- `packages/webapp/src/features/leads/hooks/useUpdateLeadStatus.ts` - First TMA mutation with optimistic update + activity log
- `packages/webapp/src/features/leads/components/LeadCard.tsx` - Compact lead card with photo, name, status badge
- `packages/webapp/src/features/leads/components/LeadList.tsx` - Lead list with loading/empty states
- `packages/webapp/src/features/leads/components/LeadDetail.tsx` - Full detail with 7 analysis sections + copy
- `packages/webapp/src/features/leads/components/LeadStatusSelector.tsx` - Horizontal scrollable pipeline stage pills
- `packages/webapp/src/pages/Leads.tsx` - Replaced placeholder with nested sub-routes (list + detail)

## Decisions Made
- LeadStatus fixed to 6 values matching bot STATUS_LABELS exactly (analyzed, reached_out, meeting_booked, in_progress, closed_won, closed_lost)
- EngagementPlanStep changed from step/action to step_id/description/timing/status to match bot's actual data model
- Lead TEXT fields (closing_strategy, engagement_tactics, draft_response) treated as plain text, not structured JSON -- returned as-is with null/empty guards
- prospect_analysis is the only TEXT field that needs JSON.parse (it contains SupportAnalysis-shaped JSON)
- Engagement plan displayed read-only for Phase 5 (step toggling handled by bot)
- Status changes create lead_activity_log entries with type 'status_change' for complete audit trail
- LeadListItem uses Pick<> for lightweight column selection (no large text fields in list queries)

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Lead pipeline UI complete, ready for Phase 5 Plan 2 (settings panel)
- useMutation pattern established and reusable for settings mutations
- Query keys for settings already registered in queries.ts

---
*Phase: 05-leads-and-profile-settings*
*Completed: 2026-02-04*
