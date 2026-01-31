"""Memory Agent — background async memory updates."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from bot.agents.base import AgentInput, AgentOutput, BaseAgent
from bot.pipeline.context import PipelineContext

logger = logging.getLogger(__name__)

_PROMPT_PATH = Path(__file__).resolve().parent.parent.parent / "prompts" / "memory_agent.md"


class MemoryAgent(BaseAgent):
    """Updates user memory after interactions — runs in background."""

    name = "memory"

    def __init__(self) -> None:
        self._prompt_template: str = ""
        if _PROMPT_PATH.exists():
            self._prompt_template = _PROMPT_PATH.read_text(encoding="utf-8")
        else:
            logger.warning("Memory prompt not found: %s", _PROMPT_PATH)

    async def run(self, input_data: AgentInput, pipeline_ctx: PipelineContext) -> AgentOutput:
        """Update user memory based on the interaction results."""
        try:
            # Get the result from previous agents
            strategist_output = input_data.context.get("strategist_output")
            trainer_output = input_data.context.get("trainer_output")

            # Build the interaction summary for memory update
            memory_data = dict(pipeline_ctx.user_memory) if pipeline_ctx.user_memory else {}

            # Ensure structure
            if "recent_interactions" not in memory_data:
                memory_data["recent_interactions"] = []
            if "learning_profile" not in memory_data:
                memory_data["learning_profile"] = {
                    "total_xp": 0,
                    "scenarios_completed": 0,
                    "average_score": None,
                    "strongest_areas": [],
                    "weakest_areas": [],
                    "common_mistakes": [],
                }
            if "user_info" not in memory_data:
                memory_data["user_info"] = {}

            now = datetime.now(timezone.utc).isoformat()

            # Update based on interaction type
            if strategist_output:
                output_data = strategist_output.data if hasattr(strategist_output, "data") else strategist_output
                interaction = {
                    "timestamp": now,
                    "mode": "support",
                    "query_type": output_data.get("analysis", {}).get("key_concern", "general"),
                    "prospect_type": output_data.get("analysis", {}).get("prospect_type", "unknown"),
                }
                memory_data["recent_interactions"].append(interaction)

            elif trainer_output:
                output_data = trainer_output.data if hasattr(trainer_output, "data") else trainer_output
                score = output_data.get("total_score", 0)
                xp = output_data.get("xp_earned", 0)

                interaction = {
                    "timestamp": now,
                    "mode": "train",
                    "scenario_id": pipeline_ctx.scenario.get("id", "unknown") if pipeline_ctx.scenario else "unknown",
                    "score": score,
                }
                memory_data["recent_interactions"].append(interaction)

                # Update learning profile
                lp = memory_data["learning_profile"]
                lp["total_xp"] = lp.get("total_xp", 0) + xp
                lp["scenarios_completed"] = lp.get("scenarios_completed", 0) + 1

                # Recalculate average score
                completed = lp["scenarios_completed"]
                old_avg = lp.get("average_score") or 0
                lp["average_score"] = round(
                    (old_avg * (completed - 1) + score) / completed, 1
                ) if completed > 0 else score

            # Trim to last 20 interactions
            if len(memory_data["recent_interactions"]) > 20:
                memory_data["recent_interactions"] = memory_data["recent_interactions"][-20:]

            # Update session count
            memory_data["user_info"]["total_sessions"] = memory_data["user_info"].get("total_sessions", 0) + 1

            return AgentOutput(
                success=True,
                data={
                    "action": "update_memory",
                    "user_id": pipeline_ctx.telegram_id,
                    "updated_memory": memory_data,
                },
            )

        except Exception as e:
            logger.error("MemoryAgent error: %s", e)
            return AgentOutput(success=False, error=str(e))
