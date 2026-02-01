"""Handler for /admin — admin panel for team leads."""

from __future__ import annotations

import json
import logging
from pathlib import Path

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)

from bot.services.analytics import TeamAnalyticsService
from bot.storage.insforge_client import InsForgeClient
from bot.storage.repositories import (
    AttemptRepo,
    CasebookRepo,
    GeneratedScenarioRepo,
    ScenariosSeenRepo,
    SupportSessionRepo,
    TrackProgressRepo,
    UserMemoryRepo,
    UserRepo,
)

logger = logging.getLogger(__name__)

router = Router(name="admin")

_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

ADMIN_MENU = InlineKeyboardMarkup(
    inline_keyboard=[
        [InlineKeyboardButton(text="📊 Team Statistics", callback_data="admin:stats")],
        [InlineKeyboardButton(text="🏆 Leaderboard", callback_data="admin:leaderboard")],
        [InlineKeyboardButton(text="📈 Trends", callback_data="admin:trends")],
        [InlineKeyboardButton(text="👥 User Overview", callback_data="admin:users")],
        [InlineKeyboardButton(text="📋 Recent Activity", callback_data="admin:activity")],
        [InlineKeyboardButton(text="🏗 Architecture Overview", callback_data="admin:arch")],
        [InlineKeyboardButton(text="📚 Knowledge Base Status", callback_data="admin:knowledge")],
        [InlineKeyboardButton(text="🎯 Scenario Stats", callback_data="admin:scenarios")],
        [InlineKeyboardButton(text="🤖 Generated Scenarios", callback_data="admin:gen_scenarios")],
        [InlineKeyboardButton(text="📖 Casebook Entries", callback_data="admin:casebook")],
        [InlineKeyboardButton(text="❌ Close", callback_data="admin:close")],
    ]
)


@router.message(Command("admin"))
async def cmd_admin(
    message: Message,
    user_repo: UserRepo,
    admin_usernames: list[str],
) -> None:
    """Admin panel — restricted to admin usernames."""
    username = (message.from_user.username or "").lower()  # type: ignore[union-attr]

    if username not in admin_usernames:
        await message.answer("🔒 This command is only available to admins.")
        return

    await message.answer(
        "🛠 *Admin Panel*\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "Manage Deal Quest Bot",
        parse_mode="Markdown",
        reply_markup=ADMIN_MENU,
    )


@router.callback_query(F.data == "admin:stats")
async def on_admin_stats(
    callback: CallbackQuery,
    user_repo: UserRepo,
    attempt_repo: AttemptRepo,
    admin_usernames: list[str],
) -> None:
    """Show team-wide statistics."""
    username = (callback.from_user.username or "").lower()
    if username not in admin_usernames:
        await callback.answer("🔒 Admin only", show_alert=True)
        return

    # Query all users
    users = await user_repo.client.query("users", select="*")
    users = users if isinstance(users, list) else []

    total_users = len(users)
    total_xp = sum(u.get("total_xp", 0) for u in users)
    active_providers = {}
    for u in users:
        p = u.get("provider", "unknown")
        active_providers[p] = active_providers.get(p, 0) + 1

    # Query all attempts
    attempts = await attempt_repo.client.query("attempts", select="id,score,mode")
    attempts = attempts if isinstance(attempts, list) else []
    total_attempts = len(attempts)
    learn_attempts = sum(1 for a in attempts if a.get("mode") == "learn")
    train_attempts = sum(1 for a in attempts if a.get("mode") == "train")
    avg_score = (
        sum(a.get("score", 0) for a in attempts) / total_attempts
        if total_attempts > 0
        else 0
    )

    # Query support sessions
    sessions = await attempt_repo.client.query("support_sessions", select="id")
    sessions = sessions if isinstance(sessions, list) else []

    providers_text = "\n".join(f"  • {k}: {v}" for k, v in active_providers.items())

    text = (
        "📊 *Team Statistics*\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        f"👥 Total Users: *{total_users}*\n"
        f"💎 Total Team XP: *{total_xp}*\n\n"
        f"*Providers:*\n{providers_text}\n\n"
        f"*Activity:*\n"
        f"  📝 Total Attempts: {total_attempts}\n"
        f"  🎓 Learn: {learn_attempts}\n"
        f"  🎲 Train: {train_attempts}\n"
        f"  💼 Support Sessions: {len(sessions)}\n"
        f"  📊 Avg Score: {avg_score:.0f}/100\n"
    )

    await callback.message.edit_text(  # type: ignore[union-attr]
        text,
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Back", callback_data="admin:back")],
        ]),
    )
    await callback.answer()


@router.callback_query(F.data == "admin:users")
async def on_admin_users(
    callback: CallbackQuery,
    user_repo: UserRepo,
    admin_usernames: list[str],
) -> None:
    """Show all registered users."""
    username = (callback.from_user.username or "").lower()
    if username not in admin_usernames:
        await callback.answer("🔒 Admin only", show_alert=True)
        return

    users = await user_repo.client.query("users", select="*", order="created_at.desc")
    users = users if isinstance(users, list) else []

    if not users:
        text = "👥 *Users*\n\nNo users registered yet."
    else:
        lines = ["👥 *User Overview*\n━━━━━━━━━━━━━━━━━━━━━━━━\n"]
        for u in users:
            uname = u.get("username", "N/A")
            fname = u.get("first_name", "")
            xp = u.get("total_xp", 0)
            lvl = u.get("current_level", 1)
            provider = u.get("provider", "?")
            lines.append(
                f"• @{uname} ({fname}) — Level {lvl}, {xp} XP [{provider}]"
            )
        text = "\n".join(lines)

    await callback.message.edit_text(  # type: ignore[union-attr]
        text,
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Back", callback_data="admin:back")],
        ]),
    )
    await callback.answer()


@router.callback_query(F.data == "admin:activity")
async def on_admin_activity(
    callback: CallbackQuery,
    attempt_repo: AttemptRepo,
    admin_usernames: list[str],
) -> None:
    """Show recent activity."""
    username = (callback.from_user.username or "").lower()
    if username not in admin_usernames:
        await callback.answer("🔒 Admin only", show_alert=True)
        return

    # Get recent attempts across all users
    attempts = await attempt_repo.client.query(
        "attempts",
        select="*",
        order="created_at.desc",
        limit=15,
    )
    attempts = attempts if isinstance(attempts, list) else []

    if not attempts:
        text = "📋 *Recent Activity*\n\nNo activity yet."
    else:
        lines = ["📋 *Recent Activity (last 15)*\n━━━━━━━━━━━━━━━━━━━━━━━━\n"]
        for a in attempts:
            mode = a.get("mode", "?")
            score = a.get("score", 0)
            scenario = a.get("scenario_id", "?")
            xp = a.get("xp_earned", 0)
            tg_id = a.get("telegram_id", "?")
            icon = "🎓" if mode == "learn" else "🎲"
            lines.append(f"{icon} User {tg_id}: {mode} {scenario} — {score}/100 (+{xp} XP)")
        text = "\n".join(lines)

    await callback.message.edit_text(  # type: ignore[union-attr]
        text,
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Back", callback_data="admin:back")],
        ]),
    )
    await callback.answer()


@router.callback_query(F.data == "admin:arch")
async def on_admin_arch(
    callback: CallbackQuery,
    admin_usernames: list[str],
) -> None:
    """Show architecture overview."""
    username = (callback.from_user.username or "").lower()
    if username not in admin_usernames:
        await callback.answer("🔒 Admin only", show_alert=True)
        return

    text = (
        "🏗 *Architecture Overview*\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "*Stack:*\n"
        "  • Python + aiogram 3.x (Telegram)\n"
        "  • InsForge PostgreSQL (via REST API)\n"
        "  • OpenRouter / Claude API (LLM)\n\n"
        "*Agent Pipeline:*\n"
        "  • StrategistAgent → /support analysis\n"
        "  • TrainerAgent → /learn & /train scoring\n"
        "  • MemoryAgent → background memory updates\n\n"
        "*Pipeline Modes:*\n"
        "  • Sequential (await result)\n"
        "  • Parallel (asyncio.gather)\n"
        "  • Background (fire-and-forget)\n\n"
        "*Database Tables:*\n"
        "  • users (accounts + encrypted keys)\n"
        "  • user_memory (JSON learning profile)\n"
        "  • attempts (scores + feedback)\n"
        "  • scenarios_seen (never-repeat tracking)\n"
        "  • support_sessions (deal analyses)\n"
        "  • track_progress (level completion)\n"
        "  • casebook (reusable strategies)\n\n"
        "*Data Files:*\n"
        "  • playbook.md — Sales playbook\n"
        "  • company_knowledge.md — Full KB\n"
        "  • scenarios.json — 4 learn + 20 train\n"
        "  • pipelines/*.yaml — Agent configs\n"
    )

    await callback.message.edit_text(  # type: ignore[union-attr]
        text,
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Back", callback_data="admin:back")],
        ]),
    )
    await callback.answer()


@router.callback_query(F.data == "admin:knowledge")
async def on_admin_knowledge(
    callback: CallbackQuery,
    admin_usernames: list[str],
) -> None:
    """Show knowledge base status."""
    username = (callback.from_user.username or "").lower()
    if username not in admin_usernames:
        await callback.answer("🔒 Admin only", show_alert=True)
        return

    files = {
        "playbook.md": _DATA_DIR / "playbook.md",
        "company_knowledge.md": _DATA_DIR / "company_knowledge.md",
        "scenarios.json": _DATA_DIR / "scenarios.json",
    }

    lines = ["📚 *Knowledge Base Status*\n━━━━━━━━━━━━━━━━━━━━━━━━\n"]
    for name, path in files.items():
        if path.exists():
            size = path.stat().st_size
            lines_count = path.read_text(encoding="utf-8").count("\n") + 1
            lines.append(f"✅ *{name}*")
            lines.append(f"   Size: {size / 1024:.1f} KB | Lines: {lines_count}")
        else:
            lines.append(f"❌ *{name}* — NOT FOUND")
        lines.append("")

    # Scenarios detail
    scenarios_path = _DATA_DIR / "scenarios.json"
    if scenarios_path.exists():
        with open(scenarios_path, encoding="utf-8") as f:
            data = json.load(f)
        track1 = data.get("learn_tracks", {}).get("track_1", {})
        train_pool = data.get("train_pool", {})
        lines.append("*Scenarios:*")
        lines.append(f"  🎓 Learn levels: {len(track1.get('levels', []))}")
        lines.append(f"  🎲 Train pool: {len(train_pool.get('scenarios', []))}")

    # Pipelines
    pipelines_dir = _DATA_DIR / "pipelines"
    if pipelines_dir.exists():
        yamls = list(pipelines_dir.glob("*.yaml"))
        lines.append(f"\n*Pipelines:* {len(yamls)}")
        for y in yamls:
            lines.append(f"  • {y.name}")

    # Prompts
    prompts_dir = _DATA_DIR.parent / "prompts"
    if prompts_dir.exists():
        prompts = list(prompts_dir.glob("*.md"))
        lines.append(f"\n*Agent Prompts:* {len(prompts)}")
        for p in prompts:
            size = p.stat().st_size
            lines.append(f"  • {p.name} ({size / 1024:.1f} KB)")

    text = "\n".join(lines)

    await callback.message.edit_text(  # type: ignore[union-attr]
        text,
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Back", callback_data="admin:back")],
        ]),
    )
    await callback.answer()


@router.callback_query(F.data == "admin:scenarios")
async def on_admin_scenarios(
    callback: CallbackQuery,
    attempt_repo: AttemptRepo,
    admin_usernames: list[str],
) -> None:
    """Show per-scenario statistics."""
    username = (callback.from_user.username or "").lower()
    if username not in admin_usernames:
        await callback.answer("🔒 Admin only", show_alert=True)
        return

    # Get all attempts grouped by scenario
    all_attempts = await attempt_repo.client.query("attempts", select="scenario_id,score,mode")
    all_attempts = all_attempts if isinstance(all_attempts, list) else []

    scenario_stats: dict[str, dict] = {}
    for a in all_attempts:
        sid = a.get("scenario_id", "?")
        if sid not in scenario_stats:
            scenario_stats[sid] = {"count": 0, "total_score": 0, "mode": a.get("mode", "?")}
        scenario_stats[sid]["count"] += 1
        scenario_stats[sid]["total_score"] += a.get("score", 0)

    if not scenario_stats:
        text = "🎯 *Scenario Stats*\n\nNo attempts recorded yet."
    else:
        lines = ["🎯 *Scenario Performance*\n━━━━━━━━━━━━━━━━━━━━━━━━\n"]

        # Difficulty breakdown from scenarios.json
        scenarios_path = _DATA_DIR / "scenarios.json"
        difficulty_map: dict[str, int] = {}
        if scenarios_path.exists():
            with open(scenarios_path, encoding="utf-8") as f:
                data = json.load(f)
            for s in data.get("train_pool", {}).get("scenarios", []):
                difficulty_map[s["id"]] = s.get("difficulty", 0)
            for track in data.get("learn_tracks", {}).values():
                for level in track.get("levels", []):
                    sc = level.get("scenario", {})
                    if sc.get("id"):
                        difficulty_map[sc["id"]] = sc.get("difficulty", 0)

        # Sort by attempt count (most popular first)
        sorted_scenarios = sorted(scenario_stats.items(), key=lambda x: x[1]["count"], reverse=True)
        for sid, stats in sorted_scenarios[:20]:
            avg = stats["total_score"] / stats["count"] if stats["count"] > 0 else 0
            icon = "🎓" if stats["mode"] == "learn" else "🎲"
            diff = difficulty_map.get(sid, 0)
            diff_text = f" {'⭐' * diff}" if diff > 0 else ""
            lines.append(f"{icon} `{sid}`{diff_text} — {stats['count']} attempts, avg {avg:.0f}/100")
        text = "\n".join(lines)

    await callback.message.edit_text(  # type: ignore[union-attr]
        text,
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Back", callback_data="admin:back")],
        ]),
    )
    await callback.answer()


@router.callback_query(F.data == "admin:casebook")
async def on_admin_casebook(
    callback: CallbackQuery,
    casebook_repo: CasebookRepo,
    admin_usernames: list[str],
) -> None:
    """Show casebook entries."""
    username = (callback.from_user.username or "").lower()
    if username not in admin_usernames:
        await callback.answer("🔒 Admin only", show_alert=True)
        return

    entries = await casebook_repo.client.query(
        "casebook", select="*", order="created_at.desc", limit=10
    )
    entries = entries if isinstance(entries, list) else []

    if not entries:
        text = "📖 *Casebook*\n\nNo entries yet. Casebook entries are created automatically when users accept high-quality support responses."
    else:
        lines = ["📖 *Casebook Entries*\n━━━━━━━━━━━━━━━━━━━━━━━━\n"]
        for e in entries:
            lines.append(
                f"• {e.get('persona_type', '?')} / {e.get('scenario_type', '?')} "
                f"— Quality: {e.get('quality_score', 0):.1f}"
            )
        text = "\n".join(lines)

    await callback.message.edit_text(  # type: ignore[union-attr]
        text,
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Back", callback_data="admin:back")],
        ]),
    )
    await callback.answer()


@router.callback_query(F.data == "admin:leaderboard")
async def on_admin_leaderboard(
    callback: CallbackQuery,
    admin_usernames: list[str],
    analytics_service: TeamAnalyticsService | None = None,
) -> None:
    """Show team leaderboard ranked by performance."""
    username = (callback.from_user.username or "").lower()
    if username not in admin_usernames:
        await callback.answer("🔒 Admin only", show_alert=True)
        return

    if not analytics_service:
        await callback.message.edit_text(  # type: ignore[union-attr]
            "🏆 *Leaderboard*\n\nAnalytics service not available.",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="🔙 Back", callback_data="admin:back")],
            ]),
        )
        await callback.answer()
        return

    leaderboard = await analytics_service.team_leaderboard()

    if not leaderboard:
        text = "🏆 *Leaderboard*\n\nNo team members with activity yet."
    else:
        lines = ["🏆 *Team Leaderboard*\n━━━━━━━━━━━━━━━━━━━━━━━━\n"]
        for i, entry in enumerate(leaderboard, 1):
            medal = "🥇" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else f"#{i}"
            name = entry["username"] or entry["first_name"] or "N/A"
            lines.append(
                f"{medal} @{name} — Avg: {entry['avg_score']}/100 | "
                f"Level {entry['current_level']} | {entry['total_xp']} XP | "
                f"{entry['total_attempts']} attempts"
            )
        text = "\n".join(lines)

    await callback.message.edit_text(  # type: ignore[union-attr]
        text,
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Back", callback_data="admin:back")],
        ]),
    )
    await callback.answer()


@router.callback_query(F.data == "admin:trends")
async def on_admin_trends(
    callback: CallbackQuery,
    admin_usernames: list[str],
    analytics_service: TeamAnalyticsService | None = None,
) -> None:
    """Show performance trends — this week vs last week."""
    username = (callback.from_user.username or "").lower()
    if username not in admin_usernames:
        await callback.answer("🔒 Admin only", show_alert=True)
        return

    if not analytics_service:
        await callback.message.edit_text(  # type: ignore[union-attr]
            "📈 *Trends*\n\nAnalytics service not available.",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="🔙 Back", callback_data="admin:back")],
            ]),
        )
        await callback.answer()
        return

    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)
    one_week_ago = (now - timedelta(days=7)).isoformat()
    two_weeks_ago = (now - timedelta(days=14)).isoformat()

    # Fetch recent attempts
    all_recent = await analytics_service.attempt_repo.get_all_recent(limit=500)

    this_week = [a for a in all_recent if a.created_at and a.created_at >= one_week_ago]
    last_week = [
        a for a in all_recent
        if a.created_at and two_weeks_ago <= a.created_at < one_week_ago
    ]

    this_avg = sum(a.score for a in this_week) / len(this_week) if this_week else 0
    last_avg = sum(a.score for a in last_week) / len(last_week) if last_week else 0

    trend = this_avg - last_avg
    trend_icon = "📈" if trend > 0 else "📉" if trend < 0 else "➡️"

    # Category breakdown
    categories = await analytics_service.category_performance()
    cat_text = ""
    for cat, data in categories.items():
        cat_text += f"  • {cat}: {data['avg_score']}/100 ({data['attempts']} attempts)\n"

    # Most improved user
    leaderboard = await analytics_service.team_leaderboard()
    most_improved = ""
    if leaderboard:
        for entry in leaderboard:
            # Simple heuristic: highest XP gain
            most_improved = f"@{entry['username']}" if entry['username'] else entry['first_name']
            break

    text = (
        "📈 *Performance Trends*\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        f"*This week:*\n"
        f"  Avg Score: {this_avg:.0f}/100 ({len(this_week)} attempts)\n\n"
        f"*Last week:*\n"
        f"  Avg Score: {last_avg:.0f}/100 ({len(last_week)} attempts)\n\n"
        f"{trend_icon} Trend: {'+' if trend > 0 else ''}{trend:.1f} points\n\n"
    )
    if cat_text:
        text += f"*By Category:*\n{cat_text}\n"
    if most_improved:
        text += f"*Top Performer:* {most_improved}\n"

    await callback.message.edit_text(  # type: ignore[union-attr]
        text,
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Back", callback_data="admin:back")],
        ]),
    )
    await callback.answer()


@router.callback_query(F.data == "admin:gen_scenarios")
async def on_admin_gen_scenarios(
    callback: CallbackQuery,
    admin_usernames: list[str],
    generated_scenario_repo: GeneratedScenarioRepo,
) -> None:
    """Show generated scenario pool status."""
    username = (callback.from_user.username or "").lower()
    if username not in admin_usernames:
        await callback.answer("🔒 Admin only", show_alert=True)
        return

    count = await generated_scenario_repo.count()
    scenarios = await generated_scenario_repo.get_all(limit=50)

    if not scenarios:
        text = (
            "🤖 *Generated Scenarios*\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"Pool: {count} scenarios\n\n"
            "No generated scenarios yet. The background generator will create them "
            "automatically if a shared OpenRouter key is configured."
        )
    else:
        lines = [
            "🤖 *Generated Scenarios*\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"Pool: {count} scenarios\n"
        ]

        # Difficulty breakdown
        d1 = sum(1 for s in scenarios if s.difficulty == 1)
        d2 = sum(1 for s in scenarios if s.difficulty == 2)
        d3 = sum(1 for s in scenarios if s.difficulty == 3)
        lines.append(f"⭐ Easy: {d1} | ⭐⭐ Medium: {d2} | ⭐⭐⭐ Hard: {d3}\n")

        # Avg quality
        used = [s for s in scenarios if s.times_used > 0]
        if used:
            avg_quality = sum(s.avg_score for s in used) / len(used)
            lines.append(f"Avg Quality Score: {avg_quality:.0f}/100 (from {len(used)} used)\n")

        # Recent entries
        lines.append("*Recent:*")
        for s in scenarios[:10]:
            cat = s.category or "general"
            used_text = f"used {s.times_used}x" if s.times_used > 0 else "unused"
            lines.append(f"  • `{s.scenario_id}` — {cat} ({'⭐' * s.difficulty}) [{used_text}]")

        text = "\n".join(lines)

    await callback.message.edit_text(  # type: ignore[union-attr]
        text,
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Back", callback_data="admin:back")],
        ]),
    )
    await callback.answer()


@router.callback_query(F.data == "admin:back")
async def on_admin_back(callback: CallbackQuery) -> None:
    await callback.message.edit_text(  # type: ignore[union-attr]
        "🛠 *Admin Panel*\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "Manage Deal Quest Bot",
        parse_mode="Markdown",
        reply_markup=ADMIN_MENU,
    )
    await callback.answer()


@router.callback_query(F.data == "admin:close")
async def on_admin_close(callback: CallbackQuery) -> None:
    await callback.message.delete()  # type: ignore[union-attr]
    await callback.answer()
