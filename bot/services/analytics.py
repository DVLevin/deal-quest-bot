"""Team Analytics Service — cross-team analysis and leaderboards."""

from __future__ import annotations

import logging
from typing import Any

from bot.storage.repositories import AttemptRepo, UserRepo

logger = logging.getLogger(__name__)


class TeamAnalyticsService:
    """Aggregate analytics across all team members."""

    def __init__(self, attempt_repo: AttemptRepo, user_repo: UserRepo) -> None:
        self.attempt_repo = attempt_repo
        self.user_repo = user_repo

    async def team_leaderboard(self) -> list[dict[str, Any]]:
        """Ranked team members by avg score + total XP."""
        users = await self.user_repo.client.query("users", select="*", order="total_xp.desc")
        users = users if isinstance(users, list) else []

        leaderboard = []
        for u in users:
            tg_id = u.get("telegram_id")
            if not tg_id:
                continue

            recent = await self.attempt_repo.get_recent(tg_id, 20)
            avg_score = sum(a.score for a in recent) / len(recent) if recent else 0
            total_attempts = len(recent)

            leaderboard.append({
                "username": u.get("username", "N/A"),
                "first_name": u.get("first_name", ""),
                "total_xp": u.get("total_xp", 0),
                "current_level": u.get("current_level", 1),
                "avg_score": round(avg_score, 1),
                "total_attempts": total_attempts,
            })

        # Sort by avg score (primary), then total XP
        leaderboard.sort(key=lambda x: (x["avg_score"], x["total_xp"]), reverse=True)
        return leaderboard

    async def scenario_difficulty_analysis(self) -> list[dict[str, Any]]:
        """Find hardest/easiest scenarios based on average scores across team."""
        all_attempts = await self.attempt_repo.client.query(
            "attempts", select="scenario_id,score,mode"
        )
        all_attempts = all_attempts if isinstance(all_attempts, list) else []

        scenario_data: dict[str, dict] = {}
        for a in all_attempts:
            sid = a.get("scenario_id", "?")
            if sid not in scenario_data:
                scenario_data[sid] = {"total_score": 0, "count": 0, "mode": a.get("mode", "?")}
            scenario_data[sid]["count"] += 1
            scenario_data[sid]["total_score"] += a.get("score", 0)

        results = []
        for sid, data in scenario_data.items():
            avg = data["total_score"] / data["count"] if data["count"] > 0 else 0
            results.append({
                "scenario_id": sid,
                "mode": data["mode"],
                "attempts": data["count"],
                "avg_score": round(avg, 1),
            })

        results.sort(key=lambda x: x["avg_score"])
        return results

    async def category_performance(self) -> dict[str, dict[str, Any]]:
        """Average scores by scenario category."""
        all_attempts = await self.attempt_repo.client.query(
            "attempts", select="scenario_id,score,feedback_json"
        )
        all_attempts = all_attempts if isinstance(all_attempts, list) else []

        # We'll approximate category from scenario_id prefix
        category_data: dict[str, dict] = {}
        for a in all_attempts:
            sid = a.get("scenario_id", "")
            # Infer category: learn_X_Y → learn, train_N → train, gen_X → generated
            if sid.startswith("learn_"):
                cat = "learn"
            elif sid.startswith("train_"):
                cat = "train"
            elif sid.startswith("gen_"):
                cat = "generated"
            else:
                cat = "other"

            if cat not in category_data:
                category_data[cat] = {"total_score": 0, "count": 0}
            category_data[cat]["count"] += 1
            category_data[cat]["total_score"] += a.get("score", 0)

        result = {}
        for cat, data in category_data.items():
            avg = data["total_score"] / data["count"] if data["count"] > 0 else 0
            result[cat] = {
                "attempts": data["count"],
                "avg_score": round(avg, 1),
            }
        return result

    async def user_improvement_report(self, telegram_id: int) -> dict[str, Any]:
        """Compare first 5 vs last 5 attempts to show improvement."""
        all_attempts = await self.attempt_repo.client.query(
            "attempts",
            select="score,created_at",
            filters={"telegram_id": telegram_id},
            order="created_at.asc",
        )
        all_attempts = all_attempts if isinstance(all_attempts, list) else []

        if len(all_attempts) < 2:
            return {"has_data": False, "message": "Not enough attempts for comparison."}

        first_5 = all_attempts[:5]
        last_5 = all_attempts[-5:]

        first_avg = sum(a.get("score", 0) for a in first_5) / len(first_5)
        last_avg = sum(a.get("score", 0) for a in last_5) / len(last_5)
        improvement = last_avg - first_avg

        return {
            "has_data": True,
            "first_avg": round(first_avg, 1),
            "last_avg": round(last_avg, 1),
            "improvement": round(improvement, 1),
            "total_attempts": len(all_attempts),
            "trend": "improving" if improvement > 5 else "declining" if improvement < -5 else "stable",
        }

    async def team_response_comparison(self, scenario_id: str) -> list[dict[str, Any]]:
        """How different people answered the same scenario."""
        attempts = await self.attempt_repo.get_team_for_scenario(scenario_id)

        results = []
        for a in attempts:
            results.append({
                "username": a.username or "unknown",
                "score": a.score,
                "user_response": (a.user_response or "")[:300],
                "xp_earned": a.xp_earned,
            })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results
