# Project Research Summary

**Project:** Deal Quest v2.0 -- Sales Co-Pilot Milestone
**Domain:** AI-powered sales coaching platform (Telegram bot + TMA)
**Researched:** 2026-02-05
**Confidence:** MEDIUM-HIGH

## Executive Summary

Deal Quest v2.0 transforms the bot from a one-shot analysis tool into a continuous sales co-pilot. The three epics -- Smart Lead Creation, Engagement Plan Executor, and Conversational Re-analysis -- share a common theme: they extend the lead lifecycle from "create and forget" to "create, nurture, and evolve." Research reveals that the existing codebase already provides roughly 70% of the infrastructure needed. The photo pipeline, engagement plan generator, activity log, and follow-up scheduler all exist and work in production. The v2.0 effort is primarily about connecting these components into a coherent workflow loop and surfacing it through an upgraded TMA experience.

The recommended approach is to build bottom-up: start with the scheduling and reminder infrastructure (the "engine"), then layer the bot UX for step execution and re-analysis on top, and finally upgrade the TMA into a plan-first mobile CRM. This ordering matches the natural dependency chain and delivers user-visible value incrementally. The most critical technical decision is to stick with the proven PostgreSQL polling scheduler pattern rather than introducing new scheduling infrastructure (APScheduler, Celery, etc.) -- the existing `followup_scheduler.py` pattern works, requires no new dependencies, and survives bot restarts.

The key risks are: (1) JSONB engagement plan desync between bot and TMA (mitigated by dual-update pattern with step-level locking), (2) LLM drift during multi-version re-analysis (mitigated by anchoring prior analysis and computing deltas in code, not trusting LLM self-reports), and (3) cost escalation from vision model calls and frequent re-analysis (mitigated by user-triggered re-analysis, image pre-resizing, and smart caching). LinkedIn URL-to-lead is the one area with genuine uncertainty -- the recommendation is to defer automated scraping entirely and use a "paste the profile text" UX, which is zero-risk and zero-cost.

## Key Findings

### Smart Lead Creation (01-smart-lead-creation.md)

The screenshot-to-lead path is the highest-impact improvement with the lowest effort. The existing `on_support_photo` handler, `OpenRouterProvider` vision support, and `_background_enrich_lead()` function handle 70% of the flow. The critical missing piece is a **two-step extract-then-analyze pipeline**: a lightweight ExtractionAgent does focused OCR, then passes clean text to the existing StrategistAgent. This eliminates the current problem where the strategist tries to OCR and strategize in one shot with a 70K-token prompt.

**Core technologies (no new dependencies):**
- Existing OpenRouter/Claude vision models for OCR extraction
- New ExtractionAgent with focused OCR prompt (lightweight, no knowledge base injection)
- Pillow for image pre-resizing to 1568px max (reduces token cost)
- Custom regex timing parser for engagement plan scheduling

**ClaudeProvider bug:** The `ClaudeProvider.complete()` currently ignores `image_b64` entirely. This must be fixed as a prerequisite -- the fix is straightforward (multipart content array).

**LinkedIn URL verdict:** Do NOT build URL scraping. LinkedIn actively sues scrapers (Proxycurl shut down July 2026). Use a tiered approach: Tier 1 (build first) is "paste the profile text" guidance, Tier 2 is basic meta tag extraction from URLs, Tier 3 (optional) is user-provided API keys for third-party services.

### Engagement Plan Executor (02-engagement-plan-executor.md)

The engagement plan executor transforms static JSONB engagement plans into an active coaching loop: timed reminders, inline-button interactions, contextual draft messages, and TMA progress visualization.

**Must have (table stakes for v2.0):**
- `scheduled_reminders` table with per-step reminders and concrete `due_at` timestamps
- PostgreSQL polling scheduler (extend existing `followup_scheduler.py` pattern, 15-min intervals)
- Rich reminder messages with Done/Snooze/Skip inline buttons
- Dual-update pattern: both `scheduled_reminders` and `engagement_plan` JSONB stay in sync
- Enhanced engagement plan prompt that outputs `delay_days` integer alongside `timing` string

**Should have (differentiators):**
- Contextual draft regeneration when lead context changes since plan creation
- Escalation logic (initial -> gentle nudge -> final -> auto-snooze)
- TMA step completion with immediate UI feedback
- Multi-lead overdue aggregation on dashboard

**Defer (post-v2.0):**
- User timezone support for reminder delivery windows
- User-configurable reminder preferences
- Per-channel draft tailoring (LinkedIn vs email vs phone)

### Conversational Re-analysis (03-conversational-reanalysis.md)

Re-analysis is the most architecturally significant epic. It requires a new `ReanalysisStrategistAgent` (not a reuse of the existing strategist), a `lead_analysis_history` table for version tracking, and a structured prompt that feeds prior analysis + thread history + new context to produce an updated strategy with explicit deltas.

**Architecture approach:**
1. **Enhanced activity log as thread** -- Do NOT create a separate conversations table. Extend `lead_activity_log` with new activity types (`prospect_response`, `meeting_notes`, `re_analysis`) and a `metadata` JSONB column
2. **Versioned analysis** -- New `lead_analysis_history` table stores every analysis version with deltas. `lead_registry` columns continue to hold the LATEST version (backward compatible)
3. **Code-computed deltas** -- JSON diff in Python, not LLM self-reports. The LLM provides a narrative "changes summary"; the code provides the authoritative field-level diff
4. **User-triggered, not automatic** -- Industry research (Salesforce Einstein, Gong, HubSpot) confirms that no major CRM AI platform auto-rewrites strategies. They provide signals and let users decide when to re-assess

**Context window management:** Use Summary Buffer Memory pattern. Always include full prior analysis + last 3-5 activities verbatim. Summarize older activities via truncation (Phase 1) or LLM summarization (Phase 2 if needed). Total context ~86K tokens, well within modern model limits.

### TMA Lead Experience (04-tma-lead-experience.md)

The TMA must shift from a passive lead viewer to an action-oriented sales cockpit. The single most impactful UX change is restructuring `LeadDetail` from "analysis first, plan buried at bottom" to "plan first, analysis as reference."

**Major components:**
1. **Plan-First Lead Detail** -- Three-section layout: Active Plan (default, top), Intelligence (analysis/strategy/tactics), Activity (thread/notes). Engagement plan steps become the primary interaction surface.
2. **"Today's Actions" Dashboard Widget** -- Aggregates overdue/due-today steps across all leads. Surfaces "what should I do next?" without navigating to the lead list.
3. **Bot-TMA Deep Link Coordination** -- `WebAppInfo(url=...)` buttons in reminder messages open TMA at exact `/leads/{id}?step={step_id}`. No `useDeepLink` changes needed for this approach.
4. **Smart Polling for Data Sync** -- `refetchInterval` with conditional activation (15s for recently-updated leads, 30s for active plans, off otherwise). InsForge Realtime is explicitly deferred -- operational complexity outweighs sub-second freshness for this use case.

### Critical Pitfalls (Cross-cutting)

1. **JSONB desync between bot and TMA** -- Both can modify `engagement_plan`. Mitigate with dual-update pattern and step-level `engagement_plan_version` integer. The `scheduled_reminders` table is authoritative for scheduling; `engagement_plan` JSONB is authoritative for display.

2. **LLM hallucination on re-analysis deltas** -- The LLM may fabricate changes not supported by new context. Mitigate by always including full prior analysis JSON, computing deltas in code via JSON diff, and using lower temperature (0.3-0.5) for re-analysis.

3. **Duplicate reminders on bot restart** -- Polling scheduler could re-process reminders during restarts. Mitigate with `last_reminded_at` timestamp guard and optimistic lock pattern (update timestamp before sending).

4. **AI timing strings are unpredictable** -- "ASAP", "When ready", "Before Q4 planning" cannot be reliably parsed. Mitigate by updating the engagement plan prompt to always output `delay_days` integer. Regex parser as fallback with 3-day default.

5. **Cost escalation from vision + re-analysis** -- Image analysis costs more tokens; re-analysis adds thread history on top of 70K knowledge base. Mitigate with pre-resize images, user-triggered (not auto) re-analysis, and draft caching with conditional regeneration.

## Implications for Roadmap

Based on the combined research, the v2.0 milestone should be structured in 6 phases that follow the natural dependency chain: infrastructure first, then bot UX, then TMA experience.

### Phase 1: Scheduling & Reminder Infrastructure
**Rationale:** This is the foundation that every other phase builds on. Without per-step reminders and a reliable scheduling loop, the engagement plan executor cannot function.
**Delivers:** `scheduled_reminders` table, timing parser, polling scheduler loop, plan-to-reminders wiring
**Addresses:** Engagement Plan Executor core, enriched `delay_days` in plan prompt
**Avoids:** AI timing string parsing failures (by requiring `delay_days` integer); duplicate reminders (by `last_reminded_at` guard)
**Dependencies:** None
**Effort:** Medium

### Phase 2: Smart Lead Creation Pipeline
**Rationale:** Improves the quality of leads entering the system, which makes engagement plans and re-analysis more valuable downstream. Also fixes the ClaudeProvider image bug which is a standalone fix.
**Delivers:** ExtractionAgent, two-step extract-then-analyze pipeline, input type detection and routing, ClaudeProvider image fix, image pre-resize, one-shot `/support [text]`, URL detection with paste-text guidance
**Addresses:** Smart Lead Creation (Tiers 1-2), reduced friction input
**Avoids:** Vision model hallucination on names (via extraction + user confirmation); cost escalation (via image pre-resize)
**Dependencies:** None (independent of Phase 1)
**Effort:** Medium-High

### Phase 3: Bot Reminder UX & Step Execution
**Rationale:** Once scheduling infrastructure exists (Phase 1), users need to interact with reminders. This phase builds the inline-button interaction flow and escalation logic.
**Delivers:** Rich reminder messages with inline keyboards, Done/Snooze/Skip handlers, escalation logic, step-aware reminder content, contextual draft display ("View Full Draft"), activity logging for all step actions
**Addresses:** Engagement Plan Executor bot UX, contextual drafts
**Avoids:** Overloading users with reminders (via max 3 per cycle + digest batching); stale drafts (via context-change detection and conditional regeneration)
**Dependencies:** Phase 1 (scheduling infrastructure)
**Effort:** Medium

### Phase 4: Conversational Re-analysis
**Rationale:** With leads being created (Phase 2) and nurtured via engagement plans (Phases 1+3), users need the ability to feed prospect responses back and get updated strategies. This is the core "co-pilot" differentiator.
**Delivers:** ReanalysisStrategistAgent, `reanalyze.yaml` pipeline, `lead_analysis_history` table, versioned analysis storage, code-computed deltas, enhanced activity types (prospect_response, meeting_notes), forwarded message support, voice/photo in context updates, "Re-analyze Strategy?" button after context updates
**Addresses:** Conversational Re-analysis (Phases A+B), extended input methods
**Avoids:** LLM drift (via full prior analysis anchoring + code-computed deltas); cost explosion (via user-triggered re-analysis only); breaking existing merge flow (via saving overwritten analysis to history)
**Dependencies:** Phase 2 (lead creation quality matters for re-analysis)
**Effort:** High

### Phase 5: TMA Lead Thread & Plan-First Experience
**Rationale:** Once the bot-side workflow loop is complete (create -> remind -> re-analyze), the TMA needs to surface it. This phase restructures the lead detail page and adds TMA-side step completion.
**Delivers:** Plan-first `LeadDetail` layout (Active Plan / Intelligence / Activity tabs), interactive step completion from TMA, engagement plan timeline with overdue indicators, `LeadCard` enhancements (overdue badge, progress bar, next action preview), "Needs Action" filter, pipeline summary stats, step-specific deep link highlighting via query params
**Addresses:** TMA Lead Experience (Phases B+C), bot-TMA deep link coordination
**Avoids:** Race conditions on JSONB (via dual-update pattern + version integer); polling battery drain (via conditional `refetchInterval` only on active leads)
**Dependencies:** Phases 1+3 (reminder data must exist for TMA to display), Phase 4 (activity thread rendering needs re-analysis entries)
**Effort:** Medium-High

### Phase 6: Dashboard & Polish
**Rationale:** This phase is the convenience/polish layer. It aggregates data that already exists from prior phases into dashboard widgets and adds final UX refinements.
**Delivers:** "Today's Actions" dashboard widget, overdue aggregation across leads, strategy version comparison in TMA (side-by-side diff), signal strength timeline sparkline, grouped reminder messages for multi-lead users
**Addresses:** TMA dashboard enhancements, strategy evolution visualization
**Avoids:** N/A -- low risk phase
**Dependencies:** Phase 5 (TMA lead infrastructure must exist)
**Effort:** Medium

### Phase Ordering Rationale

- **Phases 1 and 2 are independent and can run in parallel** if two developers are available. Phase 1 is backend-only (scheduling), Phase 2 is pipeline/agent work. No shared code paths.
- **Phase 3 depends on Phase 1** because reminder UX requires the scheduling infrastructure.
- **Phase 4 depends on Phase 2** because re-analysis quality depends on lead creation quality (better initial analysis = better re-analysis).
- **Phase 5 depends on Phases 1+3+4** because the TMA displays data created by all prior phases.
- **Phase 6 depends on Phase 5** because dashboard widgets aggregate TMA lead data.
- This ordering delivers user-visible value by Phase 3 (users get actionable reminders) without waiting for the full stack.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Conversational Re-analysis):** Prompt engineering for the re-analysis agent needs iteration. The "Reflexion" pattern is sound but the exact prompt that produces reliable structured deltas will require testing with real lead data. Budget extra time for prompt tuning.
- **Phase 5 (TMA Lead Thread):** The plan-first layout is a UX bet. Validate with the user early in the phase. The three-tab structure (Active Plan / Intelligence / Activity) may need design iteration.
- **Phase 2 (Smart Lead Creation):** The ExtractionAgent prompt needs testing across different screenshot types (LinkedIn, email, business card). OCR accuracy varies by source type.

Phases with standard patterns (skip deeper research):
- **Phase 1 (Scheduling Infrastructure):** Well-documented polling pattern, already proven in `followup_scheduler.py`. Straightforward extension.
- **Phase 3 (Reminder UX):** Aiogram 3 inline keyboards are well-understood. Callback handler patterns are standard.
- **Phase 6 (Dashboard & Polish):** Standard TanStack Query data aggregation + Tailwind CSS components. No novel patterns.

## Cross-Cutting Themes & Shared Infrastructure

Several infrastructure needs appear across multiple epics:

### New Database Tables (2 required)
| Table | Used By | Migration |
|-------|---------|-----------|
| `scheduled_reminders` | Phases 1, 3, 5 | Phase 1 |
| `lead_analysis_history` | Phases 4, 5, 6 | Phase 4 |

### Schema Modifications (existing tables)
| Change | Table | Used By |
|--------|-------|---------|
| Add `metadata` JSONB column | `lead_activity_log` | Phase 4 |
| Add `needs_reanalysis` boolean | `lead_registry` | Phases 4, 5 |
| Add `reanalysis_context` text | `lead_registry` | Phases 4, 5 |
| Add `last_reminded_at` timestamptz | `lead_registry` | Phases 1, 3 |
| New activity types (string values) | `lead_activity_log` | Phases 1, 3, 4 |

### New Bot Modules
| Module | Phase |
|--------|-------|
| `bot/agents/extraction.py` (ExtractionAgent) | Phase 2 |
| `bot/agents/reanalysis_strategist.py` (ReanalysisStrategistAgent) | Phase 4 |
| `bot/services/plan_scheduler.py` (timing parser, reminder dispatch) | Phase 1 |
| `bot/handlers/reminders.py` (callback handlers for reminder buttons) | Phase 3 |

### New Pipeline YAMLs
| Pipeline | Phase |
|----------|-------|
| `data/pipelines/smart_support.yaml` (extract -> strategize) | Phase 2 |
| `data/pipelines/reanalyze.yaml` (re-analysis with prior context) | Phase 4 |

### Shared Patterns
- **Dual-update pattern** -- Used by Phases 3 and 5 whenever bot or TMA modifies engagement plan steps. Always update both `scheduled_reminders` (scheduling authority) and `engagement_plan` JSONB (display authority).
- **Input type routing** -- Used by Phases 2 and 4. The input type detection function (`detect_input_type`) routes screenshots, URLs, voice notes, and forwarded messages to the appropriate extraction pipeline. Re-used for both initial lead creation and context updates.
- **Activity logging** -- Every user and system action gets logged to `lead_activity_log` with typed `activity_type` and optional `metadata` JSONB. This is the single timeline backbone that the TMA thread view (Phase 5) and re-analysis context (Phase 4) both consume.

### Zero New Python Dependencies
The entire v2.0 can be built with existing dependencies plus Pillow (for image resizing). No APScheduler, no SQLAlchemy, no Celery, no Redis. This is a significant architectural advantage -- it keeps deployment simple and avoids dependency conflicts.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Smart Lead Creation | HIGH (vision) / MEDIUM (URL) | Vision pipeline is code-grounded with existing handlers. URL scraping is legally fraught, hence tiered approach. |
| Engagement Plan Executor | MEDIUM-HIGH | Scheduling pattern is proven in production. Draft regeneration and escalation logic are design decisions, not technical unknowns. |
| Conversational Re-analysis | HIGH (architecture) / MEDIUM (prompts) | Architecture builds on existing patterns. Re-analysis prompt engineering needs iteration with real data. |
| TMA Lead Experience | MEDIUM-HIGH | Standard React/TanStack patterns. UX layout (plan-first) is a design bet needing validation. |
| Bot-TMA Coordination | HIGH | `WebAppInfo(url=...)` deep linking is verified in official docs and existing codebase. Database-mediated events are the proven pattern. |
| Data Sync Strategy | HIGH | Smart polling via `refetchInterval` is correct for this use case. Realtime deferred with clear upgrade criteria. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Re-analysis prompt tuning:** The "Reflexion" pattern is well-documented but the specific prompt that produces reliable structured deltas with Deal Quest's knowledge base needs testing. Plan for 2-3 iterations during Phase 4.
- **OCR accuracy across source types:** Vision model performance on LinkedIn screenshots vs. email screenshots vs. business cards varies. The ExtractionAgent prompt needs type-specific instructions, and accuracy should be validated during Phase 2.
- **Engagement plan `delay_days` prompt reliability:** The existing engagement plan prompt must be updated to output `delay_days` integers. Whether the LLM reliably produces this new field alongside existing fields needs validation.
- **TMA plan-first layout validation:** The recommendation to lead with Active Plan over Intelligence is based on CRM UX research, not user testing. Validate with the actual user early in Phase 5.
- **Multi-lead reminder volume:** The escalation and batching logic is designed on paper. If a user has 15+ active leads with plans, the reminder experience needs real-world testing to tune cadence.

## Sources

### Codebase Analysis (HIGH confidence)
- `bot/handlers/support.py` -- Photo handling, lead creation, merge/dedup, enrichment pipeline
- `bot/services/llm_router.py` -- OpenRouter vision support (working), Claude vision (broken)
- `bot/services/followup_scheduler.py` -- Proven polling scheduler pattern
- `bot/services/engagement.py` -- Engagement plan generation, advice generation
- `bot/storage/repositories.py` -- Repository pattern, LeadActivityRepo, LeadRegistryRepo
- `bot/pipeline/runner.py` -- Pipeline execution (sequential/parallel/background)
- `bot/pipeline/context.py` -- PipelineContext with image_b64 field
- `packages/webapp/src/features/leads/` -- TMA lead components (LeadDetail, LeadList, ActivityTimeline)
- `bot/utils_tma.py` -- WebAppInfo button helper (existing deep link pattern)

### Official Documentation (HIGH confidence)
- Claude Vision API -- Image formats, size limits, multipart content structure
- OpenRouter Multimodal -- Vision model support via base64 and URL
- Telegram Bot API -- Inline keyboards, callback_data 64-byte limit, WebAppInfo, Mini Apps
- Telegram Start Parameter -- `startapp` character constraints (A-Za-z0-9_-)
- Supabase Realtime -- Postgres Changes via WebSocket (deferred for v2.0)

### Domain Research (MEDIUM confidence)
- CRM UX patterns (HubSpot, Pipedrive, Salesforce, Gong) -- Plan-first mobile layouts, signal tracking
- LinkedIn scraping legality (hiQ v. LinkedIn, Proxycurl shutdown) -- Tiered URL approach
- Context window management (LangChain, JetBrains Research) -- Summary Buffer Memory pattern
- APScheduler, PGQueuer, Procrastinate evaluations -- Rejected in favor of polling
- Sales engagement platform UX (Outreach, ZoomInfo) -- Step execution patterns

### WebSearch (LOW confidence, for context only)
- LinkedIn scraper landscape post-Proxycurl (2026) -- Rapidly changing market
- Sales AI trends 2026 -- General industry direction, not specific implementation guidance

---
*Research completed: 2026-02-05*
*Ready for roadmap: yes*
