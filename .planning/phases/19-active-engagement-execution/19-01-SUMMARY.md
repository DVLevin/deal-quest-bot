---
phase: 19-active-engagement-execution
plan: 01
subsystem: ui
tags: [typescript, tanstack-query, insforge-storage, canvas-resize, jsonb]

# Dependency graph
requires:
  - phase: 14-engagement-plan-execution
    provides: EngagementPlanStep type, useUpdatePlanStep hook, engagement_plan JSONB
provides:
  - Extended EngagementPlanStep with proof_url, cant_perform_reason, alternative_action
  - Defensive parser for backward-compatible field parsing
  - Enhanced useUpdatePlanStep with proof and can't-perform data persistence
  - useUploadProof hook with client-side image resize and InsForge storage upload
affects: [19-02-action-screen-ui, 19-03-cant-perform-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Canvas-based client-side image resize before storage upload"
    - "Conditional spread for optional JSONB field updates"

key-files:
  created:
    - packages/webapp/src/features/leads/hooks/useUploadProof.ts
  modified:
    - packages/webapp/src/types/tables.ts
    - packages/webapp/src/features/leads/types.ts
    - packages/webapp/src/features/leads/hooks/useUpdatePlanStep.ts

key-decisions:
  - "getPublicUrl returns string directly (InsForge SDK), not {data: {publicUrl}} (Supabase pattern)"
  - "Can't-perform treated as 'skipped' status with cant_perform_reason set (no new PlanStepStatus value)"
  - "Image resize uses canvas with 1200px max dimension and JPEG 0.85 quality"
  - "Proof files stored in existing prospect-photos bucket with proof/ key prefix"

patterns-established:
  - "Conditional spread pattern: ...(value !== undefined && { field: value }) for optional JSONB updates"
  - "resizeImage exported separately for independent testability"

# Metrics
duration: 4min
completed: 2026-02-07
---

# Phase 19 Plan 01: Types & Hooks Foundation Summary

**Extended EngagementPlanStep with proof/cant-perform fields, defensive parser, enhanced step mutation, and canvas-resize upload hook**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-07T08:33:37Z
- **Completed:** 2026-02-07T08:37:52Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Extended EngagementPlanStep type with three new backward-compatible optional fields
- Updated defensive parser to handle pre-Phase-19 data without errors
- Enhanced useUpdatePlanStep to persist proof_url and cant_perform_reason to JSONB
- Created useUploadProof hook with client-side canvas resize and InsForge storage upload

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend EngagementPlanStep type and parser** - `d495a31` (feat)
2. **Task 2: Extend useUpdatePlanStep and create useUploadProof** - `0e5b724` (feat)

## Files Created/Modified
- `packages/webapp/src/types/tables.ts` - Added proof_url, cant_perform_reason, alternative_action to EngagementPlanStep
- `packages/webapp/src/features/leads/types.ts` - Defensive typeof guards for three new fields in parseEngagementPlan
- `packages/webapp/src/features/leads/hooks/useUpdatePlanStep.ts` - proofUrl/cantPerformReason in vars, JSONB spread, activity log differentiation
- `packages/webapp/src/features/leads/hooks/useUploadProof.ts` - New hook: resizeImage utility, prospect-photos/proof/ upload, public URL return

## Decisions Made
- InsForge SDK `getPublicUrl` returns a plain string (not wrapped in `{data: {publicUrl}}`). Adapted from Supabase pattern used in plan to actual SDK API.
- Can't-perform is modeled as `status: 'skipped'` with `cant_perform_reason` set, avoiding cross-stack type changes to PlanStepStatus.
- Proof images resized client-side to max 1200px dimension at JPEG quality 0.85 before upload.
- Reuse existing `prospect-photos` bucket with `proof/` key prefix rather than creating new bucket.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed getPublicUrl return type mismatch**
- **Found during:** Task 2 (useUploadProof creation)
- **Issue:** Plan specified `const { data: urlData } = getInsforge().storage.from('prospect-photos').getPublicUrl(key)` but InsForge SDK returns string directly, not `{data: {publicUrl}}`
- **Fix:** Changed to `const publicUrl = getInsforge().storage.from('prospect-photos').getPublicUrl(key)` and return `publicUrl` directly
- **Files modified:** packages/webapp/src/features/leads/hooks/useUploadProof.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** 0e5b724 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Fix was necessary for TypeScript compilation. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Types and hooks are ready for UI components to consume in plan 19-02
- useUploadProof provides the complete upload flow (resize -> upload -> URL)
- useUpdatePlanStep can now persist proof and can't-perform data alongside status changes
- All new fields are backward compatible -- existing data continues to work

---
*Phase: 19-active-engagement-execution*
*Completed: 2026-02-07*
