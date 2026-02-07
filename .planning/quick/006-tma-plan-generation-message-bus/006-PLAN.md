# TMA-Initiated Engagement Plan Generation

## Context

The "Generate Plan" button in LeadDetail (`LeadDetail.tsx:738`) currently calls `openBotDeepLink('lead_reanalyze_...')` which exits the TMA and opens the bot chat. The user wants TMA to work independently — clicking "Generate Plan" should generate the plan in-app using the same DB message bus pattern we built for draft generation.

## Approach

Copy the `draft_requests` pattern exactly: new table → new repo → new poller → new TMA hook → wire into UI.

## Changes

### 1. Migration: `insforge/migrations/007_plan_requests.sql` (NEW)

Create `plan_requests` table with same pattern as `draft_requests`:
- `id`, `lead_id`, `telegram_id`, `status` (pending/processing/completed/failed), `result` (JSONB), timestamps
- Partial index on `status = 'pending'` for efficient polling
- Index on `lead_id` for TMA polling

### 2. Bot model: `bot/storage/models.py` (MODIFY)

Add `PlanRequestModel` (same pattern as `DraftRequestModel`): id, lead_id, telegram_id, status, result, timestamps.

### 3. Bot repo: `bot/storage/repositories.py` (MODIFY)

Add `PlanRequestRepo` (copy `DraftRequestRepo` pattern):
- `claim_next_pending()` — atomic claim
- `complete(id, result)` — mark done with plan data
- `fail(id, error)` — mark failed
- `reset_stale_processing(max_age_minutes=2)` — recover stuck requests

### 4. Bot poller: `bot/services/plan_poller.py` (NEW)

Copy `draft_poller.py` structure but instead of calling CommentGeneratorAgent:
1. Fetch lead via `lead_repo.get_by_id(request.lead_id)`
2. Call `engagement_service.generate_plan(lead, lead.web_research)` — pass existing research if available
3. Update `lead_registry.engagement_plan` via `lead_repo.update_lead()`
4. Call `schedule_plan_reminders()` to create reminder rows
5. Mark request complete with `{plan: [...], step_count: N}`

Dependencies: `EngagementService`, `PlanRequestRepo`, `LeadRegistryRepo`, `ScheduledReminderRepo`

### 5. Bot wiring: `bot/main.py` (MODIFY)

- Import `PlanRequestRepo` and `start_plan_request_poller`
- Create `plan_request_repo = PlanRequestRepo(insforge)` after `draft_request_repo`
- Start `start_plan_request_poller(engagement_service, plan_request_repo, lead_repo, reminder_repo)` as background task inside the `if engagement_service:` block (after draft poller, ~line 237)

### 6. TMA hook: `packages/webapp/src/features/leads/hooks/useGeneratePlan.ts` (NEW)

Copy `useGenerateDraft.ts` pattern:
- Insert row into `plan_requests` with `{lead_id, telegram_id, status: 'pending'}`
- Poll every 3s with 60s timeout (plan gen is faster than vision model)
- AbortController for cancellation
- `onSettled` invalidates `queryKeys.leads.detail(leadId)`

### 7. TMA UI: `packages/webapp/src/features/leads/components/LeadDetail.tsx` (MODIFY)

- Import `useGeneratePlan`
- Add `generatePlanMutation = useGeneratePlan()`
- Replace `openBotDeepLink(...)` on "Generate Plan" button with `generatePlanMutation.mutate({leadId, telegramId})`
- Show spinner + "Generating..." while pending, error text if failed
- Import `Loader2` from lucide-react (already imported on line 37)

## Key Files

| File | Action |
|------|--------|
| `insforge/migrations/007_plan_requests.sql` | Create |
| `bot/storage/models.py` | Add PlanRequestModel |
| `bot/storage/repositories.py` | Add PlanRequestRepo |
| `bot/services/plan_poller.py` | Create (copy draft_poller pattern) |
| `bot/main.py` | Wire repo + poller |
| `packages/webapp/src/features/leads/hooks/useGeneratePlan.ts` | Create (copy useGenerateDraft pattern) |
| `packages/webapp/src/features/leads/components/LeadDetail.tsx` | Replace deep link with mutation |

## Verification

1. Run migration 007 on InsForge
2. Start bot → confirm "Plan request poller started" in logs
3. Open TMA → navigate to lead without engagement plan
4. Tap "Generate Plan" → spinner shows → plan appears after ~10-15s
5. Verify `scheduled_reminders` rows created in DB
6. Verify lead detail refreshes with new plan steps
