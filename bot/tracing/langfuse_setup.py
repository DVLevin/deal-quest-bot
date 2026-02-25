"""Langfuse initialization and shutdown helpers.

The Langfuse SDK v3 auto-configures from environment variables:
  LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, LANGFUSE_BASE_URL

When keys are not set, all @observe decorators become no-ops and
no data is sent to Langfuse -- the bot runs normally without observability.
"""

from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)

_langfuse_enabled: bool = False


def init_langfuse(settings: object) -> bool:
    """Initialize Langfuse SDK by setting environment variables.

    Args:
        settings: Bot Settings object with langfuse_public_key,
                  langfuse_secret_key, and langfuse_base_url attributes.

    Returns:
        True if Langfuse was initialized, False if disabled (no keys).
    """
    global _langfuse_enabled

    public_key = getattr(settings, "langfuse_public_key", "")
    secret_key = getattr(settings, "langfuse_secret_key", "")
    base_url = getattr(settings, "langfuse_base_url", "https://cloud.langfuse.com")

    if not public_key:
        logger.info("Langfuse disabled (no LANGFUSE_PUBLIC_KEY)")
        _langfuse_enabled = False
        return False

    # Set env vars for Langfuse SDK auto-configuration
    os.environ["LANGFUSE_PUBLIC_KEY"] = public_key
    os.environ["LANGFUSE_SECRET_KEY"] = secret_key
    os.environ["LANGFUSE_BASE_URL"] = base_url

    _langfuse_enabled = True
    logger.info("Langfuse initialized (base_url=%s)", base_url)
    return True


def shutdown_langfuse() -> None:
    """Flush pending Langfuse observations and shut down cleanly."""
    if not _langfuse_enabled:
        return

    try:
        from langfuse import get_client

        client = get_client()
        client.flush()
        logger.info("Langfuse flushed successfully")
    except Exception:
        logger.warning("Langfuse flush failed (non-critical)", exc_info=True)
