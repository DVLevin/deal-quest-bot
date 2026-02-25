# Research Summary: v3.0 Prospect Discovery & UX Evolution

**Domain:** Sales training TMA + Bot -- new feature additions
**Researched:** 2026-02-12
**Overall confidence:** HIGH (stack decisions), MEDIUM (voice recording on Android)

## Executive Summary

v3.0 adds four capability areas to the existing Deal Quest platform: LinkedIn prospect search integration, browser-based voice recording in the TMA, bot role modernization (shifting to notifications + quick actions), and team collaboration features (lead transfer, activity feed).

The most important finding is that **no new npm packages or Python dependencies are required** for any of these features. The existing stack (React 18 + React Query + InsForge SDK + Tailwind 4 on the frontend; aiogram 3 + httpx + AssemblyAI on the backend) provides all necessary building blocks. The new capabilities are achieved through browser-native APIs (MediaRecorder, getUserMedia), a new InsForge edge function (LinkedIn search proxy), and new database tables following established async work queue patterns.

The primary technical risk is microphone access in Telegram's Android WebView. While camera issues are documented (GitHub issues #681, #748), audio recording uses a different permission path (RECORD_AUDIO vs CAMERA) and may work -- but this has not been confirmed. A feature-detection-first approach with graceful fallback to bot voice messages is essential. Testing on a real Android device must happen before committing to the voice recording UI implementation.

The secondary risk is the LinkedIn microservice's HTTP-only endpoint. The TMA runs on HTTPS (Telegram requirement), making direct browser calls impossible due to mixed content blocking. The proven solution is an InsForge edge function proxy, following the exact pattern already used by `verify-telegram` and `db-proxy` functions in the codebase.

## Key Findings

**Stack:** Zero new dependencies. Browser-native MediaRecorder API for voice. InsForge edge function for LinkedIn proxy. Existing async polling pattern for transcription.

**Architecture:** Three new async flows -- (1) LinkedIn search via edge function proxy, (2) voice recording -> InsForge Storage -> transcription_requests -> bot poller -> AssemblyAI, (3) lead transfer via lead_assignments + tma_events notification bus.

**Critical pitfall:** Telegram Android WebView microphone access is unconfirmed. Must test on real device before building voice UI. Fallback to bot voice messages is mandatory.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Infrastructure & LinkedIn Search** -- Build the edge function proxy first because it unblocks all search features and validates the external API integration (CORS, mixed content, timeout handling).
   - Addresses: LinkedIn search edge function, search results UI, prospect-to-lead creation
   - Avoids: Mixed content blocking (PITFALLS #1), CORS failure (PITFALLS #2)

2. **Voice Recording & Transcription** -- Build the audio pipeline (storage upload + transcription_requests table + bot poller) before the recording UI, because the pipeline architecture gates the entire feature.
   - Addresses: Voice recording hook, transcription async flow, voice input UI
   - Avoids: Audio pipeline gap (PITFALLS #5), Android WebView issues (PITFALLS #3)
   - Note: Start with Android device testing to validate feasibility

3. **Bot Role Modernization** -- Simplify bot commands after TMA features are stable, because users need the TMA alternatives to be working before bot commands are deprecated.
   - Addresses: Command simplification, deep-link navigation, notification-first bot
   - Avoids: Breaking existing user workflows (PITFALLS #6)

4. **Team Collaboration** -- Build last because it depends on all other features being stable and has the most significant security prerequisite (anon key / RLS debt).
   - Addresses: Lead transfer, team activity feed, transfer notifications
   - Avoids: RLS security hole (PITFALLS #4), team data boundary confusion (PITFALLS #7)

5. **UX Overhaul** -- Can be interspersed across phases as component-level improvements rather than a big-bang redesign.
   - Addresses: Visual refresh, interaction improvements
   - Avoids: Regression on working features (PITFALLS #9)

**Phase ordering rationale:**
- Phase 1 (LinkedIn search) has the lowest risk and highest standalone value -- a working edge function proxy unlocks the entire prospect discovery flow
- Phase 2 (voice recording) has a critical feasibility question (Android WebView) that must be answered early to avoid wasted effort
- Phase 3 (bot simplification) must wait until TMA alternatives exist for the commands being deprecated
- Phase 4 (team collaboration) depends on phases 1-3 being stable and has the deepest security implications (RLS model)
- Phase 5 (UX overhaul) is safest as incremental work done alongside or after feature phases

**Research flags for phases:**
- Phase 2: NEEDS deeper research (Android WebView microphone access -- test on real device)
- Phase 1: Likely needs quick validation (InsForge edge function HTTP fetch to non-HTTPS endpoint)
- Phase 4: Needs security architecture research if RLS model is to be hardened
- Phases 3, 5: Standard patterns, unlikely to need additional research

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies confirmed. All capabilities use existing libraries + browser APIs. |
| Features | HIGH | Feature landscape is clear and well-scoped. Dependencies mapped. |
| Architecture | HIGH | All three new data flows follow established patterns in the codebase (edge function proxy, async work queue, tma_events bus). |
| Pitfalls | HIGH (LinkedIn), MEDIUM (voice) | LinkedIn integration pitfalls are standard web dev issues with known solutions. Voice recording pitfalls depend on untested Telegram WebView behavior. |
| Team features | MEDIUM | Lead transfer and activity feed are straightforward. RLS security model is a deeper concern if team boundaries need enforcement. |

## Gaps to Address

- **Telegram Android WebView microphone access** -- No documentation confirms getUserMedia for audio works in Telegram's Android WebView. Must test on real device. Known camera issues (#681) are on a different permission path but suggest caution.
- **InsForge edge function outbound HTTP policy** -- Deno fetch supports HTTP, but the InsForge runtime may have restrictions. Must test with actual deployment.
- **LinkedIn microservice reliability** -- No SLA, no health check, bare IP endpoint. Need to understand failure modes and build appropriate resilience.
- **RLS model for team features** -- The current anon-key-with-USING(true) model is a known security debt. Team features amplify this risk. Needs dedicated security architecture work if team isolation is required.
- **InsForge Storage audio upload** -- Needs verification that WebM blob uploads work with the existing `prospect-photos` bucket pattern.
