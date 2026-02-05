# Roadmap: Deal Quest TMA

## Overview

The Deal Quest TMA delivers a visual, gamified mobile experience for sales training inside Telegram. The build progresses from foundational auth and scaffold (everything depends on working initData verification and InsForge connectivity), through the dashboard as proof-of-stack, into the core training loop (Learn + Train), then broadens to deal support features (Support + Casebook), independent feature pages (Leads + Profile), engagement and administration layers (Gamification + Admin), and finally wires the TMA back into the existing bot with inline buttons and deep links.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Auth** - Monorepo scaffold, Telegram SDK, initData auth, InsForge client, routing shell, design system
- [x] **Phase 2: Dashboard & Profile** - First visual pages proving the full stack end-to-end
- [x] **Phase 3: Learn & Train** - Core training loop with scenario practice, scoring, and timed challenges
- [x] **Phase 4: Support & Casebook** - Deal support strategy builder and reusable response library
- [x] **Phase 5: Leads & Profile Settings** - Lead pipeline management and user settings
- [x] **Phase 6: Gamification & Admin** - Badge wall, animations, streak visuals, and team admin dashboard
- [x] **Phase 7: Bot Integration** - Wire TMA into existing bot with inline buttons and deep links

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
- [x] 01-02-PLAN.md -- Auth flow: Edge Function, InsForge client, JWT, RLS policies (Wave 2)
- [x] 01-03-PLAN.md -- Design system: Tailwind v4 tokens, base UI components, NavBar, AppLayout (Wave 2)
- [x] 01-04-PLAN.md -- Routing shell, Telegram button hooks, session resilience, integration (Wave 3)

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
- [x] 02-01-PLAN.md -- Shared data infrastructure + Dashboard page with progress, leaderboard, and navigation (Wave 1)
- [x] 02-02-PLAN.md -- Profile page with stats, paginated history, and badge collection (Wave 2)

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
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md -- Learn mode: track visualization, lessons, and scenario practice with bot deep link (Wave 1)
- [x] 03-02-PLAN.md -- Train mode: difficulty filter, scenario cards, countdown timer, and A/B branching (Wave 1)
- [x] 03-03-PLAN.md -- Scoring and feedback display: animated scores, feedback breakdown, quick actions (Wave 2)

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
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md -- Support mode: strategy builder input CTA, analysis display, session history (Wave 1)
- [x] 04-02-PLAN.md -- Casebook: browsable list with search, filter, detail view, and template flow (Wave 2)

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
**Plans**: 2 plans

Plans:
- [x] 05-01-PLAN.md -- Lead pipeline: enum fixes, types/parsers, hooks (first mutation), list view, detail view, status management (Wave 1)
- [x] 05-02-PLAN.md -- Lead activity timeline, notes, and Profile settings panel (Wave 2)

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
**Plans**: 3 plans

Plans:
- [x] 06-01-PLAN.md -- Badge wall and rarity system (Wave 1)
- [x] 06-02-PLAN.md -- Level-up, XP, and streak animations (Wave 1)
- [x] 06-03-PLAN.md -- Admin dashboard with team analytics and access control (Wave 1)

### Phase 7: Bot Integration
**Goal**: The existing bot offers smooth transitions into the TMA, letting users jump from chat commands directly into rich app experiences
**Depends on**: Phase 6
**Requirements**: BOT-01, BOT-02, BOT-03
**Success Criteria** (what must be TRUE):
  1. Bot commands (/stats, /learn, /train, /support, /leads) display an "Open in App" inline button alongside the existing text response
  2. Tapping an "Open in App" button deep-links to the correct TMA page (e.g., /stats opens Dashboard, /learn opens Learn page)
  3. The TMA is accessible via the menu button in BotFather (direct app access without any command)
**Plans**: 2 plans

Plans:
- [x] 07-01-PLAN.md -- Bot config, helper, main.py, and "Open in App" buttons in all 5 handlers (Wave 1)
- [x] 07-02-PLAN.md -- TMA deep link routing hook for startParam fallback (Wave 1)

---

## Milestone: v1.1 -- Quick & Medium Wins

### v1.1 Phases

- [x] **Phase 8: Lead Management Enhancements** - Stale indicators, source tracking, company grouping, search/filter, type completeness
- [x] **Phase 9: Training Experience** - Difficulty recommendations, track stats, weak area identification, scenario variety
- [x] **Phase 10: Error Handling & UX** - Global error boundary, consistent error states, mutation feedback, input validation, empty states
- [x] **Phase 11: Performance & Reliability** - Remove eruda from prod, KB caching, InsForge retry, background task safety, query optimization

### Phase 8: Lead Management Enhancements
**Goal**: Lead pipeline becomes more actionable -- stale leads are surfaced, leads are searchable/filterable, contacts at the same company are grouped, and all data fields are properly exposed
**Depends on**: Phase 7 (v1.0 complete)
**Requirements**: LEAD-V11-01, LEAD-V11-02, LEAD-V11-03, LEAD-V11-04, LEAD-V11-05
**Success Criteria** (what must be TRUE):
  1. Leads not updated in 7+ days show a stale indicator badge with "X days ago" in both list and detail views
  2. Each lead displays its source (support analysis, manual, import) and source is auto-set on creation
  3. Lead list can be grouped by company with collapsible headers showing contact count
  4. LeadRegistryRow TypeScript type includes all fields from the Python LeadRegistryModel (web_research, engagement_plan, next_followup, followup_count, lead_source, original_context)
  5. Users can search leads by name/company and filter by status from the lead list page
**Plans**: 2 plans

Plans:
- [x] 08-01-PLAN.md -- lead_source full-stack field, stale indicators, source badges in LeadCard and LeadDetail (Wave 1)
- [x] 08-02-PLAN.md -- Search/filter bar, status filter chips, company grouping with collapsible headers (Wave 2)

### Phase 9: Training Experience
**Goal**: Users get smarter training recommendations -- the app suggests appropriate difficulty, shows per-track progress, identifies weak areas, and encourages scenario variety
**Depends on**: Phase 7 (v1.0 complete)
**Requirements**: TRAIN-V11-01, TRAIN-V11-02, TRAIN-V11-03, TRAIN-V11-04
**Success Criteria** (what must be TRUE):
  1. Train page shows a recommended difficulty level based on user's average scores per difficulty
  2. Learn page displays per-track summary (levels completed, avg score, best score) at the top of each track
  3. Dashboard highlights weak areas (tracks/difficulties with below-average scores) with a "Practice this" button
  4. Train mode shows remaining unseen scenarios count and displays a nudge when the pool is running low
**Plans**: 2 plans

Plans:
- [x] 09-01-PLAN.md -- useTrainingStats hook, difficulty recommendation, scenario variety indicator on Train page (Wave 1)
- [x] 09-02-PLAN.md -- Track completion stats on Learn page, weak areas card on Dashboard (Wave 2)

### Phase 10: Error Handling & UX
**Goal**: The app handles errors gracefully everywhere -- users see friendly error messages with retry options, mutations show feedback, and empty states guide users to take action
**Depends on**: Phase 7 (v1.0 complete)
**Requirements**: UX-V11-01, UX-V11-02, UX-V11-03, UX-V11-04, UX-V11-05
**Success Criteria** (what must be TRUE):
  1. Unhandled React errors show a user-friendly fallback page with a retry button instead of a white screen
  2. All TMA data-fetching components use a standardized ErrorCard component for error states
  3. Failed mutations (status update, note save) show a toast notification with error message and retry
  4. Bot handlers (support, learn, train) use a shared validation utility with consistent error messages
  5. Pages with no data (no leads, no casebook entries, no attempts) show designed empty states with guidance
**Plans**: 4 plans

Plans:
- [x] 10-01-PLAN.md -- Core UI components: ErrorBoundary, ErrorCard, Toast system, EmptyState + wire into App.tsx (Wave 1)
- [x] 10-02-PLAN.md -- ErrorCard integration: replace 18 inline error states with standardized ErrorCard (Wave 2)
- [x] 10-03-PLAN.md -- Toast mutation feedback + empty state upgrades for leads, attempts, support (Wave 2)
- [x] 10-04-PLAN.md -- Bot validation utility: shared validate_user_input() in support/learn/train handlers (Wave 1)

### Phase 11: Performance & Reliability
**Goal**: Production-grade reliability -- debug tools removed from production, knowledge cached at startup, network calls retry on failure, and background tasks don't silently disappear
**Depends on**: Phase 7 (v1.0 complete)
**Requirements**: PERF-V11-01, PERF-V11-02, PERF-V11-03, PERF-V11-04, PERF-V11-05
**Success Criteria** (what must be TRUE):
  1. Eruda debug console only loads in development mode (not in production builds)
  2. Playbook and company KB are loaded once at bot startup and reused across all pipeline calls
  3. InsForge PostgREST calls retry up to 3 times with exponential backoff on transient failures (429, 500, 502, 503)
  4. Background tasks (followup scheduler, scenario generator, memory agent) have error callbacks and task references preventing garbage collection
  5. TMA queries for lead detail and attempts use explicit column selection instead of `select('*')`
**Plans**: 2 plans

Plans:
- [x] 11-01-PLAN.md -- TMA hardening: eruda DEV gate + lead query column optimization (Wave 1)
- [x] 11-02-PLAN.md -- Bot reliability: InsForge retry with backoff + background task safety + KB caching verification (Wave 1)

---

## Milestone: v2.0 -- Sales Co-Pilot

v2.0 transforms Deal Quest from a training tool into an active sales co-pilot. The bot gains the ability to create leads from screenshots with AI extraction, execute timed engagement plans with step-by-step reminders, and re-analyze strategies as deals evolve with new context. The TMA shifts from a passive lead viewer to an action-oriented cockpit with plan-first layout and a "Today's Actions" dashboard. The build progresses bottom-up: scheduling infrastructure and smart lead creation first (independent foundations), then bot-side reminder UX and re-analysis on top, and finally the TMA experience that surfaces the full workflow loop.

### v2.0 Phases

- [x] **Phase 12: Scheduling & Reminder Infrastructure** - scheduled_reminders table, timing parser, polling scheduler, plan-to-reminders wiring, enhanced prompts
- [ ] **Phase 13: Smart Lead Creation** - ExtractionAgent, two-step pipeline, ClaudeProvider image fix, image pre-resize, input routing
- [ ] **Phase 14: Engagement Plan Execution** - Rich reminder messages, Done/Snooze/Skip interactions, escalation logic, draft display, activity logging
- [ ] **Phase 15: Conversational Re-analysis** - Context update flow, ReanalysisStrategistAgent, analysis history, enhanced activity types, re-analyze trigger
- [ ] **Phase 16: TMA Lead Experience & Dashboard** - Plan-first layout, interactive step completion, LeadCard enhancements, Today's Actions widget, deep link coordination

### Phase 12: Scheduling & Reminder Infrastructure
**Goal**: Engagement plans become executable -- every plan step has a concrete due date, a scheduler polls for due reminders, and new plans automatically generate reminder rows
**Depends on**: Phase 11 (v1.1 complete)
**Requirements**: SCHED-V20-01, SCHED-V20-02, SCHED-V20-03, SCHED-V20-04, SCHED-V20-05
**Success Criteria** (what must be TRUE):
  1. When a lead's engagement plan is generated, `scheduled_reminders` rows are automatically created with concrete `due_at` timestamps for each step
  2. The engagement plan prompt produces `delay_days` integer for each step, and the timing parser correctly computes due dates from plan creation time
  3. The polling scheduler runs every 15 minutes, finds due reminders, and sends a basic notification to the user (rich UX in Phase 14)
  4. Duplicate reminders are prevented -- restarting the bot does not re-send reminders that were already dispatched (guarded by `last_reminded_at`)
**Plans**: 2 plans

Plans:
- [x] 12-01-PLAN.md -- Data foundation: migration SQL, ScheduledReminderModel, ScheduledReminderRepo, updated engagement plan prompt (Wave 1)
- [x] 12-02-PLAN.md -- Plan scheduler service, plan-to-reminders wiring in support.py, lead lifecycle hooks, scheduler startup (Wave 2)

### Phase 13: Smart Lead Creation
**Goal**: Users can screenshot a LinkedIn profile, email, or business card and get a fully analyzed lead with strategy and engagement plan -- reducing lead creation from minutes of manual typing to a single photo
**Depends on**: Phase 11 (v1.1 complete)
**Requirements**: SLEAD-V20-01, SLEAD-V20-02, SLEAD-V20-03, SLEAD-V20-04, SLEAD-V20-05
**Success Criteria** (what must be TRUE):
  1. Sending a screenshot to the bot extracts prospect name, title, company, and context via a focused OCR step before running full analysis -- no more garbled names from combined OCR+strategy prompts
  2. ClaudeProvider correctly processes images (multipart content array) so Claude vision models work for screenshot analysis alongside OpenRouter
  3. Uploaded images are pre-resized to 1568px max dimension before vision model calls (verified by checking image dimensions in the pipeline)
  4. Sending a URL shows guidance to paste the profile text instead of attempting automated scraping
  5. Sending plain text still routes through the existing strategist pipeline with no regression
**Plans**: 3 plans

Plans:
- [ ] 13-01-PLAN.md -- ClaudeProvider image fix + image pre-resize utility (Wave 1)
- [ ] 13-02-PLAN.md -- ExtractionAgent with focused OCR prompt (Wave 1)
- [ ] 13-03-PLAN.md -- Two-step pipeline config + input routing in support.py (Wave 2)

### Phase 14: Engagement Plan Execution
**Goal**: The bot actively coaches users through their engagement plans -- sending timed reminders with contextual drafts, accepting Done/Snooze/Skip responses, and escalating overdue steps
**Depends on**: Phase 12 (scheduling infrastructure must exist)
**Requirements**: EPLAN-V20-01, EPLAN-V20-02, EPLAN-V20-03, EPLAN-V20-04, EPLAN-V20-05
**Success Criteria** (what must be TRUE):
  1. When a reminder is due, the bot sends a formatted message with lead name, step description, and a short draft preview
  2. User can tap Done (marks step complete, logs activity), Snooze (delays 24h), or Skip (marks skipped) via inline buttons on the reminder message
  3. Overdue reminders escalate through 3 levels (initial, nudge, final) before auto-snoozing -- user is not bombarded indefinitely
  4. User can tap "View Full Draft" on a reminder to see the full contextual draft message for that engagement step
  5. Every step action (done, snooze, skip) is recorded in `lead_activity_log` with the step metadata
**Plans**: TBD

### Phase 15: Conversational Re-analysis
**Goal**: Users can feed prospect responses and meeting notes back into a lead, and the AI re-analyzes the strategy with full context of how the deal has evolved -- turning Deal Quest into a living co-pilot, not a one-shot analyzer
**Depends on**: Phase 13 (lead creation quality matters for re-analysis)
**Requirements**: REANA-V20-01, REANA-V20-02, REANA-V20-03, REANA-V20-04, REANA-V20-05
**Success Criteria** (what must be TRUE):
  1. User can forward a prospect's message, send a voice note, or type meeting notes as new context on an existing lead
  2. After adding context, the bot offers a "Re-analyze Strategy?" button -- re-analysis only happens when the user triggers it
  3. Re-analysis produces an updated strategy with a narrative summary of what changed, and the prior analysis version is preserved in `lead_analysis_history`
  4. The activity timeline shows `prospect_response`, `meeting_notes`, and `re_analysis` entries with metadata, creating a readable deal thread
  5. Field-level diffs between analysis versions are computed in code (JSON diff), not by LLM self-reports
**Plans**: TBD

### Phase 16: TMA Lead Experience & Dashboard
**Goal**: The TMA transforms from a passive lead viewer into an action-oriented sales cockpit -- leads open to their engagement plan first, steps are completable from the app, and the dashboard tells users what to do today
**Depends on**: Phase 12 + Phase 14 + Phase 15 (reminder data, step execution, and re-analysis entries must exist for TMA to display)
**Requirements**: TMAUX-V20-01, TMAUX-V20-02, TMAUX-V20-03, TMAUX-V20-04, TMAUX-V20-05
**Success Criteria** (what must be TRUE):
  1. Opening a lead shows the Active Plan section first (engagement steps with status, due dates, overdue indicators) with Intelligence and Activity available as secondary sections
  2. User can mark engagement steps as Done or Skip directly from the TMA with immediate UI feedback, and both `scheduled_reminders` and `engagement_plan` JSONB stay in sync
  3. Lead list cards show overdue step count, engagement plan progress bar, and next action preview -- users can scan their pipeline and see what needs attention
  4. Dashboard displays a "Today's Actions" widget aggregating overdue and due-today steps across all leads, with tap-to-navigate to the relevant lead
  5. Bot reminder messages include an "Open in App" button that deep-links to the lead detail with the specific step highlighted

## Progress

### v1.0 Progress (Complete)

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7
Note: Phases 4 and 5 depend only on Phase 1 and can execute in parallel with Phase 3 if desired.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Auth | 4/4 | Complete | 2026-02-02 |
| 2. Dashboard & Profile | 2/2 | Complete | 2026-02-03 |
| 3. Learn & Train | 3/3 | Complete | 2026-02-03 |
| 4. Support & Casebook | 2/2 | Complete | 2026-02-03 |
| 5. Leads | 2/2 | Complete | 2026-02-04 |
| 6. Gamification & Admin | 3/3 | Complete | 2026-02-04 |
| 7. Bot Integration | 2/2 | Complete | 2026-02-04 |

### v1.1 Progress (Complete)

**Execution Order:**
Phases 8, 9, 10, 11 all depend only on v1.0 completion and can execute in any order or in parallel.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 8. Lead Management | 2/2 | Complete | 2026-02-04 |
| 9. Training Experience | 2/2 | Complete | 2026-02-04 |
| 10. Error Handling & UX | 4/4 | Complete | 2026-02-04 |
| 11. Performance & Reliability | 2/2 | Complete | 2026-02-05 |

### v2.0 Progress

**Execution Order:**
Phases 12 and 13 are independent (both depend only on v1.1 completion) and can execute in either order.
Phase 14 depends on Phase 12. Phase 15 depends on Phase 13.
Phase 16 depends on Phases 12 + 14 + 15 (all bot-side work complete).

```
12 (Scheduling) ──> 14 (Reminder UX) ──┐
                                        ├──> 16 (TMA Experience)
13 (Smart Lead) ──> 15 (Re-analysis) ──┘
```

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 12. Scheduling Infrastructure | 2/2 | Complete | 2026-02-05 |
| 13. Smart Lead Creation | 0/3 | Ready | - |
| 14. Engagement Plan Execution | 0/TBD | Not started | - |
| 15. Conversational Re-analysis | 0/TBD | Not started | - |
| 16. TMA Lead Experience & Dashboard | 0/TBD | Not started | - |
