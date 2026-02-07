# Phase 19: Active Engagement Execution - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning (refinement phase)

<domain>
## Phase Boundary

Step-by-step action screens in TMA where users execute engagement plan tasks — with AI-assisted draft generation from screenshots, context attachment, and step lifecycle management. The original Phase 19 scope (types, hooks, UI components, wiring) is COMPLETE. This context captures decisions for **refinement work**: migrating the edge function to the bot's agent pipeline, improving draft generation UX, and adding multi-platform intelligence.

</domain>

<decisions>
## Implementation Decisions

### Draft Generation Architecture
- Move draft generation from InsForge Edge Function to bot's existing LLM pipeline
- Create a **full CommentGeneratorAgent** in `bot/agents/` with its own prompt file in `prompts/`, registered in agent registry
- Wire into **ModelConfigService** so admin can select the model from TMA admin panel (Phase 18 infrastructure)
- Gets **Langfuse tracing** automatically by going through the bot's LLM router
- TMA→bot communication pattern: Claude's discretion (options: edge function as proxy to bot HTTP endpoint, InsForge DB as message bus, or bot exposes lightweight HTTP API)

### Prompt & Intelligence
- Prompt should **auto-detect platform and content type** from the screenshot (LinkedIn post, email thread, DM conversation, Twitter/X, Slack, etc.)
- Generate response in **appropriate format** for detected platform (comment, reply, message, etc.)
- Handle **any platform**, not just LinkedIn — detect and adapt tone/format automatically
- Draft generation button appears for **any step with a screenshot attached** (user decided it's relevant by uploading it)

### Draft Display UX
- Multiple options (short/medium/detailed) shown as **tabbed view** — segmented control to switch between options, one visible at a time
- Regeneration **replaces** current draft with brief **"Undo" toast** to restore previous if the new one is worse
- Drafts are **read-only + copy** — user copies to clipboard and edits in the target platform directly
- After copying, **auto-suggest "Done — I posted it"** button to complete the step in one more tap

### Step Type Behavior
- UI adaptation per step type: Claude's discretion on how to differentiate (contextual hints vs. layout changes)
- All step types can use screenshot + draft generation when applicable

### Claude's Discretion
- TMA→bot communication pattern (edge function proxy, DB message bus, or direct bot HTTP API)
- Edge function fate after migration (remove or keep as fallback — consider maintenance burden vs. resilience)
- Step type UI adaptation approach (universal with smart hints vs. per-type layouts)
- GSD tracking approach (update Phase 19 summaries vs. create Phase 20 for refinements)
- Milestone placement (extend v2.0 with Phase 20 vs. start v2.1)

</decisions>

<specifics>
## Specific Ideas

- "Proof screenshot" was reframed to "attach screenshot" — it's about providing context (the post you're commenting on), not proving you did something. This is a core UX principle: the tool assists, not micromanages.
- The user workflow should feel like: upload screenshot → AI reads it → generates contextual response → user copies → marks done. Minimal friction.
- Screenshot context is valuable for ALL step types (DMs, emails, comments) — "with the email or DM I also can send the screenshot, right?"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. All improvements discussed are refinements of existing Phase 19 capability.

</deferred>

---

*Phase: 19-active-engagement-execution*
*Context gathered: 2026-02-07*
