---
phase: 03-learn-and-train
plan: 02
subsystem: train
tags: [train, scenarios, countdown, a-b-branching, telegram-buttons, difficulty-filter]
requires:
  - 01-04 (routing shell, MainButton/SecondaryButton hooks)
  - 03-01 (query keys, feature directory pattern)
provides:
  - Static train pool with 20 scenarios (TRAIN_POOL)
  - Scenario pool hook with InsForge fallback (useScenarioPool)
  - Clock-based countdown timer hook (useCountdown)
  - Train page with difficulty filter -> scenario card flow
  - A/B branching component using native Telegram buttons (ABBranching)
affects:
  - 03-03 (scoring and feedback will extend Train page)
tech-stack:
  added: []
  patterns:
    - Clock-based timer using Date.now() + visibilitychange (drift-immune)
    - Static data fallback pattern for InsForge queries
    - A/B branching via MainButton + SecondaryButton Telegram native buttons
    - Step-based state machine for page flow (filter -> scenario)
key-files:
  created:
    - packages/webapp/src/features/train/data/scenarios.ts
    - packages/webapp/src/features/train/hooks/useScenarioPool.ts
    - packages/webapp/src/features/train/hooks/useCountdown.ts
    - packages/webapp/src/features/train/components/DifficultyFilter.tsx
    - packages/webapp/src/features/train/components/ScenarioCard.tsx
    - packages/webapp/src/features/train/components/TimerInput.tsx
    - packages/webapp/src/features/train/components/ABBranching.tsx
  modified:
    - packages/webapp/src/pages/Train.tsx
key-decisions:
  - openTelegramLink for bot deep links (native Telegram handling vs window.open)
  - Advisory-only timer (does NOT block submission on expiry)
  - ABBranching is infrastructure-ready, activates via branchingOptions field
duration: 6m
completed: 2026-02-03
---

# Phase 3 Plan 2: Train Mode Summary

**Train difficulty filter, random scenario cards, countdown timer, and A/B branching pattern using native Telegram buttons**

## Performance

- **Duration:** 6 minutes
- **Start:** 2026-02-03T19:39:38Z
- **End:** 2026-02-03T19:45:53Z
- **Tasks:** 2/2
- **Files created:** 7
- **Files modified:** 1

## Accomplishments

1. **Static train pool** -- Extracted all 20 scenarios from `data/scenarios.json` train_pool into TypeScript constants with camelCase key conversion (TRAIN_POOL)
2. **Scenario pool hook** -- `useScenarioPool(difficulty?)` queries InsForge `generated_scenarios` table with difficulty filter, falls back to static TRAIN_POOL when DB returns 0 rows or errors
3. **Countdown timer hook** -- `useCountdown(initialSeconds)` uses Date.now()-based timing immune to background drift, with visibilitychange event listener for accurate foreground recalculation
4. **DifficultyFilter** -- Easy/Medium/Hard/Random selector using Button component with accent/secondary variant toggling
5. **ScenarioCard** -- Displays persona (name, role, company, background), difficulty badge (color-coded), category tag, and situation text in styled blockquote
6. **TimerInput** -- MM:SS countdown with color shifts (accent -> warning at 30s -> error at 10s), text area for draft responses, MainButton deep links to bot via `openTelegramLink`
7. **ABBranching** -- Reusable A/B sales decision component using MainButton (Option A) + SecondaryButton (Option B), with visual confirmation on selection
8. **Train.tsx** -- Step-based state machine (filter -> scenario) with DifficultyFilter, random scenario selection from pool, ScenarioCard + TimerInput rendering, and conditional ABBranching via branchingOptions

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Static train pool + scenario pool hook + countdown timer hook | 0aebfa6 | scenarios.ts, useScenarioPool.ts, useCountdown.ts |
| 2 | Train components + A/B branching + sub-routed page | ba1d002 | DifficultyFilter.tsx, ScenarioCard.tsx, TimerInput.tsx, ABBranching.tsx, Train.tsx |

## Files Created

| File | Purpose |
|------|---------|
| `packages/webapp/src/features/train/data/scenarios.ts` | Static fallback train pool (20 scenarios from scenarios.json) |
| `packages/webapp/src/features/train/hooks/useScenarioPool.ts` | Hook combining DB generated_scenarios with static fallback |
| `packages/webapp/src/features/train/hooks/useCountdown.ts` | Clock-based countdown timer immune to background drift |
| `packages/webapp/src/features/train/components/DifficultyFilter.tsx` | Easy/Medium/Hard/Random selector buttons |
| `packages/webapp/src/features/train/components/ScenarioCard.tsx` | Persona details, difficulty badge, situation text display |
| `packages/webapp/src/features/train/components/TimerInput.tsx` | Countdown timer + text area + MainButton deep link to bot |
| `packages/webapp/src/features/train/components/ABBranching.tsx` | MainButton + SecondaryButton A/B decision pattern |

## Files Modified

| File | Changes |
|------|---------|
| `packages/webapp/src/pages/Train.tsx` | Replaced stub with step-based state machine (filter -> scenario) |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `openTelegramLink` for bot deep links | Native Telegram handling opens bot chat directly, better UX than window.open for t.me links |
| Advisory-only timer | Timer does NOT block submission on expiry (per research Open Question 2); avoids frustrating users on mobile |
| ABBranching infrastructure-ready | No existing scenarios have branchingOptions; component activates automatically when branching scenarios are added |
| Clock-based timing (Date.now) | Prevents drift when Telegram WebView is backgrounded; visibilitychange event recalculates on foreground return |

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

**For 03-03 (Scoring and feedback display):**
- Train.tsx step machine can be extended with a 'results' step for scoring display
- ScenarioCard and TimerInput are self-contained, scoring can be layered on top
- useScenarioPool provides the scenario data needed for scoring submission
- No blockers identified
