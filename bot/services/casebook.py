"""Casebook service — find & store reusable strategy responses."""

from __future__ import annotations

import logging

from bot.storage.repositories import CasebookRepo
from bot.storage.models import CasebookModel

logger = logging.getLogger(__name__)


class CasebookService:
    """Manage casebook entries for similar-case lookups."""

    def __init__(self, repo: CasebookRepo) -> None:
        self.repo = repo

    async def find_similar(self, persona_type: str, scenario_type: str) -> str:
        """Find similar cases and return formatted text for prompt injection."""
        entries = await self.repo.find_similar(persona_type, scenario_type, limit=3)
        if not entries:
            return "No similar cases found in casebook."

        parts = []
        for i, entry in enumerate(entries, 1):
            parts.append(f"### Case {i}")
            parts.append(f"Persona: {entry.persona_type} ({entry.seniority or 'N/A'})")
            parts.append(f"Industry: {entry.industry or 'N/A'}")
            if entry.closing_strategy:
                parts.append(f"Strategy: {entry.closing_strategy[:200]}")
            if entry.draft_response:
                parts.append(f"Draft: {entry.draft_response[:200]}")
            parts.append(f"Quality: {entry.quality_score:.1f}")
            parts.append("")

        return "\n".join(parts)

    async def maybe_save(
        self,
        *,
        persona_type: str,
        scenario_type: str,
        industry: str | None,
        seniority: str | None,
        analysis: str,
        strategy: str,
        tactics: str,
        draft: str,
        playbook_refs: str,
        quality_score: float,
        accepted_first_draft: bool,
        user_feedback: str,
        telegram_id: int,
    ) -> bool:
        """Save to casebook if quality criteria met."""
        if quality_score < 0.7:
            return False
        if not accepted_first_draft:
            return False
        if user_feedback and user_feedback.lower() in ("negative", "bad", "poor"):
            return False

        entry = CasebookModel(
            persona_type=persona_type,
            scenario_type=scenario_type,
            industry=industry,
            seniority=seniority,
            prospect_analysis=analysis,
            closing_strategy=strategy,
            engagement_tactics=tactics,
            draft_response=draft,
            playbook_references=playbook_refs,
            quality_score=quality_score,
            user_accepted_first_draft=accepted_first_draft,
            user_feedback=user_feedback,
            created_from_user=telegram_id,
        )
        await self.repo.create(entry)
        logger.info("Saved casebook entry for %s/%s", persona_type, scenario_type)
        return True
