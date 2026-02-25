-- Lead Analysis History — Storage for versioned analysis snapshots
-- Execute via InsForge dashboard SQL editor

-- Lead Analysis History — stores snapshots of lead analysis for version history
CREATE TABLE IF NOT EXISTS lead_analysis_history (
    id                      SERIAL PRIMARY KEY,
    lead_id                 INTEGER NOT NULL,
    telegram_id             BIGINT NOT NULL,
    version_number          INTEGER NOT NULL DEFAULT 1,
    analysis_snapshot       JSONB NOT NULL,
    changes_summary         TEXT,
    field_diff              JSONB,
    triggered_by            TEXT NOT NULL DEFAULT 'initial',
    triggering_activity_id  INTEGER,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common query patterns

-- Version lookup: fetch versions for a lead, newest first
CREATE INDEX IF NOT EXISTS idx_lead_analysis_history_lead
    ON lead_analysis_history (lead_id, version_number DESC);

-- User lookup: find all history for a telegram user
CREATE INDEX IF NOT EXISTS idx_lead_analysis_history_telegram
    ON lead_analysis_history (telegram_id);

-- Enable RLS (InsForge requirement)
ALTER TABLE lead_analysis_history ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (bot uses service role key)
CREATE POLICY lead_analysis_history_service_all
    ON lead_analysis_history FOR ALL
    USING (true) WITH CHECK (true);

-- TMA authenticated users can read their own history
CREATE POLICY lead_analysis_history_auth_select
    ON lead_analysis_history FOR SELECT
    TO authenticated
    USING (telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint);

-- Grant sequence usage to anon role (required for SERIAL auto-increment via PostgREST)
GRANT USAGE, SELECT ON SEQUENCE lead_analysis_history_id_seq TO anon;
GRANT ALL ON TABLE lead_analysis_history TO anon;
