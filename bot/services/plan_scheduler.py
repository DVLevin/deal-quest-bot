"""Plan step reminder scheduler — sends per-step engagement reminders."""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Callable

from aiogram import Bot

from bot.storage.models import ScheduledReminderModel
from bot.storage.repositories import LeadActivityRepo, LeadRegistryRepo, ScheduledReminderRepo

logger = logging.getLogger(__name__)

# Check every 15 minutes
PLAN_CHECK_INTERVAL = 15 * 60

# Default spacing between steps if no timing info
DEFAULT_SPACING_DAYS = 3

# Timing patterns: (regex, timedelta_or_callable)
# Patterns are tried in order; first match wins
TIMING_PATTERNS: list[tuple[str, timedelta | Callable[[re.Match], timedelta]]] = [
    # Immediate: "immediately", "right away", "now", "day 0"
    (r"(?:immediately|right away|now|day\s*0)", timedelta(hours=0)),
    # Day 1 specifically (exact match to avoid matching "day 10")
    (r"day\s*1\b", timedelta(days=1)),
    # Day N or Day N-M range (e.g., "Day 5", "Day 3-5")
    (r"day\s*(\d+)(?:\s*-\s*\d+)?", lambda m: timedelta(days=int(m.group(1)))),
    # N days (e.g., "3 days later", "after 5 days")
    (r"(?:after\s+)?(\d+)\s*(?:day|d)s?\s*(?:later)?", lambda m: timedelta(days=int(m.group(1)))),
    # N weeks (e.g., "2 weeks later", "after 1 week")
    (r"(?:after\s+)?(\d+)\s*(?:week|w)s?\s*(?:later)?", lambda m: timedelta(weeks=int(m.group(1)))),
    # N months (e.g., "1 month later") - approximate as 30 days
    (r"(?:after\s+)?(\d+)\s*(?:month|mo)s?\s*(?:later)?", lambda m: timedelta(days=int(m.group(1)) * 30)),
]


def parse_step_due_date(step: dict, base_date: datetime, step_index: int) -> datetime:
    """Parse step timing to compute due_at date.

    Priority:
    1. delay_days integer field (most reliable, from LLM structured output)
    2. timing string field (regex patterns)
    3. Default spacing (step_index + 1) * DEFAULT_SPACING_DAYS
    """
    # Primary: check delay_days field
    delay_days = step.get("delay_days")
    if delay_days is not None:
        try:
            days = int(delay_days)
            return base_date + timedelta(days=days)
        except (ValueError, TypeError):
            pass

    # Fallback: parse timing string
    timing = step.get("timing", "")
    if timing and isinstance(timing, str):
        timing_lower = timing.lower().strip()
        for pattern, delta_or_func in TIMING_PATTERNS:
            match = re.search(pattern, timing_lower, re.IGNORECASE)
            if match:
                if callable(delta_or_func):
                    delta = delta_or_func(match)
                else:
                    delta = delta_or_func
                return base_date + delta

    # Last resort: default spacing based on step position
    return base_date + timedelta(days=(step_index + 1) * DEFAULT_SPACING_DAYS)


async def schedule_plan_reminders(
    reminder_repo: ScheduledReminderRepo,
    lead_id: int,
    telegram_id: int,
    plan_steps: list[dict],
    base_date: datetime,
) -> None:
    """Create scheduled_reminders rows for each step in an engagement plan.

    This is idempotent: it cancels any existing pending reminders before creating new ones.
    """
    # Cancel existing pending reminders for this lead (idempotency)
    await reminder_repo.cancel_pending_for_lead(lead_id)

    created_count = 0
    for i, step in enumerate(plan_steps):
        step_id = step.get("step_id", i + 1)
        due_at = parse_step_due_date(step, base_date, i)
        draft_text = step.get("suggested_text") or step.get("description")

        try:
            await reminder_repo.create(
                ScheduledReminderModel(
                    lead_id=lead_id,
                    telegram_id=telegram_id,
                    step_id=step_id,
                    due_at=due_at.isoformat(),
                    status="pending",
                    draft_text=draft_text[:500] if draft_text else None,
                )
            )
            created_count += 1
        except Exception as e:
            logger.error(
                "Failed to create reminder for lead %s step %s: %s", lead_id, step_id, e
            )

    logger.info(
        "Scheduled %d reminders for lead %s (base: %s)",
        created_count,
        lead_id,
        base_date.isoformat(),
    )


async def _process_due_plan_reminders(
    bot: Bot,
    reminder_repo: ScheduledReminderRepo,
    lead_repo: LeadRegistryRepo,
    activity_repo: LeadActivityRepo,
) -> None:
    """Find and process reminders that are due."""
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    try:
        due_reminders = await reminder_repo.get_due_reminders(now_iso)
    except Exception as e:
        logger.error("Failed to query due reminders: %s", e)
        return

    for reminder in due_reminders:
        try:
            # Duplicate guard: skip if reminded recently (within check interval)
            if reminder.last_reminded_at:
                try:
                    last = datetime.fromisoformat(
                        reminder.last_reminded_at.replace("Z", "+00:00")
                    )
                    if (now - last).total_seconds() < PLAN_CHECK_INTERVAL:
                        continue
                except (ValueError, TypeError):
                    pass

            # Optimistic update BEFORE sending (at-most-once delivery)
            await reminder_repo.mark_reminded(reminder.id, now_iso)  # type: ignore[arg-type]

            # Fetch lead for context
            lead = await lead_repo.get_by_id(reminder.lead_id)
            if not lead:
                # Lead was deleted — mark reminder as skipped
                await reminder_repo.update_status(reminder.id, "skipped")  # type: ignore[arg-type]
                continue

            # Build notification text (simple Markdown, Phase 14 will upgrade)
            name = lead.prospect_name or f"Lead #{lead.id}"
            step_desc = reminder.draft_text or f"Step {reminder.step_id} of your engagement plan"

            text = (
                f"\U0001F514 *Engagement Step Due: {name}*\n\n"
                f"\U0001F4CB *Step {reminder.step_id}:* {step_desc[:200]}\n\n"
                f"Use /leads to view details and take action."
            )

            # Send notification
            await bot.send_message(
                chat_id=reminder.telegram_id,
                text=text,
                parse_mode="Markdown",
            )

            # Update status to sent if still pending
            if reminder.status == "pending":
                await reminder_repo.update_status(reminder.id, "sent")  # type: ignore[arg-type]

            logger.info(
                "Sent reminder for lead %s step %s to user %s",
                reminder.lead_id,
                reminder.step_id,
                reminder.telegram_id,
            )

            # Rate limiting: brief pause between sends
            await asyncio.sleep(0.5)

        except Exception as e:
            logger.error(
                "Failed to process reminder %s for lead %s: %s",
                reminder.id,
                reminder.lead_id,
                e,
            )


async def start_plan_scheduler(
    bot: Bot,
    reminder_repo: ScheduledReminderRepo,
    lead_repo: LeadRegistryRepo,
    activity_repo: LeadActivityRepo,
) -> None:
    """Background loop that checks for due plan step reminders every 15 minutes."""
    logger.info("Plan scheduler started (interval: %ds)", PLAN_CHECK_INTERVAL)

    while True:
        try:
            await _process_due_plan_reminders(bot, reminder_repo, lead_repo, activity_repo)
        except Exception as e:
            logger.error("Plan scheduler error: %s", e)

        await asyncio.sleep(PLAN_CHECK_INTERVAL)
