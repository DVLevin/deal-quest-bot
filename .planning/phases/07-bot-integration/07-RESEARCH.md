# Phase 7: Bot Integration - Research

**Researched:** 2026-02-04
**Domain:** Telegram Bot API inline buttons, WebApp launch, deep linking (aiogram 3 + @telegram-apps/sdk-react)
**Confidence:** HIGH

## Summary

Phase 7 wires the existing Python aiogram 3 bot to the React TMA by adding "Open in App" inline buttons to bot command responses and configuring BotFather's menu button. The technical surface is narrow and well-understood: aiogram's `InlineKeyboardButton(web_app=WebAppInfo(url=...))` opens the TMA directly, and the `startapp` query parameter in the URL routes the user to the correct page inside the TMA.

The bot already uses `InlineKeyboardMarkup` extensively in all target handlers (stats, learn, train, support, leads). The TMA already uses `BrowserRouter` with routes at `/`, `/learn/*`, `/train/*`, `/support/*`, `/leads/*`, and `/profile`. The TMA already reads launch params via `retrieveLaunchParams()` from `@telegram-apps/sdk-react` but does NOT currently parse `startapp`/`start_param` for deep link routing. This is the primary new code on the TMA side.

On the bot side, each handler's response already includes an `InlineKeyboardMarkup`. The task is to add one additional row with a `web_app` button. The bot config needs a new `TMA_URL` environment variable for the deployed TMA URL. For BotFather menu button, either manual `/setmenubutton` in BotFather or programmatic `bot.set_chat_menu_button()` at startup will work.

**Primary recommendation:** Use `WebAppInfo(url=f"{TMA_URL}#{page}")` with a hash-fragment routing approach for the inline buttons. On the TMA side, read `startParam` from launch params and use `react-router`'s `useNavigate` to redirect on mount. This keeps both sides simple with no encoding complexity.

## Standard Stack

### Core (already installed, no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| aiogram | >=3.4.0 | Bot framework with InlineKeyboardButton, WebAppInfo | Already in requirements.txt, native Telegram Bot API types |
| @telegram-apps/sdk-react | (current) | retrieveLaunchParams, startParam access | Already used in TMA for auth and openTelegramLink |
| react-router | v7 | BrowserRouter, useNavigate for deep link routing | Already the TMA router |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pydantic-settings | >=2.2.0 | New `tma_url` config field | Already in requirements.txt |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `web_app` inline button | `url` inline button with `t.me/bot/app?startapp=page` | `url` button opens a link preview first; `web_app` opens TMA directly in the overlay. `web_app` is the correct choice for seamless UX. |
| Hash-fragment routing `#/learn` | `startapp` param only | Hash fragments in `WebAppInfo.url` are passed through to the TMA and work with BrowserRouter. `startapp` is limited to 512 chars and alphanumeric+underscore+hyphen only. Using the URL path directly is simpler. |
| Programmatic `setChatMenuButton` | Manual BotFather `/setmenubutton` | Programmatic is reproducible and self-documenting. BotFather is a one-time manual step but doesn't require code changes. Both approaches work. |

**Installation:**
No new packages needed. Only a new env var `TMA_URL` in bot config.

## Architecture Patterns

### Bot-Side: Adding Web App Buttons to Existing Handlers

```
bot/
├── config.py              # Add tma_url: str field
├── handlers/
│   ├── stats.py           # Add "Open in App" button row
│   ├── learn.py           # Add "Open in App" button row
│   ├── train.py           # Add "Open in App" button row
│   ├── support.py         # Add "Open in App" button row
│   └── leads.py           # Add "Open in App" button row
└── main.py                # Add tma_url to workflow_data, optional setChatMenuButton call
```

### TMA-Side: Deep Link Router

```
packages/webapp/src/
├── app/
│   └── Router.tsx         # Add DeepLinkRouter wrapper inside BrowserRouter
├── shared/
│   └── hooks/
│       └── useDeepLink.ts # Parse startParam -> navigate to route
└── public/
    └── mockEnv.ts         # Add tgWebAppStartParam to mock
```

### Pattern 1: WebAppInfo Inline Button (Bot -> TMA)

**What:** Each bot command response includes an additional inline button row that opens the TMA at the relevant page.
**When to use:** Every bot handler that maps to a TMA page.
**Example:**
```python
# Source: Telegram Bot API + aiogram docs
from aiogram.types import InlineKeyboardButton, WebAppInfo

# TMA_URL is injected via workflow_data (e.g., "https://dealquest.railway.app")
def open_in_app_button(tma_url: str, path: str = "") -> list[InlineKeyboardButton]:
    """Create an 'Open in App' button row for inline keyboards."""
    url = f"{tma_url}{'/' + path if path else ''}"
    return [InlineKeyboardButton(
        text="Open in App",
        web_app=WebAppInfo(url=url),
    )]
```

### Pattern 2: Deep Link Routing (TMA startParam parsing)

**What:** When the TMA opens via a `web_app` button, it may receive a `startParam` from `startapp` in the URL. The TMA parses this and navigates to the correct page.
**When to use:** On TMA mount, before rendering the main router.
**Example:**
```typescript
// Source: @telegram-apps/sdk-react docs + project pattern
import { retrieveLaunchParams } from '@telegram-apps/sdk-react';
import { useNavigate, useLocation } from 'react-router';
import { useEffect } from 'react';

const DEEP_LINK_MAP: Record<string, string> = {
  stats: '/',
  learn: '/learn',
  train: '/train',
  support: '/support',
  leads: '/leads',
};

export function useDeepLink() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only redirect on initial mount at root
    if (location.pathname !== '/') return;

    try {
      const { startParam } = retrieveLaunchParams();
      if (startParam && DEEP_LINK_MAP[startParam]) {
        navigate(DEEP_LINK_MAP[startParam], { replace: true });
      }
    } catch {
      // Not in Telegram or no startParam
    }
  }, []);
}
```

### Pattern 3: Menu Button Configuration

**What:** Set the bot's default menu button to open the TMA.
**When to use:** At bot startup (once), or manually via BotFather.
**Example:**
```python
# Source: aiogram docs, Telegram Bot API
from aiogram.types import MenuButtonWebApp, WebAppInfo

# At startup in main.py, after bot initialization:
async def setup_menu_button(bot: Bot, tma_url: str) -> None:
    """Set the default menu button to open the TMA."""
    try:
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text="Open App",
                web_app=WebAppInfo(url=tma_url),
            )
        )
        logger.info("Menu button set to open TMA: %s", tma_url)
    except Exception as e:
        logger.warning("Failed to set menu button: %s", e)
```

### Anti-Patterns to Avoid

- **Using `url` type button instead of `web_app` type:** A `url` button opens a browser/preview, NOT the TMA overlay. Always use `web_app=WebAppInfo(url=...)` for inline TMA launches.
- **Overcomplicating deep link encoding:** The page names (stats, learn, train, support, leads) are simple ASCII strings. No need for base64url encoding. Just pass the path directly.
- **Replacing existing keyboard rows:** The "Open in App" button should be APPENDED as an additional row, not replace existing action buttons. Users who prefer the bot-native experience should not lose functionality.
- **Hardcoding the TMA URL:** Use an environment variable (`TMA_URL`) so the URL can differ between dev/staging/production.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TMA URL construction | Custom URL builder with query params | Simple string concatenation `f"{tma_url}/{path}"` | The TMA uses BrowserRouter -- paths are just URL paths, no query encoding needed |
| startParam parsing | Custom URL parser | `retrieveLaunchParams().startParam` from `@telegram-apps/sdk-react` | SDK already parses all Telegram launch parameters |
| Menu button setup | Manual BotFather steps + docs | `bot.set_chat_menu_button()` in `main.py` | Programmatic = reproducible across deployments |
| Deep link route mapping | Complex router middleware | Simple lookup map + `useNavigate` in a `useEffect` | Only 5 routes to map, a dict/object is sufficient |

**Key insight:** This phase is integration wiring, not feature building. Every component (bot handlers, TMA router, Telegram SDK) already exists. The work is connecting them with minimal new code.

## Common Pitfalls

### Pitfall 1: WebAppInfo URL Must Be HTTPS
**What goes wrong:** `web_app` buttons with non-HTTPS URLs cause a `Button_type_invalid` error from Telegram.
**Why it happens:** Telegram enforces HTTPS for all Mini App URLs.
**How to avoid:** Ensure `TMA_URL` always starts with `https://`. Add validation in config.
**Warning signs:** Bot crashes or buttons don't appear when sending messages.

### Pitfall 2: web_app Button Only Works in Private Chats
**What goes wrong:** If the bot is used in groups, `web_app` inline buttons may not render or work as expected.
**Why it happens:** Telegram restricts web_app buttons to private chats for security.
**How to avoid:** This bot is primarily used in private chats (1:1 with users), so this is not a current concern. But document the limitation.
**Warning signs:** Button doesn't appear in group chats.

### Pitfall 3: startParam Character Restrictions
**What goes wrong:** Passing special characters in `startapp` parameter causes silent failures.
**Why it happens:** Telegram only allows A-Z, a-z, 0-9, underscore, hyphen in startParam. Max 512 chars.
**How to avoid:** Our page names (stats, learn, train, support, leads) are all valid. Don't try to pass complex state via startParam.
**Warning signs:** TMA opens but doesn't navigate to the expected page.

### Pitfall 4: BrowserRouter Path vs Hash
**What goes wrong:** The TMA uses BrowserRouter (path-based routing), not HashRouter. If the server doesn't serve index.html for all paths, direct navigation to `/learn` returns 404.
**Why it happens:** Railway `serve dist -s` already handles SPA fallback (the `-s` flag means single-page app mode).
**How to avoid:** The `-s` flag in `railway.toml` (`serve dist -s`) already handles this. WebAppInfo URLs like `https://tma.example.com/learn` will work because `serve` returns `index.html` for any path. Verified in existing deployment config.
**Warning signs:** TMA shows blank page or 404 when opened from bot button.

### Pitfall 5: Menu Button Set Without TMA_URL
**What goes wrong:** If `TMA_URL` is not configured, calling `set_chat_menu_button` with an empty or invalid URL will fail.
**Why it happens:** Environment variable missing in deployment.
**How to avoid:** Make `set_chat_menu_button` conditional on `tma_url` being non-empty. Log a warning if not configured.
**Warning signs:** Bot startup warning about missing TMA_URL.

### Pitfall 6: Existing Keyboards Broken by Extra Row
**What goes wrong:** Some handlers use `InlineKeyboardMarkup(inline_keyboard=[...])` with carefully structured rows. Adding a row at the wrong position disrupts the layout.
**Why it happens:** Not all handlers create keyboards the same way. Some have helper functions (e.g., `_support_actions_keyboard`, `_lead_detail_keyboard`).
**How to avoid:** Review each handler's keyboard construction and add the "Open in App" row consistently as the LAST row. For handlers with helper functions, modify the helper.
**Warning signs:** Buttons appear in wrong positions or existing functionality breaks.

## Code Examples

### Bot: Complete Inline Button Addition Pattern

```python
# Source: aiogram docs + project patterns
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

def add_open_in_app_row(
    keyboard: InlineKeyboardMarkup,
    tma_url: str,
    path: str = "",
) -> InlineKeyboardMarkup:
    """Add an 'Open in App' row to an existing inline keyboard."""
    if not tma_url:
        return keyboard

    url = f"{tma_url}/{path}" if path else tma_url
    new_row = [InlineKeyboardButton(
        text="Open in App",
        web_app=WebAppInfo(url=url),
    )]

    return InlineKeyboardMarkup(
        inline_keyboard=[*keyboard.inline_keyboard, new_row]
    )
```

### Bot: Stats Handler Integration

```python
# In bot/handlers/stats.py, at the end of cmd_stats:
# After building the existing keyboard with action buttons...

keyboard = InlineKeyboardMarkup(inline_keyboard=[
    [
        InlineKeyboardButton(text="Continue Learning", callback_data="stats:learn"),
        InlineKeyboardButton(text="Quick Practice", callback_data="stats:train"),
    ],
    [
        InlineKeyboardButton(text="Support Mode", callback_data="stats:support"),
        InlineKeyboardButton(text="My Leads", callback_data="stats:leads"),
    ],
    # NEW: Open in App button
    [InlineKeyboardButton(
        text="Open in App",
        web_app=WebAppInfo(url=tma_url),  # tma_url from workflow_data
    )],
])
```

### Bot: Config Addition

```python
# In bot/config.py:
class Settings(BaseSettings):
    # ... existing fields ...
    tma_url: str = ""  # TMA deployment URL (e.g., https://dealquest.up.railway.app)
```

### TMA: Deep Link Hook

```typescript
// packages/webapp/src/shared/hooks/useDeepLink.ts
import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { retrieveLaunchParams } from '@telegram-apps/sdk-react';

/**
 * Page mapping from web_app URL paths to router paths.
 * When TMA opens at a non-root path, this is automatic (BrowserRouter).
 * When TMA opens with startParam, this maps param -> route.
 */
const START_PARAM_MAP: Record<string, string> = {
  stats: '/',
  dashboard: '/',
  learn: '/learn',
  train: '/train',
  support: '/support',
  leads: '/leads',
  profile: '/profile',
};

export function useDeepLink() {
  const navigate = useNavigate();
  const location = useLocation();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    // If already navigated to a non-root path (via WebAppInfo URL), skip
    if (location.pathname !== '/') return;

    try {
      const { startParam } = retrieveLaunchParams();
      if (startParam) {
        const route = START_PARAM_MAP[startParam];
        if (route && route !== '/') {
          navigate(route, { replace: true });
        }
      }
    } catch {
      // Not in Telegram or SDK unavailable
    }
  }, []);
}
```

### TMA: Router Integration

```typescript
// In packages/webapp/src/app/Router.tsx, inside AppRoutes:
function AppRoutes() {
  useBackButton();
  useDeepLink(); // NEW: handle startParam -> route on mount

  return (
    <AppLayout>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          {/* ... existing routes ... */}
        </Routes>
      </Suspense>
    </AppLayout>
  );
}
```

## Bot Command to TMA Page Mapping

| Bot Command | Existing Handler | TMA Page | TMA Route | WebAppInfo URL Path |
|-------------|-----------------|----------|-----------|---------------------|
| /stats | `stats.py:cmd_stats` | Dashboard | `/` | (root) |
| /learn | `learn.py:cmd_learn` | Learn | `/learn` | `learn` |
| /train | `train.py:cmd_train` | Train | `/train` | `train` |
| /support | `support.py:cmd_support` | Support | `/support` | `support` |
| /leads | `leads.py:cmd_leads` | Leads | `/leads` | `leads` |
| Menu button | N/A (BotFather) | Dashboard | `/` | (root) |

## Two Approaches for Deep Linking

### Approach A: Direct URL Path in WebAppInfo (RECOMMENDED)

Pass the TMA page path directly in the `WebAppInfo.url`:
- `/stats` button: `WebAppInfo(url="https://tma.example.com/")`
- `/learn` button: `WebAppInfo(url="https://tma.example.com/learn")`

**Pros:** BrowserRouter handles routing natively. No client-side parsing needed. Works immediately.
**Cons:** Each button has a slightly different URL. TMA must handle all paths (already does via SPA fallback).

### Approach B: startapp Parameter Only

Use a single URL with `startapp` parameter:
- All buttons: `WebAppInfo(url="https://tma.example.com")` + somehow pass startapp

**Problem:** The `web_app` inline button does NOT support `startapp` parameter. `startapp` only works with direct links (`https://t.me/bot/app?startapp=X`). The `web_app` button opens the URL directly without Telegram-level deep link processing.

**Conclusion:** Approach A is correct. Use `WebAppInfo(url=f"{tma_url}/{path}")`. The BrowserRouter in the TMA handles the path naturally. No `startParam` parsing is needed for the inline button flow. The `useDeepLink` hook is only needed as a fallback for direct link launches (e.g., `t.me/bot/app?startapp=learn`).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `url` type button for webapp | `web_app` type button with `WebAppInfo` | Bot API 6.0 (2022) | Native overlay instead of browser redirect |
| Manual BotFather menu setup | Programmatic `setChatMenuButton` | Bot API 6.0 (2022) | Reproducible, scriptable |
| `sendData()` for TMA->bot | Shared database (InsForge) | Project convention | No 4KB limit, persistent state |

**Deprecated/outdated:**
- Keyboard buttons with `web_app` (reply keyboard): These work but inline keyboard is better for "Open in App" alongside existing response text. Reply keyboard buttons persist across messages and take up screen real estate.

## Open Questions

1. **TMA Deployment URL**
   - What we know: The TMA deploys to Railway (`packages/webapp/railway.toml`). The Railway URL is dynamically assigned or configured as a custom domain.
   - What's unclear: The exact production URL. It might be something like `https://dealquest.up.railway.app` or a custom domain.
   - Recommendation: Add `TMA_URL` to bot config. Document that it must be set in Railway env vars for the bot service. If not set, skip adding web_app buttons and log a warning.

2. **BotFather App Name**
   - What we know: For direct links (`t.me/bot/appname?startapp=X`), the bot needs a "Main Mini App" configured in BotFather.
   - What's unclear: Whether the bot already has a Mini App configured in BotFather. BOT-03 requires TMA accessible via menu button.
   - Recommendation: Plan includes both programmatic `setChatMenuButton` AND manual BotFather configuration instructions.

## Sources

### Primary (HIGH confidence)
- [Telegram Bot API - Mini Apps](https://core.telegram.org/bots/webapps) - WebAppInfo, InlineKeyboardButton web_app type, menu button setup
- [Telegram Bot API - Deep Links](https://core.telegram.org/api/links) - startapp parameter format, character restrictions
- [aiogram InlineKeyboardButton docs](https://docs.aiogram.dev/en/latest/api/types/inline_keyboard_button.html) - web_app field on InlineKeyboardButton
- [aiogram setChatMenuButton docs](https://docs.aiogram.dev/en/latest/api/methods/set_chat_menu_button.html) - MenuButtonWebApp type
- [aiogram Deep Linking utils](https://docs.aiogram.dev/en/latest/utils/deep_linking.html) - create_startapp_link utility
- [@telegram-apps/sdk-react](https://docs.telegram-mini-apps.com/platform/start-parameter) - startParam parsing, retrieveLaunchParams

### Secondary (MEDIUM confidence)
- [Telegram Bot Features](https://core.telegram.org/bots/features) - Menu button configuration via BotFather
- Project codebase analysis - All 5 target handlers, TMA router, existing deep link patterns

### Tertiary (LOW confidence)
- None - all findings verified with official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - aiogram WebAppInfo and InlineKeyboardButton are well-documented, already used in the project
- Architecture: HIGH - Pattern follows existing project conventions (DI via workflow_data, inline keyboards)
- Pitfalls: HIGH - Well-known Telegram Bot API constraints documented in official docs
- Deep link routing: HIGH - TMA already uses BrowserRouter with SPA fallback; WebAppInfo URL paths work natively

**Research date:** 2026-02-04
**Valid until:** 2026-03-04 (stable -- Telegram Bot API and aiogram 3 are mature)
