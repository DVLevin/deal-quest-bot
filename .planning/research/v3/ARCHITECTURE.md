# Architecture Patterns -- v3.0

**Domain:** Sales training TMA + Bot -- Prospect Discovery & UX Evolution
**Researched:** 2026-02-12

---

## Current Architecture (Relevant Parts)

```
[Telegram User]
    |
    +---> [Bot (aiogram 3)]  <--- polls ---> [InsForge DB]
    |         |                                    ^
    |         v                                    |
    |    [AssemblyAI]                              |
    |    [OpenRouter/Claude]                       |
    |                                              |
    +---> [TMA (React SPA)] --- queries/mutates -> [InsForge DB]
              |                                    |
              +--- uploads ----------------------> [InsForge Storage]
              |
              +--- auth -----------------------> [Edge Fn: verify-telegram]
```

## v3.0 Architecture Additions

```
[Telegram User]
    |
    +---> [Bot (aiogram 3)]  <--- polls ---> [InsForge DB]
    |         |                                    ^
    |         +--- transcribes ------> [AssemblyAI] |
    |         |                                    |
    |         +--- sends notifications             |
    |                                              |
    +---> [TMA (React SPA)] --- queries/mutates -> [InsForge DB]
              |                                    |
              +--- records audio (MediaRecorder)   |
              |     |                              |
              |     +--- uploads webm ----------> [InsForge Storage]
              |     +--- inserts request --------> [transcription_requests]
              |                                    |
              +--- searches prospects -----------> [Edge Fn: linkedin-search]
              |                                        |
              |                                        +---> [LinkedIn API: 13.61.184.191:8000]
              |
              +--- transfers leads ----mutate----> [lead_assignments]
              +--- logs activity ------mutate----> [lead_activity_log]
              +--- feeds team ---------query-----> [lead_activity_log]
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `linkedin-search` edge function | Proxy LinkedIn API, handle CORS, validate requests | TMA (client), LinkedIn microservice (upstream) |
| `useVoiceRecorder` hook | Browser audio capture via MediaRecorder API | Browser APIs only |
| `useTranscription` hook | Upload audio, create request, poll for result | InsForge Storage, InsForge DB |
| `useLinkedInSearch` hook | Call edge function, cache results | linkedin-search edge function |
| `useTransferLead` hook | Assign/reassign lead to team member | InsForge DB (lead_assignments, lead_activity_log, tma_events) |
| `useTeamActivityFeed` hook | Query team-wide lead activity | InsForge DB (lead_activity_log) |
| Bot transcription poller | Watch `transcription_requests`, call AssemblyAI, update results | InsForge DB, AssemblyAI API |
| Bot notification poller | Watch `tma_events`, send Telegram messages | InsForge DB, Telegram API |

### Data Flow: LinkedIn Search

```
1. User types search keywords in TMA
2. TMA calls: getInsforge().functions.invoke('linkedin-search', { body: { keywords, company_keywords, count } })
3. Edge function receives POST, validates body
4. Edge function calls: fetch("http://13.61.184.191:8000/api/people/search", { method: "POST", body })
5. LinkedIn microservice returns: [{ name, headline, url, location, image, open_to_work, experience, education, skills }]
6. Edge function returns proxied response with CORS headers
7. TMA renders result cards
8. User taps "Add as Lead" -> maps to lead_registry insert
```

### Data Flow: Voice Recording + Transcription

```
1. User taps microphone icon next to text input
2. useVoiceRecorder.startRecording() -> getUserMedia({ audio: true }) -> MediaRecorder
3. User speaks, visual timer + waveform shown
4. User taps stop -> MediaRecorder.stop() -> Blob (audio/webm;codecs=opus)
5. TMA uploads Blob to InsForge Storage: prospect-photos/audio/{leadId}/{timestamp}.webm
6. TMA inserts transcription_requests row: { lead_id, telegram_id, audio_key, status: 'pending' }
7. Bot poller picks up pending request
8. Bot downloads audio from InsForge Storage
9. Bot calls TranscriptionService.transcribe(audio_bytes) -> text
10. Bot updates transcription_requests: { status: 'completed', transcribed_text: text }
11. TMA polls transcription_requests (refetchInterval: 3000ms)
12. TMA receives text, populates input field
13. User can edit before saving
```

### Data Flow: Lead Transfer

```
1. Admin/owner taps "Transfer" on lead detail page
2. Modal shows team member picker (query users table)
3. Admin selects recipient, confirms
4. useMutation:
   a. Update lead_assignments (add new, optionally remove old)
   b. Insert lead_activity_log { activity_type: 'transfer', content: 'Transferred to {name}' }
   c. Insert tma_events { event_type: 'lead_transferred', telegram_id: recipient_id, lead_id }
5. Bot poller picks up tma_event
6. Bot sends Telegram message to recipient: "You've been assigned lead: {prospect_name}"
7. Message includes inline button: "Open in App" -> deep link to lead detail
```

---

## Patterns to Follow

### Pattern 1: Edge Function Proxy (for external APIs)

**What:** Route external API calls through an InsForge edge function to avoid CORS and add a security boundary.

**When:** Any time the TMA needs to call a non-InsForge API.

**Example:**
```typescript
// functions/linkedin-search/index.ts
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

module.exports = async function (request: Request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const { keywords, company_keywords, count } = await request.json();

  const upstream = await fetch("http://13.61.184.191:8000/api/people/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keywords, company_keywords, count: count || 10 }),
  });

  const data = await upstream.json();

  return new Response(JSON.stringify(data), {
    status: upstream.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
};
```

### Pattern 2: Async Work Queue (for long-running operations)

**What:** TMA inserts a request row, bot polls and processes, TMA polls for completion.

**When:** Any operation that takes >2 seconds (transcription, LLM generation, external API with rate limits).

**Already used for:** `plan_requests`, `draft_requests`

**Example (transcription):**
```typescript
// TMA: create request
const { error } = await getInsforge()
  .database.from('transcription_requests')
  .insert({ lead_id, telegram_id, audio_key, status: 'pending' });

// TMA: poll for completion
const { data } = useQuery({
  queryKey: ['transcription', requestId],
  queryFn: async () => {
    const { data } = await getInsforge()
      .database.from('transcription_requests')
      .select('status, transcribed_text')
      .eq('id', requestId)
      .single();
    return data;
  },
  refetchInterval: (query) =>
    query.state.data?.status === 'completed' ? false : 3000,
});
```

### Pattern 3: TMA Event Bus (for cross-platform notifications)

**What:** TMA inserts into `tma_events`, bot poller picks up and sends Telegram messages.

**When:** Any TMA action that should notify users via Telegram (lead transfer, plan completion, etc.).

**Already used for:** `lead_assigned` events, `plan_completed` events.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Direct Browser Fetch to External APIs

**What:** Calling `http://13.61.184.191:8000` directly from TMA JavaScript.

**Why bad:** CORS failure guaranteed (no Access-Control headers). Mixed content (HTTP from HTTPS context) may also be blocked by Telegram WebView.

**Instead:** Route through InsForge edge function.

### Anti-Pattern 2: Synchronous Transcription in TMA

**What:** Having the TMA wait for AssemblyAI transcription to complete in a single request.

**Why bad:** AssemblyAI transcription takes 5-30 seconds. Edge function timeouts, user sees spinner for too long, no recovery on network interruption.

**Instead:** Async queue pattern with polling.

### Anti-Pattern 3: Bot as Primary UI for New Features

**What:** Building LinkedIn search, voice recording, or team management as bot conversation flows.

**Why bad:** Contradicts v3.0 goal. Telegram bot UI is linear and stateless -- poor fit for search results, audio recording, team management.

**Instead:** Build in TMA. Bot handles notifications and quick actions only.

### Anti-Pattern 4: WebSocket Subscriptions for Low-Traffic Events

**What:** Using InsForge Realtime (if available) for team activity feed updates.

**Why bad:** Adds connection management complexity (reconnect on background, handle disconnects), for data that updates every few minutes at most.

**Instead:** React Query polling at 10-30 second intervals.

---

## Scalability Considerations

| Concern | At 5 users (current) | At 50 users | At 500 users |
|---------|---------------------|-------------|-------------|
| LinkedIn search load | Negligible | Cache results in InsForge for 1h | Add rate limiting to edge function |
| Transcription queue | 1-2/day | Bot poller handles fine | Consider dedicated worker process |
| Activity feed queries | Fast (few rows) | Index on `lead_activity_log.created_at` | Pagination + date-range filtering |
| InsForge Storage (audio) | Negligible | ~50MB/month | Consider cleanup job for old audio |
| Bot polling frequency | Existing 5s interval fine | Fine | Consider webhook-based processing |

---

## Sources

- Existing codebase patterns: `functions/verify-telegram/index.ts`, `functions/db-proxy.js`
- Existing async work pattern: `useBotNotifications.ts`, `useGeneratePlan.ts`
- Existing team features: `useAssignLead.ts`, `ActivityFeed.tsx`
- [MDN MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [AssemblyAI docs](https://www.assemblyai.com/docs/faq/what-audio-and-video-file-types-are-supported-by-your-api)
