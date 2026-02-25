---
phase: 03-learn-and-train
plan: 01
subsystem: learn
tags: [react, tanstack-query, insforge, tracks, scenarios, deep-link, telegram]
requires: [01-foundation-and-auth, 02-dashboard-and-profile]
provides: [learn-track-data, learn-components, learn-page-routing, track-progress-hook]
affects: [03-03-scoring-feedback, 07-bot-integration]
tech-stack:
  added: []
  patterns: [static-data-merge, nested-sub-routes, deep-link-to-bot]
key-files:
  created:
    - packages/webapp/src/features/learn/data/tracks.ts
    - packages/webapp/src/features/learn/hooks/useTrackProgress.ts
    - packages/webapp/src/features/learn/components/TrackList.tsx
    - packages/webapp/src/features/learn/components/LevelCard.tsx
    - packages/webapp/src/features/learn/components/LessonView.tsx
    - packages/webapp/src/features/learn/components/ScenarioPractice.tsx
  modified:
    - packages/webapp/src/lib/queries.ts
    - packages/webapp/src/pages/Learn.tsx
key-decisions:
  - id: 03-01-01
    decision: Static TRACKS constant compiled into bundle (browser cannot access scenarios.json)
    context: TMA runs in browser, data/scenarios.json is on bot server filesystem
  - id: 03-01-02
    decision: Deep link to bot for response submission (TMA is display layer)
    context: TMA cannot call LLM APIs; MainButton opens bot chat with start param
  - id: 03-01-03
    decision: Empty track_progress defaults first level unlocked, rest locked
    context: Users who visit TMA before using /learn in bot have 0 DB rows
duration: 5m
completed: 2026-02-03
---

# Phase 3 Plan 1: Learn Mode -- Track Visualization, Lessons, and Scenario Practice

Static track data from scenarios.json, track progress hook merging static + DB data, 4 Learn feature components (TrackList, LevelCard, LessonView, ScenarioPractice), and Learn.tsx with nested sub-routes for index and level detail views.

## Performance

- **Duration:** 5 minutes
- **Start:** 2026-02-03T19:38:10Z
- **End:** 2026-02-03T19:42:53Z
- **Tasks:** 2/2
- **Files created:** 6
- **Files modified:** 2

## Accomplishments

1. **Static track data:** Extracted all 4 levels from `data/scenarios.json` into TypeScript `TRACKS` constant with full lesson and scenario data (personas, situations, difficulty, time limits, ideal responses, common mistakes)
2. **Query key extensions:** Added `trackProgress` (all, byTrack, level) and `scenarios` (all, pool, seen) namespaces to the query key factory
3. **Track progress hook:** Created `useTrackProgress` that fetches `track_progress` from InsForge and merges with static TRACKS data, with explicit handling for 0-row case (first level unlocked, rest locked)
4. **LevelCard component:** Status-aware card with Lock/Play/CheckCircle icons, difficulty badges, best score display, and 44px touch targets
5. **TrackList component:** Track overview with loading skeletons, error state with retry, and navigation to level detail
6. **LessonView component:** Lesson content with title, paragraph text, key points list with checkmark icons, and Continue to Practice button
7. **ScenarioPractice component:** Persona card, difficulty/time badges, quoted situation text, and MainButton deep link to bot for practice
8. **Learn page routing:** Nested Routes (index -> TrackList, level/:levelId -> LevelDetail) using React Router v7 within existing /learn/* wildcard

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Static track data + query keys + track progress hook | bc24efa | tracks.ts, queries.ts, useTrackProgress.ts |
| 2 | Learn components + sub-routed page | 543bc30 | LevelCard.tsx, TrackList.tsx, LessonView.tsx, ScenarioPractice.tsx, Learn.tsx |

## Files Created

| File | Purpose |
|------|---------|
| `packages/webapp/src/features/learn/data/tracks.ts` | Static track/level/lesson/scenario data (4 levels from scenarios.json) |
| `packages/webapp/src/features/learn/hooks/useTrackProgress.ts` | Hook merging static TRACKS with InsForge track_progress |
| `packages/webapp/src/features/learn/components/TrackList.tsx` | Track overview with level cards and navigation |
| `packages/webapp/src/features/learn/components/LevelCard.tsx` | Individual level card with status/difficulty/score |
| `packages/webapp/src/features/learn/components/LessonView.tsx` | Lesson content display (title, text, key points) |
| `packages/webapp/src/features/learn/components/ScenarioPractice.tsx` | Scenario persona card + Practice in Bot CTA |

## Files Modified

| File | Change |
|------|--------|
| `packages/webapp/src/lib/queries.ts` | Added trackProgress and scenarios query key namespaces |
| `packages/webapp/src/pages/Learn.tsx` | Replaced stub with nested Routes (index, level/:levelId) |

## Decisions Made

1. **Static TRACKS constant:** Browser cannot access `data/scenarios.json` on bot filesystem. All 4 levels extracted into TypeScript constant compiled into the bundle.
2. **Deep link to bot for practice:** TMA is display layer -- response submission and AI scoring happens in the bot. MainButton opens `https://t.me/{bot}?start=learn_{levelId}`.
3. **Empty track_progress handling:** New users have 0 rows. First level defaults to 'unlocked', rest to 'locked', all scores to 0. Matches what the bot's `init_track` would create.

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- **03-02 (Train mode):** Ready. Query key factory already has `scenarios` namespace. Feature folder structure established.
- **03-03 (Scoring feedback):** Ready. LevelWithProgress type and track data patterns reusable for score display.
- **VITE_BOT_USERNAME:** Environment variable used in ScenarioPractice for deep link URL. Falls back to 'DealQuestBot' if not set. Should be added to `.env.example` when deploying.
