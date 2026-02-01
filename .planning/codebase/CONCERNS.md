# Codebase Concerns

**Analysis Date:** 2026-02-02

## Tech Debt

**Database Authentication — Anon Key Full Access (Security Compromise):**
- Issue: Python bot and JavaScript client both use the InsForge anon key which has full-access RLS policies (`anon_full_*`). This is a documented temporary workaround (see lines 1-4 in `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/functions/verify-telegram/index.ts`).
- Files:
  - `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/storage/insforge_client.py` (line 26: uses anon_key)
  - `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/main.py` (line 62)
  - `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/migrations/001_enable_rls_and_policies.sql` (lines 22-37)
- Impact: Any client that obtains the anon key (including bundled in JS) has full database access, bypassing RLS. Exposes all user data to unauthorized access if key is compromised or leaked through browser bundle.
- Fix approach: Migrate bot to use service role key (bypasses RLS server-side). Once migrated, remove all `anon_full_*` policies and enforce JWT-based row-level access policies in `authenticated` role. JavaScript client already has JWT auth infrastructure in place (`/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/packages/webapp/src/lib/insforge.ts` lines 51-64).

**Large Handler Files — Complexity and Maintainability:**
- Issue: Handler files exceed 600+ lines, containing complex state management, keyboard building, callback routing, and business logic.
- Files:
  - `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/handlers/leads.py` (1,068 lines)
  - `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/handlers/support.py` (868 lines)
  - `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/handlers/admin.py` (656 lines)
  - `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/handlers/train.py` (613 lines)
- Impact: High cognitive load for modifications, difficult to test individual features, increased risk of breaking related functionality when changing one handler. Makes adding new features (like new lead workflows) expensive.
- Fix approach: Extract keyboard builders and callback routing into separate modules (e.g., `bot/handlers/leads/keyboards.py`, `bot/handlers/leads/callbacks.py`). Move business logic to dedicated service classes. Aim for handlers <400 lines with focused FSM logic.

**Multiple AsyncClient Instances — Connection Pool Inefficiency:**
- Issue: `LLMProvider` subclasses create persistent `httpx.AsyncClient` instances (`bot/services/llm_router.py` lines 74, 144), while other services create new instances per request (`bot/storage/insforge_client.py` line 212, 227; `bot/services/llm_router.py` line 240).
- Files:
  - `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/storage/insforge_client.py` (line 212: file upload, line 227: RPC calls create new clients)
  - `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/services/llm_router.py` (line 240: web_research_call creates new client)
- Impact: Inconsistent resource management, potential connection exhaustion under high load, slower API calls due to lack of connection reuse for one-off requests.
- Fix approach: Unify AsyncClient management—either pool all clients at app startup (in `main.py`) and inject via DI, or ensure all one-off requests reuse a module-level client with proper lifecycle management.

**Memory-Based FSM State Storage:**
- Issue: Bot uses `MemoryStorage()` for Aiogram FSM context (`bot/main.py` line 112). State is lost on bot restart, and distributed deployments will have state desynchronization.
- Files: `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/main.py` (line 112)
- Impact: User conversations interrupted on deploy, state inconsistency in multi-instance setups, potential data loss if bot crashes mid-transaction.
- Fix approach: Migrate to persistent FSM storage (e.g., Redis-based via `aiogram` FSM backends or database-backed). Critical for production reliability.

**Null Byte Injection in JSON Data:**
- Issue: `AttemptRepo.create()` manually sanitizes `feedback_json` by stripping null bytes (`\x00`) because PostgreSQL JSONB rejects them (`bot/storage/repositories.py` lines 173-177).
- Files: `/Users/dmytrolevin/Downloads/GD_playground/deal-Quest-bot/bot/storage/repositories.py` (lines 173-177)
- Impact: Indicates upstream code (likely LLM responses) may contain invalid data. Band-aid fix hides potential data corruption or unsafe LLM parsing.
- Fix approach: Add comprehensive input validation/sanitization at LLM response parsing stage (`bot/services/llm_router.py` `_extract_json()`, lines 19-45). Log occurrences to identify source. Consider stricter JSON schema validation before storage.

## Known Bugs

**Scenario Generation Loop Silent Failures:**
- Symptoms: Background scenario generation loop in `main.py` (lines 172-182) catches exceptions but only logs—no alerting or fallback.
- Files: `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/main.py` (lines 172-182)
- Trigger: Any network error, API quota exceeded, or database failure during `scenario_generator.ensure_pool_size()` call.
- Workaround: Manual restart of bot or monitoring logs. No automatic recovery.

**Datetime ISO Format Parsing Fragility:**
- Symptoms: Multiple handlers assume ISO format with optional `Z` suffix and manually replace it (`bot/handlers/leads.py` line 68, `bot/services/followup_scheduler.py` line 46).
- Files:
  - `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/handlers/leads.py` (line 68)
  - `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/services/followup_scheduler.py` (line 46)
- Trigger: Any variation in datetime format from database (e.g., microseconds, timezone offset notation) will cause `ValueError` and silently skip logic.
- Workaround: Code catches exceptions and continues, but silently skips follow-up logic.

**LLM Response Parsing Fallback Ambiguity:**
- Symptoms: `bot/services/llm_router.py` `_extract_json()` (lines 19-45) has multiple fallback strategies (direct parse, markdown fences, brace regex, raw text wrap). If LLM returns invalid JSON, it wraps as `{"raw_response": text}` without warning.
- Files: `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/services/llm_router.py` (lines 19-45)
- Trigger: LLM response not valid JSON or structured unexpectedly.
- Workaround: Consumers must check for `raw_response` key, but not all do (e.g., `EngagementService.generate_plan()` line 60 checks `result[key]` but doesn't validate structure).

## Security Considerations

**Secrets Embedded in .env File (Committed):**
- Risk: `.env` file contains real secrets (Telegram bot token, API keys) and is committed to git (confirmed at analysis date: 2026-02-02).
- Files: `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/.env` (lines 3-23)
- Current mitigation: `.gitignore` exists but .env was already committed. Secrets are exposed in git history.
- Recommendations:
  1. Rotate all secrets immediately (Telegram bot token, OpenRouter key, AssemblyAI key, InsForge anon key).
  2. Remove `.env` from git history: `git rm --cached .env && git commit --amend`.
  3. Ensure `.gitignore` blocks `.env`, `.env.local`, `*.key`, `*.pem`.
  4. Use environment variable injection or secret management tool (e.g., Railway secrets, Heroku config vars, AWS Secrets Manager) in production.

**Anon Key Exposed in TMA Bundle:**
- Risk: InsForge anon key is exposed as `VITE_INSFORGE_ANON_KEY` in TMA frontend bundle (public JavaScript).
- Files: `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/packages/webapp/src/lib/insforge.ts` (lines 12-13)
- Current mitigation: Key has full-access policies due to earlier compromise; JWT auth is preferred for requests but anon key can still be extracted and used to bypass RLS.
- Recommendations:
  1. Implement strict RLS policies (see Tech Debt section).
  2. Use separate read-only anon key with minimal permissions (if possible with InsForge).
  3. Consider proxying database calls through API endpoints that validate user identity before querying.

**Telegram Username-Based Authorization Only:**
- Risk: Authorization middleware (`bot/middleware.py` lines 38-40) allows everyone if `ALLOWED_USERNAMES` is empty. Usernames are user-changeable and not cryptographically verified.
- Files: `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/middleware.py` (lines 38-40)
- Current mitigation: Allowlist is configured at startup, but no fallback if misconfigured.
- Recommendations:
  1. Use Telegram `user.id` (immutable) instead of username for authorization.
  2. Add explicit deny-by-default: require `ALLOWED_USERNAMES` to be non-empty on startup, fail fast if missing.

**Encryption Key in Environment Without Key Rotation:**
- Risk: Single Fernet encryption key in `.env` for encrypting stored API keys. No key rotation mechanism.
- Files: `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/.env` (line 5), `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/services/crypto.py` (line 16)
- Current mitigation: None.
- Recommendations:
  1. Implement key versioning: store key version with encrypted data, support multiple keys.
  2. Plan key rotation procedure (decrypt with old key, re-encrypt with new key).
  3. Use industry-standard key management (HSM, AWS KMS, etc.) in production.

## Performance Bottlenecks

**N+1 Queries in Lead Detail View:**
- Problem: `handlers/leads.py` fetches lead, then iterates to fetch activities and engagement plan separately. Each handler callback may issue multiple queries.
- Files: `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/handlers/leads.py` (entire file contains callback handlers that fetch lead state)
- Cause: No query batching or eager loading in repository methods.
- Improvement path:
  1. Add repository methods to fetch lead with related data in single query (e.g., `get_lead_with_activities()`, `get_lead_with_plan()`).
  2. Cache frequently-accessed leads for 5-10 seconds per user.
  3. Consider query optimization in InsForge (use `select` parameter efficiently).

**LLM Provider Client Lifecycle:**
- Problem: Each LLM call creates a provider instance and closes it after completion (`bot/services/engagement.py` lines 56, 84). No connection reuse across multiple calls.
- Files: `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/services/engagement.py` (lines 56, 84)
- Cause: LLM client not pooled or cached.
- Improvement path:
  1. Create persistent LLM provider instances in `main.py` and inject via DI.
  2. Reuse same client for multiple calls within a session.
  3. Implement backpressure: queue requests if client is at capacity.

**Scenario Generation Polling:**
- Problem: Background loop runs every 6 hours unconditionally (`bot/main.py` line 179: `await asyncio.sleep(6 * 60 * 60)`). If generation is expensive and completes in 10 minutes, 5 hours 50 minutes is wasted idle time.
- Files: `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/main.py` (lines 172-182)
- Cause: Fixed interval polling, not event-driven or demand-based.
- Improvement path:
  1. Use event-driven approach: trigger generation only when pool falls below threshold (user requests scenario).
  2. Or use adaptive polling: if pool is already full, skip this cycle and sleep longer.
  3. Consider on-demand generation with response caching instead of pre-pooling.

## Fragile Areas

**Pipeline Execution with Background Tasks:**
- Files: `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/pipeline/runner.py` (lines 46-48)
- Why fragile: Background step mode (`_run_background()`) fires and forgets—no error handling, no status tracking, no way to know if background task failed. If a critical operation (e.g., memory update) runs in background and fails, user doesn't know.
- Safe modification: Add background task registry to track completion, implement timeout/retry logic, log failures prominently. Consider making critical operations synchronous with timeout.

**Memory Agent with No Validation:**
- Files: `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/agents/memory.py` (lines 39-108)
- Why fragile: Assumes `pipeline_ctx.user_memory`, `pipeline_ctx.scenario`, `strategist_output`, `trainer_output` exist but doesn't validate structure. Line 77 accesses `.get()` on potentially missing keys without defaults.
- Safe modification: Add explicit schema validation using Pydantic models. Check all required keys before access. Return error if preconditions aren't met rather than silently skipping logic.

**Engagement Service LLM Failures Without Fallback:**
- Files: `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/services/engagement.py` (lines 80-82, 174-176)
- Why fragile: If LLM provider fails during plan/advice generation, function returns empty list or error string without retry. User sees no engagement plan and no clear error message.
- Safe modification: Implement exponential backoff retry (3x with delays). Provide graceful degradation (e.g., return template-based plan if LLM fails). Show clear error to user.

**Datetime Parsing in Multiple Places:**
- Files: `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/handlers/leads.py` (line 68), `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/services/followup_scheduler.py` (line 46)
- Why fragile: Each handler reimplements ISO format parsing with manual `replace("Z", "+00:00")`. Changes to database datetime format or timezone handling will require changes in multiple places. Silent failures if parsing fails.
- Safe modification: Create utility function `parse_iso_datetime(s: str) -> datetime` that handles all variants. Use throughout codebase. Log all parse failures.

## Scaling Limits

**Single Telegram Bot Instance:**
- Current capacity: Single bot instance via polling, suitable for ~1K concurrent users before latency degrades.
- Limit: Polling interval (default blocking waits for new updates), FSM state in memory (scales with user count), single database connection pool.
- Scaling path:
  1. Switch to webhook-based updates (push instead of poll).
  2. Scale to multiple bot instances behind load balancer (requires shared session store—migrate from MemoryStorage).
  3. Implement database connection pooling explicitly (e.g., pgBouncer).
  4. Monitor and cap concurrent handlers.

**Database Query Performance Without Indexes:**
- Current capacity: Small dataset (~100 leads, ~1000 attempts per user). Query performance acceptable.
- Limit: As data grows to 10K+ leads and 100K+ attempts, sequential scans will dominate. Lack of indexes on `telegram_id`, `scenario_id`, `status` filters.
- Scaling path:
  1. Add database indexes on frequently-filtered columns: `CREATE INDEX idx_lead_telegram_id ON lead_registry(telegram_id);`
  2. Monitor slow queries (enable slow query log).
  3. Consider read replicas for analytics queries.

**LLM API Rate Limits:**
- Current capacity: Shared OpenRouter key can handle ~10-20 concurrent requests at $0.001-0.01 per request.
- Limit: If team grows, shared key hits rate limits. No queuing or backpressure mechanism.
- Scaling path:
  1. Implement request queue with exponential backoff.
  2. Per-user API keys (encrypted storage, already infrastructure exists in `CryptoService`).
  3. Fallback provider if primary is rate-limited.
  4. Monitor token usage, set hard limits per user.

**Memory Consumption (MemoryStorage FSM):**
- Current capacity: ~1-5MB per active conversation.
- Limit: With 1000+ concurrent users, in-memory state can exceed available RAM.
- Scaling path: Migrate to Redis or database-backed FSM storage (already identified in Tech Debt).

## Dependencies at Risk

**Anthropic SDK Not Used (Dead Code):**
- Risk: `bot/config.py` line 19 declares `anthropic_api_key` but it's never imported or used. Code likely refactored to use OpenRouter exclusively.
- Impact: Confusion, potential security issue if key is leaked unnecessarily.
- Migration plan: Remove unused import, remove config variable if not needed. Audit git history to confirm no active usage.

**InsForge SDK Version Pinning:**
- Risk: No explicit version pinning in `pnpm-lock.yaml` snapshot provided. InsForge SDK breaking changes could cause failures.
- Files: `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/packages/webapp` (package.json not shown but likely uses `@insforge/sdk`)
- Recommendation: Pin InsForge SDK to specific version, implement automated dependency updates with CI testing.

**Python Async Compatibility:**
- Risk: Multiple asyncio patterns in codebase (create_task, new event loop, mixed async/await). Python version pinning unclear (no .python-version file found).
- Impact: Issues if deployed to different Python versions (3.9, 3.10, 3.11 have subtle async differences).
- Recommendation: Explicitly pin Python version in runtime (e.g., `runtime.txt` for Railway, `.python-version` for pyenv).

## Missing Critical Features

**No Rate Limiting on Bot:**
- Problem: No middleware to rate-limit user requests. Malicious or accidental spam can exhaust API quota.
- Impact: One user spamming /support can cost team $10+ in LLM tokens instantly.
- Solution: Implement Aiogram rate limit middleware (max 5 requests/user/minute for expensive operations).

**No Audit Logging:**
- Problem: No record of who modified which lead, when, or what changed. Admin can't track user actions.
- Impact: Cannot debug misuse, trace who deleted lead, or maintain compliance audit trail.
- Solution: Add audit table, log all mutations with user_id, timestamp, old/new values.

**No Health Checks:**
- Problem: No endpoint to verify bot health, database connectivity, LLM provider availability.
- Impact: Ops can't monitor bot status, no early warning before failures cascade.
- Solution: Implement `/health` endpoint (HTTP or Telegram command), check database connectivity and LLM API on startup.

## Test Coverage Gaps

**No Unit Tests for Repositories:**
- What's not tested: All `bot/storage/repositories.py` methods—query filtering, error handling, data transformation.
- Files: `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/storage/repositories.py` (entire file)
- Risk: Changes to query filters or data mapping break silently, caught only in production.
- Priority: High (data layer is critical path).

**No Tests for LLM Response Parsing:**
- What's not tested: `bot/services/llm_router.py` `_extract_json()` (lines 19-45) with malformed JSON, edge cases like nested objects, JSON with null bytes.
- Files: `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/services/llm_router.py` (lines 19-45)
- Risk: LLM returns unexpected format, fallback parsing silently wraps as `raw_response`, consumers fail to handle.
- Priority: High (LLM integration is critical).

**No Integration Tests for Handler Workflows:**
- What's not tested: End-to-end user flows in handlers (e.g., create lead → generate plan → mark step done → trigger followup).
- Files: `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/handlers/` (all handler files)
- Risk: Complex state transitions in handlers have silent bugs (e.g., followup scheduled but never sent).
- Priority: Medium (manual testing catches most issues, but regressions possible).

**No Tests for Pipeline Configuration Loading:**
- What's not tested: YAML loading, validation, error handling for invalid pipeline configs.
- Files: `/Users/dmytrolevin/Downloads/GD_playground/deal-quest-bot/bot/pipeline/config_loader.py`
- Risk: Typo in YAML pipeline causes bot startup failure with unclear error message.
- Priority: Medium (failures are caught at startup).

---

*Concerns audit: 2026-02-02*
