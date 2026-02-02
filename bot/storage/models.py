"""Pydantic data models for database entities."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class UserModel(BaseModel):
    id: int | None = None
    telegram_id: int
    username: str | None = None
    first_name: str | None = None
    provider: str = "openrouter"
    encrypted_api_key: str | None = None
    openrouter_model: str = "qwen/qwen3-coder"
    total_xp: int = 0
    current_level: int = 1
    streak_days: int = 0
    last_active_at: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class UserMemoryModel(BaseModel):
    id: int | None = None
    user_id: int | None = None
    telegram_id: int
    memory_data: dict[str, Any] = Field(default_factory=dict)
    created_at: str | None = None
    updated_at: str | None = None


class ScenarioSeenModel(BaseModel):
    id: int | None = None
    user_id: int | None = None
    telegram_id: int
    scenario_id: str
    seen_at: str | None = None


class AttemptModel(BaseModel):
    id: int | None = None
    user_id: int | None = None
    telegram_id: int
    scenario_id: str
    mode: str
    score: int = 0
    feedback_json: dict[str, Any] = Field(default_factory=dict)
    xp_earned: int = 0
    username: str | None = None
    user_response: str | None = None
    created_at: str | None = None


class SupportSessionModel(BaseModel):
    id: int | None = None
    user_id: int | None = None
    telegram_id: int
    input_text: str | None = None
    output_json: dict[str, Any] = Field(default_factory=dict)
    provider_used: str | None = None
    created_at: str | None = None


class TrackProgressModel(BaseModel):
    id: int | None = None
    user_id: int | None = None
    telegram_id: int
    track_id: str
    level_id: str
    status: str = "locked"
    best_score: int = 0
    attempts_count: int = 0
    completed_at: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class LeadRegistryModel(BaseModel):
    id: int | None = None
    user_id: int | None = None
    telegram_id: int
    prospect_name: str | None = None
    prospect_title: str | None = None
    prospect_company: str | None = None
    photo_url: str | None = None
    photo_key: str | None = None
    prospect_analysis: str | None = None
    closing_strategy: str | None = None
    engagement_tactics: str | None = None
    draft_response: str | None = None
    status: str = "analyzed"
    notes: str | None = None
    input_type: str = "text"
    original_context: str | None = None
    web_research: str | None = None
    engagement_plan: list[dict[str, Any]] | None = None
    last_contacted: str | None = None
    next_followup: str | None = None
    followup_count: int = 0
    created_at: str | None = None
    updated_at: str | None = None


class LeadActivityModel(BaseModel):
    id: int | None = None
    lead_id: int
    telegram_id: int
    activity_type: str  # context_update | screenshot_comment | ai_advice | followup_sent
    content: str
    ai_response: str | None = None
    created_at: str | None = None


class CasebookModel(BaseModel):
    id: int | None = None
    persona_type: str
    scenario_type: str
    industry: str | None = None
    seniority: str | None = None
    prospect_analysis: str | None = None
    closing_strategy: str | None = None
    engagement_tactics: str | None = None
    draft_response: str | None = None
    playbook_references: str | None = None
    quality_score: float = 0.0
    user_accepted_first_draft: bool = False
    user_feedback: str | None = None
    created_from_user: int | None = None
    created_at: str | None = None


class GeneratedScenarioModel(BaseModel):
    id: int | None = None
    scenario_id: str
    category: str = "general"
    difficulty: int = 2
    persona: dict[str, Any] = Field(default_factory=dict)
    situation: str = ""
    scoring_focus: list[str] = Field(default_factory=list)
    ideal_response: str = ""
    scoring_rubric: dict[str, Any] = Field(default_factory=dict)
    source_type: str = "hybrid"
    source_casebook_ids: list[int] = Field(default_factory=list)
    times_used: int = 0
    avg_score: float = 0.0
    created_at: str | None = None


class PipelineTraceModel(BaseModel):
    id: int | None = None
    trace_id: str
    pipeline_name: str
    telegram_id: int
    user_id: int | None = None
    start_time: str
    end_time: str
    duration_ms: float
    success: bool = True
    error: str | None = None
    created_at: str | None = None


class PipelineSpanModel(BaseModel):
    id: int | None = None
    span_id: str
    trace_id: str
    parent_span_id: str | None = None
    span_name: str
    start_time: str
    end_time: str
    duration_ms: float
    success: bool = True
    error: str | None = None
    input_data: dict[str, Any] | None = None
    output_data: dict[str, Any] | None = None
    created_at: str | None = None
