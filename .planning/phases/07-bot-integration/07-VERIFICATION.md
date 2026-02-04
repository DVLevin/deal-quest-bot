---
phase: 07-bot-integration
verified: 2026-02-04T12:41:39Z
status: passed
score: 3/3 must-haves verified
re_verification: false
---

# Phase 7: Bot Integration Verification Report

**Phase Goal:** The existing bot offers smooth transitions into the TMA, letting users jump from chat commands directly into rich app experiences

**Verified:** 2026-02-04T12:41:39Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Bot commands (/stats, /learn, /train, /support, /leads) display an "Open in App" inline button alongside the existing text response | ✓ VERIFIED | All 5 handlers import and use `add_open_in_app_row` with correct paths. stats.py:132, learn.py:139/141, train.py:183, support.py:82, leads.py:307/338 |
| 2 | Tapping an "Open in App" button deep-links to the correct TMA page | ✓ VERIFIED | WebAppInfo URLs constructed correctly: stats→root (no path), learn→/learn, train→/train, support→/support, leads→/leads. BrowserRouter handles path routing natively. Fallback startParam routing via useDeepLink hook. |
| 3 | The TMA is accessible via the menu button in BotFather | ✓ VERIFIED | `setup_menu_button` called at bot startup (main.py:134) with MenuButtonWebApp configured to open TMA root URL |

**Score:** 3/3 truths verified (100%)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bot/config.py` | tma_url config field | ✓ VERIFIED | Line 26: `tma_url: str = ""` with empty default (59 lines total) |
| `bot/utils_tma.py` | add_open_in_app_row helper + setup_menu_button | ✓ VERIFIED | 58 lines, exports both functions, uses WebAppInfo (lines 12, 32, 53), no stub patterns |
| `bot/main.py` | tma_url DI injection and menu button setup | ✓ VERIFIED | Line 134: setup_menu_button call, Line 161: tma_url in workflow_data |
| `bot/handlers/stats.py` | Open in App button on /stats | ✓ VERIFIED | Import line 26, param line 50, usage line 132 with no path (root) |
| `bot/handlers/learn.py` | Open in App button on /learn | ✓ VERIFIED | Import line 41, param line 101, usage lines 139/141 with "learn" path |
| `bot/handlers/train.py` | Open in App button on /train | ✓ VERIFIED | Import line 42, param line 164, usage line 183 with "train" path |
| `bot/handlers/support.py` | Open in App button on /support | ✓ VERIFIED | Import line 45, param line 73, usage line 82 with "support" path |
| `bot/handlers/leads.py` | Open in App button on /leads | ✓ VERIFIED | Import line 24, param line 295, usage lines 307/338 with "leads" path |
| `packages/webapp/src/shared/hooks/useDeepLink.ts` | startParam → route navigation hook | ✓ VERIFIED | 52 lines, exports useDeepLink, uses retrieveLaunchParams (line 40), START_PARAM_MAP covers all 7 param values |
| `packages/webapp/src/app/Router.tsx` | useDeepLink integration in AppRoutes | ✓ VERIFIED | Import line 14, call line 46, alongside useBackButton |

**Artifact Summary:** 10/10 artifacts verified

#### Level-by-Level Artifact Verification

**bot/utils_tma.py:**
- Level 1 (Exists): ✓ EXISTS (58 lines)
- Level 2 (Substantive): ✓ SUBSTANTIVE (58 lines > 10 min, exports both functions, no stub patterns, no TODO/FIXME)
- Level 3 (Wired): ✓ WIRED (imported by 5 handlers + main.py, setup_menu_button called in main.py)

**packages/webapp/src/shared/hooks/useDeepLink.ts:**
- Level 1 (Exists): ✓ EXISTS (52 lines)
- Level 2 (Substantive): ✓ SUBSTANTIVE (52 lines > 20 min for hook, exports useDeepLink, no stub patterns)
- Level 3 (Wired): ✓ WIRED (imported and called in Router.tsx line 46)

**All 5 bot handlers (stats, learn, train, support, leads):**
- Level 1 (Exists): ✓ EXISTS (all files present)
- Level 2 (Substantive): ✓ SUBSTANTIVE (all add tma_url param, import helper, use add_open_in_app_row with correct paths)
- Level 3 (Wired): ✓ WIRED (tma_url injected via workflow_data, helper properly imported and called)

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| bot/main.py | bot/config.py | cfg.tma_url in workflow_data | ✓ WIRED | Line 161: `"tma_url": cfg.tma_url` |
| bot/main.py | bot/utils_tma.py | setup_menu_button call at startup | ✓ WIRED | Line 46: import, Line 134: await call before polling |
| bot/handlers/stats.py | bot/utils_tma.py | add_open_in_app_row import | ✓ WIRED | Line 26: import, Line 132: usage |
| bot/handlers/learn.py | bot/utils_tma.py | add_open_in_app_row import | ✓ WIRED | Line 41: import, Lines 139/141: usage |
| bot/handlers/train.py | bot/utils_tma.py | add_open_in_app_row import | ✓ WIRED | Line 42: import, Line 183: usage |
| bot/handlers/support.py | bot/utils_tma.py | add_open_in_app_row import | ✓ WIRED | Line 45: import, Line 82: usage |
| bot/handlers/leads.py | bot/utils_tma.py | add_open_in_app_row import | ✓ WIRED | Line 24: import, Lines 307/338: usage |
| packages/webapp/src/app/Router.tsx | packages/webapp/src/shared/hooks/useDeepLink.ts | useDeepLink() call inside AppRoutes | ✓ WIRED | Line 14: import, Line 46: call |
| packages/webapp/src/shared/hooks/useDeepLink.ts | @telegram-apps/sdk-react | retrieveLaunchParams for startParam | ✓ WIRED | Line 14: import, Line 40: usage with tgWebAppStartParam |

**Link Summary:** 9/9 key links verified as wired

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| BOT-01: Bot commands offer "Open in App" inline buttons alongside text responses | ✓ SATISFIED | All 5 handlers verified with button integration |
| BOT-02: Deep links from bot to specific TMA pages | ✓ SATISFIED | WebAppInfo URLs with paths + startParam fallback via useDeepLink |
| BOT-03: TMA menu button configured in BotFather | ✓ SATISFIED | setup_menu_button called at startup with MenuButtonWebApp |

**Requirements Summary:** 3/3 requirements satisfied (100%)

### Anti-Patterns Found

**None detected.**

Scanned files:
- bot/config.py — no stub patterns
- bot/utils_tma.py — no TODO/FIXME/placeholder, no empty returns, proper logging, graceful degradation
- bot/main.py — proper async/await, DI injection pattern
- All 5 bot handlers — proper import and usage, no stub patterns
- packages/webapp/src/shared/hooks/useDeepLink.ts — no stub patterns, proper useRef guard, no console.log

**TypeScript Compilation:** Clean (npx tsc --noEmit passed with only Node.js CommonJS experimental warning)

### Human Verification Required

None — all verification can be performed programmatically or through code inspection.

**Note:** While functional testing (actually tapping buttons in Telegram) would be valuable, the structural verification confirms:
1. All wiring is correct (imports, function calls, parameter passing)
2. All artifacts are substantive (not stubs)
3. All paths are correctly mapped
4. Graceful degradation is implemented (empty tma_url = skip)

The code is ready for deployment and user testing.

---

## Verification Details

### Bot-Side Verification (Plan 07-01)

**Config Field:**
- ✓ `bot/config.py` line 26: `tma_url: str = ""`
- ✓ Empty default allows graceful degradation for existing deployments

**Helper Module:**
- ✓ `bot/utils_tma.py` created with 58 lines
- ✓ Function 1: `add_open_in_app_row(keyboard, tma_url, path="")` — builds WebAppInfo inline button
  - Lines 18-37: Proper typing, graceful skip on empty tma_url, returns new keyboard or appends row
- ✓ Function 2: `async setup_menu_button(bot, tma_url)` — sets menu button at startup
  - Lines 40-58: Async, try/except, logging, graceful skip on empty tma_url
- ✓ WebAppInfo usage verified (lines 12, 32, 53)

**Main.py Integration:**
- ✓ Line 46: `from bot.utils_tma import setup_menu_button`
- ✓ Line 134: `await setup_menu_button(bot, cfg.tma_url)` before polling starts
- ✓ Line 161: `"tma_url": cfg.tma_url` in workflow_data DI injection

**Handler Integration (all 5 commands):**

| Handler | Import Line | Param Line | Usage Line | Path | Status |
|---------|------------|------------|------------|------|--------|
| stats.py | 26 | 50 | 132 | "" (root) | ✓ VERIFIED |
| learn.py | 41 | 101 | 139, 141 | "learn" | ✓ VERIFIED |
| train.py | 42 | 164 | 183 | "train" | ✓ VERIFIED |
| support.py | 45 | 73 | 82 | "support" | ✓ VERIFIED |
| leads.py | 24 | 295 | 307, 338 | "leads" | ✓ VERIFIED |

**Key Observations:**
- All handlers accept `tma_url: str = ""` as a parameter (DI via workflow_data)
- All handlers import `add_open_in_app_row` from `bot.utils_tma`
- All handlers call the helper with correct paths matching TMA routes
- stats.py uses no path (root dashboard), others use named paths
- Buttons are always appended as LAST row (non-destructive)
- Graceful degradation: empty tma_url = no button added

### TMA-Side Verification (Plan 07-02)

**useDeepLink Hook:**
- ✓ `packages/webapp/src/shared/hooks/useDeepLink.ts` created with 52 lines
- ✓ Export: `useDeepLink` function (line 26)
- ✓ START_PARAM_MAP covers 7 values:
  - stats → /
  - dashboard → /
  - learn → /learn
  - train → /train
  - support → /support
  - leads → /leads
  - profile → /profile
- ✓ Line 40: `retrieveLaunchParams()` from @telegram-apps/sdk-react
- ✓ Line 41: `tgWebAppStartParam` property (SDK v3 correct name)
- ✓ Line 33: `useRef(handled)` single-execution guard
- ✓ Line 37: `location.pathname !== '/'` gives WebAppInfo URL priority
- ✓ Line 45: `navigate(route, { replace: true })` clean history
- ✓ Lines 48-50: Empty catch for non-Telegram context (no error spam)

**Router Integration:**
- ✓ `packages/webapp/src/app/Router.tsx` line 14: import useDeepLink
- ✓ Line 46: `useDeepLink()` call inside AppRoutes
- ✓ Placement: after useBackButton (line 45), before Routes (line 51)
- ✓ Routes exist for all mapped paths: /, /learn, /train, /support, /leads, /profile

**Route Mapping Verification:**

| Bot Handler | Path Param | TMA WebAppInfo URL | TMA Route | useDeepLink Param | Status |
|-------------|------------|-------------------|-----------|------------------|--------|
| /stats | "" | {tma_url}/ | / (Dashboard) | stats, dashboard | ✓ CORRECT |
| /learn | "learn" | {tma_url}/learn | /learn | learn | ✓ CORRECT |
| /train | "train" | {tma_url}/train | /train | train | ✓ CORRECT |
| /support | "support" | {tma_url}/support | /support | support | ✓ CORRECT |
| /leads | "leads" | {tma_url}/leads | /leads | leads | ✓ CORRECT |

**Two Routing Mechanisms:**
1. **Primary (inline buttons):** WebAppInfo URL with path → BrowserRouter handles natively
2. **Fallback (direct links):** tgWebAppStartParam → useDeepLink maps to route

Both mechanisms verified and correctly implemented.

---

## Summary

**Phase 7 goal ACHIEVED.** All 3 success criteria verified:

1. ✓ Bot commands display "Open in App" inline buttons alongside text responses
2. ✓ Deep links open correct TMA pages (WebAppInfo paths + startParam fallback)
3. ✓ TMA accessible via menu button (programmatically set at bot startup)

**Requirements coverage:** 3/3 (BOT-01, BOT-02, BOT-03) satisfied

**Artifacts:** 10/10 verified (exists, substantive, wired)

**Key links:** 9/9 verified as wired

**Anti-patterns:** None detected

**Code quality:**
- All implementations are substantive (not stubs)
- Graceful degradation implemented (empty tma_url = skip)
- Proper error handling (try/except, empty catch)
- Clean TypeScript compilation
- No TODO/FIXME comments
- Proper DI pattern usage
- Single-execution guard for hooks

**Deployment readiness:** Phase 7 is complete and ready for user testing. Set `TMA_URL` env var in Railway to enable the buttons.

---

_Verified: 2026-02-04T12:41:39Z_
_Verifier: Claude (gsd-verifier)_
