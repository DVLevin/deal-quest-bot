# Phase 11: Performance & Reliability - Research

**Researched:** 2026-02-04
**Domain:** Production hardening (frontend bundle, Python async patterns, HTTP retry, query optimization)
**Confidence:** HIGH

## Summary

This phase covers five targeted production-reliability improvements spanning both the TMA (React/Vite) and the bot (Python/asyncio). Research involved reading every relevant source file to map current behavior and identify exact change points.

Key findings:
- **PERF-V11-01 (Eruda):** Eruda debug console is unconditionally loaded in production via a bare `import('eruda')` in `main.tsx`. Fix is a one-line `if (import.meta.env.DEV)` guard -- Vite statically replaces this with `false` in production builds, tree-shaking the entire import.
- **PERF-V11-02 (KB Caching):** Already implemented. `KnowledgeService` loads files once at startup via `knowledge.load()` in `main.py` and caches them as instance variables. The cached instance is passed through DI to all handlers. No code changes needed.
- **PERF-V11-03 (InsForge Retry):** The `InsForgeClient` uses raw `httpx.AsyncClient` with zero retry logic. Best approach: add a `_request_with_retry` helper method that wraps all HTTP calls with exponential backoff for transient status codes (429, 500, 502, 503). No external library needed -- simple async retry loop.
- **PERF-V11-04 (Background Tasks):** Found 4 `asyncio.create_task()` call sites in main.py, runner.py, and support.py that lack task references and error callbacks, risking garbage collection and silent failures. Fix: module-level `set()` for task references with `add_done_callback` for error logging.
- **PERF-V11-05 (TMA Queries):** Found 2 targeted queries using `select('*')` that match the requirement (lead detail, lead activities). Also found 6 additional `select('*')` queries in casebook, support session, user profile, scenario pool, and attempt result components.

**Primary recommendation:** All five items are straightforward changes with clear patterns. PERF-V11-02 is already done and needs only verification. The remaining four are small, targeted edits.

## Standard Stack

### Core (No New Dependencies Needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| httpx | >=0.27.0 | HTTP client (already in use) | Already the project's HTTP layer |
| asyncio | stdlib | Task management | Python standard library |
| Vite | 7.x | Build tooling with `import.meta.env.DEV` | Already the project's bundler |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled retry loop | `tenacity` library | tenacity adds a dependency for ~20 lines of retry code; not worth it for a single retry site |
| Hand-rolled retry loop | `httpx-retries` transport | Cleaner API but adds a dependency; the project only has one HTTP client to wrap |
| Hand-rolled retry loop | `stamina` library | Newer, opinionated -- overkill for one call site |

**Decision: No new dependencies.** The retry logic is simple enough (~20 lines) to implement directly. Adding `tenacity` or `httpx-retries` for a single HTTP client wrapper would be dependency bloat.

## Architecture Patterns

### Pattern 1: Vite DEV-Only Dynamic Import

**What:** Gate debug tools behind `import.meta.env.DEV` so Vite tree-shakes them from production builds.
**When to use:** Any dev-only code (debug consoles, logging, mock data).

```typescript
// Source: https://vite.dev/guide/env-and-mode
// Vite statically replaces import.meta.env.DEV with true/false at build time.
// In production, the entire block (including the dynamic import) is dead-code eliminated.
if (import.meta.env.DEV) {
  import('eruda').then((m) => m.default.init());
}
```

**Important:** Moving `eruda` from `dependencies` to `devDependencies` in `package.json` is good practice for signaling intent, but has NO effect on Vite's bundling behavior. Only the `import.meta.env.DEV` guard prevents inclusion in the production bundle.

### Pattern 2: Async Retry with Exponential Backoff

**What:** Wrap HTTP requests with retry logic for transient failures.
**When to use:** Any HTTP call to external services that may return 429/5xx.

```python
import asyncio
import logging
from httpx import HTTPStatusError

logger = logging.getLogger(__name__)

RETRYABLE_STATUS_CODES = {429, 500, 502, 503}
MAX_RETRIES = 3
BASE_DELAY = 0.5  # seconds

async def _request_with_retry(self, method: str, *args, **kwargs):
    """Execute an HTTP request with exponential backoff on transient failures."""
    client = await self._get_client()
    last_error = None

    for attempt in range(MAX_RETRIES + 1):
        try:
            resp = await getattr(client, method)(*args, **kwargs)
            resp.raise_for_status()
            return resp
        except HTTPStatusError as e:
            if e.response.status_code not in RETRYABLE_STATUS_CODES:
                raise  # Non-retryable error, propagate immediately
            last_error = e
            if attempt < MAX_RETRIES:
                delay = BASE_DELAY * (2 ** attempt)
                logger.warning(
                    "Retryable error %d on attempt %d/%d, retrying in %.1fs",
                    e.response.status_code, attempt + 1, MAX_RETRIES + 1, delay,
                )
                await asyncio.sleep(delay)
        except Exception:
            raise  # Connection errors etc. -- propagate immediately

    raise last_error  # All retries exhausted
```

### Pattern 3: Background Task Reference Management

**What:** Prevent asyncio tasks from being garbage-collected by maintaining strong references.
**When to use:** Any `asyncio.create_task()` for fire-and-forget work.

```python
# Source: https://docs.python.org/3/library/asyncio-task.html
# The event loop only keeps weak references to tasks.
# Save a reference to avoid garbage collection mid-execution.

_background_tasks: set[asyncio.Task] = set()

def _create_background_task(coro, *, name: str | None = None) -> asyncio.Task:
    """Create a background task with proper reference management and error logging."""
    task = asyncio.create_task(coro, name=name)
    _background_tasks.add(task)

    def _on_done(t: asyncio.Task) -> None:
        _background_tasks.discard(t)
        if t.cancelled():
            logger.debug("Background task %s was cancelled", t.get_name())
        elif exc := t.exception():
            logger.error("Background task %s failed: %s", t.get_name(), exc)

    task.add_done_callback(_on_done)
    return task
```

### Pattern 4: Explicit Column Selection in PostgREST Queries

**What:** Replace `select('*')` with explicit column lists to reduce payload size.
**When to use:** Any query where you know which columns are needed.

```typescript
// BAD: Fetches all columns including large text fields
const { data } = await insforge.database.from('lead_registry').select('*');

// GOOD: Only fetch the columns the component actually uses
const { data } = await insforge.database.from('lead_registry')
  .select('id, prospect_name, prospect_company, status, ...');
```

### Anti-Patterns to Avoid
- **Retrying non-idempotent operations blindly:** Only retry GET/read operations or idempotent writes. The InsForge client's `query()` is safe; `create()` and `update()` need careful consideration.
- **Retrying on 4xx errors:** Do NOT retry on 400, 401, 403, 404, 409 -- these indicate client errors that won't succeed on retry.
- **Using a global retry transport:** Wrapping ALL httpx requests in retry at the transport level would also retry intentional single-shot calls. Better to add retry at the method level where it makes sense.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Vite conditional builds | Custom webpack plugins | `import.meta.env.DEV` | Built into Vite, tree-shakes automatically |
| Task reference tracking | Global lists with manual cleanup | `set()` + `add_done_callback(set.discard)` | Official Python docs pattern, auto-cleans finished tasks |

## Common Pitfalls

### Pitfall 1: Eruda Still in Production Bundle Despite DEV Guard

**What goes wrong:** Developer adds the `if (import.meta.env.DEV)` guard but eruda still shows up in the production bundle.
**Why it happens:** Top-level static `import eruda from 'eruda'` instead of dynamic `import('eruda')`. Static imports cannot be tree-shaken even inside a dead code branch.
**How to avoid:** Always use dynamic `import()` for dev-only dependencies. The current code already uses dynamic import -- just needs the guard.
**Warning signs:** Check `dist/assets/` for eruda-related chunks after `vite build`.

### Pitfall 2: Retry Loop on Non-Idempotent Operations

**What goes wrong:** Retrying a POST/create that actually succeeded but returned a network error causes duplicate records.
**Why it happens:** The request succeeded server-side but the response was lost due to network issues.
**How to avoid:** For the InsForge client, `query()` (GET) is always safe to retry. `create()`, `update()`, and `upsert()` should also be retried since PostgREST operations are either idempotent (upsert) or will fail with a constraint violation if already created. The `delete()` is also idempotent.
**Warning signs:** Duplicate rows in the database after network flakiness.

### Pitfall 3: Retry Delay Too Aggressive for Rate Limits (429)

**What goes wrong:** Exponential backoff starting at 0.5s may not be long enough for 429 responses.
**Why it happens:** Rate limit windows are typically 1-60 seconds.
**How to avoid:** Check for `Retry-After` header on 429 responses and use that value if present, falling back to exponential backoff.
**Warning signs:** Repeated 429s in logs despite retry logic.

### Pitfall 4: Task Exception Swallowed Silently

**What goes wrong:** Background task raises an exception but nobody notices.
**Why it happens:** `asyncio.create_task()` without a callback means unhandled exceptions are only logged as warnings when the task is garbage-collected (if ever).
**How to avoid:** Always attach a `done_callback` that logs exceptions at ERROR level.
**Warning signs:** Features silently stop working with no error logs.

### Pitfall 5: Task Garbage Collected Before Completion

**What goes wrong:** Fire-and-forget task disappears mid-execution.
**Why it happens:** The event loop holds only a weak reference to tasks. If no strong reference exists, the GC can collect the task.
**How to avoid:** Store task reference in a module-level `set()`. Use `add_done_callback(tasks.discard)` to auto-clean finished tasks.
**Warning signs:** Sporadic failures that are hard to reproduce, tasks that "sometimes work."

## Code Examples

### Current State: Eruda in main.tsx (Line 7)

```typescript
// File: packages/webapp/src/main.tsx
// CURRENT: Loads in ALL builds including production
import('eruda').then((m) => m.default.init());

// FIX: Gate behind DEV check
if (import.meta.env.DEV) {
  import('eruda').then((m) => m.default.init());
}
```

### Current State: InsForge Client Has No Retry (insforge_client.py)

All 6 HTTP methods (`query`, `create`, `update`, `upsert`, `delete`, `rpc`) make a single request attempt. Error handling is try/except that logs and re-raises. Retry logic should be added as a private `_request_with_retry` method used by all public methods.

**Methods to add retry to:**
- `query()` -- line 86: `resp = await client.get(...)`
- `create()` -- line 104: `resp = await client.post(...)`
- `update()` -- line 139: `resp = await client.patch(...)`
- `upsert()` -- line 169: `resp = await client.post(...)`
- `delete()` -- line 196: `resp = await client.delete(...)`
- `rpc()` -- line 228: `resp = await client.post(...)` (uses separate client)
- `upload_file()` -- line 212: `resp = await client.post(...)` (uses separate client)

### Current State: Unprotected Background Tasks in main.py

```python
# File: bot/main.py

# LINE 180-182: Followup scheduler -- no task reference, no error callback
asyncio.create_task(
    start_followup_scheduler(bot, lead_repo, activity_repo)
)

# LINE 196: Scenario generation loop -- no task reference, no error callback
asyncio.create_task(_scenario_generation_loop())
```

### Current State: Unprotected Background Task in runner.py

```python
# File: bot/pipeline/runner.py, line 106
# Background agent step -- no task reference, no error callback
asyncio.create_task(_bg_task())
```

### Current State: Unprotected Background Task in support.py

```python
# File: bot/handlers/support.py, line 320
# Lead enrichment -- no task reference, no error callback
asyncio.create_task(
    _background_enrich_lead(...)
)
```

### Already-Protected Tasks (No Changes Needed)

```python
# bot/tracing/collector.py line 39 -- GOOD: stores reference in self._flush_task
self._flush_task = asyncio.create_task(self._flush_loop())

# bot/services/progress.py line 106 -- GOOD: stores reference in self._task
self._task = asyncio.create_task(self._loop())
```

### TMA Queries Using select('*') -- Targeted by PERF-V11-05

**Primary targets (per requirement: lead detail and attempt queries):**

1. **`useLead.ts`** (line 22): `select('*')` on `lead_registry` -- fetches 27 columns including large text fields (`web_research`, `original_context`, `prospect_analysis`, `closing_strategy`, `engagement_tactics`, `draft_response`)
   - Note: This is a detail view, so most columns ARE needed. But `web_research` and `original_context` may not be displayed and could be excluded.

2. **`useLeadActivities.ts`** (line 19): `select('*')` on `lead_activity_log` -- fetches 7 columns (`id, lead_id, telegram_id, activity_type, content, ai_response, created_at`)
   - All 7 columns are used in the UI. Could still list them explicitly for clarity and safety against future column additions.

**Additional select('*') queries (not in requirement scope but worth noting):**

3. **`useCasebook.ts`** (line 49): `select('*')` on `casebook` -- 16 columns
4. **`useCasebookEntry.ts`** (line 19): `select('*')` on `casebook` -- 16 columns (detail view)
5. **`useUserProfile.ts`** (line 22): `select('*')` on `users` -- includes `encrypted_api_key` (SENSITIVE)
6. **`useSupportSession.ts`** (line 22): `select('*')` on `support_sessions` -- 7 columns
7. **`LevelResults.tsx`** (line 49): `select('*')` on `attempts` -- 9 columns
8. **`ScoreResults.tsx`** (line 47): `select('*')` on `attempts` -- 9 columns
9. **`useScenarioPool.ts`** (line 47): `select('*')` on `generated_scenarios` -- 13 columns

**Notable concern:** `useUserProfile.ts` fetches `encrypted_api_key` via `select('*')` -- a field that should never be sent to the frontend. This is worth flagging even if out of scope for this requirement.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `httpx-retry` package | `httpx-retries` package | 2025-04 | httpx-retry deprecated, httpx-retries is successor |
| Manual task tracking | `asyncio.TaskGroup` (3.11+) | 2022 | Structured concurrency, but requires Python 3.11+ and doesn't fit fire-and-forget pattern |
| `import.meta.env.MODE` checks | `import.meta.env.DEV` / `PROD` booleans | Vite 2+ | Cleaner boolean checks |

## Open Questions

1. **Should retry apply to `rpc()` and `upload_file()`?**
   - These use separate `httpx.AsyncClient` instances (not the shared one), so the retry wrapper needs to handle both patterns.
   - Recommendation: Apply retry to `rpc()`. Skip `upload_file()` (large binary uploads shouldn't retry automatically -- could send partial data twice).

2. **Should the lead detail query remain `select('*')` since it IS a detail view?**
   - The detail view needs most columns, but `original_context` and `web_research` can be large text blobs.
   - Recommendation: List all columns explicitly, but include most of them. This is mainly about being explicit and preventing future column additions from bloating payloads.

3. **PERF-V11-02 -- Is this requirement already satisfied?**
   - Current code in `KnowledgeService` already caches at startup. The requirement description says "instead of re-reading from disk on every pipeline call" but the current code already does this correctly.
   - Recommendation: Mark as already implemented, add a verification step to confirm no other code paths re-read from disk.

## Detailed File Map

### PERF-V11-01: Eruda Removal

| File | Line | Change |
|------|------|--------|
| `packages/webapp/src/main.tsx` | 7 | Wrap `import('eruda')` in `if (import.meta.env.DEV)` |
| `packages/webapp/package.json` | 18 | Move `eruda` from `dependencies` to `devDependencies` (cosmetic) |

### PERF-V11-02: KB Caching (Already Done)

| File | Line | Status |
|------|------|--------|
| `bot/services/knowledge.py` | 1-53 | Already implements caching pattern correctly |
| `bot/main.py` | 83-84 | Already calls `knowledge.load()` once at startup |

### PERF-V11-03: InsForge Retry

| File | Line | Change |
|------|------|--------|
| `bot/storage/insforge_client.py` | new method | Add `_request_with_retry()` private method |
| `bot/storage/insforge_client.py` | 86, 104, 139, 169, 196, 228 | Route HTTP calls through retry method |

### PERF-V11-04: Background Task Error Handling

| File | Line | Change |
|------|------|--------|
| `bot/main.py` | 180-182, 196 | Replace bare `asyncio.create_task()` with safe wrapper |
| `bot/pipeline/runner.py` | 106 | Replace bare `asyncio.create_task()` with safe wrapper |
| `bot/handlers/support.py` | 320 | Replace bare `asyncio.create_task()` with safe wrapper |

### PERF-V11-05: TMA Query Optimization

| File | Line | Change |
|------|------|--------|
| `packages/webapp/src/features/leads/hooks/useLead.ts` | 22 | Replace `select('*')` with explicit columns |
| `packages/webapp/src/features/leads/hooks/useLeadActivities.ts` | 19 | Replace `select('*')` with explicit columns |

## Sources

### Primary (HIGH confidence)
- Direct source file reading of all files listed in the file map
- Python asyncio docs: https://docs.python.org/3/library/asyncio-task.html (background task reference pattern)
- Vite env docs: https://vite.dev/guide/env-and-mode (import.meta.env.DEV behavior)

### Secondary (MEDIUM confidence)
- httpx-retries docs: https://will-ockmore.github.io/httpx-retries/ (retry transport API)
- ScrapeOps httpx retry guide: https://scrapeops.io/python-web-scraping-playbook/python-httpx-retry-failed-requests/
- Python discussions on task GC: https://discuss.python.org/t/whats-up-with-garbage-collected-asyncio-task-objects/29686

### Tertiary (LOW confidence)
- None -- all findings verified against source code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all changes to existing code
- Architecture: HIGH -- patterns verified against official Python/Vite docs
- Pitfalls: HIGH -- common async/bundler pitfalls, well-documented
- File mapping: HIGH -- every file and line number verified by reading source

**Research date:** 2026-02-04
**Valid until:** 2026-03-04 (stable patterns, no fast-moving dependencies)
