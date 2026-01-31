"""Handler for /learn — structured training with lessons and scenarios."""

from __future__ import annotations

import json
import logging
from pathlib import Path

import io

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
from bot.states import LearnState
from bot.storage.models import AttemptModel
from bot.storage.repositories import (
    AttemptRepo,
    TrackProgressRepo,
    UserMemoryRepo,
    UserRepo,
)
from bot.utils import format_training_feedback

logger = logging.getLogger(__name__)

router = Router(name="learn")

_SCENARIOS_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "scenarios.json"


def _load_scenarios() -> dict:
    if _SCENARIOS_PATH.exists():
        with open(_SCENARIOS_PATH, encoding="utf-8") as f:
            return json.load(f)
    return {}


def _get_level_data(scenarios: dict, level_id: str) -> dict | None:
    track_1 = scenarios.get("learn_tracks", {}).get("track_1", {})
    for level in track_1.get("levels", []):
        if level.get("id") == level_id:
            return level
    return None


def _build_progress_text(progress: list, levels: list) -> str:
    """Build track progress display."""
    lines = ["📚 *Track 1: Foundations*\n"]
    progress_map = {p.level_id: p for p in progress}

    for level_data in levels:
        lid = level_data["id"]
        p = progress_map.get(lid)
        status = p.status if p else "locked"

        if status == "completed":
            icon = "✅"
            score_text = f" (Best: {p.best_score})" if p else ""
        elif status == "unlocked" or status == "in_progress":
            icon = "🔓"
            score_text = f" (Best: {p.best_score})" if p and p.best_score > 0 else ""
        else:
            icon = "🔒"
            score_text = ""

        lines.append(f"{icon} Level {lid}: {level_data['name']}{score_text}")

    # Show locked future tracks
    lines.append("\n*Future Tracks:*")
    for i in range(2, 6):
        lines.append(f"🔒 Track {i}: Coming soon")

    return "\n".join(lines)


@router.message(Command("learn"))
async def cmd_learn(
    message: Message,
    state: FSMContext,
    user_repo: UserRepo,
    track_repo: TrackProgressRepo,
) -> None:
    """Show learning track progress."""
    tg_id = message.from_user.id  # type: ignore[union-attr]
    user = await user_repo.get_by_telegram_id(tg_id)

    if not user or not user.encrypted_api_key:
        await message.answer("Please run /start first to set up your account.")
        return

    scenarios = _load_scenarios()
    track_1 = scenarios.get("learn_tracks", {}).get("track_1", {})
    levels = track_1.get("levels", [])

    # Ensure track is initialized
    if user.id:
        await track_repo.init_track(user.id, tg_id, "foundations", [l["id"] for l in levels])

    progress = await track_repo.get_progress(tg_id, "foundations")
    progress_text = _build_progress_text(progress, levels)

    # Build keyboard with available levels
    buttons = []
    progress_map = {p.level_id: p for p in progress}
    for level_data in levels:
        lid = level_data["id"]
        p = progress_map.get(lid)
        status = p.status if p else "locked"
        if status in ("unlocked", "in_progress", "completed"):
            buttons.append(
                [InlineKeyboardButton(
                    text=f"{'✅' if status == 'completed' else '▶️'} Level {lid}: {level_data['name']}",
                    callback_data=f"learn:level:{lid}",
                )]
            )

    if buttons:
        keyboard = InlineKeyboardMarkup(inline_keyboard=buttons)
    else:
        keyboard = None

    await message.answer(progress_text, parse_mode="Markdown", reply_markup=keyboard)


@router.callback_query(F.data.startswith("learn:level:"))
async def on_level_select(callback: CallbackQuery, state: FSMContext) -> None:
    """Show lesson content for selected level."""
    level_id = callback.data.split(":")[2]  # type: ignore[union-attr]
    scenarios = _load_scenarios()
    level = _get_level_data(scenarios, level_id)

    if not level:
        await callback.answer("Level not found.")
        return

    lesson = level.get("lesson", {})
    scenario = level.get("scenario", {})

    # Show lesson
    key_points = "\n".join(f"  • {p}" for p in lesson.get("key_points", []))
    lesson_text = (
        f"📖 *{lesson.get('title', 'Lesson')}*\n\n"
        f"{lesson.get('content', '')}\n\n"
        f"*Key Points:*\n{key_points}"
    )

    await callback.message.edit_text(  # type: ignore[union-attr]
        lesson_text,
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(
            inline_keyboard=[
                [InlineKeyboardButton(
                    text="▶️ Start Scenario",
                    callback_data=f"learn:scenario:{level_id}",
                )]
            ]
        ),
    )
    await callback.answer()


@router.callback_query(F.data.startswith("learn:scenario:"))
async def on_scenario_start(callback: CallbackQuery, state: FSMContext) -> None:
    """Present the scenario for the level."""
    level_id = callback.data.split(":")[2]  # type: ignore[union-attr]
    scenarios = _load_scenarios()
    level = _get_level_data(scenarios, level_id)

    if not level:
        await callback.answer("Level not found.")
        return

    scenario = level.get("scenario", {})
    persona = scenario.get("persona", {})

    scenario_text = (
        f"🎭 *Scenario: Level {level_id}*\n\n"
        f"*{persona.get('name', 'Someone')}*\n"
        f"_{persona.get('role', '')} at {persona.get('company', '')}_\n"
        f"Background: {persona.get('background', '')}\n"
        f"Context: {persona.get('context', '')}\n\n"
        f"💬 *Situation:*\n{scenario.get('situation', '')}\n\n"
        f"{'⭐' * scenario.get('difficulty', 1)} Difficulty\n\n"
        f"📝 Type your response or send a voice message:\n"
        f"💡 _Tip: respond by voice — it's more like real sales!_"
    )

    await callback.message.edit_text(scenario_text, parse_mode="Markdown")  # type: ignore[union-attr]
    await state.set_state(LearnState.answering_scenario)
    await state.update_data(
        level_id=level_id,
        scenario_id=scenario.get("id", level_id),
        scenario_data=scenario,
    )
    await callback.answer()


@router.message(LearnState.answering_scenario, F.voice)
async def on_learn_voice(
    message: Message,
    state: FSMContext,
    bot: Bot,
    user_repo: UserRepo,
    memory_repo: UserMemoryRepo,
    track_repo: TrackProgressRepo,
    attempt_repo: AttemptRepo,
    crypto: CryptoService,
    knowledge: KnowledgeService,
    agent_registry: AgentRegistry,
    transcription: TranscriptionService,
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

    # Reuse the same scoring logic as text answers
    await _run_learn_answer(
        user_response=user_response,
        tg_id=tg_id,
        message=message,
        state=state,
        status_msg=status_msg,
        user_repo=user_repo,
        memory_repo=memory_repo,
        track_repo=track_repo,
        attempt_repo=attempt_repo,
        crypto=crypto,
        knowledge=knowledge,
        agent_registry=agent_registry,
    )


async def _run_learn_answer(
    *,
    user_response: str,
    tg_id: int,
    message: Message,
    state: FSMContext,
    status_msg: Message,
    user_repo: UserRepo,
    memory_repo: UserMemoryRepo,
    track_repo: TrackProgressRepo,
    attempt_repo: AttemptRepo,
    crypto: CryptoService,
    knowledge: KnowledgeService,
    agent_registry: AgentRegistry,
) -> None:
    """Core learn scoring logic shared by text and voice handlers."""
    user = await user_repo.get_by_telegram_id(tg_id)
    if not user or not user.encrypted_api_key:
        await message.answer("Please run /start first.")
        await state.clear()
        return

    data = await state.get_data()
    level_id = data.get("level_id", "")
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

        # Build pipeline context with scenario
        ctx = PipelineContext(
            llm=llm,
            knowledge_base=knowledge.combined,
            user_memory=memory_data,
            scenario=scenario_data,
            user_message=user_response,
            telegram_id=tg_id,
            user_id=user.id or 0,
        )

        pipeline_config = load_pipeline("learn")
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

        # Check if first attempt
        prev_attempts = await attempt_repo.get_for_scenario(tg_id, scenario_id)
        first_attempt = len(prev_attempts) == 0
        prev_score = prev_attempts[0].score if prev_attempts else None

        xp_earned = calculate_xp(score, first_attempt=first_attempt, previous_score=prev_score)
        output_data["xp_earned"] = xp_earned

        # Save attempt
        await attempt_repo.create(
            AttemptModel(
                user_id=user.id,
                telegram_id=tg_id,
                scenario_id=scenario_id,
                mode="learn",
                score=score,
                feedback_json=output_data,
                xp_earned=xp_earned,
            )
        )

        # Update XP
        await user_repo.update_xp(tg_id, xp_earned)

        # Update track progress
        status = "completed" if score >= 60 else "in_progress"
        if user.id:
            await track_repo.upsert_progress(
                user.id, tg_id, "foundations", level_id, status=status, score=score
            )

            # Unlock next level if completed
            if status == "completed":
                scenarios = _load_scenarios()
                track_1 = scenarios.get("learn_tracks", {}).get("track_1", {})
                level_ids = [lv["id"] for lv in track_1.get("levels", [])]
                try:
                    idx = level_ids.index(level_id)
                    if idx + 1 < len(level_ids):
                        next_level = level_ids[idx + 1]
                        next_prog = await track_repo.get_level(tg_id, "foundations", next_level)
                        if next_prog and next_prog.status == "locked":
                            await track_repo.upsert_progress(
                                user.id, tg_id, "foundations", next_level, status="unlocked"
                            )
                except ValueError:
                    pass

        # Update memory
        memory_result = ctx.get_result("memory")
        if memory_result and memory_result.success:
            updated_memory = memory_result.data.get("updated_memory")
            if updated_memory:
                await memory_repo.update_memory(tg_id, updated_memory)

        # Format and send feedback
        feedback_text = format_training_feedback(output_data)

        buttons = []
        if score < 60:
            buttons.append([InlineKeyboardButton(
                text="🔄 Retry",
                callback_data=f"learn:scenario:{level_id}",
            )])
        buttons.append([InlineKeyboardButton(text="📚 Back to Levels", callback_data="learn:back")])

        await status_msg.edit_text(
            feedback_text,
            reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons),
        )

        await llm.close()
        await state.clear()

    except Exception as e:
        logger.error("Learn pipeline error: %s", e)
        await status_msg.edit_text(f"❌ Something went wrong: {str(e)[:200]}")
        await state.clear()


@router.message(LearnState.answering_scenario)
async def on_learn_answer(
    message: Message,
    state: FSMContext,
    user_repo: UserRepo,
    memory_repo: UserMemoryRepo,
    track_repo: TrackProgressRepo,
    attempt_repo: AttemptRepo,
    crypto: CryptoService,
    knowledge: KnowledgeService,
    agent_registry: AgentRegistry,
) -> None:
    """Score the user's response via trainer pipeline."""
    tg_id = message.from_user.id  # type: ignore[union-attr]
    user_response = message.text or ""

    if not user_response.strip():
        await message.answer("Please type your response to the scenario.")
        return

    status_msg = await message.answer("🔄 Evaluating your response...")

    await _run_learn_answer(
        user_response=user_response,
        tg_id=tg_id,
        message=message,
        state=state,
        status_msg=status_msg,
        user_repo=user_repo,
        memory_repo=memory_repo,
        track_repo=track_repo,
        attempt_repo=attempt_repo,
        crypto=crypto,
        knowledge=knowledge,
        agent_registry=agent_registry,
    )


@router.callback_query(F.data == "learn:back")
async def on_learn_back(
    callback: CallbackQuery,
    state: FSMContext,
    user_repo: UserRepo,
    track_repo: TrackProgressRepo,
) -> None:
    """Go back to level selection."""
    tg_id = callback.from_user.id

    scenarios = _load_scenarios()
    track_1 = scenarios.get("learn_tracks", {}).get("track_1", {})
    levels = track_1.get("levels", [])

    progress = await track_repo.get_progress(tg_id, "foundations")
    progress_text = _build_progress_text(progress, levels)

    buttons = []
    progress_map = {p.level_id: p for p in progress}
    for level_data in levels:
        lid = level_data["id"]
        p = progress_map.get(lid)
        status = p.status if p else "locked"
        if status in ("unlocked", "in_progress", "completed"):
            buttons.append(
                [InlineKeyboardButton(
                    text=f"{'✅' if status == 'completed' else '▶️'} Level {lid}: {level_data['name']}",
                    callback_data=f"learn:level:{lid}",
                )]
            )

    keyboard = InlineKeyboardMarkup(inline_keyboard=buttons) if buttons else None
    await callback.message.edit_text(progress_text, parse_mode="Markdown", reply_markup=keyboard)  # type: ignore[union-attr]
    await callback.answer()
