# Quick Task 008: Fix Engagement Plan Hallucinations

## Problem
Engagement plans hallucinate specific LinkedIn posts, article titles, reports, and content that don't exist.
The LLM invents things like "Comment on Bluevía's June 2025 post about..." or suggests sharing whitepapers
that were never mentioned in the research. User wants action-oriented steps ("go look, screenshot, we'll generate")
not content-specific hallucinations.

## Root Cause
Both `prompts/engagement_plan.md` and `prompts/strategist_agent.md` explicitly encourage specificity about
content the LLM cannot verify — rules like "Be specific — Reference actual topics from research" and examples
showing invented post titles and comment suggestions.

## Tasks

### Task 1: Rewrite engagement_plan.md with anti-hallucination rules
- Remove `content_share` action type (can't verify materials exist)
- Add CRITICAL RULES section with 6 anti-hallucination rules
- Change linkedin_comment steps to use null suggested_text (generated from screenshots)
- Add LinkedIn 200-char limit for connection requests
- Update examples to show action-oriented steps

### Task 2: Update strategist_agent.md engagement tactics
- Replace hallucination-encouraging engagement_tactics template
- Update JSON output example (comment_suggestion: null, action-oriented linkedin_actions)
- Fix "GOOD" example to remove invented post references
- Add rules 8 & 9: NEVER hallucinate content, NEVER suggest non-existent materials

## Files Modified
- `prompts/engagement_plan.md`
- `prompts/strategist_agent.md`
