"""Agent registry — name-based agent lookup."""

from __future__ import annotations

import logging
from typing import Any

from bot.agents.base import BaseAgent

logger = logging.getLogger(__name__)


class AgentRegistry:
    """Register and retrieve agents by name."""

    def __init__(self) -> None:
        self._agents: dict[str, BaseAgent] = {}

    def register(self, agent: BaseAgent) -> None:
        self._agents[agent.name] = agent
        logger.info("Registered agent: %s", agent.name)

    def get(self, name: str) -> BaseAgent:
        agent = self._agents.get(name)
        if agent is None:
            raise KeyError(f"Agent not found: {name}. Available: {list(self._agents.keys())}")
        return agent

    def list_agents(self) -> list[str]:
        return list(self._agents.keys())
