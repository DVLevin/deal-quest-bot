---
phase: 01-foundation-and-auth
plan: 03
subsystem: design-system
tags: [tailwind-v4, design-tokens, cva, ui-components, telegram-theme, safe-area, navbar]

requires:
  - 01-01 (monorepo scaffold, Tailwind v4 + Vite plugin, dependencies)
provides:
  - Tailwind v4 @theme design tokens with Telegram theme var mapping
  - cn() utility for class merging (clsx + tailwind-merge)
  - Base UI components (Button, Card, Badge, Skeleton) with CVA variants
  - NavBar with 5 navigation items and active state highlighting
  - AppLayout page shell with safe area padding
affects:
  - 01-04 (routing shell will use AppLayout to wrap pages)
  - 02-* (dashboard pages use Button, Card, Badge, Skeleton)
  - All future phases (every page uses design tokens and AppLayout)

tech-stack:
  added: []
  patterns:
    - CVA (class-variance-authority) for component variant props
    - cn() utility combining clsx + tailwind-merge for class merging
    - Tailwind v4 @theme directive for CSS-first design tokens
    - Telegram theme CSS var mapping with fallback values
    - Telegram SDK viewport CSS vars for safe area (not env())

key-files:
  created:
    - deal-quest-bot/packages/webapp/src/app/globals.css
    - deal-quest-bot/packages/webapp/src/shared/lib/cn.ts
    - deal-quest-bot/packages/webapp/src/shared/ui/Button.tsx
    - deal-quest-bot/packages/webapp/src/shared/ui/Card.tsx
    - deal-quest-bot/packages/webapp/src/shared/ui/Badge.tsx
    - deal-quest-bot/packages/webapp/src/shared/ui/Skeleton.tsx
    - deal-quest-bot/packages/webapp/src/shared/ui/NavBar.tsx
    - deal-quest-bot/packages/webapp/src/shared/ui/index.ts
    - deal-quest-bot/packages/webapp/src/shared/layouts/AppLayout.tsx
  modified:
    - deal-quest-bot/packages/webapp/src/main.tsx

key-decisions:
  - "Telegram SDK viewport CSS vars (--tg-viewport-*) for safe area instead of env(safe-area-inset-*) which fails in TG WebView on iOS"
  - "oklch color space for brand palette (perceptually uniform, wide gamut)"
  - "44px minimum touch target on all interactive elements (mobile accessibility)"
  - "NavBar has 5 items: Dashboard, Learn, Train, Support, Leads (no Profile/Casebook/Admin)"
  - "AppLayout bottom padding calc(56px + safe-area) to clear fixed NavBar"

duration: 3m
completed: 2026-02-01
---

# Phase 1 Plan 3: Design System & UI Components Summary

**Tailwind v4 design tokens with Telegram theme mapping, 5 CVA-based UI components (Button/Card/Badge/Skeleton/NavBar), and safe-area-aware AppLayout shell**

## Performance

- Duration: ~3 minutes
- Start: 2026-02-01T13:56:29Z
- End: 2026-02-01T13:59:30Z

## Accomplishments

1. **Design tokens**: Tailwind v4 @theme directive with 10-shade oklch brand palette, semantic colors mapped from Telegram theme CSS vars with fallbacks, status colors (success/warning/error/info), rarity tier colors, safe area spacing tokens, typography, border radius, and shadow tokens
2. **cn() utility**: Class merging function combining clsx (conditional classes) and tailwind-merge (deduplication) for safe Tailwind class composition
3. **Button component**: CVA-based with 4 variants (primary/secondary/ghost/destructive), 3 sizes (sm/md/lg), loading spinner state, 44px min touch target, forwardRef for composition
4. **Card component**: Container with 4 padding variants (none/sm/md/lg), polymorphic `as` prop, surface background with card shadow
5. **Badge component**: CVA-based with 6 variants (default/success/warning/error/info/brand), 2 sizes (sm/md), semantic color usage
6. **Skeleton components**: Skeleton (block placeholder) and SkeletonText (multi-line text placeholder) with animate-pulse shimmer
7. **NavBar**: Fixed bottom navigation with 5 lucide-react icons, NavLink active state detection (text-accent), safe area bottom padding via Telegram SDK CSS vars
8. **AppLayout**: Full-height flex shell with content safe area top padding and NavBar-clearing bottom padding, scrollable content area

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create Tailwind v4 design tokens and cn() utility | `3323bf8` | globals.css, cn.ts, main.tsx |
| 2 | Build base UI components, NavBar, and AppLayout shell | `3ea280c` | Button.tsx, Card.tsx, Badge.tsx, Skeleton.tsx, NavBar.tsx, index.ts, AppLayout.tsx |

## Files Created

- `deal-quest-bot/packages/webapp/src/app/globals.css` -- Tailwind v4 @theme with brand colors, Telegram theme var mapping, safe area tokens
- `deal-quest-bot/packages/webapp/src/shared/lib/cn.ts` -- clsx + tailwind-merge utility
- `deal-quest-bot/packages/webapp/src/shared/ui/Button.tsx` -- CVA button with 4 variants, 3 sizes, loading state
- `deal-quest-bot/packages/webapp/src/shared/ui/Card.tsx` -- Container with padding variants and polymorphic tag
- `deal-quest-bot/packages/webapp/src/shared/ui/Badge.tsx` -- CVA badge with 6 semantic variants
- `deal-quest-bot/packages/webapp/src/shared/ui/Skeleton.tsx` -- Skeleton + SkeletonText loading placeholders
- `deal-quest-bot/packages/webapp/src/shared/ui/NavBar.tsx` -- Fixed bottom nav with 5 items and active state
- `deal-quest-bot/packages/webapp/src/shared/ui/index.ts` -- Barrel export of all UI components
- `deal-quest-bot/packages/webapp/src/shared/layouts/AppLayout.tsx` -- Page shell with safe area and NavBar

## Files Modified

- `deal-quest-bot/packages/webapp/src/main.tsx` -- Added globals.css import at top

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Telegram SDK viewport CSS vars for safe area | `env(safe-area-inset-*)` silently fails in Telegram WebView on iOS (GitHub Issue #1377). `--tg-viewport-*` vars from SDK's `viewport.bindCssVars()` are the correct approach. |
| oklch color space for brand palette | Perceptually uniform across lightness levels, supports wide gamut displays, modern CSS standard |
| 44px minimum touch target | Mobile accessibility requirement for all interactive elements in a mobile-first TMA |
| 5-item NavBar (Dashboard/Learn/Train/Support/Leads) | These are the primary user-facing pages. Profile, Casebook, and Admin are accessed via other routes, not the main nav. |
| AppLayout bottom padding uses calc(56px + safe-area) | 56px is NavBar height; combined with safe area ensures content never hides behind the fixed nav |

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None. Both tasks completed without errors on first attempt. Typecheck and build pass clean.

## Next Phase Readiness

**For Plan 01-04 (Routing shell):**
- AppLayout is ready to wrap all page routes
- NavBar links point to /, /learn, /train, /support, /leads routes
- Design tokens and UI components available for page placeholders

**For Phase 2 (Dashboard):**
- Button, Card, Badge, Skeleton components ready for dashboard UI
- Design tokens provide consistent colors, spacing, and typography

**Blockers:** None
**Concerns:** None
