"""Background followup scheduler — sends re-engagement reminders."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from aiogram import Bot

from bot.storage.models import LeadActivityModel
from bot.storage.repositories import LeadActivityRepo, LeadRegistryRepo

logger = logging.getLogger(__name__)

# Check every 6 hours
CHECK_INTERVAL_SECONDS = 6 * 60 * 60

# Stop followups after 2 months
MAX_LEAD_AGE_DAYS = 60

# Schedule next followup 3-4 days later
FOLLOWUP_INTERVAL_DAYS = 3


async def _process_due_followups(
    bot: Bot,
    lead_repo: LeadRegistryRepo,
    activity_repo: LeadActivityRepo,
) -> None:
    """Find and process leads that are due for followup."""
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    try:
        due_leads = await lead_repo.get_due_followups(now_iso)
    except Exception as e:
        logger.error("Failed to query due followups: %s", e)
        return

    for lead in due_leads:
        try:
            # Check lead age — stop after MAX_LEAD_AGE_DAYS
            if lead.created_at:
                try:
                    created = datetime.fromisoformat(lead.created_at.replace("Z", "+00:00"))
                    age_days = (now - created).days
                    if age_days > MAX_LEAD_AGE_DAYS:
                        # Clear next_followup to stop reminders
                        await lead_repo.update_lead(lead.id, next_followup=None)  # type: ignore[arg-type]
                        logger.info(
                            "Lead %s is %d days old, stopping followups", lead.id, age_days
                        )
                        continue
                except (ValueError, TypeError):
                    pass

            # Build reminder message
            name = lead.prospect_name or "Unknown Prospect"
            company = f" @ {lead.prospect_company}" if lead.prospect_company else ""
            status = lead.status or "analyzed"

            # Suggest action based on plan progress
            suggested_action = "Check in on this lead"
            if lead.engagement_plan:
                pending_steps = [
                    s for s in lead.engagement_plan if s.get("status") != "done"
                ]
                if pending_steps:
                    next_step = pending_steps[0]
                    suggested_action = next_step.get("description", suggested_action)

            reminder_text = (
                f"🔔 *Lead Followup Reminder*\n\n"
                f"📋 *{name}*{company}\n"
                f"Status: {status}\n"
                f"Followup #{lead.followup_count + 1}\n\n"
                f"💡 *Suggested action:*\n{suggested_action}\n\n"
                f"Use /leads to view details and update."
            )

            # Send reminder to the user
            await bot.send_message(
                chat_id=lead.telegram_id,
                text=reminder_text,
                parse_mode="Markdown",
            )

            # Log the followup
            await activity_repo.create(
                LeadActivityModel(
                    lead_id=lead.id,  # type: ignore[arg-type]
                    telegram_id=lead.telegram_id,
                    activity_type="followup_sent",
                    content=f"Followup #{lead.followup_count + 1}: {suggested_action}",
                )
            )

            # Schedule next followup
            next_followup = (now + timedelta(days=FOLLOWUP_INTERVAL_DAYS)).isoformat()
            await lead_repo.update_lead(
                lead.id,  # type: ignore[arg-type]
                followup_count=lead.followup_count + 1,
                next_followup=next_followup,
            )

            logger.info("Sent followup #%d for lead %s", lead.followup_count + 1, lead.id)

        except Exception as e:
            logger.error("Failed to process followup for lead %s: %s", lead.id, e)


async def start_followup_scheduler(
    bot: Bot,
    lead_repo: LeadRegistryRepo,
    activity_repo: LeadActivityRepo,
) -> None:
    """Background loop that checks for due followups every 6 hours."""
    logger.info("Followup scheduler started (interval: %ds)", CHECK_INTERVAL_SECONDS)

    while True:
        try:
            await _process_due_followups(bot, lead_repo, activity_repo)
        except Exception as e:
            logger.error("Followup scheduler error: %s", e)

        await asyncio.sleep(CHECK_INTERVAL_SECONDS)
