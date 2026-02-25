-- Conversation history for per-user sliding window persistence
-- Used by ConversationHistoryService for hybrid in-memory + DB durability
--
-- Execute via InsForge Dashboard SQL editor or mcp__insforge__run-raw-sql
-- No FK constraints — InsForge PostgREST has issues with FK ordering (Phase 1 decision)

CREATE TABLE conversation_history (
    id          BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    role        TEXT NOT NULL,              -- user | assistant | tool
    content     TEXT NOT NULL DEFAULT '',
    tool_calls  JSONB,                      -- assistant tool_calls array (for role=assistant)
    tool_call_id TEXT,                      -- for role=tool messages
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Primary query pattern: get last N turns for a user, ordered by time
CREATE INDEX idx_conv_history_user_ts ON conversation_history(telegram_id, timestamp DESC);
