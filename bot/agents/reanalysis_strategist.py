"""ReanalysisStrategistAgent — Re-analyze leads with new context."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from bot.agents.base import AgentInput, AgentOutput, BaseAgent
from bot.pipeline.context import PipelineContext
from bot.services.diff_utils import compute_analysis_diff, summarize_diff_for_humans
from bot.tracing import traced_span

logger = logging.getLogger(__name__)

_PROMPT_PATH = Path(__file__).resolve().parent.parent.parent / "prompts" / "reanalysis_strategist_agent.md"


class ReanalysisStrategistAgent(BaseAgent):
    """Re-analyzes a lead's strategy based on new context and prior analysis."""

    name = "reanalysis_strategist"

    def __init__(self) -> None:
        self._prompt_template: str = ""
        if _PROMPT_PATH.exists():
            self._prompt_template = _PROMPT_PATH.read_text(encoding="utf-8")
        else:
            logger.warning("Reanalysis strategist prompt not found: %s", _PROMPT_PATH)

    @traced_span("agent:reanalysis_strategist")
    async def run(self, input_data: AgentInput, pipeline_ctx: PipelineContext) -> AgentOutput:
        """
        Run re-analysis on a lead with new context.

        Expected input_data.context:
        - prior_analysis: dict (previous analysis JSON)
        - new_context_items: list[dict] (recent activity items)
        - lead_info: dict (basic prospect info)
        """
        try:
            prior_analysis = input_data.context.get("prior_analysis", {})
            new_context_items = input_data.context.get("new_context_items", [])
            lead_info = input_data.context.get("lead_info", {})

            # Build the user message with structured input
            user_message = self._build_user_message(
                prior_analysis, new_context_items, lead_info, input_data.user_message
            )

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

            # Call LLM
            result = await pipeline_ctx.llm.complete(system_prompt, user_message)

            # Parse the result
            parsed = self._parse_result(result)

            # Compute code-based diff (not relying on LLM)
            if prior_analysis and parsed.get("updated_analysis"):
                field_diff = compute_analysis_diff(
                    prior_analysis.get("analysis", prior_analysis),
                    parsed.get("updated_analysis", {}),
                )
                parsed["field_diff"] = field_diff
                parsed["field_diff_summary"] = summarize_diff_for_humans(field_diff)

            return AgentOutput(success=True, data=parsed)

        except Exception as e:
            logger.error("ReanalysisStrategistAgent error: %s", e)
            return AgentOutput(success=False, error=str(e))

    def _build_user_message(
        self,
        prior_analysis: dict[str, Any],
        new_context_items: list[dict[str, Any]],
        lead_info: dict[str, Any],
        user_note: str,
    ) -> str:
        """Build the user message with all context."""
        sections = []

        # Lead info
        name = lead_info.get("name", "Unknown")
        company = lead_info.get("company", "")
        title = lead_info.get("title", "")
        sections.append(f"## Lead: {name}")
        if company:
            sections.append(f"Company: {company}")
        if title:
            sections.append(f"Title: {title}")
        sections.append("")

        # Prior analysis
        sections.append("## Prior Analysis")
        if prior_analysis:
            sections.append("```json")
            sections.append(json.dumps(prior_analysis, indent=2, default=str)[:3000])
            sections.append("```")
        else:
            sections.append("No prior analysis available (this is the initial analysis).")
        sections.append("")

        # New context items
        sections.append("## New Context (Recent Activity)")
        if new_context_items:
            for i, item in enumerate(new_context_items, 1):
                activity_type = item.get("activity_type", "unknown")
                content = item.get("content", "")
                created_at = item.get("created_at", "")[:10] if item.get("created_at") else ""

                type_label = {
                    "prospect_response": "Prospect Response",
                    "meeting_notes": "Meeting Notes",
                    "context_update": "Context Update",
                    "screenshot_comment": "Screenshot Analysis",
                }.get(activity_type, activity_type.replace("_", " ").title())

                sections.append(f"### {i}. {type_label} ({created_at})")
                sections.append(content[:1500])
                sections.append("")
        else:
            sections.append("No new context provided.")
        sections.append("")

        # User note (if any)
        if user_note and user_note.strip():
            sections.append("## User's Note")
            sections.append(user_note)
            sections.append("")

        sections.append("## Your Task")
        sections.append("Re-analyze this lead with the new context. Start with WHAT CHANGED summary, then provide the updated analysis.")

        return "\n".join(sections)

    def _parse_result(self, result: str) -> dict[str, Any]:
        """Parse the LLM result, extracting JSON if present."""
        if not result:
            return {}

        # Try to extract JSON from the result
        result = result.strip()

        # Look for JSON block
        if "```json" in result:
            start = result.find("```json") + 7
            end = result.find("```", start)
            if end > start:
                json_str = result[start:end].strip()
                try:
                    return json.loads(json_str)
                except json.JSONDecodeError:
                    pass

        # Try parsing the whole thing as JSON
        if result.startswith("{"):
            try:
                return json.loads(result)
            except json.JSONDecodeError:
                pass

        # Fall back to returning raw text
        return {"raw_response": result}
