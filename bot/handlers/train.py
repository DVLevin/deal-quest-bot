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
from bot.services.progress import Phase, ProgressUpdater
from bot.services.transcription import TranscriptionService
from bot.tracing import TraceContext
from bot.states import TrainState
from bot.storage.models import AttemptModel
from bot.storage.repositories import (
    AttemptRepo,
    GeneratedScenarioRepo,
    ScenariosSeenRepo,
    UserMemoryRepo,
    UserRepo,
)
from bot.utils import _sanitize, format_training_feedback
from bot.utils_tma import add_open_in_app_row
from bot.utils_validation import validate_user_input

logger = logging.getLogger(__name__)

router = Router(name="train")

_SCENARIOS_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "scenarios.json"

DIFFICULTY_KEYBOARD = InlineKeyboardMarkup(
    inline_keyboard=[
        [
            InlineKeyboardButton(text="⭐ Easy", callback_data="train:diff:1"),
            InlineKeyboardButton(text="⭐⭐ Medium", callback_data="train:diff:2"),
        ],
        [
            InlineKeyboardButton(text="⭐⭐⭐ Hard", callback_data="train:diff:3"),
            InlineKeyboardButton(text="🎲 Random", callback_data="train:diff:0"),
        ],
    ]
)


def _load_train_pool() -> list[dict]:
    if _SCENARIOS_PATH.exists():
        with open(_SCENARIOS_PATH, encoding="utf-8") as f:
            data = json.load(f)
        return data.get("train_pool", {}).get("scenarios", [])
    return []


async def _load_combined_pool(generated_scenario_repo: GeneratedScenarioRepo | None) -> list[dict]:
    """Merge static scenarios with DB-generated scenarios."""
    pool = _load_train_pool()

    if generated_scenario_repo:
        try:
            generated = await generated_scenario_repo.get_all(limit=200)
            for gs in generated:
                pool.append({
                    "id": gs.scenario_id,
                    "category": gs.category,
                    "difficulty": gs.difficulty,
                    "persona": gs.persona,
                    "situation": gs.situation,
                    "scoring_focus": gs.scoring_focus,
                    "ideal_response": gs.ideal_response,
                    "scoring_rubric": gs.scoring_rubric,
                    "_generated": True,
                })
        except Exception as e:
            logger.warning("Failed to load generated scenarios: %s", e)

    return pool


def _format_scenario_text(
    scenario: dict,
    unseen_count: int,
    total_count: int,
    *,
    prefix: str = "🎲 *Training Scenario*",
) -> str:
    """Build the scenario presentation text."""
    persona = scenario.get("persona", {})
    difficulty = scenario.get("difficulty", 1)

    return (
        f"{prefix}\n\n"
        f"*{_sanitize(persona.get('name', 'Someone'))}*\n"
        f"_{_sanitize(persona.get('role', ''))} at {_sanitize(persona.get('company', ''))}_\n"
        f"Background: {_sanitize(persona.get('background', ''))}\n\n"
        f"💬 *Situation:*\n{_sanitize(scenario.get('situation', ''))}\n\n"
        f"{'⭐' * difficulty} Difficulty | "
        f"Category: {_sanitize(scenario.get('category', 'general'))}\n\n"
        f"Remaining: {unseen_count}/{total_count} unseen\n\n"
        f"📝 Type your response or send a voice message:\n"
        f"💡 _Tip: respond by voice — its more like real sales!_\n"
        f"_Type /cancel to skip._"
    )


async def _pick_and_present(
    pool: list[dict],
    seen_ids: list[str],
    seen_repo: ScenariosSeenRepo,
    tg_id: int,
    difficulty_filter: int,
) -> tuple[list[dict], list[str], dict | None]:
    """Filter pool by difficulty, handle seen logic, pick a scenario.

    Returns (filtered_pool, unseen_ids, chosen_scenario).
    """
    # Apply difficulty filter
    if difficulty_filter > 0:
        filtered = [s for s in pool if s.get("difficulty", 2) == difficulty_filter]
        if not filtered:
            filtered = pool  # Fallback to full pool if no matches
    else:
        filtered = pool

    all_ids = [s["id"] for s in filtered]
    unseen_ids = [sid for sid in all_ids if sid not in seen_ids]

    if not unseen_ids:
        await seen_repo.reset(tg_id)
        unseen_ids = all_ids

    if not unseen_ids:
        return filtered, [], None

    chosen_id = random.choice(unseen_ids)
    scenario = next((s for s in filtered if s["id"] == chosen_id), None)
    return filtered, unseen_ids, scenario


@router.message(Command("train"))
async def cmd_train(
    message: Message,
    state: FSMContext,
    user_repo: UserRepo,
    seen_repo: ScenariosSeenRepo,
    generated_scenario_repo: GeneratedScenarioRepo,
    tma_url: str = "",
) -> None:
    """Start a random training scenario — show difficulty picker."""
    tg_id = message.from_user.id  # type: ignore[union-attr]
    user = await user_repo.get_by_telegram_id(tg_id)

    if not user or not user.encrypted_api_key:
        await message.answer("Please run /start first to set up your account.")
        return

    pool = await _load_combined_pool(generated_scenario_repo)
    if not pool:
        await message.answer("No training scenarios available.")
        return

    seen_ids = await seen_repo.get_seen_ids(tg_id)
    all_ids = [s["id"] for s in pool]
    unseen_count = sum(1 for sid in all_ids if sid not in seen_ids)

    kb = add_open_in_app_row(DIFFICULTY_KEYBOARD, tma_url, "train")
    await message.answer(
        f"🎲 *Training Mode*\n\n"
        f"Pool: {len(pool)} scenarios ({unseen_count} unseen)\n\n"
        f"Choose difficulty:",
        parse_mode="Markdown",
        reply_markup=kb,
    )


@router.callback_query(F.data.startswith("train:diff:"))
async def on_difficulty_chosen(
    callback: CallbackQuery,
    state: FSMContext,
    user_repo: UserRepo,
    seen_repo: ScenariosSeenRepo,
    generated_scenario_repo: GeneratedScenarioRepo,
) -> None:
    """Handle difficulty selection and present a scenario."""
    difficulty = int(callback.data.split(":")[2])  # type: ignore[union-attr]
    tg_id = callback.from_user.id

    user = await user_repo.get_by_telegram_id(tg_id)
    if not user or not user.encrypted_api_key:
        await callback.answer("Please /start first.")
        return

    pool = await _load_combined_pool(generated_scenario_repo)
    if not pool:
        await callback.answer("No scenarios available.")
        return

    seen_ids = await seen_repo.get_seen_ids(tg_id)
    filtered, unseen_ids, scenario = await _pick_and_present(
        pool, seen_ids, seen_repo, tg_id, difficulty,
    )

    if not scenario:
        await callback.message.edit_text("No scenarios available for this difficulty.")  # type: ignore[union-attr]
        await callback.answer()
        return

    # Check if pool was reset
    all_orig_ids = [s["id"] for s in pool]
    all_orig_unseen = [sid for sid in all_orig_ids if sid not in seen_ids]
    if not all_orig_unseen and len(unseen_ids) > 0:
        reset_text = (
            "🏆 *Round complete!* You've been through all scenarios.\n"
            "Pool reset — new round begins!\n\n"
        )
    else:
        reset_text = ""

    scenario_text = reset_text + _format_scenario_text(
        scenario, len(unseen_ids) - 1, len(filtered),
    )

    await callback.message.edit_text(scenario_text, parse_mode="Markdown")  # type: ignore[union-attr]
    await state.set_state(TrainState.answering_scenario)
    await state.update_data(
        scenario_id=scenario["id"],
        scenario_data=scenario,
        difficulty_filter=difficulty,
    )
    await callback.answer()


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
    generated_scenario_repo: GeneratedScenarioRepo | None = None,
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
        async with TraceContext(pipeline_name="train", telegram_id=tg_id, user_id=user.id or 0):
            async with ProgressUpdater(status_msg, Phase.EVALUATION):
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

        # Save attempt — don't let DB errors block feedback delivery
        save_error = None
        try:
            await attempt_repo.create(
                AttemptModel(
                    user_id=user.id,
                    telegram_id=tg_id,
                    scenario_id=scenario_id,
                    mode="train",
                    score=score,
                    feedback_json=output_data,
                    xp_earned=xp_earned,
                    username=user.username,
                    user_response=user_response[:2000],
                )
            )
        except Exception as save_exc:
            save_error = save_exc
            logger.error("Failed to save train attempt (feedback still delivered): %s", save_exc)

        # Update usage stats for generated scenarios
        if scenario_data.get("_generated") and generated_scenario_repo:
            try:
                await generated_scenario_repo.increment_usage(scenario_id, score)
            except Exception as e:
                logger.warning("Failed to update generated scenario usage: %s", e)

        # Update XP (skip if save failed to keep data consistent)
        if save_error is None:
            await user_repo.update_xp(tg_id, xp_earned)

        # Update memory
        memory_result = ctx.get_result("memory")
        if memory_result and memory_result.success:
            updated_memory = memory_result.data.get("updated_memory")
            if updated_memory:
                await memory_repo.update_memory(tg_id, updated_memory)

        # Format feedback (always delivered even if save failed)
        feedback_text = format_training_feedback(output_data)
        if save_error is not None:
            feedback_text += "\n\n⚠️ Score saved locally but sync failed. Try again."

        keyboard = InlineKeyboardMarkup(
            inline_keyboard=[
                [InlineKeyboardButton(text="🎲 Next Scenario", callback_data="train:next")],
                [
                    InlineKeyboardButton(text="🔄 Retry This One", callback_data=f"train:retry:{scenario_id}"),
                    InlineKeyboardButton(text="📊 View Stats", callback_data="train:stats"),
                ],
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
    generated_scenario_repo: GeneratedScenarioRepo,
) -> None:
    """Transcribe voice and score via trainer pipeline."""
    tg_id = message.from_user.id  # type: ignore[union-attr]

    status_msg = await message.answer(
        "🎙️ Great call using voice — that's how real deals sound!\n"
        "Listening to your pitch now..."
    )

    try:
        voice = message.voice
        file = await bot.get_file(voice.file_id)  # type: ignore[union-attr]
        file_bytes_io = io.BytesIO()
        await bot.download_file(file.file_path, file_bytes_io)  # type: ignore[arg-type]
        audio_bytes = file_bytes_io.getvalue()

        async with ProgressUpdater(status_msg, Phase.TRANSCRIPTION):
            user_response = await transcription.transcribe(audio_bytes)

        await status_msg.edit_text(
            f"📝 I heard:\n\"{user_response}\"\n\n🔄 Evaluating your response...",
            parse_mode=None,
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
        generated_scenario_repo=generated_scenario_repo,
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
    generated_scenario_repo: GeneratedScenarioRepo,
) -> None:
    """Score the training response."""
    tg_id = message.from_user.id  # type: ignore[union-attr]
    user_response = message.text or ""

    result = validate_user_input(user_response, context="train")
    if not result.is_valid:
        if result.is_command:
            if result.suggested_command == "/cancel":
                await state.clear()
                await message.answer("Training session cancelled. Use /train to start again.")
                return
            await state.clear()
            if result.suggested_command and result.suggested_command != "unknown":
                await message.answer(
                    f"Looks like you meant {result.suggested_command}. "
                    f"Training session cancelled. Try the command again."
                )
            else:
                await message.answer(
                    "That looks like a command. Training session cancelled. "
                    "Try your command again."
                )
            return
        await message.answer(result.error_message)
        return
    user_response = result.cleaned_input

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
        generated_scenario_repo=generated_scenario_repo,
    )


@router.callback_query(F.data == "train:next")
async def on_next_scenario(
    callback: CallbackQuery,
    state: FSMContext,
    user_repo: UserRepo,
    seen_repo: ScenariosSeenRepo,
    generated_scenario_repo: GeneratedScenarioRepo,
) -> None:
    """Start next training scenario, respecting stored difficulty filter."""
    tg_id = callback.from_user.id
    user = await user_repo.get_by_telegram_id(tg_id)

    if not user:
        await callback.answer("Please /start first.")
        return

    # Get stored difficulty filter from FSM (default: random)
    data = await state.get_data()
    difficulty_filter = data.get("difficulty_filter", 0)

    pool = await _load_combined_pool(generated_scenario_repo)
    seen_ids = await seen_repo.get_seen_ids(tg_id)

    filtered, unseen_ids, scenario = await _pick_and_present(
        pool, seen_ids, seen_repo, tg_id, difficulty_filter,
    )

    if not scenario:
        await callback.message.edit_text("No more scenarios available.")  # type: ignore[union-attr]
        await callback.answer()
        return

    scenario_text = _format_scenario_text(scenario, len(unseen_ids) - 1, len(filtered))

    await callback.message.edit_text(scenario_text, parse_mode="Markdown")  # type: ignore[union-attr]
    await state.set_state(TrainState.answering_scenario)
    await state.update_data(
        scenario_id=scenario["id"],
        scenario_data=scenario,
        difficulty_filter=difficulty_filter,
    )
    await callback.answer()


@router.callback_query(F.data == "train:stats")
async def on_view_stats(
    callback: CallbackQuery,
    user_repo: UserRepo,
    attempt_repo: AttemptRepo,
    seen_repo: ScenariosSeenRepo,
    generated_scenario_repo: GeneratedScenarioRepo,
) -> None:
    """Show inline stats summary with option to continue training."""
    tg_id = callback.from_user.id
    user = await user_repo.get_by_telegram_id(tg_id)
    if not user:
        await callback.answer("Please /start first.")
        return

    recent = await attempt_repo.get_recent(tg_id, 10)
    seen_ids = await seen_repo.get_seen_ids(tg_id)

    # Get total pool size
    pool = await _load_combined_pool(generated_scenario_repo)
    pool_size = len(pool)

    if recent:
        avg_score = sum(a.score for a in recent) / len(recent)
        best_score = max(a.score for a in recent)
    else:
        avg_score = 0
        best_score = 0

    text = (
        f"📊 *Quick Stats*\n\n"
        f"⚡ Level {user.current_level} | 💎 {user.total_xp} XP\n"
        f"🎲 Scenarios: {len(seen_ids)}/{pool_size}\n"
        f"📊 Avg Score: {avg_score:.0f}/100 | 🎯 Best: {best_score}/100\n\n"
        f"_Use /stats for full details._"
    )

    await callback.message.edit_text(  # type: ignore[union-attr]
        text,
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🎲 Continue Training", callback_data="train:next")],
        ]),
    )
    await callback.answer()


@router.callback_query(F.data.startswith("train:retry:"))
async def on_retry_scenario(
    callback: CallbackQuery,
    state: FSMContext,
    generated_scenario_repo: GeneratedScenarioRepo,
) -> None:
    """Re-present the same scenario for a retry attempt."""
    scenario_id = callback.data.split(":")[2]  # type: ignore[union-attr]

    # Search in combined pool (static + generated)
    pool = await _load_combined_pool(generated_scenario_repo)
    scenario = next((s for s in pool if s["id"] == scenario_id), None)
    if not scenario:
        await callback.answer("Scenario not found.")
        return

    scenario_text = _format_scenario_text(
        scenario, 0, 0,
        prefix="🔄 *Retry — Training Scenario*",
    )

    await callback.message.edit_text(scenario_text, parse_mode="Markdown")  # type: ignore[union-attr]
    await state.set_state(TrainState.answering_scenario)
    await state.update_data(
        scenario_id=scenario_id,
        scenario_data=scenario,
    )
    await callback.answer()
