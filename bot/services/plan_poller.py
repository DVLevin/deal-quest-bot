"""Background poller for engagement plan generation requests (TMA -> Bot async message bus)."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from aiogram import Bot
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from bot.services.engagement import EngagementService
from bot.services.plan_scheduler import schedule_plan_reminders
from bot.storage.repositories import LeadRegistryRepo, PlanRequestRepo, ScheduledReminderRepo
from bot.utils_tma import add_open_in_app_row

logger = logging.getLogger(__name__)

POLL_INTERVAL = 3  # seconds


async def _notify_plan_ready(
    bot: Bot,
    telegram_id: int,
    lead_id: int,
    lead_name: str,
    step_count: int,
    tma_url: str = "",
) -> None:
    """Send a Telegram notification when the plan is ready."""
    try:
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="\U0001F4CB View Lead",
                    callback_data=f"lead:view:{lead_id}",
                ),
            ],
        ])
        keyboard = add_open_in_app_row(keyboard, tma_url, path=f"leads/{lead_id}", query_params={"section": "plan"})

        await bot.send_message(
            chat_id=telegram_id,
            text=(
                f"\u2705 *Engagement plan ready!*\n\n"
                f"\U0001F464 *{lead_name}*\n"
                f"\U0001F4CB {step_count} steps generated\n\n"
                f"Open the lead to start executing your plan."
            ),
            parse_mode="Markdown",
            reply_markup=keyboard,
        )
    except Exception as e:
        logger.error("Failed to send plan-ready notification to %s: %s", telegram_id, e)


async def _notify_plan_failed(
    bot: Bot,
    telegram_id: int,
    lead_name: str,
    error_msg: str,
) -> None:
    """Send a Telegram notification when plan generation fails."""
    try:
        await bot.send_message(
            chat_id=telegram_id,
            text=(
                f"\u274C *Plan generation failed*\n\n"
                f"\U0001F464 *{lead_name}*\n"
                f"Error: {error_msg}\n\n"
                f"Please try again from the app."
            ),
            parse_mode="Markdown",
        )
    except Exception as e:
        logger.error("Failed to send plan-failed notification to %s: %s", telegram_id, e)


async def _process_plan_request(
    request,
    engagement_service: EngagementService,
    plan_repo: PlanRequestRepo,
    lead_repo: LeadRegistryRepo,
    reminder_repo: ScheduledReminderRepo,
    bot: Bot,
    tma_url: str = "",
) -> None:
    """Process a single plan generation request."""
    try:
        lead = await lead_repo.get_by_id(request.lead_id)
        if not lead:
            await plan_repo.fail(request.id, f"Lead {request.lead_id} not found")
            return

        lead_name = lead.prospect_name or f"Lead #{lead.id}"

        plan = await engagement_service.generate_plan(lead, lead.web_research)
        if not plan:
            await plan_repo.fail(request.id, "Empty plan generated")
            await _notify_plan_failed(bot, request.telegram_id, lead_name, "AI returned an empty plan. Please try again.")
            return

        await lead_repo.update_lead(
            request.lead_id,
            engagement_plan=plan,
            next_followup=(datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
        )

        try:
            await schedule_plan_reminders(
                reminder_repo=reminder_repo,
                lead_id=request.lead_id,
                telegram_id=request.telegram_id,
                plan_steps=plan,
                base_date=datetime.now(timezone.utc),
            )
        except Exception as e:
            logger.error("Failed to schedule reminders for plan request %d: %s", request.id, e)

        await plan_repo.complete(request.id, {"plan": plan, "step_count": len(plan)})
        logger.info(
            "Plan request %d completed for lead %d (%d steps)",
            request.id, request.lead_id, len(plan),
        )

        # Notify user via Telegram
        await _notify_plan_ready(
            bot, request.telegram_id, request.lead_id, lead_name, len(plan), tma_url,
        )

    except Exception as e:
        logger.error("Plan request %d processing error: %s", request.id, e)
        try:
            await plan_repo.fail(request.id, str(e))
        except Exception:
            logger.error("Failed to mark plan request %d as failed", request.id)

        # Notify user of failure
        lead_name = "your lead"
        try:
            lead = await lead_repo.get_by_id(request.lead_id)
            if lead:
                lead_name = lead.prospect_name or f"Lead #{lead.id}"
        except Exception:
            pass
        await _notify_plan_failed(bot, request.telegram_id, lead_name, str(e))


async def start_plan_request_poller(
    engagement_service: EngagementService,
    plan_repo: PlanRequestRepo,
    lead_repo: LeadRegistryRepo,
    reminder_repo: ScheduledReminderRepo,
    bot: Bot,
    tma_url: str = "",
) -> None:
    """Poll plan_requests table and process pending requests."""
    try:
        recovered = await plan_repo.reset_stale_processing(max_age_minutes=2)
        if recovered:
            logger.info("Recovered %d stale plan requests back to pending", recovered)
    except Exception as e:
        logger.error("Failed to recover stale plan requests: %s", e)

    logger.info("Plan request poller started (interval: %ds)", POLL_INTERVAL)

    while True:
        try:
            request = await plan_repo.claim_next_pending()
            if request:
                await _process_plan_request(
                    request,
                    engagement_service,
                    plan_repo,
                    lead_repo,
                    reminder_repo,
                    bot,
                    tma_url,
                )
        except Exception as e:
            logger.error("Plan poller iteration error: %s", e)

        await asyncio.sleep(POLL_INTERVAL)
