-- TMA event bus (TMA -> Bot real-time event communication)
CREATE TABLE IF NOT EXISTS tma_events (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  event_type TEXT NOT NULL,          -- step_completed, step_skipped, status_changed, lead_assigned
  lead_id BIGINT,
  payload JSONB DEFAULT '{}',        -- flexible payload per event type
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'delivered', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

-- Index for poller: find pending events efficiently
CREATE INDEX IF NOT EXISTS idx_tma_events_pending
  ON tma_events (status, created_at ASC)
  WHERE status = 'pending';

-- Index for cleanup: find old delivered events
CREATE INDEX IF NOT EXISTS idx_tma_events_delivered
  ON tma_events (delivered_at)
  WHERE status = 'delivered';

-- RLS: TMA uses anon key, needs insert + select
ALTER TABLE tma_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY anon_full_tma_events ON tma_events FOR ALL USING (true) WITH CHECK (true);
