# /leads — Lead Pipeline Management Flow

## Overview

The CRM backbone. Every /support analysis auto-creates a lead here. Users can view leads, track engagement plans, add context updates, get AI advice, generate LinkedIn comments from screenshots, and manage pipeline status. This is where one-shot analysis becomes ongoing deal management.

**Effort Score Target**: 1-3 actions (open list → tap lead → take action)
**Time to Value**: <2s for list, <1s per action

---

## User Stories

```gherkin
Feature: Lead Pipeline Management via /leads
  As a partnership manager juggling multiple prospects
  I want a quick view of my pipeline with actionable next steps
  So that no deal falls through the cracks

  Scenario: View Pipeline
    Given I have analyzed prospects via /support
    When I run /leads
    Then I see a summary of my pipeline by status
    And a paginated list of leads with name, status, and photo indicators
    And leads with engagement plans show a plan icon

  Scenario: View Lead Detail
    Given I'm viewing my lead list
    When I tap a lead
    Then I see their full profile: name, title, company, status, date
    And analysis highlights (prospect type, seniority, buying signal)
    And strategy summary (top 3 principles)
    And web research summary (if available)
    And engagement plan progress (X/Y steps done)
    And action buttons: Refresh, View Plan, Add Update, Get Advice, Comment on Post

  Scenario: View and Toggle Engagement Plan
    Given I'm viewing a lead with an engagement plan
    When I tap "View Plan"
    Then I see all engagement steps with timing and suggested text
    And I can tap any step to toggle it done/pending
    And the plan progress updates in real-time

  Scenario: Add Context Update
    Given I'm viewing a lead
    When I tap "Add Update" and type "They accepted my connection request"
    Then the update is saved to the activity log
    And AI generates context-aware advice based on all lead data
    And I see the advice immediately

  Scenario: Generate LinkedIn Comment
    Given I'm viewing a lead
    When I tap "Comment on Post" and send a screenshot
    Then AI generates 2-3 engaging comment options
    And saves the interaction to the activity log

  Scenario: Get AI Advice
    Given I'm viewing a lead
    When I tap "Get Advice"
    Then AI reviews all context (analysis, research, plan, history)
    And provides fresh next-steps assessment

  Scenario: Delete Lead (mistake cleanup)
    Given I'm viewing a lead that was created by mistake
    When I tap "Delete" and confirm
    Then the lead is permanently removed from my pipeline
    And I return to the lead list

  Scenario: Update Lead Status
    Given I'm viewing a lead
    When I tap a status button (e.g., "Reached Out", "Meeting Booked")
    Then the status updates immediately
    And the detail view refreshes with new status

  Scenario: Empty Pipeline
    Given I have no leads yet
    When I run /leads
    Then I see a friendly empty state explaining how to create leads
    And a clear call-to-action to use /support

  Scenario: Refresh Lead Detail
    Given I'm viewing a lead whose enrichment is still running
    When I tap "Refresh"
    Then the detail view reloads with any new data (research, plan)
```

---

## User Flow

```mermaid
flowchart TD
    A[/leads] --> B{Has leads?}
    B -->|No| C[Empty state + CTA to /support]
    B -->|Yes| D[Pipeline summary + Lead list]
    D -->|Tap lead| E[Lead Detail View]
    D -->|Pagination| D
    E -->|Refresh| E
    E -->|View Plan| F[Engagement Plan Steps]
    E -->|Add Update| G[Text input mode → AI advice]
    E -->|Get Advice| H[AI generates fresh advice]
    E -->|Comment on Post| I[Screenshot mode → Comment options]
    E -->|Status button| J[Update status → Refresh detail]
    E -->|Delete| K[Confirmation → Delete → Back to list]
    E -->|Back to List| D
    F -->|Toggle step| F
    F -->|Back to Lead| E
    G -->|Send text| G2[Save + Show AI advice]
    G -->|/cancel| E
    I -->|Send photo| I2[Generate comments]
    I -->|/cancel| E
```

---

## Pain Points

| # | Pain | Severity | Impact |
|---|------|----------|--------|
| P1 | "Unknown Prospect" shown when name extraction fails | HIGH | Useless CRM entry |
| P2 | No way to delete mistaken/test leads | HIGH | Pipeline cluttered with junk |
| P3 | Web research shows "pending..." indefinitely if enrichment failed silently | MEDIUM | User keeps refreshing with no result |
| P4 | Empty `{}` shown in analysis/strategy sections | MEDIUM | Looks broken |
| P5 | Long lead detail text gets truncated | LOW | User misses info at bottom |
| P6 | No way to manually edit lead name/company | LOW | Can't fix extraction errors |

---

## Wishes

| # | Wish | Delight Factor |
|---|------|---------------|
| W1 | Delete button for mistake cleanup | Essential hygiene |
| W2 | Lead name shown in list with company and a recent activity indicator | Quick scan of what needs attention |
| W3 | "Needs attention" badge on leads with overdue followups | Proactive pipeline management |
| W4 | Inline quick-status update from list view (swipe or long-press) | Faster pipeline management |
| W5 | Export lead to CRM / share via message | Bridge to external tools |

---

## LazyFlow Improvements (Implemented)

1. **Delete lead**: Confirmation-guarded delete button on lead detail
2. **Better name display**: Fallback to "Prospect #ID" instead of "Unknown Prospect"
3. **Research status clarity**: Show "No research available" instead of infinite "pending..." when enrichment is done but empty
4. **Refresh button**: Already added — lets user check enrichment progress
5. **Plan progress in list**: Icon indicator for leads with/without plans
