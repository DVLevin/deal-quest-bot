# /start — Onboarding Flow

## Overview

First impression. Gets new users from zero to productive in 30 seconds. Two paths: Quick Setup (shared team key) and Custom Setup (own API key). After setup, guides user to their first action.

**Effort Score Target**: 1-2 actions (tap Quick Setup → choose first action)
**Time to Value**: <30s

---

## User Stories

```gherkin
Feature: New User Onboarding via /start
  As a new GetDeal.ai partnership manager
  I want to get started immediately without technical setup
  So that I can focus on selling, not configuration

  Scenario: Quick Setup (Recommended)
    Given I run /start for the first time
    When I see the welcome message
    And I tap "Quick Setup (Recommended)"
    Then my account is created with the shared team API key
    And I see a success message with all available commands
    And I'm asked "What would you like to do first?"
    And I see: Start Learning, I Have a Deal, Jump Into Practice

  Scenario: Custom Setup
    Given I prefer to use my own API key
    When I tap "Use My Own API Key"
    Then I choose between OpenRouter (free) and Claude API (premium)
    And I receive clear instructions for getting an API key
    When I paste my key
    Then it's validated and encrypted
    And I see the same success + first action prompt

  Scenario: Returning User
    Given I've already completed setup
    When I run /start again
    Then I see a "Welcome back!" message
    And a list of available commands (no re-onboarding)

  Scenario: First Action Selection
    Given I've completed setup
    When I tap "Start Learning"
    Then I'm guided to use /learn
    When I tap "I Have a Deal to Work On"
    Then I'm guided to use /support
    When I tap "Jump Into Practice"
    Then I'm guided to use /train
```

---

## User Flow

```mermaid
flowchart TD
    A[/start] --> B{Existing user?}
    B -->|Yes| C[Welcome back + command list]
    B -->|No| D[Welcome message + setup options]
    D -->|Quick Setup| E[Create account with shared key]
    D -->|Custom Setup| F[Choose provider]
    F -->|OpenRouter| G[Enter API key]
    F -->|Claude API| G
    G --> H[Validate + encrypt + store]
    H --> I[Success + first action menu]
    E --> I
    I -->|Start Learning| J[Guide to /learn]
    I -->|Have a Deal| K[Guide to /support]
    I -->|Practice| L[Guide to /train]
```

---

## Pain Points

| # | Pain | Severity | Impact |
|---|------|----------|--------|
| P1 | Post-onboarding buttons just say "use /command" — no deep link | FIXED | Buttons now directly trigger the target flow |
| P2 | No /leads mentioned in welcome-back message (was missing, now fixed) | FIXED | Users didn't know about pipeline |

---

## Wishes

| # | Wish | Delight Factor |
|---|------|---------------|
| W1 | Post-onboarding buttons directly trigger the command flow | Zero friction start |
| W2 | Personalized welcome based on time of day ("Good morning, let's close some deals!") | Warm touch |
| W3 | Onboarding flow shows a 15-second demo animation of what the bot does | Instant understanding |

---

## LazyFlow Improvements (Implemented)

1. **Welcome-back includes /leads**: Users now see the full command list including pipeline management
2. **Direct flow triggers**: Post-onboarding buttons (Start Learning, I Have a Deal, Practice) now directly open their respective flows instead of dead-end messages
