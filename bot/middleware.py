"""Authorization middleware — restricts bot access to allowed Telegram usernames."""

from __future__ import annotations

import logging
from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware
from aiogram.types import CallbackQuery, Message, TelegramObject

logger = logging.getLogger(__name__)


class AuthorizationMiddleware(BaseMiddleware):
    """Only allow messages/callbacks from authorized Telegram usernames."""

    def __init__(self, allowed_usernames: list[str]) -> None:
        self.allowed = {u.lower() for u in allowed_usernames}
        logger.info("Authorization enabled for %d users: %s", len(self.allowed), self.allowed)

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        user = None
        if isinstance(event, Message):
            user = event.from_user
        elif isinstance(event, CallbackQuery):
            user = event.from_user

        if user is None:
            return  # No user info — skip

        username = (user.username or "").lower()

        if not self.allowed:
            # No allowlist configured — allow everyone
            return await handler(event, data)

        if username in self.allowed:
            return await handler(event, data)

        # Unauthorized user
        logger.warning(
            "Unauthorized access attempt: @%s (id=%s, name=%s)",
            user.username,
            user.id,
            user.first_name,
        )
        if isinstance(event, Message):
            await event.answer(
                "🔒 Access Restricted\n\n"
                "This bot is exclusively for the GetDeal.ai partnership team.\n\n"
                "If you believe you should have access, contact your team lead."
            )
        elif isinstance(event, CallbackQuery):
            await event.answer("🔒 Access restricted to GetDeal.ai team.", show_alert=True)

        return  # Don't call the handler
