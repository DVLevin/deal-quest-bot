"""Real-time progress updates during long-running pipeline operations."""

from __future__ import annotations

import asyncio
import logging
from enum import Enum
from typing import Sequence

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message

logger = logging.getLogger(__name__)

_UPDATE_INTERVAL = 6  # seconds between edits (safe above Telegram ~3s flood limit)


class Phase(str, Enum):
    TRANSCRIPTION = "transcription"
    EVALUATION = "evaluation"  # learn / train
    ANALYSIS = "analysis"  # support


_MESSAGES: dict[Phase, list[str]] = {
    Phase.TRANSCRIPTION: [
        "Uploading your voice message...",
        "Transcribing audio \u2014 listening closely...",
        "Almost done transcribing...",
    ],
    Phase.EVALUATION: [
        "Reading your response...",
        "Comparing against the scenario rubric...",
        "Scoring each criterion...",
        "Analyzing strengths and areas to improve...",
        "Checking your approach against the playbook...",
        "Generating personalized feedback...",
        "Almost done \u2014 finalizing your score...",
    ],
    Phase.ANALYSIS: [
        "Reading your prospect description...",
        "Analyzing prospect profile and signals...",
        "Building a closing strategy...",
        "Crafting engagement tactics...",
        "Writing your draft outreach message...",
        "Polishing the final strategy...",
        "Almost ready \u2014 finalizing recommendations...",
    ],
}

_TAIL: dict[Phase, list[str]] = {
    Phase.TRANSCRIPTION: [
        "Still transcribing...",
        "Few more moments...",
        "Wrapping up...",
    ],
    Phase.EVALUATION: [
        "Still crunching...",
        "Few more moments...",
        "Wrapping up...",
    ],
    Phase.ANALYSIS: [
        "Still working...",
        "Few more seconds...",
        "Wrapping up...",
    ],
}


def _still_working_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="\u23f3 Still working...", callback_data="progress:still")]
        ]
    )


class ProgressUpdater:
    """Async context manager that periodically edits a Telegram status message.

    Usage::

        async with ProgressUpdater(status_msg, Phase.EVALUATION):
            await runner.run(pipeline_config, ctx)
    """

    def __init__(
        self,
        status_msg: Message,
        phase: Phase,
        *,
        interval: float = _UPDATE_INTERVAL,
        messages: Sequence[str] | None = None,
        tail: Sequence[str] | None = None,
    ) -> None:
        self._msg = status_msg
        self._phase = phase
        self._interval = interval
        self._messages = list(messages) if messages else list(_MESSAGES[phase])
        self._tail = list(tail) if tail else list(_TAIL[phase])
        self._stop = asyncio.Event()
        self._task: asyncio.Task | None = None  # type: ignore[type-arg]
        self._index = 0

    async def __aenter__(self) -> ProgressUpdater:
        self._stop.clear()
        self._index = 0
        self._task = asyncio.create_task(self._loop())
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:  # noqa: ANN001
        self._stop.set()
        if self._task and not self._task.done():
            # Give the loop a moment to notice the event and exit cleanly
            try:
                await asyncio.wait_for(asyncio.shield(self._task), timeout=1.0)
            except (asyncio.TimeoutError, asyncio.CancelledError):
                self._task.cancel()
                try:
                    await self._task
                except asyncio.CancelledError:
                    pass
        return None  # don't suppress exceptions

    # ------------------------------------------------------------------

    async def _loop(self) -> None:
        """Edit the status message every *interval* seconds."""
        while not self._stop.is_set():
            try:
                await asyncio.wait_for(self._stop.wait(), timeout=self._interval)
                # If we reach here, stop was set — exit
                return
            except asyncio.TimeoutError:
                pass  # timeout elapsed → time to update

            text = self._next_text()
            await self._safe_edit(text)

    def _next_text(self) -> str:
        if self._index < len(self._messages):
            text = self._messages[self._index]
        else:
            # Cycle through the tail
            tail_idx = (self._index - len(self._messages)) % len(self._tail)
            text = self._tail[tail_idx]
        self._index += 1
        return text

    async def _safe_edit(self, text: str) -> None:
        """Edit the message, swallowing expected Telegram errors."""
        try:
            await self._msg.edit_text(text, reply_markup=_still_working_keyboard())
        except Exception as exc:
            err = str(exc).lower()
            # message is not modified — same text sent twice
            if "message is not modified" in err:
                return
            # message was deleted by user
            if "message to edit not found" in err or "message can't be edited" in err:
                logger.debug("Progress message deleted by user, stopping updates")
                self._stop.set()
                return
            # Flood control — back off
            if "retry after" in err:
                import re

                m = re.search(r"retry after (\d+)", err)
                wait = int(m.group(1)) + 1 if m else 7
                logger.warning("Telegram flood control, backing off %ds", wait)
                await asyncio.sleep(wait)
                return
            # Unexpected error — log but don't crash the pipeline
            logger.warning("Progress edit failed: %s", exc)
