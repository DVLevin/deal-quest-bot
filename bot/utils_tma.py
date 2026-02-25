"""TMA (Telegram Mini App) integration helpers for bot handlers."""

from __future__ import annotations

import logging
from urllib.parse import urlencode

from aiogram import Bot
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    MenuButtonWebApp,
    WebAppInfo,
)

logger = logging.getLogger(__name__)


def add_open_in_app_row(
    keyboard: InlineKeyboardMarkup | None,
    tma_url: str,
    path: str = "",
    query_params: dict[str, str] | None = None,
) -> InlineKeyboardMarkup | None:
    """Append an 'Open in App' WebApp button as the last row of a keyboard.

    If tma_url is empty/falsy, returns the keyboard unchanged (graceful skip).
    If keyboard is None and tma_url is set, returns a new keyboard with just the button.
    Optional query_params dict appends ?key=value&... to the URL.
    """
    if not tma_url:
        return keyboard

    url = f"{tma_url}/{path}" if path else tma_url
    if query_params:
        url = f"{url}?{urlencode(query_params)}"
    new_row = [InlineKeyboardButton(text="Open in App", web_app=WebAppInfo(url=url))]

    if keyboard is None:
        return InlineKeyboardMarkup(inline_keyboard=[new_row])

    return InlineKeyboardMarkup(inline_keyboard=[*keyboard.inline_keyboard, new_row])


async def setup_menu_button(bot: Bot, tma_url: str) -> None:
    """Set the bot's menu button to open the TMA.

    If tma_url is empty, logs a warning and skips.
    """
    if not tma_url:
        logger.warning("TMA_URL not configured, skipping menu button setup")
        return

    try:
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text="Open App",
                web_app=WebAppInfo(url=tma_url),
            )
        )
        logger.info("TMA menu button set to %s", tma_url)
    except Exception as e:
        logger.warning("Failed to set TMA menu button: %s", e)
