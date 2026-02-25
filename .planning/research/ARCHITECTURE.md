# Architecture Research

**Domain:** Telegram Mini App (React TMA) for sales training platform
**Researched:** 2026-02-01
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
                          TELEGRAM CLIENT
                    (Mobile / Desktop App)
                              |
              ┌───────────────┼───────────────┐
              v               v               v
    ┌─────────────────┐ ┌──────────┐ ┌────────────────┐
    │   Deal Quest    │ │  TMA SDK │ │  Bot Commands  │
    │   React TMA     │ │  Bridge  │ │  (aiogram 3)   │
    │   (Vite + TS)   │ │          │ │  Python Bot    │
    └────────┬────────┘ └─────┬────┘ └───────┬────────┘
             |                |              |
             |        ┌──────┴──────┐       |
             |        │  startParam │       |
             |        │  initData   │       |
             |        │  BackButton │       |
             |        └─────────────┘       |
             |                              |
    ┌────────┴──────────────────────────────┴────────┐
    │              InsForge REST API                   │
    │         (PostgREST via /api/database/records)    │
    ├─────────────────────────────────────────────────┤
    │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
    │  │ Database  │  │   Auth   │  │   Storage    │  │
    │  │ (Postgres)│  │  (JWT)   │  │ (S3-compat)  │  │
    │  └──────────┘  └──────────┘  └──────────────┘  │
    │  ┌──────────┐  ┌──────────────────────────────┐ │
    │  │ Realtime  │  │   Edge Functions (serverless)│ │
    │  │(WebSocket)│  │   - initData verification    │ │
    │  └──────────┘  │   - JWT minting               │ │
    │                └──────────────────────────────┘ │
    └─────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| React TMA (`packages/webapp/`) | UI rendering, client state, page routing, Telegram SDK integration | InsForge REST API, Telegram SDK Bridge |
| Python Bot (`bot/`) | Text-based commands, AI agent orchestration, LLM routing, pipeline execution | InsForge REST API (via httpx), Telegram Bot API |
| InsForge Backend | Data persistence, auth, file storage, realtime subscriptions, edge functions | Both TMA and Bot via REST |
| TMA SDK Bridge | Passes initData for auth, manages BackButton, provides theme/viewport, deep links via startParam | Telegram Client, React TMA |
| Shared Types (`packages/shared/`) | TypeScript type definitions mirroring InsForge table schemas, shared constants | Consumed by React TMA at compile time |
| Edge Function: Auth Verifier | Validates Telegram initData signature, mints InsForge JWT for TMA sessions | InsForge Auth, React TMA |

## Recommended Project Structure

### Monorepo Layout

```
deal-quest-bot/
├── bot/                           # EXISTING Python bot (unchanged)
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── handlers/                  # Telegram command handlers
│   ├── services/                  # Business logic (LLM router, scoring, etc.)
│   ├── agents/                    # AI agents (strategist, trainer, memory)
│   ├── pipeline/                  # Pipeline execution
│   └── storage/                   # InsForge client + repositories
│       ├── insforge_client.py     # httpx-based PostgREST client
│       ├── repositories.py        # Repository pattern per table
│       └── models.py              # Pydantic models
├── packages/
│   ├── webapp/                    # React TMA (NEW)
│   │   ├── public/
│   │   │   └── mockEnv.ts         # Telegram env mock for dev
│   │   ├── src/
│   │   │   ├── app/               # App shell, providers, router
│   │   │   │   ├── App.tsx        # Root component with providers
│   │   │   │   ├── Router.tsx     # Route definitions
│   │   │   │   └── providers/     # Context providers (auth, theme, telegram)
│   │   │   ├── pages/             # Page components (one per TMA screen)
│   │   │   │   ├── Dashboard/
│   │   │   │   ├── Learn/
│   │   │   │   ├── Train/
│   │   │   │   ├── Support/
│   │   │   │   ├── Casebook/
│   │   │   │   ├── Profile/
│   │   │   │   └── Admin/
│   │   │   ├── features/          # Feature modules (co-located logic)
│   │   │   │   ├── auth/          # initData verification, JWT management
│   │   │   │   ├── leaderboard/   # Realtime leaderboard subscription
│   │   │   │   ├── gamification/  # XP, badges, streaks, animations
│   │   │   │   ├── training/      # Scenario cards, scoring display
│   │   │   │   └── analytics/     # Charts, progress tracking
│   │   │   ├── shared/            # Shared UI components
│   │   │   │   ├── ui/            # Design system components
│   │   │   │   ├── layouts/       # Page layouts, navigation shell
│   │   │   │   └── hooks/         # Shared custom hooks
│   │   │   ├── lib/               # Non-React utilities
│   │   │   │   ├── insforge.ts    # InsForge client singleton
│   │   │   │   ├── api/           # API layer (TanStack Query hooks)
│   │   │   │   └── telegram.ts    # Telegram SDK helpers
│   │   │   └── main.tsx           # Entry point
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   └── shared/                    # Shared types (NEW)
│       ├── src/
│       │   ├── index.ts
│       │   ├── tables.ts          # Table row types matching InsForge schema
│       │   ├── enums.ts           # Shared enums (badge types, levels, etc.)
│       │   └── constants.ts       # XP thresholds, level names, etc.
│       ├── tsconfig.json
│       └── package.json
├── pnpm-workspace.yaml            # NEW
├── package.json                   # NEW (root workspace)
├── .env.example
├── pyproject.toml                 # Python bot deps (existing)
├── railway.toml                   # Existing
└── CLAUDE.md                      # Existing
```

### Structure Rationale

- **`bot/` stays at root, untouched:** The existing Python bot has its own dependency management (venv, pyproject.toml). It lives outside pnpm workspaces. This preserves all existing bot functionality and avoids breaking changes.
- **`packages/webapp/` for React TMA:** Standard pnpm workspace package. Vite handles build and dev server. Feature-based organization keeps related code together.
- **`packages/shared/` for types:** TypeScript-only package consumed by `webapp`. Contains table row types that mirror the InsForge Postgres schema. The Python bot does not consume this directly (it has its own Pydantic models in `bot/storage/models.py`), but both stay in sync via the shared InsForge schema.
- **`pages/` vs `features/`:** Pages own the route-level component. Features own the business logic, API hooks, and sub-components for a specific domain. A page composes features. This prevents pages from becoming monolithic.
- **`lib/` for non-React code:** The InsForge client, API layer, and Telegram helpers are plain TypeScript. They have no React dependency, making them testable and reusable.

### pnpm Workspace Configuration

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
```

```json
// Root package.json
{
  "private": true,
  "scripts": {
    "dev": "pnpm --filter webapp dev",
    "build": "pnpm --filter webapp build",
    "lint": "pnpm --filter webapp lint",
    "typecheck": "pnpm -r typecheck"
  }
}
```

```json
// packages/webapp/package.json (partial)
{
  "name": "@deal-quest/webapp",
  "dependencies": {
    "@deal-quest/shared": "workspace:*"
  }
}
```

```json
// packages/shared/package.json (partial)
{
  "name": "@deal-quest/shared",
  "main": "src/index.ts"
}
```

**Python bot stays outside pnpm workspaces.** It uses its own venv and is started independently. The monorepo structure coordinates shared schema types but does not try to unify Python and Node.js dependency management.

## Architectural Patterns

### Pattern 1: Telegram initData Auth Flow

**What:** A three-step authentication flow that bridges Telegram identity into InsForge JWT sessions. The TMA never stores bot tokens. All verification happens server-side via an InsForge Edge Function.

**When to use:** Every TMA session start. The JWT is cached client-side and refreshed when expired.

**Trade-offs:**
- Pro: Cryptographic verification ensures tamper-proof identity. No passwords, no OAuth screens.
- Pro: JWT can carry InsForge-compatible claims, enabling row-level security.
- Con: Requires an InsForge Edge Function to be deployed (additional infrastructure). If Edge Functions are not available, a lightweight Node.js endpoint or the Python bot's HTTP server can substitute.
- Con: initData has a limited validity window (check `auth_date`), so the TMA must request a new JWT if the session is stale.

**Flow:**

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────┐
│  Telegram Client │    │  React TMA       │    │  InsForge Edge Func  │
│                  │    │                  │    │  /verify-telegram    │
└────────┬─────────┘    └────────┬─────────┘    └──────────┬───────────┘
         │                       │                          │
         │  Opens TMA with       │                          │
         │  initData + hash      │                          │
         │──────────────────────>│                          │
         │                       │                          │
         │                       │  POST /verify-telegram   │
         │                       │  Body: { initDataRaw }   │
         │                       │─────────────────────────>│
         │                       │                          │
         │                       │         Validates:       │
         │                       │         1. HMAC-SHA256   │
         │                       │            with bot token│
         │                       │         2. auth_date     │
         │                       │            freshness     │
         │                       │         3. Upsert user   │
         │                       │            in InsForge   │
         │                       │                          │
         │                       │  { jwt, user }           │
         │                       │<─────────────────────────│
         │                       │                          │
         │                       │  Store JWT in memory     │
         │                       │  (NOT localStorage)      │
         │                       │                          │
         │                       │  All subsequent API calls│
         │                       │  use: Authorization:     │
         │                       │  Bearer {jwt}            │
```

**Example:**

```typescript
// features/auth/useAuth.ts
import { retrieveLaunchParams } from '@telegram-apps/sdk-react';
import { insforge } from '@/lib/insforge';

export async function authenticateWithTelegram(): Promise<AuthResult> {
  const { initDataRaw } = retrieveLaunchParams();

  // Call InsForge Edge Function to verify initData and get JWT
  const response = await fetch(
    `${import.meta.env.VITE_INSFORGE_URL}/api/functions/verify-telegram`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initDataRaw }),
    }
  );

  const { jwt, user } = await response.json();

  // Configure InsForge client with the JWT for all subsequent calls
  insforge.setAuth(jwt);

  return { jwt, user };
}
```

### Pattern 2: API Layer with TanStack Query + InsForge Client

**What:** A two-layer API architecture. The bottom layer is a thin InsForge client wrapper (similar to the existing Python `InsForgeClient`). The top layer is TanStack Query hooks that provide caching, background refresh, optimistic updates, and loading/error states.

**When to use:** All data fetching and mutations in the TMA.

**Trade-offs:**
- Pro: TanStack Query handles 80% of server-state management, eliminating manual loading/error state tracking.
- Pro: InsForge client mirrors the existing Python pattern (PostgREST query params), making both clients consistent.
- Con: Two abstractions can feel heavy for simple CRUD. For a 7-page TMA, the benefit outweighs the cost.

**Example:**

```typescript
// lib/insforge.ts — thin client (mirrors Python InsForgeClient)
import { createClient } from '@insforge/sdk';

export const insforge = createClient({
  baseUrl: import.meta.env.VITE_INSFORGE_URL,
});

// lib/api/leaderboard.ts — TanStack Query hooks
import { useQuery } from '@tanstack/react-query';
import { insforge } from '@/lib/insforge';

export function useLeaderboard(limit = 10) {
  return useQuery({
    queryKey: ['leaderboard', limit],
    queryFn: async () => {
      const data = await insforge.from('users')
        .select('telegram_id, username, first_name, total_xp, current_level')
        .order('total_xp', { ascending: false })
        .limit(limit);
      return data;
    },
    staleTime: 30_000, // 30s — leaderboard can be slightly stale
  });
}

// Usage in component
function LeaderboardPreview() {
  const { data, isLoading, error } = useLeaderboard(5);
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorCard error={error} />;
  return <LeaderboardList users={data} />;
}
```

**Note on InsForge SDK:** The `@insforge/sdk` provides `createClient()` with a Supabase-like API. If the SDK's query builder does not fully cover PostgREST filter operators, fall back to raw `fetch` calls against `/api/database/records/{table}` with PostgREST query parameters, exactly like the Python bot does with `httpx`. The REST API surface is identical regardless of client language.

### Pattern 3: Zustand for Client State + TanStack Query for Server State

**What:** Split state management by origin. Server data (API responses) lives in TanStack Query cache. Client-only state (form wizard steps, active filters, UI toggles, animation triggers) lives in Zustand stores.

**When to use:** The TMA has complex client state requirements: multi-step training flows, form wizards in Support mode, chart filter selections, badge animation triggers.

**Trade-offs:**
- Pro: Clean separation. No duplicating server data in client stores.
- Pro: Zustand is ~1KB gzipped. Essential for TMA performance on mobile.
- Pro: TanStack Query handles cache invalidation, refetching, and stale-while-revalidate automatically.
- Con: Developers must be disciplined about which state goes where. Rule of thumb: "If it came from the server, it belongs in TanStack Query. If it only exists in the browser, it belongs in Zustand."

**Example:**

```typescript
// features/training/store.ts — Zustand for client state
import { create } from 'zustand';

interface TrainingState {
  currentScenarioId: string | null;
  responseText: string;
  isTimerRunning: boolean;
  elapsedSeconds: number;
  setScenario: (id: string) => void;
  setResponse: (text: string) => void;
  startTimer: () => void;
  tick: () => void;
  reset: () => void;
}

export const useTrainingStore = create<TrainingState>((set) => ({
  currentScenarioId: null,
  responseText: '',
  isTimerRunning: false,
  elapsedSeconds: 0,
  setScenario: (id) => set({ currentScenarioId: id, responseText: '', elapsedSeconds: 0 }),
  setResponse: (text) => set({ responseText: text }),
  startTimer: () => set({ isTimerRunning: true }),
  tick: () => set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 })),
  reset: () => set({ currentScenarioId: null, responseText: '', isTimerRunning: false, elapsedSeconds: 0 }),
}));
```

### Pattern 4: Routing with react-router-dom + TMA Navigator Integration

**What:** Use `react-router-dom` v6 with `BrowserRouter` for page navigation, integrated with the Telegram SDK's navigation state via `@telegram-apps/react-router-integration`. This synchronizes the Telegram BackButton with the router history.

**When to use:** All page transitions in the TMA.

**Trade-offs:**
- Pro: Official TMA integration handles BackButton show/hide automatically.
- Pro: `BrowserRouter` gives clean URLs (no hash fragments).
- Con: Requires hosting configuration to redirect all paths to `index.html`. Both Vercel and Netlify support this trivially. InsForge Site Deployment also supports SPA routing.
- Con: `@telegram-apps/react-router-integration` is pinned to react-router v6 basic API. TanStack Router was considered but has no official TMA integration, and the benefit of type-safe routes does not outweigh the integration risk for 7 pages.

**Example:**

```typescript
// app/Router.tsx
import { useMemo, useEffect } from 'react';
import { Router, Route, Routes, Navigate } from 'react-router-dom';
import { useIntegration } from '@telegram-apps/react-router-integration';
import { initNavigator } from '@telegram-apps/sdk-react';

import { Dashboard } from '@/pages/Dashboard';
import { Learn } from '@/pages/Learn';
import { Train } from '@/pages/Train';
import { Support } from '@/pages/Support';
import { Casebook } from '@/pages/Casebook';
import { Profile } from '@/pages/Profile';
import { Admin } from '@/pages/Admin';

export function AppRouter() {
  const navigator = useMemo(() => initNavigator('app-navigation-state'), []);
  const [location, reactNavigator] = useIntegration(navigator);

  useEffect(() => {
    navigator.attach();
    return () => navigator.detach();
  }, [navigator]);

  return (
    <Router location={location} navigator={reactNavigator}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/learn/*" element={<Learn />} />
        <Route path="/train/*" element={<Train />} />
        <Route path="/support/*" element={<Support />} />
        <Route path="/casebook" element={<Casebook />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin/*" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
```

### Pattern 5: Realtime Leaderboard via InsForge Realtime (WebSocket)

**What:** Subscribe to the `users` table (or a materialized view) for XP changes using InsForge's Realtime WebSocket channel. Update the TanStack Query cache reactively so the leaderboard reflects changes without polling.

**When to use:** Dashboard leaderboard preview and full leaderboard view.

**Trade-offs:**
- Pro: Instant updates when any team member earns XP (via bot or TMA).
- Pro: Leverages InsForge's built-in Realtime (Supabase-compatible pub/sub).
- Con: Requires configuring Realtime on the InsForge project. If Realtime is not available, fall back to polling with a 30-second `refetchInterval` in TanStack Query (acceptable for a small team).

**Example:**

```typescript
// features/leaderboard/useRealtimeLeaderboard.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { insforge } from '@/lib/insforge';

export function useRealtimeLeaderboard() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = insforge
      .channel('leaderboard-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: 'total_xp=gt.0',
      }, () => {
        // Invalidate the leaderboard query so TanStack Query refetches
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      })
      .subscribe();

    return () => {
      insforge.removeChannel(channel);
    };
  }, [queryClient]);
}
```

**Fallback (polling):**

```typescript
// If Realtime is unavailable, add refetchInterval to the query
export function useLeaderboard(limit = 10) {
  return useQuery({
    queryKey: ['leaderboard', limit],
    queryFn: fetchLeaderboard,
    staleTime: 30_000,
    refetchInterval: 30_000, // Poll every 30s as fallback
  });
}
```

## Data Flow

### Request Flow (TMA to InsForge)

```
[User taps button in TMA]
    |
[React Component] -> [TanStack Query hook] -> [InsForge client] -> [InsForge REST API]
    |                      |                        |                     |
[UI updates]    [Cache check]          [HTTP request]     [PostgREST -> Postgres]
    ^                      |                        |                     |
    |              [Cache hit?]               [Response]           [Query result]
    |               YES: return                     |                     |
    |               NO: fetch                       |                     |
    |                      |                        |                     |
[Re-render] <---- [Update cache] <------------ [JSON response] <---------+
```

### Auth Flow (TMA Session Lifecycle)

```
[Telegram opens TMA]
    |
[TMA loads, retrieves initDataRaw from launch params]
    |
[POST initDataRaw to Edge Function /verify-telegram]
    |
[Edge Function: HMAC-SHA256 verify with BOT_TOKEN]
    |--- FAIL: Show error, close TMA
    |--- PASS:
         |
         [Upsert user row in InsForge (telegram_id as key)]
         |
         [Mint JWT with claims: { sub: user.id, telegram_id, role }]
         |
         [Return JWT + user object to TMA]
         |
         [TMA stores JWT in memory (Zustand auth store)]
         |
         [All InsForge API calls include: Authorization: Bearer {jwt}]
         |
         [JWT expires? Re-run auth flow (transparent to user)]
```

### Bot-TMA Data Bridge

```
BOT SIDE (Python):                     TMA SIDE (React):

/support command
  |
  Bot generates strategy
  Bot saves to InsForge
  |
  Bot sends message with
  InlineKeyboardButton:
    "Open in App"
    web_app=WebAppInfo(
      url="https://tma.deal-quest.app
        ?page=support
        &session_id=abc123"
    )
  |
  OR: use startParam for deep link
    t.me/DealQuestBot/app
      ?startapp=support_abc123

                                  ---> TMA opens
                                       |
                                       Parse startParam or URL params
                                       |
                                       Route to /support page
                                       |
                                       Fetch session_id=abc123
                                       from InsForge
                                       |
                                       Display rich strategy view
                                       with charts, copy buttons,
                                       engagement checklist
```

**Communication methods between bot and TMA:**

| Method | Direction | Use Case | Limit |
|--------|-----------|----------|-------|
| `startParam` (deep link) | Bot -> TMA | Open specific page/item in TMA | 512 chars, A-Z a-z 0-9 _ - only |
| `WebAppInfo.url` (query params) | Bot -> TMA | Pass page + context to TMA via inline button | URL length limit |
| Shared InsForge database | Both read/write | TMA reads data bot wrote, and vice versa. This is the primary data bridge. | No limit |
| `sendData()` | TMA -> Bot | Send small payload back to bot (closes TMA). Use sparingly. | 4096 bytes, one-time |
| `answerWebAppQuery` | TMA -> Bot (via server) | Respond to inline query from TMA. | Requires `query_id` |

**Recommended approach:** Use the shared InsForge database as the primary data bridge. The bot writes data (support sessions, training results, etc.) to InsForge. The TMA reads the same data. The `startParam` or URL query params only carry enough context to look up the relevant record (e.g., a session ID). Avoid `sendData()` except for one-shot actions like "confirm selection."

### State Management Summary

```
┌───────────────────────────────────────────────────────────────┐
│                         STATE MAP                              │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  SERVER STATE (TanStack Query)         CLIENT STATE (Zustand) │
│  ─────────────────────────             ─────────────────────  │
│  - User profile data                  - Auth JWT token        │
│  - Leaderboard rankings               - Active page filters   │
│  - Training scenarios                  - Form wizard step      │
│  - Attempt history                     - Timer state           │
│  - Learning track progress             - UI toggles            │
│  - Support sessions                    - Animation triggers    │
│  - Casebook entries                    - Search/filter text    │
│  - Badge collection                    - Pending submissions   │
│  - Admin analytics                     - Theme overrides       │
│                                                               │
│  FORM STATE (React Hook Form)          URL STATE (Router)     │
│  ────────────────────────              ─────────────────────  │
│  - Support mode inputs                 - Current route         │
│  - Training response text              - Route params (:id)    │
│  - Profile settings form               - Deep link context     │
│  - Admin content forms                                         │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-50 users (current) | Single InsForge instance, no caching beyond TanStack Query, polling fallback for leaderboard is fine |
| 50-500 users | Enable InsForge Realtime for leaderboard, add connection pooling awareness, consider CDN for TMA static assets |
| 500+ users | Optimize InsForge queries with database indexes (already have PostgREST), consider read replicas if DB becomes bottleneck, implement pagination in TanStack Query |

### Scaling Priorities

1. **First bottleneck: TMA bundle size on slow mobile connections.** Telegram Mini Apps load inside Telegram's WebView. Code-split by route with `React.lazy()` and Vite's dynamic imports. Keep initial bundle under 200KB gzipped. This matters more than server scaling for a team of 5-50 users.
2. **Second bottleneck: InsForge API latency for chart/analytics pages.** Dashboard and Admin pages fetch multiple tables. Use TanStack Query's parallel queries (`useQueries`) and prefetching (`prefetchQuery` on route hover) to avoid waterfall loading. Consider creating database views for pre-aggregated analytics data.

## Anti-Patterns

### Anti-Pattern 1: Building a BFF (Backend-for-Frontend)

**What people do:** Create a Node.js API server between the TMA and InsForge, thinking the TMA "needs its own backend."
**Why it's wrong:** InsForge already exposes a REST API with auth, row-level security, and storage. Adding a BFF duplicates what InsForge provides, adds latency, and creates another deployment to maintain. The existing Python bot already handles all AI/LLM logic that the TMA should not do directly.
**Do this instead:** TMA talks directly to InsForge REST API. Use InsForge Edge Functions for the one piece of custom server logic needed (initData verification and JWT minting). AI-related operations stay in the Python bot; the TMA reads their results from InsForge.

### Anti-Pattern 2: Using TelegramUI Component Library for Custom Branding

**What people do:** Start with `@telegram-mini-apps-dev/TelegramUI` components, then fight the library to match a custom brand identity.
**Why it's wrong:** TelegramUI is designed to look like Telegram's native interface. Deal Quest requires a distinctive, branded design system. Overriding TelegramUI's styles is more work than building from scratch with Tailwind CSS.
**Do this instead:** Build a custom design system with Tailwind CSS. Use `useThemeParams()` from the Telegram SDK to read the user's dark/light preference and Telegram's color variables, then map them to your design tokens. This gives brand control while respecting the user's Telegram theme.

### Anti-Pattern 3: Storing JWT in localStorage

**What people do:** Store the InsForge JWT in `localStorage` for persistence across TMA reopens.
**Why it's wrong:** Telegram Mini Apps can be opened in shared WebViews. `localStorage` is accessible to other Mini Apps on the same domain (unlikely but possible with subdomain sharing). More importantly, TMAs already get fresh `initData` on every open, so the JWT can be re-minted cheaply.
**Do this instead:** Store JWT in Zustand (memory only). On every TMA open, re-run the auth flow. It adds ~200ms but is secure by default.

### Anti-Pattern 4: Duplicating Bot Logic in the TMA

**What people do:** Re-implement LLM calls, scoring algorithms, or pipeline logic in the TMA's TypeScript code.
**Why it's wrong:** The bot already has tested, production LLM routing, scoring, and agent orchestration. Duplicating it creates drift and doubles maintenance. The TMA is a visual layer, not a second brain.
**Do this instead:** TMA triggers AI operations by writing a request to InsForge (e.g., creating a `support_sessions` row with status=pending). The bot picks up pending requests (via polling or webhook) and writes results back. The TMA displays results. This keeps all AI logic in Python.

### Anti-Pattern 5: Fetching Data Inside Components Without TanStack Query

**What people do:** Use raw `useEffect` + `fetch` + manual `useState` for loading/error/data in components.
**Why it's wrong:** This leads to loading state management boilerplate in every component, no caching (redundant fetches on route changes), no background refresh, no optimistic updates, and waterfall data fetching.
**Do this instead:** All InsForge data access goes through TanStack Query hooks. One hook per resource. Components consume hooks. Caching, deduplication, and refresh happen automatically.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Telegram Bot API | Python bot uses aiogram 3 via long polling | Bot and TMA are separate processes; they share data via InsForge |
| Telegram WebApp SDK | `@telegram-apps/sdk-react` in TMA | Provides initData, BackButton, MainButton, theme, haptics, viewport |
| InsForge Database | REST API (PostgREST) from both bot and TMA | Same tables, same API, different clients (httpx vs @insforge/sdk) |
| InsForge Storage | REST API for file upload/download | Bot uploads prospect photos; TMA displays them via public URL |
| InsForge Realtime | WebSocket subscription from TMA | Leaderboard live updates; optional, polling fallback available |
| InsForge Edge Functions | HTTPS endpoints deployed to InsForge | Primary use: initData verification + JWT minting |
| OpenRouter / Claude API | Called from Python bot only | TMA never calls LLM APIs directly |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| TMA <-> InsForge | REST over HTTPS, authorized with JWT | TMA uses `@insforge/sdk` or raw fetch with PostgREST params |
| Bot <-> InsForge | REST over HTTPS, authorized with anon key | Bot uses custom `InsForgeClient` (httpx). Exact same REST endpoints. |
| Bot <-> TMA | No direct communication. Shared database is the bridge. | Bot writes results, TMA reads them. `startParam` for deep links. |
| Pages <-> Features | React imports | Pages compose feature components and hooks. Features are self-contained modules. |
| Features <-> API Layer | TanStack Query hooks | Features call API hooks. They do not import InsForge client directly. |
| API Layer <-> InsForge Client | Function calls | TanStack Query hooks call InsForge client methods. The client handles HTTP. |

## Suggested Build Order

The following build order respects component dependencies. Each layer builds on the previous one.

### Layer 1: Foundation (no visible UI yet)
1. **Monorepo scaffold** — pnpm workspace, `packages/webapp/` with Vite + React + TS, `packages/shared/` with types. Verify `pnpm dev` starts the app.
2. **InsForge client setup** — Initialize `@insforge/sdk` in `lib/insforge.ts`. Verify a simple query works.
3. **Shared types** — Create TypeScript interfaces for all InsForge tables (mirror `bot/storage/models.py`).
4. **Telegram SDK integration** — Initialize `@telegram-apps/sdk-react`, set up `mockEnv.ts` for browser development, verify `initData` is accessible.
5. **Auth flow** — Edge Function for initData verification + JWT minting. Auth provider in React. Test: TMA opens, user is authenticated, JWT is stored.

*Dependency: Everything else depends on auth working.*

### Layer 2: Shell (navigation works, pages are stubs)
6. **Router setup** — `react-router-dom` with TMA navigator integration. All 7 routes defined with placeholder pages.
7. **Layout shell** — Bottom navigation bar, page transitions, BackButton integration.
8. **Design system foundation** — Tailwind config with Deal Quest tokens, base components (Button, Card, Badge, Skeleton).

*Dependency: All pages depend on router and layout.*

### Layer 3: Data Layer (API works, state management wired)
9. **TanStack Query setup** — QueryClient provider, devtools in dev mode.
10. **API hooks** — One hook per major resource: `useUser`, `useLeaderboard`, `useAttempts`, `useTrackProgress`, `useCasebook`, `useBadges`.
11. **Zustand stores** — Auth store (JWT), training store (timer, response), UI store (filters, toggles).

*Dependency: Pages need API hooks to display real data.*

### Layer 4: Core Pages (one at a time, each testable)
12. **Dashboard** — XP progress, weekly activity chart, leaderboard preview, quick actions. First page to prove the full stack works end-to-end.
13. **Profile** — User stats, attempt history, badge wall, settings.
14. **Learn** — Track visualization, level cards, score display. Reads `track_progress` and `attempts`.
15. **Train** — Scenario card, timer, response input, scoring results. Reads/writes `attempts` and `scenarios_seen`.
16. **Casebook** — Searchable gallery, quality indicators. Reads `casebook`.
17. **Support** — Strategy display, engagement checklist, draft with copy. Reads `support_sessions`.
18. **Admin** — Team charts, member rankings, content management. Reads aggregated data.

### Layer 5: Realtime + Gamification (polish)
19. **Realtime leaderboard** — WebSocket subscription or polling fallback.
20. **Gamification visuals** — Level-up animations, streak indicators, XP gain animations, badge earn effects.
21. **Bot hybrid integration** — Add "Open in App" inline buttons to bot responses. Parse `startParam` in TMA for deep linking.

**Key ordering constraints:**
- Auth (Layer 1) blocks everything.
- Router + layout (Layer 2) blocks all pages.
- API hooks (Layer 3) block pages that display data.
- Dashboard (Layer 4, first page) proves the full stack end-to-end before building other pages.
- Realtime + gamification (Layer 5) are enhancements that can be deferred without blocking core functionality.

## Sources

- [Telegram Mini Apps Init Data documentation](https://docs.telegram-mini-apps.com/platform/init-data) — HIGH confidence. Official docs on initData structure, validation methods (HMAC-SHA256 and Ed25519).
- [Telegram Mini Apps react-router integration](https://docs.telegram-mini-apps.com/packages/telegram-apps-react-router-integration) — HIGH confidence. Official package for syncing react-router with TMA navigation state.
- [Telegram Mini Apps React Template (GitHub)](https://github.com/Telegram-Mini-Apps/reactjs-template) — HIGH confidence. Official reference implementation for React + Vite + TypeScript TMAs.
- [Telegram Mini Apps Methods documentation](https://docs.telegram-mini-apps.com/platform/methods) — HIGH confidence. Official docs on sendData, openURL, and other methods.
- [Telegram Mini Apps Start Parameter](https://docs.telegram-mini-apps.com/platform/start-parameter) — HIGH confidence. Official docs on startParam for deep linking.
- [SpyClub TMA Architecture (Etherwave Labs)](https://www.etherwavelabs.com/blog/building-spyclub-a-complete-guide-to-modern-telegram-mini-app-development) — MEDIUM confidence. Production case study of React + Supabase + Zustand TMA with realtime features.
- [TanStack Query official docs](https://tanstack.com/query/latest) — HIGH confidence. Server state management patterns.
- [Zustand state management](https://github.com/pmndrs/zustand) — HIGH confidence. Client state management with minimal API.
- [pnpm workspaces documentation](https://pnpm.io/workspaces) — HIGH confidence. Monorepo workspace configuration.
- [InsForge documentation](https://docs.insforge.dev/introduction) — MEDIUM confidence. InsForge SDK and API patterns. SDK API (`createClient`, database queries) is Supabase-compatible.
- [Existing Deal Quest bot InsForge client](/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/storage/insforge_client.py) — HIGH confidence. Production PostgREST client showing exact API patterns (query, create, update, upsert, delete, rpc, upload_file).
- [Existing Deal Quest bot repository pattern](/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/storage/repositories.py) — HIGH confidence. Production repository pattern showing table access patterns.

---
*Architecture research for: Telegram Mini App (React TMA) for Deal Quest sales training platform*
*Researched: 2026-02-01*
