"""Pipeline context — shared state between agents in a pipeline run."""

from __future__ import annotations

from typing import Any

from bot.services.llm_router import LLMProvider


class PipelineContext:
    """Shared state for a pipeline execution.

    Carries LLM provider, knowledge base, user memory, and inter-agent results.
    """

    def __init__(
        self,
        *,
        llm: LLMProvider,
        knowledge_base: str = "",
        user_memory: dict[str, Any] | None = None,
        casebook_text: str = "",
        scenario: dict[str, Any] | None = None,
        user_message: str = "",
        telegram_id: int = 0,
        user_id: int = 0,
        image_b64: str | None = None,
    ) -> None:
        self.llm = llm
        self.knowledge_base = knowledge_base
        self.user_memory = user_memory or {}
        self.casebook_text = casebook_text
        self.scenario = scenario or {}
        self.user_message = user_message
        self.telegram_id = telegram_id
        self.user_id = user_id
        self.image_b64 = image_b64

        # Inter-agent results storage
        self.results: dict[str, Any] = {}

    def set_result(self, agent_name: str, result: Any) -> None:
        self.results[agent_name] = result

    def get_result(self, agent_name: str) -> Any:
        return self.results.get(agent_name)
