# Research: Smart Lead Creation

**Epic:** Smart Lead Creation (v2.0)
**Researched:** 2026-02-05
**Overall Confidence:** HIGH (vision/OCR path) / MEDIUM (URL-to-lead path)

---

## Executive Summary

The Smart Lead Creation epic aims to reduce the friction between "I found a prospect" and "I have a full AI-generated analysis with engagement plan." Currently, users must type or paste text into the bot's `/support` command. The v2.0 goal is to accept screenshots, URLs, photos, forwarded messages, and minimal text -- then auto-produce the same rich output (prospect analysis, closing strategy, engagement tactics, draft response, web research, engagement plan).

The good news: **the existing codebase already handles 70% of this.** The `on_support_photo` handler already downloads photos, encodes them to base64, uploads to InsForge storage, and passes them through the strategist pipeline with vision model support. The `OpenRouterProvider.complete()` already supports multipart image+text content. The `_run_support_pipeline` already extracts prospect info, deduplicates leads, and fires background enrichment.

The remaining work is:
1. **Better OCR/extraction prompting** -- The current photo flow sends a generic placeholder prompt. A specialized extraction-then-analysis two-step pipeline would produce significantly better results.
2. **URL-to-lead** -- New capability. LinkedIn profile URL resolution is legally and technically fraught. The recommended approach is a "paste the profile text" UX with an optional paid API fallback.
3. **Multi-input type routing** -- Detecting input type (screenshot, URL, business card, email forward) and routing to the right extraction pipeline before the shared analysis step.
4. **Reduced-friction UX** -- Making the bot smarter about accepting any input without requiring `/support` first, and reducing the number of user interactions to reach a complete lead.

---

## 1. Screenshot-to-Lead (Vision/OCR)

### 1.1 Current State in Codebase

The bot already handles screenshots via `on_support_photo` in `bot/handlers/support.py`:

```
Lines 600-673: on_support_photo handler
- Downloads largest photo from Telegram (message.photo[-1])
- Uploads to InsForge storage (prospect-photos bucket)
- Encodes to base64 for vision model
- Passes to _run_support_pipeline with image_b64 parameter
```

The `OpenRouterProvider.complete()` (lines 158-206 in `llm_router.py`) already handles multipart image+text content for OpenRouter vision models. The `ClaudeProvider` does NOT currently pass images -- it ignores the `image_b64` parameter (line 88-106), which is a bug/gap.

**Current default model:** `moonshotai/kimi-k2.5` for OpenRouter free tier. This model's vision capabilities are unverified for OCR accuracy.

### 1.2 Vision Model Options for OCR/Extraction

**Confidence: HIGH** (verified via official docs and WebSearch)

| Approach | Accuracy | Cost | Latency | Integration Effort |
|----------|----------|------|---------|--------------------|
| Claude Vision (claude-sonnet-4-5) | Excellent (CER ~2.1%, WER best-in-class) | ~$0.004/image (1MP) | 3-8s | Already have provider, need to fix image passing |
| OpenRouter + Qwen3-VL-235B | Very Good (production OCR-grade) | Free tier available | 5-15s | Already integrated via OpenRouterProvider |
| OpenRouter + Mistral Small 3.2 | Good (DocVQA/ChartQA competitive) | $0.10-0.20/M tokens | 3-8s | Already integrated |
| Google Cloud Vision OCR | Excellent (dedicated OCR) | $1.50/1K pages | 1-3s | New dependency, new API key |
| Tesseract (local) | Moderate (struggles with complex layouts) | Free | 1-5s | New dependency, needs system install |

**Recommendation: Use existing OpenRouter vision models (Qwen3-VL or the user's configured model) with specialized extraction prompting.** For Claude provider users, fix the `ClaudeProvider.complete()` to actually pass images. No new dependencies needed.

Rationale:
- The bot already routes through OpenRouter and Claude -- adding a new OCR service is unnecessary complexity
- Modern vision LLMs (Qwen3-VL, Claude, Gemini) match or exceed dedicated OCR for structured document extraction
- The key improvement is not the OCR engine -- it is the prompting strategy (see Section 1.3)

### 1.3 Recommended Pipeline: Two-Step Extract-then-Analyze

**Current flow (suboptimal):**
```
Photo -> base64 encode -> "[Photo attached -- analyze visible info]" -> strategist agent -> structured output
```

The strategist agent gets a massive system prompt (~70K tokens of playbook + knowledge base + casebook) plus the image. It tries to OCR and strategize in one shot. This is unreliable because:
- The model may miss text details while focusing on strategy
- The prompt is not optimized for extraction
- No chance to validate extraction before analysis

**Recommended flow:**
```
Photo -> base64 encode -> Step 1: Extraction Agent (lightweight prompt, focused on OCR)
                          -> Extracted text (name, title, company, context)
                          -> Step 2: Strategist Agent (existing pipeline, text input)
                          -> Structured output
```

**Step 1: Extraction Agent** -- New, lightweight agent with a focused prompt:
```
System: "Extract all visible text and structured information from this image.
Return JSON with: { name, title, company, location, context_text, source_type }
source_type: linkedin_profile | email | chat | business_card | other"
```

This agent does NOT need the full playbook/knowledge base. It is a pure extraction step. It should be fast (<3s) and cheap (small prompt).

**Step 2: Existing Strategist Agent** -- Receives extracted text as input, exactly like the current text flow. No changes needed.

**Benefits:**
- Extraction accuracy improves (dedicated prompt, no competing objectives)
- Strategist receives clean text input (consistent with text flow)
- Extracted data (name, company) available for immediate dedup check BEFORE running expensive analysis
- Can validate extraction and ask user to confirm/correct before proceeding
- Can reuse extraction for other purposes (lead dedup, search, etc.)

### 1.4 What Can Be Extracted from LinkedIn Screenshots

**Confidence: HIGH** (based on vision model capabilities and LinkedIn's standard layout)

LinkedIn profile screenshots typically contain:

| Field | Reliability | Notes |
|-------|-------------|-------|
| Full name | Very High | Large, prominent text |
| Headline/title | Very High | Below name, clear font |
| Current company | High | In headline or experience section |
| Location | High | Below headline |
| Profile photo | N/A | Claude cannot identify people, but can note presence |
| About/summary | Medium | May be truncated in screenshot |
| Experience list | Medium | Depends on how much is visible |
| Education | Medium | Usually below fold |
| Connections count | High | Visible number |
| Recent posts | Low | Depends on screenshot scope |

**Key limitation:** Claude (and all major LLMs) cannot identify people by face. The model can read the name text but cannot match a face to an identity. This is fine for Deal Quest -- we want the text data, not facial recognition.

**Best practices for prompt engineering:**
- Ask explicitly for structured JSON output
- Specify that the model should extract ALL visible text, not summarize
- Request the model flag what source type it detects (LinkedIn, email, etc.)
- Ask for confidence levels on extracted fields

### 1.5 Implementation Plan for Screenshot-to-Lead

1. **Fix ClaudeProvider image passing** -- Add multipart content support (same pattern as OpenRouterProvider)
2. **Create ExtractionAgent** -- New agent in `bot/agents/extraction.py` with focused OCR prompt
3. **Create extraction pipeline YAML** -- `data/pipelines/extraction.yaml` with extraction -> strategist steps
4. **Update support handler** -- Photo handler uses extraction pipeline instead of direct strategist call
5. **Add pre-analysis dedup** -- Check extracted name/company against existing leads before running full analysis
6. **Optional: User confirmation step** -- After extraction, show "I found: [Name] at [Company]. Proceed with analysis?" before spending tokens on strategist

---

## 2. URL-to-Lead (LinkedIn Profile URL)

### 2.1 The LinkedIn Data Access Problem

**Confidence: HIGH** (heavily researched, multiple authoritative sources)

Getting structured data from a LinkedIn URL is the most legally and technically complex part of this epic.

**Key fact (2026):** Proxycurl, the most popular LinkedIn scraping API, was sued by LinkedIn in January 2026 and shut down in July 2026. This signals LinkedIn's aggressive enforcement posture.

**LinkedIn's official API** requires partner-level access:
- Must apply as a LinkedIn Partner (not open to individual developers)
- Approval process requires demonstrating business model, data usage, security compliance
- Access is designed for large SaaS products, not small Telegram bots
- The Profile API only returns the authenticated user's own profile, not arbitrary profiles
- Sales Navigator API has richer data but requires a Sales Navigator subscription AND partner approval

**Verdict: The official LinkedIn API is not viable for Deal Quest.** The approval process alone would take weeks/months, and the API does not support looking up arbitrary profiles by URL.

### 2.2 Third-Party LinkedIn Data APIs

**Confidence: MEDIUM** (pricing and availability change frequently)

Post-Proxycurl options:

| Service | Approach | Pricing | Risk Level | Notes |
|---------|----------|---------|------------|-------|
| Bright Data | Proxy infrastructure + scraping API | Expensive ($500+/mo min) | Low (won court cases) | Overkill for Deal Quest's volume |
| ScrapIn | Real-time public data, no LinkedIn account needed | ~$0.10/credit, plans from $1K/mo | Medium | GDPR/CCPA compliant, no static DB |
| Scrapingdog | Public data only, no login | $30-100/mo for small plans | Medium | Good for low volume |
| People Data Labs | Pre-built dataset, not real-time scraping | Per-record pricing | Low (public records) | Data may be stale |
| PhantomBuster | Browser automation | $59-399/mo | High (uses your LinkedIn session) | Account ban risk |

**Key legal considerations:**
- Scraping public LinkedIn data is **not illegal** per U.S. courts (hiQ v. LinkedIn, 9th Circuit 2022)
- But it **violates LinkedIn ToS**, which is a contract breach (civil, not criminal)
- LinkedIn actively enforces: account bans, legal threats, and lawsuits against scraping companies
- GDPR compliance requires lawful basis for processing personal data
- The safest approach: services that scrape only public data without fake accounts or login credentials

### 2.3 Recommended Approach: Tiered Strategy

**Recommendation: Do NOT build URL scraping as a primary feature. Instead, use a tiered approach.**

**Tier 1 (Build first, zero risk): "Paste the Profile" UX**

When user sends a LinkedIn URL:
1. Bot detects the URL pattern (`linkedin.com/in/...`)
2. Bot responds: "I can see that's a LinkedIn profile. For best results, please: (1) Open the profile (2) Select all text on the page (3) Copy and paste it here. I'll extract everything I need from the text."
3. User pastes the text -> existing text analysis pipeline handles it

This is zero risk, zero cost, and works today. The UX friction is one extra step (copy-paste), but it is reliable and legal.

**Tier 2 (Build second, low risk): Basic URL Metadata Extraction**

For any URL the user sends:
1. Fetch the URL's HTML with a standard HTTP client
2. Extract Open Graph / meta tags (og:title, og:description, og:image)
3. LinkedIn public profiles sometimes expose: name, headline, location in meta tags
4. Use extracted metadata as seed data for the strategist agent

LinkedIn's public profile pages have limited but useful meta tags:
- `<title>` tag: "[Name] - [Headline] | LinkedIn"
- `og:title`: "[Name] - [Headline]"
- `og:description`: Often contains a summary snippet

This gives basic info without scraping. No API needed. Risk: LinkedIn may block bot user-agents, requiring a real browser User-Agent header.

**Tier 3 (Optional, paid): Third-Party API Integration**

If users need richer data from URLs:
1. Integrate ScrapIn or Scrapingdog as an optional, configurable service
2. User provides their own API key (similar to how they provide OpenRouter/Claude keys)
3. Bot calls API with LinkedIn URL, gets structured profile data
4. Profile data feeds into strategist pipeline

This shifts the compliance burden to the user and their API provider. Deal Quest acts as a conduit, not the scraper.

### 2.4 Implementation Plan for URL-to-Lead

**Phase 1 (Tier 1 -- MVP):**
1. URL detection in support handler (regex for `linkedin.com/in/` and other patterns)
2. Informative response guiding user to paste profile text
3. Enhanced text extraction (better parsing of pasted LinkedIn profile text)

**Phase 2 (Tier 2 -- Enhancement):**
1. HTTP fetch of URL with appropriate headers
2. Meta tag extraction (og:title, og:description, etc.)
3. Combine meta data with any user-provided context
4. Feed combined data to strategist pipeline

**Phase 3 (Tier 3 -- Optional premium):**
1. Abstract LinkedIn data provider interface
2. ScrapIn integration as first provider
3. User API key management in settings
4. Structured profile data -> strategist pipeline

---

## 3. Reduced-Friction Input

### 3.1 Current Friction Points

The current flow from "I found a prospect" to "I have an analysis":

```
User: /support
Bot: "Describe your prospect..." (waiting for input)
User: [types/pastes text, sends photo, or records voice]
Bot: "Analyzing..." (15-30s)
Bot: [Full analysis with inline buttons]
```

**Friction points:**
1. Must explicitly enter `/support` command first (FSM state machine)
2. Must be in the "waiting_input" state to send content
3. No way to send content directly without the command prefix
4. If user sends a photo outside of support mode, it is ignored
5. No auto-detection of "this looks like prospect info, want me to analyze it?"

### 3.2 Recommended UX Improvements

**Improvement 1: Smart Input Detection (High Impact, Medium Effort)**

Instead of requiring `/support` first, detect likely prospect content in any message:

```python
# Heuristics for prospect content detection:
# - Message contains LinkedIn URL
# - Photo with caption mentioning "prospect", "lead", "analyze"
# - Forwarded message from a professional context
# - Text matching patterns: "Name: X, Company: Y, ..."
```

When detected, offer a quick-action: "This looks like prospect info. Shall I analyze it?" with Yes/No inline buttons. If Yes, skip to analysis without requiring `/support`.

**Improvement 2: One-Shot Support (High Impact, Low Effort)**

Allow `/support [text]` inline without the two-step flow:

```
User: /support VP of Engineering at Stripe, interested in our AI tools
Bot: "Analyzing..." -> [Full analysis]
```

This already works partially if the command parser is updated. The current handler only shows the intro message and sets state.

**Improvement 3: Quick Lead from Forwarded Messages (Medium Impact, Medium Effort)**

When user forwards a message to the bot:
1. Extract the forwarded message text
2. Detect if it looks like professional/prospect content
3. Offer to create a lead from it

**Improvement 4: "Add to Lead" Quick Action (Medium Impact, Low Effort)**

After analysis, besides the current buttons (Regenerate, Shorter, More Aggressive, Done), add:
- "Quick Re-analyze" -- user can send additional context without starting over
- Already partially supported by the regeneration flow, but could be smoother

### 3.3 Implementation Priority

| Improvement | Impact | Effort | Priority |
|-------------|--------|--------|----------|
| One-Shot `/support [text]` | High | Low | P0 -- build first |
| Smart Input Detection | High | Medium | P1 -- build second |
| Quick Lead from Forwards | Medium | Medium | P2 -- nice to have |
| "Add to Lead" shortcut | Medium | Low | P2 -- nice to have |

---

## 4. Auto-Enrichment Pipeline

### 4.1 Current Enrichment Flow

The existing `_background_enrich_lead()` function (lines 410-474 in `support.py`) already:
1. Builds a web research query from prospect name/company/geography
2. Calls Grok via OpenRouter with web search plugin for deep prospect research
3. Filters garbage responses
4. Saves research to lead's `web_research` field
5. Generates an engagement plan via `EngagementService.generate_plan()`
6. Saves engagement plan and schedules first followup (3 days out)

This fires as a background task after lead creation/merge.

### 4.2 Extension for Multi-Input Types

The enrichment pipeline is already input-type-agnostic -- it works on the stored lead data, not the raw input. The key improvement is making sure different input types produce the same quality of structured data BEFORE enrichment.

**Proposed unified flow:**

```
ANY INPUT TYPE
     |
     v
[Input Router] -- detects type: text | photo | voice | url | forward
     |
     v
[Type-Specific Extractor]
  - text: validate, clean (existing)
  - photo: ExtractionAgent (new, Section 1.3)
  - voice: TranscriptionService (existing)
  - url: Meta tag extraction (Section 2.3 Tier 2)
  - forward: Text extraction from forwarded message
     |
     v
[Normalized Text Output]
  { name, title, company, location, raw_context }
     |
     v
[Pre-Analysis Dedup Check] -- does this lead already exist?
     |
     +-- YES --> Merge: update existing lead, re-run analysis
     +-- NO  --> Create: new lead
     |
     v
[Strategist Agent] -- existing pipeline, unchanged
     |
     v
[Background Enrichment] -- existing, unchanged
  - Web research (Grok + web search)
  - Engagement plan generation
  - Followup scheduling
```

### 4.3 Pipeline YAML Configuration

The existing YAML pipeline system (`data/pipelines/support.yaml`) can be extended:

```yaml
# data/pipelines/smart_support.yaml
name: smart_support
description: "Smart lead creation: extract -> analyze -> enrich"
steps:
  - agent: extractor
    mode: sequential
    input_mapping:
      input_type: "ctx.input_type"
      raw_content: "ctx.user_message"
      image_data: "ctx.image_b64"

  - agent: strategist
    mode: sequential
    input_mapping:
      knowledge_base: "ctx.knowledge_base"
      user_memory: "ctx.user_memory"
      casebook_text: "ctx.casebook_text"
      extracted_data: "result.extractor"

  - agent: memory
    mode: background
    input_mapping:
      strategist_output: "result.strategist"
      user_memory: "ctx.user_memory"
```

This requires adding `input_type` to `PipelineContext` (trivial -- add one field).

### 4.4 Business Card Photo Support

Business cards are a natural input for sales reps meeting prospects at events. The extraction agent prompt should handle:

```
Detect source_type: business_card
Extract: name, title, company, phone, email, website, address
Note: Business cards often have logos (company identification) and
      QR codes (can note presence but not decode)
```

Vision models handle business cards well because they have:
- High contrast (dark text on light background)
- Structured layout
- Limited text content
- Clear field boundaries

### 4.5 Email Forward/Screenshot Support

Sales reps often receive prospect emails. The system should handle:
- **Email screenshots**: Extract sender name, company (from email domain), subject, body text
- **Forwarded text**: Parse email headers (From, Subject, Date) if present in the text

The extraction agent prompt should detect email patterns and extract:
```
{ sender_name, sender_email, sender_company (from domain), subject, body_preview, date }
```

---

## 5. Technical Implementation Details

### 5.1 ClaudeProvider Image Support Fix

The current `ClaudeProvider.complete()` ignores the `image_b64` parameter. Fix:

```python
# In ClaudeProvider.complete(), change:
#   "messages": [{"role": "user", "content": user_message}]
# To:
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

# Then:
"messages": [{"role": "user", "content": user_content}]
```

Per Claude's official API docs:
- Supported formats: JPEG, PNG, GIF, WebP
- Max size: 5MB per image (API), 8000x8000 px max
- Images before text perform better
- Recommended max: 1568px on longest edge for optimal token usage
- Token cost: ~`(width * height) / 750` tokens per image

### 5.2 Image Size Optimization

Telegram sends photos in multiple sizes. The current code uses `message.photo[-1]` (largest). For vision model processing, we should:

1. Use the largest photo (current behavior) -- vision models need detail
2. Check dimensions -- if either dimension > 1568px, resize before encoding
3. This reduces token cost without reducing accuracy (per Claude docs: images get resized anyway, but pre-resizing avoids latency penalty)

```python
from PIL import Image
import io

MAX_DIMENSION = 1568

def optimize_image(file_bytes: bytes) -> bytes:
    img = Image.open(io.BytesIO(file_bytes))
    if max(img.size) > MAX_DIMENSION:
        img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=85)
        return buffer.getvalue()
    return file_bytes
```

This adds `Pillow` as a dependency (likely already present or trivially installable).

### 5.3 Input Type Detection

```python
import re

URL_PATTERNS = {
    "linkedin_profile": r"https?://(?:www\.)?linkedin\.com/in/[\w-]+",
    "linkedin_company": r"https?://(?:www\.)?linkedin\.com/company/[\w-]+",
    "generic_url": r"https?://[\w.-]+\.[a-z]{2,}[/\w.-]*",
}

def detect_input_type(message) -> str:
    """Detect the type of input from a Telegram message."""
    if message.photo:
        return "photo"
    if message.voice:
        return "voice"
    if message.forward_from or message.forward_from_chat:
        return "forward"
    text = message.text or message.caption or ""
    for pattern_name, pattern in URL_PATTERNS.items():
        if re.search(pattern, text):
            return pattern_name
    return "text"
```

### 5.4 PipelineContext Extension

Add `input_type` field to `PipelineContext`:

```python
class PipelineContext:
    def __init__(
        self,
        *,
        # ... existing fields ...
        input_type: str = "text",  # text | photo | voice | url | forward
    ) -> None:
        # ... existing init ...
        self.input_type = input_type
```

This is backward-compatible -- existing pipelines don't use it.

---

## 6. Pitfalls and Risks

### 6.1 Critical: Vision Model Hallucination on Names

**Risk:** Vision models may misread or hallucinate names from screenshots, leading to incorrect lead dedup or wrong prospect identification.

**Mitigation:**
- Two-step pipeline (extract then confirm) lets user validate before analysis
- Fuzzy dedup matching (already implemented in `LeadRegistryRepo.find_duplicate()`) handles minor variations
- Store raw extracted text alongside interpreted fields for debugging

### 6.2 Critical: Cost Escalation with Vision

**Risk:** Image analysis costs more tokens than text. If every lead creation involves a vision call, costs could spike.

**Mitigation:**
- Pre-resize images (Section 5.2) to reduce token usage
- For OpenRouter free tier users, verify the default model supports vision
- Track vision usage separately in analytics
- Consider caching: if same image is sent twice, skip re-extraction

### 6.3 Moderate: LinkedIn URL Dead End

**Risk:** Users expect to paste a LinkedIn URL and get instant results, but we cannot reliably scrape the profile.

**Mitigation:**
- Set clear expectations in the UX: "I'll guide you to share the profile info"
- Tier 1 (paste text) is always available
- Tier 2 (meta tags) provides a best-effort experience
- Never promise "automatic LinkedIn profile import" in marketing/onboarding

### 6.4 Moderate: Pipeline Complexity Growth

**Risk:** Adding extraction agent, input routing, and multi-type support increases pipeline complexity.

**Mitigation:**
- Keep extraction agent simple (no knowledge base injection, no heavy prompting)
- Use the existing YAML pipeline system for configuration
- All new agents follow the existing `BaseAgent` pattern
- Input routing logic is a simple function, not a new system

### 6.5 Minor: Telegram Photo Compression

**Risk:** Telegram compresses photos before delivery. This may reduce OCR accuracy for small text.

**Mitigation:**
- Use `message.photo[-1]` (largest available size) -- already doing this
- Telegram's largest photo size is typically 1280px on longest edge
- For screenshots, this is usually sufficient (text is rendered, not handwritten)
- For very small text, prompt the user: "Text was hard to read. Can you crop the screenshot to focus on the key info?"

---

## 7. Implications for Roadmap

### Suggested Phase Structure

**Phase 1: Screenshot-to-Lead Pipeline (Core)**
- Fix ClaudeProvider image passing
- Create ExtractionAgent with OCR-focused prompt
- Create `smart_support` pipeline YAML (extract -> strategize)
- Image size optimization (Pillow resize)
- Update support handler to use new pipeline
- Pre-analysis dedup with extracted data

**Phase 2: Reduced-Friction Input**
- One-shot `/support [text]` command
- Input type detection and routing
- URL detection with "paste text" guidance (Tier 1)
- Forwarded message handling
- Smart input detection (auto-offer analysis)

**Phase 3: URL Enrichment (Enhancement)**
- HTTP fetch of URL meta tags (Tier 2)
- Combine meta data with user context
- Optional: Third-party API integration interface (Tier 3)

### Phase Ordering Rationale

1. **Screenshot-to-lead first** because it has the highest impact (users already send photos, but the extraction quality is poor), and all infrastructure exists. It is mostly prompt engineering + one new agent.
2. **Reduced-friction second** because it builds on the input routing logic needed for screenshots and makes the overall UX better before adding URL handling.
3. **URL enrichment last** because it has the most uncertainty (legal, technical, cost), and Tier 1 (paste text) provides a functional workaround in the meantime.

### Dependencies on Other Epics

- **Engagement Plan Executor** (Epic 2) will consume the leads created here, so the lead data quality matters
- **Conversational Re-analysis** (Epic 3) needs the extraction pipeline to accept "new context" updates to existing leads

---

## 8. Sources

### Official Documentation (HIGH confidence)
- [Claude Vision API Docs](https://platform.claude.com/docs/en/build-with-claude/vision) -- Image formats, size limits, API usage, best practices
- [OpenRouter Multimodal Docs](https://openrouter.ai/docs/guides/overview/multimodal/overview) -- Image passing via URL and base64, vision model support
- [LinkedIn Developer Portal](https://developer.linkedin.com/) -- Official API access requirements and limitations
- [LinkedIn User Agreement](https://www.linkedin.com/legal/user-agreement) -- Explicit prohibition on scraping

### Verified Research (MEDIUM confidence)
- [Claude Vision for Document Analysis](https://getstream.io/blog/anthropic-claude-visual-reasoning/) -- OCR accuracy benchmarks (CER ~2.1%)
- [DeepSeek OCR vs Claude Vision](https://sparkco.ai/blog/deepseek-ocr-vs-claude-vision-a-deep-dive-into-accuracy) -- Comparative OCR accuracy data
- [LinkedIn scraping legality and best practices](https://sociavault.com/blog/linkedin-scraping-guide-2025) -- Legal landscape overview
- [hiQ v. LinkedIn (Ninth Circuit)](https://www.bardeen.ai/answers/is-linkedin-scraping-legal) -- Key court ruling on public data scraping
- [LinkedIn takes legal action (2025)](https://news.linkedin.com/2025/linkedin-takes-legal-action-to-defend-member-privacy) -- LinkedIn's enforcement posture
- [Proxycurl alternatives for LinkedIn scraping](https://www.thordata.com/blog/proxies/proxycurl-alternatives-for-linkedin-scraping) -- Post-Proxycurl landscape
- [ScrapIn API](https://www.scrapin.io/) -- Real-time LinkedIn data, pricing from $0.10/credit
- [Best open-source OCR models](https://getomni.ai/blog/benchmarking-open-source-models-for-ocr) -- OCR model benchmarks
- [OpenRouter free LLM image-to-text](https://github.com/ceodaniyal/free-llm-image-to-text) -- Free vision OCR via OpenRouter
- [LinkedIn scraper tools comparison 2026](https://www.lindy.ai/blog/linkedin-scraper) -- Current tool landscape
- [n8n Telegram + Gemini OCR workflow](https://n8n.io/workflows/5864-extract-text-from-images-with-telegram-bot-and-gemini-20-flash-ocr/) -- Telegram OCR pipeline patterns
- [AI lead generation automation](https://monday.com/blog/crm-and-sales/ai-lead-management/) -- CRM friction reduction patterns

### Codebase Analysis (HIGH confidence)
- `bot/handlers/support.py` -- Current photo handling, pipeline invocation, lead creation
- `bot/services/llm_router.py` -- LLM providers, vision support in OpenRouter (line 165-172), missing in Claude (line 88-106)
- `bot/agents/strategist.py` -- Current strategist agent, prompt template
- `bot/pipeline/runner.py` -- Pipeline execution engine, sequential/parallel/background modes
- `bot/pipeline/context.py` -- PipelineContext, image_b64 field already exists
- `bot/storage/models.py` -- LeadRegistryModel fields, input_type tracking
- `bot/services/engagement.py` -- Engagement plan generation, comment generation with vision
- `data/pipelines/support.yaml` -- Current 2-step pipeline (strategist -> memory background)
- `prompts/strategist_agent.md` -- Strategist prompt with prospect_info extraction (Step 0)
