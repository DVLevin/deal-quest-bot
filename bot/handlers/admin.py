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

from bot.storage.insforge_client import InsForgeClient
from bot.storage.repositories import (
    AttemptRepo,
    CasebookRepo,
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
        [InlineKeyboardButton(text="👥 User Overview", callback_data="admin:users")],
        [InlineKeyboardButton(text="📋 Recent Activity", callback_data="admin:activity")],
        [InlineKeyboardButton(text="🏗 Architecture Overview", callback_data="admin:arch")],
        [InlineKeyboardButton(text="📚 Knowledge Base Status", callback_data="admin:knowledge")],
        [InlineKeyboardButton(text="🎯 Scenario Stats", callback_data="admin:scenarios")],
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
        # Sort by attempt count (most popular first)
        sorted_scenarios = sorted(scenario_stats.items(), key=lambda x: x[1]["count"], reverse=True)
        for sid, stats in sorted_scenarios[:20]:
            avg = stats["total_score"] / stats["count"] if stats["count"] > 0 else 0
            icon = "🎓" if stats["mode"] == "learn" else "🎲"
            lines.append(f"{icon} `{sid}` — {stats['count']} attempts, avg {avg:.0f}/100")
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
