"""Pipeline context — shared state between agents in a pipeline run."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from bot.services.llm_router import LLMProvider

if TYPE_CHECKING:
    from bot.services.model_config import ModelConfigService


class PipelineContext:
    """Shared state for a pipeline execution.

    Carries LLM provider, knowledge base, user memory, and inter-agent results.

    Per-agent model resolution:
        When ``model_config`` is provided, ``get_llm_for_agent()`` checks for
        admin-configured model overrides.  The PipelineRunner calls this before
        each agent step and temporarily swaps ``default_llm`` so that agents
        transparently use the override via ``ctx.llm``.
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
        model_config: ModelConfigService | None = None,
    ) -> None:
        self.default_llm = llm
        self.knowledge_base = knowledge_base
        self.user_memory = user_memory or {}
        self.casebook_text = casebook_text
        self.scenario = scenario or {}
        self.user_message = user_message
        self.telegram_id = telegram_id
        self.user_id = user_id
        self.image_b64 = image_b64
        self._model_config = model_config

        # Inter-agent results storage
        self.results: dict[str, Any] = {}

    # ------------------------------------------------------------------
    # Backward-compatible property: agents access ctx.llm.complete(...)
    # ------------------------------------------------------------------

    @property
    def llm(self) -> LLMProvider:
        """Return the current LLM provider (may be swapped by PipelineRunner)."""
        return self.default_llm

    @llm.setter
    def llm(self, value: LLMProvider) -> None:
        """Allow direct assignment for backward compatibility."""
        self.default_llm = value

    # ------------------------------------------------------------------
    # Per-agent model resolution
    # ------------------------------------------------------------------

    async def get_llm_for_agent(self, agent_name: str) -> LLMProvider:
        """Get LLM provider for a specific agent (override or default).

        If a ``ModelConfigService`` is available and the agent has an active
        override, returns the override provider (always OpenRouter with the
        shared API key).  Otherwise returns the user's default provider.
        """
        if self._model_config:
            override_provider = await self._model_config.get_provider_for_agent(agent_name)
            if override_provider:
                return override_provider
        return self.default_llm

    def set_result(self, agent_name: str, result: Any) -> None:
        self.results[agent_name] = result

    def get_result(self, agent_name: str) -> Any:
        return self.results.get(agent_name)
