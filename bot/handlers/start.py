"""Handler for /start — onboarding flow with guided setup for non-tech users."""

from __future__ import annotations

import logging

import httpx
from aiogram import F, Router
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)

from bot.services.crypto import CryptoService
from bot.services.llm_router import create_provider
from bot.states import OnboardingState
from bot.storage.models import UserModel
from bot.storage.repositories import TrackProgressRepo, UserMemoryRepo, UserRepo

logger = logging.getLogger(__name__)

router = Router(name="start")

# --- Onboarding messages ---

WELCOME_TEXT = """🎯 *Welcome to Deal Quest!*
_GetDeal.ai Sales Academy_
━━━━━━━━━━━━━━━━━━━━━━━━

Your personal AI-powered sales training \\& support assistant.

*What Deal Quest does for you:*

💼 *Real Deal Support* — Paste any prospect situation and get a full closing strategy, engagement tactics, and draft outreach

🎓 *Structured Learning* — Work through training levels to master GetDeal\\.ai positioning, objection handling, and closing

🎲 *Practice Mode* — Random sales scenarios that test your skills and track your progress

📊 *Progress Tracking* — XP, levels, rankings, and performance insights

━━━━━━━━━━━━━━━━━━━━━━━━
Let's get you set up \\(takes 30 seconds\\)\\!"""

SETUP_METHOD_KEYBOARD = InlineKeyboardMarkup(
    inline_keyboard=[
        [InlineKeyboardButton(
            text="⚡ Quick Setup (Recommended)",
            callback_data="setup:auto",
        )],
        [InlineKeyboardButton(
            text="🔑 Use My Own API Key",
            callback_data="setup:custom",
        )],
    ]
)

PROVIDER_KEYBOARD = InlineKeyboardMarkup(
    inline_keyboard=[
        [InlineKeyboardButton(
            text="🆓 OpenRouter (Free models)",
            callback_data="provider:openrouter",
        )],
        [InlineKeyboardButton(
            text="⭐ Claude API (Premium quality)",
            callback_data="provider:claude",
        )],
    ]
)

ONBOARDING_COMPLETE_KEYBOARD = InlineKeyboardMarkup(
    inline_keyboard=[
        [InlineKeyboardButton(text="🎓 Start Learning", callback_data="onboard:learn")],
        [InlineKeyboardButton(text="💼 I Have a Deal to Work On", callback_data="onboard:support")],
        [InlineKeyboardButton(text="🎲 Jump Into Practice", callback_data="onboard:train")],
    ]
)


@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext, user_repo: UserRepo) -> None:
    """Handle /start — begin onboarding."""
    tg_id = message.from_user.id  # type: ignore[union-attr]

    # Check if user already exists and is set up
    existing = await user_repo.get_by_telegram_id(tg_id)
    if existing and existing.encrypted_api_key:
        await message.answer(
            "👋 *Welcome back\\!*\n\n"
            "You're all set up and ready to go\\.\n\n"
            "💼 /support — Get deal strategy advice\n"
            "🎓 /learn — Continue your training\n"
            "🎲 /train — Practice with random scenarios\n"
            "📊 /stats — View your progress\n"
            "⚙️ /settings — Manage your setup",
            parse_mode="MarkdownV2",
        )
        await state.clear()
        return

    await message.answer(
        WELCOME_TEXT,
        parse_mode="MarkdownV2",
        reply_markup=SETUP_METHOD_KEYBOARD,
    )
    await state.set_state(OnboardingState.choosing_provider)


@router.callback_query(F.data == "setup:auto", OnboardingState.choosing_provider)
async def on_auto_setup(
    callback: CallbackQuery,
    state: FSMContext,
    user_repo: UserRepo,
    memory_repo: UserMemoryRepo,
    track_repo: TrackProgressRepo,
    crypto: CryptoService,
    shared_openrouter_key: str,
    default_openrouter_model: str,
) -> None:
    """Quick setup — use the shared team OpenRouter key."""
    tg_id = callback.from_user.id
    tg_user = callback.from_user

    await callback.message.edit_text("⚡ Setting you up...")  # type: ignore[union-attr]

    # Validate shared key
    if not shared_openrouter_key:
        await callback.message.edit_text(  # type: ignore[union-attr]
            "❌ Shared API key not configured. Please use custom setup.",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="🔑 Use My Own Key", callback_data="setup:custom")],
            ]),
        )
        await callback.answer()
        return

    encrypted_key = crypto.encrypt(shared_openrouter_key)

    # Create or update user
    existing = await user_repo.get_by_telegram_id(tg_id)
    if existing:
        await user_repo.update(
            tg_id,
            provider="openrouter",
            encrypted_api_key=encrypted_key,
            openrouter_model=default_openrouter_model,
        )
        user = existing
    else:
        user = await user_repo.create(
            UserModel(
                telegram_id=tg_id,
                username=tg_user.username,
                first_name=tg_user.first_name,
                provider="openrouter",
                encrypted_api_key=encrypted_key,
                openrouter_model=default_openrouter_model,
            )
        )

    # Initialize memory and track
    if user.id:
        try:
            existing_memory = await memory_repo.get(tg_id)
            if not existing_memory:
                await memory_repo.create_default(user.id, tg_id, tg_user.first_name or "")
        except Exception as e:
            logger.error("Failed to create user memory: %s", e)

        try:
            await track_repo.init_track(user.id, tg_id, "foundations", ["1.1", "1.2", "1.3", "1.4"])
        except Exception as e:
            logger.error("Failed to init track progress: %s", e)

    name = tg_user.first_name or "there"
    await callback.message.edit_text(  # type: ignore[union-attr]
        f"✅ *You're all set, {name}\\!*\n\n"
        "Your AI assistant is ready\\. Here's what you can do:\n\n"
        "💼 */support* — Paste a prospect situation and get a full closing strategy with engagement tactics and draft outreach\n\n"
        "🎓 */learn* — Work through structured training levels\\. Master positioning, objection handling, buyer types, and more\n\n"
        "🎲 */train* — Random sales scenarios to sharpen your skills\\. 20 unique scenarios that never repeat\n\n"
        "📊 */stats* — Track your XP, level, and performance\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "*What would you like to do first?*",
        parse_mode="MarkdownV2",
        reply_markup=ONBOARDING_COMPLETE_KEYBOARD,
    )
    await state.clear()
    await callback.answer()


@router.callback_query(F.data == "setup:custom", OnboardingState.choosing_provider)
async def on_custom_setup(callback: CallbackQuery, state: FSMContext) -> None:
    """Custom setup — choose provider and enter own key."""
    await callback.message.edit_text(  # type: ignore[union-attr]
        "🔑 *Custom Setup*\n\n"
        "Choose your AI provider:\n\n"
        "🆓 *OpenRouter* — Free models available (Qwen3, DeepSeek)\n"
        "   Get a key at: openrouter.ai/keys\n\n"
        "⭐ *Claude API* — Best quality, paid\n"
        "   Get a key at: console.anthropic.com\n",
        parse_mode="Markdown",
        reply_markup=PROVIDER_KEYBOARD,
    )
    await callback.answer()


@router.callback_query(F.data.startswith("provider:"), OnboardingState.choosing_provider)
async def on_provider_chosen(callback: CallbackQuery, state: FSMContext) -> None:
    """User selected a provider for custom setup."""
    provider = callback.data.split(":")[1]  # type: ignore[union-attr]
    await state.update_data(provider=provider)

    if provider == "openrouter":
        text = (
            "🆓 *OpenRouter Selected*\n\n"
            "*How to get your API key:*\n"
            "1️⃣ Go to openrouter.ai/keys\n"
            "2️⃣ Sign up (free)\n"
            "3️⃣ Click 'Create Key'\n"
            "4️⃣ Copy the key and paste it here 👇\n\n"
            "Your key will be encrypted and stored securely.\n"
            "_Send your API key now:_"
        )
    else:
        text = (
            "⭐ *Claude API Selected*\n\n"
            "*How to get your API key:*\n"
            "1️⃣ Go to console.anthropic.com\n"
            "2️⃣ Create account or sign in\n"
            "3️⃣ Go to API Keys → Create Key\n"
            "4️⃣ Copy the key and paste it here 👇\n\n"
            "⚠️ Note: Claude API requires payment (~$0.01-0.05 per interaction).\n\n"
            "Your key will be encrypted and stored securely.\n"
            "_Send your API key now:_"
        )

    await callback.message.edit_text(text, parse_mode="Markdown")  # type: ignore[union-attr]
    await state.set_state(OnboardingState.entering_api_key)
    await callback.answer()


@router.message(OnboardingState.entering_api_key)
async def on_api_key_entered(
    message: Message,
    state: FSMContext,
    user_repo: UserRepo,
    memory_repo: UserMemoryRepo,
    track_repo: TrackProgressRepo,
    crypto: CryptoService,
    default_openrouter_model: str,
) -> None:
    """User sent their API key — validate, encrypt, store."""
    api_key = message.text.strip()  # type: ignore[union-attr]
    data = await state.get_data()
    provider = data.get("provider", "openrouter")

    # Delete the message containing the API key for security
    try:
        await message.delete()
    except Exception:
        pass

    # Validate key
    status_msg = await message.answer("🔄 Validating your API key...")

    try:
        llm = create_provider(provider, api_key)
        valid = await llm.validate_key()
        await llm.close()
    except httpx.TimeoutException:
        await status_msg.edit_text(
            "⏱ Connection timed out. Please check your internet and try again."
        )
        return
    except httpx.ConnectError:
        await status_msg.edit_text(
            "🌐 Could not connect. Please check your internet and try again."
        )
        return
    except Exception as e:
        logger.warning("API key validation failed: %s", e)
        valid = False

    if not valid:
        await status_msg.edit_text(
            "❌ That API key didn't work.\n\n"
            "Please double-check it and try again.\n"
            "Or use /start to restart setup."
        )
        return

    # Encrypt and store
    tg_user = message.from_user  # type: ignore[union-attr]
    tg_id = tg_user.id
    encrypted_key = crypto.encrypt(api_key)

    existing = await user_repo.get_by_telegram_id(tg_id)
    if existing:
        await user_repo.update(
            tg_id,
            provider=provider,
            encrypted_api_key=encrypted_key,
            openrouter_model=default_openrouter_model if provider == "openrouter" else "",
        )
        user = existing
    else:
        user = await user_repo.create(
            UserModel(
                telegram_id=tg_id,
                username=tg_user.username,
                first_name=tg_user.first_name,
                provider=provider,
                encrypted_api_key=encrypted_key,
                openrouter_model=default_openrouter_model if provider == "openrouter" else "",
            )
        )

    # Create default memory
    if user.id:
        try:
            existing_memory = await memory_repo.get(tg_id)
            if not existing_memory:
                await memory_repo.create_default(user.id, tg_id, tg_user.first_name or "")
        except Exception as e:
            logger.error("Failed to create user memory: %s", e)

        try:
            await track_repo.init_track(user.id, tg_id, "foundations", ["1.1", "1.2", "1.3", "1.4"])
        except Exception as e:
            logger.error("Failed to init track progress: %s", e)

    name = tg_user.first_name or "there"
    await status_msg.edit_text(
        f"✅ *You're all set, {name}!*\n\n"
        f"Provider: {'OpenRouter 🆓' if provider == 'openrouter' else 'Claude API ⭐'}\n\n"
        "💼 /support — Deal strategy advice\n"
        "🎓 /learn — Structured training\n"
        "🎲 /train — Practice scenarios\n"
        "📊 /stats — Your progress\n\n"
        "*What would you like to do first?*",
        parse_mode="Markdown",
        reply_markup=ONBOARDING_COMPLETE_KEYBOARD,
    )
    await state.clear()


# --- Post-onboarding quick actions ---

@router.callback_query(F.data == "onboard:learn")
async def on_start_learning(callback: CallbackQuery) -> None:
    await callback.message.edit_text("🎓 Great choice! Use /learn to start your first lesson.")  # type: ignore[union-attr]
    await callback.answer()


@router.callback_query(F.data == "onboard:support")
async def on_start_support(callback: CallbackQuery) -> None:
    await callback.message.edit_text(  # type: ignore[union-attr]
        "💼 Ready to work on a real deal!\n\n"
        "Use /support and then describe your prospect situation:\n"
        "• Who they are (role, company)\n"
        "• What they said or asked\n"
        "• Any context you have\n\n"
        "I'll give you a full strategy + draft response."
    )
    await callback.answer()


@router.callback_query(F.data == "onboard:train")
async def on_start_training(callback: CallbackQuery) -> None:
    await callback.message.edit_text("🎲 Let's practice! Use /train to get your first random scenario.")  # type: ignore[union-attr]
    await callback.answer()
