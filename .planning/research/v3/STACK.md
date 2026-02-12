# Technology Stack -- v3.0 Additions

**Project:** Deal Quest v3.0 -- Prospect Discovery & UX Evolution
**Researched:** 2026-02-12
**Scope:** NEW capabilities only. Existing stack (React 18, Vite 7, Tailwind 4, aiogram 3, InsForge, React Query, Zustand, etc.) is validated and unchanged.

---

## 1. LinkedIn Prospect Search Integration

### The Problem

The TMA needs to call an external REST API at `http://13.61.184.191:8000/api/people/search` (POST with JSON body). This is a third-party server that almost certainly does not set `Access-Control-Allow-Origin` headers, which means **direct browser fetch will fail with CORS errors**.

### Recommended: InsForge Edge Function Proxy

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| InsForge Edge Function | Deno 2.x runtime | Proxy LinkedIn search API calls | Server-to-server calls bypass CORS entirely. Follows existing `verify-telegram` and `db-proxy` pattern. No new dependencies needed. |

**Confidence:** HIGH -- this is the established pattern in the codebase.

**How it works:**

1. TMA calls InsForge edge function `linkedin-search` via the existing `@insforge/sdk` client
2. Edge function receives search params, calls `http://13.61.184.191:8000/api/people/search` server-side using Deno `fetch()`
3. Edge function returns results to TMA with proper CORS headers

**Why NOT direct browser fetch:**
- The LinkedIn search microservice is a bare HTTP server on a raw IP -- it will not have CORS headers
- Even if CORS were added, the endpoint is HTTP not HTTPS, which Telegram WebView may block (mixed content)
- Edge function proxy also provides a security boundary (can add rate limiting, validate auth)

**Why NOT a Vite dev proxy:**
- Only works in development. Production TMA is a static SPA served by `serve`
- Does not solve the real deployment problem

### New Edge Function: `linkedin-search`

```typescript
// functions/linkedin-search/index.ts
// Pattern: identical to existing db-proxy.js and verify-telegram/index.ts
module.exports = async function (request: Request) {
  // CORS headers (same pattern as verify-telegram)
  // Parse request body: { keywords, company_keywords, count }
  // fetch("http://13.61.184.191:8000/api/people/search", { method: "POST", ... })
  // Return proxied response
};
```

### TMA-Side: No New Libraries

Use the existing `getInsforge().functions.invoke('linkedin-search', { body })` pattern or a simple `fetch()` to the edge function URL. React Query mutation hook wraps the call.

| Library | Status | Notes |
|---------|--------|-------|
| `@insforge/sdk` | ALREADY INSTALLED | `.functions.invoke()` for edge function calls |
| `@tanstack/react-query` | ALREADY INSTALLED | `useMutation` for search, `useQuery` for cached results |
| `fetch` | BROWSER NATIVE | Alternative to SDK invoke if simpler |

**No new npm packages needed for LinkedIn search.**

---

## 2. Browser Voice Recording in TMA

### The Problem

Users need to record voice input anywhere text input exists in the TMA (lead notes, support context, etc.), with the audio sent to the bot's existing AssemblyAI transcription pipeline for speech-to-text.

### Platform Compatibility Assessment

| Platform | getUserMedia (audio) | MediaRecorder | Notes |
|----------|---------------------|---------------|-------|
| Telegram iOS | YES | YES | iOS WKWebView grants microphone permission via system prompt |
| Telegram Android | LIKELY YES | LIKELY YES | Known issues are camera-specific (Issue #681), not microphone. Android WebView supports getUserMedia for audio when RECORD_AUDIO permission is granted by the host app. Telegram grants this. |
| Telegram Desktop | YES | YES | Chromium-based, full Web API support |
| web.telegram.org | YES | YES | Standard browser environment |

**Confidence:** MEDIUM -- Camera bugs on Android are documented but microphone access is a separate permission path. The GitHub issues (#681, #748) specifically mention camera/video problems, NOT audio. Testing on real devices is required to confirm.

### Recommended: Custom `useVoiceRecorder` Hook (No Library)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| MediaRecorder API | Browser native | Audio capture | Standard Web API, no dependency needed |
| getUserMedia API | Browser native | Microphone access | Standard Web API, supported in Telegram WebView |
| Custom `useVoiceRecorder` hook | N/A | React integration | ~60 lines of code. Avoids stale dependency (react-audio-voice-recorder last updated Sept 2023). Full control over output format and error handling. |

**Why NOT `react-audio-voice-recorder` (v2.2.0):**
- Last published September 2023 (over 2 years stale)
- Only 9,358 weekly downloads -- not widely adopted
- The hook API is trivial to replicate (~60 lines)
- We need precise control over MIME type (`audio/webm;codecs=opus`) for AssemblyAI compatibility
- No need for the component -- we build our own UI with Tailwind

**Why NOT `react-media-recorder`:**
- Larger scope than needed (video, screen recording)
- Same staleness concern
- Unnecessary abstraction for a simple audio-only use case

### Audio Format: WebM/Opus

| Format | Browser Default | AssemblyAI Support | File Size |
|--------|----------------|-------------------|-----------|
| `audio/webm;codecs=opus` | YES (Chrome/Android default) | YES (`.webm` video and `.opus` audio both supported) | Small (~16kbps) |
| `audio/ogg;codecs=opus` | Firefox fallback | YES (`.ogg`, `.oga` supported) | Small |
| `audio/wav` | Safari fallback | YES (`.wav` supported) | Large (uncompressed) |

AssemblyAI supports all three formats. MediaRecorder default output on Chromium-based browsers (which Telegram WebView uses) is `audio/webm;codecs=opus`. This is ideal -- small files, fast upload, natively supported.

**AssemblyAI confirmed supported formats:** .3ga, .8svx, .aac, .ac3, .aif, .aiff, .alac, .amr, .ape, .au, .dss, .flac, .m4a, .m4b, .m4p, .m4r, .mp3, .mpga, .ogg, .oga, .mogg, .opus, .qcp, .tta, .voc, .wav, .wma, .wv, .webm, .mts, .m2ts, .ts, .mov, .mp2, .mp4, .m4v, .mxf, .flv.

**Confidence:** HIGH -- verified via AssemblyAI official documentation.

### Audio Upload Flow

The TMA records audio in the browser, then needs to get it transcribed. Two viable paths:

#### Option A: InsForge Storage + Bot Polling (RECOMMENDED)

```
TMA records audio (WebM blob)
  -> Upload to InsForge Storage (prospect-photos bucket, audio/ prefix)
  -> Insert transcription_requests row (lead_id, audio_key, status: pending)
  -> Bot poller picks up request
  -> Bot downloads audio from InsForge Storage
  -> Bot sends to AssemblyAI (existing TranscriptionService)
  -> Bot updates transcription_requests row (status: completed, text: "...")
  -> TMA polls for completion (same pattern as plan_requests / draft_requests)
```

**Why this approach:**
- Follows the EXACT pattern already used for plan generation and draft generation
- No new infrastructure needed -- reuses InsForge Storage (already has `prospect-photos` bucket)
- Bot already has AssemblyAI integration (`bot/services/transcription.py`)
- Async flow handles the 5-30 second transcription delay gracefully

#### Option B: Edge Function Direct to AssemblyAI

Not recommended because:
- Would require AssemblyAI API key in edge function secrets
- Edge function timeout limits may conflict with AssemblyAI polling (up to 60s)
- Duplicates transcription logic that already exists in the bot

### New Dependencies for Voice Recording: NONE

The entire voice recording feature uses browser-native APIs and existing infrastructure:

| Capability | Source | New Dependency? |
|------------|--------|----------------|
| Microphone access | `navigator.mediaDevices.getUserMedia()` | NO -- browser API |
| Audio recording | `MediaRecorder` API | NO -- browser API |
| Audio upload | InsForge Storage SDK | NO -- `@insforge/sdk` already installed |
| Transcription | AssemblyAI via bot | NO -- `bot/services/transcription.py` exists |
| Async polling | React Query `refetchInterval` | NO -- same as `useBotNotifications` pattern |

---

## 3. Bot Simplification (Role Modernization)

### The Problem

The bot needs to shift from a full-featured interaction platform to a notification hub + quick action gateway. This is a code architecture change, not a library change.

### Stack Impact: No New Dependencies

| Aspect | Current | v3.0 Change | New Deps? |
|--------|---------|-------------|-----------|
| Bot framework | aiogram 3.x | Same -- simplify handlers, not replace framework | NONE |
| LLM calls | anthropic, httpx/OpenRouter | Same -- fewer LLM calls from bot, more from TMA-triggered | NONE |
| Notifications | Bot sends Telegram messages | Same pattern, more notification types | NONE |
| Quick actions | Inline keyboards | Same -- streamline to fewer, more focused actions | NONE |
| Deep links | `t.me/bot?startapp=` | Use existing `tma_events` table for bot->TMA handoff | NONE |

### Relevant Existing Patterns

The bot already has the right infrastructure:
- `tma_events` table: TMA inserts events, bot polls and sends Telegram messages
- `plan_requests` / `draft_requests` tables: async work queue pattern
- `bot/handlers/` structure: each handler file is independent, easy to simplify

### Bot Simplification is Pure Refactoring

No new libraries. The work is:
1. Remove complex multi-step FSM flows from bot (move to TMA)
2. Add new notification types to the event poller
3. Simplify inline keyboard responses to "Open in App" deep links
4. Keep quick-reply commands (`/start`, `/help`, inline queries) lean

---

## 4. Team Collaboration Features

### The Problem

Need lead transfer/handoff between team members and a team activity feed. Must work within existing InsForge PostgREST backend.

### Stack Impact: Minimal -- Mostly Database + UI

| Feature | Implementation | New Deps? |
|---------|---------------|-----------|
| Lead transfer | New mutation hook + `lead_assignments` table (ALREADY EXISTS) | NONE |
| Transfer notifications | `tma_events` table insert (ALREADY EXISTS) | NONE |
| Team activity feed | New query hook on `lead_activity_log` table (ALREADY EXISTS) | NONE |
| Real-time updates | React Query polling (`refetchInterval`) | NONE |
| Team member list | Query `users` table, filter by team | NONE |

### Why NOT Real-Time WebSockets

InsForge may support Supabase-compatible Realtime subscriptions, but:
1. The existing codebase uses **polling everywhere** (10s intervals via `useBotNotifications`)
2. Polling is simpler, proven, and sufficient for a team of 5-20 people
3. Adding WebSocket subscriptions introduces connection management complexity
4. Activity feeds are not latency-sensitive (10s polling is fine)

**Confidence:** HIGH -- the team activity feed pattern is identical to the existing `ActivityFeed` component in admin, which already queries `attempts` table. The new feed queries `lead_activity_log` instead.

### Existing Infrastructure That Covers Team Features

| Table | Already Exists | Used For |
|-------|---------------|----------|
| `lead_assignments` | YES | Track who is assigned to which lead |
| `lead_activity_log` | YES | Log all actions on leads (notes, status changes, etc.) |
| `tma_events` | YES | Cross-platform event bus (TMA -> Bot notifications) |
| `users` | YES | Team member list with `first_name`, `username` |

### New Database Requirements

| Table/Column | Type | Purpose |
|-------------|------|---------|
| `lead_activity_log.activity_type = 'transfer'` | Existing column, new value | Log lead transfers |
| `lead_activity_log.activity_type = 'voice_note'` | Existing column, new value | Log voice-to-text notes |
| `transcription_requests` | NEW TABLE | Async voice transcription queue (mirrors `plan_requests` pattern) |

---

## Summary: What to Add vs What We Already Have

### NEW (to install/create)

| Item | Type | Purpose |
|------|------|---------|
| `functions/linkedin-search/index.ts` | Edge Function | Proxy LinkedIn search API (CORS bypass) |
| `useVoiceRecorder` hook | Custom React hook (~60 LOC) | Browser audio recording via MediaRecorder |
| `transcription_requests` table | DB migration | Async voice transcription queue |
| `linkedin-search` Edge Function secrets | Config | LinkedIn API endpoint URL (if configurable) |

### ALREADY HAVE (do NOT install)

| Item | Status | Notes |
|------|--------|-------|
| React 18 + Vite 7 | Installed | No upgrade needed |
| @tanstack/react-query ^5.90 | Installed | Mutations + polling for all new features |
| @insforge/sdk | Installed | Storage uploads, edge function calls, DB queries |
| Zustand ^5.0 | Installed | Voice recorder state, search state |
| Tailwind CSS 4 | Installed | All new UI components |
| lucide-react | Installed | Microphone icon, search icon, transfer icon |
| aiogram 3.x | Installed | Bot notification handlers |
| httpx | Installed | Bot-side HTTP calls |
| AssemblyAI (via httpx) | Implemented | `bot/services/transcription.py` |
| clsx + tailwind-merge + CVA | Installed | UI component patterns |
| `lead_assignments` table | Exists | Team assignment tracking |
| `lead_activity_log` table | Exists | Activity feed data |
| `tma_events` table | Exists | TMA -> Bot event bus |
| `prospect-photos` bucket | Exists | File storage (reuse for audio) |

### Explicitly NOT Adding

| Library | Why Not |
|---------|---------|
| `react-audio-voice-recorder` | Stale (2+ years), trivial to replicate, need precise format control |
| `react-media-recorder` | Over-scoped (video/screen), same staleness concern |
| `socket.io` / WebSocket client | Polling is sufficient, proven pattern in codebase |
| `axios` | `fetch` + InsForge SDK covers all HTTP needs |
| LinkedIn scraping library | Using external microservice, not scraping directly |
| Any audio encoding library | Browser MediaRecorder outputs webm/opus natively, AssemblyAI accepts it directly |

---

## Installation

```bash
# No new npm packages needed for v3.0 features
# All capabilities covered by existing stack + browser APIs + new edge function

# The only "installation" is deploying a new edge function:
# functions/linkedin-search/index.ts -> Deploy via InsForge dashboard/MCP

# And creating a new database table:
# insforge/migrations/0XX_transcription_requests.sql
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|-------------------|
| LinkedIn API proxy | InsForge Edge Function | Vite dev proxy | Only works in development, not production |
| LinkedIn API proxy | InsForge Edge Function | Direct browser fetch | CORS + mixed content (HTTP endpoint) |
| LinkedIn API proxy | InsForge Edge Function | Python bot proxy | Adds latency, bot is not an HTTP server |
| Voice recording | Custom hook (60 LOC) | react-audio-voice-recorder | Last updated Sept 2023, trivial API |
| Voice recording | Custom hook (60 LOC) | react-media-recorder | Over-scoped, unnecessary abstraction |
| Audio transcription | Bot poller + AssemblyAI | Edge function + AssemblyAI | Duplicates existing bot code, timeout risk |
| Audio transcription | Bot poller + AssemblyAI | Client-side transcription (Web Speech API) | Unreliable, no Telegram WebView guarantee |
| Activity feed | React Query polling (10s) | WebSocket/Realtime subscriptions | Complexity for no benefit at team scale |
| Team collaboration DB | InsForge PostgREST (existing tables) | Separate collaboration service | Over-engineering, existing tables suffice |

---

## Sources

### Verified (HIGH confidence)
- [AssemblyAI supported formats](https://support.assemblyai.com/articles/2616970375-what-audio-and-video-file-types-are-supported-by-your-api) -- Confirmed webm, opus, ogg all supported
- [MDN MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) -- Standard Web API docs
- [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) -- Microphone access API
- [MediaRecorder MIME types](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/mimeType) -- audio/webm;codecs=opus is default on Chromium
- Existing codebase: `functions/verify-telegram/index.ts`, `functions/db-proxy.js` -- Edge function proxy pattern
- Existing codebase: `bot/services/transcription.py` -- AssemblyAI integration
- Existing codebase: `packages/webapp/src/features/leads/hooks/useBotNotifications.ts` -- Async polling pattern

### Investigated (MEDIUM confidence)
- [Telegram Mini Apps WebView #681](https://github.com/Telegram-Mini-Apps/telegram-apps/issues/681) -- Camera issue on Android, NOT audio
- [Telegram Mini Apps WebView #748](https://github.com/Telegram-Mini-Apps/tma.js/issues/748) -- Video black screen on iOS, NOT audio
- [WebView microphone permissions guide](https://blog.silverpc.hu/2025/10/23/a-guide-to-permissions-how-can-i-access-the-microphone-via-a-webview/) -- General WebView audio guidance
- [react-audio-voice-recorder npm](https://www.npmjs.com/package/react-audio-voice-recorder) -- v2.2.0, 9K weekly downloads, last updated Sept 2023

### Needs Device Testing (LOW confidence)
- Telegram Android WebView microphone access -- No direct documentation confirming getUserMedia audio works in Telegram Android specifically. Known camera issues suggest caution, but audio uses a different permission path. **Must test on real Android device before committing to this approach.**
