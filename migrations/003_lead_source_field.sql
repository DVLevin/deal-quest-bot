-- Add lead_source column to track how each lead was created
ALTER TABLE lead_registry ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'support_analysis';
-- DEFAULT backfills all existing rows automatically (all created via bot /support)
