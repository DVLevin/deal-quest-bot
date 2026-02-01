"""Handler for /stats — progress view."""

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

from bot.services.scoring import get_level_from_xp, get_rank_title
from bot.storage.repositories import (
    AttemptRepo,
    LeadRegistryRepo,
    ScenariosSeenRepo,
    TrackProgressRepo,
    UserRepo,
)
from bot.utils import format_score_bar

logger = logging.getLogger(__name__)

router = Router(name="stats")

PIPELINE_STATUS_ICONS = {
    "analyzed": "🔍",
    "reached_out": "📨",
    "meeting_booked": "📅",
    "in_progress": "🔄",
    "closed_won": "✅",
    "closed_lost": "❌",
}


@router.message(Command("stats"))
async def cmd_stats(
    message: Message,
    user_repo: UserRepo,
    track_repo: TrackProgressRepo,
    attempt_repo: AttemptRepo,
    seen_repo: ScenariosSeenRepo,
    lead_repo: LeadRegistryRepo,
) -> None:
    """Show user's progress card."""
    tg_id = message.from_user.id  # type: ignore[union-attr]
    user = await user_repo.get_by_telegram_id(tg_id)

    if not user:
        await message.answer("Please run /start first to set up your account.")
        return

    # Calculate level info
    level, xp_in_level, xp_needed = get_level_from_xp(user.total_xp)
    rank = get_rank_title(level)
    level_bar = format_score_bar(xp_in_level, xp_needed)

    # Get track progress
    track_progress = await track_repo.get_progress(tg_id, "foundations")
    completed_levels = sum(1 for p in track_progress if p.status == "completed")
    total_levels = 4

    # Get recent attempts
    recent = await attempt_repo.get_recent(tg_id, 10)
    total_attempts = len(recent)

    if recent:
        avg_score = sum(a.score for a in recent) / len(recent)
        best_score = max(a.score for a in recent)
    else:
        avg_score = 0
        best_score = 0

    # Get seen count
    seen_ids = await seen_repo.get_seen_ids(tg_id)
    train_seen = len(seen_ids)

    parts = [
        f"📊 *Your Stats*\n",
        f"🏆 Rank: *{rank}*",
        f"⚡ Level {level} {level_bar}",
        f"💎 Total XP: {user.total_xp}",
        f"🔥 Streak: {user.streak_days} days",
        "",
        f"*Training Progress:*",
        f"  📚 Track 1 Levels: {completed_levels}/{total_levels}",
        f"  🎲 Train Scenarios: {train_seen}/20",
        "",
        f"*Recent Performance (last 10):*",
        f"  📊 Average Score: {avg_score:.0f}/100",
        f"  🎯 Best Score: {best_score}/100",
        f"  📝 Total Attempts: {total_attempts}",
    ]

    # Lead pipeline summary (always show section for consistency)
    try:
        lead_counts = await lead_repo.count_by_status_for_user(tg_id)
        total_leads = sum(lead_counts.values())
        if total_leads > 0:
            parts.extend(["", f"*Lead Pipeline ({total_leads} total):*"])
            for status, icon in PIPELINE_STATUS_ICONS.items():
                count = lead_counts.get(status, 0)
                if count > 0:
                    parts.append(f"  {icon} {status.replace('_', ' ').title()}: {count}")
        else:
            parts.extend(["", "*Lead Pipeline:*", "  No leads yet — use /support to analyze a prospect"])
    except Exception as e:
        logger.error("Failed to get lead stats: %s", e)

    # Add provider info
    provider = "OpenRouter 🆓" if user.provider == "openrouter" else "Claude API ⭐"
    parts.extend(["", f"⚙️ Provider: {provider}"])

    # Action buttons to reduce dead-ends
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🎓 Continue Learning", callback_data="stats:learn"),
            InlineKeyboardButton(text="🎲 Quick Practice", callback_data="stats:train"),
        ],
        [
            InlineKeyboardButton(text="💼 Support Mode", callback_data="stats:support"),
            InlineKeyboardButton(text="📋 My Leads", callback_data="stats:leads"),
        ],
    ])

    await message.answer("\n".join(parts), parse_mode="Markdown", reply_markup=keyboard)


@router.callback_query(F.data == "stats:learn")
async def on_stats_learn(
    callback: CallbackQuery,
    state: FSMContext,
    user_repo: UserRepo,
    track_repo: TrackProgressRepo,
) -> None:
    """Directly show learn track from stats."""
    from bot.handlers.learn import _load_scenarios, _build_progress_text

    tg_id = callback.from_user.id
    user = await user_repo.get_by_telegram_id(tg_id)
    if not user:
        await callback.message.edit_text("Please run /start first.")  # type: ignore[union-attr]
        await callback.answer()
        return

    scenarios = _load_scenarios()
    track_1 = scenarios.get("learn_tracks", {}).get("track_1", {})
    levels = track_1.get("levels", [])

    if user.id:
        await track_repo.init_track(user.id, tg_id, "foundations", [l["id"] for l in levels])

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


@router.callback_query(F.data == "stats:train")
async def on_stats_train(
    callback: CallbackQuery,
    state: FSMContext,
    user_repo: UserRepo,
    seen_repo: ScenariosSeenRepo,
) -> None:
    """Directly start a training scenario from stats."""
    import random
    from bot.handlers.train import _load_train_pool
    from bot.states import TrainState
    from bot.utils import _sanitize

    tg_id = callback.from_user.id
    user = await user_repo.get_by_telegram_id(tg_id)

    if not user or not user.encrypted_api_key:
        await callback.message.edit_text("Please run /start first.")  # type: ignore[union-attr]
        await callback.answer()
        return

    pool = _load_train_pool()
    if not pool:
        await callback.message.edit_text("No training scenarios available.")  # type: ignore[union-attr]
        await callback.answer()
        return

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
        f"*{_sanitize(persona.get('name', 'Someone'))}*\n"
        f"_{_sanitize(persona.get('role', ''))} at {_sanitize(persona.get('company', ''))}_\n"
        f"Background: {_sanitize(persona.get('background', ''))}\n\n"
        f"💬 *Situation:*\n{_sanitize(scenario.get('situation', ''))}\n\n"
        f"{'⭐' * difficulty} Difficulty | "
        f"Category: {_sanitize(scenario.get('category', 'general'))}\n\n"
        f"Remaining: {len(unseen_ids) - 1}/{len(all_ids)} unseen\n\n"
        f"📝 Type your response or send a voice message:\n"
        f"💡 _Tip: respond by voice — its more like real sales!_\n"
        f"_Type /cancel to skip._"
    )

    await callback.message.edit_text(scenario_text, parse_mode="Markdown")  # type: ignore[union-attr]
    await state.set_state(TrainState.answering_scenario)
    await state.update_data(
        scenario_id=chosen_id,
        scenario_data=scenario,
    )
    await callback.answer()


@router.callback_query(F.data == "stats:support")
async def on_stats_support(callback: CallbackQuery, state: FSMContext) -> None:
    """Enter support mode directly from stats."""
    from bot.states import SupportState

    await callback.message.edit_text(  # type: ignore[union-attr]
        "💼 *Deal Support Mode*\n\n"
        "Describe your prospect situation:\n"
        "• Who they are (role, company)\n"
        "• What they said or asked\n"
        "• Any context you have\n\n"
        "You can also send a screenshot or voice message.\n\n"
        "I'll give you a full strategy + draft response.",
        parse_mode="Markdown",
    )
    await state.set_state(SupportState.waiting_input)
    await callback.answer()


@router.callback_query(F.data == "stats:leads")
async def on_stats_leads(
    callback: CallbackQuery,
    lead_repo: LeadRegistryRepo,
) -> None:
    """Directly show leads list from stats."""
    from bot.handlers.leads import _leads_list_keyboard, STATUS_LABELS
    from bot.utils import _sanitize

    tg_id = callback.from_user.id
    leads = await lead_repo.get_for_user(tg_id, limit=50)

    if not leads:
        await callback.message.edit_text(  # type: ignore[union-attr]
            "📋 *Lead Registry*\n\n"
            "No leads yet. Use /support to analyze a prospect — "
            "every analysis is automatically saved here.",
            parse_mode="Markdown",
        )
        await callback.answer()
        return

    status_counts: dict[str, int] = {}
    for lead in leads:
        status_counts[lead.status] = status_counts.get(lead.status, 0) + 1

    summary_lines = []
    for status, label in STATUS_LABELS.items():
        count = status_counts.get(status, 0)
        if count > 0:
            summary_lines.append(f"  {label}: {count}")

    summary = "\n".join(summary_lines) if summary_lines else "  No leads yet"

    await callback.message.edit_text(  # type: ignore[union-attr]
        f"📋 *Lead Registry*\n\n"
        f"Total: {len(leads)} leads\n\n"
        f"{summary}\n\n"
        f"Tap a lead to view details:",
        parse_mode="Markdown",
        reply_markup=_leads_list_keyboard(leads),
    )
    await callback.answer()
