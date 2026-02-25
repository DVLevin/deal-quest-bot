"""Handler for /comment -- standalone LinkedIn post comment suggestions."""

from __future__ import annotations

import base64
import io
import logging
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

from langfuse import get_client, observe

from bot.services.crypto import CryptoService
from bot.services.llm_router import create_provider
from bot.services.image_utils import pre_resize_image
from bot.states import CommentSupportState
from bot.storage.repositories import UserRepo

logger = logging.getLogger(__name__)

router = Router(name="comment")


@observe(name="pipeline:comment")
async def _traced_comment_generate(llm, system_prompt, user_message, image_b64, tg_id):
    """Run comment generation LLM call with Langfuse trace context."""
    try:
        client = get_client()
        client.update_current_observation(
            user_id=str(tg_id),
            session_id=f"comment_{tg_id}",
            metadata={"pipeline": "comment"},
        )
    except Exception:
        pass  # Never break pipeline for observability
    return await llm.complete(system_prompt, user_message, image_b64=image_b64)


PROMPTS_DIR = Path(__file__).resolve().parent.parent.parent / "prompts"


def _load_prompt(name: str) -> str:
    return (PROMPTS_DIR / name).read_text(encoding="utf-8")


def _comment_actions_keyboard() -> InlineKeyboardMarkup:
    """Build comment actions keyboard for regeneration."""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="Regenerate", callback_data="comment:regen"),
            InlineKeyboardButton(text="Bolder", callback_data="comment:bolder"),
        ],
        [
            InlineKeyboardButton(text="More Professional", callback_data="comment:professional"),
            InlineKeyboardButton(text="Done", callback_data="comment:done"),
        ],
    ])


@router.message(Command("comment"))
async def cmd_comment(message: Message, state: FSMContext, user_repo: UserRepo) -> None:
    """Start standalone comment suggestion mode."""
    tg_id = message.from_user.id

    user = await user_repo.get_by_telegram_id(tg_id)
    if not user or not user.encrypted_api_key:
        await message.answer("Please run /start first to set up your account.")
        return

    await message.answer(
        "*Comment Suggestion Mode*\n\n"
        "Send me a screenshot of the LinkedIn POST you want to comment on.\n\n"
        "I'll analyze the post content and generate engaging comment options "
        "that add value without being salesy.\n\n"
        "_This works best for posts about industry topics, achievements, or insights._\n\n"
        "_Send /cancel to exit._",
        parse_mode="Markdown",
    )
    await state.set_state(CommentSupportState.waiting_screenshot)


@router.message(CommentSupportState.waiting_screenshot, F.photo)
async def on_comment_photo(
    message: Message,
    state: FSMContext,
    bot: Bot,
    user_repo: UserRepo,
    crypto: CryptoService,
) -> None:
    """Process screenshot and generate comment suggestions."""
    tg_id = message.from_user.id

    user = await user_repo.get_by_telegram_id(tg_id)
    if not user or not user.encrypted_api_key:
        await message.answer("Please run /start first.")
        return

    status_msg = await message.answer("Analyzing post and generating comments...")

    # Download and resize photo
    photo = message.photo[-1]
    file = await bot.get_file(photo.file_id)
    file_bytes_io = io.BytesIO()
    await bot.download_file(file.file_path, file_bytes_io)
    file_bytes = pre_resize_image(file_bytes_io.getvalue())
    photo_b64 = base64.b64encode(file_bytes).decode("ascii")

    # Store for regeneration
    await state.update_data(screenshot_b64=photo_b64)

    # Generate comments
    try:
        api_key = crypto.decrypt(user.encrypted_api_key)
        if not api_key:
            await status_msg.edit_text("Failed to decrypt API key. Please update in /settings.")
            return

        model = user.openrouter_model if user.provider == "openrouter" else None
        llm = create_provider(user.provider, api_key, model)

        system_prompt = _load_prompt("standalone_comment.md")
        user_message = "Generate comment suggestions for the LinkedIn post shown in this screenshot."

        result = await _traced_comment_generate(llm, system_prompt, user_message, photo_b64, tg_id)
        await llm.close()

        # Extract text from result
        if isinstance(result, dict):
            comment_text = result.get("raw_response", "") or str(result)
        else:
            comment_text = str(result)

        await state.update_data(last_comments=comment_text)
        await state.set_state(CommentSupportState.refining_comment)

        await status_msg.edit_text(
            f"*Comment Suggestions:*\n\n{comment_text}\n\n"
            "_Tap to regenerate with different styles, or Done when satisfied._",
            parse_mode="Markdown",
            reply_markup=_comment_actions_keyboard(),
        )

    except Exception as e:
        logger.error("Comment generation failed: %s", e)
        await status_msg.edit_text(f"Failed to generate comments: {str(e)[:200]}")


@router.message(CommentSupportState.waiting_screenshot, F.text)
async def on_comment_cancel_check(message: Message, state: FSMContext) -> None:
    """Handle text in screenshot mode (probably /cancel)."""
    text = message.text or ""
    if text.strip().lower() == "/cancel":
        await state.clear()
        await message.answer("Comment mode cancelled.")
    else:
        await message.answer("Please send a screenshot of the LinkedIn post, or /cancel to exit.")


@router.callback_query(F.data.startswith("comment:"))
async def on_comment_action(
    callback: CallbackQuery,
    state: FSMContext,
    user_repo: UserRepo,
    crypto: CryptoService,
) -> None:
    """Handle comment regeneration actions."""
    action = callback.data.split(":")[1]

    if action == "done":
        await callback.message.edit_reply_markup(reply_markup=None)
        await callback.answer("Great! Copy your favorite comment and engage!")
        await state.clear()
        return

    data = await state.get_data()
    screenshot_b64 = data.get("screenshot_b64")

    if not screenshot_b64:
        await callback.answer("No screenshot found. Send a new one.")
        return

    tg_id = callback.from_user.id
    user = await user_repo.get_by_telegram_id(tg_id)
    if not user or not user.encrypted_api_key:
        await callback.answer("Please run /start first.")
        return

    await callback.answer("Regenerating...")

    # Build modifier based on action
    modifier = ""
    if action == "regen":
        modifier = "\n\n[Regenerate with completely fresh approaches. Different angles, different value adds.]"
    elif action == "bolder":
        modifier = "\n\n[Make the comments bolder and more confident. Take stronger positions. Be memorable.]"
    elif action == "professional":
        modifier = "\n\n[Make the comments more formal and professional. Emphasize expertise and credibility.]"

    try:
        api_key = crypto.decrypt(user.encrypted_api_key)
        if not api_key:
            await callback.answer("Key error")
            return

        model = user.openrouter_model if user.provider == "openrouter" else None
        llm = create_provider(user.provider, api_key, model)

        system_prompt = _load_prompt("standalone_comment.md")
        user_message = f"Generate comment suggestions for the LinkedIn post shown in this screenshot.{modifier}"

        result = await _traced_comment_generate(llm, system_prompt, user_message, screenshot_b64, tg_id)
        await llm.close()

        if isinstance(result, dict):
            comment_text = result.get("raw_response", "") or str(result)
        else:
            comment_text = str(result)

        await state.update_data(last_comments=comment_text)

        await callback.message.edit_text(
            f"*Comment Suggestions:*\n\n{comment_text}\n\n"
            "_Tap to regenerate with different styles, or Done when satisfied._",
            parse_mode="Markdown",
            reply_markup=_comment_actions_keyboard(),
        )

    except Exception as e:
        logger.error("Comment regeneration failed: %s", e)
        await callback.answer(f"Error: {str(e)[:100]}")
