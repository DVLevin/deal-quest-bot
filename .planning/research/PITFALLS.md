# Pitfalls Research

**Domain:** Telegram Mini App (React) added to existing Python Telegram bot with InsForge backend
**Researched:** 2026-02-01
**Confidence:** HIGH (verified against official Telegram Mini Apps docs, Supabase docs, SDK source, and community issue trackers)

## Critical Pitfalls

### Pitfall 1: Skipping or Weakening initData Server-Side Validation

**What goes wrong:**
Developers validate `initData` on the client side or skip validation during development, then ship without re-enabling it. Attackers forge `initData` payloads to impersonate any Telegram user, accessing their training data, leaderboard position, or admin panel. One documented case: a financial tracking Mini App trusted frontend user IDs without validating the init data hash -- attackers modified requests to access other users' financial data. The security breach cost exceeded the entire development budget.

**Why it happens:**
- During local development, `initData` is unavailable outside Telegram, so developers mock it and disable validation "temporarily."
- The HMAC-SHA256 verification has subtle implementation traps: parameters must be sorted alphabetically before hashing, the `hash` parameter itself must be excluded, and the bot token must be HMAC'd with the literal string `WebAppData` as key -- not used directly.
- Escape character issues: `photo_url` fields contain backslash-escaped URLs (`https:\/\/`). When `JSON.stringify` processes these, backslashes are stripped, causing valid signatures to fail. Developers then weaken validation to "fix" the issue.

**How to avoid:**
- Use `@telegram-apps/init-data-node` (official package) for validation rather than hand-rolling HMAC logic. The package handles parameter sorting, hash exclusion, and encoding edge cases.
- Implement `auth_date` expiry checks (recommend 1-hour window) to prevent replay attacks with stolen tokens.
- Build the auth verification as an InsForge Edge Function or a standalone endpoint that runs before any data access. Never make it optional -- make it the gateway for the Supabase JWT mint.
- For local development, use `mockTelegramEnv` from the SDK but guard it behind `import.meta.env.DEV` so it cannot leak to production.

**Warning signs:**
- Any `if (process.env.NODE_ENV !== 'production') { skipValidation() }` pattern in auth code.
- Auth tests that mock `initData` but no tests that verify rejection of tampered data.
- Users reporting they can see other users' data.

**Phase to address:**
Phase 1 (Foundation/Auth). This must be the very first feature implemented and must gate all subsequent API access.

---

### Pitfall 2: InsForge/Supabase RLS Misconfiguration with Client-Side Anon Key

**What goes wrong:**
The TMA's JavaScript bundle exposes the InsForge anon key (this is by design -- it ships in client code). Without properly configured Row-Level Security (RLS) on every table, that anon key becomes a master key to the entire database. In 2025, CVE-2025-48757 exposed 170+ applications built with AI tools because RLS was missing on generated tables. One researcher found 13,000 users' data exposed, including password reset tokens enabling full account takeovers.

The Deal Quest schema has 10+ tables (users, attempts, track_progress, casebook, lead_registry, support_sessions, badges, teams, etc.). Each one needs RLS policies. Missing RLS on even one ancillary table (e.g., `badges` or `teams`) allows attackers to infer or access data from the whole system.

**Why it happens:**
- RLS is opt-in, not default. New tables are created without it unless explicitly enabled.
- The existing Python bot may use the service role key (bypasses RLS) and therefore tables may never have had RLS policies written.
- Views bypass RLS by default in PostgreSQL (they run as the creating user). If the TMA queries views instead of tables, RLS is silently ignored unless `security_invoker = true` is set (requires Postgres 15+).
- Developers test with the service role key locally and everything works. Switch to anon key in production and either everything breaks (no policies) or everything is exposed (RLS not enabled).

**How to avoid:**
- Audit every table the TMA will touch. Enable RLS on all of them. Write explicit policies keyed on `auth.uid()` matching the Telegram user ID stored in the minted JWT's `sub` claim.
- Never use `user_metadata` claims in RLS policies -- these are mutable by authenticated users.
- Always include the `TO` clause (e.g., `TO authenticated`) in policies to prevent anon-role bypass.
- Create a checklist: for each of the 10+ tables, document whether it has RLS enabled, what policies exist, and test with the anon key from a client.
- Never expose the InsForge service role key in the TMA bundle. It must stay server-side only (bot process, Edge Functions).

**Warning signs:**
- Any table in the `public` schema without `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
- RLS policies that use `user_metadata` instead of `auth.uid()`.
- Queries from the TMA returning data belonging to other users.
- The service role key appearing anywhere in the TMA codebase or environment variables accessible to the frontend.

**Phase to address:**
Phase 1 (Foundation/Auth). RLS policies must be written alongside the auth flow, before any data-fetching UI is built.

---

### Pitfall 3: Frontend State Ownership Instead of Backend

**What goes wrong:**
Developers put XP calculations, streak tracking, badge-earning logic, or leaderboard computation in the React frontend. When users switch devices, clear WebView data, or (on Android) when the WebView process is recycled, all progress vanishes. One documented case: a gaming Mini App stored game state in `localStorage` -- device switching and data clearing destroyed progress. The rework cost $40,000 including API redesign and user migration.

For Deal Quest specifically: XP/level progression, streak counts, attempt scoring, and badge criteria are core value. If any of these live in the frontend, they are trivially manipulable and non-persistent.

**Why it happens:**
- Telegram WebView `localStorage` is unreliable: it can be cleared when Telegram clears its cache, and does not sync across devices.
- React state management patterns (Redux, Zustand) feel natural for "app state" -- developers conflate UI state with business state.
- Scoring calculations done client-side feel faster and avoid API round-trips.

**How to avoid:**
- Enforce the rule: the backend (InsForge) owns all business state. The TMA is a rendering layer only.
- XP, streaks, badges, scores, and leaderboard positions must be computed server-side (existing bot services or InsForge functions) and read by the TMA.
- Use React state only for UI state (form drafts, animation state, navigation history).
- Telegram has introduced `DeviceStorage` and `SecureStorage` APIs for persistent local storage, but these are for caching/preferences only -- not business data.

**Warning signs:**
- Any `localStorage.setItem` call storing XP, scores, or progression data.
- Score calculations in React components rather than API responses.
- State that differs between the bot's view and the TMA's view of the same user.

**Phase to address:**
Phase 1 (Foundation) for the architectural rule; enforced throughout all feature phases.

---

### Pitfall 4: CSS `env(safe-area-inset-*)` Silently Failing in Telegram WebView

**What goes wrong:**
Standard CSS environment variables `env(safe-area-inset-top)`, `env(safe-area-inset-bottom)` resolve to `0` inside the Telegram WebView on iOS. Developers add the standard `padding-bottom: env(safe-area-inset-bottom)` for iPhone notch/home indicator handling, test in Safari where it works, then deploy to Telegram where bottom-fixed elements (navigation bars, input fields, action buttons) are hidden behind the home indicator bar. This is a confirmed Telegram iOS issue documented in GitHub Issue #1377.

**Why it happens:**
- Telegram's WKWebView does not expose the system safe area insets through the standard CSS `env()` mechanism.
- Telegram provides its own Safe Area API (`safeAreaChanged` / `contentSafeAreaChanged` events, `viewport.safeAreaInsets()` and `viewport.contentSafeAreaInsets()` signals) but this is not standard web API and must be learned separately.
- Developers coming from standard web development assume CSS safe area insets work universally.

**How to avoid:**
- Use the `@telegram-apps/sdk-react` safe area bindings: call `viewport.bindCssVars()` which creates `--tg-viewport-*` CSS variables, and read `viewport.safeAreaInsets()` / `viewport.contentSafeAreaInsets()` for padding.
- Do NOT rely on `env(safe-area-inset-*)` at all in the TMA.
- Test on a physical iPhone with a notch/Dynamic Island inside actual Telegram -- not in Safari or Chrome.
- If using fullscreen mode, safe area handling becomes even more critical since Telegram's top and bottom bars are removed.

**Warning signs:**
- Bottom navigation or input fields cut off on iPhones when tested inside Telegram.
- CSS contains `env(safe-area-inset-*)` without Telegram SDK fallback variables.
- UI looks correct in browser testing but broken inside Telegram on iOS.

**Phase to address:**
Phase 1 (Foundation/Design System). Safe area handling must be in the base layout component from day one.

---

### Pitfall 5: SDK Package Duplication and Initialization Order Errors

**What goes wrong:**
Installing both `@tma.js/sdk` and `@tma.js/sdk-react` (or their newer `@telegram-apps/*` equivalents) causes package duplication that leads to silent, hard-to-debug failures. Components appear to be initialized but methods fail. Separately, calling component methods before mounting causes runtime errors: e.g., `backButton.show()` before `backButton.mount()` throws "The backButton component was not mounted."

**Why it happens:**
- The React wrapper re-exports everything from the base SDK. Installing both creates two separate SDK instances with divergent internal state.
- The SDK has no side effects by design: `init()` must be called manually, and each component must be individually mounted before use. This differs from most React libraries where importing is sufficient.
- Not all Telegram Mini App methods exist in all Telegram versions. Calling a method from Bot API 7.7 on a user running Telegram 9.x silently fails or throws.

**How to avoid:**
- Install ONLY `@telegram-apps/sdk-react` (the current package name). Do not also install `@telegram-apps/sdk`.
- Follow the initialization sequence: `init()` first, then mount each component (`backButton.mount()`, `viewport.mount()`), then use methods.
- Always check method availability before calling: `if (backButton.show.isAvailable()) { backButton.show(); }`.
- Use the `SDKProvider` + `DisplayGate` pattern from the official React template for proper loading/error state handling.
- Consider using `@telegram-apps/create-mini-app` scaffolding to generate correct boilerplate.

**Warning signs:**
- `package.json` contains both `@tma.js/sdk` and `@tma.js/sdk-react` (or both `@telegram-apps/sdk` and `@telegram-apps/sdk-react`).
- Runtime errors mentioning "component was not mounted."
- Features work on Telegram Desktop but fail silently on older mobile clients.

**Phase to address:**
Phase 1 (Foundation). Correct SDK setup in the project scaffold prevents cascading issues in every subsequent phase.

---

### Pitfall 6: Telegram-to-Supabase Auth Bridge Misconfiguration

**What goes wrong:**
Telegram does not use OAuth. Supabase does not natively support Telegram as an auth provider. The bridge requires a custom flow: validate `initData` server-side, extract the Telegram user ID, mint a Supabase-signed JWT with `role: "authenticated"` and `sub: telegramUserId`, return it to the client. Errors in any step leave the TMA either unable to authenticate or (worse) issuing tokens that bypass RLS.

Common failure modes:
- Minting the JWT with the wrong secret (Supabase JWT secret vs. bot token vs. anon key -- they are different).
- Forgetting to set `role: "authenticated"` in the minted JWT, causing all requests to run as `anon` with no RLS policy matches.
- Not refreshing the JWT: Supabase JWTs expire (default 1 hour). The TMA keeps using an expired token, gets 401 errors, and has no refresh mechanism since it is not using Supabase Auth's session management.

**Why it happens:**
- The "bring your own JWT" pattern is documented but not the primary Supabase path. Most tutorials assume you use Supabase Auth (email/OAuth).
- The Supabase JS client's `createClient()` expects either session-based auth or a custom `accessToken` callback. Configuring the latter correctly for Telegram's non-standard auth is non-obvious.
- InsForge may have its own JWT handling that differs from upstream Supabase.

**How to avoid:**
- Implement an InsForge Edge Function (or a dedicated endpoint on the bot's server) that: (1) validates `initData` using the bot token, (2) upserts the user in the `users` table, (3) mints a JWT signed with the InsForge/Supabase JWT secret containing `sub`, `role: "authenticated"`, `exp`, and any custom claims, (4) returns it to the client.
- On the client, initialize the Supabase client with an `accessToken` callback that fetches a fresh JWT before expiry.
- Test the full flow: mint token, make a query that requires RLS, verify correct data scoping.

**Warning signs:**
- `auth.getUser()` returns null but API calls succeed (running as anon, RLS may be disabled).
- Users see each other's data (JWT `sub` not matching RLS policy expectations).
- Intermittent 401 errors after ~1 hour of use (token expiry without refresh).

**Phase to address:**
Phase 1 (Foundation/Auth). The JWT minting endpoint and client-side token management must be built and tested before any authenticated UI.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoding InsForge anon key in source | Quick setup, no env management | Key rotation requires rebuild and redeploy; key visible in git history | Never -- use `import.meta.env.VITE_INSFORGE_ANON_KEY` from day one |
| Skipping `auth_date` expiry check in initData validation | Simpler auth code | Replay attacks using captured initData tokens | Never |
| Using `localStorage` for user preferences | Works immediately, no API needed | Data lost on cache clear, device switch, or Telegram reinstall; inconsistent with bot state | MVP only for truly ephemeral UI preferences (sidebar open/closed), never for business data |
| Bundling all pages in a single chunk | No code-splitting config needed | 300KB+ initial load kills mobile WebView startup time; white screen on 3G | Never -- Vite's `React.lazy` + dynamic imports are trivial to set up |
| Inlining all chart data in page components | Quick prototyping | Re-renders on every prop change, no caching, data fetched redundantly | Only during initial feature prototyping; refactor before merging to main |
| Testing only in Telegram Desktop | Fastest iteration cycle | Desktop WebView (Chromium) behaves differently from iOS (WKWebView) and Android (Chromium Shared Runtime); viewport, keyboard, safe area, and back button all differ | Development only; require iOS + Android device testing before any PR merge |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| InsForge REST API from TMA | Using the service role key in client code (bypasses RLS, full DB access) | Use only the anon key client-side; rely on RLS policies for access control |
| InsForge Edge Functions | Not handling CORS preflight (OPTIONS) requests; missing `Access-Control-Allow-Origin` header | Create a shared `cors.ts` utility; always handle OPTIONS first in every Edge Function; return CORS headers on all responses, not just OPTIONS |
| Telegram initData to backend | Sending initData as a query parameter (logged by proxies, CDNs, appears in server access logs) | Send initData in the `Authorization` header: `Authorization: tma {initDataRaw}` |
| InsForge Realtime subscriptions | Subscribing on component mount without cleanup; creating multiple subscriptions on re-render | Subscribe in `useEffect` with a cleanup function that calls `channel.unsubscribe()`; use refs to prevent duplicate subscriptions |
| InsForge Storage (image upload) | Assuming `<input type="file">` works identically across all Telegram clients; uploading without compression | Test file input on iOS, Android, and Desktop separately; compress images client-side before upload (canvas resize to max 1024px); handle the iOS camera vs. file picker behavior difference |
| Bot "Open in App" inline buttons | Constructing TMA URLs with query parameters that Telegram strips out | Use `startParam` (the `tgWebAppStartParam`) for passing context from bot to TMA; parse it in the TMA to determine initial route/state |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Unoptimized SVG-based charts (D3 with many DOM nodes) | Jank during scroll, dropped frames on charts, visible lag on leaderboard animations | Use Canvas-based chart libraries (lightweight-charts, Chart.js) or limit SVG complexity; target 60fps on mid-range Android | Noticeable on devices with Android performance class "low" (~30% of Telegram users) |
| No code-splitting / single-bundle deployment | White screen lasting 2-4 seconds on first load over 3G Fast | Implement route-based code splitting with `React.lazy()`; keep initial bundle under 100KB gzipped; use Vite's manual chunks for vendor splitting | Over 150KB gzipped bundle or Time to First Paint > 800ms on 3G |
| Fetching all data on app launch (dashboard + learn + train + leads) | Slow initial load; unnecessary data transfer for pages user may never visit | Fetch data per-route; use `React.lazy` + `Suspense` for route-level data loading; implement stale-while-revalidate caching | When total initial data payload exceeds 50KB or 3+ simultaneous API calls |
| Heavy animations without performance class detection | Animations drop below 30fps on low-end devices; users perceive app as broken | Detect device performance class via Android User-Agent (Telegram provides OS version, device model, performance class); reduce or disable animations for low-performance devices | Low-performance Android devices (~30% of user base) |
| Uncompressed image uploads to InsForge Storage | Upload timeouts on mobile data; storage costs increase; slow image rendering in casebook/leads | Compress images client-side to WebP format; resize to max display dimensions before upload; lazy-load images below the fold | Images over 500KB on mobile data connections |
| No viewport stable height usage | Layout shifts during BottomSheet drag animation; elements jump as viewport resizes | Use `viewport.stableHeight` instead of `viewport.height` for layout calculations; avoid re-rendering during unstable viewport states | On mobile when users drag the Mini App sheet up/down |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting `initData` fields without server-side HMAC verification | Full user impersonation -- attacker accesses any user's training data, scores, and potentially admin panel | Validate HMAC-SHA256 signature server-side on every request; use `@telegram-apps/init-data-node` package |
| Exposing InsForge service role key in TMA environment variables | Complete database access bypass -- attacker reads/writes/deletes all data in all tables | Only use the anon key client-side; service role key stays in server-side code (bot, Edge Functions) only |
| RLS policies missing on auxiliary tables (badges, teams, casebook) | Data leakage through unprotected tables; attackers query badge assignments to enumerate users, or read casebook entries belonging to other teams | Enable RLS on every table in the public schema; write policies for each; test with anon key client |
| Not checking `auth_date` timestamp in initData | Replay attacks: attacker captures valid initData and reuses it indefinitely | Reject initData older than 1 hour (3600 seconds from `auth_date`) |
| Minting JWTs without expiration (`exp` claim) | Token valid forever once issued; stolen token grants permanent access | Set JWT `exp` to 1 hour; implement client-side refresh before expiry |
| Storing bot token in TMA frontend code | Attacker obtains full bot control: send messages as bot, modify webhooks, access bot API | Bot token is server-side only. The TMA never needs the bot token -- it sends initData to the server, which uses the bot token for verification |
| XSS in scenario/response display (rendering user-generated or LLM-generated HTML) | Session hijacking within Telegram WebView; CVE-2024-33905 showed postMessage exploitation for Telegram Web session theft | Sanitize all rendered content; never use `dangerouslySetInnerHTML` with unsanitized data; use a whitelist-based sanitizer for formatted LLM output |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| White flash on app launch (FOUC) before CSS loads | Users see a blank white screen for 1-2 seconds; feels broken, not polished | Add `<meta name="color-scheme" content="light dark">` tag; set initial background color via Telegram's `setBackgroundColor` method; use the `headerColor` and `backgroundColor` bot settings in BotFather |
| Using `env(safe-area-inset-*)` for iPhone notch handling | Bottom navigation, input fields, and action buttons hidden behind the home indicator on iPhones | Use Telegram's own `viewport.safeAreaInsets()` and `viewport.contentSafeAreaInsets()` via the SDK; bind to CSS variables with `viewport.bindCssVars()` |
| Not handling the virtual keyboard on iOS | Input fields pushed out of view or covered by the keyboard; forms become unusable on iOS | Telegram auto-scrolls on keyboard open but it is buggy on iOS; implement manual scroll-into-view for focused inputs; test with actual iOS keyboard |
| Back button inconsistency: forgetting to show/hide based on navigation depth | Users navigate deep into the app and have no way to go back (other than closing the entire Mini App) | Sync `backButton.show()` / `backButton.hide()` with React Router's location; show when `history.length > 1`, hide on root route. Note: `backButton.hide()` has a known bug on Android and Desktop -- test accordingly |
| Ignoring Telegram theme changes mid-session | User switches Telegram from light to dark mode; the Mini App stays in light mode, creating visual clash | Listen for `themeChanged` event; bind CSS variables with `themeParams.bindCssVars()`; design the custom brand palette using relative adjustments on Telegram theme colors rather than absolute color values |
| Loading screens that show blank content areas | Users perceive the app as slow; bounce before content loads | Use skeleton screens that match the final layout shape; animate subtly with shimmer effects; show meaningful content within 1-2 seconds |
| Not disabling vertical swipe closure during critical actions (form submission, file upload) | User accidentally swipes down during a multi-field form, closing the entire Mini App and losing input | Call `swipeBehavior.disableVertical()` during forms and uploads; re-enable on completion. But ensure the app cannot become unresponsive with swipe disabled -- users must always have an exit path |
| Desktop-oriented layouts in a mobile-first context | Wasted space, tiny touch targets, horizontal scrolling on mobile | Design for 360px minimum width; use 44px minimum touch targets; test on smallest common phone screen (iPhone SE); never require horizontal scrolling |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Auth flow:** Often missing `auth_date` expiry check -- verify that tokens older than 1 hour are rejected
- [ ] **Auth flow:** Often missing JWT refresh mechanism -- verify that after 1 hour of use, the app fetches a new token without requiring the user to close and reopen
- [ ] **RLS policies:** Often missing on "secondary" tables (badges, teams, casebook) -- verify every table the TMA reads/writes has RLS enabled and tested
- [ ] **Safe area handling:** Often using CSS `env()` which silently fails in Telegram -- verify bottom elements are visible on a physical iPhone inside Telegram
- [ ] **Back button:** Often only wired for main navigation, not for modals/overlays/deep routes -- verify back button works from every reachable screen, including modal dismiss
- [ ] **Theme sync:** Often hardcoded for light mode -- verify the app looks correct in Telegram dark mode AND responds to mid-session theme switches
- [ ] **Viewport expand:** Often called on mount but not verified -- the `expand()` method has a known bug leaving a gap; verify using `viewport.stableHeight` for layout
- [ ] **File upload (leads, support screenshots):** Often tested only on desktop -- verify `<input type="file">` works on iOS (camera + gallery), Android (file picker), and handles the different behaviors
- [ ] **Performance on low-end devices:** Often only tested on developer's flagship phone -- verify on Android with "low" performance class; animations should degrade gracefully
- [ ] **Error handling for offline/flaky connection:** Often missing entirely -- verify that failed API calls show user-friendly errors, not blank screens or console errors
- [ ] **Bot "Open in App" deep links:** Often only linking to the TMA root -- verify `startParam` is parsed correctly to open the relevant page (e.g., specific lead, scenario, or training track)
- [ ] **Source maps in production:** Often excluded from the build -- the Telegram WebView strips line numbers from errors. Without source maps uploaded to your error tracker (Sentry), production errors are undebuggable

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Missing RLS on tables (data exposed) | HIGH | Immediately enable RLS on all affected tables; audit access logs for unauthorized reads; notify affected users if PII exposed; add RLS policies; re-test all queries with anon key |
| initData validation bypassed (user impersonation) | HIGH | Rotate bot token via BotFather (invalidates all existing initData); deploy fix with proper validation; audit backend for unauthorized actions; invalidate all minted JWTs |
| Frontend state loss (XP/scores in localStorage) | MEDIUM | Migrate state to backend; write a one-time sync script; accept that some user data is permanently lost; communicate transparently |
| Safe area CSS broken on iOS | LOW | Replace `env(safe-area-inset-*)` with Telegram SDK safe area bindings; deploy hotfix; no data loss, purely visual |
| SDK package duplication bugs | LOW | Remove duplicate package; clear `node_modules` and lockfile; reinstall; test initialization sequence |
| JWT expiry without refresh (users logged out after 1 hour) | LOW | Add token refresh logic to the Supabase client's `accessToken` callback; deploy; users simply need to reopen the Mini App once |
| CORS errors on Edge Functions | LOW | Add OPTIONS handler and CORS headers to all Edge Functions; redeploy; client code needs no changes |
| Chart performance on low-end devices | MEDIUM | Implement performance class detection; conditionally reduce chart complexity; switch from SVG to Canvas rendering; add animation toggle in settings |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| initData validation bypass | Phase 1: Foundation/Auth | Automated test: submit tampered initData, verify 403; submit expired initData (auth_date > 1hr), verify rejection |
| RLS misconfiguration | Phase 1: Foundation/Auth | For each table: query with anon key as User A, verify User B's data is not returned; scan for tables without RLS via SQL query |
| Frontend state ownership | Phase 1: Foundation (architecture rule) | Code review: grep for `localStorage` usage storing business data; verify all XP/score/badge values come from API responses |
| Safe area CSS failure | Phase 1: Foundation/Design System | Manual test: open on physical iPhone with notch inside Telegram; verify bottom nav/inputs are fully visible |
| SDK package duplication | Phase 1: Foundation/Scaffold | Check `package.json` for duplicate SDK packages; verify `init()` + `mount()` sequence in app bootstrap |
| Auth bridge misconfiguration | Phase 1: Foundation/Auth | End-to-end test: Telegram initData in, Supabase JWT out, query with RLS, verify scoped data returned |
| CORS on Edge Functions | Phase 1: Foundation/API | Test from TMA WebView: make OPTIONS + POST request to each Edge Function; verify no CORS errors in console |
| White flash / FOUC | Phase 1: Foundation/Design System | Open TMA on mobile; record screen; verify no white flash before branded content appears |
| Back button inconsistency | Phase 2: First feature screens | Navigate to every screen; verify back button appears/disappears correctly; test on Android (known hide bug) |
| Virtual keyboard on iOS | Phase 2: First forms (support input, lead forms) | Open a form on iOS inside Telegram; tap input field; verify field is visible above keyboard; verify no layout jump |
| Chart performance on low-end devices | Phase 3: Dashboard/Charts | Test on a low-performance Android device; verify chart renders without jank; verify animation toggle works |
| File upload cross-platform | Phase 3: Support/Leads features | Test `<input type="file">` on iOS (camera+gallery), Android (file picker), Desktop; verify upload completes on each |
| Theme sync mid-session | Phase 2: Design system integration | Switch Telegram theme while TMA is open; verify colors update immediately without reload |
| Image optimization | Phase 3: Features with images (leads, support) | Upload a 5MB photo from mobile; verify it is compressed before upload; verify display loads quickly |
| JWT token refresh | Phase 1: Auth, verified in Phase 3 (long-session testing) | Keep TMA open for > 1 hour; verify API calls still work; check that a fresh JWT was transparently fetched |

## Sources

- [Telegram Mini Apps Official Documentation - Init Data](https://docs.telegram-mini-apps.com/platform/init-data) -- HIGH confidence
- [Telegram Mini Apps Official Documentation - Viewport](https://docs.telegram-mini-apps.com/platform/viewport) -- HIGH confidence
- [Telegram Mini Apps Official Documentation - Back Button](https://docs.telegram-mini-apps.com/platform/back-button) -- HIGH confidence
- [Telegram Mini Apps Official Documentation - Theming](https://docs.telegram-mini-apps.com/platform/theming) -- HIGH confidence
- [@tma.js/sdk Usage Tips](https://docs.telegram-mini-apps.com/packages/tma-js-sdk/usage-tips) -- HIGH confidence
- [Supabase Row Level Security Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) -- HIGH confidence
- [Supabase API Keys Documentation](https://supabase.com/docs/guides/api/api-keys) -- HIGH confidence
- [CVE-2025-48757: 170+ Apps Exposed by Missing RLS](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/) -- MEDIUM confidence (third-party reporting)
- [Telegram iOS Issue #1377: safe-area-inset-bottom not working](https://github.com/TelegramMessenger/Telegram-iOS/issues/1377) -- HIGH confidence (official issue tracker)
- [Telegram iOS Issue #1285: Go back gesture not supported](https://github.com/TelegramMessenger/Telegram-iOS/issues/1285) -- HIGH confidence
- [tma.js Issue #554: Back button visibility bug](https://github.com/Telegram-Mini-Apps/telegram-apps/issues/554) -- HIGH confidence
- [Telegram Mini Apps Issues #39: iOS safe area scroll bug](https://github.com/Telegram-Mini-Apps/issues/issues/39) -- HIGH confidence
- [Telegram Mini App Development Specifics (dev.family)](https://dev.to/dev_family/telegram-mini-app-development-and-testing-specifics-from-initialisation-to-launch-1ofh) -- MEDIUM confidence
- [Common Telegram Mini App Development Challenges (FindMini)](https://www.findmini.app/read/common-telegram-mini-app-development-challenges-solutions/) -- MEDIUM confidence
- [Supabase CORS Guide (bootstrapped.app)](https://bootstrapped.app/guide/how-to-configure-cors-in-supabase) -- MEDIUM confidence
- [Telegram Mini Apps Ecosystem (nadcab.com) - Security Risks](https://www.nadcab.com/blog/security-risks-in-telegram-mini-apps) -- MEDIUM confidence
- [Supabase RLS Complete Guide (vibeappscanner.com)](https://vibeappscanner.com/blog/supabase-rls-complete-guide) -- MEDIUM confidence
- [Supabase Auth Issue #167: Telegram as provider](https://github.com/supabase/auth/issues/167) -- HIGH confidence (official issue tracker)

---
*Pitfalls research for: Telegram Mini App (React) with InsForge/Supabase backend, added to existing Python Telegram bot*
*Researched: 2026-02-01*
