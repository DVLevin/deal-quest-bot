# Phase 5: Leads & Profile Settings - Research

**Researched:** 2026-02-04
**Domain:** Lead pipeline management (list, detail, status, notes, activity log), profile settings (LLM provider/model/API key), first TMA write operations (useMutation)
**Confidence:** HIGH

## Summary

Phase 5 builds two features: (1) a full lead pipeline manager in the Leads page and (2) LLM settings management in the Profile page. The lead pipeline is the TMA's most complex feature so far -- it introduces the first write operations (mutations) to InsForge from the frontend, requiring `useMutation` from TanStack Query for status updates, notes, and activity log entries.

The `lead_registry` and `lead_activity_log` tables already exist and are populated by the bot's `/support` command (which auto-creates lead entries) and `/leads` command (which manages them). The TMA needs to read this data and allow users to update lead status, add notes, and view activity history. The lead detail view reuses display patterns from Phase 4's Support page (analysis, strategy, tactics, draft sections), since `lead_registry` stores the same strategist output fields.

**CRITICAL:** The `LeadStatus` type in `packages/shared/src/enums.ts` and `packages/webapp/src/types/enums.ts` is WRONG. It defines `'meeting' | 'closed'` but the bot actually uses `'meeting_booked' | 'closed_won' | 'closed_lost'` (6 statuses, not 5). This must be fixed before any lead status work.

**Primary recommendation:** Build leads as list/detail with nested sub-routes (same pattern as Support and Casebook). Use `useMutation` with optimistic cache updates for status changes and note additions. Fix the LeadStatus enum to match the bot's actual values. Reuse Phase 4's Section/Card display patterns for the lead detail view. Profile settings should query the `users` table for current provider/model and use mutations to update them.

## Standard Stack

### Core (Already Installed -- No New Dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | ^5.90.x | Data fetching (useQuery) AND mutations (useMutation) -- first mutation use | Already configured, useMutation built-in |
| @insforge/sdk | latest | PostgREST queries AND mutations via `.from('table').update({}).eq()` and `.from('table').insert([{}])` | Already configured, Supabase-compatible API |
| zustand | ^5.0.x | Auth store (telegramId) -- no new stores needed | Already used |
| react-router | ^7.12.x | Nested sub-routes within /leads/* (already has wildcard) | Already configured |
| lucide-react | ^0.562.x | Icons for pipeline stages, activity types, settings | Already installed |
| class-variance-authority | ^0.7.x | Status badge variants (analyzed, reached_out, meeting_booked, etc.) | Already installed |

### Supporting (No New Dependencies)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @deal-quest/shared (inlined) | workspace:* | LeadRegistryRow, LeadActivityRow, LeadStatus types | All lead data display/mutations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| useMutation for status changes | Direct fetch + manual refetch | useMutation gives loading states, error handling, optimistic updates for free |
| Inline activity log entries from TMA | Bot-only activity creation | TMA should write activity entries for status changes it initiates (bot doesn't track TMA-initiated changes) |
| Separate settings page | Settings tab in Profile | PROF-05 spec says "from the Profile page" -- add as a section/sub-route under Profile |

**Installation:** No new packages needed. Phases 1-4 installed everything required.

## Architecture Patterns

### Recommended Project Structure
```
packages/webapp/src/
  features/
    leads/
      hooks/
        useLeads.ts               # Paginated lead list for current user
        useLead.ts                # Single lead detail by ID
        useLeadActivities.ts      # Activity log for a lead
        useUpdateLeadStatus.ts    # useMutation for status changes
        useAddLeadNote.ts         # useMutation for adding notes
      components/
        LeadList.tsx              # Paginated card list with status badges
        LeadCard.tsx              # Individual lead card (name, company, title, status)
        LeadDetail.tsx            # Full lead detail with all sections
        LeadStatusSelector.tsx    # Pipeline stage selector for status updates
        LeadNotes.tsx             # Notes display + add note form
        ActivityTimeline.tsx      # Chronological activity log
        LeadAnalysis.tsx          # Prospect analysis display (reuses Support pattern)
        LeadStrategy.tsx          # Closing strategy display
        LeadTactics.tsx           # Engagement tactics display
        LeadDraft.tsx             # Draft response with copy
        LeadEngagementPlan.tsx    # Step-by-step engagement plan
      types.ts                    # Defensive parsers for lead JSON fields
    settings/
      hooks/
        useUserSettings.ts        # Current provider/model from users table
        useUpdateSettings.ts      # useMutation for provider/model/key updates
      components/
        SettingsPanel.tsx         # Provider picker, model selector, API key input
  pages/
    Leads.tsx                    # Replaced: nested sub-routes (list, detail)
    Profile.tsx                  # Extended: add SettingsPanel component
  lib/
    queries.ts                   # Extended with leads and settings query keys
  types/
    enums.ts                     # FIXED: LeadStatus corrected to match bot
```

### Pattern 1: Nested Sub-Routes for Leads (Same as Support/Casebook)
**What:** Leads page has list view (index) and detail view (:leadId).
**When to use:** Already established in Phases 4 (Support, Casebook).
**Example:**
```typescript
// pages/Leads.tsx
import { Routes, Route, Navigate } from 'react-router';

export default function Leads() {
  return (
    <div className="space-y-4 px-4 pt-4 pb-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-accent" />
        <h1 className="text-xl font-bold text-text">Leads</h1>
      </div>
      <Routes>
        <Route index element={<LeadListView />} />
        <Route path=":leadId" element={<LeadDetailView />} />
        <Route path="*" element={<Navigate to="/leads" replace />} />
      </Routes>
    </div>
  );
}
```

The Router already has `<Route path="/leads/*" element={<Leads />} />` with wildcard.

### Pattern 2: First useMutation -- Status Update with Optimistic Cache Update
**What:** Phase 5 introduces the TMA's first write operations. Status changes should be optimistic (update UI immediately, roll back on error).
**When to use:** LEAD-03 status management, LEAD-04 notes.
**Example:**
```typescript
// features/leads/hooks/useUpdateLeadStatus.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { queryKeys } from '@/lib/queries';
import type { LeadRegistryRow } from '@/types/tables';
import type { LeadStatus } from '@/types/enums';

interface UpdateStatusVars {
  leadId: number;
  status: LeadStatus;
  telegramId: number;
}

export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, status }: UpdateStatusVars) => {
      const { data, error } = await getInsforge()
        .database.from('lead_registry')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (error) throw error;
      return data;
    },
    onMutate: async ({ leadId, status, telegramId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.leads.byUser(telegramId),
      });

      // Snapshot previous lead list
      const previousLeads = queryClient.getQueryData<LeadRegistryRow[]>(
        queryKeys.leads.byUser(telegramId),
      );

      // Optimistically update the lead's status in cache
      if (previousLeads) {
        queryClient.setQueryData(
          queryKeys.leads.byUser(telegramId),
          previousLeads.map((lead) =>
            lead.id === leadId ? { ...lead, status } : lead,
          ),
        );
      }

      return { previousLeads };
    },
    onError: (_err, { telegramId }, context) => {
      // Roll back on error
      if (context?.previousLeads) {
        queryClient.setQueryData(
          queryKeys.leads.byUser(telegramId),
          context.previousLeads,
        );
      }
    },
    onSettled: (_data, _err, { telegramId, leadId }) => {
      // Refetch to get true server state
      queryClient.invalidateQueries({
        queryKey: queryKeys.leads.byUser(telegramId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.leads.detail(leadId),
      });
    },
  });
}
```

### Pattern 3: Activity Log Entry Creation on Status Change
**What:** When the TMA updates a lead status, it should also create a `lead_activity_log` entry so the change is tracked. The bot's status handler does NOT create activity entries for status changes.
**When to use:** Every status change from the TMA should write an activity entry.
**Example:**
```typescript
// Write a status_change activity entry
const { error } = await getInsforge()
  .database.from('lead_activity_log')
  .insert([{
    lead_id: leadId,
    telegram_id: telegramId,
    activity_type: 'status_change',
    content: `Status changed from ${oldStatus} to ${newStatus}`,
  }]);
```

**Note on activity_type:** The current `LeadActivityType` enum defines `'context_update' | 'screenshot_comment' | 'ai_advice' | 'followup_sent'`. The value `'status_change'` is NOT in the enum. Since the database column has no CHECK constraint (it's a plain text column), the value `'status_change'` will work at the database level. Update the TypeScript enum to include it.

### Pattern 4: Defensive Parsing for Lead JSON Fields (Same as Support)
**What:** `lead_registry` stores `prospect_analysis`, `closing_strategy`, `engagement_tactics`, `draft_response` as string columns containing JSON (same data as support_sessions.output_json but stored as individual text columns). Must be parsed defensively.
**When to use:** Lead detail view displaying analysis/strategy/tactics/draft.
**Example:**
```typescript
// features/leads/types.ts
// The lead_registry stores JSON as TEXT strings, not JSONB.
// Must JSON.parse() with try/catch before accessing fields.

export function parseLeadAnalysis(raw: string | null): SupportAnalysis {
  if (!raw || raw.trim() === '' || raw === '{}' || raw === 'null') {
    return defaultAnalysis;
  }
  try {
    const obj = raw.trim().startsWith('{') ? JSON.parse(raw) : null;
    if (!obj || typeof obj !== 'object') return defaultAnalysis;
    return {
      prospect_type: typeof obj.prospect_type === 'string' ? obj.prospect_type : 'Unknown',
      seniority: typeof obj.seniority === 'string' ? obj.seniority : 'Unknown',
      // ... same typeof guard pattern as Phase 4
    };
  } catch {
    // If it's plain text (not JSON), return it in a text-only display
    return { ...defaultAnalysis, prospect_type: raw.slice(0, 100) };
  }
}
```

### Pattern 5: InsForge SDK Mutation API
**What:** The InsForge SDK follows Supabase-compatible patterns for writes.
**When to use:** All mutations (status update, note add, settings update).
**Reference from SDK README:**
```typescript
// Update
const { data, error } = await insforge.database
  .from('lead_registry')
  .update({ status: 'reached_out', updated_at: new Date().toISOString() })
  .eq('id', leadId);

// Insert
const { data, error } = await insforge.database
  .from('lead_activity_log')
  .insert([{
    lead_id: leadId,
    telegram_id: telegramId,
    activity_type: 'context_update',
    content: noteText,
  }]);
```

### Pattern 6: Profile Settings Panel
**What:** PROF-05 requires LLM provider/model selection and API key management mirroring the bot's /settings command. The `users` table already has `provider`, `openrouter_model`, and `encrypted_api_key` columns.
**When to use:** Settings section on the Profile page.
**Constraints:**
- Provider selection: `'openrouter' | 'anthropic'`
- Model selection: only relevant for OpenRouter (free models list from bot's settings.py)
- API key: the bot uses Fernet encryption (`bot/services/crypto.py`). The TMA CANNOT encrypt keys (no access to ENCRYPTION_KEY). API key management should deep-link to the bot's /settings command.
- Provider and model can be updated directly via InsForge (plain text columns, no encryption needed).

```typescript
// Settings can update provider and model directly
const { error } = await insforge.database
  .from('users')
  .update({ provider: 'openrouter', openrouter_model: 'openai/gpt-oss-120b' })
  .eq('telegram_id', telegramId);

// API key CANNOT be updated from TMA (requires Fernet encryption)
// Deep-link to bot: https://t.me/{botUsername}?start=settings
```

### Anti-Patterns to Avoid
- **Updating encrypted_api_key from TMA:** The bot uses Fernet symmetric encryption with a server-side ENCRYPTION_KEY. The TMA has no access to this key and cannot encrypt API keys. Always deep-link to the bot for API key changes.
- **Using the wrong LeadStatus values:** The enums.ts file is WRONG. Must fix before building.
- **Skipping activity log on status change:** The bot doesn't create activity entries for status changes, and the TMA won't either unless explicitly coded. Status changes without activity log entries make LEAD-05 incomplete.
- **Direct property access on JSON text columns:** `lead_registry.prospect_analysis` is a TEXT column containing JSON, not a JSONB column. Must JSON.parse() with try/catch.
- **Forgetting `updated_at` on mutations:** The bot always sets `updated_at` when updating a lead. The TMA must do the same.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Optimistic status updates | Manual state + refetch | `useMutation` with `onMutate` cache update | Built-in rollback, loading states, error handling |
| Status pipeline visualization | Custom SVG pipeline diagram | Horizontal badge row with active state highlight | Mobile-first, simpler, consistent with design system |
| Date formatting for activity log | Custom date parsing | `new Date(isoString).toLocaleDateString()` + relative time for recent entries | ISO strings from PostgREST are standard |
| JSON text field parsing | Direct JSON.parse without safety | Defensive parser functions with try/catch and typeof guards | Lead fields contain LLM-generated JSON as text strings |
| API key encryption | Client-side encryption attempt | Deep link to bot /settings | TMA has no access to ENCRYPTION_KEY |
| Clipboard copy for draft | Custom DOM manipulation | Existing `copyToClipboard()` pattern from Phase 4 | Already implemented and tested in DraftDisplay.tsx and CasebookDetail.tsx |

**Key insight:** Phase 5 introduces the TMA's first mutations. The pattern established here (useMutation + optimistic updates + activity logging) will be reused in Phase 6 (admin) and beyond. Getting this right is architecturally important.

## Common Pitfalls

### Pitfall 1: LeadStatus Enum Mismatch (CRITICAL)
**What goes wrong:** The TMA defines `LeadStatus = 'analyzed' | 'reached_out' | 'meeting' | 'in_progress' | 'closed'` (5 values). The bot actually uses `'analyzed' | 'reached_out' | 'meeting_booked' | 'in_progress' | 'closed_won' | 'closed_lost'` (6 values). Any lead with status `'meeting_booked'`, `'closed_won'`, or `'closed_lost'` will fail type checks or display incorrectly.
**Why it happens:** The shared types were defined speculatively in Phase 1 without verifying the bot's actual STATUS_LABELS constant in `bot/handlers/leads.py`.
**How to avoid:** Fix `LeadStatus` in both `packages/shared/src/enums.ts` AND `packages/webapp/src/types/enums.ts` to match the bot's actual values:
```typescript
export type LeadStatus =
  | 'analyzed'
  | 'reached_out'
  | 'meeting_booked'
  | 'in_progress'
  | 'closed_won'
  | 'closed_lost';
```
**Warning signs:** Status badges showing raw status strings instead of formatted labels, or missing statuses in the pipeline selector.

### Pitfall 2: First-Ever TMA Mutations -- No Existing Pattern to Copy
**What goes wrong:** All prior phases were read-only. Developers might try to use `useQuery` with manual refetch instead of `useMutation`, losing loading states, error handling, and optimistic updates.
**Why it happens:** No mutation hooks exist in the codebase yet. The pattern must be established from scratch.
**How to avoid:** Use TanStack Query's `useMutation` with the full `onMutate` / `onError` / `onSettled` lifecycle. Establish the pattern in `useUpdateLeadStatus.ts` first, then reuse for notes and settings.
**Warning signs:** Status update button with no loading indicator, no error feedback, or UI not updating until page refresh.

### Pitfall 3: Lead JSON Fields Are TEXT, Not JSONB
**What goes wrong:** `lead_registry.prospect_analysis`, `closing_strategy`, `engagement_tactics`, `draft_response` are TEXT columns containing JSON strings. Unlike `support_sessions.output_json` (which is JSONB and comes pre-parsed from PostgREST), these TEXT fields arrive as raw strings and must be JSON.parsed manually.
**Why it happens:** The bot's strategist agent stores its output into individual text columns (each section separately), not a single JSONB column.
**How to avoid:** Build parser functions that handle: (1) null/empty strings, (2) plain text (not JSON), (3) valid JSON objects, (4) malformed JSON. See Pattern 4 above.
**Warning signs:** "Unexpected token" errors when rendering lead details, or [Object object] displayed as text.

### Pitfall 4: Engagement Plan Is JSONB with step_id/status/description Structure
**What goes wrong:** `lead_registry.engagement_plan` is a JSONB array of objects, each with `step_id`, `description`, `timing`, `status`, `suggested_text`, `completed_at`. The bot's plan handler (`on_lead_plan` in leads.py) toggles `status` between `'pending'` and `'done'`. If the TMA displays this without understanding the structure, it shows raw JSON.
**Why it happens:** The engagement plan is generated by the bot's strategist agent and stored as JSONB. Its structure is implicit (not documented in types).
**How to avoid:** Type the engagement plan step interface:
```typescript
interface EngagementPlanStep {
  step_id: number;
  description: string;
  timing: string;
  status: 'pending' | 'done';
  suggested_text?: string;
  completed_at?: string | null;
}
```
Parse the array defensively (it comes from PostgREST as parsed JSON since it's a JSONB column, unlike the TEXT columns).
**Warning signs:** Engagement plan section showing `[object Object]` or crashing on `.map()`.

### Pitfall 5: Settings API Key Cannot Be Updated from TMA
**What goes wrong:** PROF-05 says "API key management (mirrors bot /settings)." If the implementer tries to update `encrypted_api_key` directly, the value won't be encrypted and the bot will fail to decrypt it.
**Why it happens:** The bot uses `CryptoService.encrypt()` (Fernet with `ENCRYPTION_KEY` from env). The TMA has no access to this secret.
**How to avoid:** The settings panel can update `provider` and `openrouter_model` directly (plain text columns). For API key management, show the current provider and a "Change API Key" button that deep-links to the bot's `/settings` command. Display API key status as "Set" or "Not set" based on whether `encrypted_api_key` is null.
**Warning signs:** Storing plain-text API keys in the database, or bot API calls failing after TMA "updates" the key.

### Pitfall 6: Activity Log Has No status_change Type
**What goes wrong:** LEAD-05 requires showing status changes in the activity timeline. But the bot's status update handler (`on_lead_status_update`) does NOT create activity log entries -- it only updates the `lead_registry.status` column. The `LeadActivityType` enum has no `'status_change'` value.
**Why it happens:** The bot was designed before the activity log visualization requirement. Status changes are tracked via the `updated_at` column but not logged as activities.
**How to avoid:** When the TMA updates a lead's status, it should also insert a `lead_activity_log` entry with `activity_type: 'status_change'`. Add `'status_change'` to the `LeadActivityType` enum in both shared and webapp types. For historical status changes (before Phase 5), the activity log will be empty -- that's expected.
**Warning signs:** Activity timeline missing status change events, or only showing context_update/ai_advice entries.

### Pitfall 7: Pagination Performance with Large Lead Lists
**What goes wrong:** The bot limits lead fetches to 50. If a user has many leads, the TMA must paginate properly. PostgREST `.range()` is the pattern established in Phase 2 (AttemptHistory).
**Why it happens:** Without explicit pagination, fetching all leads with full JSON text fields can be slow.
**How to avoid:** Use `.range(offset, offset + pageSize - 1)` for pagination, same as `useAttemptHistory`. For the list view, select only the columns needed for cards (id, prospect_name, prospect_company, prospect_title, status, photo_url, created_at) -- not the large text columns.
**Warning signs:** Slow initial load, fetching full analysis text for every lead in the list.

## Code Examples

### Query Key Factory Extensions
```typescript
// lib/queries.ts - additions for Phase 5
export const queryKeys = {
  // ... existing keys ...
  leads: {
    all: ['leads'] as const,
    byUser: (telegramId: number) => ['leads', telegramId] as const,
    detail: (leadId: number) => ['leads', 'detail', leadId] as const,
    activities: (leadId: number) => ['leads', 'activities', leadId] as const,
  },
  settings: {
    user: (telegramId: number) => ['settings', telegramId] as const,
  },
} as const;
```

### InsForge Query: Fetch Leads for List View (Lightweight)
```typescript
// features/leads/hooks/useLeads.ts
const { data, error } = await getInsforge()
  .database.from('lead_registry')
  .select('id, prospect_name, prospect_company, prospect_title, status, photo_url, input_type, created_at, updated_at')
  .eq('telegram_id', telegramId)
  .order('updated_at', { ascending: false })
  .limit(30);
```

### InsForge Query: Fetch Single Lead with All Fields
```typescript
// features/leads/hooks/useLead.ts
const { data, error } = await getInsforge()
  .database.from('lead_registry')
  .select('*')
  .eq('id', leadId)
  .limit(1);
```

### InsForge Query: Fetch Activity Log for Lead
```typescript
// features/leads/hooks/useLeadActivities.ts
const { data, error } = await getInsforge()
  .database.from('lead_activity_log')
  .select('*')
  .eq('lead_id', leadId)
  .order('created_at', { ascending: false })
  .limit(50);
```

### InsForge Mutation: Add Note to Lead
```typescript
// features/leads/hooks/useAddLeadNote.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useAddLeadNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, telegramId, note }: {
      leadId: number;
      telegramId: number;
      note: string;
    }) => {
      // 1. Update the notes field on the lead
      const { error: updateError } = await getInsforge()
        .database.from('lead_registry')
        .update({
          notes: note,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);
      if (updateError) throw updateError;

      // 2. Create activity log entry
      const { error: activityError } = await getInsforge()
        .database.from('lead_activity_log')
        .insert([{
          lead_id: leadId,
          telegram_id: telegramId,
          activity_type: 'context_update',
          content: note,
        }]);
      if (activityError) throw activityError;
    },
    onSettled: (_data, _err, { leadId, telegramId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(leadId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.activities(leadId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.byUser(telegramId) });
    },
  });
}
```

### Status Label and Color Mapping
```typescript
// features/leads/types.ts
// Must match bot/handlers/leads.py STATUS_LABELS exactly
export const LEAD_STATUS_CONFIG: Record<LeadStatus, {
  label: string;
  variant: 'default' | 'info' | 'warning' | 'success' | 'error' | 'brand';
  order: number;
}> = {
  analyzed: { label: 'Analyzed', variant: 'info', order: 0 },
  reached_out: { label: 'Reached Out', variant: 'brand', order: 1 },
  meeting_booked: { label: 'Meeting Booked', variant: 'warning', order: 2 },
  in_progress: { label: 'In Progress', variant: 'default', order: 3 },
  closed_won: { label: 'Closed Won', variant: 'success', order: 4 },
  closed_lost: { label: 'Closed Lost', variant: 'error', order: 5 },
};
```

### Settings: Available OpenRouter Models (from bot)
```typescript
// features/settings/components/SettingsPanel.tsx
// Models from bot/handlers/settings.py MODEL_KEYBOARD
const OPENROUTER_MODELS = [
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B (Free)' },
  { id: 'moonshotai/kimi-k2.5', label: 'Kimi K2.5 (Free)' },
  { id: 'google/gemini-flash', label: 'Gemini Flash (Free)' },
  { id: 'deepseek/deepseek-r1', label: 'DeepSeek R1 (Free)' },
] as const;
```

### Lead Detail Section Component (Reuse from Support)
```typescript
// features/leads/components/LeadAnalysis.tsx
// Same Section pattern as CasebookDetail.tsx
function Section({
  icon: Icon,
  title,
  content,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  content: string | null;
}) {
  return (
    <Card padding="sm">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-text">{title}</h3>
      </div>
      <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">
        {content || 'No information available.'}
      </p>
    </Card>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Read-only TMA (all phases 1-4) | Read + Write with useMutation | Phase 5 | First write operations from TMA frontend |
| Status management only via bot | TMA can update status directly | Phase 5 | Removes need to switch to bot for status changes |
| No activity logging for status changes | TMA creates activity entries on status change | Phase 5 | Complete activity timeline per LEAD-05 |
| Settings only via bot /settings | Provider/model editable from TMA Profile | Phase 5 | API key still requires bot (encryption) |

**Deprecated/outdated:**
- `LeadStatus` type with 5 values: WRONG. The bot uses 6 values. Must be updated.
- Read-only InsForge usage in TMA: Phase 5 introduces `.update()` and `.insert()` calls.

## Open Questions

1. **Notes Field: Append or Replace?**
   - What we know: `lead_registry.notes` is a single TEXT column. The bot's context update feature saves the latest text as the note value, not appending.
   - What's unclear: Should the TMA show previous notes or only the current value? The activity log captures all context_update entries, so historical notes are in `lead_activity_log.content`.
   - Recommendation: Use `notes` as the current/latest note (replace on update). Display full note history via the activity log timeline (where `activity_type = 'context_update'`). This matches the bot's behavior.

2. **Web Research and Photo Display**
   - What we know: `lead_registry.web_research` is a TEXT field with web research results. `photo_url` and `photo_key` point to prospect photos in InsForge storage.
   - What's unclear: How to display web research (plain text or structured?) and whether photo URLs require authentication.
   - Recommendation: Display web_research as plain text in a scrollable Card section. For photos, construct the URL using InsForge storage pattern: `${INSFORGE_URL}/api/storage/buckets/{bucket}/objects/{photo_key}`. Test with actual lead data to verify photo accessibility.

3. **Engagement Plan Step Toggling from TMA**
   - What we know: The bot lets users toggle plan steps between 'pending' and 'done'. The TMA could offer the same.
   - What's unclear: Whether this feature is in scope for Phase 5. LEAD-02 says "engagement plan" display, not management.
   - Recommendation: Display the engagement plan as read-only for Phase 5. Step toggling can be added later if needed. The bot already handles it.

## Sources

### Primary (HIGH confidence)
- Bot leads handler: `bot/handlers/leads.py` -- exact STATUS_LABELS (`analyzed`, `reached_out`, `meeting_booked`, `in_progress`, `closed_won`, `closed_lost`), lead detail formatting, engagement plan structure, all verified from source
- Bot settings handler: `bot/handlers/settings.py` -- exact provider options (`openrouter`, `claude`/`anthropic`), model list (4 OpenRouter models), API key validation flow verified from source
- Bot storage models: `bot/storage/models.py` -- LeadRegistryModel and LeadActivityModel field definitions verified from source
- Bot repositories: `bot/storage/repositories.py` -- LeadRegistryRepo.update_status(), update_lead(), get_for_user(), LeadActivityRepo.create(), get_for_lead() verified from source
- TMA types: `packages/webapp/src/types/tables.ts` -- LeadRegistryRow, LeadActivityRow with all columns verified from source
- TMA types: `packages/webapp/src/types/enums.ts` -- WRONG LeadStatus (5 values vs bot's 6) confirmed from source comparison
- InsForge SDK README: `node_modules/@insforge/sdk/README.md` -- `.from().update().eq()`, `.from().insert()`, `.from().delete().eq()` API verified from README
- Existing TMA patterns: Support page (nested routes, detail view), Casebook (search/filter, Section component), scoring types (defensive parsing) -- all verified from source
- TMA query keys: `packages/webapp/src/lib/queries.ts` -- existing factory pattern verified from source

### Secondary (MEDIUM confidence)
- [TanStack Query useMutation](https://tanstack.com/query/latest/docs/react/guides/mutations) -- mutation lifecycle (onMutate/onError/onSettled)
- [TanStack Query Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) -- cache-based optimistic update pattern

### Tertiary (LOW confidence)
- InsForge SDK `.update()` return value behavior -- SDK README shows `{ data, error }` pattern consistent with Supabase, but not runtime-tested for this specific table
- Photo URL accessibility -- `photo_url` / `photo_key` storage bucket access pattern not verified with actual stored photos

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed, no new dependencies
- Architecture: HIGH - Follows exact patterns from Phases 1-4 (nested routes, feature dirs, query keys)
- Lead data model: HIGH - All table schemas, bot handler logic, status values, and JSON field structures verified from bot source code
- Mutations: MEDIUM - useMutation pattern is standard TanStack Query, but InsForge SDK mutation API not yet runtime-tested from TMA. SDK README confirms Supabase-compatible syntax.
- Settings: HIGH - Provider/model update is simple. API key limitation (encryption) is clearly understood.
- Pitfalls: HIGH - Critical enum mismatch discovered; first-mutation pattern identified; JSON text vs JSONB distinction documented

**Research date:** 2026-02-04
**Valid until:** 2026-03-04 (30 days -- stable domain, no library changes expected)
