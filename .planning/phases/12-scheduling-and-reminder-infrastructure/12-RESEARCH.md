# Phase 12: Scheduling & Reminder Infrastructure - Research

**Researched:** 2026-02-05
**Domain:** PostgreSQL-based polling scheduler for engagement plan step reminders (Python aiogram 3 bot)
**Confidence:** HIGH

## Summary

Phase 12 turns passive engagement plans (JSONB arrays on `lead_registry`) into active scheduling infrastructure. The bot must: (1) create a `scheduled_reminders` table with per-step rows, (2) update the engagement plan prompt to emit `delay_days` integers, (3) parse timing into concrete `due_at` timestamps, (4) run a polling loop that dispatches due reminders, and (5) prevent duplicates across bot restarts.

The research found that the existing codebase already provides ~80% of the patterns needed. The `followup_scheduler.py` background loop is the proven template for the new polling scheduler. The `InsForgeClient` provides all necessary PostgREST operations (query with filter operators, create, update). The `create_background_task()` utility handles GC-safe background task creation. No new Python dependencies are required.

The key decision -- already locked in STATE.md -- is to use PostgreSQL polling via the existing InsForge PostgREST API, not APScheduler or any other scheduling library. This is the right call: APScheduler's `SQLAlchemyJobStore` requires a direct SQL connection (not available), and the 15-minute polling granularity is perfectly fine for daily-granularity engagement steps.

**Primary recommendation:** Extend the existing `followup_scheduler.py` pattern into a new `plan_scheduler.py` module, create a `ScheduledReminderRepo` following the established repository pattern, update the engagement plan prompt to include `delay_days`, and wire the plan-to-reminders logic into the existing `_background_enrich_lead()` function in `support.py`.

## Standard Stack

### Core

No new libraries needed. The entire phase uses existing project dependencies:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| asyncio | stdlib | Background polling loop | Already used by `followup_scheduler.py` |
| datetime/re | stdlib | Timing parser | Zero dependencies, custom regex is more predictable than NLP libraries |
| httpx | (existing) | InsForge PostgREST calls via `InsForgeClient` | Already the project's HTTP client |
| pydantic | (existing) | `ScheduledReminderModel` data model | Matches all other models in `storage/models.py` |
| aiogram 3 | (existing) | `Bot.send_message()` for reminder dispatch | Already the bot framework |

### Supporting

No supporting libraries needed.

### Alternatives Considered

| Instead of | Could Use | Why Not |
|------------|-----------|---------|
| Custom regex timing parser | `dateparser` library | `dateparser` parses relative-to-now phrases ("3 days ago"); our timing is relative to plan creation date. Custom regex is simpler and more predictable for semi-structured AI output. |
| PostgreSQL polling | APScheduler with `SQLAlchemyJobStore` | Requires direct SQL connection (SQLAlchemy engine); project only has InsForge PostgREST access. Also adds heavy dependency for something the existing polling pattern handles. |
| PostgreSQL polling | APScheduler with `MemoryJobStore` | Jobs lost on restart -- defeats the purpose of persistent scheduling. |
| PostgreSQL polling | PGQueuer / Procrastinate | Require `asyncpg` or `psycopg3` direct SQL driver -- not available in this architecture. |
| PostgreSQL polling | InsForge Realtime (WebSocket) | Designed for frontend push, not server-side bot actions. WebSocket listener is more fragile than a polling loop. |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure

New/modified files:

```
bot/
  services/
    plan_scheduler.py         # NEW: timing parser + scheduling + polling loop
  storage/
    models.py                 # EXTEND: add ScheduledReminderModel
    repositories.py           # EXTEND: add ScheduledReminderRepo
  handlers/
    support.py                # MODIFY: wire plan scheduling into _background_enrich_lead()
  main.py                     # MODIFY: start plan scheduler background loop
prompts/
  engagement_plan.md          # MODIFY: add delay_days to output format
insforge/migrations/
  002_scheduled_reminders.sql # NEW: table + indexes + RLS + grants
```

### Pattern 1: Background Polling Loop (Existing, Proven)

**What:** An `async` infinite loop that polls the database at a fixed interval, processes due items, and sleeps.
**When to use:** When you need periodic background work on database-stored state in a single-process bot.
**Source:** `bot/services/followup_scheduler.py` (production code)

```python
# Existing pattern from followup_scheduler.py
async def start_followup_scheduler(bot, lead_repo, activity_repo):
    """Background loop that checks for due followups every 6 hours."""
    logger.info("Followup scheduler started (interval: %ds)", CHECK_INTERVAL_SECONDS)
    while True:
        try:
            await _process_due_followups(bot, lead_repo, activity_repo)
        except Exception as e:
            logger.error("Followup scheduler error: %s", e)
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)
```

The new plan scheduler will follow this exact pattern with a 15-minute interval (900 seconds).

### Pattern 2: Repository + Model (Existing, Proven)

**What:** Each database table gets a Pydantic model in `models.py` and a repository class in `repositories.py`.
**When to use:** For every new InsForge table.
**Source:** `bot/storage/repositories.py`, `bot/storage/models.py`

```python
# Model pattern (from models.py)
class ScheduledReminderModel(BaseModel):
    id: int | None = None
    lead_id: int
    telegram_id: int
    step_id: int
    due_at: str          # ISO timestamp
    status: str = "pending"  # pending | sent | completed | skipped | snoozed
    snooze_count: int = 0
    reminder_count: int = 0
    last_reminded_at: str | None = None
    draft_text: str | None = None
    completed_at: str | None = None
    created_at: str | None = None
    updated_at: str | None = None

# Repo pattern (from repositories.py)
class ScheduledReminderRepo:
    def __init__(self, client: InsForgeClient) -> None:
        self.client = client
        self.table = "scheduled_reminders"

    async def get_due_reminders(self, now_iso: str) -> list[ScheduledReminderModel]:
        """Get reminders where due_at <= now and status is pending."""
        rows = await self.client.query(
            self.table,
            filters={"due_at": f"lte.{now_iso}", "status": "in.(pending,sent)"},
            order="due_at.asc",
            limit=50,
        )
        ...
```

### Pattern 3: PostgREST Filter Operators (Existing)

**What:** The `InsForgeClient.query()` method supports PostgREST filter operators (eq, lte, in, etc.) via string prefixes.
**When to use:** For any filtered database query.
**Source:** `bot/storage/insforge_client.py` lines 15-18, 98-107

```python
# InsForge client already handles PostgREST operators
_POSTGREST_OPS = (
    "eq.", "neq.", "gt.", "gte.", "lt.", "lte.",
    "like.", "ilike.", "is.", "in.", "cs.", "cd.",
    "not.", "or.", "and.",
)

# Usage for polling query:
rows = await self.client.query(
    "scheduled_reminders",
    filters={
        "due_at": f"lte.{now_iso}",
        "status": "in.(pending,sent)",
    },
    order="due_at.asc",
    limit=50,
)
```

The `in.()` operator is critical for the polling query: `status=in.(pending,sent)` matches both new and already-sent (escalation) reminders.

### Pattern 4: Background Task Creation (Existing)

**What:** `create_background_task()` in `bot/task_utils.py` wraps `asyncio.create_task()` with GC prevention and error logging.
**When to use:** For any fire-and-forget async work.
**Source:** `bot/task_utils.py`

```python
# From main.py -- how the existing followup scheduler is started
if engagement_service:
    create_background_task(
        start_followup_scheduler(bot, lead_repo, activity_repo),
        name="followup_scheduler",
    )
```

The new plan scheduler will be started identically in `main.py`.

### Pattern 5: Engagement Plan Enrichment Hook (Existing)

**What:** After a lead is created, `_background_enrich_lead()` generates web research and an engagement plan. The scheduling wiring hooks into this function.
**When to use:** This is where plan-to-reminders logic gets wired in.
**Source:** `bot/handlers/support.py` lines 410-474

```python
# Current code in _background_enrich_lead():
plan = await engagement_service.generate_plan(lead, research)
if plan:
    next_followup = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    await lead_repo.update_lead(lead_id, engagement_plan=plan, next_followup=next_followup)

# After Phase 12, this becomes:
plan = await engagement_service.generate_plan(lead, research)
if plan:
    await lead_repo.update_lead(lead_id, engagement_plan=plan)
    # NEW: Schedule reminders for each plan step
    await schedule_plan_reminders(
        reminder_repo=reminder_repo,
        lead_id=lead_id,
        telegram_id=lead.telegram_id,
        plan_steps=plan,
        base_date=datetime.now(timezone.utc),
    )
```

### Anti-Patterns to Avoid

- **Don't store schedules in FSM state.** FSM state is per-user-session and ephemeral. Schedules must survive bot restarts, which means they must be in the database.
- **Don't use `next_followup` on `lead_registry` for per-step scheduling.** That field is a single timestamp per lead. The new `scheduled_reminders` table provides per-step granularity. The old `next_followup` field can be deprecated or kept for backward compat.
- **Don't update `scheduled_reminders` AFTER sending the Telegram message.** If the bot crashes between sending and updating, it will re-send on restart. Update `last_reminded_at` BEFORE calling `bot.send_message()` to prevent duplicates.
- **Don't try to use InsForge transactions.** PostgREST doesn't support multi-statement transactions. Accept eventual consistency between `scheduled_reminders` (scheduling authority) and `engagement_plan` JSONB (display authority). Update `scheduled_reminders` first, then the JSONB.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Polling loop | Custom thread/process | `asyncio.sleep()` in an async `while True` loop | The existing `followup_scheduler.py` pattern is proven. Threads add complexity. |
| Database retry | Custom retry decorator | Existing `InsForgeClient._request_with_retry()` | Already handles 429/500/502/503 with exponential backoff (Phase 11). |
| Background task GC | Bare `asyncio.create_task()` | `create_background_task()` from `bot/task_utils.py` | Already handles reference tracking + error logging (Phase 11). |
| Timing string parsing | `dateparser` library | Custom regex parser (10 patterns) | `dateparser` is designed for relative-to-now NLP parsing, not relative-to-base-date structured AI output. Custom regex is simpler, zero-dependency, and testable. |
| Activity logging | Custom code | Existing `LeadActivityRepo.create()` | Same repo pattern used everywhere for `lead_activity_log`. |

**Key insight:** This phase is almost entirely about wiring existing patterns together in a new configuration. The only genuinely new code is the timing parser and the polling query. Everything else follows proven patterns already in the codebase.

## Common Pitfalls

### Pitfall 1: Duplicate Reminders on Bot Restart

**What goes wrong:** Bot restarts mid-polling-cycle. A reminder was sent but `last_reminded_at` wasn't updated yet. Bot re-sends the same reminder.
**Why it happens:** The send-then-update sequence has a crash window. If the bot crashes after `bot.send_message()` but before the database update, the reminder appears unsent.
**How to avoid:** Update `last_reminded_at` BEFORE sending the Telegram message (optimistic update pattern). If the send fails, the reminder won't be re-attempted until the next polling cycle (15 min), which is acceptable. This is the standard "at-most-once" delivery guarantee, which is correct for user-facing notifications (better to miss one than spam).
**Warning signs:** Users reporting duplicate reminder messages, especially after deployments.

### Pitfall 2: AI Timing Strings Are Unpredictable

**What goes wrong:** The AI generates "ASAP", "When ready", "Before their Q4 planning", or "Day 3-5" -- timing that regex cannot cleanly parse.
**Why it happens:** LLMs are creative. Even with a structured prompt, they produce variations.
**How to avoid:** Three-layer approach: (1) Add `delay_days` integer to the prompt output format (primary, deterministic). (2) Parse `delay_days` first; fall back to regex on `timing` string only if `delay_days` is missing. (3) Default to 3-day spacing if both fail. (4) Log unparseable values for prompt tuning.
**Warning signs:** Reminders with wildly wrong due dates, or many reminders all scheduled at the same 3-day-default time.

### Pitfall 3: JSONB + Separate Table Desync

**What goes wrong:** `engagement_plan` JSONB on `lead_registry` says a step is "pending" but `scheduled_reminders` says "completed", or vice versa. Users see inconsistent state between bot and TMA.
**Why it happens:** PostgREST doesn't support multi-statement transactions. Updates to two tables happen as separate HTTP calls.
**How to avoid:** Establish a clear authority model. `scheduled_reminders` is the authority for "should I send a reminder?" The `engagement_plan` JSONB is the authority for "what do I display?" When a step is completed, update `scheduled_reminders` first, then JSONB. If the second update fails, the scheduler won't re-send (correct behavior), and the JSONB can be reconciled later. Phase 14 (Bot UX) handles the step completion flow that actually updates both.
**Warning signs:** Plan view in TMA showing different step status than bot reminders.

### Pitfall 4: PostgREST `lte` Filter Fragility

**What goes wrong:** The `due_at=lte.{now_iso}` filter fails or returns wrong results because of timestamp format mismatches.
**Why it happens:** The existing `get_due_followups()` method in `LeadRegistryRepo` already encountered this -- it has a fallback that fetches all rows and filters in Python (lines 411-450 of `repositories.py`).
**How to avoid:** Follow the same defensive pattern: try the PostgREST filter first, fall back to Python filtering if it fails. Ensure timestamps are always in ISO 8601 format with timezone (`datetime.now(timezone.utc).isoformat()`). The existing codebase already uses this format consistently.
**Warning signs:** Polling query returning empty results when reminders are clearly due.

### Pitfall 5: Plan Re-generation Overwrites Existing Reminders

**What goes wrong:** If a lead is re-analyzed (merged via dedup in `_run_support_pipeline()`), the engagement plan is regenerated and the old `scheduled_reminders` rows become orphaned or conflicting with new ones.
**How to avoid:** The `schedule_plan_reminders()` function must be idempotent. Before inserting new reminder rows, delete or mark-as-cancelled any existing pending reminders for that lead. Use a check: query existing reminders for the lead, cancel pending ones, then insert new ones. This is especially important because re-analysis (Phase 15) will regenerate plans.
**Warning signs:** Users getting reminders for old plan steps that no longer exist in the current plan.

### Pitfall 6: Telegram Rate Limits During Batch Dispatch

**What goes wrong:** If many reminders are due simultaneously (e.g., 10 leads all created on the same day, each with 5 steps = 50 reminders), the bot hits Telegram's rate limit (30 messages/second globally, 1 message/second per chat).
**Why it happens:** The polling query returns all due reminders at once.
**How to avoid:** Add a small `await asyncio.sleep(0.5)` between sends to the same user. Limit to 3 reminders per user per polling cycle; batch remaining into a digest. Given the current small user base, this is unlikely to be hit but is cheap to implement.
**Warning signs:** `aiogram` returning 429 errors during reminder dispatch.

## Code Examples

### Example 1: Migration SQL

```sql
-- insforge/migrations/002_scheduled_reminders.sql

CREATE TABLE IF NOT EXISTS scheduled_reminders (
    id              SERIAL PRIMARY KEY,
    lead_id         INTEGER NOT NULL,   -- references lead_registry(id), CASCADE handled in app
    telegram_id     BIGINT NOT NULL,
    step_id         INTEGER NOT NULL,
    due_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',  -- pending | sent | completed | skipped | snoozed
    snooze_count    INTEGER NOT NULL DEFAULT 0,
    reminder_count  INTEGER NOT NULL DEFAULT 0,
    last_reminded_at TIMESTAMP WITH TIME ZONE,
    draft_text      TEXT,
    completed_at    TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Polling query index (the hot path)
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_due
    ON scheduled_reminders(due_at)
    WHERE status IN ('pending', 'sent');

-- Lead-specific lookups
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_lead
    ON scheduled_reminders(lead_id, step_id);

-- User-specific lookups (for TMA)
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_telegram
    ON scheduled_reminders(telegram_id, status);

-- RLS + policies (same pattern as pipeline_traces)
ALTER TABLE scheduled_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY reminders_service_all ON scheduled_reminders FOR ALL USING (true) WITH CHECK (true);

-- Grants (same pattern as pipeline_traces)
GRANT USAGE, SELECT ON SEQUENCE scheduled_reminders_id_seq TO anon;
GRANT ALL ON TABLE scheduled_reminders TO anon;

-- Authenticated policies for TMA access (scoped to telegram_id from JWT)
CREATE POLICY "reminders_select_own" ON scheduled_reminders FOR SELECT TO authenticated
  USING (telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint);
CREATE POLICY "reminders_update_own" ON scheduled_reminders FOR UPDATE TO authenticated
  USING (telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint);
```

**Note on FOREIGN KEY:** The research in `02-engagement-plan-executor.md` proposed `REFERENCES lead_registry(id) ON DELETE CASCADE`. However, InsForge PostgREST may have issues with foreign key constraints on table creation. The safer approach is to handle cascade in the application (delete reminders when a lead is deleted) and not add a DB-level FK. This matches the existing codebase pattern -- no other table uses explicit FK references (all referential integrity is handled in application code).

### Example 2: Timing Parser

```python
import re
from datetime import datetime, timedelta, timezone

TIMING_PATTERNS = [
    (r"(?:immediately|right away|now|day\s*0)", timedelta(hours=0)),
    (r"day\s*1\b", timedelta(days=1)),
    (r"day\s*(\d+)(?:\s*-\s*\d+)?", lambda m: timedelta(days=int(m.group(1)))),
    (r"(?:after\s+)?(\d+)\s*(?:day|d)s?\s*(?:later)?", lambda m: timedelta(days=int(m.group(1)))),
    (r"(?:after\s+)?(\d+)\s*(?:week|w)s?\s*(?:later)?", lambda m: timedelta(weeks=int(m.group(1)))),
    (r"(?:after\s+)?(\d+)\s*(?:month|mo)s?\s*(?:later)?", lambda m: timedelta(days=int(m.group(1)) * 30)),
]

DEFAULT_SPACING_DAYS = 3

def parse_step_due_date(
    step: dict,
    base_date: datetime,
    step_index: int,
) -> datetime:
    """Compute due_at for a plan step. Uses delay_days (primary) or timing string (fallback)."""
    # Primary: delay_days integer (deterministic)
    delay_days = step.get("delay_days")
    if delay_days is not None:
        try:
            return base_date + timedelta(days=int(delay_days))
        except (ValueError, TypeError):
            pass

    # Fallback: parse timing string with regex
    timing_str = step.get("timing", "")
    if timing_str:
        text = timing_str.lower().strip()
        for pattern, delta in TIMING_PATTERNS:
            match = re.search(pattern, text)
            if match:
                if callable(delta):
                    resolved = delta(match)
                else:
                    resolved = delta
                return base_date + resolved

    # Last resort: increment by step_index * DEFAULT_SPACING_DAYS
    return base_date + timedelta(days=(step_index + 1) * DEFAULT_SPACING_DAYS)
```

### Example 3: Schedule Plan Reminders Function

```python
async def schedule_plan_reminders(
    reminder_repo: ScheduledReminderRepo,
    lead_id: int,
    telegram_id: int,
    plan_steps: list[dict],
    base_date: datetime,
) -> None:
    """Create scheduled_reminders rows for each plan step. Idempotent."""
    # Cancel any existing pending reminders for this lead (idempotency)
    await reminder_repo.cancel_pending_for_lead(lead_id)

    for i, step in enumerate(plan_steps):
        step_id = step.get("step_id", i + 1)
        due_at = parse_step_due_date(step, base_date, i)

        await reminder_repo.create(ScheduledReminderModel(
            lead_id=lead_id,
            telegram_id=telegram_id,
            step_id=step_id,
            due_at=due_at.isoformat(),
            status="pending",
            draft_text=step.get("suggested_text"),
        ))
```

### Example 4: Polling Scheduler Loop

```python
PLAN_CHECK_INTERVAL = 15 * 60  # 15 minutes

async def _process_due_plan_reminders(
    bot: Bot,
    reminder_repo: ScheduledReminderRepo,
    lead_repo: LeadRegistryRepo,
    activity_repo: LeadActivityRepo,
) -> None:
    """Find and dispatch due plan step reminders."""
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    due_reminders = await reminder_repo.get_due_reminders(now_iso)

    for reminder in due_reminders:
        try:
            # Guard: skip if already reminded recently (duplicate prevention)
            if reminder.last_reminded_at:
                last = datetime.fromisoformat(reminder.last_reminded_at.replace("Z", "+00:00"))
                if (now - last).total_seconds() < PLAN_CHECK_INTERVAL:
                    continue

            # Optimistic update BEFORE sending (at-most-once delivery)
            await reminder_repo.mark_reminded(reminder.id, now_iso)

            # Fetch lead for context
            lead = await lead_repo.get_by_id(reminder.lead_id)
            if not lead:
                await reminder_repo.update_status(reminder.id, "skipped")
                continue

            # Build and send notification
            name = lead.prospect_name or f"Lead #{lead.id}"
            text = (
                f"[bell] *Step {reminder.step_id} Due: {name}*\n\n"
                f"Check your engagement plan for this lead.\n\n"
                f"Use /leads to view details and take action."
            )
            await bot.send_message(
                chat_id=reminder.telegram_id,
                text=text,
                parse_mode="Markdown",
            )

            # Update status to 'sent'
            if reminder.status == "pending":
                await reminder_repo.update_status(reminder.id, "sent")

        except Exception as e:
            logger.error("Failed to process reminder %s: %s", reminder.id, e)

async def start_plan_scheduler(
    bot: Bot,
    reminder_repo: ScheduledReminderRepo,
    lead_repo: LeadRegistryRepo,
    activity_repo: LeadActivityRepo,
) -> None:
    """Background loop for plan step reminders."""
    logger.info("Plan scheduler started (interval: %ds)", PLAN_CHECK_INTERVAL)
    while True:
        try:
            await _process_due_plan_reminders(bot, reminder_repo, lead_repo, activity_repo)
        except Exception as e:
            logger.error("Plan scheduler error: %s", e)
        await asyncio.sleep(PLAN_CHECK_INTERVAL)
```

### Example 5: Updated Engagement Plan Prompt (Key Section)

```markdown
### Output Format

```json
[
  {
    "step_id": 1,
    "action_type": "linkedin_like",
    "description": "Like their 3 most recent posts to get on their radar",
    "suggested_text": null,
    "timing": "Day 1",
    "delay_days": 1,
    "status": "pending",
    "completed_at": null
  },
  {
    "step_id": 2,
    "action_type": "linkedin_comment",
    "description": "Comment on their post about [specific topic]",
    "suggested_text": "Great insight on...",
    "timing": "Day 2",
    "delay_days": 2,
    "status": "pending",
    "completed_at": null
  }
]
```

### CRITICAL RULES for delay_days

8. **Always include `delay_days`** -- an integer representing the number of days after the plan starts when this step should be executed. Day 0 = immediately, Day 1 = tomorrow, etc.
9. **`delay_days` must be monotonically increasing** -- each step's `delay_days` should be >= the previous step's `delay_days`
10. **Typical pacing:** Steps should be spaced across 1-3 weeks. Common pattern: 0, 1, 3, 5, 7, 10, 14
```

## State of the Art

| Old Approach (Current) | New Approach (Phase 12) | Impact |
|------------------------|------------------------|--------|
| Single `next_followup` per lead on `lead_registry` | Per-step `due_at` on `scheduled_reminders` | Each engagement step has its own schedule |
| Timing is a display-only string ("Day 1") | `delay_days` integer + timing string for display | Deterministic scheduling, no NLP parsing needed |
| `followup_scheduler.py` checks every 6 hours | `plan_scheduler.py` checks every 15 minutes | More responsive reminders within acceptable precision |
| No duplicate prevention | `last_reminded_at` guard + optimistic update | Bot restarts don't re-send dispatched reminders |

**Deprecated/outdated after Phase 12:**
- `next_followup` field on `lead_registry`: Still set for backward compat with the existing followup scheduler, but the new per-step scheduling supersedes it. The old `followup_scheduler.py` can coexist (it handles generic lead re-engagement), while the new `plan_scheduler.py` handles step-level reminders.

## Integration Points

### Where Plan Scheduling Gets Wired In

1. **`bot/handlers/support.py` -> `_background_enrich_lead()`** (lines 459-470):
   After `engagement_service.generate_plan(lead, research)` succeeds and the plan is stored on `lead_registry`, call `schedule_plan_reminders()`. This requires passing `reminder_repo` into the background enrichment function.

2. **`bot/main.py`** (lines 179-185):
   Start the plan scheduler background loop alongside the existing followup scheduler. Create the `ScheduledReminderRepo` in the initialization block and add it to `workflow_data`.

3. **`bot/handlers/leads.py` -> `on_lead_step_toggle()`** (lines 496-568):
   When a user manually toggles a step via the existing plan view, also update the corresponding `scheduled_reminders` row. This is a small addition to the existing handler.

4. **`bot/handlers/leads.py` -> `on_lead_delete_execute()`** (lines 902-934):
   When a lead is deleted, also delete its `scheduled_reminders` rows. Since we're not using FK CASCADE, this must be explicit.

### Boundary with Phase 14 (Engagement Plan Execution)

Phase 12 delivers **basic notification** -- a simple text message with lead name and step info, plus a pointer to `/leads`. Phase 14 adds **rich UX**: formatted reminder messages with inline keyboards (Done/Snooze/Skip buttons), escalation logic, and draft display. The separation is clean:

- Phase 12: scheduling infrastructure (table, parser, polling, dispatch)
- Phase 14: user-facing reminder experience (rich messages, callbacks, escalation)

The basic notification in Phase 12 should be a simple Markdown message that is functional even without Phase 14. Phase 14 upgrades the message format and adds callback handlers.

## Open Questions

1. **Should the old `followup_scheduler.py` be deprecated?**
   - What we know: The old scheduler sends generic lead re-engagement reminders (not step-specific). The new scheduler is step-specific. They serve different purposes.
   - What's unclear: Whether both should run simultaneously or whether the new scheduler subsumes the old one.
   - Recommendation: Keep both running for now. The old scheduler handles leads without engagement plans (edge case). Can be deprecated in a later cleanup phase.

2. **Should `scheduled_reminders` use a FOREIGN KEY to `lead_registry`?**
   - What we know: The existing codebase uses no FK constraints anywhere. All referential integrity is handled in application code. InsForge/PostgREST may have limitations with FK-constrained tables.
   - What's unclear: Whether InsForge supports FK constraints on table creation and whether they cause issues with PostgREST CRUD operations.
   - Recommendation: Skip the FK constraint. Handle cascade deletion in application code (delete reminders when lead is deleted). This matches the existing codebase pattern and avoids potential InsForge issues.

3. **What happens to existing leads' engagement plans?**
   - What we know: Existing leads already have `engagement_plan` JSONB arrays but no `delay_days` field and no `scheduled_reminders` rows.
   - What's unclear: Whether to backfill scheduled_reminders for existing plans.
   - Recommendation: Don't backfill. Only newly generated plans (after prompt update) will have `delay_days` and get scheduled. Existing plans remain display-only. If a lead is re-analyzed (Phase 15), the new plan will get scheduled.

## Sources

### Primary (HIGH confidence)
- `bot/services/followup_scheduler.py` -- proven polling loop pattern, checked line by line
- `bot/storage/insforge_client.py` -- PostgREST API capabilities including filter operators
- `bot/storage/repositories.py` -- repository class pattern (11 repos examined)
- `bot/storage/models.py` -- Pydantic model pattern (12 models examined)
- `bot/handlers/support.py` -- `_background_enrich_lead()` enrichment hook (line 410-474)
- `bot/handlers/leads.py` -- step toggle callback pattern (line 496-568)
- `bot/main.py` -- background task startup pattern (line 179-199)
- `bot/task_utils.py` -- GC-safe background task creation
- `prompts/engagement_plan.md` -- current prompt format (no `delay_days`)
- `insforge/migrations/001_pipeline_traces.sql` -- migration + RLS + grants pattern
- `.planning/research/v2/02-engagement-plan-executor.md` -- extensive prior research on this domain

### Secondary (MEDIUM confidence)
- `.planning/ROADMAP.md` -- phase dependencies and success criteria
- `.planning/REQUIREMENTS.md` -- SCHED-V20-01 through SCHED-V20-05 requirements
- `.planning/STATE.md` -- locked decision: PostgreSQL polling, no new dependencies

### Not Used (validated against codebase instead)
- No external library documentation needed (no new dependencies)
- No web searches needed (this phase is entirely about internal architecture patterns)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all patterns proven in codebase
- Architecture: HIGH -- direct extension of existing `followup_scheduler.py` + repository patterns
- Pitfalls: HIGH -- identified from prior research and codebase analysis (PostgREST filter issues, duplicate handling)
- Code examples: HIGH -- all derived from or verified against actual codebase patterns

**Research date:** 2026-02-05
**Valid until:** Indefinite (no external dependencies that could change)
