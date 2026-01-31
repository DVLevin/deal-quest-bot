"""Handler for /leads — view and manage prospect lead registry."""

from __future__ import annotations

import logging

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)

from bot.storage.repositories import LeadRegistryRepo, UserRepo

logger = logging.getLogger(__name__)

router = Router(name="leads")

STATUS_LABELS = {
    "analyzed": "🔍 Analyzed",
    "reached_out": "📨 Reached Out",
    "meeting_booked": "📅 Meeting Booked",
    "in_progress": "🔄 In Progress",
    "closed_won": "✅ Closed Won",
    "closed_lost": "❌ Closed Lost",
}

STATUS_ORDER = list(STATUS_LABELS.keys())


def _leads_list_keyboard(leads: list, page: int = 0, page_size: int = 5) -> InlineKeyboardMarkup:
    """Build paginated lead list keyboard."""
    start = page * page_size
    end = start + page_size
    page_leads = leads[start:end]

    buttons = []
    for lead in page_leads:
        name = lead.prospect_name or "Unknown"
        company = f" @ {lead.prospect_company}" if lead.prospect_company else ""
        status_icon = STATUS_LABELS.get(lead.status, "❓").split(" ")[0]
        photo_icon = "📸" if lead.photo_url else "📝"
        label = f"{photo_icon} {status_icon} {name}{company}"
        buttons.append([InlineKeyboardButton(
            text=label[:60],
            callback_data=f"lead:view:{lead.id}",
        )])

    # Pagination
    nav = []
    if page > 0:
        nav.append(InlineKeyboardButton(text="◀️ Prev", callback_data=f"lead:page:{page - 1}"))
    if end < len(leads):
        nav.append(InlineKeyboardButton(text="Next ▶️", callback_data=f"lead:page:{page + 1}"))
    if nav:
        buttons.append(nav)

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def _lead_detail_keyboard(lead_id: int, current_status: str) -> InlineKeyboardMarkup:
    """Build status update keyboard for a single lead."""
    buttons = []
    # Show status progression options (only statuses after current)
    current_idx = STATUS_ORDER.index(current_status) if current_status in STATUS_ORDER else 0

    row = []
    for status in STATUS_ORDER:
        if status == current_status:
            continue
        label = STATUS_LABELS[status]
        row.append(InlineKeyboardButton(
            text=label,
            callback_data=f"lead:status:{lead_id}:{status}",
        ))
        if len(row) == 2:
            buttons.append(row)
            row = []
    if row:
        buttons.append(row)

    buttons.append([InlineKeyboardButton(text="◀️ Back to List", callback_data="lead:back")])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


@router.message(Command("leads"))
async def cmd_leads(message: Message, user_repo: UserRepo, lead_repo: LeadRegistryRepo) -> None:
    """Show the user's lead registry."""
    tg_id = message.from_user.id  # type: ignore[union-attr]

    user = await user_repo.get_by_telegram_id(tg_id)
    if not user:
        await message.answer("Please run /start first.")
        return

    leads = await lead_repo.get_for_user(tg_id, limit=50)

    if not leads:
        await message.answer(
            "📋 *Lead Registry*\n\n"
            "No leads yet. Use /support to analyze a prospect — "
            "every analysis is automatically saved here.\n\n"
            "Send a photo or text description of a prospect to get started.",
            parse_mode="Markdown",
        )
        return

    # Count by status
    status_counts: dict[str, int] = {}
    photo_count = 0
    for lead in leads:
        status_counts[lead.status] = status_counts.get(lead.status, 0) + 1
        if lead.photo_url:
            photo_count += 1

    summary_lines = []
    for status, label in STATUS_LABELS.items():
        count = status_counts.get(status, 0)
        if count > 0:
            summary_lines.append(f"  {label}: {count}")

    summary = "\n".join(summary_lines) if summary_lines else "  No leads yet"

    await message.answer(
        f"📋 *Lead Registry*\n\n"
        f"Total: {len(leads)} leads ({photo_count} with photos)\n\n"
        f"{summary}\n\n"
        f"Tap a lead to view details or update status:",
        parse_mode="Markdown",
        reply_markup=_leads_list_keyboard(leads),
    )


@router.callback_query(F.data.startswith("lead:page:"))
async def on_leads_page(
    callback: CallbackQuery, lead_repo: LeadRegistryRepo
) -> None:
    """Handle lead list pagination."""
    page = int(callback.data.split(":")[2])  # type: ignore[union-attr]
    tg_id = callback.from_user.id

    leads = await lead_repo.get_for_user(tg_id, limit=50)

    await callback.message.edit_reply_markup(  # type: ignore[union-attr]
        reply_markup=_leads_list_keyboard(leads, page=page)
    )
    await callback.answer()


@router.callback_query(F.data.startswith("lead:view:"))
async def on_lead_view(
    callback: CallbackQuery, lead_repo: LeadRegistryRepo
) -> None:
    """View a single lead's details."""
    lead_id = int(callback.data.split(":")[2])  # type: ignore[union-attr]

    lead = await lead_repo.get_by_id(lead_id)
    if not lead:
        await callback.answer("Lead not found.")
        return

    name = lead.prospect_name or "Unknown Prospect"
    title = lead.prospect_title or ""
    company = lead.prospect_company or ""
    status_label = STATUS_LABELS.get(lead.status, lead.status)
    photo_line = f"📸 [Photo saved]({lead.photo_url})\n" if lead.photo_url else ""
    date = (lead.created_at or "")[:10]

    # Truncate long fields for Telegram
    analysis = (lead.prospect_analysis or "")[:500]
    strategy = (lead.closing_strategy or "")[:500]
    draft = (lead.draft_response or "")[:300]

    text = (
        f"📋 *{name}*\n"
        f"{title}"
        f"{' @ ' + company if company else ''}\n"
        f"Status: {status_label}\n"
        f"Date: {date}\n"
        f"{photo_line}\n"
    )

    if analysis:
        text += f"*Analysis:*\n{analysis}\n\n"
    if strategy:
        text += f"*Strategy:*\n{strategy}\n\n"
    if draft:
        text += f"*Draft:*\n{draft}\n"

    if lead.notes:
        text += f"\n📝 *Notes:* {lead.notes}\n"

    text += "\n*Update status:*"

    await callback.message.edit_text(  # type: ignore[union-attr]
        text[:4000],
        parse_mode="Markdown",
        reply_markup=_lead_detail_keyboard(lead_id, lead.status),
        disable_web_page_preview=True,
    )
    await callback.answer()


@router.callback_query(F.data.startswith("lead:status:"))
async def on_lead_status_update(
    callback: CallbackQuery, lead_repo: LeadRegistryRepo
) -> None:
    """Update a lead's status."""
    parts = callback.data.split(":")  # type: ignore[union-attr]
    lead_id = int(parts[2])
    new_status = parts[3]

    await lead_repo.update_status(lead_id, new_status)

    status_label = STATUS_LABELS.get(new_status, new_status)
    await callback.answer(f"Updated to {status_label}")

    # Refresh the lead detail view
    lead = await lead_repo.get_by_id(lead_id)
    if lead:
        name = lead.prospect_name or "Unknown Prospect"
        title = lead.prospect_title or ""
        company = lead.prospect_company or ""
        photo_line = f"📸 [Photo saved]({lead.photo_url})\n" if lead.photo_url else ""
        date = (lead.created_at or "")[:10]
        analysis = (lead.prospect_analysis or "")[:500]
        strategy = (lead.closing_strategy or "")[:500]
        draft = (lead.draft_response or "")[:300]

        text = (
            f"📋 *{name}*\n"
            f"{title}"
            f"{' @ ' + company if company else ''}\n"
            f"Status: {status_label}\n"
            f"Date: {date}\n"
            f"{photo_line}\n"
        )

        if analysis:
            text += f"*Analysis:*\n{analysis}\n\n"
        if strategy:
            text += f"*Strategy:*\n{strategy}\n\n"
        if draft:
            text += f"*Draft:*\n{draft}\n"

        if lead.notes:
            text += f"\n📝 *Notes:* {lead.notes}\n"

        text += "\n*Update status:*"

        await callback.message.edit_text(  # type: ignore[union-attr]
            text[:4000],
            parse_mode="Markdown",
            reply_markup=_lead_detail_keyboard(lead_id, new_status),
            disable_web_page_preview=True,
        )


@router.callback_query(F.data == "lead:back")
async def on_lead_back(
    callback: CallbackQuery, lead_repo: LeadRegistryRepo
) -> None:
    """Go back to lead list."""
    tg_id = callback.from_user.id
    leads = await lead_repo.get_for_user(tg_id, limit=50)

    if not leads:
        await callback.message.edit_text("📋 No leads yet.")  # type: ignore[union-attr]
        await callback.answer()
        return

    status_counts: dict[str, int] = {}
    photo_count = 0
    for lead in leads:
        status_counts[lead.status] = status_counts.get(lead.status, 0) + 1
        if lead.photo_url:
            photo_count += 1

    summary_lines = []
    for status, label in STATUS_LABELS.items():
        count = status_counts.get(status, 0)
        if count > 0:
            summary_lines.append(f"  {label}: {count}")

    summary = "\n".join(summary_lines) if summary_lines else "  No leads yet"

    await callback.message.edit_text(  # type: ignore[union-attr]
        f"📋 *Lead Registry*\n\n"
        f"Total: {len(leads)} leads ({photo_count} with photos)\n\n"
        f"{summary}\n\n"
        f"Tap a lead to view details or update status:",
        parse_mode="Markdown",
        reply_markup=_leads_list_keyboard(leads),
    )
    await callback.answer()
