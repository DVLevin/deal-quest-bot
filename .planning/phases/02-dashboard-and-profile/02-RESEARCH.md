# Phase 2: Dashboard & Profile - Research

**Researched:** 2026-02-03
**Domain:** React data fetching, InsForge PostgREST queries, gamification UI components, TanStack Query patterns
**Confidence:** HIGH

## Summary

Phase 2 builds the first two real data-driven pages in the TMA: the Dashboard (DASH-01 through DASH-04) and the Profile page (PROF-01 through PROF-04). These pages prove the complete data pipeline from InsForge database through the authenticated JS SDK, through TanStack Query hooks, into rendered React components using the Phase 1 design system.

The core technical domain is **data fetching and display**. The InsForge SDK wraps `@supabase/postgrest-js` under the hood, giving us the full Supabase query builder API (`.from().select().eq().order().limit().range()`). TanStack Query (already configured with a QueryProvider from Phase 1) handles caching, loading states, and error handling. The UI uses the existing Card, Badge, Button, and Skeleton components from the Phase 1 design system, plus new purpose-built components like ProgressBar, LeaderboardWidget, and BadgeGrid.

Key findings: (1) The InsForge SDK's `Database.from()` returns a `PostgrestQueryBuilder` from `@supabase/postgrest-js`, so all Supabase PostgREST patterns apply directly. (2) There is **no badges table** in the current InsForge database -- the exploration doc proposed `badges` and `user_badges` tables, but they were never created. Badge data must be handled client-side with a static badge definitions constant until the tables exist. (3) The leaderboard requires querying all users ordered by XP, which needs an RLS policy allowing authenticated users to read other users' public fields. (4) The bot's scoring system uses a different XP-to-level formula (`level * 200`) than the shared constants (`XP_PER_LEVEL` array with 0, 100, 300, 600, 1000...) -- the TMA should use the shared constants and accept that levels may display differently than the bot until alignment.

**Primary recommendation:** Use custom React Query hooks (one per data concern) wrapping InsForge PostgREST queries, build a thin feature-based folder structure (`features/dashboard/`, `features/profile/`), and handle missing badges tables with client-side static definitions.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed in Phase 1)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | ^5.90.x | Server state management, caching, loading/error states | Already configured in Phase 1 QueryProvider |
| @insforge/sdk | 1.1.5 | Database queries via PostgREST (wraps @supabase/postgrest-js) | Already installed and configured with auth |
| zustand | ^5.0.x | Client state (auth store, UI state) | Already used for auth store |
| react-router | ^7.12.x | Page routing, navigation | Already configured with lazy loading |
| lucide-react | ^0.562.x | Icons for dashboard widgets, navigation, badges | Already installed |
| class-variance-authority | ^0.7.x | Component variants for new widgets | Already installed |
| clsx + tailwind-merge | ^2.x / ^3.x | Class merging via cn() utility | Already installed |

### Supporting (No New Dependencies Needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @deal-quest/shared | workspace:* | UserRow, AttemptRow types, RANK_TITLES, XP_PER_LEVEL constants | All data display, type-safe queries |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom ProgressBar | react-step-progress-bar | Extra dependency for a simple div+width% component -- not worth it |
| Chart.js for activity | Micro-visualization divs | REQUIREMENTS.md explicitly excludes heavy charting (out of scope) |
| SWR for data fetching | TanStack Query | Already installed and configured; switching would be pointless |

**Installation:** No new packages needed. Phase 1 installed everything required.

## Architecture Patterns

### Recommended Project Structure
```
packages/webapp/src/
├── features/
│   ├── auth/               # Existing from Phase 1
│   │   ├── store.ts
│   │   └── useAuth.ts
│   ├── dashboard/           # NEW: Dashboard feature
│   │   ├── hooks/
│   │   │   ├── useUserProgress.ts    # User XP, level, rank, streak
│   │   │   ├── useRecentBadges.ts    # Last 4 earned badges (client-side)
│   │   │   └── useLeaderboard.ts     # Top 5 users + current position
│   │   └── components/
│   │       ├── ProgressCard.tsx       # XP bar + level + rank + streak
│   │       ├── BadgePreview.tsx       # Recent 4 badges
│   │       ├── LeaderboardWidget.tsx  # Top 5 leaderboard
│   │       └── QuickActions.tsx       # Navigation buttons
│   └── profile/             # NEW: Profile feature
│       ├── hooks/
│       │   ├── useUserProfile.ts     # Full user data
│       │   ├── useUserStats.ts       # Aggregate stats from attempts
│       │   ├── useAttemptHistory.ts   # Paginated attempt list
│       │   └── useUserBadges.ts      # Badge collection (client-side)
│       └── components/
│           ├── ProfileHeader.tsx      # Avatar, username, rank, level, XP
│           ├── StatsOverview.tsx      # Total attempts, avg score, best score
│           ├── AttemptHistory.tsx     # Paginated list
│           └── BadgeCollection.tsx    # Full badge grid with earned/total
├── shared/
│   ├── ui/                  # Existing from Phase 1
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Skeleton.tsx
│   │   ├── NavBar.tsx
│   │   ├── ProgressBar.tsx  # NEW: Reusable XP/progress bar
│   │   ├── Avatar.tsx       # NEW: User avatar with fallback
│   │   └── index.ts         # Updated barrel export
│   ├── hooks/               # Existing hooks from Phase 1
│   └── lib/
│       └── cn.ts            # Existing
├── pages/
│   ├── Dashboard.tsx        # Existing stub -> REPLACED with real page
│   └── Profile.tsx          # Existing stub -> REPLACED with real page
└── lib/
    ├── insforge.ts          # Existing from Phase 1
    └── queries.ts           # NEW: Shared query key factory + helper functions
```

### Pattern 1: Query Key Factory
**What:** Centralized query key definitions prevent key collisions and enable targeted invalidation.
**When to use:** Every TanStack Query hook should use keys from this factory.
**Example:**
```typescript
// Source: TanStack Query official docs pattern
// lib/queries.ts
export const queryKeys = {
  users: {
    all: ['users'] as const,
    detail: (telegramId: number) => ['users', telegramId] as const,
    leaderboard: ['users', 'leaderboard'] as const,
  },
  attempts: {
    all: ['attempts'] as const,
    byUser: (telegramId: number) => ['attempts', telegramId] as const,
    history: (telegramId: number, page: number) =>
      ['attempts', telegramId, 'history', page] as const,
    stats: (telegramId: number) => ['attempts', telegramId, 'stats'] as const,
  },
  badges: {
    all: ['badges'] as const,
    byUser: (telegramId: number) => ['badges', telegramId] as const,
  },
} as const;
```

### Pattern 2: Custom Query Hook per Data Concern
**What:** Each data need gets its own hook wrapping `useQuery` + InsForge query.
**When to use:** Every feature component that needs data.
**Example:**
```typescript
// Source: InsForge SDK @supabase/postgrest-js API + TanStack Query pattern
// features/dashboard/hooks/useUserProgress.ts
import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { useAuthStore } from '@/features/auth/store';
import { queryKeys } from '@/lib/queries';
import type { UserRow } from '@deal-quest/shared';

export function useUserProgress() {
  const telegramId = useAuthStore((s) => s.telegramId);

  return useQuery({
    queryKey: queryKeys.users.detail(telegramId!),
    queryFn: async () => {
      const { data, error } = await getInsforge()
        .database.from('users')
        .select('id, telegram_id, username, first_name, total_xp, current_level, streak_days, last_active_at, created_at')
        .eq('telegram_id', telegramId!)
        .single();

      if (error) throw error;
      return data as UserRow;
    },
    enabled: !!telegramId,
  });
}
```

### Pattern 3: InsForge PostgREST Query Builder
**What:** The InsForge SDK's `database.from()` returns a `PostgrestQueryBuilder` from `@supabase/postgrest-js`. All Supabase query patterns work.
**When to use:** All database queries.
**Key operations available:**
```typescript
// Source: @insforge/sdk type definitions (verified from node_modules)
const client = getInsforge();

// SELECT with filters
const { data, error } = await client.database
  .from('users')
  .select('id, username, total_xp')
  .eq('telegram_id', 12345)
  .single();

// SELECT with ordering and limit
const { data, error } = await client.database
  .from('users')
  .select('id, username, first_name, total_xp, current_level')
  .order('total_xp', { ascending: false })
  .limit(5);

// SELECT with count
const { data, error, count } = await client.database
  .from('attempts')
  .select('*', { count: 'exact' })
  .eq('telegram_id', 12345);

// SELECT with range pagination
const { data, error } = await client.database
  .from('attempts')
  .select('*')
  .eq('telegram_id', 12345)
  .order('created_at', { ascending: false })
  .range(0, 9); // first 10 rows

// RPC (PostgreSQL function call)
const { data, error } = await client.database
  .rpc('get_user_stats', { user_id: 123 });
```

### Pattern 4: Paginated Query Hook
**What:** Use `range()` for offset-based pagination of attempt history.
**When to use:** PROF-03 attempt history (paginated list).
**Example:**
```typescript
// features/profile/hooks/useAttemptHistory.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { useAuthStore } from '@/features/auth/store';
import { queryKeys } from '@/lib/queries';

const PAGE_SIZE = 10;

export function useAttemptHistory(page: number) {
  const telegramId = useAuthStore((s) => s.telegramId);
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  return useQuery({
    queryKey: queryKeys.attempts.history(telegramId!, page),
    queryFn: async () => {
      const { data, error, count } = await getInsforge()
        .database.from('attempts')
        .select('id, scenario_id, mode, score, xp_earned, created_at', { count: 'exact' })
        .eq('telegram_id', telegramId!)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return {
        attempts: data ?? [],
        total: count ?? 0,
        hasMore: (count ?? 0) > to + 1,
      };
    },
    enabled: !!telegramId,
    placeholderData: keepPreviousData,  // Keep previous page visible while loading next
  });
}
```

### Anti-Patterns to Avoid
- **Fetching inside components directly:** Always use `useQuery` hooks, never `useEffect` + `setState` for data fetching. TanStack Query handles caching, deduplication, and loading states.
- **Storing server data in Zustand:** Server state belongs in TanStack Query cache. Zustand is for client-only state (auth tokens, UI toggles). Do NOT duplicate user data in a Zustand store.
- **Fetching all data in a parent and prop-drilling:** Each feature component should use its own query hook. TanStack Query deduplicates identical queries automatically.
- **Using `.single()` without `.eq()` filter:** PostgREST's `single()` requires exactly one row. Without a filter, it will error on multi-row tables.
- **Querying without `enabled: !!telegramId`:** The auth flow is async. Queries that depend on auth data must be gated with `enabled`.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Loading states for data | Custom isLoading booleans with useState | `useQuery` return values (`isLoading`, `isPending`, `isError`) | TanStack Query handles all loading/error/stale states automatically |
| Caching user data | localStorage cache or Zustand store | TanStack Query cache with 5min staleTime (already configured) | Deduplication, background refresh, garbage collection built in |
| Pagination state | Custom useState for page/offset | `useQuery` with `keepPreviousData` + page state | Smooth transitions between pages, automatic refetch |
| XP progress calculation | Manual math in components | `getXPForNextLevel()` and `getRankTitle()` from `@deal-quest/shared/constants` | Already implemented and shared with potential backend use |
| Avatar fallback | Custom image error handling | Avatar component with initials fallback | Telegram avatars may not be available; always need a fallback |
| Class merging | String concatenation | `cn()` from `@/shared/lib/cn` | Handles Tailwind class conflicts correctly via tailwind-merge |

**Key insight:** This phase is almost entirely about wiring existing pieces together. The InsForge SDK, TanStack Query, design system components, and shared types are all in place from Phase 1. The work is creating hooks + feature components + connecting them to page stubs.

## Common Pitfalls

### Pitfall 1: No Badges Table in Database
**What goes wrong:** The requirements (DASH-02, PROF-04) specify badge display, but there is no `badges` or `user_badges` table in the InsForge database. The exploration doc proposed these tables but they were never created.
**Why it happens:** The badge system was part of the gamification design doc but is scheduled for Phase 6 (GAME-01 through GAME-05). Phase 2 only needs to display badges, not implement the full system.
**How to avoid:** Define badge data as static client-side constants (badge name, icon, criteria, rarity). For "earned badges," derive them from existing data: check user XP thresholds, attempt counts, streak days, etc. against badge criteria. No database query needed.
**Warning signs:** Any plan that includes "CREATE TABLE badges" is scope-creeping into Phase 6.

### Pitfall 2: Leaderboard RLS Policy Gap
**What goes wrong:** The leaderboard (DASH-03) needs to query other users' public data (username, XP, level). The Phase 1 RLS policies scope `users` table reads to the authenticated user's own telegram_id only (`users_select_own`).
**Why it happens:** RLS was designed for data isolation. Leaderboard is a cross-user read.
**How to avoid:** Two approaches:
1. **Preferred:** The Phase 1 RLS migration already includes `users_select_leaderboard` policy for the `anon` role that allows reading all users. The authenticated role also has `users_select_own`. Since the InsForge client uses `setAuthToken()` (authenticated role), we need to add a new policy: `users_select_public` on users FOR SELECT TO authenticated USING (true) -- but select only safe columns. OR use the `anon` client for the leaderboard query only.
2. **Alternative:** Create a PostgreSQL function (RPC) `get_leaderboard(limit_count int)` that returns only safe fields and is callable by authenticated users.
**Warning signs:** Leaderboard query returning only the current user's row, or returning a permissions error.

### Pitfall 3: XP-to-Level Formula Mismatch
**What goes wrong:** The bot's Python scoring uses `level * 200` XP per level (linear scaling), but the shared constants use a stepped array: [0, 100, 300, 600, 1000, 1500, 2200, 3000]. The bot also has 10 rank titles while shared constants have 8.
**Why it happens:** The shared constants were designed for the TMA in Phase 1 based on the exploration doc. The bot's scoring service was written earlier with a simpler formula.
**How to avoid:** Use the shared `@deal-quest/shared` constants (`XP_PER_LEVEL`, `RANK_TITLES`, `getRankTitle()`, `getXPForNextLevel()`) for the TMA. Accept that the TMA may show a different level/rank than the bot for the same XP value until the bot is updated to match. Document this as a known discrepancy in the plan.
**Warning signs:** User sees "Level 5, Expert" in the bot but "Level 3, Associate" in the TMA for the same XP.

### Pitfall 4: Empty Data States
**What goes wrong:** New users or users who haven't trained yet will have 0 attempts, 0 XP, 0 badges. The UI looks broken with empty lists and zero values.
**Why it happens:** Developers test with populated data and forget the empty state.
**How to avoid:** Design every component with an explicit empty state: "No badges earned yet - start training!", "Complete your first scenario to appear on the leaderboard", etc. Use Skeleton components for loading, and meaningful messages for empty data.
**Warning signs:** Components showing "undefined", "NaN", or blank white space when data is missing.

### Pitfall 5: Aggregate Stats Without a Dedicated Query
**What goes wrong:** Computing "total attempts, average score, best score" (PROF-02) by fetching ALL attempt rows and computing client-side is slow and wasteful.
**Why it happens:** The PostgREST API doesn't have built-in aggregation. Developers reach for "fetch all, compute in JS."
**How to avoid:** Two strategies:
1. **Count with select:** Use `{ count: 'exact', head: true }` for total count without fetching data.
2. **RPC function:** Create a `get_user_stats(tg_id bigint)` PostgreSQL function that returns aggregated stats server-side. This is the best approach but requires a migration.
3. **Pragmatic fallback:** Fetch the last 50-100 attempts and compute stats client-side. For most users this is the full dataset anyway (low volume app).
**Warning signs:** Fetching thousands of rows just to count them.

### Pitfall 6: Profile Navigation Not in NavBar
**What goes wrong:** The NavBar has 5 items (Dashboard, Learn, Train, Support, Leads) but NOT Profile. Users need a way to reach the Profile page.
**Why it happens:** Phase 1 design decision to keep NavBar to 5 items. Profile is accessible via other routes.
**How to avoid:** Add a profile link/button to the Dashboard page (e.g., tap on avatar/username in the progress card navigates to /profile). The Dashboard is the entry point, and the profile link there is the primary discovery path.
**Warning signs:** Users have no way to reach the Profile page.

## Code Examples

Verified patterns from official sources:

### InsForge Query: Fetch User by telegram_id
```typescript
// Source: InsForge SDK type definitions (Database.from returns PostgrestQueryBuilder)
import { getInsforge } from '@/lib/insforge';
import type { UserRow } from '@deal-quest/shared';

async function fetchUser(telegramId: number): Promise<UserRow> {
  const { data, error } = await getInsforge()
    .database.from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (error) throw new Error(`Failed to fetch user: ${JSON.stringify(error)}`);
  return data as UserRow;
}
```

### InsForge Query: Leaderboard (Top N Users by XP)
```typescript
// Source: InsForge SDK PostgREST query builder
async function fetchLeaderboard(limit = 5) {
  const { data, error } = await getInsforge()
    .database.from('users')
    .select('id, telegram_id, username, first_name, total_xp, current_level')
    .order('total_xp', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch leaderboard: ${JSON.stringify(error)}`);
  return data ?? [];
}
```

### TanStack Query: Hook with Auth Gating
```typescript
// Source: TanStack Query docs + InsForge SDK
import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { useAuthStore } from '@/features/auth/store';
import { queryKeys } from '@/lib/queries';

export function useLeaderboard() {
  const telegramId = useAuthStore((s) => s.telegramId);

  return useQuery({
    queryKey: queryKeys.users.leaderboard,
    queryFn: async () => {
      const { data, error } = await getInsforge()
        .database.from('users')
        .select('id, telegram_id, username, first_name, total_xp, current_level')
        .order('total_xp', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Find current user's position
      const allUsers = data ?? [];
      const myIndex = allUsers.findIndex((u: any) => u.telegram_id === telegramId);

      return {
        top5: allUsers.slice(0, 5),
        myPosition: myIndex >= 0 ? myIndex + 1 : null,
        myEntry: myIndex >= 0 ? allUsers[myIndex] : null,
      };
    },
    enabled: !!telegramId,
    staleTime: 2 * 60_000, // 2 minutes for leaderboard (changes more frequently)
  });
}
```

### ProgressBar Component
```typescript
// Custom component -- no external library needed
import { cn } from '@/shared/lib/cn';

interface ProgressBarProps {
  current: number;
  max: number;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({
  current,
  max,
  className,
  showLabel = true,
  size = 'md',
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'w-full rounded-full bg-surface-secondary overflow-hidden',
          heights[size],
        )}
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn(
            'h-full rounded-full bg-accent transition-[width] duration-500 ease-out',
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-xs text-text-hint">
          {current.toLocaleString()} / {max.toLocaleString()} XP
        </p>
      )}
    </div>
  );
}
```

### Static Badge Definitions (Client-Side)
```typescript
// packages/shared/src/badges.ts (or features/dashboard/data/badges.ts)
// Static badge definitions until badges table is created in Phase 6

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;      // lucide icon name or emoji
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  criteria: BadgeCriteria;
}

export type BadgeCriteria =
  | { type: 'xp_threshold'; threshold: number }
  | { type: 'streak_days'; days: number }
  | { type: 'attempt_count'; count: number }
  | { type: 'perfect_score' }
  | { type: 'first_attempt' };

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first-win',
    name: 'First Win',
    description: 'Complete your first scenario',
    icon: 'trophy',
    rarity: 'common',
    criteria: { type: 'first_attempt' },
  },
  {
    id: 'on-fire',
    name: 'On Fire',
    description: '3-day streak',
    icon: 'flame',
    rarity: 'common',
    criteria: { type: 'streak_days', days: 3 },
  },
  {
    id: 'perfect-score',
    name: 'Perfect Score',
    description: 'Score 100/100 on a scenario',
    icon: 'star',
    rarity: 'rare',
    criteria: { type: 'perfect_score' },
  },
  {
    id: 'dedicated',
    name: 'Dedicated',
    description: 'Complete 10 scenarios',
    icon: 'target',
    rarity: 'common',
    criteria: { type: 'attempt_count', count: 10 },
  },
  {
    id: 'xp-hunter',
    name: 'XP Hunter',
    description: 'Earn 1000 XP',
    icon: 'zap',
    rarity: 'rare',
    criteria: { type: 'xp_threshold', threshold: 1000 },
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Complete 50 scenarios',
    icon: 'shield',
    rarity: 'epic',
    criteria: { type: 'attempt_count', count: 50 },
  },
  {
    id: 'streak-master',
    name: 'Streak Master',
    description: '7-day streak',
    icon: 'flame',
    rarity: 'rare',
    criteria: { type: 'streak_days', days: 7 },
  },
  {
    id: 'legend',
    name: 'Legend',
    description: 'Earn 3000 XP',
    icon: 'gem',
    rarity: 'legendary',
    criteria: { type: 'xp_threshold', threshold: 3000 },
  },
];
```

### Evaluating Earned Badges Client-Side
```typescript
// features/dashboard/hooks/useRecentBadges.ts
import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { useAuthStore } from '@/features/auth/store';
import { BADGE_DEFINITIONS, type BadgeDefinition } from './badges';
import type { UserRow, AttemptRow } from '@deal-quest/shared';

interface EarnedBadge extends BadgeDefinition {
  earnedAt: string | null; // approximate date
}

function evaluateBadges(user: UserRow, attempts: AttemptRow[]): EarnedBadge[] {
  const earned: EarnedBadge[] = [];

  for (const badge of BADGE_DEFINITIONS) {
    let isEarned = false;

    switch (badge.criteria.type) {
      case 'xp_threshold':
        isEarned = user.total_xp >= badge.criteria.threshold;
        break;
      case 'streak_days':
        isEarned = user.streak_days >= badge.criteria.days;
        break;
      case 'attempt_count':
        isEarned = attempts.length >= badge.criteria.count;
        break;
      case 'perfect_score':
        isEarned = attempts.some((a) => a.score === 100);
        break;
      case 'first_attempt':
        isEarned = attempts.length > 0;
        break;
    }

    if (isEarned) {
      earned.push({ ...badge, earnedAt: null }); // No exact date without badges table
    }
  }

  return earned;
}
```

### Avatar Component with Fallback
```typescript
// shared/ui/Avatar.tsx
import { cn } from '@/shared/lib/cn';

interface AvatarProps {
  username?: string | null;
  firstName?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-lg',
};

export function Avatar({ username, firstName, size = 'md', className }: AvatarProps) {
  const initials = (firstName?.[0] || username?.[0] || '?').toUpperCase();

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold',
        sizes[size],
        className,
      )}
    >
      {initials}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| useEffect + fetch + useState | TanStack Query useQuery | Standard since React Query v3 (2021) | Automatic caching, deduplication, retry, loading states |
| Supabase JS client direct | InsForge SDK wrapping @supabase/postgrest-js | InsForge SDK v1.1.5 | Same query API as Supabase, full PostgREST compatibility |
| react-router-dom v6 | react-router v7 (unified package) | 2025 | No separate dom package, same API |
| Tailwind v3 config file | Tailwind v4 @theme CSS directive | Phase 1 decision | CSS-first, no tailwind.config.js |

**Deprecated/outdated:**
- `fetchStatus` and `status` changes in TanStack Query v5: `isLoading` now means "first load with no data." Use `isPending` for "query is running" regardless of cache.

## Open Questions

Things that couldn't be fully resolved:

1. **Leaderboard RLS Policy**
   - What we know: The Phase 1 migration includes `users_select_leaderboard` for the `anon` role. The authenticated role has `users_select_own` which restricts to own row only.
   - What's unclear: Whether the authenticated client can query other users' public fields. The `anon` client could be used as a fallback for leaderboard queries, but it requires sending the anonKey (which has full access due to `anon_full_users` policy).
   - Recommendation: Test the authenticated client first. If it only returns the current user's row, add a new RLS policy `users_select_public` for authenticated role: `USING (true)` but only expose safe fields via the SELECT clause in the query. The RLS policy applies to row access, not column access -- column restriction is handled by the `.select()` columns. Since the `anon_full_users` policy already grants full access to anon, adding a broader SELECT policy for authenticated is not a security regression.

2. **Aggregate Stats Without Server-Side Function**
   - What we know: PostgREST doesn't support SQL aggregations (AVG, MAX, COUNT) in REST queries. You can get `count` via `{ count: 'exact' }` option, but not AVG or MAX.
   - What's unclear: Whether InsForge supports PostgreSQL RPC functions.
   - Recommendation: For Phase 2, fetch the last 100 attempts and compute stats client-side. This is adequate for the current user base. If needed later, create a `get_user_stats` RPC function.

3. **Bot Level System Mismatch**
   - What we know: Bot uses `level * 200` XP formula and 10 rank titles. TMA shared constants use stepped thresholds and 8 rank titles.
   - What's unclear: Which system is "correct" or if they should be aligned.
   - Recommendation: TMA uses shared constants as source of truth. Document the discrepancy. Alignment can happen when the bot integrates TMA constants (Phase 7).

4. **Badge Table Creation Timing**
   - What we know: Phase 6 handles GAME-01 through GAME-05 (badge wall, rarity tiers, etc.). Phase 2 needs badge display (DASH-02, PROF-04).
   - What's unclear: Should we create `badges` and `user_badges` tables now in Phase 2, or derive badges client-side?
   - Recommendation: Client-side badge evaluation using static definitions. This avoids scope creep into Phase 6 and works without any database changes. When Phase 6 creates the tables, the hooks can be updated to query the database instead.

## Sources

### Primary (HIGH confidence)
- InsForge SDK type definitions (`@insforge/sdk@1.1.5` node_modules/dist/index.d.ts) -- Database class wraps `@supabase/postgrest-js`, full PostgREST query builder API
- Phase 1 summaries (01-01, 01-02, 01-03, 01-04) -- existing code patterns, design decisions, auth flow
- Existing source code in `packages/webapp/src/` -- actual implementations of auth store, InsForge client, design system components
- `@deal-quest/shared` package -- table types (UserRow, AttemptRow), constants (XP_PER_LEVEL, RANK_TITLES), enums

### Secondary (MEDIUM confidence)
- [TanStack Query official docs](https://tanstack.com/query/latest/docs/framework/react/overview) -- query patterns, useQuery API, keepPreviousData
- [TanStack Query reusable patterns](https://spin.atomicobject.com/tanstack-query-reusable-patterns/) -- query key factory pattern
- Bot source code (`bot/handlers/stats.py`, `bot/services/scoring.py`, `bot/services/analytics.py`) -- existing data queries and stats calculation

### Tertiary (LOW confidence)
- Exploration doc (`docs/tma/idea_2_explore`) -- proposed badge tables and wireframes (may not reflect final implementation)
- Bot scoring formula (`level * 200`) -- may need alignment with TMA constants

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and verified in Phase 1, no new dependencies
- Architecture: HIGH - Feature-based folder structure follows Phase 1 patterns, InsForge SDK API verified from type definitions
- Pitfalls: HIGH - Identified from reading actual code (no badges table, RLS policy gap, XP formula mismatch, empty states)
- Code examples: HIGH - Based on verified InsForge SDK PostgREST API and existing auth flow patterns

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (30 days -- stable domain, no library changes expected)
