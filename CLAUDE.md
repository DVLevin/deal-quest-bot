# CLAUDE.md — Project Instructions

## Git Workflow

- **Every feature must be developed on a separate branch** (e.g. `feature/voice-transcription`).
- Never commit feature work directly to `main`.
- Only merge to `main` after **manual tests by the user** confirm the feature works.
- When testing locally, run the bot from the **feature branch**.
- Run the bot from `main` **only** when the user explicitly asks, or when there are no active feature branches.

## Running the Bot

```bash
source .venv/bin/activate && python -m bot.main
```

## Project Structure

- `bot/config.py` — Pydantic settings from `.env`
- `bot/main.py` — Entry point, DI wiring, polling
- `bot/handlers/` — Telegram message/callback handlers
- `bot/services/` — Business logic services
- `bot/agents/` — AI agents for pipelines
- `bot/pipeline/` — Pipeline execution system
- `bot/storage/` — Data persistence (InsForge)
- `data/` — Scenarios, playbook, company knowledge

## Dependencies

- Aiogram 3 (Telegram bot framework)
- httpx (HTTP client)
- pydantic-settings (config)
- cryptography (Fernet encryption for API keys)
