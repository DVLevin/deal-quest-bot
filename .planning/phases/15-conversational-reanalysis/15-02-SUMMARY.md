---
phase: 15-conversational-reanalysis
plan: 02
subsystem: bot-handlers
tags: [aiogram, fsm, multimodal, transcription, assemblyai, lead-management]

# Dependency graph
requires:
  - phase: 13-smart-lead-creation
    provides: LeadRegistryRepo, LeadActivityRepo, lead_registry table
  - phase: 14-engagement-plan-execution
    provides: scheduled_reminders, reminder handlers
provides:
  - ReanalysisState FSM states for context collection flow
  - context_input.py handler for multimodal input (text/voice/photo/forward)
  - Add Context button in reminder and lead detail views
  - Re-analyze Strategy prompt after context addition
affects: [15-03, 15-04, 16-tma-lead-experience]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Multimodal input handling with activity type detection"
    - "FSM state flow for context collection"
    - "TranscriptionService DI for voice notes"

key-files:
  created:
    - bot/handlers/context_input.py
  modified:
    - bot/states.py
    - bot/handlers/reminders.py
    - bot/handlers/leads.py
    - bot/main.py

key-decisions:
  - "Voice notes transcribed via existing TranscriptionService DI"
  - "Activity type auto-detected from text content (prospect_response, meeting_notes, context_update)"
  - "Photos saved with metadata indicator, not full base64 in database"
  - "Forwarded messages capture sender info and forward_date"
  - "Re-analyze button shown after each context input for immediate action"

patterns-established:
  - "context:add:{lead_id} callback pattern for entering context input flow"
  - "ReanalysisState FSM for multi-step context + re-analysis flow"

# Metrics
duration: 3min
completed: 2026-02-05
---

# Phase 15 Plan 02: Context Input Flow Summary

**Multimodal context collection FSM with text/voice/photo/forward handlers and re-analyze prompting**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-05T14:44:18Z
- **Completed:** 2026-02-05T14:47:35Z
- **Tasks:** 5
- **Files modified:** 5

## Accomplishments

- Created ReanalysisState FSM with collecting_context, confirming_reanalysis, updating_plan states
- Built comprehensive context_input.py handler supporting text, voice notes, photos, and forwarded messages
- Added Add Context buttons to all reminder callbacks (done, snooze, skip, draft)
- Updated lead detail view to use new context:add callback for multimodal input
- Wired context_input router to dispatcher with TranscriptionService DI

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ReanalysisState to states.py** - `6b7d06a` (feat)
2. **Task 2: Create context_input.py handler module** - `62f8364` (feat)
3. **Task 3: Update reminders.py with Add Context button** - `0bf5910` (feat)
4. **Task 4: Update leads.py with Add Context button** - `ed405c6` (feat)
5. **Task 5: Wire context_input router to main.py** - `7104b9b` (feat)

## Files Created/Modified

- `bot/states.py` - Added ReanalysisState with 3 states for context collection flow
- `bot/handlers/context_input.py` - New handler module (511 lines) for multimodal context input
- `bot/handlers/reminders.py` - Added Add Context button to 4 callback handlers
- `bot/handlers/leads.py` - Changed Add Update to Add Context with new callback pattern
- `bot/main.py` - Imported and registered context_input router

## Decisions Made

1. **TranscriptionService DI pattern** - Used existing transcription service injection rather than passing raw API key, following established handler patterns
2. **Activity type detection** - Implemented heuristic detection based on text content for automatic categorization (prospect_response, meeting_notes, context_update)
3. **Photo storage strategy** - Store only metadata indicator in activity.metadata, not full base64 (kept in FSM state for re-analysis if needed)
4. **Forward handling** - Capture forward_from and forward_date in metadata for context

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Voice transcription uses existing AssemblyAI configuration.

## Next Phase Readiness

- Context input infrastructure complete for all input types
- Ready for Plan 03 (Re-analysis Pipeline) to implement the actual re-analysis when user taps "Re-analyze Strategy"
- reanalyze:start callback registered but handler not yet implemented (will be in Plan 03)

---
*Phase: 15-conversational-reanalysis*
*Completed: 2026-02-05*
