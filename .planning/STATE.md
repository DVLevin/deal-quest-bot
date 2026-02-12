# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Sales reps can see their progress, practice scenarios, get deal support, and track leads through a visually engaging mobile interface
**Current focus:** Milestone v3.0 -- Prospect Discovery & UX Evolution. Roadmap created, ready for Phase 22 planning.

## Previous Milestones

v1.0: 7 phases, 18 plans, 74m total -- COMPLETE
v1.1: 4 phases, 10 plans, 28m total -- COMPLETE
v2.0: 11 phases, 40 plans, 113m total -- COMPLETE

## Current Position

Milestone: v3.0 -- Prospect Discovery & UX Evolution
Phase: 22 -- LinkedIn Prospect Search (pending)
Plan: --
Status: Roadmap created, awaiting Phase 22 plan creation
Last activity: 2026-02-12 -- v3.0 roadmap created (5 phases, 14 plans estimated)

## Performance Metrics

**Velocity:**
- Total plans completed: 69
- Average duration: 3.2m
- Total execution time: 221m

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
| 18. Agent Observatory | 4/4 | 17m | 4.3m |
| 19. Active Engagement Execution | 5/5 | 16m | 3.2m |
| 20. Quick Wins by Prody | 5/5 | 16m | 3.2m |
| 21. Seamless TMA-Bot Integration | 4/4 | 11m | 2.8m |

**Recent Trend:**
- Last 5 plans: 4m, 7m, 3m, 2m, 3m
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
- [v3.0 Roadmap]: 5 phases (22-26) derived from 23 requirements at standard depth
- [v3.0 Roadmap]: Sequential execution: 22 -> 23 -> 24 -> 25 -> 26
- [v3.0 Roadmap]: LinkedIn search first (lowest risk, highest standalone value)
- [v3.0 Roadmap]: Voice recording second (critical Android WebView feasibility question)
- [v3.0 Roadmap]: Bot modernization third (must wait for TMA alternatives to exist)
- [v3.0 Roadmap]: Team collaboration fourth (depends on stable features + consolidated notifications)
- [v3.0 Roadmap]: UX overhaul last (cross-cutting pass needs all new screens to exist)
- [v3.0 Roadmap]: Zero new npm/Python dependencies -- browser-native APIs + InsForge edge functions
- [v3.0 Roadmap]: Known RLS security debt (anon key USING(true)) acknowledged but not in v3.0 scope
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
- [18-01]: Use update_current_generation() (not update_current_observation) for Langfuse v3
- [18-01]: Input truncated to 500 chars, output to 2000 chars to prevent Langfuse storage explosion
- [18-01]: Langfuse env vars set via os.environ in init_langfuse() for SDK auto-config
- [18-01]: OpenRouter cost_details conditionally included when usage.cost present
- [18-03]: Admin model overrides always use shared OpenRouter key (no provider column)
- [18-03]: 60s TTL cache with provider instance caching for model config
- [18-03]: PipelineContext.llm property/setter for backward compat, default_llm as backing store
- [18-03]: Save-restore pattern in PipelineRunner for per-agent LLM swap
- [18-03]: Parallel agents pre-resolve overrides before asyncio.gather
- [18-02]: @observe wrapper functions at module level for proper Langfuse trace naming
- [18-02]: ProgressUpdater kept outside @observe wrappers (Telegram editing not part of trace span)
- [18-02]: SimplePipelineCtx skips model_config (re-analysis bypasses PipelineRunner, documented)
- [18-02]: model_config_service=None default on handler signatures for graceful DI degradation
- [18-04]: ModelConfigPanel placed after ActivityFeed on Admin page (config section below analytics)
- [18-04]: Inline model search requires 2+ chars, capped at 50 results for performance
- [18-04]: Centralized queryKeys.admin.modelConfigs follows existing factory pattern
- [19-01]: getPublicUrl returns string directly (InsForge SDK), not {data: {publicUrl}} (Supabase pattern)
- [19-01]: Can't-perform modeled as 'skipped' status with cant_perform_reason set (no new PlanStepStatus)
- [19-01]: Image resize uses canvas with 1200px max dimension and JPEG 0.85 quality
- [19-01]: Proof files stored in existing prospect-photos bucket with proof/ key prefix
- [19-02]: Clipboard fallback as module-level util in DraftCopyCard (same pattern as LeadDetail)
- [19-02]: No capture="camera" on file input (Telegram Android WebView compat)
- [19-02]: CantPerformFlow uses progressive disclosure: collapsed link -> expanded textarea -> submit
- [19-02]: StepActionScreen renders three distinct layouts for pending/done/skipped states
- [19-04]: DB message bus pattern (polling draft_requests table) instead of adding HTTP server to bot
- [19-04]: 3-second polling interval for draft request poller
- [19-04]: Stale processing recovery with 2-minute threshold on bot startup
- [19-04]: Multi-platform auto-detection prompt replaces LinkedIn-only Edge Function
- [19-04]: Structured JSON output: platform + content_type + options array (3 lengths)
- [20-01]: XP guard uses lead_activity_log with activity_type='xp_award' per lead (not a global flag)
- [20-01]: TMA recalculates level inline (same formula as UserRepo.update_xp) to avoid extra API call
- [20-01]: Bot uses existing UserRepo.update_xp which already includes level recalculation
- [20-02]: Stale threshold: 7 days without update for pipeline summary bar
- [20-02]: Used CheckCircle (not CheckCircle2) for codebase icon consistency
- [20-03]: URL param ?difficulty=N for weak area -> train routing (simple, bookmarkable)
- [20-03]: useState initializer reads URL param once (not useEffect) to avoid flash
- [20-03]: checkStatusSuggestion reads optimistically-updated query cache via getQueryData
- [20-03]: 50% threshold for status suggestion; only fires on 'done' (not skip or reset)
- [20-04]: Bottom-sheet modal pattern (items-end) for closure reason capture on mobile
- [20-04]: Outcome logging is best-effort (non-blocking) after status mutation succeeds
- [20-04]: Stale digest capped at 10 leads per message with overflow indicator
- [20-04]: 24-hour interval guard on stale digest prevents over-messaging on 6h scheduler
- [20-05]: Streak fetched separately since LeaderboardEntry type does not include streak_days
- [20-05]: AttemptRow has no difficulty field; mode badge shown instead of difficulty badge
- [20-05]: Lead count uses head:true count query for efficiency (no row data transferred)
- [quick-007]: Activity log insert failures are non-blocking (console.warn) since step update already succeeded
- [quick-007]: Upload-then-update orphan handled by retry-linking pattern (retries step update only)
- [quick-007]: Regeneration shows instruction input on first click, generates on second (progressive disclosure)
- [quick-007]: LinkedIn invite char limit 200 with 85% yellow threshold (170 chars)
- [21-01]: Full draft inline with 3500-char cap (leaves ~600 chars for header within Telegram 4096 limit)
- [21-01]: Copy Draft sends as NEW message (answer, not edit) for native long-press copy
- [21-01]: View Full Draft button only appears when draft exceeds 3500 chars (conditional row)
- [21-01]: Next step lookup excludes current step_id, filters status not in (done, skipped)
- [21-02]: At-most-once delivery: always mark delivered even if Telegram send fails
- [21-02]: 3-second poll interval matching draft/plan pollers
- [21-02]: Stale processing recovery with 2-minute threshold on startup
- [21-02]: tma_events uses created_at for stale detection (no updated_at column)
- [21-04]: One-shot consume pattern: localStorage entry removed immediately after reading (useRef cache survives re-renders)
- [21-04]: NON_RESUMABLE paths: / (exact) and /admin (prefix) excluded from session tracking
- [21-04]: Session resume skipped when startParam present (deep link takes priority over resume)
- [21-04]: Query params cleared after deep link processing via navigate(pathname, { replace: true })
- [Phase 21]: [21-03]: emitTmaEvent uses double fire-and-forget (try/catch + .catch) for maximum safety
- [Phase 21]: [21-03]: useBotNotifications polls at 10s interval with 60s window and useRef<Set> dedup

### Pending Todos

- [01-02]: Set TELEGRAM_BOT_TOKEN and JWT_SECRET as InsForge environment secrets
- [07-01]: Set TMA_URL env var in Railway to enable Open in App buttons
- [quick-002]: Run migration `migrations/002_lead_person_company_fields.sql` on InsForge database
- [08-01]: Run migration `migrations/003_lead_source_field.sql` on InsForge database
- [12-01]: Run migration `insforge/migrations/002_scheduled_reminders.sql` on InsForge database
- [15.1-01]: Run migration `insforge/migrations/003_web_research_versions.sql` on InsForge database
- [15-01]: Run migration `insforge/migrations/004_lead_analysis_history.sql` on InsForge database
- [18-03]: Run migration `insforge/migrations/005_agent_model_config.sql` on InsForge database
- [19-04]: Run migration `insforge/migrations/006_draft_requests.sql` on InsForge database
- [quick-006]: Run migration `insforge/migrations/007_plan_requests.sql` on InsForge database
- [quick-007]: Run migration `insforge/migrations/008_draft_requests_user_instructions.sql` on InsForge database
- [21-02]: Run migration `insforge/migrations/010_tma_events.sql` on InsForge database

### Roadmap Evolution

- Phase 17 added: LazyFlow UX Overhaul — zero-click workflows, smart defaults, predictive navigation, effort-eliminating interactions
- Phase 18 added: Agent Observatory & Model Configuration — Langfuse tracing (cloud hobby, self-host ready), per-agent model selection via TMA admin UI, full prompt/I-O/cost visibility
- Phase 19 added: Active Engagement Execution — step-by-step action screens in TMA with contextual lead display, screenshot upload for proof-of-action, draft copy, can't-perform flow, and deep links from bot reminders
- Phase 20 added: Quick Wins by Prody — PM-audit-driven improvements from docs/pm-audit/ (deal closure celebration, pipeline velocity, smart status, outcome capture, onboarding polish, training routing)
- v3.0 Roadmap created: 5 phases (22-26) from 23 requirements -- LinkedIn search, voice input, bot modernization, team collaboration, UX overhaul

### Blockers/Concerns

- [Phase 23]: Android WebView microphone access unconfirmed -- must test on real device before building voice UI (VOICE-V30-01/02)
- [Phase 22]: InsForge edge function outbound HTTP policy needs validation -- Deno fetch to HTTP endpoint

## Quick Tasks

| Task | Status | Summary |
|------|--------|---------|
| 001-bot-button-audit | Task 1/3 done | 87-trigger test matrix generated, awaiting manual testing (Task 2) |
| 002-lead-company-enrichment | Complete (3/3) | Structured prospect info (first/last name, geography) with enriched web research |
| 003-tma-bot-deep-actions | Complete (2/2) | TMA-to-bot deep linking for lead actions (reanalyze, context, reresearch, advice) |
| 006-tma-plan-generation-message-bus | Complete (3/3) | In-app plan generation via plan_requests DB message bus |
| 007-step-action-fixes-and-regen-input | Complete (3/3) | Specific error messages + retry, draft regen with user instructions, LinkedIn char counter |
| 008-engagement-plan-no-hallucinations | Complete (2/2) | Anti-hallucination rules in engagement_plan.md + strategist_agent.md prompts |

## Session Continuity

Last session: 2026-02-12
Stopped at: v3.0 roadmap created (Phases 22-26)
Resume file: None
Next action: Plan Phase 22 (LinkedIn Prospect Search)
Next phase after: Phase 22 -> Phase 23 -> Phase 24 -> Phase 25 -> Phase 26
