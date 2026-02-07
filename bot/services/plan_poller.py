"""Background poller for engagement plan generation requests (TMA -> Bot async message bus)."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from bot.services.engagement import EngagementService
from bot.services.plan_scheduler import schedule_plan_reminders
from bot.storage.repositories import LeadRegistryRepo, PlanRequestRepo, ScheduledReminderRepo

logger = logging.getLogger(__name__)

POLL_INTERVAL = 3  # seconds


async def _process_plan_request(
    request,
    engagement_service: EngagementService,
    plan_repo: PlanRequestRepo,
    lead_repo: LeadRegistryRepo,
    reminder_repo: ScheduledReminderRepo,
) -> None:
    """Process a single plan generation request."""
    try:
        lead = await lead_repo.get_by_id(request.lead_id)
        if not lead:
            await plan_repo.fail(request.id, f"Lead {request.lead_id} not found")
            return

        plan = await engagement_service.generate_plan(lead, lead.web_research)
        if not plan:
            await plan_repo.fail(request.id, "Empty plan generated")
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

    except Exception as e:
        logger.error("Plan request %d processing error: %s", request.id, e)
        try:
            await plan_repo.fail(request.id, str(e))
        except Exception:
            logger.error("Failed to mark plan request %d as failed", request.id)


async def start_plan_request_poller(
    engagement_service: EngagementService,
    plan_repo: PlanRequestRepo,
    lead_repo: LeadRegistryRepo,
    reminder_repo: ScheduledReminderRepo,
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
                )
        except Exception as e:
            logger.error("Plan poller iteration error: %s", e)

        await asyncio.sleep(POLL_INTERVAL)
