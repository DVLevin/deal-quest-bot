# Quick Task 006: TMA-Initiated Engagement Plan Generation via DB Message Bus

**One-liner:** In-app plan generation via plan_requests DB message bus (same pattern as draft_requests)

## Task Commits

| Task | Description | Commit | Key Files |
|------|-------------|--------|-----------|
| 1 | Migration + model + repo | 5fa6cd5 | `insforge/migrations/007_plan_requests.sql`, `bot/storage/models.py`, `bot/storage/repositories.py` |
| 2 | Plan poller + main.py wiring | 964258c | `bot/services/plan_poller.py`, `bot/main.py` |
| 3 | TMA hook + UI wiring | 03a2733 | `packages/webapp/src/features/leads/hooks/useGeneratePlan.ts`, `packages/webapp/src/features/leads/components/LeadDetail.tsx` |

## What Was Built

### Bot Side
- **plan_requests table** (migration 007): `id`, `lead_id`, `telegram_id`, `status` (pending/processing/completed/failed), `result` (JSONB), timestamps. Partial index on pending status for efficient polling.
- **PlanRequestModel**: Simpler than DraftRequestModel -- no step_id, proof_url, or lead_context fields.
- **PlanRequestRepo**: claim_next_pending (atomic claim), complete, fail, reset_stale_processing methods.
- **plan_poller.py**: Background poller that picks up pending requests, calls `EngagementService.generate_plan()`, updates lead registry, schedules reminders via `schedule_plan_reminders()`, and marks request complete.
- **main.py**: Wired PlanRequestRepo + plan_request_poller as background task inside `if engagement_service:` block.

### TMA Side
- **useGeneratePlan hook**: DB message bus pattern (insert -> poll 3s -> 60s timeout). Invalidates `leads.detail` and `leads.reminders` on completion.
- **LeadDetail.tsx**: "Generate Plan" button now uses `generatePlanMutation.mutate()` instead of `openBotDeepLink()`. Shows Loader2 spinner during generation, error text on failure.

## Decisions Made

- 60s poll timeout for plan generation (faster than vision-model draft generation which uses 90s)
- Invalidate both leads.detail and leads.reminders queries on completion (plan affects both)
- No lead_context passed to plan_requests (EngagementService fetches lead data directly)

## Deviations from Plan

None -- plan executed exactly as written.

## Pending Actions

- Run migration `insforge/migrations/007_plan_requests.sql` on InsForge database
- Deploy bot to pick up new plan_request_poller
- Deploy TMA to pick up new useGeneratePlan hook

## Duration

~3 minutes

## Self-Check: PASSED
