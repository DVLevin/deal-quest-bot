"""Handler for /stats — progress view."""

from __future__ import annotations

import logging

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message

from bot.services.scoring import get_level_from_xp, get_rank_title
from bot.storage.repositories import (
    AttemptRepo,
    ScenariosSeenRepo,
    TrackProgressRepo,
    UserRepo,
)
from bot.utils import format_score_bar

logger = logging.getLogger(__name__)

router = Router(name="stats")


@router.message(Command("stats"))
async def cmd_stats(
    message: Message,
    user_repo: UserRepo,
    track_repo: TrackProgressRepo,
    attempt_repo: AttemptRepo,
    seen_repo: ScenariosSeenRepo,
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

    # Add provider info
    provider = "OpenRouter 🆓" if user.provider == "openrouter" else "Claude API ⭐"
    parts.extend(["", f"⚙️ Provider: {provider}"])

    await message.answer("\n".join(parts), parse_mode="Markdown")
