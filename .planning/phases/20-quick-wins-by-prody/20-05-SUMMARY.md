---
phase: 20-quick-wins-by-prody
plan: 05
subsystem: ui
tags: [react, admin, onboarding, leaderboard, tanstack-query]

# Dependency graph
requires:
  - phase: 06-gamification-admin
    provides: Admin page with MemberLeaderboard component
  - phase: 02-dashboard-profile
    provides: Dashboard page with ProgressCard and user data
provides:
  - Admin rep detail drilldown view with XP, level, streak, avg score, lead count, recent attempts
  - First-time user guided onboarding card on Dashboard
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline state toggle for detail views (selectedMember pattern in MemberLeaderboard)"
    - "Separate data-fetching hooks per detail section (useRepAttempts, useRepLeadCount, useRepStreak)"

key-files:
  created:
    - packages/webapp/src/features/admin/components/RepDetailView.tsx
    - packages/webapp/src/features/dashboard/components/FirstTimeGuide.tsx
  modified:
    - packages/webapp/src/features/admin/components/MemberLeaderboard.tsx
    - packages/webapp/src/pages/Dashboard.tsx

key-decisions:
  - "Streak fetched separately since LeaderboardEntry type does not include streak_days"
  - "AttemptRow has no difficulty field; mode badge shown instead of difficulty badge"
  - "Lead count uses head:true count query for efficiency (no row data transferred)"

patterns-established:
  - "Admin detail views: inline state toggle with onBack callback (no page navigation)"

# Metrics
duration: 3min
completed: 2026-02-08
---

# Phase 20 Plan 05: Admin Rep Detail & First-Time Guide Summary

**Admin rep drilldown view showing XP/level/streak/leads/attempts, plus 3-step onboarding card for zero-activity users on Dashboard**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-08T07:47:36Z
- **Completed:** 2026-02-08T07:50:26Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Admin can tap any leaderboard member to drill into their stats (XP, level, avg score, streak, lead count, 10 recent attempts with score color coding)
- Brand new users (0 XP, 0 leads) see a guided 3-step onboarding card on Dashboard with "Open Bot & Try It" CTA
- Guide auto-hides when user gains XP or creates a lead (reactive via TanStack Query refetching)

## Task Commits

Each task was committed atomically:

1. **Task 1: Admin rep detail view** - `d2e34ac` (feat)
2. **Task 2: First-time user guided tour on Dashboard** - `d401e51` (feat)

## Files Created/Modified
- `packages/webapp/src/features/admin/components/RepDetailView.tsx` - Admin rep detail view with user stats, recent attempts, and lead count
- `packages/webapp/src/features/admin/components/MemberLeaderboard.tsx` - Added clickable rows with selectedMember state and ChevronRight indicator
- `packages/webapp/src/features/dashboard/components/FirstTimeGuide.tsx` - 3-step onboarding card for first-time users
- `packages/webapp/src/pages/Dashboard.tsx` - Conditional FirstTimeGuide rendering for 0 XP + 0 leads users

## Decisions Made
- Streak fetched separately in RepDetailView since LeaderboardEntry type only picks id/telegram_id/username/first_name/total_xp/current_level (no streak_days)
- AttemptRow has no difficulty column; used mode badge instead of difficulty badge in recent attempts list
- Lead count uses InsForge head:true count query for efficiency (avoids transferring row data)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Adjusted RepDetailView props to match actual data types**
- **Found during:** Task 1 (RepDetailView creation)
- **Issue:** Plan's interface had `current_streak` field but UserRow uses `streak_days`, and LeaderboardEntry doesn't include it at all
- **Fix:** Removed streak from props, added separate `useRepStreak` hook to fetch streak_days from users table
- **Files modified:** packages/webapp/src/features/admin/components/RepDetailView.tsx
- **Verification:** TypeScript compiles without errors
- **Committed in:** d2e34ac

**2. [Rule 1 - Bug] Removed non-existent difficulty field from attempts query**
- **Found during:** Task 1 (RepDetailView creation)
- **Issue:** Plan specified selecting `difficulty` from attempts table, but AttemptRow has no difficulty column
- **Fix:** Queried available fields (scenario_id, score, mode, created_at) and used mode badge instead
- **Files modified:** packages/webapp/src/features/admin/components/RepDetailView.tsx
- **Verification:** TypeScript compiles without errors
- **Committed in:** d2e34ac

---

**Total deviations:** 2 auto-fixed (2 bugs - plan referenced incorrect field names)
**Impact on plan:** Both fixes necessary for TypeScript compilation. Same visual intent achieved with correct field names.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 20 (Quick Wins by Prody) is now complete (5/5 plans done)
- All quick wins implemented: deal closure celebration, pipeline velocity, smart status suggestions, outcome capture & stale digest, admin rep detail & first-time guide

## Self-Check: PASSED

- [x] RepDetailView.tsx exists
- [x] MemberLeaderboard.tsx exists (modified)
- [x] FirstTimeGuide.tsx exists
- [x] Dashboard.tsx exists (modified)
- [x] Commit d2e34ac found
- [x] Commit d401e51 found

---
*Phase: 20-quick-wins-by-prody*
*Completed: 2026-02-08*
