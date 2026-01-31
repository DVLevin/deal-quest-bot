"""Strategist Agent — /support deal analysis."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from bot.agents.base import AgentInput, AgentOutput, BaseAgent
from bot.pipeline.context import PipelineContext

logger = logging.getLogger(__name__)

_PROMPT_PATH = Path(__file__).resolve().parent.parent.parent / "prompts" / "strategist_agent.md"


class StrategistAgent(BaseAgent):
    """Provides deep prospect analysis, closing strategy, engagement tactics, and draft outreach."""

    name = "strategist"

    def __init__(self) -> None:
        self._prompt_template: str = ""
        if _PROMPT_PATH.exists():
            self._prompt_template = _PROMPT_PATH.read_text(encoding="utf-8")
        else:
            logger.warning("Strategist prompt not found: %s", _PROMPT_PATH)

    async def run(self, input_data: AgentInput, pipeline_ctx: PipelineContext) -> AgentOutput:
        """Run strategist analysis on user's prospect context."""
        try:
            # Build system prompt with injected context
            system_prompt = self._prompt_template
            system_prompt = system_prompt.replace(
                "{KNOWLEDGE_BASE_PLACEHOLDER}",
                pipeline_ctx.knowledge_base or "No knowledge base available.",
            )

            memory_text = json.dumps(pipeline_ctx.user_memory, indent=2) if pipeline_ctx.user_memory else "No user memory available."
            system_prompt = system_prompt.replace(
                "{USER_MEMORY_PLACEHOLDER}",
                memory_text,
            )

            casebook_text = input_data.context.get("casebook_text", pipeline_ctx.casebook_text) or "No casebook entries."
            system_prompt = system_prompt.replace(
                "{CASEBOOK_PLACEHOLDER}",
                casebook_text,
            )

            # Call LLM (pass image if available for vision models)
            result = await pipeline_ctx.llm.complete(
                system_prompt, input_data.user_message, image_b64=pipeline_ctx.image_b64,
            )

            return AgentOutput(success=True, data=result)

        except Exception as e:
            logger.error("StrategistAgent error: %s", e)
            return AgentOutput(success=False, error=str(e))
