# Research: Engagement Plan Executor

**Domain:** Telegram bot + TMA scheduled engagement coaching system
**Researched:** 2026-02-05
**Overall Confidence:** MEDIUM-HIGH

---

## Executive Summary

The Engagement Plan Executor transforms Deal Quest's passive engagement plans (JSONB arrays of steps stored on `lead_registry`) into an active coaching system that pings users via Telegram when each step is due, provides contextual draft messages, and tracks execution progress in the TMA.

The core challenge is implementing a reliable scheduling system within the constraints of the existing architecture: a single-process Python aiogram 3 bot using InsForge (PostgREST over PostgreSQL) as its only persistent store, deployed on Railway. The bot has no direct SQL access -- all DB operations go through the InsForge HTTP API.

**Recommended approach:** PostgreSQL-backed polling scheduler (extending the existing `followup_scheduler.py` pattern) rather than APScheduler with persistent job stores. The rationale is that APScheduler's `SQLAlchemyJobStore` requires a direct SQL connection (SQLAlchemy engine), which the project doesn't have -- InsForge is accessed via HTTP/PostgREST only. Building on the existing polling loop pattern that already works in production is the pragmatic choice.

**Key finding:** The existing `followup_scheduler.py` already implements 80% of the scheduling pattern needed. The main work is: (1) adding per-step scheduling granularity instead of per-lead, (2) parsing AI-generated timing strings into concrete datetimes, (3) building the inline-button interaction flow for step completion, and (4) adding progress visualization to the TMA.

---

## 1. Scheduling System

### 1.1 Options Evaluated

| Approach | Fits Our Architecture? | Pros | Cons |
|---|---|---|---|
| **APScheduler + SQLAlchemyJobStore** | NO - requires SQLAlchemy engine | Industry standard, mature, built-in persistence | Needs direct SQL connection, adds SQLAlchemy dependency, pickle-based serialization |
| **APScheduler + MemoryJobStore** | PARTIAL - works but no persistence | Simple integration with asyncio | Jobs lost on restart, defeats the purpose |
| **PostgreSQL polling loop (current pattern)** | YES | Already works, uses existing InsForge client, survives restarts natively | Polling interval = latency floor, slightly more DB queries |
| **PGQueuer / Procrastinate** | NO - requires asyncpg/psycopg3 | Purpose-built job queues | Direct SQL driver required, heavy for our needs |
| **Celery + Redis** | NO - new infrastructure | Distributed, battle-tested | Massive overkill, requires Redis, new infra |
| **taskiq-aiogram** | MAYBE - but overkill | Designed for aiogram integration | Adds message broker dependency, over-engineering |

### 1.2 Recommendation: Enhanced Polling Scheduler

**Confidence: HIGH** (based on existing working code)

Extend the current `followup_scheduler.py` pattern with a new dedicated scheduler for engagement plan steps. The approach:

1. **New `scheduled_reminders` table** stores individual step reminders with concrete `due_at` timestamps
2. **Background polling loop** (like the existing one) runs every ~15 minutes, queries for due reminders, sends Telegram messages
3. **On plan creation**, a function converts AI timing strings to concrete datetimes and inserts reminder rows
4. **On step completion/snooze**, the reminder row is updated accordingly

This approach works because:
- The existing `followup_scheduler.py` pattern is proven in production
- It uses only the InsForge PostgREST API (no new dependencies)
- Schedules survive bot restarts (stored in PostgreSQL)
- No pickle serialization concerns
- Polling interval of 15 minutes is acceptable for "Day 1", "After 3 days" granularity (these aren't second-precise)

**Trade-off:** A 15-minute polling interval means reminders fire within a 15-minute window of their scheduled time. For daily-granularity engagement steps ("Day 1", "After 3 days"), this is perfectly fine. If sub-minute precision were needed (it isn't), we'd need APScheduler with an in-memory store as a cache layer on top of DB persistence.

### 1.3 Timing String Parsing

**Confidence: MEDIUM** (custom regex + fallback is straightforward, but AI output format varies)

The AI generates timing strings like "Day 1", "After 3 days", "1 week later", "Immediately", "Day 3-5". These need to be converted to concrete `datetime` values relative to the plan creation date.

**Recommended approach: Custom regex parser, NOT a library.**

Rationale against `dateparser` / `human-date-parser`:
- These libraries parse phrases like "3 days ago" or "next Tuesday" -- they expect natural language relative to NOW
- Our timing strings are relative to plan creation, not the current moment
- The format is semi-structured (AI-generated but from a prompt that requests specific formats)
- A focused regex parser is more predictable and testable than a general NLP library
- Zero new dependencies

**Proposed parser logic:**

```python
import re
from datetime import datetime, timedelta, timezone

TIMING_PATTERNS = [
    (r"(?:immediately|right away|now|day\s*0)", timedelta(hours=0)),
    (r"day\s*1", timedelta(days=1)),
    (r"day\s*(\d+)(?:\s*-\s*\d+)?", lambda m: timedelta(days=int(m.group(1)))),
    (r"(?:after\s+)?(\d+)\s*(?:day|d)s?\s*(?:later)?", lambda m: timedelta(days=int(m.group(1)))),
    (r"(?:after\s+)?(\d+)\s*(?:week|w)s?\s*(?:later)?", lambda m: timedelta(weeks=int(m.group(1)))),
    (r"(?:after\s+)?(\d+)\s*(?:month|mo)s?\s*(?:later)?", lambda m: timedelta(days=int(m.group(1)) * 30)),
]

def parse_timing(timing_str: str, base_date: datetime) -> datetime:
    """Convert AI timing string to concrete datetime."""
    text = timing_str.lower().strip()
    for pattern, delta in TIMING_PATTERNS:
        match = re.search(pattern, text)
        if match:
            if callable(delta):
                resolved = delta(match)
            else:
                resolved = delta
            return base_date + resolved
    # Fallback: 3 days from base
    return base_date + timedelta(days=3)
```

The prompt for engagement plan generation should be updated to request structured timing (e.g., always include a `delay_days` integer alongside the human-readable `timing` string). This makes parsing deterministic.

### 1.4 Timezone Handling

**Confidence: HIGH**

The bot currently operates in UTC throughout (see `datetime.now(timezone.utc)` everywhere). For engagement reminders:

- **Store all times in UTC** (current pattern, keep it)
- **Send reminders based on UTC schedule** -- for "Day 1" type granularity, timezone precision is not critical
- **Future enhancement (post-v2.0):** Add user timezone to the `users` table and adjust reminder delivery windows to be within the user's business hours (e.g., 9am-6pm local). This is a nice-to-have, not a blocker.

For v2.0, the recommendation is: keep UTC-only. The timing granularity is in days, not hours. A reminder sent at 14:00 UTC vs 09:00 local time is acceptable for a first version.

---

## 2. Step Completion Flow (Bot UX)

### 2.1 Reminder Message Design

**Confidence: HIGH** (inline keyboards are well-understood in aiogram 3)

When a step is due, the bot sends a message like:

```
[bell] Step 2 Due: [Lead Name]

[description of the step]

[draft message preview, first 200 chars]

[Done] [Snooze 1d] [Snooze 3d] [Skip] [View Full Draft]
```

**Inline keyboard layout** (max 3 buttons per row per Telegram UX best practices):

```
Row 1: [Done checkmark] [Snooze 1d] [Snooze 3d]
Row 2: [Skip] [View Draft] [View Lead]
```

Callback data format: `eplan:{action}:{reminder_id}` where action is `done`, `snooze1`, `snooze3`, `skip`, `draft`, `lead`.

**Important constraint:** Telegram limits `callback_data` to 64 bytes. Using numeric IDs (not UUIDs) keeps this well within limits. Example: `eplan:done:12345` = 16 bytes.

### 2.2 Completion Actions

| Action | What Happens | DB Changes |
|---|---|---|
| **Done** | Mark step complete, congratulate user, advance to next step context | `scheduled_reminders.status = 'completed'`, `engagement_plan[step].status = 'done'`, `engagement_plan[step].completed_at = now` |
| **Snooze 1d** | Reschedule for tomorrow | `scheduled_reminders.due_at += 1 day`, `scheduled_reminders.snooze_count += 1` |
| **Snooze 3d** | Reschedule for 3 days later | `scheduled_reminders.due_at += 3 days`, `scheduled_reminders.snooze_count += 1` |
| **Skip** | Mark step skipped, move on | `scheduled_reminders.status = 'skipped'`, log in activity |
| **View Draft** | Show full contextual draft message | No DB changes, display only |
| **View Lead** | Deep-link to lead detail in TMA or show in bot | No DB changes |

### 2.3 Escalation Logic

**Confidence: MEDIUM** (UX design decision, not technical constraint)

If the user doesn't respond to a reminder:

1. **T+0 hours:** Initial reminder (the scheduled one)
2. **T+24 hours:** Gentle follow-up ("Hey, step 2 for [Lead Name] is still pending. Ready to tackle it?")
3. **T+72 hours:** Final nudge ("This step is 3 days overdue. Want to snooze, skip, or mark done?")
4. **After 3 nudges:** Auto-snooze 7 days, log as "auto-snoozed" in activity

This prevents the bot from becoming annoying while still being proactive. The escalation state is tracked via `scheduled_reminders.reminder_count` and `scheduled_reminders.last_reminded_at`.

### 2.4 FSM State Considerations

The current `LeadEngagementState` StatesGroup handles context-adding and screenshot flows via FSM states. The reminder interaction flow does NOT need FSM states because it uses inline keyboards (callback queries), not message-based input. This is cleaner -- the user can interact with reminders without disrupting any ongoing conversation.

The one exception: if we add a "View Full Draft" flow that lets the user edit the draft before sending, that would need an FSM state. For v2.0, recommend keeping it read-only (copy draft) to avoid FSM complexity.

---

## 3. Contextual Draft Messages

### 3.1 Draft Generation Strategy

**Confidence: HIGH** (leverages existing `EngagementService` patterns)

When the engagement plan is created, each step already has a `suggested_text` field. The question is whether to:

**(A) Generate all drafts at plan creation time** -- store in `suggested_text`
**(B) Generate drafts on-demand when each step is due** -- call LLM at reminder time

**Recommendation: Hybrid approach.**

- At plan creation: Generate initial `suggested_text` for each step (already happening)
- At reminder time: If the lead has new context (activities logged, status changed since plan creation), regenerate the draft incorporating the new context
- If no new context: Use the pre-generated `suggested_text`

This balances cost (fewer LLM calls) with quality (context-aware drafts when context has changed).

### 3.2 Draft Regeneration

The existing `EngagementService.generate_advice()` method already accepts lead context, activities, and new context. A new method `generate_step_draft()` would be similar but focused on generating a specific outreach message for a specific step:

```python
async def generate_step_draft(
    self,
    lead: LeadRegistryModel,
    step: dict,
    activities: list[LeadActivityModel],
    research: str | None = None,
) -> str:
    """Generate a context-aware draft message for a specific engagement step."""
    # Include step description, lead analysis, recent activities, web research
    # Return a ready-to-send message the user can copy
```

### 3.3 Copy-to-Clipboard in Telegram

**Confidence: HIGH**

Telegram bots cannot directly copy text to clipboard. The options are:

1. **Send as a separate message** -- user long-presses to copy (most reliable)
2. **Send as code block** -- wrapping in backticks makes it easier to select
3. **Deep-link to TMA** -- where clipboard API works (`navigator.clipboard.writeText()`)

**Recommendation:** Send the draft as a plain message (not inline/edited). Users know how to long-press and copy in Telegram. Add a "Open in App" button that deep-links to the TMA lead detail where the copy button exists (already implemented in `LeadDetail.tsx`).

---

## 4. Progress Tracking in TMA

### 4.1 Current State of TMA Lead UI

The TMA already has:
- `LeadList` component with status badges and filtering
- `LeadDetail` component with engagement plan display (step cards with status badges)
- `ActivityTimeline` component showing activity history
- `LeadNotes` component for note management
- `LeadStatusSelector` for status progression

The engagement plan section in `LeadDetail.tsx` (lines 377-408) already renders steps with step numbers, descriptions, timing, and done/pending badges. This is a solid foundation.

### 4.2 UI Enhancements Needed

**Confidence: MEDIUM** (UX design choices, technically straightforward)

#### 4.2.1 Enhanced Engagement Plan Section

Transform the current flat step list into a visual timeline:
- Vertical timeline with connecting lines between steps
- Color-coded step states: green (done), blue (current/due), yellow (upcoming), red (overdue), gray (skipped)
- Due date displayed alongside timing string
- "Overdue by X days" badge for past-due steps
- Expand/collapse for suggested text per step

**Implementation:** Custom CSS with Tailwind, no library needed. The existing step card layout just needs timeline connectors and color states. This matches the project's "custom branded design, not generic" philosophy.

#### 4.2.2 Multi-Lead Dashboard Enhancements

Add to the `LeadList` view:
- **Active plans indicator:** Show how many active engagement plans exist across all leads
- **Overdue counter:** "3 steps overdue across 2 leads" alert banner
- **Quick filters:** "Has active plan", "Has overdue steps", "No plan"
- **Sort by:** "Next due step" option to surface the most urgent leads

**Implementation:** Extend the existing `useLeads` hook to compute plan-level aggregates from the existing `engagement_plan` JSONB data. No new API calls needed -- the data is already in the lead rows.

#### 4.2.3 Step Completion from TMA

Allow marking steps done directly in the TMA (not just via bot inline buttons):
- Tap a pending step to expand it
- "Mark Done" / "Skip" buttons
- Optimistic update with InsForge PATCH on the `lead_registry.engagement_plan` JSONB
- This should also update the `scheduled_reminders` table (via a new InsForge edge function or by having the bot poll for changes)

**Caveat:** Keeping bot reminders and TMA step state in sync requires either:
- **(A) Single source of truth in `scheduled_reminders`** -- TMA updates go to `scheduled_reminders`, bot reads from there
- **(B) Dual update** -- TMA updates both `engagement_plan` JSONB and `scheduled_reminders`
- **(C) Bot polls `engagement_plan` JSONB** -- bot detects manual completions and cancels corresponding reminders

**Recommendation: (B) Dual update.** The TMA PATCHes both the engagement plan step status on `lead_registry` and the corresponding `scheduled_reminders` row. This keeps both in sync without polling overhead. The `scheduled_reminders` table is the authority for "should I send a reminder?", while `engagement_plan` JSONB remains the display/history record.

---

## 5. Database Schema Changes

### 5.1 New Table: `scheduled_reminders`

**Confidence: HIGH**

```sql
CREATE TABLE scheduled_reminders (
    id              SERIAL PRIMARY KEY,
    lead_id         INTEGER NOT NULL REFERENCES lead_registry(id) ON DELETE CASCADE,
    telegram_id     BIGINT NOT NULL,
    step_id         INTEGER NOT NULL,            -- matches engagement_plan[].step_id
    due_at          TIMESTAMPTZ NOT NULL,         -- when to send reminder
    status          TEXT NOT NULL DEFAULT 'pending',  -- pending | sent | completed | skipped | auto_snoozed
    snooze_count    INTEGER NOT NULL DEFAULT 0,
    reminder_count  INTEGER NOT NULL DEFAULT 0,   -- how many times we've pinged about this step
    last_reminded_at TIMESTAMPTZ,                 -- last time we sent a reminder
    draft_text      TEXT,                         -- cached draft message (regenerated if context changes)
    draft_generated_at TIMESTAMPTZ,              -- when draft was last generated
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for the polling query
CREATE INDEX idx_scheduled_reminders_due
    ON scheduled_reminders(due_at)
    WHERE status = 'pending' OR status = 'sent';

-- Index for lead-specific lookups
CREATE INDEX idx_scheduled_reminders_lead
    ON scheduled_reminders(lead_id, step_id);
```

### 5.2 Modifications to Existing Schema

**`lead_registry` table -- no schema changes needed.** The `engagement_plan` JSONB column already supports the step structure. We just need to ensure the engagement plan prompt generates a `delay_days` integer field alongside `timing` for deterministic scheduling.

**`lead_activity_log` table -- add new activity types:**
- `step_reminder_sent` -- when a reminder was dispatched
- `step_completed` -- when user marked step done
- `step_skipped` -- when user skipped a step
- `step_snoozed` -- when user snoozed a step
- `plan_activated` -- when reminders were scheduled for a plan
- `plan_completed` -- when all steps in a plan are done/skipped

These are just new values for the existing `activity_type` text column -- no schema migration needed.

### 5.3 Enhanced Engagement Plan Step Format

Update the AI prompt to generate steps with an additional `delay_days` field:

```json
{
    "step_id": 1,
    "description": "Send initial connection request with personalized note",
    "timing": "Day 1",
    "delay_days": 1,
    "status": "pending",
    "suggested_text": "Hi [Name], I noticed...",
    "channel": "linkedin",
    "completed_at": null
}
```

The `delay_days` integer makes scheduling deterministic (no parsing needed as primary source). The `timing` string remains for human display. The `channel` field (linkedin, email, phone, other) helps the draft generator tailor the message format.

### 5.4 User Preferences (Optional, Future)

For future consideration (not v2.0):

```sql
ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'UTC';
ALTER TABLE users ADD COLUMN reminder_hour INTEGER DEFAULT 9;  -- preferred hour for reminders (local time)
ALTER TABLE users ADD COLUMN reminder_enabled BOOLEAN DEFAULT true;
```

---

## 6. Architecture Decisions

### 6.1 Component Boundaries

```
+------------------+       +---------------------+       +------------------+
|  Engagement      |       |  Reminder           |       |  TMA Webapp      |
|  Plan Generator  |------>|  Scheduler          |       |  (React)         |
|  (existing)      |       |  (new bg loop)      |       |                  |
+------------------+       +---------------------+       +------------------+
        |                          |                            |
        | Creates plan +           | Polls DB every 15min       | Reads plans,
        | inserts reminders        | Sends Telegram messages    | updates step status,
        |                          | Handles callbacks          | shows progress
        v                          v                            v
+---------------------------------------------------------------+
|                     InsForge (PostgreSQL)                       |
|  lead_registry (engagement_plan JSONB)                         |
|  scheduled_reminders (new table)                               |
|  lead_activity_log (activity tracking)                         |
+---------------------------------------------------------------+
```

### 6.2 Data Flow

1. **Plan Creation** (existing support pipeline):
   - User submits prospect -> Strategist agent generates analysis, strategy, engagement plan
   - `EngagementService.generate_plan()` creates plan steps
   - **NEW:** After plan is stored on `lead_registry`, a `schedule_plan_reminders()` function:
     - Parses each step's `delay_days` (or `timing` as fallback)
     - Creates `scheduled_reminders` rows with concrete `due_at` timestamps
     - Logs `plan_activated` activity

2. **Reminder Dispatch** (new background loop):
   - Every 15 minutes, poll `scheduled_reminders` for `due_at <= now AND status IN ('pending', 'sent')`
   - For each due reminder:
     - If `status = 'pending'`: Send initial reminder message with inline buttons, set `status = 'sent'`
     - If `status = 'sent'` and `last_reminded_at` is stale: Send escalation nudge, increment `reminder_count`
   - Optionally regenerate draft if lead context has changed since `draft_generated_at`

3. **User Interaction** (callback query handlers):
   - User taps inline button -> callback handler processes action
   - Updates `scheduled_reminders` status and `lead_registry.engagement_plan` JSONB
   - Logs activity to `lead_activity_log`

4. **TMA Display** (React frontend):
   - `LeadDetail` reads `engagement_plan` from `lead_registry` (already working)
   - **NEW:** Also reads from `scheduled_reminders` for due dates and reminder status
   - **NEW:** Timeline view with overdue indicators
   - **NEW:** Multi-lead overview with active plan aggregates

### 6.3 New Files / Modules

| File | Purpose |
|---|---|
| `bot/services/plan_scheduler.py` | Schedule reminders for a plan, timing parser, reminder dispatch loop |
| `bot/handlers/reminders.py` | Callback handlers for reminder inline buttons (done/snooze/skip) |
| `bot/storage/repositories.py` (extend) | `ScheduledReminderRepo` class |
| `bot/storage/models.py` (extend) | `ScheduledReminderModel` Pydantic model |
| `insforge/migrations/xxx_scheduled_reminders.sql` | New table migration |
| `packages/webapp/src/features/leads/components/EngagementTimeline.tsx` | Enhanced timeline view |
| `packages/webapp/src/features/leads/hooks/useScheduledReminders.ts` | Hook to fetch reminder data |

---

## 7. Pitfalls and Risks

### 7.1 Critical Pitfalls

#### Pitfall: Duplicate Reminders on Bot Restart
**What goes wrong:** If the bot restarts mid-polling-cycle, it could re-process reminders that were already sent but not yet marked as sent (race condition).
**Prevention:** Use `last_reminded_at` timestamp as a guard. Before sending, check `last_reminded_at` is either NULL or older than the polling interval. Also update `last_reminded_at` BEFORE sending the message (optimistic lock pattern).

#### Pitfall: JSONB + Separate Table Desync
**What goes wrong:** `engagement_plan` JSONB on `lead_registry` says step is "pending" but `scheduled_reminders` says "completed", or vice versa.
**Prevention:** Always update both atomically. Since InsForge doesn't support transactions via PostgREST, we accept eventual consistency: update `scheduled_reminders` first (authoritative for scheduling), then update `engagement_plan` JSONB (authoritative for display). Log activity for audit trail. If inconsistency detected during polling, self-heal by reconciling.

#### Pitfall: AI Timing Strings Are Unpredictable
**What goes wrong:** The AI generates "ASAP", "When ready", "Before their Q4 planning", or other unstructured timing that regex cannot parse.
**Prevention:** (1) Update the engagement plan prompt to always include `delay_days` integer. (2) Implement fallback: if `delay_days` is missing, try regex on `timing` string. (3) If both fail, default to 3-day intervals. (4) Log unparseable timings for prompt improvement.

### 7.2 Moderate Pitfalls

#### Pitfall: Polling Interval vs. User Expectations
**What goes wrong:** User expects reminder exactly at "Day 3" but it arrives up to 15 minutes late.
**Prevention:** This is fine for daily-granularity scheduling. Document the behavior. If needed, reduce polling to 5 minutes (still lightweight for a few hundred leads).

#### Pitfall: Bot Rate Limits
**What goes wrong:** If many reminders are due at once (e.g., multiple leads all created on the same day), the bot hits Telegram's rate limits (30 messages/second to different chats, but 1 message/second to the same chat).
**Prevention:** Add a small delay (0.5s) between sends within the same user. Given the small user base, this is unlikely to be an issue but easy to add.

#### Pitfall: Overloading Users with Reminders
**What goes wrong:** User has 10 active leads, each with 5-step plans = 50 pending reminders. Bot becomes spammy.
**Prevention:** (1) Limit to sending at most 3 reminders per user per polling cycle. (2) Batch remaining into a digest message. (3) Allow users to pause all reminders per lead or globally.

### 7.3 Minor Pitfalls

#### Pitfall: Stale Drafts
**What goes wrong:** Draft was generated at plan creation, but by the time the step is due, the prospect situation has changed.
**Prevention:** Check if `lead_activity_log` has new entries since `draft_generated_at`. If yes, regenerate. If no, use cached draft.

#### Pitfall: Deleted Leads with Active Reminders
**What goes wrong:** User deletes a lead but reminders keep firing.
**Prevention:** `ON DELETE CASCADE` on the foreign key handles this at the DB level. Also, the polling loop should gracefully handle missing leads.

---

## 8. Implications for Roadmap

### Recommended Phase Structure

Based on this research, the Engagement Plan Executor should be broken into sub-phases:

**Sub-phase A: Scheduling Infrastructure**
- Create `scheduled_reminders` table
- Build `ScheduledReminderRepo` and `ScheduledReminderModel`
- Implement timing parser (`delay_days` primary, regex fallback)
- Wire plan creation to schedule reminders
- Build the polling scheduler loop (extend `followup_scheduler.py` pattern)
- Estimated complexity: Medium

**Sub-phase B: Bot Reminder UX**
- Build reminder message templates with inline keyboards
- Implement callback handlers (done/snooze/skip)
- Add escalation logic (gentle -> urgent -> auto-snooze)
- Update `engagement_plan` JSONB on step completion
- Log all actions to `lead_activity_log`
- Estimated complexity: Medium

**Sub-phase C: Contextual Drafts**
- Add `generate_step_draft()` to `EngagementService`
- Implement draft caching and regeneration logic
- "View Full Draft" button in reminder messages
- Estimated complexity: Low-Medium

**Sub-phase D: TMA Progress UI**
- Enhanced engagement plan timeline in `LeadDetail`
- Overdue indicators and due date display
- Multi-lead active plan overview in `LeadList`
- Step completion from TMA (dual update pattern)
- Estimated complexity: Medium

### Phase Ordering Rationale

A -> B -> C -> D is the natural dependency chain:
- A must come first (scheduling infrastructure is the foundation)
- B depends on A (can't handle completions without reminders)
- C can technically be done in parallel with B but benefits from B being tested first
- D can start once B is working (TMA needs to display what the bot creates)

### Research Flags for Later Phases

- **Sub-phase C (Contextual Drafts):** May need research into prompt engineering for per-channel drafts (LinkedIn vs email vs phone scripts). The current `EngagementService` prompt structure should be reviewed.
- **Sub-phase D (TMA Progress UI):** May need lightweight research into the best way to query `scheduled_reminders` from the TMA (direct InsForge query or via a computed view).

---

## 9. Dependencies and Compatibility

### No New Python Dependencies Needed

The entire scheduling system can be built with:
- `asyncio` (already used)
- `datetime` / `re` (stdlib)
- Existing `InsForgeClient` for DB operations
- Existing aiogram `Bot` and callback handler patterns

This is a significant advantage. No APScheduler, no SQLAlchemy, no Celery, no Redis.

### TMA Dependencies

No new dependencies needed. The existing React + TanStack Query + InsForge SDK stack handles:
- Fetching `scheduled_reminders` data
- Optimistic updates for step completion
- Timeline rendering with Tailwind CSS

### Database

One new migration: `scheduled_reminders` table creation. No changes to existing tables. New activity types are just new string values in the existing `activity_type` column.

---

## 10. Alternative Approaches Considered but Rejected

### APScheduler with In-Memory Store + DB Persistence Layer
Idea: Use APScheduler's `AsyncIOScheduler` with `MemoryJobStore` for precision timing, but sync to/from a DB table on startup/shutdown.
**Rejected because:** Adds complexity without proportional benefit. The 15-minute polling granularity is sufficient for daily-step engagement plans. APScheduler's value is sub-minute precision, which we don't need.

### InsForge Realtime (WebSocket) for Instant Reminder Delivery
Idea: Use InsForge's realtime feature to push reminders to the bot when `due_at` passes.
**Rejected because:** InsForge realtime is designed for frontend-to-backend push, not for triggering server-side bot actions. The bot would need a WebSocket listener, which is more fragile than a polling loop for this use case.

### Separate Reminder Microservice
Idea: Build a small FastAPI service that handles scheduling, separate from the bot.
**Rejected because:** Adds deployment complexity (another Railway service), more infrastructure to maintain, and the bot can handle this workload easily given the small user base.

---

## Sources

### Authoritative (HIGH confidence)
- Existing codebase: `bot/services/followup_scheduler.py` -- proven polling pattern
- Existing codebase: `bot/storage/insforge_client.py` -- PostgREST API constraints
- Existing codebase: `packages/webapp/src/features/leads/` -- current TMA implementation
- [Telegram Bot API - Buttons](https://core.telegram.org/api/bots/buttons) -- inline keyboard constraints
- [Telegram Bot Features](https://core.telegram.org/bots/features) -- callback_data 64-byte limit

### Verified (MEDIUM confidence)
- [APScheduler 3.x User Guide](https://apscheduler.readthedocs.io/en/3.x/userguide.html) -- SQLAlchemyJobStore requires direct SQL connection
- [APScheduler SQLAlchemyJobStore docs](https://apscheduler.readthedocs.io/en/3.x/modules/jobstores/sqlalchemy.html) -- persistence mechanics
- [aiogram GitHub Discussion #1362](https://github.com/aiogram/aiogram/discussions/1362) -- Telegram Bot API has no native scheduling
- [dateparser PyPI](https://pypi.org/project/dateparser/) -- NLP date parsing library
- [PGQueuer](https://github.com/janbjorge/pgqueuer) -- PostgreSQL job queue (requires direct SQL)
- [Procrastinate](https://github.com/procrastinate-org/procrastinate) -- PostgreSQL task queue (requires psycopg3)

### WebSearch-only (LOW confidence, for context)
- [Telegram Inline Keyboard UX Design Guide](https://wyu-telegram.com/blogs/444/) -- performance benchmarks for inline buttons
- [Sales Engagement Platforms overview](https://www.outreach.io/platform/sales-engagement) -- industry UX patterns for step execution
- [Sales Engagement Tools 2026](https://forecastio.ai/blog/best-sales-engagement-software) -- market context
