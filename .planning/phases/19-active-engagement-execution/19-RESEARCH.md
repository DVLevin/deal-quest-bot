# Phase 19: Active Engagement Execution (Refinement) - Research

**Researched:** 2026-02-07
**Domain:** Bot agent pipeline migration, multi-platform draft generation, TMA UX refinement
**Confidence:** HIGH

## Summary

This research covers four refinement areas for Phase 19: (1) migrating the `generate-draft` InsForge Edge Function to the bot's agent pipeline system, (2) improving the draft display UX with a tabbed view for multiple options, (3) making the prompt multi-platform aware with auto-detection, and (4) adding a post-copy "Done" nudge UX.

The codebase already has all the patterns needed. The bot has a well-established agent system (`BaseAgent` ABC, `AgentRegistry`, `PipelineContext` with `image_b64` support, `ModelConfigService` for per-agent model overrides, Langfuse `@observe` tracing). The existing `comment.py` handler and `ExtractionAgent` demonstrate vision-model image processing through the LLM router. The TMA has `DraftCopyCard`, `StepActionScreen`, toast notifications with action buttons, and the `useGenerateDraft` hook -- all of which need targeted modifications.

**Primary recommendation:** Use the InsForge database as a message bus (TMA writes a request row, bot polls/listens, writes result back, TMA polls for completion). This avoids adding HTTP server dependencies to the bot and leverages the existing InsForge infrastructure both projects already share.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Move draft generation from InsForge Edge Function to bot's existing LLM pipeline
- Create a **full CommentGeneratorAgent** in `bot/agents/` with its own prompt file in `prompts/`, registered in agent registry
- Wire into **ModelConfigService** so admin can select the model from TMA admin panel (Phase 18 infrastructure)
- Gets **Langfuse tracing** automatically by going through the bot's LLM router
- Prompt should **auto-detect platform and content type** from the screenshot (LinkedIn post, email thread, DM conversation, Twitter/X, Slack, etc.)
- Generate response in **appropriate format** for detected platform (comment, reply, message, etc.)
- Handle **any platform**, not just LinkedIn -- detect and adapt tone/format automatically
- Draft generation button appears for **any step with a screenshot attached**
- Multiple options (short/medium/detailed) shown as **tabbed view** -- segmented control to switch between options, one visible at a time
- Regeneration **replaces** current draft with brief **"Undo" toast** to restore previous if the new one is worse
- Drafts are **read-only + copy** -- user copies to clipboard and edits in the target platform directly
- After copying, **auto-suggest "Done -- I posted it"** button to complete the step in one more tap

### Claude's Discretion
- TMA-to-bot communication pattern (edge function proxy, DB message bus, or direct bot HTTP API)
- Edge function fate after migration (remove or keep as fallback)
- Step type UI adaptation approach (universal with smart hints vs. per-type layouts)
- GSD tracking approach (update Phase 19 summaries vs. create Phase 20 for refinements)
- Milestone placement (extend v2.0 with Phase 20 vs. start v2.1)

### Deferred Ideas (OUT OF SCOPE)
- None explicitly listed
</user_constraints>

## Standard Stack

No new libraries are needed. All work uses existing dependencies.

### Core (Already in Project)
| Library | Version | Purpose | Role in This Phase |
|---------|---------|---------|-------------------|
| aiogram | >=3.4.0 | Telegram bot framework | Bot process hosting |
| httpx | >=0.27.0 | Async HTTP client | Image fetching from storage URLs, LLM API calls |
| langfuse | >=3.12.1 | Observability | Auto-tracing via `@observe` decorator on new agent |
| React | 18 | TMA frontend | Tabbed draft UX, post-copy nudge |
| @tanstack/react-query | (existing) | Data fetching | Polling for draft generation results |
| zustand | (existing) | State management | Toast store for undo/nudge toasts |
| Pillow | >=10.0.0 | Image processing | `pre_resize_image` for screenshot preprocessing |

### Supporting (Already in Project)
| Library | Purpose | When Used |
|---------|---------|-----------|
| pydantic | Agent I/O models | `AgentInput`/`AgentOutput` for CommentGeneratorAgent |
| pyyaml | Pipeline config | Optional: if agent is wired via pipeline YAML |

### No New Dependencies Required
The entire phase uses existing stack. No `pip install` or `pnpm add` needed.

## Architecture Patterns

### Pattern 1: Bot Agent Creation (Established Pattern)

Every agent in the bot follows this exact structure, verified from `extraction.py`, `strategist.py`, `trainer.py`, `reanalysis_strategist.py`:

```python
# bot/agents/comment_generator.py
"""CommentGeneratorAgent -- generates contextual responses from screenshots."""
from __future__ import annotations
import logging
from pathlib import Path
from bot.agents.base import AgentInput, AgentOutput, BaseAgent
from bot.pipeline.context import PipelineContext
from langfuse import observe

logger = logging.getLogger(__name__)
_PROMPT_PATH = Path(__file__).resolve().parent.parent.parent / "prompts" / "comment_generator_agent.md"

class CommentGeneratorAgent(BaseAgent):
    name = "comment_generator"  # Used in registry and ModelConfigService lookups

    def __init__(self) -> None:
        self._prompt_template: str = ""
        if _PROMPT_PATH.exists():
            self._prompt_template = _PROMPT_PATH.read_text(encoding="utf-8")

    @observe(name="agent:comment_generator")
    async def run(self, input_data: AgentInput, pipeline_ctx: PipelineContext) -> AgentOutput:
        # Build system prompt, call pipeline_ctx.llm.complete(..., image_b64=...)
        ...
```

**Key observations from codebase:**
- `name` attribute must be unique across registry (used as key in `AgentRegistry._agents` dict)
- Prompt loaded from `prompts/` directory at init time via `Path(__file__).resolve().parent.parent.parent / "prompts"`
- `@observe(name="agent:comment_generator")` provides Langfuse tracing automatically
- `pipeline_ctx.llm.complete(system_prompt, user_message, image_b64=image_b64)` -- both `ClaudeProvider` and `OpenRouterProvider` already support `image_b64` parameter
- Registration in `main.py`: `agent_registry.register(CommentGeneratorAgent())`
- ModelConfigService integration is automatic -- `PipelineRunner._run_step()` calls `ctx.get_llm_for_agent(step.agent)` which checks `ModelConfigService` for per-agent overrides

**Source:** `/Users/dmytrolevin/Downloads/GD_playground/bot/agents/extraction.py`, `bot/agents/strategist.py`, `bot/main.py`

### Pattern 2: TMA-to-Bot Communication via DB Message Bus (Recommended)

**Decision rationale:** The bot currently has no HTTP server -- it uses aiogram polling mode with no web framework dependency. Adding aiohttp/FastAPI would be a significant change requiring new Railway configuration (exposing a PORT, handling health checks). The edge function proxy approach adds maintenance overhead for a thin proxy. The DB message bus leverages what both projects already share: InsForge.

**How it works:**
1. TMA writes a row to a new `draft_requests` table: `{ lead_id, step_id, telegram_id, proof_url, lead_context, status: 'pending' }`
2. Bot polls this table periodically (every 2-3 seconds via a background task, or triggered by a timer)
3. Bot picks up pending request, sets `status: 'processing'`, runs CommentGeneratorAgent, writes result back with `status: 'completed'` and `draft_text` column
4. TMA polls the same row (via React Query refetch interval or short polling) until `status === 'completed'`
5. TMA reads `draft_text` and displays it

**Alternative considered: Edge function as proxy to bot HTTP endpoint**
- Would require adding aiohttp/FastAPI to bot
- Would require Railway PORT exposure and health check endpoint
- More complexity, tighter coupling
- Only advantage: lower latency (direct HTTP call vs polling)

**Alternative considered: Keep edge function, just swap the LLM call**
- Edge function has no access to ModelConfigService, Langfuse, or prompt files
- Would need to duplicate configuration
- Defeats the purpose of the migration

**Latency analysis of DB bus:**
- TMA write + bot poll interval (2-3s avg) + LLM call (5-15s) + TMA poll (2-3s avg) = ~12-21s total
- Current edge function: ~10-15s (direct LLM call)
- Delta is 2-6 seconds -- acceptable for AI generation that already takes 10+ seconds
- User already sees a "Generating draft..." loading state

**Source:** `/Users/dmytrolevin/Downloads/GD_playground/bot/main.py` (no HTTP server), `functions/generate-draft/deploy.js` (current edge function)

### Pattern 3: Bot Background Polling Task (Established Pattern)

The bot already runs multiple background polling tasks. Pattern from `main.py`:

```python
# In main.py, after all setup:
create_background_task(
    start_draft_request_poller(agent_registry, model_config_service, insforge, ...),
    name="draft_request_poller",
)
```

Existing examples:
- `start_followup_scheduler(bot, lead_repo, activity_repo)` -- polls every 15 minutes
- `start_plan_scheduler(bot, reminder_repo, ...)` -- polls every 15 minutes
- `_scenario_generation_loop()` -- polls every 6 hours

For draft requests, polling every 2-3 seconds is appropriate since:
- It's a request/response pattern (user is waiting)
- Each poll is a lightweight DB query (`SELECT * FROM draft_requests WHERE status = 'pending' LIMIT 5`)
- InsForge PostgREST can handle this easily

**Source:** `/Users/dmytrolevin/Downloads/GD_playground/bot/main.py` lines 208-234

### Pattern 4: Image Fetching in Bot (From Edge Function)

The edge function currently fetches the image from a public URL and base64-encodes it. The bot needs to replicate this:

```python
# Fetch image from InsForge storage public URL
async with httpx.AsyncClient(timeout=30.0) as client:
    resp = await client.get(proof_url)
    resp.raise_for_status()
    image_bytes = resp.content

# Pre-resize for vision model (existing utility)
from bot.services.image_utils import pre_resize_image
resized_bytes = pre_resize_image(image_bytes)

# Base64 encode
import base64
image_b64 = base64.b64encode(resized_bytes).decode("ascii")
```

The bot already has `pre_resize_image()` in `bot/services/image_utils.py` (max 1568px, JPEG quality 85) and the `comment.py` handler demonstrates the full flow of downloading, resizing, and encoding photos.

**Source:** `/Users/dmytrolevin/Downloads/GD_playground/bot/services/image_utils.py`, `bot/handlers/comment.py` lines 109-115

### Pattern 5: Multi-Option Draft Output (JSON Structure)

The existing edge function returns a single `draft` string with markdown-formatted options. For the tabbed UI, the agent should return structured JSON:

```json
{
  "platform": "linkedin",
  "content_type": "post_comment",
  "options": [
    {
      "label": "Short",
      "length": "1-2 sentences",
      "text": "Insightful short comment..."
    },
    {
      "label": "Medium",
      "length": "2-3 sentences",
      "text": "More detailed comment..."
    },
    {
      "label": "Detailed",
      "length": "3-4 sentences",
      "text": "Comprehensive comment..."
    }
  ]
}
```

The `_extract_json()` function in `llm_router.py` already handles JSON extraction from LLM responses (strips markdown fences, finds JSON objects). The agent prompt should instruct the LLM to return this JSON structure.

**Source:** `/Users/dmytrolevin/Downloads/GD_playground/bot/services/llm_router.py` lines 21-47

### Pattern 6: Tabbed/Segmented Control in TMA

The TMA uses Tailwind CSS 4 with oklch colors and design tokens. A segmented control pattern:

```tsx
// Segmented control tabs
const tabs = ['Short', 'Medium', 'Detailed'];
const [activeTab, setActiveTab] = useState(0);

<div className="flex rounded-lg bg-surface-secondary/50 p-0.5">
  {tabs.map((tab, i) => (
    <button
      key={tab}
      onClick={() => setActiveTab(i)}
      className={cn(
        'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
        activeTab === i
          ? 'bg-surface text-text shadow-sm'
          : 'text-text-hint'
      )}
    >
      {tab}
    </button>
  ))}
</div>
```

This matches the existing design system (rounded-lg/xl, bg-surface-secondary, text-text-hint for inactive states, shadow-sm for active).

**Source:** Design tokens from `/Users/dmytrolevin/Downloads/GD_playground/packages/webapp/src/shared/ui/` components

### Pattern 7: Toast with Action Button (Established)

The toast store already supports action buttons:

```typescript
toast({
  type: 'success',
  message: 'Draft copied!',
  action: {
    label: 'Done -- I posted it',
    onClick: () => handleStepComplete(stepId),
  },
});
```

The toast auto-dismisses after 4 seconds (from `toastStore.ts` line 41). This is appropriate for the "Done" nudge -- if the user doesn't tap it, it goes away without blocking them.

**Source:** `/Users/dmytrolevin/Downloads/GD_playground/packages/webapp/src/shared/stores/toastStore.ts`

### Pattern 8: Undo Toast for Regeneration

For regeneration replacing drafts with an undo option:

```typescript
// Before regeneration, save current draft
const previousDraft = currentDraft;

// After regeneration succeeds
toast({
  type: 'success',
  message: 'New draft generated',
  action: {
    label: 'Undo',
    onClick: () => restorePreviousDraft(previousDraft),
  },
});
```

The 4-second auto-dismiss window gives users enough time to decide if they want to undo.

### Recommended Project Structure

New/modified files for this phase:

```
bot/
├── agents/
│   └── comment_generator.py     # NEW: CommentGeneratorAgent
├── services/
│   └── draft_poller.py          # NEW: Background poller for draft_requests table
├── storage/
│   └── repositories.py          # MODIFY: Add DraftRequestRepo class
prompts/
└── comment_generator_agent.md   # MODIFY: Upgrade from LinkedIn-only to multi-platform
packages/webapp/
├── src/features/leads/
│   ├── components/
│   │   ├── DraftCopyCard.tsx     # MODIFY: Add tabbed view, undo, post-copy nudge
│   │   └── StepActionScreen.tsx  # MODIFY: Wire new draft format, nudge callbacks
│   └── hooks/
│       └── useGenerateDraft.ts   # MODIFY: Switch from edge function to DB message bus
migrations/
└── NNNN_draft_requests.sql      # NEW: draft_requests table
```

### Anti-Patterns to Avoid
- **Adding HTTP server to bot:** Requires aiohttp/FastAPI, Railway PORT config, health checks, CORS -- high complexity for a single endpoint
- **Keeping dual paths (edge function + bot agent):** Maintenance burden of two implementations doing the same thing
- **Inlining prompt in code:** Use the `prompts/` directory file convention -- all other agents do this
- **Storing full draft history:** Keep only current draft in `engagement_plan` JSONB (as currently done with `suggested_text`). The undo toast is ephemeral (React state only)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON extraction from LLM | Custom parser | `_extract_json()` in `llm_router.py` | Handles code fences, extra text, edge cases |
| Image preprocessing | Custom resize | `pre_resize_image()` in `image_utils.py` | Already handles mode conversion, LANCZOS resampling |
| Clipboard copy | Custom impl | `copyToClipboard()` in `DraftCopyCard.tsx` | Already has Telegram WebView fallback |
| Toast notifications | Custom component | `useToast()` + `ToastContainer` | Already supports action buttons, auto-dismiss |
| Per-agent model config | Config file | `ModelConfigService` | 60s TTL cache, admin UI in Phase 18 |
| LLM tracing | Manual spans | `@observe` decorator from langfuse | Automatic generation tracking |

**Key insight:** This phase is primarily about wiring existing patterns together in a new configuration. The hard problems (vision model integration, clipboard handling, toast UX, agent framework) are already solved.

## Common Pitfalls

### Pitfall 1: InsForge Storage URL Accessibility
**What goes wrong:** The bot tries to fetch the proof screenshot from the InsForge storage public URL but gets a 403 or timeout.
**Why it happens:** The `prospect-photos` bucket may have access restrictions, or the public URL format might differ from what the bot expects.
**How to avoid:** Test the public URL from the bot's Railway environment. The TMA already uses `getPublicUrl()` which returns a string directly (per 19-01 decision). The bot just needs to `httpx.get(that_url)`.
**Warning signs:** Draft generation works locally but fails in production.

### Pitfall 2: Draft Request Polling Race Conditions
**What goes wrong:** Two bot instances (or a restart) pick up the same pending request, generating duplicate drafts.
**Why it happens:** No row-level locking on the `draft_requests` table.
**How to avoid:** Use an UPDATE...RETURNING pattern: `UPDATE draft_requests SET status = 'processing' WHERE status = 'pending' AND id = X RETURNING *`. If the UPDATE affects 0 rows, another instance already claimed it. Alternatively, since there's only one bot instance (Railway single process), this is unlikely but worth guarding against.
**Warning signs:** Duplicate draft results appearing.

### Pitfall 3: Structured JSON Output from Vision Models
**What goes wrong:** The vision model returns markdown-formatted text instead of clean JSON when analyzing a screenshot.
**Why it happens:** Vision models tend to be more "chatty" than text-only models, especially when processing images.
**How to avoid:** The prompt should be explicit about JSON output format. Include a concrete JSON example in the prompt. The `_extract_json()` fallback in `llm_router.py` will handle minor formatting issues, but the prompt should minimize the need for it.
**Warning signs:** `"raw_response"` key appearing in agent output instead of structured `options` array.

### Pitfall 4: TMA Polling Performance
**What goes wrong:** React Query polling for draft completion causes excessive re-renders or network calls.
**Why it happens:** Refetch interval too aggressive, or polling continues after result received.
**How to avoid:** Use `refetchInterval` with a conditional: `refetchInterval: data?.status === 'completed' ? false : 3000`. Stop polling once result arrives. Use React Query's `enabled` flag to prevent unnecessary queries.
**Warning signs:** Network tab showing continuous requests after draft is displayed.

### Pitfall 5: EngagementPlanStep JSONB Schema Evolution
**What goes wrong:** The `suggested_text` field currently stores a single string. Changing it to store structured JSON (with options array) breaks existing data.
**Why it happens:** `suggested_text` already has data from the current edge function (plain text drafts).
**How to avoid:** Two options: (a) Store the full structured draft in a new field like `draft_options` on the step, or (b) Keep `suggested_text` as the "selected" option and store the full options in the `draft_requests` result. Recommendation: store full options in `draft_requests.result` JSON column, and set `suggested_text` to the currently-selected tab's text when user copies (for backward compat).
**Warning signs:** Existing drafts breaking after deployment.

### Pitfall 6: Post-Copy "Done" Nudge Timing
**What goes wrong:** The "Done -- I posted it" toast appears but auto-dismisses before the user can tap it (4-second window).
**Why it happens:** User copies text, switches to another app (LinkedIn/email), comes back after toast dismissed.
**How to avoid:** Two approaches: (a) extend toast duration for this specific nudge (8-10 seconds), or (b) show a persistent "Mark as done?" banner in the StepActionScreen after copy instead of a toast. Recommendation: use both -- toast for immediate nudge, and change the "Mark Done" button to pulse/highlight after copy as a persistent hint.
**Warning signs:** Users copying drafts but not marking steps complete.

## Code Examples

### CommentGeneratorAgent -- Complete Agent Structure
```python
# bot/agents/comment_generator.py
"""CommentGeneratorAgent -- multi-platform draft generation from screenshots."""
from __future__ import annotations
import json
import logging
from pathlib import Path
from bot.agents.base import AgentInput, AgentOutput, BaseAgent
from bot.pipeline.context import PipelineContext
from langfuse import observe

logger = logging.getLogger(__name__)
_PROMPT_PATH = Path(__file__).resolve().parent.parent.parent / "prompts" / "comment_generator_agent.md"

class CommentGeneratorAgent(BaseAgent):
    """Generates contextual response drafts from screenshots.

    Auto-detects platform (LinkedIn, email, Twitter/X, Slack, DM, etc.)
    and generates appropriately formatted response options.
    """
    name = "comment_generator"

    def __init__(self) -> None:
        self._prompt_template: str = ""
        if _PROMPT_PATH.exists():
            self._prompt_template = _PROMPT_PATH.read_text(encoding="utf-8")
        else:
            logger.warning("Comment generator prompt not found: %s", _PROMPT_PATH)

    @observe(name="agent:comment_generator")
    async def run(self, input_data: AgentInput, pipeline_ctx: PipelineContext) -> AgentOutput:
        try:
            if not pipeline_ctx.image_b64:
                return AgentOutput(success=False, error="No image provided")

            # Build user message with lead context
            lead_context = input_data.context.get("lead_context", {})
            user_message = self._build_user_message(lead_context)

            result = await pipeline_ctx.llm.complete(
                self._prompt_template,
                user_message,
                image_b64=pipeline_ctx.image_b64,
            )

            # Validate expected structure
            if isinstance(result, dict) and "options" in result:
                return AgentOutput(success=True, data=result)

            # Fallback: wrap raw response
            return AgentOutput(success=True, data={"raw_response": str(result)})

        except Exception as e:
            logger.error("CommentGeneratorAgent error: %s", e)
            return AgentOutput(success=False, error=str(e))
```

**Source:** Pattern from `bot/agents/extraction.py`, `bot/agents/strategist.py`

### Draft Request Poller -- Background Service
```python
# bot/services/draft_poller.py
async def start_draft_request_poller(
    agent_registry: AgentRegistry,
    model_config_service: ModelConfigService,
    insforge: InsForgeClient,
    shared_openrouter_key: str,
) -> None:
    """Poll draft_requests table and process pending requests."""
    agent = agent_registry.get("comment_generator")
    repo = DraftRequestRepo(insforge)

    while True:
        try:
            # Claim a pending request (atomic status update)
            request = await repo.claim_next_pending()
            if request:
                await _process_draft_request(request, agent, model_config_service, repo, shared_openrouter_key)
        except Exception as e:
            logger.error("Draft poller error: %s", e)

        await asyncio.sleep(3)  # Poll every 3 seconds
```

### Updated useGenerateDraft Hook -- DB Message Bus
```typescript
// packages/webapp/src/features/leads/hooks/useGenerateDraft.ts
export function useGenerateDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: GenerateDraftVars): Promise<DraftResult> => {
      // 1. Insert request row
      const { data, error } = await getInsforge()
        .database.from('draft_requests')
        .insert({
          lead_id: vars.leadId,
          step_id: vars.stepId,
          telegram_id: vars.telegramId,
          proof_url: vars.proofUrl,
          lead_context: { name: vars.leadName, title: vars.leadTitle, ... },
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Poll until completed (or timeout)
      const requestId = data.id;
      const result = await pollForCompletion(requestId, 60_000); // 60s timeout
      return result;
    },
  });
}

async function pollForCompletion(requestId: number, timeoutMs: number): Promise<DraftResult> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await getInsforge()
      .database.from('draft_requests')
      .select('status, result')
      .eq('id', requestId)
      .single();

    if (data?.status === 'completed') return data.result;
    if (data?.status === 'failed') throw new Error(data.result?.error || 'Generation failed');

    await new Promise(r => setTimeout(r, 3000)); // Poll every 3 seconds
  }
  throw new Error('Draft generation timed out');
}
```

### Tabbed DraftCopyCard -- UI Pattern
```tsx
// Simplified tabbed view structure
function TabbedDraftCard({ options, onCopy, onMarkDone }: Props) {
  const [activeTab, setActiveTab] = useState(0);
  const [showDoneNudge, setShowDoneNudge] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(options[activeTab].text);
    setShowDoneNudge(true);
    toast({
      type: 'success',
      message: 'Copied!',
      action: { label: 'Done -- I posted it', onClick: onMarkDone },
    });
  };

  return (
    <div>
      {/* Segmented control */}
      <div className="flex rounded-lg bg-surface-secondary/50 p-0.5 mb-3">
        {options.map((opt, i) => (
          <button key={i} onClick={() => setActiveTab(i)}
            className={cn('flex-1 rounded-md px-3 py-1.5 text-xs font-medium',
              activeTab === i ? 'bg-surface text-text shadow-sm' : 'text-text-hint')}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Draft text (only active tab visible) */}
      <pre className="whitespace-pre-wrap font-sans text-sm">
        {options[activeTab].text}
      </pre>

      {/* Copy button */}
      <button onClick={handleCopy}>Copy Draft</button>
    </div>
  );
}
```

### Migration SQL -- draft_requests Table
```sql
CREATE TABLE draft_requests (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT NOT NULL REFERENCES lead_registry(id),
  step_id INT NOT NULL,
  telegram_id BIGINT NOT NULL,
  proof_url TEXT NOT NULL,
  lead_context JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient polling
CREATE INDEX idx_draft_requests_pending ON draft_requests(status) WHERE status = 'pending';
-- Index for TMA lookups
CREATE INDEX idx_draft_requests_lead_step ON draft_requests(lead_id, step_id);
```

## Discretion Recommendations

### 1. TMA-to-Bot Communication Pattern: DB Message Bus

**Recommendation:** InsForge database as message bus (as detailed above).

| Approach | Pros | Cons |
|----------|------|------|
| DB Message Bus | No new dependencies, uses existing infra, works with polling bot | ~4-6s extra latency from polling |
| Edge Function Proxy | Lower latency | Bot needs HTTP server (aiohttp/FastAPI), Railway PORT config, CORS |
| Direct Bot HTTP API | Lowest latency | Same as proxy + tighter coupling, health checks needed |

The DB bus adds ~4-6 seconds of polling overhead on top of the 10-15 second LLM call. Since the user already sees a "Generating draft..." loading state, the total ~15-20 second wait is acceptable.

### 2. Edge Function Fate: Remove After Migration

**Recommendation:** Remove `functions/generate-draft/deploy.js` after the bot agent is confirmed working.

Reasons:
- Maintaining two implementations for the same feature is a maintenance burden
- The edge function has a hardcoded model (`moonshotai/kimi-k2.5`) that can't be changed via admin UI
- No Langfuse tracing on the edge function
- No prompt file management (prompt is inlined)
- Removing eliminates confusion about which code path is active

### 3. Step Type UI Adaptation: Universal with Contextual Hints

**Recommendation:** Keep a single `StepActionScreen` layout for all step types, but add contextual text hints based on the step description.

The current `StepActionScreen` is already generic -- it works for any step type (comment, DM, email, etc.). Adding per-type layouts would create maintenance overhead without much UX benefit. Instead, the auto-detected platform from the AI agent can inform small UI touches:
- Show detected platform badge: "LinkedIn Comment" / "Email Reply" / "DM"
- Adjust copy button label: "Copy Comment" / "Copy Reply" / "Copy Message"

### 4. GSD Tracking: Phase 19 Refinement Plans (19-04 through 19-0N)

**Recommendation:** Continue as Phase 19 plans (19-04, 19-05, etc.) since the work is a direct refinement of Phase 19 features. Creating Phase 20 would artificially split related work.

### 5. Milestone Placement: Extend v2.0

**Recommendation:** Keep this in v2.0. It's a refinement of existing v2.0 work, not a new initiative. Starting v2.1 for 3-4 plans of refinement work would be organizational overhead.

## State of the Art

| Old Approach (Current) | New Approach (This Phase) | Impact |
|------------------------|--------------------------|--------|
| Edge function with hardcoded model | Bot agent with ModelConfigService | Admin can change model via UI |
| LinkedIn-only prompt | Multi-platform auto-detection prompt | Works for any screenshot |
| Single text blob for draft | Structured JSON with multiple options | Tabbed UX, better selection |
| No tracing on draft generation | Langfuse `@observe` tracing | Full observability |
| Copy-and-forget UX | Post-copy "Done" nudge | Better step completion rates |
| Direct edge function call | DB message bus | Decoupled, resilient |

## Open Questions

1. **Draft request cleanup policy**
   - What we know: `draft_requests` rows will accumulate over time
   - What's unclear: When to clean up old rows (TTL? batch delete?)
   - Recommendation: Add a `created_at` column and periodically delete rows older than 7 days via a cron-like background task. Not critical for launch -- can be added later.

2. **Concurrent draft requests for same step**
   - What we know: User might tap "Generate" while a previous request is still processing
   - What's unclear: Should we cancel the previous request or queue them?
   - Recommendation: Cancel-and-replace pattern. TMA checks for existing pending/processing request for the same lead_id + step_id and either waits for it or marks it cancelled before creating a new one.

3. **Bot restart during processing**
   - What we know: If the bot restarts while processing a draft request, the request stays in 'processing' status forever
   - What's unclear: Recovery mechanism
   - Recommendation: On startup, the poller should reset any 'processing' requests older than 2 minutes back to 'pending' (stale claim recovery).

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `bot/agents/base.py`, `bot/agents/extraction.py`, `bot/agents/strategist.py` -- agent patterns
- Codebase inspection: `bot/services/llm_router.py` -- vision model support (`image_b64` parameter)
- Codebase inspection: `bot/services/model_config.py` -- per-agent model config
- Codebase inspection: `bot/pipeline/context.py`, `bot/pipeline/runner.py` -- pipeline execution
- Codebase inspection: `bot/main.py` -- agent registration, background tasks
- Codebase inspection: `functions/generate-draft/deploy.js` -- current edge function implementation
- Codebase inspection: `packages/webapp/src/features/leads/hooks/useGenerateDraft.ts` -- current TMA hook
- Codebase inspection: `packages/webapp/src/features/leads/components/DraftCopyCard.tsx` -- current draft display
- Codebase inspection: `packages/webapp/src/features/leads/components/StepActionScreen.tsx` -- current step UI
- Codebase inspection: `packages/webapp/src/shared/stores/toastStore.ts` -- toast with action buttons

### Secondary (MEDIUM confidence)
- Architecture decision (DB message bus vs HTTP) -- based on codebase constraints analysis, no external sources needed

### Tertiary (LOW confidence)
- None -- all findings verified directly from codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, verified from `requirements.txt` and `package.json`
- Architecture: HIGH -- all patterns verified from existing codebase files, DB bus is a straightforward extension
- Pitfalls: HIGH -- based on direct codebase analysis and understanding of InsForge/Railway constraints
- Discretion recommendations: MEDIUM -- reasonable judgment calls, no external validation needed

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (stable -- no external dependencies changing)
