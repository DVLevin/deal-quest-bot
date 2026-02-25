"""Background task management -- prevents GC and logs errors."""

from __future__ import annotations

import asyncio
import logging

logger = logging.getLogger(__name__)

_background_tasks: set[asyncio.Task] = set()  # type: ignore[type-arg]


def create_background_task(coro, *, name: str | None = None) -> asyncio.Task:  # type: ignore[type-arg]
    """Create a background task with reference tracking and error logging.

    Prevents garbage collection of fire-and-forget tasks and ensures
    exceptions are logged at ERROR level instead of being silently swallowed.
    """
    task = asyncio.create_task(coro, name=name)
    _background_tasks.add(task)

    def _on_done(t: asyncio.Task) -> None:  # type: ignore[type-arg]
        _background_tasks.discard(t)
        if t.cancelled():
            logger.debug("Background task %s was cancelled", t.get_name())
        elif exc := t.exception():
            logger.error(
                "Background task %s failed: %s", t.get_name(), exc, exc_info=exc,
            )

    task.add_done_callback(_on_done)
    return task
