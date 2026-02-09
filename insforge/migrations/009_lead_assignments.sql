-- Lead Assignments — Multi-user assignment for collaborative lead management
-- Execute via InsForge dashboard SQL editor

CREATE TABLE IF NOT EXISTS lead_assignments (
    id              SERIAL PRIMARY KEY,
    lead_id         INTEGER NOT NULL,
    telegram_id     BIGINT NOT NULL,
    assigned_by     BIGINT NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lead_id, telegram_id)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_lead_assignments_lead
    ON lead_assignments (lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_assignments_user
    ON lead_assignments (telegram_id);

-- Enable RLS (InsForge requirement)
ALTER TABLE lead_assignments ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (bot uses service role key)
CREATE POLICY lead_assignments_service_all
    ON lead_assignments FOR ALL
    USING (true) WITH CHECK (true);

-- Grant sequence usage to anon role (required for SERIAL auto-increment via PostgREST)
GRANT USAGE, SELECT ON SEQUENCE lead_assignments_id_seq TO anon;
GRANT ALL ON TABLE lead_assignments TO anon;
