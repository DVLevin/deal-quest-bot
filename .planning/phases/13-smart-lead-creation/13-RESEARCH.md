# Phase 13: Smart Lead Creation - Research

**Researched:** 2026-02-05
**Domain:** Vision OCR pipelines, Claude multipart content API, image pre-processing, input routing
**Confidence:** HIGH

## Summary

This phase transforms the bot's lead creation workflow from manual typing to screenshot-based extraction. The key technical challenges are: (1) fixing ClaudeProvider to correctly send images using the multipart content array format, (2) implementing a two-step extraction-then-analysis pipeline where a focused OCR agent extracts structured data before the strategist adds sales context, (3) pre-resizing images to optimize token cost and latency, and (4) routing different input types (text, screenshot, URL) to appropriate handlers.

The existing codebase already supports image handling in `support.py` via `photo_b64` passed through `PipelineContext.image_b64`, but `ClaudeProvider.complete()` currently ignores this parameter entirely (the `image_b64` kwarg is accepted but never used in the API call). OpenRouterProvider correctly implements multipart content for vision models.

**Primary recommendation:** Fix ClaudeProvider first (critical bug), then add ExtractionAgent as a lightweight focused-OCR agent, wire a two-step pipeline for photo inputs only, and add Pillow-based pre-resize to stay under 1568px.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Pillow | 10.x+ | Image pre-resize | Python's standard image library, already used implicitly by many deps |
| anthropic API | 2023-06-01 | Claude vision via multipart content | Official API format for images |
| httpx | 0.27.0+ | HTTP client (already in use) | Async support, already project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| io.BytesIO | stdlib | In-memory image manipulation | Converting between bytes and PIL Image |
| base64 | stdlib | Image encoding | Already in use for photo_b64 |
| re | stdlib | URL detection regex | Detecting LinkedIn/URL inputs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pillow | opencv-python | Pillow is lighter, opencv overkill for resize only |
| Custom URL regex | validators library | Custom regex sufficient for LinkedIn/http detection |

**Installation:**
```bash
pip install Pillow>=10.0.0
```

Add to `requirements.txt`:
```
Pillow>=10.0.0
```

## Architecture Patterns

### Recommended Project Structure
```
bot/
├── agents/
│   ├── base.py              # Existing BaseAgent ABC
│   ├── strategist.py        # Existing (unchanged)
│   ├── extraction.py        # NEW: ExtractionAgent for OCR
│   └── registry.py          # Register ExtractionAgent
├── services/
│   ├── llm_router.py        # FIX: ClaudeProvider multipart content
│   └── image_utils.py       # NEW: pre_resize_image()
├── handlers/
│   └── support.py           # MODIFY: input routing, two-step pipeline
└── data/pipelines/
    └── support_photo.yaml   # NEW: extraction -> strategist pipeline
```

### Pattern 1: Multipart Content Array for Claude Vision
**What:** Claude's Messages API requires images as content blocks within a user message array, not as separate parameters
**When to use:** Any ClaudeProvider call with images
**Example:**
```python
# Source: https://platform.claude.com/docs/en/docs/build-with-claude/vision
# Current BROKEN implementation in ClaudeProvider:
json={
    "model": self.model,
    "max_tokens": 4096,
    "system": system_prompt,
    "messages": [{"role": "user", "content": user_message}],  # Ignores image_b64!
}

# CORRECT implementation:
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
        {
            "type": "text",
            "text": user_message,
        },
    ]
else:
    user_content = user_message

json={
    "model": self.model,
    "max_tokens": 4096,
    "system": system_prompt,
    "messages": [{"role": "user", "content": user_content}],
}
```

### Pattern 2: Two-Step Pipeline for Screenshot Input
**What:** Separate OCR extraction from strategic analysis to get clean data
**When to use:** Photo inputs in /support mode
**Example:**
```yaml
# data/pipelines/support_photo.yaml
name: support_photo
description: "Photo lead creation: extract OCR → strategist analysis"
steps:
  - agent: extraction
    mode: sequential
    input_mapping:
      image_b64: "ctx.image_b64"

  - agent: strategist
    mode: sequential
    input_mapping:
      # Override user_message with extracted text
      extracted_text: "result.extraction"
      knowledge_base: "ctx.knowledge_base"
      user_memory: "ctx.user_memory"
      casebook_text: "ctx.casebook_text"

  - agent: memory
    mode: background
    input_mapping:
      strategist_output: "result.strategist"
      user_memory: "ctx.user_memory"
```

### Pattern 3: Image Pre-Resize with Pillow
**What:** Resize images to max 1568px before vision API calls
**When to use:** All photo uploads before sending to LLM
**Example:**
```python
# Source: https://pillow.readthedocs.io/en/stable/reference/Image.html
# Source: https://platform.claude.com/docs/en/docs/build-with-claude/vision
from PIL import Image
from io import BytesIO

MAX_DIMENSION = 1568  # Claude recommended max

def pre_resize_image(image_bytes: bytes, max_dim: int = MAX_DIMENSION) -> bytes:
    """Resize image to fit within max_dim, preserving aspect ratio."""
    img = Image.open(BytesIO(image_bytes))

    # Check if resize needed
    if max(img.width, img.height) <= max_dim:
        return image_bytes

    # Use thumbnail() - modifies in place, preserves aspect ratio
    img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

    # Save back to bytes
    output = BytesIO()
    img.save(output, format="JPEG", quality=85)
    return output.getvalue()
```

### Pattern 4: Input Type Routing
**What:** Detect input type and route to appropriate pipeline/handler
**When to use:** In support.py before running pipeline
**Example:**
```python
import re

URL_PATTERN = re.compile(
    r'https?://(?:www\.)?'
    r'(?:linkedin\.com/(?:in|pub|profile)/|'
    r'[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'
)

def detect_input_type(text: str, has_photo: bool) -> str:
    """Classify input as 'text', 'photo', or 'url'."""
    if has_photo:
        return "photo"

    text_stripped = text.strip()
    if URL_PATTERN.search(text_stripped):
        return "url"

    return "text"
```

### Anti-Patterns to Avoid
- **Combined OCR + Analysis prompt:** Mixing extraction and strategy in one call garbles names because the model tries to do too much. Always separate extraction from analysis.
- **Sending raw large images:** Images >1568px are auto-resized by Claude, adding latency. Pre-resize to avoid this.
- **Ignoring image_b64 parameter:** The current ClaudeProvider bug -- never accept a parameter and silently ignore it.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image resize | Custom pixel manipulation | Pillow thumbnail() | Handles aspect ratio, resampling, format conversion |
| URL detection | Simple string.startswith() | Regex pattern | URLs can be anywhere in text, need protocol variations |
| Base64 encoding | Manual bytes manipulation | Python base64 module | Already in use, handles padding correctly |

**Key insight:** Image processing seems simple but Pillow's thumbnail() handles edge cases (EXIF rotation, color modes, format detection) that would be easy to miss in custom code.

## Common Pitfalls

### Pitfall 1: ClaudeProvider Silently Ignores Images
**What goes wrong:** Photos sent to Claude-based users produce text-only analysis with "no image provided" errors or hallucinated data
**Why it happens:** The current `ClaudeProvider.complete()` accepts `image_b64` but never uses it in the API call
**How to avoid:** Fix ClaudeProvider to match OpenRouterProvider's multipart content pattern
**Warning signs:** Users with Claude API keys getting different results than OpenRouter users for the same screenshot

### Pitfall 2: Garbled Names from Combined Prompts
**What goes wrong:** Prospect names extracted from screenshots are wrong or missing
**Why it happens:** Single prompt asks model to: read image, extract info, analyze prospect, generate strategy, write draft -- too many tasks dilute focus
**How to avoid:** Two-step pipeline: ExtractionAgent (OCR only, no KB) -> StrategistAgent (analysis with KB)
**Warning signs:** Names like "LinkedIn Member" or partial names, company names missing

### Pitfall 3: Slow Time-to-First-Token on Large Images
**What goes wrong:** Users wait 10+ seconds before seeing any response
**Why it happens:** Claude auto-resizes images >1568px server-side, adding processing delay
**How to avoid:** Pre-resize using Pillow before base64 encoding
**Warning signs:** Latency complaints specifically on photo inputs, not text

### Pitfall 4: URL Scraping Attempts
**What goes wrong:** Bot tries to fetch LinkedIn URLs, gets blocked/fails, legal risk
**Why it happens:** Developer assumes URL = should fetch content
**How to avoid:** Detect URLs early, show "paste the profile text" guidance immediately
**Warning signs:** Network errors on LinkedIn domains, rate limiting

### Pitfall 5: Pipeline Config Not Found
**What goes wrong:** `load_pipeline("support_photo")` raises KeyError
**Why it happens:** Forgot to create the YAML file or typo in filename
**How to avoid:** Add `support_photo.yaml` to `data/pipelines/`, verify at startup
**Warning signs:** Bot crash on photo upload

## Code Examples

Verified patterns from official sources:

### Claude Vision API - Base64 Image
```python
# Source: https://platform.claude.com/docs/en/docs/build-with-claude/vision
# Correct structure for Claude Messages API with images

user_content = [
    {
        "type": "image",
        "source": {
            "type": "base64",
            "media_type": "image/jpeg",  # or image/png, image/gif, image/webp
            "data": image1_data,  # base64-encoded string, no prefix
        },
    },
    {
        "type": "text",
        "text": "Describe this image."
    }
]

response = await client.post(
    "/v1/messages",
    json={
        "model": "claude-sonnet-4-5",
        "max_tokens": 1024,
        "messages": [{"role": "user", "content": user_content}],
    },
)
```

### Pillow Image Resize with Aspect Ratio
```python
# Source: https://pillow.readthedocs.io/en/stable/reference/Image.html
from PIL import Image
from io import BytesIO

def resize_to_max_dimension(image_bytes: bytes, max_dim: int = 1568) -> bytes:
    """Resize image to fit within max_dim on longest edge, preserving aspect ratio."""
    img = Image.open(BytesIO(image_bytes))

    # Convert to RGB if needed (handles RGBA, P modes)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    # Only resize if exceeds limit
    if max(img.width, img.height) > max_dim:
        # thumbnail modifies in place, uses best resampling
        img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

    # Save as JPEG (smaller than PNG for photos)
    output = BytesIO()
    img.save(output, format="JPEG", quality=85)
    return output.getvalue()
```

### ExtractionAgent Structure
```python
# Pattern following existing agent structure
from bot.agents.base import AgentInput, AgentOutput, BaseAgent
from bot.pipeline.context import PipelineContext
from bot.tracing import traced_span

class ExtractionAgent(BaseAgent):
    """Lightweight OCR agent - extracts structured data from screenshots."""

    name = "extraction"

    # Simple focused prompt - NO knowledge base injection
    PROMPT = """Extract the following information from this screenshot:

    1. First Name
    2. Last Name
    3. Job Title/Role
    4. Company Name
    5. Location/Geography
    6. Any other visible context (headline, about section, etc.)

    Return ONLY a JSON object with these fields:
    {
        "first_name": "...",
        "last_name": "...",
        "title": "...",
        "company": "...",
        "geography": "...",
        "context": "..."
    }

    If a field is not visible, use null."""

    @traced_span("agent:extraction")
    async def run(self, input_data: AgentInput, pipeline_ctx: PipelineContext) -> AgentOutput:
        try:
            result = await pipeline_ctx.llm.complete(
                self.PROMPT,
                "Extract information from this screenshot.",
                image_b64=pipeline_ctx.image_b64,
            )
            return AgentOutput(success=True, data=result)
        except Exception as e:
            return AgentOutput(success=False, error=str(e))
```

### URL Detection and Routing
```python
import re

# Pattern covers common URL formats including LinkedIn
URL_PATTERN = re.compile(
    r'(?:https?://)?'  # Optional protocol
    r'(?:www\.)?'      # Optional www
    r'(?:'
    r'linkedin\.com/(?:in|pub|profile)/[\w-]+'  # LinkedIn profiles
    r'|'
    r'[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}'   # Generic domains
    r')'
)

URL_GUIDANCE_MESSAGE = (
    "I noticed you sent a URL. Unfortunately, I can't automatically "
    "scrape web pages (LinkedIn blocks this anyway).\n\n"
    "Instead, please:\n"
    "1. Open the profile in your browser\n"
    "2. Select and copy the visible text\n"
    "3. Paste it here\n\n"
    "Or take a screenshot and send it as a photo!"
)

def route_support_input(text: str, has_photo: bool) -> tuple[str, str | None]:
    """Route input to appropriate handler.

    Returns: (input_type, guidance_message)
    - input_type: 'photo', 'text', or 'url'
    - guidance_message: Message to show user (only for 'url')
    """
    if has_photo:
        return ("photo", None)

    if URL_PATTERN.search(text.strip()):
        return ("url", URL_GUIDANCE_MESSAGE)

    return ("text", None)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single combined OCR+analysis prompt | Two-step extract-then-analyze | 2025-2026 | Much better extraction accuracy |
| Send raw images to API | Pre-resize to 1568px | Claude docs 2024 | Faster TTFT, lower cost |
| Manual image encoding | Multipart content blocks | Claude API 2023-06-01 | Standardized, reliable |

**Deprecated/outdated:**
- Single-prompt vision + analysis: Poor extraction quality when mixing OCR with strategy generation
- `anthropic-version: 2023-01-01`: Use `2023-06-01` for current vision support

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal image quality for JPEG re-encode**
   - What we know: quality=85 is common default, balances size and clarity
   - What's unclear: Whether screenshots (sharp text) need higher quality than photos
   - Recommendation: Start with 85, monitor if text extraction degrades

2. **ExtractionAgent prompt tuning**
   - What we know: Focused prompts work better than combined ones
   - What's unclear: Exact prompt wording for best extraction across LinkedIn, email, business cards
   - Recommendation: Start simple, iterate based on real usage

3. **Pipeline context modification for extracted data**
   - What we know: StrategistAgent reads `user_message` from AgentInput
   - What's unclear: Best way to pass extracted data to strategist -- override user_message or add to context?
   - Recommendation: Add extracted text to context dict, modify strategist to check for it

## Sources

### Primary (HIGH confidence)
- [Claude Vision Documentation](https://platform.claude.com/docs/en/docs/build-with-claude/vision) - Multipart content format, size limits, recommendations
- [Pillow Image.thumbnail()](https://pillow.readthedocs.io/en/stable/reference/Image.html) - Resize API, resampling filters
- Existing codebase: `bot/services/llm_router.py`, `bot/handlers/support.py`, `bot/agents/strategist.py`

### Secondary (MEDIUM confidence)
- [GitHub social-media-profiles-regexs](https://github.com/lorey/social-media-profiles-regexs) - LinkedIn URL patterns

### Tertiary (LOW confidence)
- WebSearch results for image processing best practices

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official docs, existing codebase patterns
- Architecture: HIGH - Based on existing pipeline system, documented Claude API
- Pitfalls: HIGH - Bug in ClaudeProvider is verified by code inspection, image sizing from Claude docs

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (30 days - stable domain)
