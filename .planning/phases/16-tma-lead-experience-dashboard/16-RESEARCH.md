# Phase 16: TMA Lead Experience & Dashboard - Research

**Researched:** 2026-02-05
**Domain:** React TMA UI/UX, Lead Management, Dashboard Widgets
**Confidence:** HIGH

## Summary

Phase 16 transforms the TMA from a passive lead viewer into an action-oriented sales cockpit. This phase focuses entirely on TMA-side changes (React/TypeScript) with no bot modifications required. The work builds directly on existing infrastructure: Phase 15.1-02's `useUpdatePlanStep` hook for step toggling, existing `scheduled_reminders` table with RLS policies for TMA reads, and the established LeadDetail/LeadCard component patterns.

The primary technical challenges are: (1) restructuring LeadDetail with collapsible tab-like sections, (2) computing derived data (overdue counts, progress percentages) efficiently client-side, (3) aggregating actions across all leads for the "Today's Actions" dashboard widget, and (4) handling deep links with query params for step highlighting.

**Primary recommendation:** Leverage existing patterns (useLead, useUpdatePlanStep) and add new hooks for scheduled_reminders queries. Keep all progress/overdue calculations client-side to avoid database schema changes.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | ^5.90.0 | Data fetching, caching | Already used for all API calls |
| react-router | ^7.12.0 | Navigation + query params | Already handles all routing |
| zustand | ^5.0.10 | State management | Used for auth store |
| lucide-react | ^0.562.0 | Icons | Design system standard |
| @insforge/sdk | latest | Database access | InsForge PostgREST client |

### Supporting (Already in Use)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-variance-authority | ^0.7.0 | Conditional styling | Badge/button variants |
| clsx + tailwind-merge | ^2.0.0 + ^3.0.0 | Class composition | All component styling |

### No New Dependencies
This phase requires **no new npm packages**. All functionality can be built with existing stack.

## Architecture Patterns

### Recommended Component Structure
```
packages/webapp/src/
├── features/leads/
│   ├── components/
│   │   ├── LeadDetail.tsx       # MODIFY: Add tabs, plan-first layout
│   │   ├── LeadCard.tsx         # MODIFY: Add progress bar, overdue badge
│   │   ├── PlanSection.tsx      # NEW: Active plan tab content
│   │   ├── IntelligenceSection.tsx  # NEW: Analysis/strategy tab content
│   │   └── ActivitySection.tsx  # EXISTS: ActivityTimeline wrapper
│   ├── hooks/
│   │   ├── useLead.ts           # EXISTS: Single lead data
│   │   ├── useLeads.ts          # MODIFY: Add engagement_plan to select
│   │   ├── useUpdatePlanStep.ts # EXISTS: Step status mutations
│   │   └── useTodayActions.ts   # NEW: Aggregate actions for dashboard
│   └── types.ts                 # MODIFY: Add helper functions
├── features/dashboard/
│   └── components/
│       └── TodayActionsCard.tsx # NEW: Today's Actions widget
└── shared/
    └── ui/
        └── CollapsibleSection.tsx  # NEW: Reusable expand/collapse
```

### Pattern 1: Tab-Like Section Navigation (Collapsible Accordion)
**What:** LeadDetail displays three collapsible sections: Active Plan (default open), Intelligence, Activity
**When to use:** When multiple content areas compete for limited mobile screen space
**Example:**
```typescript
// Pattern: State-controlled sections with single-expand behavior
const [activeSection, setActiveSection] = useState<'plan' | 'intel' | 'activity'>('plan');

<CollapsibleSection
  title="Active Plan"
  icon={ListChecks}
  isOpen={activeSection === 'plan'}
  onToggle={() => setActiveSection(activeSection === 'plan' ? 'plan' : 'plan')}
  badge={overdueCount > 0 ? `${overdueCount} overdue` : undefined}
>
  <PlanSection lead={lead} />
</CollapsibleSection>
```

### Pattern 2: Derived Data Calculation (Client-Side)
**What:** Compute overdue count, progress percentage, next action from engagement_plan
**When to use:** When derived values are used only in UI and don't need server persistence
**Example:**
```typescript
// types.ts utility functions
export function computePlanProgress(plan: EngagementPlanStep[] | null): {
  total: number;
  completed: number;
  overdue: number;
  nextAction: string | null;
} {
  if (!plan || plan.length === 0) return { total: 0, completed: 0, overdue: 0, nextAction: null };

  const now = new Date();
  let completed = 0;
  let overdue = 0;
  let nextAction: string | null = null;

  for (const step of plan) {
    if (step.status === 'done' || step.status === 'skipped') {
      completed++;
    } else if (step.status === 'pending') {
      // Check if step is overdue (requires due_at from scheduled_reminders or timing parsing)
      // For now, mark as overdue based on timing string pattern
      if (!nextAction) {
        nextAction = step.description;
      }
    }
  }

  return { total: plan.length, completed, overdue, nextAction };
}
```

### Pattern 3: Deep Link with Query Params for Step Highlighting
**What:** Bot's "Open in App" button passes step_id as query param; TMA scrolls to and highlights the step
**When to use:** When external navigation needs to target a specific UI element
**Example:**
```typescript
// LeadDetail.tsx
const [searchParams] = useSearchParams();
const highlightStepId = searchParams.get('step') ? Number(searchParams.get('step')) : null;
const stepRef = useRef<Record<number, HTMLDivElement | null>>({});

useEffect(() => {
  if (highlightStepId && stepRef.current[highlightStepId]) {
    stepRef.current[highlightStepId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Optionally add highlight animation class
  }
}, [highlightStepId, lead]);
```

### Pattern 4: Aggregating Actions Across Leads (Dashboard Hook)
**What:** Query scheduled_reminders for due/overdue actions, join with lead names
**When to use:** Dashboard widget needs cross-lead aggregation
**Example:**
```typescript
// useTodayActions.ts
export function useTodayActions() {
  const telegramId = useAuthStore((s) => s.telegramId);

  return useQuery({
    queryKey: queryKeys.leads.todayActions(telegramId!),
    queryFn: async () => {
      // Get all pending/sent reminders for user
      const { data: reminders } = await getInsforge()
        .database.from('scheduled_reminders')
        .select('id, lead_id, step_id, due_at, status, draft_text')
        .eq('telegram_id', telegramId!)
        .in('status', ['pending', 'sent'])
        .order('due_at', { ascending: true })
        .limit(50);

      // Get lead names for display
      const leadIds = [...new Set(reminders?.map(r => r.lead_id) ?? [])];
      const { data: leads } = await getInsforge()
        .database.from('lead_registry')
        .select('id, prospect_name, prospect_first_name, prospect_last_name')
        .in('id', leadIds);

      // Merge and categorize
      const now = new Date();
      return (reminders ?? []).map(r => {
        const lead = leads?.find(l => l.id === r.lead_id);
        const dueDate = new Date(r.due_at);
        return {
          ...r,
          leadName: lead?.prospect_first_name && lead?.prospect_last_name
            ? `${lead.prospect_first_name} ${lead.prospect_last_name}`
            : lead?.prospect_name ?? 'Unknown',
          isOverdue: dueDate < now,
          isDueToday: dueDate.toDateString() === now.toDateString(),
        };
      }).filter(a => a.isOverdue || a.isDueToday);
    },
    enabled: !!telegramId,
    refetchInterval: 60000, // Refresh every minute
  });
}
```

### Anti-Patterns to Avoid
- **Don't query scheduled_reminders from LeadCard:** Would cause N+1 queries. Instead, fetch engagement_plan with lead data and compute overdue client-side.
- **Don't modify bot code for deep links:** The existing `add_open_in_app_row()` already supports path params. Use URL structure `/leads/{id}?step={stepId}`.
- **Don't create new database views/functions:** TMA can query scheduled_reminders directly with existing RLS policies.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Collapsible sections | Custom state management | Single `activeSection` state with CSS transitions | Simple, no library needed |
| Progress bars | Canvas drawing | Existing `<ProgressBar>` component | Already in design system |
| Date comparison | Manual parsing | `new Date(isoString).getTime()` comparison | Native JS is sufficient |
| Query param parsing | Manual URLSearchParams | `useSearchParams` from react-router | Handles edge cases |
| Icon selection | If/else chains | Lookup object pattern (like ACTIVITY_STYLES) | Cleaner, extensible |

**Key insight:** This phase is mostly UI restructuring. The hard work (dual-sync mutation, scheduled_reminders polling) was done in Phases 12-15.1.

## Common Pitfalls

### Pitfall 1: Overdue Calculation Without Scheduled_Reminders Data
**What goes wrong:** LeadCard tries to show overdue count but only has engagement_plan JSONB, not scheduled_reminders with due_at timestamps.
**Why it happens:** engagement_plan stores `timing` strings ("Day 3"), not absolute timestamps.
**How to avoid:** Option A: Join scheduled_reminders in useLeads query. Option B: Parse timing strings client-side (less accurate but simpler). Recommend Option A for accuracy.
**Warning signs:** "Overdue" badges showing incorrect counts.

### Pitfall 2: N+1 Queries in Lead List
**What goes wrong:** Each LeadCard fetches its own scheduled_reminders for overdue count.
**Why it happens:** Natural instinct to fetch per-card data.
**How to avoid:** Batch query: fetch all user's pending reminders once, group by lead_id, pass counts down as props.
**Warning signs:** Network tab shows dozens of requests when opening Leads page.

### Pitfall 3: Deep Link Step Not Found on Initial Load
**What goes wrong:** User clicks "Open in App" from bot, TMA loads but step isn't highlighted because data isn't ready yet.
**Why it happens:** `useEffect` runs before `useLead` resolves.
**How to avoid:** Gate the scroll/highlight effect on `!isLoading && lead && highlightStepId`.
**Warning signs:** Step highlighting works on second visit but not first.

### Pitfall 4: Section State Lost on Navigation
**What goes wrong:** User expands "Activity" section, navigates away, comes back, section is collapsed again.
**Why it happens:** Component-local state resets on unmount.
**How to avoid:** This is acceptable behavior for mobile. Resetting to "plan" on each visit is actually correct UX (plan-first).
**Warning signs:** None -- this is intentional.

### Pitfall 5: Today's Actions Stale After Step Completion
**What goes wrong:** User marks step done in LeadDetail, returns to Dashboard, Today's Actions still shows the step.
**Why it happens:** useTodayActions query isn't invalidated when step status changes.
**How to avoid:** Add `queryKeys.leads.todayActions` to onSettled invalidation in useUpdatePlanStep.
**Warning signs:** Completed steps still appear in Today's Actions widget.

## Code Examples

Verified patterns from existing codebase:

### LeadCard with Progress Bar and Overdue Badge
```typescript
// Pattern from existing LeadCard + ProgressBar component
import { AlertCircle } from 'lucide-react';
import { Card, Badge, ProgressBar } from '@/shared/ui';

interface EnhancedLeadCardProps {
  lead: LeadListItem & {
    progress: { total: number; completed: number; overdue: number; nextAction: string | null };
  };
  onClick: () => void;
}

export function EnhancedLeadCard({ lead, onClick }: EnhancedLeadCardProps) {
  const { progress } = lead;

  return (
    <Card padding="sm" className="cursor-pointer" onClick={onClick}>
      {/* Existing lead info... */}

      {/* Progress bar (only if plan exists) */}
      {progress.total > 0 && (
        <div className="mt-2">
          <ProgressBar
            current={progress.completed}
            max={progress.total}
            size="sm"
            showLabel={false}
          />
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-text-hint">
              {progress.completed}/{progress.total} steps
            </span>
            {progress.overdue > 0 && (
              <Badge variant="error" size="sm">
                <AlertCircle className="mr-1 h-3 w-3" />
                {progress.overdue} overdue
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Next action preview */}
      {progress.nextAction && (
        <p className="mt-1 truncate text-xs text-text-secondary">
          Next: {progress.nextAction}
        </p>
      )}
    </Card>
  );
}
```

### TodayActionsCard Widget
```typescript
// Pattern following existing dashboard widgets (ProgressCard, WeakAreasCard)
import { ListTodo, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Card, Skeleton, ErrorCard, EmptyState } from '@/shared/ui';
import { useTodayActions } from '@/features/leads/hooks/useTodayActions';

export function TodayActionsCard() {
  const navigate = useNavigate();
  const { data: actions, isLoading, isError, refetch } = useTodayActions();

  if (isLoading) {
    return (
      <Card>
        <Skeleton height={20} width="40%" />
        <div className="mt-3 space-y-2">
          <Skeleton height={48} />
          <Skeleton height={48} />
        </div>
      </Card>
    );
  }

  if (isError) {
    return <ErrorCard message="Unable to load actions" onRetry={refetch} compact />;
  }

  if (!actions || actions.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-2 text-text-secondary">
          <ListTodo className="h-5 w-5" />
          <span className="text-sm font-medium">Today's Actions</span>
        </div>
        <p className="mt-2 text-sm text-text-hint">No actions due today. Great job!</p>
      </Card>
    );
  }

  const overdueCount = actions.filter(a => a.isOverdue).length;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-accent" />
          <span className="text-sm font-semibold text-text">Today's Actions</span>
        </div>
        {overdueCount > 0 && (
          <Badge variant="error" size="sm">{overdueCount} overdue</Badge>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {actions.slice(0, 5).map((action) => (
          <button
            key={`${action.lead_id}-${action.step_id}`}
            type="button"
            onClick={() => navigate(`/leads/${action.lead_id}?step=${action.step_id}`)}
            className="flex w-full items-center gap-3 rounded-lg bg-surface-secondary/50 p-2 text-left transition-colors active:bg-surface-secondary"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text">
                {action.leadName}
              </p>
              <p className="truncate text-xs text-text-secondary">
                Step {action.step_id}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-text-hint" />
          </button>
        ))}
      </div>

      {actions.length > 5 && (
        <button
          type="button"
          onClick={() => navigate('/leads')}
          className="mt-2 text-xs text-accent"
        >
          View all {actions.length} actions
        </button>
      )}
    </Card>
  );
}
```

### Bot Deep Link with Step Parameter
```python
# Pattern from existing bot/utils_tma.py
# Extend add_open_in_app_row to accept query params

def add_open_in_app_row(
    keyboard: InlineKeyboardMarkup | None,
    tma_url: str,
    path: str = "",
    query_params: dict[str, str] | None = None,  # NEW parameter
) -> InlineKeyboardMarkup | None:
    """Append an 'Open in App' WebApp button as the last row of a keyboard."""
    if not tma_url:
        return keyboard

    url = f"{tma_url}/{path}" if path else tma_url
    if query_params:
        qs = "&".join(f"{k}={v}" for k, v in query_params.items())
        url = f"{url}?{qs}"

    new_row = [InlineKeyboardButton(text="Open in App", web_app=WebAppInfo(url=url))]
    # ... rest unchanged
```

### Query Key Addition
```typescript
// Add to lib/queries.ts
export const queryKeys = {
  // ... existing keys
  leads: {
    all: ['leads'] as const,
    byUser: (telegramId: number) => ['leads', telegramId] as const,
    detail: (leadId: number) => ['leads', 'detail', leadId] as const,
    activities: (leadId: number) => ['leads', 'activities', leadId] as const,
    todayActions: (telegramId: number) => ['leads', 'todayActions', telegramId] as const, // NEW
  },
} as const;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static engagement plan display | Interactive step toggles | Phase 15.1 | useUpdatePlanStep hook ready |
| Bot-only reminder handling | TMA can read scheduled_reminders | Phase 12 | RLS policies allow TMA reads |
| No cross-lead aggregation | Can query all user's reminders | Phase 12 | Enables Today's Actions widget |

**Deprecated/outdated:**
- Nothing deprecated. All prior work is additive.

## Open Questions

Things that couldn't be fully resolved:

1. **Overdue Calculation Accuracy**
   - What we know: engagement_plan has `timing` strings, scheduled_reminders has `due_at` timestamps
   - What's unclear: Should LeadCard join scheduled_reminders or parse timing strings?
   - Recommendation: Join scheduled_reminders for accuracy. The RLS policies already allow it.

2. **Section Persistence Across Navigations**
   - What we know: React Router preserves component state during in-app navigation if same route
   - What's unclear: Should we persist active section in localStorage?
   - Recommendation: No. Plan-first on every visit is the intended UX.

3. **Bot Deep Link Implementation Scope**
   - What we know: TMAUX-V20-05 requires "Open in App" button on reminder messages
   - What's unclear: Is modifying plan_scheduler.py in scope for Phase 16, or should it stay TMA-only?
   - Recommendation: Include bot modification (adding the button) as it's minimal and completes the feature loop.

## Sources

### Primary (HIGH confidence)
- Existing codebase patterns (LeadDetail.tsx, LeadCard.tsx, useUpdatePlanStep.ts)
- Phase 15.1-02 PLAN (step toggle implementation)
- scheduled_reminders migration (RLS policies confirming TMA access)
- React Router v7 docs (useSearchParams API)

### Secondary (MEDIUM confidence)
- TanStack Query docs (refetchInterval, query invalidation patterns)

### Tertiary (LOW confidence)
- None. All patterns derived from existing codebase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Already using all required libraries
- Architecture: HIGH - Extending existing component patterns
- Pitfalls: HIGH - Derived from actual codebase state

**Research date:** 2026-02-05
**Valid until:** 30 days (stable React/TanStack Query ecosystem)
