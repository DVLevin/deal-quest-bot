# Onboarding & Activation Analysis

## Current State

### Onboarding Flow
1. User sends `/start` to bot
2. Chooses provider: Quick Setup (shared key) or Custom Setup (own key)
3. If custom: paste API key → validate → encrypt → store
4. Success message with command list
5. Action buttons: Start Learning, I Have a Deal, Practice

### What Works
- Shared team key eliminates friction for most users
- API key validation prevents broken setups
- Post-onboarding action buttons guide first interaction
- Deep link routing (`/start?startapp=...`) enables contextual entry

### What's Broken

#### 1. "What Is This?" Problem
**Problem:** A new user opens the bot and sees a welcome message with 6 commands. They don't understand *why* they should use this tool. There's no value demonstration before asking for commitment.

**Current first message:**
```
WELCOME TO DEAL QUEST!
Let's set you up in 2 minutes.
STEP 1: Choose Your AI Provider
```

**Better first message:**
```
DEAL QUEST: Your AI Sales Co-Pilot

Watch how Deal Quest works:
[Example: Send a prospect screenshot → get full closing strategy in 10 seconds]

Ready to try it yourself?
[Quick Setup (30 seconds)] [Tell me more]
```

**Recommendation:** Show a concrete example of the product's value *before* setup. A pre-recorded demo or a sample analysis that demonstrates the magic moment.

#### 2. API Key Friction (Even with Shared Key)
**Problem:** The shared team key path is a workaround. It works, but:
- Users don't understand *why* they need an API key
- The concept of "AI provider" is confusing for non-technical users
- If the shared key runs out of credits, all users break simultaneously
- No way to upgrade individual users to better models

**Recommendation:**
- **Short-term:** Rename "Quick Setup" to "Start Free" and hide the technical details entirely
- **Long-term:** Proxy mode where the bot uses a team-managed key transparently — users never see API keys, credits, or provider names. Admin manages the budget.

#### 3. No Activation Metric
**Problem:** There's no definition of "activated user." Is it:
- Completed onboarding? (too early)
- Ran first `/support`? (closer)
- Created first lead? (better)
- Completed first engagement plan step? (ideal)

Without an activation metric, you can't measure if onboarding improvements work.

**Recommendation:** Define activation as: **"User has analyzed at least one real prospect and completed at least one engagement plan step within 48 hours of signup."**

This is measurable (check `support_sessions` + `scheduled_reminders` for the user) and meaningful (the user has experienced the core value loop).

#### 4. No Re-Engagement for Dormant Users
**Problem:** If a user signs up, tries once, and never returns, nothing happens. No follow-up, no nudge, no "You have 3 stale leads."

**Recommendation:**
- **Day 1:** If user hasn't run `/support` within 24h, send: "Ready to analyze your first prospect? Just send a screenshot."
- **Day 3:** If user has leads but no completed steps: "You have X leads waiting. Tap to see today's actions."
- **Day 7:** If user is inactive: "Your streak is at 0. Quick 2-minute practice to get back on track?"
- **Day 30:** If still inactive: Final nudge with a compelling stat from active users.

---

## Activation Funnel (Current vs. Ideal)

### Current Funnel
```
Sign up → Choose provider → Paste key → See commands → ??? → Maybe use
```

### Ideal Funnel
```
Sign up → See value demo → One-tap setup → Guided first analysis →
First lead created → First step completed → ACTIVATED
```

### Key Changes
1. **Value before setup:** Show what the tool does before asking for commitment
2. **Setup in one tap:** Shared key with zero technical language
3. **Guided first interaction:** Walk through first `/support` with a sample prospect
4. **First win:** Celebrate first lead creation and first completed step
5. **Habit formation:** Daily nudges based on pipeline state

---

## Onboarding Improvements (Priority Order)

| # | Improvement | Effort | Impact |
|---|-----------|--------|--------|
| 1 | Value demo before setup | Low | HIGH — Show don't tell |
| 2 | Rename "Quick Setup" to "Start Free", hide technical details | Low | HIGH — Reduces drop-off |
| 3 | Define and track activation metric | Low | HIGH — Enables measurement |
| 4 | Guided first interaction (sample prospect walkthrough) | Medium | HIGH — Ensures first "aha" |
| 5 | Re-engagement nudge system | Medium | MEDIUM — Recovers dormant users |
| 6 | Proxy mode (admin manages API keys) | High | HIGH — Eliminates friction entirely |
