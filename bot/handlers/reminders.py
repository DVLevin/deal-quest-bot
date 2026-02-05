"""Callback handlers for reminder inline button actions."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from aiogram import F, Router
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup

from bot.storage.models import LeadActivityModel
from bot.storage.repositories import (
    LeadActivityRepo,
    LeadRegistryRepo,
    ScheduledReminderRepo,
)

logger = logging.getLogger(__name__)
router = Router(name="reminders")


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

    lead = await lead_repo.get_by_id(lead_id)
    reminder = await reminder_repo.get_by_lead_and_step(lead_id, step_id)

    if not lead or not reminder:
        await callback.answer("Step not found.")
        return

    step_desc = ""
    if lead.engagement_plan:
        for step in lead.engagement_plan:
            if step.get("step_id") == step_id:
                step_desc = step.get("description", f"Step {step_id}")
                break

    await reminder_repo.update_status(reminder.id, "completed")

    if lead.engagement_plan:
        now_iso = datetime.now(timezone.utc).isoformat()
        updated_plan = []
        for step in lead.engagement_plan:
            if step.get("step_id") == step_id:
                step["status"] = "done"
                step["completed_at"] = now_iso
            updated_plan.append(step)
        await lead_repo.update_lead(lead_id, engagement_plan=updated_plan)

    await activity_repo.create(
        LeadActivityModel(
            lead_id=lead_id,
            telegram_id=tg_id,
            activity_type="step_execution",
            content=f"Completed: {step_desc}",
        )
    )

    name = lead.prospect_name or f"Lead #{lead.id}"
    try:
        await callback.message.edit_text(
            f"\u2705 *Step {step_id} completed for {name}!*\n\n"
            f"{step_desc}\n\nGreat job! Keep the momentum going.",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="\U0001F4DD Add Context", callback_data=f"context:add:{lead_id}")],
                [InlineKeyboardButton(text="\U0001F4CB View Lead", callback_data=f"lead:view:{lead_id}")],
            ]),
        )
    except Exception:
        pass

    await callback.answer("Marked as done!")


@router.callback_query(F.data.startswith("reminder:snooze:"))
async def on_reminder_snooze(
    callback: CallbackQuery,
    lead_repo: LeadRegistryRepo,
    reminder_repo: ScheduledReminderRepo,
    activity_repo: LeadActivityRepo,
) -> None:
    """Snooze a reminder for 24 hours."""
    parts = callback.data.split(":")
    lead_id = int(parts[2])
    step_id = int(parts[3])
    tg_id = callback.from_user.id

    lead = await lead_repo.get_by_id(lead_id)
    reminder = await reminder_repo.get_by_lead_and_step(lead_id, step_id)

    if not lead or not reminder:
        await callback.answer("Step not found.")
        return

    new_due = datetime.now(timezone.utc) + timedelta(hours=24)
    await reminder_repo.snooze(reminder.id, new_due.isoformat())

    await activity_repo.create(
        LeadActivityModel(
            lead_id=lead_id,
            telegram_id=tg_id,
            activity_type="step_snooze",
            content=f"Snoozed step {step_id} for 24 hours",
        )
    )

    name = lead.prospect_name or f"Lead #{lead.id}"
    try:
        await callback.message.edit_text(
            f"\u23F0 *Snoozed: {name} - Step {step_id}*\n\n"
            f"I'll remind you again in 24 hours.\n\nUse /leads to view all your leads.",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="\U0001F4DD Add Context", callback_data=f"context:add:{lead_id}")],
                [InlineKeyboardButton(text="\U0001F4CB View Lead", callback_data=f"lead:view:{lead_id}")],
            ]),
        )
    except Exception:
        pass

    await callback.answer("Snoozed for 24h")


@router.callback_query(F.data.startswith("reminder:skip:"))
async def on_reminder_skip(
    callback: CallbackQuery,
    lead_repo: LeadRegistryRepo,
    reminder_repo: ScheduledReminderRepo,
    activity_repo: LeadActivityRepo,
) -> None:
    """Skip a step entirely."""
    parts = callback.data.split(":")
    lead_id = int(parts[2])
    step_id = int(parts[3])
    tg_id = callback.from_user.id

    lead = await lead_repo.get_by_id(lead_id)
    reminder = await reminder_repo.get_by_lead_and_step(lead_id, step_id)

    if not lead or not reminder:
        await callback.answer("Step not found.")
        return

    await reminder_repo.update_status(reminder.id, "skipped")

    if lead.engagement_plan:
        updated_plan = []
        for step in lead.engagement_plan:
            if step.get("step_id") == step_id:
                step["status"] = "skipped"
            updated_plan.append(step)
        await lead_repo.update_lead(lead_id, engagement_plan=updated_plan)

    await activity_repo.create(
        LeadActivityModel(
            lead_id=lead_id,
            telegram_id=tg_id,
            activity_type="step_skip",
            content=f"Skipped step {step_id}",
        )
    )

    name = lead.prospect_name or f"Lead #{lead.id}"
    try:
        await callback.message.edit_text(
            f"\u23ED *Skipped: {name} - Step {step_id}*\n\nThis step has been marked as skipped.\n\nUse /leads to continue with other steps.",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="\U0001F4DD Add Context", callback_data=f"context:add:{lead_id}")],
                [InlineKeyboardButton(text="\U0001F4CB View Lead", callback_data=f"lead:view:{lead_id}")],
            ]),
        )
    except Exception:
        pass

    await callback.answer("Step skipped")


@router.callback_query(F.data.startswith("reminder:draft:"))
async def on_reminder_draft(
    callback: CallbackQuery,
    lead_repo: LeadRegistryRepo,
    reminder_repo: ScheduledReminderRepo,
) -> None:
    """Show full draft message for the step."""
    parts = callback.data.split(":")
    lead_id = int(parts[2])
    step_id = int(parts[3])

    lead = await lead_repo.get_by_id(lead_id)
    reminder = await reminder_repo.get_by_lead_and_step(lead_id, step_id)

    if not lead:
        await callback.answer("Lead not found.")
        return

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
            f"*Action:* {step_desc}\n\n*Suggested message:*\n{draft_text}"
        )
    else:
        text = (
            f"\U0001F4DD *Draft for {name} - Step {step_id}*\n\n"
            f"*Action:* {step_desc}\n\n_No draft message available for this step._"
        )

    try:
        await callback.message.edit_text(
            text,
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [
                    InlineKeyboardButton(text="\u2705 Done", callback_data=f"reminder:done:{lead_id}:{step_id}"),
                    InlineKeyboardButton(text="\u23F0 Snooze", callback_data=f"reminder:snooze:{lead_id}:{step_id}"),
                ],
                [InlineKeyboardButton(text="\U0001F4DD Add Context", callback_data=f"context:add:{lead_id}")],
                [InlineKeyboardButton(text="\U0001F4CB View Lead", callback_data=f"lead:view:{lead_id}")],
            ]),
        )
    except Exception:
        pass

    await callback.answer()
