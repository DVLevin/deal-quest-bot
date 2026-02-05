-- Scheduled Reminders — Storage for per-step engagement plan reminders
-- Execute via InsForge dashboard SQL editor

-- Scheduled Reminders — one row per engagement step to be reminded
CREATE TABLE IF NOT EXISTS scheduled_reminders (
    id              SERIAL PRIMARY KEY,
    lead_id         INTEGER NOT NULL,
    telegram_id     BIGINT NOT NULL,
    step_id         INTEGER NOT NULL,
    due_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',
    snooze_count    INTEGER NOT NULL DEFAULT 0,
    reminder_count  INTEGER NOT NULL DEFAULT 0,
    last_reminded_at TIMESTAMP WITH TIME ZONE,
    draft_text      TEXT,
    completed_at    TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common query patterns

-- Polling index (partial, the hot path for due reminders)
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_due
    ON scheduled_reminders (due_at)
    WHERE status IN ('pending', 'sent');

-- Lead lookup: find all reminders for a lead + specific step
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_lead
    ON scheduled_reminders (lead_id, step_id);

-- Telegram user lookup: find reminders by user and status
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_telegram
    ON scheduled_reminders (telegram_id, status);

-- Enable RLS (InsForge requirement)
ALTER TABLE scheduled_reminders ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (bot uses service role key)
CREATE POLICY scheduled_reminders_service_all
    ON scheduled_reminders FOR ALL
    USING (true) WITH CHECK (true);

-- TMA authenticated users can read their own reminders
CREATE POLICY scheduled_reminders_auth_select
    ON scheduled_reminders FOR SELECT
    TO authenticated
    USING (telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint);

-- TMA authenticated users can update their own reminders (snooze, complete)
CREATE POLICY scheduled_reminders_auth_update
    ON scheduled_reminders FOR UPDATE
    TO authenticated
    USING (telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    WITH CHECK (telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint);

-- Grant sequence usage to anon role (required for SERIAL auto-increment via PostgREST)
GRANT USAGE, SELECT ON SEQUENCE scheduled_reminders_id_seq TO anon;
GRANT ALL ON TABLE scheduled_reminders TO anon;
