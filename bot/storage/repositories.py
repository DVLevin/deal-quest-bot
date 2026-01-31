"""Repository classes for database operations."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from bot.storage.insforge_client import InsForgeClient
from bot.storage.models import (
    AttemptModel,
    CasebookModel,
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
        data = attempt.model_dump(exclude_none=True, exclude={"id", "created_at"})
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
