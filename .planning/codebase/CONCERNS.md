# Codebase Concerns

**Analysis Date:** 2026-02-06

## Tech Debt

**Context Stuffing Pattern:**
- Issue: Full playbook (389 lines) and company knowledge (1332 lines, ~72KB total) loaded into every LLM prompt
- Files: `bot/services/knowledge.py`, all agent files consuming `KnowledgeService.combined`
- Impact: Increased latency, token costs, and rate limit exposure on every agent call; single file edit requires all LLM context refresh
- Fix approach: Implement RAG with vector search; chunk knowledge base; only inject relevant sections per query type

**Bot Handler Complexity:**
- Issue: Handlers exceed 1000 lines with deeply nested FSM states and callback routing
- Files: `bot/handlers/leads.py` (1444 lines), `bot/handlers/support.py` (966 lines), `bot/handlers/context_input.py` (859 lines), `bot/handlers/admin.py` (819 lines), `bot/handlers/train.py` (629 lines)
- Impact: Difficult to test, debug, and extend; high cognitive load for modifications
- Fix approach: Extract callback routers to separate modules; create handler base classes for common patterns; split FSM flows into submachine classes

**Broad Exception Handling:**
- Issue: 80+ `except Exception` blocks swallow specific errors without granular handling
- Files: Distributed across all services and handlers (80 instances)
- Impact: Lost debugging context; silent failures; inability to differentiate transient from permanent errors
- Fix approach: Replace with specific exception types (httpx.HTTPError, pydantic.ValidationError, etc.); create custom exception hierarchy for domain errors

**LLM Response Parsing Fragility:**
- Issue: Triple-fallback JSON extraction (_extract_json in llm_router.py) attempts to parse broken responses
- Files: `bot/services/llm_router.py` lines 21-47
- Impact: Silent data loss when LLM returns malformed JSON; {"raw_response": text} fallback masks schema violations
- Fix approach: Use structured output APIs (Claude/OpenAI function calling); fail fast on parse errors; add response validation layer

**Dependency on Free LLM Tier:**
- Issue: Default model openai/gpt-oss-120b (free OpenRouter tier) has no uptime/quality SLA
- Files: `bot/config.py` line 30, `.env.example` line 31
- Impact: Unpredictable availability; quality degrades silently; no fallback when free tier fails
- Fix approach: Add automatic model fallback chain; monitor response quality; require premium tier for production

**Manual Migration Application:**
- Issue: No automated migration runner; schema changes require manual SQL execution via InsForge dashboard
- Files: `insforge/migrations/*.sql` (4 files)
- Impact: Deployment friction; schema drift between environments; no rollback mechanism
- Fix approach: Add migration version tracking table; implement up/down migration runner; integrate with deployment pipeline

**Telegram Auth Security Compromise:**
- Issue: Anon key with full-access RLS policies exposed in client bundle; TMA auth relies on client-side telegram_id filtering
- Files: `functions/verify-telegram/index.ts` lines 1-4, `packages/webapp/src/lib/insforge.ts` lines 44-66
- Impact: Any user can query any other user's data by modifying telegram_id filter; edge function JWT unused for PostgREST queries
- Fix approach: Migrate bot to service role key; remove anon_full_* RLS policies; enforce JWT-based RLS using edge function JWT

**Hardcoded Data Files in Codebase:**
- Issue: 360-line static scenario pool compiled into TMA bundle; duplicates server-side data
- Files: `packages/webapp/src/features/train/data/scenarios.ts` (360 lines), `data/scenarios.json` (41KB)
- Impact: Bundle bloat; data inconsistency between bot and TMA; requires redeploy to change scenarios
- Fix approach: Remove static scenarios; always fetch from generated_scenarios table; add fallback empty state UI

## Known Bugs

**Broken Import Resolution in context_input.py:**
- Symptoms: Module had nonexistent imports at creation (from bot.config import settings, from bot.services.knowledge import get_knowledge_base, from bot.services.llm_router import get_llm_for_user)
- Files: `bot/handlers/context_input.py` (fixed in Phase 15-04 but indicates pattern)
- Trigger: File was written against a different API surface and never executed until Phase 15
- Workaround: Fixed by using DI pattern (passing services as handler arguments)

**Version ID Collision Risk:**
- Issue: Version IDs calculated as max(version_id)+1 without database-level uniqueness constraint
- Files: `bot/storage/repositories.py` lines 492-495 (LeadAnalysisHistoryRepo)
- Trigger: Concurrent analysis updates on same lead
- Workaround: None (low probability with current single-user-per-lead access pattern)

**Callback Data String Parsing:**
- Issue: 50+ callback data splits without length validation before index access
- Files: `bot/handlers/leads.py`, `bot/handlers/context_input.py`, `bot/handlers/reminders.py` (all callback handlers)
- Trigger: Malformed callback data crashes handler with IndexError
- Workaround: type: ignore comments suppress type errors; crashes caught by broad exception handlers

## Security Considerations

**API Keys in Database:**
- Risk: Encrypted user API keys stored in users table using Fernet symmetric encryption
- Files: `bot/services/crypto.py`, `bot/storage/repositories.py` (UserRepo)
- Current mitigation: ENCRYPTION_KEY environment variable required; Fernet provides authenticated encryption
- Recommendations: Rotate ENCRYPTION_KEY periodically; add key versioning for zero-downtime rotation; consider external secret manager (AWS Secrets Manager, HashiCorp Vault)

**No Rate Limiting:**
- Risk: Users can spam LLM calls, driving up OpenRouter costs
- Files: No rate limiting implementation exists
- Current mitigation: Username-based authorization limits access to team (bot/middleware.py)
- Recommendations: Add per-user rate limits (requests/minute, tokens/day); implement token budgets in user table; add cost tracking per user

**Telegram initData Validation Window:**
- Risk: No timestamp validation on initData; replay attacks possible
- Files: `functions/verify-telegram/index.ts` (no auth_date check)
- Current mitigation: HMAC signature prevents tampering but doesn't prevent replay
- Recommendations: Validate auth_date is within 5-minute window; store used initData hashes to prevent replay

**Admin Access Control:**
- Risk: Admin status determined by username string match in ADMIN_USERNAMES env var
- Files: `bot/middleware.py` lines 38-43, `bot/config.py` lines 33-43
- Current mitigation: Usernames validated against Telegram API at message time
- Recommendations: Add admin role to users table; implement permission scopes (read/write/admin); log admin actions

**Environment Variable Exposure:**
- Risk: VITE_ prefixed vars baked into TMA client bundle at build time
- Files: `packages/webapp/src/lib/insforge.ts` lines 12-21, `.env.example` lines 49-59
- Current mitigation: Only public anon key exposed (already public per InsForge design)
- Recommendations: None needed (anon key is intended for client use); ensure no secrets use VITE_ prefix

## Performance Bottlenecks

**Knowledge Base Loading:**
- Problem: 72KB combined knowledge base loaded synchronously at startup; blocks bot initialization
- Files: `bot/services/knowledge.py` lines 20-35, `bot/main.py`
- Cause: Synchronous file I/O on main thread; no lazy loading
- Improvement path: Use async file I/O (aiofiles); lazy load on first use; cache parsed chunks instead of full text

**Context Stuffing on Every LLM Call:**
- Problem: 1700+ lines of knowledge injected into every agent prompt (70K+ tokens)
- Files: All agents consuming `KnowledgeService.combined` property
- Cause: No selective injection; full context sent regardless of query type
- Improvement path: Implement RAG; use prompt caching (Claude prompt caching); inject only relevant sections per agent type

**No Query Result Caching:**
- Problem: Repeated identical queries to InsForge on every request (e.g., user lookup on every command)
- Files: `bot/storage/repositories.py` (all Repo classes)
- Cause: No in-memory cache layer
- Improvement path: Add Redis or in-memory LRU cache for user/memory data; cache for 5-10 minutes; invalidate on writes

**Unbounded get_all() Queries:**
- Problem: Generated scenario queries fetch 200 rows without pagination
- Files: `bot/handlers/train.py` line 79 (limit=200), `bot/handlers/admin.py` line 597 (limit=50)
- Cause: No pagination UX; limit used as workaround
- Improvement path: Add cursor-based pagination to repositories; limit default to 20; implement infinite scroll in handlers

**Progress Update Loop:**
- Problem: ProgressUpdater sends Telegram edit_message every 250ms during pipeline execution
- Files: `bot/services/progress.py` lines 90-106
- Cause: Real-time status feedback design; no debouncing
- Improvement path: Increase interval to 1-2 seconds; debounce rapid status changes; batch updates

## Fragile Areas

**Pipeline Context State:**
- Files: `bot/pipeline/context.py`, `bot/pipeline/runner.py`
- Why fragile: Shared mutable dict accessed by parallel agents; no locking; ContextVar propagation depends on async context boundaries
- Safe modification: Always use ctx.set_result() and ctx.get_result() accessors; never mutate ctx.results directly; avoid ctx access in background tasks
- Test coverage: No unit tests for concurrent access patterns

**FSM State Transitions:**
- Files: All handlers using `FSMContext` (support.py, learn.py, train.py, context_input.py, leads.py)
- Why fragile: State stored in memory (Redis backend not configured); state loss on bot restart; no state validation
- Safe modification: Always call state.clear() after flow completion; validate state.get_data() keys before access; add state machine diagrams
- Test coverage: No integration tests for state flows

**Trace Collector Background Flush:**
- Files: `bot/tracing/collector.py` lines 37-53
- Why fragile: Async task created at startup; stop() has 5-second timeout; unflushed traces lost on crash
- Safe modification: Ensure start() called before any traced operations; always await stop() in shutdown handler; monitor _trace_buffer size
- Test coverage: No tests for flush failure scenarios

**LLM Retry Logic:**
- Files: `bot/services/llm_router.py` lines 17-18, 90-140
- Why fragile: 3 retries with exponential backoff but no jitter; all LLM errors treated as retryable
- Safe modification: Add jitter to retry delays; distinguish 4xx (permanent) from 5xx (transient); surface retries in observability
- Test coverage: No tests for retry behavior

**Repository Error Handling:**
- Files: `bot/storage/repositories.py` (all 11 Repo classes)
- Why fragile: InsForgeClient exceptions not caught; assumes all queries succeed; no graceful degradation
- Safe modification: Wrap all client calls in try/except; return None on errors; log failures with request context
- Test coverage: No repository unit tests

## Scaling Limits

**Single-Region Database:**
- Current capacity: InsForge EU-central region
- Limit: ~100ms latency from non-EU users; single point of failure
- Scaling path: Add read replicas; implement multi-region routing; use edge function for global distribution

**In-Memory Trace Buffer:**
- Current capacity: Unbounded deque in TraceCollector
- Limit: Memory exhaustion if flush fails; ~100MB per 10K traces
- Scaling path: Add buffer size limit with overflow policy; persist buffer to disk on overflow; use external tracing backend (Datadog, Honeycomb)

**Telegram Bot Polling:**
- Current capacity: Single long-polling connection; processes updates sequentially
- Limit: ~10 updates/second throughput; no horizontal scaling
- Scaling path: Switch to webhook mode; deploy multiple bot instances behind load balancer; use message queue for distribution

**LLM Concurrency:**
- Current capacity: Unbounded parallel agent execution in pipelines
- Limit: OpenRouter rate limits (varies by model); cost explosion on traffic spikes
- Scaling path: Add semaphore limiting concurrent LLM calls; implement request queue with priority; use reserved capacity models

## Dependencies at Risk

**@insforge/sdk:**
- Risk: Pre-release SDK (0.x version); breaking changes likely
- Impact: TMA queries break on SDK updates; no migration path
- Migration plan: Pin exact version in package.json; test SDK updates in staging; consider forking SDK for stability

**aiogram 3.x:**
- Risk: Major version still evolving; FSM API may change
- Impact: State management breaks; middleware API incompatible
- Migration plan: Pin to minor version (3.4.x); monitor changelog; allocate time for migration when 4.x releases

**OpenRouter Free Tier Models:**
- Risk: Free models deprecated without notice; quality varies
- Impact: Default user experience degrades; training pipeline fails silently
- Migration plan: Require users to configure own API keys; remove shared OPENROUTER_API_KEY; add model health monitoring

## Missing Critical Features

**No Database Backups:**
- Problem: InsForge project has no automated backup policy
- Blocks: Disaster recovery; accidental data deletion recovery
- Priority: High

**No User Data Export:**
- Problem: No API endpoint or command to export user's training data
- Blocks: GDPR compliance; user data portability
- Priority: High

**No Observability for LLM Costs:**
- Problem: No tracking of token usage, cost per user, or cost per feature
- Blocks: Budget forecasting; identifying cost-inefficient features
- Priority: Medium

**No Deployment Pipeline:**
- Problem: Manual Railway deploys; no CI/CD; no automated testing before deploy
- Blocks: Confidence in deployments; rollback capability
- Priority: Medium

**No Health Checks:**
- Problem: Bot has no /health endpoint or readiness probe
- Blocks: Railway restart on failure detection; load balancer integration
- Priority: Low

## Test Coverage Gaps

**Agent Execution:**
- What's not tested: Agent input/output contracts; error propagation; context sharing between agents
- Files: `bot/agents/*.py` (6 agent classes)
- Risk: Refactoring agents breaks pipelines silently; schema changes undetected
- Priority: High

**Repository Layer:**
- What's not tested: CRUD operations; query filters; error handling on HTTP failures
- Files: `bot/storage/repositories.py` (11 repo classes)
- Risk: Database schema changes break queries at runtime; no validation before deploy
- Priority: High

**FSM Flows:**
- What's not tested: State transitions; callback routing; error states; timeout handling
- Files: All handlers using FSMContext (7 handlers)
- Risk: Edge cases crash bot; users stuck in invalid states
- Priority: Medium

**LLM Response Parsing:**
- What's not tested: Malformed JSON handling; schema validation; fallback behavior
- Files: `bot/services/llm_router.py` _extract_json function
- Risk: LLM output format changes break silently; bad data persisted to database
- Priority: Medium

**TMA Authentication:**
- What's not tested: initData validation; HMAC verification; JWT minting; session lifecycle
- Files: `functions/verify-telegram/index.ts`, `packages/webapp/src/features/auth/useAuth.ts`
- Risk: Auth bypass; data leaks; session hijacking
- Priority: High

**Trace Collection:**
- What's not tested: Buffer overflow; flush failures; concurrent span recording; shutdown cleanup
- Files: `bot/tracing/collector.py`
- Risk: Lost observability data; memory leaks; shutdown hangs
- Priority: Low

---

*Concerns audit: 2026-02-06*
