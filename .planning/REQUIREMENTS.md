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
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Complete |
| FOUND-04 | Phase 1 | Complete |
| FOUND-05 | Phase 1 | Complete |
| FOUND-06 | Phase 1 | Complete |
| FOUND-07 | Phase 1 | Complete |
| FOUND-08 | Phase 1 | Complete |
| FOUND-09 | Phase 1 | Complete |
| DASH-01 | Phase 2 | Complete |
| DASH-02 | Phase 2 | Complete |
| DASH-03 | Phase 2 | Complete |
| DASH-04 | Phase 2 | Complete |
| LEARN-01 | Phase 3 | Complete |
| LEARN-02 | Phase 3 | Complete |
| LEARN-03 | Phase 3 | Complete |
| LEARN-04 | Phase 3 | Complete |
| LEARN-05 | Phase 3 | Complete |
| TRAIN-01 | Phase 3 | Complete |
| TRAIN-02 | Phase 3 | Complete |
| TRAIN-03 | Phase 3 | Complete |
| TRAIN-04 | Phase 3 | Complete |
| TRAIN-05 | Phase 3 | Complete |
| TRAIN-06 | Phase 3 | Complete |
| SUPP-01 | Phase 4 | Complete |
| SUPP-02 | Phase 4 | Complete |
| SUPP-03 | Phase 4 | Complete |
| SUPP-04 | Phase 4 | Complete |
| SUPP-05 | Phase 4 | Complete |
| CASE-01 | Phase 4 | Complete |
| CASE-02 | Phase 4 | Complete |
| CASE-03 | Phase 4 | Complete |
| CASE-04 | Phase 4 | Complete |
| CASE-05 | Phase 4 | Complete |
| LEAD-01 | Phase 5 | Complete |
| LEAD-02 | Phase 5 | Complete |
| LEAD-03 | Phase 5 | Complete |
| LEAD-04 | Phase 5 | Complete |
| LEAD-05 | Phase 5 | Complete |
| PROF-01 | Phase 2 | Complete |
| PROF-02 | Phase 2 | Complete |
| PROF-03 | Phase 2 | Complete |
| PROF-04 | Phase 2 | Complete |
| PROF-05 | Phase 5 | Complete |
| GAME-01 | Phase 6 | Complete |
| GAME-02 | Phase 6 | Complete |
| GAME-03 | Phase 6 | Complete |
| GAME-04 | Phase 6 | Complete |
| GAME-05 | Phase 6 | Complete |
| ADMIN-01 | Phase 6 | Complete |
| ADMIN-02 | Phase 6 | Complete |
| ADMIN-03 | Phase 6 | Complete |
| ADMIN-04 | Phase 6 | Complete |
| ADMIN-05 | Phase 6 | Complete |
| ADMIN-06 | Phase 6 | Complete |
| BOT-01 | Phase 7 | Complete |
| BOT-02 | Phase 7 | Complete |
| BOT-03 | Phase 7 | Complete |

**Coverage:**
- v1 requirements: 58 total
- Mapped to phases: 58
- Unmapped: 0

---

## v1.1 Requirements -- Quick & Medium Wins

### Lead Management

- [ ] **LEAD-V11-01**: Stale lead indicator — visual badge/color on leads not updated in 7+ days, with "days since last activity" on LeadCard
- [ ] **LEAD-V11-02**: Lead source tracking — `lead_source` field (support_analysis, manual, import) populated on creation, displayed in LeadCard and LeadDetail
- [ ] **LEAD-V11-03**: Company grouping — group leads by `prospect_company` in list view with collapsible company headers and contact count
- [ ] **LEAD-V11-04**: Complete LeadRegistryRow type — add missing fields (web_research, engagement_plan, next_followup, followup_count, lead_source, original_context) to TypeScript types matching Python model
- [ ] **LEAD-V11-05**: Lead search and filter — search by name/company, filter by status in TMA lead list view

### Training Experience

- [x] **TRAIN-V11-01**: Difficulty recommendation — show suggested difficulty on Train page based on user's average score per difficulty level (computed client-side from recent attempts)
- [x] **TRAIN-V11-02**: Track completion stats — display per-track progress summary (levels completed, average score, best score) on Learn page header
- [x] **TRAIN-V11-03**: Weak area identification — highlight tracks/difficulties where user scores below average, with "Practice this" CTA on Dashboard
- [x] **TRAIN-V11-04**: Scenario variety indicator — show "X scenarios remaining" count in Train mode, encourage variety when pool runs low

### Error Handling & UX

- [ ] **UX-V11-01**: Global error boundary — React error boundary wrapping the app with user-friendly fallback UI and retry button
- [ ] **UX-V11-02**: Query error consistency — standardize error state rendering across all TMA components (reusable ErrorCard component with icon, message, retry action)
- [ ] **UX-V11-03**: Mutation error feedback — show toast/snackbar notifications on failed mutations (status update, note save) with retry option
- [ ] **UX-V11-04**: Bot input validation — shared `_validate_user_input()` utility across support/learn/train handlers with consistent error messages and length/content checks
- [ ] **UX-V11-05**: Empty state improvements — designed empty states with illustrations/icons for leads (no leads yet), casebook (no entries), and training (no attempts)

### Performance & Reliability

- [ ] **PERF-V11-01**: Remove eruda from production — gate eruda import behind `import.meta.env.DEV` check to eliminate debug console from production bundle
- [ ] **PERF-V11-02**: Knowledge base caching — cache playbook + company KB as module-level variables at bot startup instead of re-reading from disk on every pipeline call
- [ ] **PERF-V11-03**: InsForge client retry — add retry with exponential backoff on InsForge HTTP client (currently no retry on PostgREST calls)
- [ ] **PERF-V11-04**: Background task error handling — wrap `asyncio.create_task()` calls in main.py with error callbacks that log failures, add task references to prevent GC
- [ ] **PERF-V11-05**: TMA query optimization — add explicit column selection to TMA queries that currently use `select('*')` (lead detail, attempt queries)

## v1.1 Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LEAD-V11-01 | Phase 8 | Complete |
| LEAD-V11-02 | Phase 8 | Complete |
| LEAD-V11-03 | Phase 8 | Complete |
| LEAD-V11-04 | Phase 8 | Complete |
| LEAD-V11-05 | Phase 8 | Complete |
| TRAIN-V11-01 | Phase 9 | Complete |
| TRAIN-V11-02 | Phase 9 | Complete |
| TRAIN-V11-03 | Phase 9 | Complete |
| TRAIN-V11-04 | Phase 9 | Complete |
| UX-V11-01 | Phase 10 | Complete |
| UX-V11-02 | Phase 10 | Complete |
| UX-V11-03 | Phase 10 | Complete |
| UX-V11-04 | Phase 10 | Complete |
| UX-V11-05 | Phase 10 | Complete |
| PERF-V11-01 | Phase 11 | Complete |
| PERF-V11-02 | Phase 11 | Complete |
| PERF-V11-03 | Phase 11 | Complete |
| PERF-V11-04 | Phase 11 | Complete |
| PERF-V11-05 | Phase 11 | Complete |

**v1.1 Coverage:**
- v1.1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---

## v2.0 Requirements -- Sales Co-Pilot

### Scheduling Infrastructure

- [ ] **SCHED-V20-01**: `scheduled_reminders` table — per-step reminder rows with `lead_id`, `step_id`, `due_at` timestamp, `status` (pending/sent/done/skipped/snoozed), `escalation_level`, and `last_reminded_at` guard
- [ ] **SCHED-V20-02**: Timing parser — extract `delay_days` integer from engagement plan steps, with regex fallback and 3-day default for unparseable values (e.g., "ASAP", "When ready")
- [ ] **SCHED-V20-03**: Plan-to-reminders wiring — when an engagement plan is generated or updated, automatically create/update `scheduled_reminders` rows with concrete `due_at` timestamps computed from `delay_days`
- [ ] **SCHED-V20-04**: Polling scheduler loop — extend existing `followup_scheduler.py` pattern to poll `scheduled_reminders` every 15 minutes, dispatch due reminders, and guard against duplicates via `last_reminded_at` timestamp check
- [ ] **SCHED-V20-05**: Enhanced engagement plan prompt — update strategist prompt to output `delay_days` integer alongside existing `timing` string for each engagement plan step

### Smart Lead Creation

- [ ] **SLEAD-V20-01**: ExtractionAgent — lightweight agent with focused OCR prompt (no knowledge base injection) that extracts structured prospect data (name, title, company, context) from screenshots
- [ ] **SLEAD-V20-02**: Two-step extract-then-analyze pipeline — screenshot input routes through ExtractionAgent for OCR, then passes clean extracted text to existing StrategistAgent for full analysis with knowledge base
- [ ] **SLEAD-V20-03**: ClaudeProvider image fix — fix `ClaudeProvider.complete()` to handle `image_b64` parameter using multipart content array (currently ignores images entirely)
- [ ] **SLEAD-V20-04**: Image pre-resize — resize uploaded images to 1568px max dimension via Pillow before sending to vision models to reduce token cost
- [ ] **SLEAD-V20-05**: Input type routing — detect and route text, screenshot, and URL inputs to appropriate pipelines; URLs show "paste the profile text" guidance instead of automated scraping

### Engagement Plan Execution (Bot UX)

- [ ] **EPLAN-V20-01**: Rich reminder messages — bot sends formatted reminder for each due step with lead name, step description, and contextual draft preview
- [ ] **EPLAN-V20-02**: Inline button interactions — Done/Snooze/Skip buttons on each reminder message; Done marks step complete and logs activity, Snooze delays 24h, Skip marks skipped with reason prompt
- [ ] **EPLAN-V20-03**: Escalation logic — reminders escalate through levels (initial, gentle nudge, final reminder) before auto-snoozing overdue steps after 3 cycles
- [ ] **EPLAN-V20-04**: Step-aware draft display — "View Full Draft" button on reminder expands the contextual draft message for that specific engagement step
- [ ] **EPLAN-V20-05**: Activity logging for step actions — every Done/Snooze/Skip action writes to `lead_activity_log` with `step_execution`, `step_snooze`, or `step_skip` activity type and step metadata

### Conversational Re-analysis

- [ ] **REANA-V20-01**: Context update flow — user can forward a prospect's response, send a voice note, or type meeting notes to a lead in the bot; input is attached as a new activity on that lead
- [ ] **REANA-V20-02**: ReanalysisStrategistAgent — new agent that receives prior analysis JSON + activity thread + new context and produces an updated strategy with narrative changes summary
- [ ] **REANA-V20-03**: `lead_analysis_history` table — stores every analysis version with full analysis snapshot and code-computed field-level JSON diff (not LLM self-reports)
- [ ] **REANA-V20-04**: Enhanced activity types — extend `lead_activity_log` with `prospect_response`, `meeting_notes`, and `re_analysis` activity types plus `metadata` JSONB column
- [ ] **REANA-V20-05**: Re-analyze trigger — after adding new context to a lead, bot offers "Re-analyze Strategy?" button; re-analysis is user-triggered, never automatic

### TMA Lead Experience & Dashboard

- [ ] **TMAUX-V20-01**: Plan-first LeadDetail layout — restructure lead detail page with three sections: Active Plan (default top, interactive step list), Intelligence (analysis/strategy/tactics), Activity (thread timeline)
- [ ] **TMAUX-V20-02**: Interactive step completion from TMA — user can mark engagement plan steps as Done/Skip directly from the TMA lead detail page with immediate UI feedback and dual-update (both `scheduled_reminders` and `engagement_plan` JSONB)
- [ ] **TMAUX-V20-03**: LeadCard enhancements — show overdue step count badge, engagement plan progress bar, and next action preview on each lead card in the list view
- [ ] **TMAUX-V20-04**: "Today's Actions" dashboard widget — aggregates overdue and due-today engagement steps across all leads into a single actionable list on the Dashboard page
- [ ] **TMAUX-V20-05**: Bot-TMA deep link coordination — reminder messages include "Open in App" button that deep-links to `/leads/{id}` with step highlighting via query params; TMA auto-scrolls to the relevant step

## v2.0 Out of Scope

| Feature | Reason |
|---------|--------|
| Automated LinkedIn URL scraping | Legal risk (hiQ v. LinkedIn, Proxycurl shutdown); use "paste the text" guidance instead |
| User timezone support for reminders | Adds complexity without proportional value; deliver windows deferred post-v2.0 |
| Per-channel draft tailoring (LinkedIn vs email vs phone) | Single draft per step for v2.0; channel-specific drafts are a polish item |
| InsForge Realtime (WebSocket) for live sync | Smart polling via refetchInterval is sufficient; Realtime adds operational complexity |
| Automatic re-analysis (no user trigger) | Industry standard (Salesforce, Gong, HubSpot) is user-triggered; auto-rewrite risks trust erosion |
| Strategy version side-by-side diff in TMA | Polish item; version history stored but visual diff deferred |
| User-configurable reminder preferences | Fixed cadence for v2.0; preferences add settings complexity |

## v2.0 Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCHED-V20-01 | Phase 12 | Complete |
| SCHED-V20-02 | Phase 12 | Complete |
| SCHED-V20-03 | Phase 12 | Complete |
| SCHED-V20-04 | Phase 12 | Complete |
| SCHED-V20-05 | Phase 12 | Complete |
| SLEAD-V20-01 | Phase 13 | Complete |
| SLEAD-V20-02 | Phase 13 | Complete |
| SLEAD-V20-03 | Phase 13 | Complete |
| SLEAD-V20-04 | Phase 13 | Complete |
| SLEAD-V20-05 | Phase 13 | Complete |
| EPLAN-V20-01 | Phase 14 | Complete |
| EPLAN-V20-02 | Phase 14 | Complete |
| EPLAN-V20-03 | Phase 14 | Complete |
| EPLAN-V20-04 | Phase 14 | Complete |
| EPLAN-V20-05 | Phase 14 | Complete |
| REANA-V20-01 | Phase 15 | Complete |
| REANA-V20-02 | Phase 15 | Complete |
| REANA-V20-03 | Phase 15 | Complete |
| REANA-V20-04 | Phase 15 | Complete |
| REANA-V20-05 | Phase 15 | Complete |
| TMAUX-V20-01 | Phase 16 | Complete |
| TMAUX-V20-02 | Phase 16 | Complete |
| TMAUX-V20-03 | Phase 16 | Complete |
| TMAUX-V20-04 | Phase 16 | Complete |
| TMAUX-V20-05 | Phase 16 | Complete |

**v2.0 Coverage:**
- v2.0 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0

---

## v3.0 Requirements -- Prospect Discovery & UX Evolution

### LinkedIn Prospect Search

- [ ] **LSRCH-V30-01**: LinkedIn search edge function proxy — InsForge edge function (`linkedin-search`) that proxies POST requests to the external LinkedIn search microservice (`http://13.61.184.191:8000/api/people/search`), handling CORS headers and mixed content bypass
- [ ] **LSRCH-V30-02**: Search UI in TMA — search page with keyword input, optional company filter, result count selector, and search button; debounced submission with loading state
- [ ] **LSRCH-V30-03**: Prospect result cards — display search results as cards showing name, headline, location, company, open_to_work badge, and profile image; scrollable list with result count
- [ ] **LSRCH-V30-04**: One-tap prospect-to-lead creation — tap a search result to create a lead with LinkedIn data pre-filled (name, title, company, location, image URL); triggers AI analysis + engagement plan generation via existing pipeline
- [ ] **LSRCH-V30-05**: Search resilience — 8-second timeout with AbortController, user-friendly error messages for timeout/service-down/rate-limit, prevent duplicate submissions while request is in-flight

### TMA Voice Input

- [ ] **VOICE-V30-01**: `useVoiceRecorder` hook — custom React hook (~60 LOC) using browser MediaRecorder API with codec detection (`audio/webm;codecs=opus` primary, `audio/mp4` fallback), 120-second max duration, and recording state management
- [ ] **VOICE-V30-02**: Voice recording UI component — microphone button with recording timer, animated waveform indicator, stop/cancel controls; hides mic button when MediaRecorder is unavailable (feature detection with graceful fallback message)
- [ ] **VOICE-V30-03**: Audio upload pipeline — upload recorded audio blob to InsForge Storage (`prospect-photos/audio/` prefix), insert `transcription_requests` row, poll for completion; follows existing `draft_requests`/`plan_requests` async pattern
- [ ] **VOICE-V30-04**: Bot transcription poller — new poller service (`start_transcription_request_poller`) that watches `transcription_requests` table, downloads audio from InsForge Storage, sends to existing AssemblyAI `TranscriptionService`, writes transcribed text back
- [ ] **VOICE-V30-05**: Voice input integration points — add voice recording button to lead notes input, support context input, and context update input; transcribed text populates the text field for user review/edit before saving

### Bot Role Modernization

- [ ] **BOTMOD-V30-01**: Bot command simplification — reduce bot commands to essential quick actions; complex workflows (lead analysis, engagement planning) redirect to TMA with "Open in App" deep link buttons
- [ ] **BOTMOD-V30-02**: Graceful command deprecation — removed commands still respond with a friendly redirect message ("This feature has moved to the app. Tap below to open it.") for at least 30 days before handler removal
- [ ] **BOTMOD-V30-03**: Enhanced notification hub — bot proactively sends contextual notifications for: new lead assignments, engagement step reminders with inline drafts, async work completion (draft/plan generation), team activity highlights
- [ ] **BOTMOD-V30-04**: Quick-confirm interactions — bot offers one-tap confirmation/action buttons for common actions (approve draft, mark step done, snooze reminder) without opening TMA

### Team Collaboration

- [ ] **TEAM-V30-01**: Lead transfer flow — admin/owner can transfer a lead to another team member via TMA modal with team member picker; updates `lead_assignments` table, logs `transfer` activity, notifies recipient via bot
- [ ] **TEAM-V30-02**: Team activity feed — new feed component showing lead activities across all team members (status changes, step completions, transfers, notes) with actor attribution; 15-second polling via React Query
- [ ] **TEAM-V30-03**: Assigned leads visibility — lead list shows both owned and assigned leads with clear "Your lead" vs "Assigned by [name]" indicator; query unions own leads + assigned leads
- [ ] **TEAM-V30-04**: Transfer notifications — bot sends Telegram message to assignee when a lead is transferred ("You've been assigned lead: [Name]") with "Open in App" deep link button to the lead detail page

### UX Overhaul

- [ ] **UX-V30-01**: Progressive disclosure — declutter information-heavy screens (LeadDetail, Dashboard, Admin) by collapsing secondary information behind expand/tap interactions; show primary actions first
- [ ] **UX-V30-02**: Interaction reduction — audit all multi-step flows and reduce tap count; examples: merge confirm dialogs where possible, auto-select obvious defaults, remove unnecessary confirmation steps
- [ ] **UX-V30-03**: Animation and transition polish — add micro-animations for state changes (step completion, status update, card expand/collapse), page transitions, and loading states across all screens
- [ ] **UX-V30-04**: Visual consistency pass — ensure consistent spacing, typography, color usage, icon style, and component patterns across all TMA pages; fix any visual inconsistencies accumulated during v2.0 rapid development
- [ ] **UX-V30-05**: Mobile viewport optimization — audit all screens on small viewports (iPhone SE, older Android), fix overflow issues, ensure all buttons are tappable (minimum 44px touch targets), and respect safe area insets

## v3.0 Out of Scope

| Feature | Reason |
|---------|--------|
| Official LinkedIn API (OAuth) | Requires API partner approval; using external microservice instead |
| In-browser speech recognition (Web Speech API) | Unreliable in Telegram WebView; server-side AssemblyAI via bot pipeline |
| Real-time WebSocket activity feed | Over-engineering for team size of 5-20; 15s polling via React Query sufficient |
| Voice-to-voice (TTS responses) | Scope creep, high complexity, unclear user value |
| Complex team permission system (roles/ACLs) | Premature; current admin/member split is sufficient |
| LinkedIn profile scraping in TMA | Legal risk; solved by external microservice |
| Bot complete replacement | Hybrid approach stays; bot handles notifications + quick actions |
| Multi-team / organization isolation | Requires RLS overhaul (known auth debt); defer to v3.1 if multiple teams needed |

## v3.0 Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LSRCH-V30-01 | — | Pending |
| LSRCH-V30-02 | — | Pending |
| LSRCH-V30-03 | — | Pending |
| LSRCH-V30-04 | — | Pending |
| LSRCH-V30-05 | — | Pending |
| VOICE-V30-01 | — | Pending |
| VOICE-V30-02 | — | Pending |
| VOICE-V30-03 | — | Pending |
| VOICE-V30-04 | — | Pending |
| VOICE-V30-05 | — | Pending |
| BOTMOD-V30-01 | — | Pending |
| BOTMOD-V30-02 | — | Pending |
| BOTMOD-V30-03 | — | Pending |
| BOTMOD-V30-04 | — | Pending |
| TEAM-V30-01 | — | Pending |
| TEAM-V30-02 | — | Pending |
| TEAM-V30-03 | — | Pending |
| TEAM-V30-04 | — | Pending |
| UX-V30-01 | — | Pending |
| UX-V30-02 | — | Pending |
| UX-V30-03 | — | Pending |
| UX-V30-04 | — | Pending |
| UX-V30-05 | — | Pending |

**v3.0 Coverage:**
- v3.0 requirements: 23 total
- Mapped to phases: 0 (pending roadmap creation)
- Unmapped: 23

---
*Requirements defined: 2026-02-01*
*Last updated: 2026-02-12 after v3.0 milestone requirements created*
