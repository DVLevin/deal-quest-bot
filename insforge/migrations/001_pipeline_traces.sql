-- Pipeline Traces and Spans - Storage for observability data
-- Execute via InsForge dashboard SQL editor

-- Pipeline Traces — one row per pipeline execution
CREATE TABLE IF NOT EXISTS pipeline_traces (
    id SERIAL PRIMARY KEY,
    trace_id UUID NOT NULL UNIQUE,
    pipeline_name VARCHAR(50) NOT NULL,
    telegram_id BIGINT NOT NULL,
    user_id INTEGER,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_ms NUMERIC(10, 2) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT true,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pipeline Spans — one row per step within a trace
CREATE TABLE IF NOT EXISTS pipeline_spans (
    id SERIAL PRIMARY KEY,
    span_id UUID NOT NULL UNIQUE,
    trace_id UUID NOT NULL,
    parent_span_id UUID,
    span_name VARCHAR(100) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_ms NUMERIC(10, 2) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT true,
    error TEXT,
    input_data JSONB,
    output_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_traces_telegram_id ON pipeline_traces (telegram_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_traces_pipeline ON pipeline_traces (pipeline_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_traces_created_at ON pipeline_traces (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spans_trace_id ON pipeline_spans (trace_id);
CREATE INDEX IF NOT EXISTS idx_spans_created_at ON pipeline_spans (created_at DESC);

-- Enable RLS (InsForge requirement)
ALTER TABLE pipeline_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_spans ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (bot uses service role key)
CREATE POLICY traces_service_all ON pipeline_traces FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY spans_service_all ON pipeline_spans FOR ALL USING (true) WITH CHECK (true);

-- Grant sequence usage to anon role (required for SERIAL auto-increment via PostgREST)
GRANT USAGE, SELECT ON SEQUENCE pipeline_traces_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE pipeline_spans_id_seq TO anon;
GRANT ALL ON TABLE pipeline_traces TO anon;
GRANT ALL ON TABLE pipeline_spans TO anon;
