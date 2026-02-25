---
phase: 03-agent-infrastructure
plan: 02
subsystem: conversation-history
tags: [pydantic, asyncio, deque, sliding-window, persistence, insforge, main-wiring]

# Dependency graph
requires:
  - phase: 03-01
    provides: load_agents_config(), agents.yaml, ToolUseAgent base class
  - phase: 01-observability
    provides: InsForgeClient, TraceRepo, repository pattern
provides:
  - migrations/002_conversation_history.sql with conversation_history table and index
  - bot/storage/models.py with ConversationTurnModel
  - bot/storage/repositories.py with ConversationHistoryRepo (get_recent, save_turns)
  - bot/services/conversation_history.py with ConversationHistoryService + ConversationTurn
  - bot/main.py updated with agents_config, history_service lifecycle, workflow_data injection
affects:
  - 04-deal-agent (history_service in workflow_data, ready for DealAgent to read/write turns)
  - 05-orchestrator (agents_config in workflow_data, orchestrator can instantiate agents from it)
  - 06-coach-strategy (history_service available for context injection)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hybrid persistence: in-memory deque for speed, background flush every 30s to InsForge for durability"
    - "Lazy DB loading: ensure_loaded() on first access per user, subsequent calls are no-ops"
    - "Delete-then-insert flush: replaces entire window per user — simple and safe for small windows"
    - "Session detection: timestamp diff against configurable timeout (4hr default)"
    - "Service lifecycle: start() before polling, stop() in finally block before insforge.close()"

key-files:
  created:
    - migrations/002_conversation_history.sql
    - bot/services/conversation_history.py
  modified:
    - bot/storage/models.py
    - bot/storage/repositories.py
    - bot/main.py

key-decisions:
  - "ConversationTurn (in-memory) is separate from ConversationTurnModel (DB) — explicit conversion layer via _turn_to_model / _model_to_turn"
  - "Delete-then-insert flush strategy — avoids complex diffing; window is small (max 20 turns)"
  - "ensure_loaded() is async, get_messages() is synchronous — caller must await ensure_loaded first"
  - "history_service.stop() must precede insforge.close() in finally block — flush needs HTTP client open"

patterns-established:
  - "ConversationHistoryService.ensure_loaded(user_id) then .get_messages(user_id) pattern for handlers"
  - "append_turn(user_id, ConversationTurn(...)) to record each user/assistant exchange"
  - "detect_new_session(user_id) before loading to decide whether to clear history"

requirements-completed:
  - NLR-03

# Metrics
duration: 3min
completed: 2026-02-25
---

# Phase 3 Plan 02: Conversation History Service Summary

**Conversation history persistence with hybrid in-memory deque + background InsForge flush, sliding 20-turn window, lazy DB loading on first access, and full Phase 3 DI wiring in main.py**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-25T20:45:24Z
- **Completed:** 2026-02-25T20:47:59Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created `migrations/002_conversation_history.sql` — conversation_history table with BIGSERIAL PK, telegram_id, role, content, tool_calls (JSONB), tool_call_id, timestamp, and index on (telegram_id, timestamp DESC)
- Added `ConversationTurnModel` Pydantic model to `bot/storage/models.py` — handles user, assistant, and tool roles including tool_calls and tool_call_id fields
- Added `ConversationHistoryRepo` to `bot/storage/repositories.py` — get_recent() returns chronological order via reversed(desc query), save_turns() uses delete-then-insert for simplicity
- Created `bot/services/conversation_history.py` with `ConversationTurn` (in-memory model) and `ConversationHistoryService` — sliding window deque, background flush loop, lazy DB loading, session timeout detection, and clear_session/get_last_assistant_message helpers
- Updated `bot/main.py` — load_agents_config() at startup, ConversationHistoryService initialized and started/stopped in lifecycle order (history.stop → collector.stop → insforge.close), agents_config and history_service injected into workflow_data

## Task Commits

Each task was committed atomically:

1. **Task 1: Create conversation history table, model, and repository** — `4e21053` (feat)
2. **Task 2: Create ConversationHistoryService and wire Phase 3 into main.py** — `8cf5d23` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `migrations/002_conversation_history.sql` — Table DDL + index (manual apply to InsForge)
- `bot/storage/models.py` — Added ConversationTurnModel after PipelineSpanModel
- `bot/storage/repositories.py` — Added ConversationHistoryRepo at end, ConversationTurnModel import
- `bot/services/conversation_history.py` — New file: ConversationTurn, ConversationHistoryService, conversion helpers
- `bot/main.py` — Added imports, ConversationHistoryRepo init, agents_config load, history_service lifecycle, workflow_data entries

## Decisions Made

- `ConversationTurn` (in-memory) vs `ConversationTurnModel` (DB) are intentionally separate models — explicit conversion layer keeps service layer decoupled from storage layer
- Delete-then-insert flush strategy chosen for simplicity — the window is small (max 20 turns) so this is efficient vs diffing
- `ensure_loaded()` is async while `get_messages()` is synchronous — callers must await ensure_loaded first, but get_messages is cheap to call repeatedly during a request
- `history_service.stop()` must run before `insforge.close()` in the finally block — the final flush requires the HTTP client to be open

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Apply the migration to InsForge database manually:

```sql
-- Run via InsForge Dashboard SQL editor or mcp__insforge__run-raw-sql
-- File: migrations/002_conversation_history.sql
CREATE TABLE conversation_history (
    id          BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    role        TEXT NOT NULL,
    content     TEXT NOT NULL DEFAULT '',
    tool_calls  JSONB,
    tool_call_id TEXT,
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_conv_history_user_ts ON conversation_history(telegram_id, timestamp DESC);
```

## Next Phase Readiness

- Phase 4 DealAgent handlers can call `await history_service.ensure_loaded(user_id)` then `history_service.get_messages(user_id)` to inject conversation context into LLM calls
- `append_turn(user_id, ConversationTurn(...))` records each exchange
- `agents_config` in workflow_data gives Phase 4+ handlers access to per-agent config (model, temperature, max_tokens, tools)
- `detect_new_session()` available for session management before routing

## Self-Check: PASSED

- FOUND: migrations/002_conversation_history.sql
- FOUND: bot/services/conversation_history.py
- FOUND: bot/storage/models.py (contains ConversationTurnModel)
- FOUND: bot/storage/repositories.py (contains ConversationHistoryRepo)
- FOUND: bot/main.py (contains history_service, agents_config, load_agents_config)
- FOUND commit: 4e21053 (Task 1)
- FOUND commit: 8cf5d23 (Task 2)
- ConversationHistoryService passes all unit checks (append, window eviction, session detection)
- main.py valid Python syntax
- Integration import check PASSED (all 7 verification tests)

---
*Phase: 03-agent-infrastructure*
*Completed: 2026-02-25*
