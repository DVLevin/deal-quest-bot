-- Per-agent model configuration for admin overrides
-- Allows admin to assign specific OpenRouter models to individual agents
-- without code deploys. Changes take effect within 60 seconds via TTL cache.

CREATE TABLE IF NOT EXISTS agent_model_config (
    id SERIAL PRIMARY KEY,
    agent_name TEXT NOT NULL UNIQUE,
    model_id TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    set_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fast lookup by agent name (only active overrides)
CREATE INDEX IF NOT EXISTS idx_agent_model_config_agent
    ON agent_model_config(agent_name) WHERE is_active = true;
