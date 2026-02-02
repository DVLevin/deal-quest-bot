# Codebase Concerns

**Analysis Date:** 2026-02-02

## Tech Debt

**RLS Security Compromise (Bot authentication):**
- Issue: Python bot uses anon key server-side, requiring full-access RLS policies for anon role
- Files: `deal-quest-bot/migrations/001_enable_rls_and_policies.sql` (lines 25-37), `deal-quest-bot/functions/verify-telegram/index.ts` (lines 1-4), `deal-quest-bot/bot/storage/insforge_client.py`
- Impact: Anon key exposed in TMA JavaScript bundle has full database access. Anyone can query/modify all user data by inspecting the anon key in the client bundle and bypassing RLS.
- Fix approach: Migrate Python bot to service role key (bypasses RLS), then remove anon full-access policies. Add proper RLS policies scoped to authenticated role only. Bot should authenticate as service, not as anon.

**PKCE not implemented (InsForge auth):**
- Issue: Auth broadcast service marked with TODO indicating PKCE needs to be implemented in future
- Files: `insforge/insforge/auth/src/lib/broadcastService.ts` (line 1)
- Impact: OAuth flow lacks PKCE protection against authorization code interception attacks
- Fix approach: Implement PKCE (Proof Key for Code Exchange) in OAuth flows per RFC 7636

**Hardcoded S3 configuration (InsForge backend):**
- Issue: S3 bucket and region are hardcoded with TODO to make configurable
- Files: `insforge/insforge/backend/src/utils/s3-config-loader.ts` (lines 4-6)
- Impact: Cannot change storage configuration without code changes. Limits multi-tenancy and cloud deployment flexibility.
- Fix approach: Move CONFIG_BUCKET and CONFIG_REGION to environment variables. Update cloud deployment configs to set these.

**Complex component marked for cleanup (InsForge):**
- Issue: RecordFormField component flagged as "a mess" needing cleanup
- Files: `insforge/insforge/frontend/src/features/database/components/RecordFormField.tsx` (line 387)
- Impact: Large component (387+ lines) with complex conditional rendering. Hard to maintain, test, and extend with new field types.
- Fix approach: Split into separate components per field type (BooleanField, TextFieldInput, DateFieldInput). Extract field type inference logic to helper.

**Large handler files (bot):**
- Issue: Several handler files exceed 600+ lines, indicating high complexity
- Files: `deal-quest-bot/bot/handlers/leads.py` (1068 lines), `deal-quest-bot/bot/handlers/support.py` (871 lines), `deal-quest-bot/bot/handlers/admin.py` (819 lines), `deal-quest-bot/bot/handlers/train.py` (615 lines), `deal-quest-bot/bot/storage/repositories.py` (635 lines)
- Impact: Difficult to navigate, test, and modify. Handlers mix business logic with UI concerns.
- Fix approach: Extract business logic to services. Split large handlers into smaller focused modules (e.g. leads.py → lead_view.py, lead_engagement.py, lead_management.py).

**Error swallowing with empty returns:**
- Issue: Many exception handlers return empty collections ([]) instead of propagating errors
- Files: `deal-quest-bot/bot/storage/repositories.py` (lines 144, 191, 202, 213, 224, 251, 373, 383, 427, 436, 498, 509, 526, 547, 625, 635), `deal-quest-bot/bot/services/engagement.py` (lines 75, 79, 82), `deal-quest-bot/bot/services/scenario_generator.py` (lines 42, 87, 108), `deal-quest-bot/bot/config.py` (lines 39, 46)
- Impact: Silent failures make debugging difficult. Database errors are hidden from users and logs. Operations may appear successful when they actually failed.
- Fix approach: Add proper error logging before returning empty collections. Consider raising exceptions for critical operations. Add telemetry for failure rates.

**Silent exception handling with pass:**
- Issue: Multiple try-except blocks with pass statements that ignore errors completely
- Files: `deal-quest-bot/bot/services/engagement.py` (line 74), `deal-quest-bot/bot/services/progress.py` (line 120), `deal-quest-bot/bot/tracing/context.py` (line 45), `deal-quest-bot/bot/services/followup_scheduler.py` (line 56), `deal-quest-bot/bot/services/llm_router.py` (lines 28, 36, 44), `deal-quest-bot/bot/handlers/settings.py` (line 142), `deal-quest-bot/bot/handlers/learn.py` (line 397), `deal-quest-bot/bot/handlers/start.py` (line 264), `deal-quest-bot/bot/handlers/leads.py` (lines 72, 184)
- Impact: Exceptions are completely silenced without logging. No way to detect or debug failures in production.
- Fix approach: Replace pass with logger.warning() or logger.error() at minimum. Evaluate if exceptions should propagate for critical operations.

## Known Bugs

**Auth validation warnings (TMA webapp):**
- Symptoms: useAuth logs "Validation query threw" warnings but proceeds anyway
- Files: `deal-quest-bot/packages/webapp/src/features/auth/useAuth.ts` (lines 79-88)
- Trigger: JWT validation query fails after Edge Function succeeds
- Workaround: Edge Function success is trusted, validation errors are logged but ignored. RLS validation happens on actual data queries.

**Date parsing fragility (leads handler):**
- Symptoms: try-except around datetime parsing with silent failure
- Files: `deal-quest-bot/bot/handlers/leads.py` (lines 67-72)
- Trigger: Invalid ISO format in next_followup field or timezone issues
- Workaround: Exception caught, attention indicator not shown. Follow-up may appear non-urgent when parsing fails.

## Security Considerations

**Anon key full database access (CRITICAL):**
- Risk: TMA JavaScript bundle exposes anon key with full RLS access. Client-side code can be inspected to extract key and bypass all security.
- Files: `deal-quest-bot/migrations/001_enable_rls_and_policies.sql`, `deal-quest-bot/functions/verify-telegram/index.ts`, `deal-quest-bot/packages/webapp/src/lib/insforge.ts`
- Current mitigation: None. This is a known security compromise pending bot migration.
- Recommendations: URGENT - Migrate bot to service role key. Remove all anon_full_* policies. Lock down anon key to read-only public data only.

**.env file committed:**
- Risk: Active .env file exists in repository (per ls output showing .env file)
- Files: `deal-quest-bot/.env` (894 bytes, modified Feb 1)
- Current mitigation: .env is in .gitignore, but file exists locally and may have been committed in past or could be accidentally committed
- Recommendations: Verify .env is not in git history. Run `git rm --cached .env` if needed. Consider using secret scanning tools.

**API keys stored encrypted in database:**
- Risk: User API keys stored in database using Fernet symmetric encryption
- Files: `deal-quest-bot/bot/services/crypto.py`, `deal-quest-bot/bot/storage/models.py`
- Current mitigation: Fernet encryption with ENCRYPTION_KEY from environment. Keys are encrypted at rest.
- Recommendations: Rotate encryption key periodically. Consider using database-level encryption or KMS for key storage. Add audit logging for key access.

**Broad exception catching:**
- Risk: Generic except blocks may catch and hide security-relevant exceptions
- Files: `deal-quest-bot/bot/services/crypto.py` (line 24), `deal-quest-bot/bot/storage/insforge_client.py`, across handlers
- Current mitigation: Some error logging exists
- Recommendations: Narrow exception types. Distinguish between recoverable errors and security violations. Add security event logging.

**No rate limiting detected:**
- Risk: No evidence of rate limiting on bot commands or API endpoints
- Files: `deal-quest-bot/bot/main.py`, handler files
- Current mitigation: USERNAME_WHITELIST provides basic access control
- Recommendations: Add rate limiting per user. Implement backoff for LLM API calls. Add DDoS protection at deployment level.

## Performance Bottlenecks

**Context stuffing in LLM calls:**
- Problem: Full playbook + company knowledge loaded into every LLM prompt (~70K tokens per CLAUDE.md)
- Files: `deal-quest-bot/bot/services/knowledge.py`, `deal-quest-bot/data/playbook.md` (17KB), `deal-quest-bot/data/company_knowledge.md` (50KB)
- Cause: No RAG or semantic chunking. Entire knowledge base sent with every request.
- Improvement path: Implement semantic search over knowledge base. Use embeddings to retrieve relevant sections only. Cache knowledge embeddings. Consider context compression techniques.

**No database query optimization:**
- Problem: Repository pattern uses simple query/filter without indexing guidance
- Files: `deal-quest-bot/bot/storage/repositories.py`, `deal-quest-bot/bot/storage/insforge_client.py`
- Cause: No EXPLAIN analysis, no index hints, no query planning
- Improvement path: Add database indexes for telegram_id, created_at, status fields. Analyze slow query logs. Add query result caching for frequently accessed data.

**Synchronous LLM retries:**
- Problem: LLM calls retry with fixed delays (1s, 3s, 8s), blocking user interaction
- Files: `deal-quest-bot/bot/services/llm_router.py` (lines 17-18)
- Cause: Sequential retry logic with asyncio.sleep blocking event loop
- Improvement path: Implement exponential backoff with jitter. Move retries to background task. Show progress indicator during retries.

**Large scenario data file:**
- Problem: scenarios.json is 41KB and loaded into memory
- Files: `deal-quest-bot/data/scenarios.json` (41KB)
- Cause: All training scenarios stored in single JSON file
- Improvement path: Move scenarios to database. Paginate scenario loading. Cache parsed scenarios.

## Fragile Areas

**Telegram initData signature validation:**
- Files: `deal-quest-bot/functions/verify-telegram/index.ts` (lines 38-98)
- Why fragile: Complex HMAC-SHA256 validation logic with manual crypto operations. String encoding and sorting must match Telegram's exact algorithm.
- Safe modification: Do NOT change signature validation logic. Test any auth changes against multiple Telegram clients. Add integration tests with real initData samples.
- Test coverage: No unit tests for signature validation found

**TraceContext ContextVar propagation:**
- Files: `deal-quest-bot/bot/tracing/context.py` (lines 16-18)
- Why fragile: Uses ContextVar for async trace ID propagation. Breaking changes may cause spans to lose parent trace ID.
- Safe modification: Always test nested span creation. Verify trace_id propagates through asyncio task boundaries. Check span_stack depth limits.
- Test coverage: No unit tests for context propagation

**FSM state management:**
- Files: `deal-quest-bot/bot/states.py`, handler files using FSMContext
- Why fragile: aiogram FSM state stored in memory, lost on bot restart. Complex multi-step flows (leads, support, learn) depend on state persistence.
- Safe modification: Test state transitions thoroughly. Handle missing state gracefully. Consider adding state recovery on restart.
- Test coverage: No state machine tests detected

**InsForge client HTTP layer:**
- Files: `deal-quest-bot/bot/storage/insforge_client.py`
- Why fragile: Custom PostgREST filter operator handling (lines 14-74). String manipulation for query params. httpx client lifecycle management.
- Safe modification: Test filter operators thoroughly. Verify operator precedence. Check query param encoding for special characters. Validate single vs. list response handling.
- Test coverage: No integration tests for repository layer

**Session resilience (TMA):**
- Files: `deal-quest-bot/packages/webapp/src/shared/hooks/useSessionResilience.ts`
- Why fragile: Relies on miniApp.isActive signal and sessionStorage. May not work in all Telegram clients or WebViews.
- Safe modification: Test on iOS, Android, and Desktop Telegram clients. Handle sessionStorage quota exceeded. Verify cleanup on navigation.
- Test coverage: No tests for session restore

## Scaling Limits

**In-memory httpx client pooling:**
- Current capacity: Single httpx.AsyncClient per InsForgeClient instance
- Limit: Connection pool exhaustion under high load. No connection limit configured.
- Scaling path: Configure connection limits (max_connections, max_keepalive_connections). Use connection pooling. Consider httpx client singleton.

**Synchronous tracing writes:**
- Current capacity: TraceCollector batch size 10, flush timeout 10s
- Limit: Trace writes block at batch size. High-throughput pipelines may cause trace buffer overflow.
- Scaling path: Increase batch size. Use async queue with backpressure. Send traces to time-series DB instead of PostgreSQL.

**Single-process bot deployment:**
- Current capacity: One Railway instance running bot polling
- Limit: Single point of failure. No horizontal scaling. Webhook mode not configured.
- Scaling path: Switch to webhook mode. Deploy behind load balancer. Use webhook-based architecture for multi-instance deployment.

**Knowledge base file loading:**
- Current capacity: 67KB knowledge files loaded on every LLM call
- Limit: Disk I/O and memory overhead scale linearly with request volume
- Scaling path: Cache parsed knowledge in memory. Use shared cache (Redis). Implement knowledge versioning to invalidate cache.

## Dependencies at Risk

**aiogram 3.x still evolving:**
- Risk: aiogram 3.x API may have breaking changes in minor versions
- Impact: Bot may break on dependency updates. FSM API changes could require refactoring.
- Migration plan: Pin aiogram to exact version. Test updates in staging. Monitor aiogram GitHub for breaking changes.

**InsForge self-hosted dependency:**
- Risk: InsForge is a custom Supabase alternative, not widely adopted
- Impact: Limited community support. May have undiscovered bugs. Future maintenance uncertain.
- Migration plan: Document InsForge API contract. Abstract database layer behind interfaces. Consider migration path to Supabase or standard PostgreSQL + PostgREST.

**@telegram-apps/sdk-react early version:**
- Risk: Telegram Mini App SDK is relatively new and may have breaking changes
- Impact: TMA may break with SDK updates. New Telegram features may require API changes.
- Migration plan: Pin SDK version. Test updates in isolated environment. Follow Telegram Mini App changelog closely.

## Missing Critical Features

**No test suite:**
- Problem: Zero unit tests, integration tests, or E2E tests found in bot or webapp
- Blocks: Confident refactoring, regression detection, safe dependency updates
- Priority: High - Add at least smoke tests for critical flows (auth, database writes, LLM calls)

**No monitoring/alerting:**
- Problem: No error tracking service (Sentry), no metrics, no uptime monitoring
- Blocks: Production issue detection, performance analysis, SLA compliance
- Priority: High - Add error tracking and basic metrics before production launch

**No CI/CD pipeline:**
- Problem: No GitHub Actions, no automated tests, no deployment automation
- Blocks: Safe deployments, quality gates, automated rollbacks
- Priority: Medium - Manual Railway deployments work but are error-prone

**No structured logging:**
- Problem: Basic Python logging with no correlation IDs, no structured JSON, no log aggregation
- Blocks: Debugging production issues, log analysis, user session tracking
- Priority: Medium - Add structured logging with trace IDs

**No backup strategy:**
- Problem: No documented database backup/restore procedure
- Blocks: Disaster recovery, data loss prevention, compliance
- Priority: High - Document InsForge backup process and test restore

## Test Coverage Gaps

**Auth flows (webapp):**
- What's not tested: Telegram initData signature validation, JWT minting, RLS policy enforcement
- Files: `deal-quest-bot/functions/verify-telegram/index.ts`, `deal-quest-bot/packages/webapp/src/features/auth/useAuth.ts`
- Risk: Security vulnerabilities in auth may go undetected. HMAC validation bugs could allow auth bypass.
- Priority: High - Security-critical code path

**Database operations (bot):**
- What's not tested: Repository CRUD operations, filter operator handling, error recovery
- Files: `deal-quest-bot/bot/storage/repositories.py`, `deal-quest-bot/bot/storage/insforge_client.py`
- Risk: Data corruption, silent failures, query injection via filter params
- Priority: High - Data integrity critical

**LLM integration (bot):**
- What's not tested: OpenRouter fallback, Claude API errors, retry logic, JSON extraction
- Files: `deal-quest-bot/bot/services/llm_router.py`
- Risk: User-facing errors, incorrect scoring, failed prompts
- Priority: Medium - Can be caught in staging but impacts UX

**Pipeline execution (bot):**
- What's not tested: Sequential/parallel step execution, error propagation, context passing
- Files: `deal-quest-bot/bot/pipeline/runner.py`, `deal-quest-bot/bot/pipeline/context.py`
- Risk: Pipeline hangs, incorrect agent chaining, lost context
- Priority: Medium - Core bot functionality

**Tracing system (bot):**
- What's not tested: ContextVar propagation, span nesting, batch flushing, trace storage
- Files: `deal-quest-bot/bot/tracing/context.py`, `deal-quest-bot/bot/tracing/collector.py`
- Risk: Lost traces, incorrect timing, memory leaks from unbounded span stacks
- Priority: Low - Observability not critical for MVP

---

*Concerns audit: 2026-02-02*
