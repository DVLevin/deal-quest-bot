# Feature Landscape -- v3.0

**Domain:** Sales training TMA + Bot -- Prospect Discovery & UX Evolution
**Researched:** 2026-02-12

---

## Table Stakes

Features that v3.0 users expect. Missing = product feels incomplete given the stated goals.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| LinkedIn prospect search from TMA | Core v3.0 value prop -- find prospects without leaving the app | Medium | Edge function proxy + search UI + result cards |
| Search results -> lead creation | Natural flow: find prospect, add as lead | Low | Map search result fields to `lead_registry` columns |
| Voice-to-text input in lead notes | Users want fast note-taking, typing on mobile is slow | Medium | MediaRecorder + AssemblyAI async flow |
| Voice recording UI (mic button, waveform, timer) | Users need visual feedback during recording | Medium | Custom component, Tailwind-animated waveform bars |
| Bot notification for TMA actions | When TMA creates a lead or completes a transfer, bot confirms | Low | Extend existing `tma_events` pattern |
| Lead transfer between team members | Team workflow -- pass leads to the right person | Low | `lead_assignments` table already exists, add transfer mutation |
| Transfer notification to recipient | Recipient must know they received a lead | Low | `tma_events` insert triggers bot notification |
| Team activity feed | Managers/team need visibility into collective actions | Medium | Query `lead_activity_log` across all team members |

## Differentiators

Features that set the product apart. Not expected, but add significant value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| One-tap prospect-to-lead flow | Search -> tap result -> auto-create lead with LinkedIn data pre-filled | Low | Map `name`, `headline`, `company`, `location`, `image` to lead fields |
| Voice notes on engagement steps | Record context about completed steps instead of typing | Medium | Same voice recording infra, attached to plan steps |
| Smart search suggestions | Remember recent searches, suggest company keywords | Low | Zustand persisted state or localStorage |
| Activity feed filtering | Filter by activity type, team member, date range | Medium | Query params on `lead_activity_log` |
| Bot deep-link to specific lead | Bot notification includes "View in App" link that opens the right lead | Low | `t.me/bot?startapp=lead_{id}` pattern |
| Bulk lead transfer | Transfer multiple leads at once during role changes | Low | Loop over existing single-transfer mutation |
| Voice transcription preview | Show transcript before saving, allow edit | Low | Display text in textarea after transcription completes |

## Anti-Features

Features to explicitly NOT build in v3.0.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Real LinkedIn API integration (official) | LinkedIn API requires OAuth app approval, rate limits, legal complexity | Use the existing external microservice which handles this |
| In-browser speech recognition (Web Speech API) | Unreliable in WebView, no guaranteed support in Telegram | Use server-side AssemblyAI via existing bot infrastructure |
| Real-time WebSocket activity feed | Over-engineering for team size of 5-20 | 10-second polling via React Query is sufficient and proven |
| Bot as primary interface for new features | Contradicts v3.0 goal of shifting bot to notification role | Keep bot lean -- notifications + quick actions only |
| Voice-to-voice (TTS responses) | Scope creep, high complexity, unclear user value | Focus on voice-to-text input only |
| LinkedIn profile scraping from TMA | Legal risk, fragile, already solved by microservice | Use the search API microservice |
| Complex team permission system (roles, ACLs) | Premature complexity, current admin/member split is sufficient | Use existing `admin` check for manager features |

## Feature Dependencies

```
LinkedIn Search Edge Function -> LinkedIn Search UI -> Prospect-to-Lead Flow
Voice Recording Hook -> Voice Input Component -> Voice Notes on Leads
Voice Recording Hook -> Transcription Request Table -> Bot Transcription Poller
Lead Transfer Mutation -> Transfer Notifications -> Team Activity Feed
Bot Simplification -> Deep Link Navigation -> Bot-to-TMA Handoff
```

## MVP Recommendation

**Phase 1 -- Foundation:**
1. LinkedIn search edge function proxy (unblocks all search features)
2. Voice recording hook + basic UI (unblocks all voice features)
3. Transcription request table + bot poller (connects voice to text)

**Phase 2 -- Integration:**
4. LinkedIn search results page with prospect cards
5. Prospect-to-lead one-tap creation
6. Voice input on lead notes and support context

**Phase 3 -- Team:**
7. Lead transfer mutation + notification
8. Team activity feed
9. Bot simplification (reduce handlers, add deep links)

**Defer to v3.1+:**
- Bulk lead transfer
- Activity feed filtering by type/member
- Smart search suggestions
- Voice notes on engagement plan steps
