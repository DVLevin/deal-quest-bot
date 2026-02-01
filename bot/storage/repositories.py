"""Repository classes for database operations."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from bot.storage.insforge_client import InsForgeClient
from bot.storage.models import (
    AttemptModel,
    CasebookModel,
    GeneratedScenarioModel,
    LeadActivityModel,
    LeadRegistryModel,
    ScenarioSeenModel,
    SupportSessionModel,
    TrackProgressModel,
    UserMemoryModel,
    UserModel,
)

logger = logging.getLogger(__name__)


class UserRepo:
    def __init__(self, client: InsForgeClient) -> None:
        self.client = client
        self.table = "users"

    async def get_by_telegram_id(self, telegram_id: int) -> UserModel | None:
        rows = await self.client.query(
            self.table, filters={"telegram_id": telegram_id}, limit=1
        )
        if rows and isinstance(rows, list) and len(rows) > 0:
            return UserModel(**rows[0])
        return None

    async def create(self, user: UserModel) -> UserModel:
        data = user.model_dump(exclude_none=True, exclude={"id", "created_at", "updated_at"})
        result = await self.client.create(self.table, data)
        return UserModel(**result) if result else user

    async def update(self, telegram_id: int, **kwargs: Any) -> UserModel | None:
        kwargs["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await self.client.update(
            self.table, {"telegram_id": telegram_id}, kwargs
        )
        return UserModel(**result) if result else None

    async def update_xp(self, telegram_id: int, xp_to_add: int) -> UserModel | None:
        user = await self.get_by_telegram_id(telegram_id)
        if not user:
            return None
        new_xp = user.total_xp + xp_to_add
        # Calculate level: each level requires level*200 XP
        level = 1
        xp_remaining = new_xp
        while True:
            xp_needed = level * 200
            if xp_remaining < xp_needed:
                break
            xp_remaining -= xp_needed
            level += 1
        return await self.update(telegram_id, total_xp=new_xp, current_level=level)

    async def delete_by_telegram_id(self, telegram_id: int) -> None:
        await self.client.delete(self.table, {"telegram_id": telegram_id})


class UserMemoryRepo:
    def __init__(self, client: InsForgeClient) -> None:
        self.client = client
        self.table = "user_memory"

    async def get(self, telegram_id: int) -> UserMemoryModel | None:
        rows = await self.client.query(
            self.table, filters={"telegram_id": telegram_id}, limit=1
        )
        if rows and isinstance(rows, list) and len(rows) > 0:
            return UserMemoryModel(**rows[0])
        return None

    async def create_default(self, user_id: int, telegram_id: int, name: str = "") -> UserMemoryModel:
        default_memory = {
            "user_info": {
                "telegram_id": telegram_id,
                "name": name,
                "first_seen": datetime.now(timezone.utc).isoformat(),
                "total_sessions": 0,
            },
            "preferences": {
                "response_length": "medium",
                "preferred_tone": "professional",
            },
            "learning_profile": {
                "current_track": 1,
                "current_level": 1,
                "total_xp": 0,
                "scenarios_completed": 0,
                "average_score": None,
                "strongest_areas": [],
                "weakest_areas": [],
                "common_mistakes": [],
            },
            "deal_history": [],
            "recent_interactions": [],
            "patterns_noted": [],
            "recommendations": [],
        }
        data = {
            "user_id": user_id,
            "telegram_id": telegram_id,
            "memory_data": default_memory,
        }
        result = await self.client.create(self.table, data)
        return UserMemoryModel(**result) if result else UserMemoryModel(
            user_id=user_id, telegram_id=telegram_id, memory_data=default_memory
        )

    async def update_memory(self, telegram_id: int, memory_data: dict[str, Any]) -> None:
        await self.client.update(
            self.table,
            {"telegram_id": telegram_id},
            {"memory_data": memory_data, "updated_at": datetime.now(timezone.utc).isoformat()},
        )


class ScenariosSeenRepo:
    def __init__(self, client: InsForgeClient) -> None:
        self.client = client
        self.table = "scenarios_seen"

    async def get_seen_ids(self, telegram_id: int) -> list[str]:
        rows = await self.client.query(
            self.table,
            select="scenario_id",
            filters={"telegram_id": telegram_id},
        )
        if rows and isinstance(rows, list):
            return [r["scenario_id"] for r in rows]
        return []

    async def mark_seen(self, user_id: int, telegram_id: int, scenario_id: str) -> None:
        await self.client.upsert(
            self.table,
            {
                "user_id": user_id,
                "telegram_id": telegram_id,
                "scenario_id": scenario_id,
            },
        )

    async def reset(self, telegram_id: int) -> None:
        await self.client.delete(self.table, {"telegram_id": telegram_id})


class AttemptRepo:
    def __init__(self, client: InsForgeClient) -> None:
        self.client = client
        self.table = "attempts"

    async def create(self, attempt: AttemptModel) -> AttemptModel:
        data = attempt.model_dump(exclude_none=True, exclude={"id", "created_at", "user_response", "username"})
        # Ensure integer fields are ints (LLM may return floats)
        for field in ("score", "xp_earned"):
            if field in data:
                try:
                    data[field] = int(data[field])
                except (TypeError, ValueError):
                    data[field] = 0
        # Sanitize feedback_json: strip null bytes that PostgreSQL JSONB rejects
        if "feedback_json" in data and data["feedback_json"]:
            import json as _json
            raw = _json.dumps(data["feedback_json"], default=str)
            raw = raw.replace("\\u0000", "").replace("\x00", "")
            data["feedback_json"] = _json.loads(raw)
        result = await self.client.create(self.table, data)
        return AttemptModel(**result) if result else attempt

    async def get_for_scenario(self, telegram_id: int, scenario_id: str) -> list[AttemptModel]:
        rows = await self.client.query(
            self.table,
            filters={"telegram_id": telegram_id, "scenario_id": scenario_id},
            order="created_at.desc",
        )
        if rows and isinstance(rows, list):
            return [AttemptModel(**r) for r in rows]
        return []

    async def get_recent(self, telegram_id: int, limit: int = 10) -> list[AttemptModel]:
        rows = await self.client.query(
            self.table,
            filters={"telegram_id": telegram_id},
            order="created_at.desc",
            limit=limit,
        )
        if rows and isinstance(rows, list):
            return [AttemptModel(**r) for r in rows]
        return []

    async def get_all_recent(self, limit: int = 100) -> list[AttemptModel]:
        """Get recent attempts across all users (for team analytics)."""
        rows = await self.client.query(
            self.table,
            order="created_at.desc",
            limit=limit,
        )
        if rows and isinstance(rows, list):
            return [AttemptModel(**r) for r in rows]
        return []

    async def get_team_for_scenario(self, scenario_id: str) -> list[AttemptModel]:
        """Get all team answers for a specific scenario."""
        rows = await self.client.query(
            self.table,
            filters={"scenario_id": scenario_id},
            order="created_at.desc",
        )
        if rows and isinstance(rows, list):
            return [AttemptModel(**r) for r in rows]
        return []


class SupportSessionRepo:
    def __init__(self, client: InsForgeClient) -> None:
        self.client = client
        self.table = "support_sessions"

    async def create(self, session: SupportSessionModel) -> SupportSessionModel:
        data = session.model_dump(exclude_none=True, exclude={"id", "created_at"})
        result = await self.client.create(self.table, data)
        return SupportSessionModel(**result) if result else session


class TrackProgressRepo:
    def __init__(self, client: InsForgeClient) -> None:
        self.client = client
        self.table = "track_progress"

    async def get_progress(self, telegram_id: int, track_id: str) -> list[TrackProgressModel]:
        rows = await self.client.query(
            self.table,
            filters={"telegram_id": telegram_id, "track_id": track_id},
            order="level_id.asc",
        )
        if rows and isinstance(rows, list):
            return [TrackProgressModel(**r) for r in rows]
        return []

    async def get_level(self, telegram_id: int, track_id: str, level_id: str) -> TrackProgressModel | None:
        rows = await self.client.query(
            self.table,
            filters={"telegram_id": telegram_id, "track_id": track_id, "level_id": level_id},
            limit=1,
        )
        if rows and isinstance(rows, list) and len(rows) > 0:
            return TrackProgressModel(**rows[0])
        return None

    async def upsert_progress(
        self,
        user_id: int,
        telegram_id: int,
        track_id: str,
        level_id: str,
        *,
        status: str | None = None,
        score: int | None = None,
    ) -> None:
        existing = await self.get_level(telegram_id, track_id, level_id)
        now = datetime.now(timezone.utc).isoformat()

        if existing:
            updates: dict[str, Any] = {"updated_at": now}
            if status:
                updates["status"] = status
                if status == "completed":
                    updates["completed_at"] = now
            if score is not None and score > (existing.best_score or 0):
                updates["best_score"] = score
            updates["attempts_count"] = (existing.attempts_count or 0) + 1
            await self.client.update(
                self.table,
                {"telegram_id": telegram_id, "track_id": track_id, "level_id": level_id},
                updates,
            )
        else:
            data = {
                "user_id": user_id,
                "telegram_id": telegram_id,
                "track_id": track_id,
                "level_id": level_id,
                "status": status or "in_progress",
                "best_score": score or 0,
                "attempts_count": 1,
            }
            if status == "completed":
                data["completed_at"] = now
            await self.client.create(self.table, data)

    async def init_track(self, user_id: int, telegram_id: int, track_id: str, level_ids: list[str]) -> None:
        """Initialize track progress for all levels: first unlocked, rest locked."""
        for i, level_id in enumerate(level_ids):
            existing = await self.get_level(telegram_id, track_id, level_id)
            if not existing:
                await self.client.create(
                    self.table,
                    {
                        "user_id": user_id,
                        "telegram_id": telegram_id,
                        "track_id": track_id,
                        "level_id": level_id,
                        "status": "unlocked" if i == 0 else "locked",
                    },
                )


class LeadRegistryRepo:
    def __init__(self, client: InsForgeClient) -> None:
        self.client = client
        self.table = "lead_registry"

    async def create(self, lead: LeadRegistryModel) -> LeadRegistryModel:
        data = lead.model_dump(
            exclude_none=True,
            exclude={"id", "created_at", "updated_at", "followup_count"},
        )
        result = await self.client.create(self.table, data)
        return LeadRegistryModel(**result) if result else lead

    async def find_duplicate(
        self, telegram_id: int, prospect_name: str | None, prospect_company: str | None,
    ) -> LeadRegistryModel | None:
        """Find an existing lead that matches by name or company for this user."""
        if not prospect_name and not prospect_company:
            return None

        # Fetch user's recent leads and match in Python (PostgREST has limited fuzzy support)
        leads = await self.get_for_user(telegram_id, limit=50)
        for lead in leads:
            # Match by name (case-insensitive)
            if prospect_name and lead.prospect_name:
                if prospect_name.lower().strip() == lead.prospect_name.lower().strip():
                    return lead
                # Partial match: one name contains the other (e.g. "Arta" matches "Arta Ubaydullayeva")
                a, b = prospect_name.lower().strip(), lead.prospect_name.lower().strip()
                if len(a) > 2 and len(b) > 2 and (a in b or b in a):
                    return lead

            # Match by company (exact, case-insensitive)
            if (
                prospect_company
                and lead.prospect_company
                and prospect_company.lower().strip() == lead.prospect_company.lower().strip()
                and prospect_name  # only match by company if we also have a name context
            ):
                return lead

        return None

    async def get_for_user(self, telegram_id: int, limit: int = 20) -> list[LeadRegistryModel]:
        rows = await self.client.query(
            self.table,
            filters={"telegram_id": telegram_id},
            order="created_at.desc",
            limit=limit,
        )
        if rows and isinstance(rows, list):
            return [LeadRegistryModel(**r) for r in rows]
        return []

    async def get_all(self, limit: int = 50) -> list[LeadRegistryModel]:
        rows = await self.client.query(
            self.table,
            order="created_at.desc",
            limit=limit,
        )
        if rows and isinstance(rows, list):
            return [LeadRegistryModel(**r) for r in rows]
        return []

    async def get_by_id(self, lead_id: int) -> LeadRegistryModel | None:
        rows = await self.client.query(
            self.table, filters={"id": lead_id}, limit=1
        )
        if rows and isinstance(rows, list) and len(rows) > 0:
            return LeadRegistryModel(**rows[0])
        return None

    async def update_status(self, lead_id: int, status: str, notes: str | None = None) -> None:
        updates: dict[str, Any] = {
            "status": status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if notes is not None:
            updates["notes"] = notes
        await self.client.update(self.table, {"id": lead_id}, updates)

    async def update_lead(self, lead_id: int, **kwargs: Any) -> LeadRegistryModel | None:
        """Update arbitrary fields on a lead."""
        kwargs["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await self.client.update(self.table, {"id": lead_id}, kwargs)
        return LeadRegistryModel(**result) if result else None

    async def get_due_followups(self, now_iso: str) -> list[LeadRegistryModel]:
        """Get leads where next_followup <= now and status is active (not closed)."""
        try:
            rows = await self.client.query(
                self.table,
                filters={"next_followup": f"lte.{now_iso}"},
                order="next_followup.asc",
                limit=50,
            )
        except Exception:
            # Fallback: fetch all leads and filter in Python
            logger.warning("PostgREST lte filter failed, falling back to Python filtering")
            rows = await self.client.query(
                self.table,
                order="created_at.desc",
                limit=200,
            )

        if not rows or not isinstance(rows, list):
            return []

        leads = [LeadRegistryModel(**r) for r in rows]

        # Filter in Python: exclude closed, verify next_followup is due
        from datetime import datetime as _dt
        try:
            now_dt = _dt.fromisoformat(now_iso.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return []

        due = []
        for lead in leads:
            if lead.status in ("closed_won", "closed_lost"):
                continue
            if not lead.next_followup:
                continue
            try:
                followup_dt = _dt.fromisoformat(lead.next_followup.replace("Z", "+00:00"))
                if followup_dt <= now_dt:
                    due.append(lead)
            except (ValueError, TypeError):
                continue
        return due

    async def delete_lead(self, lead_id: int) -> None:
        """Delete a lead by ID."""
        await self.client.delete(self.table, {"id": lead_id})

    async def count_by_status(self) -> dict[str, int]:
        """Get lead counts grouped by status."""
        rows = await self.client.query(self.table, select="status")
        counts: dict[str, int] = {}
        if rows and isinstance(rows, list):
            for row in rows:
                s = row.get("status", "unknown")
                counts[s] = counts.get(s, 0) + 1
        return counts

    async def count_by_status_for_user(self, telegram_id: int) -> dict[str, int]:
        """Get lead counts grouped by status for a specific user."""
        rows = await self.client.query(
            self.table, select="status", filters={"telegram_id": telegram_id}
        )
        counts: dict[str, int] = {}
        if rows and isinstance(rows, list):
            for row in rows:
                s = row.get("status", "unknown")
                counts[s] = counts.get(s, 0) + 1
        return counts


class LeadActivityRepo:
    def __init__(self, client: InsForgeClient) -> None:
        self.client = client
        self.table = "lead_activity_log"

    async def create(self, activity: LeadActivityModel) -> LeadActivityModel:
        data = activity.model_dump(exclude_none=True, exclude={"id", "created_at"})
        result = await self.client.create(self.table, data)
        return LeadActivityModel(**result) if result else activity

    async def get_for_lead(self, lead_id: int, limit: int = 20) -> list[LeadActivityModel]:
        rows = await self.client.query(
            self.table,
            filters={"lead_id": lead_id},
            order="created_at.desc",
            limit=limit,
        )
        if rows and isinstance(rows, list):
            return [LeadActivityModel(**r) for r in rows]
        return []

    async def get_recent_for_user(self, telegram_id: int, limit: int = 10) -> list[LeadActivityModel]:
        rows = await self.client.query(
            self.table,
            filters={"telegram_id": telegram_id},
            order="created_at.desc",
            limit=limit,
        )
        if rows and isinstance(rows, list):
            return [LeadActivityModel(**r) for r in rows]
        return []


class CasebookRepo:
    def __init__(self, client: InsForgeClient) -> None:
        self.client = client
        self.table = "casebook"

    async def find_similar(self, persona_type: str, scenario_type: str, limit: int = 3) -> list[CasebookModel]:
        rows = await self.client.query(
            self.table,
            filters={"persona_type": persona_type, "scenario_type": scenario_type},
            order="quality_score.desc",
            limit=limit,
        )
        if rows and isinstance(rows, list):
            return [CasebookModel(**r) for r in rows]
        return []

    async def create(self, entry: CasebookModel) -> CasebookModel:
        data = entry.model_dump(exclude_none=True, exclude={"id", "created_at"})
        result = await self.client.create(self.table, data)
        return CasebookModel(**result) if result else entry


class GeneratedScenarioRepo:
    def __init__(self, client: InsForgeClient) -> None:
        self.client = client
        self.table = "generated_scenarios"

    async def get_all(self, limit: int = 100) -> list[GeneratedScenarioModel]:
        rows = await self.client.query(
            self.table,
            order="created_at.desc",
            limit=limit,
        )
        if rows and isinstance(rows, list):
            return [GeneratedScenarioModel(**r) for r in rows]
        return []

    async def get_unseen(self, seen_ids: list[str], limit: int = 50) -> list[GeneratedScenarioModel]:
        """Get generated scenarios not in the seen list."""
        all_scenarios = await self.get_all(limit=200)
        return [s for s in all_scenarios if s.scenario_id not in seen_ids][:limit]

    async def create(self, scenario: GeneratedScenarioModel) -> GeneratedScenarioModel:
        data = scenario.model_dump(exclude_none=True, exclude={"id", "created_at"})
        result = await self.client.create(self.table, data)
        return GeneratedScenarioModel(**result) if result else scenario

    async def increment_usage(self, scenario_id: str, score: int) -> None:
        """Increment times_used and update running avg_score."""
        rows = await self.client.query(
            self.table,
            filters={"scenario_id": scenario_id},
            limit=1,
        )
        if not rows or not isinstance(rows, list) or len(rows) == 0:
            return

        current = rows[0]
        times_used = current.get("times_used", 0) + 1
        old_avg = current.get("avg_score", 0.0)
        new_avg = ((old_avg * (times_used - 1)) + score) / times_used

        await self.client.update(
            self.table,
            {"scenario_id": scenario_id},
            {"times_used": times_used, "avg_score": round(new_avg, 2)},
        )

    async def count(self) -> int:
        rows = await self.client.query(self.table, select="id")
        if rows and isinstance(rows, list):
            return len(rows)
        return 0
