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
    LeadAnalysisHistoryModel,
    LeadRegistryModel,
    PipelineSpanModel,
    PipelineTraceModel,
    ScenarioSeenModel,
    ScheduledReminderModel,
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

    async def add_research_version(
        self, lead_id: int, query: str, url: str | None, content: str
    ) -> None:
        """Add a new web research version to a lead."""
        lead = await self.get_by_id(lead_id)
        if not lead:
            return

        now = datetime.now(timezone.utc).isoformat()

        # Initialize or get existing versions structure
        versions_data = lead.web_research_versions or {"versions": [], "current_version_id": 0}
        versions = versions_data.get("versions", [])

        # Calculate new version_id
        new_version_id = max((v.get("version_id", 0) for v in versions), default=0) + 1

        # Create new version entry
        new_version = {
            "version_id": new_version_id,
            "created_at": now,
            "query_used": query,
            "url_provided": url,
            "content": content,
        }

        versions.append(new_version)
        versions_data["versions"] = versions
        versions_data["current_version_id"] = new_version_id

        # Update both web_research_versions and legacy web_research field
        await self.update_lead(
            lead_id,
            web_research_versions=versions_data,
            web_research=content,
        )

    async def delete_research_version(self, lead_id: int, version_id: int) -> None:
        """Delete a specific web research version from a lead."""
        lead = await self.get_by_id(lead_id)
        if not lead:
            return

        versions_data = lead.web_research_versions
        if not versions_data:
            return

        versions = versions_data.get("versions", [])
        current_version_id = versions_data.get("current_version_id", 0)

        # Filter out the version to delete
        remaining_versions = [v for v in versions if v.get("version_id") != version_id]

        if len(remaining_versions) == len(versions):
            # Version not found, nothing to delete
            return

        versions_data["versions"] = remaining_versions

        # If deleted version was current, set current to most recent remaining (or None)
        if current_version_id == version_id:
            if remaining_versions:
                # Set to the most recent version (highest version_id)
                new_current = max(remaining_versions, key=lambda v: v.get("version_id", 0))
                versions_data["current_version_id"] = new_current.get("version_id", 0)
                current_content = new_current.get("content", "")
            else:
                versions_data["current_version_id"] = 0
                current_content = ""

            # Update legacy web_research to current version content
            await self.update_lead(
                lead_id,
                web_research_versions=versions_data,
                web_research=current_content if current_content else None,
            )
        else:
            # Just update versions, keep current web_research
            await self.update_lead(lead_id, web_research_versions=versions_data)


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


class LeadAnalysisHistoryRepo:
    """Repository for lead analysis version history."""

    MAX_VERSIONS = 5  # Keep last 5 versions per lead

    def __init__(self, client: InsForgeClient) -> None:
        self.client = client
        self.table = "lead_analysis_history"

    async def save_version(
        self,
        lead_id: int,
        telegram_id: int,
        analysis_snapshot: dict[str, Any],
        changes_summary: str | None = None,
        field_diff: dict[str, Any] | None = None,
        triggered_by: str = "initial",
        triggering_activity_id: int | None = None,
    ) -> LeadAnalysisHistoryModel:
        """Save a new analysis version. Auto-increments version_number."""
        # Get current max version
        rows = await self.client.query(
            self.table,
            select="version_number",
            filters={"lead_id": lead_id},
            order="version_number.desc",
            limit=1,
        )
        next_version = 1
        if rows and isinstance(rows, list) and len(rows) > 0:
            next_version = rows[0].get("version_number", 0) + 1

        data = {
            "lead_id": lead_id,
            "telegram_id": telegram_id,
            "version_number": next_version,
            "analysis_snapshot": analysis_snapshot,
            "changes_summary": changes_summary,
            "field_diff": field_diff,
            "triggered_by": triggered_by,
            "triggering_activity_id": triggering_activity_id,
        }
        result = await self.client.create(self.table, data)

        # Prune old versions beyond MAX_VERSIONS
        await self._prune_old_versions(lead_id)

        return LeadAnalysisHistoryModel(**result) if result else LeadAnalysisHistoryModel(**data)

    async def get_versions(self, lead_id: int, limit: int = 5) -> list[LeadAnalysisHistoryModel]:
        """Get analysis versions for a lead, newest first."""
        rows = await self.client.query(
            self.table,
            filters={"lead_id": lead_id},
            order="version_number.desc",
            limit=limit,
        )
        if rows and isinstance(rows, list):
            return [LeadAnalysisHistoryModel(**r) for r in rows]
        return []

    async def get_latest(self, lead_id: int) -> LeadAnalysisHistoryModel | None:
        """Get the most recent analysis version for a lead."""
        versions = await self.get_versions(lead_id, limit=1)
        return versions[0] if versions else None

    async def _prune_old_versions(self, lead_id: int) -> None:
        """Delete versions beyond MAX_VERSIONS (keep newest)."""
        rows = await self.client.query(
            self.table,
            select="id,version_number",
            filters={"lead_id": lead_id},
            order="version_number.desc",
        )
        if not rows or not isinstance(rows, list):
            return

        # Keep MAX_VERSIONS, delete the rest
        if len(rows) > self.MAX_VERSIONS:
            to_delete = rows[self.MAX_VERSIONS:]
            for row in to_delete:
                row_id = row.get("id")
                if row_id:
                    await self.client.delete(self.table, {"id": row_id})


class ScheduledReminderRepo:
    def __init__(self, client: InsForgeClient) -> None:
        self.client = client
        self.table = "scheduled_reminders"

    async def create(self, reminder: ScheduledReminderModel) -> ScheduledReminderModel:
        data = reminder.model_dump(exclude_none=True, exclude={"id", "created_at", "updated_at"})
        result = await self.client.create(self.table, data)
        return ScheduledReminderModel(**result) if result else reminder

    async def get_due_reminders(self, now_iso: str) -> list[ScheduledReminderModel]:
        """Get reminders where due_at <= now and status is pending or sent."""
        try:
            rows = await self.client.query(
                self.table,
                filters={"due_at": f"lte.{now_iso}", "status": "in.(pending,sent)"},
                order="due_at.asc",
                limit=50,
            )
        except Exception:
            # Fallback: fetch all active reminders and filter in Python
            logger.warning("PostgREST lte filter failed, falling back to Python filtering")
            rows = await self.client.query(
                self.table,
                filters={"status": "in.(pending,sent)"},
                order="due_at.asc",
                limit=200,
            )

        if not rows or not isinstance(rows, list):
            return []

        reminders = [ScheduledReminderModel(**r) for r in rows]

        # Filter in Python: verify due_at is due
        from datetime import datetime as _dt
        try:
            now_dt = _dt.fromisoformat(now_iso.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return []

        due = []
        for reminder in reminders:
            if not reminder.due_at:
                continue
            try:
                due_dt = _dt.fromisoformat(reminder.due_at.replace("Z", "+00:00"))
                if due_dt <= now_dt:
                    due.append(reminder)
            except (ValueError, TypeError):
                continue
        return due

    async def cancel_pending_for_lead(self, lead_id: int) -> None:
        """Cancel all pending/sent reminders for a lead (for idempotent re-scheduling)."""
        try:
            rows = await self.client.query(
                self.table,
                filters={"lead_id": lead_id, "status": "in.(pending,sent)"},
            )
        except Exception:
            # Fallback: fetch all for lead and filter in Python
            rows = await self.client.query(
                self.table,
                filters={"lead_id": lead_id},
            )
            if rows and isinstance(rows, list):
                rows = [r for r in rows if r.get("status") in ("pending", "sent")]

        if not rows or not isinstance(rows, list):
            return

        now = datetime.now(timezone.utc).isoformat()
        for row in rows:
            reminder_id = row.get("id")
            if reminder_id:
                await self.client.update(
                    self.table,
                    {"id": reminder_id},
                    {"status": "cancelled", "updated_at": now},
                )

    async def mark_reminded(self, reminder_id: int, now_iso: str) -> None:
        """Mark a reminder as having been sent (increment reminder_count)."""
        rows = await self.client.query(
            self.table,
            filters={"id": reminder_id},
            limit=1,
        )
        if not rows or not isinstance(rows, list) or len(rows) == 0:
            return

        current_count = rows[0].get("reminder_count", 0)
        await self.client.update(
            self.table,
            {"id": reminder_id},
            {
                "last_reminded_at": now_iso,
                "reminder_count": current_count + 1,
                "updated_at": now_iso,
            },
        )

    async def update_status(self, reminder_id: int, status: str) -> None:
        """Update reminder status. If completed, also set completed_at."""
        now = datetime.now(timezone.utc).isoformat()
        updates: dict[str, Any] = {"status": status, "updated_at": now}
        if status == "completed":
            updates["completed_at"] = now
        await self.client.update(self.table, {"id": reminder_id}, updates)

    async def snooze(self, reminder_id: int, new_due_iso: str) -> None:
        """Snooze a reminder by updating due_at and incrementing snooze_count."""
        rows = await self.client.query(
            self.table,
            filters={"id": reminder_id},
            limit=1,
        )
        if not rows or not isinstance(rows, list) or len(rows) == 0:
            return

        current_snooze = rows[0].get("snooze_count", 0)
        now = datetime.now(timezone.utc).isoformat()

        await self.client.update(
            self.table,
            {"id": reminder_id},
            {
                "due_at": new_due_iso,
                "status": "pending",
                "snooze_count": current_snooze + 1,
                "updated_at": now,
            },
        )

    async def delete_for_lead(self, lead_id: int) -> None:
        """Delete all reminders for a lead (cascade on lead deletion)."""
        await self.client.delete(self.table, {"lead_id": lead_id})

    async def get_for_lead(self, lead_id: int) -> list[ScheduledReminderModel]:
        """Get all reminders for a lead, ordered by step_id."""
        rows = await self.client.query(
            self.table,
            filters={"lead_id": lead_id},
            order="step_id.asc",
        )
        if rows and isinstance(rows, list):
            return [ScheduledReminderModel(**r) for r in rows]
        return []

    async def get_by_lead_and_step(self, lead_id: int, step_id: int) -> ScheduledReminderModel | None:
        """Get a specific reminder by lead_id and step_id."""
        rows = await self.client.query(
            self.table,
            filters={"lead_id": lead_id, "step_id": step_id},
            limit=1,
        )
        if rows and isinstance(rows, list) and len(rows) > 0:
            return ScheduledReminderModel(**rows[0])
        return None


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


class TraceRepo:
    """Repository for pipeline traces and spans."""

    def __init__(self, client: InsForgeClient) -> None:
        self.client = client
        self.traces_table = "pipeline_traces"
        self.spans_table = "pipeline_spans"

    async def create_trace(self, trace: PipelineTraceModel) -> PipelineTraceModel | None:
        data = trace.model_dump(exclude_none=True, exclude={"id", "created_at"})
        result = await self.client.create(self.traces_table, data)
        return PipelineTraceModel(**result) if result else trace

    async def create_span(self, span: PipelineSpanModel) -> PipelineSpanModel | None:
        data = span.model_dump(exclude_none=True, exclude={"id", "created_at"})
        result = await self.client.create(self.spans_table, data)
        return PipelineSpanModel(**result) if result else span

    async def get_traces(
        self,
        *,
        telegram_id: int | None = None,
        pipeline_name: str | None = None,
        limit: int = 20,
    ) -> list[PipelineTraceModel]:
        filters: dict[str, Any] = {}
        if telegram_id is not None:
            filters["telegram_id"] = telegram_id
        if pipeline_name is not None:
            filters["pipeline_name"] = pipeline_name
        rows = await self.client.query(
            self.traces_table,
            filters=filters if filters else None,
            order="created_at.desc",
            limit=limit,
        )
        if rows and isinstance(rows, list):
            return [PipelineTraceModel(**r) for r in rows]
        return []

    async def get_spans_for_trace(self, trace_id: str) -> list[PipelineSpanModel]:
        rows = await self.client.query(
            self.spans_table,
            filters={"trace_id": trace_id},
            order="start_time.asc",
        )
        if rows and isinstance(rows, list):
            return [PipelineSpanModel(**r) for r in rows]
        return []
