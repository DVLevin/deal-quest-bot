"""Handler for collecting context input on leads for re-analysis."""

from __future__ import annotations

import base64
import io
import json
import logging

from aiogram import Bot, F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)

from bot.agents.base import AgentInput
from bot.agents.reanalysis_strategist import ReanalysisStrategistAgent
from bot.config import settings
from bot.services.knowledge import get_knowledge_base
from bot.services.llm_router import get_llm_for_user
from bot.services.transcription import TranscriptionService
from bot.states import ReanalysisState
from bot.storage.insforge_client import InsForgeClient
from bot.storage.models import LeadActivityModel
from bot.storage.repositories import (
    LeadActivityRepo,
    LeadAnalysisHistoryRepo,
    LeadRegistryRepo,
    ScheduledReminderRepo,
    UserMemoryRepo,
    UserRepo,
)
from bot.utils import _sanitize, truncate_message

logger = logging.getLogger(__name__)

router = Router(name="context_input")


def _lead_display_name(lead) -> str:
    """Consistent display name for a lead."""
    if lead.prospect_first_name and lead.prospect_last_name:
        return f"{lead.prospect_first_name} {lead.prospect_last_name}"
    if lead.prospect_first_name:
        return lead.prospect_first_name
    return lead.prospect_name or f"Prospect #{lead.id}"


def _reanalyze_keyboard(lead_id: int) -> InlineKeyboardMarkup:
    """Keyboard with Re-analyze Strategy? button."""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="Re-analyze Strategy?",
                callback_data=f"reanalyze:start:{lead_id}",
            ),
        ],
        [
            InlineKeyboardButton(
                text="Add More Context",
                callback_data=f"context:add:{lead_id}",
            ),
        ],
        [
            InlineKeyboardButton(
                text="View Lead",
                callback_data=f"lead:view:{lead_id}",
            ),
        ],
    ])


# --- Entry Points ---

@router.callback_query(F.data.startswith("context:add:"))
async def on_context_add_start(
    callback: CallbackQuery,
    state: FSMContext,
    lead_repo: LeadRegistryRepo,
) -> None:
    """Start context collection from /leads menu button or after adding context."""
    lead_id = int(callback.data.split(":")[2])  # type: ignore[union-attr]

    lead = await lead_repo.get_by_id(lead_id)
    if not lead:
        await callback.answer("Lead not found.")
        return

    await state.set_state(ReanalysisState.collecting_context)
    await state.update_data(context_lead_id=lead_id, context_items=[])

    name = _sanitize(_lead_display_name(lead))
    await callback.message.edit_text(  # type: ignore[union-attr]
        f"*Add Context -- {name}*\n\n"
        "Send me any updates about this lead:\n\n"
        "  *Text* -- Type your notes or updates\n"
        "  *Forward* -- Forward a prospect's message\n"
        "  *Voice* -- Record a voice note (I'll transcribe it)\n"
        "  *Photo* -- Screenshot of conversation or email\n\n"
        "When done, tap *Done* below, or I'll offer to re-analyze after each input.\n\n"
        "_Send /cancel to go back._",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="Done Adding Context", callback_data=f"context:done:{lead_id}")],
            [InlineKeyboardButton(text="Back to Lead", callback_data=f"lead:view:{lead_id}")],
        ]),
    )
    await callback.answer()


@router.callback_query(F.data.startswith("reminder:addcontext:"))
async def on_reminder_add_context(
    callback: CallbackQuery,
    state: FSMContext,
    lead_repo: LeadRegistryRepo,
) -> None:
    """Start context collection from reminder message (reply to reminder)."""
    parts = callback.data.split(":")  # type: ignore[union-attr]
    lead_id = int(parts[2])

    lead = await lead_repo.get_by_id(lead_id)
    if not lead:
        await callback.answer("Lead not found.")
        return

    await state.set_state(ReanalysisState.collecting_context)
    await state.update_data(context_lead_id=lead_id, context_items=[])

    name = _sanitize(_lead_display_name(lead))
    await callback.message.reply(  # type: ignore[union-attr]
        f"*Add Context -- {name}*\n\n"
        "Reply here with updates about this lead:\n\n"
        "  Forward the prospect's reply\n"
        "  Type meeting notes\n"
        "  Send a voice note\n"
        "  Share a screenshot\n\n"
        "_Send /cancel to go back._",
        parse_mode="Markdown",
    )
    await callback.answer("Ready for context input")


# --- Context Input Handlers ---

@router.message(ReanalysisState.collecting_context, F.text)
async def on_context_text(
    message: Message,
    state: FSMContext,
    lead_repo: LeadRegistryRepo,
    activity_repo: LeadActivityRepo,
) -> None:
    """Handle text context input."""
    text = message.text or ""

    if text.strip().lower() == "/cancel":
        await state.clear()
        await message.answer("Cancelled. Use /leads to go back.")
        return

    data = await state.get_data()
    lead_id = data.get("context_lead_id")
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

    # Determine activity type based on content
    activity_type = "context_update"
    # Heuristic: if text looks like a prospect response or user explicitly says so
    lower_text = text.lower()
    if any(phrase in lower_text for phrase in ["they said", "they replied", "prospect said", "their response", "they wrote"]):
        activity_type = "prospect_response"
    elif any(phrase in lower_text for phrase in ["meeting notes", "call notes", "had a call", "met with", "after the meeting"]):
        activity_type = "meeting_notes"

    # Save activity
    activity = await activity_repo.create(
        LeadActivityModel(
            lead_id=lead_id,
            telegram_id=tg_id,
            activity_type=activity_type,
            content=text[:3000],
            metadata={"input_type": "text"},
        )
    )

    # Track context items in state
    context_items = data.get("context_items", [])
    context_items.append({"type": activity_type, "activity_id": activity.id})
    await state.update_data(context_items=context_items)

    name = _sanitize(_lead_display_name(lead))
    type_label = "Prospect response" if activity_type == "prospect_response" else (
        "Meeting notes" if activity_type == "meeting_notes" else "Context"
    )
    await message.answer(
        f"*{type_label} saved for {name}*\n\n"
        f"You can add more context, or tap below to re-analyze the strategy.",
        parse_mode="Markdown",
        reply_markup=_reanalyze_keyboard(lead_id),
    )


@router.message(ReanalysisState.collecting_context, F.voice)
async def on_context_voice(
    message: Message,
    state: FSMContext,
    bot: Bot,
    lead_repo: LeadRegistryRepo,
    activity_repo: LeadActivityRepo,
    transcription: TranscriptionService | None = None,
) -> None:
    """Handle voice note context input (transcribe and save)."""
    data = await state.get_data()
    lead_id = data.get("context_lead_id")
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

    status_msg = await message.answer("Transcribing voice note...")

    # Download voice file
    voice = message.voice
    if not voice:
        await status_msg.edit_text("Could not process voice note.")
        return

    file = await bot.get_file(voice.file_id)
    file_bytes_io = io.BytesIO()
    await bot.download_file(file.file_path, file_bytes_io)  # type: ignore[arg-type]
    audio_bytes = file_bytes_io.getvalue()

    # Transcribe
    if not transcription or not transcription.api_key:
        await status_msg.edit_text(
            "Voice transcription not configured. Please type your notes instead."
        )
        return

    try:
        transcript = await transcription.transcribe(audio_bytes)
    except Exception as e:
        logger.error("Voice transcription failed: %s", e)
        await status_msg.edit_text(f"Transcription failed: {str(e)[:100]}")
        return

    if not transcript or not transcript.strip():
        await status_msg.edit_text("Could not transcribe voice note. Please try again or type instead.")
        return

    # Save activity as meeting_notes (voice notes are typically meeting notes)
    activity = await activity_repo.create(
        LeadActivityModel(
            lead_id=lead_id,
            telegram_id=tg_id,
            activity_type="meeting_notes",
            content=transcript[:3000],
            metadata={"input_type": "voice", "duration_seconds": voice.duration},
        )
    )

    # Track context items
    context_items = data.get("context_items", [])
    context_items.append({"type": "meeting_notes", "activity_id": activity.id})
    await state.update_data(context_items=context_items)

    name = _sanitize(_lead_display_name(lead))
    preview = _sanitize(transcript[:200])
    if len(transcript) > 200:
        preview += "..."
    await status_msg.edit_text(
        f"*Voice note transcribed and saved for {name}*\n\n"
        f"_\"{preview}\"_\n\n"
        f"You can add more context, or tap below to re-analyze the strategy.",
        parse_mode="Markdown",
        reply_markup=_reanalyze_keyboard(lead_id),
    )


@router.message(ReanalysisState.collecting_context, F.photo)
async def on_context_photo(
    message: Message,
    state: FSMContext,
    bot: Bot,
    lead_repo: LeadRegistryRepo,
    activity_repo: LeadActivityRepo,
) -> None:
    """Handle photo/screenshot context input."""
    data = await state.get_data()
    lead_id = data.get("context_lead_id")
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

    # Download photo
    photo = message.photo[-1] if message.photo else None  # type: ignore[index]
    if not photo:
        await message.answer("Could not process photo.")
        return

    file = await bot.get_file(photo.file_id)
    file_bytes_io = io.BytesIO()
    await bot.download_file(file.file_path, file_bytes_io)  # type: ignore[arg-type]
    photo_b64 = base64.b64encode(file_bytes_io.getvalue()).decode("ascii")

    # Save activity with caption as content
    caption = message.caption or "[Screenshot/photo context]"

    activity = await activity_repo.create(
        LeadActivityModel(
            lead_id=lead_id,
            telegram_id=tg_id,
            activity_type="prospect_response",  # Photos are typically prospect responses
            content=caption[:3000],
            metadata={
                "input_type": "photo",
                "photo_b64_preview": photo_b64[:100] + "...",  # Just store indicator, not full image
                "has_image": True,
            },
        )
    )

    # Track context items
    context_items = data.get("context_items", [])
    context_items.append({"type": "prospect_response", "activity_id": activity.id, "has_image": True})
    await state.update_data(context_items=context_items, latest_photo_b64=photo_b64)

    name = _sanitize(_lead_display_name(lead))
    await message.answer(
        f"*Screenshot saved for {name}*\n\n"
        f"Caption: _{_sanitize(caption[:100])}_\n\n"
        f"You can add more context, or tap below to re-analyze the strategy.",
        parse_mode="Markdown",
        reply_markup=_reanalyze_keyboard(lead_id),
    )


@router.message(ReanalysisState.collecting_context, F.forward_date)
async def on_context_forward(
    message: Message,
    state: FSMContext,
    lead_repo: LeadRegistryRepo,
    activity_repo: LeadActivityRepo,
) -> None:
    """Handle forwarded message context input."""
    data = await state.get_data()
    lead_id = data.get("context_lead_id")
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

    # Extract forwarded content
    forward_text = message.text or message.caption or "[Forwarded message without text]"
    forward_from = None
    if message.forward_from:
        fn = message.forward_from.first_name or ""
        ln = message.forward_from.last_name or ""
        forward_from = f"{fn} {ln}".strip() or message.forward_from.username
    elif message.forward_sender_name:
        forward_from = message.forward_sender_name

    content = forward_text
    if forward_from:
        content = f"[Forwarded from {forward_from}]\n\n{forward_text}"

    # Save as prospect_response (forwarded messages are typically prospect responses)
    activity = await activity_repo.create(
        LeadActivityModel(
            lead_id=lead_id,
            telegram_id=tg_id,
            activity_type="prospect_response",
            content=content[:3000],
            metadata={
                "input_type": "forward",
                "forward_from": forward_from,
                "forward_date": message.forward_date.isoformat() if message.forward_date else None,
            },
        )
    )

    # Track context items
    context_items = data.get("context_items", [])
    context_items.append({"type": "prospect_response", "activity_id": activity.id})
    await state.update_data(context_items=context_items)

    name = _sanitize(_lead_display_name(lead))
    from_label = f" from {_sanitize(forward_from)}" if forward_from else ""
    await message.answer(
        f"*Forwarded message{from_label} saved for {name}*\n\n"
        f"You can add more context, or tap below to re-analyze the strategy.",
        parse_mode="Markdown",
        reply_markup=_reanalyze_keyboard(lead_id),
    )


# --- Done / Cancel ---

@router.callback_query(F.data.startswith("context:done:"))
async def on_context_done(
    callback: CallbackQuery,
    state: FSMContext,
    lead_repo: LeadRegistryRepo,
) -> None:
    """Finish context collection, show re-analyze prompt."""
    lead_id = int(callback.data.split(":")[2])  # type: ignore[union-attr]

    data = await state.get_data()
    context_items = data.get("context_items", [])

    lead = await lead_repo.get_by_id(lead_id)
    if not lead:
        await callback.answer("Lead not found.")
        await state.clear()
        return

    name = _sanitize(_lead_display_name(lead))
    count = len(context_items)

    if count == 0:
        await callback.message.edit_text(  # type: ignore[union-attr]
            f"No context was added for *{name}*.\n\n"
            "Use /leads to view your pipeline.",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="View Lead", callback_data=f"lead:view:{lead_id}")],
            ]),
        )
        await state.clear()
        await callback.answer()
        return

    # Show re-analyze prompt
    await state.set_state(ReanalysisState.confirming_reanalysis)
    await callback.message.edit_text(  # type: ignore[union-attr]
        f"*{count} context item(s) added for {name}*\n\n"
        f"Would you like me to re-analyze the strategy with this new context?\n\n"
        f"The re-analysis will consider all the new information and update "
        f"the prospect analysis, closing strategy, and engagement tactics.",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Re-analyze Strategy",
                    callback_data=f"reanalyze:start:{lead_id}",
                ),
            ],
            [
                InlineKeyboardButton(
                    text="Skip for Now",
                    callback_data=f"reanalyze:skip:{lead_id}",
                ),
            ],
        ]),
    )
    await callback.answer()


@router.callback_query(F.data.startswith("reanalyze:skip:"))
async def on_reanalyze_skip(
    callback: CallbackQuery,
    state: FSMContext,
    lead_repo: LeadRegistryRepo,
) -> None:
    """Skip re-analysis, mark lead as pending re-analysis."""
    lead_id = int(callback.data.split(":")[2])  # type: ignore[union-attr]

    lead = await lead_repo.get_by_id(lead_id)
    if lead:
        # Mark lead as having pending re-analysis (stored in notes or a flag)
        current_notes = lead.notes or ""
        if "[Pending re-analysis]" not in current_notes:
            new_notes = f"[Pending re-analysis] {current_notes}".strip()
            await lead_repo.update_lead(lead_id, notes=new_notes[:1000])

        name = _sanitize(_lead_display_name(lead))
        await callback.message.edit_text(  # type: ignore[union-attr]
            f"*Re-analysis skipped for {name}*\n\n"
            f"The lead is marked as pending re-analysis. "
            f"You can trigger it later from the lead detail.\n\n"
            f"Use /leads to continue.",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="View Lead", callback_data=f"lead:view:{lead_id}")],
            ]),
        )

    await state.clear()
    await callback.answer()


# ─── Re-analysis Execution ─────────────────────────────────────────

class SimplePipelineCtx:
    """Minimal pipeline context for standalone agent execution."""

    def __init__(self, llm, kb: str, memory: dict) -> None:
        self.llm = llm
        self.knowledge_base = kb
        self.user_memory = memory
        self.image_b64 = None

    def get_result(self, name: str):
        return None


@router.callback_query(F.data.startswith("reanalyze:start:"))
async def on_reanalyze_start(
    callback: CallbackQuery,
    state: FSMContext,
    lead_repo: LeadRegistryRepo,
    activity_repo: LeadActivityRepo,
    user_repo: UserRepo,
    openrouter_api_key: str = "",
) -> None:
    """Execute re-analysis on a lead with accumulated context."""
    lead_id = int(callback.data.split(":")[2])  # type: ignore[union-attr]
    tg_id = callback.from_user.id

    lead = await lead_repo.get_by_id(lead_id)
    if not lead:
        await callback.answer("Lead not found.")
        return

    await callback.answer("Re-analyzing strategy...")

    # Get state data (context items collected)
    data = await state.get_data()
    context_items = data.get("context_items", [])

    # Load recent activities for this lead
    recent_activities = await activity_repo.get_for_lead(lead_id, limit=10)
    new_context_items = [
        {
            "activity_type": a.activity_type,
            "content": a.content,
            "created_at": a.created_at,
            "metadata": a.metadata,
        }
        for a in recent_activities
        if a.activity_type in ("prospect_response", "meeting_notes", "context_update")
    ][:5]  # Last 5 relevant activities

    # Build prior analysis from lead fields
    prior_analysis = {}
    try:
        if lead.prospect_analysis:
            prior_analysis["analysis"] = (
                json.loads(lead.prospect_analysis)
                if lead.prospect_analysis.startswith("{")
                else {"raw": lead.prospect_analysis}
            )
        if lead.closing_strategy:
            prior_analysis["strategy"] = (
                json.loads(lead.closing_strategy)
                if lead.closing_strategy.startswith("{")
                else {"raw": lead.closing_strategy}
            )
        if lead.engagement_tactics:
            prior_analysis["engagement_tactics"] = (
                json.loads(lead.engagement_tactics)
                if lead.engagement_tactics.startswith("{")
                else {"raw": lead.engagement_tactics}
            )
    except (json.JSONDecodeError, TypeError):
        pass

    # Build lead info
    lead_info = {
        "name": _lead_display_name(lead),
        "company": lead.prospect_company,
        "title": lead.prospect_title,
        "geography": lead.prospect_geography,
    }

    # Get LLM and knowledge base
    user = await user_repo.get_by_telegram_id(tg_id)
    llm = await get_llm_for_user(user, openrouter_api_key)
    knowledge_base = await get_knowledge_base()

    # Load user memory
    client = InsForgeClient(settings.insforge_url, settings.insforge_service_key)
    memory_repo = UserMemoryRepo(client)
    user_memory_model = await memory_repo.get(tg_id)
    user_memory = user_memory_model.memory_data if user_memory_model else {}

    pipeline_ctx = SimplePipelineCtx(llm, knowledge_base, user_memory)

    # Run the agent
    agent = ReanalysisStrategistAgent()
    agent_input = AgentInput(
        user_message="Re-analyze this lead with new context",
        context={
            "prior_analysis": prior_analysis,
            "new_context_items": new_context_items,
            "lead_info": lead_info,
        },
    )

    status_msg = await callback.message.reply(  # type: ignore[union-attr]
        "*Re-analyzing strategy...*\n\n"
        "Reviewing new context and updating analysis.",
        parse_mode="Markdown",
    )

    result = await agent.run(agent_input, pipeline_ctx)

    if not result.success:
        await status_msg.edit_text(
            f"Re-analysis failed: {result.error[:200] if result.error else 'Unknown error'}"
        )
        await state.clear()
        return

    # Parse result
    result_data = result.data or {}
    changes_summary = result_data.get("changes_summary", {})
    updated_analysis = result_data.get("updated_analysis", {})
    updated_strategy = result_data.get("updated_strategy", {})
    updated_tactics = result_data.get("updated_engagement_tactics", {})
    updated_draft = result_data.get("updated_draft", {})
    field_diff = result_data.get("field_diff", {})
    recommended_action = result_data.get("recommended_next_action", "")

    # Save to lead_analysis_history
    analysis_snapshot = {
        "analysis": updated_analysis,
        "strategy": updated_strategy,
        "engagement_tactics": updated_tactics,
        "draft": updated_draft,
    }

    headline = changes_summary.get("headline", "Strategy updated") if isinstance(changes_summary, dict) else str(changes_summary)[:100]
    details = changes_summary.get("details", []) if isinstance(changes_summary, dict) else []
    narrative = f"{headline}\n" + "\n".join(f"- {d}" for d in details[:5])

    # Find triggering activity ID (most recent)
    triggering_id = None
    if context_items:
        triggering_id = context_items[-1].get("activity_id")

    # Save history
    history_repo = LeadAnalysisHistoryRepo(client)
    await history_repo.save_version(
        lead_id=lead_id,
        telegram_id=tg_id,
        analysis_snapshot=analysis_snapshot,
        changes_summary=narrative,
        field_diff=field_diff,
        triggered_by="context_update",
        triggering_activity_id=triggering_id,
    )

    # Update lead with new analysis
    updates = {}
    if updated_analysis:
        updates["prospect_analysis"] = json.dumps(updated_analysis)
    if updated_strategy:
        updates["closing_strategy"] = json.dumps(updated_strategy)
    if updated_tactics:
        updates["engagement_tactics"] = json.dumps(updated_tactics)
    if updated_draft:
        updates["draft_response"] = json.dumps(updated_draft)

    # Remove pending re-analysis note
    if lead.notes and "[Pending re-analysis]" in lead.notes:
        updates["notes"] = lead.notes.replace("[Pending re-analysis]", "").strip()

    if updates:
        await lead_repo.update_lead(lead_id, **updates)

    # Log re-analysis activity
    await activity_repo.create(
        LeadActivityModel(
            lead_id=lead_id,
            telegram_id=tg_id,
            activity_type="re_analysis",
            content=narrative[:1000],
            metadata={
                "headline": headline,
                "changes_count": len(details),
                "has_field_diff": bool(field_diff),
            },
        )
    )

    # Format response with changes summary first
    name = _sanitize(_lead_display_name(lead))
    response = f"*Strategy Re-analyzed -- {name}*\n\n"
    response += f"*WHAT CHANGED*\n"
    response += f"_{_sanitize(headline)}_\n\n"

    if details:
        for detail in details[:5]:
            response += f"- {_sanitize(detail)}\n"
        response += "\n"

    if recommended_action:
        response += f"*Next Action:* {_sanitize(recommended_action)}\n\n"

    # Store for plan update decision
    await state.update_data(
        reanalysis_result=result_data,
        reanalysis_lead_id=lead_id,
    )
    await state.set_state(ReanalysisState.updating_plan)

    await status_msg.edit_text(
        truncate_message(response)
        + "\nWould you like me to update the engagement plan based on this new analysis?",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text="Yes, Update Plan",
                        callback_data=f"reanalyze:plan:{lead_id}",
                    ),
                    InlineKeyboardButton(
                        text="No, Keep Current",
                        callback_data=f"reanalyze:noplan:{lead_id}",
                    ),
                ],
                [
                    InlineKeyboardButton(
                        text="View Lead",
                        callback_data=f"lead:view:{lead_id}",
                    ),
                ],
            ]
        ),
    )


@router.callback_query(F.data.startswith("reanalyze:plan:"))
async def on_reanalyze_update_plan(
    callback: CallbackQuery,
    state: FSMContext,
    lead_repo: LeadRegistryRepo,
    reminder_repo: ScheduledReminderRepo | None = None,
) -> None:
    """Regenerate engagement plan after re-analysis."""
    lead_id = int(callback.data.split(":")[2])  # type: ignore[union-attr]

    lead = await lead_repo.get_by_id(lead_id)
    if not lead:
        await callback.answer("Lead not found.")
        await state.clear()
        return

    await callback.answer("Updating engagement plan...")

    # Cancel existing pending reminders
    if reminder_repo:
        await reminder_repo.cancel_pending_for_lead(lead_id)

    # Mark that plan needs regeneration (via notes or a flag)
    current_notes = lead.notes or ""
    if "[Plan update pending]" not in current_notes:
        new_notes = f"[Plan update pending] {current_notes}".strip()
        await lead_repo.update_lead(lead_id, notes=new_notes[:1000])

    name = _sanitize(_lead_display_name(lead))
    await callback.message.edit_text(  # type: ignore[union-attr]
        f"*Engagement plan will be updated for {name}*\n\n"
        f"The old plan has been cleared. A new plan will be generated "
        f"based on the updated analysis.\n\n"
        f"Use /leads to view the lead and check back for the new plan.",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text="View Lead", callback_data=f"lead:view:{lead_id}"
                    )
                ],
            ]
        ),
    )
    await state.clear()


@router.callback_query(F.data.startswith("reanalyze:noplan:"))
async def on_reanalyze_skip_plan(
    callback: CallbackQuery,
    state: FSMContext,
    lead_repo: LeadRegistryRepo,
) -> None:
    """Keep existing engagement plan after re-analysis."""
    lead_id = int(callback.data.split(":")[2])  # type: ignore[union-attr]

    lead = await lead_repo.get_by_id(lead_id)
    name = _sanitize(_lead_display_name(lead)) if lead else f"Lead #{lead_id}"

    await callback.message.edit_text(  # type: ignore[union-attr]
        f"*Re-analysis complete for {name}*\n\n"
        f"The strategy has been updated. The existing engagement plan "
        f"has been kept as-is.\n\n"
        f"Use /leads to view the updated lead.",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text="View Lead", callback_data=f"lead:view:{lead_id}"
                    )
                ],
            ]
        ),
    )
    await state.clear()
    await callback.answer()
