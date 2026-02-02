"""Core tracing primitives: TraceContext, traced_span decorator, ContextVar propagation."""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone
from functools import wraps
from typing import Any, Callable

logger = logging.getLogger(__name__)

# Context variables for trace propagation across async boundaries
_trace_id: ContextVar[str | None] = ContextVar("trace_id", default=None)
_span_stack: ContextVar[list[str] | None] = ContextVar("span_stack", default=None)


def _safe_serialize(obj: Any, max_size: int = 50000) -> Any:
    """Safely serialize objects for span I/O capture.

    Tries to convert to JSON-compatible format, falls back to repr if needed.
    Limits total size to prevent storage explosion.
    """
    # Already JSON-compatible types
    if isinstance(obj, (dict, list, str, int, float, bool, type(None))):
        import json
        serialized = json.dumps(obj)
        if len(serialized) > max_size:
            return {"repr": repr(obj)[:2000], "_truncated": True}
        return obj

    # Try Pydantic model_dump
    if hasattr(obj, "model_dump"):
        try:
            data = obj.model_dump()
            import json
            serialized = json.dumps(data)
            if len(serialized) > max_size:
                return {"repr": repr(obj)[:2000], "_truncated": True}
            return data
        except Exception:
            pass

    # Fall back to repr (truncated)
    return {"repr": repr(obj)[:2000]}


class TraceContext:
    """Async context manager for pipeline tracing.

    Usage mirrors ProgressUpdater pattern:

        async with TraceContext("learn", telegram_id=123, user_id=1):
            await runner.run(pipeline_config, ctx)

    Automatically captures:
    - Pipeline execution timing (both wall-clock and perf_counter)
    - Success/failure status
    - Trace ID for span correlation
    """

    def __init__(
        self,
        pipeline_name: str,
        telegram_id: int,
        user_id: int,
    ) -> None:
        self.pipeline_name = pipeline_name
        self.telegram_id = telegram_id
        self.user_id = user_id
        self.trace_id = str(uuid.uuid4())

        # Wall-clock timestamps for DB storage
        self.start_time_wall: str | None = None
        self.end_time_wall: str | None = None

        # perf_counter for accurate duration measurement
        self._start_perf: float | None = None
        self._end_perf: float | None = None

        self.duration_ms: float = 0.0
        self.success = True
        self.error: str | None = None

    async def __aenter__(self) -> TraceContext:
        """Set trace context for child spans and start timing."""
        # Set trace context for child calls
        _trace_id.set(self.trace_id)
        _span_stack.set([])

        # Record start times
        self.start_time_wall = datetime.now(timezone.utc).isoformat()
        self._start_perf = time.perf_counter()

        logger.info(
            "Trace started: trace_id=%s pipeline=%s telegram_id=%s",
            self.trace_id,
            self.pipeline_name,
            self.telegram_id,
        )

        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: Any,
    ) -> None:
        """Record end time, duration, and persist trace."""
        # Record end times
        self.end_time_wall = datetime.now(timezone.utc).isoformat()
        self._end_perf = time.perf_counter()

        # Calculate duration from perf_counter (monotonic, high-precision)
        if self._start_perf is not None and self._end_perf is not None:
            self.duration_ms = (self._end_perf - self._start_perf) * 1000.0

        # Record success/failure
        if exc_type is not None:
            self.success = False
            self.error = f"{exc_type.__name__}: {exc_val}"

        logger.info(
            "Trace completed: trace_id=%s duration=%.2fms success=%s",
            self.trace_id,
            self.duration_ms,
            self.success,
        )

        # Persist trace via collector
        from bot.tracing.collector import get_collector

        collector = get_collector()
        if collector:
            await collector.record_trace(self)

        # Clear context
        _trace_id.set(None)
        _span_stack.set(None)

        # Don't suppress exceptions
        return None


def traced_span(span_name: str | None = None) -> Callable:
    """Decorator to create a span for an async function.

    Usage:
        @traced_span("trainer_agent")
        async def run(self, input_data, ctx):
            ...

    Automatically records:
    - Timing (start/end/duration)
    - Parent linkage (from span stack)
    - Input/output data (safely serialized)
    - Success/failure status
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            # Check if we're in a traced context
            trace_id = _trace_id.get()
            if not trace_id:
                # Not in traced context, skip instrumentation
                return await func(*args, **kwargs)

            # Create span
            span_id = str(uuid.uuid4())
            name = span_name or func.__name__

            # Record start times
            start_time_wall = datetime.now(timezone.utc).isoformat()
            start_perf = time.perf_counter()

            # Get parent span from stack
            span_stack = _span_stack.get()
            if span_stack is None:
                span_stack = []
                _span_stack.set(span_stack)

            parent_span_id = span_stack[-1] if span_stack else None

            # Push span onto stack
            span_stack.append(span_id)
            _span_stack.set(span_stack)

            try:
                # Execute function
                result = await func(*args, **kwargs)

                # Record end time and duration
                end_time_wall = datetime.now(timezone.utc).isoformat()
                end_perf = time.perf_counter()
                duration_ms = (end_perf - start_perf) * 1000.0

                # Safely serialize input/output
                input_data = _safe_serialize(kwargs) if kwargs else None
                output_data = _safe_serialize(result)

                # Record successful span
                from bot.tracing.collector import get_collector

                collector = get_collector()
                if collector:
                    await collector.record_span(
                        span_id=span_id,
                        trace_id=trace_id,
                        parent_span_id=parent_span_id,
                        span_name=name,
                        start_time=start_time_wall,
                        end_time=end_time_wall,
                        duration_ms=duration_ms,
                        success=True,
                        error=None,
                        input_data=input_data,
                        output_data=output_data,
                    )

                return result

            except Exception as e:
                # Record failed span
                end_time_wall = datetime.now(timezone.utc).isoformat()
                end_perf = time.perf_counter()
                duration_ms = (end_perf - start_perf) * 1000.0

                from bot.tracing.collector import get_collector

                collector = get_collector()
                if collector:
                    await collector.record_span(
                        span_id=span_id,
                        trace_id=trace_id,
                        parent_span_id=parent_span_id,
                        span_name=name,
                        start_time=start_time_wall,
                        end_time=end_time_wall,
                        duration_ms=duration_ms,
                        success=False,
                        error=str(e),
                        input_data=None,
                        output_data=None,
                    )

                raise

            finally:
                # Pop span from stack
                stack = _span_stack.get()
                if stack:
                    stack.pop()
                    _span_stack.set(stack)

        return wrapper

    return decorator


def get_current_trace_id() -> str | None:
    """Get the current trace ID from context."""
    return _trace_id.get()
