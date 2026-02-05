"""Extraction Agent — focused OCR for prospect screenshots."""

from __future__ import annotations

import logging
from pathlib import Path

from bot.agents.base import AgentInput, AgentOutput, BaseAgent
from bot.pipeline.context import PipelineContext
from bot.tracing import traced_span

logger = logging.getLogger(__name__)

_PROMPT_PATH = Path(__file__).resolve().parent.parent.parent / "prompts" / "extraction_agent.md"


class ExtractionAgent(BaseAgent):
    """Lightweight OCR agent - extracts structured data from screenshots.

    This agent uses a focused prompt WITHOUT knowledge base injection.
    Its only job is to read the image and extract clean structured data.
    The strategic analysis happens in a separate StrategistAgent call.
    """

    name = "extraction"

    def __init__(self) -> None:
        self._prompt: str = ""
        if _PROMPT_PATH.exists():
            self._prompt = _PROMPT_PATH.read_text(encoding="utf-8")
        else:
            logger.warning("Extraction prompt not found: %s", _PROMPT_PATH)
            # Fallback minimal prompt
            self._prompt = (
                "Extract visible information from this screenshot. "
                "Return JSON with fields: first_name, last_name, title, company, geography, context. "
                "Use null for fields not visible."
            )

    @traced_span("agent:extraction")
    async def run(self, input_data: AgentInput, pipeline_ctx: PipelineContext) -> AgentOutput:
        """Extract structured data from a screenshot."""
        try:
            if not pipeline_ctx.image_b64:
                return AgentOutput(
                    success=False,
                    error="No image provided for extraction",
                )

            # Simple user message - the prompt does the heavy lifting
            user_message = (
                input_data.user_message
                or "Extract all visible prospect information from this screenshot."
            )

            result = await pipeline_ctx.llm.complete(
                self._prompt,
                user_message,
                image_b64=pipeline_ctx.image_b64,
            )

            # Validate we got the expected fields
            expected_fields = {"first_name", "last_name", "title", "company", "geography", "context"}
            if isinstance(result, dict):
                # Check if we got actual extraction data vs error
                if "raw_response" in result and len(result) == 1:
                    logger.warning("Extraction returned raw response: %s", result.get("raw_response", "")[:100])

                # Ensure all expected fields exist (with None as default)
                for field in expected_fields:
                    if field not in result:
                        result[field] = None

            return AgentOutput(success=True, data=result)

        except Exception as e:
            logger.error("ExtractionAgent error: %s", e)
            return AgentOutput(success=False, error=str(e))
