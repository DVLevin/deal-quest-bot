"""TraceCollector service for batched background trace persistence."""

from __future__ import annotations

import asyncio
import logging
from collections import deque
from typing import Any

from bot.tracing.models import SpanModel, TraceModel

logger = logging.getLogger(__name__)


class TraceCollector:
    """Collects and batches trace data for background persistence.

    Buffers traces and spans in memory, flushing to InsForge periodically
    or when buffer reaches batch_size.
    """

    def __init__(
        self,
        trace_repo: Any,
        batch_size: int = 50,
        flush_interval: float = 10.0,
    ) -> None:
        self.trace_repo = trace_repo
        self.batch_size = batch_size
        self.flush_interval = flush_interval

        self._trace_buffer: deque = deque()
        self._span_buffer: deque = deque()
        self._flush_task: asyncio.Task | None = None
        self._stop_event = asyncio.Event()

    async def start(self) -> None:
        """Start background flush loop."""
        self._flush_task = asyncio.create_task(self._flush_loop())
        logger.info("TraceCollector started (batch_size=%d, flush_interval=%.1fs)", self.batch_size, self.flush_interval)

    async def stop(self) -> None:
        """Stop background flush and flush remaining data."""
        logger.info("TraceCollector stopping, flushing remaining data")
        self._stop_event.set()
        if self._flush_task:
            try:
                await asyncio.wait_for(self._flush_task, timeout=5.0)
            except asyncio.TimeoutError:
                logger.warning("Flush task did not complete in time, cancelling")
                self._flush_task.cancel()
        await self._flush_now()
        logger.info("TraceCollector stopped")

    async def record_trace(self, trace_context: Any) -> None:
        """Buffer a completed trace."""
        # Convert TraceContext to TraceModel
        trace = TraceModel(
            trace_id=trace_context.trace_id,
            pipeline_name=trace_context.pipeline_name,
            telegram_id=trace_context.telegram_id,
            user_id=trace_context.user_id,
            start_time=trace_context.start_time_wall,
            end_time=trace_context.end_time_wall,
            duration_ms=trace_context.duration_ms,
            success=trace_context.success,
            error=trace_context.error,
        )

        self._trace_buffer.append(trace)

        # Immediate flush if buffer full
        if len(self._trace_buffer) >= self.batch_size:
            await self._flush_now()

    async def record_span(self, **span_data: Any) -> None:
        """Buffer a span."""
        span = SpanModel(**span_data)
        self._span_buffer.append(span)

        if len(self._span_buffer) >= self.batch_size:
            await self._flush_now()

    async def _flush_loop(self) -> None:
        """Background task that flushes periodically."""
        while not self._stop_event.is_set():
            try:
                await asyncio.wait_for(
                    self._stop_event.wait(),
                    timeout=self.flush_interval,
                )
                # Stop event was set
                return
            except asyncio.TimeoutError:
                # Timeout elapsed - time to flush
                await self._flush_now()

    async def _flush_now(self) -> None:
        """Flush buffered traces and spans to database."""
        if not self._trace_buffer and not self._span_buffer:
            return

        # Flush traces
        if self._trace_buffer:
            traces = list(self._trace_buffer)
            self._trace_buffer.clear()
            logger.debug("Flushing %d traces", len(traces))
            try:
                for trace in traces:
                    await self.trace_repo.create_trace(trace)
            except Exception as e:
                logger.error("Failed to flush traces: %s", e)

        # Flush spans
        if self._span_buffer:
            spans = list(self._span_buffer)
            self._span_buffer.clear()
            logger.debug("Flushing %d spans", len(spans))
            try:
                for span in spans:
                    await self.trace_repo.create_span(span)
            except Exception as e:
                logger.error("Failed to flush spans: %s", e)


# Global singleton
_collector: TraceCollector | None = None


def init_collector(trace_repo: Any) -> TraceCollector:
    """Initialize the global trace collector singleton."""
    global _collector
    _collector = TraceCollector(trace_repo)
    return _collector


def get_collector() -> TraceCollector | None:
    """Get the global trace collector singleton."""
    return _collector
