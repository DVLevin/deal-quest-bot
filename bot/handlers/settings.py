"""Handler for /settings — provider management, model selection, account actions."""

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

from bot.services.crypto import CryptoService
from bot.services.llm_router import create_provider
from bot.states import SettingsState
from bot.storage.repositories import UserMemoryRepo, UserRepo

logger = logging.getLogger(__name__)

router = Router(name="settings")

SETTINGS_KEYBOARD = InlineKeyboardMarkup(
    inline_keyboard=[
        [InlineKeyboardButton(text="🔄 Switch Provider", callback_data="settings:switch_provider")],
        [InlineKeyboardButton(text="🔑 Update API Key", callback_data="settings:update_key")],
        [InlineKeyboardButton(text="🤖 Change Model", callback_data="settings:change_model")],
        [InlineKeyboardButton(text="🗑 Reset Progress", callback_data="settings:reset")],
        [InlineKeyboardButton(text="❌ Delete Account", callback_data="settings:delete")],
        [InlineKeyboardButton(text="🔙 Close", callback_data="settings:close")],
    ]
)

PROVIDER_KEYBOARD = InlineKeyboardMarkup(
    inline_keyboard=[
        [InlineKeyboardButton(text="🆓 OpenRouter", callback_data="switch:openrouter")],
        [InlineKeyboardButton(text="⭐ Claude API", callback_data="switch:claude")],
        [InlineKeyboardButton(text="🔙 Back", callback_data="settings:back")],
    ]
)

MODEL_KEYBOARD = InlineKeyboardMarkup(
    inline_keyboard=[
        [InlineKeyboardButton(text="GPT-OSS 120B (Free)", callback_data="model:openai/gpt-oss-120b")],
        [InlineKeyboardButton(text="Kimi K2.5 (Free)", callback_data="model:moonshotai/kimi-k2.5")],
        [InlineKeyboardButton(text="Gemini Flash (Free)", callback_data="model:google/gemini-flash")],
        [InlineKeyboardButton(text="DeepSeek R1 (Free)", callback_data="model:deepseek/deepseek-r1")],
        [InlineKeyboardButton(text="🔙 Back", callback_data="settings:back")],
    ]
)

CONFIRM_DELETE_KEYBOARD = InlineKeyboardMarkup(
    inline_keyboard=[
        [InlineKeyboardButton(text="⚠️ Yes, delete everything", callback_data="confirm_delete:yes")],
        [InlineKeyboardButton(text="🔙 Cancel", callback_data="settings:back")],
    ]
)

CONFIRM_RESET_KEYBOARD = InlineKeyboardMarkup(
    inline_keyboard=[
        [InlineKeyboardButton(text="⚠️ Yes, reset progress", callback_data="confirm_reset:yes")],
        [InlineKeyboardButton(text="🔙 Cancel", callback_data="settings:back")],
    ]
)


@router.message(Command("settings"))
async def cmd_settings(message: Message, state: FSMContext, user_repo: UserRepo) -> None:
    """Show settings menu."""
    tg_id = message.from_user.id  # type: ignore[union-attr]
    user = await user_repo.get_by_telegram_id(tg_id)

    if not user:
        await message.answer("Please run /start first to set up your account.")
        return

    provider_display = "OpenRouter 🆓" if user.provider == "openrouter" else "Claude API ⭐"
    model_display = user.openrouter_model if user.provider == "openrouter" else "claude-sonnet"

    await message.answer(
        f"⚙️ *Settings*\n\n"
        f"Provider: {provider_display}\n"
        f"Model: `{model_display}`\n"
        f"XP: {user.total_xp}\n"
        f"Level: {user.current_level}",
        parse_mode="Markdown",
        reply_markup=SETTINGS_KEYBOARD,
    )
    await state.set_state(SettingsState.main_menu)


@router.callback_query(F.data == "settings:switch_provider")
async def on_switch_provider(callback: CallbackQuery, state: FSMContext) -> None:
    await callback.message.edit_text(  # type: ignore[union-attr]
        "Select your new provider:",
        reply_markup=PROVIDER_KEYBOARD,
    )
    await state.set_state(SettingsState.changing_provider)
    await callback.answer()


@router.callback_query(F.data.startswith("switch:"), SettingsState.changing_provider)
async def on_provider_selected(callback: CallbackQuery, state: FSMContext) -> None:
    provider = callback.data.split(":")[1]  # type: ignore[union-attr]
    await state.update_data(new_provider=provider)

    if provider == "openrouter":
        text = "Send your OpenRouter API key:\nhttps://openrouter.ai/keys"
    else:
        text = "Send your Anthropic API key:\nhttps://console.anthropic.com/"

    await callback.message.edit_text(text)  # type: ignore[union-attr]
    await state.set_state(SettingsState.entering_new_key)
    await callback.answer()


@router.callback_query(F.data == "settings:update_key")
async def on_update_key(callback: CallbackQuery, state: FSMContext) -> None:
    await callback.message.edit_text("Send your new API key:")  # type: ignore[union-attr]
    await state.set_state(SettingsState.entering_new_key)
    await callback.answer()


@router.message(SettingsState.entering_new_key)
async def on_new_key(
    message: Message,
    state: FSMContext,
    user_repo: UserRepo,
    crypto: CryptoService,
    default_openrouter_model: str,
) -> None:
    """Validate and store the new API key."""
    api_key = message.text.strip()  # type: ignore[union-attr]
    tg_id = message.from_user.id  # type: ignore[union-attr]

    try:
        await message.delete()
    except Exception:
        pass

    data = await state.get_data()
    provider = data.get("new_provider")

    # If no new provider chosen, use existing
    if not provider:
        user = await user_repo.get_by_telegram_id(tg_id)
        provider = user.provider if user else "openrouter"

    status_msg = await message.answer("🔄 Validating...")

    try:
        llm = create_provider(provider, api_key)
        valid = await llm.validate_key()
        await llm.close()
    except Exception:
        valid = False

    if not valid:
        await status_msg.edit_text("❌ Invalid key. Try again or use /settings.")
        return

    encrypted = crypto.encrypt(api_key)
    updates = {"provider": provider, "encrypted_api_key": encrypted}
    if provider == "openrouter":
        updates["openrouter_model"] = default_openrouter_model

    await user_repo.update(tg_id, **updates)
    await status_msg.edit_text(
        f"✅ Updated! Provider: {'OpenRouter' if provider == 'openrouter' else 'Claude API'}",
    )
    await state.clear()


@router.callback_query(F.data == "settings:change_model")
async def on_change_model(callback: CallbackQuery, state: FSMContext) -> None:
    await callback.message.edit_text(  # type: ignore[union-attr]
        "Select OpenRouter model:",
        reply_markup=MODEL_KEYBOARD,
    )
    await state.set_state(SettingsState.choosing_model)
    await callback.answer()


@router.callback_query(F.data.startswith("model:"), SettingsState.choosing_model)
async def on_model_selected(
    callback: CallbackQuery,
    state: FSMContext,
    user_repo: UserRepo,
) -> None:
    model = callback.data[6:]  # type: ignore[union-attr]
    tg_id = callback.from_user.id
    await user_repo.update(tg_id, openrouter_model=model)
    await callback.message.edit_text(f"✅ Model updated to `{model}`", parse_mode="Markdown")  # type: ignore[union-attr]
    await state.clear()
    await callback.answer()


@router.callback_query(F.data == "settings:reset")
async def on_reset(callback: CallbackQuery) -> None:
    await callback.message.edit_text(  # type: ignore[union-attr]
        "⚠️ This will reset all your XP and progress. Are you sure?",
        reply_markup=CONFIRM_RESET_KEYBOARD,
    )
    await callback.answer()


@router.callback_query(F.data == "confirm_reset:yes")
async def on_confirm_reset(
    callback: CallbackQuery,
    state: FSMContext,
    user_repo: UserRepo,
) -> None:
    tg_id = callback.from_user.id
    await user_repo.update(tg_id, total_xp=0, current_level=1, streak_days=0)
    await callback.message.edit_text("✅ Progress reset. Start fresh with /learn!")  # type: ignore[union-attr]
    await state.clear()
    await callback.answer()


@router.callback_query(F.data == "settings:delete")
async def on_delete(callback: CallbackQuery) -> None:
    await callback.message.edit_text(  # type: ignore[union-attr]
        "⚠️ This will permanently delete your account and all data. Are you sure?",
        reply_markup=CONFIRM_DELETE_KEYBOARD,
    )
    await callback.answer()


@router.callback_query(F.data == "confirm_delete:yes")
async def on_confirm_delete(
    callback: CallbackQuery,
    state: FSMContext,
    user_repo: UserRepo,
) -> None:
    tg_id = callback.from_user.id
    await user_repo.delete_by_telegram_id(tg_id)
    await callback.message.edit_text("✅ Account deleted. Use /start to create a new one.")  # type: ignore[union-attr]
    await state.clear()
    await callback.answer()


@router.callback_query(F.data.in_({"settings:back", "settings:close"}))
async def on_back_or_close(callback: CallbackQuery, state: FSMContext) -> None:
    if callback.data == "settings:close":
        await callback.message.delete()  # type: ignore[union-attr]
    else:
        await callback.message.edit_text(  # type: ignore[union-attr]
            "⚙️ Settings", reply_markup=SETTINGS_KEYBOARD
        )
    await state.set_state(SettingsState.main_menu)
    await callback.answer()
