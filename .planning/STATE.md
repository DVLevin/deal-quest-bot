# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-05)

**Core value:** Sales reps can see their progress, practice scenarios, get deal support, and track leads through a visually engaging mobile interface
**Current focus:** Milestone v2.0 -- Sales Co-Pilot. Phase 15.1 complete.

## Previous Milestones

v1.0: 7 phases, 18 plans, 74m total -- COMPLETE
v1.1: 4 phases, 10 plans, 28m total -- COMPLETE

## Current Position

Milestone: v2.0 -- Sales Co-Pilot
Phase: 15 (Conversational Re-analysis)
Plan: 1 of 4 in current phase
Status: In progress
Last activity: 2026-02-05 -- Completed 15-01-PLAN.md (Database Foundation)

Progress: [##############------] 16/25 v2.0 requirements (64%)

## Performance Metrics

**Velocity:**
- Total plans completed: 40
- Average duration: 3.5m
- Total execution time: 139m

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

**Recent Trend:**
- Last 5 plans: 5m, 1m, 2m, 3m, 3m
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

### Pending Todos

- [01-02]: Set TELEGRAM_BOT_TOKEN and JWT_SECRET as InsForge environment secrets
- [07-01]: Set TMA_URL env var in Railway to enable Open in App buttons
- [quick-002]: Run migration `migrations/002_lead_person_company_fields.sql` on InsForge database
- [08-01]: Run migration `migrations/003_lead_source_field.sql` on InsForge database
- [12-01]: Run migration `insforge/migrations/002_scheduled_reminders.sql` on InsForge database
- [15.1-01]: Run migration `insforge/migrations/003_web_research_versions.sql` on InsForge database
- [15-01]: Run migration `insforge/migrations/004_lead_analysis_history.sql` on InsForge database

### Blockers/Concerns

None currently.

## Quick Tasks

| Task | Status | Summary |
|------|--------|---------|
| 001-bot-button-audit | Task 1/3 done | 87-trigger test matrix generated, awaiting manual testing (Task 2) |
| 002-lead-company-enrichment | Complete (3/3) | Structured prospect info (first/last name, geography) with enriched web research |

## Session Continuity

Last session: 2026-02-05
Stopped at: Completed 15-01-PLAN.md (Database Foundation) -- Phase 15 in progress
Resume file: None
Next action: Execute 15-02-PLAN.md (Context Input Handlers)
