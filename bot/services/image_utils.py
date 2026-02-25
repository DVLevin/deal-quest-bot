"""Image utilities for vision model preprocessing."""

from __future__ import annotations

import logging
from io import BytesIO

from PIL import Image

logger = logging.getLogger(__name__)

MAX_DIMENSION = 1568  # Claude recommended max for vision


def pre_resize_image(image_bytes: bytes, max_dim: int = MAX_DIMENSION) -> bytes:
    """Resize image to fit within max_dim on longest edge, preserving aspect ratio.

    Args:
        image_bytes: Raw image bytes (JPEG, PNG, etc.)
        max_dim: Maximum dimension for longest edge (default 1568px per Claude docs)

    Returns:
        JPEG bytes, resized if original exceeded max_dim
    """
    img = Image.open(BytesIO(image_bytes))

    # Convert to RGB if needed (handles RGBA, P, L modes)
    if img.mode not in ("RGB",):
        img = img.convert("RGB")

    original_size = max(img.width, img.height)

    # Only resize if exceeds limit
    if original_size > max_dim:
        # thumbnail modifies in place, preserves aspect ratio, uses best resampling
        img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
        logger.info(
            "Pre-resized image from %dx%d to %dx%d",
            img.width if original_size == img.width else img.height,
            img.height if original_size == img.height else img.width,
            img.width,
            img.height,
        )

    # Save as JPEG (smaller than PNG for photos, widely supported)
    output = BytesIO()
    img.save(output, format="JPEG", quality=85)
    return output.getvalue()
