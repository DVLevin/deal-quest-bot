"""Background poller for TMA-to-Bot event bus (cross-interface notifications)."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from aiogram import Bot

from bot.storage.repositories import LeadRegistryRepo, TmaEventRepo

logger = logging.getLogger(__name__)

POLL_INTERVAL = 3  # seconds


def _format_relative_date(iso_date: str) -> str:
    """Format an ISO date as a human-readable relative string."""
    try:
        dt = datetime.fromisoformat(iso_date.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        diff = dt - now

        days = diff.days
        if days < 0:
            return "overdue"
        if days == 0:
            return "today"
        if days == 1:
            return "tomorrow"
        if days < 7:
            return f"in {days} days"
        weeks = days // 7
        if weeks == 1:
            return "in 1 week"
        return f"in {weeks} weeks"
    except (ValueError, TypeError):
        return iso_date


def _format_confirmation_message(event_type: str, payload: dict, lead_name: str) -> str:
    """Format a human-readable confirmation message for a TMA event."""
    if event_type == "step_completed":
        step_desc = payload.get("step_desc", f"Step {payload.get('step_id', '?')}")
        msg = f"Step completed for *{lead_name}*: {step_desc}"
        next_step_desc = payload.get("next_step_desc")
        next_step_due = payload.get("next_step_due")
        if next_step_desc:
            due_info = ""
            if next_step_due:
                due_info = f" (due {_format_relative_date(next_step_due)})"
            msg += f"\nNext: {next_step_desc}{due_info}"
        else:
            msg += "\nAll engagement steps complete!"
        return msg

    if event_type == "step_skipped":
        step_desc = payload.get("step_desc", f"Step {payload.get('step_id', '?')}")
        msg = f"Step skipped for *{lead_name}*: {step_desc}"
        reason = payload.get("reason")
        if reason:
            msg += f"\nReason: {reason}"
        return msg

    if event_type == "status_changed":
        old_status = payload.get("old_status", "unknown")
        new_status = payload.get("new_status", "unknown")
        return f"Lead status updated: *{lead_name}* {old_status} -> {new_status}"

    if event_type == "lead_assigned":
        member_name = payload.get("member_name", "a team member")
        return f"*{lead_name}* assigned to {member_name}."

    # Fallback for unknown event types
    return f"Action completed for *{lead_name}*."


async def _process_tma_event(
    bot: Bot,
    event,
    event_repo: TmaEventRepo,
    lead_repo: LeadRegistryRepo,
) -> None:
    """Process a single TMA event: look up lead, format message, send via Telegram."""
    try:
        # Resolve lead name from lead_id if available
        lead_name = "your lead"
        if event.lead_id:
            try:
                lead = await lead_repo.get_by_id(event.lead_id)
                if lead and lead.prospect_name:
                    lead_name = lead.prospect_name
            except Exception:
                pass

        # Fall back to payload-provided name
        if lead_name == "your lead":
            lead_name = event.payload.get("lead_name", "your lead")

        message = _format_confirmation_message(event.event_type, event.payload, lead_name)

        try:
            await bot.send_message(
                chat_id=event.telegram_id,
                text=message,
                parse_mode="Markdown",
            )
        except Exception as e:
            logger.error("Failed to send TMA event message to %s: %s", event.telegram_id, e)

        # At-most-once delivery: always mark as delivered even if send failed
        await event_repo.mark_delivered(event.id)

    except Exception as e:
        logger.error("Error processing TMA event %d: %s", event.id, e)
        try:
            await event_repo.mark_delivered(event.id)
        except Exception:
            logger.error("Failed to mark TMA event %d as delivered after error", event.id)


async def start_tma_event_poller(
    bot: Bot,
    event_repo: TmaEventRepo,
    lead_repo: LeadRegistryRepo,
) -> None:
    """Poll tma_events table and process pending events."""
    try:
        recovered = await event_repo.reset_stale_processing(max_age_minutes=2)
        if recovered:
            logger.info("Recovered %d stale TMA events back to pending", recovered)
    except Exception as e:
        logger.error("Failed to recover stale TMA events: %s", e)

    logger.info("TMA event poller started (interval: %ds)", POLL_INTERVAL)

    while True:
        try:
            event = await event_repo.claim_next()
            if event:
                await _process_tma_event(bot, event, event_repo, lead_repo)
        except Exception as e:
            logger.error("TMA event poller iteration error: %s", e)

        await asyncio.sleep(POLL_INTERVAL)
