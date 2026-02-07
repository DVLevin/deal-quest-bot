"""Background poller for draft generation requests (TMA -> Bot async message bus)."""

from __future__ import annotations

import asyncio
import base64
import logging

import httpx

from bot.agents.base import AgentInput
from bot.agents.registry import AgentRegistry
from bot.pipeline.context import PipelineContext
from bot.services.image_utils import pre_resize_image
from bot.services.llm_router import create_provider
from bot.services.model_config import ModelConfigService
from bot.storage.repositories import DraftRequestRepo

logger = logging.getLogger(__name__)

POLL_INTERVAL = 3  # seconds


async def _fetch_and_encode_image(proof_url: str) -> str | None:
    """Fetch image from URL, pre-resize for vision model, and base64-encode."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(proof_url)
            resp.raise_for_status()
            image_bytes = resp.content

        resized = pre_resize_image(image_bytes)
        return base64.b64encode(resized).decode("ascii")
    except Exception as e:
        logger.error("Failed to fetch/encode image from %s: %s", proof_url, e)
        return None


async def _process_draft_request(
    request,
    agent_registry: AgentRegistry,
    model_config_service: ModelConfigService,
    draft_repo: DraftRequestRepo,
    shared_openrouter_key: str,
) -> None:
    """Process a single draft request through the CommentGeneratorAgent."""
    default_llm = None
    try:
        image_b64 = await _fetch_and_encode_image(request.proof_url)
        if not image_b64:
            await draft_repo.fail(request.id, "Failed to fetch screenshot image")
            return

        try:
            agent = agent_registry.get("comment_generator")
        except KeyError:
            await draft_repo.fail(request.id, "comment_generator agent not registered")
            return

        default_llm = create_provider("openrouter", shared_openrouter_key)

        ctx = PipelineContext(
            llm=default_llm,
            image_b64=image_b64,
            telegram_id=request.telegram_id,
            model_config=model_config_service,
        )

        # Resolve per-agent model override (always returns a provider)
        ctx.llm = await ctx.get_llm_for_agent(agent.name)

        agent_input = AgentInput(
            user_message="Generate contextual response options from this screenshot.",
            context={"lead_context": request.lead_context or {}},
        )

        output = await agent.run(agent_input, ctx)

        if output.success:
            await draft_repo.complete(request.id, output.data)
            logger.info(
                "Draft request %d completed for lead %d step %d",
                request.id, request.lead_id, request.step_id,
            )
        else:
            await draft_repo.fail(request.id, output.error or "Agent returned unsuccessful result")
            logger.warning(
                "Draft request %d failed for lead %d: %s",
                request.id, request.lead_id, output.error,
            )

    except Exception as e:
        logger.error("Draft request %d processing error: %s", request.id, e)
        try:
            await draft_repo.fail(request.id, str(e))
        except Exception:
            logger.error("Failed to mark draft request %d as failed", request.id)
    finally:
        if default_llm:
            try:
                await default_llm.close()
            except Exception:
                pass


async def start_draft_request_poller(
    agent_registry: AgentRegistry,
    model_config_service: ModelConfigService,
    draft_repo: DraftRequestRepo,
    shared_openrouter_key: str,
) -> None:
    """Poll draft_requests table and process pending requests."""
    try:
        recovered = await draft_repo.reset_stale_processing(max_age_minutes=2)
        if recovered:
            logger.info("Recovered %d stale draft requests back to pending", recovered)
    except Exception as e:
        logger.error("Failed to recover stale draft requests: %s", e)

    logger.info("Draft request poller started (interval: %ds)", POLL_INTERVAL)

    while True:
        try:
            request = await draft_repo.claim_next_pending()
            if request:
                await _process_draft_request(
                    request,
                    agent_registry,
                    model_config_service,
                    draft_repo,
                    shared_openrouter_key,
                )
        except Exception as e:
            logger.error("Draft poller iteration error: %s", e)

        await asyncio.sleep(POLL_INTERVAL)
