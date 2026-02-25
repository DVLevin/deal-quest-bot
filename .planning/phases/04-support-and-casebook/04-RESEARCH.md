# Phase 4: Support & Casebook - Research

**Researched:** 2026-02-03
**Domain:** Support session display, casebook browsing/search/filter, deep link to bot for AI analysis, clipboard API, PostgREST ilike/or filtering
**Confidence:** HIGH

## Summary

Phase 4 builds the Support mode (strategy builder with analysis display) and Casebook browser (search, filter, detail view, use-as-template) for the Deal Quest TMA. Both features follow the established TMA-as-display-layer pattern: the bot handles all AI/LLM processing, the TMA reads and displays the data.

**Support mode** has two aspects: (1) an input form where the user describes a prospect (text + optional screenshot), which deep-links to the bot for AI processing, and (2) a display layer that shows the analysis results from `support_sessions.output_json` including prospect analysis, closing strategy, engagement tactics, and draft response. Past support sessions are listed with dates and prospect info. The bot's strategist agent outputs a well-defined JSON structure with `analysis`, `strategy`, `engagement_tactics`, and `draft` top-level keys.

**Casebook** is a pure read-and-browse feature: the `casebook` table already has structured columns (`persona_type`, `scenario_type`, `industry`, `seniority`, `quality_score`, `prospect_analysis`, `closing_strategy`, `engagement_tactics`, `draft_response`). The TMA needs list view with search/filter, detail view, and "use as template" which pre-fills a new support session with the casebook entry's context. Search uses PostgREST `.or()` with `.ilike()` across multiple text columns. Filtering uses `.eq()` on categorical columns.

**Primary recommendation:** Build Support as a two-view flow (input + analysis display) with deep link to bot for new analyses. Build Casebook as list/detail with client-side filtering supplemented by server-side ilike search. Both follow the established feature directory pattern (features/{name}/hooks/, components/).

## Standard Stack

### Core (Already Installed -- No New Dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | ^5.90.x | Data fetching for support_sessions and casebook tables | Already configured |
| @insforge/sdk | latest | PostgREST queries with .ilike(), .or(), .eq() for search/filter | Already configured |
| zustand | ^5.0.x | Auth store (telegramId), no new stores needed | Already used |
| react-router | ^7.12.x | Nested sub-routes within /support/* and /casebook/* | Already configured with wildcards (/support/*) |
| lucide-react | ^0.562.x | Icons for signal strength, copy, regenerate, save, filter, search | Already installed |
| class-variance-authority | ^0.7.x | Component variants for signal badges, quality score badges | Already installed |
| @telegram-apps/sdk-react | ^3.3.9 | openTelegramLink for bot deep links, MainButton for actions | Already installed |

### Supporting (No New Dependencies)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @deal-quest/shared (inlined) | workspace:* | SupportSessionRow, CasebookRow types | All data display |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PostgREST ilike for search | Full-text search (tsvector) | Requires DB migration for tsvector columns. ilike with wildcards is sufficient for small casebook sizes |
| Client-side filtering | Server-side filtering only | Casebook entries are bounded per user; fetching all and filtering client-side is simpler and faster for < 200 entries |
| Image upload component | File input + InsForge storage | Screenshots are processed by the bot (vision model). TMA deep-links to bot; no need for TMA-side upload |

**Installation:** No new packages needed. Phases 1-3 installed everything required.

## Architecture Patterns

### Recommended Project Structure
```
packages/webapp/src/
  features/
    support/
      hooks/
        useSupportSessions.ts     # Paginated list of past support sessions
        useSupportSession.ts      # Single session detail by ID
      components/
        SupportInput.tsx           # Prospect context input + screenshot prompt + deep link CTA
        AnalysisDisplay.tsx        # Prospect analysis section (type, stage, signal, concern)
        StrategyDisplay.tsx        # Closing strategy steps with objection handling
        TacticsDisplay.tsx         # LinkedIn actions, comment suggestion, timing
        DraftDisplay.tsx           # Draft response with copy/regenerate/save actions
        SessionList.tsx            # Past support sessions list
        SessionCard.tsx            # Individual session card in list
      types.ts                     # Typed interfaces for strategist output_json
    casebook/
      hooks/
        useCasebook.ts            # Filtered/searched casebook entries
        useCasebookEntry.ts       # Single casebook entry by ID
      components/
        CasebookList.tsx          # Browsable list with search bar and filter chips
        CasebookCard.tsx          # Card: persona type, scenario type, quality score
        CasebookDetail.tsx        # Full detail view
        CasebookFilters.tsx       # Filter controls: persona type, scenario type, industry
        SearchBar.tsx             # Keyword search input with debounce
  pages/
    Support.tsx                   # Replaced: nested sub-routes
    Casebook.tsx                  # Replaced: nested sub-routes
  lib/
    queries.ts                    # Extended with support and casebook query keys
```

### Pattern 1: Nested Sub-Routes for Support
**What:** Support page has multiple views: input form (index), session detail (session/:id), and session history (history).
**When to use:** Any page with multiple distinct views.
**Example:**
```typescript
// pages/Support.tsx
import { Routes, Route } from 'react-router';

export default function Support() {
  return (
    <Routes>
      <Route index element={<SupportHome />} />
      <Route path="session/:sessionId" element={<SessionDetail />} />
      <Route path="history" element={<SessionHistory />} />
    </Routes>
  );
}
```

The Router already has `<Route path="/support/*" element={<Support />} />` with the wildcard suffix.

### Pattern 2: Casebook Needs Wildcard Route Addition
**What:** The Casebook route currently has NO wildcard (`/casebook` without `/*`), so nested routes won't work.
**When to use:** Must update Router.tsx before building casebook sub-routes.
**Fix required:**
```typescript
// app/Router.tsx -- change this line:
<Route path="/casebook" element={<Casebook />} />
// To:
<Route path="/casebook/*" element={<Casebook />} />
```

### Pattern 3: Defensive output_json Parsing (Critical)
**What:** `support_sessions.output_json` is `Record<string, unknown>` containing the strategist agent's LLM response. Like `feedback_json` in Phase 3, this MUST be parsed defensively with typeof guards.
**When to use:** Every access to support session output data.
**Example:**
```typescript
// features/support/types.ts
export interface StrategyStep {
  principle: string;
  detail: string;
}

export interface SupportAnalysis {
  prospect_type: string;
  seniority: string;
  background_leverage: string;
  company_context: string;
  stage: string;
  key_concern: string;
  buying_signal: string;
  buying_signal_reason: string;
}

export interface SupportStrategy {
  steps: StrategyStep[];
  anticipated_objection: string;
  objection_response: string;
}

export interface EngagementTactics {
  linkedin_actions: string[];
  comment_suggestion: string;
  timing: string;
}

export interface SupportDraft {
  platform: string;
  message: string;
  word_count: number;
  playbook_reference: string;
}

export interface SupportOutput {
  analysis: SupportAnalysis;
  strategy: SupportStrategy;
  engagement_tactics: EngagementTactics;
  draft: SupportDraft;
}

/** Safely parse output_json from a SupportSessionRow */
export function parseOutputJson(json: Record<string, unknown>): SupportOutput {
  const analysis = (typeof json.analysis === 'object' && json.analysis !== null)
    ? json.analysis as Record<string, unknown>
    : {};
  const strategy = (typeof json.strategy === 'object' && json.strategy !== null)
    ? json.strategy as Record<string, unknown>
    : {};
  const tactics = (typeof json.engagement_tactics === 'object' && json.engagement_tactics !== null)
    ? json.engagement_tactics as Record<string, unknown>
    : {};
  const draft = (typeof json.draft === 'object' && json.draft !== null)
    ? json.draft as Record<string, unknown>
    : {};

  return {
    analysis: {
      prospect_type: typeof analysis.prospect_type === 'string' ? analysis.prospect_type : 'Unknown',
      seniority: typeof analysis.seniority === 'string' ? analysis.seniority : 'N/A',
      background_leverage: typeof analysis.background_leverage === 'string' ? analysis.background_leverage : '',
      company_context: typeof analysis.company_context === 'string' ? analysis.company_context : '',
      stage: typeof analysis.stage === 'string' ? analysis.stage : 'unknown',
      key_concern: typeof analysis.key_concern === 'string' ? analysis.key_concern : '',
      buying_signal: typeof analysis.buying_signal === 'string' ? analysis.buying_signal : 'unknown',
      buying_signal_reason: typeof analysis.buying_signal_reason === 'string' ? analysis.buying_signal_reason : '',
    },
    strategy: {
      steps: Array.isArray(strategy.steps)
        ? (strategy.steps as Record<string, unknown>[]).map((s) => ({
            principle: typeof s.principle === 'string' ? s.principle : '',
            detail: typeof s.detail === 'string' ? s.detail : '',
          }))
        : [],
      anticipated_objection: typeof strategy.anticipated_objection === 'string' ? strategy.anticipated_objection : '',
      objection_response: typeof strategy.objection_response === 'string' ? strategy.objection_response : '',
    },
    engagement_tactics: {
      linkedin_actions: Array.isArray(tactics.linkedin_actions)
        ? (tactics.linkedin_actions as unknown[]).filter((a): a is string => typeof a === 'string')
        : [],
      comment_suggestion: typeof tactics.comment_suggestion === 'string' ? tactics.comment_suggestion : '',
      timing: typeof tactics.timing === 'string' ? tactics.timing : '',
    },
    draft: {
      platform: typeof draft.platform === 'string' ? draft.platform : '',
      message: typeof draft.message === 'string' ? draft.message : '',
      word_count: typeof draft.word_count === 'number' ? draft.word_count : 0,
      playbook_reference: typeof draft.playbook_reference === 'string' ? draft.playbook_reference : '',
    },
  };
}
```

### Pattern 4: PostgREST ilike Search with .or()
**What:** Casebook keyword search across multiple text columns using PostgREST's `.or()` filter with `ilike` clauses.
**When to use:** CASE-02 keyword search.
**Example:**
```typescript
// features/casebook/hooks/useCasebook.ts
const searchPattern = `%${keyword}%`;
let query = getInsforge()
  .database.from('casebook')
  .select('*')
  .eq('created_from_user', telegramId);

if (keyword) {
  query = query.or(
    `persona_type.ilike.${searchPattern},` +
    `scenario_type.ilike.${searchPattern},` +
    `industry.ilike.${searchPattern},` +
    `prospect_analysis.ilike.${searchPattern},` +
    `draft_response.ilike.${searchPattern}`
  );
}

if (personaType) {
  query = query.eq('persona_type', personaType);
}
if (scenarioType) {
  query = query.eq('scenario_type', scenarioType);
}
if (industry) {
  query = query.eq('industry', industry);
}

const { data, error } = await query
  .order('quality_score', { ascending: false })
  .limit(50);
```

### Pattern 5: Deep Link to Bot for New Support Sessions
**What:** The "Get Analysis" action deep-links to the bot's /support command. The user provides prospect context in the bot (which handles AI processing), then returns to the TMA to view results.
**When to use:** SUPP-01 input and all regeneration actions.
**Example:**
```typescript
import { openTelegramLink } from '@telegram-apps/sdk-react';

function handleNewSupport() {
  const botUsername = import.meta.env.VITE_BOT_USERNAME;
  const url = `https://t.me/${botUsername}?start=support`;

  if (openTelegramLink.isAvailable()) {
    openTelegramLink(url);
  } else {
    window.open(url, '_blank');
  }
}
```

Use `openTelegramLink` (not `openLink`) for bot deep links, per Phase 3 decision [03-02].

### Pattern 6: Clipboard Copy with Fallback
**What:** Copy draft response text to clipboard. navigator.clipboard.writeText works in Telegram WebView.
**When to use:** SUPP-04 copy action.
**Example:**
```typescript
async function handleCopy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older WebViews
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  }
}
```

### Pattern 7: Casebook "Use as Template" Flow
**What:** CASE-05 requires copying a casebook entry into a new support session. Since the TMA cannot trigger AI processing, this deep-links to the bot with a pre-filled context parameter.
**When to use:** When user taps "Use as Template" on a casebook entry.
**Example:**
```typescript
function handleUseAsTemplate(entry: CasebookRow) {
  // Deep link to bot /support with a hint about the casebook entry
  const botUsername = import.meta.env.VITE_BOT_USERNAME;
  const url = `https://t.me/${botUsername}?start=support`;

  if (openTelegramLink.isAvailable()) {
    openTelegramLink(url);
  }
}
```

Note: Telegram deep link parameters are limited (no arbitrary text). The "use as template" action opens the bot in support mode. The casebook entry details are displayed in the TMA for the user to reference while typing in the bot. A more advanced approach (Phase 7) could write a pending context row to InsForge for the bot to pick up.

### Anti-Patterns to Avoid
- **Calling LLM APIs from the TMA:** Support analysis is done by the bot's strategist agent. The TMA displays results only.
- **Building image upload in the TMA:** Screenshot processing requires the bot's vision model pipeline. Deep link to bot for photo analysis.
- **Using unguarded access to output_json:** LLM output varies. Always parse with typeof guards (see Pattern 3).
- **Full-text search without migration:** PostgreSQL tsvector requires column creation and index migration. Use ilike for now.
- **Fetching all casebook entries without limit:** Always apply `.limit()` even if filtering. Some users may accumulate many entries.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keyword search | Custom text matching in JS | PostgREST `.or()` with `.ilike()` | Server-side filtering is more efficient and handles large datasets |
| Clipboard copy | Custom DOM manipulation | `navigator.clipboard.writeText()` with fallback | Standard browser API, works in Telegram WebView |
| Debounced search input | Manual setTimeout debouncing | Simple useState + useEffect with 300ms delay | Lightweight pattern, no library needed |
| Signal strength indicator | Complex SVG widget | Badge component with color variants (success/warning/error) | Already have Badge with variant support |
| Output JSON parsing | Direct property access | Defensive parser function (see Pattern 3) | LLM output is non-deterministic |
| Date formatting | Custom date parsing | `new Date(isoString).toLocaleDateString()` | ISO strings from PostgREST are standard |
| Filter chip UI | Custom toggle components | Button component with variant toggling | Already have Button with multiple variants |

**Key insight:** Both Support and Casebook are read-heavy features. The bot writes all data; the TMA reads and displays. The main engineering work is (1) defensive JSON parsing, (2) search/filter query construction, and (3) rich multi-section display of structured data.

## Common Pitfalls

### Pitfall 1: output_json Structure Varies Between LLM Runs
**What goes wrong:** The strategist agent's JSON output may have missing keys, different nesting, or extra fields between runs. Accessing `output_json.analysis.buying_signal` crashes when the LLM returns a flat structure or omits the `analysis` key.
**Why it happens:** LLM output is non-deterministic despite the prompt specifying a JSON schema. The bot's `format_support_response()` function in `utils.py` already handles this with `.get()` calls and string sanitization.
**How to avoid:** Build a `parseOutputJson()` function (see Pattern 3) with typeof guards on every single field. Use optional chaining throughout the display components. Never destructure output_json directly.
**Warning signs:** Blank sections in the analysis display, "Cannot read property of undefined" errors.

### Pitfall 2: Casebook Has No telegram_id Column
**What goes wrong:** Unlike `support_sessions` which has `telegram_id`, the `casebook` table uses `created_from_user` (which stores the telegram_id of the user who created it). Querying `.eq('telegram_id', telegramId)` returns 0 rows.
**Why it happens:** The casebook table was designed for team-wide sharing, not per-user. The `created_from_user` column links to the creating user.
**How to avoid:** For CASE-01 through CASE-04, query casebook without filtering by user (show all entries the user can access). For "my entries" view, filter by `.eq('created_from_user', telegramId)`. Consider showing all casebook entries (team resource) with a toggle for "my entries only".
**Warning signs:** Empty casebook when querying by telegram_id, or showing entries from other users unexpectedly.

### Pitfall 3: support_sessions Has No Prospect Name/Company Columns
**What goes wrong:** SUPP-05 requires showing past sessions "with dates and prospect info." But `support_sessions` only has `input_text` and `output_json` -- no dedicated columns for prospect name or company.
**Why it happens:** The bot extracts prospect info from the output_json at display time (see `_extract_prospect_name_from_output` in support.py). It's not stored separately in support_sessions.
**How to avoid:** Extract prospect info from `output_json.analysis` (prospect_type, seniority, company_context) at display time in the TMA. The `_extract_prospect_name_from_output` logic lives in the bot; the TMA should use the structured analysis fields directly. For the session list card, show `analysis.prospect_type` and `analysis.company_context` truncated, plus `created_at` date.
**Warning signs:** Session list showing only dates with no prospect info, or trying to add columns to the table.

### Pitfall 4: Casebook Entries May Be Empty/Sparse for New Users
**What goes wrong:** New users or users who haven't used the bot's casebook feature will have 0 casebook entries. The casebook page shows an empty state.
**Why it happens:** Casebook entries are created by the bot when quality criteria are met (quality_score >= 0.7 AND accepted_first_draft). Not all support sessions generate casebook entries.
**How to avoid:** Build a clear empty state for the casebook: "No saved responses yet. Use /support in the bot to build your casebook. High-quality responses are saved automatically." Also consider showing team casebook entries (all entries, not just user's) since it's a shared resource.
**Warning signs:** Users seeing empty casebook and thinking the feature is broken.

### Pitfall 5: Casebook Route Missing Wildcard
**What goes wrong:** The Casebook detail view (`/casebook/:id`) returns 404 because the Router has `<Route path="/casebook">` without `/*`.
**Why it happens:** Phase 1 configured `/casebook` without a wildcard because no sub-routes were planned at the time.
**How to avoid:** Update `Router.tsx` to add `/*` to the casebook route: `<Route path="/casebook/*" element={<Casebook />} />`. This MUST happen before building detail views.
**Warning signs:** Navigating to `/casebook/123` shows the catch-all redirect to Dashboard.

### Pitfall 6: Copy/Regenerate/Save Actions Scope
**What goes wrong:** SUPP-04 requires copy, regenerate, and save-to-casebook actions. Building all three inline in the TMA is tempting but misaligned with the architecture.
**Why it happens:** The TMA is a display layer. "Regenerate" requires calling the LLM. "Save to casebook" requires the bot's quality evaluation logic.
**How to avoid:**
- **Copy:** Use `navigator.clipboard.writeText()` -- this works in TMA.
- **Regenerate:** Deep link to bot's /support command (same input, the bot handles regeneration). Show a "Regenerate in Bot" button.
- **Save to casebook:** The bot automatically saves high-quality responses. Add a "Save to Casebook" button that deep-links to the bot with the session context. Alternatively, if we want TMA-side save, the TMA can write directly to the casebook table via InsForge (since RLS is full-access for anon), but this bypasses the bot's quality validation logic. Recommendation: keep save as a bot action for now.
**Warning signs:** Trying to call LLM APIs from the frontend, or writing to casebook without quality checks.

### Pitfall 7: Search Debouncing and PostgREST Special Characters
**What goes wrong:** User types rapidly in the search box, triggering a PostgREST query on every keystroke. Also, special characters like `%` or `_` in search terms match unexpectedly in ilike patterns.
**Why it happens:** No debounce on the search input. PostgREST ilike uses `%` and `_` as wildcards.
**How to avoid:** Debounce the search query by 300ms using a simple useEffect pattern. Escape `%` and `_` in the user's search input before sending to PostgREST: `term.replace(/%/g, '\\%').replace(/_/g, '\\_')`.
**Warning signs:** Excessive API calls during typing, unexpected search results with special characters.

## Code Examples

### InsForge Query: Fetch Support Sessions for User
```typescript
// Source: Existing pattern from useAttemptHistory.ts + SupportSessionRow type
const { data, error } = await getInsforge()
  .database.from('support_sessions')
  .select('id, telegram_id, input_text, output_json, provider_used, created_at')
  .eq('telegram_id', telegramId)
  .order('created_at', { ascending: false })
  .limit(20);
```

### InsForge Query: Fetch Single Support Session
```typescript
const { data, error } = await getInsforge()
  .database.from('support_sessions')
  .select('*')
  .eq('id', sessionId)
  .eq('telegram_id', telegramId)
  .limit(1);
```

### InsForge Query: Casebook with Search and Filters
```typescript
// Source: PostgREST .or() with .ilike() pattern
function buildCasebookQuery(
  telegramId: number,
  keyword?: string,
  personaType?: string,
  scenarioType?: string,
  industry?: string,
) {
  let query = getInsforge()
    .database.from('casebook')
    .select('*');

  // Keyword search across multiple text columns
  if (keyword && keyword.trim()) {
    const escaped = keyword.trim()
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
    const pattern = `%${escaped}%`;
    query = query.or(
      `persona_type.ilike.${pattern},` +
      `scenario_type.ilike.${pattern},` +
      `industry.ilike.${pattern},` +
      `prospect_analysis.ilike.${pattern},` +
      `draft_response.ilike.${pattern}`
    );
  }

  // Categorical filters (AND with search)
  if (personaType) {
    query = query.eq('persona_type', personaType);
  }
  if (scenarioType) {
    query = query.eq('scenario_type', scenarioType);
  }
  if (industry) {
    query = query.eq('industry', industry);
  }

  return query
    .order('quality_score', { ascending: false })
    .limit(50);
}
```

### InsForge Query: Get Distinct Filter Values for Casebook
```typescript
// For populating filter dropdowns with actual values from the casebook table.
// Since PostgREST doesn't have DISTINCT, fetch all entries and deduplicate client-side.
const { data } = await getInsforge()
  .database.from('casebook')
  .select('persona_type, scenario_type, industry');

const personaTypes = [...new Set((data ?? []).map(r => r.persona_type).filter(Boolean))];
const scenarioTypes = [...new Set((data ?? []).map(r => r.scenario_type).filter(Boolean))];
const industries = [...new Set((data ?? []).map(r => r.industry).filter(Boolean))];
```

### Query Key Factory Extensions
```typescript
// lib/queries.ts - additions for Phase 4
export const queryKeys = {
  // ... existing users, attempts, badges, trackProgress, scenarios keys ...
  support: {
    all: ['support'] as const,
    sessions: (telegramId: number) => ['support', telegramId, 'sessions'] as const,
    session: (sessionId: number) => ['support', 'session', sessionId] as const,
  },
  casebook: {
    all: ['casebook'] as const,
    list: (filters: Record<string, unknown>) => ['casebook', 'list', filters] as const,
    entry: (entryId: number) => ['casebook', 'entry', entryId] as const,
    filterOptions: ['casebook', 'filterOptions'] as const,
  },
} as const;
```

### Debounced Search Hook Pattern
```typescript
// Simple debounced search without additional dependencies
import { useState, useEffect } from 'react';

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

// Usage in search component:
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebouncedValue(searchTerm, 300);

const { data } = useCasebook({
  keyword: debouncedSearch,
  personaType: selectedPersonaType,
  // ...
});
```

### Signal Strength Badge Mapping
```typescript
// Map buying_signal string to Badge variant
function getSignalBadge(signal: string): { variant: 'success' | 'warning' | 'error'; label: string } {
  const normalized = signal.toLowerCase();
  if (normalized === 'high' || normalized.includes('high')) {
    return { variant: 'success', label: 'High Signal' };
  }
  if (normalized === 'medium' || normalized.includes('medium')) {
    return { variant: 'warning', label: 'Medium Signal' };
  }
  return { variant: 'error', label: 'Low Signal' };
}
```

### Clipboard Copy with Toast Feedback
```typescript
import { useState, useCallback } from 'react';

export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch {
      // Fallback for older WebViews
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    }
  }, []);

  return { copy, copied };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| TMA sends data to bot via sendData() | Deep link pattern + data refresh on return | Standard TMA pattern | Keeps TMA open, bot processes in chat |
| Full-text search with tsvector | PostgREST ilike with .or() | Supabase/PostgREST standard | No migration needed, sufficient for bounded datasets |
| Manual clipboard manipulation | navigator.clipboard.writeText() | Widely supported since 2019 | Clean API, works in Telegram WebView |
| Complex filter state in URL | useState + TanStack Query key factory | Established in Phase 3 | Simpler, no URL parsing needed |

**Deprecated/outdated:**
- `document.execCommand('copy')`: Deprecated but kept as fallback for clipboard API failures in older WebViews.
- `Telegram.WebApp.sendData()`: Closes the app. Not suitable for the hybrid bot+TMA architecture.

## Open Questions

1. **Casebook Ownership Model: Per-User or Team-Wide?**
   - What we know: The `casebook` table has `created_from_user` (telegram_id of creator) but no RLS filtering. The bot's `CasebookRepo.find_similar()` queries without user filtering (team-wide).
   - What's unclear: Should the TMA show only the current user's casebook entries, or all entries?
   - Recommendation: Show all casebook entries by default (team resource). Add a "My entries" toggle filter. This maximizes the casebook's value as a shared knowledge base.

2. **Regenerate and Save-to-Casebook Actions**
   - What we know: "Regenerate" requires the bot's strategist agent. "Save to casebook" requires quality evaluation. Both are bot-side operations.
   - What's unclear: Should we implement direct InsForge writes for save-to-casebook (bypassing quality validation), or strictly require bot interaction?
   - Recommendation: "Copy" is TMA-side (clipboard). "Regenerate" deep-links to bot. "Save to casebook" could be a direct InsForge write from TMA (the RLS is full-access anon), setting a default quality_score. However, this bypasses the bot's quality threshold (>= 0.7). For v1, deep-link to bot for both regenerate and save. The TMA can add direct save later if needed.

3. **Screenshot Upload in Support Input**
   - What we know: SUPP-01 mentions "screenshot upload option." The bot's support handler processes photos with vision models. The TMA cannot run vision model analysis.
   - What's unclear: Should the TMA have a photo upload UI that sends the image to InsForge storage for the bot to pick up?
   - Recommendation: The TMA's support input page should mention that screenshots can be sent via the bot. The "Get Analysis" deep link opens the bot where the user can send text, photos, or voice. No image upload needed in the TMA for v1.

4. **Support Session List Performance**
   - What we know: `support_sessions` accumulates over time. Each row's `output_json` can be large (entire strategist output).
   - What's unclear: Whether fetching 20 sessions with full output_json is too heavy.
   - Recommendation: For the session list, use `.select('id, telegram_id, input_text, output_json, created_at')` and extract only the needed fields (prospect_type, company_context) from output_json client-side. If performance becomes an issue, switch to partial select with only the columns needed for the list card, then fetch full output_json only on detail view.

## Sources

### Primary (HIGH confidence)
- Existing TMA codebase: `packages/webapp/src/` -- all component patterns, hooks, query key factory, Router configuration verified from source
- Bot support handler: `bot/handlers/support.py` -- exact strategist output structure, session saving, prospect extraction logic verified from source
- Bot casebook service: `bot/services/casebook.py` -- casebook creation criteria (quality >= 0.7, accepted_first_draft) verified from source
- Strategist agent prompt: `prompts/strategist_agent.md` -- exact JSON output schema with `analysis`, `strategy`, `engagement_tactics`, `draft` fields verified from source
- Bot utils: `bot/utils.py` -- `format_support_response()` showing exact field paths used to display strategist output verified from source
- Database types: `packages/webapp/src/types/tables.ts` -- SupportSessionRow, CasebookRow with all columns verified from source
- InsForge client pattern: `packages/webapp/src/lib/insforge.ts` -- Supabase-compatible SDK with `.database.from()` query builder verified from source
- Phase 3 scoring parser: `packages/webapp/src/features/scoring/types.ts` -- defensive typeof-guard parsing pattern verified from source

### Secondary (MEDIUM confidence)
- [Supabase JS SDK Filters](https://supabase.com/docs/reference/javascript/using-filters) -- `.ilike()`, `.or()` filter syntax for PostgREST queries
- [Supabase ilike docs](https://supabase.com/docs/reference/javascript/ilike) -- ilike pattern matching with wildcards
- Phase 3 deep link pattern: `openTelegramLink` usage in ScenarioPractice.tsx and ScoreResults.tsx verified from source

### Tertiary (LOW confidence)
- navigator.clipboard.writeText() in Telegram WebView -- should work (Chrome-based WebView) but not explicitly tested in TMA context
- PostgREST `.or()` with ilike pattern string syntax -- standard PostgREST but InsForge's SDK compatibility not verified with actual query

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed, no new dependencies
- Architecture: HIGH - Follows exact patterns from Phases 1-3, feature directory structure established, nested routes pattern proven
- Data model: HIGH - All table schemas and strategist output JSON verified from bot source code and prompt template
- Search/filter: MEDIUM - PostgREST ilike and .or() are standard Supabase patterns, but InsForge SDK compatibility with .or() string syntax not tested at runtime
- Copy/regenerate/save actions: MEDIUM - Copy is straightforward; regenerate and save scope depends on how much to keep as bot-side vs TMA-side
- Pitfalls: HIGH - All identified from reading actual codebase (output_json variability, casebook ownership, missing wildcard route, session list performance)

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (30 days -- stable domain, no library changes expected)
