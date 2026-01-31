"""Handler for /support — deal analysis with strategist agent pipeline."""

from __future__ import annotations

import logging

from aiogram import F, Router
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
from bot.states import SupportState
from bot.storage.models import SupportSessionModel
from bot.storage.repositories import SupportSessionRepo, UserMemoryRepo, UserRepo
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
        "Describe your prospect or deal situation.\n"
        "Include details like: role, company, context, what they said.\n\n"
        "I'll provide analysis, strategy, engagement tactics, and a draft response.",
        parse_mode="Markdown",
    )
    await state.set_state(SupportState.waiting_input)


@router.message(SupportState.waiting_input)
async def on_support_input(
    message: Message,
    state: FSMContext,
    user_repo: UserRepo,
    memory_repo: UserMemoryRepo,
    session_repo: SupportSessionRepo,
    crypto: CryptoService,
    knowledge: KnowledgeService,
    casebook_service: CasebookService,
    agent_registry: AgentRegistry,
) -> None:
    """Process support request through strategist pipeline."""
    tg_id = message.from_user.id  # type: ignore[union-attr]
    user_input = message.text or ""

    if not user_input.strip():
        await message.answer("Please describe your prospect or deal situation.")
        return

    user = await user_repo.get_by_telegram_id(tg_id)
    if not user or not user.encrypted_api_key:
        await message.answer("Please run /start first.")
        await state.clear()
        return

    # Show typing indicator
    status_msg = await message.answer("🔄 Analyzing your prospect...")

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
        results = await runner.run(pipeline_config, ctx)

        # Get strategist output
        strategist_result = ctx.get_result("strategist")
        if not strategist_result or not strategist_result.success:
            error = strategist_result.error if strategist_result else "Unknown error"
            await status_msg.edit_text(f"❌ Analysis failed: {error}")
            await llm.close()
            return

        output_data = strategist_result.data

        # Save memory update from background agent
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

        await llm.close()

    except Exception as e:
        logger.error("Support pipeline error: %s", e)
        await status_msg.edit_text(f"❌ Something went wrong: {str(e)[:200]}")


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
