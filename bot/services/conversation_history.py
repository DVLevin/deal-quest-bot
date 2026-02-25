"""Conversation history service with hybrid in-memory + DB persistence.

Manages per-user sliding window conversation history:
- In-memory deque for fast access during a session
- Background flush to InsForge every 30 seconds for durability across restarts
- Lazy DB loading on first access per user
- Session timeout detection based on last turn timestamp
"""

from __future__ import annotations

import asyncio
import logging
from collections import deque
from datetime import datetime, timedelta, timezone
from typing import Any

from pydantic import BaseModel

from bot.storage.models import ConversationTurnModel
from bot.storage.repositories import ConversationHistoryRepo

logger = logging.getLogger(__name__)


class ConversationTurn(BaseModel):
    """One message in conversation history."""

    role: str  # "user" | "assistant" | "tool"
    content: str = ""
    timestamp: str  # ISO 8601 UTC
    tool_calls: list[dict[str, Any]] | None = None
    tool_call_id: str | None = None


class ConversationHistoryService:
    """Per-user sliding window conversation history with background persistence."""

    def __init__(
        self,
        history_repo: ConversationHistoryRepo,
        *,
        window_size: int = 20,
        flush_interval: float = 30.0,
        session_timeout_hours: float = 4.0,
    ) -> None:
        self._repo = history_repo
        self._window = window_size
        self._flush_interval = flush_interval
        self._session_timeout = timedelta(hours=session_timeout_hours)

        # Per-user state
        self._cache: dict[int, deque[ConversationTurn]] = {}
        self._dirty: set[int] = set()
        self._loaded_users: set[int] = set()

        # Background flush task
        self._flush_task: asyncio.Task[None] | None = None

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def start(self) -> None:
        """Start background flush loop."""
        self._flush_task = asyncio.create_task(self._flush_loop())

    async def stop(self) -> None:
        """Stop flush loop and flush remaining dirty data."""
        if self._flush_task is not None:
            self._flush_task.cancel()
            try:
                await self._flush_task
            except asyncio.CancelledError:
                pass
            self._flush_task = None
        # Final flush before shutdown
        await self._flush_all()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def ensure_loaded(self, user_id: int) -> None:
        """Lazy-load conversation history from DB on first access.

        After the first call for a given user_id, this returns immediately
        (already loaded). Callers must await this before calling get_messages().
        """
        if user_id in self._loaded_users:
            return

        try:
            db_turns = await self._repo.get_recent(user_id, limit=self._window)
            turns = deque(
                (_model_to_turn(m) for m in db_turns),
                maxlen=self._window,
            )
            self._cache[user_id] = turns
        except Exception as e:
            logger.error("Failed to load conversation history for user %s: %s", user_id, e)
            self._cache[user_id] = deque(maxlen=self._window)

        self._loaded_users.add(user_id)

    def get_messages(self, user_id: int) -> list[dict[str, Any]]:
        """Return conversation history as OpenAI-format message list.

        Caller MUST call ensure_loaded(user_id) first (async).
        This method is synchronous for performance.
        """
        turns = self._cache.get(user_id)
        if not turns:
            return []

        messages: list[dict[str, Any]] = []
        for turn in turns:
            msg: dict[str, Any] = {"role": turn.role, "content": turn.content}
            if turn.tool_calls is not None:
                msg["tool_calls"] = turn.tool_calls
            if turn.tool_call_id is not None:
                msg["tool_call_id"] = turn.tool_call_id
            messages.append(msg)

        return messages

    def append_turn(self, user_id: int, turn: ConversationTurn) -> None:
        """Append a turn to the user's conversation history.

        Creates the deque if not present (e.g. if ensure_loaded was not called).
        Oldest turns are auto-evicted when maxlen is reached.
        """
        if user_id not in self._cache:
            self._cache[user_id] = deque(maxlen=self._window)
        self._cache[user_id].append(turn)
        self._dirty.add(user_id)

    def clear_session(self, user_id: int) -> None:
        """Clear conversation history for a user (new session start).

        Marks dirty so the deletion is flushed to DB on next flush cycle.
        """
        self._cache[user_id] = deque(maxlen=self._window)
        self._dirty.add(user_id)

    def detect_new_session(self, user_id: int) -> bool:
        """Return True if last turn is older than session_timeout_hours.

        Returns False if no turns exist (first message is not a new session).
        """
        turns = self._cache.get(user_id)
        if not turns:
            return False

        last_turn = turns[-1]
        try:
            last_ts = datetime.fromisoformat(last_turn.timestamp)
            # Ensure timezone-aware comparison
            if last_ts.tzinfo is None:
                last_ts = last_ts.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            return (now - last_ts) > self._session_timeout
        except (ValueError, TypeError) as e:
            logger.warning("Could not parse timestamp '%s': %s", last_turn.timestamp, e)
            return False

    def get_last_assistant_message(self, user_id: int) -> str | None:
        """Return content of the last assistant turn, or None if not found."""
        turns = self._cache.get(user_id)
        if not turns:
            return None
        for turn in reversed(turns):
            if turn.role == "assistant":
                return turn.content
        return None

    # ------------------------------------------------------------------
    # Background flush
    # ------------------------------------------------------------------

    async def _flush_loop(self) -> None:
        """Periodically flush dirty users to DB."""
        try:
            while True:
                await asyncio.sleep(self._flush_interval)
                await self._flush_all()
        except asyncio.CancelledError:
            pass

    async def _flush_all(self) -> None:
        """Flush all dirty users to DB."""
        if not self._dirty:
            return

        # Snapshot and clear dirty set before async ops to avoid race
        to_flush = self._dirty.copy()
        self._dirty.clear()

        for user_id in to_flush:
            try:
                turns = list(self._cache.get(user_id, []))
                models = [_turn_to_model(t, user_id) for t in turns]
                await self._repo.save_turns(user_id, models)
            except Exception as e:
                logger.error("Failed to flush history for user %s: %s", user_id, e)
                # Re-mark as dirty so next flush retries
                self._dirty.add(user_id)


# ------------------------------------------------------------------
# Conversion helpers
# ------------------------------------------------------------------

def _turn_to_model(turn: ConversationTurn, telegram_id: int) -> ConversationTurnModel:
    """Convert in-memory ConversationTurn to DB ConversationTurnModel."""
    return ConversationTurnModel(
        telegram_id=telegram_id,
        role=turn.role,
        content=turn.content,
        tool_calls=turn.tool_calls,
        tool_call_id=turn.tool_call_id,
        timestamp=turn.timestamp,
    )


def _model_to_turn(model: ConversationTurnModel) -> ConversationTurn:
    """Convert DB ConversationTurnModel to in-memory ConversationTurn."""
    return ConversationTurn(
        role=model.role,
        content=model.content,
        timestamp=model.timestamp or datetime.now(timezone.utc).isoformat(),
        tool_calls=model.tool_calls,
        tool_call_id=model.tool_call_id,
    )
