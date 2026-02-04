---
phase: quick
plan: 002
subsystem: leads
tags: [lead-registry, prospect-info, web-research, strategist-prompt]

dependency-graph:
  requires: []
  provides:
    - structured prospect person info (first_name, last_name)
    - prospect geography field
    - enhanced web research queries
    - updated lead display and edit flows
  affects:
    - future company-level grouping
    - multi-contact tracking per company

tech-stack:
  added: []
  patterns:
    - prospect_info extraction from LLM structured output
    - composite field derivation (prospect_name from first + last)

file-tracking:
  key-files:
    created:
      - migrations/002_lead_person_company_fields.sql
    modified:
      - bot/storage/models.py
      - bot/handlers/support.py
      - bot/handlers/leads.py
      - prompts/strategist_agent.md
      - packages/shared/src/tables.ts
      - packages/webapp/src/types/tables.ts
      - packages/webapp/src/features/leads/components/LeadDetail.tsx
      - packages/webapp/src/features/leads/components/LeadCard.tsx
      - packages/webapp/src/features/leads/hooks/useLeads.ts

decisions:
  - Keep existing prospect_name as composite display name (backward compat)
  - Clean up "Unknown" values from LLM output before storing
  - Prefer structured prospect_info fields over regex extraction
  - Recalculate composite prospect_name when first/last updated via edit

metrics:
  duration: 4m
  completed: 2026-02-04
---

# Quick Task 002: Lead & Company Data Enrichment Summary

**One-liner:** Structured prospect person info (first/last name, geography) from LLM output with enriched web research queries and updated display/edit flows.

## What Was Done

### Task 1: Database migration, models, and strategist prompt
- Created SQL migration adding `prospect_first_name`, `prospect_last_name`, `prospect_geography` columns to `lead_registry` (nullable TEXT, backward compatible)
- Updated `LeadRegistryModel` with three new optional fields
- Added "Step 0: Identify the Prospect" to strategist prompt with extraction instructions
- Added `prospect_info` JSON object to strategist output format (first_name, last_name, company, geography)
- Added rule 7: "Always identify the prospect"
- Updated `LeadRegistryRow` in both shared and webapp TypeScript types
- **Commit:** `de418c6`

### Task 2: Support handler extraction, web research, and lead save logic
- Extract `prospect_info` object from LLM output with "Unknown" value cleanup
- Compose `prospect_name` from structured first/last name (falls back to regex extraction)
- Prefer structured company from `prospect_info` over regex extraction
- Pass new fields to `LeadRegistryModel` on both create and merge paths
- Add `prospect_geography` to `_background_enrich_lead` for richer web research queries
- **Commit:** `59d2cc9`

### Task 3: Lead display and edit updates (bot + TMA)
- Updated `_lead_display_name` to prefer structured first+last name
- Added geography display with globe emoji in `_format_lead_detail`
- Expanded edit flow to accept First Name, Last Name, and Geography fields
- Added composite `prospect_name` recalculation when structured name fields change via edit
- Updated `LeadDetail.tsx` to render structured name and geography
- Updated `LeadCard.tsx` to render structured name
- Added `prospect_first_name`, `prospect_last_name` to `useLeads` select query for list display
- **Commit:** `6ac41b6`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] useLeads hook select query**
- **Found during:** Task 3
- **Issue:** `LeadCard` uses `LeadListItem` type from `useLeads` which specifies explicit column selection. The new fields `prospect_first_name`, `prospect_last_name` were not in the select list, which would cause them to be undefined in the card component.
- **Fix:** Added the new fields to both the `LeadListItem` Pick type and the `.select()` query string.
- **Files modified:** `packages/webapp/src/features/leads/hooks/useLeads.ts`

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Keep `prospect_name` as composite display name | Backward compatibility; existing leads without first/last still display correctly |
| Clean up "Unknown" values to `None` | Prevents storing meaningless LLM defaults; cleaner display and data quality |
| Prefer `prospect_info` structured fields | More reliable than regex extraction from analysis text |
| Recalculate `prospect_name` on edit | Keeps composite name in sync with structured fields |

## Pre-deployment Steps

1. **Run migration:** Execute `migrations/002_lead_person_company_fields.sql` on InsForge database
2. **Deploy bot:** New support handler extracts and stores structured prospect info
3. **Deploy TMA:** Updated lead components display geography and structured names
