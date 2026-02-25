-- Add structured person and company fields to lead_registry
-- prospect_first_name / prospect_last_name: for multi-contact tracking per company
-- prospect_geography: for richer web research queries and company-level grouping
ALTER TABLE lead_registry ADD COLUMN IF NOT EXISTS prospect_first_name TEXT;
ALTER TABLE lead_registry ADD COLUMN IF NOT EXISTS prospect_last_name TEXT;
ALTER TABLE lead_registry ADD COLUMN IF NOT EXISTS prospect_geography TEXT;
