# Quick Wins: Low-Effort, High-Impact Improvements

These are changes that require minimal engineering effort but meaningfully improve the product experience. Each can be implemented in 1-3 hours.

---

## 1. Deal Closure Celebration + XP
**Current:** Marking a lead `closed_won` changes a badge color. That's it.
**Fix:** Award 500 XP on `closed_won`, trigger LevelUpOverlay animation, show confetti. One status check in the update handler + one XP mutation.
**Effort:** 1-2 hours
**Impact:** HIGH — Rewards the most important user action

## 2. "Start Free" Label Instead of "Quick Setup"
**Current:** Onboarding says "Quick Setup (shared team key)" which exposes technical details.
**Fix:** Rename to "Start Free" or "Team Account". Hide mention of API keys, shared keys, or providers. One string change + minor flow text updates.
**Effort:** 30 minutes
**Impact:** HIGH — Reduces onboarding confusion

## 3. Pipeline Summary on Leads Page
**Current:** Lead list shows cards. No aggregate view.
**Fix:** Add a compact status bar at top: `3 Active | 2 Stale | 1 Closed` using existing lead data from the list query.
**Effort:** 1-2 hours
**Impact:** HIGH — Instant pipeline awareness

## 4. Weak Area → Filtered Training Link
**Current:** WeakAreasCard "Practice" button goes to `/train` with no filtering.
**Fix:** Pass category/difficulty as URL params. Train page reads params and pre-selects difficulty filter.
**Effort:** 1 hour
**Impact:** MEDIUM — Makes training recommendations actionable

## 5. Smart Status Suggestion on Step Completion
**Current:** Completing engagement steps doesn't affect lead status.
**Fix:** When all "outreach" steps are done, show a toast: "All outreach steps complete. Move to 'Reached Out'?" with Yes/No. Uses existing step data + status mutation.
**Effort:** 2-3 hours
**Impact:** HIGH — Automates pipeline progression

## 6. "Done for Today" Summary
**Current:** After completing today's actions, nothing acknowledges the achievement.
**Fix:** When TodayActionsCard shows 0 remaining, display: "All caught up! You completed X actions today. Keep the momentum going." with a streak indicator.
**Effort:** 1 hour
**Impact:** MEDIUM — Positive reinforcement

## 7. Admin: Rep Detail View (Tap on Leaderboard Member)
**Current:** MemberLeaderboard shows names and XP. Tapping does nothing.
**Fix:** Tap on a member → show their recent attempts, scores, lead count, and active streak. Read-only, uses existing query hooks.
**Effort:** 2-3 hours
**Impact:** MEDIUM — Gives admins coaching insight

## 8. Outcome Tracking on Lead Closure
**Current:** `closed_won` / `closed_lost` have no metadata.
**Fix:** When closing, prompt: "What worked?" (won) or "What went wrong?" (lost) with quick-select options (pricing, timing, competition, relationship, other). Store as metadata in lead_activity.
**Effort:** 2-3 hours
**Impact:** HIGH — Creates data for training loop

## 9. First-Time User Guided Tour
**Current:** Post-onboarding shows 4 command buttons with no context.
**Fix:** For brand new users (0 XP, 0 leads), show a 3-step inline guide: "1. Send a prospect screenshot. 2. See the AI strategy. 3. Follow the plan." with a sample screenshot they can try.
**Effort:** 3 hours
**Impact:** HIGH — Ensures activation

## 10. Stale Lead Daily Digest
**Current:** Stale indicators exist on lead cards but no proactive notification.
**Fix:** Daily morning message (via existing followup_scheduler): "You have X leads that haven't been touched in 7+ days. [View stale leads]". Only sends if stale count > 0.
**Effort:** 1-2 hours
**Impact:** MEDIUM — Prevents pipeline decay

---

## Implementation Priority Matrix

```
             HIGH IMPACT
                 │
    ┌────────────┼────────────┐
    │   #1 #5    │  #3 #8 #9  │
    │  Closure   │  Pipeline   │
    │  + Status  │  + Tour     │
    │            │             │
LOW EFFORT──────┼──────HIGH EFFORT
    │            │             │
    │   #2 #4    │    #7       │
    │  Labels    │  Admin rep  │
    │  + Links   │  detail     │
    │            │             │
    └────────────┼────────────┘
                 │
             LOW IMPACT
```

**Start with:** #1, #2, #3, #5 (all < 2 hours, all HIGH impact)
**Then:** #8, #9, #4 (activation and training integration)
**Nice to have:** #6, #7, #10
