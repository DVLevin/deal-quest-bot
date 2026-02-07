# Admin Panel Analysis

## Current State

The admin panel (`/admin` route in TMA, `/admin` command in bot) shows:

**TMA Admin Page:**
1. TeamOverview — 3 stat cards (Total Users, Total XP, Active 7d)
2. PerformanceChart — Weekly performance trend
3. MemberLeaderboard — Rankings by XP
4. WeakAreas — Skills where team underperforms
5. ActivityFeed — Recent user actions
6. ModelConfigPanel — Per-agent model overrides

**Bot /admin:**
- Team stats (total users, total XP, active users)
- System insights (pipeline traces, agent performance)

### What's Good
- ModelConfigPanel is genuinely useful (switch agent models without deploy)
- WeakAreas identifies team-wide skill gaps
- ActivityFeed provides visibility into who's using the tool

### What's Missing (Critical)

#### 1. No Actionable Decisions
**Problem:** Admin sees data but can't *do* anything with it. The panel is read-only analytics.

**What admins need to do:**
- **Assign training focus:** "This week, everyone practices cold outreach" → Push recommended scenarios
- **Set team goals:** "Close 5 deals this month" → Track progress against goal
- **Coach individuals:** See a rep's recent attempts, scores, and real deals → Give feedback
- **Manage content:** Upload/edit playbook sections, add scenarios, curate casebook

#### 2. No Team Pipeline View
**Problem:** Admin sees XP leaderboard (gamification metric) but not the business metric — pipeline health.

**What it should show:**
- Total leads by status across all team members
- Which reps have stale leads
- Which reps are closing deals
- Revenue forecast (if deal values are tracked)

#### 3. No Onboarding Management
**Problem:** Admin can't:
- Invite new team members
- See who hasn't completed onboarding
- Pre-configure API keys for the team
- Set default models for all users

#### 4. No Content Management
**Problem:** Playbook and company knowledge are static files (`data/playbook.md`, `data/company_knowledge.md`). Changes require code access.

**What admins should be able to do:**
- Edit playbook sections from TMA
- Add/remove/edit training scenarios
- Curate casebook entries (approve, reject, edit)
- Upload new knowledge base content

---

## Proposed Admin Improvements

### Tier 1: Admin Decisions (Next Phase)

| Feature | Effort | Impact |
|---------|--------|--------|
| **Team pipeline dashboard** | Medium | HIGH — The #1 reason a team lead opens the panel |
| **Rep coaching view** | Medium | HIGH — See individual rep's deals, scores, weak areas |
| **Training focus push** | Low | MEDIUM — Set "this week's focus" that appears in training recommendations |

### Tier 2: Team Management (v3.0)

| Feature | Effort | Impact |
|---------|--------|--------|
| **Invite/manage members** | Medium | HIGH — Currently no way to add team members from TMA |
| **Pre-configure API keys** | Low | HIGH — Remove onboarding friction for new reps |
| **Default model selection** | Low | MEDIUM — Set team-wide defaults |

### Tier 3: Content Management (v3.0+)

| Feature | Effort | Impact |
|---------|--------|--------|
| **Playbook editor** | High | MEDIUM — Edit knowledge base from TMA |
| **Scenario management** | Medium | MEDIUM — Add/edit training scenarios |
| **Casebook curation** | Medium | LOW — Approve/reject auto-saved entries |

---

## Admin User Story

> As a **team lead**, I want to open the admin panel and immediately see:
> 1. **How is the team performing this week?** (pipeline velocity, deals closed)
> 2. **Who needs help?** (stale leads, low scores, inactive reps)
> 3. **What should I tell them to practice?** (weak areas → training recommendations)
>
> Then I should be able to:
> - Tap on a rep → see their deals, recent scores, and coaching suggestions
> - Set a training focus → it appears in their recommended scenarios
> - Assign a lead → it shows up in their pipeline

This turns admin from "nice analytics dashboard" into "daily management cockpit."
