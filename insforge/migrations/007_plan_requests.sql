-- Plan generation requests: async message bus for TMA -> Bot engagement plan generation
-- Mirrors the draft_requests pattern but simpler (no step_id, proof_url, lead_context)

CREATE TABLE plan_requests (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT NOT NULL,
  telegram_id BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partial index for efficient polling of pending requests
CREATE INDEX idx_plan_requests_pending ON plan_requests(status) WHERE status = 'pending';

-- Index for TMA polling by lead_id (newest first)
CREATE INDEX idx_plan_requests_lead ON plan_requests(lead_id, created_at DESC);
