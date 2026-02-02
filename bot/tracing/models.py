"""Pydantic data models for traces and spans."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class TraceModel(BaseModel):
    """Model for a complete pipeline trace."""

    trace_id: str
    pipeline_name: str
    telegram_id: int
    user_id: int
    start_time: str  # ISO timestamp
    end_time: str  # ISO timestamp
    duration_ms: float
    success: bool = True
    error: str | None = None
    created_at: str | None = None


class SpanModel(BaseModel):
    """Model for a single span within a trace."""

    span_id: str
    trace_id: str
    parent_span_id: str | None = None
    span_name: str
    start_time: str  # ISO timestamp
    end_time: str  # ISO timestamp
    duration_ms: float
    success: bool = True
    error: str | None = None
    input_data: dict[str, Any] | None = None
    output_data: dict[str, Any] | None = None
    created_at: str | None = None
