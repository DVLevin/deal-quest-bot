# Phase 1: Foundation & Auth - Research

**Researched:** 2026-02-01
**Domain:** TMA scaffold, Telegram initData auth, InsForge integration, SPA routing, session resilience
**Confidence:** HIGH

## Summary

Phase 1 establishes the foundation for the Deal Quest Telegram Mini App: a working monorepo scaffold with React 18 + Vite 7, silent Telegram authentication via initData validation, an InsForge Edge Function that mints JWTs, a branded navigation shell with react-router v7, and session resilience via activated/deactivated events.

Research confirms the standard approach is well-documented. The `@insforge/sdk` provides a Supabase-like client API (`createClient`, `database.from().select()`, `functions.invoke()`, `realtime.connect()`) and is the correct client for this project -- NOT `@supabase/supabase-js`. InsForge Edge Functions run in Deno, accept a `module.exports = async function(request)` pattern, and can access `Deno.env.get()` for secrets. The auth flow requires a custom Edge Function since Telegram is not a native InsForge auth provider. All 10 existing database tables have **RLS disabled and zero policies** -- this must be addressed in Phase 1.

**Primary recommendation:** Use `@insforge/sdk` (not `@supabase/supabase-js`) for the TMA client. Build a `verify-telegram` Edge Function that validates initData HMAC-SHA256, upserts the user, and mints a JWT. Enable RLS on all tables before any client-facing code ships.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^18.3.1 | UI framework | TMA SDK (`@telegram-apps/sdk-react` v3.3.9) tested against React 18. React 19 not yet confirmed compatible. |
| TypeScript | ^5.9.x | Type safety | Non-negotiable. Official TMA templates use TS. Vite 7 has excellent TS support. |
| Vite | ^7.3.x | Build tool / dev server | Official TMA template tool. Dedicated Tailwind v4 plugin via `@tailwindcss/vite`. Requires Node 20.19+ or 22.12+. |
| @telegram-apps/sdk-react | ^3.3.9 | TMA SDK (React bindings) | Official React bindings. Re-exports `@telegram-apps/sdk` -- do NOT install both. Key hook: `useSignal` for reactive signal access. **Breaking v3 change:** `useLaunchParams` removed; use `retrieveLaunchParams` directly. |
| react-router | ^7.12.x | Client-side SPA routing | v7 declarative mode. Import everything from `react-router` (NOT `react-router-dom`). Manual BackButton integration required -- the old `@telegram-apps/react-router-integration` is v6-only and unmaintained. |
| Tailwind CSS | ^4.1.x | Utility-first CSS | CSS-first config via `@theme` directive (no `tailwind.config.js`). **IMPORTANT NOTE:** InsForge docs recommend Tailwind v3.4, but the project decision locks v4. Tailwind v4 uses modern CSS features (`@property`, `color-mix()`, cascade layers) that are supported by Telegram WebView (Chromium 80+ on Android, WKWebView iOS 15.4+). This should work but needs validation on oldest supported Telegram clients. |
| @insforge/sdk | latest | Backend client | InsForge's own TypeScript SDK. Provides `createClient()` with `.database`, `.auth`, `.functions`, `.realtime` namespaces. API is Supabase-like but NOT identical. Use this instead of `@supabase/supabase-js`. |
| Zustand | ^5.0.10 | Client-side state | 3KB, no Provider. Stores auth JWT, UI state, navigation state. |
| @tanstack/react-query | ^5.90.x | Server state / data fetching | Caching, background refetch, optimistic updates. Pairs with InsForge client for all data ops. |

### Supporting (Phase 1 only)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx | ^2.x | Conditional class names | Every component with conditional styling. |
| tailwind-merge | ^3.x | Tailwind class conflict resolution | Any component accepting `className` prop overrides. |
| class-variance-authority (CVA) | ^0.7.x | Component variant definitions | Buttons, cards, badges -- component variants. |
| lucide-react | ^0.562.x | Icon set | All UI icons. Tree-shakable SVG. |
| eruda | ^3.4.3 | Mobile debugging console | Dev only. `import.meta.env.DEV && import('eruda').then(m => m.default.init())`. Essential -- WebView has no devtools. |
| vite-plugin-mkcert | ^1.17.8 | Local HTTPS certificates | Dev only. Telegram mandates HTTPS. Better than `@vitejs/plugin-basic-ssl` (self-signed certs fail on iOS/Android). |
| @vitejs/plugin-react-swc | latest | React compilation via SWC | Fast React transforms. Used in Vite config. |
| vite-tsconfig-paths | latest | TS path alias resolution | Enables `@/` imports in Vite. |
| jose | ^6.x | JWT signing (Edge Function) | Used inside the Edge Function to mint JWTs. Lightweight, works in Deno. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @insforge/sdk | @supabase/supabase-js | InsForge's API is Supabase-*like* but has different endpoint structure (`/api/database/records/` vs Supabase's `/rest/v1/`). The InsForge SDK handles this correctly. Using `@supabase/supabase-js` would require manual base URL hacking and may miss InsForge-specific features (functions, realtime). Use `@insforge/sdk`. |
| Tailwind CSS v4 | Tailwind CSS v3.4 | InsForge docs recommend v3.4. However, project decision locks v4. v4's `@theme` directive is cleaner for design tokens. Risk: v4 uses modern CSS features; must validate on Telegram WebView. Mitigation: test on oldest supported Telegram client early. |
| Manual BackButton hook | @telegram-apps/react-router-integration | The integration package (v1.0.1) is designed for react-router-dom v6 `<Router navigator={...}>` pattern. Does not support react-router v7. Manual approach is ~20 lines and provides full control. |
| jose (JWT library) | jsonwebtoken | `jose` works in Deno (Edge Functions run Deno). `jsonwebtoken` is Node-only. |

**Installation (Phase 1):**

```bash
# Core
pnpm add react react-dom @telegram-apps/sdk-react react-router \
  @insforge/sdk @tanstack/react-query zustand

# Styling
pnpm add tailwindcss @tailwindcss/vite clsx tailwind-merge class-variance-authority

# Icons
pnpm add lucide-react

# Debugging (loaded conditionally)
pnpm add eruda

# Dev dependencies
pnpm add -D typescript @types/react @types/react-dom \
  @vitejs/plugin-react-swc vite vite-plugin-mkcert vite-tsconfig-paths
```

## Architecture Patterns

### Recommended Project Structure

```
deal-quest-bot/
├── bot/                           # EXISTING Python bot (UNCHANGED)
│   ├── storage/
│   │   ├── insforge_client.py     # httpx PostgREST client (reference for TS port)
│   │   ├── repositories.py        # Repository pattern per table
│   │   └── models.py              # Pydantic models (source of truth for shared types)
│   └── config.py                  # Env config (INSFORGE_BASE_URL, INSFORGE_ANON_KEY, TELEGRAM_BOT_TOKEN)
├── packages/
│   ├── webapp/                    # React TMA (NEW)
│   │   ├── public/
│   │   │   └── mockEnv.ts         # Telegram env mock for browser dev
│   │   ├── src/
│   │   │   ├── app/               # App shell, providers, router
│   │   │   │   ├── App.tsx        # Root: SDKProvider -> AuthProvider -> QueryProvider -> Router
│   │   │   │   ├── Router.tsx     # Route definitions with BackButton hook
│   │   │   │   └── providers/     # TelegramProvider, AuthProvider, QueryProvider
│   │   │   ├── pages/             # Page components (stubs in Phase 1)
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Learn.tsx
│   │   │   │   ├── Train.tsx
│   │   │   │   ├── Support.tsx
│   │   │   │   ├── Casebook.tsx
│   │   │   │   ├── Leads.tsx
│   │   │   │   ├── Profile.tsx
│   │   │   │   └── Admin.tsx
│   │   │   ├── features/
│   │   │   │   └── auth/          # initData auth, JWT management, auth store
│   │   │   ├── shared/
│   │   │   │   ├── ui/            # Design system: Button, Card, Badge, Skeleton, NavBar
│   │   │   │   ├── layouts/       # AppLayout (nav shell + safe area)
│   │   │   │   └── hooks/         # useBackButton, useTelegramTheme, useSessionResilience
│   │   │   ├── lib/
│   │   │   │   ├── insforge.ts    # InsForge client singleton
│   │   │   │   └── telegram.ts    # Telegram SDK init + helpers
│   │   │   └── main.tsx           # Entry point
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── shared/                    # Shared types (NEW)
│       ├── src/
│       │   ├── index.ts
│       │   ├── tables.ts          # TypeScript interfaces mirroring InsForge tables
│       │   ├── enums.ts           # Shared enums (status values, modes, etc.)
│       │   └── constants.ts       # XP thresholds, level names, etc.
│       ├── tsconfig.json
│       └── package.json
├── functions/                     # InsForge Edge Functions (NEW)
│   └── verify-telegram/
│       └── index.ts               # initData validation + JWT minting
├── pnpm-workspace.yaml            # NEW
├── package.json                   # NEW (root workspace)
└── CLAUDE.md                      # EXISTING (git workflow rules)
```

### Pattern 1: InsForge Edge Function for Telegram Auth

**What:** A Deno-based Edge Function deployed to InsForge that validates Telegram initData and mints a JWT. This is the authentication gateway -- no TMA API call succeeds without passing through it first.

**Confidence:** HIGH (InsForge Edge Function API verified via MCP tools; Telegram HMAC-SHA256 algorithm from official docs)

**Edge Function Pattern (InsForge-specific):**

```typescript
// functions/verify-telegram/index.ts
// InsForge Edge Functions use: module.exports = async function(request) { ... }
// createClient is injected by the runtime. Deno.env.get() for secrets.

module.exports = async function(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { initDataRaw } = await request.json();
    if (!initDataRaw) {
      return new Response(JSON.stringify({ error: 'Missing initDataRaw' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Parse initData into key-value pairs
    const params = new URLSearchParams(initDataRaw);
    const hash = params.get('hash');
    params.delete('hash');

    // 2. Sort alphabetically and create data-check-string
    const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

    // 3. HMAC-SHA256 validation
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const encoder = new TextEncoder();

    // secret_key = HMAC-SHA256("WebAppData", bot_token)
    const secretKey = await crypto.subtle.importKey(
      'raw', encoder.encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const secretHash = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(botToken));

    // computed_hash = HMAC-SHA256(secret_key, data_check_string)
    const validationKey = await crypto.subtle.importKey(
      'raw', secretHash, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const computedHash = await crypto.subtle.sign('HMAC', validationKey, encoder.encode(dataCheckString));

    // Compare hex
    const computedHex = [...new Uint8Array(computedHash)]
      .map(b => b.toString(16).padStart(2, '0')).join('');

    if (computedHex !== hash) {
      return new Response(JSON.stringify({ error: 'Invalid initData signature' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Check auth_date freshness (reject > 1 hour)
    const authDate = parseInt(params.get('auth_date') || '0');
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 3600) {
      return new Response(JSON.stringify({ error: 'initData expired' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Extract user info
    const userData = JSON.parse(params.get('user') || '{}');
    const telegramId = userData.id;

    // 6. Upsert user in InsForge
    const client = createClient({
      baseUrl: Deno.env.get('INSFORGE_INTERNAL_URL') || 'http://insforge:7130',
      anonKey: Deno.env.get('ANON_KEY'),
    });

    // Upsert by telegram_id (unique constraint exists)
    const { data: existingUsers } = await client.database
      .from('users')
      .select('id, telegram_id')
      .eq('telegram_id', telegramId)
      .limit(1);

    let userId;
    if (existingUsers && existingUsers.length > 0) {
      userId = existingUsers[0].id;
      // Update last_active_at and username/first_name
      await client.database
        .from('users')
        .update({
          username: userData.username || null,
          first_name: userData.first_name || null,
          last_active_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('telegram_id', telegramId);
    } else {
      const { data: newUser } = await client.database
        .from('users')
        .insert({
          telegram_id: telegramId,
          username: userData.username || null,
          first_name: userData.first_name || null,
          last_active_at: new Date().toISOString(),
        })
        .select();
      userId = newUser?.[0]?.id;
    }

    // 7. Mint JWT (HS256 signed with InsForge JWT secret)
    // Note: The exact JWT secret and signing approach depends on InsForge's
    // JWT infrastructure. This may use jose library or InsForge's internal
    // auth.signUp/signIn methods. See Open Questions section.
    const jwtSecret = Deno.env.get('JWT_SECRET');
    // ... sign JWT with { sub: String(userId), telegram_id: telegramId, role: 'authenticated' }

    return new Response(JSON.stringify({
      jwt: signedToken,
      user: { id: userId, telegram_id: telegramId, ...userData },
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};
```

### Pattern 2: TMA SDK v3 Initialization Sequence

**What:** The correct order to initialize `@telegram-apps/sdk-react` v3. Components must be individually mounted before use.

**Confidence:** HIGH (verified from official SDK v3 docs and npm)

```typescript
// lib/telegram.ts
import { init, backButton, mainButton, secondaryButton,
         miniApp, themeParams, viewport, swipeBehavior,
         closingBehavior, retrieveLaunchParams } from '@telegram-apps/sdk-react';

export function initTelegramSDK() {
  // 1. Initialize the SDK (MUST be first)
  init();

  // 2. Mount each component you plan to use
  // Each component must be mounted to get its actual state from Telegram
  backButton.mount();
  mainButton.mount();
  // secondaryButton.mount();  // Mount when needed (Bot API 7.10+)
  themeParams.mount();
  miniApp.mount();

  // 3. Viewport requires async binding
  viewport.mount().then(() => {
    viewport.bindCssVars();  // Creates --tg-viewport-* CSS variables
  });

  // 4. Bind theme CSS vars for Telegram color adaptation
  themeParams.bindCssVars();

  // 5. Configure behaviors
  if (swipeBehavior.mount.isAvailable()) {
    swipeBehavior.mount();
    swipeBehavior.disableVertical();  // Prevent accidental close during forms
  }

  // 6. Expand the mini app to full height
  if (!miniApp.isMounted()) miniApp.mount();
  miniApp.ready();
}

export function getLaunchParams() {
  // v3 breaking change: useLaunchParams() hook removed
  // Use retrieveLaunchParams() directly instead
  return retrieveLaunchParams();
}
```

### Pattern 3: BackButton Integration with react-router v7

**What:** Manual BackButton sync since the official integration package only supports v6.

**Confidence:** HIGH (verified approach; ~20 lines)

```typescript
// shared/hooks/useBackButton.ts
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { backButton } from '@telegram-apps/sdk-react';

export function useBackButton() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Root route: hide back button
    if (location.pathname === '/') {
      if (backButton.hide.isAvailable()) {
        backButton.hide();
      }
      return;
    }

    // Non-root routes: show back button, wire click to navigate(-1)
    if (backButton.show.isAvailable()) {
      backButton.show();
    }

    const off = backButton.onClick(() => {
      navigate(-1);
    });

    return () => {
      off(); // Unsubscribe on cleanup
    };
  }, [location.pathname, navigate]);
}
```

### Pattern 4: MainButton and SecondaryButton Usage

**What:** How to wire Telegram's native bottom buttons to React component actions.

**Confidence:** HIGH (official SDK v3 docs verified)

```typescript
// Example: MainButton for primary CTA
import { useEffect } from 'react';
import { mainButton, secondaryButton } from '@telegram-apps/sdk-react';

export function useMainButton(text: string, onClick: () => void, visible = true) {
  useEffect(() => {
    if (!mainButton.setParams.isAvailable()) return;

    mainButton.setParams({
      text,
      isVisible: visible,
      isEnabled: true,
    });

    const off = mainButton.onClick(onClick);

    return () => {
      off();
      mainButton.setParams({ isVisible: false });
    };
  }, [text, onClick, visible]);
}

// SecondaryButton for scenario branching (Bot API 7.10+)
export function useSecondaryButton(text: string, onClick: () => void, visible = true) {
  useEffect(() => {
    if (!secondaryButton.mount.isAvailable()) return;
    secondaryButton.mount();

    secondaryButton.setParams({
      text,
      isVisible: visible,
      isEnabled: true,
      position: 'top',  // Positioned above MainButton
    });

    const off = secondaryButton.onClick(onClick);

    return () => {
      off();
      secondaryButton.setParams({ isVisible: false });
    };
  }, [text, onClick, visible]);
}
```

### Pattern 5: InsForge Client Setup with Auth Token

**What:** Configure `@insforge/sdk` with a dynamically provided JWT from the auth flow.

**Confidence:** MEDIUM (InsForge SDK API verified from docs, but exact token injection pattern may differ from Supabase's `accessToken` callback)

```typescript
// lib/insforge.ts
import { createClient } from '@insforge/sdk';

// Create a base client for unauthenticated requests (initial auth call)
export const insforgeAnon = createClient({
  baseUrl: import.meta.env.VITE_INSFORGE_URL,
  anonKey: import.meta.env.VITE_INSFORGE_ANON_KEY,
});

// Create an authenticated client after JWT is obtained
// The InsForge SDK may support setting auth token after creation
// or may need a new client instance per auth session
export function createAuthenticatedClient(jwt: string) {
  return createClient({
    baseUrl: import.meta.env.VITE_INSFORGE_URL,
    anonKey: import.meta.env.VITE_INSFORGE_ANON_KEY,
    // InsForge SDK may use edgeFunctionToken or a similar field
    // Verify exact parameter name from SDK source/docs
  });
}

// Alternative: use the functions.invoke() for the auth endpoint
// then set the token on the existing client
export async function authenticateWithTelegram(initDataRaw: string) {
  const { data, error } = await insforgeAnon.functions.invoke('verify-telegram', {
    body: { initDataRaw },
  });

  if (error || !data?.jwt) {
    throw new Error(error?.message || 'Authentication failed');
  }

  return data; // { jwt, user }
}
```

### Pattern 6: Session Resilience via activated/deactivated Events

**What:** Save in-progress state to InsForge when the TMA is backgrounded, restore on return.

**Confidence:** HIGH (Telegram events verified from official docs)

```typescript
// shared/hooks/useSessionResilience.ts
import { useEffect } from 'react';

export function useSessionResilience(
  saveState: () => Promise<void>,
  restoreState: () => Promise<void>
) {
  useEffect(() => {
    // Telegram's native events via the raw WebApp bridge
    const webapp = window.Telegram?.WebApp;
    if (!webapp) return;

    const handleDeactivated = () => {
      // Save in-progress state to backend
      saveState().catch(console.error);
    };

    const handleActivated = () => {
      // Restore state from backend
      restoreState().catch(console.error);
    };

    webapp.onEvent('activated', handleActivated);
    webapp.onEvent('deactivated', handleDeactivated);

    // Also handle browser visibility change as fallback
    const handleVisibility = () => {
      if (document.hidden) {
        saveState().catch(console.error);
      } else {
        restoreState().catch(console.error);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      webapp.offEvent('activated', handleActivated);
      webapp.offEvent('deactivated', handleDeactivated);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [saveState, restoreState]);
}
```

### Pattern 7: react-router v7 Declarative Mode Setup

**What:** SPA routing with `BrowserRouter` in react-router v7.

**Confidence:** HIGH (official docs verified)

```typescript
// app/Router.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { useBackButton } from '@/shared/hooks/useBackButton';
import { AppLayout } from '@/shared/layouts/AppLayout';

// Lazy-load pages for code splitting
import { lazy, Suspense } from 'react';
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Learn = lazy(() => import('@/pages/Learn'));
const Train = lazy(() => import('@/pages/Train'));
const Support = lazy(() => import('@/pages/Support'));
const Casebook = lazy(() => import('@/pages/Casebook'));
const Leads = lazy(() => import('@/pages/Leads'));
const Profile = lazy(() => import('@/pages/Profile'));
const Admin = lazy(() => import('@/pages/Admin'));

function AppRoutes() {
  useBackButton(); // Sync BackButton with router location

  return (
    <AppLayout>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/learn/*" element={<Learn />} />
          <Route path="/train/*" element={<Train />} />
          <Route path="/support/*" element={<Support />} />
          <Route path="/casebook" element={<Casebook />} />
          <Route path="/leads/*" element={<Leads />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin/*" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
```

### Anti-Patterns to Avoid

- **Installing `@supabase/supabase-js` alongside `@insforge/sdk`:** InsForge has its own SDK with a different API surface. The endpoint structure differs (`/api/database/records/` vs `/rest/v1/`). Mixing them causes confusion. Use `@insforge/sdk` exclusively.
- **Installing both `@telegram-apps/sdk` and `@telegram-apps/sdk-react`:** The React package re-exports everything from the base SDK. Installing both creates two SDK instances with divergent internal state, causing silent failures.
- **Calling SDK component methods before `mount()`:** `backButton.show()` before `backButton.mount()` throws "component was not mounted." Always mount first, then use.
- **Using `react-router-dom` as a separate package:** In v7, the unified `react-router` package is the canonical import. `react-router-dom` is a legacy re-export.
- **Storing JWT in localStorage:** Telegram WebView localStorage is unreliable (cleared on cache clear, no cross-device sync). Store in Zustand (memory). Re-mint on every TMA open -- it adds ~200ms but is secure.
- **Using CSS `env(safe-area-inset-*)` for iPhone notch handling:** Resolves to `0` inside Telegram iOS WebView (GitHub Issue #1377). Use `viewport.safeAreaInsets()` and `viewport.bindCssVars()` from the SDK instead.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| initData HMAC-SHA256 validation | Manual crypto code with parameter sorting bugs | Web Crypto API (`crypto.subtle`) in Edge Function with the exact algorithm from Telegram docs | Sorting, hash exclusion, encoding edge cases (e.g., `photo_url` backslash escaping) cause subtle bugs. The algorithm is precisely defined; follow it exactly. |
| JWT signing in Edge Functions | Custom token format | `jose` library (works in Deno) with HS256 and InsForge JWT secret | JWT format has strict requirements (`sub`, `role`, `exp` claims). `jose` handles header/payload/signature correctly. |
| Telegram theme adaptation | Manual CSS variable management | `themeParams.bindCssVars()` from SDK | Creates `--tg-theme-*` CSS variables automatically. Updates on `themeChanged` event. |
| Safe area padding | `env(safe-area-inset-*)` CSS | `viewport.bindCssVars()` from SDK | CSS env vars silently fail in Telegram WebView on iOS. SDK vars work correctly. |
| PostgREST filter building | Hand-built query string parameters | `@insforge/sdk` database query builder (`.from().select().eq().order().limit()`) | The existing Python bot's `InsForgeClient` shows how many edge cases exist (operator prefixes, header manipulation, etc.). The SDK handles these. |
| Client-side route code splitting | Custom dynamic import management | `React.lazy()` + `Suspense` | Built into React. Vite handles the chunk splitting automatically. |

**Key insight:** The InsForge SDK and Telegram SDK handle the hard parts (token management, safe area, theme adaptation, PostgREST query building). Hand-rolling any of these creates bugs that take days to diagnose.

## Common Pitfalls

### Pitfall 1: All Tables Have RLS Disabled

**What goes wrong:** Currently, all 10 InsForge tables (`users`, `attempts`, `track_progress`, `support_sessions`, `scenarios_seen`, `lead_registry`, `lead_activity_log`, `casebook`, `user_memory`, `generated_scenarios`) have `rlsEnabled: false` and zero policies. The anon key ships in the TMA's JavaScript bundle. Without RLS, that anon key is a master key to the entire database. Any user can read/modify any other user's data.

**Why it happens:** The existing Python bot uses the anon key server-side where the risk is contained. Exposing the same key in client-side JavaScript requires RLS.

**How to avoid:** Before any TMA client code ships:
1. Enable RLS on ALL tables: `ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;`
2. Write SELECT/INSERT/UPDATE/DELETE policies per table, scoped to `telegram_id` matching the JWT's claims
3. The bot (server-side) continues using the anon key but now must also comply with RLS, OR use a service role key that bypasses RLS
4. Test: query each table with a user's JWT, verify only their data is returned

**Warning signs:** API calls from the TMA returning data belonging to other users.

### Pitfall 2: InsForge Auth System vs Custom JWT Minting

**What goes wrong:** InsForge has its own auth system (email/password, OAuth) with `auth.signUp()`, `auth.signInWithPassword()`, `auth.getCurrentSession()`. Telegram auth doesn't fit this model -- there's no email, no password. Developers either (a) try to force Telegram users into InsForge Auth (creating fake emails) or (b) bypass InsForge Auth entirely and hand-roll JWT minting without understanding how InsForge validates tokens internally.

**Why it happens:** InsForge's auth docs focus on email/OAuth. The "bring your own auth" (custom JWT) pattern is not prominently documented for InsForge specifically.

**How to avoid:** The Edge Function must mint a JWT that InsForge's PostgREST layer accepts. This requires:
- Signing with InsForge's JWT secret (not the bot token, not the anon key)
- Including `role: "authenticated"` claim (so PostgREST applies authenticated-role policies)
- Including a `sub` claim that can be referenced in RLS policies
- Setting a reasonable `exp` (1 hour recommended)

If InsForge's internal JWT validation differs from standard Supabase, this must be discovered during implementation. See Open Questions.

**Warning signs:** 401 errors on data queries after auth; `auth.getCurrentUser()` returning null even though data queries succeed (running as anon).

### Pitfall 3: Edge Function CORS Misconfiguration

**What goes wrong:** The TMA (served from its deployment URL) calls the Edge Function (on the InsForge URL). This is a cross-origin request. Without CORS headers, the browser blocks the preflight OPTIONS request and the auth flow fails silently.

**Why it happens:** Edge Functions run server-side; developers test with cURL (no CORS) and miss the browser restriction. The TMA runs inside Telegram's WebView, which enforces the same-origin policy.

**How to avoid:** Every Edge Function MUST:
1. Handle OPTIONS requests with status 204 and CORS headers
2. Include `Access-Control-Allow-Origin: *` (or the specific TMA origin) on ALL responses
3. Include `Access-Control-Allow-Headers: Content-Type, Authorization`

The Edge Function code pattern shown above includes this.

**Warning signs:** Network tab shows OPTIONS request returning 4xx or missing CORS headers; the POST never fires.

### Pitfall 4: Schema Mismatch Between Python Models and TypeScript Types

**What goes wrong:** The Python bot's `models.py` defines fields that may not match the actual database schema. For example, `AttemptModel` has `username` and `user_response` fields, but the `attempts` table schema from InsForge does NOT have these columns. The TypeScript shared types package must mirror the ACTUAL database schema, not the Python models.

**Why it happens:** Python models can include computed/transient fields. The Pydantic models exclude them when writing to the database (`exclude_none=True`) but include them when constructing objects.

**How to avoid:** Generate TypeScript types from the ACTUAL InsForge table schemas (as returned by `get-table-schema`), not from the Python models. Cross-reference both and document any discrepancies.

**Tables to type (verified actual schema columns):**

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `users` | id, telegram_id, username, first_name, provider, encrypted_api_key, openrouter_model, total_xp, current_level, streak_days, last_active_at, created_at, updated_at | `telegram_id` is UNIQUE, BIGINT |
| `attempts` | id, user_id, telegram_id, scenario_id, mode, score, feedback_json (JSONB), xp_earned, created_at | Missing `username`, `user_response` from Python model |
| `track_progress` | id, user_id, telegram_id, track_id, level_id, status, best_score, attempts_count, completed_at, created_at, updated_at | UNIQUE on (telegram_id, track_id, level_id) |
| `support_sessions` | id, user_id, telegram_id, input_text, output_json (JSONB), provider_used, created_at | |
| `scenarios_seen` | id, user_id, telegram_id, scenario_id, seen_at | UNIQUE on (telegram_id, scenario_id) |
| `lead_registry` | id, user_id, telegram_id, prospect_name, prospect_title, prospect_company, photo_url, photo_key, prospect_analysis, closing_strategy, engagement_tactics, draft_response, status, notes, input_type, original_context, web_research, engagement_plan (JSONB), last_contacted, next_followup, followup_count, created_at, updated_at | Has indexes on telegram_id, status, created_at |
| `lead_activity_log` | id, lead_id, telegram_id, activity_type, content, ai_response, created_at | FK to lead_registry |
| `casebook` | id, persona_type, scenario_type, industry, seniority, prospect_analysis, closing_strategy, engagement_tactics, draft_response, playbook_references, quality_score (REAL), user_accepted_first_draft (BOOL), user_feedback, created_from_user (BIGINT), created_at | No user FK -- shared resource |
| `user_memory` | id, user_id, telegram_id, memory_data (JSONB), created_at, updated_at | UNIQUE on telegram_id |
| `generated_scenarios` | (empty schema returned -- table may not exist yet or has no columns) | Python model defines: scenario_id, category, difficulty, persona (JSONB), situation, scoring_focus (JSONB array), ideal_response, scoring_rubric (JSONB), source_type, source_casebook_ids (JSONB array), times_used, avg_score |

### Pitfall 5: Tailwind CSS v4 Compatibility with InsForge

**What goes wrong:** InsForge documentation explicitly states "Use Tailwind CSS 3.4 (do not upgrade to v4)." The project decision locks Tailwind v4. This conflict may cause issues with InsForge's template system or deployment tools.

**Why it happens:** InsForge's React template was built with Tailwind v3.4 and may include PostCSS configs that conflict with v4's approach.

**How to avoid:** Since we are NOT using InsForge's React template (we are scaffolding our own), Tailwind v4 should work fine for the TMA itself. The InsForge warning likely applies to their template's preconfigured setup. Our Vite config uses `@tailwindcss/vite` plugin (v4's approach), which replaces the PostCSS plugin entirely. No conflict expected, but validate early.

**Warning signs:** Build errors mentioning PostCSS or Tailwind config; missing utility classes.

### Pitfall 6: Vite `base` Path Configuration for TMA Deployment

**What goes wrong:** The TMA must be deployed to a URL that Telegram can load (HTTPS required). If `base` in Vite config is wrong, all asset paths (JS chunks, CSS, images) return 404.

**How to avoid:**
- For InsForge deployment: `base: '/'` (InsForge serves from root)
- For GitHub Pages: `base: '/repo-name/'`
- For subdirectory deployment: `base: './'` (relative paths)
- Test by building locally (`pnpm build`) and serving the `dist/` folder with a static server

## Code Examples

### InsForge Client with TanStack Query

```typescript
// lib/api/user.ts
import { useQuery } from '@tanstack/react-query';
import { insforge } from '@/lib/insforge';

export function useCurrentUser(telegramId: number) {
  return useQuery({
    queryKey: ['user', telegramId],
    queryFn: async () => {
      const { data, error } = await insforge.database
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000, // 5 minutes
  });
}
```

### Zustand Auth Store

```typescript
// features/auth/store.ts
import { create } from 'zustand';

interface AuthState {
  jwt: string | null;
  telegramId: number | null;
  userId: number | null;
  isAuthenticated: boolean;
  setAuth: (jwt: string, telegramId: number, userId: number) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  jwt: null,
  telegramId: null,
  userId: null,
  isAuthenticated: false,
  setAuth: (jwt, telegramId, userId) => set({
    jwt, telegramId, userId, isAuthenticated: true,
  }),
  clearAuth: () => set({
    jwt: null, telegramId: null, userId: null, isAuthenticated: false,
  }),
}));
```

### Tailwind v4 Design Tokens with Telegram Theme

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  /* Brand colors - Deal Quest identity */
  --color-brand-50: oklch(0.97 0.01 250);
  --color-brand-100: oklch(0.93 0.03 250);
  --color-brand-500: oklch(0.65 0.15 250);
  --color-brand-600: oklch(0.55 0.18 250);
  --color-brand-700: oklch(0.45 0.18 250);

  /* Semantic colors mapped from Telegram theme vars */
  --color-surface: var(--tg-theme-bg-color, #ffffff);
  --color-surface-secondary: var(--tg-theme-secondary-bg-color, #f0f0f0);
  --color-text-primary: var(--tg-theme-text-color, #000000);
  --color-text-hint: var(--tg-theme-hint-color, #999999);
  --color-accent: var(--tg-theme-button-color, var(--color-brand-500));
  --color-accent-text: var(--tg-theme-button-text-color, #ffffff);
  --color-link: var(--tg-theme-link-color, var(--color-brand-600));

  /* Spacing */
  --spacing-safe-top: var(--tg-viewport-safe-area-inset-top, 0px);
  --spacing-safe-bottom: var(--tg-viewport-safe-area-inset-bottom, 0px);
  --spacing-content-top: var(--tg-viewport-content-safe-area-inset-top, 0px);
  --spacing-content-bottom: var(--tg-viewport-content-safe-area-inset-bottom, 0px);

  /* Typography */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;

  /* Border radius */
  --radius-card: 12px;
  --radius-button: 10px;
  --radius-badge: 8px;
}
```

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
    "dev": "pnpm --filter @deal-quest/webapp dev",
    "build": "pnpm --filter @deal-quest/webapp build",
    "typecheck": "pnpm -r typecheck"
  }
}
```

```json
// packages/shared/package.json
{
  "name": "@deal-quest/shared",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

```json
// packages/webapp/package.json (partial)
{
  "name": "@deal-quest/webapp",
  "private": true,
  "dependencies": {
    "@deal-quest/shared": "workspace:*"
  }
}
```

### Vite Configuration

```typescript
// packages/webapp/vite.config.ts
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
  base: '/',
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  server: {
    host: true,  // Expose on network for mobile testing
  },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@tma.js/sdk-react` (old scope) | `@telegram-apps/sdk-react` (current scope) | v3.0 (2024) | Old package name still in some templates. Use `@telegram-apps/` scope. |
| `useLaunchParams()` hook | `retrieveLaunchParams()` function | SDK v3.0 | Breaking change. Hook was removed. Direct function call instead. |
| `react-router-dom` separate package | `react-router` unified package | react-router v7 (2024) | Single package for all routing. `react-router-dom` is legacy re-export. |
| `tailwind.config.js` (JavaScript config) | `@theme` directive in CSS | Tailwind v4.0 (Jan 2025) | No config file needed. Design tokens defined in CSS. |
| PostCSS + autoprefixer for Tailwind | `@tailwindcss/vite` plugin | Tailwind v4.0 | Vite plugin replaces PostCSS pipeline. Faster, simpler. |
| `supabase.auth.setSession()` for custom JWT | `createClient({ accessToken })` callback | supabase-js v2.45+ | Cleaner pattern. InsForge SDK may have its own approach. |
| `initNavigator()` + `useIntegration()` for router | Manual `useBackButton()` hook | react-router v7 decision | Old integration package incompatible with v7. Manual is simpler and more maintainable. |

**Deprecated/outdated:**
- `@telegram-apps/react-router-integration`: Unmaintained, v6 only. Do not use.
- `@twa-dev/sdk`: Community wrapper, lacks types. Use official `@telegram-apps/sdk-react`.
- `postcss-import` + `autoprefixer`: Redundant with Tailwind v4 + Vite plugin.

## Open Questions

Things that couldn't be fully resolved during research:

1. **InsForge JWT Secret and Custom Token Acceptance**
   - What we know: InsForge has its own auth system with JWT-based sessions. Edge Functions can access env vars via `Deno.env.get()`.
   - What's unclear: How does InsForge's PostgREST layer validate incoming JWTs? Is there a `JWT_SECRET` environment variable exposed to Edge Functions? Does InsForge accept any HS256-signed JWT with the correct secret, or does it require tokens to be issued through its auth system?
   - Recommendation: During implementation, test by (a) checking if `JWT_SECRET` is available in Edge Function env, (b) minting a token with `jose` and testing if InsForge PostgREST accepts it with `Authorization: Bearer {token}`, (c) if that fails, explore using InsForge's auth API to create a "shadow user" per Telegram user and using InsForge's native session tokens.
   - **Fallback plan:** If custom JWT minting doesn't work with InsForge's PostgREST, use the Edge Function as a proxy: the TMA sends requests to the Edge Function (which validates the Telegram JWT), and the Edge Function makes database calls using the admin/service key internally. This adds latency but is a safe fallback.

2. **InsForge SDK Token Injection After Creation**
   - What we know: `createClient({ baseUrl, anonKey })` creates the client. The `edgeFunctionToken` parameter exists for Edge Function contexts.
   - What's unclear: How to inject a user JWT into the client for authenticated database queries from the TMA frontend. Does the SDK support a `setAuth(jwt)` method or a token callback pattern like Supabase's `accessToken`?
   - Recommendation: Check `@insforge/sdk` source for auth token methods. If none exists, create a new client instance per auth session with the JWT as the anonKey (since it's sent as `Authorization: Bearer`). This matches the existing Python bot pattern where `InsForgeClient.__init__(base_url, anon_key)` takes the key at construction time.

3. **RLS Policy Design for Dual Access (Bot + TMA)**
   - What we know: The bot currently uses the anon key server-side. The TMA will also use the anon key client-side but with a user JWT. RLS policies will gate TMA access by `telegram_id` matching JWT claims. But the bot also needs to read/write data -- sometimes across users (e.g., team leaderboard, admin analytics).
   - What's unclear: Does the bot need a separate "service role" key that bypasses RLS? Or should RLS policies include a condition for the bot's role?
   - Recommendation: Create RLS policies that allow `authenticated` role to read/write own data (by `telegram_id`). The bot should be given a service-level key or continue using the anon key IF RLS policies include an `anon` role allowance for server-side operations. Alternatively, the bot could authenticate as a service account. This needs to be resolved before enabling RLS, as enabling RLS without bot-compatible policies would break the existing bot.

4. **`generated_scenarios` Table Schema**
   - What we know: The Python model defines it with many columns, but `get-table-schema` returned an empty schema.
   - What's unclear: Was this table created differently, or does it not exist yet?
   - Recommendation: Check via SQL query or create the table if missing. The shared types package should only include tables that actually exist.

5. **InsForge Deployment for the TMA Frontend**
   - What we know: InsForge has a `create-deployment` MCP tool that deploys from a source directory. It supports `buildCommand`, `installCommand`, `outputDirectory` configuration.
   - What's unclear: Where the TMA is deployed to (InsForge hosting? Separate domain? Subdomain?). The Telegram bot needs to know the TMA URL for `WebAppInfo`.
   - Recommendation: Use InsForge's deployment tool for simplicity. Get the deployment URL and configure it as the Mini App URL in BotFather.

## Sources

### Primary (HIGH confidence)
- InsForge SDK Documentation (functions-sdk, auth-sdk, db-sdk, real-time) -- via `mcp__insforge__fetch-docs` MCP tool
- InsForge Table Schemas -- via `mcp__insforge__get-table-schema` MCP tool (all 10 tables inspected)
- InsForge Edge Function API -- via `mcp__insforge__create-function` MCP tool schema
- [Telegram Mini Apps Official Documentation](https://core.telegram.org/bots/webapps) -- initData validation algorithm, activated/deactivated events, BottomButton (Main/Secondary) API, BackButton API
- [@telegram-apps/sdk-react npm](https://www.npmjs.com/package/@telegram-apps/sdk-react) -- v3.3.9
- [@telegram-apps/sdk v3 docs](https://docs.telegram-mini-apps.com/packages/telegram-apps-sdk/3-x) -- component mount/show/onClick patterns
- [React Router v7 docs](https://reactrouter.com/start/modes) -- declarative mode, BrowserRouter setup
- [Tailwind CSS v4.0 blog](https://tailwindcss.com/blog/tailwindcss-v4) -- @theme directive, Vite plugin
- [Supabase JWT docs](https://supabase.com/docs/guides/auth/jwts) -- JWT claims, custom minting with `jose`, `accessToken` callback
- [pnpm workspaces](https://pnpm.io/workspaces) -- workspace configuration
- Existing bot codebase: `bot/storage/models.py`, `bot/storage/insforge_client.py`, `bot/storage/repositories.py`, `bot/config.py`

### Secondary (MEDIUM confidence)
- [Generating Custom Supabase JWT](https://catjam.fi/articles/supabase-gen-access-token) -- custom JWT minting pattern (applicable to InsForge with adaptation)
- [Supabase Edge Functions quickstart](https://supabase.com/docs/guides/functions/quickstart) -- general Edge Function patterns (InsForge's API is similar but not identical)
- [TMA auth pattern discussion](https://github.com/supabase/auth/issues/167) -- Telegram as auth provider discussion
- [InsForge llms.txt](https://docs.insforge.dev/llms.txt) -- full API overview
- [Telegram iOS Issue #1377](https://github.com/TelegramMessenger/Telegram-iOS/issues/1377) -- safe-area-inset-bottom failure confirmation
- [CVE-2025-48757](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/) -- 170+ apps exposed by missing RLS

### Tertiary (LOW confidence)
- InsForge's recommendation against Tailwind v4 -- stated in their `instructions` doc but unclear if it applies outside their template; needs validation
- `@insforge/sdk` token injection pattern -- SDK docs show `anonKey` and `edgeFunctionToken` but do not document a `setAuth()` method for post-creation token setting

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages verified on npm with versions; InsForge SDK API verified via MCP tools
- Architecture: HIGH -- patterns verified against official docs, existing bot codebase, and InsForge Edge Function API
- Pitfalls: HIGH -- RLS status confirmed (all tables disabled); schema mismatches identified via direct table inspection; CORS and auth bridge issues well-documented
- InsForge-specific integration: MEDIUM -- SDK API surface known, but JWT acceptance pattern for custom auth needs implementation-time validation

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days -- stable domain, SDK versions unlikely to change)
