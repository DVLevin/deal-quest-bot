---
phase: 02-dashboard-and-profile
plan: 02
subsystem: profile
tags: [tanstack-query, insforge-postgrest, badges, pagination, profile, stats]
requires: [02-01-dashboard]
provides: [profile-page, attempt-history, badge-collection, user-stats]
affects: [06-gamification]
tech-stack:
  added: []
  patterns: [paginated-query-hooks, client-side-aggregation, keepPreviousData-pagination]
key-files:
  created:
    - packages/webapp/src/features/profile/hooks/useUserProfile.ts
    - packages/webapp/src/features/profile/hooks/useUserStats.ts
    - packages/webapp/src/features/profile/hooks/useAttemptHistory.ts
    - packages/webapp/src/features/profile/hooks/useUserBadges.ts
    - packages/webapp/src/features/profile/components/ProfileHeader.tsx
    - packages/webapp/src/features/profile/components/StatsOverview.tsx
    - packages/webapp/src/features/profile/components/AttemptHistory.tsx
    - packages/webapp/src/features/profile/components/BadgeCollection.tsx
  modified:
    - packages/webapp/src/pages/Profile.tsx
key-decisions:
  - Client-side stats aggregation from last 100 attempts (totalAttempts, avgScore, bestScore, scenariosCompleted)
  - Paginated attempt history using range() with keepPreviousData for smooth transitions
  - Badge collection reuses evaluateBadges() from shared data, shows earned/locked states
  - Profile page order: Header, Stats, Badges, History (most important info first)
duration: 5m
completed: 2026-02-03
---

# Phase 2 Plan 2: Profile Page Summary

4 Profile data hooks, 4 feature components, and a fully wired Profile page replacing the stub. Proves paginated queries and client-side data aggregation through the full InsForge data pipeline.

## Performance

- **Duration:** ~5 minutes
- **Tasks:** 1/1 auto tasks completed (+ 1 checkpoint pending)
- **Commits:** 1 task commit
- **Build:** Clean production build, Profile chunk 10.76 kB gzipped to 3.16 kB

## Accomplishments

### Task 1: Profile hooks, components, and page replacement
- `useUserProfile`: Fetches full user row from InsForge, gated on telegramId, deduplicates with Dashboard via shared query key
- `useUserStats`: Fetches last 100 attempts, computes totalAttempts/averageScore/bestScore/scenariosCompleted client-side, handles zero attempts (no NaN)
- `useAttemptHistory`: Paginated query with range(), PAGE_SIZE=10, keepPreviousData for smooth page transitions, returns total count and hasMore flag
- `useUserBadges`: Full badge collection evaluation — returns allBadges (8 definitions), earned badges, earnedCount, totalCount
- `ProfileHeader`: Avatar (lg), username/firstName, rank title via getRankTitle(), "Level N" badge, total XP, member-since date (MMM YYYY), streak display
- `StatsOverview`: 2-column stat grid (Target/BarChart/Trophy/CheckCircle icons), handles zero values correctly
- `AttemptHistory`: Paginated list with mode badges, score color coding (green>=80, yellow>=60, red<60), date formatting, Previous/Next pagination
- `BadgeCollection`: Full 4-column badge grid, earned badges at full opacity with rarity colors, locked badges at opacity-30 with grayscale, criteria hints
- Replaced Profile.tsx stub with full page: ProfileHeader → StatsOverview → BadgeCollection → AttemptHistory

## Task Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | e0ee164 | feat(02-02): build Profile hooks, components, and replace page stub |

## Files Created/Modified

**Created (8 files):**
- `packages/webapp/src/features/profile/hooks/useUserProfile.ts` -- Full user profile data hook
- `packages/webapp/src/features/profile/hooks/useUserStats.ts` -- Aggregate stats from attempts
- `packages/webapp/src/features/profile/hooks/useAttemptHistory.ts` -- Paginated attempt list
- `packages/webapp/src/features/profile/hooks/useUserBadges.ts` -- Full badge collection hook
- `packages/webapp/src/features/profile/components/ProfileHeader.tsx` -- User info header
- `packages/webapp/src/features/profile/components/StatsOverview.tsx` -- Aggregate stats grid
- `packages/webapp/src/features/profile/components/AttemptHistory.tsx` -- Paginated attempt list
- `packages/webapp/src/features/profile/components/BadgeCollection.tsx` -- Full badge grid

**Modified (1 file):**
- `packages/webapp/src/pages/Profile.tsx` -- Replaced stub with full profile page

## Decisions Made

1. **Client-side stats aggregation:** Fetches last 100 attempts and computes stats in the browser. Avoids needing PostgREST aggregate functions which may not be available.

2. **keepPreviousData pagination:** Uses TanStack Query's keepPreviousData for smooth page transitions — previous page data stays visible while next page loads.

3. **Badge collection dual states:** Earned badges show full color with rarity-based styling (common/rare/epic/legendary). Locked badges show same icon at 30% opacity with grayscale filter and criteria hint text.

4. **Score color coding:** Green (>=80), Yellow (>=60), Red (<60) matches the PASSING_SCORE=60 threshold.

## Deviations from Plan

None. All files created as specified, typecheck and build pass clean.

## Issues Encountered

None during code execution. Deployment to Railway required separate fixes (shared package resolution).

## Next Phase Readiness

**For Phase 3 (Learn & Train):**
- Query key factory and hook patterns are established
- Badge evaluation system is reusable
- Pagination pattern (keepPreviousData + range()) is proven
- Score color coding can be reused for training results
