"""Per-agent model configuration service with in-memory caching.

Admin model overrides always use the shared OpenRouter API key
(from cfg.openrouter_api_key). This avoids cross-provider issues.
Changes take effect within 60 seconds via TTL cache.
"""

from __future__ import annotations

import logging
import time
from typing import Any

from bot.services.llm_router import LLMProvider, create_provider
from bot.storage.repositories import AgentModelConfigRepo

logger = logging.getLogger(__name__)


class ModelConfigService:
    """Manages per-agent model overrides with 60-second TTL cache."""

    CACHE_TTL = 60  # seconds

    def __init__(self, config_repo: AgentModelConfigRepo, shared_openrouter_key: str) -> None:
        self._repo = config_repo
        self._shared_key = shared_openrouter_key
        self._cache: dict[str, dict[str, Any]] = {}
        self._cache_time: float = 0
        self._provider_cache: dict[str, LLMProvider] = {}

    async def get_override(self, agent_name: str) -> dict[str, Any] | None:
        """Get model override for a specific agent, or None if no override."""
        await self._refresh_if_stale()
        return self._cache.get(agent_name)

    async def get_all(self) -> dict[str, dict[str, Any]]:
        """Get all active model overrides."""
        await self._refresh_if_stale()
        return dict(self._cache)

    async def get_provider_for_agent(self, agent_name: str) -> LLMProvider | None:
        """Get an LLM provider for an agent's override, or None for default."""
        override = await self.get_override(agent_name)
        if not override or not self._shared_key:
            return None

        model_id = override["model_id"]
        if model_id not in self._provider_cache:
            self._provider_cache[model_id] = create_provider(
                "openrouter", self._shared_key, model=model_id
            )
        return self._provider_cache[model_id]

    async def _refresh_if_stale(self) -> None:
        """Refresh cache from database if TTL expired."""
        if time.time() - self._cache_time < self.CACHE_TTL:
            return
        try:
            rows = await self._repo.get_all_active()
            self._cache = {r["agent_name"]: r for r in rows}
            self._cache_time = time.time()
            logger.debug("Model config cache refreshed: %d overrides", len(self._cache))
        except Exception as e:
            logger.error("Failed to refresh model config cache: %s", e)

    async def close(self) -> None:
        """Close cached provider instances."""
        for provider in self._provider_cache.values():
            try:
                await provider.close()
            except Exception:
                pass
        self._provider_cache.clear()
