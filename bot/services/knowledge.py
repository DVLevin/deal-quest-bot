"""Knowledge base loader — reads and caches playbook + company KB at startup."""

from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

_BASE_DIR = Path(__file__).resolve().parent.parent.parent / "data"


class KnowledgeService:
    """Loads and caches knowledge base files."""

    def __init__(self) -> None:
        self._playbook: str = ""
        self._company_knowledge: str = ""

    def load(self) -> None:
        """Load knowledge files from disk. Call once at startup."""
        playbook_path = _BASE_DIR / "playbook.md"
        company_path = _BASE_DIR / "company_knowledge.md"

        if playbook_path.exists():
            self._playbook = playbook_path.read_text(encoding="utf-8")
            logger.info("Loaded playbook: %d chars", len(self._playbook))
        else:
            logger.warning("playbook.md not found at %s", playbook_path)

        if company_path.exists():
            self._company_knowledge = company_path.read_text(encoding="utf-8")
            logger.info("Loaded company knowledge: %d chars", len(self._company_knowledge))
        else:
            logger.warning("company_knowledge.md not found at %s", company_path)

    @property
    def playbook(self) -> str:
        return self._playbook

    @property
    def company_knowledge(self) -> str:
        return self._company_knowledge

    @property
    def combined(self) -> str:
        """Combined knowledge for injection into prompts."""
        parts = []
        if self._playbook:
            parts.append("## Sales Playbook\n\n" + self._playbook)
        if self._company_knowledge:
            parts.append("## Company Knowledge\n\n" + self._company_knowledge)
        return "\n\n---\n\n".join(parts)
