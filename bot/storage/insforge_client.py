"""Async HTTP client for InsForge PostgREST API."""

from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class InsForgeClient:
    """Async wrapper around InsForge PostgREST REST API."""

    def __init__(self, base_url: str, anon_key: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.anon_key = anon_key
        self._client: httpx.AsyncClient | None = None

    @property
    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.anon_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Prefer": "return=representation",
        }

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=f"{self.base_url}/rest/v1",
                headers=self._headers,
                timeout=30.0,
            )
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def query(
        self,
        table: str,
        *,
        select: str = "*",
        filters: dict[str, Any] | None = None,
        order: str | None = None,
        limit: int | None = None,
        single: bool = False,
    ) -> list[dict[str, Any]] | dict[str, Any] | None:
        """Query records from a table."""
        client = await self._get_client()
        params: dict[str, str] = {"select": select}

        if filters:
            for key, value in filters.items():
                if "." in key:
                    params[key] = str(value)
                else:
                    params[key] = f"eq.{value}"

        if order:
            params["order"] = order
        if limit:
            params["limit"] = str(limit)

        headers = dict(self._headers)
        if single:
            headers["Accept"] = "application/vnd.pgrst.object+json"

        try:
            resp = await client.get(f"/{table}", params=params, headers=headers)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 406 and single:
                return None
            logger.error("InsForge query error on %s: %s", table, e)
            raise
        except Exception as e:
            logger.error("InsForge query error on %s: %s", table, e)
            raise

    async def create(
        self, table: str, data: dict[str, Any]
    ) -> dict[str, Any] | None:
        """Insert a record into a table."""
        client = await self._get_client()
        try:
            resp = await client.post(
                f"/{table}",
                json=data,
                headers={
                    **self._headers,
                    "Prefer": "return=representation",
                },
            )
            resp.raise_for_status()
            result = resp.json()
            return result[0] if isinstance(result, list) and result else result
        except Exception as e:
            logger.error("InsForge create error on %s: %s", table, e)
            raise

    async def update(
        self, table: str, filters: dict[str, Any], data: dict[str, Any]
    ) -> dict[str, Any] | None:
        """Update records matching filters."""
        client = await self._get_client()
        params: dict[str, str] = {}
        for key, value in filters.items():
            if "." in key:
                params[key] = str(value)
            else:
                params[key] = f"eq.{value}"

        try:
            resp = await client.patch(
                f"/{table}",
                params=params,
                json=data,
                headers={
                    **self._headers,
                    "Prefer": "return=representation",
                },
            )
            resp.raise_for_status()
            result = resp.json()
            return result[0] if isinstance(result, list) and result else result
        except Exception as e:
            logger.error("InsForge update error on %s: %s", table, e)
            raise

    async def upsert(
        self, table: str, data: dict[str, Any]
    ) -> dict[str, Any] | None:
        """Upsert (insert or update) a record."""
        client = await self._get_client()
        headers = {
            **self._headers,
            "Prefer": "return=representation,resolution=merge-duplicates",
        }
        try:
            resp = await client.post(
                f"/{table}",
                json=data,
                headers=headers,
            )
            resp.raise_for_status()
            result = resp.json()
            return result[0] if isinstance(result, list) and result else result
        except Exception as e:
            logger.error("InsForge upsert error on %s: %s", table, e)
            raise

    async def delete(self, table: str, filters: dict[str, Any]) -> None:
        """Delete records matching filters."""
        client = await self._get_client()
        params: dict[str, str] = {}
        for key, value in filters.items():
            if "." in key:
                params[key] = str(value)
            else:
                params[key] = f"eq.{value}"

        try:
            resp = await client.delete(f"/{table}", params=params)
            resp.raise_for_status()
        except Exception as e:
            logger.error("InsForge delete error on %s: %s", table, e)
            raise

    async def upload_file(
        self, bucket: str, key: str, file_bytes: bytes, content_type: str = "image/jpeg"
    ) -> dict[str, Any] | None:
        """Upload a file to InsForge storage bucket."""
        url = f"{self.base_url}/api/storage/buckets/{bucket}/objects/{key}"
        headers = {
            "Authorization": f"Bearer {self.anon_key}",
        }
        files = {"file": (key, file_bytes, content_type)}
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(url, headers=headers, files=files)
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.error("InsForge upload error on %s/%s: %s", bucket, key, e)
            raise

    def get_file_url(self, bucket: str, key: str) -> str:
        """Get the public URL for a stored file."""
        return f"{self.base_url}/api/storage/buckets/{bucket}/objects/{key}"

    async def rpc(self, function_name: str, params: dict[str, Any] | None = None) -> Any:
        """Call a PostgREST RPC function."""
        client = await self._get_client()
        try:
            resp = await client.post(f"/rpc/{function_name}", json=params or {})
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.error("InsForge RPC error on %s: %s", function_name, e)
            raise
