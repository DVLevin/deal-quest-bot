-- Migration: Add web_research_versions column to lead_registry
-- Created: 2026-02-05
-- Purpose: Store versioned web research with re-run capability

-- Add JSONB column for version history
-- Structure: {
--   "versions": [
--     {
--       "version_id": 1,
--       "created_at": "2026-02-05T12:00:00Z",
--       "query_used": "John Smith VP Sales at Acme Corp",
--       "url_provided": "https://linkedin.com/in/johnsmith" | null,
--       "content": "Research content..."
--     },
--     ...
--   ],
--   "current_version_id": 1
-- }
ALTER TABLE lead_registry
ADD COLUMN IF NOT EXISTS web_research_versions JSONB DEFAULT NULL;

-- Add comment explaining structure
COMMENT ON COLUMN lead_registry.web_research_versions IS
  'Versioned web research history. Structure: {"versions": [...], "current_version_id": N}. Each version has: version_id, created_at, query_used, url_provided (nullable), content.';

-- Note: The existing web_research TEXT column is preserved for backward compatibility.
-- New code updates both columns: web_research_versions (full history) and web_research (current version content).
