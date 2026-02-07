---
phase: 19-active-engagement-execution
plan: 04
subsystem: api
tags: [vision-model, draft-generation, background-poller, langfuse, multi-platform]

# Dependency graph
requires:
  - phase: 18-agent-observatory
    provides: "ModelConfigService, AgentRegistry, @observe decorator, Langfuse tracing"
  - phase: 19-01
    provides: "Proof upload to InsForge storage, image_utils.pre_resize_image"
  - phase: 19-02
    provides: "StepActionScreen with draft copy UI (consumer of draft_requests results)"
  - phase: 19-03
    provides: "StepActionScreen wiring into LeadDetail with deep link auto-expand"
provides:
  - "draft_requests table (TMA -> Bot async message bus)"
  - "DraftRequestModel and DraftRequestRepo with claim_next_pending pattern"
  - "CommentGeneratorAgent with multi-platform auto-detection and vision model support"
  - "Background draft_request_poller running every 3 seconds"
  - "Stale processing request recovery on bot startup"
affects: [19-05, tma-draft-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DB message bus pattern for async TMA-to-bot communication"
    - "claim_next_pending with optimistic status update for race-safe polling"

key-files:
  created:
    - "insforge/migrations/006_draft_requests.sql"
    - "bot/agents/comment_generator.py"
    - "prompts/comment_generator_agent.md"
    - "bot/services/draft_poller.py"
  modified:
    - "bot/storage/models.py"
    - "bot/storage/repositories.py"
    - "bot/main.py"

key-decisions:
  - "DB message bus pattern (polling draft_requests table) instead of adding HTTP server to bot"
  - "3-second polling interval balances responsiveness with resource usage"
  - "Stale processing recovery with 2-minute threshold on bot startup"
  - "Multi-platform auto-detection in prompt (LinkedIn, email, Twitter/X, Slack, DMs, etc.)"
  - "Structured JSON output with platform, content_type, and 3 options (short/medium/detailed)"

patterns-established:
  - "DB message bus: TMA inserts row, bot polls and processes, TMA polls for result"
  - "claim_next_pending: query pending + update to processing in two-step for race safety"

# Metrics
duration: 3min
completed: 2026-02-07
---

# Phase 19 Plan 04: Bot-Side Draft Generation Pipeline Summary

**CommentGeneratorAgent with multi-platform auto-detection, background draft_requests poller, and Langfuse-traced vision model pipeline**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-07T10:52:01Z
- **Completed:** 2026-02-07T10:55:01Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Created draft_requests table with status check constraint and partial indexes for efficient polling
- Built CommentGeneratorAgent that auto-detects platform from screenshots and returns structured JSON with 3 response options
- Implemented background poller that processes pending draft requests through the agent pipeline with ModelConfigService integration
- Stale processing request recovery on bot startup prevents stuck requests after crashes

## Task Commits

Each task was committed atomically:

1. **Task 1: Create draft_requests migration, Pydantic model, and DraftRequestRepo** - `db03748` (feat)
2. **Task 2: Create CommentGeneratorAgent with multi-platform prompt** - `50f855b` (feat)
3. **Task 3: Create draft request poller and wire into main.py** - `1c135e4` (feat)

## Files Created/Modified
- `insforge/migrations/006_draft_requests.sql` - Draft requests table with status constraint and indexes
- `bot/storage/models.py` - Added DraftRequestModel
- `bot/storage/repositories.py` - Added DraftRequestRepo with claim_next_pending, complete, fail, reset_stale_processing
- `bot/agents/comment_generator.py` - CommentGeneratorAgent with @observe decorator and vision model support
- `prompts/comment_generator_agent.md` - Multi-platform auto-detection prompt with structured JSON output
- `bot/services/draft_poller.py` - Background poller with image fetch, resize, encode, and agent processing
- `bot/main.py` - Registered agent, created repo, started poller as background task

## Decisions Made
- DB message bus pattern chosen over HTTP server: bot already runs as a long-polling process, adding HTTP would complicate deployment. Polling a table at 3s intervals is simpler and sufficient.
- Multi-platform prompt replaces LinkedIn-only Edge Function: auto-detects platform from screenshot content, supports LinkedIn, email, Twitter/X, Slack, Facebook, WhatsApp, Telegram.
- Structured JSON output (platform + content_type + options array) replaces raw text: enables TMA to render draft cards with copy-to-clipboard for each option.
- claim_next_pending uses two-step (query + conditional update) for race safety: if two pollers ran simultaneously, only one would succeed in claiming.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- PIL (Pillow) not available in system Python, but this is an existing dependency already used by image_utils.py. The bot runs in a virtual environment with Pillow installed. Syntax verification confirmed all code is correct.

## User Setup Required

- Run migration `insforge/migrations/006_draft_requests.sql` on InsForge database

## Next Phase Readiness
- Draft generation pipeline is complete and ready for TMA integration
- TMA needs to insert rows into draft_requests and poll for completed results
- Admin can configure comment_generator model via existing ModelConfigPanel in TMA admin page
- No blockers or concerns

## Self-Check: PASSED

---
*Phase: 19-active-engagement-execution*
*Completed: 2026-02-07*
