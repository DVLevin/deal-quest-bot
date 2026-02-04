---
phase: 05-leads-and-profile-settings
plan: 02
subsystem: ui
tags: [react, tanstack-query, useMutation, settings, activity-timeline, notes, deep-link]

# Dependency graph
requires:
  - phase: 01-foundation-and-auth
    provides: InsForge client, auth store, query key factory, shared types, UI components
  - phase: 05-leads-and-profile-settings
    provides: Lead detail view, mutation pattern (useUpdateLeadStatus), lead types and parsers, query keys
provides:
  - Activity timeline component with type-specific icons for lead activity log
  - Notes add/update mutation hook and interactive notes component
  - Settings feature with provider/model picker and API key status
  - Profile page with settings panel integrated
affects: [06-admin, future-settings-expansion]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Activity timeline with type-specific icon/color mapping and vertical connector lines
    - Bot deep-link for operations requiring server-side secrets (Fernet ENCRYPTION_KEY)
    - Radio-style model selector with 44px touch targets

key-files:
  created:
    - packages/webapp/src/features/leads/hooks/useLeadActivities.ts
    - packages/webapp/src/features/leads/hooks/useAddLeadNote.ts
    - packages/webapp/src/features/leads/components/ActivityTimeline.tsx
    - packages/webapp/src/features/leads/components/LeadNotes.tsx
    - packages/webapp/src/features/settings/hooks/useUserSettings.ts
    - packages/webapp/src/features/settings/hooks/useUpdateSettings.ts
    - packages/webapp/src/features/settings/components/SettingsPanel.tsx
  modified:
    - packages/webapp/src/features/leads/components/LeadDetail.tsx
    - packages/webapp/src/pages/Profile.tsx

key-decisions:
  - "Notes section always visible (not conditional on lead.notes), allows adding notes to any lead"
  - "API key management via bot deep-link only (TMA cannot access Fernet ENCRYPTION_KEY)"
  - "SettingsPanel queries users table directly for provider/model/key status, no separate settings table"
  - "4 OpenRouter models matching bot/handlers/settings.py MODEL_KEYBOARD exactly"

patterns-established:
  - "Activity timeline: vertical connector lines with type-mapped icon circles (6 activity types)"
  - "Settings mutation: useUpdateSettings builds partial update object from non-undefined fields"
  - "Bot deep-link for secure operations: openTelegramLink('https://t.me/BOT?start=settings')"

# Metrics
duration: 3min
completed: 2026-02-04
---

# Phase 5 Plan 2: Activity Timeline, Notes, and Settings Summary

**Lead activity timeline with 6 type-specific icons, interactive notes with mutation, and Profile settings panel with provider/model picker and API key bot deep-link**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-04T01:38:24Z
- **Completed:** 2026-02-04T01:41:12Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Built chronological activity timeline with type-mapped icons (status_change, context_update, screenshot_comment, ai_advice, followup_sent, default)
- Created interactive notes component with add/update form writing to both lead_registry.notes and lead_activity_log
- Built settings panel with visual provider toggle (OpenRouter/Claude API), radio model selector (4 free models), and API key status with bot deep-link
- Integrated all components into existing views (LeadDetail, Profile page)

## Task Commits

Each task was committed atomically:

1. **Task 1: Activity timeline, notes hooks/components, and lead detail integration** - `ea5ae40` (feat)
2. **Task 2: Settings feature with provider/model picker and API key status** - `9fd2320` (feat)

## Files Created/Modified
- `packages/webapp/src/features/leads/hooks/useLeadActivities.ts` - Fetches activity log entries for a lead (50 max, desc order)
- `packages/webapp/src/features/leads/hooks/useAddLeadNote.ts` - Mutation: updates lead_registry.notes + inserts activity log entry
- `packages/webapp/src/features/leads/components/ActivityTimeline.tsx` - Vertical timeline with type-specific icons, colors, AI response display
- `packages/webapp/src/features/leads/components/LeadNotes.tsx` - Current note display + textarea form with loading state
- `packages/webapp/src/features/leads/components/LeadDetail.tsx` - Integrated LeadNotes (replacing static section) and ActivityTimeline
- `packages/webapp/src/features/settings/hooks/useUserSettings.ts` - Fetches provider, model, API key presence from users table
- `packages/webapp/src/features/settings/hooks/useUpdateSettings.ts` - Mutation for updating provider and/or model
- `packages/webapp/src/features/settings/components/SettingsPanel.tsx` - Provider toggle, model radio list, API key status with bot deep-link
- `packages/webapp/src/pages/Profile.tsx` - Added SettingsPanel as last section

## Decisions Made
- Notes section is always rendered (not conditional on lead.notes existing), so users can add notes to any lead regardless of current state
- API key management uses bot deep-link (`?start=settings`) because TMA has no access to Fernet ENCRYPTION_KEY -- this is the intended design, not a limitation
- Settings panel queries the existing users table directly (no new settings table needed)
- 4 OpenRouter models match `bot/handlers/settings.py MODEL_KEYBOARD` exactly: gpt-oss-120b, kimi-k2.5, gemini-flash, deepseek-r1

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 5 complete: all lead management (LEAD-01 through LEAD-05) and profile settings (PROF-05) requirements fulfilled
- useMutation pattern now established with 3 hooks (useUpdateLeadStatus, useAddLeadNote, useUpdateSettings) -- reusable for Phase 6 admin
- Settings feature directory structure ready for future expansion

---
*Phase: 05-leads-and-profile-settings*
*Completed: 2026-02-04*
