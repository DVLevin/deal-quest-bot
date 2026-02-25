---
phase: quick
plan: 002
type: execute
wave: 1
depends_on: []
files_modified:
  - migrations/002_lead_person_company_fields.sql
  - bot/storage/models.py
  - bot/handlers/support.py
  - bot/handlers/leads.py
  - bot/agents/strategist.py
  - prompts/strategist_agent.md
  - packages/shared/src/tables.ts
  - packages/webapp/src/types/tables.ts
  - packages/webapp/src/features/leads/components/LeadDetail.tsx
  - packages/webapp/src/features/leads/components/LeadCard.tsx
autonomous: true

must_haves:
  truths:
    - "When a user runs /support, the LLM returns structured first_name, last_name, company_name, and geography in its JSON output"
    - "New leads are saved with separate first_name, last_name, and geography fields in the database"
    - "Web research queries include full name, company name, and geography for better results"
    - "Lead detail view (bot and TMA) displays first name, last name, and geography"
    - "Editing a lead allows updating first name, last name, and geography"
    - "Existing leads without the new fields continue to work (backward compatible)"
  artifacts:
    - path: "migrations/002_lead_person_company_fields.sql"
      provides: "SQL migration adding prospect_first_name, prospect_last_name, prospect_geography columns to lead_registry"
    - path: "bot/storage/models.py"
      provides: "Updated LeadRegistryModel with new fields"
    - path: "prompts/strategist_agent.md"
      provides: "Updated strategist prompt requesting structured person and company info"
    - path: "bot/handlers/support.py"
      provides: "Updated support handler extracting and storing structured name/geography"
  key_links:
    - from: "prompts/strategist_agent.md"
      to: "bot/handlers/support.py"
      via: "LLM JSON output fields prospect_info.first_name, prospect_info.last_name, prospect_info.company, prospect_info.geography"
      pattern: "prospect_info"
    - from: "bot/handlers/support.py"
      to: "bot/storage/models.py"
      via: "LeadRegistryModel fields prospect_first_name, prospect_last_name, prospect_geography"
      pattern: "prospect_first_name|prospect_last_name|prospect_geography"
---

<objective>
Add structured person info (first name, last name) and company info (company name, geography) to the lead data model. Update the strategist prompt to request these fields explicitly, update the support pipeline to extract and store them, enhance web research queries with full context, and display them in both bot and TMA interfaces.

Purpose: Enable multi-contact tracking per company by storing structured person + company data, and improve research quality by including full name, company, and geography in research queries. This sets the foundation for building company-level views where multiple contacts at the same company can be grouped for multi-contact deal closing.

Output: Updated database schema, models, prompts, handlers, and UI components.
</objective>

<execution_context>
@/Users/dmytrolevin/.claude/get-shit-done/workflows/execute-plan.md
@/Users/dmytrolevin/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@bot/storage/models.py
@bot/storage/repositories.py
@bot/handlers/support.py
@bot/handlers/leads.py
@bot/agents/strategist.py
@prompts/strategist_agent.md
@bot/utils.py
@packages/shared/src/tables.ts
@packages/webapp/src/types/tables.ts
@packages/webapp/src/features/leads/types.ts
@packages/webapp/src/features/leads/components/LeadDetail.tsx
@packages/webapp/src/features/leads/components/LeadCard.tsx
@data/pipelines/support.yaml
</context>

<tasks>

<task type="auto">
  <name>Task 1: Database migration, models, and strategist prompt</name>
  <files>
    migrations/002_lead_person_company_fields.sql
    bot/storage/models.py
    prompts/strategist_agent.md
    packages/shared/src/tables.ts
    packages/webapp/src/types/tables.ts
  </files>
  <action>
**1. Create SQL migration `migrations/002_lead_person_company_fields.sql`:**

```sql
-- Add structured person and company fields to lead_registry
ALTER TABLE lead_registry ADD COLUMN IF NOT EXISTS prospect_first_name TEXT;
ALTER TABLE lead_registry ADD COLUMN IF NOT EXISTS prospect_last_name TEXT;
ALTER TABLE lead_registry ADD COLUMN IF NOT EXISTS prospect_geography TEXT;
```

These are nullable TEXT columns, backward compatible with existing rows. The existing `prospect_name` column is kept for backward compatibility and as a display name fallback. The existing `prospect_company` column remains as-is.

**2. Update `bot/storage/models.py` — `LeadRegistryModel`:**

Add three new optional fields AFTER `prospect_name` (line ~87):
```python
prospect_first_name: str | None = None
prospect_last_name: str | None = None
```

Add after `prospect_company` (line ~88):
```python
prospect_geography: str | None = None
```

Keep `prospect_name` as-is — it will be computed as `"{first_name} {last_name}"` when both are present, or kept as the existing extracted name for backward compat.

**3. Update `prompts/strategist_agent.md` — request structured prospect info:**

In the "Output Format" section (the JSON example around line 115-165), add a new top-level key `prospect_info` to the JSON output format. Place it BEFORE `analysis`:

```json
{
  "prospect_info": {
    "first_name": "Sarah",
    "last_name": "Chen",
    "company": "Stripe",
    "geography": "San Francisco, USA"
  },
  "analysis": { ... },
  ...
}
```

Also update the "Step 1: Deep Analysis" section (around line 43-57) to add instructions at the TOP of the step:

```
### Step 0: Identify the Prospect

Before analysis, extract structured prospect information from the provided context:
- **First Name** and **Last Name** (from the message, LinkedIn profile, email signature, or any identifiable info)
- **Company Name** (full official name, not abbreviation)
- **Geography** (city, country, or region — infer from company HQ, LinkedIn location, timezone clues, or language if not explicitly stated)

If any field cannot be determined, use "Unknown".
```

Update the COMPANY CONTEXT line in the analysis template to read:
```
COMPANY CONTEXT: [What their company is doing/needing — use the FULL company name]
```

Update the "Rules" section (around line 169) to add rule 7:
```
7. **Always identify the prospect** — Extract first name, last name, company, and geography. Never skip prospect_info.
```

**4. Update `packages/shared/src/tables.ts` — `LeadRegistryRow`:**

Add after `prospect_name` field (around line 112):
```typescript
prospect_first_name: string | null;
prospect_last_name: string | null;
```

Add after `prospect_company` field (around line 114):
```typescript
prospect_geography: string | null;
```

**5. Update `packages/webapp/src/types/tables.ts` — `LeadRegistryRow`:**

Same changes as shared types. Add after `prospect_name` (around line 112):
```typescript
prospect_first_name: string | null;
prospect_last_name: string | null;
```

Add after `prospect_company` (around line 114):
```typescript
prospect_geography: string | null;
```
  </action>
  <verify>
- `migrations/002_lead_person_company_fields.sql` exists with 3 ALTER TABLE statements
- `LeadRegistryModel` in `bot/storage/models.py` has `prospect_first_name`, `prospect_last_name`, `prospect_geography` fields
- `prompts/strategist_agent.md` contains `prospect_info` in the JSON output format and "Step 0: Identify the Prospect"
- Both `packages/shared/src/tables.ts` and `packages/webapp/src/types/tables.ts` `LeadRegistryRow` interfaces include the new fields
- Python: `python3 -c "from bot.storage.models import LeadRegistryModel; m = LeadRegistryModel(telegram_id=1); print(m.prospect_first_name, m.prospect_last_name, m.prospect_geography)"` prints `None None None`
  </verify>
  <done>Database migration ready, all data models updated with new fields, strategist prompt requests structured prospect info including first/last name, company, and geography</done>
</task>

<task type="auto">
  <name>Task 2: Support handler extraction, web research, and lead save logic</name>
  <files>
    bot/handlers/support.py
  </files>
  <action>
Update `bot/handlers/support.py` to extract and use the new structured prospect info from the strategist output.

**1. Update `_run_support_pipeline` function (around line 196-272) — extract prospect_info:**

After getting `output_data` from the strategist (around line 170), extract the new `prospect_info` object:

```python
# Extract structured prospect info (new format)
prospect_info = output_data.get("prospect_info", {})
if not isinstance(prospect_info, dict):
    prospect_info = {}

prospect_first_name = prospect_info.get("first_name") or None
prospect_last_name = prospect_info.get("last_name") or None
prospect_geography = prospect_info.get("geography") or None

# Clean up "Unknown" values
for _val_name in ("prospect_first_name", "prospect_last_name", "prospect_geography"):
    _val = locals()[_val_name]
    if _val and _val.strip().lower() in ("unknown", "n/a", "not specified", "not mentioned"):
        locals()[_val_name] = None
# Re-read after cleanup (locals() trick doesn't work for reassignment, use explicit):
if prospect_first_name and prospect_first_name.strip().lower() in ("unknown", "n/a", "not specified", "not mentioned"):
    prospect_first_name = None
if prospect_last_name and prospect_last_name.strip().lower() in ("unknown", "n/a", "not specified", "not mentioned"):
    prospect_last_name = None
if prospect_geography and prospect_geography.strip().lower() in ("unknown", "n/a", "not specified", "not mentioned"):
    prospect_geography = None
```

IMPORTANT: Do NOT use the `locals()` trick above. Instead, write simple if-statements for each field to clean up "Unknown" values.

Update the `prospect_name` derivation (around line 211). After the existing `_extract_prospect_name_from_output` call, add logic to compose `prospect_name` from structured fields when available:

```python
# Compose prospect_name from structured first/last name if available
if prospect_first_name and prospect_last_name:
    prospect_name = f"{prospect_first_name} {prospect_last_name}"
elif prospect_first_name:
    prospect_name = prospect_first_name
# Fall back to existing extraction if prospect_info didn't have name
if not prospect_name:
    prospect_name = _extract_prospect_name_from_output(output_data, user_input)
```

Also update `prospect_company` extraction to prefer the structured field:
```python
# Prefer structured company from prospect_info
prospect_company_from_info = prospect_info.get("company") or None
if prospect_company_from_info and prospect_company_from_info.strip().lower() not in ("unknown", "n/a", "not specified"):
    prospect_company = prospect_company_from_info
else:
    prospect_company = (
        _extract_prospect_company_from_output(output_data)
        or _extract_field(analysis_obj, "company")
    )
```

**2. Update lead creation (around line 254-271) to include new fields:**

In the `LeadRegistryModel(...)` constructor call for new lead creation, add:
```python
prospect_first_name=prospect_first_name,
prospect_last_name=prospect_last_name,
prospect_geography=prospect_geography,
```

In the merge path (around line 228-248), add to `merge_updates`:
```python
if prospect_first_name and not existing_lead.prospect_first_name:
    merge_updates["prospect_first_name"] = prospect_first_name
if prospect_last_name and not existing_lead.prospect_last_name:
    merge_updates["prospect_last_name"] = prospect_last_name
if prospect_geography and not existing_lead.prospect_geography:
    merge_updates["prospect_geography"] = prospect_geography
```

**3. Update `_background_enrich_lead` function (around line 365-426) — enhance web research query:**

Update the research query building (around line 377-400) to include geography:

```python
# Build research query with full context
research_query_parts = []
if prospect_name:
    research_query_parts.append(prospect_name)
if prospect_company:
    research_query_parts.append(prospect_company)
```

The function currently takes `prospect_name` and `prospect_company` as parameters. Add `prospect_geography: str | None = None` parameter. Then after building the query parts:

```python
if prospect_geography:
    research_query_parts.append(prospect_geography)
```

Update both call sites of `_background_enrich_lead` (around line 279-288) to pass geography:
```python
prospect_geography=prospect_geography,
```

The function signature change:
```python
async def _background_enrich_lead(
    lead_id: int,
    lead_repo: LeadRegistryRepo,
    engagement_service: EngagementService,
    openrouter_api_key: str,
    prospect_name: str | None,
    prospect_company: str | None,
    prospect_geography: str | None = None,
    original_context: str | None = None,
) -> None:
```
  </action>
  <verify>
- `bot/handlers/support.py` references `prospect_info` in the `_run_support_pipeline` function
- `prospect_first_name`, `prospect_last_name`, `prospect_geography` are passed to `LeadRegistryModel(...)` constructor
- `_background_enrich_lead` accepts and uses `prospect_geography` parameter
- No Python syntax errors: `python3 -c "import bot.handlers.support"` succeeds
  </verify>
  <done>Support handler extracts structured prospect info from LLM output, composes display name from first/last, stores new fields in lead registry, and passes geography to web research for richer context</done>
</task>

<task type="auto">
  <name>Task 3: Lead display and edit updates (bot + TMA)</name>
  <files>
    bot/handlers/leads.py
    packages/webapp/src/features/leads/components/LeadDetail.tsx
    packages/webapp/src/features/leads/components/LeadCard.tsx
  </files>
  <action>
**1. Update `bot/handlers/leads.py` — lead detail display and edit flow:**

**_format_lead_detail function (around line 154-291):**

After the company line (around line 170), add geography display:
```python
geography = lead.prospect_geography or ""
if geography:
    text += f"🌍 {_sanitize(geography)}\n"
```

Update the name display to show structured first/last name when available. Change the name line (around line 166):
```python
# Build display name: prefer first+last, fall back to prospect_name
if lead.prospect_first_name and lead.prospect_last_name:
    display_name = f"{lead.prospect_first_name} {lead.prospect_last_name}"
elif lead.prospect_first_name:
    display_name = lead.prospect_first_name
else:
    display_name = _lead_display_name(lead)

text = f"📋 *{_sanitize(display_name)}*\n"
```

**_lead_display_name function (around line 42):**
Update to prefer structured name:
```python
def _lead_display_name(lead) -> str:
    """Consistent display name for a lead."""
    if lead.prospect_first_name and lead.prospect_last_name:
        return f"{lead.prospect_first_name} {lead.prospect_last_name}"
    if lead.prospect_first_name:
        return lead.prospect_first_name
    return lead.prospect_name or f"Prospect #{lead.id}"
```

**on_lead_edit_start handler (around line 932-964):**
Update the edit prompt to show and accept new fields. Change the current info display and format instructions:

```python
current_first = lead.prospect_first_name or "(not set)"
current_last = lead.prospect_last_name or "(not set)"
current_name = lead.prospect_name or "(not set)"
current_company = lead.prospect_company or "(not set)"
current_title = lead.prospect_title or "(not set)"
current_geo = lead.prospect_geography or "(not set)"

await callback.message.edit_text(
    f"✏️ *Edit Lead Info*\n\n"
    f"Current:\n"
    f"  First Name: {_sanitize(current_first)}\n"
    f"  Last Name: {_sanitize(current_last)}\n"
    f"  Company: {_sanitize(current_company)}\n"
    f"  Title: {_sanitize(current_title)}\n"
    f"  Geography: {_sanitize(current_geo)}\n\n"
    f"Send updates in this format (one or more lines):\n"
    f"`First Name: John`\n"
    f"`Last Name: Smith`\n"
    f"`Company: Acme Corp`\n"
    f"`Title: VP of Sales`\n"
    f"`Geography: London, UK`\n\n"
    f"_Send /cancel to go back._",
    parse_mode="Markdown",
)
```

**on_lead_edit_text handler (around line 967-1029):**
Update the field parsing to handle new fields. In the if/elif chain (around line 1005-1010), add:

```python
if key in ("first name", "firstname", "first"):
    updates["prospect_first_name"] = value
    # Also update composite prospect_name
elif key in ("last name", "lastname", "last", "family name", "surname"):
    updates["prospect_last_name"] = value
elif key == "name":
    updates["prospect_name"] = value
elif key == "company":
    updates["prospect_company"] = value
elif key == "title":
    updates["prospect_title"] = value
elif key in ("geography", "geo", "location", "region", "country", "city"):
    updates["prospect_geography"] = value
```

After the updates dict is built but before calling `update_lead`, recalculate `prospect_name` if first/last changed:
```python
# Recalculate composite prospect_name if structured name fields were updated
if "prospect_first_name" in updates or "prospect_last_name" in updates:
    lead = await lead_repo.get_by_id(lead_id)
    if lead:
        fn = updates.get("prospect_first_name", lead.prospect_first_name or "")
        ln = updates.get("prospect_last_name", lead.prospect_last_name or "")
        if fn and ln:
            updates["prospect_name"] = f"{fn} {ln}"
        elif fn:
            updates["prospect_name"] = fn
```

**2. Update `packages/webapp/src/features/leads/components/LeadDetail.tsx`:**

In the header section (around line 250-287), update the name and add geography display:

Replace the name rendering (around line 263-264):
```tsx
<h2 className="text-lg font-bold text-text">
  {lead.prospect_first_name && lead.prospect_last_name
    ? `${lead.prospect_first_name} ${lead.prospect_last_name}`
    : lead.prospect_name ?? 'Unknown Prospect'}
</h2>
```

After the title/company line (around line 266-270), add geography:
```tsx
{lead.prospect_geography && (
  <p className="text-xs text-text-hint">
    🌍 {lead.prospect_geography}
  </p>
)}
```

**3. Update `packages/webapp/src/features/leads/components/LeadCard.tsx`:**

Update the name display (around line 45-46):
```tsx
<p className="truncate text-sm font-semibold text-text">
  {lead.prospect_first_name && lead.prospect_last_name
    ? `${lead.prospect_first_name} ${lead.prospect_last_name}`
    : lead.prospect_name ?? 'Unknown Prospect'}
</p>
```

Note: `LeadCard` uses `LeadListItem` type from `useLeads` hook. The `LeadListItem` type likely selects specific columns. Check `packages/webapp/src/features/leads/hooks/useLeads.ts` and update the select query to include the new fields if it uses column selection. If it selects `*` or doesn't specify columns, no change needed. If it does specify columns, add `prospect_first_name`, `prospect_last_name`, and `prospect_geography` to the select list.
  </action>
  <verify>
- `bot/handlers/leads.py` `_format_lead_detail` includes geography display with globe emoji
- `bot/handlers/leads.py` edit flow accepts `First Name`, `Last Name`, and `Geography` fields
- `packages/webapp/src/features/leads/components/LeadDetail.tsx` renders structured name and geography
- `packages/webapp/src/features/leads/components/LeadCard.tsx` renders structured name
- No Python syntax errors: `python3 -c "import bot.handlers.leads"` succeeds
- No TypeScript errors: `cd packages/webapp && npx tsc --noEmit 2>&1 | head -20` (check for errors in lead components)
  </verify>
  <done>Lead detail display (bot and TMA) shows structured first/last name and geography. Edit flow supports updating all new fields. LeadCard displays structured name. All changes are backward compatible with existing leads that lack the new fields.</done>
</task>

</tasks>

<verification>
After all tasks complete:

1. **Migration ready:** `migrations/002_lead_person_company_fields.sql` has valid SQL to add 3 new columns
2. **Models consistent:** Python `LeadRegistryModel`, shared TS `LeadRegistryRow`, and webapp TS `LeadRegistryRow` all have matching new fields
3. **Prompt updated:** `prompts/strategist_agent.md` contains `prospect_info` with first_name, last_name, company, geography in output format
4. **Extraction works:** `bot/handlers/support.py` extracts `prospect_info` from LLM output and populates new fields
5. **Research enhanced:** `_background_enrich_lead` includes geography in web research query
6. **Display updated:** Both bot (`_format_lead_detail`) and TMA (`LeadDetail`, `LeadCard`) show structured name + geography
7. **Edit works:** Bot edit flow accepts First Name, Last Name, Geography and recalculates composite name
8. **Backward compat:** Existing leads with `prospect_name` but no first/last still display correctly

**Manual verification (after deploying migration):**
- Run `/support` with a text like "Meeting with John Smith from Acme Corp in London about their expansion"
- Check `/leads` — lead should show "John Smith" with "Acme Corp" and "London, UK" geography
- Tap edit, send "Geography: Berlin, Germany" — geography should update
- Check TMA lead detail — should show structured name and geography
</verification>

<success_criteria>
1. New leads from `/support` have structured first_name, last_name, and geography populated from LLM output
2. Web research queries include full name + company + geography for richer results
3. Lead detail views (bot + TMA) display geography and use structured name when available
4. Lead edit supports all new fields
5. Existing leads without new fields continue to work without errors
6. Migration SQL is ready to run on InsForge
</success_criteria>

<output>
After completion, create `.planning/quick/002-lead-company-enrichment/002-SUMMARY.md`
</output>
