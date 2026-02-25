# Domain Pitfalls: v3.0 Prospect Discovery & UX Evolution

**Domain:** Adding LinkedIn search integration, TMA voice recording, bot simplification, team collaboration, and UX overhaul to existing Telegram Mini App + aiogram bot system
**Researched:** 2026-02-12
**Overall Confidence:** HIGH (verified against codebase, official Telegram Mini Apps docs, AssemblyAI docs, PostgreSQL RLS documentation, and community issue trackers)

---

## Critical Pitfalls

Mistakes that cause rewrites, data breaches, or features that ship broken on real devices.

---

### Pitfall 1: Mixed Content Blocking Kills LinkedIn Microservice Integration

**What goes wrong:**
The LinkedIn search microservice at `http://13.61.184.191:8000` is served over plain HTTP. The TMA is served over HTTPS (Telegram enforces this for Mini Apps). When the TMA calls `fetch("http://13.61.184.191:8000/search")`, the browser blocks it as "mixed content" -- an HTTPS page requesting an HTTP resource. The feature appears to work in development (where mixed content restrictions may be relaxed) but silently fails in production inside Telegram's WebView. No error is shown to the user; the request simply never fires, or fires and is blocked before reaching the server.

**Why it happens:**
- Developers test against localhost or HTTP during development. Telegram's WebView on Android (Chromium 119+ based) enforces mixed content blocking by default.
- iOS WKWebView also blocks mixed content by default and there is no configuration flag that Telegram exposes to relax this.
- The microservice has no domain name or TLS certificate -- it is a bare IP with HTTP only.

**Consequences:**
- LinkedIn search feature works in zero production environments. Complete feature failure on ship day.
- If developers try to work around it by proxying through InsForge Edge Functions, they introduce a new dependency and latency layer that was not planned.

**Prevention:**
1. **Put the microservice behind a reverse proxy with TLS.** Use Caddy (auto-HTTPS with Let's Encrypt) or nginx with certbot on the same server. Point a subdomain like `linkedin-api.yourdomain.com` at the server. This is a 15-minute setup, not optional.
2. **Alternative: Route through an InsForge Edge Function** that acts as a server-side proxy. The Edge Function runs on Deno and can call HTTP endpoints without mixed content restrictions. The TMA calls the Edge Function over HTTPS, the Edge Function calls the HTTP microservice. Adds ~50ms latency but zero client-side CORS/mixed-content issues.
3. **Never hardcode the microservice URL in the frontend.** Use an environment variable (`VITE_LINKEDIN_API_URL`) so the URL can be changed from HTTP to HTTPS without a code change.

**Detection (warning signs):**
- `fetch()` calls to HTTP URLs in any TMA component.
- No CORS headers configured on the microservice (even if HTTPS is fixed, CORS will be the next blocker).
- Feature works in Chrome DevTools but fails when opened inside Telegram.

**Phase to address:** Phase 1 (LinkedIn Search Integration) -- this must be resolved before any frontend integration work begins.

**Confidence:** HIGH -- verified that Telegram WebView uses Chromium 119+ on Android and WKWebView on iOS, both of which enforce mixed content blocking. Confirmed via [Telegram Mini Apps platform docs](https://docs.telegram-mini-apps.com/platform/about) and [mixed content blocking documentation](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content).

---

### Pitfall 2: CORS Not Configured on LinkedIn Microservice

**What goes wrong:**
Even after fixing HTTPS, the TMA (served from Railway's domain, e.g., `webapp.up.railway.app`) makes cross-origin requests to the LinkedIn microservice (e.g., `linkedin-api.yourdomain.com`). Without CORS headers (`Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`), the browser's preflight `OPTIONS` check fails and the request is rejected before it reaches the API handler. This produces a cryptic `TypeError: Failed to fetch` with no useful error message in the console.

**Why it happens:**
- The microservice was built for server-to-server use (bot calling it directly), not browser-to-server use.
- CORS is a browser-only restriction. The bot's httpx calls work fine without CORS headers.
- Developers testing with `curl` or Postman see successful responses, so they assume the API works.

**Consequences:**
- Same as Pitfall 1: complete feature failure in production. The difference is this one also fails in desktop Telegram (which uses a Chromium WebView).
- If CORS is added as `Access-Control-Allow-Origin: *`, it works but opens the microservice to abuse from any website.

**Prevention:**
1. **If using a reverse proxy (Caddy/nginx):** Add CORS headers at the proxy level, whitelisting the TMA's specific origin.
2. **If using InsForge Edge Function proxy:** CORS is not needed because the TMA calls a same-origin or InsForge-origin endpoint.
3. **If adding CORS directly to the microservice:** Configure it to allow only the TMA's production origin(s) and the `OPTIONS` method. Include `Content-Type` and `Authorization` in `Access-Control-Allow-Headers`.

**Detection:**
- Browser console shows `CORS policy: No 'Access-Control-Allow-Origin' header`.
- Network tab shows an `OPTIONS` request with a non-200 response.
- API works from bot (Python httpx) but fails from TMA (browser fetch).

**Phase to address:** Phase 1 (LinkedIn Search Integration) -- same phase as Pitfall 1, must be resolved together.

**Confidence:** HIGH -- standard browser behavior, verified against Telegram's note that Mini Apps must include `Access-Control-Allow-Origin: https://web.telegram.org` for file downloads.

---

### Pitfall 3: MediaRecorder API Fails Silently in Telegram WebView on iOS

**What goes wrong:**
The TMA attempts to use `navigator.mediaDevices.getUserMedia({ audio: true })` followed by `MediaRecorder` to record voice in-browser. On iOS, Telegram's WKWebView may not surface the microphone permission prompt at all, or the permission is granted but `MediaRecorder` produces a 0-byte blob. On Android, the Chromium WebView may not have `onPermissionRequest` properly overridden for the `RECORD_AUDIO` permission, causing `getUserMedia` to throw a `NotAllowedError`.

This is the single most reported issue for media capture in Telegram Mini Apps. The [tma.js issue tracker has multiple open bugs](https://github.com/Telegram-Mini-Apps/telegram-apps/issues/748) about `getUserMedia` returning black streams (camera) or silent streams (audio) on iOS.

**Why it happens:**
- iOS WKWebView inherits microphone permission from the host app (Telegram). If Telegram itself has not recently used the microphone, the system may not prompt for permission.
- Telegram's experimental `mic` permission scope (flagged behind `#experimental` in 10.10 betas) is not yet stable across all Telegram client versions.
- Android WebView requires the host app to implement `WebChromeClient.onPermissionRequest()` and explicitly grant `PermissionRequest.RESOURCE_AUDIO_CAPTURE`. If the Telegram Android client's WebView implementation does not do this, the permission is silently denied.
- Older Telegram client versions (pre-10.12) may not support MediaRecorder in Mini Apps at all.

**Consequences:**
- Voice recording feature works for 0-30% of users depending on their platform and Telegram version.
- Users see a "recording" UI but the resulting audio is empty or corrupted.
- AssemblyAI receives an empty or garbage file and returns a transcription error.
- The feature gets blamed for being "broken" when it is actually a platform limitation.

**Prevention:**
1. **Feature-detect aggressively before showing the record button:**
   ```typescript
   async function canRecordAudio(): Promise<boolean> {
     if (!navigator.mediaDevices?.getUserMedia) return false;
     if (!window.MediaRecorder) return false;
     try {
       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
       stream.getTracks().forEach(t => t.stop()); // Release immediately
       return true;
     } catch {
       return false;
     }
   }
   ```
2. **Always provide a fallback.** If audio recording is unavailable, show a message directing the user to send a voice message through the Telegram chat instead (the bot already handles voice via `on_support_voice`).
3. **Test the minimum viable Telegram version.** Set `min_api_version` in the bot's `setWebApp` configuration to exclude clients that do not support MediaRecorder. Telegram Bot API 6.9+ is required for basic WebApp features; audio may need 7.0+.
4. **Handle the codec mismatch.** iOS Safari/WKWebView records in MP4/AAC by default. Android Chromium records in WebM/Opus. Both are supported by AssemblyAI (verified: .opus, .webm, .mp4, .aac all accepted). Use `MediaRecorder.isTypeSupported()` to select the best available codec:
   ```typescript
   const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
     ? 'audio/webm;codecs=opus'
     : MediaRecorder.isTypeSupported('audio/mp4')
       ? 'audio/mp4'
       : ''; // Let browser choose default
   ```
5. **Set a recording duration limit** (e.g., 120 seconds) to prevent accidentally huge files that choke the upload pipeline.

**Detection:**
- Zero transcription results from TMA-submitted audio while bot voice messages work fine.
- Error logs showing "Transcription returned empty text" from AssemblyAI.
- User reports of "recording button does nothing" specifically on iOS.
- Browser console shows `NotAllowedError: Permission denied` or `NotFoundError: Requested device not found`.

**Phase to address:** Phase 2 (TMA Voice Recording) -- implement with fallback-first design. Do NOT build the feature assuming MediaRecorder works; build it assuming it does NOT work and layer recording on top as a progressive enhancement.

**Confidence:** MEDIUM -- verified AssemblyAI format support (HIGH). getUserMedia behavior in Telegram WebView is based on multiple community reports and [tma.js issue tracker](https://github.com/Telegram-Mini-Apps/telegram-apps/issues/748) (MEDIUM, as behavior varies by Telegram client version). Specific Android `onPermissionRequest` behavior is inferred from [WebView permission documentation](https://blog.silverpc.hu/2025/10/23/a-guide-to-permissions-how-can-i-access-the-microphone-via-a-webview/).

---

### Pitfall 4: Anon Key + USING(true) RLS Policies Make Team Data a Security Hole

**What goes wrong:**
The current system uses the InsForge anon key for ALL operations -- both the bot and the TMA. Every table has `anon_full_*` RLS policies with `USING (true) WITH CHECK (true)`. The TMA's data isolation is enforced purely at the query level (each hook filters by `telegram_id`). This means:

1. **Any user can read any other user's leads, training data, and support sessions** by crafting a direct PostgREST request with a different `telegram_id` filter.
2. **When team features are added,** the intention is for team members to see shared leads but NOT each other's personal training data, support sessions, or API keys. But with `USING (true)` on every table, there is no database-level enforcement of this boundary.
3. **The TMA client-side code is the only access control.** Any user with browser DevTools can bypass it.

This is explicitly called out as a known debt in the migration file: `TODO: Migrate bot to service role key in a future phase, then remove these anon full-access policies.`

**Why it happens:**
- The system was built for a single team with trusted users (authorized by username allowlist in the bot).
- InsForge's JWT mechanism uses a different secret than the Edge Function's custom JWTs, so the team gave up on authenticated PostgREST calls and fell back to anon access (documented in `insforge.ts` lines 47-58).
- Adding team features ON TOP of this model means there is no enforcement layer between "my data" and "team data" and "other team's data."

**Consequences:**
- Data leak: User A can see User B's leads, encrypted API keys (stored in `users.encrypted_api_key`), training attempts, and personal memory.
- When multiple teams are introduced, Team A can see Team B's entire pipeline.
- A single motivated user with browser DevTools can dump the entire database.
- Fixing this retroactively requires coordinated changes to: RLS policies, JWT minting, bot client configuration (switch to service role key), and every TMA query hook.

**Prevention:**
1. **Phase the fix before team features, not after.** Resolve the anon key debt BEFORE building team collaboration. The migration order must be:
   a. Switch the bot to use a service role key (bypasses RLS as intended for server-side operations).
   b. Remove `anon_full_*` policies from all tables.
   c. Fix the Edge Function JWT to work with InsForge's PostgREST JWT verification (align secrets).
   d. Write proper authenticated RLS policies that use `telegram_id` from the JWT.
   e. THEN add team/org tables with team-scoped policies.
2. **Introduce an `organizations` table and `org_members` table** before any team features. Every table that needs team sharing gets an `org_id` column. RLS policies check: `telegram_id = jwt_telegram_id OR org_id IN (SELECT org_id FROM org_members WHERE telegram_id = jwt_telegram_id)`.
3. **Index every column used in RLS policies** (`telegram_id`, `org_id`) to avoid performance degradation. PostgreSQL evaluates RLS policies on every row access; un-indexed policy columns cause full table scans.
4. **Test RLS from the client SDK, not the SQL editor.** The SQL editor bypasses RLS. Use the TMA's actual anon/authenticated client to verify that data isolation works.

**Detection:**
- Open TMA, open browser DevTools Network tab, modify a query's `telegram_id` parameter. If you can see another user's data, the system is vulnerable.
- Any query from the TMA that returns data for users other than the authenticated user.
- After adding team features: User A can see Team B's leads.

**Phase to address:** Must be addressed in Phase 4 (Team Collaboration) but the groundwork (bot service role key migration, JWT alignment) should be done in Phase 1 or as a prerequisite phase.

**Confidence:** HIGH -- verified by reading the codebase directly. The `insforge.ts` file (lines 47-58) explicitly documents that JWT auth is bypassed and anon key is used for all operations. The migration file `001_enable_rls_and_policies.sql` contains the `USING (true)` policies and the TODO comment. The `lead_assignments` migration (009) also uses `USING (true)`.

---

### Pitfall 5: Audio File Pipeline Gap -- TMA Records Audio But Has No Path to AssemblyAI

**What goes wrong:**
The TMA can (potentially) record audio via MediaRecorder. The bot's `TranscriptionService` takes `audio_bytes` and uploads them to AssemblyAI. But there is no connection between these two systems. The TMA runs in the user's browser. The bot runs on Railway. There is no endpoint that accepts audio uploads from the TMA and routes them to AssemblyAI.

Developers build the recording UI, get a `Blob` of audio data, and then realize: "How do I get this to the transcription service?" The options are:
- Upload to InsForge Storage and have the bot poll for new files (complex, slow).
- Create a new Edge Function that accepts audio and calls AssemblyAI (requires AssemblyAI API key in Edge Function secrets, adds a new deployment dependency).
- Send the audio as a base64 string through the existing `tma_events` table (the blob may be 1-5MB; PostgREST has a default request body limit of ~2MB for JSON payloads, and base64 encoding increases size by 33%).
- Have the TMA call AssemblyAI directly (exposes the API key in the frontend bundle).

**Why it happens:**
- The current voice flow is bot-native: user sends voice message to Telegram -> bot downloads file from Telegram API -> bot sends to AssemblyAI. The TMA was never designed to handle audio.
- The `tma_events` pattern (used for step_completed, status_changed) works for small JSON payloads but was not designed for binary data transfer.

**Consequences:**
- The recording UI is built but audio goes nowhere. Feature is 80% done but functionally useless.
- If developers rush a solution (e.g., base64 in tma_events), they hit PostgREST body size limits, JSON encoding performance issues, and the database stores megabytes of transient audio data.
- If they expose the AssemblyAI key in the frontend, it gets scraped and abused.

**Prevention:**
1. **Design the audio pipeline BEFORE building the recording UI.** The recommended approach:
   a. TMA records audio -> uploads to InsForge Storage (`prospect-audio/{telegram_id}/{timestamp}.webm`).
   b. TMA inserts a row in a new `transcription_requests` table (similar to existing `draft_requests`/`plan_requests` pattern) with the storage path.
   c. Bot's poller picks up the request, downloads from InsForge Storage, sends to AssemblyAI, writes transcription back to the request row.
   d. TMA polls the request row for completion.
2. **This is the same pattern already used for draft generation and plan generation** (`draft_requests` table with `start_draft_request_poller`, `plan_requests` table with `start_plan_request_poller`). Follow the established pattern exactly.
3. **Set a file size limit** (e.g., 5MB, roughly 2 minutes of WebM/Opus audio) enforced both in the recording UI and in the storage upload.
4. **Consider making voice recording a "nice to have" fallback** that redirects users to the Telegram chat voice message flow rather than building an entirely new audio pipeline.

**Detection:**
- Recording UI exists but no upload/transcription endpoint is defined.
- Architecture review shows no path from browser `Blob` to AssemblyAI.
- `transcription_requests` table (or equivalent) does not exist.

**Phase to address:** Phase 2 (TMA Voice Recording) -- design the pipeline architecture before writing any UI code. The pipeline decision gates the entire feature.

**Confidence:** HIGH -- verified by reading the codebase. The existing `TranscriptionService` only accepts raw bytes passed in-process. There is no HTTP endpoint, Edge Function, or storage-based pipeline for audio. The `draft_requests`/`plan_requests` pattern provides a proven template.

---

## Moderate Pitfalls

Mistakes that cause significant rework, poor UX, or partial feature failure.

---

### Pitfall 6: Bot Command Removal Breaks User Muscle Memory and Telegram's Command Autocomplete

**What goes wrong:**
v3.0 plans to simplify the bot by reducing ~15 commands to fewer commands. Users who have used `/support`, `/leads`, `/learn`, `/train`, `/stats`, `/settings` for months have built muscle memory. Telegram also caches the command menu (the `/` autocomplete list) on the client side. Even after updating `set_my_commands`, users may see stale command lists for hours or days. If removed commands return no response (because the handler is gone), users think the bot is broken.

**Why it happens:**
- Telegram's command menu is cached per-user and per-chat. The `set_my_commands` API updates the server-side list, but clients may not refresh immediately.
- Removing a router (`dp.include_router(stats.router)`) removes the handler entirely. A user typing `/stats` gets no response -- not even an error. This looks identical to the bot being down.
- Some users access the bot through saved messages, chat history links, or forwarded instructions that reference old commands.

**Consequences:**
- Existing users perceive the bot as broken for 1-3 days after the update.
- Support requests spike: "The bot stopped working."
- Users who relied on specific commands lose trust in the product.

**Prevention:**
1. **Never remove commands cold turkey.** For every command being removed or renamed:
   a. Keep the old handler for at least 2 releases.
   b. The old handler should respond with a friendly redirect message:
      ```
      "/stats has been merged into the dashboard.
       Use /dashboard or open the Mini App to see your stats."
      ```
   c. After 30 days with analytics showing <5% usage of the old command, remove the redirect handler.
2. **Update `set_my_commands` with the new command list** but also register "hidden" handlers for old commands (handlers that are not in the command menu but still respond to the message).
3. **Use command scopes** to show different command sets to different users:
   - New users: simplified command list only.
   - Existing users (detected by `users.created_at` being older than the v3.0 deploy date): transitional command list with both old and new.
4. **Announce changes through the bot itself.** On first interaction after the update, send a one-time "What's new" message explaining the changes.

**Detection:**
- Users reporting "bot doesn't respond to /stats" (or any removed command).
- Monitoring shows unhandled messages matching old command patterns.
- Telegram's command autocomplete shows stale commands for some users.

**Phase to address:** Phase 3 (Bot Role Modernization) -- implement gradual deprecation, not sudden removal.

**Confidence:** HIGH -- standard Telegram bot behavior. Telegram's [Bot Features documentation](https://core.telegram.org/bots/features) confirms command menu caching. The aiogram framework stops responding to messages that have no matching handler.

---

### Pitfall 7: Team Lead Visibility Without Proper Data Boundaries Creates Confusing UX

**What goes wrong:**
Team collaboration means User A should see leads assigned to them by an admin (via `lead_assignments`), plus their own leads. But the current query pattern in the TMA is `lead_repo.get_for_user(tg_id)` which filters by `telegram_id` (the owner). Assigned leads have a different `telegram_id` (the original owner's). The queries need to UNION own leads + assigned leads, but the UI does not distinguish between "my lead" and "assigned to me by admin."

Additionally, when User A updates an assigned lead's status, the original owner's view should reflect this change. But if User A adds a context update, should the original owner see it? What about the AI-generated advice -- it uses the original owner's memory and API key context.

**Why it happens:**
- The lead_assignments table (migration 009) exists but has no RLS policies scoped to team membership -- it uses `USING (true)`.
- The existing lead detail view, engagement plan view, and activity log are all scoped to `telegram_id` at the query level, not at the data model level.
- "Team" as a concept does not exist in the data model. The `lead_assignments` table is a flat mapping of `lead_id -> telegram_id` with no team/organization boundary.

**Consequences:**
- Assigned leads either do not show up (if queries only check own `telegram_id`) or show up without context (user sees a lead they did not create and has no background on).
- Updates by assignees and owners conflict or overwrite each other.
- AI advice generated for an assigned lead uses the wrong user's memory context.
- Without team boundaries, any admin can assign any lead to any user, even users on different "teams" (if the product expands to multiple teams).

**Prevention:**
1. **Add a `source` indicator to lead display:** "Your lead" vs "Assigned by [admin name]". The query should return leads with a `relationship` field (`owner` | `assignee`).
2. **Build the query as a UNION:**
   ```sql
   SELECT *, 'owner' as relationship FROM lead_registry WHERE telegram_id = $1
   UNION ALL
   SELECT lr.*, 'assignee' as relationship FROM lead_registry lr
   JOIN lead_assignments la ON lr.id = la.lead_id
   WHERE la.telegram_id = $1
   ```
3. **Scope AI advice context properly:** When generating advice for an assigned lead, use the assignee's memory (they are the one pursuing the lead) but the original analysis and research from the lead.
4. **Activity log should include actor identity:** Each `lead_activity_log` entry already has `telegram_id`. Display this as "Updated by [name]" when the actor is different from the viewer.
5. **Gate this behind the organizations table** (see Pitfall 4). Without proper team boundaries, lead assignment is just a flat free-for-all.

**Phase to address:** Phase 4 (Team Collaboration) -- requires organization/team table from Pitfall 4's prerequisite work.

**Confidence:** HIGH -- verified by reading `lead_assignments` migration (no team/org concept) and `LeadRegistryRepo.get_for_user()` which queries by single `telegram_id`.

---

### Pitfall 8: External Microservice Timeout/Failure Cascading into TMA Hang

**What goes wrong:**
The LinkedIn search microservice is an external dependency over the network. If it is slow (>10s), down, or returns malformed data, the TMA's search feature hangs indefinitely with a loading spinner. Users cannot cancel the search. The TMA does not show a useful error. If the user navigates away and comes back, the abandoned request may still be pending, consuming browser resources.

The existing codebase already has timeout issues -- `_MAX_POLL_TIME = 60` for transcription (see `transcription.py` line 14), and the plan generation poll timeout was increased from 60s to 120s (commit `4fe2383`). External microservices amplify this because the failure mode is unpredictable (network timeout vs server crash vs DNS failure).

**Why it happens:**
- `fetch()` in the browser has no default timeout. If the server never responds, the request hangs until the browser's own TCP timeout (~300 seconds on most platforms).
- Developers test against a local or fast microservice and do not simulate network failures.
- The microservice has no health check endpoint, so there is no way to proactively detect if it is down before sending a search request.
- Error responses from the microservice may not follow a consistent format (HTTP status codes vs JSON error objects vs HTML error pages from nginx).

**Consequences:**
- Users see an infinite loading state.
- Multiple taps on "Search" create multiple pending requests.
- If the microservice returns HTML (e.g., nginx 502 page) instead of JSON, `response.json()` throws, but without proper error handling the TMA shows a blank screen.
- On mobile, the Telegram WebView may kill the Mini App if it appears unresponsive for too long.

**Prevention:**
1. **Wrap every external API call with AbortController + timeout:**
   ```typescript
   async function searchLinkedIn(query: string, timeoutMs = 8000) {
     const controller = new AbortController();
     const timer = setTimeout(() => controller.abort(), timeoutMs);
     try {
       const resp = await fetch(url, { signal: controller.signal });
       if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
       const contentType = resp.headers.get('content-type') || '';
       if (!contentType.includes('application/json')) {
         throw new Error('Non-JSON response');
       }
       return await resp.json();
     } finally {
       clearTimeout(timer);
     }
   }
   ```
2. **Show a timeout-specific error message** after 8 seconds: "Search is taking longer than expected. The service may be temporarily unavailable."
3. **Add a health check probe.** Before showing the search UI as available, ping the microservice's health endpoint. If it is down, show the search input as disabled with a "Search temporarily unavailable" message.
4. **Implement retry with backoff** for transient failures (429, 502, 503) but NOT for timeouts (to avoid piling up requests).
5. **Debounce search requests** and prevent duplicate submissions while one is in-flight.

**Detection:**
- Users reporting "search just spins forever."
- No timeout handling in fetch calls.
- Error boundary catches uncaught promise rejections from failed JSON parsing.

**Phase to address:** Phase 1 (LinkedIn Search Integration) -- build the resilience layer as part of the API client, not as an afterthought.

**Confidence:** HIGH -- standard web development patterns. The existing codebase has documented timeout issues (transcription polling, plan generation polling).

---

### Pitfall 9: UX Overhaul Regression Breaks Working Lead Management

**What goes wrong:**
The v3.0 UX overhaul touches the same pages (Leads, Dashboard, Support) that are actively used by real users. A "redesign" of the lead detail page accidentally removes the engagement plan step toggle functionality. A layout change breaks the inline keyboard rendering in Telegram (which has specific width constraints). A new navigation pattern prevents deep-linking from bot messages (e.g., "View Lead & Plan" button that opens the TMA at a specific lead).

**Why it happens:**
- The TMA has 8 pages with complex state management (React Query cache, Zustand auth store, FSM state in the bot). Changing one component can invalidate cached data or break navigation state.
- Telegram's WebView has a maximum width/height that varies by device. A redesign tested on iPhone 15 may overflow on iPhone SE or older Android devices.
- Deep links from bot messages (e.g., `lead:view:{lead_id}` callback data that opens the TMA) depend on specific URL patterns. Changing routes breaks these links.
- The existing codebase has session persistence (`useSessionTracker` saves last path to localStorage). Changing route paths breaks session resume for returning users.

**Consequences:**
- Users who rely on the plan step toggle lose the ability to track their engagement progress.
- Deep links from bot messages 404 or navigate to the wrong page.
- Session resume navigates to a path that no longer exists, showing a blank page.
- Mobile layout breaks on smaller screens, making buttons untappable.

**Prevention:**
1. **Never change route paths without URL redirects.** If `/leads` becomes `/pipeline` or `/leads/:id` changes structure, add a redirect route:
   ```tsx
   <Route path="/leads/*" element={<Navigate to="/pipeline" replace />} />
   ```
2. **Maintain a "critical paths" test checklist** before every deploy:
   - [ ] Dashboard loads and shows stats
   - [ ] Lead list loads with pagination
   - [ ] Lead detail shows all sections (analysis, strategy, tactics, draft, research)
   - [ ] Plan step toggle works (pending <-> done)
   - [ ] Bot "View Lead & Plan" deep link opens correct lead
   - [ ] Session resume from localStorage works
   - [ ] Admin page loads for admin users
3. **Use component-level refactoring, not page-level rewrites.** Instead of rebuilding the entire Leads page, refactor individual components (LeadCard, LeadDetail, PlanView) one at a time. Ship each component change independently.
4. **Preserve all callback_data patterns** that the bot uses. The bot sends inline keyboards with `lead:view:{lead_id}`, `lead:plan:{lead_id}`, etc. If the TMA's deep link handler changes how it interprets these, the bot's existing messages break.
5. **Test on actual Telegram on both iOS and Android** before merging. Chrome DevTools responsive mode does NOT accurately simulate Telegram WebView's viewport, scroll behavior, or safe area insets.

**Detection:**
- Users reporting "I tapped View Lead in the bot but it shows the dashboard."
- localStorage `dq_last_path` contains paths that no longer match any route.
- Engagement plan completion percentage stops changing (step toggle is broken).
- Layout overflow on mobile devices (buttons cut off, text overflows containers).

**Phase to address:** Phase 5 (UX Overhaul) -- implement as incremental component-level changes, not a big-bang redesign.

**Confidence:** HIGH -- verified by reading `Router.tsx` (route paths), `useSessionTracker` (localStorage persistence), and bot handler callback_data patterns.

---

### Pitfall 10: LinkedIn Search Rate Limiting and IP Blocking

**What goes wrong:**
The LinkedIn search microservice at the bare IP likely scrapes or uses unofficial APIs to find LinkedIn profiles. LinkedIn aggressively rate-limits and blocks IPs that make automated requests. If multiple users search simultaneously, the microservice's IP gets blocked, and all searches start failing. The TMA shows generic "search failed" errors with no explanation.

**Why it happens:**
- LinkedIn's anti-scraping measures are industry-leading. They block by IP, fingerprint, and request pattern.
- A single-IP microservice has no IP rotation or proxy pool.
- The microservice has no built-in rate limiting, so the TMA can flood it with requests.
- There is no caching layer -- searching for the same person twice makes two LinkedIn requests.

**Consequences:**
- Search works for the first few users, then stops working for everyone.
- The microservice may be blocked for hours or days.
- No fallback when search is unavailable.

**Prevention:**
1. **Cache search results** in a database table (`linkedin_search_cache`) with a TTL (e.g., 24 hours). Same query within TTL returns cached results without hitting LinkedIn.
2. **Rate-limit on the TMA side:** Maximum 5 searches per user per minute. Show a "Please wait" message instead of hammering the API.
3. **Rate-limit on the microservice side:** Return HTTP 429 with a `Retry-After` header when limits are exceeded.
4. **Build a graceful degradation path:** When search is unavailable, allow manual lead creation with name/company/title fields only.
5. **Monitor the microservice's health** and surface its status in the admin panel so the team knows when LinkedIn has blocked the IP.

**Phase to address:** Phase 1 (LinkedIn Search Integration) -- build caching and rate limiting as part of the integration, not as a post-launch fix.

**Confidence:** MEDIUM -- LinkedIn's anti-scraping behavior is well-documented. The specific behavior of this microservice under load is unknown without testing.

---

## Minor Pitfalls

Mistakes that cause friction, minor bugs, or tech debt.

---

### Pitfall 11: Audio Blob Size Exceeds InsForge Storage Upload Limits

**What goes wrong:**
Users record a 5-minute voice memo. At WebM/Opus encoding, this produces ~2.5MB. At MP4/AAC (iOS default), this could be 5-10MB. InsForge Storage may have upload size limits, and the PostgREST JSON body limit (for the tma_events or transcription_requests table) will reject large base64-encoded payloads.

**Prevention:**
- Enforce a maximum recording duration in the UI (120 seconds recommended).
- Upload audio directly to InsForge Storage (binary upload), not through PostgREST JSON.
- Show a progress indicator during upload and a file size warning if the recording exceeds the limit.

**Phase to address:** Phase 2 (TMA Voice Recording).

---

### Pitfall 12: Bot FSM State Conflicts During Command Transition

**What goes wrong:**
The bot uses aiogram FSM (Finite State Machine) for multi-step flows: `SupportState.waiting_input`, `LeadEngagementState.adding_context`, `LeadEngagementState.sending_screenshot`, etc. If v3.0 changes the state machine (e.g., merging support and leads into a unified flow), users who are mid-flow during deployment lose their state. Their in-progress support session or context update disappears without explanation.

**Prevention:**
- Use `MemoryStorage` (current) and accept that state is lost on redeploy (already the case).
- When changing state names/structure, add a one-time migration handler that clears stale state and sends an apologetic message.
- Never rename state classes -- add new ones and deprecate old ones. The state machine should handle unknown states gracefully.

**Phase to address:** Phase 3 (Bot Role Modernization).

---

### Pitfall 13: Team Activity Feed Polling Overwhelms InsForge

**What goes wrong:**
Real-time team activity feed is implemented as polling (consistent with the existing `tma_events` pattern). With N team members each polling every 3 seconds, the load on InsForge grows as N*20 requests/minute. For a 10-person team, that is 200 requests/minute from the activity feed alone, on top of existing queries.

**Prevention:**
- Use longer polling intervals for the activity feed (15-30 seconds, not 3 seconds).
- Use the `If-None-Match` / `ETag` pattern to avoid transferring unchanged data.
- Consider InsForge's Realtime subscription feature (the `017_create-realtime-schema.sql` migration suggests it exists) instead of polling for the activity feed.
- Paginate: only fetch the last 20 activities, not the full history.

**Phase to address:** Phase 4 (Team Collaboration).

---

### Pitfall 14: Admin Lead Assignment Has No Notification Channel to Assignee

**What goes wrong:**
An admin assigns a lead to a team member via the TMA admin panel. The `lead_assignments` table gets a new row. But how does the assignee know? The TMA does not have push notifications. The bot does not monitor the `lead_assignments` table for changes. The assignee only discovers the assignment the next time they open the TMA and navigate to the leads page.

**Prevention:**
- Extend the `tma_events` poller to watch for new `lead_assignments`. When a new assignment is detected, send a Telegram message to the assignee via the bot: "You've been assigned a new lead: [Name] at [Company]. Open the app to see details."
- This follows the existing pattern where `tma_event_poller` bridges TMA actions to bot notifications.

**Phase to address:** Phase 4 (Team Collaboration).

---

### Pitfall 15: Vite Proxy Configuration Missing for Dev Environment

**What goes wrong:**
During development, the TMA runs on `localhost:5173` (Vite dev server). The LinkedIn microservice is at a remote IP. CORS blocks the request even in development. Developers add `proxy` configuration to `vite.config.ts` to route API calls through the dev server, but this proxy does not exist in production (Railway serves static files). The code works in dev but fails in production because the URL paths are different.

**Prevention:**
- Use environment variables for ALL external API URLs: `VITE_LINKEDIN_API_URL`.
- In development, point it at the Vite proxy path (`/api/linkedin`).
- In production, point it at the HTTPS microservice URL or Edge Function URL.
- Add the Vite proxy ONLY for development and document it clearly.
- Never use relative paths for external APIs.

**Phase to address:** Phase 1 (LinkedIn Search Integration).

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Severity | Mitigation |
|-------|---------------|----------|------------|
| Phase 1: LinkedIn Search | Mixed content blocking (Pitfall 1) | CRITICAL | Set up HTTPS reverse proxy or Edge Function proxy before any frontend code |
| Phase 1: LinkedIn Search | CORS failure (Pitfall 2) | CRITICAL | Configure CORS at proxy level or use Edge Function proxy |
| Phase 1: LinkedIn Search | Timeout/failure cascade (Pitfall 8) | MODERATE | AbortController + 8s timeout + health check |
| Phase 1: LinkedIn Search | Rate limiting/IP blocking (Pitfall 10) | MODERATE | Cache results + client-side rate limit |
| Phase 2: TMA Voice | MediaRecorder failure in WebView (Pitfall 3) | CRITICAL | Feature-detect, fallback to bot voice message |
| Phase 2: TMA Voice | No audio pipeline to AssemblyAI (Pitfall 5) | CRITICAL | Design pipeline (storage + poller) before UI |
| Phase 2: TMA Voice | Blob size limits (Pitfall 11) | MINOR | 120s max recording, binary storage upload |
| Phase 3: Bot Simplification | Command removal disruption (Pitfall 6) | MODERATE | Deprecation handlers with redirect messages |
| Phase 3: Bot Simplification | FSM state conflicts (Pitfall 12) | MINOR | Graceful unknown state handling |
| Phase 4: Team Collaboration | Anon key security hole (Pitfall 4) | CRITICAL | Fix auth model BEFORE building team features |
| Phase 4: Team Collaboration | Team data boundaries (Pitfall 7) | MODERATE | Organizations table + scoped queries |
| Phase 4: Team Collaboration | Activity feed polling load (Pitfall 13) | MINOR | Longer intervals, Realtime subscriptions |
| Phase 4: Team Collaboration | Assignment notification gap (Pitfall 14) | MINOR | Extend tma_events poller |
| Phase 5: UX Overhaul | Regression on working features (Pitfall 9) | MODERATE | Component-level refactoring, critical path checklist |
| Phase 5: UX Overhaul | Dev proxy mismatch (Pitfall 15) | MINOR | Environment variables for all URLs |

---

## Prerequisite Actions (Before Any Phase Begins)

These are not pitfalls of any single phase but systemic debts that will compound across all phases:

1. **HTTPS for LinkedIn microservice** -- Must be resolved before Phase 1 can start. Estimated effort: 30 minutes with Caddy, 2 hours with nginx + certbot.
2. **Bot service role key migration** -- Must be resolved before Phase 4 can start. Estimated effort: 1-2 plans (change InsForge client init to use service role key, test all bot operations still work).
3. **JWT alignment between Edge Function and PostgREST** -- Must be resolved before Phase 4 can start. Estimated effort: 1 plan (align JWT secrets so authenticated TMA queries work).

---

## Sources

- [Telegram Mini Apps Official Documentation](https://core.telegram.org/bots/webapps)
- [Telegram Mini Apps Platform Details](https://docs.telegram-mini-apps.com/platform/about)
- [tma.js Issue #748: getUserMedia returns black stream on iOS](https://github.com/Telegram-Mini-Apps/telegram-apps/issues/748)
- [AssemblyAI Supported File Formats](https://www.assemblyai.com/docs/faq/what-audio-and-video-file-types-are-supported-by-your-api)
- [WebView Microphone Permission Guide](https://blog.silverpc.hu/2025/10/23/a-guide-to-permissions-how-can-i-access-the-microphone-via-a-webview/)
- [MediaRecorder API Support (caniuse)](https://caniuse.com/mediarecorder)
- [WebKit MediaRecorder Codec Support](https://webkit.org/blog/11353/mediarecorder-api/)
- [Safari 26 ALAC/PCM Support in MediaRecorder](https://blog.addpipe.com/record-high-quality-audio-in-safari-with-alac-and-pcm-support-via-mediarecorder/)
- [Supabase RLS Best Practices for Multi-Tenant Apps](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [PostgreSQL RLS Implementation Guide](https://www.permit.io/blog/postgres-rls-implementation-guide)
- [Telegram Bot Features: Command Scopes](https://core.telegram.org/bots/features)
- [Mixed Content Blocking (MDN)](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content)
- [React Feature Flags Best Practices 2025](https://medium.com/@ignatovich.dm/implementing-feature-flags-in-react-a-comprehensive-guide-f85266265fb3)
- Codebase direct analysis: `packages/webapp/src/lib/insforge.ts`, `migrations/001_enable_rls_and_policies.sql`, `insforge/migrations/009_lead_assignments.sql`, `bot/services/transcription.py`, `bot/handlers/support.py`, `bot/handlers/leads.py`, `bot/main.py`
