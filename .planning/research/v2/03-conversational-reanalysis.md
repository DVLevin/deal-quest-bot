# Research: Conversational Re-analysis

**Domain:** AI-powered sales strategy evolution via iterative context updates
**Researched:** 2026-02-05
**Overall confidence:** HIGH (code-grounded) / MEDIUM (domain patterns)

---

## Executive Summary

Deal Quest currently treats lead analysis as a one-shot process: the user provides prospect context, the strategist agent produces analysis/strategy/tactics/draft, and that output is stored in the `lead_registry` table. The only mechanism for "updating" a lead is running `/support` again with the same prospect name, which triggers a full overwrite via the dedup merge path in `support.py` (lines 260-291). There is no concept of conversation history, no awareness of what changed between analyses, and no delta tracking.

The good news: the existing codebase already has ~70% of the building blocks needed. The `lead_activity_log` table stores context updates and AI advice. The `engagement_service.generate_advice()` method already feeds lead context + activity history + new context into the LLM. The lead detail view in the bot already has "Add Update" and "Get Advice" buttons. What is missing is (a) a structured conversation thread per lead, (b) a re-analysis pipeline that produces an *updated* strategy (not just advice), (c) delta tracking showing what changed, and (d) automatic triggers for when re-analysis should happen.

The recommended approach is to build on the existing `lead_activity_log` as the conversation thread backbone, create a new `re-analyze` pipeline variant that feeds prior analysis + conversation thread + new context into the strategist agent with an updated prompt, store analysis versions for diff comparison, and surface changes through both the bot and TMA.

---

## 1. Context Threading / Conversation History

### Current State

The existing system has partial threading infrastructure:

**What exists:**
- `lead_activity_log` table with columns: `lead_id`, `telegram_id`, `activity_type`, `content`, `ai_response`, `created_at`
- `LeadActivityRepo.get_for_lead(lead_id, limit=20)` retrieves activity history
- `LeadActivityRepo.create()` saves new activity entries
- Activity types: `context_update`, `screenshot_comment`, `ai_advice`, `followup_sent`
- The "Add Update" flow (`lead:context:` callback) already saves user text + AI advice to the activity log
- `engagement_service.generate_advice()` already passes activity history to the LLM (up to 10 entries)

**What is missing:**
- No link between the activity thread and the *original analysis* -- activities exist in isolation from the lead's strategy
- No structured "conversation" concept -- activities are flat, not threaded
- Activity history is text-only (no images, no forwarded messages, no voice notes within the activity flow)
- No aggregated thread view in the TMA -- only the bot has "Get Advice" and "Add Update" buttons
- No summarization or compression of old activities -- the full history is passed each time (up to 10 entries, ~2000 chars each = ~20K chars potential)

### Recommended Approach: Enhanced Activity Log as Thread

**Do not create a separate `lead_conversations` table.** The `lead_activity_log` already serves as the conversation thread. Enhance it:

1. **Add new activity types:**
   - `prospect_response` -- "They replied to my outreach saying..."
   - `meeting_notes` -- "Had a call, here's what happened..."
   - `status_change` -- Auto-logged when lead status updates
   - `re_analysis` -- Marker for when re-analysis was triggered (links to new analysis version)
   - `forwarded_message` -- User forwarded a prospect's message
   - `voice_update` -- Transcribed voice note about the lead

2. **Add optional `metadata` JSONB column** to `lead_activity_log` for structured data:
   - For `re_analysis`: `{"analysis_version": 2, "changes_detected": ["buying_signal", "strategy"]}`
   - For `prospect_response`: `{"channel": "linkedin", "sentiment": "positive"}`
   - For `forwarded_message`: `{"forward_origin": "user", "original_sender": "Sarah Chen"}`

3. **Thread retrieval patterns:**
   - "Full thread" for re-analysis: all activities for a lead, ordered chronologically
   - "Summary thread" for display: last 5 activities + count of older ones
   - "Context window thread" for LLM: summarized old activities + verbatim recent ones (see Section 4)

**Confidence:** HIGH -- this builds directly on existing tables and patterns.

**Trade-offs:**
- PRO: No new tables, minimal migration, existing repos/handlers work
- PRO: All activity types in one timeline (coherent user experience)
- CON: The `content` column is text-only (max ~2000 chars per entry); rich context needs metadata
- CON: No dedicated "message" abstraction -- activities are events, not a chat thread

**Alternative considered and rejected:** Creating a `lead_messages` table with a chat-like schema (sender, receiver, channel, etc.). This over-engineers the problem -- Deal Quest is not a messaging platform, it is a strategy advisor. The activity log pattern better fits the domain.

---

## 2. Re-analysis Pipeline

### Current Analysis Flow

The current support pipeline is:
```
User Input --> Strategist Agent --> Memory Agent (background)
                  |
                  v
             lead_registry (CREATE or MERGE)
```

The merge path (lines 260-291 in `support.py`) overwrites `prospect_analysis`, `closing_strategy`, `engagement_tactics`, and `draft_response` with the new output. The previous analysis is lost forever.

### Recommended Approach: Versioned Re-analysis Pipeline

**Architecture:**

```
New Context + Prior Analysis + Thread History
    |
    v
Re-analysis Strategist Agent (modified prompt)
    |
    v
Delta Extractor (compare old vs new)
    |
    v
lead_registry (update current analysis)
lead_analysis_history (append version)
lead_activity_log (append re_analysis entry with delta summary)
```

**Key design decisions:**

#### 2a. New Pipeline: `reanalyze.yaml`

```yaml
name: reanalyze
description: "Re-analyze a lead with new context and prior analysis"
steps:
  - agent: reanalysis_strategist
    mode: sequential
    input_mapping:
      knowledge_base: "ctx.knowledge_base"
      user_memory: "ctx.user_memory"
      prior_analysis: "ctx.prior_analysis"
      thread_history: "ctx.thread_history"
      new_context: "ctx.new_context"

  - agent: memory
    mode: background
    input_mapping:
      strategist_output: "result.reanalysis_strategist"
      user_memory: "ctx.user_memory"
```

**Do not reuse the existing strategist agent directly.** The re-analysis prompt must be fundamentally different from the initial analysis prompt:

- Initial analysis: "Here is a prospect. Analyze from scratch."
- Re-analysis: "Here is a prospect with existing analysis, here is what has happened since, and here is new information. Update the analysis. Highlight what changed and why."

#### 2b. Re-analysis Prompt Engineering Pattern

The prompt should follow the "Reflexion" pattern -- feed the prior analysis back as context and explicitly ask for updates:

```
## Prior Analysis (Generated {date})
{previous_analysis_json}

## What Has Happened Since
{thread_history_summary}

## New Information
{new_context}

## Your Task

Update the analysis based on the new information. For each section:
1. If the assessment CHANGED, mark it with [UPDATED] and explain why
2. If the assessment STAYED THE SAME, keep it but note "confirmed by new evidence" or "unchanged"
3. If the buying signal level changed, explicitly call out the old vs new level
4. Generate an updated strategy that accounts for where the deal is NOW, not where it started

Return the FULL updated analysis (not just the changes) in the same JSON format.
Add a "changes" key summarizing what shifted:

{
  "analysis": { ... full updated analysis ... },
  "strategy": { ... full updated strategy ... },
  "engagement_tactics": { ... updated tactics ... },
  "draft": { ... updated draft for current stage ... },
  "changes": {
    "summary": "Buying signal upgraded from Medium to High after positive response",
    "fields_changed": ["buying_signal", "stage", "strategy.steps"],
    "signal_change": {"from": "medium", "to": "high"},
    "strategy_pivots": ["Shifted from warming approach to meeting request"]
  }
}
```

**Confidence:** HIGH for the prompt pattern, MEDIUM for the exact delta extraction working reliably.

**Why this works better than a generic "just run strategist again":**
- The LLM has explicit awareness of what it said before
- The prompt structures the response to include deltas
- The prior analysis anchors the LLM, preventing hallucinated "total strategy changes" when only minor info was added
- The changes object enables the UI to highlight what shifted

#### 2c. Analysis Version History

**New table: `lead_analysis_history`**

```sql
CREATE TABLE lead_analysis_history (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES lead_registry(id),
    version INTEGER NOT NULL DEFAULT 1,
    analysis_json JSONB NOT NULL,
    strategy_json JSONB NOT NULL,
    tactics_json JSONB,
    draft_json JSONB,
    changes_json JSONB,           -- delta from previous version
    triggered_by TEXT,             -- 'user_update', 'step_completed', 'scheduled'
    trigger_context TEXT,          -- the new context that triggered re-analysis
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

This is the key table that enables:
- Timeline view of how strategy evolved
- Diff view between any two versions
- Audit trail of what triggered each re-analysis

**The current `lead_registry` columns (`prospect_analysis`, `closing_strategy`, etc.) continue to hold the LATEST version.** The history table stores ALL versions including the initial one.

#### 2d. When to Trigger Re-analysis

| Trigger | Mechanism | Priority |
|---------|-----------|----------|
| User explicitly requests | "Re-analyze" button in bot/TMA | P0 (build first) |
| User adds context update with significant new info | After "Add Update" flow, offer "Re-analyze now?" | P0 |
| Engagement plan step completed | When user marks a step done, suggest re-analysis if several steps done | P1 |
| Status change to key stages | Moving to "reached_out" or "meeting_booked" triggers prompt | P1 |
| Scheduled (post-meeting follow-up) | After user reports a meeting, schedule re-analysis reminder for 2-3 days later | P2 (defer) |
| Automatic on forwarded message | If user forwards a prospect reply, auto-trigger re-analysis | P1 |

**Recommendation:** Start with explicit user-triggered re-analysis only (P0). Proactive triggers add complexity and risk annoying users. Add them as UX matures.

---

## 3. Strategy Evolution Visualization

### UX Patterns for Showing Changes

#### 3a. Bot (Telegram Chat) -- Simple Indicators

The bot's display is constrained by Telegram message formatting (Markdown, 4096 char limit). Strategy evolution should be communicated through:

1. **Re-analysis summary message:**
   ```
   Re-analysis Complete for Sarah Chen

   CHANGED:
   - Buying Signal: Medium --> High (positive response to outreach)
   - Stage: early_interest --> active_evaluation
   - Strategy: Shifted from warming to meeting request approach

   CONFIRMED:
   - Prospect type: corporate_vp (unchanged)
   - Key concern: pricing/value justification (still primary)

   [View Full Analysis] [View Changes Timeline]
   ```

2. **Inline keyboard buttons:**
   - "View Full Analysis" -- shows the current (latest) analysis
   - "View Previous" -- shows the prior version
   - "View Changes" -- shows only the delta

#### 3b. TMA (React App) -- Rich Visualization

The TMA can provide a much richer experience:

1. **Lead Thread View (Activity Feed):**
   - Chronological timeline of all activities for a lead
   - Each entry shows: timestamp, activity type icon, content, AI response
   - Re-analysis entries are highlighted with a "strategy updated" badge
   - Inline "what changed" expandable section on re-analysis entries

2. **Strategy Version Comparison:**
   - Side-by-side or inline diff of two analysis versions
   - Changed fields highlighted in amber/yellow
   - Signal strength changes shown as visual indicators (colored dots/bars)
   - Version selector dropdown: "Version 1 (Jan 15) vs Version 3 (Feb 2)"

3. **Signal Strength Timeline:**
   - Small sparkline or stepped chart showing buying signal over time
   - Points on the chart correspond to re-analysis events
   - Hover/tap shows what triggered the change

**Recommended approach for TMA:** Build the thread view first (it is the backbone), then add the diff view as a detail panel within the thread view. The signal timeline is a nice-to-have that can come later.

**Design patterns to follow:**
- Progressive disclosure: show summary first, expand for details
- Timeline with chunked events (group by day/week for long histories)
- Color-coded change indicators: green = improved, red = worsened, amber = changed (neutral)
- "Before/After" comparison cards rather than inline text diffs (more mobile-friendly)

**Confidence:** MEDIUM -- these are standard UX patterns but implementation effort varies significantly.

---

## 4. Multi-turn AI Interaction & Context Window Management

### The Core Problem

As a lead accumulates interactions, the context fed to the LLM grows:
- Knowledge base: ~70K tokens (playbook + company KB, already loaded)
- Casebook: ~2K tokens
- User memory: ~1K tokens
- Prior analysis: ~2-4K tokens
- Thread history: 5-20 activities x ~500 tokens each = 2.5-10K tokens
- New context: ~500 tokens

**Total potential: ~86K tokens for a re-analysis call.**

This is within the context window of modern models (Claude: 200K, GPT-4o: 128K, many OpenRouter models: 128K+), but cost and latency grow linearly with context size.

### Recommended Context Window Strategy

Use a **Summary Buffer Memory** pattern (hybrid approach):

1. **Always include verbatim:**
   - Knowledge base (required for accurate advice)
   - Prior analysis JSON (the last version)
   - New context (the current update)
   - Last 3-5 activities (recent context matters most)

2. **Summarize older context:**
   - If thread has > 5 activities, summarize activities 6+ into a brief paragraph
   - Summarization can be done by the LLM itself in a pre-processing step, or by a simpler heuristic (concatenate activity content, truncate to 500 chars)
   - Store the summary in a `thread_summary` field on the lead registry for reuse

3. **Strategy for the summary:**

   **Phase 1 (Simple, build first):** Truncation-based. Take the last 5 activities verbatim, truncate older ones to their first 100 chars each, prepend count: "15 earlier updates (summarized)."

   **Phase 2 (If needed):** LLM-based summarization. Before re-analysis, run a cheap/fast model to summarize the full thread into a structured summary (~500 tokens). Cache this summary and only regenerate when new activities are added.

**Confidence:** HIGH for Phase 1 approach, MEDIUM for Phase 2 (adds latency and cost).

### Preventing Hallucination in Multi-turn Analysis

Key risk: The LLM might "invent" changes that were not in the new context, or forget important aspects of the prior analysis.

**Mitigations:**

1. **Anchor the prior analysis explicitly.** The prompt must include the FULL prior analysis JSON, not a summary. This forces the LLM to reference concrete prior conclusions.

2. **Structured output enforcement.** Require the re-analysis to return the SAME JSON structure as the initial analysis. This prevents the LLM from dropping fields or inventing new ones.

3. **Delta validation.** After re-analysis, programmatically compare the old and new JSON to extract actual changes. Do not rely solely on the LLM's self-reported "changes" field -- verify it by diffing the two analysis objects in code.

4. **Conservative prompting.** Include in the system prompt: "If the new information does not affect a particular aspect of the analysis, keep the existing assessment unchanged. Do not speculate about changes not supported by the new evidence."

5. **Temperature control.** Use temperature 0.3-0.5 for re-analysis (lower than the 0.7 used for initial analysis) to reduce creative drift.

**Confidence:** HIGH -- these are well-established patterns for grounded LLM outputs.

### How CRM Copilots Handle This

Research findings on how major platforms approach evolving deal context:

| Platform | Approach | Relevance to Deal Quest |
|----------|----------|------------------------|
| Salesforce Einstein | Opportunity scoring recalculates automatically based on activity signals. Separate "deal health" score from "strategy recommendations." | Confirms: separate "signal strength" tracking from "strategy text" is best practice |
| Microsoft Copilot for Sales | Surfaces past emails/meetings to find buying signals. Does NOT automatically re-write strategy -- presents insights for human decision. | Confirms: auto-re-analysis should be suggested, not forced |
| Gong | Records all interactions, uses NLP to flag key moments (objections, competitor mentions, buying signals). Provides deal risk scores that update in real-time. | Relevant: activity classification matters. Tag activities with detected signals |
| HubSpot AI | Guided selling: suggests next actions based on pipeline stage and activity recency. Does not rewrite strategy. | Confirms: "next best action" suggestions per activity update is the right lightweight pattern |

**Key industry insight:** None of the major CRM AI platforms automatically rewrite full deal strategies. They all provide incremental insights/signals and let the user decide when to get a full re-assessment. Deal Quest's "explicit re-analysis trigger" approach aligns with industry best practice.

**Confidence:** MEDIUM -- based on WebSearch findings, not direct product testing.

---

## 5. Input Methods for New Context

### What the Bot Already Supports (via /support flow)

| Input Type | Status | Handler |
|------------|--------|---------|
| Text message | Supported | `on_support_input` |
| Photo/screenshot | Supported (vision model) | `on_support_photo` |
| Voice note | Supported (AssemblyAI) | `on_support_voice` |
| Forwarded message | NOT supported | -- |

### What the "Add Update" Flow Supports (via lead engagement)

Currently, the "Add Update" flow (`lead:context:`) only accepts **text** (`LeadEngagementState.adding_context`). It does NOT handle photos, voice, or forwarded messages.

### Recommended Input Method Expansion

| Input Method | Effort | Value | Approach |
|---|---|---|---|
| Text update | Done | High | Already working via `lead:context:` flow |
| Forwarded text message | Low | Very High | Detect `message.forward_origin`, extract `message.text`, treat as context update. Tag as `forwarded_message` activity type. |
| Voice note | Medium | High | Reuse `TranscriptionService`, add voice handler to `LeadEngagementState.adding_context`. Already proven in support flow. |
| Screenshot of reply | Medium | High | Reuse vision model flow from `on_support_photo`. Upload to storage, pass image_b64 to advice generation. |
| Forwarded photo/image | Medium | Medium | Combine forwarded message detection + photo handling. Extract caption + image. |

**Implementation priority:**

1. **Forwarded text messages** (lowest effort, highest impact): Users naturally forward prospect replies to the bot. Detecting `message.forward_origin is not None` and routing to the context update flow is ~20 lines of code.

2. **Voice notes in context updates**: Copy the transcription pattern from `on_support_voice`. Add `F.voice` handler for `LeadEngagementState.adding_context`.

3. **Screenshots in context updates**: Copy the photo handling from `on_support_photo`. Add `F.photo` handler for `LeadEngagementState.adding_context`.

**Aiogram 3 forwarded message handling (verified):**
```python
# In aiogram 3, forwarded messages have message.forward_origin
# The text is still in message.text / message.caption as usual
if message.forward_origin:
    # This is a forwarded message
    text = message.text or message.caption or ""
    # forward_origin can be MessageOriginUser, MessageOriginHiddenUser,
    # MessageOriginChat, MessageOriginChannel
```

**Confidence:** HIGH -- all input methods use existing bot infrastructure. Forwarded message handling is well-documented in aiogram 3.

---

## 6. Architecture Decisions Needed

### Decision 1: Re-analysis as Separate Agent vs. Modified Strategist

**Recommendation: New agent (`ReanalysisStrategistAgent`).**

Reasons:
- The prompt is fundamentally different (must include prior analysis, thread history, delta instructions)
- The `PipelineContext` needs additional fields (`prior_analysis`, `thread_history`, `new_context`)
- The output format is extended (includes `changes` key)
- The initial strategist should remain unchanged for new lead analysis

This follows the existing pattern where `StrategistAgent` and `TrainerAgent` are separate despite being similar in structure.

### Decision 2: Where to Compute Deltas

**Recommendation: Compute deltas in code, not just LLM.**

After the re-analysis agent returns, run a Python function that:
1. Deep-compares old analysis JSON vs. new analysis JSON
2. Extracts field-level changes (buying_signal: medium -> high)
3. Generates a structured `changes_json` object
4. Stores this in `lead_analysis_history`

The LLM's self-reported changes are a useful *narrative* ("Strategy shifted because...") but should not be the source of truth for *what* changed. JSON diffing is deterministic and reliable.

### Decision 3: Storage Strategy

**Recommendation: Dual storage.**

1. `lead_registry` columns hold the LATEST analysis (same as today)
2. `lead_analysis_history` table holds ALL versions with deltas
3. `lead_activity_log` gets a `re_analysis` entry linking to the version

This means:
- All existing code that reads `lead_registry.prospect_analysis` continues to work
- New features (diff view, timeline) read from `lead_analysis_history`
- The activity log remains the single timeline for the lead

### Decision 4: Context Update Triggering Re-analysis

**Recommendation: Prompt, don't auto-trigger.**

After a user adds a context update (and receives AI advice), show a button:
```
[Re-analyze Strategy] [Done for Now]
```

This keeps the user in control and avoids expensive re-analysis calls for minor updates ("just noting that I sent the email").

---

## 7. Implications for Roadmap / Phases

### Suggested Phase Structure for Conversational Re-analysis

**Phase A: Context Thread Foundation (Bot-side)**
- Add new activity types to `lead_activity_log`
- Add `metadata` JSONB column to `lead_activity_log`
- Support forwarded messages as context updates
- Support voice notes in context update flow
- Support screenshots in context update flow
- After any context update, show "Re-analyze Strategy?" button
- Estimated complexity: Medium (mostly extending existing handlers)

**Phase B: Re-analysis Pipeline (Bot-side)**
- Create `lead_analysis_history` table
- Create `ReanalysisStrategistAgent` with re-analysis prompt
- Create `reanalyze.yaml` pipeline config
- Implement delta computation (Python JSON diff)
- Save initial analysis as version 1 on lead creation
- On re-analysis: save new version, update lead_registry, log activity
- Bot handler for "Re-analyze" button triggering the pipeline
- Display re-analysis summary with delta highlights in bot message
- Estimated complexity: High (new agent, new table, new pipeline, prompt engineering)

**Phase C: Thread View in TMA (TMA-side)**
- Lead detail page: activity thread timeline component
- Different activity type rendering (context update, re-analysis, status change, etc.)
- Re-analysis entries with expandable "what changed" section
- Signal strength badge showing current vs. initial
- Estimated complexity: Medium (UI components, data hooks)

**Phase D: Strategy Comparison in TMA (TMA-side)**
- Version history sidebar/dropdown on lead detail
- Side-by-side or inline diff view for two analysis versions
- Signal strength timeline sparkline
- "Changes since last analysis" summary card on lead detail
- Estimated complexity: Medium-High (diff rendering, version selection UX)

### Phase Ordering Rationale

Phase A must come first because all subsequent phases depend on richer context capture. Phase B is the core value delivery -- without re-analysis, the thread is just a log. Phase C makes the thread visible and useful in the TMA. Phase D is polish and can be deferred without blocking core value.

Phases A and B could potentially be one combined phase if scope is tight, but separating them de-risks the prompt engineering work in Phase B.

### Dependency on Other v2.0 Epics

- **Smart Lead Creation:** The "auto-enriched lead" from Epic 1 becomes the initial analysis (version 1) that re-analysis builds on. No hard dependency, but sequencing Smart Lead Creation first means re-analysis works with richer initial data.
- **Engagement Plan Executor:** Re-analysis should update the engagement plan when strategy changes. This means Phase B should include engagement plan regeneration after re-analysis -- or at minimum, flag the plan as "may need update."

---

## 8. Pitfalls and Risks

### Pitfall 1: LLM Drift in Multi-version Analysis

**Risk:** Each re-analysis may drift further from reality if the LLM over-interprets minor signals or "forgets" earlier context that was summarized away.

**Mitigation:** Always include the FULL prior analysis JSON (not summarized). Use lower temperature. Validate deltas in code.

### Pitfall 2: Cost Explosion from Frequent Re-analysis

**Risk:** Knowledge base alone is ~70K tokens. Each re-analysis adds thread history on top. At $3-15/M tokens, frequent re-analysis could get expensive.

**Mitigation:**
- Make re-analysis user-triggered, not automatic
- Consider using a faster/cheaper model for re-analysis (the shared OpenRouter key already uses free-tier models)
- Cache and reuse thread summaries

### Pitfall 3: Context Thread Becoming Stale / Noisy

**Risk:** Users add low-value updates ("sent the email", "no response yet") that dilute the thread without adding analytical value.

**Mitigation:**
- In the re-analysis prompt, instruct the LLM to focus on *substantive* changes only
- In the thread display, allow collapsing/filtering minor updates
- Consider a "significance" score on activities (auto-classified or user-tagged)

### Pitfall 4: Breaking Existing Lead Merge Flow

**Risk:** The current support handler merges duplicate leads by overwriting analysis columns. Re-analysis introduces versioning. These two paths must be reconciled.

**Mitigation:**
- On merge (support handler), save the overwritten analysis to `lead_analysis_history` as a new version before overwriting
- Treat merge as a form of re-analysis with trigger_type "full_reanalysis"
- This requires changes to `_run_support_pipeline` -- plan carefully

### Pitfall 5: Telegram Message Size Limit

**Risk:** Re-analysis summaries with diff details can exceed Telegram's 4096 character limit.

**Mitigation:**
- Show compact summary in the message, with "View Full Changes" button
- Truncate strategy details in the bot, point to TMA for full view
- Use the `truncate_message` utility already in `bot/utils.py`

---

## 9. Sources

### Codebase References (HIGH confidence)

- `/Users/dmytrolevin/Downloads/GD_playground/bot/agents/strategist.py` -- Current strategist agent
- `/Users/dmytrolevin/Downloads/GD_playground/bot/handlers/support.py` -- Support pipeline with lead merge logic (lines 260-291)
- `/Users/dmytrolevin/Downloads/GD_playground/bot/handlers/leads.py` -- Lead engagement flows (Add Update, Get Advice, Screenshot Comment)
- `/Users/dmytrolevin/Downloads/GD_playground/bot/services/engagement.py` -- Engagement service with advice/comment/plan generation
- `/Users/dmytrolevin/Downloads/GD_playground/bot/storage/models.py` -- Data models including LeadRegistryModel and LeadActivityModel
- `/Users/dmytrolevin/Downloads/GD_playground/bot/storage/repositories.py` -- Repository classes including LeadActivityRepo
- `/Users/dmytrolevin/Downloads/GD_playground/bot/pipeline/context.py` -- PipelineContext shared state
- `/Users/dmytrolevin/Downloads/GD_playground/prompts/strategist_agent.md` -- Current strategist prompt
- `/Users/dmytrolevin/Downloads/GD_playground/prompts/lead_advisor.md` -- Current lead advisor prompt
- `/Users/dmytrolevin/Downloads/GD_playground/prompts/engagement_plan.md` -- Engagement plan generator prompt

### Domain Research (MEDIUM confidence)

- [Context Window Management Strategies (GetMaxim)](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/)
- [LLM Chat History Summarization Guide (Mem0)](https://mem0.ai/blog/llm-chat-history-summarization-guide-2025)
- [Top Techniques to Manage Context Length (Agenta)](https://agenta.ai/blog/top-6-techniques-to-manage-context-length-in-llms)
- [Context Management for Deep Agents (LangChain)](https://www.blog.langchain.com/context-management-for-deepagents/)
- [Context Window Management (OneUpTime, Jan 2026)](https://oneuptime.com/blog/post/2026-01-30-context-window-management/view)
- [Cutting Through the Noise: Smarter Context Management (JetBrains Research)](https://blog.jetbrains.com/research/2025/12/efficient-context-management/)

### Industry / CRM AI References (MEDIUM confidence)

- [Salesforce Einstein Features Analysis (Oliv.ai)](https://www.oliv.ai/blog/salesforce-einstein-features)
- [2026 CRM Trends: Twelve Practical Shifts (Sirocco Group)](https://www.siroccogroup.com/2026-crm-trends-twelve-practical-shifts-for-revenue-operations/)
- [AI Sales Enablement Tools 2026 (ZoomInfo)](https://pipeline.zoominfo.com/sales/ai-sales-enablement-tools)
- [Future-Proofing Sales: Conversational AI Trends 2026 (ProShort)](https://proshort.ai/resources/blog/future-proofing-your-sales-team-conversational-ai-trends-to-watch-in-2026-and-beyond)
- [Microsoft 365 Copilot for Sales 2025 Wave 2 (Microsoft Learn)](https://learn.microsoft.com/en-us/copilot/release-plan/2025wave2/copilot-sales/)
- [Incremental LLM Memory (Le Xu)](https://lexu.space/posts/2025/04/blog-post-1/)
- [CRM UX Design Best Practices (Aufait UX)](https://www.aufaitux.com/blog/crm-ux-design-best-practices/)

### Aiogram 3 References (HIGH confidence)

- [aiogram 3 Message types documentation](https://docs.aiogram.dev/en/latest/api/types/message.html)
- [aiogram forward_origin discussion](https://github.com/aiogram/aiogram/discussions/1085)

---

## 10. Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Context threading architecture | HIGH | Builds on existing `lead_activity_log` table and patterns |
| Re-analysis pipeline design | HIGH | Follows existing pipeline/agent patterns in the codebase |
| Prompt engineering for re-analysis | MEDIUM | Pattern is sound but exact prompt needs iteration/testing |
| Delta computation approach | HIGH | JSON diffing is deterministic; well-understood technique |
| Context window management | HIGH | Summary Buffer pattern is well-documented and appropriate for scale |
| Strategy evolution UX (bot) | HIGH | Constrained by Telegram formatting; patterns are clear |
| Strategy evolution UX (TMA) | MEDIUM | Standard UI patterns, but implementation effort varies |
| Input method expansion | HIGH | All input types already proven in the support flow |
| Cost/latency impact | MEDIUM | Depends heavily on model choice and re-analysis frequency |
| Industry alignment | MEDIUM | Based on WebSearch findings, not direct product testing |
