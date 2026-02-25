"""Agent configuration models and loader for the v2.0 agent system."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel

logger = logging.getLogger(__name__)

_AGENTS_YAML_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "agents.yaml"


class ToolParam(BaseModel):
    """OpenAI-format tool parameter definition for a single tool."""

    name: str
    description: str
    parameters: dict[str, Any]  # JSON Schema object for tool parameters


class AgentConfig(BaseModel):
    """Configuration for a single agent, with defaults merged in at load time."""

    name: str
    description: str = ""
    prompt_file: str = ""
    model: str = "moonshotai/kimi-k2.5"
    max_iterations: int = 10
    timeout_seconds: int = 60
    temperature: float = 0.7
    fallback_behavior: str = "return_error"
    context_sources: list[str] = []
    tools: list[ToolParam] = []


class AgentsConfig(BaseModel):
    """Top-level config container — defaults section plus named agent entries."""

    defaults: dict[str, Any] = {}
    agents: dict[str, AgentConfig] = {}


def load_agents_config() -> AgentsConfig:
    """Load agents.yaml, merge defaults into each agent, return a validated AgentsConfig.

    Merge semantics: agent-level values override global defaults.
    Config is intended to be loaded once at startup — no hot-reload.
    """
    if not _AGENTS_YAML_PATH.exists():
        raise FileNotFoundError(f"Agents config not found: {_AGENTS_YAML_PATH}")

    with open(_AGENTS_YAML_PATH, encoding="utf-8") as f:
        raw = yaml.safe_load(f)

    defaults: dict[str, Any] = raw.get("defaults", {})
    raw_agents: dict[str, Any] = raw.get("agents", {})

    agents: dict[str, AgentConfig] = {}
    for key, agent_cfg in raw_agents.items():
        # Merge: defaults first, agent values override, then inject the name key
        merged: dict[str, Any] = {**defaults, **(agent_cfg or {}), "name": key}
        agents[key] = AgentConfig(**merged)

    config = AgentsConfig(defaults=defaults, agents=agents)
    logger.info("Loaded %d agents from agents.yaml: %s", len(agents), list(agents.keys()))
    return config
