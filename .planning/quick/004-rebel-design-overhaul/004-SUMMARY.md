---
quick_task: 004-rebel-design-overhaul
subsystem: ui
tags: [tailwindcss, oklch, css-animations, glassmorphism, design-tokens, gamification, pipeline]

# Dependency graph
requires:
  - phase: 17-lazyflow-ux-overhaul
    provides: smart landing focus, pipeline status progression, collapsible sections
  - phase: 06-gamification-admin
    provides: badge system, streak indicator, level-up overlay, leaderboard
provides:
  - Design token foundation (motion, elevation, pipeline colors, glassmorphic, typography)
  - Animated gamification bleeds (score drop-in, fire shimmer, badge pulse, spring entrance)
  - Neo-brutalist pipeline stage selector with per-status colors
  - Glassmorphic intelligence cards with signal-strength borders
  - Dashboard ambient mode with context-aware promoted CTAs
affects: [future visual polish, dark mode tuning, animation performance audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "oklch color space for all new color tokens"
    - "CSS-only animations via global keyframes + utility classes (no JS animation libraries)"
    - "Rarity-tier ambient glow pattern wrapping Card components"
    - "Pipeline accent color map shared between components via PIPELINE_ACCENT constant"

key-files:
  created: []
  modified:
    - packages/webapp/src/app/globals.css
    - packages/webapp/src/shared/ui/NavBar.tsx
    - packages/webapp/src/shared/ui/CollapsibleSection.tsx
    - packages/webapp/src/pages/Dashboard.tsx
    - packages/webapp/src/features/dashboard/components/ProgressCard.tsx
    - packages/webapp/src/features/dashboard/components/QuickActions.tsx
    - packages/webapp/src/features/dashboard/components/TodayActionsCard.tsx
    - packages/webapp/src/features/dashboard/components/LeaderboardWidget.tsx
    - packages/webapp/src/features/scoring/components/ScoreDisplay.tsx
    - packages/webapp/src/features/gamification/components/StreakIndicator.tsx
    - packages/webapp/src/features/gamification/components/BadgeCard.tsx
    - packages/webapp/src/features/gamification/components/LevelUpOverlay.tsx
    - packages/webapp/src/features/leads/types.ts
    - packages/webapp/src/features/leads/components/LeadStatusSelector.tsx
    - packages/webapp/src/features/leads/components/LeadCard.tsx
    - packages/webapp/src/features/leads/components/LeadDetail.tsx

key-decisions:
  - "All animations CSS-only via keyframes + utility classes (no framer-motion or spring JS libs)"
  - "Pipeline colors defined both as CSS custom properties AND inline oklch Tailwind classes for flexibility"
  - "PIPELINE_ACCENT shared constant in leads/types.ts to avoid DRY violations"
  - "Glassmorphic treatment uses inline styles for backdrop-filter (not Tailwind) for full control"
  - "Rarity ambient glow uses wrapper div pattern to avoid modifying Card component API"

patterns-established:
  - "Ambient gradient wrapper: conditional div wrapping Card based on data state (level-based rarity glow)"
  - "Promoted CTA pattern: QuickActions accepts primaryAction prop, renders full-width accent card above grid"
  - "Overline typography: .text-overline global utility class for section headers"
  - "Pipeline color bar: left-side colored strip inside Card padding='none' with flex layout"

# Metrics
duration: 6min
completed: 2026-02-06
---

# Quick Task 004: Rebel Design Overhaul Summary

**Direction C visual overhaul with oklch design tokens, spring-physics animations, rarity-coded gamification bleeds, neo-brutalist pipeline stages, and glassmorphic intelligence cards across 16 files**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-06T21:03:06Z
- **Completed:** 2026-02-06T21:08:50Z
- **Tasks:** 4/4 (Task 5 human-verify skipped per instructions)
- **Files modified:** 16

## Accomplishments

- Complete design token foundation: motion (7 tokens), elevation (4 levels), pipeline colors (6 statuses), glassmorphic (3 tokens), typography scale (6 sizes)
- 9 new CSS keyframe animations for gamification moments (score drop-in, gold flash, fire shimmer, badge pulse, spring entrance, etc.)
- Dashboard ambient mode with context-aware gradient backgrounds, promoted full-width CTA, and overline typography
- Neo-brutalist pipeline status selector with geometric blocks, per-status oklch colors, and pulse ring on active
- Glassmorphic intelligence section with frosted glass backdrop-filter and signal-strength-coded top border

## Task Commits

Each task was committed atomically:

1. **Task 1: Design Token Foundation + Typography + NavBar Enhancement** - `93a77d4` (feat)
2. **Task 2: Dashboard Ambient Mode + Quick Actions + TodayActions** - `af7c18d` (feat)
3. **Task 3: Gamification Rarity Bleeds** - `8003971` (feat)
4. **Task 4: Neo-Brutalist Pipeline + Glassmorphic Intelligence Cards** - `b08f8cb` (feat)

## Files Created/Modified

- `packages/webapp/src/app/globals.css` - Design tokens (motion, elevation, pipeline, glass, typography) + 9 keyframe animations + utility classes
- `packages/webapp/src/shared/ui/NavBar.tsx` - Animated active pill indicator, accent glow border-top
- `packages/webapp/src/shared/ui/CollapsibleSection.tsx` - Title bumped to 15px body size
- `packages/webapp/src/pages/Dashboard.tsx` - Ambient gradient headers per focus mode, primaryAction prop passing
- `packages/webapp/src/features/dashboard/components/ProgressCard.tsx` - Hero padding (p-6), rarity-coded ambient glow for levels 4+
- `packages/webapp/src/features/dashboard/components/QuickActions.tsx` - Promoted full-width accent CTA + 2-col grid for remaining actions
- `packages/webapp/src/features/dashboard/components/TodayActionsCard.tsx` - Overline header, larger touch targets (p-3), red left-border stripe for overdue
- `packages/webapp/src/features/dashboard/components/LeaderboardWidget.tsx` - Top 3 rarity-tier borders (legendary/epic/rare), colored position numbers
- `packages/webapp/src/features/scoring/components/ScoreDisplay.tsx` - Larger circle (h-44), spring drop-in, gold flash for 90+, floating XP
- `packages/webapp/src/features/gamification/components/StreakIndicator.tsx` - Fire shimmer when streak >= 3 days
- `packages/webapp/src/features/gamification/components/BadgeCard.tsx` - Earned badges pulse once on render
- `packages/webapp/src/features/gamification/components/LevelUpOverlay.tsx` - Spring entrance animation, modal shadow
- `packages/webapp/src/features/leads/types.ts` - PIPELINE_ACCENT color map for shared status colors
- `packages/webapp/src/features/leads/components/LeadStatusSelector.tsx` - Geometric blocks with pipeline colors, pulse ring active, dashed border suggested
- `packages/webapp/src/features/leads/components/LeadCard.tsx` - Left-side status color bar
- `packages/webapp/src/features/leads/components/LeadDetail.tsx` - Glassmorphic intelligence section, signal-strength border, enhanced key concern box

## Decisions Made

- All animations use CSS-only approach (keyframes + utility classes) rather than JS animation libraries, keeping zero new dependencies
- Pipeline colors defined in both CSS custom properties (for future use) and inline oklch Tailwind arbitrary values (for immediate use in classes)
- PIPELINE_ACCENT constant extracted to leads/types.ts as shared source of truth for status colors
- Glassmorphic backdrop-filter applied via inline styles rather than Tailwind classes for cross-browser control (WebkitBackdropFilter)
- Rarity ambient glow uses wrapper div pattern rather than modifying Card component API (preserving backward compatibility)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused PIPELINE_ACCENT import in LeadStatusSelector**
- **Found during:** Task 4 (LeadStatusSelector)
- **Issue:** TypeScript error TS6133 -- PIPELINE_ACCENT was imported but only the inline pipelineColors map was used
- **Fix:** Removed the unused import; LeadStatusSelector uses its own inline pipelineColors map with Tailwind class strings
- **Files modified:** packages/webapp/src/features/leads/components/LeadStatusSelector.tsx
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** b08f8cb (Task 4 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor import cleanup. No scope creep.

## Issues Encountered

None -- all 4 tasks built cleanly on first attempt (except the unused import caught by TypeScript).

## User Setup Required

None - no external service configuration required. Pure visual changes.

## Next Phase Readiness

- Visual overhaul complete across all major TMA screens
- Task 5 (human visual review on device) should be done before merging to main
- Dark mode compatibility should be verified on actual Telegram dark theme
- Animation performance should be spot-checked on lower-end mobile devices
- Human tasks noted in plan (badge artwork, display font, pipeline icons, motion review) are optional polish items

---
*Quick Task: 004-rebel-design-overhaul*
*Completed: 2026-02-06*
