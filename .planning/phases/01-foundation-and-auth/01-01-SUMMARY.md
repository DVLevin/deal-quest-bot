---
phase: 01-foundation-and-auth
plan: 01
subsystem: scaffold
tags: [monorepo, pnpm, vite, react, typescript, telegram-sdk, shared-types]

requires: []
provides:
  - pnpm monorepo with workspace linking
  - React 18 + Vite 7 + TypeScript webapp package
  - Telegram SDK v3 initialization with mock environment
  - Shared types package with all 10 InsForge table interfaces
  - Game constants and enum types
affects:
  - 01-02 (auth flow needs InsForge client, shared types)
  - 01-03 (design system builds on webapp scaffold)
  - 01-04 (routing shell needs App.tsx, shared types)

tech-stack:
  added:
    - react@18.3.x
    - react-dom@18.3.x
    - vite@7.3.x
    - typescript@5.9.x
    - "@telegram-apps/sdk-react@3.3.x"
    - react-router@7.12.x
    - "@insforge/sdk@latest"
    - "@tanstack/react-query@5.90.x"
    - zustand@5.0.x
    - tailwindcss@4.1.x
    - "@tailwindcss/vite@latest"
    - clsx@2.x
    - tailwind-merge@3.x
    - class-variance-authority@0.7.x
    - lucide-react@0.562.x
    - eruda@3.4.x
    - vite-plugin-mkcert@1.17.x
    - "@vitejs/plugin-react-swc@latest"
    - vite-tsconfig-paths@latest
  patterns:
    - pnpm workspaces for monorepo
    - Row suffix for database type interfaces
    - String literal unions for enum types
    - Vite plugin-based Tailwind v4 (no PostCSS config)
    - mockEnv pattern for Telegram SDK browser development

key-files:
  created:
    - deal-quest-bot/pnpm-workspace.yaml
    - deal-quest-bot/package.json
    - deal-quest-bot/packages/webapp/package.json
    - deal-quest-bot/packages/webapp/tsconfig.json
    - deal-quest-bot/packages/webapp/vite.config.ts
    - deal-quest-bot/packages/webapp/index.html
    - deal-quest-bot/packages/webapp/src/main.tsx
    - deal-quest-bot/packages/webapp/src/app/App.tsx
    - deal-quest-bot/packages/webapp/src/lib/telegram.ts
    - deal-quest-bot/packages/webapp/src/vite-env.d.ts
    - deal-quest-bot/packages/webapp/public/mockEnv.ts
    - deal-quest-bot/packages/shared/package.json
    - deal-quest-bot/packages/shared/tsconfig.json
    - deal-quest-bot/packages/shared/src/index.ts
    - deal-quest-bot/packages/shared/src/tables.ts
    - deal-quest-bot/packages/shared/src/enums.ts
    - deal-quest-bot/packages/shared/src/constants.ts
  modified:
    - deal-quest-bot/.env.example
    - deal-quest-bot/.gitignore

key-decisions:
  - "Row suffix pattern for DB types (UserRow, AttemptRow) to distinguish from API/UI types"
  - "Schema from actual InsForge DB, not Python models (AttemptRow omits transient username/user_response)"
  - "GeneratedScenarioRow included but marked as potentially non-existent table"
  - "Tailwind v4 CSS-first config via @tailwindcss/vite plugin (no tailwind.config.js)"
  - "mockEnv uses __telegram__initParams pattern for SDK v3 browser development"
  - ".gitignore updated for node_modules since deal-quest-bot now has JS packages"

duration: 6m
completed: 2026-02-01
---

# Phase 1 Plan 1: Monorepo Scaffold + Telegram SDK + Shared Types Summary

**pnpm monorepo with React 18/Vite 7/TS webapp, Telegram SDK v3 init with mock env, and 10 InsForge table interfaces in shared types package**

## Performance

- Duration: ~6 minutes
- Start: 2026-02-01T13:45:42Z
- End: 2026-02-01T13:51:39Z

## Accomplishments

1. **Monorepo scaffold**: pnpm workspaces with `packages/webapp` and `packages/shared`, root scripts for dev/build/typecheck, workspace dependency linking verified
2. **Webapp package**: React 18 + Vite 7 + TypeScript + SWC, Tailwind v4 via Vite plugin, mkcert for HTTPS, tsconfig path aliases (`@/*`), eruda mobile debugger
3. **Telegram SDK integration**: `initTelegramSDK()` mounts backButton, mainButton, themeParams, miniApp, viewport with CSS var binding, swipeBehavior vertical disable, and miniApp.ready()
4. **Mock environment**: Browser development support via `mockEnv.ts` in public/ using `__telegram__initParams` pattern for SDK v3
5. **Shared types package**: 10 TypeScript interfaces matching actual InsForge table schemas, 8 string literal union types, game constants with helper functions
6. **Build verification**: `pnpm install`, `pnpm typecheck`, and `pnpm build` all pass clean

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create monorepo scaffold with pnpm workspaces and Vite 7 webapp | `1f86ad7` | pnpm-workspace.yaml, webapp/package.json, vite.config.ts, main.tsx, telegram.ts, mockEnv.ts |
| 2 | Create shared types package mirroring InsForge table schemas | `73e2eab` | shared/tables.ts, shared/enums.ts, shared/constants.ts, shared/index.ts |

## Files Created

- `deal-quest-bot/pnpm-workspace.yaml` -- Workspace config (`packages/*`)
- `deal-quest-bot/package.json` -- Root workspace scripts
- `deal-quest-bot/pnpm-lock.yaml` -- Lockfile (116 packages)
- `deal-quest-bot/packages/webapp/package.json` -- Webapp deps (React, Vite, TG SDK, etc.)
- `deal-quest-bot/packages/webapp/tsconfig.json` -- TS config with path aliases
- `deal-quest-bot/packages/webapp/vite.config.ts` -- Vite 7 with React SWC, Tailwind v4, mkcert
- `deal-quest-bot/packages/webapp/index.html` -- Entry HTML with mockEnv script
- `deal-quest-bot/packages/webapp/src/main.tsx` -- App entry: SDK init, eruda, React render
- `deal-quest-bot/packages/webapp/src/app/App.tsx` -- Minimal App component with shared import
- `deal-quest-bot/packages/webapp/src/lib/telegram.ts` -- SDK init + getLaunchParams
- `deal-quest-bot/packages/webapp/src/vite-env.d.ts` -- Vite client types
- `deal-quest-bot/packages/webapp/public/mockEnv.ts` -- Telegram mock for browser dev
- `deal-quest-bot/packages/shared/package.json` -- Shared package config with typecheck script
- `deal-quest-bot/packages/shared/tsconfig.json` -- Shared TS config
- `deal-quest-bot/packages/shared/src/index.ts` -- Re-exports all types and constants
- `deal-quest-bot/packages/shared/src/tables.ts` -- 10 InsForge table interfaces
- `deal-quest-bot/packages/shared/src/enums.ts` -- 8 string literal union types
- `deal-quest-bot/packages/shared/src/constants.ts` -- Game constants and helpers

## Files Modified

- `deal-quest-bot/.env.example` -- Added VITE_INSFORGE_URL and VITE_INSFORGE_ANON_KEY
- `deal-quest-bot/.gitignore` -- Added node_modules/, *.tgz, .pnpm-store/

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Row suffix for DB types | Distinguishes database row types from potential API response types or UI-specific types in later plans |
| Schema from InsForge DB, not Python models | Research confirmed Python AttemptModel has transient fields (username, user_response) not in actual DB. Types must match real schema. |
| GeneratedScenarioRow included with caveat | Table may not exist yet in InsForge (empty schema returned). Interface based on Python model for forward compatibility. |
| Tailwind v4 CSS-first (no config file) | Per project decision and research. Uses @tailwindcss/vite plugin instead of PostCSS. InsForge warns against v4 but that applies to their template, not custom Vite setup. |
| mockEnv uses __telegram__initParams | SDK v3 internal pattern for mock environment. More reliable than previous mock approaches. |
| .gitignore for node_modules | deal-quest-bot now has JS packages; node_modules must be ignored |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added .gitignore entries for Node.js**

- **Found during:** Task 1
- **Issue:** The existing `.gitignore` had no entries for `node_modules/` which would cause all dependencies to be tracked by git
- **Fix:** Added `node_modules/`, `*.tgz`, `.pnpm-store/` to `.gitignore`
- **Files modified:** `deal-quest-bot/.gitignore`
- **Commit:** `1f86ad7`

**2. [Rule 3 - Blocking] Added typecheck script to shared package**

- **Found during:** Task 2
- **Issue:** The shared package needed a `typecheck` script for `pnpm -r typecheck` to include it, and a TypeScript devDependency
- **Fix:** Added scripts.typecheck and devDependencies.typescript to shared/package.json
- **Files modified:** `deal-quest-bot/packages/shared/package.json`
- **Commit:** `73e2eab`

## Issues Encountered

None. Both tasks completed without errors on first attempt.

## Next Phase Readiness

**For Plan 01-02 (Auth flow):**
- InsForge SDK is installed and available for import
- Shared types package provides UserRow and other types for auth upsert
- Telegram SDK init provides getLaunchParams() for initData access
- VITE_INSFORGE_URL and VITE_INSFORGE_ANON_KEY env vars defined

**For Plan 01-03 (Design system):**
- Tailwind v4 is installed with @tailwindcss/vite plugin
- Vite config is ready for CSS-first @theme directive
- App.tsx is a minimal placeholder ready for layout wrapping

**For Plan 01-04 (Routing shell):**
- react-router v7 is installed (unified package, no react-router-dom)
- App component ready to be wrapped with BrowserRouter
- BackButton, MainButton from Telegram SDK are mounted and ready

**Blockers:** None
**Concerns:** None
