# /settings — Account Management Flow

## Overview

The control panel. Users manage their AI provider, API keys, model selection, and account lifecycle (reset/delete). Used rarely but must be rock-solid and safe — destructive actions need proper guarding.

**Effort Score Target**: 2-3 actions (open → select action → confirm)
**Time to Value**: <3s for viewing, <10s for changes

---

## User Stories

```gherkin
Feature: Account Settings via /settings
  As a user who needs to change my AI provider or manage my account
  I want a clear settings menu with safe destructive actions
  So that I can make changes without fear of accidental data loss

  Scenario: View Current Settings
    Given I run /settings
    Then I see my current provider, model, XP, and level
    And a menu with: Switch Provider, Update Key, Change Model, Reset, Delete, Close

  Scenario: Switch Provider
    Given I'm in settings
    When I tap "Switch Provider" and select "Claude API"
    Then I'm prompted for my API key with clear instructions
    When I paste my key
    Then it's validated, encrypted, and stored
    And I see confirmation with the new provider shown

  Scenario: Change Model (OpenRouter only)
    Given I'm using OpenRouter
    When I tap "Change Model"
    Then I see available models with descriptions
    When I select one
    Then it's applied immediately with confirmation

  Scenario: Reset Progress (Dangerous)
    Given I want to start fresh
    When I tap "Reset Progress"
    Then I see a confirmation warning explaining what will be lost
    When I confirm
    Then XP, level, and streak are reset to defaults

  Scenario: Delete Account (Dangerous)
    Given I want to delete everything
    When I tap "Delete Account"
    Then I see a serious warning about permanent data loss
    When I confirm
    Then all my data is deleted and I'm told to use /start to re-register
```

---

## User Flow

```mermaid
flowchart TD
    A[/settings] --> B[Show current config + menu]
    B -->|Switch Provider| C[Select provider → Enter key → Validate → Done]
    B -->|Update Key| D[Enter key → Validate → Done]
    B -->|Change Model| E[Select model → Done]
    B -->|Reset Progress| F[Warning → Confirm → Reset]
    B -->|Delete Account| G[Warning → Confirm → Delete all]
    B -->|Close| H[Remove message]
    C --> B
    D --> B
    E --> B
    F --> B
    G --> I[Goodbye message]
```

---

## Pain Points

| # | Pain | Severity | Impact |
|---|------|----------|--------|
| P1 | Reset/Delete have only single confirmation — too easy to accident | MEDIUM | Potential data loss |
| P2 | Model selection shows for Claude users but only works for OpenRouter | LOW | Confusing |
| P3 | After key update, no confirmation of which provider/model is active | LOW | Uncertainty |

---

## Wishes

| # | Wish | Delight Factor |
|---|------|---------------|
| W1 | "Change Model" hidden for Claude users | Cleaner interface |
| W2 | Key validation shows which models are available for the key | Trust building |
| W3 | Usage stats (total API calls, estimated cost) | Transparency |

---

## LazyFlow Improvements

Settings is low-frequency — minimal changes needed. Focus on safety:
1. Destructive actions already have confirmation
2. Model button visibility could be provider-aware (future)
