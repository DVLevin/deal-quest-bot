-- Draft generation request queue (TMA -> Bot async message bus)
CREATE TABLE draft_requests (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT NOT NULL,
  step_id INT NOT NULL,
  telegram_id BIGINT NOT NULL,
  proof_url TEXT NOT NULL,
  lead_context JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient polling (bot checks for pending requests)
CREATE INDEX idx_draft_requests_pending ON draft_requests(status) WHERE status = 'pending';

-- Index for TMA polling (check completion by lead_id + step_id)
CREATE INDEX idx_draft_requests_lead_step ON draft_requests(lead_id, step_id, created_at DESC);
