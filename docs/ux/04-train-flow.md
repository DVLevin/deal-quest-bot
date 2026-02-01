# /train — Random Practice Mode Flow

## Overview

The gym. Users get random sales scenarios from a pool of 20, practice responding, and receive scored feedback. Scenarios never repeat until all 20 are exhausted, then the pool resets. Quick, low-commitment practice between calls.

**Effort Score Target**: 1 action (respond to scenario)
**Time to Value**: <3s to get a scenario, <30s for feedback

---

## User Stories

```gherkin
Feature: Random Sales Practice via /train
  As a partnership manager with 5 minutes between calls
  I want quick practice scenarios I can answer fast
  So that I stay sharp without committing to a full lesson

  Scenario: Start Training
    Given I run /train
    When a scenario loads
    Then I see: persona, situation, difficulty
    And the remaining count (e.g., "14/20 unseen")
    And a prompt to respond (text or voice)

  Scenario: Answer and Get Feedback
    Given I'm viewing a scenario
    When I send my response (text or voice)
    Then I receive a scored evaluation with tips
    And two buttons: "Next Scenario" and "View Stats"

  Scenario: Chain Practice
    Given I've received feedback
    When I tap "Next Scenario"
    Then a new unseen scenario loads immediately
    And the remaining count decrements

  Scenario: Pool Exhaustion
    Given I've completed all 20 scenarios
    When I tap "Next Scenario"
    Then the pool resets automatically
    And I'm told "All 20 completed! Pool reset — round 2!"
    And a fresh scenario loads

  Scenario: View Stats Inline
    Given I've received feedback
    When I tap "View Stats"
    Then I see a compact stats summary inline
    And a button to return to training

  Scenario: Cancel Mid-Scenario
    Given I'm in the middle of a scenario
    When I type /cancel
    Then I exit training mode cleanly
```

---

## User Flow

```mermaid
flowchart TD
    A[/train] --> B{Unseen scenarios left?}
    B -->|Yes| C[Load random unseen scenario]
    B -->|No| D[Reset pool + notify]
    D --> C
    C --> E[Show scenario prompt]
    E -->|Text response| F[Evaluate]
    E -->|Voice response| G[Transcribe → Evaluate]
    E -->|/cancel| H[Exit training mode]
    F --> I[Show feedback + score + XP]
    G --> I
    I -->|Next Scenario| B
    I -->|View Stats| J[Show inline stats summary]
    J -->|Back to Training| B
```

---

## Pain Points

| # | Pain | Severity | Impact |
|---|------|----------|--------|
| P1 | "View Stats" button just says "use /stats" — dead-end | FIXED | Inline stats now shown directly |
| P2 | No retry option for failed scenarios | FIXED | "Retry This One" button added to feedback |
| P3 | No /cancel during scenario answering | MEDIUM | Stuck if interrupted |
| P4 | Pool reset message is confusing — unclear what "reset" means | LOW | Mild confusion |
| P5 | No difficulty filtering — can't choose easy/hard scenarios | LOW | One-size-fits-all |

---

## Wishes

| # | Wish | Delight Factor |
|---|------|---------------|
| W1 | Inline stats after feedback (avg score, streak, improvement) | Instant gratification |
| W2 | "Retry this one" button alongside "Next" | Targeted improvement |
| W3 | Difficulty indicator with color (green/yellow/red) | Sets expectations |
| W4 | Speed bonus XP for fast responses | Gamification |
| W5 | Weekly challenge: "Beat your average this week" | Engagement hook |

---

## LazyFlow Improvements (Implemented)

1. **Stats button fix**: Shows compact inline stats instead of dead-end message
2. **Cancel support**: /cancel works during `answering_scenario` state
3. **Better pool reset messaging**: Clear "Round 2 begins!" framing
4. **Retry button**: "Retry This One" button alongside Next Scenario + View Stats
5. **Difficulty filter**: Easy / Medium / Hard / Random picker before scenario selection
6. **Dynamic scenarios**: Generated scenarios from casebook + company knowledge expand the pool beyond static 20
7. **User response storage**: Answers stored in attempts for cross-team analysis
