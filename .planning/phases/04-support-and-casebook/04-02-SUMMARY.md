---
phase: 04-support-and-casebook
plan: 02
subsystem: ui
tags: [react, casebook, search, debounce, postrest-ilike, deep-link, filter-chips]

# Dependency graph
requires:
  - phase: 01-foundation-and-auth
    provides: InsForge client, auth store, design system, Router
  - phase: 04-support-and-casebook (plan 01)
    provides: Support feature pattern, DraftDisplay clipboard pattern, openTelegramLink pattern
provides:
  - Casebook browsing with search, filters, and My Entries toggle
  - Casebook detail view with full analysis sections
  - Use as Template deep link to bot /support
  - Reusable useDebouncedValue hook in shared/hooks
  - Casebook query key factory
affects: [05-leads-and-settings, 06-engagement-and-scenarios]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PostgREST .or() with ilike for multi-field keyword search"
    - "escapeIlike for % and _ special character safety"
    - "useDebouncedValue generic hook for search debouncing"
    - "Filter chip rows with horizontal scroll and All/toggle pattern"
    - "useCasebookFilterOptions with client-side dedup and 5min staleTime"

key-files:
  created:
    - packages/webapp/src/features/casebook/hooks/useCasebook.ts
    - packages/webapp/src/features/casebook/hooks/useCasebookEntry.ts
    - packages/webapp/src/features/casebook/components/SearchBar.tsx
    - packages/webapp/src/features/casebook/components/CasebookFilters.tsx
    - packages/webapp/src/features/casebook/components/CasebookCard.tsx
    - packages/webapp/src/features/casebook/components/CasebookList.tsx
    - packages/webapp/src/features/casebook/components/CasebookDetail.tsx
    - packages/webapp/src/shared/hooks/useDebouncedValue.ts
  modified:
    - packages/webapp/src/pages/Casebook.tsx
    - packages/webapp/src/lib/queries.ts
    - packages/webapp/src/app/Router.tsx

key-decisions:
  - "Team-wide casebook by default, My Entries toggle adds .eq('created_from_user', telegramId) filter"
  - "Filter options fetched via separate useCasebookFilterOptions hook with 5min staleTime"
  - "Search debouncing in parent (Casebook page) via useDebouncedValue, not in SearchBar component"

patterns-established:
  - "PostgREST ilike search with escapeIlike utility for special characters"
  - "useDebouncedValue<T> generic hook for any debounced value"
  - "FilterChip + FilterRow pattern for horizontal scrollable chip filters"
  - "My Entries toggle as additive filter on team-wide queries"

# Metrics
duration: 3min
completed: 2026-02-03
---

# Phase 4 Plan 2: Casebook Browser Summary

**Searchable and filterable casebook browser with My Entries toggle, detail view with analysis sections, copy-to-clipboard, and Use as Template deep link to bot**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-03T22:16:29Z
- **Completed:** 2026-02-03T22:19:58Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Casebook list with persona/scenario badges, quality score indicators, and draft preview cards
- Multi-field keyword search via PostgREST ilike with 300ms debounce and special character escaping
- Filter chips for persona type, scenario type, and industry populated from actual database values
- "My Entries" toggle chip filters to current user's entries via created_from_user
- Detail view with prospect analysis, closing strategy, engagement tactics, and draft response sections
- Copy button with clipboard API + textarea fallback, "Use as Template" deep link to bot

## Task Commits

Each task was committed atomically:

1. **Task 1: Casebook hooks, debounce utility, query keys, and Router fix** - `edb3e8a` (feat)
2. **Task 2: Casebook page with list, search, filters, detail view, and template action** - `073d9e3` (feat)

## Files Created/Modified
- `packages/webapp/src/features/casebook/hooks/useCasebook.ts` - useCasebook hook with search/filter/showMyOnly, useCasebookFilterOptions for unique values
- `packages/webapp/src/features/casebook/hooks/useCasebookEntry.ts` - Single entry fetch by ID
- `packages/webapp/src/features/casebook/components/SearchBar.tsx` - Search input with icon and clear button
- `packages/webapp/src/features/casebook/components/CasebookFilters.tsx` - My Entries toggle + persona/scenario/industry filter chips
- `packages/webapp/src/features/casebook/components/CasebookCard.tsx` - Compact card with badges, score, and preview
- `packages/webapp/src/features/casebook/components/CasebookList.tsx` - List with loading skeletons and contextual empty states
- `packages/webapp/src/features/casebook/components/CasebookDetail.tsx` - Full detail with analysis sections, copy, and template action
- `packages/webapp/src/shared/hooks/useDebouncedValue.ts` - Reusable generic debounce hook
- `packages/webapp/src/pages/Casebook.tsx` - Page with nested sub-routes (index + :entryId)
- `packages/webapp/src/lib/queries.ts` - Added casebook query key factory
- `packages/webapp/src/app/Router.tsx` - Fixed /casebook to /casebook/* for sub-routes

## Decisions Made
- Team-wide casebook by default (no user filter), My Entries toggle adds .eq('created_from_user', telegramId) -- casebook is a shared team resource
- Filter options fetched via separate useCasebookFilterOptions hook with 5-minute staleTime since options rarely change
- Search debouncing handled in parent (Casebook page) via useDebouncedValue, keeping SearchBar a pure controlled component
- escapeIlike utility escapes % and _ before PostgREST ilike queries for safety

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 4 complete (both Support and Casebook plans done)
- Ready to proceed to Phase 5 (Leads & Settings) or Phase 6 (Engagement & Scenarios)
- Casebook feature provides foundation for future scenario generation from casebook entries (Phase 6)

---
*Phase: 04-support-and-casebook*
*Completed: 2026-02-03*
