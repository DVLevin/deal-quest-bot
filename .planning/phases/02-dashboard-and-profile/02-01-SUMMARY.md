---
phase: 02-dashboard-and-profile
plan: 01
subsystem: dashboard
tags: [tanstack-query, insforge-postgrest, badges, leaderboard, progress-bar, avatar]
requires: [01-foundation-and-auth]
provides: [query-key-factory, badge-definitions, dashboard-page, progress-components]
affects: [02-02-profile, 03-learn-and-train, 06-gamification]
tech-stack:
  added: []
  patterns: [query-key-factory, custom-query-hooks, client-side-badge-evaluation, feature-based-folder-structure]
key-files:
  created:
    - packages/webapp/src/lib/queries.ts
    - packages/webapp/src/shared/data/badges.ts
    - packages/webapp/src/shared/ui/ProgressBar.tsx
    - packages/webapp/src/shared/ui/Avatar.tsx
    - packages/webapp/src/features/dashboard/hooks/useUserProgress.ts
    - packages/webapp/src/features/dashboard/hooks/useRecentBadges.ts
    - packages/webapp/src/features/dashboard/hooks/useLeaderboard.ts
    - packages/webapp/src/features/dashboard/components/ProgressCard.tsx
    - packages/webapp/src/features/dashboard/components/BadgePreview.tsx
    - packages/webapp/src/features/dashboard/components/LeaderboardWidget.tsx
    - packages/webapp/src/features/dashboard/components/QuickActions.tsx
  modified:
    - packages/webapp/src/shared/ui/index.ts
    - packages/webapp/src/pages/Dashboard.tsx
    - packages/webapp/package.json
    - pnpm-lock.yaml
key-decisions:
  - Client-side badge evaluation with static definitions (no badges table until Phase 6)
  - Leaderboard fetches 10 rows, displays top 5, finds current user position in the full list
  - XP progress calculated within current level (total_xp minus level threshold)
  - Badge rarity colors use oklch tokens from globals.css (rarity-common, rarity-rare, rarity-epic, rarity-legendary)
  - Added @deal-quest/shared workspace dependency to webapp package
duration: 5m
completed: 2026-02-03
---

# Phase 2 Plan 1: Dashboard Data Infrastructure & Page Summary

Query key factory, 8 static badge definitions with client-side evaluation, ProgressBar/Avatar shared components, 3 dashboard data hooks wrapping InsForge PostgREST via TanStack Query, 4 feature components (ProgressCard, BadgePreview, LeaderboardWidget, QuickActions), and a fully wired Dashboard page replacing the stub.

## Performance

- **Duration:** ~5 minutes
- **Tasks:** 2/2 completed
- **Commits:** 2 task commits
- **Build:** Clean production build, Dashboard chunk 23.73 kB gzipped to 7.96 kB

## Accomplishments

### Task 1: Shared data infrastructure
- Created query key factory (`queryKeys`) with namespaced keys for users, attempts, badges
- Defined 8 static badge definitions with discriminated union criteria types (xp_threshold, streak_days, attempt_count, perfect_score, first_attempt)
- Implemented `evaluateBadges()` pure function that checks badge criteria against user/attempt data
- Built `ProgressBar` component with 3 sizes (sm/md/lg), `role="progressbar"` accessibility, animated fill, XP label
- Built `Avatar` component with initials fallback (firstName > username > '?'), 3 sizes, rounded-full design
- Updated barrel exports in shared/ui/index.ts

### Task 2: Dashboard hooks, components, and page
- `useUserProgress`: Fetches user XP, level, rank, streak via InsForge PostgREST, gated on telegramId
- `useRecentBadges`: Fetches user + last 100 attempts, evaluates badges client-side, returns earned/total
- `useLeaderboard`: Fetches top 10 users by total_xp, returns top 5 + current user position, 2min staleTime
- `ProgressCard`: Displays avatar (links to /profile), name, rank, level, XP progress bar, streak count
- `BadgePreview`: Shows last 4 earned badges with rarity-colored icons, "See all" links to /profile
- `LeaderboardWidget`: Top 5 user rows with position, avatar, name, XP, level badge; current user highlighted
- `QuickActions`: 5 navigation cards in 3-column grid linking to /learn, /train, /support, /casebook, /leads
- Replaced Dashboard.tsx stub with full data-driven page rendering all 4 feature components

## Task Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 9f18c6d | feat(02-01): shared data infrastructure -- query keys, badges, ProgressBar, Avatar |
| 2 | 6f58e97 | feat(02-01): dashboard hooks, feature components, and page replacement |

## Files Created/Modified

**Created (11 files):**
- `packages/webapp/src/lib/queries.ts` -- Query key factory for TanStack Query
- `packages/webapp/src/shared/data/badges.ts` -- 8 badge definitions + evaluateBadges()
- `packages/webapp/src/shared/ui/ProgressBar.tsx` -- Reusable XP progress bar with accessibility
- `packages/webapp/src/shared/ui/Avatar.tsx` -- Avatar with initials fallback
- `packages/webapp/src/features/dashboard/hooks/useUserProgress.ts` -- User progress data hook
- `packages/webapp/src/features/dashboard/hooks/useRecentBadges.ts` -- Badge evaluation hook
- `packages/webapp/src/features/dashboard/hooks/useLeaderboard.ts` -- Leaderboard data hook
- `packages/webapp/src/features/dashboard/components/ProgressCard.tsx` -- XP/level/rank/streak card
- `packages/webapp/src/features/dashboard/components/BadgePreview.tsx` -- Recent badges display
- `packages/webapp/src/features/dashboard/components/LeaderboardWidget.tsx` -- Top-5 leaderboard
- `packages/webapp/src/features/dashboard/components/QuickActions.tsx` -- Navigation grid

**Modified (4 files):**
- `packages/webapp/src/shared/ui/index.ts` -- Added ProgressBar and Avatar exports
- `packages/webapp/src/pages/Dashboard.tsx` -- Replaced stub with full dashboard page
- `packages/webapp/package.json` -- Added @deal-quest/shared workspace dependency
- `pnpm-lock.yaml` -- Updated lockfile

## Decisions Made

1. **Client-side badge evaluation:** Badges are evaluated from static definitions using user XP, streak, and attempt data. No badges table needed until Phase 6. `evaluateBadges()` is a pure function with no database queries.

2. **Leaderboard RLS handling:** The hook fetches 10 rows but displays 5. If RLS restricts to only the current user's row, a graceful "Leaderboard unavailable" empty state is shown. The policy fix is tracked as a Phase 1 pending todo.

3. **XP progress within level:** Progress bar shows XP earned within the current level, not total XP. Calculated as `total_xp - XP_PER_LEVEL[current_level - 1]` with `getXPForNextLevel()` for the max. At max level, shows "MAX LEVEL" text instead of a bar.

4. **Badge icon mapping:** Lucide icons are mapped statically by name (trophy, flame, star, target, zap, shield, gem) rather than dynamic import, for tree-shaking and type safety.

5. **@deal-quest/shared dependency:** Added as workspace dependency to webapp package.json to enable imports of UserRow, AttemptRow, and game constants.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added @deal-quest/shared workspace dependency**
- **Found during:** Task 1 typecheck
- **Issue:** The webapp package.json did not list `@deal-quest/shared` as a dependency, causing TypeScript to fail with "Cannot find module '@deal-quest/shared'"
- **Fix:** Ran `pnpm --filter @deal-quest/webapp add @deal-quest/shared --workspace` to add the workspace dependency
- **Files modified:** packages/webapp/package.json, pnpm-lock.yaml
- **Commit:** 9f18c6d (included in Task 1 commit)

**2. [Rule 3 - Blocking] Installed node_modules**
- **Found during:** Task 1 typecheck
- **Issue:** `node_modules` were missing; `pnpm typecheck` failed with `sh: tsc: command not found`
- **Fix:** Ran `pnpm install` to restore dependencies
- **Files modified:** None (node_modules is gitignored)

## Issues Encountered

None beyond the deviations documented above.

## Next Phase Readiness

**For 02-02 (Profile page):**
- Query key factory is ready (`queryKeys.users`, `queryKeys.attempts`, `queryKeys.badges`)
- Badge definitions and evaluation function are shared and can be reused by Profile badge collection
- Avatar and ProgressBar components are exported and reusable
- `useUserProgress` hook pattern is established for Profile to follow
- The feature-based folder structure (`features/dashboard/`) sets the pattern for `features/profile/`

**Known concerns:**
- Leaderboard RLS policy gap remains open (01-02 pending todo) -- leaderboard may show only current user until policy is updated
- XP-to-level formula mismatch between bot and TMA shared constants is documented but unresolved
