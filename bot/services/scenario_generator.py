"""Scenario Generator Service — LLM-based dynamic scenario creation."""

from __future__ import annotations

import json
import logging
import random
import string
from pathlib import Path

from bot.services.knowledge import KnowledgeService
from bot.storage.models import GeneratedScenarioModel
from bot.storage.repositories import CasebookRepo, GeneratedScenarioRepo

logger = logging.getLogger(__name__)

_PROMPT_PATH = Path(__file__).resolve().parent.parent.parent / "prompts" / "scenario_generator.md"


class ScenarioGeneratorService:
    """Generate training scenarios from casebook + company knowledge via LLM."""

    def __init__(
        self,
        casebook_repo: CasebookRepo,
        scenario_repo: GeneratedScenarioRepo,
        knowledge: KnowledgeService,
        openrouter_api_key: str,
    ) -> None:
        self.casebook_repo = casebook_repo
        self.scenario_repo = scenario_repo
        self.knowledge = knowledge
        self.api_key = openrouter_api_key

    async def generate_batch(self, count: int = 5) -> list[GeneratedScenarioModel]:
        """Generate a batch of scenarios via LLM, validate, and save to DB."""
        from bot.services.llm_router import OpenRouterProvider, _extract_json

        # Load prompt template
        if not _PROMPT_PATH.exists():
            logger.error("Scenario generator prompt not found at %s", _PROMPT_PATH)
            return []

        prompt_template = _PROMPT_PATH.read_text(encoding="utf-8")

        # Gather casebook context
        casebook_entries = await self.casebook_repo.client.query(
            "casebook",
            select="persona_type,scenario_type,industry,seniority,closing_strategy",
            order="quality_score.desc",
            limit=10,
        )
        casebook_entries = casebook_entries if isinstance(casebook_entries, list) else []

        casebook_text = ""
        if casebook_entries:
            for i, entry in enumerate(casebook_entries, 1):
                casebook_text += (
                    f"Case {i}: {entry.get('persona_type', 'N/A')} / "
                    f"{entry.get('scenario_type', 'N/A')} "
                    f"({entry.get('industry', 'N/A')}, {entry.get('seniority', 'N/A')})\n"
                )
                strategy = entry.get("closing_strategy", "")
                if strategy:
                    casebook_text += f"  Strategy: {str(strategy)[:200]}\n"
        else:
            casebook_text = "No casebook entries available yet."

        # Build final prompt
        system_prompt = (
            prompt_template
            .replace("{KNOWLEDGE_BASE_PLACEHOLDER}", self.knowledge.combined[:3000])
            .replace("{CASEBOOK_PLACEHOLDER}", casebook_text)
            .replace("{COUNT}", str(count))
        )

        # Call LLM
        llm = OpenRouterProvider(self.api_key, model="moonshotai/kimi-k2.5")
        try:
            result = await llm.complete(
                system_prompt,
                f"Generate {count} unique training scenarios now. Return only the JSON array.",
            )
        except Exception as e:
            logger.error("Scenario generation LLM call failed: %s", e)
            await llm.close()
            return []
        finally:
            await llm.close()

        # Parse and validate
        scenarios: list[GeneratedScenarioModel] = []

        # Result could be a dict with the array inside, or parsed directly
        raw_list: list[dict] = []
        if isinstance(result, dict):
            # Check if it's wrapped
            if "scenarios" in result:
                raw_list = result["scenarios"]
            elif "raw_response" in result:
                # Try to parse the raw response as a JSON array
                try:
                    parsed = json.loads(result["raw_response"])
                    if isinstance(parsed, list):
                        raw_list = parsed
                except (json.JSONDecodeError, TypeError):
                    logger.error("Failed to parse scenario generation response")
                    return []
            else:
                # Single scenario wrapped in dict
                raw_list = [result]
        elif isinstance(result, list):
            raw_list = result

        for item in raw_list:
            if not isinstance(item, dict):
                continue

            # Ensure unique ID
            scenario_id = item.get("id", "")
            if not scenario_id or not scenario_id.startswith("gen_"):
                scenario_id = "gen_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=8))

            # Validate required fields
            persona = item.get("persona", {})
            situation = item.get("situation", "")
            if not situation or not persona:
                continue

            try:
                model = GeneratedScenarioModel(
                    scenario_id=scenario_id,
                    category=item.get("category", "general"),
                    difficulty=min(max(int(item.get("difficulty", 2)), 1), 3),
                    persona=persona,
                    situation=situation,
                    scoring_focus=item.get("scoring_focus", []),
                    ideal_response=item.get("ideal_response", ""),
                    scoring_rubric=item.get("scoring_rubric", {}),
                    source_type="hybrid" if casebook_entries else "knowledge_based",
                    source_casebook_ids=[],
                )
                await self.scenario_repo.create(model)
                scenarios.append(model)
                logger.info("Created generated scenario: %s", scenario_id)
            except Exception as e:
                logger.warning("Failed to save generated scenario %s: %s", scenario_id, e)

        logger.info("Generated %d/%d scenarios", len(scenarios), count)
        return scenarios

    async def ensure_pool_size(self, min_size: int = 20) -> None:
        """Check the pool size and generate more if below threshold."""
        current_count = await self.scenario_repo.count()
        if current_count < min_size:
            deficit = min_size - current_count
            batch_size = min(deficit, 5)  # Generate in batches of 5
            logger.info(
                "Generated scenario pool below threshold (%d/%d), generating %d more",
                current_count, min_size, batch_size,
            )
            await self.generate_batch(batch_size)
