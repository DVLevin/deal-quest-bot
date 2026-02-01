# Feature Research

**Domain:** Telegram Mini App -- Gamified Sales Training Platform (Deal Quest TMA)
**Researched:** 2026-02-01
**Confidence:** MEDIUM-HIGH

> The TMA is a visual/interactive layer. The bot backend already handles AI logic, data persistence, and all core features (support, learn, train, stats, leads, casebook, admin). This research focuses on what TMA-specific features and UX patterns to build on the frontend.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or broken inside Telegram.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Theme-adaptive UI** | TMA users expect the app to match their Telegram color scheme (light/dark). Mismatched themes feel broken. | LOW | Use CSS variables from `ThemeParams` (`var(--tg-theme-bg-color)`, etc.). 18+ theme tokens available. Zero design cost if built from the start. |
| **Back button navigation** | Users expect native-feeling navigation. Without `BackButton`, they get trapped in sub-screens. | LOW | Wire `Telegram.WebApp.BackButton` to your router. Show/hide based on navigation depth. |
| **MainButton (BottomButton) for primary actions** | The bottom action button is the TMA equivalent of a mobile app's primary CTA. Users look for it. | LOW | Renamed to `BottomButton` in recent API. Supports text, color, loading spinner, shine effect. Use for "Start Training", "Submit Answer", "Save", etc. |
| **Fast initial load (<2s)** | "White screens kill conversion." TMA sessions are short -- users bail immediately on slow loads. | MEDIUM | Skeleton screens, code splitting, lightweight bundle. Telegram WebView is resource-constrained. |
| **Session interruption resilience** | Mobile users switch chats constantly. TMA must survive backgrounding/foregrounding dozens of times per session. | MEDIUM | Save state progressively to backend. Never rely solely on in-memory state. Use `activated`/`deactivated` events (Bot API 8.0+) to detect focus changes. |
| **One-tap auth (zero-friction onboarding)** | TMA auth is automatic via `initData`. Any login wall feels alien. | LOW | Validate `initData` hash server-side. User identity is free. Never ask for username/password. |
| **Haptic feedback on interactions** | Native apps vibrate on taps and selections. TMAs that don't feel "dead." | LOW | `HapticFeedback.impactOccurred("light")` on button taps, `notificationOccurred("success")` on completions, `selectionChanged()` on option picks. Chainable API. |
| **Dashboard with key metrics** | Users need an at-a-glance summary: progress, streak, rank. Without it, they don't know where they stand. | MEDIUM | 3-5 key metrics max. Use micro-visualizations (sparklines, progress rings) not full charts. Mobile viewport is small. |
| **Progress tracking visualization** | Users in learning/training apps expect to see how far they've come. Missing = no motivation loop. | MEDIUM | Progress bars per learning track, completion percentages, streak counters. Keep lightweight -- no heavy charting libraries. |
| **Responsive mobile-first layout** | TMAs run in WebView. Desktop is secondary. Non-responsive layouts break on phones. | MEDIUM | Design for 360px-width minimum. Respect `safeAreaInset` and `contentSafeAreaInset` (Bot API 8.0+). Test across iOS/Android WebViews. |
| **Closing confirmation on unsaved state** | Users accidentally swipe away TMAs. Losing in-progress quiz answers is infuriating. | LOW | `Telegram.WebApp.enableClosingConfirmation()` when user has unsaved work. Disable when safe. |

### Differentiators (Competitive Advantage)

Features that set Deal Quest apart. Not expected in generic TMAs, but high-value for a gamified training platform.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **SecondaryButton for scenario branching** | Two bottom buttons = "Option A" / "Option B" for sales scenario choices. No other training TMA does this natively. | LOW | `SecondaryButton` (Bot API 7.10+) with `position: "top"` places it above MainButton. Perfect for binary scenario decisions with timer. |
| **Badge wall with collection mechanics** | Visual badge grid showing earned/locked badges. Collecting badges triggers completionist psychology. Creates "share-worthy" moments. | MEDIUM | Locked badges shown as silhouettes. Haptic `notificationOccurred("success")` on badge earn. Consider `shareToStory()` (Bot API 7.8+) to let users share badge achievements to Telegram Stories. |
| **Animated leaderboard with friend filter** | Leaderboard isn't just global -- filter by "friends" (users who share the same Telegram group). Creates social pressure in team contexts. | MEDIUM | Rankings with position-change animations. Multiple views: global, team/group, weekly. Real-time updates from backend via polling or SSE. |
| **Timed scenario cards with pressure UX** | Sales scenarios with countdown timer, swipeable cards, and immediate feedback. Creates "flow state" engagement. | HIGH | Card stack UI with swipe gestures. Timer creates urgency. Haptic feedback on correct/incorrect. Requires smooth 60fps animations in WebView. |
| **Learning track map visualization** | Visual "path" showing lesson nodes, current position, locked/unlocked status. Borrowed from Duolingo's proven UX pattern. | HIGH | SVG or canvas-based path. Nodes represent lessons. Current node highlighted. Locked nodes dimmed. Scroll position saves to DeviceStorage for instant resume. |
| **Cloud-synced progress across devices** | User starts training on phone, reviews stats on desktop. Progress follows them. | MEDIUM | Use `CloudStorage` (1024 keys, 4096 chars/value) for critical user state (current lesson, badge inventory, settings). Use backend as source of truth; CloudStorage as fast-read cache. |
| **Native popup for quiz feedback** | Use Telegram's native `showPopup()` for correct/incorrect feedback instead of custom modals. Feels integrated, not web-app-ish. | LOW | `showPopup({title, message, buttons})` with up to 3 buttons. Supports "default", "ok", "destructive" button types. Faster than rendering custom modal. |
| **QR code scanner for team activities** | In-person sales training: scan QR to join a session, pair with a partner, or check into an event. | LOW | `showScanQrPopup()` (Bot API 6.4+). Returns scanned text via callback. Close with `closeScanQrPopup()`. Useful for blended learning (online + offline). |
| **Strategy builder with drag-and-drop** | Support mode: users build sales strategies by arranging blocks/cards. Interactive and tactile. | HIGH | Drag-and-drop in WebView is possible but tricky. Must disable `verticalSwipes` to prevent Telegram intercepting gestures. Use `disableVerticalSwipes()` (Bot API 7.7+). |
| **Casebook browser with search and filters** | Browsable library of sales case studies with category filters, search, and bookmarks. | MEDIUM | List virtualization for performance. Filter chips UI. Bookmark state in CloudStorage for cross-device access. |
| **DeviceStorage for offline-capable UX** | Cache lesson content, last dashboard state, and user preferences locally. App feels instant on re-open. | LOW | `DeviceStorage` (Bot API 9.0+, 5MB per user per bot). Store serialized lesson content, theme preference, last-viewed screen. Falls back to backend fetch if cache miss. |
| **Custom branded bottom bar color** | Match the bottom bar to Deal Quest brand colors instead of default Telegram chrome. | LOW | `setBottomBarColor(color)` (Bot API 7.10+). Also `setHeaderColor()` and `setBackgroundColor()` for full brand immersion. |
| **Add to Home Screen prompt** | Users who add the TMA to their home screen have 3-4x higher retention. | LOW | `addToHomeScreen()` (Bot API 8.0+). Check status with `checkHomeScreenStatus()`. Prompt after first successful training session, not on first visit. |
| **Full-screen mode for immersive training** | Remove Telegram chrome during active scenario training for maximum focus. | LOW | `requestFullscreen()` (Bot API 8.0+). Combine with `lockOrientation()` for consistent experience. Exit on scenario completion. |
| **Settings button for preferences** | Clean access point for notification preferences, difficulty level, language. | LOW | `SettingsButton` (Bot API 7.0+). Opens a settings screen within the TMA. Better than cluttering the main UI with a gear icon. |

### Anti-Features (Deliberately NOT Building)

Features that seem good but create problems. Common mistakes in this domain.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Real-time multiplayer scenarios** | "Head-to-head sales battles would be exciting" | WebSocket connections in WebView are fragile. Session interruptions kill active games. Sync complexity is massive for a TMA. Over 35% of users ditch overly-gamified apps. | Asynchronous competition via leaderboards. Users complete scenarios independently, compete on scores. Same motivation, fraction of the complexity. |
| **Frontend business logic** | "Faster to run scoring/AI logic client-side" | Bot already handles all AI/backend logic. Duplicating logic in frontend creates drift, security holes, and increases bundle size. A gaming TMA that stored state in frontend localStorage had to spend $40K on rework when users lost progress across devices. | TMA is purely visual layer. All scoring, AI, and state lives on the backend. TMA renders what the backend sends. |
| **Heavy charting library (Chart.js/D3)** | "We need beautiful analytics dashboards" | Adds 200-500KB to bundle. Kills load time in WebView. Overkill for the 3-5 metrics users actually need. Dashboards with 3-5 essential charts are far more effective than those crammed with twenty. | Micro-visualizations: CSS-only progress bars, SVG sparklines, HTML/CSS progress rings. Lightweight custom components that render in <100ms. |
| **Persistent WebSocket connection** | "Real-time updates for leaderboard and notifications" | WebView backgrounding kills connections. Reconnection logic adds complexity. Battery drain on mobile. TMAs are short sessions. | Poll on focus (`activated` event). Push critical updates via Telegram bot notifications (free, native, reliable). |
| **Custom authentication system** | "We need user accounts with email/password" | TMA provides `initData` with verified user identity for free. Adding a login wall is the #1 conversion killer for TMAs. Users expect zero-friction access. | Use `initData` validation exclusively. Augment with `requestContact()` (Bot API 6.9+) only when phone number is genuinely needed. |
| **Multi-page website architecture** | "Each feature should be a separate page with its own URL" | TMA is not a website. Full page reloads in WebView are slow and break state. Deep linking is limited. Multi-page creates "white flash" transitions. | Single-Page Application (SPA) with client-side routing. Smooth transitions. State preserved in memory and DeviceStorage. |
| **Crypto/TON wallet integration** | "Everyone's doing Web3 in TMAs" | Deal Quest is a sales training tool, not a crypto app. Wallet connection adds friction, regulatory burden, and confuses the value proposition. TON policy requires exclusive TON blockchain use if any crypto is involved. | If monetization needed, use Telegram Stars for digital goods (required by policy anyway). Skip crypto entirely. |
| **Complex drag-and-drop everywhere** | "Make everything draggable for engagement" | Touch gesture conflicts with Telegram's swipe-to-dismiss. Even with `disableVerticalSwipes()`, gesture libraries add 50-100KB and are unreliable in WebView. | Reserve drag-and-drop for the one feature that truly needs it (strategy builder). Use tap-to-select or swipe-cards for everything else. |
| **Offline-first architecture** | "Users should be able to train without internet" | CloudStorage and DeviceStorage have tiny limits (4MB and 5MB). Service Workers in WebView have inconsistent support. The bot backend is the source of truth. | Cache-enhanced online-first: DeviceStorage caches last session for instant re-open. Gracefully degrade with "reconnecting..." state. Don't promise offline. |
| **Video lessons embedded in TMA** | "Video tutorials would be rich content" | Video in WebView is resource-heavy, inconsistent across platforms, eats mobile data. Users are in Telegram for quick interactions, not YouTube. | Short text + illustration lessons. If video is essential, use `openLink()` to open in native browser, or send video via bot message (Telegram handles video natively and efficiently). |

---

## Feature Dependencies

```
[Theme-Adaptive UI]
    (no dependencies -- build first, everything inherits)

[BackButton Navigation] ──requires──> [SPA Router]
[MainButton Actions] ──requires──> [SPA Router]
[SecondaryButton Branching] ──requires──> [MainButton Actions]

[Dashboard]
    ├──requires──> [Theme-Adaptive UI]
    ├──requires──> [Backend API Integration]
    └──enhances──> [Progress Tracking]

[Progress Tracking]
    ├──requires──> [Backend API Integration]
    └──enhances──> [Dashboard]

[Badge Wall]
    ├──requires──> [Backend API Integration]
    ├──enhances──> [Dashboard] (badge count widget)
    └──enhances──> [Leaderboard] (badge icons on rankings)

[Leaderboard]
    ├──requires──> [Backend API Integration]
    └──enhances──> [Dashboard] (rank widget)

[Timed Scenario Cards (Train)]
    ├──requires──> [MainButton Actions]
    ├──requires──> [SecondaryButton Branching]
    ├──requires──> [Haptic Feedback]
    └──requires──> [Backend API Integration]

[Learning Track Map (Learn)]
    ├──requires──> [Progress Tracking]
    ├──requires──> [Backend API Integration]
    └──enhances──> [Dashboard] (current lesson widget)

[Casebook Browser]
    ├──requires──> [Backend API Integration]
    └──independent of other features

[Strategy Builder (Support)]
    ├──requires──> [Backend API Integration]
    ├──requires──> [disableVerticalSwipes]
    └──independent of other features

[Admin Dashboard]
    ├──requires──> [Backend API Integration]
    ├──requires──> [Role-based Access Control]
    └──independent of user-facing features

[CloudStorage Caching] ──enhances──> [All features] (faster re-open)
[DeviceStorage Caching] ──enhances──> [All features] (instant resume)
[Add to Home Screen] ──enhances──> [Retention] (prompt after first success)
```

### Dependency Notes

- **Theme-Adaptive UI is foundational:** Every component inherits theme tokens. Must be the first thing built. Retrofitting is painful.
- **SPA Router is infrastructure:** BackButton, MainButton, and all screen transitions depend on client-side routing. Choose router before building any screens.
- **Backend API Integration is ubiquitous:** Every data-displaying feature depends on it. Define API contract early.
- **SecondaryButton requires MainButton:** The two-button layout only works when MainButton is already wired. SecondaryButton positions relative to MainButton.
- **Badge Wall enhances multiple features:** Badges appear on Dashboard and Leaderboard. Build Badge Wall after those, but design the badge data model early.
- **Admin Dashboard is independent:** Can be built in parallel with user-facing features. Shares backend API but has separate UI.
- **Strategy Builder is the riskiest feature:** Depends on drag-and-drop in WebView, which is the most fragile interaction pattern. Build last, after all stable features ship.

---

## MVP Definition

### Launch With (v1)

Minimum viable TMA -- what validates that a visual layer adds value over the bot-only experience.

- [ ] **Theme-adaptive UI shell** -- branded but respects Telegram themes; instant credibility
- [ ] **SPA router with BackButton/MainButton** -- native-feeling navigation; without this, the app feels broken
- [ ] **Dashboard screen** -- 3-5 key metrics (streak, rank, badges earned, lessons completed); micro-visualizations only
- [ ] **Learn mode: lesson card viewer** -- display lesson content from backend; simple card stack, no map yet
- [ ] **Train mode: scenario cards with timer** -- the core differentiator; timed scenarios with MainButton/SecondaryButton for choices
- [ ] **Haptic feedback on all interactions** -- tiny effort, massive feel improvement
- [ ] **Closing confirmation during active training** -- prevent accidental loss of in-progress scenarios
- [ ] **Session state persistence** -- save current screen and in-progress answers to backend on every interaction

### Add After Validation (v1.x)

Features to add once the core loop (dashboard -> learn -> train) is validated with real users.

- [ ] **Badge wall** -- trigger: users ask "where are my badges?" or engagement metrics show badge-earning doesn't increase retention (because users can't see them)
- [ ] **Leaderboard with friend filter** -- trigger: team/group usage grows beyond individual users
- [ ] **Learning track map** -- trigger: users have >10 lessons and navigation by list becomes unwieldy
- [ ] **Casebook browser** -- trigger: casebook content library reaches critical mass (>20 cases)
- [ ] **CloudStorage + DeviceStorage caching** -- trigger: load times measured >2s or users report "slow app"
- [ ] **Add to Home Screen prompt** -- trigger: Day-7 retention data available to measure if prompt timing matters
- [ ] **Full-screen mode for training** -- trigger: user feedback requests "less distraction during scenarios"
- [ ] **SettingsButton** -- trigger: preferences exist that users need to change (notification frequency, difficulty)

### Future Consideration (v2+)

Features to defer until product-market fit is established and user base is meaningful.

- [ ] **Strategy builder (Support mode)** -- drag-and-drop is high-risk in WebView; defer until core engagement proven
- [ ] **Admin dashboard in TMA** -- admin can use bot commands initially; TMA admin panel is a polish feature
- [ ] **QR scanner for team events** -- requires in-person training use case to be validated first
- [ ] **Share to Telegram Stories** -- requires badge wall to exist and users to value sharing
- [ ] **Custom branded animations** -- Lottie or GSAP animations for badge earn, level up, scenario completion; polish layer
- [ ] **Biometric auth for admin actions** -- `BiometricManager` (Bot API 7.2+) for sensitive admin operations; low priority until admin TMA exists

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Theme-adaptive UI | HIGH | LOW | **P1** |
| SPA router + BackButton/MainButton | HIGH | LOW | **P1** |
| Dashboard (micro-viz) | HIGH | MEDIUM | **P1** |
| Train mode (scenario cards + timer) | HIGH | HIGH | **P1** |
| Learn mode (lesson cards) | HIGH | MEDIUM | **P1** |
| Haptic feedback | MEDIUM | LOW | **P1** |
| Closing confirmation | MEDIUM | LOW | **P1** |
| Session state persistence | HIGH | MEDIUM | **P1** |
| Badge wall | HIGH | MEDIUM | **P2** |
| Leaderboard | HIGH | MEDIUM | **P2** |
| Learning track map | MEDIUM | HIGH | **P2** |
| Casebook browser | MEDIUM | MEDIUM | **P2** |
| Cloud/Device caching | MEDIUM | LOW | **P2** |
| Add to Home Screen | MEDIUM | LOW | **P2** |
| Full-screen training | LOW | LOW | **P2** |
| SettingsButton | LOW | LOW | **P2** |
| SecondaryButton (scenario branching) | HIGH | LOW | **P1** |
| Strategy builder (drag-and-drop) | MEDIUM | HIGH | **P3** |
| Admin dashboard (TMA) | LOW | HIGH | **P3** |
| QR scanner (team events) | LOW | LOW | **P3** |
| Share to Stories | LOW | LOW | **P3** |
| Custom animations | LOW | MEDIUM | **P3** |

**Priority key:**
- **P1:** Must have for launch -- the core training loop
- **P2:** Should have, add when validated -- engagement and retention layer
- **P3:** Nice to have, future consideration -- polish and expansion

---

## Competitor Feature Analysis

| Feature | Crazy Llama English (TMA) | BullBeary (TMA) | TON Blockchain Course (TMA) | Duolingo (native app) | Deal Quest Approach |
|---------|--------------------------|-----------------|---------------------------|----------------------|---------------------|
| Daily quizzes | Yes, AI-powered | No | Yes, module-based | Yes, streak-based | Yes -- timed scenario cards with sales context |
| Points/badges | Points + levels | Rewards + airdrops | Completion badges | XP + crowns + gems | Badges for milestones, no points inflation |
| Leaderboard | Global + streak | Global | Per-quiz | Global + friends + leagues | Global + team filter (Telegram group-based) |
| Progress tracking | Streak counter | Basic | Module completion % | Skill tree + hearts | Learning track map (v1.x) + dashboard metrics (v1) |
| Haptic feedback | Unknown | Unknown | Unknown | Yes, extensive | Yes -- every interaction, three feedback types |
| Scenario simulation | No | No | No | No | **Core differentiator** -- branching sales scenarios with timer |
| Offline mode | No | No | No | Yes (paid) | No -- cache-enhanced online-first |
| Native TMA integration | Basic | Basic | Basic | N/A (native app) | **Deep** -- MainButton, SecondaryButton, BackButton, popups, haptics, CloudStorage, fullscreen |
| Share achievements | No | No | No | Yes (social) | Share to Stories (v2+) |
| Admin panel | Unknown | Unknown | Unknown | Yes (web) | Bot-first, TMA admin in v2+ |

---

## TMA API Capabilities Reference (for implementation)

For the downstream requirements team, here is the complete set of TMA-specific APIs relevant to Deal Quest, with version requirements:

| API | Min Bot API Version | Relevance to Deal Quest |
|-----|---------------------|------------------------|
| `ThemeParams` (18+ color tokens) | 6.0 | Theme-adaptive UI |
| `BackButton` | 6.0 | Navigation |
| `MainButton` / `BottomButton` | 6.0 (renamed 7.10) | Primary CTAs |
| `SecondaryButton` | 7.10 | Scenario branching |
| `HapticFeedback` (3 methods) | 6.1 | Tactile feedback |
| `setHeaderColor` / `setBackgroundColor` | 6.1 | Branding |
| `showPopup` / `showAlert` / `showConfirm` | 6.2 | Native feedback dialogs |
| `enableClosingConfirmation` | 6.2 | Prevent accidental close |
| `showScanQrPopup` | 6.4 | QR for team events |
| `readTextFromClipboard` | 6.4 | Copy/paste support |
| `switchInlineQuery` | 6.7 | Share bot inline |
| `CloudStorage` (1024 items, 4096 chars each) | 6.9 | Cross-device state cache |
| `requestWriteAccess` | 6.9 | Bot messaging permission |
| `requestContact` | 6.9 | Phone number (if needed) |
| `SettingsButton` | 7.0 | Settings access point |
| `BiometricManager` | 7.2 | Admin auth (v2+) |
| `disableVerticalSwipes` | 7.7 | Strategy builder gestures |
| `shareToStory` | 7.8 | Badge sharing |
| `setBottomBarColor` | 7.10 | Brand color bottom bar |
| `requestFullscreen` / `exitFullscreen` | 8.0 | Immersive training |
| `lockOrientation` | 8.0 | Consistent training UX |
| `addToHomeScreen` | 8.0 | Retention boost |
| `safeAreaInset` / `contentSafeAreaInset` | 8.0 | Proper layout |
| `activated` / `deactivated` events | 8.0 | Session interruption handling |
| `downloadFile` | 8.0 | Export certificates/reports |
| `DeviceStorage` (5MB per user) | 9.0 | Local cache |
| `SecureStorage` (10 items, encrypted) | 9.0 | Sensitive tokens |
| `hideKeyboard` | 9.1 | Clean UX after input |

---

## Sources

- [Telegram Mini Apps Official Documentation](https://core.telegram.org/bots/webapps) -- HIGH confidence, primary source for all API details
- [Telegram Mini Apps Community Docs (tma.js)](https://docs.telegram-mini-apps.com/platform/methods) -- HIGH confidence, verified against official docs
- [Mini App UX in Telegram: First On-Chain Action in 60 Seconds (FreeBlock)](https://freeblock.medium.com/longread-3-7-mini-app-ux-in-telegram-how-to-get-users-to-a-first-on-chain-action-in-60-seconds-355236d97df5) -- MEDIUM confidence, UX patterns from practitioner
- [Telegram Mini App Ecosystem Explained (Nadcab)](https://www.nadcab.com/blog/telegram-mini-apps-ecosystem-explained) -- MEDIUM confidence, architecture patterns and anti-patterns
- [Viral Telegram Games: Mechanics & Strategies (PixelPlex)](https://pixelplex.io/blog/viral-mechanics-on-telegram-apps/) -- MEDIUM confidence, gamification patterns
- [Gamified Telegram Mini Apps (Monetag)](https://monetag.com/blog/gamified-telegram-mini-apps/) -- MEDIUM confidence, gamification mechanics
- [Educational Mini Apps on Telegram (Monetag)](https://monetag.com/blog/learning-through-telegram-mini-apps/) -- MEDIUM confidence, education-specific patterns
- [1000+ Users Engaged: TMA for Education (TechHub Asia)](https://techhub.asia/portfolio/telegram-mini-apps/) -- MEDIUM confidence, case study with metrics
- [TMA Development Case Study (CodeRower)](https://coderower.com/case-studies/telegram-mini-apps-development) -- MEDIUM confidence, implementation patterns
- [Telegram Mini Apps UI Kit (Figma)](https://www.figma.com/community/file/1348989725141777736/telegram-mini-apps-ui-kit) -- HIGH confidence, official community design resource
- [Dashboard Design Principles 2025 (UXPin)](https://www.uxpin.com/studio/blog/dashboard-design-principles/) -- MEDIUM confidence, general dashboard UX
- [Gamification in UX Design 2025 (Arounda)](https://arounda.agency/blog/gamification-in-product-design-in-2024-ui-ux) -- MEDIUM confidence, gamification patterns
- [Gamification in eLearning Examples (Elucidat)](https://www.elucidat.com/blog/gamification-in-elearning-examples/) -- MEDIUM confidence, training-specific gamification
- [Best Telegram Mini Apps 2026 (PropellerAds)](https://propellerads.com/blog/adv-best-telegram-mini-apps/) -- MEDIUM confidence, ecosystem overview
- [Admin Panel for Telegram Bots (Graspil)](https://graspil.com/post/admin_panel_for_telegram_bor_and_mini_app/) -- LOW confidence, single source for admin patterns
- [TMA SecondaryButton Documentation](https://docs.telegram-mini-apps.com/packages/telegram-apps-sdk/2-x/components/secondary-button) -- HIGH confidence, SDK documentation

---
*Feature research for: Deal Quest TMA -- Gamified Sales Training Platform*
*Researched: 2026-02-01*
