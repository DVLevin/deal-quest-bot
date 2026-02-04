# Phase 8: Lead Management Enhancements - Research

**Researched:** 2026-02-04
**Domain:** React/TypeScript TMA frontend - lead management UI enhancements
**Confidence:** HIGH

## Summary

Phase 8 is entirely about frontend (TMA) enhancements to the existing lead management feature. The codebase already has a complete lead feature at `packages/webapp/src/features/leads/` with list, detail, status management, notes, and activity timeline. The five requirements (LEAD-V11-01 through 05) add stale indicators, lead source tracking, company grouping, type completeness, and search/filter.

A critical finding is that the `lead_source` field referenced in requirements LEAD-V11-02 and LEAD-V11-04 does NOT exist anywhere in the codebase -- not in the Python model, not in the database schema, not in any migration. This field must be added via database migration, Python model update, and TypeScript type update. All other fields mentioned in LEAD-V11-04 (web_research, engagement_plan, next_followup, followup_count, original_context) ALREADY EXIST in both Python and TypeScript types.

The project has an established pattern for search and filter from the Casebook feature (SearchBar component, useDebouncedValue hook, PostgREST `.or()` with `ilike` queries, FilterChip components) that should be reused for leads search/filter. All filtering and grouping can be done client-side since the lead list is already limited to 30 items per user.

**Primary recommendation:** Start with LEAD-V11-04 (type additions including lead_source migration) since it unblocks LEAD-V11-02. Then implement the UI features (stale indicator, source display, search/filter, company grouping) which are all client-side changes to existing components.

## Standard Stack

The established libraries/tools for this domain:

### Core (already installed, no new dependencies needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^18.3.1 | UI framework | Already in use |
| @tanstack/react-query | ^5.90.0 | Data fetching/caching | Already used for all InsForge queries |
| @insforge/sdk | latest | PostgREST client (Supabase-compatible) | Already used for all DB queries |
| lucide-react | ^0.562.0 | Icons | Already used across all components |
| class-variance-authority | ^0.7.0 | Variant-based styling | Badge component uses CVA |
| tailwindcss | ^4.1.0 | Utility CSS | All components use Tailwind |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx + tailwind-merge | ^2.0.0 + ^3.0.0 | Class merging (via `cn()`) | Conditional class application |
| zustand | ^5.0.10 | Client state | Auth store (telegramId) |

### No New Dependencies Needed
This phase requires zero new npm packages. All features can be built with existing libraries and patterns.

**Installation:**
```bash
# No installation needed -- all dependencies already present
```

## Architecture Patterns

### Existing Project Structure (features/leads/)
```
packages/webapp/src/features/leads/
  components/
    LeadCard.tsx          # List item card (needs stale badge, source badge)
    LeadDetail.tsx        # Full detail view (needs stale indicator, source display)
    LeadList.tsx          # List container (needs search/filter/grouping)
    LeadStatusSelector.tsx # Status pills
    LeadNotes.tsx         # Note editing
    ActivityTimeline.tsx  # Activity log
  hooks/
    useLeads.ts           # List query (needs search columns added)
    useLead.ts            # Single lead query
    useLeadActivities.ts  # Activity log query
    useAddLeadNote.ts     # Note mutation
    useUpdateLeadStatus.ts # Status mutation
  types.ts                # Status config, parsers, formatLeadDate
```

### Pattern 1: Client-Side Filtering (Recommended for Lead Search/Filter)
**What:** Fetch all user leads (max 30-50), filter client-side with React state
**When to use:** When the dataset is small (user's leads are ~30 max from useLeads limit)
**Why preferred:** The current `useLeads` hook already fetches 30 leads. With search/filter, we should increase this to ~100 or remove the limit (users rarely have 100+ leads). Client-side filtering avoids multiple PostgREST round-trips and provides instant feedback.

```typescript
// Existing pattern from useLeads.ts -- fetch lightweight columns
export type LeadListItem = Pick<LeadRegistryRow,
  'id' | 'prospect_name' | 'prospect_first_name' | 'prospect_last_name' |
  'prospect_company' | 'prospect_title' | 'status' | 'photo_url' |
  'input_type' | 'created_at' | 'updated_at' | 'lead_source'  // add lead_source
>;

// Client-side filter function
function filterLeads(
  leads: LeadListItem[],
  search: string,
  statusFilter: LeadStatus | '',
): LeadListItem[] {
  let filtered = leads;
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(lead =>
      (lead.prospect_name?.toLowerCase().includes(q)) ||
      (lead.prospect_first_name?.toLowerCase().includes(q)) ||
      (lead.prospect_last_name?.toLowerCase().includes(q)) ||
      (lead.prospect_company?.toLowerCase().includes(q))
    );
  }
  if (statusFilter) {
    filtered = filtered.filter(lead => lead.status === statusFilter);
  }
  return filtered;
}
```

### Pattern 2: Server-Side Search (Alternative for PostgREST ilike)
**What:** Send search term to PostgREST using `.or()` with `ilike` patterns
**When to use:** When dataset is large and client-side filtering would be expensive
**Exists in codebase:** `useCasebook.ts` uses this pattern for casebook search

```typescript
// Existing pattern from useCasebook.ts
if (keyword && keyword.trim().length > 0) {
  const escaped = escapeIlike(keyword.trim());
  query = query.or(
    `prospect_name.ilike.%${escaped}%,prospect_company.ilike.%${escaped}%`,
  );
}
```

**Recommendation:** Use Pattern 1 (client-side filtering). The lead list is user-scoped and small. Client-side provides better UX (instant results, no loading between filter changes).

### Pattern 3: Stale Date Calculation
**What:** Compute staleness from `updated_at` or `created_at` timestamps
**When to use:** LEAD-V11-01 stale indicator
**Example:**

```typescript
// Pure function, no external dependencies needed
function getLeadStaleDays(updatedAt: string | null, createdAt: string | null): number {
  const dateStr = updatedAt ?? createdAt;
  if (!dateStr) return 0;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 0;
    return Math.floor((Date.now() - date.getTime()) / 86400000);
  } catch {
    return 0;
  }
}

function isStale(staleDays: number): boolean {
  return staleDays >= 7;
}
```

### Pattern 4: Company Grouping with Collapsible Headers
**What:** Group leads by `prospect_company`, show collapsible sections
**When to use:** LEAD-V11-03 company grouping view mode
**Example:**

```typescript
// Group leads by company
function groupByCompany(leads: LeadListItem[]): Map<string, LeadListItem[]> {
  const groups = new Map<string, LeadListItem[]>();
  for (const lead of leads) {
    const company = lead.prospect_company || 'No Company';
    const existing = groups.get(company) || [];
    existing.push(lead);
    groups.set(company, existing);
  }
  return groups;
}

// Collapsible state managed with React useState
const [collapsedCompanies, setCollapsedCompanies] = useState<Set<string>>(new Set());

function toggleCompany(company: string) {
  setCollapsedCompanies(prev => {
    const next = new Set(prev);
    if (next.has(company)) next.delete(company);
    else next.add(company);
    return next;
  });
}
```

### Pattern 5: Reuse Existing UI Components
**What:** The SearchBar, Badge, FilterChip patterns already exist
**Source files:**
- `features/casebook/components/SearchBar.tsx` -- generic search input (currently has casebook placeholder, can be parameterized or copied)
- `shared/ui/Badge.tsx` -- CVA-based badge with variants: default, success, warning, error, info, brand
- `features/casebook/components/CasebookFilters.tsx` -- FilterChip pattern for horizontal-scroll filter pills
- `shared/hooks/useDebouncedValue.ts` -- debounce hook for search input

### Anti-Patterns to Avoid
- **Don't add server-side search for leads:** Dataset is too small (max ~30-50 per user) to justify PostgREST queries per keystroke. Client-side is faster and simpler.
- **Don't create a new view mode toggle component:** Use the existing FilterChip pattern from CasebookFilters for both status filter and view mode (list vs grouped).
- **Don't modify the useLeads hook signature excessively:** Keep the hook simple (fetch all leads), do filtering in the component layer or a useMemo.
- **Don't hand-roll date calculation utilities:** The existing `formatLeadDate` in `types.ts` already handles relative dates. Extend it rather than creating a parallel utility.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Search input with clear button | Custom input | Reuse/adapt `SearchBar` from casebook | Already handles clear button, focus styles, 44px touch target |
| Filter chips UI | Custom toggle buttons | Reuse `FilterChip` pattern from `CasebookFilters` | Already handles active/inactive state, mobile scroll |
| Debounced search | Manual setTimeout | `useDebouncedValue` hook from `shared/hooks/` | Already battle-tested with 300ms default |
| Badge variants | Custom styled spans | `Badge` component from `shared/ui/` | Has success, warning, error, info, brand, default variants |
| Relative date display | Date library (date-fns, etc.) | Extend existing `formatLeadDate` in `features/leads/types.ts` | Already handles just now, minutes, hours, days, and formatted dates |
| PostgREST ilike escaping | Manual regex | Reuse `escapeIlike` from `useCasebook.ts` (or just do client-side filtering) | Edge cases with % and _ already handled |

**Key insight:** The Casebook feature already solved search + filter + list display with the exact same tech stack. The leads feature should follow the same patterns.

## Common Pitfalls

### Pitfall 1: lead_source Column Does Not Exist Yet
**What goes wrong:** LEAD-V11-02 and LEAD-V11-04 reference a `lead_source` field that does not exist anywhere in the codebase -- not in the database, not in the Python model, not in TypeScript types.
**Why it happens:** The requirements were written with the assumption that this field would be added. It was planned but never migrated.
**How to avoid:** Create a database migration to add the column BEFORE updating any types or components. The migration must:
1. Add `lead_source TEXT DEFAULT 'support_analysis'` to the `lead_registry` table
2. Update the Python `LeadRegistryModel` to include `lead_source: str = "support_analysis"`
3. Update both TypeScript type files (shared + webapp)
4. Add `LeadSource` type to enums.ts (shared + webapp)
**Warning signs:** TypeScript build errors if you try to reference `lead_source` before adding it to the type, runtime errors if the column doesn't exist in the database.

### Pitfall 2: Shared Types Must Be Updated in TWO Places
**What goes wrong:** The project has types in both `packages/shared/src/tables.ts` AND `packages/webapp/src/types/tables.ts` (build-time copy for Railway). Updating only one causes type mismatches.
**Why it happens:** Railway's `root_dir=packages/webapp` isolation means it cannot access `../shared/` during build. Types are manually kept in sync.
**How to avoid:** Always update BOTH files when changing types. Update shared first, then copy to webapp. Same for `enums.ts`.
**Warning signs:** Types differ between shared and webapp copies. Build works locally but fails on Railway.

### Pitfall 3: LeadListItem Pick Type Must Include New Fields
**What goes wrong:** `LeadListItem` in `useLeads.ts` is a `Pick<LeadRegistryRow, ...>` selecting specific columns. If you add `lead_source` to `LeadRegistryRow` but forget to add it to the Pick and the SELECT string, the field will be undefined at runtime.
**Why it happens:** The Pick type and the PostgREST select string must stay in sync manually.
**How to avoid:** When adding any field needed in the list view:
1. Add to `LeadRegistryRow` interface
2. Add to `LeadListItem` Pick tuple
3. Add to the `.select()` string in `useLeads` queryFn
**Warning signs:** Field is `undefined` in LeadCard despite being in the type.

### Pitfall 4: Company Grouping Edge Cases
**What goes wrong:** Leads without `prospect_company` (null/empty) break grouping logic, or grouping creates too many single-item groups.
**Why it happens:** Not all leads have company data, especially text-input leads.
**How to avoid:**
- Group null/empty company leads into an "Other" / "No Company" group
- Sort groups by contact count (largest first) or alphabetically
- Show ungrouped (flat) view as default, grouped as toggle option
**Warning signs:** "No Company" group dominates the list; single-lead groups everywhere.

### Pitfall 5: Stale Indicator Based on Wrong Date
**What goes wrong:** Using `created_at` instead of `updated_at` for staleness means newly-updated leads still show as stale if they were created long ago.
**Why it happens:** Confusion between creation date and last-activity date.
**How to avoid:** Use `updated_at` as primary, fall back to `created_at` only if `updated_at` is null. The `updated_at` field is set on every status change, note update, and lead update.
**Warning signs:** Leads that were just updated still show stale badge.

### Pitfall 6: Search Input Performance on Mobile
**What goes wrong:** Filtering on every keystroke causes visible jank on low-end mobile devices.
**Why it happens:** Re-rendering the entire lead list on each character typed.
**How to avoid:** Use `useDebouncedValue` with 300ms delay (already exists). Keep filtered results in `useMemo`. The dataset is small (30-50 items) so this is low risk, but debouncing is still good practice.
**Warning signs:** Typing feels laggy in the search input.

## Code Examples

### Stale Lead Badge (LEAD-V11-01)

```typescript
// In features/leads/types.ts -- add helper
export function getLeadStaleDays(updatedAt: string | null, createdAt: string | null): number {
  const dateStr = updatedAt ?? createdAt;
  if (!dateStr) return 0;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 0;
    return Math.floor((Date.now() - date.getTime()) / 86400000);
  } catch {
    return 0;
  }
}

// In LeadCard.tsx -- add stale badge
const staleDays = getLeadStaleDays(lead.updated_at, lead.created_at);
const isStale = staleDays >= 7;
// ...
{isStale && (
  <Badge variant="warning" size="sm" className="shrink-0">
    {staleDays}d ago
  </Badge>
)}
```

### Lead Source Badge (LEAD-V11-02)

```typescript
// In types/enums.ts -- add source type
export type LeadSource = 'support_analysis' | 'manual' | 'import';

// In features/leads/types.ts -- add config
export const LEAD_SOURCE_CONFIG: Record<LeadSource, { label: string; variant: BadgeProps['variant'] }> = {
  support_analysis: { label: 'AI Analysis', variant: 'info' },
  manual: { label: 'Manual', variant: 'default' },
  import: { label: 'Import', variant: 'brand' },
};
```

### Search + Filter (LEAD-V11-05)

```typescript
// In Leads.tsx or a new LeadListView component
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebouncedValue(searchTerm, 300);
const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');

const filteredLeads = useMemo(() => {
  if (!leads) return [];
  let result = leads;
  if (debouncedSearch.trim()) {
    const q = debouncedSearch.toLowerCase();
    result = result.filter(lead =>
      (lead.prospect_name?.toLowerCase().includes(q)) ||
      (lead.prospect_first_name?.toLowerCase().includes(q)) ||
      (lead.prospect_last_name?.toLowerCase().includes(q)) ||
      (lead.prospect_company?.toLowerCase().includes(q))
    );
  }
  if (statusFilter) {
    result = result.filter(lead => lead.status === statusFilter);
  }
  return result;
}, [leads, debouncedSearch, statusFilter]);
```

### Company Grouping (LEAD-V11-03)

```typescript
// Pure grouping function
function groupLeadsByCompany(leads: LeadListItem[]): Array<{ company: string; leads: LeadListItem[] }> {
  const map = new Map<string, LeadListItem[]>();
  for (const lead of leads) {
    const key = lead.prospect_company?.trim() || 'No Company';
    const group = map.get(key) ?? [];
    group.push(lead);
    map.set(key, group);
  }
  return Array.from(map.entries())
    .map(([company, leads]) => ({ company, leads }))
    .sort((a, b) => b.leads.length - a.leads.length); // largest groups first
}

// Collapsible header component
function CompanyGroupHeader({ company, count, collapsed, onToggle }: {
  company: string; count: number; collapsed: boolean; onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 py-2 text-left"
    >
      <ChevronRight className={cn('h-4 w-4 text-text-hint transition-transform', !collapsed && 'rotate-90')} />
      <span className="text-sm font-semibold text-text">{company}</span>
      <Badge variant="default" size="sm">{count}</Badge>
    </button>
  );
}
```

### Database Migration (LEAD-V11-02 prerequisite)

```sql
-- migrations/003_lead_source_field.sql
-- Add lead_source column to track how each lead was created
ALTER TABLE lead_registry ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'support_analysis';

-- Backfill: all existing leads came from support analysis (bot /support command)
-- No UPDATE needed since DEFAULT handles existing rows
```

### TypeScript Type Update (LEAD-V11-04)

```typescript
// In LeadRegistryRow interface -- add field
export interface LeadRegistryRow {
  // ... existing fields ...
  lead_source: string;  // 'support_analysis' | 'manual' | 'import'
}
```

## Critical Finding: Field Parity Analysis

### Python LeadRegistryModel vs TypeScript LeadRegistryRow

Comparison of all fields:

| Field | Python Model | TS webapp/types | TS shared/types | Status |
|-------|:---:|:---:|:---:|--------|
| id | Yes | Yes | Yes | Synced |
| user_id | Yes | Yes | Yes | Synced |
| telegram_id | Yes | Yes | Yes | Synced |
| prospect_name | Yes | Yes | Yes | Synced |
| prospect_first_name | Yes | Yes | Yes | Synced |
| prospect_last_name | Yes | Yes | Yes | Synced |
| prospect_title | Yes | Yes | Yes | Synced |
| prospect_company | Yes | Yes | Yes | Synced |
| prospect_geography | Yes | Yes | Yes | Synced |
| photo_url | Yes | Yes | Yes | Synced |
| photo_key | Yes | Yes | Yes | Synced |
| prospect_analysis | Yes | Yes | Yes | Synced |
| closing_strategy | Yes | Yes | Yes | Synced |
| engagement_tactics | Yes | Yes | Yes | Synced |
| draft_response | Yes | Yes | Yes | Synced |
| status | Yes | Yes | Yes | Synced |
| notes | Yes | Yes | Yes | Synced |
| input_type | Yes | Yes | Yes | Synced |
| original_context | Yes | Yes | Yes | Synced |
| web_research | Yes | Yes | Yes | Synced |
| engagement_plan | Yes | Yes | Yes | Synced |
| last_contacted | Yes | Yes | Yes | Synced |
| next_followup | Yes | Yes | Yes | Synced |
| followup_count | Yes | Yes | Yes | Synced |
| created_at | Yes | Yes | Yes | Synced |
| updated_at | Yes | Yes | Yes | Synced |
| **lead_source** | **NO** | **NO** | **NO** | **MISSING EVERYWHERE** |

**Conclusion:** The LEAD-V11-04 requirement text is misleading -- it says "add missing fields (web_research, engagement_plan, next_followup, followup_count, lead_source, original_context)" but ALL of those fields EXCEPT `lead_source` already exist in both types. The only actual work for LEAD-V11-04 is adding the `lead_source` field.

### EngagementPlanStep Type Discrepancy

Note: The `EngagementPlanStep` interface differs between shared and webapp:

- **shared/tables.ts:** `{ step: string; action: string; timing?: string; [key: string]: unknown }`
- **webapp/types/tables.ts:** `{ step_id: number; description: string; timing: string; status: 'pending' | 'done'; suggested_text?: string; completed_at?: string | null }`

The webapp version is more detailed and matches actual data from the bot. The shared version is outdated. This is not blocking for Phase 8 but should be noted.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No search/filter on leads | Client-side search + status filter | Phase 8 | Users can find leads quickly |
| Flat lead list | Optional company grouping | Phase 8 | Multi-contact companies visible at a glance |
| No staleness indicator | Visual "X days ago" badge | Phase 8 | Users notice neglected leads |
| No lead source tracking | lead_source field on creation | Phase 8 | Users see where leads originated |

**Current state of leads feature:**
- List view: simple chronological list with status badge
- Detail view: full analysis with all sections
- No search, no filters, no grouping, no stale indicators
- All TypeScript fields already in sync with Python EXCEPT lead_source

## Open Questions

1. **View mode toggle or combined?**
   - What we know: LEAD-V11-03 asks for company grouping with collapsible headers. LEAD-V11-05 asks for search/filter.
   - What's unclear: Should grouped view be the default, or a toggle? Should search work within grouped view?
   - Recommendation: Make flat list the default (current behavior), add a "Group by Company" toggle button. Search/filter should work in both modes.

2. **lead_source backfill for existing leads**
   - What we know: All existing leads were created via the bot's `/support` command (support_analysis). No manual or import flow exists yet.
   - What's unclear: Should we backfill existing leads or only track source for new leads?
   - Recommendation: Use `DEFAULT 'support_analysis'` in the migration, which automatically backfills all existing rows. No UPDATE needed.

3. **Bot-side lead_source population**
   - What we know: The bot's `support.py` creates leads but does not set `lead_source`. The TMA has no lead creation UI.
   - What's unclear: Should Phase 8 also update the bot to explicitly set `lead_source = 'support_analysis'` on creation?
   - Recommendation: Yes, add `lead_source="support_analysis"` to the `LeadRegistryModel(...)` constructor in `bot/handlers/support.py` line 293. This is a one-line change and ensures future-proofing even though the DEFAULT handles it.

4. **Max leads to fetch for client-side filtering**
   - What we know: Current `useLeads` has `limit(30)`. For search to work well, we need all leads.
   - What's unclear: Could a user have 200+ leads? Would that be too many to fetch?
   - Recommendation: Increase limit to 100. If a user has 100+ leads, they are a power user and may benefit from server-side search later. For v1.1 scope, 100 is sufficient.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** -- Direct reading of all lead feature files, Python models, TypeScript types, migration files, and shared types
- `bot/storage/models.py` lines 82-108 -- Python LeadRegistryModel (source of truth for all DB fields)
- `packages/webapp/src/types/tables.ts` lines 107-134 -- TypeScript LeadRegistryRow
- `packages/shared/src/tables.ts` lines 107-134 -- Shared TypeScript LeadRegistryRow
- `packages/webapp/src/features/leads/` -- All 11 files in the leads feature module
- `packages/webapp/src/features/casebook/` -- Search, filter, list patterns to reuse
- `migrations/002_lead_person_company_fields.sql` -- Most recent lead migration

### Secondary (MEDIUM confidence)
- `bot/handlers/support.py` lines 291-313 -- Lead creation logic (confirms no lead_source field is set)
- `bot/storage/repositories.py` lines 321-476 -- LeadRegistryRepo (confirms field set used for create/update)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and in use, no new dependencies
- Architecture: HIGH -- patterns directly observed from Casebook feature and existing leads code
- Pitfalls: HIGH -- discovered from code analysis (lead_source missing, dual type files, Pick type sync)
- Type parity: HIGH -- complete field-by-field comparison performed

**Research date:** 2026-02-04
**Valid until:** 2026-03-06 (30 days -- stable codebase, no fast-moving dependencies)
