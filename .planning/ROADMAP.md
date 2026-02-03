# Roadmap: Deal Quest TMA

## Overview

The Deal Quest TMA delivers a visual, gamified mobile experience for sales training inside Telegram. The build progresses from foundational auth and scaffold (everything depends on working initData verification and InsForge connectivity), through the dashboard as proof-of-stack, into the core training loop (Learn + Train), then broadens to deal support features (Support + Casebook), independent feature pages (Leads + Profile), engagement and administration layers (Gamification + Admin), and finally wires the TMA back into the existing bot with inline buttons and deep links.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Auth** - Monorepo scaffold, Telegram SDK, initData auth, InsForge client, routing shell, design system
- [ ] **Phase 2: Dashboard & Profile** - First visual pages proving the full stack end-to-end
- [ ] **Phase 3: Learn & Train** - Core training loop with scenario practice, scoring, and timed challenges
- [ ] **Phase 4: Support & Casebook** - Deal support strategy builder and reusable response library
- [ ] **Phase 5: Leads & Profile Settings** - Lead pipeline management and user settings
- [ ] **Phase 6: Gamification & Admin** - Badge wall, animations, streak visuals, and team admin dashboard
- [ ] **Phase 7: Bot Integration** - Wire TMA into existing bot with inline buttons and deep links

## Phase Details

### Phase 1: Foundation & Auth
**Goal**: A working TMA scaffold where a Telegram user opens the app, gets silently authenticated via initData, sees a routable shell with branded navigation, and all API calls hit InsForge with a valid JWT
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, FOUND-08, FOUND-09
**Success Criteria** (what must be TRUE):
  1. Opening the TMA inside Telegram authenticates the user automatically -- no login screen, no friction, JWT minted from initData
  2. The app displays a branded navigation shell with working page routes (Dashboard, Learn, Train, Support, Casebook, Leads, Profile, Admin) and Telegram BackButton navigates back correctly
  3. MainButton and SecondaryButton render as native Telegram bottom buttons and respond to taps
  4. API calls to InsForge return real data for the authenticated user (RLS policies enforced -- users only see their own data)
  5. Backgrounding and reopening the TMA restores the user's session without re-authentication or lost state
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md -- Monorepo scaffold + Telegram SDK + shared types package (Wave 1)
- [ ] 01-02-PLAN.md -- Auth flow: Edge Function, InsForge client, JWT, RLS policies (Wave 2)
- [ ] 01-03-PLAN.md -- Design system: Tailwind v4 tokens, base UI components, NavBar, AppLayout (Wave 2)
- [ ] 01-04-PLAN.md -- Routing shell, Telegram button hooks, session resilience, integration (Wave 3)

### Phase 2: Dashboard & Profile
**Goal**: Users see their training progress at a glance on a dashboard and can view their full profile -- proving the complete data pipeline from InsForge through API hooks to rendered UI
**Depends on**: Phase 1
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, PROF-01, PROF-02, PROF-03, PROF-04
**Success Criteria** (what must be TRUE):
  1. Dashboard displays the user's current XP, level, rank title, and streak count with a visual progress bar
  2. Dashboard shows the last 4 earned badges, a top-5 leaderboard with the user's position highlighted, and quick-action buttons that navigate to Learn, Train, Support, Casebook, and Leads
  3. Profile page shows avatar, username, rank, level, total XP, member-since date, full stats (total attempts, average score, best score), and paginated attempt history
  4. Profile page displays the user's badge collection with earned count vs total count
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md -- Shared data infrastructure + Dashboard page with progress, leaderboard, and navigation (Wave 1)
- [ ] 02-02-PLAN.md -- Profile page with stats, paginated history, and badge collection (Wave 2)

### Phase 3: Learn & Train
**Goal**: Users can practice structured learning tracks and random timed scenarios, receive AI-scored feedback, and see their scores -- the core training experience that defines Deal Quest's value
**Depends on**: Phase 2
**Requirements**: LEARN-01, LEARN-02, LEARN-03, LEARN-04, LEARN-05, TRAIN-01, TRAIN-02, TRAIN-03, TRAIN-04, TRAIN-05, TRAIN-06
**Success Criteria** (what must be TRUE):
  1. User can browse learning tracks, see locked/unlocked/completed levels with best scores, open a level to read lesson content, and practice the scenario with text input
  2. User receives a score out of 100 with strengths, areas for improvement, and ideal response -- and the next level auto-unlocks when score >= 60%
  3. User can start a random training scenario with difficulty filter (Easy/Medium/Hard/Random), see persona details and situation text, and submit a timed response
  4. After submitting a training response, user sees animated scoring results with XP earned, feedback, and quick actions (Next Scenario, Retry, View Stats)
  5. SecondaryButton presents A/B sales decision branching during scenarios as native Telegram buttons
**Plans**: TBD

Plans:
- [ ] 03-01: Learn mode -- track visualization, lessons, and practice
- [ ] 03-02: Train mode -- scenario cards, timer, and difficulty filter
- [ ] 03-03: Scoring and feedback display for both Learn and Train

### Phase 4: Support & Casebook
**Goal**: Users can get AI-powered deal support with strategy analysis and browse/reuse their saved response library
**Depends on**: Phase 1
**Requirements**: SUPP-01, SUPP-02, SUPP-03, SUPP-04, SUPP-05, CASE-01, CASE-02, CASE-03, CASE-04, CASE-05
**Success Criteria** (what must be TRUE):
  1. User can submit prospect context (text and optional screenshot) and receive a structured analysis with prospect type, stage, signal strength, and closing strategy
  2. User can view engagement tactics (LinkedIn actions, comment suggestions, DM draft) and a draft response with copy, regenerate, and save-to-casebook actions
  3. User can browse past support sessions with dates and prospect info
  4. User can browse, search, and filter the casebook by keyword, persona type, scenario type, and industry -- and open any entry to see full details
  5. User can use a casebook entry as a template to start a new support session
**Plans**: TBD

Plans:
- [ ] 04-01: Support mode -- strategy builder input and analysis display
- [ ] 04-02: Casebook -- browsing, search, filtering, and template flow

### Phase 5: Leads
**Goal**: Users can manage their sales lead pipeline with status tracking, notes, and activity history
**Depends on**: Phase 1
**Requirements**: LEAD-01, LEAD-02, LEAD-03, LEAD-04, LEAD-05, PROF-05
**Success Criteria** (what must be TRUE):
  1. User can browse a paginated list of leads showing name, company, title, and status badge
  2. User can open a lead to see full analysis, strategy, engagement plan, draft, photos, and web research
  3. User can update lead status through the pipeline stages (Analyzed, Reached Out, Meeting, In Progress, Closed) and add context/notes
  4. User can view a lead's activity log showing a timeline of status changes and actions
  5. User can manage settings for LLM provider/model selection and API key configuration from the Profile page
**Plans**: TBD

Plans:
- [ ] 05-01: Lead pipeline -- list view, detail view, and status management
- [ ] 05-02: Lead activity and notes, plus Profile settings

### Phase 6: Gamification & Admin
**Goal**: The app rewards engagement with visual celebrations and badge mechanics, and admins can monitor team performance
**Depends on**: Phase 3
**Requirements**: GAME-01, GAME-02, GAME-03, GAME-04, GAME-05, ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06
**Success Criteria** (what must be TRUE):
  1. Badge wall displays all badges in a visual grid with earned (dated) and locked (silhouette) states, styled by rarity tier (common, rare, epic, legendary)
  2. Leveling up triggers a celebration animation with confetti and the new rank title displayed
  3. Completing a scenario shows an animated XP counter, and the streak tracker displays flame icon with current streak days and bonus XP indicators
  4. Admin users see a team dashboard with total users, XP, active count, performance charts, member leaderboard, weak area identification, and recent activity feed
  5. Non-admin users cannot access admin pages (access control enforced)
**Plans**: TBD

Plans:
- [ ] 06-01: Badge wall and rarity system
- [ ] 06-02: Level-up, XP, and streak animations
- [ ] 06-03: Admin dashboard with team analytics and access control

### Phase 7: Bot Integration
**Goal**: The existing bot offers smooth transitions into the TMA, letting users jump from chat commands directly into rich app experiences
**Depends on**: Phase 6
**Requirements**: BOT-01, BOT-02, BOT-03
**Success Criteria** (what must be TRUE):
  1. Bot commands (/stats, /learn, /train, /support, /leads) display an "Open in App" inline button alongside the existing text response
  2. Tapping an "Open in App" button deep-links to the correct TMA page (e.g., /stats opens Dashboard, /learn opens Learn page)
  3. The TMA is accessible via the menu button in BotFather (direct app access without any command)
**Plans**: TBD

Plans:
- [ ] 07-01: Inline buttons and deep links in bot commands
- [ ] 07-02: BotFather menu button and deep link routing

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7
Note: Phases 4 and 5 depend only on Phase 1 and can execute in parallel with Phase 3 if desired.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Auth | 1/4 | In progress | - |
| 2. Dashboard & Profile | 0/2 | Not started | - |
| 3. Learn & Train | 0/3 | Not started | - |
| 4. Support & Casebook | 0/2 | Not started | - |
| 5. Leads | 0/2 | Not started | - |
| 6. Gamification & Admin | 0/3 | Not started | - |
| 7. Bot Integration | 0/2 | Not started | - |
