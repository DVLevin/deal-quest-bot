# Lead Lifecycle Analysis

## Current State

The lead lifecycle touches **3 surfaces** (bot, TMA, background services) with **5 status stages**:
```
analyzed → reached_out → meeting_booked → in_progress → closed_won/closed_lost
```

### What Works
- Screenshot → AI extraction → full analysis in one message (genuinely magical)
- Engagement plans auto-generated with timed steps
- Step reminders sent via Telegram with Done/Snooze/Skip
- TMA shows plan-first layout with deep links from reminders
- Re-analysis with new context preserves history

### What's Broken or Missing

#### 1. No Pipeline Velocity Visibility
**Problem:** Neither bot nor TMA shows: "How many leads am I actively working? How many are stale? What's my close rate?"

**What it should show:**
- Pipeline funnel: X analyzed → Y reached out → Z meeting → W closed
- Stale lead alerts (7+ days no activity — exists in v1.1 but buried)
- Win/loss ratio over time
- Average time-in-stage

**Why it matters:** Sales reps live by pipeline velocity. Without it, Deal Quest is a tool they *use*, not a tool they *live in*.

#### 2. Status Transitions Are Manual and Disconnected
**Problem:** Lead status changes only when a user explicitly taps the status selector. But the product *knows* when a status should change:
- User marks "reach out" step as done → status should suggest `reached_out`
- User uploads screenshot of LinkedIn conversation → status should suggest `meeting_booked` if context mentions meeting
- All steps complete → status should auto-suggest `in_progress` or `closed`

**Recommendation:** Smart status suggestions based on completed engagement steps, not just the existing "next status" ring highlight. The product should say: "You've completed 3/5 outreach steps. Move to 'Reached Out'?" with one tap.

#### 3. No "Win" Celebration or Outcome Capture
**Problem:** When a lead is marked `closed_won`, nothing happens. No XP, no celebration, no outcome logging. The value loop dies at the most important moment.

**What should happen:**
- Closing a deal earns significant XP (e.g., 500 XP — more than any training scenario)
- LevelUp animation triggers
- System asks: "What worked? What would you do differently?" (feeds back into casebook)
- The closed deal becomes a training scenario for other team members (with anonymization)

**Why it matters:** This closes the training ↔ real work loop. Real deals become training material.

#### 4. Engagement Plan Quality Is Opaque
**Problem:** Plans are LLM-generated but users can't tell if a plan is generic ("Send a LinkedIn message") or contextual ("Reference her recent post about AI acquisitions"). No quality indicator, no plan comparison, no plan versioning.

**Recommendation:**
- Show plan specificity score (how many steps reference prospect-specific context)
- Allow plan regeneration with user feedback ("too generic", "wrong platform")
- Store plan versions so reps can A/B test approaches

#### 5. No Lead Handoff or Team Coordination
**Problem:** Leads belong to individual users. There's no way to:
- Transfer a lead to another team member
- CC a manager on a lead
- Flag a lead as "needs help"
- See team pipeline (admin can see leaderboard but not pipeline)

**Recommendation (v3.0 consideration):**
- Team pipeline view in admin panel
- Lead assignment / reassignment
- "Ask for help" button that notifies admin with lead context

---

## Proposed Lead Lifecycle Improvements (Priority Order)

| # | Improvement | Effort | Impact | Details |
|---|-----------|--------|--------|---------|
| 1 | Pipeline velocity dashboard (TMA) | Medium | HIGH | Funnel chart, stale alerts, avg time-in-stage |
| 2 | Smart status auto-suggestion | Low | HIGH | Step completions trigger status change prompts |
| 3 | Deal closure celebration + outcome capture | Low | HIGH | XP, animation, outcome questionnaire, casebook entry |
| 4 | Plan quality indicator | Low | MEDIUM | Specificity score, regeneration with feedback |
| 5 | Plan versioning | Medium | MEDIUM | A/B test engagement approaches |
| 6 | Team lead handoff | High | MEDIUM | Transfer, flag for help, team pipeline |
