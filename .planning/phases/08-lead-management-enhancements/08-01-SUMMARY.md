---
phase: 08-lead-management-enhancements
plan: 01
subsystem: ui, database
tags: [leads, stale-indicator, source-tracking, migration, typescript, react]

# Dependency graph
requires:
  - phase: 05-leads-and-profile-settings
    provides: LeadCard, LeadDetail, useLeads, lead types, Badge component
provides:
  - lead_source field across DB, Python model, TypeScript types, enums
  - Stale lead indicator (getLeadStaleDays, STALE_THRESHOLD_DAYS)
  - Lead source badges (LEAD_SOURCE_CONFIG) in list and detail views
  - useLeads fetches lead_source and up to 100 leads
affects: [08-02 search/filter/grouping, future manual lead creation, future import feature]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stale calculation via date diff helper (getLeadStaleDays)"
    - "Badge config record pattern for source tracking (LEAD_SOURCE_CONFIG)"
    - "Vertical badge stacking in LeadCard with flex-col"

key-files:
  created:
    - migrations/003_lead_source_field.sql
  modified:
    - bot/storage/models.py
    - bot/handlers/support.py
    - packages/shared/src/enums.ts
    - packages/webapp/src/types/enums.ts
    - packages/shared/src/tables.ts
    - packages/webapp/src/types/tables.ts
    - packages/webapp/src/features/leads/hooks/useLeads.ts
    - packages/webapp/src/features/leads/types.ts
    - packages/webapp/src/features/leads/components/LeadCard.tsx
    - packages/webapp/src/features/leads/components/LeadDetail.tsx

key-decisions:
  - "lead_source column uses TEXT DEFAULT 'support_analysis' for automatic backfill of existing rows"
  - "lead_source in TypeScript uses string | null (not LeadSource union) matching DB column convention"
  - "Stale threshold set to 7 days, uses updated_at with created_at fallback"
  - "useLeads limit increased from 30 to 100 to prepare for Plan 02 client-side search"

patterns-established:
  - "Stale indicator pattern: getLeadStaleDays helper + STALE_THRESHOLD_DAYS constant"
  - "Source config pattern: LEAD_SOURCE_CONFIG record mapping DB values to badge props"

# Metrics
duration: 3min
completed: 2026-02-04
---

# Phase 8 Plan 01: Lead Source & Stale Indicators Summary

**Full-stack lead_source field (migration through UI) with stale warning badges and source tracking badges in LeadCard and LeadDetail**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-04T18:50:46Z
- **Completed:** 2026-02-04T18:53:25Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Added lead_source column to database with migration, Python model, and full TypeScript type chain (shared + webapp enums and tables)
- Stale leads (7+ days since updated_at) now show warning badges in both list view ("Xd ago") and detail view ("Stale Xd" with AlertTriangle icon)
- Lead source badges (AI Analysis / Manual / Import) display in both LeadCard and LeadDetail based on lead_source field
- Bot support handler explicitly sets lead_source="support_analysis" on new lead creation

## Task Commits

Each task was committed atomically:

1. **Task 1: Add lead_source field across full stack** - `7f9e310` (feat)
2. **Task 2: Add stale indicator and source badge to LeadCard and LeadDetail** - `d08dd1e` (feat)

## Files Created/Modified
- `migrations/003_lead_source_field.sql` - ALTER TABLE adding lead_source TEXT column with DEFAULT backfill
- `bot/storage/models.py` - Added lead_source field to LeadRegistryModel
- `bot/handlers/support.py` - Explicit lead_source="support_analysis" in LeadRegistryModel constructor
- `packages/shared/src/enums.ts` - Added LeadSource type
- `packages/webapp/src/types/enums.ts` - Added LeadSource type (inlined copy)
- `packages/shared/src/tables.ts` - Added lead_source to LeadRegistryRow
- `packages/webapp/src/types/tables.ts` - Added lead_source to LeadRegistryRow (inlined copy)
- `packages/webapp/src/features/leads/hooks/useLeads.ts` - Added lead_source to Pick type, select query, increased limit to 100
- `packages/webapp/src/features/leads/types.ts` - Added getLeadStaleDays, STALE_THRESHOLD_DAYS, LEAD_SOURCE_CONFIG
- `packages/webapp/src/features/leads/components/LeadCard.tsx` - Stale badge, source badge, vertical badge stack
- `packages/webapp/src/features/leads/components/LeadDetail.tsx` - Stale badge with AlertTriangle, source badge in header

## Decisions Made
- [08-01]: lead_source column uses TEXT DEFAULT 'support_analysis' for automatic backfill of all existing rows
- [08-01]: lead_source in LeadRegistryRow TypeScript type uses `string | null` (not LeadSource union) matching DB column convention used by all other fields
- [08-01]: Stale threshold set to 7 days, uses updated_at with created_at fallback
- [08-01]: useLeads limit increased from 30 to 100 to prepare for Plan 02 client-side search/filter

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

Run migration `migrations/003_lead_source_field.sql` on InsForge database to add the lead_source column.

## Next Phase Readiness
- lead_source field is available across the full stack for Plan 02
- useLeads hook fetches up to 100 leads, ready for client-side search/filter
- LeadListItem type includes lead_source, enabling filter chips by source in Plan 02

---
*Phase: 08-lead-management-enhancements*
*Completed: 2026-02-04*
