---
phase: quick
plan: 001
subsystem: bot-ux
tags: [audit, buttons, testing, gherkin, telegram-bot]
dependency-graph:
  requires: []
  provides: ["button-test-matrix"]
  affects: ["bot-fixes"]
tech-stack:
  added: []
  patterns: []
file-tracking:
  key-files:
    created:
      - .planning/quick/001-bot-button-audit/BUTTON-MATRIX.md
    modified: []
decisions: []
metrics:
  duration: "4m"
  completed: "2026-02-03"
status: partial
---

# Quick Task 001: Bot Button Audit Summary

**Status: PARTIAL -- Task 1 of 3 complete. Tasks 2 and 3 pending human testing session.**

87-trigger test matrix inventoried from 8 handler modules with expected behavior cross-referenced against UX docs and handler code.

## What Was Done

### Task 1: Generate Comprehensive Button Test Matrix (DONE)

Created `BUTTON-MATRIX.md` containing:

- **87 triggers** inventoried across 8 handler modules (start, support, learn, train, leads, stats, settings, admin)
- **Expected behavior** for every trigger cross-referenced from:
  - Handler code (primary: exact behavior from function bodies)
  - UX docs (secondary: user stories and flow diagrams from docs/ux/*.md)
- **Prerequisite state** for each trigger (FSM state, required data, admin access)
- **8 known issues** identified during code analysis:
  1. Two unused FSM states (LearnState.viewing_lesson, LeadEngagementState.viewing_lead)
  2. Confusing "Comment on Post" UX (button label vs photo-required action)
  3. engagement_service silently disabled when OPENROUTER_API_KEY not set
  4. Voice/document messages silently dropped in screenshot mode
  5. No FSM timeout mechanism
  6. Model change available to Claude API users (no effect)
  7. settings:back preserves stale FSM data
  8. train:retry shows misleading 0/0 unseen count

### Task 2: Manual Testing Session (PENDING)

Requires user to manually test all 87 triggers in Telegram and report PASS/FAIL/SKIP results.

### Task 3: Update Matrix + Write Gherkin Specs (PENDING)

Depends on Task 2 results. Will update matrix with test results and write Gherkin specs for failures.

## Trigger Distribution

| Handler | Count | Categories |
|---------|-------|-----------|
| start.py | 10 | 2 commands, 5 callbacks, 1 FSM-text, 2 callbacks (post-onboard) |
| support.py | 8 | 1 command, 4 callbacks, 1 FSM-text, 1 FSM-voice, 1 FSM-photo |
| learn.py | 8 | 1 command, 4 callbacks, 1 FSM-text, 1 FSM-voice, 1 retry callback |
| train.py | 10 | 1 command, 6 callbacks, 1 FSM-text, 1 FSM-voice, 1 retry callback |
| leads.py | 18 | 1 command, 12 callbacks, 3 FSM-text, 1 FSM-photo, 1 status group |
| stats.py | 5 | 1 command, 4 callbacks |
| settings.py | 13 | 1 command, 9 callbacks, 1 FSM-text, 2 combined handlers |
| admin.py | 15 | 1 command, 14 callbacks |

## Deviations from Plan

None -- Task 1 executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 9fddb9d | Generate comprehensive button test matrix (87 triggers) |

## Next Steps

1. User performs manual testing session (Task 2 checkpoint)
2. Agent updates matrix with results and writes Gherkin specs (Task 3)
