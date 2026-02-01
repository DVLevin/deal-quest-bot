# /support — Deal Analysis Flow

## Overview

The core revenue-driving feature. Users paste a prospect situation (text, photo, or voice) and receive a full closing strategy with analysis, tactics, engagement plan, and draft outreach. Every analysis auto-creates a tracked lead.

**Effort Score Target**: 2 actions (send input → read output)
**Time to Value**: <60s for analysis, <30s more for enrichment

---

## User Stories

```gherkin
Feature: Deal Analysis via /support
  As a partnership manager with a hot prospect
  I want instant, actionable closing advice
  So that I can respond confidently without guessing

  Scenario: Photo Analysis (Primary Use Case)
    Given I'm in support mode
    When I send a LinkedIn screenshot of a prospect
    Then I receive structured analysis within 60 seconds
    And a lead is auto-created with the prospect's name
    And web research begins silently in the background
    And I see a button to view the lead's full profile

  Scenario: Text Analysis
    Given I'm in support mode
    When I describe a prospect situation in text
    Then I receive the same structured analysis
    And name/company are extracted from my description

  Scenario: Voice Analysis
    Given I'm in support mode
    When I send a voice message describing a prospect
    Then my voice is transcribed and shown back to me
    And the transcription is analyzed like text input

  Scenario: Regeneration
    Given I've received an analysis
    When I tap "Regenerate" or "More Aggressive" or "Shorter"
    Then I receive a fresh analysis with the requested modification

  Scenario: Lead Deduplication
    Given I analyze the same prospect twice
    When the system detects a name/company match
    Then it merges into the existing lead instead of creating a duplicate
    And I see "Updated existing lead" confirmation

  Scenario: Command Guard
    Given I'm in support mode
    When I accidentally type "/leasd" (typo)
    Then the bot suggests "/leads" instead of sending it to the LLM
    And exits support mode so I can retry the command
```

---

## User Flow

```mermaid
flowchart TD
    A[/support] -->|Bot prompts| B[Waiting for Input]
    B -->|Photo| C[Download + Encode + Analyze]
    B -->|Text| D{Guard Check}
    B -->|Voice| E[Transcribe + Analyze]
    D -->|Command/typo| F[Suggest correct command, exit]
    D -->|Too short <10 chars| G[Ask for more context]
    D -->|Valid text| H[Analyze]
    C --> I[Strategist Pipeline]
    E --> I
    H --> I
    I --> J[Extract Name/Company from Output]
    J --> K{Duplicate Lead?}
    K -->|Yes| L[Merge into existing lead]
    K -->|No| M[Create new lead]
    L --> N[Send Analysis + Buttons]
    M --> N
    N --> O[Background: Web Research + Plan]
    N --> P[User reads analysis]
    P -->|Regenerate| I
    P -->|Shorter/Aggressive| I
    P -->|Done| Q[Exit support mode]
    P -->|View Lead & Plan| R[/leads detail view]
```

---

## Pain Points

| # | Pain | Severity | Impact |
|---|------|----------|--------|
| P1 | Name extraction fails on photos — shows "Unknown Prospect" | HIGH | User loses trust in CRM capability |
| P2 | Web research returns garbage when no name extracted | HIGH | Lead detail looks broken |
| P3 | No progress indicator during 30-60s analysis wait | MEDIUM | User thinks bot is frozen |
| P4 | "View Lead & Plan" button is at the bottom, easy to miss | MEDIUM | Users don't discover lead tracking |
| P5 | Voice transcription errors have no recovery path | LOW | User must restart /support |
| P6 | Long analyses get truncated by Telegram's 4096 char limit | LOW | Strategy may be cut off |

---

## Wishes

| # | Wish | Delight Factor |
|---|------|---------------|
| W1 | Animated progress during analysis ("Analyzing prospect... Crafting strategy... Drafting outreach...") | Makes wait feel shorter |
| W2 | Auto-detect if photo is LinkedIn vs email vs business card and adjust analysis | "How did it know?!" moment |
| W3 | Show a mini lead card immediately after analysis (name, company, status) | Instant CRM feel |
| W4 | Voice notes trigger a richer flow ("I heard you mention Arta at Fund X...") | Conversational magic |
| W5 | Re-analyze button that keeps prior context | Iterative refinement |

---

## LazyFlow Improvements (Implemented)

1. **Better name extraction**: Parse `draft.message` for "Hi NAME —" pattern, check engagement_tactics, analysis fields
2. **Smart web research**: Skip photo placeholders, use analysis text as fallback, filter garbage responses
3. **Hint text after analysis**: Clear call-to-action pointing to /leads with explanation of what's generating
4. **Command guard**: Fuzzy-match mistyped commands, prevent sending to LLM
5. **Short input guard**: Prompt for more context if <10 chars
