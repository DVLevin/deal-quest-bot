# Product North Star: Deal Quest Vision

## What Deal Quest Should Be

**One sentence:** Deal Quest is the AI co-pilot that makes every sales rep perform like the best rep on the team — by learning from real deals, coaching in real-time, and measuring what actually drives revenue.

**The value loop:**
```
Prospect appears → AI analyzes instantly → Rep follows guided plan →
AI drafts messages → Rep executes steps → Deal outcome captured →
System learns → Training adapts → Next deal is easier
```

---

## North Star Metric

### Primary: **Pipeline Velocity**
**Definition:** Average number of leads progressed per active user per week.

"Progressed" = status changed forward (analyzed → reached_out → meeting → in_progress → closed).

**Why this metric:**
- Directly measures sales productivity
- Captures both quality (leads that progress) and quantity (number of leads)
- Can be improved by better analysis, better plans, better training, or better UX
- Visible to both individual reps and team leads

### Secondary Metrics

| Metric | Definition | What It Measures |
|--------|-----------|------------------|
| **Activation rate** | % of new users who analyze a prospect + complete 1 step within 48h | Onboarding effectiveness |
| **Daily active rate** | % of users who open TMA or use bot daily | Product stickiness |
| **Step completion rate** | % of engagement plan steps completed (not skipped/abandoned) | Plan quality + user engagement |
| **Training → performance correlation** | Score improvement after training sessions | Training ROI |
| **Close rate** | % of leads reaching closed_won | Overall product effectiveness |

---

## Product Principles

### 1. Zero-to-value in 30 seconds
A new user should experience the "aha moment" (AI analyzes a prospect and produces a strategy) within their first 30 seconds. Everything before that is friction.

### 2. The system does the work, the rep takes the credit
Every interaction should reduce manual effort. The AI doesn't just suggest — it drafts, schedules, reminds, and tracks. The rep's job is to execute and close.

### 3. Real deals teach better than fake scenarios
Training is most effective when it mirrors actual deal situations. Real deal outcomes should feed back into training content. Scenarios generated from closed deals > static JSON scenarios.

### 4. Show the pipeline, not the dashboard
Reps think in pipelines (how many deals, what stage, what's next). The product should organize around pipeline state, not gamification metrics. XP is motivational sugar — pipeline health is the meal.

### 5. Admin = coach, not spectator
Team leads need to *act* on what they see — assign leads, push training focus, coach struggling reps. Read-only analytics don't change behavior.

---

## What "Done" Looks Like (v3.0 Vision)

### For Individual Reps
- Open TMA → see "Today: 3 follow-ups, 1 new prospect to analyze"
- Tap follow-up → see draft message ready to copy, with proof upload
- Copy, paste in LinkedIn, upload screenshot → step marked done automatically
- After all steps: "Move to Meeting Booked?" → one tap
- End of day: "4/4 actions done. +120 XP. 5-day streak."
- Weekly: "Your cold outreach improved 23%. Try this advanced scenario."

### For Team Leads
- Open admin → see "Team pipeline: 12 active, 3 stale, 2 closing this week"
- Tap on struggling rep → see their stale leads, weak areas, recent scores
- Push training focus: "Everyone practice re-engagement this week"
- See improvement metrics next week

### For the Business
- Measurable: X deals closed per rep per month (baseline vs. with Deal Quest)
- Defensible: "Reps using Deal Quest close 2x faster on average"
- Scalable: New hire reaches full productivity in days, not weeks

---

## Feature Roadmap Principles

### Build Next (v2.x completion)
1. Pipeline velocity display (leads page + dashboard)
2. Deal closure celebration + outcome capture
3. Quick wins from `06-QUICK-WINS.md`
4. UX doc alignment from `05-UX-DOC-ALIGNMENT.md`

### Build After (v3.0 — Team Intelligence)
1. Admin coaching view (rep details, training push)
2. Adaptive training from real deals
3. Team pipeline management
4. Proxy mode (admin-managed API keys)
5. Outcome-based performance tracking

### Build Later (v4.0 — Platform)
1. Multi-company support (different playbooks per company)
2. Content management (edit playbook from TMA)
3. Integration marketplace (CRM sync, LinkedIn API, email tracking)
4. Self-serve onboarding (no GetDeal.ai dependency)

---

## Anti-Patterns to Avoid

1. **Don't build more AI agents without closing the feedback loop.** Six agents is already complex. Before adding a 7th, make sure outcomes from the first 6 feed back into the system.

2. **Don't add surfaces without removing friction.** TMA + Bot is already two surfaces. Adding a web dashboard or mobile app fragments the experience. Deepen TMA instead.

3. **Don't optimize gamification before pipeline.** XP, badges, and streaks are motivational. Pipeline velocity is existential. Invest in pipeline first.

4. **Don't add team features without single-user polish.** The individual rep experience must be excellent before adding team coordination. A team of reps using a mediocre tool is worse than one rep using a great one.

5. **Don't chase features — chase the value loop.** Every feature should tighten the prospect → analyze → execute → close → learn loop. If it doesn't, it's scope creep.
