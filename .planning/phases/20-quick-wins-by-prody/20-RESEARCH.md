# Phase 20: Quick Wins by Prody - Research

**Researched:** 2026-02-08
**Domain:** TMA UI quick wins, bot XP system, pipeline visibility, onboarding polish
**Confidence:** HIGH

## Summary

Phase 20 implements 10 PM-audit-driven quick wins from `docs/pm-audit/06-QUICK-WINS.md`. These are small, focused improvements that touch existing components rather than introducing new infrastructure. The work spans both TMA (React/TypeScript) and bot (Python/aiogram) but each quick win is self-contained and requires no new libraries, migrations, or architectural changes.

The codebase is extremely well-structured for these changes. Every component, hook, and handler referenced by the quick wins already exists and follows consistent patterns. The LevelUpOverlay + confetti system is ready for deal closure celebration. The WeakAreasCard already computes weak areas but navigates without filtering. The TodayActionsCard already aggregates actions but has no "all caught up" state messaging. The LeadStatusSelector already suggests next status visually (dashed border) but doesn't trigger on step completion. The MemberLeaderboard shows tappable rows but does nothing on tap.

**Primary recommendation:** Execute all 10 quick wins across 4-5 plans, grouped by surface area (TMA leads, TMA dashboard, bot backend, admin). Each quick win is 1-3 hours as the PM audit estimates, and all build on existing infrastructure.

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18 | TMA frontend | Already in use |
| TanStack Query | 5.x | Data fetching, caching, mutations | Already in use |
| Zustand | 4.x | Client-side state (auth, toast) | Already in use |
| canvas-confetti | 1.x | Confetti animation | Already in use (LevelUpOverlay) |
| aiogram | 3.x | Telegram bot framework | Already in use |
| Tailwind CSS | 4 | Styling | Already in use |
| Lucide React | 0.x | Icons | Already in use |

### No New Dependencies Required

All 10 quick wins can be implemented using only existing libraries. No new packages needed.

## Architecture Patterns

### Existing Patterns to Follow

#### Pattern 1: TMA Mutation with Toast Feedback
**What:** All mutations (status change, step update, note save) use `useMutation` with `onSuccess`/`onError` callbacks that call `toast()`.
**When to use:** Quick Wins #1 (deal closure XP), #5 (smart status suggestion), #8 (outcome tracking)
**Example:** `useUpdateLeadStatus.ts` and `handleStatusChange` in `LeadDetail.tsx`

```typescript
// Source: packages/webapp/src/features/leads/components/LeadDetail.tsx:322-349
const handleStatusChange = useCallback(
  (newStatus: LeadStatus) => {
    mutation.mutate(vars, {
      onSuccess: () => { toast({ type: 'success', message: 'Status updated' }); },
      onError: (err) => { toast({ type: 'error', message: `...` }); },
    });
  },
  [lead, telegramId, mutation, toast],
);
```

#### Pattern 2: Dashboard Card Component
**What:** Self-contained cards with their own data hooks, loading/error/empty states.
**When to use:** Quick Wins #3 (pipeline summary), #6 (done for today)
**Example:** `TodayActionsCard.tsx`, `WeakAreasCard.tsx`

```typescript
// Pattern: Card imports its own hook, handles loading/error/empty internally
export function MyCard() {
  const { data, isLoading, isError, refetch } = useMyHook();
  if (isLoading) return <Skeleton />;
  if (isError) return <ErrorCard />;
  if (!data) return <EmptyState />;
  return <Card>...</Card>;
}
```

#### Pattern 3: Bot Status Update Handler
**What:** Callback query handler that updates status and refreshes the detail view.
**When to use:** Quick Win #1 (bot-side XP on closed_won), #5 (status suggestion toast)
**Example:** `bot/handlers/leads.py:440-482` (`on_lead_status_update`)

#### Pattern 4: URL-based Filtering/Routing
**What:** Pass filter criteria as URL query params, read with `useSearchParams`.
**When to use:** Quick Win #4 (weak area -> filtered training)
**Example:** `?step=X` deep links already work in LeadDetail

#### Pattern 5: Gamification Animation Trigger
**What:** `useLevelUpDetection` watches `useUserProgress` data for level changes, triggers overlay.
**When to use:** Quick Win #1 (trigger celebration on deal closure)
**Example:** `features/gamification/hooks/useLevelUpDetection.ts`

### Anti-Patterns to Avoid
- **Don't add new Zustand stores for transient UI state.** Quick wins are small; local component state + URL params suffice. The codebase uses Zustand only for auth and toast.
- **Don't create new InsForge tables or migrations.** All quick wins should work with existing tables. Outcome capture (#8) uses `metadata` JSONB on `lead_activity_log` (already has a metadata field pattern from Phase 15).
- **Don't refactor existing components.** These are quick wins -- extend, don't restructure.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confetti animation | Custom particle system | `canvas-confetti` via `fireLevelUpConfetti()` | Already configured, accessible (respects prefers-reduced-motion) |
| Toast notifications | Custom notification system | `useToast()` from `shared/stores/toastStore` | Consistent with existing mutation feedback |
| XP update | Custom XP endpoint | InsForge PostgREST `update` on `users` table | Same pattern as `useUpdateLeadStatus` |
| Level calculation | Custom level math | `get_level_from_xp()` from `bot/services/scoring.py` | Already handles progressive XP thresholds |

## Common Pitfalls

### Pitfall 1: XP Award Without Level Recalculation
**What goes wrong:** Awarding XP by incrementing `total_xp` without recalculating `current_level` leaves the user stuck at old level.
**Why it happens:** The `users` table stores both `total_xp` and `current_level` as separate columns. They must be updated atomically.
**How to avoid:** Use `UserRepo.update_xp()` on the bot side (it recalculates level). On the TMA side, either call a similar mutation that does both, or award XP through the bot's existing RPC. The bot's `update_xp` method already recalculates level.
**Warning signs:** User's XP increases but level/rank stays the same.

### Pitfall 2: Optimistic Update Desync After XP Award
**What goes wrong:** If the TMA awards XP directly (not through the bot), the `useUserProgress` query cache shows stale level data until manual refetch.
**Why it happens:** `useUserProgress` has no automatic refetch interval.
**How to avoid:** After any XP mutation, invalidate `queryKeys.users.detail(telegramId)` so the ProgressCard and LevelUpDetection hook pick up the new level. This is the same pattern used in `useUpdatePlanStep.onSettled`.

### Pitfall 3: Stale Lead Data on Status Change
**What goes wrong:** After changing status to `closed_won`, the lead list cache still shows old status.
**Why it happens:** `useUpdateLeadStatus.onSettled` already handles this by invalidating `queryKeys.leads.byUser` and `queryKeys.leads.detail`. But if you add side effects (XP award, celebration), they need to happen AFTER the status update succeeds, not in parallel.
**How to avoid:** Chain effects in `onSuccess` callback of the mutation, not in `mutationFn`.

### Pitfall 4: URL Params Cleared on Navigation
**What goes wrong:** Passing `?difficulty=2` to `/train` loses the param after the first render because `useState` initializes from null, not from URL params.
**Why it happens:** The Train page uses `useState<number | null>(null)` for `selectedDifficulty`, then overrides with `stats.recommendedDifficulty` via useEffect. URL params are never read.
**How to avoid:** Read `searchParams.get('difficulty')` in the initializer and prioritize it over the auto-selected difficulty.

### Pitfall 5: Smart Status Suggestion Conflicting with Existing Visual
**What goes wrong:** The LeadStatusSelector already shows a dashed border on the suggested next status (the `suggestNextStatus()` ring). Adding a toast/modal on step completion could conflict if the user is already looking at the status selector.
**Why it happens:** Two different suggestion mechanisms operating at different layers.
**How to avoid:** The toast suggestion (#5) should be triggered from step completion context, not from the status selector. It's additive -- the visual ring stays, and the toast provides context-aware prompting when outreach steps are done.

## Code Examples

### Quick Win #1: Deal Closure Celebration + XP (TMA Side)

```typescript
// In useUpdateLeadStatus.ts mutationFn or a wrapper hook:
// After successful status update to closed_won:
if (newStatus === 'closed_won') {
  // Award 500 XP
  const { error: xpError } = await getInsforge()
    .database.rpc('increment_xp', { user_telegram_id: telegramId, xp_amount: 500 });
  // OR: simple update (need to fetch current XP first)
  // This is the simpler approach since no RPC exists:
  const { data: user } = await getInsforge()
    .database.from('users')
    .select('total_xp, current_level')
    .eq('telegram_id', telegramId)
    .single();
  if (user) {
    const newXp = user.total_xp + 500;
    // Recalculate level (same logic as bot scoring.py)
    let level = 1, remaining = newXp;
    while (true) {
      const needed = level * 200;
      if (remaining < needed) break;
      remaining -= needed;
      level++;
    }
    await getInsforge()
      .database.from('users')
      .update({ total_xp: newXp, current_level: level })
      .eq('telegram_id', telegramId);
  }
}
```

### Quick Win #1: Deal Closure Celebration + XP (Bot Side)

```python
# In bot/handlers/leads.py on_lead_status_update:
if new_status == "closed_won":
    # Award XP
    user = await user_repo.get_by_telegram_id(callback.from_user.id)
    if user:
        await user_repo.update_xp(callback.from_user.id, 500)
    await callback.answer("Deal Won! +500 XP")
```

### Quick Win #3: Pipeline Summary Bar

```typescript
// In LeadList.tsx, above the lead cards:
const statusCounts = useMemo(() => {
  if (!leads) return null;
  const counts: Record<string, number> = {};
  let staleCount = 0;
  const now = Date.now();
  for (const lead of leads) {
    counts[lead.status] = (counts[lead.status] ?? 0) + 1;
    const updated = new Date(lead.updated_at ?? lead.created_at ?? 0).getTime();
    if (now - updated > 7 * 86400000 && !['closed_won', 'closed_lost'].includes(lead.status)) {
      staleCount++;
    }
  }
  return { counts, staleCount };
}, [leads]);

// Render: compact status bar
<div className="flex gap-2 text-xs text-text-secondary">
  <span>{active} Active</span>
  {staleCount > 0 && <span className="text-warning">{staleCount} Stale</span>}
  <span>{closed} Closed</span>
</div>
```

### Quick Win #4: Weak Area -> Filtered Training

```typescript
// In WeakAreasCard.tsx, update the navigate call:
onClick={() => navigate(
  area.type === 'track-level'
    ? '/learn'
    : `/train?difficulty=${encodeURIComponent(diff)}`
)}

// In Train.tsx, read the URL param:
const [searchParams] = useSearchParams();
const urlDifficulty = searchParams.get('difficulty');
const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(
  urlDifficulty ? parseInt(urlDifficulty, 10) : null,
);
```

### Quick Win #8: Outcome Tracking Modal

```typescript
// Quick-select options for closure reason:
const CLOSURE_WON_REASONS = ['Strong relationship', 'Right timing', 'Competitive pricing', 'Product fit', 'Other'];
const CLOSURE_LOST_REASONS = ['Pricing', 'Timing', 'Competition', 'No budget', 'Ghosted', 'Other'];

// Use existing lead_activity_log with metadata:
await getInsforge().database.from('lead_activity_log').insert({
  lead_id: leadId,
  telegram_id: telegramId,
  activity_type: 'status_change',
  content: `Closed: ${reason}`,
  metadata: { closure_reason: reason, closure_type: 'won' | 'lost' },
});
```

## Quick Win Feasibility Assessment

| # | Quick Win | TMA | Bot | Effort | Complexity | Notes |
|---|-----------|-----|-----|--------|------------|-------|
| 1 | Deal Closure Celebration + XP | `useUpdateLeadStatus` + LevelUpOverlay | `on_lead_status_update` | 2h | Low | Extend existing mutation + reuse confetti system |
| 2 | "Start Free" Label | N/A | `bot/handlers/start.py` | 30m | Trivial | String changes in `SETUP_METHOD_KEYBOARD` and text |
| 3 | Pipeline Summary on Leads | `LeadList.tsx` | N/A | 1h | Low | Compute from existing `useLeads` data |
| 4 | Weak Area -> Filtered Training | `WeakAreasCard`, `Train.tsx` | N/A | 1h | Low | URL params + useSearchParams |
| 5 | Smart Status Suggestion | `LeadDetail.tsx` | N/A | 2h | Medium | Detect step completions, show contextual toast |
| 6 | "Done for Today" Summary | `TodayActionsCard.tsx` | N/A | 1h | Low | Enhance existing empty state |
| 7 | Admin Rep Detail View | New `RepDetailView`, `MemberLeaderboard` | N/A | 2-3h | Medium | New component, but reuses existing query hooks |
| 8 | Outcome Tracking | `LeadDetail.tsx` (modal) | N/A | 2h | Medium | New modal component + activity log metadata |
| 9 | First-Time Guided Tour | `Dashboard.tsx` | N/A | 3h | Medium | Conditional rendering based on 0 XP + 0 leads |
| 10 | Stale Lead Daily Digest | N/A | `followup_scheduler.py` | 1-2h | Low | Add stale check to existing scheduler loop |

## Implementation Grouping Recommendation

### Plan 1: Deal Closure & Onboarding (QW #1, #2)
- **#1** TMA: Extend `handleStatusChange` in LeadDetail to award 500 XP and trigger `fireLevelUpConfetti()` when status becomes `closed_won`. Invalidate user progress cache.
- **#1** Bot: Extend `on_lead_status_update` in leads.py to call `user_repo.update_xp(tg_id, 500)` when new_status is `closed_won`.
- **#2** Bot: Rename "Quick Setup (Recommended)" to "Start Free" in start.py, clean up technical language.

### Plan 2: Pipeline Visibility (QW #3, #6)
- **#3** TMA: Add `PipelineSummaryBar` to LeadList showing aggregated status counts + stale count.
- **#6** TMA: Enhance TodayActionsCard empty state with streak indicator and completion message.

### Plan 3: Smart Suggestions & Training Routing (QW #4, #5)
- **#4** TMA: Pass difficulty/category as URL params from WeakAreasCard to Train page. Read params in Train.tsx.
- **#5** TMA: After completing all steps of a certain type, show a toast suggesting status progression. Check step completion patterns in useUpdatePlanStep onSuccess.

### Plan 4: Outcome Capture & Stale Digest (QW #8, #10)
- **#8** TMA: Add `OutcomeCaptureModal` triggered when status changes to `closed_won` or `closed_lost`. Quick-select reasons stored as metadata in lead_activity_log.
- **#10** Bot: Extend followup_scheduler to send daily stale lead digest message when stale count > 0.

### Plan 5: Admin Rep Detail & First-Time Tour (QW #7, #9)
- **#7** TMA: Add `RepDetailView` component navigated from MemberLeaderboard tap. Show recent attempts, scores, lead count, streak.
- **#9** TMA: Conditional guided tour on Dashboard when user has 0 XP and 0 leads.

## Key Technical Details

### XP System (from `bot/services/scoring.py`)
- XP per level: `level * 200` (level 1 = 200 XP, level 2 = 400 XP, etc.)
- Training XP: base = score (0-100), first attempt >80 = +10 bonus, retry improvement >20 = +15 bonus
- Track completion bonus: 50 XP
- **Deal closure XP (new):** 500 XP (PM audit recommendation)
- Level recalculation: `UserRepo.update_xp()` already handles this

### Status Pipeline (from `features/leads/types.ts`)
```
analyzed -> reached_out -> meeting_booked -> in_progress -> closed_won
                                                        -> closed_lost (terminal)
```
- `suggestNextStatus()` returns the next status in pipeline order
- `closed_lost` has no suggested next (terminal)
- Visual suggestion: `ring-2 ring-accent/40` dashed border on suggested status pill

### Stale Lead Logic (from Phase 8)
- Threshold: 7+ days since `updated_at`
- Already shown on LeadCard via visual indicator
- `followup_scheduler.py` runs every 6 hours, checks `next_followup` column

### Activity Log Metadata Pattern (from Phase 15)
- `lead_activity_log` table has `metadata JSONB` column
- Used for structured data like `changes_count`, `headline`
- Perfect for closure reasons without schema changes

### Toast System (from Phase 10)
- `useToast()` from `shared/stores/toastStore`
- Supports `type: 'success' | 'error' | 'info'`
- Supports optional `action: { label: string, onClick: () => void }`
- Used throughout leads, settings, and step actions

### Existing Empty State Patterns
- `TodayActionsCard`: Shows "No actions due today. Great job!" when empty
- `WeakAreasCard`: Shows "No weak spots -- keep it up!" when empty
- Can extend with richer "done for today" messaging

## Open Questions

1. **XP Award Surface: TMA vs Bot vs Both?**
   - What we know: Status can be changed from both TMA (`useUpdateLeadStatus`) and bot (`lead:status:` callback). XP must be awarded regardless of surface.
   - What's unclear: Should both surfaces independently award XP, or should one defer to the other?
   - Recommendation: Award XP on BOTH surfaces. Use `UserRepo.update_xp()` on bot side (already idempotent -- calculates from total, not increment). On TMA side, do a read-update on the users table. Add a guard to prevent double-awarding by checking an `xp_awarded_for_closure` flag in activity_log metadata.

2. **Smart Status Suggestion Trigger (#5)**
   - What we know: Step statuses are tracked per-step. The PM audit says "when all outreach steps are done, suggest Reached Out."
   - What's unclear: How to categorize steps as "outreach" type vs other types. Engagement plan steps have `description` and `timing` but no `type` field.
   - Recommendation: Use a simpler heuristic -- when the first N steps are done (regardless of type), suggest the next pipeline status. Or count completed percentage (e.g., 50%+ done = suggest next status). The visual suggestion already exists; the toast adds context.

3. **Guided Tour Scope (#9)**
   - What we know: PM audit describes a 3-step inline guide with a sample screenshot.
   - What's unclear: Does a sample screenshot exist? Should it be bundled as a static asset?
   - Recommendation: Start simpler -- show a contextual banner/card on the Dashboard for 0-XP users pointing them to send a prospect screenshot in the bot. No need for a full walkthrough carousel in v1.

## Sources

### Primary (HIGH confidence)
- Codebase investigation: All component files, hooks, handlers verified by reading source directly
- `docs/pm-audit/06-QUICK-WINS.md` -- primary requirements source
- `docs/pm-audit/00-EXECUTIVE-SUMMARY.md` -- strategic context
- `docs/pm-audit/01-LEAD-LIFECYCLE.md` -- pipeline velocity details
- `docs/pm-audit/04-ONBOARDING-AND-ACTIVATION.md` -- onboarding friction analysis
- `docs/pm-audit/03-TRAINING-INTEGRATION.md` -- training routing details
- `docs/pm-audit/07-PRODUCT-NORTH-STAR.md` -- vision and metrics context

### Secondary (MEDIUM confidence)
- PM audit effort estimates (30min - 3h per win) -- reasonable given codebase maturity
- Grouping strategy -- based on component proximity and dependency analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed, all patterns verified in codebase
- Architecture: HIGH - Every component and hook exists, patterns documented with code examples
- Pitfalls: HIGH - All based on actual codebase analysis (XP desync, cache invalidation, URL params)

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (stable -- no external dependencies)
