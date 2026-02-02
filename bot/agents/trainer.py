"""Trainer Agent — /learn and /train scoring."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from bot.agents.base import AgentInput, AgentOutput, BaseAgent
from bot.pipeline.context import PipelineContext
from bot.tracing import traced_span

logger = logging.getLogger(__name__)

_PROMPT_PATH = Path(__file__).resolve().parent.parent.parent / "prompts" / "trainer_agent.md"


class TrainerAgent(BaseAgent):
    """Scores user responses against scenario rubrics and provides feedback."""

    name = "trainer"

    def __init__(self) -> None:
        self._prompt_template: str = ""
        if _PROMPT_PATH.exists():
            self._prompt_template = _PROMPT_PATH.read_text(encoding="utf-8")
        else:
            logger.warning("Trainer prompt not found: %s", _PROMPT_PATH)

    @traced_span("agent:trainer")
    async def run(self, input_data: AgentInput, pipeline_ctx: PipelineContext) -> AgentOutput:
        """Score user's response against the scenario rubric."""
        try:
            # Build system prompt
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

            scenario = pipeline_ctx.scenario or input_data.context.get("scenario", {})
            scenario_text = json.dumps(scenario, indent=2) if scenario else "No scenario provided."
            system_prompt = system_prompt.replace(
                "{SCENARIO_PLACEHOLDER}",
                scenario_text,
            )

            # Build user message with their response
            user_msg = f"Score this response to the scenario:\n\n{input_data.user_message}"

            # Call LLM
            result = await pipeline_ctx.llm.complete(system_prompt, user_msg)

            # Ensure required fields with type validation
            try:
                result["total_score"] = int(result.get("total_score", 0))
            except (TypeError, ValueError):
                result["total_score"] = 0
            result["total_score"] = max(0, min(100, result["total_score"]))

            if "xp_earned" not in result:
                result["xp_earned"] = result["total_score"]
            try:
                result["xp_earned"] = int(result["xp_earned"])
            except (TypeError, ValueError):
                result["xp_earned"] = result["total_score"]

            return AgentOutput(success=True, data=result)

        except Exception as e:
            logger.error("TrainerAgent error: %s", e)
            return AgentOutput(success=False, error=str(e))
