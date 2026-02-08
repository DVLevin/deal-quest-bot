---
phase: 20-quick-wins-by-prody
plan: 01
subsystem: gamification, ui, bot
tags: [xp, confetti, canvas-confetti, onboarding, lead-status, double-fire-guard]

# Dependency graph
requires:
  - phase: 06-gamification-admin
    provides: confetti library (fireLevelUpConfetti)
  - phase: 05-leads-settings
    provides: lead status mutation hook and LeadDetail component
provides:
  - Deal closure XP award (500 XP) with double-fire guard from both TMA and bot
  - Confetti celebration on closed_won status change in TMA
  - Renamed onboarding buttons (Start Free, Use My Own Key)
affects: [gamification, onboarding, leads]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Double-fire guard via lead_activity_log xp_award marker (prevents duplicate XP from TMA + bot)"
    - "Level recalculation formula: level * 200 XP threshold, matching bot/services/scoring.py"

key-files:
  created: []
  modified:
    - packages/webapp/src/features/leads/hooks/useUpdateLeadStatus.ts
    - packages/webapp/src/features/leads/components/LeadDetail.tsx
    - bot/handlers/leads.py
    - bot/handlers/start.py

key-decisions:
  - "XP guard uses lead_activity_log with activity_type='xp_award' per lead (not a global flag)"
  - "TMA recalculates level inline (same formula as UserRepo.update_xp) to avoid extra API call"
  - "Bot uses existing UserRepo.update_xp which already includes level recalculation"

patterns-established:
  - "Double-fire guard pattern: insert marker record, check before awarding, works across TMA and bot"

# Metrics
duration: 2min
completed: 2026-02-08
---

# Phase 20 Plan 01: Deal Closure Celebration + Onboarding Polish Summary

**500 XP award with confetti on closed_won status (double-fire guarded across TMA and bot), onboarding buttons renamed to "Start Free" / "Use My Own Key"**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-08T07:35:09Z
- **Completed:** 2026-02-08T07:37:42Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Deal closure (closed_won) awards 500 XP from both TMA and bot, whichever fires first
- Double-fire prevention via xp_award marker in lead_activity_log ensures XP only awarded once per lead
- TMA triggers confetti animation and "Deal Won! +500 XP" celebration toast
- Bot shows "Deal Won! +500 XP" callback answer (or "XP already awarded" if guard fires)
- Onboarding buttons cleaned up: "Start Free (Recommended)" and "Use My Own Key"
- User progress query invalidated after XP award so ProgressCard updates immediately

## Task Commits

Each task was committed atomically:

1. **Task 1: TMA deal closure celebration + XP award with double-fire guard** - `b0702de` (feat)
2. **Task 2: Bot-side XP award with double-fire guard + "Start Free" onboarding label** - `a8e9a16` (feat)

## Files Created/Modified
- `packages/webapp/src/features/leads/hooks/useUpdateLeadStatus.ts` - Added closed_won XP award with double-fire guard, level recalculation, user query invalidation
- `packages/webapp/src/features/leads/components/LeadDetail.tsx` - Added confetti import and conditional celebration toast on closed_won
- `bot/handlers/leads.py` - Added UserRepo/LeadActivityRepo DI, XP award with guard on on_lead_status_update
- `bot/handlers/start.py` - Renamed onboarding buttons from "Quick Setup" to "Start Free" and "Use My Own API Key" to "Use My Own Key"

## Decisions Made
- XP guard uses per-lead activity_type='xp_award' record in lead_activity_log (not a global flag or separate table)
- TMA recalculates level inline using same formula as bot/services/scoring.py to avoid extra API round-trip
- Bot uses existing UserRepo.update_xp method which already includes level recalculation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- XP award infrastructure ready for future gamification events
- Double-fire guard pattern reusable for other cross-platform rewards
- Ready for Phase 20 Plan 02

---
*Phase: 20-quick-wins-by-prody*
*Completed: 2026-02-08*
