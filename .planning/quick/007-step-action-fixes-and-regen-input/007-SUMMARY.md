---
phase: quick-007
plan: 01
subsystem: ui, api
tags: [error-handling, draft-generation, linkedin, telegram-mini-app, python-bot]

# Dependency graph
requires:
  - phase: 19-active-engagement
    provides: StepActionScreen, DraftCopyCard, useUpdatePlanStep, useGenerateDraft, draft_poller, CommentGeneratorAgent
provides:
  - Specific error messages with retry buttons for all step mutations
  - User instruction input for draft regeneration (full stack TMA -> DB -> Bot -> Agent)
  - LinkedIn connection request character counter with 200-char limit warning
affects: [leads, engagement-plan, draft-generation]

# Tech tracking
tech-stack:
  added: []
  patterns: [retry-action-in-toast, instruction-passthrough-via-db-message-bus, progressive-disclosure-for-regeneration]

key-files:
  created:
    - insforge/migrations/008_draft_requests_user_instructions.sql
  modified:
    - packages/webapp/src/features/leads/hooks/useUpdatePlanStep.ts
    - packages/webapp/src/features/leads/hooks/useGenerateDraft.ts
    - packages/webapp/src/features/leads/components/LeadDetail.tsx
    - packages/webapp/src/features/leads/components/StepActionScreen.tsx
    - packages/webapp/src/features/leads/components/DraftCopyCard.tsx
    - bot/storage/models.py
    - bot/services/draft_poller.py
    - bot/agents/comment_generator.py

key-decisions:
  - "Activity log insert failures are non-blocking (console.warn) since step update already succeeded"
  - "Upload-then-update orphan handled by retry-linking pattern (retries step update only, not re-upload)"
  - "Regeneration shows instruction input on first click, generates on second click (progressive disclosure)"
  - "First-time draft generation skips instruction input (no existing draft to improve upon)"
  - "LinkedIn invite char limit at 200 with color zones: green (<170), yellow (170-200), red (>200)"
  - "General long text counter appears only above 280 chars (common social media limit)"

patterns-established:
  - "Toast retry pattern: extract Error.message, include action with label and onClick retry callback"
  - "Regeneration instruction passthrough: textarea -> mutation var -> DB column -> agent context -> LLM prompt"

# Metrics
duration: 3min
completed: 2026-02-08
---

# Quick 007: Step Action Fixes and Regen Input Summary

**Resilient step actions with specific error messages + retry buttons, draft regeneration with custom user instructions (full stack), and LinkedIn 200-char connection request counter**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-08T09:12:32Z
- **Completed:** 2026-02-08T09:16:18Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- All step mutation errors now show specific messages (not generic "Failed to...") with retry buttons
- Activity log failures are non-blocking -- step completion succeeds even if activity log insert fails
- Upload-then-update failures offer "Retry linking" that retries only the step update with already-uploaded URL
- Full-stack user instructions for draft regeneration: textarea in TMA -> DB column -> bot poller -> agent prompt
- LinkedIn connection request drafts show colored character counter with 200-char limit warning
- General long text counter for any draft exceeding 280 characters

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix error handling in step mutations and upload-then-update flow** - `d4bc0db` (fix)
2. **Task 2: Add user instructions for draft regeneration (full stack)** - `4b1ac8f` (feat)
3. **Task 3: Add LinkedIn character counter to DraftCopyCard** - `458ea44` (feat)

## Files Created/Modified
- `insforge/migrations/008_draft_requests_user_instructions.sql` - Adds user_instructions TEXT column to draft_requests
- `packages/webapp/src/features/leads/hooks/useUpdatePlanStep.ts` - Specific error messages at each failure point, non-blocking activity log
- `packages/webapp/src/features/leads/hooks/useGenerateDraft.ts` - userInstructions parameter in mutation vars and DB insert
- `packages/webapp/src/features/leads/components/LeadDetail.tsx` - Error extraction + retry buttons on all handlers, instructions wiring
- `packages/webapp/src/features/leads/components/StepActionScreen.tsx` - Instruction textarea UI for regeneration, contentType prop passthrough
- `packages/webapp/src/features/leads/components/DraftCopyCard.tsx` - LinkedIn char counter with color-coded limit, general long text counter
- `bot/storage/models.py` - user_instructions field on DraftRequestModel
- `bot/services/draft_poller.py` - Passes user_instructions from request to agent input context
- `bot/agents/comment_generator.py` - Incorporates user_instructions into LLM prompt when present

## Decisions Made
- Activity log failures demoted from throw to console.warn (step update is the primary operation)
- Progressive disclosure for regeneration instructions (show input on first click, generate on second)
- LinkedIn invite char limit 200 with 85% yellow threshold (170 chars)
- 500-char limit on regeneration instructions textarea
- user_instructions column is nullable TEXT with DEFAULT NULL (backward compatible)

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

- Run migration `insforge/migrations/008_draft_requests_user_instructions.sql` on InsForge database

## Next Phase Readiness
- All error handlers now provide specific messages and retry actions
- Draft regeneration with instructions ready end-to-end once migration is run
- LinkedIn character counter active for all connection_request type drafts

---
*Quick task: 007-step-action-fixes-and-regen-input*
*Completed: 2026-02-08*
