"""Handler for /train — random practice scenarios with never-repeat logic."""

from __future__ import annotations

import io
import json
import logging
import random
from pathlib import Path

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
from bot.services.crypto import CryptoService
from bot.services.knowledge import KnowledgeService
from bot.services.llm_router import create_provider
from bot.services.scoring import calculate_xp
from bot.services.transcription import TranscriptionService
from bot.states import TrainState
from bot.storage.models import AttemptModel
from bot.storage.repositories import (
    AttemptRepo,
    ScenariosSeenRepo,
    UserMemoryRepo,
    UserRepo,
)
from bot.utils import format_training_feedback

logger = logging.getLogger(__name__)

router = Router(name="train")

_SCENARIOS_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "scenarios.json"


def _load_train_pool() -> list[dict]:
    if _SCENARIOS_PATH.exists():
        with open(_SCENARIOS_PATH, encoding="utf-8") as f:
            data = json.load(f)
        return data.get("train_pool", {}).get("scenarios", [])
    return []


@router.message(Command("train"))
async def cmd_train(
    message: Message,
    state: FSMContext,
    user_repo: UserRepo,
    seen_repo: ScenariosSeenRepo,
) -> None:
    """Start a random training scenario."""
    tg_id = message.from_user.id  # type: ignore[union-attr]
    user = await user_repo.get_by_telegram_id(tg_id)

    if not user or not user.encrypted_api_key:
        await message.answer("Please run /start first to set up your account.")
        return

    pool = _load_train_pool()
    if not pool:
        await message.answer("No training scenarios available.")
        return

    # Never-repeat logic
    seen_ids = await seen_repo.get_seen_ids(tg_id)
    all_ids = [s["id"] for s in pool]
    unseen_ids = [sid for sid in all_ids if sid not in seen_ids]

    if not unseen_ids:
        # All exhausted — reset pool
        await seen_repo.reset(tg_id)
        unseen_ids = all_ids
        await message.answer(
            "🔄 You've completed all 20 scenarios! Pool reset — starting fresh.\n"
        )

    # Pick random unseen scenario
    chosen_id = random.choice(unseen_ids)
    scenario = next(s for s in pool if s["id"] == chosen_id)

    persona = scenario.get("persona", {})
    difficulty = scenario.get("difficulty", 1)

    scenario_text = (
        f"🎲 *Training Scenario*\n\n"
        f"*{persona.get('name', 'Someone')}*\n"
        f"_{persona.get('role', '')} at {persona.get('company', '')}_\n"
        f"Background: {persona.get('background', '')}\n\n"
        f"💬 *Situation:*\n{scenario.get('situation', '')}\n\n"
        f"{'⭐' * difficulty} Difficulty | "
        f"Category: {scenario.get('category', 'general')}\n\n"
        f"Remaining: {len(unseen_ids) - 1}/{len(all_ids)} unseen\n\n"
        f"📝 Type your response or send a voice message:\n"
        f"💡 _Tip: respond by voice — it's more like real sales!_"
    )

    await message.answer(scenario_text, parse_mode="Markdown")
    await state.set_state(TrainState.answering_scenario)
    await state.update_data(
        scenario_id=chosen_id,
        scenario_data=scenario,
    )


async def _run_train_answer(
    *,
    user_response: str,
    tg_id: int,
    message: Message,
    state: FSMContext,
    status_msg: Message,
    user_repo: UserRepo,
    memory_repo: UserMemoryRepo,
    attempt_repo: AttemptRepo,
    seen_repo: ScenariosSeenRepo,
    crypto: CryptoService,
    knowledge: KnowledgeService,
    agent_registry: AgentRegistry,
) -> None:
    """Core train scoring logic shared by text and voice handlers."""
    user = await user_repo.get_by_telegram_id(tg_id)
    if not user or not user.encrypted_api_key:
        await message.answer("Please run /start first.")
        await state.clear()
        return

    data = await state.get_data()
    scenario_id = data.get("scenario_id", "")
    scenario_data = data.get("scenario_data", {})

    try:
        api_key = crypto.decrypt(user.encrypted_api_key)
        if not api_key:
            await status_msg.edit_text("❌ Failed to decrypt API key.")
            return

        model = user.openrouter_model if user.provider == "openrouter" else None
        llm = create_provider(user.provider, api_key, model)

        memory_record = await memory_repo.get(tg_id)
        memory_data = (memory_record.memory_data or {}) if memory_record else {}

        ctx = PipelineContext(
            llm=llm,
            knowledge_base=knowledge.combined,
            user_memory=memory_data,
            scenario=scenario_data,
            user_message=user_response,
            telegram_id=tg_id,
            user_id=user.id or 0,
        )

        pipeline_config = load_pipeline("train")
        runner = PipelineRunner(agent_registry)
        await runner.run(pipeline_config, ctx)

        trainer_result = ctx.get_result("trainer")
        if not trainer_result or not trainer_result.success:
            error = trainer_result.error if trainer_result else "Unknown error"
            await status_msg.edit_text(f"❌ Evaluation failed: {error}")
            await llm.close()
            return

        output_data = trainer_result.data
        score = output_data.get("total_score", 0)

        # Check previous attempts for this scenario
        prev_attempts = await attempt_repo.get_for_scenario(tg_id, scenario_id)
        first_attempt = len(prev_attempts) == 0
        prev_score = prev_attempts[0].score if prev_attempts else None

        xp_earned = calculate_xp(score, first_attempt=first_attempt, previous_score=prev_score)
        output_data["xp_earned"] = xp_earned

        # Mark scenario as seen
        if user.id:
            await seen_repo.mark_seen(user.id, tg_id, scenario_id)

        # Save attempt
        await attempt_repo.create(
            AttemptModel(
                user_id=user.id,
                telegram_id=tg_id,
                scenario_id=scenario_id,
                mode="train",
                score=score,
                feedback_json=output_data,
                xp_earned=xp_earned,
            )
        )

        # Update XP
        await user_repo.update_xp(tg_id, xp_earned)

        # Update memory
        memory_result = ctx.get_result("memory")
        if memory_result and memory_result.success:
            updated_memory = memory_result.data.get("updated_memory")
            if updated_memory:
                await memory_repo.update_memory(tg_id, updated_memory)

        # Format feedback
        feedback_text = format_training_feedback(output_data)

        keyboard = InlineKeyboardMarkup(
            inline_keyboard=[
                [InlineKeyboardButton(text="🎲 Next Scenario", callback_data="train:next")],
                [InlineKeyboardButton(text="📊 View Stats", callback_data="train:stats")],
            ]
        )

        await status_msg.edit_text(feedback_text, reply_markup=keyboard)
        await llm.close()
        await state.clear()

    except Exception as e:
        logger.error("Train pipeline error: %s", e)
        await status_msg.edit_text(f"❌ Something went wrong: {str(e)[:200]}")
        await state.clear()


@router.message(TrainState.answering_scenario, F.voice)
async def on_train_voice(
    message: Message,
    state: FSMContext,
    bot: Bot,
    user_repo: UserRepo,
    memory_repo: UserMemoryRepo,
    attempt_repo: AttemptRepo,
    seen_repo: ScenariosSeenRepo,
    crypto: CryptoService,
    knowledge: KnowledgeService,
    agent_registry: AgentRegistry,
    transcription: TranscriptionService,
) -> None:
    """Transcribe voice and score via trainer pipeline."""
    tg_id = message.from_user.id  # type: ignore[union-attr]

    status_msg = await message.answer("🎙️ Transcribing your voice message...")

    try:
        voice = message.voice
        file = await bot.get_file(voice.file_id)  # type: ignore[union-attr]
        file_bytes_io = io.BytesIO()
        await bot.download_file(file.file_path, file_bytes_io)  # type: ignore[arg-type]
        audio_bytes = file_bytes_io.getvalue()

        user_response = await transcription.transcribe(audio_bytes)
        await status_msg.edit_text(
            f"📝 I heard: _{user_response}_\n\n🔄 Evaluating your response...",
            parse_mode="Markdown",
        )
    except Exception as e:
        logger.error("Voice transcription failed: %s", e)
        await status_msg.edit_text(
            f"❌ Couldn't transcribe voice: {str(e)[:200]}\n\nPlease try again or type your message."
        )
        return

    await _run_train_answer(
        user_response=user_response,
        tg_id=tg_id,
        message=message,
        state=state,
        status_msg=status_msg,
        user_repo=user_repo,
        memory_repo=memory_repo,
        attempt_repo=attempt_repo,
        seen_repo=seen_repo,
        crypto=crypto,
        knowledge=knowledge,
        agent_registry=agent_registry,
    )


@router.message(TrainState.answering_scenario)
async def on_train_answer(
    message: Message,
    state: FSMContext,
    user_repo: UserRepo,
    memory_repo: UserMemoryRepo,
    attempt_repo: AttemptRepo,
    seen_repo: ScenariosSeenRepo,
    crypto: CryptoService,
    knowledge: KnowledgeService,
    agent_registry: AgentRegistry,
) -> None:
    """Score the training response."""
    tg_id = message.from_user.id  # type: ignore[union-attr]
    user_response = message.text or ""

    if not user_response.strip():
        await message.answer("Please type your response to the scenario.")
        return

    status_msg = await message.answer("🔄 Evaluating your response...")

    await _run_train_answer(
        user_response=user_response,
        tg_id=tg_id,
        message=message,
        state=state,
        status_msg=status_msg,
        user_repo=user_repo,
        memory_repo=memory_repo,
        attempt_repo=attempt_repo,
        seen_repo=seen_repo,
        crypto=crypto,
        knowledge=knowledge,
        agent_registry=agent_registry,
    )


@router.callback_query(F.data == "train:next")
async def on_next_scenario(
    callback: CallbackQuery,
    state: FSMContext,
    user_repo: UserRepo,
    seen_repo: ScenariosSeenRepo,
) -> None:
    """Start next training scenario."""
    tg_id = callback.from_user.id
    user = await user_repo.get_by_telegram_id(tg_id)

    if not user:
        await callback.answer("Please /start first.")
        return

    pool = _load_train_pool()
    seen_ids = await seen_repo.get_seen_ids(tg_id)
    all_ids = [s["id"] for s in pool]
    unseen_ids = [sid for sid in all_ids if sid not in seen_ids]

    if not unseen_ids:
        await seen_repo.reset(tg_id)
        unseen_ids = all_ids

    chosen_id = random.choice(unseen_ids)
    scenario = next(s for s in pool if s["id"] == chosen_id)
    persona = scenario.get("persona", {})
    difficulty = scenario.get("difficulty", 1)

    scenario_text = (
        f"🎲 *Training Scenario*\n\n"
        f"*{persona.get('name', 'Someone')}*\n"
        f"_{persona.get('role', '')} at {persona.get('company', '')}_\n"
        f"Background: {persona.get('background', '')}\n\n"
        f"💬 *Situation:*\n{scenario.get('situation', '')}\n\n"
        f"{'⭐' * difficulty} Difficulty | "
        f"Category: {scenario.get('category', 'general')}\n\n"
        f"Remaining: {len(unseen_ids) - 1}/{len(all_ids)} unseen\n\n"
        f"📝 Type your response or send a voice message:\n"
        f"💡 _Tip: respond by voice — it's more like real sales!_"
    )

    await callback.message.edit_text(scenario_text, parse_mode="Markdown")  # type: ignore[union-attr]
    await state.set_state(TrainState.answering_scenario)
    await state.update_data(
        scenario_id=chosen_id,
        scenario_data=scenario,
    )
    await callback.answer()


@router.callback_query(F.data == "train:stats")
async def on_view_stats(callback: CallbackQuery) -> None:
    """Redirect to stats."""
    await callback.message.edit_text(  # type: ignore[union-attr]
        "Use /stats to see your full progress."
    )
    await callback.answer()
