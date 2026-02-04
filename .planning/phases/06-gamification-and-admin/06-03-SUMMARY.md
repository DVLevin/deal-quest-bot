---
phase: 06-gamification-and-admin
plan: 03
subsystem: admin
tags: [react, admin, dashboard, analytics, svg-charts, access-control]

# Dependency graph
requires:
  - phase: 01-foundation-and-auth
    provides: "InsForge client, query keys factory, auth store, shared UI components"
provides:
  - "Admin dashboard with team analytics (overview, performance, leaderboard, weak areas, activity)"
  - "Admin access control via VITE_ADMIN_USERNAMES env var"
  - "AdminGuard route protection component"
  - "Admin query keys namespace in queries.ts"
affects:
  - "Future admin features can extend the admin feature module"
  - "VITE_ADMIN_USERNAMES must be set in deployment env vars for admin access"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SVG micro-charts for data visualization (no charting library)"
    - "Client-side access control via env var username list"
    - "Parallel PostgREST queries with Promise.all for admin data"
    - "Client-side data aggregation (groupBy, averages) from raw DB rows"

# File tracking
key-files:
  created:
    - packages/webapp/src/features/admin/lib/adminAccess.ts
    - packages/webapp/src/features/admin/hooks/useTeamStats.ts
    - packages/webapp/src/features/admin/hooks/useTeamLeaderboard.ts
    - packages/webapp/src/features/admin/hooks/useWeakAreas.ts
    - packages/webapp/src/features/admin/hooks/useRecentActivity.ts
    - packages/webapp/src/features/admin/components/AdminGuard.tsx
    - packages/webapp/src/features/admin/components/TeamOverview.tsx
    - packages/webapp/src/features/admin/components/PerformanceChart.tsx
    - packages/webapp/src/features/admin/components/MemberLeaderboard.tsx
    - packages/webapp/src/features/admin/components/WeakAreas.tsx
    - packages/webapp/src/features/admin/components/ActivityFeed.tsx
  modified:
    - packages/webapp/src/lib/queries.ts
    - packages/webapp/src/pages/Admin.tsx
    - packages/webapp/src/app/Router.tsx

# Decisions
decisions:
  - id: "06-03-01"
    decision: "Client-side access control only (v1) via VITE_ADMIN_USERNAMES env var"
    rationale: "Matches bot pattern, documented security limitation; server-side RLS enforcement deferred"
  - id: "06-03-02"
    decision: "SVG micro-charts with hand-coded SVG (no charting library)"
    rationale: "Zero bundle cost, sufficient for weekly bar chart; avoids recharts/d3 dependency"
  - id: "06-03-03"
    decision: "5-minute staleTime and .limit() on all admin queries"
    rationale: "Admin data doesn't need real-time updates; limits prevent unbounded fetching"
  - id: "06-03-04"
    decision: "AdminGuard reuses existing user query key for deduplication"
    rationale: "TanStack Query deduplicates if user data already cached from dashboard"

# Metrics
metrics:
  duration: "4m"
  completed: "2026-02-04"
---

# Phase 6 Plan 3: Admin Dashboard Summary

Admin dashboard with team analytics, access control, and five dashboard sections using client-side data aggregation from PostgREST queries and hand-coded SVG charts.

## What Was Built

### Admin Access Control
- `adminAccess.ts` parses `VITE_ADMIN_USERNAMES` comma-separated env var, normalizes usernames (lowercase, strip @), and exports `isAdminUsername()` check
- `AdminGuard` component wraps the admin route, fetches user data to verify username, redirects non-admins to `/` via `<Navigate>`, shows skeleton while loading
- Router updated to wrap `<Admin />` inside `<AdminGuard>` within the existing Suspense boundary

### Data Hooks (4 hooks)
- `useTeamStats` -- fetches all users (limit 50) and recent attempts (limit 500) in parallel, computes totalUsers, totalXP, activeUsers (7-day window), and passes recentAttempts downstream
- `useTeamLeaderboard` -- fetches users sorted by XP (limit 50) and all attempts (limit 1000), computes per-user average score, returns sorted array of `{ user, avgScore }`
- `useWeakAreas` -- fetches recent attempts (limit 200), groups by scenario_id, computes avg score, returns bottom 5 sorted ascending
- `useRecentActivity` -- fetches last 20 attempts and all users, joins to attach display names, returns activity items with id, userName, scenarioId, score, mode, xpEarned, createdAt
- All hooks: 5-minute staleTime, `.limit()` on every query

### Dashboard Components (5 components)
- `TeamOverview` -- 3-column grid of stat cards with lucide-react icons (Users/Zap/Activity), color-coded by metric type
- `PerformanceChart` -- SVG bar chart bucketing attempts into last 6 weeks, avg score per week, rounded bars with score labels, week date labels; no charting library dependency
- `MemberLeaderboard` -- full team ranking list with rank numbers (top 3 accent-colored), display name, avg score, total XP formatted with toLocaleString()
- `WeakAreas` -- bottom 5 scenarios with formatted scenario IDs (underscores to spaces), color-coded scores (red < 40, warning < 60, success >= 60), attempt counts
- `ActivityFeed` -- recent interactions with user name, mode Badge component (learn/train/support variants), score, and relative time via `timeAgo()` helper

### Admin Page
- Replaced placeholder content with composed dashboard: heading + TeamOverview + PerformanceChart + MemberLeaderboard + WeakAreas + ActivityFeed
- Query keys namespace added to `queries.ts`: `admin.teamStats`, `admin.leaderboard`, `admin.weakAreas`, `admin.recentActivity`

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- TypeScript compiles (`tsc --noEmit`): PASS
- Vite build: PASS (Admin chunk: 10.82 kB gzipped 3.04 kB)
- AdminGuard wraps Admin route: CONFIRMED
- Admin page imports all 5 components: CONFIRMED
- SVG chart uses viewBox, no charting library: CONFIRMED
- All hooks use staleTime 5 * 60_000: CONFIRMED (4/4 hooks)
- All hooks use .limit(): CONFIRMED (11 limit calls across 4 hooks)
- queryKeys.admin namespace exists: CONFIRMED

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | 0671d38 | feat(06-03): admin access control and data hooks |
| 2 | 44b0e26 | feat(06-03): admin dashboard components and page integration |
