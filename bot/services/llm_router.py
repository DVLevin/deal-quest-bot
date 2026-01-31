"""LLM Provider abstraction — Claude API and OpenRouter."""

from __future__ import annotations

import json
import logging
import re
from abc import ABC, abstractmethod
from typing import Any

import httpx

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_DELAYS = [1, 3, 8]


def _extract_json(text: str) -> dict[str, Any]:
    """Extract JSON from LLM response, handling code fences and extra text."""
    # Try direct parse
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Strip markdown code fences
    fenced = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if fenced:
        try:
            return json.loads(fenced.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Try to find JSON object in text
    brace_match = re.search(r"\{.*\}", text, re.DOTALL)
    if brace_match:
        try:
            return json.loads(brace_match.group(0))
        except json.JSONDecodeError:
            pass

    # Return raw text wrapped
    return {"raw_response": text}


class LLMProvider(ABC):
    """Abstract LLM provider."""

    @abstractmethod
    async def complete(
        self, system_prompt: str, user_message: str, *, image_b64: str | None = None,
    ) -> dict[str, Any]:
        """Send a completion request and return parsed JSON."""
        ...

    @abstractmethod
    async def validate_key(self) -> bool:
        """Validate the API key works."""
        ...

    @abstractmethod
    async def close(self) -> None:
        ...


class ClaudeProvider(LLMProvider):
    """Anthropic Claude API provider."""

    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514") -> None:
        self.api_key = api_key
        self.model = model
        self._client = httpx.AsyncClient(
            base_url="https://api.anthropic.com",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            timeout=120.0,
        )

    async def complete(
        self, system_prompt: str, user_message: str, *, image_b64: str | None = None,
    ) -> dict[str, Any]:
        import asyncio

        for attempt in range(MAX_RETRIES):
            try:
                resp = await self._client.post(
                    "/v1/messages",
                    json={
                        "model": self.model,
                        "max_tokens": 4096,
                        "system": system_prompt,
                        "messages": [{"role": "user", "content": user_message}],
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                text = data["content"][0]["text"]
                return _extract_json(text)
            except httpx.HTTPStatusError as e:
                if e.response.status_code in (429, 500, 502, 503) and attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(RETRY_DELAYS[attempt])
                    continue
                logger.error("Claude API error: %s", e)
                raise
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(RETRY_DELAYS[attempt])
                    continue
                logger.error("Claude completion error: %s", e)
                raise

        return {"error": "Max retries exceeded"}

    async def validate_key(self) -> bool:
        try:
            resp = await self._client.post(
                "/v1/messages",
                json={
                    "model": self.model,
                    "max_tokens": 10,
                    "messages": [{"role": "user", "content": "Hi"}],
                },
            )
            return resp.status_code == 200
        except Exception:
            return False

    async def close(self) -> None:
        if not self._client.is_closed:
            await self._client.aclose()


class OpenRouterProvider(LLMProvider):
    """OpenRouter API provider (OpenAI-compatible)."""

    def __init__(self, api_key: str, model: str = "moonshotai/kimi-k2.5") -> None:
        self.api_key = api_key
        self.model = model
        self._client = httpx.AsyncClient(
            base_url="https://openrouter.ai/api/v1",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://getdeal.ai",
                "X-Title": "Deal Quest Bot",
            },
            timeout=120.0,
        )

    async def complete(
        self, system_prompt: str, user_message: str, *, image_b64: str | None = None,
    ) -> dict[str, Any]:
        import asyncio

        # Build user content — multipart if image provided
        if image_b64:
            user_content: list[dict[str, Any]] | str = [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"},
                },
                {"type": "text", "text": user_message},
            ]
        else:
            user_content = user_message

        for attempt in range(MAX_RETRIES):
            try:
                resp = await self._client.post(
                    "/chat/completions",
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_content},
                        ],
                        "max_tokens": 4096,
                        "temperature": 0.7,
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                text = data["choices"][0]["message"]["content"]
                return _extract_json(text)
            except httpx.HTTPStatusError as e:
                if e.response.status_code in (429, 500, 502, 503) and attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(RETRY_DELAYS[attempt])
                    continue
                logger.error("OpenRouter API error: %s", e)
                raise
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(RETRY_DELAYS[attempt])
                    continue
                logger.error("OpenRouter completion error: %s", e)
                raise

        return {"error": "Max retries exceeded"}

    async def validate_key(self) -> bool:
        try:
            resp = await self._client.post(
                "/chat/completions",
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": "Hi"}],
                    "max_tokens": 10,
                },
            )
            return resp.status_code == 200
        except Exception:
            return False

    async def close(self) -> None:
        if not self._client.is_closed:
            await self._client.aclose()


def create_provider(
    provider_name: str,
    api_key: str,
    model: str | None = None,
) -> LLMProvider:
    """Factory to create an LLM provider instance."""
    if provider_name == "claude":
        return ClaudeProvider(api_key, model=model or "claude-sonnet-4-20250514")
    elif provider_name == "openrouter":
        return OpenRouterProvider(api_key, model=model or "moonshotai/kimi-k2.5")
    else:
        raise ValueError(f"Unknown provider: {provider_name}")
