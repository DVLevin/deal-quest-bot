# Requirements: Deal Quest TMA

**Defined:** 2026-02-01
**Core Value:** Sales reps can see their progress, practice scenarios, get deal support, and track leads through a visually engaging mobile interface

## v1 Requirements

### Foundation

- [ ] **FOUND-01**: TMA scaffold with React 18 + Vite 7 + TypeScript inside deal-quest-bot/ monorepo (packages/webapp/) with pnpm workspaces
- [ ] **FOUND-02**: Telegram WebApp auth flow — initData validation via InsForge edge function, JWT minting, authenticated API calls
- [ ] **FOUND-03**: BackButton wired to react-router v7 navigation (show/hide based on depth)
- [ ] **FOUND-04**: MainButton and SecondaryButton integration for primary CTAs and scenario branching
- [ ] **FOUND-05**: Custom branded design system — Deal Quest visual identity, mobile-optimized components, not TelegramUI
- [ ] **FOUND-06**: InsForge client integration — Supabase JS SDK configured for existing tables, RLS policies for TMA access
- [ ] **FOUND-07**: SPA routing shell with react-router v7 — pages for Dashboard, Learn, Train, Support, Casebook, Leads, Profile, Admin
- [ ] **FOUND-08**: Session resilience — save in-progress state to InsForge on backgrounding, restore on return via activated/deactivated events
- [ ] **FOUND-09**: Shared types package (packages/shared/) mirroring InsForge table schemas from bot/storage/models.py

### Dashboard

- [ ] **DASH-01**: Dashboard page showing XP progress bar, current level, rank title, and streak counter
- [ ] **DASH-02**: Recent badges preview — last 4 earned badges with icons and names
- [ ] **DASH-03**: Leaderboard widget — top 5 users with XP, your current position highlighted
- [ ] **DASH-04**: Quick-action navigation buttons to Learn, Train, Support, Casebook, Leads

### Learn Mode

- [ ] **LEARN-01**: Track visualization showing all levels with locked/unlocked/completed status and best scores
- [ ] **LEARN-02**: Lesson content display — title, content text, key points for each level
- [ ] **LEARN-03**: Scenario practice UI — persona card, situation text, text input for response
- [ ] **LEARN-04**: Score and feedback display — score out of 100, strengths, areas for improvement, ideal response
- [ ] **LEARN-05**: Auto-unlock next level on score >= 60%, visual indication of unlocked content

### Train Mode

- [ ] **TRAIN-01**: Random scenario card — persona details (name, role, company), difficulty badge, situation text
- [ ] **TRAIN-02**: Timed response input — countdown timer, text area, submit button
- [ ] **TRAIN-03**: Difficulty filter — Easy/Medium/Hard/Random selection before starting
- [ ] **TRAIN-04**: Score results display — score, XP earned, feedback, strengths, improvements with animations
- [ ] **TRAIN-05**: Quick actions after scoring — Next Scenario, Retry, View Stats
- [ ] **TRAIN-06**: SecondaryButton for scenario branching — two native Telegram buttons for A/B sales decisions

### Support Mode

- [ ] **SUPP-01**: Strategy builder input — text area for prospect context, screenshot upload option
- [ ] **SUPP-02**: Analysis display — prospect type, stage, signal strength, structured closing strategy
- [ ] **SUPP-03**: Engagement tactics display — LinkedIn actions, comment suggestions, DM draft
- [ ] **SUPP-04**: Draft response display with copy, regenerate, and save-to-casebook actions
- [ ] **SUPP-05**: Support session history — list of past support sessions with dates and prospect info

### Casebook

- [ ] **CASE-01**: Browsable casebook list with persona type, scenario type, and quality score
- [ ] **CASE-02**: Search by keyword across all casebook fields
- [ ] **CASE-03**: Filter by persona type, scenario type, and industry
- [ ] **CASE-04**: Casebook detail view — full analysis, strategy, tactics, and draft response
- [ ] **CASE-05**: Use as template — copy casebook entry to start a new support session

### Leads

- [ ] **LEAD-01**: Lead pipeline view — paginated list of leads with name, company, title, status badge
- [ ] **LEAD-02**: Lead detail view — full analysis, strategy, engagement plan, draft, photos, web research
- [ ] **LEAD-03**: Status management — update lead status (Analyzed -> Reached Out -> Meeting -> In Progress -> Closed)
- [ ] **LEAD-04**: Add context/notes to existing leads
- [ ] **LEAD-05**: Lead activity log — timeline of status changes and actions taken

### Gamification

- [ ] **GAME-01**: Badge wall — visual grid of all badges showing earned (with date) and locked (silhouette) states
- [ ] **GAME-02**: Badge rarity tiers — common, rare, epic, legendary with distinct visual styling
- [ ] **GAME-03**: Level-up celebration — confetti/animation when user levels up with new rank title
- [ ] **GAME-04**: XP gain animation — animated counter showing XP earned after completing scenarios
- [ ] **GAME-05**: Streak tracking visuals — flame icon, current streak days, bonus XP indicators

### Profile

- [ ] **PROF-01**: Profile page with avatar, username, rank title, level, total XP, member since date
- [ ] **PROF-02**: Full stats overview — total attempts, average score, best score, scenarios completed, tracks completed
- [ ] **PROF-03**: Attempt history — paginated list of recent attempts with scenario name, score, date
- [ ] **PROF-04**: Badge collection — full badge display with earned count / total count
- [ ] **PROF-05**: Settings — LLM provider/model selection, API key management (mirrors bot /settings)

### Admin Dashboard

- [ ] **ADMIN-01**: Team overview — total users, total XP, active users count, team name
- [ ] **ADMIN-02**: Team performance chart — weekly score trends, activity levels
- [ ] **ADMIN-03**: Member leaderboard — all team members ranked by XP with average scores
- [ ] **ADMIN-04**: Weak areas identification — categories/scenarios where team scores lowest
- [ ] **ADMIN-05**: Recent activity feed — last N team interactions with timestamps
- [ ] **ADMIN-06**: Admin access control — only users in ADMIN_USERNAMES can see admin pages

### Bot Integration

- [ ] **BOT-01**: Bot commands (/stats, /learn, /train, /support, /leads) offer "Open in App" inline buttons alongside text responses
- [ ] **BOT-02**: Deep links from bot to specific TMA pages (e.g., /stats opens TMA dashboard, /learn opens TMA learn page)
- [ ] **BOT-03**: TMA menu button configured in BotFather for direct app access

## v2 Requirements

### Enhanced Training

- **TRAIN-V2-01**: Voice input for scenario responses (reuse bot's AssemblyAI integration)
- **TRAIN-V2-02**: Learning track map visualization (Duolingo-style node path)
- **TRAIN-V2-03**: Full-screen mode during active training for focus

### Enhanced Gamification

- **GAME-V2-01**: Share badge achievements to Telegram Stories
- **GAME-V2-02**: Add to Home Screen prompt after first training session
- **GAME-V2-03**: Team challenges — time-limited group competitions

### Enhanced Support

- **SUPP-V2-01**: Strategy builder with drag-and-drop component arrangement
- **SUPP-V2-02**: Voice input for prospect context

### Platform

- **PLAT-V2-01**: Theme-adaptive UI matching Telegram light/dark mode
- **PLAT-V2-02**: Haptic feedback on all interactions
- **PLAT-V2-03**: CloudStorage caching for instant app re-open
- **PLAT-V2-04**: Offline-enhanced UX with DeviceStorage fallback

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native mobile app (iOS/Android) | TMA covers mobile within Telegram |
| Real-time multiplayer scenarios | WebSocket fragility in WebView, async leaderboard competition instead |
| Frontend business logic / AI scoring | Bot handles all AI/LLM; TMA is visual layer only |
| Heavy charting (D3/Chart.js) | Overkill for mobile WebView; use lightweight micro-visualizations |
| Persistent WebSocket connections | Poll on focus + bot push notifications instead |
| Custom authentication (email/password) | initData provides free zero-friction auth |
| Crypto/TON wallet | Not relevant to sales training |
| Video lessons | Resource-heavy in WebView; text + illustration instead |
| Multi-language i18n | English only for v1 |
| Desktop-optimized layout | Mobile-first TMA context |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Pending |
| FOUND-02 | Phase 1 | Pending |
| FOUND-03 | Phase 1 | Pending |
| FOUND-04 | Phase 1 | Pending |
| FOUND-05 | Phase 1 | Pending |
| FOUND-06 | Phase 1 | Pending |
| FOUND-07 | Phase 1 | Pending |
| FOUND-08 | Phase 1 | Pending |
| FOUND-09 | Phase 1 | Pending |
| DASH-01 | Phase 2 | Pending |
| DASH-02 | Phase 2 | Pending |
| DASH-03 | Phase 2 | Pending |
| DASH-04 | Phase 2 | Pending |
| LEARN-01 | Phase 3 | Pending |
| LEARN-02 | Phase 3 | Pending |
| LEARN-03 | Phase 3 | Pending |
| LEARN-04 | Phase 3 | Pending |
| LEARN-05 | Phase 3 | Pending |
| TRAIN-01 | Phase 3 | Pending |
| TRAIN-02 | Phase 3 | Pending |
| TRAIN-03 | Phase 3 | Pending |
| TRAIN-04 | Phase 3 | Pending |
| TRAIN-05 | Phase 3 | Pending |
| TRAIN-06 | Phase 3 | Pending |
| SUPP-01 | Phase 4 | Pending |
| SUPP-02 | Phase 4 | Pending |
| SUPP-03 | Phase 4 | Pending |
| SUPP-04 | Phase 4 | Pending |
| SUPP-05 | Phase 4 | Pending |
| CASE-01 | Phase 4 | Pending |
| CASE-02 | Phase 4 | Pending |
| CASE-03 | Phase 4 | Pending |
| CASE-04 | Phase 4 | Pending |
| CASE-05 | Phase 4 | Pending |
| LEAD-01 | Phase 5 | Pending |
| LEAD-02 | Phase 5 | Pending |
| LEAD-03 | Phase 5 | Pending |
| LEAD-04 | Phase 5 | Pending |
| LEAD-05 | Phase 5 | Pending |
| PROF-01 | Phase 2 | Pending |
| PROF-02 | Phase 2 | Pending |
| PROF-03 | Phase 2 | Pending |
| PROF-04 | Phase 2 | Pending |
| PROF-05 | Phase 5 | Pending |
| GAME-01 | Phase 6 | Pending |
| GAME-02 | Phase 6 | Pending |
| GAME-03 | Phase 6 | Pending |
| GAME-04 | Phase 6 | Pending |
| GAME-05 | Phase 6 | Pending |
| ADMIN-01 | Phase 6 | Pending |
| ADMIN-02 | Phase 6 | Pending |
| ADMIN-03 | Phase 6 | Pending |
| ADMIN-04 | Phase 6 | Pending |
| ADMIN-05 | Phase 6 | Pending |
| ADMIN-06 | Phase 6 | Pending |
| BOT-01 | Phase 7 | Pending |
| BOT-02 | Phase 7 | Pending |
| BOT-03 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 58 total
- Mapped to phases: 58
- Unmapped: 0

---
*Requirements defined: 2026-02-01*
*Last updated: 2026-02-01 after roadmap creation*
