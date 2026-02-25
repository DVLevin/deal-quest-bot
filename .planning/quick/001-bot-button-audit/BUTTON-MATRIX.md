# Deal Quest Bot -- Button & Trigger Test Matrix

Generated: 2026-02-03
Source: Code analysis of bot/handlers/*.py + bot/states.py + docs/ux/*.md

## How to Use This Matrix

1. Work through each handler module top to bottom
2. Follow the "Prerequisite State" to get into the right context
3. Activate the trigger (tap button, send text/voice/photo)
4. Compare actual behavior to "Expected Behavior"
5. Mark Test Status: `[x]` pass, `[!]` fail, `[~]` flaky, `[-]` skip (with reason)

---

## start.py (10 triggers)

| # | Trigger | Type | Label/Text | Expected Behavior | Prerequisite State | Test Status | Notes |
|---|---------|------|-----------|-------------------|-------------------|-------------|-------|
| S1 | `/start` | command | /start (new user) | Shows welcome message with bot description + two setup buttons: "Quick Setup (Recommended)" and "Use My Own API Key". Sets FSM to OnboardingState.choosing_provider. | No account or no encrypted_api_key | `[ ]` | |
| S2 | `/start` | command | /start (returning user) | Shows "Welcome back!" with full command list (/support, /leads, /learn, /train, /stats, /settings). Clears FSM state. No buttons. | Existing user with encrypted_api_key set | `[ ]` | |
| S3 | `setup:auto` | callback | Quick Setup (Recommended) | Creates/updates user with shared OpenRouter key. Initializes memory + track progress. Shows success message + 3 onboarding buttons. Clears FSM. If shared key not configured, shows error with fallback to custom setup. | OnboardingState.choosing_provider | `[ ]` | |
| S4 | `setup:custom` | callback | Use My Own API Key | Shows provider picker with OpenRouter (free) and Claude API (premium) descriptions. Stays in OnboardingState.choosing_provider. | OnboardingState.choosing_provider | `[ ]` | |
| S5 | `provider:openrouter` | callback | OpenRouter (Free models) | Shows step-by-step instructions to get OpenRouter API key. Prompts user to paste key. Sets FSM to OnboardingState.entering_api_key. | OnboardingState.choosing_provider | `[ ]` | |
| S6 | `provider:claude` | callback | Claude API (Premium quality) | Shows step-by-step instructions to get Claude API key with cost warning. Sets FSM to OnboardingState.entering_api_key. | OnboardingState.choosing_provider | `[ ]` | |
| S7 | FSM text input | FSM-text | (user pastes API key) | Deletes the key message for security. Validates key by calling LLM provider. If valid: encrypts, stores, creates user + memory + track, shows success + onboarding buttons. If invalid: shows error + retry prompt. Clears FSM on success. | OnboardingState.entering_api_key | `[ ]` | |
| S8 | `onboard:learn` | callback | Start Learning | Directly shows Track 1: Foundations level list with progress. Loads scenarios, builds progress text, shows unlocked/completed level buttons. Does NOT just say "use /learn". | Onboarding complete (FSM cleared) | `[ ]` | |
| S9 | `onboard:support` | callback | I Have a Deal to Work On | Directly enters support mode: shows "Deal Support Mode" prompt asking for prospect situation. Sets FSM to SupportState.waiting_input. Does NOT just say "use /support". | Onboarding complete (FSM cleared) | `[ ]` | |
| S10 | `onboard:train` | callback | Jump Into Practice | Directly loads a random training scenario from the pool (skipping difficulty picker). Shows scenario with persona, situation, difficulty. Sets FSM to TrainState.answering_scenario. Does NOT just say "use /train". | Onboarding complete (FSM cleared), user has encrypted_api_key | `[ ]` | |

---

## support.py (8 triggers)

| # | Trigger | Type | Label/Text | Expected Behavior | Prerequisite State | Test Status | Notes |
|---|---------|------|-----------|-------------------|-------------------|-------------|-------|
| U1 | `/support` | command | /support | Shows "Support Mode" prompt explaining 3 input types (text, photo, voice). Sets FSM to SupportState.waiting_input. Rejects if no account/key. | User has account with API key | `[ ]` | |
| U2 | Photo message | FSM-photo | (user sends screenshot) | Downloads photo, uploads to InsForge storage, encodes to base64 for vision. Runs strategist pipeline. Shows analysis with action buttons + "View Lead & Plan" if lead saved. Auto-creates/merges lead in registry. Background enrichment starts. | SupportState.waiting_input | `[ ]` | |
| U3 | Voice message | FSM-voice | (user sends voice) | Downloads voice, transcribes via AssemblyAI. Shows "I heard: [transcription]". Runs strategist pipeline on transcription. Shows analysis + action buttons. Auto-creates lead. | SupportState.waiting_input | `[ ]` | |
| U4 | Text message | FSM-text | (user types description) | Guards: commands/typos detected and redirected; <10 chars prompts for more context. Valid text runs strategist pipeline. Shows analysis + 4 action buttons (Regenerate, Shorter, More Aggressive, Done) + "View Lead & Plan". Auto-creates/merges lead. | SupportState.waiting_input | `[ ]` | |
| U5 | `support:regen` | callback | Regenerate | Re-runs strategist pipeline with "[System: Regenerate with a fresh approach]" modifier appended to original input. Shows new analysis with same action buttons. Uses stored last_input from FSM state. | Analysis shown, last_input in FSM state | `[ ]` | |
| U6 | `support:shorter` | callback | Shorter | Re-runs strategist pipeline with "[System: Make shorter and more concise]" modifier. Shows condensed analysis. | Analysis shown, last_input in FSM state | `[ ]` | |
| U7 | `support:aggressive` | callback | More Aggressive | Re-runs strategist pipeline with "[System: More aggressive closing approach]" modifier. Shows aggressive analysis. | Analysis shown, last_input in FSM state | `[ ]` | |
| U8 | `support:done` | callback | Done | Removes inline keyboard from the message. Shows "Done!" toast. Clears FSM state. Exits support mode. | Analysis shown with action buttons | `[ ]` | |

---

## learn.py (8 triggers)

| # | Trigger | Type | Label/Text | Expected Behavior | Prerequisite State | Test Status | Notes |
|---|---------|------|-----------|-------------------|-------------------|-------------|-------|
| L1 | `/learn` | command | /learn | Shows Track 1: Foundations with all levels listed. Each level shows lock/unlock/completed icon + name + best score. Unlocked/completed levels have tap-to-select buttons. Future tracks (2-5) shown as locked. Initializes track if needed. | User has account with API key | `[ ]` | |
| L2 | `learn:level:{id}` | callback | Level button (e.g., "Level 1.1: Introduction") | Shows lesson content: title, full content text, key points as bullet list. Shows "Start Scenario" button at bottom. | /learn shown, level is unlocked or completed | `[ ]` | |
| L3 | `learn:scenario:{id}` | callback | Start Scenario | Shows scenario: persona name/role/company/background, situation text, difficulty stars. Prompts for text or voice response. Sets FSM to LearnState.answering_scenario. Stores level_id and scenario_data in FSM. | Lesson content shown for a level | `[ ]` | |
| L4 | Text response | FSM-text | (user types answer) | If "/cancel": exits scenario, no penalty, suggests /learn. If empty: prompts to type response. Otherwise: runs trainer pipeline, scores response (0-100), calculates XP. Shows feedback with score breakdown + tips. If score >= 60: marks level completed, unlocks next level. Shows Retry (if <60), Show Ideal Response, Back to Levels buttons. Clears FSM. | LearnState.answering_scenario | `[ ]` | |
| L5 | Voice response | FSM-voice | (user sends voice) | Transcribes voice via AssemblyAI. Shows "I heard: [text]". Evaluates transcription same as text (runs trainer pipeline, scores, XP). Same feedback + buttons as text path. | LearnState.answering_scenario | `[ ]` | |
| L6 | `learn:ideal:{id}` | callback | Show Ideal Response | Shows ideal response text for the level's scenario. Shows common mistakes list if available. Shows "Retry Scenario" and "Back to Levels" buttons. | Feedback shown after scenario answer | `[ ]` | |
| L7 | `learn:back` | callback | Back to Levels | Returns to Track 1 level list (same as /learn output). Refreshes progress. | Any learn screen with this button | `[ ]` | |
| L8 | `learn:scenario:{id}` (retry) | callback | Retry / Retry Scenario | Re-presents the same scenario (same as L3). Sets FSM to LearnState.answering_scenario again. Available from feedback (if score <60) and from ideal response view. | Feedback or ideal response shown | `[ ]` | |

---

## train.py (10 triggers)

| # | Trigger | Type | Label/Text | Expected Behavior | Prerequisite State | Test Status | Notes |
|---|---------|------|-----------|-------------------|-------------------|-------------|-------|
| T1 | `/train` | command | /train | Shows "Training Mode" with pool size and unseen count. Shows difficulty picker: Easy, Medium, Hard, Random (2x2 grid). | User has account with API key | `[ ]` | |
| T2 | `train:diff:0` | callback | Random | Picks a random unseen scenario from full pool (no difficulty filter). Shows scenario with persona, situation, difficulty stars, unseen count. Sets FSM to TrainState.answering_scenario. If pool exhausted, resets and notifies. | Difficulty picker shown | `[ ]` | |
| T3 | `train:diff:1` | callback | Easy | Picks random unseen scenario filtered to difficulty=1. Fallback to full pool if no matches. Shows scenario. Sets FSM. | Difficulty picker shown | `[ ]` | |
| T4 | `train:diff:2` | callback | Medium | Picks random unseen scenario filtered to difficulty=2. Shows scenario. Sets FSM. | Difficulty picker shown | `[ ]` | |
| T5 | `train:diff:3` | callback | Hard | Picks random unseen scenario filtered to difficulty=3. Shows scenario. Sets FSM. | Difficulty picker shown | `[ ]` | |
| T6 | Text response | FSM-text | (user types answer) | If "/cancel": exits training, no penalty. If empty: prompts to type. Otherwise: runs trainer pipeline, scores (0-100), calculates XP, marks scenario seen, saves attempt. Shows feedback with Next Scenario, Retry This One, View Stats buttons. Clears FSM. | TrainState.answering_scenario | `[ ]` | |
| T7 | Voice response | FSM-voice | (user sends voice) | Transcribes voice. Shows "I heard: [text]". Evaluates same as text. Same feedback + buttons. | TrainState.answering_scenario | `[ ]` | |
| T8 | `train:next` | callback | Next Scenario | Picks next unseen scenario respecting stored difficulty_filter from FSM. Shows scenario. Sets FSM to TrainState.answering_scenario. If pool exhausted, resets. | Feedback shown after train answer | `[ ]` | |
| T9 | `train:retry:{id}` | callback | Retry This One | Re-presents the same scenario (looked up by ID in combined pool). Shows as "Retry -- Training Scenario". Sets FSM. Shows 0/0 unseen count (cosmetic). | Feedback shown after train answer | `[ ]` | |
| T10 | `train:stats` | callback | View Stats | Shows inline compact stats: level, XP, scenarios completed, avg/best score from last 10 attempts. Shows "Continue Training" button (which triggers train:next). | Feedback shown after train answer | `[ ]` | |

---

## leads.py (18 triggers)

| # | Trigger | Type | Label/Text | Expected Behavior | Prerequisite State | Test Status | Notes |
|---|---------|------|-----------|-------------------|-------------------|-------------|-------|
| D1 | `/leads` | command | /leads | Shows pipeline summary (total leads, photo count, plan count, status breakdown) + paginated lead list (5 per page). Each lead shows: attention icon (overdue followup), photo/text icon, status icon, plan icon, name + company. Empty state if no leads with CTA to /support. | User has account | `[ ]` | |
| D2 | `lead:page:{n}` | callback | Prev / Next pagination | Updates lead list keyboard to show page N. Fetches fresh lead data. | Lead list shown with multiple pages | `[ ]` | |
| D3 | `lead:view:{id}` | callback | (tap lead in list) | Shows full lead detail: name, title, company, status, date, photo indicator, research/plan status indicators, parsed analysis highlights, strategy summary (top 3), engagement tactics, draft preview, web research summary, notes. Action buttons: Refresh, View Plan (if has plan), View Draft (if has draft), Add Update, Get Advice, Comment on Post, status change buttons (all except current), Edit Info, Delete, Back to List. | Lead list shown | `[ ]` | |
| D4 | `lead:status:{id}:{status}` | callback | Status buttons (6 options) | Updates lead status in DB. Shows toast "Updated to [status label]". Refreshes lead detail view with new status. Available statuses: analyzed, reached_out, meeting_booked, in_progress, closed_won, closed_lost. | Lead detail view | `[ ]` | |
| D5 | `lead:plan:{id}` | callback | View Plan | Shows engagement plan steps with done/pending icons, step numbers, timing, description, suggested text quotes. Shows step toggle buttons (3 per row). Shows "Back to Lead" button. If no plan yet, shows toast "No engagement plan yet. It's being generated..." | Lead detail view, lead has engagement_plan | `[ ]` | |
| D6 | `lead:step:{id}:{step}` | callback | Step toggle (e.g., "Step 1") | Toggles step status between done and pending. Updates plan in DB. Shows toast "Step N: done/pending". Refreshes plan view with updated icons. | Engagement plan view | `[ ]` | |
| D7 | `lead:draft:{id}` | callback | View Draft | Shows full draft outreach message: platform, hook, message body, CTA. Parsed from JSON if stored as object, or shown as plain text. Shows "Back to Lead" button. If no draft, shows toast. | Lead detail view, lead has draft_response | `[ ]` | |
| D8 | `lead:context:{id}` | callback | Add Update | Enters context-adding mode. Shows instructions with examples (connection accepted, had a call, went cold). Sets FSM to LeadEngagementState.adding_context. Stores active_lead_id. | Lead detail view | `[ ]` | |
| D9 | Text input (context) | FSM-text | (user types update) | If "/cancel": exits, suggests /leads. Saves activity to lead_activities table. If engagement_service available: generates AI advice based on lead context + all activities + web research. Shows "Update saved for [name]" + AI advice. Clears FSM. | LeadEngagementState.adding_context | `[ ]` | |
| D10 | `lead:screenshot:{id}` | callback | Comment on Post | Enters screenshot mode. Shows "Send me a screenshot of their LinkedIn post" instructions. Sets FSM to LeadEngagementState.sending_screenshot. Stores active_lead_id. | Lead detail view | `[ ]` | |
| D11 | Photo input (screenshot) | FSM-photo | (user sends screenshot) | Downloads photo, encodes to base64. If engagement_service available: generates comment options from photo + lead context + web research. Saves activity. Shows "Comment Options for [name]" + generated comments. Clears FSM. | LeadEngagementState.sending_screenshot | `[ ]` | |
| D12 | Text input (screenshot mode) | FSM-text | (user sends text instead of photo) | If "/cancel": exits, suggests /leads. Otherwise: tells user to send a screenshot image or /cancel. Does NOT clear FSM -- stays in screenshot mode. | LeadEngagementState.sending_screenshot | `[ ]` | |
| D13 | `lead:advice:{id}` | callback | Get Advice | If no engagement_service: shows "AI advice not available" with Back button. Otherwise: generates fresh advice based on all lead data + activities + web research. Saves as ai_advice activity. Shows "AI Advice -- [name]" + advice text + "Back to Lead" button. | Lead detail view | `[ ]` | |
| D14 | `lead:delete:{id}` | callback | Delete | Shows delete confirmation: "Are you sure you want to permanently delete [name]?" with "Yes, Delete" and "Cancel" buttons. | Lead detail view | `[ ]` | |
| D15 | `lead:confirm_delete:{id}` | callback | Yes, Delete | Permanently deletes lead from DB. Shows "[name] has been deleted" + "Back to Leads" button. Error handling if delete fails. | Delete confirmation shown | `[ ]` | |
| D16 | `lead:edit:{id}` | callback | Edit Info | Shows current name/company/title with instructions to update using "Field: Value" format. Sets FSM to LeadEngagementState.editing_lead. Stores active_lead_id. | Lead detail view | `[ ]` | |
| D17 | Text input (edit) | FSM-text | (user sends edit text) | If "/cancel": exits. Parses "Name: X", "Company: Y", "Title: Z" lines. Updates matching fields in DB. Shows confirmation with updated fields. If no valid fields found, shows format instructions. Clears FSM. | LeadEngagementState.editing_lead | `[ ]` | |
| D18 | `lead:back` | callback | Back to List | Returns to full lead list view (same as /leads but as message edit). Shows pipeline summary + paginated list. | Any lead sub-view | `[ ]` | |

---

## stats.py (5 triggers)

| # | Trigger | Type | Label/Text | Expected Behavior | Prerequisite State | Test Status | Notes |
|---|---------|------|-----------|-------------------|-------------------|-------------|-------|
| P1 | `/stats` | command | /stats | Shows formatted stats card: rank/level/XP/streak, track progress (N/4 levels), train scenarios (N/20), recent performance (avg/best from last 10), lead pipeline by status, provider info. Action buttons: Continue Learning, Quick Practice, Support Mode, My Leads. | User has account | `[ ]` | |
| P2 | `stats:learn` | callback | Continue Learning | Directly shows Track 1 level list with progress (same as /learn output). Initializes track if needed. Does NOT just say "use /learn". | Stats card shown | `[ ]` | |
| P3 | `stats:train` | callback | Quick Practice | Directly loads a random training scenario (skipping difficulty picker). Shows scenario with persona, situation. Sets FSM to TrainState.answering_scenario. Does NOT just say "use /train". | Stats card shown | `[ ]` | |
| P4 | `stats:support` | callback | Support Mode | Directly enters support mode: shows prompt for prospect situation. Sets FSM to SupportState.waiting_input. Does NOT just say "use /support". | Stats card shown | `[ ]` | |
| P5 | `stats:leads` | callback | My Leads | Directly shows lead list with pipeline summary and paginated leads (same as /leads output). Shows empty state if no leads. Does NOT just say "use /leads". | Stats card shown | `[ ]` | |

---

## settings.py (13 triggers)

| # | Trigger | Type | Label/Text | Expected Behavior | Prerequisite State | Test Status | Notes |
|---|---------|------|-----------|-------------------|-------------------|-------------|-------|
| G1 | `/settings` | command | /settings | Shows current provider, model, XP, level. Shows menu with 6 buttons: Switch Provider, Update API Key, Change Model, Reset Progress, Delete Account, Close. Sets FSM to SettingsState.main_menu. | User has account | `[ ]` | |
| G2 | `settings:switch_provider` | callback | Switch Provider | Shows provider picker: OpenRouter, Claude API, Back. Sets FSM to SettingsState.changing_provider. | Settings menu shown | `[ ]` | |
| G3 | `switch:openrouter` | callback | OpenRouter | Prompts for OpenRouter API key with link. Sets FSM to SettingsState.entering_new_key. Stores new_provider=openrouter in FSM data. | SettingsState.changing_provider | `[ ]` | |
| G4 | `switch:claude` | callback | Claude API | Prompts for Anthropic API key with link. Sets FSM to SettingsState.entering_new_key. Stores new_provider=claude in FSM data. | SettingsState.changing_provider | `[ ]` | |
| G5 | `settings:update_key` | callback | Update API Key | Prompts "Send your new API key". Sets FSM to SettingsState.entering_new_key. Does NOT set new_provider (uses existing provider). | Settings menu shown | `[ ]` | |
| G6 | Text input (new key) | FSM-text | (user pastes API key) | Deletes key message for security. If no new_provider in FSM, uses existing user provider. Validates key. If valid: encrypts, updates user record, shows confirmation with provider name. Clears FSM. If invalid: shows error + retry prompt. | SettingsState.entering_new_key | `[ ]` | |
| G7 | `settings:change_model` | callback | Change Model | Shows model picker with 4 OpenRouter models: GPT-OSS 120B, Kimi K2.5, Gemini Flash, DeepSeek R1 + Back button. Sets FSM to SettingsState.choosing_model. | Settings menu shown | `[ ]` | |
| G8 | `model:{model_id}` | callback | Model selection (4 options) | Updates user's openrouter_model in DB. Shows "Model updated to [model_id]". Clears FSM. Note: works even for Claude API users (no guard). | SettingsState.choosing_model | `[ ]` | |
| G9 | `settings:reset` | callback | Reset Progress | Shows warning: "This will reset all your XP and progress. Are you sure?" with "Yes, reset progress" and "Cancel" buttons. | Settings menu shown | `[ ]` | |
| G10 | `confirm_reset:yes` | callback | Yes, reset progress | Resets XP to 0, level to 1, streak to 0. Shows "Progress reset. Start fresh with /learn!" Clears FSM. | Reset confirmation shown | `[ ]` | |
| G11 | `settings:delete` | callback | Delete Account | Shows warning: "This will permanently delete your account and all data. Are you sure?" with "Yes, delete everything" and "Cancel" buttons. | Settings menu shown | `[ ]` | |
| G12 | `confirm_delete:yes` | callback | Yes, delete everything | Calls user_repo.delete_by_telegram_id. Shows "Account deleted. Use /start to create a new one." Clears FSM. | Delete confirmation shown | `[ ]` | |
| G13 | `settings:back` / `settings:close` | callback | Back / Close | Back: returns to settings menu text + keyboard, sets FSM to SettingsState.main_menu. Close: deletes the settings message entirely, sets FSM to SettingsState.main_menu. | Any settings sub-screen | `[ ]` | |

---

## admin.py (15 triggers)

| # | Trigger | Type | Label/Text | Expected Behavior | Prerequisite State | Test Status | Notes |
|---|---------|------|-----------|-------------------|-------------------|-------------|-------|
| A1 | `/admin` | command | /admin | If username in admin_usernames: shows "Admin Panel" with 12 action buttons. If not admin: shows "This command is only available to admins." | User must be in admin_usernames list | `[ ]` | |
| A2 | `admin:perf` | callback | Pipeline Performance | Shows pipeline performance: avg/max duration per pipeline type from last 20 traces. Shows recent executions list with status/timing. Each trace has a drill-down button. Admin check on every callback. | Admin panel shown, admin user | `[ ]` | |
| A3 | `admin:stats` | callback | Team Statistics | Shows team-wide stats: total users, total XP, providers breakdown, total attempts by mode, avg score, support session count. | Admin panel, admin user | `[ ]` | |
| A4 | `admin:leaderboard` | callback | Leaderboard | Shows team leaderboard ranked by performance: medals for top 3, username, avg score, level, XP, attempt count. Requires analytics_service; shows fallback if unavailable. | Admin panel, admin user | `[ ]` | |
| A5 | `admin:trends` | callback | Trends | Shows this week vs last week performance: avg scores, attempt counts, trend direction. Category breakdown. Top performer. Requires analytics_service. | Admin panel, admin user | `[ ]` | |
| A6 | `admin:users` | callback | User Overview | Lists all registered users: @username (first_name) -- Level N, XP [provider]. Ordered by created_at desc. | Admin panel, admin user | `[ ]` | |
| A7 | `admin:activity` | callback | Recent Activity | Shows last 15 attempts across all users: mode, scenario_id, score, XP earned, telegram_id. | Admin panel, admin user | `[ ]` | |
| A8 | `admin:arch` | callback | Architecture Overview | Shows static text describing: tech stack, agent pipeline, pipeline modes, database tables (9), data files. Informational only. | Admin panel, admin user | `[ ]` | |
| A9 | `admin:knowledge` | callback | Knowledge Base Status | Shows file status for playbook.md, company_knowledge.md, scenarios.json (exists, size, line count). Shows scenario counts (learn levels, train pool). Lists pipeline YAML files and agent prompt files. | Admin panel, admin user | `[ ]` | |
| A10 | `admin:scenarios` | callback | Scenario Stats | Shows per-scenario attempt counts and avg scores across all users. Sorted by popularity. Shows difficulty stars from scenarios.json mapping. | Admin panel, admin user | `[ ]` | |
| A11 | `admin:gen_scenarios` | callback | Generated Scenarios | Shows generated scenario pool count, difficulty breakdown, avg quality score, recent entries with category/difficulty/usage. If empty, explains how generation works. | Admin panel, admin user | `[ ]` | |
| A12 | `admin:casebook` | callback | Casebook Entries | Shows last 10 casebook entries: persona_type, scenario_type, quality_score. If empty, explains how casebook entries are created. | Admin panel, admin user | `[ ]` | |
| A13 | `admin:trace:{id}` | callback | Trace drill-down | Shows trace detail: pipeline name, total duration, success/error status, trace ID. Step breakdown with visual bar chart showing relative timing. Bottleneck callout (slowest step with % of total). "Back to Performance" and "Main Menu" buttons. | Pipeline Performance view, admin user | `[ ]` | |
| A14 | `admin:back` | callback | Back | Returns to admin panel main menu with all 12 buttons. | Any admin sub-view | `[ ]` | |
| A15 | `admin:close` | callback | Close | Deletes the admin panel message entirely. | Admin panel or any admin sub-view | `[ ]` | |

---

## Total Trigger Count

| Handler | Triggers |
|---------|----------|
| start.py | 10 |
| support.py | 8 |
| learn.py | 8 |
| train.py | 10 |
| leads.py | 18 |
| stats.py | 5 |
| settings.py | 13 |
| admin.py | 15 |
| **Total** | **87** |

---

## Known Issues (from code analysis)

### 1. Unused FSM States

- **`LearnState.viewing_lesson`** -- Defined in `bot/states.py` (line 16) but never referenced in any handler. The lesson display flow goes directly from `learn:level:{id}` callback to showing content, without setting this state.
- **`LeadEngagementState.viewing_lead`** -- Defined in `bot/states.py` (line 25) but never referenced in any handler. Lead detail view is stateless (callback-only, no FSM).

### 2. Confusing "Comment on Post" UX

- **Trigger:** `lead:screenshot:{id}` (D10)
- **Issue:** The button label is "Comment on Post" but the handler expects a PHOTO (screenshot of a LinkedIn post). The flow enters `LeadEngagementState.sending_screenshot` and asks the user to "Send me a screenshot of their LinkedIn post." Users may expect to type a comment, not send a photo.
- **Impact:** Confusion when the button label doesn't match the required action type.

### 3. engagement_service Silently Disabled

- **Trigger:** Any lead AI feature (D9 context advice, D11 comment generation, D13 get advice)
- **Issue:** `engagement_service` is injected as `EngagementService | None`. When `OPENROUTER_API_KEY` is not set, it is `None`. This silently disables:
  - AI advice generation on context updates (D9 shows "AI advice is not available right now")
  - Comment generation on screenshots (D11 shows "Comment generation is not available right now")
  - Engagement plan generation during lead enrichment (no plan created)
  - `lead:advice:{id}` shows explicit error message, but others just silently skip
- **Impact:** Features appear present (buttons visible) but produce no AI output without clear explanation why.

### 4. No Handler for Non-Photo Input in Screenshot Mode

- **Trigger:** Sending text (not "/cancel") in `LeadEngagementState.sending_screenshot` (D12)
- **Issue:** There IS a handler (`on_lead_screenshot_cancel`) that catches text, but it only handles "/cancel" explicitly. For any other text, it replies "Please send a screenshot image, or /cancel to go back" and stays in FSM. This is correct behavior but the user could send voice messages or other content types that have NO handler, which would be silently ignored.
- **Impact:** Voice or document messages in screenshot mode are silently dropped.

### 5. FSM States Have No Timeout

- **Issue:** All FSM states (OnboardingState, SupportState, LearnState, TrainState, LeadEngagementState, SettingsState) have no timeout mechanism. If a user enters a state and forgets to /cancel, they remain in that state indefinitely.
- **Impact:** Subsequent commands may behave unexpectedly because the user is still in an FSM state they forgot about.

### 6. Model Change Available to Claude API Users

- **Trigger:** `settings:change_model` (G7) and `model:{id}` (G8)
- **Issue:** The "Change Model" button is shown to all users regardless of provider. If a Claude API user selects a model, it updates the `openrouter_model` field which has no effect on Claude API behavior. No guard prevents this.
- **Impact:** Confusing -- user thinks they changed something but nothing changes.

### 7. settings:back Resets to main_menu but Doesn't Clear Data

- **Trigger:** `settings:back` (G13)
- **Issue:** When pressing "Back" from sub-screens, the handler sets FSM to `SettingsState.main_menu` but does not clear FSM data (e.g., `new_provider`). If user starts a provider switch, presses Back, then later enters "Update API Key" flow, the stale `new_provider` could affect which provider is set.
- **Impact:** Edge case -- stale FSM data could cause wrong provider assignment.

### 8. train:retry Shows 0/0 Unseen Count

- **Trigger:** `train:retry:{id}` (T9)
- **Issue:** The retry handler calls `_format_scenario_text(scenario, 0, 0, ...)` which shows "Remaining: 0/0 unseen" -- misleading since the user still has unseen scenarios.
- **Impact:** Cosmetic -- confusing unseen count display on retry.
