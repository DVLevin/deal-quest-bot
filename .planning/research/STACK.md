# Stack Research

**Domain:** Telegram Mini App (TMA) -- React SPA frontend for sales training platform
**Project:** Deal Quest TMA
**Researched:** 2026-02-01
**Confidence:** HIGH (core stack), MEDIUM (supporting libraries)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| React | ^18.3.1 | UI framework | TMA ecosystem (official templates, SDK bindings) targets React 18. React 19 is available but `@telegram-apps/sdk-react` is tested against 18. Stay on 18 until SDK explicitly supports 19. | HIGH |
| TypeScript | ^5.9.x | Type safety | Non-negotiable for any non-trivial project. Official TMA templates use TS. Vite 7 has excellent TS support out of the box. | HIGH |
| Vite | ^7.3.x | Build tool / dev server | Official TMA template build tool. Native ESM, fast HMR, dedicated Tailwind v4 plugin. Vite 7 requires Node 20.19+ or 22.12+. Note: official template currently pins Vite 6 -- we use 7 because it is stable and we have no legacy constraints. | HIGH |
| @telegram-apps/sdk-react | ^3.3.9 | TMA SDK (React bindings) | The official React bindings for Telegram Mini Apps. v3 is current stable. Re-exports `@telegram-apps/sdk` so you do NOT install that separately. Key hooks: `useSignal` for reactive signal access. **Breaking change from v2:** `useLaunchParams` removed -- use `retrieveLaunchParams` from the SDK directly. | HIGH |
| @telegram-apps/sdk | (bundled via sdk-react) | TMA core SDK | Bundled with sdk-react. Provides `init()`, `backButton`, `miniApp`, `themeParams`, `viewport`, `swipeBehavior`, `closingBehavior`, `cloudStorage`, `hapticFeedback`. | HIGH |
| react-router | ^7.12.x | Client-side routing | React Router v7 in **declarative mode** for SPA. Import everything from `react-router` (no separate `react-router-dom` needed in v7). Declarative mode is sufficient for a TMA SPA -- no SSR, no framework mode overhead. v7 is a non-breaking upgrade path from v6. | HIGH |
| Tailwind CSS | ^4.1.x | Utility-first CSS | CSS-first configuration in v4 (no `tailwind.config.js`). Dedicated Vite plugin `@tailwindcss/vite`. Built-in Lightning CSS eliminates need for postcss-import and autoprefixer. Custom branded design = Tailwind's `@theme` rule for design tokens. | HIGH |
| Zustand | ^5.0.10 | Client-side state management | 3KB, zero dependencies, no Provider wrapper needed. Centralized store pattern fits our use case: user session, navigation state, cached learning progress. Simple mental model for a TMA where most state is server-derived. | HIGH |
| @tanstack/react-query | ^5.90.x | Server state / data fetching | Caching, background refetching, optimistic updates, retry logic. Pairs with Supabase client for all data operations. Zero dependencies. De facto standard for React server-state management. | HIGH |
| @supabase/supabase-js | ^2.90.x | Backend client (InsForge) | Isomorphic JS client for Supabase-compatible backends. Handles DB queries, auth, storage, realtime subscriptions. InsForge is Supabase-compatible, so this client works directly. | HIGH |

### Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| Recharts | ^3.6.0 | Dashboard charts | All chart views: progress charts, performance dashboards, leaderboards. SVG-based, declarative React components wrapping D3. Responsive and animated by default. 26.5K GitHub stars. | HIGH |
| Motion (formerly Framer Motion) | ^12.26.x | UI animations & gamification | Page transitions, badge reveals, achievement celebrations, micro-interactions. Install as `motion` package, import from `motion/react`. Use `LazyMotion` + `m` component to keep bundle under 4.6KB (vs ~24KB full). | HIGH |
| canvas-confetti | ^1.9.4 | Celebration effects | Achievement unlocks, badge awards, level-ups. Framework-agnostic, supports web workers for off-main-thread rendering, custom SVG shapes for branded confetti. ~3KB. | MEDIUM |
| clsx | ^2.x | Conditional class names | Every component with conditional styling. <1KB. De facto standard. | HIGH |
| tailwind-merge | ^3.x | Tailwind class conflict resolution | Any component accepting `className` prop overrides. Resolves Tailwind specificity conflicts intelligently. | HIGH |
| class-variance-authority (CVA) | ^0.7.x | Component variant definitions | Buttons, cards, badges -- any component with size/color/state variants. Defines variant API declaratively. Standard pattern with Tailwind. | HIGH |
| lucide-react | ^0.562.x | Icon set | All UI icons. Tree-shakable SVG icons (only imported icons ship). 1500+ icons. Fork of Feather Icons with active community. | MEDIUM |
| @number-flow/react | latest | Animated number transitions | Score counters, XP displays, streak counts, leaderboard positions. Smooth digit-by-digit transitions. | LOW |
| eruda | ^3.4.3 | Mobile debugging console | Development/debug builds only. Essential for TMA debugging since WebView has no devtools. Load conditionally: `debug && import('eruda').then(lib => lib.default.init())`. | HIGH |
| vite-plugin-mkcert | ^1.17.8 | Local HTTPS certificates | Development only. Required because Telegram mandates HTTPS. Generates trusted local certs (requires sudo on first run). Better than `@vitejs/plugin-basic-ssl` which creates self-signed certs that fail on iOS/Android. | HIGH |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vite ^7.3.x | Dev server + bundler | `@vitejs/plugin-react-swc` for fast React compilation via SWC. `vite-tsconfig-paths` for TS path alias resolution. |
| ESLint ^9.x | Linting | Flat config format. `@typescript-eslint/eslint-plugin`, `eslint-plugin-react`, `eslint-plugin-react-hooks`. |
| ngrok or Cloudflare Tunnel | HTTPS tunnel for mobile testing | mkcert only works for web.telegram.org testing. For iOS/Android testing, tunnel localhost to a public HTTPS URL. |

---

## Backend Integration Pattern (InsForge / Supabase)

### Authentication Flow

TMA does NOT use traditional Supabase email/password auth. The pattern is:

1. **Client (TMA):** Retrieve `initDataRaw` from `@telegram-apps/sdk-react` on app launch.
2. **Server (Edge Function / bot backend):** Validate `initData` signature using bot token via `@telegram-apps/init-data-node` (^2.0.10) or HMAC-SHA256 verification.
3. **Server:** Generate a custom JWT signed with Supabase JWT secret, with `sub` = Telegram user ID.
4. **Client:** Use `supabase.auth.setSession({ access_token, refresh_token })` to authenticate the Supabase client.
5. **Result:** All subsequent DB queries pass through RLS policies keyed on the verified Telegram user identity.

**Key package for server-side validation:** `@telegram-apps/init-data-node` ^2.0.10

### Supabase Client Setup

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,    // InsForge instance URL
  import.meta.env.VITE_SUPABASE_ANON_KEY // InsForge anon key
);
```

All environment variable keys MUST start with `VITE_` for Vite to expose them to the client bundle.

### Data Fetching Pattern

```typescript
// TanStack Query + Supabase
const { data } = useQuery({
  queryKey: ['user-progress', telegramUserId],
  queryFn: () => supabase.from('user_progress').select('*').eq('telegram_id', telegramUserId)
});
```

---

## Navigation & Back Button

### Critical Pattern

Telegram's Back Button does NOT automatically navigate -- the developer must handle it. If unhandled, pressing back **closes the Mini App entirely**.

### Recommended Approach

Since `@telegram-apps/react-router-integration` (v1.0.1) was built for react-router-dom v6 and has not been updated in over a year, and we are using react-router v7, we implement back button management manually:

```typescript
import { backButton } from '@telegram-apps/sdk-react';
import { useLocation, useNavigate } from 'react-router';

function useBackButtonIntegration() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === '/') {
      backButton.hide();
    } else {
      backButton.show();
      const off = backButton.onClick(() => navigate(-1));
      return off;
    }
  }, [location.pathname]);
}
```

### Why NOT use @telegram-apps/react-router-integration

- Last published over a year ago (v1.0.1)
- Built for `react-router-dom` v6's `<Router navigator={...}>` pattern
- Does not support react-router v7's unified `react-router` package or Data APIs
- Manual approach is ~15 lines and gives full control

---

## Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import mkcert from 'vite-plugin-mkcert';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    mkcert(),
    tsconfigPaths(),
  ],
  base: './',  // Relative paths for TMA deployment flexibility
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  server: {
    host: true,  // Expose on network for mobile testing
  },
});
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| **React 18** | React 19 | `@telegram-apps/sdk-react` ^3.3.9 is tested against React 18. React 19 introduces breaking changes (ref as prop, new hooks) that may conflict with TMA SDK. Upgrade after SDK confirms support. |
| **Vite 7** | Vite 6 | Official template uses Vite 6, but Vite 7 is stable, has improved perf, and better browser target defaults. No breaking changes for our use case. |
| **react-router v7 (declarative mode)** | react-router v6 | v7 is non-breaking from v6 and consolidates packages. Declarative mode is perfect for SPA TMAs. No reason to stay on v6 for new projects. |
| **Zustand** | Jotai | Both are excellent. Zustand fits better here because our state is mostly centralized (user session, feature flags, navigation state) rather than atomic/granular. Jotai shines with many independent atoms -- not our pattern. |
| **Zustand** | Redux Toolkit | Overkill for a TMA. Redux adds ~10KB + boilerplate. Zustand is 3KB with zero boilerplate. Our state complexity does not warrant Redux's middleware ecosystem. |
| **Recharts** | Apache ECharts | ECharts is more powerful for complex visualizations and has better mobile touch support. But it's heavier (~1MB raw), imperative API clashes with React's declarative model, and our charts are standard (bar, line, pie, progress). Recharts' React-native API and lighter footprint win for this use case. |
| **Recharts** | Visx (Airbnb) | Visx is the lightest option (tree-shakable D3 primitives). But it's low-level -- you build everything from scratch. Recharts gives production-ready charts with 10x less code. Time-to-ship matters more than bundle savings here. |
| **Motion** | React Spring | React Spring uses physics-based animations (no duration curves) which feels great but is harder to control for precise sequences. Motion's timeline/orchestration is better for gamification sequences (badge appear -> counter increment -> confetti burst). |
| **Motion** | GSAP | GSAP is the most powerful animation library (timeline, ScrollTrigger). But its licensing model (commercial requires paid license for some features) and imperative API make it suboptimal for a React TMA. Motion's declarative `<motion.div>` fits React idiomatically. |
| **Tailwind CSS v4** | CSS Modules | Custom branded design needs a design token system. Tailwind v4's `@theme` rule provides exactly this. CSS Modules would require building a token system from scratch. Tailwind's utility classes also accelerate development velocity significantly. |
| **Tailwind CSS v4** | TelegramUI (@telegram-apps/telegram-ui) | TelegramUI is designed to mimic Telegram's native look. Deal Quest wants a *custom branded* experience, not a Telegram-native one. TelegramUI constrains visual identity. We use Tailwind for full design control. |
| **canvas-confetti** | react-confetti | react-confetti renders full-screen only. canvas-confetti supports scoped canvases, custom shapes, and web worker rendering. Better for targeted celebrations (within a card, modal, etc). |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **@telegram-apps/telegram-ui** | Designed for apps that want to look like native Telegram. Deal Quest needs custom branding. Constrains color, typography, and layout to TG patterns. | Tailwind CSS v4 with custom `@theme` design tokens |
| **@twa-dev/sdk** | Community wrapper around raw `window.Telegram.WebApp`. Lacks TypeScript types, signals, component abstraction. The official `@telegram-apps/sdk-react` is vastly superior. | `@telegram-apps/sdk-react` ^3.3.9 |
| **@tma.js/sdk-react** | Old package name (pre-rename). Still referenced in the official template's package.json but points to v3.0.8 under the old scope. Use the current `@telegram-apps` scope instead. | `@telegram-apps/sdk-react` ^3.3.9 |
| **@telegram-apps/react-router-integration** | Last updated 1+ year ago. Designed for react-router-dom v6 `<Router navigator={...}>` pattern. Incompatible with react-router v7 Data APIs. Only 2 versions ever published. | Manual back button integration (~15 lines) with react-router v7 |
| **react-router-dom** (separate package) | In react-router v7, the unified `react-router` package is the canonical import. `react-router-dom` is a re-export for migration convenience only. | `react-router` ^7.12.x |
| **Redux / Redux Toolkit** | Massive overkill for a TMA. Adds ~10KB, boilerplate, and conceptual overhead. No middleware need (no complex async flows beyond what TanStack Query handles). | Zustand ^5.0.10 |
| **Chart.js / react-chartjs-2** | Canvas-based (harder to style with CSS), imperative API wrapped awkwardly in React, accessibility challenges. | Recharts ^3.6.0 (SVG-based, declarative React) |
| **Styled Components / Emotion** | CSS-in-JS adds runtime overhead and bundle size. The React ecosystem has shifted away from runtime CSS-in-JS toward utility CSS (Tailwind) and zero-runtime solutions. | Tailwind CSS v4 |
| **postcss-import, autoprefixer** | Tailwind CSS v4 has built-in Lightning CSS that handles both vendor prefixes and imports. These plugins are now redundant. | Built into `@tailwindcss/vite` plugin |
| **@vitejs/plugin-basic-ssl** | Creates self-signed certificates that iOS/Android Telegram rejects. Only works for web.telegram.org testing. | `vite-plugin-mkcert` (creates trusted local certs) |

---

## Stack Patterns by Variant

**If deploying to GitHub Pages:**
- Set `base: '/repo-name/'` in vite.config.ts
- Use `gh-pages` package for deployment
- Add 404.html redirect hack for SPA routing

**If deploying to own server / CDN:**
- Set `base: './'` for relative paths
- Ensure HTTPS (Telegram requirement)
- Consider Cloudflare Pages for free HTTPS + global CDN

**If adding admin panel:**
- Same React app with route-based code splitting
- `React.lazy()` for admin routes (admin users are rare, don't load admin bundle for regular users)
- Same Supabase client, different RLS policies for admin role

**If adding realtime features (leaderboards, live competitions):**
- Use `@supabase/supabase-js` realtime subscriptions
- Pair with TanStack Query's `queryClient.setQueryData` for optimistic cache updates
- Supabase Realtime + Postgres LISTEN/NOTIFY is already available via InsForge

---

## Version Compatibility Matrix

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| @telegram-apps/sdk-react@^3.3.9 | react@^18.x | Not yet tested with React 19. Stay on 18. |
| react-router@^7.12.x | react@^18.3+ | v7 declarative mode works with React 18. |
| @supabase/supabase-js@^2.90.x | Node 20+, all modern browsers | Dropped Node 18 support in v2.79.0. |
| Vite@^7.3.x | Node 20.19+ or 22.12+ | Dropped Node 18 support. ESM only. |
| Tailwind CSS@^4.1.x | Vite 7 via @tailwindcss/vite | No tailwind.config.js needed. CSS-first config. |
| Recharts@^3.6.0 | react@^16.0 \|\| ^17.0 \|\| ^18.0 | Broad React compat. SVG rendering. |
| Motion@^12.26.x | react@^18.0 | Import from `motion/react`. Successor to framer-motion. |
| Zustand@^5.0.10 | react@^18.0 | No dependencies. No Provider needed. |
| @tanstack/react-query@^5.90.x | react@^18.0 | Zero dependencies. |

---

## Installation

```bash
# Core
npm install react react-dom @telegram-apps/sdk-react react-router \
  @supabase/supabase-js @tanstack/react-query zustand

# Styling
npm install tailwindcss @tailwindcss/vite clsx tailwind-merge class-variance-authority

# Charts & Visualization
npm install recharts

# Animation & Gamification
npm install motion canvas-confetti

# Icons
npm install lucide-react

# Debugging (loaded conditionally, but installed as dep)
npm install eruda

# Dev dependencies
npm install -D typescript @types/react @types/react-dom \
  @vitejs/plugin-react-swc vite vite-plugin-mkcert vite-tsconfig-paths \
  eslint @eslint/js @typescript-eslint/eslint-plugin @typescript-eslint/parser \
  eslint-plugin-react eslint-plugin-react-hooks globals
```

---

## Sources

### HIGH confidence (official docs, npm registry)
- [@telegram-apps/sdk-react npm](https://www.npmjs.com/package/@telegram-apps/sdk-react) -- v3.3.9, verified 2026-02-01
- [@telegram-apps/sdk npm](https://www.npmjs.com/package/@telegram-apps/sdk) -- v3.11.8
- [TMA SDK v3 migration guide](https://docs.telegram-mini-apps.com/packages/telegram-apps-sdk/3-x/migrate-v2-v3) -- official breaking changes
- [TMA SDK v3 docs](https://docs.telegram-mini-apps.com/packages/telegram-apps-sdk/3-x) -- official API reference
- [Telegram Mini Apps official React template](https://github.com/Telegram-Mini-Apps/reactjs-template) -- package.json verified
- [TMA Back Button docs](https://docs.telegram-mini-apps.com/platform/back-button) -- official platform docs
- [TMA Init Data docs](https://docs.telegram-mini-apps.com/platform/init-data) -- official auth pattern
- [TMA Authorizing User](https://docs.telegram-mini-apps.com/platform/authorizing-user) -- official validation pattern
- [TMA Debugging docs](https://docs.telegram-mini-apps.com/platform/debugging) -- Eruda recommendation
- [Vite releases](https://vite.dev/releases) -- v7.3.1 verified
- [Vite 7 announcement](https://vite.dev/blog/announcing-vite7) -- Node 20.19+ requirement
- [React Router v7 docs](https://reactrouter.com/) -- v7.12.0 verified
- [React Router modes](https://reactrouter.com/start/modes) -- declarative/data/framework
- [Tailwind CSS v4.0 blog](https://tailwindcss.com/blog/tailwindcss-v4) -- CSS-first config, Vite plugin
- [Zustand npm](https://www.npmjs.com/package/zustand) -- v5.0.10 verified
- [@tanstack/react-query npm](https://www.npmjs.com/package/@tanstack/react-query) -- v5.90.19 verified
- [@supabase/supabase-js npm](https://www.npmjs.com/package/@supabase/supabase-js) -- v2.90.1 verified
- [Recharts npm](https://www.npmjs.com/package/recharts) -- v3.6.0 verified
- [Motion npm](https://www.npmjs.com/package/motion) -- v12.26.2 verified
- [Motion bundle size guide](https://motion.dev/docs/react-reduce-bundle-size) -- LazyMotion under 4.6KB
- [lucide-react npm](https://www.npmjs.com/package/lucide-react) -- v0.562.0 verified
- [canvas-confetti npm](https://www.npmjs.com/package/canvas-confetti) -- v1.9.4 verified

### MEDIUM confidence (WebSearch verified with multiple sources)
- [Supabase + TMA auth pattern (GitHub Gist)](https://gist.github.com/hos/20a4a83b2a4641078dacaea079517c79) -- initData validation in PostgreSQL for Supabase RLS
- [TMA template with Supabase (DEV Community)](https://dev.to/victorgold/telegram-mini-app-template-how-to-build-and-launch-faster-in-2025-gbc) -- auth flow reference
- [State management 2025 comparison (DEV Community)](https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k) -- Zustand vs Jotai analysis
- [React chart libraries 2025 (LogRocket)](https://blog.logrocket.com/best-react-chart-libraries-2025/) -- Recharts recommendation
- [React animation libraries 2026 (Syncfusion)](https://www.syncfusion.com/blogs/post/top-react-animation-libraries) -- Motion recommendation
- [CVA + clsx + tailwind-merge pattern](https://cva.style/docs) -- standard Tailwind component pattern

### LOW confidence (single source, needs validation)
- @number-flow/react for animated counters -- looks promising but limited adoption data
- @telegram-apps/react-router-integration v7 compat -- inferred from API analysis, not officially tested

---

*Stack research for: Deal Quest TMA (Telegram Mini App sales training platform)*
*Researched: 2026-02-01*
