---
phase: 09-training-experience
verified: 2026-02-04T19:57:15Z
status: passed
score: 4/4 must-haves verified
---

# Phase 9: Training Experience Verification Report

**Phase Goal:** Users get smarter training recommendations — the app suggests appropriate difficulty, shows per-track progress, identifies weak areas, and encourages scenario variety

**Verified:** 2026-02-04T19:57:15Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Train page shows a recommended difficulty level based on user's average scores per difficulty | ✓ VERIFIED | DifficultyRecommendation component renders on Train page with threshold-based recommendation (promote at avg>=70, demote at avg<40, MIN_ATTEMPTS=3). useTrainingStats hook fetches last 100 train attempts, cross-references with scenario pool, computes avgScoreByDifficulty. Component includes "Try it" CTA that pre-selects the recommended difficulty. |
| 2 | Learn page displays per-track summary (levels completed, avg score, best score) at the top of each track | ✓ VERIFIED | TrackStats component renders in TrackList above level cards. Computes from LevelWithProgress[] data: completed count (filtering status==='completed'), average score (from completed levels with bestScore>0), best score (max across all levels). Displays with icons: CheckCircle for completion, BarChart3 for avg, Trophy for best. |
| 3 | Dashboard highlights weak areas (tracks/difficulties with below-average scores) with a "Practice this" button | ✓ VERIFIED | WeakAreasCard component on Dashboard identifies weak areas with WEAK_THRESHOLD=50. Detects difficulty-based weak areas (avg<50, count>=2) from useTrainingStats and weakest Learn level from useTrackProgress. Shows up to 3 weak areas with "Practice" CTA that routes to /train for difficulties, /learn for track levels. Shows encouraging "No weak spots!" when no weak areas exist. |
| 4 | Train mode shows remaining unseen scenarios count and displays a nudge when the pool is running low | ✓ VERIFIED | ScenarioVariety component on Train page shows "X of Y scenarios unseen" from useTrainingStats (unseenCount = totalPoolSize - seenIds.size). When isRunningLow (unseenCount<=3 && totalPoolSize>0), displays warning nudge: "Only X left! Great coverage — consider revisiting past scenarios." |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/webapp/src/features/train/hooks/useTrainingStats.ts` | Hook that computes training stats from attempts cross-referenced with scenario pool | ✓ VERIFIED | 220 lines. Fetches last 100 train-mode attempts + scenarios_seen from InsForge. Builds difficulty map from TRAIN_POOL + DB scenarios. Computes avgScoreByDifficulty (Record<number, {avg, count}>), recommendedDifficulty (threshold-based), unseenCount, isRunningLow. Threshold constants: MIN_ATTEMPTS=3, PROMOTE=70, DEMOTE=40. No stubs, no console.log. |
| `packages/webapp/src/features/train/components/DifficultyRecommendation.tsx` | Component showing recommended difficulty with avg score context and "Try it" CTA | ✓ VERIFIED | 87 lines. Receives recommendedDifficulty, avgScoreByDifficulty, onSelectDifficulty props. Returns null when recommendedDifficulty===null (insufficient data). Displays Card with TrendingUp icon, recommended difficulty label from DIFFICULTY_LABELS, context stats (averaging X on difficulty Y), and "Try it" Button. No stubs. |
| `packages/webapp/src/features/train/components/ScenarioVariety.tsx` | Component showing unseen scenario count with low-pool nudge | ✓ VERIFIED | 37 lines. Receives unseenCount, totalPoolSize, isRunningLow props. Returns null when totalPoolSize===0. Displays "X of Y scenarios unseen" text. When isRunningLow, shows warning text with encouragement. No stubs. |
| `packages/webapp/src/features/learn/components/TrackStats.tsx` | Component showing per-track completion summary (completed/total, avg, best) | ✓ VERIFIED | 84 lines. Pure presentational component receiving levels:LevelWithProgress[] prop. computeStats helper filters completed levels, computes avg (from completed with bestScore>0), best (max across all). Displays Card with 3 stat sections (CheckCircle+completed, BarChart3+avg, Trophy+best). Shows dashes when no data. No stubs. |
| `packages/webapp/src/features/dashboard/components/WeakAreasCard.tsx` | Component identifying weak areas with "Practice this" CTA on Dashboard | ✓ VERIFIED | 142 lines. Consumes useTrainingStats + useTrackProgress('foundations'). Computes weakAreas from avgScoreByDifficulty (avg<50, count>=2) and weakest completed Learn level (bestScore<50). Sorts by avgScore ascending (weakest first). Shows up to 3 weak areas with AlertTriangle icon, label, avg score, "Practice" Button. Routes to /learn for track-level, /train for difficulty. Shows Sparkles + "No weak spots" when no weak areas. Returns null when loading or no data. No stubs. |
| `packages/webapp/src/lib/queries.ts` | Query key factory with training.stats section | ✓ VERIFIED | Added training.stats query key: `['training', telegramId, 'stats']`. Used by useTrainingStats for attemptsQuery. |
| `packages/webapp/src/pages/Train.tsx` | Train page with DifficultyRecommendation and ScenarioVariety components wired | ✓ VERIFIED | Modified to call useTrainingStats hook, pass stats.recommendedDifficulty/avgScoreByDifficulty to DifficultyRecommendation, pass stats.unseenCount/totalPoolSize/isRunningLow to ScenarioVariety. Both components render in filter step. DifficultyRecommendation positioned between description and DifficultyFilter, ScenarioVariety between loading check and Start Training button. |
| `packages/webapp/src/features/learn/components/TrackList.tsx` | TrackList with TrackStats wired between header and level cards | ✓ VERIFIED | Modified to import and render TrackStats. Positioned after track name/description, before level cards loop. Passes levels prop from useTrackProgress. Conditional render: `{levels && <TrackStats levels={levels} />}`. |
| `packages/webapp/src/pages/Dashboard.tsx` | Dashboard with WeakAreasCard positioned between QuickActions and BadgePreview | ✓ VERIFIED | Modified to import and render WeakAreasCard. Positioned in DOM order: ProgressCard -> QuickActions -> WeakAreasCard -> BadgePreview -> LeaderboardWidget. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| Train.tsx | useTrainingStats hook | Direct hook call | ✓ WIRED | `const stats = useTrainingStats()` called at component top level. stats object destructured and passed to DifficultyRecommendation (recommendedDifficulty, avgScoreByDifficulty) and ScenarioVariety (unseenCount, totalPoolSize, isRunningLow). |
| WeakAreasCard.tsx | useTrainingStats hook | Direct hook call | ✓ WIRED | `const stats = useTrainingStats()` called at component top level. stats.avgScoreByDifficulty used in weakAreas computation loop. stats.isLoading checked in render guard. |
| useTrainingStats | InsForge attempts table | TanStack Query | ✓ WIRED | attemptsQuery fetches from 'attempts' table with `.select('scenario_id, score, mode').eq('telegram_id', telegramId!).eq('mode', 'train').order('created_at', {ascending: false}).limit(100)`. Query wrapped in useQuery with queryKeys.training.stats(telegramId!). Data returned as Array<{scenario_id, score, mode}>. |
| useTrainingStats | InsForge scenarios_seen table | TanStack Query | ✓ WIRED | seenQuery fetches from 'scenarios_seen' table with `.select('scenario_id').eq('telegram_id', telegramId!)`. Query wrapped in useQuery with queryKeys.scenarios.seen(telegramId!). Data returned as Array<{scenario_id: string}>. |
| TrackList.tsx | TrackStats component | Direct component usage | ✓ WIRED | `<TrackStats levels={levels} />` rendered when levels is truthy. levels comes from `useTrackProgress('foundations')` hook (fetches track_progress + computes status). |
| DifficultyRecommendation | onSelectDifficulty callback | onClick handler | ✓ WIRED | "Try it" Button calls `onClick={() => onSelectDifficulty(recommendedDifficulty)}`. Train.tsx passes `onSelectDifficulty={(d) => setSelectedDifficulty(d)}` which updates local state that feeds useScenarioPool(selectedDifficulty). |
| WeakAreasCard | navigate('/train' or '/learn') | onClick handler | ✓ WIRED | "Practice" Button calls `onClick={() => navigate(area.type === 'track-level' ? '/learn' : '/train')}`. useNavigate hook from react-router imported and called at component top. Routes correctly based on weak area type. |

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| TRAIN-V11-01: Difficulty recommendation on Train page | ✓ SATISFIED | Truth 1 verified. DifficultyRecommendation component with threshold-based recommendation (promote/demote/stay) and "Try it" CTA. |
| TRAIN-V11-02: Track completion stats on Learn page | ✓ SATISFIED | Truth 2 verified. TrackStats component showing completed/total, avg score, best score at top of each track. |
| TRAIN-V11-03: Weak area identification on Dashboard | ✓ SATISFIED | Truth 3 verified. WeakAreasCard identifies difficulties with avg<50 and weakest Learn levels, with "Practice this" CTA routing to appropriate page. |
| TRAIN-V11-04: Scenario variety indicator in Train mode | ✓ SATISFIED | Truth 4 verified. ScenarioVariety component shows unseen count with low-pool nudge when unseenCount<=3. |

### Anti-Patterns Found

None - all files are substantive implementations with proper error handling, no TODOs/FIXMEs, no console.log stubs, no empty implementations.

### Human Verification Required

None for goal achievement. All observable truths are structurally verified and wired correctly. The components will render when the user has training data (attempts, track_progress, scenarios_seen).

**Optional visual verification** (not blocking):
- Visual appearance of recommendation card, track stats, weak areas card
- Threshold tuning (MIN_ATTEMPTS=3, PROMOTE=70, DEMOTE=40, WEAK=50 are reasonable but may need adjustment after user testing)
- Text clarity of low-pool nudge message

---

**Verification Complete**
**Status:** All must-haves verified. Phase goal achieved.
**Verifier:** Claude (gsd-verifier)
**Verified:** 2026-02-04T19:57:15Z
