# /learn — Structured Training Flow

## Overview

The education engine. Users work through sequential training levels that teach GetDeal.ai positioning, objection handling, buyer psychology, and closing techniques. Each level has a lesson + a scenario where users practice with simulated prospects. Progress is tracked with XP and scores.

**Effort Score Target**: 2 actions per cycle (read lesson → answer scenario)
**Time to Value**: <5s to start a lesson, <30s for feedback

---

## User Stories

```gherkin
Feature: Structured Sales Training via /learn
  As a new partnership manager learning the GetDeal.ai pitch
  I want guided lessons with practice scenarios
  So that I build skills progressively without information overload

  Scenario: Browse Levels
    Given I run /learn
    When the level selection loads
    Then I see Track 1: Foundations with 4 levels
    And each level shows: icon (locked/unlocked/completed), name, best score
    And I can only tap unlocked or completed levels

  Scenario: Read Lesson
    Given I tap an unlocked level
    When the lesson content loads
    Then I see the lesson title, content, and key points
    And a "Start Scenario" button at the bottom

  Scenario: Practice Scenario (Text)
    Given I've read a lesson and tapped "Start Scenario"
    When the scenario loads
    Then I see: persona name, their situation, difficulty level
    And a prompt to respond (text or voice)
    When I send my response as text
    Then I receive feedback with a score (0-100), analysis, and improvement tips
    And if score >= 60, the next level unlocks

  Scenario: Practice Scenario (Voice)
    Given I'm in a scenario
    When I send a voice message
    Then my voice is transcribed and shown back to me
    And the transcription is evaluated as my response

  Scenario: Retry Failed Scenario
    Given I scored below 60 on a scenario
    When I see the feedback
    Then I see a "Retry" button to try again
    And a "Back to Levels" button to browse other content

  Scenario: Complete All Levels
    Given I've completed all 4 levels in Track 1
    When I view /learn
    Then all levels show ✅ with best scores
    And future tracks (2-5) are shown as locked

  Scenario: Cancel Mid-Scenario
    Given I'm in the middle of answering a scenario
    When I type /cancel
    Then I exit the scenario without penalty
    And I can restart it later
```

---

## User Flow

```mermaid
flowchart TD
    A[/learn] --> B[Show Track 1 Levels]
    B -->|Tap unlocked level| C[Show Lesson Content]
    B -->|Tap locked level| D[Toast: Complete previous level first]
    C -->|Start Scenario| E[Show Scenario Prompt]
    E -->|Text response| F[Evaluate Response]
    E -->|Voice response| G[Transcribe → Evaluate]
    E -->|/cancel| B
    F --> H[Show Feedback + Score]
    G --> H
    H -->|Score >= 60| I[Unlock next level]
    H -->|Score < 60| J[Show Retry button]
    I --> K[Back to Levels or Retry]
    J --> K
    K -->|Retry| E
    K -->|Back to Levels| B
```

---

## Pain Points

| # | Pain | Severity | Impact |
|---|------|----------|--------|
| P1 | No escape hatch during scenario — stuck until you answer | HIGH | User feels trapped if interrupted |
| P2 | Voice transcription error = dead end, must restart /learn | MEDIUM | Frustrating for voice-first users |
| P3 | No indication of what the scenario tests before starting | MEDIUM | User doesn't know what to focus on |
| P4 | Lesson content may be long on mobile — no collapsible sections | LOW | Wall of text |
| P5 | Future tracks shown as locked with no unlock criteria | LOW | Feels incomplete |
| P6 | No way to review past answers or see improvement over time | LOW | Missed learning opportunity |

---

## Wishes

| # | Wish | Delight Factor |
|---|------|---------------|
| W1 | /cancel works during scenario to bail out | Essential safety hatch |
| W2 | Show "This scenario tests: objection handling" before starting | Sets expectations |
| W3 | After scoring, show side-by-side: "Your answer" vs "Ideal answer" | Powerful learning tool |
| W4 | Streak bonus XP for completing levels on consecutive days | Gamification hook |
| W5 | "Quick tip" notification between levels: one actionable insight | Ambient learning |

---

## LazyFlow Improvements (Implemented)

1. **Cancel support**: /cancel now works during `answering_scenario` state
2. **Better scenario intro**: Shows what skill the scenario tests
3. **Consistent back navigation**: "Back to Levels" always available in feedback
4. **Ideal response button**: "Show Ideal Response" button in feedback shows the model answer + common mistakes
5. **User response storage**: Answers stored in attempts for cross-team analysis
