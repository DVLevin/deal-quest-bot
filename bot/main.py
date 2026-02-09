"""Deal Quest Bot — main entry point with DI wiring and polling."""

from __future__ import annotations

import asyncio
import logging
import sys

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage

from bot.agents.comment_generator import CommentGeneratorAgent
from bot.agents.extraction import ExtractionAgent
from bot.agents.memory import MemoryAgent
from bot.agents.reanalysis_strategist import ReanalysisStrategistAgent
from bot.agents.registry import AgentRegistry
from bot.agents.strategist import StrategistAgent
from bot.agents.trainer import TrainerAgent
from bot.config import load_settings
from bot.handlers import admin, comment, context_input, leads, learn, progress, reminders, settings, start, stats, support, train
from bot.middleware import AuthorizationMiddleware
from bot.pipeline.config_loader import load_all_pipelines
from bot.services.analytics import TeamAnalyticsService
from bot.services.casebook import CasebookService
from bot.services.crypto import CryptoService
from bot.services.draft_poller import start_draft_request_poller
from bot.services.plan_poller import start_plan_request_poller
from bot.services.engagement import EngagementService
from bot.services.followup_scheduler import start_followup_scheduler
from bot.services.model_config import ModelConfigService
from bot.services.plan_scheduler import start_plan_scheduler
from bot.services.knowledge import KnowledgeService
from bot.services.scenario_generator import ScenarioGeneratorService
from bot.services.transcription import TranscriptionService
from bot.storage.insforge_client import InsForgeClient
from bot.task_utils import create_background_task
from bot.storage.repositories import (
    AgentModelConfigRepo,
    AttemptRepo,
    CasebookRepo,
    DraftRequestRepo,
    GeneratedScenarioRepo,
    PlanRequestRepo,
    LeadActivityRepo,
    LeadRegistryRepo,
    ScheduledReminderRepo,
    ScenariosSeenRepo,
    SupportSessionRepo,
    TraceRepo,
    TrackProgressRepo,
    UserMemoryRepo,
    UserRepo,
)
from bot.tracing import init_collector
from bot.tracing.collector import get_collector
from bot.tracing.langfuse_setup import init_langfuse, shutdown_langfuse
from bot.utils_tma import setup_menu_button

logger = logging.getLogger(__name__)


def setup_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        stream=sys.stdout,
    )


async def main() -> None:
    # Load settings
    cfg = load_settings()
    setup_logging(cfg.log_level)
    logger.info("Starting Deal Quest Bot...")

    # Initialize Langfuse observability
    langfuse_enabled = init_langfuse(cfg)
    if langfuse_enabled:
        logger.info("Langfuse observability enabled")

    # Initialize InsForge client
    insforge = InsForgeClient(cfg.insforge_base_url, cfg.insforge_anon_key)

    # Initialize repositories
    user_repo = UserRepo(insforge)
    memory_repo = UserMemoryRepo(insforge)
    seen_repo = ScenariosSeenRepo(insforge)
    attempt_repo = AttemptRepo(insforge)
    session_repo = SupportSessionRepo(insforge)
    track_repo = TrackProgressRepo(insforge)
    casebook_repo = CasebookRepo(insforge)
    lead_repo = LeadRegistryRepo(insforge)
    activity_repo = LeadActivityRepo(insforge)
    generated_scenario_repo = GeneratedScenarioRepo(insforge)
    trace_repo = TraceRepo(insforge)
    reminder_repo = ScheduledReminderRepo(insforge)
    model_config_repo = AgentModelConfigRepo(insforge)
    draft_request_repo = DraftRequestRepo(insforge)
    plan_request_repo = PlanRequestRepo(insforge)

    # Initialize services
    crypto = CryptoService(cfg.encryption_key)
    knowledge = KnowledgeService()
    knowledge.load()
    casebook_service = CasebookService(casebook_repo)
    transcription = TranscriptionService(cfg.assemblyai_api_key)
    analytics_service = TeamAnalyticsService(attempt_repo, user_repo)

    # Engagement service (requires shared OpenRouter key)
    engagement_service: EngagementService | None = None
    scenario_generator: ScenarioGeneratorService | None = None
    if cfg.openrouter_api_key:
        engagement_service = EngagementService(cfg.openrouter_api_key)
        logger.info("Engagement service initialized with shared OpenRouter key")
        scenario_generator = ScenarioGeneratorService(
            casebook_repo, generated_scenario_repo, knowledge, cfg.openrouter_api_key,
        )
        logger.info("Scenario generator service initialized")
    else:
        logger.warning("No OPENROUTER_API_KEY set — engagement features disabled")

    # Initialize model config service (per-agent model overrides)
    model_config_service = ModelConfigService(model_config_repo, cfg.openrouter_api_key or "")
    if cfg.openrouter_api_key:
        logger.info("Model config service initialized (per-agent overrides enabled)")
    else:
        logger.info("Model config service initialized (no shared key, overrides will be no-op)")

    # Initialize agent registry
    agent_registry = AgentRegistry()
    agent_registry.register(ExtractionAgent())
    agent_registry.register(StrategistAgent())
    agent_registry.register(TrainerAgent())
    agent_registry.register(MemoryAgent())
    agent_registry.register(ReanalysisStrategistAgent())
    agent_registry.register(CommentGeneratorAgent())

    # Load pipeline configs (validates YAML at startup)
    pipelines = load_all_pipelines()
    logger.info("Loaded %d pipelines: %s", len(pipelines), list(pipelines.keys()))

    # Initialize tracing collector
    trace_collector = init_collector(trace_repo)
    await trace_collector.start()
    logger.info("Trace collector started")

    # Initialize bot and dispatcher
    bot = Bot(
        token=cfg.telegram_bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.MARKDOWN),
    )
    dp = Dispatcher(storage=MemoryStorage())

    # Register authorization middleware
    if cfg.allowed_list:
        auth_middleware = AuthorizationMiddleware(cfg.allowed_list)
        dp.message.middleware(auth_middleware)
        dp.callback_query.middleware(auth_middleware)
        logger.info("Authorization enabled for: %s", cfg.allowed_list)
    else:
        logger.warning("No ALLOWED_USERNAMES set — bot is open to everyone!")

    # Set up TMA menu button
    await setup_menu_button(bot, cfg.tma_url)

    # Inject dependencies via workflow_data
    dp.workflow_data.update(
        {
            "user_repo": user_repo,
            "memory_repo": memory_repo,
            "seen_repo": seen_repo,
            "attempt_repo": attempt_repo,
            "session_repo": session_repo,
            "track_repo": track_repo,
            "casebook_repo": casebook_repo,
            "lead_repo": lead_repo,
            "activity_repo": activity_repo,
            "generated_scenario_repo": generated_scenario_repo,
            "trace_repo": trace_repo,
            "reminder_repo": reminder_repo,
            "insforge": insforge,
            "crypto": crypto,
            "knowledge": knowledge,
            "casebook_service": casebook_service,
            "agent_registry": agent_registry,
            "default_openrouter_model": cfg.default_openrouter_model,
            "shared_openrouter_key": cfg.openrouter_api_key,
            "transcription": transcription,
            "engagement_service": engagement_service,
            "model_config_service": model_config_service,
            "analytics_service": analytics_service,
            "admin_usernames": cfg.admin_list,
            "tma_url": cfg.tma_url,
        }
    )

    # Register routers
    dp.include_router(progress.router)
    dp.include_router(start.router)
    dp.include_router(support.router)
    dp.include_router(learn.router)
    dp.include_router(train.router)
    dp.include_router(stats.router)
    dp.include_router(settings.router)
    dp.include_router(leads.router)
    dp.include_router(reminders.router)
    dp.include_router(context_input.router)
    dp.include_router(comment.router)
    dp.include_router(admin.router)

    logger.info("Bot initialized. Starting polling...")

    # Start followup scheduler in background
    if engagement_service:
        create_background_task(
            start_followup_scheduler(bot, lead_repo, activity_repo),
            name="followup_scheduler",
        )
        logger.info("Followup scheduler started")

        # Start plan step reminder scheduler in background
        create_background_task(
            start_plan_scheduler(bot, reminder_repo, lead_repo, activity_repo, cfg.tma_url),
            name="plan_scheduler",
        )
        logger.info("Plan scheduler started (15-minute interval)")

        # Start draft request poller for TMA draft generation
        create_background_task(
            start_draft_request_poller(
                agent_registry,
                model_config_service,
                draft_request_repo,
                cfg.openrouter_api_key,
            ),
            name="draft_request_poller",
        )
        logger.info("Draft request poller started (3-second interval)")

        # Start plan request poller for TMA plan generation
        create_background_task(
            start_plan_request_poller(
                engagement_service,
                plan_request_repo,
                lead_repo,
                reminder_repo,
                bot,
                cfg.tma_url,
            ),
            name="plan_request_poller",
        )
        logger.info("Plan request poller started (3-second interval)")

    # Start background scenario generation loop
    if scenario_generator:
        async def _scenario_generation_loop() -> None:
            """Periodically ensure the generated scenario pool has enough entries."""
            while True:
                try:
                    await scenario_generator.ensure_pool_size(20)
                except Exception as e:
                    logger.error("Scenario generation loop error: %s", e)
                await asyncio.sleep(6 * 60 * 60)  # Every 6 hours

        create_background_task(_scenario_generation_loop(), name="scenario_generation_loop")
        logger.info("Scenario generation loop started (every 6 hours)")

    try:
        await dp.start_polling(bot)
    finally:
        shutdown_langfuse()
        logger.info("Langfuse flushed")
        collector = get_collector()
        if collector:
            await collector.stop()
            logger.info("Trace collector stopped")
        await model_config_service.close()
        await insforge.close()
        logger.info("Bot stopped.")


if __name__ == "__main__":
    asyncio.run(main())
