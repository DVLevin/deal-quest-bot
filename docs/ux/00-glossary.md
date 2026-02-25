# Deal Quest — UX Documentation Glossary

> **NOTE (2026-02-08):** These UX docs were written for v1.0 bot flows. The product now includes
> a **Telegram Mini App (TMA)** with full UI pages, engagement plan execution, draft generation,
> and smart landing. See `docs/pm-audit/05-UX-DOC-ALIGNMENT.md` for the gap analysis and proposed
> restructuring plan.

## Quick Navigation

| File | Surface | Core User Need |
|------|---------|----------------|
| [01-support-flow.md](01-support-flow.md) | Bot `/support` | "Analyze my prospect and tell me how to close" |
| [02-leads-flow.md](02-leads-flow.md) | Bot `/leads` + TMA | "Track my pipeline and execute engagement plans" |
| [03-learn-flow.md](03-learn-flow.md) | Bot `/learn` + TMA | "Teach me to sell GetDeal.ai step by step" |
| [04-train-flow.md](04-train-flow.md) | Bot `/train` + TMA | "Test my skills with random challenges" |
| [05-stats-flow.md](05-stats-flow.md) | Bot `/stats` + TMA Dashboard | "Show me how I'm doing" |
| [06-settings-flow.md](06-settings-flow.md) | Bot `/settings` + TMA Profile | "Manage my account" |
| [07-onboarding-flow.md](07-onboarding-flow.md) | Bot `/start` | "Get me set up fast" |

---

## Methodology

### Why These ICPs (Ideal Customer Profiles)

Deal Quest serves **GetDeal.ai partnership managers** — a very specific ICP:

- **Non-technical sales professionals** who live in Telegram
- **Time-pressed**: between calls, meetings, travel
- **Mobile-first**: 80%+ usage on phone, one-handed
- **Context-switching constantly**: they juggle 10-30 prospects simultaneously
- **Learning on the job**: no formal sales training time, need bite-sized lessons

### User Path Selection Rationale

Each command maps to a distinct **job-to-be-done**:

| Command | JTBD | When They Use It |
|---------|------|------------------|
| `/support` | "Help me close THIS deal RIGHT NOW" | Before/after a prospect interaction |
| `/leads` | "What's my pipeline status?" | Weekly review, before team meetings |
| `/learn` | "I want to get better at selling" | Downtime, commute, evening |
| `/train` | "Quick practice between calls" | 5-minute gaps in schedule |
| `/stats` | "Am I improving?" | Self-motivation, manager check-ins |
| `/settings` | "Something's broken or I need to change setup" | Rare, one-time |
| `/start` | "I'm new, get me going" | First time only |

### LazyFlow Design Principles Applied

1. **Zero-Click Where Possible**: Bot auto-detects photo vs text vs voice, auto-saves leads, auto-enriches in background
2. **One-Tap Completions**: Status changes, plan step toggles, navigation — all single-tap
3. **Mind-Reading Defaults**: Pre-populated analysis, auto-extracted names, smart follow-up scheduling
4. **Invisible Intelligence**: Web research and engagement plans generate silently in background

### Document Structure (Each Flow File)

Every flow document follows this structure:

1. **Overview** — What this mini-product does
2. **User Stories** — BDD/Gherkin format
3. **User Flow Diagram** — Mermaid flowchart
4. **Pain Points** — Current friction
5. **Wishes** — What would delight users
6. **LazyFlow Improvements** — Specific UX changes to implement

---

## Key Terms

| Term | Definition |
|------|-----------|
| **Lead** | A prospect that was analyzed via /support, automatically tracked in the pipeline |
| **Enrichment** | Background process that adds web research + engagement plan to a lead |
| **Engagement Plan** | AI-generated step-by-step actions to warm up and close a prospect |
| **Track** | A structured learning path (e.g., "Foundations") with sequential levels |
| **Level** | A single lesson within a track, with content + a practice scenario |
| **Scenario** | A simulated sales situation where the user practices responding |
| **XP** | Experience points earned from scenarios (learn + train) |
| **Pipeline** | The collection of leads organized by status (analyzed → reached out → meeting → closed) |
| **Casebook** | Library of past successful sales interactions used as reference |
| **Playbook** | GetDeal.ai's proven sales methodology and messaging |
| **TMA** | Telegram Mini App — the React/TypeScript web app embedded inside Telegram |
| **Smart Landing** | Dashboard auto-detects urgency (overdue actions, streak) and reorders content |
| **Step Action Screen** | TMA screen for executing an engagement plan step (proof upload, draft gen) |
| **Draft Generation** | AI-generated multi-platform message drafts via CommentGeneratorAgent |
| **Message Bus** | Async DB-based communication between TMA and Bot (draft_requests, plan_requests) |
| **Deep Link** | URL parameters that open specific TMA pages/states from bot messages |
| **Model Config** | Per-agent LLM model overrides managed from admin panel |
| **Pipeline Velocity** | Rate at which leads progress through pipeline stages (North Star metric) |
