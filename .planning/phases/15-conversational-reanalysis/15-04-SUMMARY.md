---
phase: 15
plan: 04
subsystem: bot-handlers
tags: [re-analysis, pipeline, telegram-bot, tma, aiogram]
dependency-graph:
  requires: ["15-01", "15-02", "15-03"]
  provides: ["re-analysis-flow", "plan-update-prompt", "tma-activity-display"]
  affects: ["16-tma-experience"]
tech-stack:
  added: []
  patterns: ["pipeline-execution", "agent-invocation", "activity-logging"]
key-files:
  created:
    - data/pipelines/reanalysis.yaml
  modified:
    - bot/handlers/context_input.py
    - bot/handlers/leads.py
    - packages/webapp/src/features/leads/components/ActivityTimeline.tsx
decisions:
  - "SimplePipelineCtx class for standalone agent execution without full pipeline runner"
  - "changes_summary handles both dict and string formats from LLM"
  - "re_analysis activity logged with headline and changes_count metadata"
metrics:
  duration: 3m
  completed: 2026-02-05
---

# Phase 15 Plan 04: Re-analysis Trigger Summary

**One-liner:** Button-triggered re-analysis flow with ReanalysisStrategistAgent, history saving, plan update prompt, and TMA activity display.

## What Was Built

### 1. Re-analysis Pipeline Config (`data/pipelines/reanalysis.yaml`)
- Sequential pipeline with `reanalysis_strategist` as main agent
- Background `memory` step for user memory updates
- Simple input mapping matching other pipeline configs

### 2. Re-analysis Trigger Handlers (`bot/handlers/context_input.py`)
- `on_reanalyze_start` handler for `reanalyze:start:{lead_id}` callback:
  - Loads prior analysis from lead fields (prospect_analysis, closing_strategy, engagement_tactics)
  - Fetches recent relevant activities (prospect_response, meeting_notes, context_update)
  - Builds SimplePipelineCtx for standalone agent execution
  - Invokes ReanalysisStrategistAgent with full context
  - Saves analysis version to lead_analysis_history via repo
  - Updates lead fields with new analysis/strategy/tactics
  - Logs `re_analysis` activity with metadata
  - Displays changes summary first (headline + details)
  - Shows "Update engagement plan too?" prompt with Yes/No buttons

- `on_reanalyze_update_plan` handler:
  - Cancels pending reminders via ScheduledReminderRepo
  - Marks lead with `[Plan update pending]` note
  - Confirms plan will be regenerated

- `on_reanalyze_skip_plan` handler:
  - Confirms strategy updated, plan kept as-is

### 3. Lead Detail Re-analyze Button (`bot/handlers/leads.py`)
- Added `has_pending_reanalysis` parameter to `_lead_detail_keyboard`
- Shows prominent "Re-analyze Strategy (Pending)" button at top when lead has `[Pending re-analysis]` in notes
- Updated `on_lead_view` and `on_lead_status_update` to detect and pass pending state

### 4. TMA Activity Timeline (`packages/webapp/src/features/leads/components/ActivityTimeline.tsx`)
- Added three new activity type styles:
  - `prospect_response`: MessageSquare icon (cyan)
  - `meeting_notes`: ClipboardList icon (indigo)
  - `re_analysis`: RefreshCw icon (orange)

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| SimplePipelineCtx class | Lightweight context for single-agent execution without full PipelineRunner overhead |
| changes_summary type handling | LLM may return dict or string; code handles both gracefully |
| re_analysis activity metadata | Store headline and changes_count for TMA display and debugging |
| Pending flag in notes | Reuses existing notes field pattern; no schema change needed |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All success criteria met:
- [x] reanalysis.yaml pipeline config exists
- [x] "Re-analyze Strategy?" button triggers on_reanalyze_start handler
- [x] Re-analysis calls ReanalysisStrategistAgent and parses result
- [x] Changes summary is displayed first in response
- [x] Analysis version is saved to lead_analysis_history via repo
- [x] "Update engagement plan too?" prompt appears after re-analysis
- [x] Yes/No buttons trigger plan update or skip
- [x] re_analysis activity is logged with metadata
- [x] TMA ActivityTimeline shows prospect_response, meeting_notes, re_analysis with icons
- [x] Leads with "[Pending re-analysis]" note show re-analyze button

## Commits

| Hash | Description |
|------|-------------|
| f555af2 | chore(15-04): create reanalysis.yaml pipeline config |
| a4a9a60 | feat(15-04): add re-analysis trigger handlers |
| 7d532d6 | feat(15-04): show re-analyze button for pending leads |
| 1bd799d | feat(15-04): update TMA ActivityTimeline for new activity types |

## Phase 15 Complete

All 4 plans in Phase 15 (Conversational Re-analysis) are now complete:
- 15-01: Database schema for analysis history
- 15-02: Context input handlers for multimodal input
- 15-03: ReanalysisStrategistAgent with diff computation
- 15-04: Re-analysis trigger flow and TMA display

The conversational re-analysis feature is fully implemented and ready for testing.
