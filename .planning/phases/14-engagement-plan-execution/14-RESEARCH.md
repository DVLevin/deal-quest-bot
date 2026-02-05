# Phase 14: Engagement Plan Execution - Research

**Researched:** 2026-02-05
**Domain:** Telegram bot rich reminder UX with inline keyboard interactions, escalation logic, and activity logging (Python aiogram 3)
**Confidence:** HIGH

## Summary

Phase 14 transforms the basic scheduling infrastructure (Phase 12) into an active user coaching experience. The bot must: (1) send rich formatted reminder messages with lead context and draft previews, (2) present Done/Snooze/Skip inline buttons on each reminder, (3) implement escalation logic that progressively nudges users without spamming, (4) allow users to view full contextual drafts, and (5) log every step action to `lead_activity_log`.

The research found that Phase 12 already provides ~80% of the foundation. The `plan_scheduler.py` polling loop, `ScheduledReminderRepo`, and `ScheduledReminderModel` are all in place. The `leads.py` handler demonstrates the exact inline keyboard patterns needed. The existing `LeadActivityRepo` handles activity logging. No new Python dependencies are required.

The key architectural decision is to upgrade the reminder dispatch in `plan_scheduler.py` from simple text to rich messages with inline keyboards, and to add new callback handlers in a dedicated `reminders.py` handler module for Done/Snooze/Skip/ViewDraft actions. Escalation logic uses the existing `reminder_count` and `snooze_count` fields on `ScheduledReminderModel` -- no schema changes needed.

**Primary recommendation:** Add a new `bot/handlers/reminders.py` handler module for inline button callbacks, upgrade `_process_due_plan_reminders()` in `plan_scheduler.py` to send rich messages with inline keyboards, implement 3-level escalation using `reminder_count`, and log all step actions to `lead_activity_log` with new activity types (`step_execution`, `step_snooze`, `step_skip`).

## Standard Stack

### Core

No new libraries needed. The entire phase uses existing project dependencies:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| aiogram 3 | (existing) | Inline keyboards, callback handlers, message editing | Already the bot framework |
| datetime | stdlib | Due date calculations, escalation timing | Already used throughout |
| httpx | (existing) | InsForge PostgREST via `InsForgeClient` | Already the HTTP client |
| pydantic | (existing) | `ScheduledReminderModel`, `LeadActivityModel` | Already the model layer |

### Supporting

No supporting libraries needed.

### Alternatives Considered

| Instead of | Could Use | Why Not |
|------------|-----------|---------|
| Plain string callback_data | aiogram CallbackData factory | The existing codebase uses plain strings (`lead:view:123`). Consistency is more valuable than type-safety for this project size. |
| Escalation in scheduler | Separate escalation service | Overkill. The polling loop already has the context needed. Escalation is 10 lines of logic. |
| Activity logging in callback handlers | Centralized logging service | The callback handlers already have access to `activity_repo` via DI. Direct logging is simpler. |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure

New/modified files:

```
bot/
  handlers/
    reminders.py           # NEW: callback handlers for Done/Snooze/Skip/ViewDraft
  services/
    plan_scheduler.py      # MODIFY: upgrade to rich messages with inline keyboards
  storage/
    repositories.py        # MODIFY: add snooze method to ScheduledReminderRepo
  main.py                  # MODIFY: register reminders router
```

### Pattern 1: Inline Keyboard for Step Actions

**What:** Each reminder message includes inline buttons for user response.
**When to use:** Any message requiring discrete user actions.
**Source:** Existing pattern in `bot/handlers/leads.py` lines 96-155

```python
# Reminder action keyboard
def _reminder_action_keyboard(lead_id: int, step_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="Done", callback_data=f"reminder:done:{lead_id}:{step_id}"),
            InlineKeyboardButton(text="Snooze 24h", callback_data=f"reminder:snooze:{lead_id}:{step_id}"),
            InlineKeyboardButton(text="Skip", callback_data=f"reminder:skip:{lead_id}:{step_id}"),
        ],
        [
            InlineKeyboardButton(text="View Full Draft", callback_data=f"reminder:draft:{lead_id}:{step_id}"),
            InlineKeyboardButton(text="View Lead", callback_data=f"lead:view:{lead_id}"),
        ],
    ])
```

### Pattern 2: Callback Handler Registration

**What:** Callback handlers filter by string prefix and extract parameters from callback_data.
**When to use:** Handling inline button presses.
**Source:** Existing pattern in `bot/handlers/leads.py` lines 372-397

```python
@router.callback_query(F.data.startswith("reminder:done:"))
async def on_reminder_done(
    callback: CallbackQuery,
    lead_repo: LeadRegistryRepo,
    reminder_repo: ScheduledReminderRepo,
    activity_repo: LeadActivityRepo,
) -> None:
    """Mark a step as done and log the activity."""
    parts = callback.data.split(":")  # type: ignore[union-attr]
    lead_id = int(parts[2])
    step_id = int(parts[3])
    # ... implementation
```

### Pattern 3: Message Editing After Action

**What:** After a user takes an action, edit the original message to reflect the new state.
**When to use:** Providing feedback without sending new messages.
**Source:** Existing pattern in `bot/handlers/leads.py` lines 391-397

```python
await callback.message.edit_text(
    "Step marked as done.",
    reply_markup=InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="View Lead", callback_data=f"lead:view:{lead_id}")]
    ]),
)
await callback.answer("Done!")
```

### Pattern 4: Escalation State Machine

**What:** Track escalation level using `reminder_count` field, adjust message tone at each level.
**When to use:** Any reminder system that needs graduated urgency.
**Source:** Custom pattern for this phase

```python
ESCALATION_LEVELS = {
    0: {"tone": "initial", "icon": "bell", "extra": ""},
    1: {"tone": "nudge", "icon": "bell", "extra": "\n\nThis is a gentle reminder."},
    2: {"tone": "final", "icon": "exclamation", "extra": "\n\nFinal reminder before auto-snooze."},
}
MAX_ESCALATION = 3  # After 3 sends, auto-snooze

def get_escalation_level(reminder_count: int) -> dict:
    return ESCALATION_LEVELS.get(min(reminder_count, 2), ESCALATION_LEVELS[2])
```

### Pattern 5: Dual-Update for Step Status

**What:** When a step status changes, update both `scheduled_reminders` table AND `engagement_plan` JSONB.
**When to use:** Keeping scheduling authority and display authority in sync.
**Source:** Existing pattern in `bot/handlers/leads.py` lines 496-581 (step toggle)

```python
# 1. Update scheduled_reminders (scheduling authority)
await reminder_repo.update_status(reminder_id, "completed")

# 2. Update engagement_plan JSONB (display authority)
updated_plan = []
for step in lead.engagement_plan:
    if step.get("step_id") == step_id:
        step["status"] = "done"
        step["completed_at"] = datetime.now(timezone.utc).isoformat()
    updated_plan.append(step)
await lead_repo.update_lead(lead_id, engagement_plan=updated_plan)
```

### Pattern 6: Activity Logging with Metadata

**What:** Log step actions to `lead_activity_log` with structured metadata in the content field.
**When to use:** Tracking user actions for the activity timeline.
**Source:** Existing pattern in `bot/handlers/leads.py` lines 705-713

```python
await activity_repo.create(
    LeadActivityModel(
        lead_id=lead_id,
        telegram_id=tg_id,
        activity_type="step_execution",  # or step_snooze, step_skip
        content=f"Completed step {step_id}: {step_description}",
        ai_response=None,
    )
)
```

### Anti-Patterns to Avoid

- **Don't send new messages for each reminder escalation.** Edit the existing message when possible, or use the `last_reminded_at` guard to prevent spam.
- **Don't use FSM state for reminder actions.** The callback_data contains all needed context (lead_id, step_id). FSM is unnecessary.
- **Don't auto-snooze silently.** When escalation maxes out, send a final message explaining the step was auto-snoozed to prevent user confusion.
- **Don't forget `await callback.answer()`** -- Telegram shows a loading spinner until answered.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Inline keyboards | Manual string building | `InlineKeyboardMarkup` + `InlineKeyboardButton` | Type-safe, validated by aiogram |
| Callback routing | Manual string parsing | `F.data.startswith()` filter | Already used throughout the codebase |
| Activity logging | Custom logging | Existing `LeadActivityRepo.create()` | Consistent with existing activity types |
| Step status sync | Custom dual-update | Follow existing `on_lead_step_toggle` pattern | Proven pattern already in leads.py |
| Escalation timing | APScheduler jobs | `reminder_count` field + polling check | Simpler, no new dependencies, already in model |

**Key insight:** This phase is about upgrading the message format and adding callback handlers. The scheduling, storage, and polling infrastructure from Phase 12 remains unchanged. The primary work is UI/UX enhancement.

## Common Pitfalls

### Pitfall 1: Callback Data Size Limit

**What goes wrong:** Callback data exceeds Telegram's 64-byte limit.
**Why it happens:** Encoding too much information (lead name, step description) in callback_data.
**How to avoid:** Only include IDs in callback_data. Fetch lead/step details from the database in the handler. Pattern: `reminder:done:{lead_id}:{step_id}` (20-30 bytes max).
**Warning signs:** Telegram API errors when sending inline keyboards.

### Pitfall 2: Message Edit Conflicts

**What goes wrong:** User presses button on an already-edited message, causing "Message is not modified" error.
**Why it happens:** The message was already updated by another action (e.g., user pressed Done twice quickly).
**How to avoid:** Wrap `callback.message.edit_text()` in try/except, catch `TelegramBadRequest` with "message is not modified" substring, and silently ignore. The state is already correct.
**Warning signs:** Error logs showing "Message is not modified" exceptions.

### Pitfall 3: Missing Callback Answer

**What goes wrong:** User sees infinite loading spinner on button after pressing.
**Why it happens:** Handler throws exception before reaching `await callback.answer()`.
**How to avoid:** Always call `await callback.answer()` at the end of the handler, and also in exception handlers. Use a pattern where `callback.answer()` is in a `finally` block or at the top of the handler with an appropriate message.
**Warning signs:** Users reporting buttons that "hang" when pressed.

### Pitfall 4: Escalation Never Stops

**What goes wrong:** User receives infinite escalation reminders because they never respond.
**Why it happens:** Escalation logic continues incrementing `reminder_count` without a cap.
**How to avoid:** Set `MAX_ESCALATION = 3`. After 3 reminder sends, auto-snooze the reminder for 7 days and notify the user. This prevents spam while preserving the reminder for later.
**Warning signs:** Users complaining about repeated reminders for the same step.

### Pitfall 5: Draft Text Missing

**What goes wrong:** "View Full Draft" shows empty content.
**Why it happens:** `draft_text` on `ScheduledReminderModel` was null because the engagement plan step had no `suggested_text`.
**How to avoid:** Fall back to the step `description` if `suggested_text` is null. In the "View Full Draft" handler, also check the `engagement_plan` JSONB on the lead for the full step details.
**Warning signs:** Empty or unhelpful draft display.

### Pitfall 6: Timezone Inconsistencies

**What goes wrong:** Reminders fire at wrong times, snooze calculations are off by hours.
**Why it happens:** Mixing naive and aware datetimes, or using local time instead of UTC.
**How to avoid:** All timestamps in the system are UTC ISO format. The existing codebase already follows this pattern (`datetime.now(timezone.utc).isoformat()`). Continue using it. Display times to users can be "in X hours" relative format to avoid timezone complexity.
**Warning signs:** Reminders arriving at unexpected times, especially for users in different timezones.

## Code Examples

### Example 1: Rich Reminder Message Format

```python
def _format_reminder_message(
    lead: LeadRegistryModel,
    reminder: ScheduledReminderModel,
    step: dict | None,
    escalation_level: int,
) -> str:
    """Format a rich reminder message with escalation tone."""
    name = lead.prospect_name or f"Lead #{lead.id}"
    company = f" @ {lead.prospect_company}" if lead.prospect_company else ""

    # Get step details
    step_desc = ""
    if step:
        step_desc = step.get("description", "")
        action_type = step.get("action_type", "")
        timing = step.get("timing", "")

    # Escalation tone
    if escalation_level == 0:
        icon = "\U0001F514"  # bell
        intro = "Time for your next engagement step!"
    elif escalation_level == 1:
        icon = "\U0001F514"  # bell
        intro = "Gentle reminder: this step is still pending."
    else:
        icon = "\u2757"  # exclamation
        intro = "Final reminder before auto-snooze."

    # Draft preview (truncated)
    draft_preview = ""
    draft_text = reminder.draft_text or (step.get("suggested_text") if step else None)
    if draft_text:
        preview = draft_text[:150].replace("\n", " ")
        draft_preview = f'\n\n\U0001F4DD *Draft:* "{preview}..."'

    return (
        f"{icon} *Engagement Step Due: {name}{company}*\n\n"
        f"{intro}\n\n"
        f"\U0001F4CB *Step {reminder.step_id}:* {step_desc}\n"
        f"{draft_preview}"
    )
```

### Example 2: Reminder Action Keyboard

```python
def _reminder_action_keyboard(lead_id: int, step_id: int) -> InlineKeyboardMarkup:
    """Build inline keyboard for reminder actions."""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="\u2705 Done",
                callback_data=f"reminder:done:{lead_id}:{step_id}"
            ),
            InlineKeyboardButton(
                text="\u23F0 Snooze 24h",
                callback_data=f"reminder:snooze:{lead_id}:{step_id}"
            ),
            InlineKeyboardButton(
                text="\u23ED Skip",
                callback_data=f"reminder:skip:{lead_id}:{step_id}"
            ),
        ],
        [
            InlineKeyboardButton(
                text="\U0001F4DD View Full Draft",
                callback_data=f"reminder:draft:{lead_id}:{step_id}"
            ),
        ],
        [
            InlineKeyboardButton(
                text="\U0001F4CB View Lead",
                callback_data=f"lead:view:{lead_id}"
            ),
        ],
    ])
```

### Example 3: Done Callback Handler

```python
@router.callback_query(F.data.startswith("reminder:done:"))
async def on_reminder_done(
    callback: CallbackQuery,
    lead_repo: LeadRegistryRepo,
    reminder_repo: ScheduledReminderRepo,
    activity_repo: LeadActivityRepo,
) -> None:
    """Mark a step as done, update both tables, log activity."""
    parts = callback.data.split(":")  # type: ignore[union-attr]
    lead_id = int(parts[2])
    step_id = int(parts[3])
    tg_id = callback.from_user.id

    # Fetch lead and reminder
    lead = await lead_repo.get_by_id(lead_id)
    reminder = await reminder_repo.get_by_lead_and_step(lead_id, step_id)

    if not lead or not reminder:
        await callback.answer("Step not found.")
        return

    # Get step description for logging
    step_desc = ""
    if lead.engagement_plan:
        for step in lead.engagement_plan:
            if step.get("step_id") == step_id:
                step_desc = step.get("description", f"Step {step_id}")
                break

    # 1. Update scheduled_reminders (scheduling authority)
    await reminder_repo.update_status(reminder.id, "completed")  # type: ignore[arg-type]

    # 2. Update engagement_plan JSONB (display authority)
    if lead.engagement_plan:
        now_iso = datetime.now(timezone.utc).isoformat()
        updated_plan = []
        for step in lead.engagement_plan:
            if step.get("step_id") == step_id:
                step["status"] = "done"
                step["completed_at"] = now_iso
            updated_plan.append(step)
        await lead_repo.update_lead(lead_id, engagement_plan=updated_plan)

    # 3. Log activity
    await activity_repo.create(
        LeadActivityModel(
            lead_id=lead_id,
            telegram_id=tg_id,
            activity_type="step_execution",
            content=f"Completed: {step_desc}",
        )
    )

    # 4. Update message
    name = lead.prospect_name or f"Lead #{lead.id}"
    try:
        await callback.message.edit_text(  # type: ignore[union-attr]
            f"\u2705 *Step {step_id} completed for {name}!*\n\n"
            f"{step_desc}\n\n"
            f"Great job! Keep the momentum going.",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="\U0001F4CB View Lead", callback_data=f"lead:view:{lead_id}")]
            ]),
        )
    except Exception:
        pass  # Message already modified

    await callback.answer("Marked as done!")
```

### Example 4: Snooze Callback Handler

```python
@router.callback_query(F.data.startswith("reminder:snooze:"))
async def on_reminder_snooze(
    callback: CallbackQuery,
    lead_repo: LeadRegistryRepo,
    reminder_repo: ScheduledReminderRepo,
    activity_repo: LeadActivityRepo,
) -> None:
    """Snooze a reminder for 24 hours."""
    parts = callback.data.split(":")  # type: ignore[union-attr]
    lead_id = int(parts[2])
    step_id = int(parts[3])
    tg_id = callback.from_user.id

    lead = await lead_repo.get_by_id(lead_id)
    reminder = await reminder_repo.get_by_lead_and_step(lead_id, step_id)

    if not lead or not reminder:
        await callback.answer("Step not found.")
        return

    # Snooze for 24 hours
    new_due = datetime.now(timezone.utc) + timedelta(hours=24)
    await reminder_repo.snooze(reminder.id, new_due.isoformat())  # type: ignore[arg-type]

    # Log activity
    await activity_repo.create(
        LeadActivityModel(
            lead_id=lead_id,
            telegram_id=tg_id,
            activity_type="step_snooze",
            content=f"Snoozed step {step_id} for 24 hours",
        )
    )

    # Update message
    name = lead.prospect_name or f"Lead #{lead.id}"
    try:
        await callback.message.edit_text(  # type: ignore[union-attr]
            f"\u23F0 *Snoozed: {name} - Step {step_id}*\n\n"
            f"I'll remind you again in 24 hours.\n\n"
            f"Use /leads to view all your leads.",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="\U0001F4CB View Lead", callback_data=f"lead:view:{lead_id}")]
            ]),
        )
    except Exception:
        pass

    await callback.answer("Snoozed for 24h")
```

### Example 5: Skip Callback Handler

```python
@router.callback_query(F.data.startswith("reminder:skip:"))
async def on_reminder_skip(
    callback: CallbackQuery,
    lead_repo: LeadRegistryRepo,
    reminder_repo: ScheduledReminderRepo,
    activity_repo: LeadActivityRepo,
) -> None:
    """Skip a step entirely."""
    parts = callback.data.split(":")  # type: ignore[union-attr]
    lead_id = int(parts[2])
    step_id = int(parts[3])
    tg_id = callback.from_user.id

    lead = await lead_repo.get_by_id(lead_id)
    reminder = await reminder_repo.get_by_lead_and_step(lead_id, step_id)

    if not lead or not reminder:
        await callback.answer("Step not found.")
        return

    # Update reminder status to skipped
    await reminder_repo.update_status(reminder.id, "skipped")  # type: ignore[arg-type]

    # Update engagement_plan JSONB
    if lead.engagement_plan:
        updated_plan = []
        for step in lead.engagement_plan:
            if step.get("step_id") == step_id:
                step["status"] = "skipped"
            updated_plan.append(step)
        await lead_repo.update_lead(lead_id, engagement_plan=updated_plan)

    # Log activity
    await activity_repo.create(
        LeadActivityModel(
            lead_id=lead_id,
            telegram_id=tg_id,
            activity_type="step_skip",
            content=f"Skipped step {step_id}",
        )
    )

    # Update message
    name = lead.prospect_name or f"Lead #{lead.id}"
    try:
        await callback.message.edit_text(  # type: ignore[union-attr]
            f"\u23ED *Skipped: {name} - Step {step_id}*\n\n"
            f"This step has been marked as skipped.\n\n"
            f"Use /leads to continue with other steps.",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="\U0001F4CB View Lead", callback_data=f"lead:view:{lead_id}")]
            ]),
        )
    except Exception:
        pass

    await callback.answer("Step skipped")
```

### Example 6: View Draft Callback Handler

```python
@router.callback_query(F.data.startswith("reminder:draft:"))
async def on_reminder_draft(
    callback: CallbackQuery,
    lead_repo: LeadRegistryRepo,
    reminder_repo: ScheduledReminderRepo,
) -> None:
    """Show full draft message for the step."""
    parts = callback.data.split(":")  # type: ignore[union-attr]
    lead_id = int(parts[2])
    step_id = int(parts[3])

    lead = await lead_repo.get_by_id(lead_id)
    reminder = await reminder_repo.get_by_lead_and_step(lead_id, step_id)

    if not lead:
        await callback.answer("Lead not found.")
        return

    # Get draft from reminder or from engagement_plan
    draft_text = reminder.draft_text if reminder else None
    step_desc = ""

    if lead.engagement_plan:
        for step in lead.engagement_plan:
            if step.get("step_id") == step_id:
                step_desc = step.get("description", "")
                if not draft_text:
                    draft_text = step.get("suggested_text", "")
                break

    name = lead.prospect_name or f"Lead #{lead.id}"

    if draft_text:
        text = (
            f"\U0001F4DD *Draft for {name} - Step {step_id}*\n\n"
            f"*Action:* {step_desc}\n\n"
            f"*Suggested message:*\n{draft_text}"
        )
    else:
        text = (
            f"\U0001F4DD *Draft for {name} - Step {step_id}*\n\n"
            f"*Action:* {step_desc}\n\n"
            f"_No draft message available for this step._"
        )

    try:
        await callback.message.edit_text(  # type: ignore[union-attr]
            text,
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [
                    InlineKeyboardButton(text="\u2705 Done", callback_data=f"reminder:done:{lead_id}:{step_id}"),
                    InlineKeyboardButton(text="\u23F0 Snooze", callback_data=f"reminder:snooze:{lead_id}:{step_id}"),
                ],
                [InlineKeyboardButton(text="\U0001F4CB View Lead", callback_data=f"lead:view:{lead_id}")],
            ]),
        )
    except Exception:
        pass

    await callback.answer()
```

### Example 7: Upgraded Polling Loop with Escalation

```python
MAX_ESCALATION = 3  # After 3 reminder sends, auto-snooze

async def _process_due_plan_reminders(
    bot: Bot,
    reminder_repo: ScheduledReminderRepo,
    lead_repo: LeadRegistryRepo,
    activity_repo: LeadActivityRepo,
) -> None:
    """Find and process reminders that are due, with escalation."""
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    try:
        due_reminders = await reminder_repo.get_due_reminders(now_iso)
    except Exception as e:
        logger.error("Failed to query due reminders: %s", e)
        return

    for reminder in due_reminders:
        try:
            # Duplicate guard: skip if reminded recently
            if reminder.last_reminded_at:
                try:
                    last = datetime.fromisoformat(
                        reminder.last_reminded_at.replace("Z", "+00:00")
                    )
                    if (now - last).total_seconds() < PLAN_CHECK_INTERVAL:
                        continue
                except (ValueError, TypeError):
                    pass

            # Check escalation level
            reminder_count = reminder.reminder_count or 0

            if reminder_count >= MAX_ESCALATION:
                # Auto-snooze for 7 days
                new_due = now + timedelta(days=7)
                await reminder_repo.snooze(reminder.id, new_due.isoformat())  # type: ignore[arg-type]

                # Notify user of auto-snooze
                lead = await lead_repo.get_by_id(reminder.lead_id)
                if lead:
                    name = lead.prospect_name or f"Lead #{lead.id}"
                    await bot.send_message(
                        chat_id=reminder.telegram_id,
                        text=(
                            f"\u23F8 *Auto-snoozed: {name} - Step {reminder.step_id}*\n\n"
                            f"This step has been automatically snoozed for 7 days "
                            f"after {MAX_ESCALATION} reminders.\n\n"
                            f"Use /leads to manage your engagement plans."
                        ),
                        parse_mode="Markdown",
                    )
                continue

            # Optimistic update BEFORE sending
            await reminder_repo.mark_reminded(reminder.id, now_iso)  # type: ignore[arg-type]

            # Fetch lead for context
            lead = await lead_repo.get_by_id(reminder.lead_id)
            if not lead:
                await reminder_repo.update_status(reminder.id, "skipped")  # type: ignore[arg-type]
                continue

            # Get step details from engagement_plan
            step = None
            if lead.engagement_plan:
                for s in lead.engagement_plan:
                    if s.get("step_id") == reminder.step_id:
                        step = s
                        break

            # Build rich message
            text = _format_reminder_message(lead, reminder, step, reminder_count)
            keyboard = _reminder_action_keyboard(lead.id, reminder.step_id)  # type: ignore[arg-type]

            # Send notification
            await bot.send_message(
                chat_id=reminder.telegram_id,
                text=text,
                parse_mode="Markdown",
                reply_markup=keyboard,
            )

            # Update status to sent if still pending
            if reminder.status == "pending":
                await reminder_repo.update_status(reminder.id, "sent")  # type: ignore[arg-type]

            logger.info(
                "Sent reminder (escalation %d) for lead %s step %s",
                reminder_count,
                reminder.lead_id,
                reminder.step_id,
            )

            # Rate limiting
            await asyncio.sleep(0.5)

        except Exception as e:
            logger.error(
                "Failed to process reminder %s for lead %s: %s",
                reminder.id,
                reminder.lead_id,
                e,
            )
```

### Example 8: Snooze Repository Method

```python
# Add to ScheduledReminderRepo in repositories.py

async def snooze(self, reminder_id: int, new_due_iso: str) -> None:
    """Snooze a reminder by updating due_at and incrementing snooze_count."""
    rows = await self.client.query(
        self.table,
        filters={"id": reminder_id},
        limit=1,
    )
    if not rows or not isinstance(rows, list) or len(rows) == 0:
        return

    current_snooze = rows[0].get("snooze_count", 0)
    now = datetime.now(timezone.utc).isoformat()

    await self.client.update(
        self.table,
        {"id": reminder_id},
        {
            "due_at": new_due_iso,
            "status": "pending",  # Reset to pending for next dispatch
            "snooze_count": current_snooze + 1,
            "updated_at": now,
        },
    )
```

## State of the Art

| Phase 12 (Basic) | Phase 14 (Rich UX) | Impact |
|------------------|-------------------|--------|
| Simple text notification | Rich Markdown with lead name, company, step description, draft preview | Users get actionable context |
| No user actions | Done/Snooze/Skip inline buttons | Users respond directly from notification |
| No escalation | 3-level escalation (initial, nudge, final) with auto-snooze | Users not spammed, but reminded effectively |
| No draft display | "View Full Draft" button shows complete suggested message | Users can copy/paste outreach directly |
| No activity logging | Every action logged to `lead_activity_log` | Full audit trail, visible in lead timeline |

**No schema changes from Phase 12:**
- `ScheduledReminderModel` already has `snooze_count`, `reminder_count` for escalation tracking
- `LeadActivityModel` already supports arbitrary `activity_type` strings
- All infrastructure is in place; Phase 14 is pure UX enhancement

## Integration Points

### Where Rich Reminders Get Wired In

1. **`bot/services/plan_scheduler.py` -> `_process_due_plan_reminders()`:**
   Replace the basic text message with rich formatting + inline keyboard. Add escalation logic using `reminder_count`. Add auto-snooze after MAX_ESCALATION.

2. **`bot/handlers/reminders.py`** (NEW):
   Create a new router with callback handlers for `reminder:done:`, `reminder:snooze:`, `reminder:skip:`, and `reminder:draft:`. Register in `main.py`.

3. **`bot/storage/repositories.py` -> `ScheduledReminderRepo`:**
   Add `snooze()` method that updates `due_at`, resets `status` to "pending", and increments `snooze_count`.

4. **`bot/main.py`:**
   Import and include `reminders.router` alongside existing routers.

### Boundary with Phase 16 (TMA Lead Experience)

Phase 14 completes the **bot-side** reminder interaction. Phase 16 adds the **TMA-side** experience:
- TMA can mark steps Done/Skip directly
- TMA shows "Today's Actions" widget aggregating due reminders
- Bot reminder messages include "Open in App" deep link

The separation is clean: Phase 14 works entirely in bot, Phase 16 extends to TMA.

## Open Questions

1. **Should Skip require a reason?**
   - What we know: EPLAN-V20-02 mentions "Skip marks skipped with reason prompt"
   - What's unclear: Whether this adds friction that reduces engagement
   - Recommendation: Start without reason prompt (matches Done/Snooze simplicity). The Skip action is logged. Reason can be added as follow-up enhancement if users want it.

2. **Should snooze duration be configurable?**
   - What we know: Requirements specify "delays 24h" as the snooze behavior
   - What's unclear: Whether users want different snooze durations (1h, 4h, 1d, 3d)
   - Recommendation: Fixed 24h for Phase 14. Multiple snooze options can be added in a polish phase by replacing the single "Snooze 24h" button with a submenu.

3. **How should reminders coexist with the old followup_scheduler?**
   - What we know: Phase 12 kept both schedulers running. The old scheduler sends generic "check in on lead" reminders based on `next_followup`, while the new scheduler sends per-step reminders.
   - What's unclear: Whether leads should receive BOTH types of reminders, potentially causing confusion.
   - Recommendation: Keep both for now. The old scheduler handles leads without engagement plans (edge case). Once Phase 14 is stable, consider deprecating the old scheduler entirely in a cleanup phase.

## Sources

### Primary (HIGH confidence)
- `bot/services/plan_scheduler.py` -- existing polling loop and reminder dispatch (verified line by line)
- `bot/storage/repositories.py` -- `ScheduledReminderRepo` with all needed methods except `snooze()` (verified)
- `bot/storage/models.py` -- `ScheduledReminderModel` with `snooze_count`, `reminder_count` fields (verified)
- `bot/handlers/leads.py` -- inline keyboard patterns, callback handler patterns, step toggle logic (verified lines 96-581)
- `.planning/phases/12-scheduling-and-reminder-infrastructure/12-RESEARCH.md` -- Phase 12 research
- `.planning/phases/12-scheduling-and-reminder-infrastructure/12-02-PLAN.md` -- Phase 12 implementation details

### Secondary (MEDIUM confidence)
- [aiogram 3 Callback Data Factory](https://docs.aiogram.dev/en/latest/dispatcher/filters/callback_data.html) -- callback handling patterns
- [aiogram 3 Keyboard Builder](https://docs.aiogram.dev/en/latest/utils/keyboard.html) -- inline keyboard building
- [aiogram 3 editMessageReplyMarkup](https://docs.aiogram.dev/en/latest/api/methods/edit_message_reply_markup.html) -- message editing

### Not Used
- No external library documentation needed beyond aiogram (no new dependencies)
- No database schema research needed (Phase 12 schema is sufficient)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all patterns proven in codebase
- Architecture: HIGH -- direct extension of existing handlers/leads.py and plan_scheduler.py patterns
- Pitfalls: HIGH -- identified from existing codebase and aiogram documentation
- Code examples: HIGH -- all derived from or verified against actual codebase patterns

**Research date:** 2026-02-05
**Valid until:** Indefinite (no external dependencies that could change)
