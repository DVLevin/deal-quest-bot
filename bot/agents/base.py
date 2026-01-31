"""Base agent ABC with typed I/O models."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel


class AgentInput(BaseModel):
    """Base input for all agents."""
    user_message: str = ""
    context: dict[str, Any] = {}


class AgentOutput(BaseModel):
    """Base output for all agents."""
    success: bool = True
    data: dict[str, Any] = {}
    error: str | None = None


class BaseAgent(ABC):
    """Abstract base agent."""

    name: str = "base"

    @abstractmethod
    async def run(self, input_data: AgentInput, pipeline_ctx: Any) -> AgentOutput:
        """Execute the agent's logic."""
        ...

    def __repr__(self) -> str:
        return f"<Agent:{self.name}>"
