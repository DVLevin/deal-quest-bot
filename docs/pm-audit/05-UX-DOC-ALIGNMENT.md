# UX Documentation Alignment Analysis

## Current State

The `docs/ux/` directory contains 8 files documenting bot flows. These were written during v1.0-v1.1 era and partially updated with "improvements" appendices, but **do not reflect the current v2.0 product**.

---

## Gap Analysis: Documentation vs. Reality

### 00-glossary.md
**Status:** Mostly accurate
**Gaps:**
- Missing terms: engagement plan, draft generation, plan requests, message bus, smart landing
- LazyFlow principles described but not mapped to actual implementations
- No mention of TMA as a surface (only bot commands listed)

**Action:** Add TMA glossary section, new v2.0 terms, and LazyFlow implementation references.

### 01-support-flow.md
**Status:** Partially outdated
**Gaps:**
- Describes single pipeline but doesn't document `support_photo.yaml` vs `support.yaml` routing
- No mention of extraction → strategist two-step pipeline
- "Command guard" (fuzzy typo detection) mentioned as implemented but doesn't exist in code
- Missing: lead auto-creation, engagement plan generation, web research background enrichment
- Missing: forwarded message auto-detection (v2.0 LazyFlow feature)

**Action:** Rewrite to document current dual-pipeline support flow with extraction agent, lead creation, and background enrichment.

### 02-leads-flow.md
**Status:** Significantly outdated
**Gaps:**
- Doesn't mention engagement plan steps or plan-first TMA layout
- Missing: StepActionScreen (proof upload, draft generation, can't-perform flow)
- Missing: TMA ↔ Bot message bus (draft_requests, plan_requests)
- Missing: deep link coordination between bot reminders and TMA
- Missing: re-analysis flow, context input, analysis history
- Missing: web research versioning
- "Delete lead" mentioned as wish but likely implemented

**Action:** Full rewrite required. This is the most changed flow between v1.0 and v2.0.

### 03-learn-flow.md
**Status:** Mostly accurate
**Gaps:**
- Doesn't mention TMA Learn page (only bot flow)
- Track stats (completion %, avg score) added in v1.1 not documented
- Difficulty recommendation system not mentioned
- "Scenario intro improvement" listed as improvement but unclear if implemented

**Action:** Minor update — add TMA cross-reference and v1.1 enhancements.

### 04-train-flow.md
**Status:** Partially outdated
**Gaps:**
- Pool size described as "20" but dynamic generation expands pool
- Difficulty filtering added but not fully documented
- Quick Start button (v2.0 LazyFlow) not mentioned
- Scenario variety indicator not documented
- TMA Train page with arena UI not referenced

**Action:** Update pool mechanics, add difficulty filter/recommendation, add TMA reference.

### 05-stats-flow.md
**Status:** Outdated
**Gaps:**
- Describes bot `/stats` command only — doesn't mention TMA Dashboard
- TMA Dashboard has: smart landing, TodayActionsCard, WeakAreasCard, LeaderboardWidget, BadgePreview
- Progress card shows much more than the doc describes
- "Read-only" assertion is wrong — dashboard has interactive elements

**Action:** Merge with TMA Dashboard documentation or clearly separate bot vs TMA stats experience.

### 06-settings-flow.md
**Status:** Mostly accurate
**Gaps:**
- Missing: TMA Profile page settings panel
- Per-agent model config (admin feature, v2.0) not mentioned
- No mention of how settings sync between bot and TMA

**Action:** Minor update — add TMA settings reference and model config admin.

### 07-onboarding-flow.md
**Status:** Mostly accurate
**Gaps:**
- Doesn't mention TMA first-launch experience
- Missing: deep link routing from `/start?startapp=...`
- "Buttons trigger flows directly" improvement needs verification

**Action:** Minor update — add TMA auth flow, deep link parameters.

---

## Recommended Documentation Structure

The current structure is **bot-command-centric**. With TMA as a full surface, the docs should be **flow-centric** instead:

### Proposed New Structure

```
docs/ux/
├── 00-glossary.md              # Updated terms + TMA vocabulary
├── 01-onboarding.md            # Bot + TMA first experience
├── 02-prospect-analysis.md     # /support → lead creation flow (was support-flow)
├── 03-lead-management.md       # Full lead lifecycle: bot + TMA (was leads-flow)
├── 04-engagement-execution.md  # NEW: Plan steps, reminders, draft gen, proof upload
├── 05-training.md              # /learn + /train merged (was separate files)
├── 06-dashboard.md             # NEW: TMA dashboard, smart landing, today's actions
├── 07-gamification.md          # NEW: XP, levels, badges, streaks, celebrations
├── 08-admin.md                 # NEW: Admin panel capabilities
├── 09-settings.md              # Bot + TMA settings (was settings-flow)
└── 10-stats-profile.md         # Bot /stats + TMA Profile page
```

### Key Changes
1. **Merge learn + train** into single training doc (they share scoring, XP, and UX patterns)
2. **Split leads** into lead management + engagement execution (two distinct user journeys)
3. **Add dashboard, gamification, admin** docs (major surfaces with no documentation)
4. **Every doc** should have: Bot section, TMA section, and integration points

---

## Priority for Updates

| Priority | Document | Effort | Reason |
|----------|----------|--------|--------|
| P1 | 02-leads-flow → 03-lead-management | High | Most changed, most important flow |
| P1 | NEW: 04-engagement-execution | High | Entirely new flow, no docs exist |
| P2 | 01-support-flow → 02-prospect-analysis | Medium | Pipeline changes need documenting |
| P2 | NEW: 06-dashboard | Medium | Major TMA surface undocumented |
| P3 | NEW: 08-admin | Low | Admin panel undocumented |
| P3 | 00-glossary | Low | Quick term additions |
| P4 | Others | Low | Minor updates |
