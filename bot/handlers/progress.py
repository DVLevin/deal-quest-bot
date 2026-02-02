"""Callback handler for the progress "Still working..." inline button."""

from __future__ import annotations

from aiogram import F, Router
from aiogram.types import CallbackQuery

router = Router(name="progress")


@router.callback_query(F.data == "progress:still")
async def on_still_working(callback: CallbackQuery) -> None:
    """Respond with a toast so the user knows the bot is alive."""
    await callback.answer("Still processing! Hang tight.", show_alert=False)
