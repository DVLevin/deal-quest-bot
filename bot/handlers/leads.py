"""Handler for /leads — view and manage prospect lead registry with engagement tracking."""

from __future__ import annotations

import base64
import io
import logging

from aiogram import Bot, F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)

from bot.services.engagement import EngagementService
from bot.states import LeadEngagementState
from bot.storage.models import LeadActivityModel
from bot.storage.repositories import LeadActivityRepo, LeadRegistryRepo, UserRepo
from bot.utils import _sanitize, truncate_message
from bot.utils_tma import add_open_in_app_row

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


def _lead_display_name(lead) -> str:
    """Consistent display name for a lead."""
    return lead.prospect_name or f"Prospect #{lead.id}"


def _leads_list_keyboard(leads: list, page: int = 0, page_size: int = 5) -> InlineKeyboardMarkup:
    """Build paginated lead list keyboard."""
    from datetime import datetime, timezone

    start = page * page_size
    end = start + page_size
    page_leads = leads[start:end]

    now = datetime.now(timezone.utc)

    buttons = []
    for lead in page_leads:
        name = _lead_display_name(lead)
        company = f" @ {lead.prospect_company}" if lead.prospect_company else ""
        status_icon = STATUS_LABELS.get(lead.status, "❓").split(" ")[0]
        photo_icon = "📸" if lead.photo_url else "📝"
        # Show plan indicator
        plan_icon = "📋" if lead.engagement_plan else ""
        # Check if follow-up is overdue
        attention = ""
        if lead.next_followup:
            try:
                followup_dt = datetime.fromisoformat(lead.next_followup.replace("Z", "+00:00"))
                if followup_dt <= now:
                    attention = "❗"
            except (ValueError, TypeError):
                pass
        label = f"{attention}{photo_icon} {status_icon} {plan_icon} {name}{company}"
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


def _lead_detail_keyboard(
    lead_id: int, current_status: str, has_plan: bool = False, has_draft: bool = False,
) -> InlineKeyboardMarkup:
    """Build expanded lead detail keyboard with engagement actions."""
    buttons = []

    # Refresh + Plan row
    top_row = [
        InlineKeyboardButton(text="🔄 Refresh", callback_data=f"lead:view:{lead_id}"),
    ]
    if has_plan:
        top_row.append(InlineKeyboardButton(
            text="📋 View Plan", callback_data=f"lead:plan:{lead_id}"
        ))
    if has_draft:
        top_row.append(InlineKeyboardButton(
            text="📝 View Draft", callback_data=f"lead:draft:{lead_id}"
        ))
    buttons.append(top_row)

    # Engagement actions
    buttons.append([
        InlineKeyboardButton(
            text="📝 Add Update", callback_data=f"lead:context:{lead_id}"
        ),
        InlineKeyboardButton(
            text="🧠 Get Advice", callback_data=f"lead:advice:{lead_id}"
        ),
    ])

    buttons.append([
        InlineKeyboardButton(
            text="💬 Comment on Post", callback_data=f"lead:screenshot:{lead_id}"
        ),
    ])

    # Status progression options
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

    # Edit + Delete + Back row
    buttons.append([
        InlineKeyboardButton(text="✏️ Edit Info", callback_data=f"lead:edit:{lead_id}"),
        InlineKeyboardButton(text="🗑 Delete", callback_data=f"lead:delete:{lead_id}"),
        InlineKeyboardButton(text="◀️ Back to List", callback_data="lead:back"),
    ])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def _format_lead_detail(lead) -> str:
    """Format lead detail text for display."""
    import json
    from datetime import datetime, timezone

    name = _lead_display_name(lead)
    title = lead.prospect_title or ""
    company = lead.prospect_company or ""
    status_label = STATUS_LABELS.get(lead.status, lead.status)
    photo_line = "📸 Photo saved\n" if lead.photo_url else ""
    date = (lead.created_at or "")[:10]

    text = f"📋 *{_sanitize(name)}*\n"
    if title:
        text += f"{_sanitize(title)}\n"
    if company:
        text += f"🏢 {_sanitize(company)}\n"
    text += (
        f"Status: {status_label}\n"
        f"Date: {date}\n"
        f"{photo_line}"
    )

    # Determine if lead is "fresh" (created < 5 min ago) — enrichment may still be running
    is_fresh = False
    if lead.created_at:
        try:
            created = datetime.fromisoformat(lead.created_at.replace("Z", "+00:00"))
            age_seconds = (datetime.now(timezone.utc) - created).total_seconds()
            is_fresh = age_seconds < 300
        except (ValueError, TypeError):
            pass

    # Show research/plan status indicators
    if lead.web_research:
        text += "🌐 Web research available\n"
    elif is_fresh:
        text += "⏳ Web research generating...\n"
    else:
        text += "— No web research available\n"

    if lead.engagement_plan:
        done = sum(1 for s in lead.engagement_plan if s.get("status") == "done")
        total = len(lead.engagement_plan)
        text += f"📋 Engagement plan: {done}/{total} steps done\n"
    elif is_fresh:
        text += "⏳ Engagement plan generating...\n"
    else:
        text += "— No engagement plan available\n"
    text += "\n"

    # Parse analysis — could be JSON string or plain text
    analysis_raw = lead.prospect_analysis or ""
    if analysis_raw and analysis_raw.strip() not in ("", "{}", "null"):
        try:
            analysis_obj = json.loads(analysis_raw) if analysis_raw.strip().startswith("{") else None
        except (json.JSONDecodeError, TypeError):
            analysis_obj = None

        if analysis_obj and isinstance(analysis_obj, dict) and len(analysis_obj) > 0:
            text += "*Analysis:*\n"
            for key in ("prospect_type", "seniority", "key_concern", "buying_signal", "buying_signal_reason", "company_context", "stage"):
                val = analysis_obj.get(key)
                if val and str(val).strip():
                    label = key.replace("_", " ").title()
                    text += f"  {label}: {_sanitize(str(val))}\n"
            text += "\n"
        elif analysis_raw.strip() not in ("{}", "null"):
            text += f"*Analysis:*\n{_sanitize(analysis_raw[:500])}\n\n"

    # Show a brief strategy summary
    strategy_raw = lead.closing_strategy or ""
    if strategy_raw and strategy_raw.strip() not in ("", "{}", "null"):
        try:
            strategy_obj = json.loads(strategy_raw) if strategy_raw.strip().startswith("{") else None
        except (json.JSONDecodeError, TypeError):
            strategy_obj = None

        if strategy_obj and isinstance(strategy_obj, dict):
            steps = strategy_obj.get("steps", [])
            if steps:
                text += "*Strategy:*\n"
                for i, step in enumerate(steps[:3], 1):
                    principle = _sanitize(str(step.get("principle", "")))
                    if principle:
                        text += f"  {i}. {principle}\n"
                text += "\n"
        elif strategy_raw.strip() not in ("{}", "null"):
            text += f"*Strategy:*\n{_sanitize(strategy_raw[:400])}\n\n"

    # Engagement tactics (from strategist output — the real gold)
    tactics_raw = lead.engagement_tactics or ""
    if tactics_raw and tactics_raw.strip() not in ("", "{}", "null"):
        try:
            tactics_obj = json.loads(tactics_raw) if tactics_raw.strip().startswith("{") else None
        except (json.JSONDecodeError, TypeError):
            tactics_obj = None

        if tactics_obj and isinstance(tactics_obj, dict):
            text += "*Engagement Tactics:*\n"
            actions = tactics_obj.get("linkedin_actions", [])
            if actions and isinstance(actions, list):
                for action in actions[:4]:
                    text += f"  🔘 {_sanitize(str(action))}\n"
            timing = tactics_obj.get("timing", "")
            if timing:
                text += f"  ⏰ {_sanitize(str(timing))}\n"
            comment = tactics_obj.get("comment_suggestion", "")
            if comment:
                text += f'  💬 "{_sanitize(str(comment)[:200])}"\n'
            text += "\n"

    # Draft outreach (truncated preview — full version via button)
    draft_raw = lead.draft_response or ""
    if draft_raw and draft_raw.strip() not in ("", "{}", "null"):
        try:
            draft_obj = json.loads(draft_raw) if draft_raw.strip().startswith("{") else None
        except (json.JSONDecodeError, TypeError):
            draft_obj = None

        if draft_obj and isinstance(draft_obj, dict):
            platform = draft_obj.get("platform", "")
            message_text = draft_obj.get("message", "")
            if message_text:
                platform_label = f" ({platform})" if platform else ""
                preview = _sanitize(str(message_text)[:200])
                text += f"*Draft{platform_label}:*\n{preview}...\n\n"
        elif draft_raw.strip() not in ("{}", "null"):
            text += f"*Draft:*\n{_sanitize(draft_raw[:200])}...\n\n"

    # Web research summary (first 300 chars)
    if lead.web_research:
        text += f"*Web Research:*\n{_sanitize(lead.web_research[:300])}...\n\n"

    if lead.notes:
        text += f"📝 *Notes:* {_sanitize(lead.notes)}\n"

    return text


@router.message(Command("leads"))
async def cmd_leads(message: Message, user_repo: UserRepo, lead_repo: LeadRegistryRepo, tma_url: str = "") -> None:
    """Show the user's lead registry."""
    tg_id = message.from_user.id  # type: ignore[union-attr]

    user = await user_repo.get_by_telegram_id(tg_id)
    if not user:
        await message.answer("Please run /start first.")
        return

    leads = await lead_repo.get_for_user(tg_id, limit=50)

    if not leads:
        keyboard = add_open_in_app_row(None, tma_url, "leads")
        await message.answer(
            "📋 *Lead Registry*\n\n"
            "No leads yet. Use /support to analyze a prospect — "
            "every analysis is automatically saved here.\n\n"
            "Send a photo or text description of a prospect to get started.",
            parse_mode="Markdown",
            reply_markup=keyboard,
        )
        return

    # Count by status
    status_counts: dict[str, int] = {}
    photo_count = 0
    enriched_count = 0
    for lead in leads:
        status_counts[lead.status] = status_counts.get(lead.status, 0) + 1
        if lead.photo_url:
            photo_count += 1
        if lead.engagement_plan:
            enriched_count += 1

    summary_lines = []
    for status, label in STATUS_LABELS.items():
        count = status_counts.get(status, 0)
        if count > 0:
            summary_lines.append(f"  {label}: {count}")

    summary = "\n".join(summary_lines) if summary_lines else "  No leads yet"

    kb = _leads_list_keyboard(leads)
    kb = add_open_in_app_row(kb, tma_url, "leads")
    await message.answer(
        f"📋 *Lead Registry*\n\n"
        f"Total: {len(leads)} leads ({photo_count} with photos, {enriched_count} with plans)\n\n"
        f"{summary}\n\n"
        f"Tap a lead to view details, manage plan, or get AI advice:",
        parse_mode="Markdown",
        reply_markup=kb,
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

    text = _format_lead_detail(lead)
    has_plan = bool(lead.engagement_plan)
    has_draft = bool(
        lead.draft_response
        and lead.draft_response.strip() not in ("", "{}", "null")
    )

    await callback.message.edit_text(  # type: ignore[union-attr]
        truncate_message(text),
        parse_mode="Markdown",
        reply_markup=_lead_detail_keyboard(lead_id, lead.status, has_plan, has_draft),
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
        text = _format_lead_detail(lead)
        has_plan = bool(lead.engagement_plan)
        has_draft = bool(
            lead.draft_response
            and lead.draft_response.strip() not in ("", "{}", "null")
        )

        await callback.message.edit_text(  # type: ignore[union-attr]
            truncate_message(text),
            parse_mode="Markdown",
            reply_markup=_lead_detail_keyboard(lead_id, new_status, has_plan, has_draft),
            disable_web_page_preview=True,
        )


# ─── Engagement Plan View ─────────────────────────────────────────

@router.callback_query(F.data.startswith("lead:plan:"))
async def on_lead_plan(
    callback: CallbackQuery, lead_repo: LeadRegistryRepo
) -> None:
    """Show engagement plan steps with completion status."""
    lead_id = int(callback.data.split(":")[2])  # type: ignore[union-attr]

    lead = await lead_repo.get_by_id(lead_id)
    if not lead:
        await callback.answer("Lead not found.")
        return

    if not lead.engagement_plan:
        await callback.answer("No engagement plan yet. It's being generated...")
        return

    name = _sanitize(_lead_display_name(lead))
    text = f"📋 *Engagement Plan — {name}*\n\n"

    for step in lead.engagement_plan:
        step_id = step.get("step_id", 0)
        status = step.get("status", "pending")
        icon = "✅" if status == "done" else "⬜"
        desc = _sanitize(str(step.get("description", "")))
        timing = step.get("timing", "")
        suggested = step.get("suggested_text", "")

        text += f"{icon} *Step {step_id}* ({timing})\n"
        text += f"   {desc}\n"
        if suggested:
            text += f'   💬 "{_sanitize(str(suggested)[:150])}"\n'
        text += "\n"

    # Build step toggle buttons (2 per row)
    buttons = []
    row = []
    for step in lead.engagement_plan:
        step_id = step.get("step_id", 0)
        status = step.get("status", "pending")
        icon = "✅" if status == "done" else "⬜"
        row.append(InlineKeyboardButton(
            text=f"{icon} Step {step_id}",
            callback_data=f"lead:step:{lead_id}:{step_id}",
        ))
        if len(row) == 3:
            buttons.append(row)
            row = []
    if row:
        buttons.append(row)

    buttons.append([InlineKeyboardButton(
        text="◀️ Back to Lead", callback_data=f"lead:view:{lead_id}"
    )])

    await callback.message.edit_text(  # type: ignore[union-attr]
        truncate_message(text),
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons),
    )
    await callback.answer()


@router.callback_query(F.data.startswith("lead:step:"))
async def on_lead_step_toggle(
    callback: CallbackQuery, lead_repo: LeadRegistryRepo
) -> None:
    """Toggle a plan step between pending and done."""
    parts = callback.data.split(":")  # type: ignore[union-attr]
    lead_id = int(parts[2])
    step_id = int(parts[3])

    lead = await lead_repo.get_by_id(lead_id)
    if not lead or not lead.engagement_plan:
        await callback.answer("Lead or plan not found.")
        return

    # Toggle the step
    updated_plan = []
    toggled_status = "pending"
    for step in lead.engagement_plan:
        if step.get("step_id") == step_id:
            new_status = "done" if step.get("status") != "done" else "pending"
            step["status"] = new_status
            step["completed_at"] = None if new_status == "pending" else "now"
            toggled_status = new_status
        updated_plan.append(step)

    await lead_repo.update_lead(lead_id, engagement_plan=updated_plan)
    await callback.answer(f"Step {step_id}: {toggled_status}")

    # Refresh plan view by re-triggering the plan display
    # Reconstruct the display
    lead.engagement_plan = updated_plan
    name = _sanitize(_lead_display_name(lead))
    text = f"📋 *Engagement Plan — {name}*\n\n"

    for step in updated_plan:
        sid = step.get("step_id", 0)
        status = step.get("status", "pending")
        icon = "✅" if status == "done" else "⬜"
        desc = _sanitize(str(step.get("description", "")))
        timing = step.get("timing", "")
        suggested = step.get("suggested_text", "")

        text += f"{icon} *Step {sid}* ({timing})\n"
        text += f"   {desc}\n"
        if suggested:
            text += f'   💬 "{_sanitize(str(suggested)[:150])}"\n'
        text += "\n"

    buttons = []
    row = []
    for step in updated_plan:
        sid = step.get("step_id", 0)
        status = step.get("status", "pending")
        icon = "✅" if status == "done" else "⬜"
        row.append(InlineKeyboardButton(
            text=f"{icon} Step {sid}",
            callback_data=f"lead:step:{lead_id}:{sid}",
        ))
        if len(row) == 3:
            buttons.append(row)
            row = []
    if row:
        buttons.append(row)

    buttons.append([InlineKeyboardButton(
        text="◀️ Back to Lead", callback_data=f"lead:view:{lead_id}"
    )])

    await callback.message.edit_text(  # type: ignore[union-attr]
        truncate_message(text),
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons),
    )


# ─── View Full Draft Message ──────────────────────────────────────

@router.callback_query(F.data.startswith("lead:draft:"))
async def on_lead_draft(
    callback: CallbackQuery, lead_repo: LeadRegistryRepo
) -> None:
    """Show the full draft outreach message stored from strategist output."""
    import json

    lead_id = int(callback.data.split(":")[2])  # type: ignore[union-attr]

    lead = await lead_repo.get_by_id(lead_id)
    if not lead:
        await callback.answer("Lead not found.")
        return

    draft_raw = lead.draft_response or ""
    if not draft_raw or draft_raw.strip() in ("", "{}", "null"):
        await callback.answer("No draft available for this lead.")
        return

    name = _sanitize(_lead_display_name(lead))

    try:
        draft_obj = json.loads(draft_raw) if draft_raw.strip().startswith("{") else None
    except (json.JSONDecodeError, TypeError):
        draft_obj = None

    if draft_obj and isinstance(draft_obj, dict):
        platform = draft_obj.get("platform", "")
        message_text = draft_obj.get("message", "")
        hook = draft_obj.get("hook", "")
        cta = draft_obj.get("cta", "")

        text = f"📝 *Draft Outreach — {name}*\n"
        if platform:
            text += f"Platform: {_sanitize(platform)}\n"
        text += "\n"
        if hook:
            text += f"*Hook:* {_sanitize(str(hook))}\n\n"
        if message_text:
            text += f"*Message:*\n{_sanitize(str(message_text))}\n\n"
        if cta:
            text += f"*CTA:* {_sanitize(str(cta))}\n"
    else:
        text = f"📝 *Draft Outreach — {name}*\n\n{_sanitize(draft_raw)}"

    await callback.message.edit_text(  # type: ignore[union-attr]
        truncate_message(text),
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="◀️ Back to Lead", callback_data=f"lead:view:{lead_id}")]
        ]),
    )
    await callback.answer()


# ─── Add Context (Text Update) ────────────────────────────────────

@router.callback_query(F.data.startswith("lead:context:"))
async def on_lead_context_start(
    callback: CallbackQuery, state: FSMContext
) -> None:
    """Enter context-adding mode for a lead."""
    lead_id = int(callback.data.split(":")[2])  # type: ignore[union-attr]

    await state.set_state(LeadEngagementState.adding_context)
    await state.update_data(active_lead_id=lead_id)

    await callback.message.edit_text(  # type: ignore[union-attr]
        "📝 *Add Update*\n\n"
        "Type your update about this lead. For example:\n"
        "- They accepted my connection request\n"
        "- Had a call, they're interested in X\n"
        "- They went cold, no response in 2 weeks\n\n"
        "I'll save it and give you AI-powered advice.\n\n"
        "_Send /cancel to go back._",
        parse_mode="Markdown",
    )
    await callback.answer()


@router.message(LeadEngagementState.adding_context, F.text)
async def on_lead_context_text(
    message: Message,
    state: FSMContext,
    lead_repo: LeadRegistryRepo,
    activity_repo: LeadActivityRepo,
    engagement_service: EngagementService | None = None,
) -> None:
    """Process text context update for a lead."""
    text = message.text or ""
    if text.strip().lower() == "/cancel":
        await state.clear()
        await message.answer("Cancelled. Use /leads to go back.")
        return

    data = await state.get_data()
    lead_id = data.get("active_lead_id")
    if not lead_id:
        await state.clear()
        await message.answer("No active lead. Use /leads to select one.")
        return

    tg_id = message.from_user.id  # type: ignore[union-attr]
    lead = await lead_repo.get_by_id(lead_id)
    if not lead:
        await state.clear()
        await message.answer("Lead not found. Use /leads to select one.")
        return

    status_msg = await message.answer("💾 Saving update and generating advice...")

    # Save activity
    ai_response = ""
    if engagement_service:
        activities = await activity_repo.get_for_lead(lead_id, limit=10)
        ai_response = await engagement_service.generate_advice(
            lead, activities, text, lead.web_research
        )

    await activity_repo.create(
        LeadActivityModel(
            lead_id=lead_id,
            telegram_id=tg_id,
            activity_type="context_update",
            content=text[:2000],
            ai_response=ai_response[:3000] if ai_response else None,
        )
    )

    # Format response
    response = f"✅ *Update saved for {_sanitize(_lead_display_name(lead))}*\n\n"
    if ai_response:
        response += f"🧠 *AI Advice:*\n{_sanitize(ai_response)}"
    else:
        response += "Update saved. AI advice is not available right now."

    await status_msg.edit_text(truncate_message(response), parse_mode="Markdown")
    await state.clear()


# ─── Screenshot Comment Generation ────────────────────────────────

@router.callback_query(F.data.startswith("lead:screenshot:"))
async def on_lead_screenshot_start(
    callback: CallbackQuery, state: FSMContext
) -> None:
    """Enter screenshot mode for comment generation."""
    lead_id = int(callback.data.split(":")[2])  # type: ignore[union-attr]

    await state.set_state(LeadEngagementState.sending_screenshot)
    await state.update_data(active_lead_id=lead_id)

    await callback.message.edit_text(  # type: ignore[union-attr]
        "💬 *Comment on Post*\n\n"
        "Send me a screenshot of their LinkedIn post, and I'll generate "
        "engaging comment options for you.\n\n"
        "_Send /cancel to go back._",
        parse_mode="Markdown",
    )
    await callback.answer()


@router.message(LeadEngagementState.sending_screenshot, F.photo)
async def on_lead_screenshot_photo(
    message: Message,
    state: FSMContext,
    bot: Bot,
    lead_repo: LeadRegistryRepo,
    activity_repo: LeadActivityRepo,
    engagement_service: EngagementService | None = None,
) -> None:
    """Process screenshot and generate comment options."""
    data = await state.get_data()
    lead_id = data.get("active_lead_id")
    if not lead_id:
        await state.clear()
        await message.answer("No active lead. Use /leads to select one.")
        return

    tg_id = message.from_user.id  # type: ignore[union-attr]
    lead = await lead_repo.get_by_id(lead_id)
    if not lead:
        await state.clear()
        await message.answer("Lead not found.")
        return

    status_msg = await message.answer("📸 Analyzing post and generating comments...")

    # Download photo
    photo = message.photo[-1]  # type: ignore[index]
    file = await bot.get_file(photo.file_id)
    file_bytes_io = io.BytesIO()
    await bot.download_file(file.file_path, file_bytes_io)  # type: ignore[arg-type]
    photo_b64 = base64.b64encode(file_bytes_io.getvalue()).decode("ascii")

    comment_text = ""
    if engagement_service:
        comment_text = await engagement_service.generate_comment(
            lead, photo_b64, lead.web_research
        )

    # Save activity
    await activity_repo.create(
        LeadActivityModel(
            lead_id=lead_id,
            telegram_id=tg_id,
            activity_type="screenshot_comment",
            content="[Screenshot analyzed for comment generation]",
            ai_response=comment_text[:3000] if comment_text else None,
        )
    )

    response = f"💬 *Comment Options for {_sanitize(_lead_display_name(lead))}:*\n\n"
    if comment_text:
        response += _sanitize(comment_text)
    else:
        response += "Comment generation is not available right now."

    await status_msg.edit_text(truncate_message(response), parse_mode="Markdown")
    await state.clear()


@router.message(LeadEngagementState.sending_screenshot, F.text)
async def on_lead_screenshot_cancel(
    message: Message, state: FSMContext
) -> None:
    """Handle text in screenshot mode (probably /cancel)."""
    text = message.text or ""
    if text.strip().lower() == "/cancel":
        await state.clear()
        await message.answer("Cancelled. Use /leads to go back.")
    else:
        await message.answer("Please send a screenshot image, or /cancel to go back.")


# ─── Get AI Advice ─────────────────────────────────────────────────

@router.callback_query(F.data.startswith("lead:advice:"))
async def on_lead_advice(
    callback: CallbackQuery,
    lead_repo: LeadRegistryRepo,
    activity_repo: LeadActivityRepo,
    engagement_service: EngagementService | None = None,
) -> None:
    """Generate refreshed AI advice for a lead based on all context."""
    lead_id = int(callback.data.split(":")[2])  # type: ignore[union-attr]

    lead = await lead_repo.get_by_id(lead_id)
    if not lead:
        await callback.answer("Lead not found.")
        return

    await callback.answer("🧠 Generating advice...")

    if not engagement_service:
        await callback.message.edit_text(  # type: ignore[union-attr]
            "🧠 AI advice is not available right now.\n\n"
            "Make sure the shared OpenRouter API key is configured.",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="◀️ Back", callback_data=f"lead:view:{lead_id}")]
            ]),
        )
        return

    tg_id = callback.from_user.id
    activities = await activity_repo.get_for_lead(lead_id, limit=10)

    advice = await engagement_service.generate_advice(
        lead, activities, "Give me a fresh assessment and next steps.", lead.web_research
    )

    # Save as activity
    await activity_repo.create(
        LeadActivityModel(
            lead_id=lead_id,
            telegram_id=tg_id,
            activity_type="ai_advice",
            content="Requested fresh advice",
            ai_response=advice[:3000] if advice else None,
        )
    )

    name = _sanitize(_lead_display_name(lead))
    text = f"🧠 *AI Advice — {name}*\n\n{_sanitize(advice)}"

    await callback.message.edit_text(  # type: ignore[union-attr]
        truncate_message(text),
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="◀️ Back to Lead", callback_data=f"lead:view:{lead_id}")]
        ]),
    )


# ─── Delete Lead ───────────────────────────────────────────────────

@router.callback_query(F.data.startswith("lead:delete:"))
async def on_lead_delete_confirm(
    callback: CallbackQuery, lead_repo: LeadRegistryRepo
) -> None:
    """Show delete confirmation for a lead."""
    lead_id = int(callback.data.split(":")[2])  # type: ignore[union-attr]

    lead = await lead_repo.get_by_id(lead_id)
    if not lead:
        await callback.answer("Lead not found.")
        return

    name = _sanitize(_lead_display_name(lead))
    await callback.message.edit_text(  # type: ignore[union-attr]
        f"🗑 *Delete Lead*\n\n"
        f"Are you sure you want to permanently delete *{name}*?\n\n"
        f"This will remove the lead, its research, engagement plan, "
        f"and all activity history. This cannot be undone.",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🗑 Yes, Delete", callback_data=f"lead:confirm_delete:{lead_id}"
                ),
                InlineKeyboardButton(
                    text="◀️ Cancel", callback_data=f"lead:view:{lead_id}"
                ),
            ],
        ]),
    )
    await callback.answer()


@router.callback_query(F.data.startswith("lead:confirm_delete:"))
async def on_lead_delete_execute(
    callback: CallbackQuery, lead_repo: LeadRegistryRepo
) -> None:
    """Permanently delete a lead."""
    lead_id = int(callback.data.split(":")[2])  # type: ignore[union-attr]

    lead = await lead_repo.get_by_id(lead_id)
    if not lead:
        await callback.answer("Lead already deleted.")
        return

    name = _lead_display_name(lead)

    try:
        await lead_repo.delete_lead(lead_id)
        await callback.message.edit_text(  # type: ignore[union-attr]
            f"✅ *{_sanitize(name)}* has been deleted.\n\n"
            f"Use /leads to see your remaining pipeline.",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="📋 Back to Leads", callback_data="lead:back")],
            ]),
        )
    except Exception as e:
        logger.error("Failed to delete lead %s: %s", lead_id, e)
        await callback.message.edit_text(  # type: ignore[union-attr]
            f"❌ Failed to delete lead: {str(e)[:100]}",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="◀️ Back", callback_data=f"lead:view:{lead_id}")],
            ]),
        )
    await callback.answer()


# ─── Edit Lead Info ────────────────────────────────────────────────

@router.callback_query(F.data.startswith("lead:edit:"))
async def on_lead_edit_start(
    callback: CallbackQuery, state: FSMContext, lead_repo: LeadRegistryRepo
) -> None:
    """Enter edit mode for a lead's basic info."""
    lead_id = int(callback.data.split(":")[2])  # type: ignore[union-attr]

    lead = await lead_repo.get_by_id(lead_id)
    if not lead:
        await callback.answer("Lead not found.")
        return

    await state.set_state(LeadEngagementState.editing_lead)
    await state.update_data(active_lead_id=lead_id)

    current_name = lead.prospect_name or "(not set)"
    current_company = lead.prospect_company or "(not set)"
    current_title = lead.prospect_title or "(not set)"

    await callback.message.edit_text(  # type: ignore[union-attr]
        f"✏️ *Edit Lead Info*\n\n"
        f"Current:\n"
        f"  Name: {_sanitize(current_name)}\n"
        f"  Company: {_sanitize(current_company)}\n"
        f"  Title: {_sanitize(current_title)}\n\n"
        f"Send updates in this format (one or more lines):\n"
        f"`Name: John Smith`\n"
        f"`Company: Acme Corp`\n"
        f"`Title: VP of Sales`\n\n"
        f"_Send /cancel to go back._",
        parse_mode="Markdown",
    )
    await callback.answer()


@router.message(LeadEngagementState.editing_lead, F.text)
async def on_lead_edit_text(
    message: Message,
    state: FSMContext,
    lead_repo: LeadRegistryRepo,
) -> None:
    """Parse edit input and update lead fields."""
    text = message.text or ""
    if text.strip().lower() == "/cancel":
        await state.clear()
        await message.answer("Edit cancelled. Use /leads to go back.")
        return

    data = await state.get_data()
    lead_id = data.get("active_lead_id")
    if not lead_id:
        await state.clear()
        await message.answer("No active lead. Use /leads to select one.")
        return

    lead = await lead_repo.get_by_id(lead_id)
    if not lead:
        await state.clear()
        await message.answer("Lead not found. Use /leads to select one.")
        return

    # Parse "Field: Value" lines
    updates: dict[str, str] = {}
    for line in text.strip().split("\n"):
        line = line.strip()
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip().lower()
        value = value.strip()
        if not value:
            continue

        if key == "name":
            updates["prospect_name"] = value
        elif key == "company":
            updates["prospect_company"] = value
        elif key == "title":
            updates["prospect_title"] = value

    if not updates:
        await message.answer(
            "No valid fields found. Use format:\n"
            "`Name: John Smith`\n"
            "`Company: Acme Corp`\n"
            "`Title: VP of Sales`",
            parse_mode="Markdown",
        )
        return

    await lead_repo.update_lead(lead_id, **updates)

    updated_fields = ", ".join(f"{k.replace('prospect_', '')}: {v}" for k, v in updates.items())
    await message.answer(
        f"✅ Lead updated: {updated_fields}\n\n"
        f"Use /leads to view the updated lead.",
    )
    await state.clear()


# ─── Back to List ──────────────────────────────────────────────────

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
    enriched_count = 0
    for lead in leads:
        status_counts[lead.status] = status_counts.get(lead.status, 0) + 1
        if lead.photo_url:
            photo_count += 1
        if lead.engagement_plan:
            enriched_count += 1

    summary_lines = []
    for status, label in STATUS_LABELS.items():
        count = status_counts.get(status, 0)
        if count > 0:
            summary_lines.append(f"  {label}: {count}")

    summary = "\n".join(summary_lines) if summary_lines else "  No leads yet"

    await callback.message.edit_text(  # type: ignore[union-attr]
        f"📋 *Lead Registry*\n\n"
        f"Total: {len(leads)} leads ({photo_count} with photos, {enriched_count} with plans)\n\n"
        f"{summary}\n\n"
        f"Tap a lead to view details, manage plan, or get AI advice:",
        parse_mode="Markdown",
        reply_markup=_leads_list_keyboard(leads),
    )
    await callback.answer()
