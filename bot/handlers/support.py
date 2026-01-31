"""Handler for /support — deal analysis with strategist agent pipeline."""

from __future__ import annotations

import io
import logging
import time

from aiogram import Bot, F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)

from bot.agents.registry import AgentRegistry
from bot.pipeline.config_loader import load_pipeline
from bot.pipeline.context import PipelineContext
from bot.pipeline.runner import PipelineRunner
from bot.services.casebook import CasebookService
from bot.services.crypto import CryptoService
from bot.services.knowledge import KnowledgeService
from bot.services.llm_router import create_provider
from bot.services.transcription import TranscriptionService
from bot.states import SupportState
from bot.storage.insforge_client import InsForgeClient
from bot.storage.models import LeadRegistryModel, SupportSessionModel
from bot.storage.repositories import (
    LeadRegistryRepo,
    SupportSessionRepo,
    UserMemoryRepo,
    UserRepo,
)
from bot.utils import format_support_response

logger = logging.getLogger(__name__)

router = Router(name="support")

SUPPORT_ACTIONS = InlineKeyboardMarkup(
    inline_keyboard=[
        [
            InlineKeyboardButton(text="🔄 Regenerate", callback_data="support:regen"),
            InlineKeyboardButton(text="✂️ Shorter", callback_data="support:shorter"),
        ],
        [
            InlineKeyboardButton(text="🔥 More Aggressive", callback_data="support:aggressive"),
            InlineKeyboardButton(text="✅ Done", callback_data="support:done"),
        ],
    ]
)


@router.message(Command("support"))
async def cmd_support(message: Message, state: FSMContext, user_repo: UserRepo) -> None:
    """Start support mode."""
    tg_id = message.from_user.id  # type: ignore[union-attr]
    user = await user_repo.get_by_telegram_id(tg_id)

    if not user or not user.encrypted_api_key:
        await message.answer("Please run /start first to set up your account.")
        return

    await message.answer(
        "📊 *Support Mode*\n\n"
        "Describe your prospect or deal situation:\n"
        "📝 *Text* — role, company, context, what they said\n"
        "📸 *Photo* — LinkedIn screenshot, email, profile\n"
        "🎙️ *Voice* — just talk, I'll transcribe it\n\n"
        "I'll provide analysis, strategy, engagement tactics, and a draft response.\n\n"
        "🎙️ *Voice messages work great here!*\n\n"
        "_Photos are saved to your lead registry for tracking._",
        parse_mode="Markdown",
    )
    await state.set_state(SupportState.waiting_input)


async def _run_support_pipeline(
    *,
    user_input: str,
    tg_id: int,
    user_repo: UserRepo,
    memory_repo: UserMemoryRepo,
    session_repo: SupportSessionRepo,
    lead_repo: LeadRegistryRepo,
    crypto: CryptoService,
    knowledge: KnowledgeService,
    casebook_service: CasebookService,
    agent_registry: AgentRegistry,
    status_msg: Message,
    state: FSMContext,
    photo_url: str | None = None,
    photo_key: str | None = None,
    input_type: str = "text",
) -> None:
    """Run the strategist pipeline and log to lead registry."""
    user = await user_repo.get_by_telegram_id(tg_id)
    if not user or not user.encrypted_api_key:
        await status_msg.edit_text("❌ Please run /start first.")
        await state.clear()
        return

    try:
        # Decrypt API key and create provider
        api_key = crypto.decrypt(user.encrypted_api_key)
        if not api_key:
            await status_msg.edit_text("❌ Failed to decrypt API key. Please update in /settings.")
            return

        model = user.openrouter_model if user.provider == "openrouter" else None
        llm = create_provider(user.provider, api_key, model)

        # Get user memory
        memory_record = await memory_repo.get(tg_id)
        memory_data = (memory_record.memory_data or {}) if memory_record else {}

        # Get casebook context
        casebook_text = await casebook_service.find_similar("unknown", "general")

        # Build pipeline context
        ctx = PipelineContext(
            llm=llm,
            knowledge_base=knowledge.combined,
            user_memory=memory_data,
            casebook_text=casebook_text,
            user_message=user_input,
            telegram_id=tg_id,
            user_id=user.id or 0,
        )

        # Run support pipeline
        pipeline_config = load_pipeline("support")
        runner = PipelineRunner(agent_registry)
        await runner.run(pipeline_config, ctx)

        # Get strategist output
        strategist_result = ctx.get_result("strategist")
        if not strategist_result or not strategist_result.success:
            error = strategist_result.error if strategist_result else "Unknown error"
            await status_msg.edit_text(f"❌ Analysis failed: {error}")
            await llm.close()
            return

        output_data = strategist_result.data

        # Handle memory update from background agent
        memory_result = ctx.get_result("memory")
        if memory_result and memory_result.success:
            updated_memory = memory_result.data.get("updated_memory")
            if updated_memory:
                await memory_repo.update_memory(tg_id, updated_memory)

        # Format and send response
        response_text = format_support_response(output_data)
        await status_msg.edit_text(response_text, reply_markup=SUPPORT_ACTIONS)

        # Store in state for regeneration
        await state.update_data(
            last_input=user_input,
            last_output=output_data,
            provider=user.provider,
            photo_url=photo_url,
            photo_key=photo_key,
            input_type=input_type,
        )

        # Save support session
        try:
            await session_repo.create(
                SupportSessionModel(
                    user_id=user.id,
                    telegram_id=tg_id,
                    input_text=user_input,
                    output_json=output_data,
                    provider_used=user.provider,
                )
            )
        except Exception as e:
            logger.error("Failed to save support session: %s", e)

        # Save to lead registry
        try:
            analysis = output_data.get("prospect_analysis", "")
            strategy = output_data.get("closing_strategy", "")
            engagement = output_data.get("engagement_tactics", "")
            draft = output_data.get("draft_response", "")

            # Try to extract prospect name/title/company from analysis
            prospect_name = _extract_field(analysis, "name")
            prospect_title = _extract_field(analysis, "title") or _extract_field(analysis, "role")
            prospect_company = _extract_field(analysis, "company")

            await lead_repo.create(
                LeadRegistryModel(
                    user_id=user.id,
                    telegram_id=tg_id,
                    prospect_name=prospect_name,
                    prospect_title=prospect_title,
                    prospect_company=prospect_company,
                    photo_url=photo_url,
                    photo_key=photo_key,
                    prospect_analysis=analysis if isinstance(analysis, str) else str(analysis),
                    closing_strategy=strategy if isinstance(strategy, str) else str(strategy),
                    engagement_tactics=engagement if isinstance(engagement, str) else str(engagement),
                    draft_response=draft if isinstance(draft, str) else str(draft),
                    input_type=input_type,
                    original_context=user_input[:2000],
                )
            )
            logger.info("Lead registered for user %s", tg_id)
        except Exception as e:
            logger.error("Failed to save lead registry: %s", e)

        await llm.close()

    except Exception as e:
        logger.error("Support pipeline error: %s", e)
        await status_msg.edit_text(f"❌ Something went wrong: {str(e)[:200]}")


def _extract_field(analysis: str | dict, field: str) -> str | None:
    """Try to extract a field from analysis output (dict or text)."""
    if isinstance(analysis, dict):
        for key in (field, field.capitalize(), field.upper()):
            if key in analysis:
                return str(analysis[key])[:200]
    return None


@router.message(SupportState.waiting_input, F.photo)
async def on_support_photo(
    message: Message,
    state: FSMContext,
    bot: Bot,
    user_repo: UserRepo,
    memory_repo: UserMemoryRepo,
    session_repo: SupportSessionRepo,
    lead_repo: LeadRegistryRepo,
    crypto: CryptoService,
    knowledge: KnowledgeService,
    casebook_service: CasebookService,
    agent_registry: AgentRegistry,
    insforge: InsForgeClient,
) -> None:
    """Process photo upload in support mode — download, store, analyze."""
    tg_id = message.from_user.id  # type: ignore[union-attr]

    status_msg = await message.answer("📸 Saving photo & analyzing prospect...")

    # Download the largest photo from Telegram
    photo = message.photo[-1]  # type: ignore[index]
    file = await bot.get_file(photo.file_id)

    file_bytes_io = io.BytesIO()
    await bot.download_file(file.file_path, file_bytes_io)  # type: ignore[arg-type]
    file_bytes = file_bytes_io.getvalue()

    # Upload to InsForge storage
    photo_url: str | None = None
    photo_key: str | None = None
    try:
        key = f"leads/{tg_id}/{int(time.time())}_{photo.file_id[:12]}.jpg"
        result = await insforge.upload_file("prospect-photos", key, file_bytes, "image/jpeg")
        if result:
            photo_key = result.get("key", key)
            photo_url = result.get("url") or insforge.get_file_url("prospect-photos", photo_key)
            logger.info("Photo uploaded: %s", photo_url)
    except Exception as e:
        logger.error("Failed to upload photo to storage: %s", e)
        # Continue anyway — the analysis still works, just no photo stored

    # Use caption as context, or note that it's a photo
    user_input = message.caption or ""
    if not user_input:
        user_input = "[Photo uploaded — LinkedIn profile / prospect screenshot. Please analyze the visible information and provide a closing strategy.]"
    else:
        user_input = f"[Photo attached — prospect screenshot]\n\n{user_input}"

    await _run_support_pipeline(
        user_input=user_input,
        tg_id=tg_id,
        user_repo=user_repo,
        memory_repo=memory_repo,
        session_repo=session_repo,
        lead_repo=lead_repo,
        crypto=crypto,
        knowledge=knowledge,
        casebook_service=casebook_service,
        agent_registry=agent_registry,
        status_msg=status_msg,
        state=state,
        photo_url=photo_url,
        photo_key=photo_key,
        input_type="photo",
    )


@router.message(SupportState.waiting_input, F.voice)
async def on_support_voice(
    message: Message,
    state: FSMContext,
    bot: Bot,
    user_repo: UserRepo,
    memory_repo: UserMemoryRepo,
    session_repo: SupportSessionRepo,
    lead_repo: LeadRegistryRepo,
    crypto: CryptoService,
    knowledge: KnowledgeService,
    casebook_service: CasebookService,
    agent_registry: AgentRegistry,
    transcription: TranscriptionService,
) -> None:
    """Transcribe voice message and run through strategist pipeline."""
    tg_id = message.from_user.id  # type: ignore[union-attr]

    status_msg = await message.answer("🎙️ Transcribing your voice message...")

    try:
        voice = message.voice
        file = await bot.get_file(voice.file_id)  # type: ignore[union-attr]
        file_bytes_io = io.BytesIO()
        await bot.download_file(file.file_path, file_bytes_io)  # type: ignore[arg-type]
        audio_bytes = file_bytes_io.getvalue()

        text = await transcription.transcribe(audio_bytes)
        await status_msg.edit_text(f"📝 I heard: _{text}_\n\n🔄 Analyzing your prospect...", parse_mode="Markdown")
    except Exception as e:
        logger.error("Voice transcription failed: %s", e)
        await status_msg.edit_text(f"❌ Couldn't transcribe voice: {str(e)[:200]}\n\nPlease try again or type your message.")
        return

    await _run_support_pipeline(
        user_input=text,
        tg_id=tg_id,
        user_repo=user_repo,
        memory_repo=memory_repo,
        session_repo=session_repo,
        lead_repo=lead_repo,
        crypto=crypto,
        knowledge=knowledge,
        casebook_service=casebook_service,
        agent_registry=agent_registry,
        status_msg=status_msg,
        state=state,
        input_type="voice",
    )


@router.message(SupportState.waiting_input)
async def on_support_input(
    message: Message,
    state: FSMContext,
    user_repo: UserRepo,
    memory_repo: UserMemoryRepo,
    session_repo: SupportSessionRepo,
    lead_repo: LeadRegistryRepo,
    crypto: CryptoService,
    knowledge: KnowledgeService,
    casebook_service: CasebookService,
    agent_registry: AgentRegistry,
) -> None:
    """Process text input through strategist pipeline."""
    tg_id = message.from_user.id  # type: ignore[union-attr]
    user_input = message.text or ""

    if not user_input.strip():
        await message.answer("Please describe your prospect or send a screenshot.")
        return

    status_msg = await message.answer("🔄 Analyzing your prospect...")

    await _run_support_pipeline(
        user_input=user_input,
        tg_id=tg_id,
        user_repo=user_repo,
        memory_repo=memory_repo,
        session_repo=session_repo,
        lead_repo=lead_repo,
        crypto=crypto,
        knowledge=knowledge,
        casebook_service=casebook_service,
        agent_registry=agent_registry,
        status_msg=status_msg,
        state=state,
    )


@router.callback_query(F.data.startswith("support:"))
async def on_support_action(
    callback: CallbackQuery,
    state: FSMContext,
    user_repo: UserRepo,
    memory_repo: UserMemoryRepo,
    crypto: CryptoService,
    knowledge: KnowledgeService,
    casebook_service: CasebookService,
    agent_registry: AgentRegistry,
) -> None:
    """Handle support action buttons (regenerate, shorter, aggressive)."""
    action = callback.data.split(":")[1]  # type: ignore[union-attr]

    if action == "done":
        await callback.message.edit_reply_markup(reply_markup=None)  # type: ignore[union-attr]
        await callback.answer("✅ Done!")
        await state.clear()
        return

    data = await state.get_data()
    original_input = data.get("last_input", "")

    if not original_input:
        await callback.answer("No previous input found. Send a new message.")
        return

    tg_id = callback.from_user.id
    user = await user_repo.get_by_telegram_id(tg_id)
    if not user or not user.encrypted_api_key:
        await callback.answer("Please run /start first.")
        return

    await callback.answer("🔄 Working...")

    # Modify input based on action
    modifier = ""
    if action == "regen":
        modifier = "\n\n[System: Regenerate with a fresh approach. Different angle, different strategy.]"
    elif action == "shorter":
        modifier = "\n\n[System: Make the response significantly shorter and more concise. Focus on the key actionable points only.]"
    elif action == "aggressive":
        modifier = "\n\n[System: Use a more aggressive, confident closing approach. Push harder for the meeting/next step.]"

    try:
        api_key = crypto.decrypt(user.encrypted_api_key)
        if not api_key:
            await callback.answer("Key error")
            return

        model = user.openrouter_model if user.provider == "openrouter" else None
        llm = create_provider(user.provider, api_key, model)

        memory_record = await memory_repo.get(tg_id)
        memory_data = (memory_record.memory_data or {}) if memory_record else {}
        casebook_text = await casebook_service.find_similar("unknown", "general")

        ctx = PipelineContext(
            llm=llm,
            knowledge_base=knowledge.combined,
            user_memory=memory_data,
            casebook_text=casebook_text,
            user_message=original_input + modifier,
            telegram_id=tg_id,
            user_id=user.id or 0,
        )

        pipeline_config = load_pipeline("support")
        runner = PipelineRunner(agent_registry)
        await runner.run(pipeline_config, ctx)

        strategist_result = ctx.get_result("strategist")
        if strategist_result and strategist_result.success:
            response_text = format_support_response(strategist_result.data)
            await callback.message.edit_text(  # type: ignore[union-attr]
                response_text, reply_markup=SUPPORT_ACTIONS
            )
            await state.update_data(last_output=strategist_result.data)

        await llm.close()

    except Exception as e:
        logger.error("Support action error: %s", e)
        await callback.answer(f"Error: {str(e)[:100]}")
