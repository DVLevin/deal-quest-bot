# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-05)

**Core value:** Sales reps can see their progress, practice scenarios, get deal support, and track leads through a visually engaging mobile interface
**Current focus:** Milestone v2.0 -- Sales Co-Pilot. Phase 17 complete (4 of 4 plans done).

## Previous Milestones

v1.0: 7 phases, 18 plans, 74m total -- COMPLETE
v1.1: 4 phases, 10 plans, 28m total -- COMPLETE

## Current Position

Milestone: v2.0 -- Sales Co-Pilot
Phase: 17 (LazyFlow UX Overhaul) -- Complete
Plan: 4 of 4 in current phase
Status: Phase complete
Last activity: 2026-02-06 -- Completed Phase 17 (LazyFlow UX Overhaul) -- all 4 plans verified

Progress: [#########################] 30/30 v2.0 requirements (100%)

## Performance Metrics

**Velocity:**
- Total plans completed: 52
- Average duration: 3.2m
- Total execution time: 164m

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation & Auth | 4/4 | 18m | 4.5m |
| 2. Dashboard & Profile | 2/2 | 10m | 5m |
| 3. Learn & Train | 3/3 | 16m | 5.3m |
| 4. Support & Casebook | 2/2 | 6m | 3m |
| 5. Leads & Settings | 2/2 | 6m | 3m |
| 6. Gamification & Admin | 3/3 | 10m | 3.3m |
| 7. Bot Integration | 2/2 | 8m | 4m |
| 8. Lead Management | 2/2 | 5m | 2.5m |
| 9. Training Experience | 2/2 | 5m | 2.5m |
| 10. Error Handling & UX | 4/4 | 14m | 3.5m |
| 11. Performance & Reliability | 2/2 | 4m | 2m |
| 12. Scheduling & Reminder | 2/2 | 12m | 6m |
| 13. Smart Lead Creation | 3/3 | 10m | 3.3m |
| 14. Engagement Plan Execution | 2/2 | 3m | 1.5m |
| 15.1. Lead Enhancements | 3/3 | 9m | 3m |
| 15. Conversational Re-analysis | 4/4 | 10m | 2.5m |

| 16. TMA Lead Experience | 4/4 | 8m | 2m |
| 17. LazyFlow UX Overhaul | 4/4 | 8m | 2m |

**Recent Trend:**
- Last 5 plans: 2m, 1m, 2m, 2m, 2m
- Trend: stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v2.0 Roadmap]: 5 phases (12-16) derived from 25 requirements at standard depth
- [v2.0 Roadmap]: Phases 12 and 13 are independent (scheduling vs smart lead creation)
- [v2.0 Roadmap]: Phase 14 (reminder UX) depends on 12; Phase 15 (re-analysis) depends on 13
- [v2.0 Roadmap]: Phase 16 (TMA experience) depends on 12+14+15 (all bot-side work)
- [v2.0 Roadmap]: No LinkedIn URL scraping (legal risk); "paste the text" guidance instead
- [v2.0 Roadmap]: User-triggered re-analysis only (no automatic strategy rewrites)
- [v2.0 Roadmap]: PostgreSQL polling scheduler (extend followup_scheduler.py, no new dependencies)
- [12-02]: 15-minute polling interval balances responsiveness with resource usage
- [12-02]: Optimistic update before send prevents duplicate reminders on bot restart
- [12-02]: Timing parser prioritizes delay_days over timing string regex
- [13-03]: URL inputs show guidance instead of attempting scrape
- [13-03]: Extraction data prepended to user_message for strategist LLM call
- [13-03]: Extraction results merged into prospect_info only if strategist didn't capture them
- [14-01]: 3 reminders before auto-snooze (MAX_ESCALATION=3)
- [14-01]: Callback data format: reminder:{action}:{lead_id}:{step_id}
- [14-02]: Activity types: step_execution, step_snooze, step_skip for lead_activity_log
- [14-02]: Dual-update on Done/Skip: update both scheduled_reminders and engagement_plan JSONB
- [15.1-02]: Status cycles pending -> done -> skipped -> pending on tap (three-state toggle)
- [15.1-03]: Standalone comment flow independent of leads system (no lead creation)
- [15.1-03]: Three tone options: Professional, Casual, Value-Adding Question
- [15-01]: MAX_VERSIONS = 5 for analysis history auto-pruning
- [15-01]: triggered_by field tracks initial | context_update | manual triggers
- [15-01]: metadata JSONB on LeadActivityModel for flexible structured data
- [15-02]: Voice notes transcribed via existing TranscriptionService DI
- [15-02]: Activity type auto-detected from text content (prospect_response, meeting_notes, context_update)
- [15-02]: context:add:{lead_id} callback pattern for entering context input flow
- [15-03]: Code-based JSON diff (compute_analysis_diff), not LLM self-reports
- [15-03]: Human-readable diff formatting (_humanize_field converts field_name to Field Name)
- [15-04]: SimplePipelineCtx class for standalone agent execution without full pipeline runner
- [15-04]: changes_summary handles both dict and string formats from LLM
- [15-04]: re_analysis activity logged with headline and changes_count metadata
- [16-01]: Batched reminder query in useLeadReminders avoids N+1 (one query for all leads)
- [16-01]: computePlanProgress accepts nullable remindersDueAt to degrade gracefully when loading
- [16-01]: Progress section aligned under lead info with pl-13 to match avatar offset
- [16-02]: Inner Section component changed from Card-wrapped to plain div for nesting inside CollapsibleSection
- [16-02]: Intelligence section only renders if any sub-content exists
- [16-02]: Visual highlight clears after 3 seconds via useEffect timer
- [16-02]: Progress badge shows overdue count (red) when available, otherwise completed/total
- [16-03]: 60-second refetch interval for todayActions dashboard polling
- [16-03]: Max 5 actions in widget with "View all" link to /leads
- [16-03]: Step navigation via query param /leads/:id?step=:stepId
- [16-04]: tma_url passed as function parameter through scheduler chain (not imported from config)
- [16-04]: query_params uses urllib.parse.urlencode for proper URL encoding
- [16-04]: add_open_in_app_row graceful degradation when tma_url empty (backward compatible)
- [17-01]: LandingFocus as simple hook composition, not Zustand store
- [17-01]: Prefetch limited to 3 leads max to prevent API overload on mount
- [17-01]: 60s staleTime on prefetched queries matches useLead behavior
- [17-02]: Quick Start reuses handleStart (pool already filtered by auto-selected difficulty)
- [17-02]: Auto-select only fires when selectedDifficulty is null (user override preserved)
- [17-02]: Start Training button demoted to secondary variant when Quick Start visible
- [17-03]: Pipeline progression: analyzed -> reached_out -> meeting_booked -> in_progress -> closed_won
- [17-03]: closed_lost is terminal with no suggested next status
- [17-03]: Visual-only suggestion (ring-2 ring-accent/40) -- no forced selection
- [17-03]: Backward-compatible optional status prop on LeadNotes
- [17-04]: Handler registration order (forward before generic) instead of negative filter
- [17-04]: Forward sender name prepended as "Prospect name: {name}" prefix to pipeline input
- [17-04]: Button text "Looks Good" replaces "Done", callback_data unchanged for backward compat

### Pending Todos

- [01-02]: Set TELEGRAM_BOT_TOKEN and JWT_SECRET as InsForge environment secrets
- [07-01]: Set TMA_URL env var in Railway to enable Open in App buttons
- [quick-002]: Run migration `migrations/002_lead_person_company_fields.sql` on InsForge database
- [08-01]: Run migration `migrations/003_lead_source_field.sql` on InsForge database
- [12-01]: Run migration `insforge/migrations/002_scheduled_reminders.sql` on InsForge database
- [15.1-01]: Run migration `insforge/migrations/003_web_research_versions.sql` on InsForge database
- [15-01]: Run migration `insforge/migrations/004_lead_analysis_history.sql` on InsForge database

### Roadmap Evolution

- Phase 17 added: LazyFlow UX Overhaul — zero-click workflows, smart defaults, predictive navigation, effort-eliminating interactions

### Blockers/Concerns

None currently.

## Quick Tasks

| Task | Status | Summary |
|------|--------|---------|
| 001-bot-button-audit | Task 1/3 done | 87-trigger test matrix generated, awaiting manual testing (Task 2) |
| 002-lead-company-enrichment | Complete (3/3) | Structured prospect info (first/last name, geography) with enriched web research |
| 003-tma-bot-deep-actions | Complete (2/2) | TMA-to-bot deep linking for lead actions (reanalyze, context, reresearch, advice) |

## Session Continuity

Last session: 2026-02-06
Stopped at: Completed quick-003 (TMA-Bot Deep Actions)
Resume file: None
Next action: Milestone v2.0 audit
Next phase after: None (v2.0 complete)
