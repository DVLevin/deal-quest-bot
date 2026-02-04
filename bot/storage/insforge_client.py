"""Async HTTP client for InsForge database API (PostgREST via /api/database/records)."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


# PostgREST filter operators — values starting with these are passed as-is (no eq. prefix)
_POSTGREST_OPS = (
    "eq.", "neq.", "gt.", "gte.", "lt.", "lte.",
    "like.", "ilike.", "is.", "in.", "cs.", "cd.",
    "not.", "or.", "and.",
)

# Retry configuration for transient failures
RETRYABLE_STATUS_CODES = {429, 500, 502, 503}
MAX_RETRIES = 3
BASE_DELAY = 0.5  # seconds


class InsForgeClient:
    """Async wrapper around InsForge database API."""

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
                base_url=f"{self.base_url}/api/database/records",
                headers=self._headers,
                timeout=30.0,
            )
        return self._client

    async def _request_with_retry(
        self,
        client: httpx.AsyncClient,
        method: str,
        *args: Any,
        **kwargs: Any,
    ) -> httpx.Response:
        """Execute HTTP request with exponential backoff on transient failures."""
        last_error: httpx.HTTPStatusError | None = None
        for attempt in range(MAX_RETRIES + 1):
            try:
                resp = await getattr(client, method)(*args, **kwargs)
                resp.raise_for_status()
                return resp
            except httpx.HTTPStatusError as e:
                if e.response.status_code not in RETRYABLE_STATUS_CODES:
                    raise
                last_error = e
                if attempt < MAX_RETRIES:
                    delay = BASE_DELAY * (2 ** attempt)
                    logger.warning(
                        "InsForge %s retryable error %d (attempt %d/%d), retrying in %.1fs",
                        method.upper(), e.response.status_code, attempt + 1, MAX_RETRIES + 1, delay,
                    )
                    await asyncio.sleep(delay)
        raise last_error  # type: ignore[misc]

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
                    str_val = str(value)
                    if any(str_val.startswith(op) for op in _POSTGREST_OPS):
                        params[key] = str_val
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
            resp = await self._request_with_retry(client, "get", f"/{table}", params=params, headers=headers)
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
            resp = await self._request_with_retry(
                client, "post",
                f"/{table}",
                json=[data],
                headers={
                    **self._headers,
                    "Prefer": "return=representation",
                },
            )
            result = resp.json()
            return result[0] if isinstance(result, list) and result else result
        except httpx.HTTPStatusError as e:
            body = e.response.text[:500] if e.response else "no body"
            logger.error(
                "InsForge create error on %s: %s | Response body: %s | Sent keys: %s",
                table, e, body, list(data.keys()),
            )
            raise
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
            resp = await self._request_with_retry(
                client, "patch",
                f"/{table}",
                params=params,
                json=data,
                headers={
                    **self._headers,
                    "Prefer": "return=representation",
                },
            )
            result = resp.json()
            return result[0] if isinstance(result, list) and result else result
        except httpx.HTTPStatusError as e:
            body = e.response.text[:500] if e.response else "no body"
            logger.error("InsForge update error on %s: %s | Response body: %s", table, e, body)
            raise
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
            resp = await self._request_with_retry(
                client, "post",
                f"/{table}",
                json=[data],
                headers=headers,
            )
            result = resp.json()
            return result[0] if isinstance(result, list) and result else result
        except httpx.HTTPStatusError as e:
            body = e.response.text[:500] if e.response else "no body"
            logger.error("InsForge upsert error on %s: %s | Response body: %s", table, e, body)
            raise
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
            await self._request_with_retry(client, "delete", f"/{table}", params=params)
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
        """Call a PostgREST RPC function via /api/database/rpc/."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{self.base_url}/api/database/rpc/{function_name}",
                    json=params or {},
                    headers=self._headers,
                )
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.error("InsForge RPC error on %s: %s", function_name, e)
            raise
