"""Handler for collecting context input on leads for re-analysis."""

from __future__ import annotations

import base64
import io
import logging

from aiogram import Bot, F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)

from bot.services.transcription import TranscriptionService
from bot.states import ReanalysisState
from bot.storage.models import LeadActivityModel
from bot.storage.repositories import (
    LeadActivityRepo,
    LeadRegistryRepo,
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
