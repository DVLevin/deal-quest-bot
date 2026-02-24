# Domain Pitfalls: Multi-Agent NL Routing on Existing aiogram Bot

**Domain:** Adding natural language orchestration + multi-agent architecture + CRM to existing Python/aiogram Telegram bot
**Researched:** 2026-02-24
**Confidence:** HIGH (cross-referenced with ClickUp MCP reference implementation, aiogram docs, arxiv research, ZenML production report)

---

## Context: What Makes This Milestone Risky

This milestone adds seven compounding complexities simultaneously to a working production bot:
1. FSM-based routing → LLM-driven routing (dispatcher architecture change)
2. Single-pass pipeline execution → tool-use loops (unbounded iteration)
3. Flat lead registry → full CRM data model (schema migration on live data)
4. No scheduled messaging → proactive coaching triggers (new async scheduler pattern)
5. No conversation history → sliding-window context management (in-memory state)
6. 0 orchestrator LLM calls/message → 1+ calls/message minimum (cost exposure)
7. Existing /commands must still work (backward compatibility constraint)

Each is a known failure domain. The combination amplifies risk. These pitfalls are ordered by severity and are specific to this codebase.

---

## Critical Pitfalls

Mistakes that cause rewrites, production outages, or user-facing silent failures.

---

### Pitfall 1: aiogram Router Ordering — Catch-All Swallows Commands

**What goes wrong:** The natural language catch-all handler (registered as a plain `@router.message()` without filters) is included before the command routers in `main.py`. All messages including `/learn`, `/train`, `/support` hit the LLM orchestrator instead of their dedicated handlers. Users see slow, confusing responses for commands that used to be instant.

**Why it happens:** aiogram 3 processes handlers in router inclusion order. A `@router.message()` with no state filter matches everything — including messages that should have matched earlier command handlers. The catch-all router must be registered LAST after all command routers.

**Root cause in this codebase:** `dp.include_router()` calls in `main.py` currently end with `admin.router`. Adding a new `natural_language.router` before any existing router breaks all commands silently. The existing `SupportState.waiting_input` handler already demonstrates this problem: it uses state filters to scope correctly.

**Consequences:**
- All /command responses route to LLM orchestrator (expensive, slow)
- Commands that set FSM states may double-fire (command handler + catch-all both respond)
- Users report "bot feels broken" — commands don't work as expected
- LLM orchestrator bills spike unexpectedly

**Prevention:**
- Register the NL catch-all router LAST in `main.py`: `dp.include_router(natural_language.router)` must be the final router registration
- Add `F.text` filter explicitly on catch-all to exclude non-text messages handled by other routers
- Verify with an integration smoke test: send `/learn` and assert that `TrainerAgent` runs, not the orchestrator
- Use aiogram's `StateFilter(default_state)` to exclude active FSM states from the catch-all

**Detection:**
- Log which handler processed each message in development; check for orchestrator handling `/start`
- Write a handler-routing integration test before merging

**Phase to address:** Phase 1 (NL routing foundation) — router registration order must be correct from day one

**Confidence:** HIGH — confirmed by aiogram router documentation (propagation flow matches inclusion order) and ClickUp MCP reference, which registers `copilotHandler` after all command handlers in bot.ts

---

### Pitfall 2: Tool-Use Loop Infinite Iteration — No Hard Cap

**What goes wrong:** An agent's tool-use loop calls tools indefinitely because the LLM never decides it's "done." The orchestrator invokes a specialist, the specialist calls a tool, the tool result prompts another tool call, and so on. The agent hits no exit condition. OpenRouter costs spike per-message, and the Telegram user's request times out with no response.

**Why it happens:** The ClickUp MCP reference implements `max_iterations` per agent (configured in `agents.yaml`). The current bot's `PipelineRunner` has no iteration concept — pipelines are bounded by step count in YAML. Tool-use loops are fundamentally unbounded unless explicit guards exist. Academic research on 150+ production multi-agent traces confirms infinite loops are a primary failure mode: agents repeat tool calls 58-59 times without converging.

**Root cause in this codebase:** The current `BaseAgent.run()` returns a single `AgentOutput` with no iteration. The new tool-use loop pattern must be added to every specialist agent, and each must have a hard `max_iterations` cap (not just a soft "you're done" prompt).

**Consequences:**
- Single request burns $0.10-$2.00 in LLM costs (orchestrator + specialist + multiple tool calls)
- Telegram user waits indefinitely (no response until timeout)
- asyncio task hangs, blocking bot event loop if not properly structured
- OpenRouter rate limit hit, causing 429 errors on subsequent requests

**Prevention:**
- Implement `max_iterations: 5` (default) per agent in `agents.yaml` config
- After max iterations reached, return a graceful "I've reached my processing limit" message rather than raising an exception
- Add per-iteration logging: `logger.info("Agent %s iteration %d/%d", name, i, max_iterations)`
- Implement overall request timeout using `asyncio.wait_for()` with 90-second cap: specialist agents combined should not exceed 90 seconds
- Track "tool call sequence" to detect repetition: if the last 3 tool calls are identical, short-circuit with a warning

**Detection:**
- Alert if any single request takes >60 seconds
- Monitor total tool calls per request; alert if >10
- Log orchestrator iteration count; alert if >3

**Phase to address:** Phase 1 (orchestrator + BaseAgent implementation) — build cap in from day one, not as a fix

**Confidence:** HIGH — confirmed by ClickUp MCP reference (max_iterations per agent), arxiv study on multi-agent failures (2503.13657), and ZenML production report

---

### Pitfall 3: LLM Routing Misclassification — Wrong Specialist, Wrong Action

**What goes wrong:** The orchestrator LLM routes "update the deal with Sarah to Proposal stage" to the Coach Agent instead of the Deal Agent because "update" and "stage" appear in coaching prompts too. The Coach Agent responds with practice advice instead of updating the CRM. The user repeats their message, now confused. The orchestrator routes again and creates a duplicate.

**Why it happens:** Orchestrator routing relies on LLM judgment about ambiguous natural language. Specialist agent descriptions must be precise and non-overlapping. Arxiv research on 150+ multi-agent traces found specification failures account for the largest category of failures — routing is specification-dependent.

**Root cause in this codebase:** Deal Agent handles CRM writes; Coach Agent handles training and skill development. These are adjacent domains. A user message about "working on a deal" could route to either. Without precise, tested routing criteria, misclassification is frequent.

**Consequences:**
- CRM data corrupted if wrong agent acts on deal data
- User trust lost (bot gave coaching when they wanted to update a deal)
- Duplicate records if misrouted request triggers creation before correction

**Prevention:**
- Write specialist descriptions as exact-match criteria, not vague summaries: "Deal Agent handles: create deal, update deal stage, log deal note, list deals, mark deal won/lost" vs "Coach Agent handles: practice scenarios, skill assessment, learning tracks"
- Include negative examples in orchestrator prompt: "route to Deal Agent, NOT Coach Agent, for anything involving CRM fields or deal status"
- Add a lightweight keyword pre-filter before the LLM routing call (faster, cheaper): if message contains deal + stage/won/lost/note → hint Deal Agent
- Log routing decisions; review first 50 real user routing decisions for misclassifications before adding more agents

**Detection:**
- Track routing decisions per agent in traces
- Flag when user sends same message twice within 2 minutes (likely a retry after wrong routing)
- Admin command: `/admin routing-log` showing last 20 routing decisions with user messages

**Phase to address:** Phase 1 (orchestrator routing) + Phase 2 (refinement after seeing real routing errors)

**Confidence:** HIGH — arxiv study directly studied this failure mode; ClickUp MCP reference uses explicit specialist-per-domain design in agents.yaml

---

### Pitfall 4: Confirmation Flow Race Condition — Stale Confirmations

**What goes wrong:** User says "create a deal for Sarah at Acme, €50K, Proposal stage." The Deal Agent responds with a confirmation keyboard: "Create this deal? [Yes] [No]". Before the user taps "Yes", they send another message: "actually make it €60K". The bot processes the second message, the orchestrator sees no active FSM state, routes to Deal Agent again, which creates a new confirmation. Now two confirmations exist in memory. User taps "Yes" on the first (stale) keyboard → deal created with wrong amount.

**Why it happens:** The ClickUp MCP reference stores confirmations in a `Map<string, PendingConfirmation>` with 5-minute TTL and cleanup. The existing bot has no confirmation storage pattern for the new CRM write flow. Inline keyboards don't expire; buttons persist in Telegram chat indefinitely.

**Root cause in this codebase:** The existing bot uses `SupportState.waiting_input` FSM to scope actions to one conversation flow. The new NL approach won't use explicit FSM for every turn, so confirmations need a different scoping mechanism.

**Consequences:**
- Stale confirmation executes wrong CRM mutation
- Race condition: two confirmations active simultaneously for the same user
- Deal created with outdated parameters from first confirmation

**Prevention:**
- Store pending confirmations in a dict keyed by `(user_id, confirmation_id)` with 5-minute TTL
- Invalidate any existing pending confirmation for a user when they send a new message
- On "Yes" callback, verify confirmation_id matches current pending, reject stale ones
- Add confirmation timestamp and show it to user: "Confirm this action (expires in 5m):"
- Implement `cleanup_expired_confirmations()` running every 5 minutes (follow ClickUp pattern)

**Detection:**
- Log confirmation creation and resolution (confirmed/expired/cancelled)
- Alert if user has >1 active confirmation simultaneously

**Phase to address:** Phase 2 (CRM write operations) — confirmation storage design before first CRM write tool

**Confidence:** HIGH — directly observed in ClickUp MCP reference implementation, which has explicit `pendingConfirmations` Map with cleanup

---

### Pitfall 5: FSM State Left Active — NL Routing Dead Zone

**What goes wrong:** User sends `/support` (sets `SupportState.waiting_input`), then immediately types "what deals do I have?" expecting the NL orchestrator. Instead, the FSM `on_support_input` handler fires (it matches `SupportState.waiting_input`), treats "what deals do I have?" as a prospect description, runs the strategist pipeline, and returns a confused analysis. User is stuck in support FSM until they send `/cancel`.

**Why it happens:** The new NL routing coexists with existing FSM states. When users are in an FSM state, the state-scoped handler takes priority over the catch-all. This is correct behavior for /learn and /train flows, but it means users in support/learn/train states cannot access NL routing without first cancelling.

**Root cause in this codebase:** All three main handlers (support, learn, train) set FSM states. The catch-all NL handler only matches when FSM state is `default_state` (no active state). Users must clear state before NL routing works.

**Consequences:**
- Support-mode users can't naturally redirect to "update a deal" without /cancel
- Confusing UX: typing a question gets a prospect analysis
- Users abandon bot thinking it's broken

**Prevention:**
- Add intent detection in FSM handlers: if user input inside a state looks like a command or NL redirect ("what deals", "how am I doing"), offer to exit and route naturally
- Add "any command clears FSM state" logic in a middleware layer
- Add a clear "type /cancel to go back" hint in every FSM entry message (already partially done in support handler)
- Consider making train/learn states time-limited: auto-expire FSM state after 30 minutes of inactivity

**Detection:**
- Monitor NL routing rate per user; if a user sends many messages with 0 NL routes, they may be stuck in FSM
- User feedback: "help" messages inside FSM states

**Phase to address:** Phase 1 (NL routing handler) — design the FSM/NL interaction boundary at handler implementation time

**Confidence:** HIGH — confirmed by reading existing `support.py` handler and aiogram FSM documentation

---

### Pitfall 6: CRM Schema Without Pipeline Stages — Unmigrateable Data

**What goes wrong:** The Deal table is designed with `status: str` (a freeform text field) to represent deal pipeline stage. Months later, the team wants to add stage transitions, timestamps per stage, and "time in stage" analytics. The schema must be redesigned to a `deal_stages` table with proper stage history. All existing deals have status stored as text and must be migrated. The migration is painful and data loss is likely.

**Why it happens:** CRM pipeline stage is almost always a value from a fixed set (Lead, Qualified, Proposal, Negotiation, Closed Won, Closed Lost). Storing it as freeform text — even with application-layer validation — creates future migration pain. The existing `LeadRegistryModel` already has `status: str | None` as freeform text.

**Root cause in this codebase:** The current `LeadRegistryModel` was not designed for structured CRM pipeline management. Adding CRM-quality deals without a proper stage enum from the start will create unmigrateable data.

**Consequences:**
- "time in stage" analytics impossible without stage timestamp history
- Stage filter queries are `WHERE status LIKE '%proposal%'` — fragile
- Future milestone (external CRM sync) requires clean enum → CRM status mapping

**Prevention:**
- Define `DealStageEnum: Lead | Qualified | Proposal | Negotiation | Won | Lost | Stalled` as a PostgreSQL CHECK constraint from day one
- Add `stage_changed_at: timestamp` column so stage duration is trackable
- Store stage history in a `deal_stage_history` table (deal_id, stage, entered_at, exited_at)
- Never allow agents to write raw string stages — validate against enum at repository layer

**Detection:**
- Check for freeform status values in deals table via admin query

**Phase to address:** Phase 2 (CRM schema design) — enumerate stages before writing first migration

**Confidence:** HIGH — based on CRM data modeling best practices and existing `LeadRegistryModel` inspection showing `status: str | None`

---

### Pitfall 7: In-Memory Conversation History Lost on Bot Restart

**What goes wrong:** The ClickUp MCP reference stores conversation history in a module-level `Map<number, StoredMessage[]>` (pure in-memory). The Python equivalent is a module-level `dict[int, list[ChatMessage]]`. When the bot restarts (deploy, crash, Railway restart), all active conversation histories are wiped. Users mid-conversation get responses with no context. The orchestrator produces incoherent responses because it has no history.

**Why it happens:** In-memory storage is the simplest approach and is explicitly used by the ClickUp reference ("persistent storage deferred to future plan"). For a single-process bot it works — until the process restarts.

**Root cause in this codebase:** Railway deploys trigger bot restarts. Background exceptions can crash the process. The bot currently uses `MemoryStorage()` (in-memory FSM storage) which has the same limitation.

**Consequences:**
- Conversation context lost on every deploy
- Mid-conversation orchestrator loses track of what the user was asking
- Memory Agent processes incomplete conversation snapshots

**Prevention:**
- Explicitly document this limitation in code comments and admin tools
- Keep sliding window short (10 messages) to minimize the cost of history loss
- On history loss, gracefully handle by treating the next message as a fresh start — do not error
- For production resilience: add conversation history table to InsForge (deal_conversations: user_id, role, content, timestamp) as a future improvement; do not block v2.0 on this
- Alternatively: use aiogram's `RedisStorage` for FSM if Railway Redis addon is available

**Detection:**
- Log warning when orchestrator gets a message with empty history for a known active user
- Monitor deploy frequency; correlate with user experience degradation

**Phase to address:** Phase 1 (NL routing) — document the limitation explicitly; Phase 3+ (make persistent if needed)

**Confidence:** HIGH — observed in ClickUp reference codebase with explicit "deferred" comment; confirmed by Railway deployment pattern

---

## Moderate Pitfalls

Mistakes that cause cost overruns, technical debt, or degraded user experience.

---

### Pitfall 8: Every Message Now Costs Money — No Per-User Cost Guardrails

**What goes wrong:** With NL routing, every non-command message triggers an orchestrator LLM call (routing decision) plus potentially a specialist LLM call (execution). At 20 messages/day per active user, 10 users = 200 orchestrator calls + 200 specialist calls/day. With cheap models (OpenAI GPT-4o mini ~$0.15/1M input tokens) this is manageable, but if users paste long deal descriptions (2000 tokens each), costs scale with input length. One power user pasting 5000-token deal descriptions 50 times/day could cost $5-10/day alone.

**Why it happens:** The current bot only calls LLM when users explicitly run /support, /learn, /train. The NL routing change makes every message an LLM call. No per-user rate limiting or cost caps exist.

**Root cause in this codebase:** No cost tracking, no per-user rate limits, no circuit breaker on spending. The existing `llm_router.py` abstracts providers but has no cost awareness.

**Consequences:**
- OpenRouter monthly bill unexpectedly 5-10x higher than anticipated
- One spammy user can burn through credits before others can use the bot

**Prevention:**
- Use cheapest model for orchestrator routing (it's a classification task, not generation): `openai/gpt-4o-mini` or `google/gemini-flash-2.0` for routing decisions only
- Reserve expensive models (Claude Sonnet, GPT-4o) for specialist agent execution
- Add per-user daily message limit for NL routing (e.g., 50 NL messages/day); command shortcuts remain free
- Implement the circuit breaker pattern from ClickUp MCP: after 3 consecutive LLM failures, open circuit for 60 seconds
- Log estimated cost per request (input tokens × rate); track in traces

**Detection:**
- Monitor daily OpenRouter spend via API dashboard
- Alert if daily spend >$5
- Track average tokens per request; alert if P95 >3000 tokens

**Phase to address:** Phase 1 (NL routing) — choose cheap routing model before first deployment

**Confidence:** HIGH — verified by OpenRouter 2026 pricing, ClickUp MCP circuit breaker pattern

---

### Pitfall 9: Processing Lock Race Condition — Duplicate Concurrent Requests

**What goes wrong:** User sends a message and the bot takes 8 seconds to respond (orchestrator + specialist calls). Impatient user sends the same message again. Both requests run concurrently. The orchestrator processes both in parallel, both route to Deal Agent, both create the same deal. User ends up with two duplicate deals.

**Why it happens:** aiogram dispatches each incoming message to a handler concurrently via asyncio. Without a per-user processing lock, two requests from the same user can execute simultaneously.

**Root cause in this codebase:** The current handlers don't need this because they use FSM states as implicit locks. The new NL catch-all handler runs in `default_state` and has no such lock. The ClickUp MCP reference explicitly implements `processingChats: Set<number>` and `pendingMessageQueue: Map<number, QueuedMessage>`.

**Consequences:**
- Duplicate CRM writes (two deals created for one user message)
- Confirmation payloads from both executions confuse the user
- Inconsistent database state

**Prevention:**
- Implement `processing_users: set[int]` at module level in the NL handler
- When user message arrives and user is in `processing_users`: queue latest message, drop earlier queued message (only keep latest)
- On request completion, process queued message if exists; release lock
- Show "thinking..." reply immediately before processing (like ClickUp's `ctx.reply('Processing...')`) so users know to wait

**Detection:**
- Log when a user message is queued due to concurrent processing
- Alert if queue size >5 for any user (pathological retry behavior)

**Phase to address:** Phase 1 (NL routing handler) — implement lock before first deployment

**Confidence:** HIGH — directly observed as explicit pattern in ClickUp MCP copilot handler

---

### Pitfall 10: Proactive Scheduler — Message to Wrong User or Deleted Account

**What goes wrong:** The daily briefing scheduler (running as `asyncio.create_task`) loads active users from InsForge and calls `bot.send_message(telegram_id, ...)` for each. Some users may have:
- Blocked the bot (Telegram returns 403 Forbidden)
- Deleted their Telegram account (returns 400 Bad Request)
- Not used the bot in months (stale scheduled state)

The scheduler crashes on the first error, skipping all remaining users in the batch.

**Why it happens:** The existing `start_followup_scheduler` in `followup_scheduler.py` has per-lead error handling (`try/except` around individual leads) but the pattern of iterating users and sending proactive messages is easy to get wrong. A single `await bot.send_message()` call that raises silently propagates up and kills the scheduler loop.

**Root cause in this codebase:** The follow-up scheduler already exists and has the right error handling pattern. The daily briefing scheduler must follow the same pattern: wrap each user's message send in independent try/except, never let one user's failure stop others.

**Consequences:**
- Users who should get daily briefings receive nothing after one delivery failure
- Scheduler silently dies; no one notices for days
- If scheduler crashes hard, asyncio task is garbage-collected, scheduling stops entirely

**Prevention:**
- Wrap each user's `bot.send_message()` in individual `try/except`
- Catch `TelegramForbiddenError` (bot blocked) and disable that user's proactive messaging in their settings
- Catch `TelegramBadRequest` with "chat not found" and mark user as inactive
- Add health monitoring: log scheduler runs with count of successful/failed deliveries
- Restart scheduler loop on crash: wrap outer loop in `while True: try: await _scheduler_loop() except Exception: await asyncio.sleep(60)`

**Detection:**
- Log "Scheduler heartbeat: sent X briefings, failed Y" every run
- Alert if scheduled delivery rate drops to 0 (scheduler died)

**Phase to address:** Phase 3 (proactive messaging) — error handling design before first scheduled delivery

**Confidence:** HIGH — confirmed by examining existing `followup_scheduler.py` pattern and known Telegram API error codes

---

### Pitfall 11: Context Window Bloat From Full Playbook in Every Orchestrator Call

**What goes wrong:** The existing pipeline architecture loads 70K tokens of playbook + company knowledge into every LLM prompt. The orchestrator only needs to route the message to a specialist — it does not need 70K tokens of sales knowledge to decide "this message is about a deal." Including the full knowledge base in orchestrator calls costs 10-20x more than needed and causes the routing model to perform worse (context rot at 70K tokens).

**Why it happens:** The current `PipelineContext` passes `knowledge_base=knowledge.combined` to every agent regardless of whether they use it. When adapting this pattern for the orchestrator, the temptation is to pass the same context object.

**Root cause in this codebase:** `KnowledgeService.combined` returns full playbook + company knowledge. Appropriate for specialist agents (Strategist, Coach) but wrong for a routing-only orchestrator.

**Consequences:**
- Orchestrator routing call costs 5-10x more than necessary
- Routing decision quality degrades due to context rot in long prompts
- Latency increases 1-2 seconds for the routing step alone

**Prevention:**
- Orchestrator prompt: no knowledge base — only system context + agent descriptions + conversation history
- Specialist agents: receive focused context relevant to their domain (Strategy Agent gets full playbook; Coach Agent gets training tracks; Deal Agent gets deal records + brief playbook summary)
- Build a `build_orchestrator_context()` function that excludes knowledge base
- Document: orchestrator is a router, not an expert — its prompt should be short

**Detection:**
- Log token count per LLM call; alert if orchestrator calls exceed 5000 tokens
- A/B test routing accuracy with short vs long orchestrator prompt

**Phase to address:** Phase 1 (orchestrator design) — define what each agent receives before writing any agent

**Confidence:** HIGH — confirmed by reading existing support.py which loads `knowledge.combined` and by context window research showing degraded performance with very long prompts

---

### Pitfall 12: Memory Agent Running on Every Conversation — Costs Add Up

**What goes wrong:** The Memory Agent updates `user_memory` after every conversation turn. With NL routing, every message is a conversation turn. Memory Agent runs after every message, making an additional LLM call. At 20 messages/day per user, Memory Agent alone doubles LLM costs and adds 2-5 second latency to every exchange.

**Why it happens:** The current memory architecture (MemoryAgent in background task) was designed for infrequent pipeline calls (/support, /learn, /train). With NL routing making every message go through the system, the frequency increases dramatically.

**Root cause in this codebase:** `MemoryAgent` currently runs as a `background` step in the support pipeline. In the new architecture, memory should be inactivity-triggered, not per-message.

**Prevention:**
- Adopt the ClickUp MCP inactivity timer pattern: reset timer on every response, fire memory update 5 minutes after last user message (not after every message)
- Memory update uses a snapshot of conversation history taken when the timer is reset (not live history which may have changed)
- Allow aborting in-flight memory update when user sends new message (abort controller pattern)
- Log memory update frequency; alert if running >twice per hour per user

**Detection:**
- Track memory agent invocation rate per user
- Compare memory update costs before/after implementing inactivity timer

**Phase to address:** Phase 1 (memory architecture) — design inactivity timer before first memory update call

**Confidence:** HIGH — directly observed in ClickUp MCP (5-minute inactivity timer with abort controller), confirmed economically by OpenRouter pricing

---

### Pitfall 13: PostgREST Filtering Limitations for CRM Queries

**What goes wrong:** The Deal Agent needs to query: "show me all deals in Proposal stage that haven't been updated in 14 days and are >€20K." InsForge (PostgREST) supports column equality filters and simple comparisons via query parameters, but complex multi-column range queries with date arithmetic (`WHERE updated_at < NOW() - INTERVAL '14 days' AND amount > 20000 AND stage = 'proposal'`) require building raw PostgREST filter strings. The existing `InsForgeClient.query()` only supports basic equality filters.

**Why it happens:** The existing `query()` method in `insforge_client.py` uses `filters={"telegram_id": telegram_id}` for simple equality. CRM queries are inherently more complex.

**Root cause in this codebase:** `InsForgeClient.query()` accepts `filters: dict` for simple equality. A CRM query like "stale deals" requires PostgREST's `gte`, `lt`, `cs` operators and date arithmetic.

**Consequences:**
- CRM analytics features require complex workarounds or client-side filtering
- Deal Agent fetches all deals, filters in Python — O(n) performance problem as deals grow
- Analytics queries time out

**Prevention:**
- Extend `InsForgeClient` to support PostgREST comparison operators: `{"amount": {"gte": 20000}, "stage": "proposal"}`
- Add a `raw_query()` method for complex filters that passes arbitrary PostgREST query strings
- Design deal queries as stored procedures or PostgREST views for complex combinations
- Keep deal lists short per user (max 100 deals) to make client-side filtering practical in early phases

**Detection:**
- Monitor query response times for deal listing; alert if >500ms
- Profile queries that fetch all user deals and filter client-side

**Phase to address:** Phase 2 (CRM implementation) — extend client before building Deal Agent tools

**Confidence:** MEDIUM — based on existing `InsForgeClient` code inspection and PostgREST API documentation. PostgREST does support operators but current client doesn't expose them.

---

## Minor Pitfalls

Mistakes that cause friction, extra work, or subtle bugs.

---

### Pitfall 14: Tool Output Too Long for LLM Context

**What goes wrong:** A CRM tool returns a list of 50 deals as JSON to the orchestrator's tool-use loop. The JSON is 8,000 tokens. The next orchestrator LLM call now has a 8,000-token tool result in its message history, blowing past practical context limits. The LLM truncates or hallucinates due to the long context.

**Prevention:**
- All tool outputs must be capped: return max 5-10 items with a "use filters to narrow" hint
- Format tool output as plain text summary, not raw JSON: "Found 50 deals. Top 5 by stage: ..."
- Add `max_results` parameter to all list tools; default to 5

**Phase to address:** Phase 2 (CRM tool implementation)

---

### Pitfall 15: Typing Indicator Not Shown During Slow LLM Calls

**What goes wrong:** Orchestrator + specialist call takes 10-15 seconds. User sees nothing happening. They assume the bot crashed and send another message, triggering the processing lock and queue.

**Prevention:**
- Show Telegram typing action on entry to NL handler; repeat every 4 seconds (typing indicator expires after 5 seconds)
- Pattern: `await bot.send_chat_action(chat_id, "typing")` then set interval repeating every 4s
- Match the ClickUp MCP `withTypingIndicator()` pattern

**Phase to address:** Phase 1 (NL routing handler)

---

### Pitfall 16: TraceContext Not Wrapping Orchestrator Calls

**What goes wrong:** The existing `TraceContext` wraps pipeline execution (strategist, trainer). The new orchestrator + specialist agent calls are outside this context, so they produce no traces. Admin has no visibility into NL routing failures.

**Prevention:**
- Wrap each orchestrator invocation in `async with TraceContext(pipeline_name="orchestrator", ...):`
- Add orchestrator routing decision as a span: which specialist was chosen, with what confidence
- Extend existing `traced_span` decorator to work on the new agent `run()` methods

**Phase to address:** Phase 1 (NL routing) — trace from the first deployment

---

### Pitfall 17: Backward Compatibility Break — /support Now Routes to NL

**What goes wrong:** After adding NL routing, `/support` command still works (command handlers are registered first), but after running `/support` and entering `SupportState.waiting_input`, the user is in the existing pipeline flow. Meanwhile, natural language about deals bypasses this flow entirely. Two parallel paths exist for deal support: `/support` → strategist pipeline, and "help me with Sarah's deal" → orchestrator → Strategy Agent. These may produce inconsistent responses because they use different prompts and pipelines.

**Prevention:**
- Decide explicitly: does `/support` become a shortcut that invokes the NL path (forward to orchestrator with "deal support" hint), or does it remain a separate pipeline?
- Document this decision in code comments
- Recommended: keep `/support` as a shortcut that sets a context hint and routes through orchestrator — this simplifies the long-term codebase

**Phase to address:** Phase 1 (backward compatibility design decision)

---

### Pitfall 18: InsForge Upsert Race Condition on Deal Creation

**What goes wrong:** User sends "create a deal for Sarah at Acme" twice quickly (before first confirmation resolves). Processing lock (Pitfall 9) should prevent this, but if implemented incorrectly, two Deal Agent executions run. Both check "does deal for Sarah/Acme exist?" — neither finds one — both create it. Duplicate deal created.

**Prevention:**
- Use PostgreSQL-level unique constraint: `UNIQUE(user_id, prospect_name, prospect_company)` on the deals table (already partially implemented in `LeadRegistryRepo.find_duplicate()`)
- Handle `UNIQUE VIOLATION` at repository layer; return existing deal rather than raising exception
- Never trust application-layer duplicate checks alone

**Phase to address:** Phase 2 (CRM schema) — add unique constraint before first deal creation

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| NL routing handler registration | Catch-all swallows commands | Register NL router LAST; add StateFilter(default_state) |
| Orchestrator tool-use loop | Infinite iteration, no cap | max_iterations=5 + asyncio.wait_for(90s) hard timeout |
| Orchestrator context building | Full playbook in routing call | Orchestrator gets NO knowledge base; short prompt only |
| Specialist routing | Misclassification to wrong agent | Precise non-overlapping descriptions + keyword pre-filter |
| Processing lock | Duplicate concurrent requests | `processing_users: set[int]` + pending queue before any deploy |
| CRM schema | Freeform stage strings | PostgreSQL CHECK constraint enum on stage from day one |
| CRM schema | Race condition on create | UNIQUE constraint + handle at repository layer |
| Confirmation storage | Stale confirmation races | TTL-keyed Map + invalidate on new user message |
| Memory updates | Per-message memory cost | Inactivity timer (5 min) not per-message trigger |
| Proactive scheduler | Crash silently stops delivery | Per-user try/except + outer crash recovery loop |
| Context window | Knowledge base in orchestrator | Keep orchestrator prompt <2000 tokens |
| Tool outputs | Giant JSON responses blow context | Cap all tool responses at 10 items, text format not JSON |
| Observability | New agents not traced | TraceContext wrapping on orchestrator from day one |

---

## Lessons from ClickUp MCP Reference Implementation

The ClickUp MCP bot (`/Users/dmytrolevin/Desktop/clickup mcp/bot/src/`) is a working production example of this exact architecture (Orchestrator → Specialist Agents → Tool-use loops → Confirmation flow) built with grammY (TypeScript analog of aiogram). Key patterns to port:

### 1. Circuit Breaker (bot/src/utils/circuit-breaker.ts)
```python
# Python equivalent using the 'circuitbreaker' library or manual implementation
# ClickUp uses cockatiel: 3 consecutive failures → open for 60 seconds
# Port: wrap every openrouter HTTP call with circuit breaker
from circuitbreaker import circuit

@circuit(failure_threshold=3, recovery_timeout=60, expected_exception=Exception)
async def call_openrouter(messages, tools, system_prompt, model):
    ...
```
Purpose: Prevents cascading failures when OpenRouter is down. After 3 failures, immediately return "service unavailable" instead of waiting for timeouts.

### 2. Processing Lock + Queue (bot/src/handlers/copilot.ts)
```python
# Per-user processing lock with latest-message queuing
processing_users: set[int] = set()
pending_messages: dict[int, tuple[str, Any]] = {}  # user_id -> (text, message_obj)
```
Purpose: Prevents duplicate concurrent requests from impatient users. Queue only the LATEST message (overwrite, don't accumulate).

### 3. Specialist Timeout + Fallback (bot/src/agents/orchestrator.ts)
```python
# Per-specialist timeout with graceful fallback
async def invoke_specialist_with_timeout(agent, message, context, timeout=30):
    try:
        return await asyncio.wait_for(agent.run(message, context), timeout=timeout)
    except asyncio.TimeoutError:
        return f"Specialist {agent.name} timed out. Handle directly: {message[:200]}"
```
Purpose: Specialist agent timing out does not crash the orchestrator. Orchestrator handles request directly from its own knowledge.

### 4. Inactivity Timer for Memory (bot/src/handlers/copilot.ts)
```python
# Fire memory update 5 minutes after last user message (not per-message)
inactivity_timers: dict[int, asyncio.Task] = {}

def reset_inactivity_timer(chat_id: int, snapshot: list):
    if chat_id in inactivity_timers:
        inactivity_timers[chat_id].cancel()

    async def _delayed_memory_update():
        await asyncio.sleep(300)  # 5 minutes
        await memory_agent.process_conversation(chat_id, snapshot)

    inactivity_timers[chat_id] = asyncio.create_task(_delayed_memory_update())
```
Purpose: Memory updates run at most once per 5-minute idle period, not after every message.

### 5. Grounding Check on Final Responses (bot/src/agents/grounding.ts)
The ClickUp reference includes a `groundResponse()` function that checks the final orchestrator response against the tool call history to detect hallucinations (claims of actions not supported by tool results). Consider porting this for the Deal Agent where CRM mutations must be grounded in actual tool execution results.

### 6. Confirmation Short-Circuit (bot/src/agents/base-agent.ts)
```python
# Exit tool-use loop immediately when confirmation detected
# Don't make another LLM call to "ask" if the user wants to confirm
if confirmation_payload:
    return AgentResult(
        content=build_confirmation_message(confirmation_payload),
        confirmation_payload=confirmation_payload
    )
```
Purpose: After a write tool triggers confirmation, exit immediately. An extra LLM call to generate confirmation text wastes money and adds latency.

---

## What to Validate in Phase-Specific Research

Before each phase, investigate:

| Phase | Research Question |
|-------|------------------|
| Phase 1 (NL Routing) | Does aiogram's `StateFilter(default_state)` correctly exclude all active FSM states from the catch-all? Verify with test. |
| Phase 2 (CRM) | What PostgREST operator syntax does InsForge expose for date comparison and range queries? Test `gte`, `lt` operators with the existing client. |
| Phase 3 (Proactive) | Can Railway cron jobs or apscheduler be used for more reliable scheduling than an asyncio background task? Check Railway docs. |
| Phase 4 (Memory) | How does `user_memory` JSONB field perform with frequent concurrent updates? Consider lock strategy. |

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: "Make Orchestrator a General-Purpose Agent"
Give the orchestrator tools beyond routing (e.g., search_deals, update_deal). This makes the orchestrator both a router and an executor, removing the clean separation. Specialists become redundant. The orchestrator accumulates tools indefinitely.
**Instead:** Orchestrator routing only. All domain tools live in specialists.

### Anti-Pattern 2: "Forward Full knowledge.combined to Every Agent"
Pass `knowledge_base=knowledge.combined` (70K tokens) to the orchestrator, memory agent, and deal agent equally. All calls become expensive and slow.
**Instead:** Orchestrator gets no knowledge base. Specialists get only the knowledge relevant to their domain.

### Anti-Pattern 3: "Build a Perfect NL Parser Before Deploying"
Spend weeks refining routing prompts trying to eliminate all misclassification before any real user messages. Testing with synthetic messages misses real user language patterns.
**Instead:** Deploy with basic routing, log all routing decisions, review first 50 real decisions, iterate.

### Anti-Pattern 4: "Rewrite PipelineRunner to Support Tool-Use Loops"
The existing `PipelineRunner` (sequential/parallel/background) is working and valuable. Adding tool-use loop support to it creates a complex hybrid that's hard to reason about.
**Instead:** New agents implement their own tool-use loop internally. PipelineRunner wraps existing agents (strategist, trainer) for backward compat. Two patterns coexist.

### Anti-Pattern 5: "Store Conversation History in InsForge on Every Message"
Write every conversation turn to InsForge to make history persistent across restarts. At 20 messages/day × 10 users × 365 days = 73,000 writes/year. Not blocking, but premature optimization.
**Instead:** In-memory history with documented restart limitation. Add persistence only when restart frequency becomes a real user problem.

---

## Sources

- **ClickUp MCP reference implementation** (primary): `/Users/dmytrolevin/Desktop/clickup mcp/bot/src/` — direct code inspection of orchestrator, circuit breaker, processing lock, inactivity timer, confirmation storage
- **aiogram 3 Router documentation**: [docs.aiogram.dev/en/latest/dispatcher/router.html](https://docs.aiogram.dev/en/latest/dispatcher/router.html) — handler registration order and propagation flow
- **aiogram 3 FSM documentation**: [docs.aiogram.dev/en/latest/dispatcher/finite_state_machine/index.html](https://docs.aiogram.dev/en/latest/dispatcher/finite_state_machine/index.html)
- **"Why Do Multi-Agent LLM Systems Fail?"** (arxiv 2503.13657): [arxiv.org/html/2503.13657v1](https://arxiv.org/html/2503.13657v1) — 14 failure modes from 150+ production traces, specification failures as primary category
- **ZenML: "The Agent Deployment Gap"**: [zenml.io/blog/the-agent-deployment-gap](https://www.zenml.io/blog/the-agent-deployment-gap-why-your-llm-loop-isnt-production-ready-and-what-to-do-about-it) — infinite loop examples (58-59 repetitions), state management failures
- **"Fix Broken AI Apps: AI Agents Infinite Loops"**: [fixbrokenaiapps.com](https://www.fixbrokenaiapps.com/blog/ai-agents-infinite-loops) — Loop Drift taxonomy, repetitive tool use detection
- **"Designing agentic loops"** (Simon Willison): [simonwillison.net/2025/Sep/30](https://simonwillison.net/2025/Sep/30/designing-agentic-loops/) — production agentic loop patterns
- **Redis Context Window Overflow**: [redis.io/blog/context-window-overflow](https://redis.io/blog/context-window-overflow/) — context rot in long prompts
- **OpenRouter pricing 2026**: [openrouter.ai/pricing](https://openrouter.ai/pricing) — per-token cost basis for cost calculations
- **aiogram GitHub Issues #1362**: [github.com/aiogram/aiogram/discussions/1362](https://github.com/aiogram/aiogram/discussions/1362) — scheduled message patterns
- Existing codebase: `bot/handlers/support.py`, `bot/main.py`, `bot/middleware.py`, `bot/storage/models.py`, `bot/pipeline/runner.py`, `bot/tracing/context.py`, `bot/services/followup_scheduler.py`
