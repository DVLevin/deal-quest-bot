---
phase: 12-scheduling-and-reminder-infrastructure
verified: 2026-02-05T08:02:38Z
status: passed
score: 4/4 must-haves verified
---

# Phase 12: Scheduling & Reminder Infrastructure Verification Report

**Phase Goal:** Engagement plans become executable -- every plan step has a concrete due date, a scheduler polls for due reminders, and new plans automatically generate reminder rows

**Verified:** 2026-02-05T08:02:38Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | When a lead's engagement plan is generated, scheduled_reminders rows are automatically created with concrete due_at timestamps | ✓ VERIFIED | schedule_plan_reminders() called in support.py _background_enrich_lead() after plan generation (line 479), creates rows via reminder_repo.create() |
| 2 | The engagement plan prompt produces delay_days integer for each step, and timing parser computes due dates from plan creation time | ✓ VERIFIED | prompts/engagement_plan.md includes delay_days in output format (lines 39, 49) and rules 8-10. parse_step_due_date() prioritizes delay_days field, falls back to timing regex, then 3-day default |
| 3 | The polling scheduler runs every 15 minutes, finds due reminders, and sends basic notification to the user | ✓ VERIFIED | start_plan_scheduler() in main.py (line 193), 15-min interval (PLAN_CHECK_INTERVAL = 900s), _process_due_plan_reminders() queries due reminders and sends Markdown messages |
| 4 | Duplicate reminders are prevented -- restarting the bot does not re-send reminders already dispatched | ✓ VERIFIED | Duplicate guard at line 139-146 checks last_reminded_at < PLAN_CHECK_INTERVAL. Optimistic update at line 151 calls mark_reminded() BEFORE sending message |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `insforge/migrations/002_scheduled_reminders.sql` | Table creation with indexes, RLS, grants | ✓ VERIFIED | 59 lines, CREATE TABLE with 13 columns, 3 indexes (polling partial, lead, telegram), RLS enabled, service role + authenticated policies, grants to anon |
| `bot/storage/models.py` | ScheduledReminderModel Pydantic model | ✓ VERIFIED | Class exists at line 156 with 13 fields matching schema, all typed correctly |
| `bot/storage/repositories.py` | ScheduledReminderRepo class | ✓ VERIFIED | Class exists at line 513 with 8 methods: create, get_due_reminders (with defensive fallback), cancel_pending_for_lead, mark_reminded, update_status, delete_for_lead, get_for_lead, get_by_lead_and_step |
| `prompts/engagement_plan.md` | Updated prompt with delay_days field | ✓ VERIFIED | delay_days in JSON output examples (lines 39, 49), rules 8-10 define field semantics, monotonic rule, typical pacing |
| `bot/services/plan_scheduler.py` | Timing parser, scheduling function, polling loop | ✓ VERIFIED | 215 lines, 6 regex patterns + delay_days primary + 3-day default, schedule_plan_reminders(), _process_due_plan_reminders() with duplicate guard + optimistic update, start_plan_scheduler() |
| `bot/handlers/support.py` | Wiring into _background_enrich_lead | ✓ VERIFIED | Import at line 39, schedule_plan_reminders() call at line 479 after plan generation, reminder_repo passed through DI |
| `bot/handlers/leads.py` | Reminder sync on step toggle and cascade delete | ✓ VERIFIED | Step toggle syncs at line 525-533 (get_by_lead_and_step, update_status), delete cascades at line 931-936 (delete_for_lead) |
| `bot/main.py` | Plan scheduler background task startup | ✓ VERIFIED | ScheduledReminderRepo init at line 83, added to workflow_data, start_plan_scheduler() at line 193 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| bot/storage/repositories.py | bot/storage/models.py | import ScheduledReminderModel | ✓ WIRED | Import exists at line 18 in repositories.py |
| bot/storage/repositories.py | bot/storage/insforge_client.py | InsForgeClient for PostgREST queries | ✓ WIRED | self.client pattern used in all 8 repo methods |
| bot/handlers/support.py | bot/services/plan_scheduler.py | import and call schedule_plan_reminders | ✓ WIRED | Import at line 39, call at line 479 with all required params |
| bot/main.py | bot/services/plan_scheduler.py | import start_plan_scheduler and create_background_task | ✓ WIRED | Import at line 27, background task created at line 193 |
| bot/services/plan_scheduler.py | bot/storage/repositories.py | ScheduledReminderRepo for all DB operations | ✓ WIRED | reminder_repo parameter passed to all functions, methods called (get_due_reminders, mark_reminded, update_status) |
| bot/handlers/leads.py | bot/storage/repositories.py | ScheduledReminderRepo for step toggle and delete cascade | ✓ WIRED | reminder_repo parameter added, get_by_lead_and_step at line 528, update_status at line 531, delete_for_lead at line 934 |

### Requirements Coverage

| Requirement | Status | Supporting Truths |
|-------------|--------|-------------------|
| SCHED-V20-01: scheduled_reminders table with per-step reminder rows | ✓ SATISFIED | Truth 1 (rows created), migration SQL verified |
| SCHED-V20-02: Timing parser extracts delay_days with regex fallback | ✓ SATISFIED | Truth 2 (parser logic verified) |
| SCHED-V20-03: Plan-to-reminders wiring on engagement plan generation | ✓ SATISFIED | Truth 1 (schedule_plan_reminders wired in support.py) |
| SCHED-V20-04: Polling scheduler with duplicate guard | ✓ SATISFIED | Truth 3, Truth 4 (15-min polling + duplicate prevention) |
| SCHED-V20-05: Enhanced engagement plan prompt with delay_days | ✓ SATISFIED | Truth 2 (prompt includes delay_days + rules) |

### Anti-Patterns Found

None detected. All code is substantive with proper error handling, logging, and defensive patterns (PostgREST filter fallback, try/except wrappers, rate limiting).

### Human Verification Required

#### 1. End-to-End Reminder Flow

**Test:** Create a new lead via /support, wait 15+ minutes, verify reminder notification arrives in Telegram

**Expected:** 
- After support analysis completes, scheduled_reminders rows exist in database
- After 15 minutes (or manually trigger scheduler), bot sends Telegram message with lead name, step description, and /leads CTA
- Reminder status changes from "pending" to "sent"
- No duplicate messages on bot restart

**Why human:** Requires running bot, creating real lead, waiting for polling cycle, observing Telegram messages

#### 2. Step Toggle Sync

**Test:** In /leads detail view, toggle an engagement step to "done", verify corresponding scheduled_reminders row updates

**Expected:**
- Toggling step to "done" via inline button changes scheduled_reminders.status to "completed"
- Toggling back to "pending" changes status back
- UI reflects changes immediately

**Why human:** Requires TMA interaction + database inspection to verify sync

#### 3. Lead Delete Cascade

**Test:** Delete a lead that has pending reminders, verify reminders are also deleted

**Expected:**
- Lead deletion removes all scheduled_reminders rows for that lead_id
- No orphaned reminders remain in database
- Scheduler doesn't attempt to send reminders for deleted leads

**Why human:** Requires database inspection before/after delete operation

#### 4. Timing Parser Edge Cases

**Test:** Create leads with various delay_days values (0, 1, 7, 14) and timing strings ("Day 3", "immediately", "2 weeks later")

**Expected:**
- delay_days takes precedence over timing string
- Regex patterns correctly parse timing strings when delay_days missing
- Default 3-day spacing applies when both are missing
- due_at timestamps are computed correctly from base_date

**Why human:** Requires testing multiple engagement plan variations and verifying computed due_at timestamps

---

## Verification Summary

Phase 12 goal is **ACHIEVED**. All 4 observable truths are verified:

1. ✓ Engagement plans automatically create scheduled_reminders rows with concrete due_at timestamps
2. ✓ Timing parser correctly computes due dates from delay_days (primary), timing string (fallback), or 3-day default
3. ✓ Polling scheduler runs every 15 minutes and sends basic Telegram notifications for due reminders
4. ✓ Duplicate reminders prevented via last_reminded_at guard and optimistic update before send

All 8 required artifacts exist, are substantive (59-215 lines each), and are properly wired into the application. All 6 key links verified. All 5 phase requirements satisfied.

The infrastructure is ready for Phase 14 (Reminder UX enhancements: rich messages, Done/Snooze/Skip buttons, escalation logic).

**User action required:** Execute `insforge/migrations/002_scheduled_reminders.sql` via InsForge dashboard SQL editor to create the scheduled_reminders table in production.

---

_Verified: 2026-02-05T08:02:38Z_
_Verifier: Claude (gsd-verifier)_
