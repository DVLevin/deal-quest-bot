---
phase: 13-smart-lead-creation
plan: 01
subsystem: llm-router
tags: [vision, claude-api, image-processing, pillow]
dependency-graph:
  requires: []
  provides: [claude-vision-support, image-resize-utility]
  affects: [13-02, 13-03]
tech-stack:
  added: [Pillow]
  patterns: [multipart-content-array, image-preprocessing]
key-files:
  created:
    - bot/services/image_utils.py
  modified:
    - bot/services/llm_router.py
    - requirements.txt
decisions: []
metrics:
  duration: 1m
  completed: 2026-02-05
---

# Phase 13 Plan 01: Claude Vision & Image Resize Summary

**TL;DR:** Fixed ClaudeProvider to send images using multipart content array format, added Pillow-based image pre-resize utility for 1568px max dimension.

## Tasks Completed

| # | Task | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | Fix ClaudeProvider image support | 526e083 | Added multipart content array when image_b64 provided, uses Claude native format |
| 2 | Add image pre-resize utility | bdb923f | Created image_utils.py with pre_resize_image(), added Pillow dependency |

## Implementation Details

### ClaudeProvider Image Support

The `ClaudeProvider.complete()` method was ignoring the `image_b64` parameter entirely. Fixed by building a multipart content array when an image is provided:

```python
if image_b64:
    user_content = [
        {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/jpeg",
                "data": image_b64,
            },
        },
        {"type": "text", "text": user_message},
    ]
else:
    user_content = user_message
```

This matches Claude's native Messages API format (different from OpenRouter's OpenAI-compatible `image_url` format).

### Image Pre-resize Utility

Created `bot/services/image_utils.py` with:
- `MAX_DIMENSION = 1568` (Claude's recommended max for vision)
- `pre_resize_image(image_bytes, max_dim)` function that:
  - Uses Pillow's `thumbnail()` for aspect-preserving resize
  - LANCZOS resampling for best quality
  - Converts to RGB (handles RGBA, P, L modes)
  - Returns JPEG at quality=85

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- ClaudeProvider multipart content: 3 occurrences of `type.*image` pattern
- Pillow in requirements: `Pillow>=10.0.0`
- MAX_DIMENSION: 1568px

## Files Changed

| File | Change Type | Purpose |
|------|-------------|---------|
| bot/services/llm_router.py | Modified | Added image support to ClaudeProvider.complete() |
| bot/services/image_utils.py | Created | Image pre-resize utility |
| requirements.txt | Modified | Added Pillow>=10.0.0 dependency |

## Next Phase Readiness

This plan enables:
- **13-02**: Screenshot ingestion pipeline can now use Claude for vision analysis
- **13-03**: Lead enrichment can process screenshots from users with Claude API keys

Dependencies provided:
- `ClaudeProvider.complete()` with image support
- `pre_resize_image()` utility for preprocessing
