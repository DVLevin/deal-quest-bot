---
phase: 13-smart-lead-creation
plan: 02
subsystem: ai-agents
tags: [ocr, extraction, llm, vision]
requires:
  - bot/agents/base.py
  - bot/pipeline/context.py
  - bot/tracing
provides:
  - ExtractionAgent class for focused OCR extraction
  - Prompt file for OCR extraction
affects:
  - 13-03 (lead creation pipeline)
tech-stack:
  added: []
  patterns:
    - Dedicated OCR agent without knowledge base injection
    - Focused single-purpose prompt design
key-files:
  created:
    - bot/agents/extraction.py
    - prompts/extraction_agent.md
  modified:
    - bot/main.py
decisions:
  - No knowledge base injection in ExtractionAgent (keeps OCR focused)
  - Returns structured JSON with 6 fields (first_name, last_name, title, company, geography, context)
  - Uses @traced_span for observability consistency
metrics:
  duration: ~2m
  completed: 2026-02-05
---

# Phase 13 Plan 02: Extraction Agent Summary

**One-liner:** Dedicated ExtractionAgent for clean OCR extraction from prospect screenshots without knowledge base pollution.

## What Was Built

1. **ExtractionAgent class** (`bot/agents/extraction.py`)
   - Follows BaseAgent pattern from existing agents
   - Uses `@traced_span("agent:extraction")` for observability
   - Validates image exists before calling LLM
   - Ensures all expected fields present in output
   - No knowledge base injection (pure OCR focus)

2. **Focused OCR prompt** (`prompts/extraction_agent.md`)
   - Clear instructions for structured extraction only
   - Defines 6 output fields: first_name, last_name, title, company, geography, context
   - Explicit instructions to NOT infer or guess missing information
   - Returns raw JSON without analysis or strategy

3. **Agent registration** in `bot/main.py`
   - Import added with other agent imports
   - Registered with agent_registry for pipeline access

## Key Implementation Details

**Why a separate agent?**
Combining OCR extraction with strategic analysis in a single prompt produces garbled names because the model tries to do too much. ExtractionAgent handles ONLY extraction; StrategistAgent handles analysis separately.

**Agent pattern:**
```python
class ExtractionAgent(BaseAgent):
    name = "extraction"

    @traced_span("agent:extraction")
    async def run(self, input_data: AgentInput, pipeline_ctx: PipelineContext) -> AgentOutput:
        # Uses focused prompt without knowledge base
        result = await pipeline_ctx.llm.complete(
            self._prompt,
            user_message,
            image_b64=pipeline_ctx.image_b64,
        )
```

**Output structure:**
```json
{
  "first_name": "string or null",
  "last_name": "string or null",
  "title": "string or null",
  "company": "string or null",
  "geography": "string or null",
  "context": "string or null"
}
```

## Commits

| Hash | Type | Description |
|------|------|-------------|
| d86258c | feat | Create ExtractionAgent and focused OCR prompt |
| eb92fa0 | feat | Register ExtractionAgent in main.py |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| No knowledge base injection | Keeps prompt focused on OCR only, prevents model confusion |
| 6-field output structure | Matches lead registry fields from quick-002 migration |
| Returns null for missing fields | Explicit handling rather than empty strings |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**For 13-03 (Lead Creation Pipeline):**
- ExtractionAgent available via `agent_registry.get("extraction")`
- Returns structured data ready for lead creation
- Can be chained with StrategistAgent for full analysis
