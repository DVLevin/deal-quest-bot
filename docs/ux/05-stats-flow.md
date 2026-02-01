# /stats — Progress Dashboard Flow

## Overview

The scoreboard. A read-only snapshot of the user's progress across all modes: XP, level, learning track completion, training scenarios, recent performance, and lead pipeline. Motivational and informational.

**Effort Score Target**: 0 actions (auto-displays everything)
**Time to Value**: <2s

---

## User Stories

```gherkin
Feature: Progress Dashboard via /stats
  As a partnership manager who wants to track improvement
  I want a quick snapshot of all my progress
  So that I stay motivated and know where to focus

  Scenario: View Full Stats
    Given I run /stats
    Then I see a single formatted card with:
      | Section | Content |
      | Rank & Level | Title, level number, progress bar |
      | XP | Total XP and XP to next level |
      | Learning | Track completion (e.g., 2/4 levels) |
      | Training | Scenarios completed (e.g., 12/20) |
      | Performance | Last 10 attempts: avg score, best score |
      | Pipeline | Lead counts by status (if leads exist) |
      | Provider | Current AI provider |

  Scenario: Empty Stats (New User)
    Given I'm a new user with no activity
    When I run /stats
    Then I see default values (Level 1, 0 XP, 0/4 levels)
    And encouraging text to start with /learn or /train

  Scenario: Pipeline Section
    Given I have leads in my pipeline
    When I view stats
    Then I see lead counts grouped by status with icons
    And total lead count
```

---

## User Flow

```mermaid
flowchart TD
    A[/stats] --> B[Fetch user data + attempts + leads]
    B --> C[Format single stats card]
    C --> D[Display to user]
```

---

## Pain Points

| # | Pain | Severity | Impact |
|---|------|----------|--------|
| P1 | No buttons or actions — purely read-only | FIXED | Action buttons now trigger actual flows directly |
| P2 | No trends or comparison to previous performance | LOW | Can't see improvement |
| P3 | Pipeline section only appears if leads exist — inconsistent | LOW | Confusing layout shift |

---

## Wishes

| # | Wish | Delight Factor |
|---|------|---------------|
| W1 | "Your score improved 15% this week" trend line | Motivational boost |
| W2 | Quick action buttons: "Continue Learning", "Practice Now" | Bridge to next action |
| W3 | Leaderboard position among team members | Competitive motivation |

---

## LazyFlow Improvements (Implemented)

1. **Pipeline section always shown**: Shows "No leads yet — use /support to start" when empty
2. **Action buttons at bottom**: "Continue Learning" and "Quick Practice" to reduce dead-ends
3. **Direct flow triggers**: All 4 action buttons (Learn, Train, Support, Leads) now directly open the target flow instead of dead-end "use /command" messages
