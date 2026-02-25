# Project Research Summary

**Project:** Deal Quest TMA (Telegram Mini App)
**Domain:** Gamified Sales Training Platform - React SPA frontend integrated with existing Python bot
**Researched:** 2026-02-01
**Confidence:** HIGH

## Executive Summary

Deal Quest TMA is a React Single-Page Application that provides a visual, gamified layer on top of an existing Python Telegram bot for sales training. The core architecture is well-established: React 18 + Vite 7 + TypeScript frontend, communicating with InsForge (Supabase-compatible) backend via REST API, with Telegram SDK providing native integration (BackButton, MainButton, theme adaptation, haptics). The Python bot continues to handle all AI/LLM logic, pipeline execution, and complex scoring — the TMA is purely a rendering and interaction layer.

The recommended approach keeps the TMA lightweight and focused: use established patterns (TanStack Query for server state, Zustand for client state, react-router v7 for navigation), implement Telegram-specific UX patterns that users expect (theme-adaptive UI, haptic feedback, native buttons), and avoid common pitfalls like frontend business logic, heavy charting libraries, and mismanaged authentication. The architecture is monorepo-based with the React TMA living in `packages/webapp/`, sharing TypeScript types with the bot through `packages/shared/`, while the existing Python bot remains unchanged at the root.

Key risks center on security (initData validation, RLS misconfiguration), Telegram WebView quirks (safe area CSS failures on iOS, SDK initialization order), and performance (bundle size on mobile). All are preventable with proper foundation work in Phase 1. The MVP focuses on the core training loop (dashboard, learn, train) with table-stakes TMA features (theme adaptation, back button, haptics), deferring advanced gamification and admin features until core value is validated.

## Key Findings

### Recommended Stack

The stack is production-ready and Telegram ecosystem-aligned. React 18 (not 19 — TMA SDK is tested against 18), Vite 7, TypeScript 5.9, and the official `@telegram-apps/sdk-react` v3.3.9 form the core. React Router v7 in declarative mode handles SPA routing. Tailwind CSS v4 with custom design tokens enables branded UI while respecting Telegram themes. Zustand (3KB) manages client state, TanStack Query handles server state with caching and background refresh. `@supabase/supabase-js` connects to InsForge with the same PostgREST API the Python bot already uses.

**Core technologies:**
- React 18 + TypeScript 5.9 + Vite 7: TMA SDK targets React 18; Vite 7 has dedicated Tailwind v4 plugin and fast HMR
- `@telegram-apps/sdk-react` v3.3.9: Official TMA SDK with React bindings for initData, BackButton, MainButton, theme, haptics
- react-router v7 (declarative): Client-side routing with manual BackButton integration (the old router integration package is abandoned)
- Tailwind CSS v4: CSS-first config with `@theme` design tokens for branded design; respects Telegram ThemeParams
- Zustand v5 + TanStack Query v5: Client state (3KB) + server state (caching, refetch, optimistic updates)
- `@supabase/supabase-js` v2.90: InsForge client (Supabase-compatible REST API)

**Supporting libraries:**
- Recharts v3.6: SVG-based declarative charts (lighter than D3/ECharts, sufficient for training dashboards)
- Motion v12: Gamification animations with LazyMotion (under 5KB) for badge reveals and XP celebrations
- canvas-confetti: Achievement celebration effects (3KB, web worker support)
- lucide-react: Tree-shakable icon library
- clsx + tailwind-merge + CVA: Standard Tailwind component pattern
- eruda (dev only): Mobile debugging console (essential — WebView has no devtools)
- vite-plugin-mkcert (dev only): Local HTTPS certificates (Telegram requires HTTPS)

**Critical version notes:**
- React 18 (NOT 19) until TMA SDK explicitly supports React 19
- Vite 7 requires Node 20.19+ or 22.12+
- Manual BackButton integration with react-router v7 (the official `@telegram-apps/react-router-integration` is v6-only and unmaintained)

### Expected Features

The feature landscape divides into table stakes (users expect in any TMA), differentiators (Deal Quest's competitive edge), and anti-features (deliberately avoided to prevent complexity traps).

**Must have (table stakes):**
- Theme-adaptive UI: Match Telegram's light/dark mode using `ThemeParams` CSS variables
- BackButton navigation: Wire to router; show/hide based on navigation depth
- MainButton for primary CTAs: Bottom action button (renamed BottomButton in recent API)
- Fast initial load (<2s): Skeleton screens, code splitting, lightweight bundle
- Session interruption resilience: Save state progressively to backend (mobile users switch chats constantly)
- One-tap auth: Automatic via initData validation (zero-friction onboarding)
- Haptic feedback: `impactOccurred`, `notificationOccurred`, `selectionChanged` on all interactions
- Dashboard with key metrics: 3-5 metrics max (progress, streak, rank)
- Progress tracking visualization: Per-track progress bars, completion percentages
- Responsive mobile-first layout: 360px minimum width, respect safe area insets
- Closing confirmation on unsaved state: `enableClosingConfirmation()` during active training

**Should have (competitive differentiators):**
- SecondaryButton for scenario branching: Two bottom buttons for "Option A" / "Option B" sales decisions
- Badge wall with collection mechanics: Visual grid showing earned/locked badges (share to Stories in v2+)
- Animated leaderboard with friend filter: Global + team/group views with real-time updates
- Timed scenario cards with pressure UX: Countdown timer + swipeable cards + immediate feedback
- Learning track map: Visual path showing lesson nodes (Duolingo-style) — v1.x after validation
- Cloud-synced progress: `CloudStorage` + backend as source of truth for cross-device state
- Native popup for quiz feedback: `showPopup()` for correct/incorrect instead of custom modals
- Custom branded bottom bar color: `setBottomBarColor()` for brand immersion

**Defer (v2+):**
- Strategy builder with drag-and-drop: High-risk in WebView; requires `disableVerticalSwipes()`
- Admin dashboard in TMA: Bot commands suffice initially
- QR scanner for team events: Requires in-person training use case validation
- Share to Telegram Stories: Badge achievement sharing after engagement proven
- Custom branded animations: Polish layer (Lottie, advanced GSAP)

**Anti-features (deliberately NOT building):**
- Real-time multiplayer scenarios: WebSocket fragility in WebView; asynchronous leaderboard competition instead
- Frontend business logic: Bot handles all AI/scoring; TMA is visual layer only
- Heavy charting libraries: Chart.js/D3 add 200-500KB; use micro-visualizations (CSS progress bars, SVG sparklines)
- Persistent WebSocket connection: WebView backgrounding kills connections; poll on focus or use bot notifications
- Custom authentication system: TMA provides initData for free; login walls kill conversion
- Multi-page website architecture: TMA is SPA; full page reloads are slow
- Crypto/TON wallet integration: Out of scope for sales training
- Offline-first architecture: CloudStorage/DeviceStorage too limited; cache-enhanced online-first instead
- Video lessons embedded: Resource-heavy in WebView; use text + illustrations or `openLink()` to native browser

### Architecture Approach

The architecture is a lightweight monorepo with clear separation: the existing Python bot (`bot/`) stays at the root and handles all AI/LLM logic, the React TMA lives in `packages/webapp/` as a rendering layer, and shared TypeScript types live in `packages/shared/`. Both bot and TMA communicate with the same InsForge (Supabase-compatible) backend via REST API. The TMA never calls LLM APIs directly — it writes requests to InsForge (e.g., `support_sessions` with `status=pending`), the bot picks them up, processes via AI, and writes results back. The TMA reads and displays results.

**Major components:**
1. **React TMA (`packages/webapp/`)**: UI rendering, client state, page routing, Telegram SDK integration. Feature-based structure (pages/, features/, shared/ui/, lib/api/).
2. **Python Bot (`bot/`)**: Existing AI agent orchestration, LLM routing, pipeline execution, scoring logic. Unchanged, stays at root with its own venv.
3. **InsForge Backend**: Data persistence (Postgres), auth (JWT), file storage, realtime subscriptions, edge functions. Both bot and TMA use the same REST API (PostgREST).
4. **Shared Types (`packages/shared/`)**: TypeScript-only package with table row types mirroring InsForge schema. Bot has parallel Pydantic models.
5. **Edge Function: Auth Verifier**: Validates Telegram initData signature, mints InsForge JWT for TMA sessions. Gateway for all authenticated access.

**Key patterns:**
- **initData auth flow**: TMA sends initDataRaw to Edge Function → validates HMAC-SHA256 with bot token → mints JWT with `sub: telegramUserId` → TMA uses JWT for all InsForge API calls
- **API layer**: TanStack Query hooks wrap InsForge client; pages consume hooks; caching/deduplication automatic
- **State split**: Server data in TanStack Query cache, client-only state (form wizard steps, filters, animation triggers) in Zustand
- **Router integration**: react-router v7 with manual BackButton sync (show when `history.length > 1`, hide on root)
- **Realtime leaderboard**: InsForge Realtime WebSocket subscription or 30s polling fallback
- **Bot-TMA bridge**: Shared InsForge database is primary data bridge; `startParam` for deep links; avoid `sendData()` except for one-shot actions

### Critical Pitfalls

Research identified six critical pitfalls that can derail the project if not addressed in Phase 1 (Foundation).

1. **Skipping initData server-side validation**: Attackers forge initData to impersonate users. Use `@telegram-apps/init-data-node` for HMAC-SHA256 verification; check `auth_date` expiry (1-hour window); implement as InsForge Edge Function gating all API access. Never skip validation, even in development.

2. **InsForge RLS misconfiguration**: The anon key ships in client code. Without Row-Level Security on every table, it becomes a master key. Enable RLS on all 10+ tables, write policies keyed on `auth.uid()` matching JWT's `sub` claim, test with anon key. Missing RLS on even one table exposes the entire system (CVE-2025-48757: 170+ apps exposed).

3. **Frontend state ownership instead of backend**: XP, streaks, badges, scores must be computed server-side (bot services or InsForge functions) and read by TMA. WebView `localStorage` is unreliable (cleared on cache clear, no cross-device sync). React state is for UI only (form drafts, animation triggers), never business data. One case study: $40K rework after users lost progress stored in `localStorage`.

4. **CSS `env(safe-area-inset-*)` failing in Telegram WebView**: Standard CSS safe area insets resolve to `0` inside Telegram iOS WebView. Bottom navigation and inputs hidden behind home indicator. Use Telegram SDK's `viewport.safeAreaInsets()` and `viewport.bindCssVars()` instead. Test on physical iPhone inside Telegram (not Safari).

5. **SDK package duplication and initialization order**: Installing both `@telegram-apps/sdk` and `@telegram-apps/sdk-react` causes silent failures. Install ONLY `@telegram-apps/sdk-react` (re-exports everything). Follow sequence: `init()` first, then `mount()` each component, then use methods. Always check `method.isAvailable()` before calling.

6. **Telegram-to-Supabase auth bridge misconfiguration**: Custom flow required (Telegram does not use OAuth). Validate initData server-side, mint JWT signed with InsForge JWT secret containing `role: "authenticated"` and `sub: telegramUserId`, return to client. Common failures: wrong secret (bot token vs JWT secret), missing `role` claim (runs as anon), no refresh mechanism (401 after 1 hour).

## Implications for Roadmap

Based on research, the roadmap should follow a layered build order: Foundation (auth, SDK, types) → Shell (router, layout, design system) → Data Layer (API hooks, state management) → Core Pages (one at a time) → Realtime & Gamification (polish).

### Phase 1: Foundation & Auth
**Rationale:** Everything depends on working auth and correct SDK setup. RLS policies, initData validation, and safe area handling must be correct from day one — retrofitting is painful.

**Delivers:**
- Monorepo scaffold (pnpm workspace, `packages/webapp/`, `packages/shared/`)
- InsForge client setup (`@insforge/sdk` or raw fetch with PostgREST params)
- Shared TypeScript types (mirroring InsForge table schemas)
- Telegram SDK integration (`@telegram-apps/sdk-react` initialized, `mockEnv.ts` for dev)
- InsForge Edge Function for initData validation + JWT minting
- RLS policies on all 10+ tables (enabled + tested with anon key)
- Auth provider in React (JWT stored in memory, transparent refresh)

**Addresses features:**
- One-tap auth (table stakes)
- Session state persistence (table stakes)

**Avoids pitfalls:**
- Pitfall 1: initData validation (CRITICAL)
- Pitfall 2: RLS misconfiguration (CRITICAL)
- Pitfall 5: SDK package duplication (CRITICAL)
- Pitfall 6: Auth bridge misconfiguration (CRITICAL)

**Research flag:** Standard patterns. Official TMA docs and InsForge/Supabase docs are comprehensive. Skip phase-specific research.

### Phase 2: Shell & Navigation
**Rationale:** Once auth works, build the navigation skeleton. All pages depend on router and layout. Design system foundation enables parallel page development.

**Delivers:**
- react-router v7 setup with manual BackButton integration
- Layout shell (bottom nav, page transitions, Telegram theme sync)
- Design system foundation (Tailwind v4 config with Deal Quest tokens, base components: Button, Card, Badge, Skeleton)
- Safe area handling via `viewport.bindCssVars()` (tested on iOS)

**Addresses features:**
- Theme-adaptive UI (table stakes)
- BackButton navigation (table stakes)
- Responsive mobile-first layout (table stakes)

**Avoids pitfalls:**
- Pitfall 4: Safe area CSS failure (CRITICAL)

**Research flag:** Standard patterns. React Router v7 docs + TMA SDK docs cover this. Skip research.

### Phase 3: Data Layer & API
**Rationale:** Pages need API hooks to display real data. Establishing the data-fetching pattern now prevents inconsistency later.

**Delivers:**
- TanStack Query setup (QueryClient provider, devtools)
- API hooks per resource: `useUser`, `useLeaderboard`, `useAttempts`, `useTrackProgress`, `useCasebook`, `useBadges`
- Zustand stores: auth (JWT), training (timer, response), UI (filters, toggles)

**Addresses features:**
- Fast initial load (table stakes via caching)

**Avoids pitfalls:**
- Pitfall 3: Frontend state ownership (CRITICAL — enforced by architecture)

**Research flag:** Standard patterns. TanStack Query docs + existing bot PostgREST client provide clear examples. Skip research.

### Phase 4: Dashboard (MVP Proof of Stack)
**Rationale:** Dashboard is the first full-stack feature end-to-end. Proves auth → API → rendering works. Validates design system. Unblocks parallel page development.

**Delivers:**
- XP progress widget with micro-visualization (CSS progress ring)
- Weekly activity chart (Recharts sparkline)
- Leaderboard preview (top 5, navigate to full leaderboard)
- Quick action buttons (navigate to Learn, Train)

**Addresses features:**
- Dashboard with key metrics (table stakes)
- Progress tracking visualization (table stakes)

**Research flag:** Standard dashboard patterns. Skip research.

### Phase 5: Profile & Badge Wall
**Rationale:** Self-contained feature (no dependencies on other pages). Delivers gamification visuals that inform Train/Learn design.

**Delivers:**
- User stats display (total XP, current level, rank)
- Badge wall (earned badges + locked silhouettes)
- Attempt history list (recent training sessions)
- Settings (theme preference toggle, notification preferences)

**Addresses features:**
- Badge wall with collection mechanics (differentiator)
- SettingsButton (table stakes)

**Avoids pitfalls:**
- Pitfall 3: Badge earning logic stays in backend (enforced)

**Research flag:** Standard patterns. Skip research.

### Phase 6: Learn Mode
**Rationale:** Simpler than Train (no timer, no scoring). Establishes lesson display pattern.

**Delivers:**
- Lesson card viewer (display lesson content from backend)
- Simple card stack navigation (next/previous)
- Track progress indicator (X of Y lessons completed)

**Addresses features:**
- Learn mode lesson cards (table stakes)
- Progress tracking (table stakes)

**Research flag:** Standard patterns. Skip research.

### Phase 7: Train Mode (Core Value)
**Rationale:** The core differentiator. Timed scenarios with branching choices. Most complex UX (timer, MainButton/SecondaryButton, haptics, scoring display). Requires all foundation work (auth, state management, haptics).

**Delivers:**
- Scenario card with timer
- Response input (text area for open-ended, or MainButton/SecondaryButton for branching)
- Immediate feedback (native `showPopup()` for correct/incorrect)
- Scoring results display
- Closing confirmation during active scenario

**Addresses features:**
- Timed scenario cards with pressure UX (differentiator — CORE VALUE)
- MainButton for primary CTAs (table stakes)
- SecondaryButton for scenario branching (differentiator)
- Haptic feedback (table stakes)
- Closing confirmation on unsaved state (table stakes)
- Native popup for quiz feedback (differentiator)

**Avoids pitfalls:**
- Pitfall 3: Scoring logic stays in backend; TMA submits response, receives score

**Research flag:** Scenario card UX needs design iteration. Standard TMA patterns for timer/buttons. Skip deep research.

### Phase 8: Leaderboard & Realtime
**Rationale:** Enhances dashboard widget with full view. Realtime subscription (or polling fallback) adds engagement without core value dependency.

**Delivers:**
- Full leaderboard view (global, team/group filter)
- Position-change animations (smooth rank transitions)
- InsForge Realtime subscription or 30s polling fallback
- Friend/team filter (users in the same Telegram group)

**Addresses features:**
- Animated leaderboard with friend filter (differentiator)

**Avoids pitfalls:**
- No persistent WebSocket if Realtime unavailable (polling fallback instead)

**Research flag:** Standard Realtime subscription patterns. Skip research.

### Phase 9: Casebook Browser
**Rationale:** Independent feature (no dependencies on other pages). Straightforward list + search + filters.

**Delivers:**
- Browsable case study list with virtualization
- Search and category filters
- Quality indicators (stars, case type)
- Bookmark state (CloudStorage for cross-device)

**Addresses features:**
- Casebook browser with search and filters (differentiator)
- Cloud-synced progress (differentiator — bookmarks only)

**Research flag:** Standard patterns. Skip research.

### Phase 10: Support Mode
**Rationale:** Displays bot-generated strategies. Read-only with copy/export. No drag-and-drop (deferred to v2+).

**Delivers:**
- Strategy display (sections, bullet points)
- Engagement checklist (interactive checkboxes saved to backend)
- Copy to clipboard (for pasting into CRM/notes)

**Addresses features:**
- Support mode (bot hybrid integration)

**Avoids pitfalls:**
- Drag-and-drop deferred (too risky for v1)

**Research flag:** Standard patterns. Skip research.

### Phase 11: Admin Dashboard
**Rationale:** Independent from user-facing features. Can be built in parallel with Phases 6-10.

**Delivers:**
- Team charts (activity, leaderboard, completion rates)
- Member rankings
- Content management (scenarios, lessons, casebook entries)

**Addresses features:**
- Admin panel (v2 feature pulled forward if needed)

**Research flag:** Standard admin dashboard patterns. Skip research.

### Phase 12: Gamification & Polish
**Rationale:** Final layer of delight. Animations, confetti, level-up celebrations. Requires all core features to exist.

**Delivers:**
- Level-up animations (Motion with LazyMotion)
- XP gain animations (number transitions)
- Badge earn effects (confetti burst)
- Streak indicators (fire icon + count)
- Full-screen mode for immersive training
- Add to Home Screen prompt (after first successful session)

**Addresses features:**
- Custom branded bottom bar color (differentiator)
- Full-screen mode for training (differentiator)
- Add to Home Screen (differentiator for retention)

**Research flag:** Standard animation patterns. Skip research.

### Phase Ordering Rationale

- **Phases 1-3 are sequential dependencies.** Auth must work before shell, shell before data layer, data layer before any page.
- **Phase 4 (Dashboard) is the integration test.** Building it first proves the full stack works end-to-end before committing to all other pages.
- **Phases 5-11 are mostly independent.** Can be parallelized or reordered based on team priorities. Suggested order prioritizes core value (Train) and user-facing features over admin.
- **Phase 12 (Gamification) is pure polish.** Must come last — animations require the features to exist.

**Key architectural constraint:** Pitfalls 1-6 must all be addressed in Phases 1-2 (Foundation + Shell). Retrofitting auth, RLS, safe area handling, or SDK initialization later is 10x harder.

### Research Flags

**Phases likely needing deeper research during planning:**
- None. All suggested phases use well-documented patterns with high-confidence sources. The research has already identified the stack, architecture, and pitfall avoidance strategies.

**Phases with standard patterns (skip research-phase):**
- All phases (1-12). The domain (Telegram Mini Apps) has mature documentation, official SDK, and established patterns. The backend integration (InsForge/Supabase) has comprehensive docs. React/TypeScript ecosystem is battle-tested.

**Exception:** If during execution a specific scenario UX pattern (Phase 7) proves more complex than anticipated, trigger ad-hoc research on gamification UX or timed challenge patterns. But based on FEATURES.md research, existing Duolingo/quiz app patterns are sufficient.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All core packages verified on npm with latest versions; official TMA template confirms React 18 + Vite + TypeScript pattern; version compatibility matrix complete |
| Features | MEDIUM-HIGH | TMA feature landscape well-researched from official docs + community sources; some differentiators (SecondaryButton branching, learning track map) inferred from similar apps but not Deal Quest-specific user research |
| Architecture | HIGH | Pattern verified against official TMA React template, SpyClub case study, existing bot's InsForge client; monorepo structure standard for pnpm workspaces; auth flow documented in Supabase + Telegram docs |
| Pitfalls | HIGH | All six critical pitfalls confirmed with official issue trackers (GitHub Issues #1377, #1285, #554, #39), CVE reports (CVE-2025-48757), and Telegram/Supabase docs; prevention strategies tested in production case studies |

**Overall confidence:** HIGH

The research converges on a clear, production-ready stack with well-documented patterns. The only medium-confidence area is feature prioritization (which features users actually want vs. what competitors offer), but the MVP definition in FEATURES.md is conservative and focuses on table-stakes + one core differentiator (timed scenario training).

### Gaps to Address

1. **Device performance class detection:** Research identified the need to detect Android performance class (30% of users on "low" devices) and conditionally reduce animation complexity. The SDK does not expose this directly — must infer from User-Agent or viewport dimensions. Address in Phase 12 (Gamification) with a heuristic (e.g., if viewport width < 400px and Android, disable heavy animations).

2. **InsForge Edge Functions CORS config:** Research flagged CORS as a common pitfall but InsForge docs are less comprehensive than upstream Supabase. Verify CORS headers (`Access-Control-Allow-Origin`, OPTIONS handling) work in Edge Functions during Phase 1 (Foundation/Auth). Create a shared `cors.ts` utility for all Edge Functions.

3. **JWT refresh timing:** Research recommends 1-hour JWT expiry with transparent refresh, but the exact client-side refresh timing (e.g., refresh at 50 minutes? On next API call? Background interval?) is not specified. Implement as a TanStack Query middleware or Supabase client `accessToken` callback during Phase 1 (Auth). Test with a long-running session (> 1 hour) in Phase 3 (Data Layer).

4. **Theme switching mid-session:** Research confirms `themeChanged` event exists, but whether `bindCssVars()` automatically re-binds or requires manual re-call is unclear from docs. Test during Phase 2 (Shell) with live theme switches. If `bindCssVars()` does not auto-update, add a `themeChanged` listener that re-calls it.

5. **BackButton visibility bug on Android/Desktop:** Research flagged GitHub Issue #554 (back button `hide()` method has inconsistent behavior on Android and Desktop). Workaround unclear. Test on all three platforms (iOS, Android, Desktop) during Phase 2 (Shell). If `hide()` fails, use CSS `display: none` on the button area as a fallback.

## Sources

### Primary (HIGH confidence)
- [Telegram Mini Apps Official Documentation](https://docs.telegram-mini-apps.com/) — Platform APIs (initData, viewport, BackButton, ThemeParams, safe area), SDK usage tips
- [Telegram Mini Apps Official React Template (GitHub)](https://github.com/Telegram-Mini-Apps/reactjs-template) — Verified package.json, SDK initialization patterns, project structure
- [@telegram-apps/sdk-react npm](https://www.npmjs.com/package/@telegram-apps/sdk-react) — v3.3.9 verified 2026-02-01
- [Vite 7 releases and announcement](https://vite.dev/) — v7.3.1, Node 20.19+ requirement
- [React Router v7 docs](https://reactrouter.com/) — Declarative mode, v7.12.0 verified
- [Tailwind CSS v4 blog](https://tailwindcss.com/blog/tailwindcss-v4) — CSS-first config, Vite plugin
- [Supabase Row Level Security docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS patterns, policy syntax
- [TanStack Query v5 docs](https://tanstack.com/query/latest) — Server state management
- [Zustand GitHub](https://github.com/pmndrs/zustand) — v5.0.10 verified
- [InsForge documentation](https://docs.insforge.dev/introduction) — InsForge SDK (Supabase-compatible API)
- [Existing Deal Quest bot InsForge client](bot/storage/insforge_client.py) — Production PostgREST patterns (query, create, update, upsert, delete, rpc, upload_file)
- [Existing Deal Quest bot repositories](bot/storage/repositories.py) — Production table access patterns

### Secondary (MEDIUM confidence)
- [SpyClub TMA Architecture case study (Etherwave Labs)](https://www.etherwavelabs.com/blog/building-spyclub-a-complete-guide-to-modern-telegram-mini-app-development) — React + Supabase + Zustand + Realtime production architecture
- [CVE-2025-48757 report (ByteIota)](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/) — RLS misconfiguration impact, 170+ apps exposed
- [Telegram iOS Issue #1377](https://github.com/TelegramMessenger/Telegram-iOS/issues/1377) — safe-area-inset-bottom not working in iOS WebView
- [tma.js Issue #554](https://github.com/Telegram-Mini-Apps/telegram-apps/issues/554) — Back button visibility bug
- [Telegram Mini Apps Issues #39](https://github.com/Telegram-Mini-Apps/issues/issues/39) — iOS safe area scroll bug
- [Best React chart libraries 2025 (LogRocket)](https://blog.logrocket.com/best-react-chart-libraries-2025/) — Recharts vs alternatives
- [React animation libraries 2026 (Syncfusion)](https://www.syncfusion.com/blogs/post/top-react-animation-libraries) — Motion (formerly Framer Motion) recommendation
- [State management 2025 comparison (DEV Community)](https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k) — Zustand vs Jotai analysis
- [Gamification in eLearning examples (Elucidat)](https://www.elucidat.com/blog/gamification-in-elearning-examples/) — Badge mechanics, XP systems
- [Mini App UX: First On-Chain Action in 60 Seconds (FreeBlock)](https://freeblock.medium.com/longread-3-7-mini-app-ux-in-telegram-how-to-get-users-to-a-first-on-chain-action-in-60-seconds-355236d97df5) — UX patterns, performance targets

### Tertiary (LOW confidence)
- @number-flow/react for animated counters — Limited adoption data; inferred from npm package description

---
*Research completed: 2026-02-01*
*Ready for roadmap: yes*
