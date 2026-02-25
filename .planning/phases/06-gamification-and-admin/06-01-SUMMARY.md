---
phase: 06-gamification-and-admin
plan: 01
subsystem: ui
tags: [react, tailwind, gamification, badges, rarity, oklch]

# Dependency graph
requires:
  - phase: 02-dashboard-and-profile
    provides: "Badge evaluation hooks (useUserBadges), BadgeCollection component, badge definitions"
  - phase: 01-foundation-and-auth
    provides: "Design system with rarity tier oklch colors, Card/Skeleton UI components"
provides:
  - "BadgeCard component with rarity-tier visual styling (common/rare/epic/legendary)"
  - "BadgeWall component with 3-column grid, earned/locked states, glow effects"
  - "Gamification feature directory (features/gamification/)"
affects: [06-02-PLAN, 06-03-PLAN, 07-bot-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Feature-based component organization (features/gamification/components/)"
    - "Rarity-tier visual hierarchy: border color + icon color + glow shadow (epic/legendary)"

key-files:
  created:
    - "packages/webapp/src/features/gamification/components/BadgeCard.tsx"
    - "packages/webapp/src/features/gamification/components/BadgeWall.tsx"
  modified:
    - "packages/webapp/src/pages/Profile.tsx"

key-decisions:
  - "BadgeWall replaces BadgeCollection on Profile page (BadgeCollection preserved for compact use elsewhere)"
  - "3-column grid (grid-cols-3) for mobile-first badge display (8 badges = 3 rows)"
  - "Epic glow: shadow-[0_0_4px], Legendary glow: shadow-[0_0_8px] using CSS var tokens"
  - "Rarity label shown only on earned badges (locked badges show criteria description instead)"

patterns-established:
  - "Gamification feature directory: features/gamification/components/ for badge/reward UI"
  - "Rarity visual system: border-rarity-{tier}, text-rarity-{tier}, shadow glow for epic/legendary"

# Metrics
duration: 3min
completed: 2026-02-04
---

# Phase 6 Plan 01: Badge Wall & Rarity System Summary

**BadgeCard and BadgeWall components with 4-tier rarity styling (common/rare/epic/legendary), glow effects, earned/locked states, integrated into Profile page**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-04T10:53:15Z
- **Completed:** 2026-02-04T10:56:15Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- BadgeCard component with earned (full-color, rarity border, glow) and locked (grayscale, opacity-30, criteria hints) states
- BadgeWall component rendering all 8 badges in 3-column grid with loading/error/empty states
- Profile page upgraded from BadgeCollection to BadgeWall for richer rarity-styled display
- Epic and legendary badges get subtle glow effects using oklch rarity color tokens

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BadgeCard and BadgeWall components** - `9e23e41` (feat)
2. **Task 2: Integrate BadgeWall into Profile page** - `b95f271` (feat)

## Files Created/Modified
- `packages/webapp/src/features/gamification/components/BadgeCard.tsx` - Individual badge card with rarity-tier styling, earned/locked states, icon map, glow effects
- `packages/webapp/src/features/gamification/components/BadgeWall.tsx` - Full badge wall grid using useUserBadges() hook, loading/error/empty states
- `packages/webapp/src/pages/Profile.tsx` - Replaced BadgeCollection import with BadgeWall

## Decisions Made
- **BadgeWall replaces BadgeCollection on Profile:** Since BadgeWall is the upgraded version with rarity styling, it replaces BadgeCollection directly on the Profile page. BadgeCollection is preserved in its original location for potential compact use elsewhere (e.g., if a condensed badge preview is needed).
- **3-column grid layout:** `grid-cols-3` chosen for mobile-first display of 8 badges (3 rows, last row has 2 badges). This is wider than BadgeCollection's `grid-cols-4` to give more space for rarity labels and glow effects.
- **Rarity label on earned only:** Locked badges show criteria description text instead of rarity label, keeping focus on what the user needs to do to earn them.
- **Glow effects via CSS var tokens:** `shadow-[0_0_4px_var(--color-rarity-epic)]` and `shadow-[0_0_8px_var(--color-rarity-legendary)]` use the existing oklch tokens from globals.css for consistent rarity theming.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Gamification feature directory established for 06-02 (level-up, XP, streak animations)
- BadgeWall and BadgeCard can be extended with animation triggers when 06-02 adds celebration effects
- Profile page integration complete; Dashboard continues to use its own BadgePreview component

---
*Phase: 06-gamification-and-admin*
*Completed: 2026-02-04*
