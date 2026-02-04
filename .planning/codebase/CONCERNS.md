# Codebase Concerns

**Analysis Date:** 2026-02-04

## Tech Debt

**Security Architecture: Anon Key with Full Access**
- Issue: Both the Python bot and TMA frontend use the InsForge anon key with full-access RLS policies (`anon_full_*`). This is an intentional security compromise to avoid JWT secret mismatch issues.
- Files: `functions/verify-telegram/index.ts`, `packages/webapp/src/lib/insforge.ts`, `bot/storage/insforge_client.py`
- Impact: The anon key is exposed in the JavaScript bundle, granting any client full database access. Per-user data isolation relies solely on application-level filtering by `telegram_id` rather than enforced RLS policies. A malicious user with the anon key could bypass all authorization.
- Fix approach: Migrate bot to use service role key (bypasses RLS), mint proper JWTs from Edge Function that PostgREST accepts, implement strict RLS policies that only allow user access to their own records via JWT claims, remove all `anon_full_*` policies. This requires Phase 1.5-level auth refactor.

**Context Stuffing: 70K+ Token Overhead**
- Issue: Every LLM call includes the full playbook (~17KB) and company knowledge (~50KB) via `KnowledgeService.combined`. This is naive context stuffing without semantic retrieval.
- Files: `bot/services/knowledge.py`, `bot/agents/strategist.py`, `bot/agents/trainer.py`, `bot/handlers/support.py`, `bot/handlers/learn.py`, `bot/handlers/train.py`
- Impact: High token costs (~70K tokens per call), slower response times, hits context limits on smaller models, wastes budget on irrelevant information. Every support/learn/train request pays this overhead.
- Fix approach: Implement RAG (Retrieval Augmented Generation). Chunk knowledge base, embed with sentence-transformers or OpenAI embeddings, store in vector DB (pgvector on InsForge), retrieve top-K relevant chunks at query time. Reduce context to 5-10K tokens.

**Massive Handler Files: 800-1000 Lines**
- Issue: Handler files are bloated with business logic, inline keyboard builders, and FSM state management mixed together.
- Files: `bot/handlers/leads.py` (1068 lines), `bot/handlers/support.py` (905 lines), `bot/handlers/admin.py` (819 lines)
- Impact: Hard to navigate, test surface is enormous, changes to keyboard layout touch business logic, refactoring risk is high.
- Fix approach: Extract keyboard builders to `bot/keyboards/` module, move business logic to services, create facade/orchestration layer for multi-step flows. Target: handlers < 300 lines, services < 200 lines.

**Shared Types Duplication: Railway Build Workaround**
- Issue: The `packages/shared/` types package is inlined into `packages/webapp/src/types/` because Railway's `root_dir` isolation prevents accessing `../shared` during build.
- Files: `packages/webapp/src/types/tables.ts`, `packages/webapp/src/types/enums.ts`, `packages/shared/src/types.ts` (source of truth)
- Impact: Types drift between shared source and webapp copy. Changes to shared types require manual sync. Risk of TMA using stale schemas.
- Fix approach: Pre-build script that copies types from shared to webapp before Railway build, or switch to Turborepo/monorepo builder that understands workspace references, or bundle shared types into an npm package published to private registry.

**API Key Storage: Fernet Encryption with Single Static Key**
- Issue: User API keys are encrypted with Fernet using a single static `ENCRYPTION_KEY` from environment variables. Key rotation is not supported.
- Files: `bot/services/crypto.py`, `bot/handlers/start.py`, `bot/handlers/settings.py`
- Impact: If `ENCRYPTION_KEY` leaks, all stored API keys can be decrypted retroactively. No ability to rotate keys without re-encrypting all user records. Fernet is secure but lacks key versioning.
- Fix approach: Implement key versioning (store key ID with each encrypted value), support multiple active keys, implement rotation procedure that re-encrypts records with new key in background job. Or migrate to envelope encryption (encrypt data keys with master key stored in secrets manager).

**No Error Retry Strategy for LLM Calls**
- Issue: LLM provider errors (rate limits, 5xx, timeouts) fail immediately with generic error messages. Retries are hardcoded with fixed delays.
- Files: `bot/services/llm_router.py` (lines 17-18: `MAX_RETRIES = 3`, `RETRY_DELAYS = [1, 3, 8]`)
- Impact: Users see "Sorry, error" messages on transient failures. No exponential backoff, no jitter, no circuit breaker. During OpenRouter/Claude outages, all requests fail.
- Fix approach: Implement tenacity or backoff library with exponential backoff + jitter, add circuit breaker pattern for provider health tracking, provide fallback to alternate model/provider, show user-friendly retry UI ("Retrying... 2/3").

**Pipeline Traces Never Purged**
- Issue: `pipeline_traces` and `pipeline_spans` tables accumulate indefinitely. No TTL, no cleanup job.
- Files: `bot/tracing/collector.py`, `bot/storage/repositories.py` (TraceRepo, SpanRepo)
- Impact: Database bloat, query performance degrades over time, observability queries slow down. Prod databases will hit storage limits.
- Fix approach: Implement retention policy (e.g., 30 days for traces, 7 days for spans), background cleanup job via cron/Railway scheduled task, or use InsForge TTL feature (if available), aggregate old traces to summary stats before deletion.

**Knowledge Base Files Not Validated**
- Issue: `playbook.md` and `company_knowledge.md` are loaded at startup with no validation. Missing files log warnings but don't fail startup.
- Files: `bot/services/knowledge.py` (lines 25-35)
- Impact: Bot runs with empty knowledge base, produces garbage LLM responses, users have no indication something is wrong. Silent failure mode.
- Fix approach: Make knowledge files required for production startup (fail-fast), add schema validation (minimum length, required sections), healthcheck endpoint that reports knowledge status, admin command to reload/validate knowledge.

## Known Bugs

**AssemblyAI Transcription Timeout Not Enforced**
- Symptoms: Voice messages longer than 5 minutes never complete transcription, bot hangs indefinitely.
- Files: `bot/services/transcription.py` (lines 60-79: polling loop has no iteration limit)
- Trigger: Send voice message > 5 minutes, transcription enters "processing" state indefinitely
- Workaround: Restart bot to clear stuck state, reject voice files > 2 minutes before upload

**Telegram InitData Expiry Check Off By One Hour**
- Symptoms: Valid Telegram Mini App sessions are rejected as "initData expired" during hour boundaries.
- Files: `functions/verify-telegram/index.ts` (lines 101-105: `now - authDate > 3600`)
- Trigger: Open TMA exactly 60-61 minutes after initial Telegram launch, re-authentication required
- Workaround: Close and reopen TMA from bot menu button

**Lead Activity Timeline Sorting Inconsistent**
- Symptoms: Activity timeline shows events in wrong order when multiple events share same timestamp.
- Files: `bot/handlers/leads.py` (lines 165-180: `ActivityTimeline` component), `packages/webapp/src/features/leads/components/ActivityTimeline.tsx` (lines 45-60)
- Trigger: Update lead status multiple times within same second (common during testing)
- Workaround: Add artificial delay between status updates, or include microsecond precision in timestamps

## Security Considerations

**Username-Based Authorization**
- Risk: Authorization middleware filters by Telegram username, which users can change anytime. Revoking access requires manual `.env` update and bot restart.
- Files: `bot/middleware.py`, `bot/config.py` (lines 35-50: `ALLOWED_USERNAMES` parsing)
- Current mitigation: Small trusted team (<10 users), manual access review, audit logging on unauthorized attempts
- Recommendations: Switch to Telegram user ID (immutable), implement admin command for access control (`/grant @user`, `/revoke @user`), store allowlist in database not env vars

**API Keys Decrypted in Memory During Request**
- Risk: Decrypted user API keys remain in memory for duration of LLM request. Memory dumps or crashes could expose keys.
- Files: `bot/handlers/support.py` (lines 857-863), `bot/handlers/train.py`, `bot/handlers/learn.py`
- Current mitigation: Fernet encryption at rest, keys only decrypted on-demand
- Recommendations: Use process isolation (spawn subprocess for LLM calls), clear sensitive variables explicitly after use (`del api_key`), implement memory encryption for long-running processes, rotate user keys quarterly

**No Rate Limiting on Support/Train Commands**
- Risk: Single user can spam `/support` or `/train` and exhaust LLM API quota (OpenRouter or Claude).
- Files: `bot/handlers/support.py`, `bot/handlers/train.py`, `bot/handlers/learn.py`
- Current mitigation: None (trusted team environment)
- Recommendations: Implement per-user rate limiting (e.g., 10 requests/hour, 50 requests/day), show remaining quota to users, queue requests when at limit, track costs per user in analytics

**InsForge Anon Key Exposed in JavaScript Bundle**
- Risk: TMA ships anon key in Vite build output. Any user can extract it from DevTools and make arbitrary database calls.
- Files: `packages/webapp/src/lib/insforge.ts` (lines 12-13: `VITE_INSFORGE_ANON_KEY`)
- Current mitigation: RLS policies exist but grant full access (`anon_full_*` policies), trusted Telegram-only distribution
- Recommendations: See "Security Architecture: Anon Key with Full Access" fix above — implement proper RLS + JWT auth

## Performance Bottlenecks

**Sequential Pipeline Execution**
- Problem: Pipeline steps run sequentially even when independent (e.g., memory update doesn't need to wait for strategist response).
- Files: `bot/pipeline/runner.py` (lines 40-80: `run()` method), `data/pipelines/support.yaml`, `data/pipelines/learn.yaml`
- Cause: PipelineRunner executes all steps in order unless explicitly marked `background: true`
- Improvement path: Add dependency graph analysis to runner, auto-parallelize independent steps, use asyncio.gather for concurrent execution, target 30-40% latency reduction

**N+1 Queries in Leaderboard and Admin**
- Problem: Leaderboard and admin dashboard load user records one-by-one in loops instead of batch queries.
- Files: `bot/handlers/stats.py` (lines 80-120: leaderboard building), `bot/handlers/admin.py` (lines 300-400: user overview), `packages/webapp/src/features/dashboard/components/LeaderboardWidget.tsx`
- Cause: Repository pattern lacks batch operations, each `get_by_telegram_id()` is a separate HTTP call
- Improvement path: Add `get_many()` and `query_batch()` to repositories, use PostgREST `in.()` filter for bulk fetches, reduce leaderboard load from 10-15 queries to 1-2

**Large Message Edits Causing Telegram Rate Limits**
- Problem: ProgressUpdater edits Telegram messages 2-3 times per second during long pipelines, hits 30 edits/minute rate limit.
- Files: `bot/services/progress.py` (lines 85-130: `update_phase()` method)
- Cause: No debouncing or throttling on edit operations, every phase transition triggers immediate edit
- Improvement path: Debounce edits to 1 per second, batch phase updates, show spinner animation without text changes, or switch to webhooks for real-time updates

**Playbook Loaded on Every Request**
- Problem: Not actually a bottleneck (loaded once at startup), but worth monitoring if playbook grows beyond 100KB.
- Files: `bot/services/knowledge.py` (cached in memory after `load()`)
- Cause: N/A (working as designed)
- Improvement path: If playbook exceeds 100KB, chunk and index for RAG (see "Context Stuffing" above)

## Fragile Areas

**FSM State Cleanup**
- Files: `bot/handlers/support.py`, `bot/handlers/train.py`, `bot/handlers/learn.py`, `bot/handlers/leads.py`
- Why fragile: FSM state can become stale if user abandons flow mid-way (e.g., starts `/support`, never finishes, state remains in `SupportState.awaiting_input`). Next command assumes fresh state.
- Safe modification: Always clear state at start of command handlers (`await state.clear()`), use state timeouts (aiogram FSM TTL feature), add `/cancel` command that clears all state
- Test coverage: None (no automated FSM tests)

**Telegram Message Editing**
- Files: `bot/services/progress.py` (lines 100-130), `bot/handlers/support.py` (lines 895-898), `bot/handlers/leads.py`
- Why fragile: Message edits fail silently if message is too old (>48 hours) or deleted by user. Code assumes `callback.message` is always editable.
- Safe modification: Wrap all `edit_text()` calls in try/except, fall back to sending new message if edit fails, check message age before edit, store message IDs in state for reliable targeting
- Test coverage: None (manual testing only)

**Callback Data Serialization**
- Files: `bot/handlers/leads.py` (lines 100-200: `_encode_callback`, `_decode_callback`), `bot/handlers/admin.py`
- Why fragile: Callback data is JSON-serialized and base64-encoded to fit Telegram's 64-byte limit. Deeply nested data or long strings cause truncation. Decode errors are swallowed.
- Safe modification: Use short keys (single letters), validate payload size before encoding, implement versioned schemas, add decode error handlers that show user-friendly messages
- Test coverage: None (edge cases not tested)

**TraceCollector Background Flush**
- Files: `bot/tracing/collector.py` (lines 37-53: `start()` and `stop()` methods)
- Why fragile: If bot crashes during shutdown, pending traces in memory are lost. No persistent queue. Flush task can hang if InsForge is unreachable.
- Safe modification: Add persistent buffer (write to disk on overflow), implement flush timeout (5s max), add dead letter queue for failed flushes, graceful degradation if tracing is down (log errors but don't block requests)
- Test coverage: None (shutdown scenarios not tested)

**Scenario JSON Parsing**
- Files: `bot/services/scenario_generator.py` (lines 80-110: `generate_scenario()` method), `bot/handlers/train.py` (lines 60-70)
- Why fragile: LLM responses are parsed as JSON with multiple fallback strategies (code fence stripping, regex extraction). Malformed JSON returns empty list, causing "No scenarios available" errors.
- Safe modification: Use strict JSON schema validation (pydantic), retry with different prompt on parse failure, fallback to static scenarios from `data/scenarios.json`, log parse errors with full LLM response for debugging
- Test coverage: None (LLM response variations not tested)

## Scaling Limits

**Single-Process Bot Architecture**
- Current capacity: ~100 concurrent users (aiogram async handles multiple requests)
- Limit: Single Railway dyno, no horizontal scaling. Memory usage grows with concurrent pipeline executions.
- Scaling path: Deploy multiple bot instances with shared database, use Telegram webhook mode instead of polling (allows load balancing), implement job queue (Celery/RQ) for pipeline execution

**InsForge PostgREST Connection Pooling**
- Current capacity: Default httpx client (100 connections), shared across all bot requests
- Limit: Concurrent requests > 100 will queue, InsForge may throttle at project tier limits
- Scaling path: Configure explicit connection pool size (`httpx.Limits(max_connections=200)`), monitor 429 responses, upgrade InsForge plan, implement request queuing with priority (user-facing > background)

**Telegram Rate Limits**
- Current capacity: 30 messages/second per bot, 1 edit/second per message
- Limit: ProgressUpdater can hit edit limits during high concurrency (10+ concurrent pipelines)
- Scaling path: Implement message edit queue with rate limit awareness, deduplicate rapid phase updates, use inline query results instead of message edits for high-frequency updates

**Railway Deployment: No Database Backups**
- Current capacity: Single Railway deployment, no automated database snapshots
- Limit: InsForge project data loss = complete user data loss (XP, progress, leads, casebook)
- Scaling path: Implement daily database exports via InsForge API, store backups in S3/GCS, test restore procedure quarterly, enable InsForge project backups feature (if available)

## Dependencies at Risk

**aiogram 3.x: Active Development**
- Risk: aiogram is on v3.4, breaking changes in v3.5+ could affect FSM or callback handling
- Impact: Bot could break on dependency update, middleware changes, state management refactor required
- Migration plan: Pin aiogram to `~3.4.0` in requirements.txt, monitor changelog before upgrading, test on staging branch first, budget 2-3 days for major version migrations

**Anthropic SDK: Model Deprecations**
- Risk: Claude Sonnet 4 (`claude-sonnet-4-20250514`) may be deprecated, requiring model migration
- Impact: Premium users on Claude API would lose access, need to migrate to new model ID, reprompt all agents
- Migration plan: Support multiple model versions simultaneously, add model version detection, implement graceful fallback to older models, notify users via `/settings` when their selected model is deprecated

**OpenRouter: Third-Party API Stability**
- Risk: OpenRouter is free tier dependency for all new users. Downtime or policy changes (rate limits, pricing) affect entire userbase.
- Impact: New users can't complete onboarding, all default users lose access, brand reputation hit
- Migration plan: Add alternate free provider (e.g., HuggingFace Inference API), implement provider health checks and auto-failover, cache responses for common scenarios, offer self-hosted LLM option (Ollama)

**Vite 7: Experimental Release**
- Risk: Vite 7 is recent release, TMA uses cutting-edge features (Tailwind CSS 4 integration)
- Impact: Build could break on minor Vite updates, Tailwind v4 is in beta
- Migration plan: Lock Vite to exact version (`"vite": "7.0.0"`), monitor Vite and Tailwind changelogs, test builds on every dependency update, budget 1-2 days for Vite 8 migration

## Missing Critical Features

**No User Data Export**
- Problem: Users cannot export their training history, casebook, or lead data. GDPR compliance risk.
- Blocks: GDPR "right to data portability" requests, user migration to other tools, trust building
- Priority: Medium (required for EU users)

**No Bulk Import for Leads**
- Problem: Users must add leads one-by-one via bot. Cannot import from CRM or CSV.
- Blocks: Adoption by users with existing lead databases (100+ leads)
- Priority: Medium (Phase 7 feature)

**No Offline Mode for TMA**
- Problem: TMA requires live internet connection. No PWA caching, no service worker.
- Blocks: Usage in low-connectivity environments (trains, planes, rural areas)
- Priority: Low (mobile-first design assumes connectivity)

## Test Coverage Gaps

**No Unit Tests**
- What's not tested: All business logic (agents, services, repositories)
- Files: Entire `bot/` directory (8972 lines)
- Risk: Refactoring breaks functionality silently, regressions not caught until prod
- Priority: High (test strategist, trainer, scoring, crypto, knowledge)

**No Integration Tests**
- What's not tested: Pipeline execution, FSM flows, InsForge API interactions
- Files: `bot/pipeline/runner.py`, `bot/handlers/*.py`
- Risk: Multi-step flows break between handlers, state transitions fail, database schema changes cause runtime errors
- Priority: High (test support flow, learn flow, lead management)

**No End-to-End Tests**
- What's not tested: Full user journeys (onboarding → support → casebook → leads)
- Files: All handlers, TMA pages
- Risk: User-facing flows break without detection, UX regressions
- Priority: Medium (manual testing covers core flows currently)

**No Frontend Tests**
- What's not tested: React components, hooks, API integrations
- Files: `packages/webapp/src/**/*.tsx` (9217 lines)
- Risk: UI regressions, broken API calls, state management bugs
- Priority: Medium (TMA is read-heavy, low risk for data corruption)

**No Load/Stress Tests**
- What's not tested: Concurrent user behavior, rate limit handling, database performance under load
- Files: N/A (no load testing infrastructure)
- Risk: Unknown scaling characteristics, prod outages under traffic spikes
- Priority: Low (trusted team environment, <50 users currently)

---

*Concerns audit: 2026-02-04*
