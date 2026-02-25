# Research: TMA Lead Experience & Bot-TMA Coordination

**Domain:** Lead management UX, bot-TMA synchronization, notification patterns, mobile CRM design
**Researched:** 2026-02-05
**Overall Confidence:** MEDIUM-HIGH (strong codebase understanding + verified platform patterns)

---

## Executive Summary

The v2.0 "Sales Co-Pilot" milestone requires transforming the TMA from a passive lead viewer into an active sales cockpit. The current TMA has solid lead infrastructure -- list, detail with parsed analysis sections, status management, notes, activity timeline -- but it treats leads as individual records rather than living workflows. The v2.0 experience needs three interconnected upgrades: (1) a lead-centric "thread" view where the engagement plan is front-and-center with step-by-step execution tracking, (2) a "What should I do next?" dashboard that aggregates overdue/due-today steps across all leads, and (3) a reliable bot-to-TMA coordination loop where bot reminders deep-link into specific lead/step views and TMA updates trigger bot-side re-analysis.

The existing architecture is well-positioned for this. The bot already has a followup scheduler (`bot/services/followup_scheduler.py`) that runs every 6 hours, an `engagement_plan` JSONB field on `lead_registry` that both bot and TMA can read/write, and a `lead_activity_log` table for tracking context updates. The TMA already has `useDeepLink` routing via `startapp` params and `WebAppInfo(url=...)` inline buttons that can pass full URL paths. The critical gap is the bot reminder messages currently just say "Use /leads" -- they need inline buttons that open the TMA directly at the relevant lead/step.

For data synchronization, InsForge (Supabase-compatible) supports Realtime Postgres Changes via WebSocket, but the current TMA uses zero Realtime subscriptions -- only `refetchOnWindowFocus` and manual refetch. For v2.0, I recommend **smart polling with TanStack Query `refetchInterval`** over Realtime subscriptions, because: the update frequency is low (analysis results arrive once per minutes-long pipeline run, not real-time collaboration), InsForge Realtime self-hosted setup adds operational complexity, and polling with a 15-30 second interval gives "good enough" freshness. Reserve Realtime for a future v3 if multi-user collaboration becomes a requirement.

---

## 1. Lead-Centric TMA Experience

### Current State

The TMA `LeadDetail` component (`packages/webapp/src/features/leads/components/LeadDetail.tsx`) renders a vertical stack of sections: header > status selector > analysis > strategy > tactics > draft > engagement plan > web research > notes > activity timeline. The engagement plan is buried near the bottom, rendered as static steps with done/pending badges. There is no interactive step-toggling in the TMA -- that only exists in the bot (`lead:step:{id}:{step_id}` callbacks).

The lead list (`LeadList.tsx`) is a simple vertical list of `LeadCard` components, sorted by `updated_at desc`. No grouping by status, no urgency indicators, no "needs attention" filtering.

### Recommended Architecture: Lead as Thread

**Confidence: MEDIUM** (based on CRM UX research + codebase analysis)

Restructure `LeadDetail` as a "deal thread" with three tabs/sections:

1. **Active Plan** (default, top position) -- The engagement plan steps, prominently displayed, with interactive toggle buttons (done/pending), the current/next step highlighted, and a "Mark Step Complete" primary action button. When a step is completed, immediately show the next step's suggested text and timing.

2. **Intelligence** -- The analysis, strategy, tactics, draft, and web research sections (existing content, reorganized). This is reference material the user consults, not the primary workflow.

3. **Activity** -- The existing activity timeline + notes, showing all interactions including bot-sent followups, user context updates, AI advice, and screenshot comments.

**Rationale:** Mobile CRM research consistently shows that the most effective mobile interfaces surface "what to do next" first, not "what we know." Pipedrive and HubSpot mobile apps both lead with the pipeline/action view, not the contact profile. The current Deal Quest TMA does the opposite -- it leads with analysis and buries the engagement plan.

### Engagement Plan Step UI

Each step should display:
- Step number + description
- Timing indicator (e.g., "Day 1", "Day 3-5", "Week 2")
- Status badge (done/pending/overdue)
- Suggested text (expandable, with copy-to-clipboard)
- "Mark Complete" button
- When completed: timestamp of completion

**Overdue detection:** Compare step timing against lead creation date. If a step's timing window has passed and it's still pending, mark it with a red "overdue" indicator. This is a TMA-side computation, not stored in the DB.

### Lead List Enhancements

Add to `LeadCard`:
- Overdue step count indicator (red badge)
- Next action preview text (first pending step description, truncated)
- Engagement plan progress bar (3/7 steps done)

Add filtering/grouping:
- "Needs Action" filter (leads with overdue steps)
- Status group headers (optional, can be a toggle)

### Sources & Confidence

- CRM mobile UX patterns: [CRM UX Design in 2025 (Yellow Slice)](https://yellowslice.in/bed/crm-ux-design-in-2025-what-works-what-fails-and-whats-next/) -- MEDIUM confidence
- Pipeline board patterns: [Best Mobile CRM (Streak)](https://www.streak.com/post/best-mobile-crm-apps-for-teams) -- MEDIUM confidence
- HubSpot/Pipedrive mobile UX patterns from industry research -- MEDIUM confidence (general patterns, not API-verified)

---

## 2. Bot-TMA Coordination Patterns

### Current State

The bot-TMA coordination currently works in one direction:
- **Bot to TMA:** The bot appends "Open in App" `WebAppInfo(url=...)` buttons via `utils_tma.add_open_in_app_row()`. These open the TMA at a section-level path (e.g., `/leads`), not at a specific lead.
- **TMA to Bot:** No direct communication. The TMA writes to the database (status updates, notes); the bot reads from the database independently. There is no event-driven trigger from TMA to bot.

The `useDeepLink` hook only handles simple `startapp` params (`leads`, `support`, etc.) mapped to top-level routes. It does not handle parameterized routes like `leads/123` or `leads/123/plan/step/3`.

### Recommended: Two-Way Database-Mediated Coordination

**Confidence: HIGH** (verified with Telegram Bot API docs + existing codebase patterns)

#### Bot-to-TMA: Deep Link Reminder Buttons

When the bot sends a followup reminder (or any lead-related notification), include an inline keyboard button that opens the TMA at the exact lead:

**Option A: `WebAppInfo(url=...)` with full path (RECOMMENDED)**

```python
# In followup_scheduler.py or anywhere bot sends lead-specific messages
InlineKeyboardButton(
    text="View Lead & Plan",
    web_app=WebAppInfo(url=f"{tma_url}/leads/{lead_id}")
)
```

This is what the existing `add_open_in_app_row()` already does, just with a more specific path. The TMA's `BrowserRouter` + React Router will natively handle `/leads/:leadId` routing. **No `useDeepLink` changes needed for this approach** because `WebAppInfo(url=...)` opens the exact URL -- the browser handles routing.

Limitation: `web_app` buttons only work in private chats. Since Deal Quest is a private bot, this is fine.

**Option B: `startapp` parameter with encoded route**

For links shared outside the private chat context or for `url`-type buttons:

```python
# Encode: leads__123__plan__step__3
param = f"leads__{lead_id}__plan__step__{step_id}"
InlineKeyboardButton(
    text="View Step",
    url=f"https://t.me/{bot_username}/app?startapp={param}"
)
```

Then expand `useDeepLink.ts` to parse compound params:

```typescript
// startapp=leads__123__plan__step__3
const parts = startParam.split('__');
if (parts[0] === 'leads' && parts[1]) {
  navigate(`/leads/${parts[1]}`);
}
```

**Recommendation:** Use Option A (`WebAppInfo`) for all private chat interactions. It is simpler, requires no encoding, and the TMA already uses `BrowserRouter` with `/leads/:leadId` routing. Reserve Option B for edge cases only (group sharing, external links).

#### TMA-to-Bot: Database-Mediated Events

When the user does something in the TMA that should trigger bot-side processing:

1. **Context update triggers re-analysis:**
   - TMA writes a new row to `lead_activity_log` with `activity_type: 'context_update_tma'`
   - TMA also sets a flag on the lead: `needs_reanalysis: true` (new column)
   - Bot's scheduler (or a new polling loop) picks up leads with `needs_reanalysis: true`, runs re-analysis pipeline, clears the flag, updates analysis/strategy/plan
   - TMA polls for lead data changes via `refetchInterval` and shows updated results

2. **Step completion from TMA:**
   - TMA directly updates `engagement_plan` JSONB (already possible via InsForge PostgREST)
   - TMA writes activity log entry: `activity_type: 'step_completed_tma'`
   - Bot scheduler checks for newly completed steps and adjusts `next_followup` timing accordingly

**Why database-mediated, not direct API:** There is no HTTP API from TMA to bot. The bot is a long-running polling process, not a web server. The shared database is the natural coordination layer. This is the same pattern already used for lead creation (bot writes lead, TMA reads it).

### Avoiding Conflicts

**Concern:** Both bot and TMA can modify `engagement_plan` JSONB.

**Solution:** Use last-write-wins at the step level. Each step has a `step_id`. The bot only modifies step status when processing followup confirmations. The TMA only modifies step status when the user taps "Mark Complete." Since these are user-initiated actions on different steps at different times, conflicts are extremely unlikely.

For `engagement_plan` as a whole (array replacement), both sides should:
1. Read current plan
2. Modify only the target step
3. Write back entire array

This is safe because JSONB is atomic at the row level in PostgreSQL.

### Sources & Confidence

- Telegram `WebAppInfo(url=...)` inline button: [Telegram Bot API - Mini Apps](https://core.telegram.org/bots/webapps) -- HIGH confidence (official docs)
- `startapp` parameter constraints (A-Z, a-z, 0-9, _, - only, up to 512 chars): [Telegram Mini Apps Start Parameter](https://docs.telegram-mini-apps.com/platform/start-parameter) -- HIGH confidence
- Existing `add_open_in_app_row()` already uses `WebAppInfo(url=...)` with paths -- HIGH confidence (verified in codebase)

---

## 3. Data Synchronization: Polling vs Realtime

### Current State

The TMA uses TanStack React Query with `refetchOnWindowFocus: true` on lead-related hooks. No `refetchInterval` is configured. No InsForge Realtime subscriptions exist anywhere in the TMA codebase.

The `QueryProvider` disables `refetchOnWindowFocus` globally but individual hooks override it to `true` for leads.

### Options Evaluated

| Approach | Freshness | Complexity | Reliability | Operational Cost |
|----------|-----------|------------|-------------|-----------------|
| **Polling (refetchInterval)** | 15-30s delay | Low | High | None |
| **InsForge Realtime (Postgres Changes)** | ~1s delay | Medium-High | Medium | WAL management, Realtime server |
| **Custom SSE endpoint** | ~1s delay | High | Medium | New service to deploy |
| **Manual refetch only** | User-initiated | None | High | None |

### Recommendation: Smart Polling

**Confidence: HIGH** (based on architecture analysis)

Use TanStack Query's `refetchInterval` with conditional activation:

```typescript
// In useLead.ts
useQuery({
  queryKey: queryKeys.leads.detail(leadId),
  queryFn: ...,
  refetchOnWindowFocus: true,
  // Poll every 15s when lead was recently updated or has active plan
  refetchInterval: (query) => {
    const lead = query.state.data;
    if (!lead) return false;
    // If lead was updated in last 5 minutes, poll actively
    const updatedAt = new Date(lead.updated_at);
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    if (updatedAt.getTime() > fiveMinAgo) return 15_000;
    // If lead has pending plan steps, poll every 30s
    if (lead.engagement_plan?.some(s => s.status === 'pending')) return 30_000;
    // Otherwise, no automatic polling
    return false;
  },
});
```

**Rationale:**
- The bot's background enrichment (web research + engagement plan) takes 10-30 seconds after lead creation. Polling at 15s catches this.
- Re-analysis after context update takes similar time. Polling catches this too.
- For leads with no pending activity, no polling needed -- saves battery/bandwidth.
- InsForge Realtime adds significant operational complexity (WAL management, Realtime server health, WebSocket connection management, reconnection logic) for a use case that doesn't need sub-second latency.
- TanStack Query already handles caching, deduplication, and background refetching cleanly.

### When to Upgrade to Realtime

Consider InsForge Realtime if:
- Multiple users collaborate on the same lead (multi-user sales teams)
- Bot sends rapid-fire updates during pipeline execution (progress indicators)
- Users demand instant feedback (< 2s) after triggering re-analysis

None of these are v2.0 requirements.

### Sources & Confidence

- Supabase Realtime architecture: [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime) -- HIGH confidence (official docs)
- Supabase Realtime drops connections ~30 min: [Production listener considerations (Medium)](https://medium.com/@dipiash/supabase-realtime-postgres-changes-in-node-js-2666009230b0) -- MEDIUM confidence
- TanStack Query refetchInterval: verified from training data, standard React Query feature -- HIGH confidence

---

## 4. Notification/Reminder UX

### Current State

The bot's `followup_scheduler.py`:
- Checks every 6 hours (`CHECK_INTERVAL_SECONDS = 6 * 60 * 60`)
- Sends plain text reminders with no inline buttons (just "Use /leads to view details")
- Schedules next followup 3 days later (`FOLLOWUP_INTERVAL_DAYS = 3`)
- Stops after 2 months (`MAX_LEAD_AGE_DAYS = 60`)
- Increments `followup_count` on each send

### Recommended Improvements

**Confidence: MEDIUM-HIGH**

#### A. Rich Reminder Messages with Action Buttons

Replace the plain text "Use /leads" with an inline keyboard:

```python
buttons = [
    [InlineKeyboardButton(
        text="View Lead & Plan",
        web_app=WebAppInfo(url=f"{tma_url}/leads/{lead.id}")
    )],
    [
        InlineKeyboardButton(text="Done", callback_data=f"followup:done:{lead.id}"),
        InlineKeyboardButton(text="Snooze 1d", callback_data=f"followup:snooze:{lead.id}:1"),
        InlineKeyboardButton(text="Snooze 3d", callback_data=f"followup:snooze:{lead.id}:3"),
    ],
    [InlineKeyboardButton(text="Stop Reminders", callback_data=f"followup:stop:{lead.id}")],
]
```

Each callback updates the lead and adjusts scheduling:
- **Done:** Mark current step complete, advance to next step, reschedule followup
- **Snooze:** Push `next_followup` forward by 1 or 3 days
- **Stop:** Set `next_followup = null` to permanently stop reminders for this lead

#### B. Step-Aware Reminders

Instead of generic "Check in on this lead", reference the specific engagement plan step:

```
Lead Followup: John Smith @ Acme Corp

Step 3: Comment on their latest LinkedIn post about AI adoption
Suggested text: "Great insights on AI adoption, John. At [company], we've seen..."

[View Full Step]  [Mark Done]  [Snooze]
```

The current code already does a basic version of this (extracting `pending_steps[0].description`), but it should be enhanced with the step's `suggested_text`.

#### C. Notification Cadence & Anti-Spam

Research on Telegram bot notifications indicates these best practices:

1. **Spacing:** The current 3-day interval is reasonable for sales follow-ups. Do not go below 1 day for automated reminders.

2. **Escalation pattern:** Instead of fixed 3-day intervals, use an escalating schedule:
   - Step 1-2: Remind every 2 days
   - Step 3-4: Remind every 3 days
   - Step 5+: Remind every 5 days
   - After 3 missed reminders (user ignores): Switch to weekly

3. **Quiet hours:** Telegram has no built-in quiet hours API, but the bot can implement it:
   - Store user timezone (or detect from Telegram user object if available)
   - Only send reminders between 9 AM - 7 PM user local time
   - If due during quiet hours, defer to next morning 9 AM

4. **Grouping:** If a user has 3+ leads due for followup at the same time, send ONE grouped message instead of three separate messages:
   ```
   3 leads need your attention today:
   - John Smith: Step 3 - Comment on LinkedIn post
   - Sarah Jones: Step 1 - Send connection request
   - Mike Chen: Step 5 - Follow-up email

   [Open Pipeline Dashboard]
   ```

5. **User control:** Add a `/reminders` command (or TMA settings page) where users can:
   - Set quiet hours
   - Set preferred reminder frequency (aggressive/normal/relaxed)
   - Pause all reminders temporarily
   - View upcoming reminders

### Sources & Confidence

- Telegram rate limits (300 scheduled messages per chat): [Telegram Bot API](https://core.telegram.org/bots) -- HIGH confidence
- Telegram notification best practices: [Respond.io Telegram Push Notifications](https://respond.io/blog/telegram-push-notifications) -- MEDIUM confidence
- Users must message first (bot cannot cold-message): [Telegram Bot rules](https://core.telegram.org/bots) -- HIGH confidence (but not relevant here since users onboard via /start)

---

## 5. Multi-Lead Management Dashboard

### Current State

The TMA dashboard (`pages/Dashboard.tsx`) shows: ProgressCard, QuickActions, WeakAreasCard, BadgePreview, LeaderboardWidget. No lead-related content on the dashboard. Users must navigate to `/leads` to see their pipeline.

The leads page is a flat list sorted by `updated_at`. No pipeline view, no urgency aggregation, no "today's tasks."

### Recommended: "Today's Actions" Widget on Dashboard

**Confidence: MEDIUM**

Add a new `LeadActionsWidget` to the dashboard that shows:

```
Today's Pipeline Actions (3)

! John Smith @ Acme - Comment on LinkedIn post (overdue 2d)
  Sarah Jones @ TechCo - Send intro email (due today)
  Mike Chen @ StartupXYZ - Schedule demo call (due tomorrow)

[View All Leads (12)]
```

This widget:
- Queries `lead_registry` for leads with active engagement plans
- Computes which steps are overdue/due-today based on lead creation date + step timing
- Shows top 3-5 items, sorted by urgency
- Tapping an item navigates to `/leads/{id}` with the plan tab active

### Pipeline View on Leads Page

Instead of a full Kanban board (which is cramped on mobile TMA), use a **horizontal status filter bar** at the top of the lead list:

```
[All(12)] [Active(8)] [Need Action(3)] [Won(2)] [Lost(0)]
```

- **All:** Current view, all leads
- **Active:** Excludes closed_won and closed_lost
- **Need Action:** Leads with overdue engagement plan steps
- **Won/Lost:** Terminal statuses

This is lighter than a full Kanban and works better on the constrained TMA viewport (typically 360-390px wide). A horizontal-scroll Kanban board with columns is possible but adds complexity for limited value when most users will have < 20 active leads.

### Pipeline Summary Stats

At the top of the leads page, show:

```
Pipeline: 12 leads | 3 need action | 5 with active plans
```

This provides at-a-glance pipeline health without a full Kanban.

### Sources & Confidence

- "Today's tasks" dashboard pattern: [CRM Dashboards best practices (Coupler.io)](https://blog.coupler.io/crm-dashboards/) -- MEDIUM confidence
- Visual hierarchy with Tier 1 metrics: [Visual Hierarchy in CRM Dashboards (eSEOspace)](https://eseospace.com/blog/designing-with-data-visual-hierarchy-in-crm-dashboards/) -- MEDIUM confidence
- Mobile CRM target hit rate with mobile access: [Best Mobile CRM (Capsule)](https://capsulecrm.com/blog/best-mobile-crm/) -- MEDIUM confidence

---

## 6. Data Flow Architecture for v2.0

### Current Data Flow

```
User sends message/photo/voice to Bot
  -> Bot runs AI pipeline (strategist agent)
  -> Bot writes lead_registry row (analysis, strategy, tactics, draft)
  -> Bot fires background enrichment (web_research, engagement_plan)
  -> TMA reads lead_registry via PostgREST (on page load / window focus)

User in TMA changes status / adds note
  -> TMA writes directly to lead_registry via PostgREST
  -> Bot reads on next access (no event trigger)
```

### Proposed v2.0 Data Flow

```
=== Engagement Plan Execution ===

Bot scheduler checks next_followup <= now
  -> Bot sends reminder message with inline buttons (View Lead, Done, Snooze)
  -> User taps "View Lead" -> opens TMA at /leads/{id}
  -> User taps "Done" -> bot updates step status, schedules next followup
  -> User taps "Snooze" -> bot pushes next_followup forward

=== Re-Analysis Loop ===

User adds context update in TMA
  -> TMA writes lead_activity_log (activity_type: 'context_update_tma')
  -> TMA sets lead_registry.needs_reanalysis = true
  -> Bot re-analysis worker polls for needs_reanalysis = true (every 60s)
  -> Bot runs re-analysis pipeline with new context
  -> Bot updates analysis/strategy/plan, clears needs_reanalysis
  -> TMA polls via refetchInterval, sees updated data

=== Smart Lead Creation ===

User sends screenshot/URL in bot (existing flow)
  -> Bot runs support pipeline
  -> Bot creates/merges lead_registry row
  -> Bot fires background enrichment
  -> TMA picks up new lead on next poll/page visit
```

### New Database Columns Needed

| Column | Table | Type | Purpose |
|--------|-------|------|---------|
| `needs_reanalysis` | lead_registry | boolean DEFAULT false | Flag for bot to pick up re-analysis requests |
| `reanalysis_context` | lead_registry | text | New context provided by user (consumed by bot during re-analysis) |
| `reminder_preferences` | users | jsonb | User notification preferences (quiet hours, frequency) |
| `last_reminded_at` | lead_registry | timestamptz | When the last reminder was sent (anti-spam) |

### Who Owns What

| Data | Owner (writes) | Reader |
|------|----------------|--------|
| Lead analysis, strategy, tactics, draft | Bot | TMA (read-only display) |
| Engagement plan (generation) | Bot | TMA (read + step completion) |
| Engagement plan (step status) | Both (bot via followup, TMA via user action) | Both |
| Lead status | Both (bot rarely, TMA primarily) | Both |
| Notes | TMA | Bot (context for re-analysis) |
| Activity log | Both | TMA (display), Bot (context) |
| Followup scheduling | Bot | Bot (scheduler), TMA (display only) |
| Re-analysis requests | TMA (sets flag) | Bot (processes and clears) |
| Reminder preferences | TMA (user settings) | Bot (scheduler reads) |

---

## 7. Deep Linking Architecture

### Current Implementation

```
Bot:  add_open_in_app_row(keyboard, tma_url, "leads")
      -> WebAppInfo(url="{tma_url}/leads")

TMA:  useDeepLink() reads startapp param
      -> maps "leads" -> "/leads" via START_PARAM_MAP
      -> navigate(route, { replace: true })
```

### v2.0 Deep Linking Requirements

| Trigger | Target | Method |
|---------|--------|--------|
| Reminder for lead | `/leads/{id}` | `WebAppInfo(url=...)` |
| Reminder for step | `/leads/{id}` (with step highlight) | `WebAppInfo(url=...)` with query param |
| "View Lead" after analysis | `/leads/{id}` | `WebAppInfo(url=...)` |
| Dashboard "needs action" | `/leads/{id}` | React Router `navigate()` |
| Grouped reminder | `/leads` (with "needs action" filter) | `WebAppInfo(url=...)` |

### Recommended Implementation

**For bot-sent messages:** Use `WebAppInfo(url=f"{tma_url}/leads/{lead_id}")`. This is the simplest approach and works because BrowserRouter handles the path directly. No changes to `useDeepLink` needed.

**For step-specific highlighting:** Use query params: `WebAppInfo(url=f"{tma_url}/leads/{lead_id}?step={step_id}")`. The `LeadDetail` component reads the query param and auto-scrolls to / highlights the relevant step.

**For `startapp`-based deep links** (external sharing, non-private-chat contexts): Extend `useDeepLink`:

```typescript
// Current: only maps simple strings
const START_PARAM_MAP = { leads: '/leads', ... };

// Extended: parse compound params
function parseStartParam(param: string): string {
  // Simple match first
  if (START_PARAM_MAP[param]) return START_PARAM_MAP[param];

  // Compound: leads__123 -> /leads/123
  const parts = param.split('__');
  if (parts[0] === 'leads' && parts[1]) {
    return `/leads/${parts[1]}`;
  }

  return '/';
}
```

### Sources & Confidence

- `WebAppInfo(url=...)` passes exact URL to TMA: [Telegram Bot API](https://core.telegram.org/bots/webapps) -- HIGH confidence
- `startapp` only allows A-Z, a-z, 0-9, _, -: [Start Parameter docs](https://docs.telegram-mini-apps.com/platform/start-parameter) -- HIGH confidence
- Existing `add_open_in_app_row()` already uses this pattern with paths: verified in `bot/utils_tma.py` -- HIGH confidence

---

## 8. Recommended TMA Route Structure for v2.0

### Current Routes

```
/                  -> Dashboard
/leads             -> Lead list
/leads/:leadId     -> Lead detail
/learn/*           -> Learning
/train/*           -> Training
/support/*         -> Support
/casebook/*        -> Casebook
/profile           -> Profile
/admin/*           -> Admin
```

### v2.0 Additions

```
/leads/:leadId              -> Lead detail (enhanced with plan-first layout)
/leads/:leadId?step=3       -> Lead detail with step 3 highlighted
/leads?filter=needs-action   -> Lead list filtered to overdue steps
```

No new top-level routes needed. The existing `/leads/*` wildcard covers everything. The enhancements are within the existing route structure using query params and component-level logic.

---

## 9. Implications for Roadmap

### Recommended Phase Structure

**Phase A: Enhanced Followup & Reminder System (Bot-side)**
- Upgrade `followup_scheduler.py` with rich inline buttons
- Add `WebAppInfo` deep links in reminder messages
- Implement Done/Snooze/Stop callback handlers
- Add step-aware reminder content
- Add `needs_reanalysis` column
- Add `last_reminded_at` column
- Estimated: Medium complexity

**Phase B: TMA Lead Thread Experience**
- Restructure `LeadDetail` with plan-first layout (Active Plan / Intelligence / Activity)
- Add interactive step completion in TMA
- Add step-specific highlighting via query params
- Add engagement plan progress indicators to `LeadCard`
- Add "Needs Action" filter to lead list
- Add pipeline summary stats
- Estimated: Medium-High complexity

**Phase C: Dashboard "Today's Actions" Widget**
- Create `LeadActionsWidget` component
- Compute overdue/due-today steps from engagement plans
- Add to Dashboard page
- Estimated: Low-Medium complexity

**Phase D: Re-Analysis Loop**
- TMA: Context update form triggers `needs_reanalysis` flag
- Bot: Re-analysis worker polls for flagged leads
- Bot: Runs re-analysis pipeline with accumulated context
- TMA: Smart polling to detect updated results
- Estimated: Medium-High complexity (requires new pipeline variant)

### Ordering Rationale

1. **Followup system first** -- It is the foundation. Without rich reminders linking to the TMA, users have no reason to open the TMA for lead management.
2. **TMA lead thread second** -- Once users are being driven to the TMA via reminders, the lead detail page must be ready with the plan-first layout.
3. **Dashboard widget third** -- This is a convenience layer on top of the existing lead system. It aggregates data that already exists.
4. **Re-analysis loop last** -- It is the most complex (new pipeline variant, new data flow), and it depends on the other pieces working first.

### Phase-Specific Research Flags

- **Phase A (Followup):** Standard patterns, unlikely to need deeper research. The existing `followup_scheduler.py` is a solid base.
- **Phase B (TMA Lead Thread):** May need design iteration. The plan-first layout is a UX bet that should be validated with the user early.
- **Phase D (Re-Analysis):** Likely needs deeper research into how the existing strategist pipeline can accept "additional context" as input and produce incremental updates rather than full re-runs.

---

## 10. Pitfalls & Risks

### Critical

**Race conditions on engagement_plan JSONB:** If bot and TMA both modify the plan at the same time (user marks step done in TMA while bot processes the same step via callback), the last write wins and one update is lost.

*Mitigation:* Use step-level optimistic locking. Before updating, read the current plan, verify the step's status hasn't changed, then write. For v2.0 the risk is low (user is unlikely to simultaneously interact with bot callback AND TMA for the same step), but add an `engagement_plan_version` integer that increments on each write to detect stale reads.

### Moderate

**InsForge PostgREST partial update limitations:** The current code updates `engagement_plan` by replacing the entire JSONB array. PostgREST does not natively support JSON path updates. This means every step completion requires a full read-modify-write cycle.

*Mitigation:* This is fine for the current scale (< 50 leads per user, < 10 steps per plan). If it becomes a bottleneck, consider a separate `engagement_plan_steps` table with one row per step.

**TMA polling battery drain:** If many leads have active polling (`refetchInterval: 15000`), the TMA could drain battery and generate excessive API calls.

*Mitigation:* Only poll the currently-viewed lead (not all leads). Use conditional polling based on `updated_at` recency. Disable polling when the TMA is backgrounded (use TMA lifecycle events from `@telegram-apps/sdk-react`).

### Minor

**Deep link `startapp` character limitations:** The `startapp` param only allows `A-Za-z0-9_-`. Lead IDs are numeric, so this is fine. But if future deep links need to encode complex state (filters, multiple params), use `__` as delimiter and stay within the 512-char limit.

**Engagement plan step timing ambiguity:** Steps have a `timing` field (e.g., "Day 1", "Week 2") that is free-text, not a parseable date. Computing "overdue" status requires parsing this text, which is fragile.

*Mitigation:* When the bot generates the engagement plan, also store a `due_date` ISO timestamp on each step. This makes overdue computation trivial and deterministic. This is a schema change that should happen in Phase A.

---

## 11. Architecture Decisions Needed

| Decision | Options | Recommendation | Needs User Input? |
|----------|---------|---------------|-------------------|
| Polling vs Realtime for data sync | Polling / InsForge Realtime / SSE | Polling with conditional refetchInterval | No |
| Lead detail layout | Tabs vs Sections vs Accordion | Plan-first with collapsible Intelligence section | Yes (UX preference) |
| Reminder cadence | Fixed 3-day / Escalating / Per-step timing | Escalating + per-step `due_date` | No |
| Kanban vs Filter bar for pipeline | Full Kanban columns / Horizontal filter tabs | Filter tabs (better for small TMA viewport) | Yes (UX preference) |
| Re-analysis trigger | TMA flag in DB / TMA calls bot API / Manual bot command | DB flag (simplest, no new infra) | No |
| Step completion source of truth | engagement_plan JSONB / Separate steps table | JSONB for now, migrate to table if scale demands | No |
| Step due dates | Parse timing text / Store explicit due_date | Explicit due_date on each step (schema change) | No |

---

## Sources

### Official Documentation (HIGH confidence)
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)
- [Telegram Start Parameter](https://docs.telegram-mini-apps.com/platform/start-parameter)
- [Telegram Deep Links](https://core.telegram.org/api/links)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [aiogram Deep Linking](https://docs.aiogram.dev/en/latest/utils/deep_linking.html)

### Industry Research (MEDIUM confidence)
- [CRM UX Design 2025 (Yellow Slice)](https://yellowslice.in/bed/crm-ux-design-in-2025-what-works-what-fails-and-whats-next/)
- [Best Mobile CRM Apps (Streak)](https://www.streak.com/post/best-mobile-crm-apps-for-teams)
- [Best Mobile CRM (Capsule)](https://capsulecrm.com/blog/best-mobile-crm/)
- [CRM Dashboard Examples (monday.com)](https://monday.com/blog/crm-and-sales/sales-dashboard-templates/)
- [SaaS CRM Design Trends 2025 (eSEOspace)](https://eseospace.com/blog/saas-crm-design-trends-for-2025/)
- [CRM Design Best Practices (Aufait UX)](https://www.aufaitux.com/blog/crm-ux-design-best-practices/)
- [Visual Hierarchy in CRM Dashboards (eSEOspace)](https://eseospace.com/blog/designing-with-data-visual-hierarchy-in-crm-dashboards/)

### Codebase References (HIGH confidence)
- `bot/services/followup_scheduler.py` -- Current reminder system
- `bot/handlers/leads.py` -- Bot lead management with inline keyboards
- `bot/handlers/support.py` -- Lead creation and enrichment flow
- `bot/utils_tma.py` -- WebAppInfo button helper
- `bot/storage/models.py` -- LeadRegistryModel schema
- `packages/webapp/src/features/leads/` -- TMA lead components and hooks
- `packages/webapp/src/shared/hooks/useDeepLink.ts` -- Current deep link routing
- `packages/webapp/src/app/Router.tsx` -- TMA route structure
