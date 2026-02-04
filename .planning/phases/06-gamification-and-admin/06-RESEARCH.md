# Phase 6: Gamification & Admin - Research

**Researched:** 2026-02-04
**Domain:** React animations (confetti, counters), badge UI systems, admin dashboards, access control
**Confidence:** HIGH

## Summary

Phase 6 has two distinct domains: (1) gamification visuals -- enhancing the existing badge wall, adding confetti celebrations, XP animations, and streak indicators; and (2) an admin dashboard -- team overview stats, performance charts, leaderboard, weak area identification, activity feed, and access control. Both domains build heavily on existing codebase infrastructure.

The gamification side is well-positioned because the codebase already has: static badge definitions with rarity tiers (`badges.ts`), `evaluateBadges()` logic, `BadgeCollection` and `BadgePreview` components, CSS `@property --score-value` integer counter animation, SVG circular score display (`ScoreDisplay.tsx`), and the full XP/level/rank system with 10 levels. The main work is upgrading the existing badge grid to a dedicated "badge wall" with enhanced rarity styling, adding a confetti overlay for level-up events, enhancing the XP counter with animation, and adding streak visual indicators.

The admin side requires building a new feature module. The bot already has extensive admin analytics (`bot/handlers/admin.py`, `bot/services/analytics.py`) that query all users and attempts directly. The TMA needs to replicate this using InsForge PostgREST queries from the browser. The key challenge is access control: the bot uses `ADMIN_USERNAMES` from environment config, but the TMA needs a client-side mechanism. The simplest approach is adding `VITE_ADMIN_USERNAMES` as an environment variable or querying the users table for the current user's username and checking against a known list. Since the auth store already has `telegramId`, we need to fetch the username and check it.

**Primary recommendation:** Use `canvas-confetti` (zero-dependency, ~5.5kB gzipped) for level-up celebrations, extend existing CSS `@property` animation patterns for XP counters, build SVG micro-charts for admin performance data (consistent with project's no-heavy-charting stance), and implement admin access control via a `VITE_ADMIN_USERNAMES` env var checked client-side (matching the bot's pattern).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| canvas-confetti | ^1.9.4 | Level-up confetti animation | Zero dependencies, ~5.5kB gzipped, performant canvas-based, supports web workers, respects reduced motion preference |
| lucide-react | ^0.562.0 (existing) | Badge icons and flame/streak icons | Already installed and used throughout for all icons |
| @tanstack/react-query | ^5.90.0 (existing) | Admin data fetching with caching | Already installed, all hooks follow this pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS @property (built-in) | N/A | XP counter integer animation | Extending existing `--score-value` pattern from globals.css |
| SVG (hand-coded) | N/A | Admin performance micro-charts | Simple bar/sparkline charts for weekly trends. No charting library needed. |
| Tailwind CSS 4 (existing) | ^4.1.0 | Rarity tier styling and animations | Already installed with oklch rarity tokens defined |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| canvas-confetti | react-confetti-explosion (CSS-only) | CSS-only is lighter but no web worker support, no reduced motion, fewer customization options. canvas-confetti is still tiny at ~5.5kB gzipped and the project explicitly favors performance. |
| canvas-confetti | Pure CSS confetti (hand-rolled) | Looks fine but requires maintaining 50+ keyframe rules. Library is more maintainable and battle-tested. |
| SVG micro-charts | Recharts | Recharts adds ~45kB gzipped. PROJECT.md explicitly excludes heavy charting. Admin needs just 1-2 simple charts (weekly bar chart). SVG bars are trivial to build with Tailwind. |
| VITE_ADMIN_USERNAMES env var | Database `is_admin` column | Database column exists on users table schema but is not populated by the bot. The bot uses env-based ADMIN_USERNAMES, so the TMA should match. Adding a DB column is a Phase 7+ concern. |

**Installation:**
```bash
cd packages/webapp && pnpm add canvas-confetti && pnpm add -D @types/canvas-confetti
```

## Architecture Patterns

### Recommended Project Structure
```
src/features/
├── gamification/              # NEW -- confetti, level-up, streak
│   ├── components/
│   │   ├── BadgeWall.tsx      # Full badge wall (GAME-01, GAME-02)
│   │   ├── BadgeCard.tsx      # Single badge with rarity styling
│   │   ├── ConfettiOverlay.tsx # Level-up celebration (GAME-03)
│   │   ├── XPGainAnimation.tsx # Animated XP counter (GAME-04)
│   │   └── StreakIndicator.tsx # Flame + streak days (GAME-05)
│   ├── hooks/
│   │   ├── useLevelUpDetection.ts  # Detects level change
│   │   └── useStreakBonus.ts       # Streak bonus calculation
│   └── lib/
│       └── confetti.ts        # canvas-confetti configuration presets
├── admin/                     # NEW -- team dashboard
│   ├── components/
│   │   ├── TeamOverview.tsx   # Stats cards (ADMIN-01)
│   │   ├── PerformanceChart.tsx # SVG bar chart (ADMIN-02)
│   │   ├── MemberLeaderboard.tsx # Full team ranking (ADMIN-03)
│   │   ├── WeakAreas.tsx      # Lowest-scoring categories (ADMIN-04)
│   │   └── ActivityFeed.tsx   # Recent activity list (ADMIN-05)
│   ├── hooks/
│   │   ├── useTeamStats.ts    # Aggregate team data
│   │   ├── useTeamLeaderboard.ts # All members ranked
│   │   ├── useWeakAreas.ts    # Scenario difficulty analysis
│   │   └── useRecentActivity.ts # Recent attempts across team
│   └── lib/
│       └── adminAccess.ts     # ADMIN_USERNAMES check (ADMIN-06)
```

### Pattern 1: Level-Up Detection via Query Cache Comparison
**What:** Compare user's previous level (from React Query cache) with fresh data to detect level-up events.
**When to use:** After any action that could grant XP (returning from bot after scenario completion).
**Example:**
```typescript
// Detect level-up by comparing cached vs fresh user data
function useLevelUpDetection() {
  const queryClient = useQueryClient();
  const telegramId = useAuthStore((s) => s.telegramId);
  const [levelUp, setLevelUp] = useState<{ oldLevel: number; newLevel: number } | null>(null);

  const { data: user } = useQuery({
    queryKey: queryKeys.users.detail(telegramId!),
    // ...existing query
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!user) return;
    // Get previously cached user data
    const cached = queryClient.getQueryData<UserRow>(
      queryKeys.users.detail(telegramId!)
    );
    // cached here IS the current data; we need to store previousLevel in a ref
    // See Code Examples section for full implementation
  }, [user]);

  return { levelUp, dismiss: () => setLevelUp(null) };
}
```

### Pattern 2: Admin Access Guard Component
**What:** A wrapper component that checks username against VITE_ADMIN_USERNAMES and redirects non-admins.
**When to use:** Wrap the Admin page route to enforce access control.
**Example:**
```typescript
// Admin access check using env-based username list (matches bot pattern)
const ADMIN_USERNAMES = (import.meta.env.VITE_ADMIN_USERNAMES ?? '')
  .split(',')
  .map((u: string) => u.trim().toLowerCase())
  .filter(Boolean);

function useIsAdmin(): { isAdmin: boolean; isLoading: boolean } {
  const telegramId = useAuthStore((s) => s.telegramId);
  // Fetch current user's username
  const { data: user, isLoading } = useQuery({
    queryKey: queryKeys.users.detail(telegramId!),
    // ...
  });
  const isAdmin = user?.username
    ? ADMIN_USERNAMES.includes(user.username.toLowerCase())
    : false;
  return { isAdmin, isLoading };
}
```

### Pattern 3: SVG Micro-Chart for Admin Performance
**What:** Hand-coded SVG bar chart for weekly score trends, avoiding any charting library.
**When to use:** ADMIN-02 team performance chart. The project explicitly excludes heavy charting libraries (D3, Chart.js, Recharts) per REQUIREMENTS.md out-of-scope.
**Example:**
```typescript
// Simple SVG bar chart for weekly trends
function WeeklyBarChart({ data }: { data: { label: string; value: number }[] }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const barWidth = 100 / data.length;

  return (
    <svg viewBox="0 0 100 50" className="w-full h-24">
      {data.map((d, i) => {
        const height = (d.value / maxValue) * 40;
        return (
          <g key={d.label}>
            <rect
              x={i * barWidth + barWidth * 0.15}
              y={45 - height}
              width={barWidth * 0.7}
              height={height}
              rx={2}
              className="fill-accent"
            />
            <text
              x={i * barWidth + barWidth / 2}
              y={49}
              textAnchor="middle"
              className="fill-text-hint text-[3px]"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
```

### Anti-Patterns to Avoid
- **Installing Recharts or Chart.js for admin charts:** The project has an explicit out-of-scope constraint on heavy charting libraries. SVG micro-charts are sufficient for the 1-2 charts needed.
- **Client-side aggregation of unbounded data:** Admin queries fetch ALL users and ALL attempts. Always use `.limit()` and server-side ordering. Consider `.range()` for pagination.
- **Storing admin state in Zustand:** Admin data is read-only and cacheable. Use React Query only -- no Zustand store for admin feature.
- **Building custom confetti from scratch:** canvas-confetti is 5.5kB gzipped and battle-tested. Hand-rolling confetti CSS would be larger and buggier.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confetti celebration | CSS keyframes for 50+ particles | canvas-confetti | Canvas rendering is smoother than CSS, supports web workers, respects prefers-reduced-motion, battle-tested with 6M+ weekly downloads |
| Badge icon rendering | Custom SVG badge icons | lucide-react icon map (existing) | Already have `iconMap` in BadgeCollection.tsx and BadgePreview.tsx mapping badge.icon to lucide components |
| XP counter animation | JS setInterval counter | CSS @property --score-value (existing) | Already proven in globals.css with `countUp` animation. Zero-JS integer interpolation. |
| Rarity tier colors | Hardcoded color values | Tailwind CSS theme tokens (existing) | Already defined: `--color-rarity-common`, `--color-rarity-rare`, `--color-rarity-epic`, `--color-rarity-legendary` in globals.css |
| Badge earned/locked rendering | New component from scratch | Extend existing BadgeCollection.tsx | Already has `EarnedBadgeItem` and `LockedBadgeItem` with proper rarity styling |

**Key insight:** 80% of the gamification visual system is already built. The existing badge definitions, rarity colors, icon mapping, and score animation patterns from Phases 2-3 are the foundation. Phase 6 gamification is an enhancement layer, not a build-from-scratch effort.

## Common Pitfalls

### Pitfall 1: Confetti Firing on Every Page Load
**What goes wrong:** Level-up detection triggers on initial data load, showing confetti every time the dashboard loads (not just when an actual level-up occurs).
**Why it happens:** React Query fetches fresh data on mount, and if you compare "no cached data" vs "current data", it looks like a level-up from level 0 to current level.
**How to avoid:** Use a `useRef` to track the "last known level" and only trigger confetti when `previousLevel < currentLevel` AND `previousLevel > 0` (meaning we had real prior data). Also store the last celebrated level in sessionStorage to prevent re-triggers.
**Warning signs:** Confetti fires every time you navigate to Dashboard. Confetti fires on app restart.

### Pitfall 2: Admin Queries Without Limits Causing Slow Loads
**What goes wrong:** Admin dashboard fetches ALL users and ALL attempts from InsForge, causing multi-second load times as the team grows.
**Why it happens:** The bot's `analytics.py` fetches everything in-memory because it's server-side Python. The TMA runs in a mobile WebView -- network requests are slower and parsing large JSON responses freezes the UI.
**How to avoid:** Always use `.limit()` on queries. For leaderboard: limit to 50 users max. For activity feed: limit to 20 recent items. For weak areas: limit to 100 recent attempts and aggregate client-side. Use React Query's `staleTime` to cache admin data for 5 minutes.
**Warning signs:** Admin page takes >3 seconds to load. Mobile WebView becomes unresponsive during data fetch.

### Pitfall 3: Badge Wall Not Showing Earned Dates
**What goes wrong:** GAME-01 requires badges to show "earned date" but `evaluateBadges()` returns `earnedAt: null` for all badges because there's no database tracking.
**Why it happens:** Decision [02-01] deferred badges table to Phase 6. The current system evaluates badges client-side from user stats -- it doesn't know WHEN a badge was earned, only that it IS earned.
**How to avoid:** For v1, display earned badges without a specific date (just show "Earned" label). Alternatively, approximate the date from the user's attempt history (e.g., the date of their 10th attempt for the "Dedicated" badge). A badges table with actual timestamps is a v2 enhancement.
**Warning signs:** UI shows "null" or "Unknown" date. UI crashes trying to format a null date.

### Pitfall 4: Admin Access Control Only Client-Side
**What goes wrong:** Admin pages are hidden from non-admin users in the UI, but the data queries (fetching all users, all attempts) are not restricted server-side. Any user could call the InsForge API directly to see admin data.
**Why it happens:** The TMA currently uses anon key RLS policies that allow read access to all data (decision [01-02]). There's no server-side admin check.
**How to avoid:** For v1, client-side access control is acceptable (matches the bot's pattern where only the UI prevents non-admin access). Document this as a security limitation. Server-side enforcement would require either: (a) adding an `is_admin` column populated during auth, or (b) creating a separate edge function for admin queries. Both are out of scope for v1 but should be tracked for v2.
**Warning signs:** Security-conscious users notice admin data is accessible via API.

### Pitfall 5: Canvas-Confetti in Telegram WebView Compatibility
**What goes wrong:** canvas-confetti creates a full-viewport canvas overlay. In some Telegram WebView versions, the overlay may not render correctly or may interfere with scroll behavior.
**Why it happens:** Telegram's WebView is a WKWebView (iOS) or custom Chromium (Android) with quirks around full-viewport overlays.
**How to avoid:** Use `position: fixed` with `pointer-events: none` on the canvas container. Set `zIndex` high (9999). Set `resize: false` on canvas-confetti to avoid viewport measurement issues. Test on both iOS and Android Telegram clients. Add a timeout to auto-remove the canvas after animation completes (~3 seconds).
**Warning signs:** Confetti appears behind content. Confetti blocks touch interactions. Confetti canvas doesn't resize on orientation change.

## Code Examples

Verified patterns from official sources and existing codebase patterns:

### Canvas-Confetti Level-Up Celebration
```typescript
// Source: canvas-confetti npm documentation + codebase pattern
import confetti from 'canvas-confetti';

/** Fire a celebratory confetti burst for level-up events */
export function fireLevelUpConfetti() {
  // Side cannons pattern for a dramatic celebration
  const defaults = {
    spread: 60,
    ticks: 100,
    gravity: 1.2,
    decay: 0.94,
    startVelocity: 30,
    particleCount: 40,
    scalar: 1.2,
    disableForReducedMotion: true, // respect accessibility
  };

  // Left cannon
  confetti({ ...defaults, angle: 60, origin: { x: 0, y: 0.7 } });
  // Right cannon
  confetti({ ...defaults, angle: 120, origin: { x: 1, y: 0.7 } });
}
```

### XP Gain Counter Animation (Extending Existing Pattern)
```typescript
// Source: existing globals.css @property pattern + ScoreDisplay.tsx pattern
// globals.css already defines:
//   @property --score-value { syntax: '<integer>'; initial-value: 0; inherits: false; }
//   @keyframes countUp { from { --score-value: 0; } }
//
// Reuse the same pattern for XP:

// In globals.css, add:
// @property --xp-value { syntax: '<integer>'; initial-value: 0; inherits: false; }
// @keyframes xpCountUp { from { --xp-value: 0; } }
// .xp-counter { animation: xpCountUp 1s ease-out forwards; counter-set: xp var(--xp-value); }
// .xp-counter::after { content: "+" counter(xp) " XP"; }

// Component usage:
function XPGainAnimation({ xpEarned }: { xpEarned: number }) {
  return (
    <span
      className="xp-counter text-lg font-bold text-success"
      style={{ ['--xp-value' as string]: xpEarned }}
    />
  );
}
```

### Admin Access Guard
```typescript
// Source: bot/config.py ADMIN_USERNAMES pattern + existing auth store
const ADMIN_USERNAMES: string[] = (import.meta.env.VITE_ADMIN_USERNAMES ?? '')
  .split(',')
  .map((u: string) => u.trim().toLowerCase().replace(/^@/, ''))
  .filter(Boolean);

export function isAdminUsername(username: string | null): boolean {
  if (!username) return false;
  return ADMIN_USERNAMES.includes(username.toLowerCase());
}

// Route guard component
function AdminGuard({ children }: { children: React.ReactNode }) {
  const telegramId = useAuthStore((s) => s.telegramId);
  const { data: user, isLoading } = useQuery({
    queryKey: queryKeys.users.detail(telegramId!),
    queryFn: /* existing user fetch */,
    enabled: !!telegramId,
  });

  if (isLoading) return <PageSkeleton />;
  if (!isAdminUsername(user?.username ?? null)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
```

### Streak Indicator with Flame and Bonus XP
```typescript
// Source: existing ProgressCard.tsx flame pattern + constants.ts MAX_STREAK_BONUS_XP
import { Flame, Zap } from 'lucide-react';
import { MAX_STREAK_BONUS_XP } from '@/types/constants';

function StreakIndicator({ streakDays, totalXP }: { streakDays: number; totalXP: number }) {
  // Streak bonus: 10 XP per day, capped at MAX_STREAK_BONUS_XP (50)
  const bonusXP = Math.min(streakDays * 10, MAX_STREAK_BONUS_XP);
  const isActive = streakDays > 0;

  return (
    <div className="flex items-center gap-2">
      <Flame className={cn('h-5 w-5', isActive ? 'text-warning' : 'text-text-hint')} />
      <span className={cn('text-sm font-semibold', isActive ? 'text-text' : 'text-text-hint')}>
        {streakDays} {streakDays === 1 ? 'day' : 'days'}
      </span>
      {isActive && bonusXP > 0 && (
        <span className="flex items-center gap-0.5 text-xs text-success">
          <Zap className="h-3 w-3" />
          +{bonusXP} XP bonus
        </span>
      )}
    </div>
  );
}
```

### Admin Team Stats Query (PostgREST Pattern)
```typescript
// Source: existing leaderboard/dashboard hook patterns
function useTeamStats() {
  return useQuery({
    queryKey: ['admin', 'teamStats'],
    queryFn: async () => {
      const db = getInsforge().database;

      // Parallel queries for overview stats
      const [usersRes, attemptsRes] = await Promise.all([
        db.from('users').select('id, total_xp, current_level, streak_days, last_active_at'),
        db.from('attempts').select('id, score, mode, xp_earned, created_at')
          .order('created_at', { ascending: false })
          .limit(500),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (attemptsRes.error) throw attemptsRes.error;

      const users = usersRes.data ?? [];
      const attempts = attemptsRes.data ?? [];

      return {
        totalUsers: users.length,
        totalXP: users.reduce((sum, u) => sum + (u.total_xp ?? 0), 0),
        activeUsers: users.filter(u => {
          if (!u.last_active_at) return false;
          const dayAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          return new Date(u.last_active_at).getTime() > dayAgo;
        }).length,
        recentAttempts: attempts,
      };
    },
    staleTime: 5 * 60_000, // 5 minutes -- admin data doesn't need to be real-time
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CSS confetti (many keyframes) | canvas-confetti library (~5.5kB gzip) | Stable since 2020 | Reliable, accessible, performant |
| Charting libraries for all charts | SVG micro-visualizations for simple data | 2024+ TMA trend | Smaller bundles, faster load in WebView |
| Server-side admin access control | Client-side guard (TMA constraint) | N/A | Acceptable for v1, upgrade path to server-side exists |
| Badge timestamps from DB | Client-side evaluation without timestamps | Decision [02-01] | No earned dates in v1, approximation possible |

**Deprecated/outdated:**
- react-confetti (gravity-based rain): Heavier, less controllable than canvas-confetti for one-shot celebrations
- Chart.js for simple admin charts: Overkill at ~60kB gzipped when you need 1-2 bar charts

## Open Questions

Things that couldn't be fully resolved:

1. **Badge Earned Dates**
   - What we know: `evaluateBadges()` returns `earnedAt: null`. GAME-01 spec says "earned (with date)".
   - What's unclear: Whether to approximate dates from attempt history or display without dates.
   - Recommendation: Display "Earned" label without date for v1. If date approximation is wanted, the first attempt matching the badge criteria timestamp can be used (e.g., date of 10th attempt for "Dedicated" badge). Keep `earnedAt: null` in the type for future DB migration.

2. **RLS Restrictions on Admin Queries**
   - What we know: Current RLS uses "anon_full" policies allowing read access to all data. If these are ever tightened, admin queries for all users/attempts will break.
   - What's unclear: Whether RLS will be tightened before Phase 6 ships.
   - Recommendation: Build admin queries assuming full read access (current state). Add error handling that shows "insufficient permissions" if queries fail. Document that server-side admin enforcement is a v2 security hardening task.

3. **VITE_ADMIN_USERNAMES vs Database is_admin Column**
   - What we know: Bot uses `ADMIN_USERNAMES` env var. Users table has no `is_admin` column currently. The verify-telegram edge function doesn't return admin status.
   - What's unclear: Whether to add `is_admin` to the DB or keep it env-only.
   - Recommendation: Use `VITE_ADMIN_USERNAMES` env var for v1 (matches bot pattern exactly). This is a build-time constant embedded in the bundle, which is acceptable for a small admin user list.

4. **canvas-confetti in Telegram WebView**
   - What we know: canvas-confetti uses Canvas API which is supported in all modern WebViews. Telegram's WebView is WKWebView (iOS) and Chromium-based (Android).
   - What's unclear: Whether full-viewport canvas overlay behaves correctly in all Telegram WebView versions.
   - Recommendation: Test early. Use `position: fixed; pointer-events: none; z-index: 9999` on canvas container. Auto-remove after 3 seconds. Fallback: if canvas-confetti fails to render, degrade gracefully (no celebration is better than a broken UI).

## Sources

### Primary (HIGH confidence)
- Existing codebase: `packages/webapp/src/shared/data/badges.ts` -- Badge definitions, rarity types, evaluateBadges()
- Existing codebase: `packages/webapp/src/features/profile/components/BadgeCollection.tsx` -- Current badge grid with earned/locked states
- Existing codebase: `packages/webapp/src/features/scoring/components/ScoreDisplay.tsx` -- CSS @property animation pattern
- Existing codebase: `packages/webapp/src/app/globals.css` -- Rarity tier colors, score counter animation, @property definitions
- Existing codebase: `bot/handlers/admin.py` -- Bot admin access control pattern (username-based)
- Existing codebase: `bot/services/analytics.py` -- TeamAnalyticsService query patterns
- Existing codebase: `.planning/REQUIREMENTS.md` -- Out-of-scope: "Heavy charting (D3/Chart.js)" line 132
- [canvas-confetti GitHub](https://github.com/catdad/canvas-confetti) -- API documentation, web worker support, reduced motion
- [canvas-confetti npm](https://www.npmjs.com/package/canvas-confetti) -- Version 1.9.4, zero dependencies

### Secondary (MEDIUM confidence)
- [react-confetti-explosion npm](https://www.npmjs.com/package/react-confetti-explosion) -- CSS-only alternative evaluated, ~23kB unpacked
- [Best React chart libraries 2026 (Weavelinx)](https://weavelinx.com/best-chart-libraries-for-react-projects-in-2026/) -- Recharts still dominant for React dashboards, but SVG micro-charts appropriate for constrained contexts
- [LogRocket React chart libraries 2025](https://blog.logrocket.com/best-react-chart-libraries-2025/) -- Recharts recommendation for low-density dashboards

### Tertiary (LOW confidence)
- Bundlephobia size estimates for canvas-confetti (~5.5kB gzipped) -- Could not verify exact number via direct fetch, but multiple sources cite this range

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Only one new dependency (canvas-confetti), everything else is existing codebase extensions
- Architecture: HIGH -- Follows established feature folder patterns from Phases 2-5, extends existing hooks and components
- Pitfalls: HIGH -- Based on direct codebase analysis (evaluateBadges returning null dates, RLS open access, bot admin pattern)
- Admin access control: MEDIUM -- Client-side only approach is pragmatic but has known security limitation

**Research date:** 2026-02-04
**Valid until:** 2026-03-04 (30 days -- stable domain, no fast-moving libraries)
