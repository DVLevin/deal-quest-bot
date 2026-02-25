# Phase 15: Conversational Re-analysis - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can feed prospect responses, meeting notes, and voice notes back into an existing lead, and the AI re-analyzes the strategy with full context of how the deal has evolved. Prior analysis versions are preserved with human-readable change summaries. The activity timeline shows context updates and re-analysis entries, creating a readable deal thread.

</domain>

<decisions>
## Implementation Decisions

### Context input flow
- **Primary entry point:** Reply to bot reminder — user forwards prospect reply or types context in response to a scheduled reminder
- **Secondary entry point:** /leads menu — user can select lead and tap "Add context" button anytime
- **Supported input types:** Full multimodal — text, forwarded messages, voice notes (transcribed), and screenshots
- **Multi-input handling:** Claude's discretion on whether to collect until "done" or trigger per-input

### Re-analysis trigger
- **Trigger mode:** Always offer button — after user adds context, "Re-analyze Strategy?" button appears
- **Delayed trigger handling:** Lead shows "Pending re-analysis" badge/button until user triggers it
- **Plan update:** User chooses each time — after re-analysis completes, ask "Update engagement plan too?"
- **Changes prominence:** Lead with changes — output starts with "What changed" summary, then full updated strategy

### Analysis history display
- **Visibility:** Both bot and TMA — accessible in both with appropriate UX for each context
- **Diff format:** Narrative summary — human-friendly "What changed" for busy salespeople, NOT code-style diffs
- **Revert capability:** Claude's discretion based on implementation complexity
- **Retention:** Keep last 5 versions — rolling window of 5 most recent analyses

### Activity thread integration
- **Entry granularity:** Grouped + expandable — single "Context added" entry that expands to show individual inputs
- **Content preview:** Title only — "Prospect response added" with tap to view full content
- **Context linkage:** Claude's discretion on whether re-analysis entries explicitly link to triggering context
- **Visual distinction:** Claude's discretion on icons/colors for new activity types

### Claude's Discretion
- Multi-input collection flow (collect until "done" vs single-input triggers)
- Whether revert-to-previous-version is available
- Re-analysis to context linkage in activity timeline
- Visual hierarchy for new activity types (prospect_response, meeting_notes, re_analysis)
- Technical implementation of JSON diff computation

</decisions>

<specifics>
## Specific Ideas

- "Non-tech friendly for a busy sales person" — keep everything human-readable, no technical diffs
- Changes summary should feel like a quick briefing: "Stage moved from X to Y, new tactic added"
- Activity timeline should tell the story of the deal at a glance

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-conversational-reanalysis*
*Context gathered: 2026-02-05*
