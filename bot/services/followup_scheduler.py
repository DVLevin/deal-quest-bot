"""Background followup scheduler — sends re-engagement reminders and stale lead digests."""

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

# Stale lead threshold — leads without updates for this many days trigger digest
STALE_THRESHOLD_DAYS = 7

# Stale digest interval — send at most once per 24 hours
_STALE_DIGEST_INTERVAL = timedelta(hours=24)


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


async def _send_stale_digest(
    bot: Bot,
    lead_repo: LeadRegistryRepo,
) -> None:
    """Query stale leads (no update for STALE_THRESHOLD_DAYS), group by user, and send digest."""
    now = datetime.now(timezone.utc)
    stale_cutoff = now - timedelta(days=STALE_THRESHOLD_DAYS)

    try:
        # Fetch all active leads (not closed)
        all_leads = await lead_repo.get_all(limit=500)
    except Exception as e:
        logger.error("Failed to query leads for stale digest: %s", e)
        return

    # Filter to stale leads: active status and updated_at older than threshold
    stale_leads = []
    for lead in all_leads:
        if lead.status in ("closed_won", "closed_lost"):
            continue
        if not lead.updated_at:
            continue
        try:
            updated = datetime.fromisoformat(lead.updated_at.replace("Z", "+00:00"))
            if updated < stale_cutoff:
                stale_leads.append(lead)
        except (ValueError, TypeError):
            continue

    if not stale_leads:
        logger.debug("No stale leads found, skipping digest")
        return

    # Group by telegram_id
    by_user: dict[int, list] = {}
    for lead in stale_leads:
        by_user.setdefault(lead.telegram_id, []).append(lead)

    # Send digest to each user
    for telegram_id, user_leads in by_user.items():
        try:
            # Build digest message
            lines = [
                f"📊 *Stale Lead Digest*\n",
                f"You have *{len(user_leads)}* lead{'s' if len(user_leads) != 1 else ''} "
                f"with no activity for {STALE_THRESHOLD_DAYS}+ days:\n",
            ]

            for lead in user_leads[:10]:  # Cap at 10 leads per message
                name = lead.prospect_name or "Unknown"
                company = f" @ {lead.prospect_company}" if lead.prospect_company else ""
                status = lead.status or "analyzed"
                # Calculate days since last update
                days_stale = 0
                if lead.updated_at:
                    try:
                        updated = datetime.fromisoformat(lead.updated_at.replace("Z", "+00:00"))
                        days_stale = (now - updated).days
                    except (ValueError, TypeError):
                        pass

                lines.append(f"• *{name}*{company} — {status} ({days_stale}d)")

            if len(user_leads) > 10:
                lines.append(f"\n... and {len(user_leads) - 10} more")

            lines.append("\n💡 Review these leads and update their status or add context.")
            lines.append("Use /leads to manage your pipeline.")

            digest_text = "\n".join(lines)

            await bot.send_message(
                chat_id=telegram_id,
                text=digest_text,
                parse_mode="Markdown",
            )

            logger.info(
                "Sent stale lead digest to user %d (%d stale leads)",
                telegram_id,
                len(user_leads),
            )

        except Exception as e:
            logger.error("Failed to send stale digest to user %d: %s", telegram_id, e)


async def start_followup_scheduler(
    bot: Bot,
    lead_repo: LeadRegistryRepo,
    activity_repo: LeadActivityRepo,
) -> None:
    """Background loop that checks for due followups every 6 hours and sends daily stale digest."""
    logger.info("Followup scheduler started (interval: %ds)", CHECK_INTERVAL_SECONDS)

    _last_stale_digest: datetime | None = None

    while True:
        try:
            await _process_due_followups(bot, lead_repo, activity_repo)
        except Exception as e:
            logger.error("Followup scheduler error: %s", e)

        # Stale lead digest — once per 24 hours
        now = datetime.now(timezone.utc)
        if _last_stale_digest is None or (now - _last_stale_digest) >= _STALE_DIGEST_INTERVAL:
            try:
                await _send_stale_digest(bot, lead_repo)
                _last_stale_digest = now
                logger.info("Stale lead digest check completed")
            except Exception as e:
                logger.error("Stale digest error: %s", e)

        await asyncio.sleep(CHECK_INTERVAL_SECONDS)
