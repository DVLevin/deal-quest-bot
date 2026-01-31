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
    created_at: str | None = None
    updated_at: str | None = None


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
