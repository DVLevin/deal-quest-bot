# Phase 9: Training Experience - Research

**Researched:** 2026-02-04
**Domain:** Client-side data aggregation, UI enhancement, cross-referencing scenario metadata with attempt history
**Confidence:** HIGH

## Summary

Phase 9 enhances the TMA's training experience with four features: difficulty recommendation on the Train page, per-track progress stats on the Learn page, weak area identification on the Dashboard, and scenario variety indicators in Train mode. All four requirements are purely client-side UI enhancements that compute derived data from existing InsForge tables (`attempts`, `track_progress`, `scenarios_seen`, `generated_scenarios`). No new database tables, migrations, or backend changes are needed.

The key technical challenge is TRAIN-V11-01 (difficulty recommendation), which requires cross-referencing attempt `scenario_id` values with scenario pool difficulty metadata. The `attempts` table does NOT store difficulty directly -- it only stores `scenario_id`, `score`, and `mode`. Difficulty must be resolved by looking up each scenario_id in the combined pool (static `TRAIN_POOL` + `generated_scenarios` table). This join must happen client-side.

**Primary recommendation:** Build a single `useTrainingStats` hook that fetches attempts + scenario pool in parallel, cross-references them, and returns all derived stats (avg score per difficulty, weak areas, unseen count) consumed by multiple components.

## Standard Stack

### Core

No new libraries needed. All features use the existing stack:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | (existing) | Data fetching, caching, dedup | Already used for all TMA queries |
| react-router | 7.x (existing) | Navigation for "Practice this" CTAs | Already used for all routing |
| lucide-react | (existing) | Icons for weak area indicators | Already used project-wide |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-variance-authority | (existing) | Badge variant styling for recommended difficulty | Already used in Badge component |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-side difficulty join | DB view/function | Would need InsForge migration + more complexity; overkill for 20-200 scenarios |
| New stats query per feature | Shared useTrainingStats hook | Shared hook avoids duplicate attempts queries and keeps logic centralized |

**Installation:**
No new packages needed.

## Architecture Patterns

### Recommended Project Structure

```
packages/webapp/src/
├── features/
│   ├── train/
│   │   ├── hooks/
│   │   │   ├── useScenarioPool.ts          # Existing (no changes)
│   │   │   ├── useTrainingStats.ts         # NEW: difficulty stats, variety count
│   │   │   └── useCountdown.ts             # Existing (no changes)
│   │   ├── components/
│   │   │   ├── DifficultyFilter.tsx         # MODIFY: add recommendation badge
│   │   │   ├── DifficultyRecommendation.tsx # NEW: recommendation card
│   │   │   └── ScenarioVariety.tsx          # NEW: unseen count + nudge
│   │   └── data/
│   │       └── scenarios.ts                # Existing (no changes)
│   ├── learn/
│   │   ├── components/
│   │   │   ├── TrackList.tsx               # MODIFY: add track summary header
│   │   │   └── TrackSummary.tsx            # NEW: per-track stats card
│   │   └── hooks/
│   │       └── useTrackProgress.ts         # Existing (already has needed data)
│   └── dashboard/
│       └── components/
│           ├── WeakAreasCard.tsx            # NEW: user weak areas with Practice CTA
│           └── QuickActions.tsx            # Existing (no changes)
├── pages/
│   ├── Train.tsx                           # MODIFY: add recommendation + variety
│   ├── Learn.tsx                           # No changes (TrackList handles it)
│   └── Dashboard.tsx                       # MODIFY: add WeakAreasCard
```

### Pattern 1: Shared Stats Hook (Cross-Reference Join)

**What:** A single hook that fetches attempts data and scenario metadata, then cross-references them to produce derived statistics (avg score per difficulty, weak areas by category).

**When to use:** When you need to combine data from two different tables where the database doesn't have a foreign key join available through PostgREST.

**Why this approach:** The `attempts` table only stores `scenario_id` and `score` -- no difficulty column. To compute "average score per difficulty," we must look up each scenario_id in the scenario pool to find its difficulty. This is a client-side join.

**Example:**
```typescript
// useTrainingStats.ts -- cross-references attempts with scenario pool
interface TrainingStats {
  avgScoreByDifficulty: Record<number, { avg: number; count: number }>;
  weakCategories: Array<{ category: string; avgScore: number; count: number }>;
  recommendedDifficulty: number | null;
  unseenCount: number;
  totalPoolSize: number;
}

// Fetch attempts (last 100) and scenario pool in parallel
// Map scenario_id -> difficulty using the scenario pool
// Group attempt scores by difficulty level
// Recommend: if avg >= 70 at current difficulty, suggest next level up
```

### Pattern 2: Computed Display Above Existing UI (Non-Invasive Enhancement)

**What:** Add new stat components above existing page content without restructuring.

**When to use:** When enhancing an existing page with new info sections.

**Example for Train page:**
```
[DifficultyRecommendation card]     <-- NEW: "Try Hard! You're averaging 78 on Medium"
[DifficultyFilter buttons]           <-- EXISTING (unchanged)
[ScenarioVariety indicator]          <-- NEW: "3 unseen scenarios remaining"
[Start Training button]              <-- EXISTING (unchanged)
```

### Pattern 3: Reuse Admin WeakAreas Pattern for User-Level

**What:** The admin WeakAreas hook/component already groups attempts by scenario_id and computes avg scores. The user-level version is identical except it filters by telegram_id and adds a "Practice this" CTA.

**When to use:** When adapting an existing team-level feature to be user-specific.

**Key differences from admin version:**
- Filter attempts by `telegram_id` (user-specific, not team-wide)
- Group by category + difficulty (not just scenario_id) for actionable recommendations
- Add navigation CTA (Link to /train with pre-selected difficulty, or /learn with specific track)

### Anti-Patterns to Avoid

- **Fetching attempts multiple times:** Dashboard WeakAreasCard and Profile StatsOverview both need recent attempts. Use TanStack Query deduplication via shared query keys (`queryKeys.attempts.stats`) to avoid duplicate requests.
- **Storing derived stats in state:** Computed values (recommended difficulty, weak areas) should be derived in hooks using `useMemo`, not stored in React state or Zustand. They're always derivable from source data.
- **Adding difficulty to attempts table:** Don't add a `difficulty` column to `attempts` just to avoid the client-side join. The join is trivial with <200 scenarios and <100 attempts, and adding a column would require a migration + bot code changes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Difficulty recommendation algorithm | Complex ML-based recommendation | Simple threshold-based: avg >= 70 suggest harder, avg < 40 suggest easier | Users have 3 difficulty levels -- a simple threshold works perfectly |
| Scenario seen tracking | Custom localStorage tracking | Existing `scenarios_seen` table via InsForge | Already tracked by the bot; TMA just reads it |
| Score aggregation | Custom stats engine | `useMemo` over fetched attempts array | Client-side aggregation of 100 rows is instant |
| Track progress computation | Custom progress calculator | Existing `useTrackProgress` hook already returns status + bestScore | Already has all needed data |

**Key insight:** All four requirements are pure display/computation over existing data. Zero new backend infrastructure is needed.

## Common Pitfalls

### Pitfall 1: Attempts Don't Store Difficulty

**What goes wrong:** Developer assumes `attempts` table has a `difficulty` column and writes a query grouping by it.
**Why it happens:** The `generated_scenarios` table has `difficulty`, and it seems logical that attempts would too. But `attempts` only has: `id, user_id, telegram_id, scenario_id, mode, score, feedback_json, xp_earned, created_at`.
**How to avoid:** Cross-reference `scenario_id` with the scenario pool (static TRAIN_POOL + generated_scenarios table) to look up difficulty. Build a `Map<string, number>` mapping scenario_id -> difficulty.
**Warning signs:** Query returns no `difficulty` column or undefined values.

### Pitfall 2: Scenario ID Format Differences (Learn vs Train)

**What goes wrong:** Mixing up learn scenario IDs (e.g., `learn_1_1`, `learn_1_2`) with train scenario IDs (e.g., `train_001`, `train_002`, `gen_...`) when grouping weak areas.
**Why it happens:** Both learn and train attempts are in the same `attempts` table, differentiated only by the `mode` column (`'learn'` vs `'train'`).
**How to avoid:** Always filter by `mode` when computing train-specific stats (`mode === 'train'`). For weak area identification, handle both modes separately -- learn weak areas map to tracks/levels, train weak areas map to categories/difficulties.
**Warning signs:** Unexpected scenario IDs appearing in training stats.

### Pitfall 3: Empty State on New Users

**What goes wrong:** Division by zero or NaN when computing averages for users with zero attempts at a particular difficulty.
**Why it happens:** New users or users who only train at one difficulty level will have no data for other levels.
**How to avoid:** Guard all average computations with `count > 0` checks. Show "No data yet" instead of recommendations when insufficient attempts exist. The existing `useUserStats` hook already demonstrates this pattern.
**Warning signs:** NaN or Infinity values in the UI.

### Pitfall 4: Scenario Pool May Be Empty or DB-Only

**What goes wrong:** Assuming static `TRAIN_POOL` is always the source of truth for scenario difficulty mapping.
**Why it happens:** The `useScenarioPool` hook falls back to static data, but in production the scenarios may come from `generated_scenarios` table with different IDs.
**How to avoid:** Build the scenario_id -> difficulty map from BOTH sources: static TRAIN_POOL AND generated_scenarios table. Use the same dual-source approach as `useScenarioPool`.
**Warning signs:** Some scenario_ids from attempts don't match any known scenario (can't resolve difficulty).

### Pitfall 5: Stale Seen Count After Bot Interaction

**What goes wrong:** User completes a scenario in the bot, returns to TMA, and the "unseen scenarios" count is stale.
**Why it happens:** TanStack Query caches the scenarios_seen result.
**How to avoid:** Use `refetchOnWindowFocus: true` on the seen scenarios query (same pattern used for attempts in Phase 3). The TMA already does this for `attempts.latest` queries.
**Warning signs:** Count doesn't update after bot interaction until manual refresh.

### Pitfall 6: Track Stats Only Work for 'foundations' Track

**What goes wrong:** Building per-track stats generically when there's only one track (`foundations`) in the static data.
**Why it happens:** The code references `TRACKS['foundations']` directly in multiple places. The `useTrackProgress` hook defaults to `'foundations'`.
**How to avoid:** Build track summary stats that iterate over `Object.keys(TRACKS)` for future-proofing, but currently there's only one track. Don't over-engineer multi-track support -- just make the code extensible.
**Warning signs:** Hardcoded `'foundations'` string scattered in new code.

## Code Examples

### Example 1: Cross-Reference Attempts with Scenario Difficulty

```typescript
// Build scenario_id -> difficulty map from both sources
function buildDifficultyMap(
  staticPool: TrainScenario[],
  dbScenarios: GeneratedScenarioRow[],
): Map<string, number> {
  const map = new Map<string, number>();
  // Static pool first
  for (const s of staticPool) {
    map.set(s.id, s.difficulty);
  }
  // DB scenarios override (same IDs unlikely, but defensive)
  for (const s of dbScenarios) {
    map.set(s.scenario_id, s.difficulty);
  }
  return map;
}

// Compute avg score per difficulty from attempts
function computeAvgByDifficulty(
  attempts: Array<{ scenario_id: string; score: number }>,
  difficultyMap: Map<string, number>,
): Record<number, { avg: number; count: number }> {
  const groups: Record<number, number[]> = { 1: [], 2: [], 3: [] };

  for (const a of attempts) {
    const diff = difficultyMap.get(a.scenario_id);
    if (diff && groups[diff]) {
      groups[diff].push(a.score);
    }
  }

  const result: Record<number, { avg: number; count: number }> = {};
  for (const [diff, scores] of Object.entries(groups)) {
    const d = Number(diff);
    if (scores.length > 0) {
      result[d] = {
        avg: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
        count: scores.length,
      };
    }
  }
  return result;
}
```

### Example 2: Difficulty Recommendation Logic

```typescript
// Recommend difficulty based on performance thresholds
function recommendDifficulty(
  avgByDifficulty: Record<number, { avg: number; count: number }>,
): number | null {
  // Need at least 3 attempts at a difficulty to recommend
  const MIN_ATTEMPTS = 3;
  const PROMOTE_THRESHOLD = 70;  // avg >= 70 -> try harder
  const DEMOTE_THRESHOLD = 40;   // avg < 40 -> try easier

  // Check from hardest to easiest
  for (const diff of [3, 2, 1] as const) {
    const stats = avgByDifficulty[diff];
    if (stats && stats.count >= MIN_ATTEMPTS) {
      if (diff < 3 && stats.avg >= PROMOTE_THRESHOLD) {
        return diff + 1; // Promote
      }
      if (diff > 1 && stats.avg < DEMOTE_THRESHOLD) {
        return diff - 1; // Demote
      }
      return diff; // Stay
    }
  }

  // Not enough data -- no recommendation
  return null;
}
```

### Example 3: Track Summary Stats from Existing useTrackProgress Data

```typescript
// Compute track summary from already-fetched LevelWithProgress[]
function computeTrackSummary(levels: LevelWithProgress[]): {
  levelsCompleted: number;
  totalLevels: number;
  avgScore: number;
  bestScore: number;
} {
  const completed = levels.filter((l) => l.status === 'completed');
  const withScores = levels.filter((l) => l.bestScore > 0);

  return {
    levelsCompleted: completed.length,
    totalLevels: levels.length,
    avgScore: withScores.length > 0
      ? Math.round(withScores.reduce((s, l) => s + l.bestScore, 0) / withScores.length)
      : 0,
    bestScore: withScores.length > 0
      ? Math.max(...withScores.map((l) => l.bestScore))
      : 0,
  };
}
```

### Example 4: Unseen Scenario Count (TRAIN-V11-04)

```typescript
// Query scenarios_seen for current user and compute remaining count
export function useScenarioVariety() {
  const telegramId = useAuthStore((s) => s.telegramId);
  const { data: pool } = useScenarioPool(); // All scenarios (Random mode)

  return useQuery({
    queryKey: queryKeys.scenarios.seen(telegramId!),
    queryFn: async () => {
      const { data, error } = await getInsforge()
        .database.from('scenarios_seen')
        .select('scenario_id')
        .eq('telegram_id', telegramId!);

      if (error) throw error;
      const seenIds = new Set((data ?? []).map((r: any) => r.scenario_id));
      const totalPool = pool?.length ?? 0;
      const unseenCount = totalPool - seenIds.size;

      return {
        seenCount: seenIds.size,
        unseenCount: Math.max(0, unseenCount),
        totalPool,
        isRunningLow: unseenCount <= 3 && totalPool > 0,
      };
    },
    enabled: !!telegramId && !!pool,
    refetchOnWindowFocus: true,
  });
}
```

### Example 5: Dashboard Weak Areas with "Practice This" CTA

```typescript
// User-specific weak areas component with navigation
function WeakAreasCard({ weakAreas }: { weakAreas: WeakArea[] }) {
  const navigate = useNavigate();

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-text">Areas to Improve</h3>
      {weakAreas.map((area) => (
        <div key={area.key} className="flex items-center gap-2 py-2">
          <span className="flex-1 text-sm text-text">{area.label}</span>
          <span className={cn('text-sm font-semibold', getScoreColor(area.avgScore))}>
            {area.avgScore}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(area.practiceLink)}
          >
            Practice
          </Button>
        </div>
      ))}
    </Card>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side aggregation | Client-side stats from cached queries | Project convention | All stats computed in TMA from raw data (decision [02-02]) |
| Bot-only training metrics | TMA visual training analytics | Phase 9 | Users see recommendations + progress visually |

**No deprecated/outdated items** -- this phase uses only existing patterns established in Phases 2-3.

## Open Questions

1. **Minimum attempts threshold for recommendation**
   - What we know: Need some minimum before recommending. 3 attempts seems reasonable.
   - What's unclear: Is 3 too few? Should it be 5?
   - Recommendation: Start with 3. It's a constant, easily adjustable. The recommendation should show "Not enough data" below the threshold.

2. **Weak area grouping granularity**
   - What we know: Admin WeakAreas groups by scenario_id. For users, grouping by category (e.g., "corporate_objection", "founder_pricing") is more actionable.
   - What's unclear: Should we also show weak difficulty levels alongside weak categories?
   - Recommendation: Group by category for Dashboard display (maps to recognizable skill areas). The "Practice this" CTA navigates to /train, optionally pre-filtered.

3. **"Practice this" navigation target**
   - What we know: Deep linking into the bot for actual response submission works (established in Phase 3).
   - What's unclear: Should "Practice this" navigate to /train page with pre-selected difficulty, or deep link to the bot?
   - Recommendation: Navigate to /train page with pre-selected difficulty (stay in TMA). The user then starts training from there. No need to deep link for discovery -- deep links are for response submission.

4. **Scenario variety: what counts as "running low"?**
   - What we know: Bot shows "{unseen}/{total}" already. TMA needs to show the same + a nudge.
   - What's unclear: What threshold is "running low"? 3? 5? 10% of pool?
   - Recommendation: Threshold of 3 unseen scenarios triggers the nudge. With a pool of 20 static scenarios, this means 85%+ coverage. Nudge message: "Only X scenarios left! Great variety -- keep exploring."

## Sources

### Primary (HIGH confidence)

- **Codebase analysis** -- Direct inspection of 25+ source files across the TMA and bot
  - `packages/webapp/src/pages/Train.tsx` -- current Train page step machine
  - `packages/webapp/src/features/train/hooks/useScenarioPool.ts` -- scenario pool loading
  - `packages/webapp/src/features/train/data/scenarios.ts` -- static TRAIN_POOL (20 scenarios)
  - `packages/webapp/src/features/learn/hooks/useTrackProgress.ts` -- track progress fetching
  - `packages/webapp/src/features/learn/data/tracks.ts` -- static TRACKS with 1 track, 4 levels
  - `packages/webapp/src/features/profile/hooks/useUserStats.ts` -- established stats aggregation pattern
  - `packages/webapp/src/features/admin/hooks/useWeakAreas.ts` -- established weak areas pattern
  - `packages/webapp/src/features/dashboard/components/QuickActions.tsx` -- dashboard layout
  - `packages/webapp/src/types/tables.ts` -- AttemptRow (no difficulty column confirmed)
  - `bot/handlers/train.py` -- bot's scenario selection + seen tracking logic
  - `bot/storage/repositories.py` -- ScenariosSeenRepo, AttemptRepo, GeneratedScenarioRepo

### Secondary (MEDIUM confidence)

- **Prior phase decisions** -- STATE.md documents relevant architectural decisions:
  - [02-02]: Client-side stats aggregation from last 100 attempts
  - [03-01]: Static TRACKS constant compiled into bundle
  - [03-03]: refetchOnWindowFocus: true for auto-refresh patterns
  - [03-03]: parseFeedback() with typeof guards pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new libraries, uses existing project patterns
- Architecture: HIGH -- Follows established hook/component patterns from Phases 2-6
- Pitfalls: HIGH -- All identified from direct codebase inspection (schema verified, data flow traced)

**Research date:** 2026-02-04
**Valid until:** 2026-03-04 (stable -- no external dependencies to go stale)
