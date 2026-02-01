"""Engagement service — plan generation, comment generation, advice."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from bot.services.llm_router import LLMProvider, OpenRouterProvider, _extract_json
from bot.storage.models import LeadActivityModel, LeadRegistryModel

logger = logging.getLogger(__name__)

PROMPTS_DIR = Path(__file__).resolve().parent.parent.parent / "prompts"


def _load_prompt(name: str) -> str:
    path = PROMPTS_DIR / name
    return path.read_text(encoding="utf-8")


class EngagementService:
    """Generates engagement plans, comments, and advice for leads."""

    def __init__(self, openrouter_api_key: str) -> None:
        self.api_key = openrouter_api_key

    def _create_llm(self) -> LLMProvider:
        return OpenRouterProvider(self.api_key, model="moonshotai/kimi-k2.5")

    async def generate_plan(
        self, lead: LeadRegistryModel, research: str | None = None
    ) -> list[dict[str, Any]]:
        """Generate an engagement plan for a lead."""
        system_prompt = _load_prompt("engagement_plan.md")

        context_parts = []
        if lead.prospect_name:
            context_parts.append(f"Name: {lead.prospect_name}")
        if lead.prospect_title:
            context_parts.append(f"Title: {lead.prospect_title}")
        if lead.prospect_company:
            context_parts.append(f"Company: {lead.prospect_company}")
        if lead.prospect_analysis:
            context_parts.append(f"\nAnalysis:\n{lead.prospect_analysis}")
        if lead.closing_strategy:
            context_parts.append(f"\nStrategy:\n{lead.closing_strategy}")
        if research:
            context_parts.append(f"\nWeb Research:\n{research}")
        if lead.original_context:
            context_parts.append(f"\nOriginal Context:\n{lead.original_context}")

        user_message = "\n".join(context_parts)

        llm = self._create_llm()
        try:
            result = await llm.complete(system_prompt, user_message)

            # The result might be a list wrapped in a dict or directly a list
            if isinstance(result, dict):
                # Check if it contains a list at top level
                for key in ("steps", "plan", "engagement_plan"):
                    if key in result and isinstance(result[key], list):
                        return result[key]
                # If raw_response, try to parse as JSON array
                raw = result.get("raw_response", "")
                if raw:
                    try:
                        parsed = json.loads(raw)
                        if isinstance(parsed, list):
                            return parsed
                    except json.JSONDecodeError:
                        pass
                return []

            if isinstance(result, list):
                return result
            return []
        except Exception as e:
            logger.error("Failed to generate engagement plan: %s", e)
            return []
        finally:
            await llm.close()

    async def generate_comment(
        self,
        lead: LeadRegistryModel,
        screenshot_b64: str,
        research: str | None = None,
    ) -> str:
        """Generate LinkedIn comment options based on a screenshot."""
        system_prompt = _load_prompt("comment_generator.md")

        context_parts = [
            f"Prospect: {lead.prospect_name or 'Unknown'}",
            f"Title: {lead.prospect_title or 'N/A'}",
            f"Company: {lead.prospect_company or 'N/A'}",
            f"Status: {lead.status}",
        ]
        if research:
            context_parts.append(f"\nResearch:\n{research[:1000]}")

        user_message = "\n".join(context_parts)

        llm = self._create_llm()
        try:
            result = await llm.complete(
                system_prompt, user_message, image_b64=screenshot_b64
            )
            # Return as text
            if isinstance(result, dict):
                return result.get("raw_response", "") or json.dumps(result)
            return str(result)
        except Exception as e:
            logger.error("Failed to generate comment: %s", e)
            return f"Comment generation failed: {e}"
        finally:
            await llm.close()

    async def generate_advice(
        self,
        lead: LeadRegistryModel,
        activities: list[LeadActivityModel],
        new_context: str,
        research: str | None = None,
    ) -> str:
        """Generate advice based on lead context and new information."""
        system_prompt = _load_prompt("lead_advisor.md")

        context_parts = [
            f"Prospect: {lead.prospect_name or 'Unknown'}",
            f"Title: {lead.prospect_title or 'N/A'}",
            f"Company: {lead.prospect_company or 'N/A'}",
            f"Status: {lead.status}",
        ]

        if lead.prospect_analysis:
            context_parts.append(f"\nAnalysis:\n{lead.prospect_analysis[:500]}")

        if research:
            context_parts.append(f"\nWeb Research:\n{research[:1000]}")

        if lead.engagement_plan:
            plan_summary = []
            for step in lead.engagement_plan:
                status = step.get("status", "pending")
                icon = "done" if status == "done" else "pending"
                plan_summary.append(
                    f"  [{icon}] Step {step.get('step_id')}: {step.get('description', '')}"
                )
            context_parts.append(f"\nEngagement Plan:\n" + "\n".join(plan_summary))

        if activities:
            history_lines = []
            for act in activities[:10]:
                history_lines.append(
                    f"  [{act.activity_type}] {act.content[:200]}"
                )
                if act.ai_response:
                    history_lines.append(f"    AI: {act.ai_response[:200]}")
            context_parts.append(f"\nActivity History:\n" + "\n".join(history_lines))

        context_parts.append(f"\nNew Context from User:\n{new_context}")

        user_message = "\n".join(context_parts)

        llm = self._create_llm()
        try:
            result = await llm.complete(system_prompt, user_message)
            if isinstance(result, dict):
                return result.get("raw_response", "") or json.dumps(result)
            return str(result)
        except Exception as e:
            logger.error("Failed to generate advice: %s", e)
            return f"Advice generation failed: {e}"
        finally:
            await llm.close()
