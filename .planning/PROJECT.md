# Deal Quest TMA

## What This Is

A Telegram Mini App (TMA) that gives Deal Quest users a rich, branded mobile experience for sales training, practice, deal support, and progress tracking. The existing Deal Quest bot handles AI-powered strategy generation, scenario scoring, and memory — the TMA becomes the visual layer that makes all of that accessible through interactive dashboards, scenario cards, charts, badges, and an admin panel. Built as a monorepo extension inside `deal-quest-bot/` using React + Vite + TypeScript, talking directly to the same InsForge backend the bot already uses.

## Core Value

Sales reps can see their progress, practice scenarios, get deal support, and track leads through a visually engaging mobile interface — not just text in a chat.

## Requirements

### Validated

<!-- Existing bot capabilities that the TMA will surface visually. These are working in the bot today. -->

- ✓ Real-time deal support with prospect analysis, closing strategy, engagement tactics, and draft responses — existing (bot /support)
- ✓ Structured learning tracks with 4 levels, rubric-based scoring, and auto-unlock progression — existing (bot /learn)
- ✓ Random practice scenarios with never-repeat logic, difficulty filtering, and voice/text input — existing (bot /train)
- ✓ XP/level system with streak tracking and rank titles — existing (bot scoring service)
- ✓ Lead pipeline management with status tracking, photo upload, web research, engagement plans — existing (bot /leads)
- ✓ Casebook of reusable responses with quality scoring — existing (bot casebook service)
- ✓ Admin analytics: team stats, leaderboard, trends, weak areas — existing (bot /admin)
- ✓ Multi-provider LLM routing (OpenRouter free tier / Claude premium) — existing (bot LLM router)
- ✓ Voice transcription via AssemblyAI — existing (bot transcription service)
- ✓ InsForge backend with PostgreSQL, auth, storage, realtime — existing

### Active

<!-- New TMA features to build. -->

- [ ] TMA foundation: React + Vite + TypeScript scaffold inside deal-quest-bot/ monorepo with Telegram SDK integration
- [ ] Telegram WebApp auth flow: initData verification → InsForge JWT → authenticated API calls
- [ ] Dashboard page: XP/level progress bar, weekly activity chart, recent badges, leaderboard preview, quick-action navigation
- [ ] Learn mode UI: track visualization with level cards, lesson content display, scenario practice with rich input, score/feedback display
- [ ] Train mode UI: scenario cards with persona details, difficulty badge, timed response input, animated scoring results
- [ ] Support mode UI: strategy builder with text/screenshot input, structured analysis display, draft with copy/regenerate/save actions
- [ ] Casebook browser: searchable/filterable gallery of saved responses, quality indicators, "use as template" flow
- [ ] Profile page: full stats, attempt history, badge collection, settings management
- [ ] Badge system UI: badge wall with rarity tiers (common/rare/epic/legendary), earn animations, criteria display
- [ ] Gamification visuals: level-up animations, streak indicators, XP gain animations, leaderboard with rankings
- [ ] Admin dashboard: team performance charts, member rankings, weak area identification, content management
- [ ] Bot hybrid integration: bot commands offer "Open in App" inline buttons alongside existing text responses
- [ ] Custom branded design system: Deal Quest visual identity, not generic TelegramUI — mobile-optimized, polished

### Out of Scope

- Native mobile app (iOS/Android) — TMA covers mobile use case within Telegram
- Real-time chat/messaging features — bot handles conversational interactions
- Payment/subscription system — not needed for current user base
- Offline mode — requires network for LLM calls and data sync
- Desktop-optimized layout — TMA is mobile-first (Telegram context)
- Replacing bot commands entirely — hybrid approach, bot stays functional for quick actions
- Multi-language i18n — English only for v1

## Context

**Existing system:** The Deal Quest bot is a production-ready Python/aiogram 3 Telegram bot with sophisticated multi-agent architecture. It uses InsForge (self-hosted Supabase alternative) for PostgreSQL, auth, file storage, and realtime. The bot has 10+ database tables, 3 AI agents (strategist, trainer, memory), YAML-configured pipelines, and handles text/photo/voice input.

**InsForge backend:** Already running with tables for users, attempts, track_progress, casebook, lead_registry, support_sessions, badges, teams, and more. The TMA will use InsForge's REST API directly (same as the bot's httpx client, but from browser via JS SDK).

**Telegram Mini Apps:** TMAs are web apps that run inside Telegram's mobile client. They receive user identity via `initData` (cryptographically signed by Telegram). The TMA will use `@telegram-apps/sdk-react` for Telegram integration and verify auth through InsForge.

**Exploration document:** `deal-quest-bot/docs/tma/idea_2_explore` contains detailed wireframes, proposed schema extensions (badges, teams tables), gamification specs (10-level system, 8 badge types, streak bonuses), and tech stack recommendations. General direction is solid; specific details will flex during implementation.

**Monorepo approach:** TMA lives inside `deal-quest-bot/` as `packages/webapp/` alongside the existing bot code. Shared types and constants in `packages/shared/`. pnpm workspaces for dependency management.

## Constraints

- **Tech stack**: React 18+ / Vite / TypeScript for TMA frontend — standard for Telegram Mini Apps
- **Backend**: InsForge REST API only — no additional backend services, TMA talks directly to existing tables
- **Auth**: Telegram WebApp initData verification — must validate cryptographic signature server-side
- **Mobile-first**: TMA runs inside Telegram mobile client — all UI must be touch-friendly, performant on mobile
- **Git workflow**: Every feature on a separate branch, merge to main only after manual testing (per CLAUDE.md)
- **Branding**: Custom Deal Quest design — not generic TelegramUI components
- **Bot compatibility**: Existing bot must keep working unchanged; TMA is additive

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Monorepo inside deal-quest-bot/ | Shared types, single repo, easier coordination | — Pending |
| Custom branded design (not TelegramUI) | Distinctive identity, better UX for sales professionals | — Pending |
| Hybrid bot + TMA | Bot stays functional for quick actions, TMA for rich experiences | — Pending |
| InsForge direct from TMA | No BFF needed, InsForge has REST API + row-level security | — Pending |
| pnpm workspaces | Industry standard for JS monorepos, better than npm workspaces for this | — Pending |
| Deployment TBD | Focus on building first, deploy when ready | — Pending |
| Railway for TMA webapp | Static SPA serving with `serve dist -s`, auto-deploys from remote branch | Confirmed |
| Inlined shared types for Railway | Railway `root_dir=packages/webapp` can't access `../shared`; types copied to `webapp/src/types/` | Confirmed |
| Always push after commits | Railway deploys from remote — local-only commits never reach production. GSD executors must push after plan completion | Lesson learned (Phase 2/3) |

## Current Milestone: v1.1 — Quick & Medium Wins

**Goal:** Improve the existing v1.0 app with targeted enhancements across lead management, training experience, error handling & UX, and performance & reliability.

**Focus Areas:**
1. **Lead management** — Stale lead indicators, lead source tracking, complete LeadRegistryModel (missing fields), company grouping
2. **Training experience** — Dynamic difficulty suggestions, scenario pool improvements, training analytics
3. **Error handling & UX** — Better error messages with categorization/recovery hints, input validation consistency, retry mechanisms
4. **Performance & reliability** — Cache playbook/KB at startup, background job reliability, LLM provider compatibility, retry with backoff

**Scope:** Quick wins and medium-effort improvements only. No large architectural rewrites.

---
*Last updated: 2026-02-04 after v1.1 milestone creation*
