# Phase 3: Learn & Train - Research

**Researched:** 2026-02-03
**Domain:** Structured learning UI, scenario practice, countdown timers, animated scoring, TMA-to-bot response submission, InsForge data fetching
**Confidence:** HIGH

## Summary

Phase 3 transforms the Learn and Train stub pages into the core training experience of Deal Quest. This involves two distinct but related features: (1) **Learn mode** -- structured tracks with levels containing lessons and practice scenarios, and (2) **Train mode** -- random timed scenarios with difficulty filtering. Both share a common scoring/feedback display layer and the critical question of how user responses submitted in the TMA reach the bot for AI scoring.

The primary technical challenge is the **response submission architecture**. The TMA is a display layer; the bot handles all AI/LLM scoring. The TMA cannot call LLM APIs directly. Three patterns exist for TMA-to-bot communication: (a) `sendData()` which closes the app (unacceptable for our UX), (b) `answerWebAppQuery` which requires inline keyboard launch, or (c) **write to InsForge, bot polls/subscribes**. Since the bot already reads from InsForge, the most viable approach is: TMA writes a "pending response" row to an `attempts` or dedicated table in InsForge, then polls for the scoring result. However, this requires bot-side changes (polling or realtime subscription) which are **out of scope** for Phase 3 (TMA is display layer). The pragmatic solution: **Phase 3 displays existing bot-scored data only**. Users practice via the bot (which already works), and the TMA shows their track progress, lesson content, scenario details, and past scores/feedback. Response input UI can be built as a future enhancement when bot integration (Phase 7) wires it together.

After analyzing the bot handlers, the data already stored in InsForge (`track_progress`, `attempts`, `generated_scenarios`, `scenarios_seen`), and the existing TMA patterns from Phases 1-2, the recommended approach is: **read-only display of all Learn/Train data from InsForge, with rich visualization of scores and feedback, plus scenario browsing UI**. The response submission UX (text input, timer, submit) is built but routes to the bot via deep link as an interim solution.

**Primary recommendation:** Build Learn and Train as read-and-browse experiences from InsForge data. For response submission, use a deep link to the bot (`tg://resolve?domain={bot_username}&start=learn_{level_id}` or `&start=train_{difficulty}`) that opens the bot chat for the actual interaction, then the TMA refreshes to show the updated results. This keeps the TMA as a display layer while providing immediate value.

## Standard Stack

### Core (Already Installed -- No New Dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | ^5.90.x | Data fetching, caching, polling for score updates | Already configured |
| @insforge/sdk | latest | PostgREST queries for track_progress, attempts, generated_scenarios | Already configured |
| zustand | ^5.0.x | UI state: active track, selected difficulty, timer state | Already used for auth |
| react-router | ^7.12.x | Nested sub-routes within /learn/* and /train/* | Already configured with wildcards |
| lucide-react | ^0.562.x | Icons for levels, difficulty, scoring, timer | Already installed |
| class-variance-authority | ^0.7.x | Component variants for difficulty badges, score displays | Already installed |
| @telegram-apps/sdk-react | ^3.3.9 | MainButton for actions, SecondaryButton for A/B branching, openLink for deep links | Already installed |

### Supporting (No New Dependencies)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @deal-quest/shared | workspace:* | TrackProgressRow, AttemptRow, GeneratedScenarioRow types, DIFFICULTY_LABELS, PASSING_SCORE | All data display |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom countdown hook | react-timer-hook / react-countdown-hook | Extra dependency for a simple useEffect+setInterval -- not worth it |
| framer-motion for score animations | CSS @property + Tailwind keyframes | framer-motion is 32KB+ and only needed for one animation; CSS @property can animate integers natively |
| react-circular-progressbar | Custom SVG circle | Single-use component; a 20-line SVG is simpler than a dependency |

**Installation:** No new packages needed. Phase 1 and 2 installed everything required.

## Architecture Patterns

### Recommended Project Structure
```
packages/webapp/src/
  features/
    learn/
      hooks/
        useTrackProgress.ts     # Track progress for all levels (track_progress table)
        useLevelDetail.ts       # Single level lesson + scenario from static data
        useLevelAttempts.ts     # Past attempts for a specific learn scenario
      components/
        TrackList.tsx            # Track overview with level cards
        LevelCard.tsx            # Individual level: icon, name, status, best score
        LessonView.tsx           # Lesson content: title, text, key points
        ScenarioPractice.tsx     # Scenario display with persona card + practice CTA
        ScoreFeedback.tsx        # Score display with breakdown (shared with Train)
      data/
        tracks.ts               # Static track/level/lesson data (mirrors scenarios.json)
    train/
      hooks/
        useScenarioPool.ts      # Available scenarios from generated_scenarios table
        useScenariosSeen.ts     # Seen scenario IDs for current user
        useTrainAttempts.ts     # Recent train attempts with scores
      components/
        DifficultyFilter.tsx    # Easy/Medium/Hard/Random selector
        ScenarioCard.tsx        # Persona details + situation text + difficulty badge
        TimerInput.tsx          # Countdown timer + text area + submit
        ScoreResults.tsx        # Animated score, XP, feedback, quick actions
    scoring/
      components/
        ScoreDisplay.tsx        # Animated score circle/counter (shared)
        FeedbackBreakdown.tsx   # Criteria breakdown list (shared)
        StrengthsList.tsx       # Strengths + improvements (shared)
        IdealComparison.tsx     # What ideal response did differently (shared)
  pages/
    Learn.tsx                   # Replaced: now renders sub-routes or TrackList
    Train.tsx                   # Replaced: now renders scenario flow
```

### Pattern 1: Nested Sub-Routes with React Router v7
**What:** Learn and Train pages have multiple views (list, detail, practice, results). Use React Router wildcard routes already configured.
**When to use:** Any page with multiple distinct views.
**Example:**
```typescript
// pages/Learn.tsx
import { Routes, Route } from 'react-router';
import { TrackList } from '@/features/learn/components/TrackList';
import { LevelDetail } from '@/features/learn/components/LevelDetail';
import { LevelResults } from '@/features/learn/components/LevelResults';

export default function Learn() {
  return (
    <Routes>
      <Route index element={<TrackList />} />
      <Route path="level/:levelId" element={<LevelDetail />} />
      <Route path="level/:levelId/results" element={<LevelResults />} />
    </Routes>
  );
}
```

The Router already has `<Route path="/learn/*" element={<Learn />} />` with the wildcard suffix, so nested `<Routes>` inside Learn works without changes.

### Pattern 2: Static Data + Dynamic DB Data Merge
**What:** Track structure (levels, lessons, scenario text) is static (from scenarios.json). User progress (scores, status, attempts) is dynamic (from InsForge). Merge them at the hook level.
**When to use:** Learn mode where track content is fixed but progress is per-user.
**Example:**
```typescript
// features/learn/hooks/useTrackProgress.ts
import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { useAuthStore } from '@/features/auth/store';
import { queryKeys } from '@/lib/queries';
import { TRACKS } from '../data/tracks';
import type { TrackProgressRow } from '@deal-quest/shared';

export interface LevelWithProgress {
  id: string;
  name: string;
  lesson: { title: string; content: string; keyPoints: string[] };
  scenario: { persona: ScenarioPersona; situation: string; difficulty: number };
  status: 'locked' | 'unlocked' | 'completed';
  bestScore: number;
  attemptsCount: number;
}

export function useTrackProgress(trackId = 'foundations') {
  const telegramId = useAuthStore((s) => s.telegramId);
  const track = TRACKS[trackId];

  return useQuery({
    queryKey: queryKeys.trackProgress.byTrack(telegramId!, trackId),
    queryFn: async (): Promise<LevelWithProgress[]> => {
      const { data, error } = await getInsforge()
        .database.from('track_progress')
        .select('level_id, status, best_score, attempts_count')
        .eq('telegram_id', telegramId!)
        .eq('track_id', trackId)
        .order('level_id', { ascending: true });

      if (error) throw error;

      const progressMap = new Map(
        (data ?? []).map((row: TrackProgressRow) => [row.level_id, row])
      );

      return track.levels.map((level) => {
        const progress = progressMap.get(level.id);
        return {
          ...level,
          status: (progress?.status as 'locked' | 'unlocked' | 'completed') ?? 'locked',
          bestScore: progress?.best_score ?? 0,
          attemptsCount: progress?.attempts_count ?? 0,
        };
      });
    },
    enabled: !!telegramId,
  });
}
```

### Pattern 3: Deep Link to Bot for Response Submission
**What:** When user wants to practice a scenario, open the bot chat with a deep link pre-loaded to the correct scenario.
**When to use:** Any response submission that needs AI scoring.
**Example:**
```typescript
// Using Telegram SDK to open bot chat
import { openLink } from '@telegram-apps/sdk-react';

function handlePractice(levelId: string) {
  // Deep link opens bot chat with /start learn_{levelId}
  const botUsername = import.meta.env.VITE_BOT_USERNAME;
  const url = `https://t.me/${botUsername}?start=learn_${levelId}`;

  if (openLink.isAvailable()) {
    openLink(url, { tryInstantView: false });
  } else {
    window.open(url, '_blank');
  }
}
```

### Pattern 4: Query Key Factory Extension
**What:** Extend the existing queryKeys factory with Learn and Train specific keys.
**When to use:** All new TanStack Query hooks.
**Example:**
```typescript
// lib/queries.ts - additions
export const queryKeys = {
  // ... existing users, attempts, badges keys ...
  trackProgress: {
    all: ['trackProgress'] as const,
    byTrack: (telegramId: number, trackId: string) =>
      ['trackProgress', telegramId, trackId] as const,
    level: (telegramId: number, trackId: string, levelId: string) =>
      ['trackProgress', telegramId, trackId, levelId] as const,
  },
  scenarios: {
    all: ['scenarios'] as const,
    pool: (difficulty?: number) => ['scenarios', 'pool', difficulty] as const,
    seen: (telegramId: number) => ['scenarios', 'seen', telegramId] as const,
  },
} as const;
```

### Pattern 5: Animated Score Counter with CSS @property
**What:** Use CSS `@property` to animate an integer from 0 to the actual score, combined with Tailwind keyframes.
**When to use:** TRAIN-04 animated scoring results.
**Example:**
```css
/* In globals.css */
@property --score-value {
  syntax: '<integer>';
  initial-value: 0;
  inherits: false;
}

@keyframes countUp {
  from { --score-value: 0; }
}

.score-counter {
  animation: countUp 1.5s ease-out forwards;
  counter-set: score var(--score-value);
  font-variant-numeric: tabular-nums;
}

.score-counter::after {
  content: counter(score);
}
```

```typescript
// React component usage
function AnimatedScore({ score }: { score: number }) {
  return (
    <span
      className="score-counter text-4xl font-bold text-accent"
      style={{ '--score-value': score } as React.CSSProperties}
    />
  );
}
```

### Pattern 6: Countdown Timer Hook
**What:** Custom useCountdown hook for timed responses.
**When to use:** TRAIN-02 timed response input.
**Example:**
```typescript
// features/train/hooks/useCountdown.ts
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseCountdownReturn {
  secondsLeft: number;
  isRunning: boolean;
  isExpired: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
}

export function useCountdown(initialSeconds: number): UseCountdownReturn {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) {
      clearTimer();
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearTimer;
  }, [isRunning, secondsLeft, clearTimer]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(() => {
    clearTimer();
    setSecondsLeft(initialSeconds);
    setIsRunning(false);
  }, [initialSeconds, clearTimer]);

  return {
    secondsLeft,
    isRunning,
    isExpired: secondsLeft <= 0,
    start,
    pause,
    reset,
  };
}
```

### Anti-Patterns to Avoid
- **Calling LLM APIs from the TMA:** The TMA is a display layer. All AI scoring goes through the bot. Never add OpenRouter/Claude API calls to the frontend.
- **Hardcoding scenario content in components:** Scenario text, personas, and lessons should live in a data file (mirrors scenarios.json), not inlined in JSX. This makes it maintainable and consistent with the bot.
- **Building complex multi-step form state without session resilience:** Use `useSessionResilience` hook (already built in Phase 1) for any in-progress state (draft responses, selected difficulty, timer position).
- **Fetching scenarios.json from the filesystem:** The TMA runs in a browser. It cannot read the bot's `data/scenarios.json` file. Static data must be inlined as TypeScript constants in the TMA codebase.
- **Using setInterval without cleanup:** Always store interval refs and clear in useEffect cleanup. Memory leaks in WebView are harder to debug than in browser.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Countdown timer | Raw setTimeout chains | Custom useCountdown hook with start/pause/reset | Edge cases: tab backgrounding, cleanup, 0-boundary |
| Score animation | JS requestAnimationFrame counter | CSS @property integer animation | Browser-native, no re-renders, smooth 60fps |
| Difficulty filter state | URL search params parsing | Zustand store or useState with URL sync | Simple local state, no need for URL persistence |
| Level lock/unlock logic | Custom status derivation | Read `status` column directly from `track_progress` table | Bot already manages lock/unlock -- just display it |
| Feedback JSON parsing | Manual object property access | Typed interface for feedback_json structure | Bot's trainer agent outputs a known JSON shape |
| Query cache invalidation | Manual refetch calls | queryClient.invalidateQueries with query key factory | TanStack Query handles deduplication and timing |
| Sub-route navigation | Manual path building | react-router `useNavigate` with relative paths | Already configured with wildcard routes |

**Key insight:** The bot already handles ALL business logic (scoring, XP, level progression, scenario selection). The TMA reads the results. The primary work is data fetching hooks + visual components + navigation between views.

## Common Pitfalls

### Pitfall 1: scenarios.json is Not Accessible from the Browser
**What goes wrong:** Trying to fetch `/data/scenarios.json` from the TMA -- this file lives on the server filesystem and is gitignored per the CLAUDE.md structure notes.
**Why it happens:** The bot loads scenarios from the filesystem. Developers assume the TMA can too.
**How to avoid:** Extract the static structure (track names, level names, lesson content, scenario text/personas) into a TypeScript constant file: `features/learn/data/tracks.ts` and `features/train/data/scenarios.ts`. These are compiled into the bundle. For generated scenarios (from the `generated_scenarios` table), fetch from InsForge.
**Warning signs:** 404 errors on scenario fetch, or empty scenario data in the UI.

### Pitfall 2: TMA Cannot Submit Responses for AI Scoring
**What goes wrong:** Building a text input + submit button that has nowhere to send the response for scoring. The TMA cannot call LLM APIs, and `sendData()` closes the app.
**Why it happens:** The architectural constraint (TMA = display layer) conflicts with the UX requirement (submit responses from TMA).
**How to avoid:** Two approaches:
1. **Phase 3 approach (recommended):** Deep link to bot for response submission. TMA shows "Practice in Bot" button that opens `tg://resolve?domain={bot}&start=learn_{levelId}`. After scoring in the bot, user returns to TMA and sees updated results (query refetch on focus).
2. **Future approach (Phase 7):** Build an InsForge Edge Function that accepts the response, writes it to a queue table, bot processes it, writes results back, TMA polls for completion.
**Warning signs:** Trying to implement `sendData()` (closes the app), trying to call OpenRouter from the frontend, or building a custom backend.

### Pitfall 3: feedback_json Has Inconsistent Structure
**What goes wrong:** The `feedback_json` column in `attempts` is `Record<string, unknown>` because the LLM output varies slightly between runs. Accessing `feedback_json.breakdown[0].criterion` crashes when the LLM returns a slightly different shape.
**Why it happens:** LLM outputs are non-deterministic. The trainer agent prompt specifies a JSON schema, but the LLM may omit fields, use different keys, or return arrays vs objects.
**How to avoid:** Define a TypeScript interface for the expected feedback shape but access ALL fields with optional chaining and fallbacks:
```typescript
interface FeedbackJson {
  total_score?: number;
  xp_earned?: number;
  breakdown?: Array<{
    criterion?: string;
    score?: number;
    max?: number;
    feedback?: string;
    user_quote?: string | null;
    suggestion?: string | null;
  }>;
  strengths?: string[];
  improvements?: string[];
  pattern_observation?: {
    recurring_issue?: string;
    improving_area?: string;
    suggestion?: string;
  };
  ideal_response_comparison?: {
    what_ideal_did_differently?: string[];
  };
}
```
Always use `feedback?.breakdown?.map(...)` not `feedback.breakdown.map(...)`.
**Warning signs:** Blank feedback sections, "Cannot read property of undefined" errors.

### Pitfall 4: Generated Scenarios Table May Be Empty
**What goes wrong:** The `generated_scenarios` table might have 0 rows if the scenario generation feature hasn't been used. The Train mode UI shows "No scenarios available."
**Why it happens:** Generated scenarios are created by a separate bot process. New deployments or test environments won't have any.
**How to avoid:** The bot's train handler also uses a static `train_pool` from `scenarios.json`. The TMA should similarly have a static fallback pool of scenarios. If `generated_scenarios` returns 0 rows, show the static pool. Always check `data.length` before rendering.
**Warning signs:** Empty train page on fresh installations.

### Pitfall 5: Track Not Initialized for TMA-Only Users
**What goes wrong:** The `track_progress` table only has rows for users who have run `/learn` in the bot (which calls `init_track`). Users who go directly to the TMA Learn page will have 0 rows.
**Why it happens:** Track initialization is done in the bot handler, not on user creation.
**How to avoid:** Handle the "no track_progress rows" case in the TMA by showing all levels with their static data and defaulting status: first level "unlocked", rest "locked". This matches what the bot would initialize. Do NOT try to write initialization rows from the TMA -- that's the bot's responsibility.
**Warning signs:** Learn page showing 0 levels, or showing all levels as "locked" with no way to start.

### Pitfall 6: Timer Drift When App is Backgrounded
**What goes wrong:** setInterval-based countdown drifts when the Telegram WebView is backgrounded. The timer shows wrong remaining time when user returns.
**Why it happens:** JavaScript timers pause or slow down when the page is not visible.
**How to avoid:** Store the timer's `startTime` (Date.now()) and `durationMs`, then compute remaining time as `durationMs - (Date.now() - startTime)` on every tick and on visibility change. This clock-based approach is immune to drift.
**Warning signs:** Timer showing more time remaining than expected after backgrounding.

### Pitfall 7: SecondaryButton Conflicts Between Pages
**What goes wrong:** Both Learn and Train use Telegram buttons (MainButton for submit, SecondaryButton for A/B branching). If the user navigates between pages, the buttons from the previous page persist.
**Why it happens:** The `useMainButton` and `useSecondaryButton` hooks hide on unmount, but if the component tree doesn't unmount cleanly (React.lazy + Suspense), ghost buttons can appear.
**How to avoid:** The existing hooks already have unmount cleanup (`setParams({ isVisible: false })` in useEffect return). Ensure every page that uses these buttons has them within a component that properly unmounts. Test navigation between Learn and Train to verify cleanup.
**Warning signs:** "Submit Response" button appearing on the Train difficulty selection screen.

## Code Examples

### InsForge Query: Fetch Track Progress
```typescript
// Source: Existing codebase pattern from useUserProgress.ts + TrackProgressRow type
const { data, error } = await getInsforge()
  .database.from('track_progress')
  .select('id, level_id, status, best_score, attempts_count, completed_at')
  .eq('telegram_id', telegramId)
  .eq('track_id', 'foundations')
  .order('level_id', { ascending: true });
```

### InsForge Query: Fetch Generated Scenarios with Difficulty Filter
```typescript
// Source: GeneratedScenarioRow type + bot's train handler filter logic
const { data, error } = await getInsforge()
  .database.from('generated_scenarios')
  .select('scenario_id, category, difficulty, persona, situation, scoring_focus, ideal_response')
  .eq('difficulty', difficulty) // 1=Easy, 2=Medium, 3=Hard; omit for Random
  .order('created_at', { ascending: false })
  .limit(50);
```

### InsForge Query: Fetch Attempt with Feedback for a Scenario
```typescript
// Source: AttemptRow type + bot's attempt_repo pattern
const { data, error } = await getInsforge()
  .database.from('attempts')
  .select('id, scenario_id, mode, score, xp_earned, feedback_json, created_at')
  .eq('telegram_id', telegramId)
  .eq('scenario_id', scenarioId)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();
```

### InsForge Query: Fetch Seen Scenario IDs
```typescript
// Source: ScenarioSeenRow type
const { data, error } = await getInsforge()
  .database.from('scenarios_seen')
  .select('scenario_id')
  .eq('telegram_id', telegramId);

const seenIds = new Set((data ?? []).map((row) => row.scenario_id));
```

### Typed Feedback JSON Interface
```typescript
// features/scoring/types.ts
// Based on trainer_agent.md output format specification

export interface ScoreBreakdownItem {
  criterion: string;
  score: number;
  max: number;
  feedback: string;
  user_quote?: string | null;
  suggestion?: string | null;
}

export interface PatternObservation {
  recurring_issue?: string;
  improving_area?: string;
  suggestion?: string;
}

export interface IdealComparison {
  what_ideal_did_differently?: string[];
}

export interface FeedbackData {
  total_score: number;
  xp_earned: number;
  breakdown?: ScoreBreakdownItem[];
  strengths?: string[];
  improvements?: string[];
  pattern_observation?: PatternObservation;
  ideal_response_comparison?: IdealComparison;
}

/** Safely parse feedback_json from AttemptRow */
export function parseFeedback(json: Record<string, unknown>): FeedbackData {
  return {
    total_score: typeof json.total_score === 'number' ? json.total_score : 0,
    xp_earned: typeof json.xp_earned === 'number' ? json.xp_earned : 0,
    breakdown: Array.isArray(json.breakdown) ? json.breakdown : undefined,
    strengths: Array.isArray(json.strengths) ? json.strengths : undefined,
    improvements: Array.isArray(json.improvements) ? json.improvements : undefined,
    pattern_observation: json.pattern_observation as PatternObservation | undefined,
    ideal_response_comparison: json.ideal_response_comparison as IdealComparison | undefined,
  };
}
```

### Static Track Data (Replaces scenarios.json for TMA)
```typescript
// features/learn/data/tracks.ts
// Extracted from data/scenarios.json -- static content compiled into bundle

export interface TrackLevel {
  id: string;
  name: string;
  lesson: {
    title: string;
    content: string;
    keyPoints: string[];
  };
  scenario: {
    id: string;
    persona: {
      name: string;
      role: string;
      company: string;
      background: string;
      context?: string;
    };
    situation: string;
    difficulty: number;
    timeLimitSeconds?: number;
    idealResponse: string;
    commonMistakes?: string[];
  };
}

export interface Track {
  id: string;
  name: string;
  description: string;
  levels: TrackLevel[];
}

export const TRACKS: Record<string, Track> = {
  foundations: {
    id: 'foundations',
    name: 'Foundations',
    description: 'Master the basics of GetDeal.ai positioning',
    levels: [
      {
        id: '1.1',
        name: 'What is GetDeal.ai?',
        lesson: {
          title: 'The Core Identity',
          content: 'GetDeal.ai is an M&A marketplace for AI companies...',
          keyPoints: [
            'M&A marketplace, NOT fundraising',
            'Full exits or 20%+ strategic stakes',
            'AI companies specifically (Seed to Series B)',
            'Buyers: Corporates, PE, Late-Stage VCs, Family Offices, Funded Companies',
          ],
        },
        scenario: {
          id: 'learn_1_1',
          persona: {
            name: 'Alex Thompson',
            role: 'Partner at Sequoia',
            company: 'Sequoia Capital',
            background: '20 years in VC, board member of 12 AI companies',
            context: 'Conference networking event, cocktails in hand',
          },
          situation: "You're at a VC conference. Alex approaches you...",
          difficulty: 1,
          timeLimitSeconds: 60,
          idealResponse: 'Not quite - we\'re actually the opposite...',
          commonMistakes: [
            'Comparing to fundraising platforms',
            'Being too vague about buyer types',
          ],
        },
      },
      // ... remaining levels extracted from scenarios.json
    ],
  },
};
```

### Deep Link to Bot for Practice
```typescript
// features/learn/components/ScenarioPractice.tsx
import { useCallback } from 'react';
import { openLink } from '@telegram-apps/sdk-react';
import { useMainButton } from '@/shared/hooks/useMainButton';

function ScenarioPractice({ levelId }: { levelId: string }) {
  const botUsername = import.meta.env.VITE_BOT_USERNAME;

  const handlePractice = useCallback(() => {
    const url = `https://t.me/${botUsername}?start=learn_${levelId}`;
    if (openLink.isAvailable()) {
      openLink(url, { tryInstantView: false });
    }
  }, [botUsername, levelId]);

  useMainButton({
    text: 'Practice in Bot',
    onClick: handlePractice,
  });

  return (
    <div>{/* Scenario details display */}</div>
  );
}
```

### Score Display with Animated Counter
```typescript
// features/scoring/components/ScoreDisplay.tsx
import { cn } from '@/shared/lib/cn';
import { Badge } from '@/shared/ui';
import { PASSING_SCORE } from '@deal-quest/shared';

interface ScoreDisplayProps {
  score: number;
  xpEarned: number;
  animate?: boolean;
}

export function ScoreDisplay({ score, xpEarned, animate = true }: ScoreDisplayProps) {
  const passed = score >= PASSING_SCORE;

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      {/* Circular score indicator */}
      <div className="relative h-28 w-28">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            strokeWidth="8"
            className="stroke-surface-secondary"
          />
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 264} 264`}
            className={cn(
              'transition-[stroke-dasharray] duration-1500 ease-out',
              passed ? 'stroke-success' : 'stroke-warning',
            )}
            style={animate ? { strokeDasharray: '0 264', animation: 'scoreArc 1.5s ease-out forwards' } : undefined}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              'text-3xl font-bold',
              animate && 'score-counter',
              passed ? 'text-success' : 'text-warning',
            )}
            style={animate ? { '--score-value': score } as React.CSSProperties : undefined}
          >
            {animate ? '' : score}
          </span>
          <span className="text-xs text-text-hint">/100</span>
        </div>
      </div>

      {/* XP earned */}
      <Badge variant={passed ? 'success' : 'warning'}>
        +{xpEarned} XP
      </Badge>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JS requestAnimationFrame counters | CSS @property integer animation | CSS @property widely supported since 2024 | No JS re-renders, smooth 60fps, 0 dependency |
| Complex TMA-bot two-way messaging | Deep link + data refresh pattern | Standard TMA pattern | Simple, reliable, works within display-layer constraint |
| Full-page route changes | React Router v7 nested Routes inside wildcard | Already configured in Phase 1 | Smooth sub-page navigation within /learn/* and /train/* |
| Polling for data updates | TanStack Query refetchOnWindowFocus | Already configured | Automatic refresh when user returns from bot |

**Deprecated/outdated:**
- `Telegram.WebApp.sendData()`: Only works for keyboard-button-launched TMAs, closes the app on send. Not suitable for inline/menu-button TMAs like Deal Quest.
- `requestAnimationFrame`-based number counters: CSS @property handles integer animation natively now.

## Open Questions

1. **Bot Deep Link Parsing for Learn Levels**
   - What we know: The bot's /start handler likely doesn't parse `learn_{levelId}` deep link params yet. The existing /learn command shows track overview.
   - What's unclear: Whether the bot needs modification to accept `start=learn_1.1` and jump directly to that level's scenario.
   - Recommendation: For Phase 3, use a simple "Practice in Bot" button that opens `/learn` in the bot (generic deep link). The user navigates to the specific level in the bot. Phase 7 (Bot Integration) handles deep link parameter routing.

2. **Timer Duration Source**
   - What we know: `scenarios.json` has `time_limit_seconds: 60` on learn scenarios. The bot's train handler doesn't enforce time limits.
   - What's unclear: Should the TMA enforce time limits (prevent submission after timeout), or are they advisory?
   - Recommendation: Display timer as advisory (visual countdown) but do NOT prevent submission. The bot doesn't enforce it, so the TMA shouldn't either. Timer creates urgency but isn't a hard gate.

3. **A/B Sales Decision Branching (TRAIN-06)**
   - What we know: SecondaryButton is configured at position 'left'. TRAIN-06 requires A/B sales decision branching via native Telegram buttons.
   - What's unclear: What triggers the A/B branching? The scenarios.json doesn't have branching data. This might be a future scenario type.
   - Recommendation: Build the SecondaryButton integration as a reusable pattern (two options, one on MainButton, one on SecondaryButton). Wire it up when branching scenarios exist. For Phase 3, show the pattern with placeholder data if branching scenarios aren't available yet.

4. **Query Refetch After Bot Interaction**
   - What we know: When user returns from bot (after practicing), the TMA should show updated scores. TanStack Query's `refetchOnWindowFocus` is enabled by default.
   - What's unclear: Whether `refetchOnWindowFocus` triggers when returning from a deep link to the bot within Telegram (technically the same app, different WebView).
   - Recommendation: Also subscribe to `miniApp.isActive` signal (used by `useSessionResilience`) to trigger `queryClient.invalidateQueries()` when the TMA regains focus.

5. **Static Scenario Data Maintenance**
   - What we know: The bot reads from `data/scenarios.json` (gitignored). The TMA needs this data as TypeScript constants.
   - What's unclear: How to keep the TMA's static data in sync with scenarios.json changes.
   - Recommendation: For now, manually extract data from scenarios.json into the TypeScript file. Document the duplication. In Phase 7, consider a build-time script that converts scenarios.json to TypeScript, or serve scenario data from an InsForge table.

## Sources

### Primary (HIGH confidence)
- Existing TMA codebase: `packages/webapp/src/` -- all code patterns, component structure, hooks, design tokens, Router configuration verified from source
- Bot handlers: `bot/handlers/learn.py`, `bot/handlers/train.py` -- exact data flow, scoring logic, InsForge queries, state management verified from source
- Database types: `packages/webapp/src/types/tables.ts` -- TrackProgressRow, AttemptRow, GeneratedScenarioRow, ScenarioSeenRow verified from source
- Trainer agent prompt: `prompts/trainer_agent.md` -- exact feedback_json output format specification verified from source
- `data/scenarios.json` -- exact track structure, level data, scenario format, train pool format verified from source
- Phase 2 research: `.planning/phases/02-dashboard-and-profile/02-RESEARCH.md` -- established patterns for feature hooks, query keys, component structure

### Secondary (MEDIUM confidence)
- [Telegram Mini Apps docs](https://core.telegram.org/bots/webapps) -- sendData limitations, deep link patterns, WebApp API
- [Cruip - Animated Number Counter with Tailwind CSS](https://cruip.com/how-to-make-an-animated-number-counter-with-tailwind-css/) -- CSS @property integer animation technique
- [useHooks - useCountdown](https://usehooks.com/usecountdown) -- countdown timer hook pattern

### Tertiary (LOW confidence)
- CSS @property browser support for Telegram WebView -- verified in Chrome (which WebView uses) but not tested in TMA specifically
- `refetchOnWindowFocus` behavior in TMA context -- may need supplementation with miniApp.isActive

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed, no new dependencies needed
- Architecture: HIGH - Follows exact patterns from Phase 1 and 2, nested routes already configured, feature folder structure established
- Data model: HIGH - All InsForge table schemas verified from source types, bot handler queries verified from Python source
- Response submission: MEDIUM - Deep link approach is proven TMA pattern, but requires Phase 7 for full integration
- Animations: MEDIUM - CSS @property works in Chrome/WebView, but untested in Telegram WebView specifically
- Pitfalls: HIGH - Identified from reading actual codebase (scenarios.json inaccessibility, feedback_json variability, track initialization gap)

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (30 days -- stable domain, no library changes expected)
