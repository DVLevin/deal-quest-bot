# 🎮 Deal Quest Bot — Claude Code Build Instructions

**Read this file FIRST before writing any code.**

---

## 📋 Project Overview

You are building **Deal Quest**, a Telegram bot for GetDeal.ai's sales team that provides:

1. **Real-time deal support** (`/support`) — Strategy + drafts for prospects
2. **Structured training** (`/learn`) — Track-based curriculum
3. **Random practice** (`/train`) — Case interview-style scenarios that never repeat
4. **Memory system** — Remembers user history, reuses good responses

---

## ⚠️ CRITICAL: Research Before Coding

**DO NOT rely on training data.** Libraries change. Search the web for current 2025-2026 patterns.

### Mandatory Research (before writing any code):

```bash
# Research these topics:
1. "aiogram 3.x tutorial 2025 2026" — Library changed significantly from v2
2. "aiogram 3 FSM StatesGroup 2025" — Conversation state management
3. "aiogram 3 router handlers" — v3 uses Router pattern
4. "OpenRouter API python free models 2026" — Verify current free models
5. "Railway python deployment 2025 2026" — Current deployment patterns
6. "python fernet encryption" — For API key storage
```

### Key aiogram 3.x Changes (from v2):

- Uses `Router` for organizing handlers (not just `Dispatcher`)
- FSM uses `StatesGroup` and `State` from `aiogram.fsm`
- Inline keyboards use `InlineKeyboardBuilder`
- Photo handling is different

---

## 📁 Project Structure

```
deal-quest-bot/
├── docs/                           # Documentation (you're reading it)
│   ├── README.md                   # This file
│   ├── ARCHITECTURE.md             # Multi-agent + memory design
│   ├── TASK_BRIEF.md               # Full feature specs
│   └── MVP_VISION.md               # Product vision
│
├── data/                           # Knowledge base (provided)
│   ├── playbook.md                 # Sales playbook content
│   ├── company_knowledge.md        # Company info (user provides)
│   ├── scenarios.json              # All scenarios (learn + train)
│   ├── user_memory/                # User memory files (auto-created)
│   │   └── .gitkeep
│   └── casebook.db                 # Reusable responses (auto-created)
│
├── prompts/                        # Agent system prompts (provided)
│   ├── strategist_agent.md         # For /support mode
│   ├── trainer_agent.md            # For /learn + /train
│   └── memory_agent.md             # For background updates
│
├── bot/                            # Your code goes here
│   ├── __init__.py
│   ├── main.py                     # Entry point
│   ├── config.py                   # Environment + settings
│   │
│   ├── handlers/                   # Telegram command handlers
│   │   ├── __init__.py
│   │   ├── start.py               # /start - Onboarding
│   │   ├── support.py             # /support - Deal help
│   │   ├── learn.py               # /learn - Structured training
│   │   ├── train.py               # /train - Random scenarios
│   │   ├── stats.py               # /stats - Progress view
│   │   └── settings.py            # /settings - Provider config
│   │
│   ├── agents/                     # Multi-agent system
│   │   ├── __init__.py
│   │   ├── base.py                # Base agent class
│   │   ├── strategist.py          # Support mode agent
│   │   ├── trainer.py             # Learning/scoring agent
│   │   └── memory.py              # Background memory updates
│   │
│   ├── services/                   # Business logic
│   │   ├── __init__.py
│   │   ├── llm_router.py          # Multi-provider LLM abstraction
│   │   ├── knowledge.py           # Load playbook + company KB
│   │   ├── casebook.py            # Reusable response storage
│   │   ├── scoring.py             # Score parsing + XP calc
│   │   └── crypto.py              # API key encryption
│   │
│   ├── storage/                    # Data persistence
│   │   ├── __init__.py
│   │   ├── database.py            # SQLite operations
│   │   ├── memory.py              # User memory YAML operations
│   │   └── models.py              # Data models
│   │
│   ├── states.py                   # FSM state definitions
│   └── utils.py                    # Helpers + formatters
│
├── .env.example                    # Environment template
├── requirements.txt                # Dependencies
├── railway.toml                    # Deployment config
└── README.md                       # User-facing docs
```

---

## 🚀 Build Order

### Phase 1: Foundation (3-4 hours)

**Goal:** Bot responds to commands, DB works, onboarding flow complete

1. Set up project structure
2. Create `config.py` with environment loading
3. Create `storage/database.py` with schema
4. Create `handlers/start.py` with onboarding flow
5. Create `services/crypto.py` for API key encryption
6. Create `services/llm_router.py` with provider abstraction
7. Test: `/start` should guide user through setup

**Research needed:**
- aiogram 3.x FSM for multi-step onboarding
- Fernet encryption for API keys

### Phase 2: Knowledge System (1-2 hours)

**Goal:** Knowledge loaded, casebook ready

1. Create `services/knowledge.py` to load playbook + company KB
2. Create `storage/memory.py` for user YAML files
3. Create `services/casebook.py` for reusable responses
4. Test: Knowledge loads at startup, memory files created per user

### Phase 3: Support Mode (3-4 hours)

**Goal:** `/support` gives full strategy + draft

1. Create `agents/base.py` with common agent interface
2. Create `agents/strategist.py` implementing support logic
3. Create `handlers/support.py` with FSM for text/image input
4. Test: Paste prospect context → get analysis + strategy + draft

**Research needed:**
- aiogram 3.x photo handlers
- Inline keyboard buttons

### Phase 4: Learning Mode (2-3 hours)

**Goal:** `/learn` works with Track 1 scenarios

1. Create `agents/trainer.py` for scoring
2. Create `handlers/learn.py` with lesson → scenario → score flow
3. Create `services/scoring.py` for XP calculation
4. Test: Complete a scenario, see score + feedback

### Phase 5: Training Mode (2-3 hours)

**Goal:** `/train` with never-repeat logic

1. Add scenario pool handling to `storage/database.py`
2. Create `handlers/train.py` with random selection
3. Implement never-repeat tracking
4. Test: Train 5 times, never see same scenario

### Phase 6: Memory Agent (2 hours)

**Goal:** Background memory updates working

1. Create `agents/memory.py` for async updates
2. Hook into handlers to trigger after interactions
3. Implement casebook addition logic
4. Test: Memory file updates after interactions

### Phase 7: Polish + Deploy (1-2 hours)

**Goal:** Production ready on Railway

1. Error handling everywhere
2. Loading indicators
3. `/stats` command
4. Railway deployment
5. README for developers

---

## 💾 Database Schema

```sql
-- Users with API configuration
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    
    -- LLM Configuration (encrypted)
    llm_provider TEXT DEFAULT 'openrouter',
    openrouter_key_encrypted TEXT,
    claude_key_encrypted TEXT,
    openrouter_model TEXT DEFAULT 'qwen/qwen3-coder',
    
    -- Progress
    xp INTEGER DEFAULT 0,
    current_track INTEGER DEFAULT 1,
    current_level INTEGER DEFAULT 1,
    
    -- State
    onboarding_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Track scenarios seen for never-repeat
CREATE TABLE scenarios_seen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    scenario_id TEXT NOT NULL,
    seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, scenario_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- All scenario attempts
CREATE TABLE attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    scenario_id TEXT NOT NULL,
    mode TEXT NOT NULL,  -- 'learn' | 'train'
    user_response TEXT NOT NULL,
    score INTEGER NOT NULL,
    feedback_json TEXT,
    xp_earned INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Support sessions
CREATE TABLE support_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    input_type TEXT NOT NULL,  -- 'text' | 'image'
    context_text TEXT,
    prospect_analysis TEXT,
    closing_strategy TEXT,
    draft_response TEXT,
    casebook_added BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Casebook for reusable responses
CREATE TABLE casebook (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    persona_type TEXT NOT NULL,
    scenario_type TEXT NOT NULL,
    industry TEXT,
    seniority TEXT,
    prospect_analysis TEXT,
    closing_strategy TEXT,
    engagement_tactics TEXT,
    draft_response TEXT,
    times_used INTEGER DEFAULT 0,
    positive_feedback INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 LLM Router Pattern

```python
# services/llm_router.py

from abc import ABC, abstractmethod
import httpx
import anthropic

class LLMProvider(ABC):
    @abstractmethod
    async def complete(self, system: str, user: str, max_tokens: int = 1500) -> str:
        pass

class OpenRouterProvider(LLMProvider):
    BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
    
    def __init__(self, api_key: str, model: str = "qwen/qwen3-coder"):
        self.api_key = api_key
        self.model = model
    
    async def complete(self, system: str, user: str, max_tokens: int = 1500) -> str:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.BASE_URL,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user}
                    ],
                    "max_tokens": max_tokens
                },
                timeout=60.0
            )
            return response.json()["choices"][0]["message"]["content"]

class ClaudeProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        self.client = anthropic.AsyncAnthropic(api_key=api_key)
        self.model = model
    
    async def complete(self, system: str, user: str, max_tokens: int = 1500) -> str:
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}]
        )
        return response.content[0].text

def get_provider(user_config) -> LLMProvider:
    if user_config.llm_provider == "claude":
        return ClaudeProvider(decrypt(user_config.claude_key_encrypted))
    return OpenRouterProvider(
        decrypt(user_config.openrouter_key_encrypted),
        user_config.openrouter_model
    )
```

---

## 📝 Knowledge Loading Pattern

```python
# services/knowledge.py

from pathlib import Path
import yaml
import json

DATA_DIR = Path("data")

def load_playbook() -> str:
    return (DATA_DIR / "playbook.md").read_text()

def load_company_knowledge() -> str:
    path = DATA_DIR / "company_knowledge.md"
    if path.exists():
        return path.read_text()
    return "# Company Knowledge\n\n[Not yet configured]"

def load_scenarios() -> dict:
    return json.loads((DATA_DIR / "scenarios.json").read_text())

def load_user_memory(telegram_id: int) -> dict:
    path = DATA_DIR / "user_memory" / f"{telegram_id}.yaml"
    if path.exists():
        return yaml.safe_load(path.read_text())
    return create_default_memory(telegram_id)

def get_full_knowledge_base() -> str:
    """Combine all knowledge for context stuffing"""
    return f"""
=== GETDEAL.AI COMPANY KNOWLEDGE ===
{load_company_knowledge()}

=== SALES PLAYBOOK & TACTICS ===
{load_playbook()}
"""

# Cache at module load
KNOWLEDGE_BASE = get_full_knowledge_base()
SCENARIOS = load_scenarios()
```

---

## 🎯 Never-Repeat Logic

```python
# For /train mode - never repeat until pool exhausted

async def get_random_scenario(user_id: int, db) -> dict:
    # Get all scenarios user has seen
    seen = await db.fetch_all(
        "SELECT scenario_id FROM scenarios_seen WHERE user_id = ?",
        (user_id,)
    )
    seen_ids = {row['scenario_id'] for row in seen}
    
    # Get available scenarios
    all_scenarios = SCENARIOS['train_pool']['scenarios']
    available = [s for s in all_scenarios if s['id'] not in seen_ids]
    
    # If pool exhausted, reset
    if not available:
        await db.execute(
            "DELETE FROM scenarios_seen WHERE user_id = ?",
            (user_id,)
        )
        available = all_scenarios
        # Notify user that pool reset
        return {"reset": True, "scenario": random.choice(available)}
    
    # Pick random and mark as seen
    scenario = random.choice(available)
    await db.execute(
        "INSERT INTO scenarios_seen (user_id, scenario_id) VALUES (?, ?)",
        (user_id, scenario['id'])
    )
    
    return {"reset": False, "scenario": scenario}
```

---

## 🌐 Environment Variables

```bash
# .env.example

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Encryption (generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
ENCRYPTION_KEY=your_encryption_key_here

# Optional: Default API keys for testing
ANTHROPIC_API_KEY=sk-ant-...
OPENROUTER_API_KEY=sk-or-v1-...

# Database
DATABASE_PATH=deal_quest.db

# Logging
LOG_LEVEL=INFO
```

---

## ✅ Definition of Done

**The bot is complete when:**

### Onboarding
- [ ] `/start` guides through provider selection
- [ ] API key validation works
- [ ] Keys encrypted in database
- [ ] `/settings` allows provider switching

### Support Mode
- [ ] `/support` accepts text
- [ ] `/support` accepts images
- [ ] Output: Analysis + Strategy + Engagement + Draft
- [ ] Regenerate buttons work
- [ ] Sessions saved to database

### Learning Mode
- [ ] `/learn` shows Track 1 progress
- [ ] 4 levels work with lessons + scenarios
- [ ] Scoring is specific (quotes user response)
- [ ] XP accumulates correctly

### Training Mode
- [ ] `/train` picks random scenario
- [ ] Never repeats until pool exhausted
- [ ] Pool reset notification works
- [ ] 20 scenarios in pool

### Memory System
- [ ] User YAML files created per user
- [ ] Updated after interactions
- [ ] Casebook stores good responses

### Infrastructure
- [ ] Works with OpenRouter free models
- [ ] Works with Claude API
- [ ] Deployed on Railway
- [ ] Errors don't crash bot

---

## 🚨 Common Pitfalls

1. **aiogram v2 patterns in v3** — Router syntax changed, research first
2. **Blocking in async** — Use aiosqlite, httpx, not sync libraries
3. **Missing error handling** — LLM calls can timeout, handle gracefully
4. **Memory file race conditions** — One user, one file, but careful with async
5. **Casebook over-saving** — Only save genuinely reusable responses

---

## 📚 Key Files to Read

Before coding, read these provided files:

1. `docs/ARCHITECTURE.md` — Multi-agent + memory design
2. `docs/TASK_BRIEF.md` — Full feature specifications
3. `data/playbook.md` — The actual sales playbook
4. `data/scenarios.json` — All scenario definitions
5. `prompts/*.md` — Agent system prompts

---

Good luck! Build something great. 🚀
