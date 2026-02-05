---
phase: 13-smart-lead-creation
plan: 03
subsystem: pipeline
tags: [vision, ocr, pipeline, extraction, routing]

# Dependency graph
requires:
  - phase: 13-01
    provides: Image pre-resize utility for vision models
  - phase: 13-02
    provides: ExtractionAgent for OCR data extraction
provides:
  - Two-step support_photo pipeline config (extraction -> strategist -> memory)
  - URL input detection with guidance message
  - Image pre-resize integration for photos
  - StrategistAgent extraction result integration
  - Extraction data merge into prospect_info for lead storage
affects: [phase-14, phase-15, phase-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Two-step pipeline for photo analysis (OCR first, then strategist)
    - Input type routing in handlers (URL vs text vs photo)

key-files:
  created:
    - data/pipelines/support_photo.yaml
  modified:
    - bot/handlers/support.py
    - bot/agents/strategist.py

key-decisions:
  - "URL inputs show guidance instead of attempting scrape (legal risk)"
  - "Extraction data prepended to user_message for strategist LLM call"
  - "Extraction results merged into prospect_info only if strategist didn't capture them"

patterns-established:
  - "Pipeline selection via pipeline_name parameter in _run_support_pipeline"
  - "Extraction result integration via ctx.get_result('extraction')"

# Metrics
duration: 5min
completed: 2026-02-05
---

# Phase 13 Plan 3: Lead Creation Pipeline Summary

**Two-step photo pipeline with extraction->strategist flow, URL guidance, and image pre-resize integration**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-05T09:01:25Z
- **Completed:** 2026-02-05T09:06:46Z
- **Tasks:** 4
- **Files modified:** 3

## Accomplishments

- Created support_photo.yaml pipeline config with extraction -> strategist -> memory steps
- Added URL detection pattern and guidance message for users pasting URLs
- Integrated image pre-resize before vision model encoding
- StrategistAgent now prepends extraction results to user_message for better analysis
- Extraction results merged into prospect_info for accurate lead storage

## Task Commits

Each task was committed atomically:

1. **Task 1: Create support_photo pipeline config** - `b8d6fee` (feat)
2. **Task 2: Add input routing and image pre-resize** - `175cac4` (feat)
3. **Task 3: Integrate extraction results in StrategistAgent** - `3a4ff66` (feat)
4. **Task 4: Merge extraction results into prospect_info** - `2ca61c1` (feat)

## Files Created/Modified

- `data/pipelines/support_photo.yaml` - Two-step photo pipeline: extraction -> strategist -> memory
- `bot/handlers/support.py` - URL routing, pre-resize, pipeline_name parameter, extraction merge
- `bot/agents/strategist.py` - Check extraction results, prepend to user_message

## Decisions Made

- URL inputs show guidance message instead of attempting to process - LinkedIn blocks scraping anyway
- Extraction results are prepended to user_message (not system prompt) so strategist LLM has clean prospect info
- Extraction merge only fills in missing fields - if strategist already parsed name/company, keep its values

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 13 (Smart Lead Creation) is complete
- Photo inputs now route through two-step extraction pipeline
- URL inputs get helpful guidance to paste text instead
- Extracted prospect data flows through to lead registry

---
*Phase: 13-smart-lead-creation*
*Completed: 2026-02-05*
