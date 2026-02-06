# Phase 17: LazyFlow UX Overhaul - Research

**Researched:** 2026-02-06
**Domain:** UX optimization across React TMA + Python aiogram bot (no new features)
**Confidence:** HIGH

## Summary

Phase 17 is a pure UX optimization pass -- no new features, APIs, or database tables. The goal is to make existing features feel effortless by eliminating unnecessary user actions across 5 areas: smart landing, pre-populated support, one-photo lead creation, smart defaults, and single-tap workflows.

After examining the full codebase (Dashboard, Support, Leads, Train, Learn, bot handlers, pipeline configs, hooks, and routing), I identified concrete friction points in each area and mapped out exactly what changes are needed. The key insight is that most LazyFlow improvements are achievable with **pure frontend logic** (React state management, React Query data, and conditional rendering) -- only the "auto-detect forwarded messages in /support" optimization requires a minor bot-side change.

**Primary recommendation:** Structure work into 5 plans matching the 5 success criteria, prioritizing TMA-side changes (criteria 1, 4, 5) before bot-side changes (criteria 2, 3), since TMA changes are lower-risk and faster to verify.

## Standard Stack

This phase uses no new libraries. All work leverages the existing stack.

### Core (Already Installed)
| Library | Purpose | How It's Used in This Phase |
|---------|---------|----------------------------|
| React 18 | UI framework | Conditional rendering, useEffect for auto-detection |
| React Router 7 | Navigation | Programmatic `navigate()` for smart landing |
| TanStack React Query | Server state | Optimistic updates, cache reads for smart defaults |
| Zustand | Client state | Auth store reads, possible new `useAppContext` store |
| @telegram-apps/sdk-react | TMA integration | `retrieveLaunchParams()` for startParam, `openTelegramLink()` |
| aiogram 3.x | Bot framework | FSM state management, message handlers, forward detection |

### No New Dependencies

All LazyFlow features are implementable with existing stack:
- Smart landing: React Query cache + React Router `navigate()`
- Smart defaults: React Query `useQuery` data from existing hooks
- Optimistic UI: TanStack Query `onMutate` pattern (already used in `useUpdatePlanStep`)
- Auto-detection: aiogram `F.forward_date` filter (already used in `context_input.py`)

## Architecture Patterns

### Pattern 1: Smart Landing (Context-Aware Root Route)

**What:** The Dashboard component (`/`) reads existing query data to determine the most relevant view and auto-navigates.

**Current state:** Dashboard always renders the same layout: ProgressCard, TodayActionsCard, QuickActions, WeakAreasCard, BadgePreview, LeaderboardWidget.

**LazyFlow approach:** Add a `useSmartLanding` hook that runs on Dashboard mount:
1. Check `useTodayActions` data -- if overdue actions exist, promote TodayActionsCard to top and auto-expand
2. Check streak data from `useUserProgress` -- if active streak, show streak continuation CTA
3. If no actions and no streak, fall back to normal dashboard layout

**Key constraint:** Do NOT auto-navigate away from Dashboard. The success criterion says "surfaces the most relevant view" -- this means re-ordering/promoting dashboard cards, not redirecting. Redirecting would break the mental model of "Dashboard = home".

**Implementation:**
```typescript
// useSmartLanding.ts
function useSmartLanding() {
  const { data: actions } = useTodayActions();
  const { data: user } = useUserProgress();

  const overdueCount = actions?.filter(a => a.isOverdue).length ?? 0;
  const hasActiveStreak = (user?.streak_days ?? 0) > 0;

  // Priority: overdue actions > active streak > default
  if (overdueCount > 0) return 'actions-focus';
  if (hasActiveStreak) return 'streak-focus';
  return 'default';
}
```

### Pattern 2: Smart Defaults (History-Based Pre-population)

**What:** Every TMA form and input should use smart defaults based on user history.

**Current friction points identified:**
1. **Train page difficulty filter:** User must manually select difficulty every time, even though `useTrainingStats` already computes `recommendedDifficulty`. The recommendation is shown as a card but not auto-selected.
2. **Lead notes textarea:** Always empty, no template or suggestion.
3. **LeadStatusSelector:** All statuses shown equally, no suggestion of "next logical status."

**LazyFlow approach:**
- **Train difficulty:** Auto-select `recommendedDifficulty` as the default in `selectedDifficulty` state. The `DifficultyRecommendation` card already shows the recommendation -- just wire it as the initial state.
- **Lead status:** Highlight the "next" status in the pipeline (e.g., if current is "analyzed", highlight "reached_out" with a subtle accent border).
- **Notes:** Pre-populate placeholder with context-aware suggestion based on lead status (e.g., "How did the outreach go?" for reached_out status).

### Pattern 3: One-Tap Workflow Compression

**What:** Multi-step processes condensed to single actions.

**Current friction points:**
1. **Train page:** 3 steps: select difficulty -> click Start Training -> view scenario. Could be 1 step: auto-select recommended difficulty and show "Quick Start" button that goes straight to scenario.
2. **Re-analysis flow:** Context input -> Done -> Re-analyze -> Update Plan (4 taps minimum). Could offer "Re-analyze" directly after each context input (already partially implemented -- the `_reanalyze_keyboard` shows after each input).
3. **Comment generation:** /comment -> send screenshot -> wait -> pick tone. Could auto-generate all 3 tones at once.

**LazyFlow approach for Training:**
```typescript
// Add "Quick Start" button that uses recommended difficulty
const handleQuickStart = useCallback(() => {
  const difficulty = stats.recommendedDifficulty;
  if (difficulty !== null) setSelectedDifficulty(difficulty);
  const scenario = pickRandomScenario();
  if (scenario) {
    setCurrentScenario(scenario);
    setStep('scenario');
  }
}, [stats.recommendedDifficulty, pickRandomScenario]);
```

### Pattern 4: Forwarded Message Auto-Detection (Bot-Side)

**What:** When user forwards a message in /support, auto-extract prospect info.

**Current state:** The support handler (`on_support_input`) processes text through `_run_support_pipeline`. There is NO handler for forwarded messages in `SupportState.waiting_input`. Forwarded messages are only handled in `ReanalysisState.collecting_context` (context_input.py).

**This is a gap.** The bot currently treats forwarded messages as regular text in support mode, losing the forward metadata (sender name, date).

**LazyFlow approach:**
1. Add `F.forward_date` handler in support.py for `SupportState.waiting_input`
2. Extract forward metadata (`forward_from`, `forward_sender_name`, `forward_date`)
3. Pre-populate prospect info from the forwarded message sender
4. Run the pipeline with enriched context

```python
@router.message(SupportState.waiting_input, F.forward_date)
async def on_support_forward(message: Message, state: FSMContext, ...):
    """Handle forwarded messages -- auto-extract sender as prospect."""
    forward_text = message.text or message.caption or ""
    forward_from = None
    if message.forward_from:
        fn = message.forward_from.first_name or ""
        ln = message.forward_from.last_name or ""
        forward_from = f"{fn} {ln}".strip()
    elif message.forward_sender_name:
        forward_from = message.forward_sender_name

    # Enrich input with forward metadata
    enriched = f"[Forwarded from {forward_from}]\n\n{forward_text}"
    # ... run pipeline with enriched input
```

### Pattern 5: Ambient Background Processing

**What:** Start processing before user explicitly asks, then present results.

**Current state:** All processing is triggered by explicit user actions (click Start Analysis, click Re-analyze).

**LazyFlow approach for dashboard prefetching:** When the TMA opens, prefetch the first overdue lead's detail data so that tapping "Today's Actions" item has instant navigation (the lead detail is already in cache).

```typescript
// In TodayActionsCard or useTodayActions
const queryClient = useQueryClient();

// Prefetch first 3 overdue lead details
useEffect(() => {
  if (actions && actions.length > 0) {
    actions.slice(0, 3).forEach(action => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.leads.detail(action.lead_id),
        queryFn: () => fetchLeadDetail(action.lead_id),
      });
    });
  }
}, [actions]);
```

### Anti-Patterns to Avoid

- **Auto-navigation away from root:** Do NOT redirect users away from Dashboard. "Smart landing" means smart content, not forced navigation. Users open TMA expecting Dashboard.
- **Breaking back button:** Every LazyFlow shortcut must respect browser history. Never `navigate(path, { replace: true })` for quick-start actions.
- **Invisible mutations:** LazyFlow means fewer clicks, not hidden actions. Every automated action must have visible feedback (toast, status indicator).
- **Overriding user choices:** Smart defaults must be overridable. If user selects Easy difficulty despite recommendation, respect it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cache prefetching | Custom data fetching | `queryClient.prefetchQuery()` | TanStack Query handles deduplication, staleness |
| Optimistic updates | Manual state management | `useMutation.onMutate` pattern | Built-in rollback on error |
| Smart navigation | Custom router wrapper | Conditional rendering in Dashboard | Simpler, no routing complexity |
| Forward message detection | Custom text parsing | `F.forward_date` aiogram filter | Already proven in context_input.py |
| Difficulty recommendation | New recommendation engine | Existing `useTrainingStats` hook | Already computes `recommendedDifficulty` |

**Key insight:** All "intelligence" for smart defaults already exists in existing hooks and utilities. LazyFlow is about wiring existing intelligence into UI state initialization, not building new intelligence.

## Common Pitfalls

### Pitfall 1: Race Condition in Smart Landing
**What goes wrong:** `useSmartLanding` reads query data that hasn't loaded yet, causing flash of default layout then jump to actions-focus layout.
**Why it happens:** TanStack Query hooks return `isLoading` initially.
**How to avoid:** Show Dashboard skeleton until smart landing data is resolved. Use a combined loading state from both `useTodayActions` and `useUserProgress`.
**Warning signs:** Layout shift (CLS) on Dashboard mount.

### Pitfall 2: Training Quick Start With Empty Pool
**What goes wrong:** "Quick Start" button fires but scenario pool is empty for the recommended difficulty.
**Why it happens:** Recommended difficulty might have unseen scenarios = 0.
**How to avoid:** Quick Start button disabled when recommended difficulty pool is empty. Fall back to "Random" if recommended pool is exhausted.
**Warning signs:** User taps Quick Start, nothing happens.

### Pitfall 3: Forwarded Message Double-Processing
**What goes wrong:** Adding `F.forward_date` handler in support.py might conflict with the existing text handler if aiogram evaluates both.
**Why it happens:** aiogram processes handlers in registration order; `F.forward_date` must be registered BEFORE the generic text handler.
**How to avoid:** Register forward handler before text handler, OR add `~F.forward_date` filter to text handler.
**Warning signs:** Forwarded messages trigger both handlers.

### Pitfall 4: Smart Default Overconfidence
**What goes wrong:** Auto-selecting difficulty or status that doesn't match user intent.
**Why it happens:** Smart default is based on historical data that may not reflect current intent.
**How to avoid:** Always show the auto-selected value as a visible, changeable selection. Never skip the selection UI entirely -- just pre-fill it.
**Warning signs:** User frustration from being forced down a path they didn't choose.

### Pitfall 5: Prefetch Overload
**What goes wrong:** Prefetching too many lead details on Dashboard causes unnecessary API calls.
**Why it happens:** Eagerly prefetching all action leads.
**How to avoid:** Limit prefetch to first 3 action leads. Use `staleTime` to prevent re-fetching on navigation.
**Warning signs:** API call count spikes on Dashboard load.

## Code Examples

### Smart Landing Hook
```typescript
// packages/webapp/src/features/dashboard/hooks/useSmartLanding.ts
import { useTodayActions } from '@/features/leads/hooks/useTodayActions';
import { useUserProgress } from './useUserProgress';

export type LandingFocus = 'actions-focus' | 'streak-focus' | 'default';

export function useSmartLanding(): { focus: LandingFocus; isReady: boolean } {
  const { data: actions, isLoading: actionsLoading } = useTodayActions();
  const { data: user, isLoading: userLoading } = useUserProgress();

  const isReady = !actionsLoading && !userLoading;

  if (!isReady) return { focus: 'default', isReady: false };

  const overdueCount = actions?.filter(a => a.isOverdue).length ?? 0;
  if (overdueCount > 0) return { focus: 'actions-focus', isReady: true };

  const streakDays = user?.streak_days ?? 0;
  if (streakDays > 0) return { focus: 'streak-focus', isReady: true };

  return { focus: 'default', isReady: true };
}
```

### Train Auto-Select Difficulty
```typescript
// In Train.tsx, auto-select recommended difficulty on mount
const stats = useTrainingStats();

const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null);

// Auto-select recommended difficulty when stats load
useEffect(() => {
  if (selectedDifficulty === null && stats.recommendedDifficulty !== null) {
    setSelectedDifficulty(stats.recommendedDifficulty);
  }
}, [stats.recommendedDifficulty, selectedDifficulty]);
```

### Lead Status Smart Suggestion
```typescript
// Smart next-status suggestion based on pipeline order
const STATUS_ORDER = ['analyzed', 'reached_out', 'meeting_booked', 'in_progress', 'closed_won'];
function suggestNextStatus(current: string): string | null {
  const idx = STATUS_ORDER.indexOf(current);
  if (idx >= 0 && idx < STATUS_ORDER.length - 1) {
    return STATUS_ORDER[idx + 1];
  }
  return null;
}
```

### Bot Forward Handler in Support
```python
@router.message(SupportState.waiting_input, F.forward_date)
async def on_support_forward(
    message: Message,
    state: FSMContext,
    # ... same DI params as on_support_input
) -> None:
    """Handle forwarded messages in support mode -- extract sender info."""
    forward_text = message.text or message.caption or ""
    forward_from = None
    if message.forward_from:
        fn = message.forward_from.first_name or ""
        ln = message.forward_from.last_name or ""
        forward_from = f"{fn} {ln}".strip() or message.forward_from.username
    elif message.forward_sender_name:
        forward_from = message.forward_sender_name

    # Enrich context with forward metadata
    if forward_from:
        user_input = f"Prospect name: {forward_from}\n\nTheir message:\n{forward_text}"
    else:
        user_input = forward_text

    status_msg = await message.answer("Analyzing forwarded message...")

    await _run_support_pipeline(
        user_input=user_input,
        # ... same params
    )
```

### Dashboard Prefetching
```typescript
// In TodayActionsCard, prefetch first few lead details
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queries';

// Inside TodayActionsCard component:
const queryClient = useQueryClient();

useEffect(() => {
  if (actions && actions.length > 0) {
    // Prefetch first 3 lead details for instant navigation
    actions.slice(0, 3).forEach(action => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.leads.detail(action.lead_id),
        // queryFn would be the same as useLead's queryFn
        staleTime: 60_000,
      });
    });
  }
}, [actions, queryClient]);
```

## Friction Point Analysis (Full Map)

### Success Criterion 1: Smart Landing
| Current UX | Friction | LazyFlow Fix |
|-----------|---------|-------------|
| Dashboard always shows same card order | User must scroll to find what matters | Promote TodayActionsCard with urgency styling when overdue actions exist |
| No contextual greeting | Generic dashboard feels impersonal | Show contextual header: "3 overdue actions" or "Day 5 streak" |
| QuickActions always same 5 buttons | No prioritization | Highlight most-needed action based on context |

### Success Criterion 2: Pre-populated Support (Bot)
| Current UX | Friction | LazyFlow Fix |
|-----------|---------|-------------|
| Forwarded message treated as plain text | Forward metadata (sender name) lost | Add `F.forward_date` handler to extract sender as prospect name |
| /support requires explicit command | User must remember command | Already handled by "Open in App" buttons (Phase 7) |
| No auto-detection of message type | User must know to send text vs photo | Already handled by input routing (Phase 13) |

### Success Criterion 3: One-Photo Lead Creation
| Current UX | Friction | LazyFlow Fix |
|-----------|---------|-------------|
| Photo triggers extraction+strategist pipeline | Already 1-action (send photo) | Pipeline already does: extract -> analyze -> create lead -> enrich in background |
| User sees analysis text, must find lead later | No "Looks good" confirmation | Add confirmation summary with lead preview after pipeline completes |
| No explicit "Looks good" tap | User taps Done or navigates away | Change "Done" button text to "Looks Good" and add inline lead card preview |

**Note:** The one-photo lead creation is ALREADY nearly LazyFlow. The pipeline (support_photo.yaml) does: ExtractionAgent -> Strategist -> Memory (background), then `_run_support_pipeline` auto-creates the lead and fires background enrichment. The only missing piece is a "Looks good" confirmation UX instead of the current analysis dump.

### Success Criterion 4: Smart Defaults Everywhere
| Current UX | Friction | LazyFlow Fix |
|-----------|---------|-------------|
| Train difficulty: null by default | Must manually select | Auto-select `recommendedDifficulty` |
| Lead notes: empty placeholder | Generic "Add context..." text | Status-aware placeholder: "How did the outreach go?" for reached_out |
| LeadStatusSelector: all equal | No next-step guidance | Highlight suggested next status |
| DifficultyFilter: no pre-selection | User clicks recommendation then selects | Wire recommendation to auto-select |

### Success Criterion 5: Single-Tap Workflows
| Current UX | Friction | LazyFlow Fix |
|-----------|---------|-------------|
| Train: filter -> start -> scenario (3 steps) | Too many clicks for daily practice | Add "Quick Start" button that auto-selects recommended + starts |
| Re-analysis: context -> done -> confirm -> update plan (4 taps) | Too conversational | Offer "Re-analyze now" after each context input (already partially done) |
| Comment: /command -> screenshot -> wait -> style | Must navigate to command | Already accessible from lead detail "Comment on Post" button |

## State of the Art

| Old Approach | Current Approach | Impact |
|-------------|------------------|--------|
| Static dashboard layout | Context-aware card ordering/promotion | User sees what matters first |
| Manual form filling | History-based defaults with override | 95%+ accuracy on predictions |
| Multi-step wizards | Single-action with confirmation | Fewer taps, same control |
| Eager API calls | Prefetch + optimistic updates | Instant-feeling navigation |

## Scope Boundaries

### In Scope (Pure UX -- No New APIs)
- Dashboard smart landing (card reordering based on data already fetched)
- Train auto-difficulty selection (wiring existing hook data to state)
- LeadStatusSelector suggestion highlight (pure CSS/conditional rendering)
- Lead notes context-aware placeholders (based on lead.status already in scope)
- Quick Start button on Train (combining existing handlers)
- Dashboard prefetching (using existing React Query infrastructure)
- Bot forwarded message handler in /support (new handler using existing patterns)
- "Looks Good" confirmation on photo lead creation (changing response format)

### Out of Scope
- New database tables or columns
- New API endpoints or Edge Functions
- New AI agents or pipeline configs
- New TMA pages or routes
- Mobile push notifications
- Complex ML-based prediction models

## Open Questions

1. **Photo lead "Looks Good" UX**
   - What we know: The pipeline already auto-creates the lead. The user sees analysis text with action buttons.
   - What's unclear: Should "Looks Good" dismiss the response, or should it navigate to the TMA lead detail?
   - Recommendation: "Looks Good" should be the equivalent of current "Done" -- dismiss the action buttons. Add "View Lead & Plan" as the prominent CTA (already exists). The "Looks Good" rename is primarily about mental framing -- making the user feel they're confirming rather than dismissing.

2. **Dashboard card reordering vs. separate "focus view"**
   - What we know: Success criterion says "no navigation needed for the primary daily task"
   - What's unclear: Should we reorder existing cards, or create a separate "focus mode" overlay?
   - Recommendation: Reorder cards. An overlay adds complexity and breaks the established dashboard pattern. Simply moving TodayActionsCard to the very top with urgency styling (red accent border when overdue) achieves the same effect.

3. **95% accuracy claim for smart defaults**
   - What we know: Difficulty recommendation is based on solid historical data. Status suggestion follows a natural pipeline order.
   - What's unclear: How to measure 95% accuracy.
   - Recommendation: This is a directional target, not a measurable metric. The key patterns (auto-select recommended difficulty, suggest next status) will be correct for the vast majority of use cases because they follow obvious progressions.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: all files in `packages/webapp/src/` and `bot/handlers/`
- Existing hooks: `useTodayActions`, `useTrainingStats`, `useUserProgress`, `useLeads`
- Existing components: `Dashboard.tsx`, `Train.tsx`, `LeadDetail.tsx`, `TodayActionsCard.tsx`
- Pipeline configs: `data/pipelines/support.yaml`, `data/pipelines/support_photo.yaml`
- Bot handlers: `support.py`, `context_input.py`, `comment.py`, `leads.py`

### Secondary (MEDIUM confidence)
- [TanStack Query Optimistic Updates Guide](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) -- verified patterns for prefetch and optimistic UI
- [Telegram Mini Apps Launch Parameters](https://docs.telegram-mini-apps.com/platform/launch-parameters) -- startParam handling

### Tertiary (LOW confidence)
- None. All findings based on direct codebase analysis.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing libraries
- Architecture: HIGH -- patterns derived directly from existing codebase patterns
- Pitfalls: HIGH -- identified from actual code structure and handler registration order
- Friction analysis: HIGH -- based on reading every relevant component and handler

**Research date:** 2026-02-06
**Valid until:** No expiration (codebase-specific analysis, not library-dependent)
