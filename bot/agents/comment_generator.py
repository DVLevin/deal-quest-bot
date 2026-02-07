"""Comment Generator Agent -- multi-platform draft generation from screenshots."""

from __future__ import annotations

import logging
from pathlib import Path

from bot.agents.base import AgentInput, AgentOutput, BaseAgent
from bot.pipeline.context import PipelineContext
from langfuse import observe

logger = logging.getLogger(__name__)

_PROMPT_PATH = Path(__file__).resolve().parent.parent.parent / "prompts" / "comment_generator_agent.md"


class CommentGeneratorAgent(BaseAgent):
    """Generates contextual response drafts from screenshots."""

    name = "comment_generator"

    def __init__(self) -> None:
        self._prompt: str = ""
        if _PROMPT_PATH.exists():
            self._prompt = _PROMPT_PATH.read_text(encoding="utf-8")
        else:
            logger.warning("Comment generator prompt not found: %s", _PROMPT_PATH)
            self._prompt = (
                "Analyze the screenshot and generate 3 contextual response options "
                "(short, medium, detailed). Return JSON with platform, content_type, "
                "and options array."
            )

    @observe(name="agent:comment_generator")
    async def run(self, input_data: AgentInput, pipeline_ctx: PipelineContext) -> AgentOutput:
        """Generate draft responses from a screenshot."""
        try:
            if not pipeline_ctx.image_b64:
                return AgentOutput(success=False, error="No image provided for draft generation")

            lead_context = input_data.context.get("lead_context", {})
            parts = []
            parts.append("Analyze this screenshot and generate contextual response options.")
            parts.append("")

            if lead_context:
                parts.append("**Lead Context:**")
                if lead_context.get("name"):
                    parts.append(f"- Name: {lead_context['name']}")
                if lead_context.get("title"):
                    parts.append(f"- Title: {lead_context['title']}")
                if lead_context.get("company"):
                    parts.append(f"- Company: {lead_context['company']}")
                if lead_context.get("status"):
                    parts.append(f"- Relationship: {lead_context['status']}")
                if lead_context.get("web_research"):
                    parts.append(f"\n**Background Research:**\n{lead_context['web_research']}")

            user_message = "\n".join(parts)

            result = await pipeline_ctx.llm.complete(
                self._prompt,
                user_message,
                image_b64=pipeline_ctx.image_b64,
            )

            if isinstance(result, dict) and "options" in result:
                options = result.get("options", [])
                if isinstance(options, list) and len(options) > 0:
                    return AgentOutput(success=True, data=result)

            if isinstance(result, dict) and "raw_response" in result:
                logger.warning(
                    "CommentGenerator got raw_response instead of structured JSON: %s",
                    str(result.get("raw_response", ""))[:200],
                )
                return AgentOutput(
                    success=False,
                    error="AI did not return structured draft options. Try regenerating.",
                    data=result,
                )

            logger.warning("CommentGenerator unexpected result structure: %s", type(result))
            return AgentOutput(success=False, error="Unexpected response format from AI")

        except Exception as e:
            logger.error("CommentGeneratorAgent error: %s", e)
            return AgentOutput(success=False, error=str(e))
