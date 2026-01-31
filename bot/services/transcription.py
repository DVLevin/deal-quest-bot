"""Speech-to-text transcription via AssemblyAI REST API."""

from __future__ import annotations

import asyncio
import logging

import httpx

logger = logging.getLogger(__name__)

_UPLOAD_URL = "https://api.assemblyai.com/v2/upload"
_TRANSCRIPT_URL = "https://api.assemblyai.com/v2/transcript"
_POLL_INTERVAL = 1.5  # seconds
_MAX_POLL_TIME = 60  # seconds


class TranscriptionError(Exception):
    """Raised when transcription fails."""


class TranscriptionService:
    """Upload audio and transcribe via AssemblyAI."""

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key

    async def transcribe(self, audio_bytes: bytes) -> str:
        """Upload audio bytes and return transcribed text.

        Raises TranscriptionError on failure or timeout.
        """
        headers = {"authorization": self.api_key}

        async with httpx.AsyncClient(timeout=30) as client:
            # 1. Upload raw audio
            upload_resp = await client.post(
                _UPLOAD_URL,
                headers={**headers, "content-type": "application/octet-stream"},
                content=audio_bytes,
            )
            upload_resp.raise_for_status()
            upload_url = upload_resp.json()["upload_url"]
            logger.debug("Audio uploaded: %s", upload_url)

            # 2. Create transcription job
            create_resp = await client.post(
                _TRANSCRIPT_URL,
                headers=headers,
                json={"audio_url": upload_url},
            )
            create_resp.raise_for_status()
            transcript_id = create_resp.json()["id"]
            logger.debug("Transcription job created: %s", transcript_id)

            # 3. Poll until completed
            poll_url = f"{_TRANSCRIPT_URL}/{transcript_id}"
            elapsed = 0.0
            while elapsed < _MAX_POLL_TIME:
                poll_resp = await client.get(poll_url, headers=headers)
                poll_resp.raise_for_status()
                result = poll_resp.json()
                status = result["status"]

                if status == "completed":
                    text = result.get("text", "")
                    if not text:
                        raise TranscriptionError("Transcription returned empty text.")
                    logger.info("Transcription completed (%s chars)", len(text))
                    return text

                if status == "error":
                    error = result.get("error", "Unknown error")
                    raise TranscriptionError(f"AssemblyAI error: {error}")

                await asyncio.sleep(_POLL_INTERVAL)
                elapsed += _POLL_INTERVAL

            raise TranscriptionError(
                f"Transcription timed out after {_MAX_POLL_TIME}s"
            )
