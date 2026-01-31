# Task Brief: Deal Quest MVP Bot — Claude Code Sprint (v3)

**Date:** January 2026  
**Sprint Duration:** 12-15 hours  
**Build Target:** Self-deploying Telegram bot with strategy-driven support + dual learning modes

---

## Background

GetDeal.ai is an M&A marketplace for AI companies. The partnership team needs a training and support tool that:
1. Helps new hires learn the sales playbook through interactive scenarios
2. Provides **strategy-driven assistance** for closing real deals (not just drafts)
3. Enables random "case interview" style practice that never repeats

Current state: Static PDF playbook, founders answer questions on Slack.
Problem: Slow onboarding, inconsistent messaging, founders are bottleneck.

**Key Design Principles:**
- **Almost free to run** — Support both Claude API AND OpenRouter (free models available)
- **Self-onboarding** — Bot guides users through setup (API keys, etc.)
- **Strategy, not just drafts** — Support mode generates closing strategy + engagement tactics
- **Never-repeat training** — Random scenarios exhaust pool before repeating

---

## Project Objective

Build a Telegram bot ("Deal Quest") that enables GetDeal.ai team members to:
1. Get **full closing strategies** for real prospects (not just draft messages)
2. Practice with **structured learning tracks** (`/learn`)
3. Practice with **random scenarios** that never repeat (`/train`)
4. **Self-configure** their own LLM provider (Claude or OpenRouter)

The bot must be production-ready, deployed on Railway, and cost nearly $0 to operate using free OpenRouter models.

---

## Required Features

### 1. Self-Onboarding Flow (`/start`)

**Purpose:** Zero-friction setup — bot guides user through everything needed

**Commands to implement:**
```
/start    → Onboarding flow + API key setup
/help     → List available commands
/support  → Strategy + draft for real prospects
/learn    → Structured track progression
/train    → Random scenario practice (never repeats)
/stats    → Show user progress (XP, completion)
/settings → Switch LLM provider, update API keys
```

**Onboarding Flow:**
```
User: /start

Bot: 🎮 WELCOME TO DEAL QUEST!
     
     Let's set you up in 2 minutes.
     
     STEP 1: Choose Your AI Provider
     
     [🆓 OpenRouter (Free models available)]
     [💎 Claude API (Best quality, paid)]

User: [clicks OpenRouter]

Bot: Great! OpenRouter has free models like Qwen3 and DeepSeek.
     
     STEP 2: Get Your API Key
     
     1. Go to: openrouter.ai/keys
     2. Create free account
     3. Generate API key
     4. Paste it here 👇

User: sk-or-v1-abc123...

Bot: ✅ Key saved! Testing connection...
     ✅ Connected successfully!
     
     You're ready! Here's what you can do:
     
     💼 /support — Get closing strategy for real deals
     🎓 /learn — Structured training tracks
     🎲 /train — Random scenario practice
     
     [🎓 Start Learning] [💼 I have a deal]
```

**Technical Requirements:**
- Encrypt API keys before storing (use `cryptography` library)
- Test API key before accepting (make small test call)
- Support switching providers via `/settings`

---

### 2. Support Mode (`/support`) — STRATEGY-DRIVEN

**Purpose:** Full closing strategy, not just draft generation

**Flow:**
1. User pastes context (text) OR uploads image (LinkedIn screenshot, website)
2. Bot analyzes prospect (type, concerns, stage, buying signals)
3. Bot generates **CLOSING STRATEGY** (multi-step approach)
4. Bot suggests **ENGAGEMENT TACTICS** (LinkedIn likes, comment prompts)
5. Bot generates **DRAFT OUTREACH** using playbook
6. User can regenerate, request variations, or request LinkedIn comment draft

**User flow (text input):**
```
User: /support
Bot: "💼 SUPPORT MODE — Deal Closing Assistant
     
     Share your prospect context:
     📝 Paste text (message, email, notes)
     — OR —
     📸 Send screenshot (LinkedIn profile, website)"

User: "Sarah Chen, VP Strategy at Stripe. Asked about 
      fees. Seems skeptical but engaged. Previously 
      did M&A at Goldman."

Bot: "🔍 ANALYZING...
     
     📊 PROSPECT ANALYSIS
     ━━━━━━━━━━━━━━━━━━━━━━━━
     Type: Corporate (Strategic Buyer)
     Seniority: VP — decision-maker level
     Background: M&A experience (Goldman) ← LEVERAGE THIS
     Stage: Early Interest → Discovery
     Key Concern: Pricing/value justification
     Buying Signal: ⚡ HIGH — asking about process
     
     🎯 CLOSING STRATEGY
     ━━━━━━━━━━━━━━━━━━━━━━━━
     
     1. FRAME AS PEER, NOT VENDOR
        She has M&A background — speak her language.
        Don't oversell; be direct and analytical.
     
     2. LEAD WITH TIME SAVINGS, NOT COST
        Corporate M&A burns 200+ hours on DD.
        Our value = their team's time, not our fee.
     
     3. SUCCESS-FEE REFRAME
        'You pay nothing unless we help you close'
        removes pricing objection entirely.
     
     💡 ENGAGEMENT TACTICS (Before Replying)
     ━━━━━━━━━━━━━━━━━━━━━━━━
     
     🔘 Like her 2 most recent LinkedIn posts
     🔘 If she posted about M&A/AI, comment:
        '[Smart observation]. This aligns with 
        what we're seeing in AI acquisition trends.'
     
     📝 DRAFT RESPONSE
     ━━━━━━━━━━━━━━━━━━━━━━━━
     Hi Sarah — with your Goldman background, you'll 
     appreciate the model: success-fee only. You pay 
     nothing unless we help Stripe close.
     
     The real value isn't our fee — it's saving your 
     team 200+ hours in technical DD...
     
     📚 PLAYBOOK REF: Corporate Value Prop (Section 3)
     
     [🔄 Regenerate] [📝 Shorter] [🎯 More Aggressive]
     [💬 Generate Comment for Her Post]"
```

**User flow (image input):**
```
User: /support
User: [uploads LinkedIn screenshot]

Bot: "🔍 ANALYZING IMAGE...
     
     📋 EXTRACTED INFO
     Name: James Whitfield
     Title: Head of Corp Dev @ Meridian Financial
     Background: Ex-McKinsey, 8 years at company
     Recent activity: Posted about 'AI transformation'
     
     What's your situation with James?
     
     [📨 Cold outreach] [💬 He messaged me] [🔄 Following up]"

User: [clicks Cold outreach]
Bot: [Generates full strategy + draft for cold outreach]
```

**Technical Requirements:**
- Accept both text and photo uploads
- For images: Use Claude vision OR extract text for analysis
- Generate structured multi-part response
- Include engagement tactics, not just draft
- Inline keyboard for variations

---

### 3. Learning Mode (`/learn`) — Structured Tracks

**Purpose:** Guided curriculum with progression (like a course)

**Structure:**
- Track 1: "Foundations" (4 levels) — MVP
- Each level: Lesson → Scenario → Score → Feedback
- Must complete in order
- XP earned per level

**User flow:**
```
User: /learn
Bot: "🎓 TRACK 1: FOUNDATIONS
     Progress: ██░░░░░░░░ 1/4 complete
     XP: 172
     
     [▶️ Continue Level 1.2] [🔄 Replay 1.1]"

User: [clicks Continue]
Bot: [Shows lesson content]
Bot: [Presents scenario]
User: [Types response]
Bot: [Scores and shows feedback + ideal response]
```

---

### 4. Training Mode (`/train`) — Random Encounters 🆕

**Purpose:** Case interview-style practice with RANDOM scenarios that NEVER REPEAT

**Key Differentiator from /learn:**
- Random selection from scenario pool
- No predefined order
- Scenarios never repeat until ALL are exhausted
- Then pool resets with notification

**User flow:**
```
User: /train

Bot: "🎲 RANDOM ENCOUNTER MODE
     
     A wild prospect appears!
     
     ⚡ SCENARIO #47 (You've completed 46/100)
     Difficulty: ⭐⭐⭐ Medium
     
     PERSONA: David Kim
     Managing Director @ Vista Equity Partners
     
     DAVID SAYS:
     'GetDeal.ai... I've heard the name. But we have 
     our own deal sourcing team. We see 500 deals a 
     year. What could you show us that we haven't seen?'
     
     YOUR MOVE: Reply to David.
     ⏱️ Type your response:"

User: [types response]

Bot: "🎯 SCORE: 78/100
     
     ✅ NAILED:
     • Acknowledged their deal flow strength (+10)
     • Positioned as complement, not replacement (+15)
     
     ⚠️ MISSED:
     • Didn't mention 'off-market' — key for PE (-8)
     • No concrete CTA (-7)
     
     📝 IDEAL RESPONSE:
     [Shows playbook-perfect version]
     
     +78 XP earned!
     
     [🎲 Next Random] [📊 My Stats]"
```

**Never-Repeat Implementation:**
```python
# Track which scenarios user has seen
scenarios_seen = db.get_user_scenarios(user_id)
all_scenarios = load_all_scenarios()

# Filter to unseen only
available = [s for s in all_scenarios if s.id not in scenarios_seen]

if not available:
    # All exhausted — reset with notice
    db.reset_user_scenarios(user_id)
    available = all_scenarios
    notify_user("🎉 You've completed all scenarios! Starting fresh...")

scenario = random.choice(available)
db.mark_scenario_seen(user_id, scenario.id)
```

---

### 5. Settings (`/settings`)

**Purpose:** Manage LLM provider, API keys

```
User: /settings

Bot: "⚙️ SETTINGS
     
     🤖 AI PROVIDER
     Current: OpenRouter (Qwen3 - Free)
     
     [Switch to Claude API]
     [Change OpenRouter Model]
     [Update API Key]
     
     📊 USAGE THIS MONTH
     API calls: 47
     Est. cost: $0.00 (free model)
     
     [Reset Progress] [Delete Account]"
```

**Technical stack:**
- `aiogram 3.x` — Modern async Telegram framework (RESEARCH REQUIRED)
- `aiosqlite` — Async SQLite for persistence
- `anthropic` — Claude API SDK
- `httpx` — For OpenRouter API calls
- `cryptography` — API key encryption
- `python-dotenv` — Environment management

**Research requirement:** Search web for latest aiogram 3.x patterns AND OpenRouter Python integration before implementing.

---

## Technical Requirements

### LLM Router (Multi-Provider Support) 🆕

**Purpose:** Abstract LLM provider so bot works with Claude API OR OpenRouter

```python
# services/llm_router.py

from abc import ABC, abstractmethod
import anthropic
import httpx

class LLMProvider(ABC):
    @abstractmethod
    async def complete(self, system: str, user: str, max_tokens: int) -> str:
        pass

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

class OpenRouterProvider(LLMProvider):
    """
    OpenRouter provides 300+ models via OpenAI-compatible API.
    FREE models: qwen/qwen3-coder, deepseek/deepseek-r1, google/gemini-flash
    """
    def __init__(self, api_key: str, model: str = "qwen/qwen3-coder"):
        self.api_key = api_key
        self.model = model
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
    
    async def complete(self, system: str, user: str, max_tokens: int = 1500) -> str:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.base_url,
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

def get_provider(user_config) -> LLMProvider:
    """Factory to get appropriate provider based on user settings"""
    if user_config.llm_provider == "claude":
        return ClaudeProvider(decrypt(user_config.claude_key_encrypted))
    else:
        return OpenRouterProvider(
            decrypt(user_config.openrouter_key_encrypted),
            user_config.openrouter_model
        )
```

**Research Required:**
- OpenRouter API documentation (openrouter.ai/docs)
- Available free models on OpenRouter
- OpenAI SDK compatibility patterns

### Database Schema (SQLite)

```sql
-- Users with API key storage
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    
    -- API Configuration (encrypted)
    llm_provider TEXT DEFAULT 'openrouter',  -- 'openrouter' | 'claude'
    openrouter_key_encrypted TEXT,
    claude_key_encrypted TEXT,
    openrouter_model TEXT DEFAULT 'qwen/qwen3-coder',
    
    -- Progress
    xp INTEGER DEFAULT 0,
    current_track INTEGER DEFAULT 1,
    current_level INTEGER DEFAULT 1,
    streak_days INTEGER DEFAULT 0,
    last_active DATE,
    
    -- Settings
    onboarding_complete BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Track which scenarios user has seen (for /train never-repeat)
CREATE TABLE scenarios_seen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    scenario_id TEXT NOT NULL,
    seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, scenario_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- All scenario attempts (both /learn and /train)
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

-- Support sessions with strategy output
CREATE TABLE support_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    
    -- Input
    input_type TEXT NOT NULL,  -- 'text' | 'image'
    context_text TEXT,
    image_analysis TEXT,
    
    -- Output (structured)
    prospect_analysis TEXT,
    closing_strategy TEXT,
    engagement_tactics TEXT,
    draft_response TEXT,
    playbook_references TEXT,
    
    -- Metadata
    llm_provider TEXT,
    llm_model TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Track progress on structured learning
CREATE TABLE track_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    track_id INTEGER NOT NULL,
    level_id TEXT NOT NULL,
    status TEXT DEFAULT 'not_started',  -- 'not_started' | 'in_progress' | 'completed'
    best_score INTEGER,
    completed_at TIMESTAMP,
    UNIQUE(user_id, track_id, level_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### File Structure

```
deal-quest-bot/
├── bot/
│   ├── __init__.py
│   ├── main.py
│   ├── handlers/
│   │   ├── __init__.py
│   │   ├── start.py         # Onboarding flow
│   │   ├── support.py       # Strategy-driven support
│   │   ├── learn.py         # Structured tracks
│   │   ├── train.py         # Random encounters 🆕
│   │   ├── stats.py
│   │   └── settings.py      # Provider management 🆕
│   ├── services/
│   │   ├── __init__.py
│   │   ├── llm_router.py    # Multi-provider abstraction 🆕
│   │   ├── claude.py        # Claude-specific if needed
│   │   ├── scoring.py
│   │   ├── storage.py
│   │   └── crypto.py        # API key encryption 🆕
│   └── states.py            # FSM states
├── data/
│   ├── playbook.md          # Sales playbook content
│   ├── company_knowledge.md # Company info, founders, proof points 🆕
│   └── scenarios.json       # All scenarios (learn + train)
├── .env.example
├── requirements.txt
├── railway.toml
└── README.md
```

### Knowledge Base Files (Context Stuffing)

**IMPORTANT:** The bot uses "context stuffing" — loading all knowledge into the LLM's system prompt. No vector DB needed for MVP.

**Two knowledge files to include in prompts:**

1. **`data/playbook.md`** (~8K tokens)
   - Sales tactics, buyer/seller types
   - Outreach templates, objection handling
   - Pricing model, process steps
   - Source: Provided PDF converted to markdown

2. **`data/company_knowledge.md`** (~10K tokens) 🆕
   - **Company Identity:** Name, founding story, mission, stage
   - **Founding Team:** Names, backgrounds, expertise, "why GetDeal"
   - **Product & Platform:** Features, AI capabilities, user journeys
   - **Market Positioning:** Target market, competitors, unique value props
   - **Proof Points:** Traction metrics, case studies, social proof
   - **Objection Handling:** Company-specific responses (not just generic M&A)
   - **Brand Voice:** Tone, words to use/avoid, elevator pitches
   - Source: Will be provided by user

**Why BOTH files matter:**
- `playbook.md` = HOW to sell (tactics, process)
- `company_knowledge.md` = WHAT we're selling (company story, proof)

Without company knowledge, the bot can only give generic M&A advice.
WITH company knowledge, it can say things like:
- "Our founder spent 10 years at [Company], so he understands..."
- "We've helped companies like [Customer] achieve..."
- "Unlike [Competitor], we specifically focus on..."

**How to load in prompts:**
```python
from pathlib import Path

def load_knowledge_base() -> str:
    """Load all knowledge files for context stuffing"""
    playbook = Path("data/playbook.md").read_text()
    company = Path("data/company_knowledge.md").read_text()
    
    return f"""
=== GETDEAL.AI COMPANY KNOWLEDGE ===
{company}

=== SALES PLAYBOOK & TACTICS ===
{playbook}
"""

# Use in ALL prompts that need company context:
SUPPORT_SYSTEM_PROMPT = f"""
You are Deal Quest's support assistant for GetDeal.ai.

{load_knowledge_base()}

When crafting responses, you MUST:
1. Reference company-specific proof points when relevant
2. Use founder expertise to build credibility when appropriate
3. Apply playbook tactics for the specific situation
4. Match the brand voice described in company knowledge
"""
```

**Why context stuffing works here:**
- Total content: ~20K tokens
- Claude's context: 200K tokens
- Leaves plenty of room for conversation
- No external DB dependency
- Zero cost
- Instant retrieval (no latency)

**When to consider vector DB (FUTURE, not MVP):**
- If knowledge base grows beyond 50K tokens
- If you need semantic search within docs
- If you add multiple playbooks for different products
- If you want to cite specific sources in responses

**Future Vector DB: ChromaDB (FREE, recommended)**

If vector search is ever needed, use ChromaDB:
- **Cost:** FREE (open source, local/embedded)
- **2025 Update:** Rust rewrite = 4x faster writes/queries
- **Perfect for:** Prototypes under 10M vectors (we'll have <1000)
- **No infrastructure:** Runs embedded in Python app

```python
# Future ChromaDB integration (NOT for MVP)
# pip install chromadb

import chromadb

# Initialize (stores locally, zero config)
client = chromadb.Client()
collection = client.create_collection("getdeal_kb")

# Add documents
collection.add(
    documents=["playbook section 1...", "company info..."],
    metadatas=[{"source": "playbook"}, {"source": "company"}],
    ids=["doc1", "doc2"]
)

# Query
results = collection.query(
    query_texts=["how to handle pricing objection"],
    n_results=3
)
```

**Other FREE vector DB options (for reference):**
| DB | Best For | Notes |
|----|----------|-------|
| ChromaDB | MVP/Prototypes | Local, zero config, 4x faster in 2025 |
| Qdrant | Production | Rust, great filtering, self-hostable |
| pgvector | Existing Postgres | Add-on, no new infra |
| LanceDB | Serverless | Embedded, good for edge |

### Environment Variables

```
# Bot
TELEGRAM_BOT_TOKEN=xxx

# Encryption key for API key storage
ENCRYPTION_KEY=xxx  # Generate with: Fernet.generate_key()

# Default fallback (optional, for testing)
ANTHROPIC_API_KEY=xxx
OPENROUTER_API_KEY=xxx

# Config
DATABASE_PATH=deal_quest.db
LOG_LEVEL=INFO
```

---

## Key Inclusion Requirements

### 1. Multi-Provider LLM Support 🆕
- Must work with BOTH Claude API AND OpenRouter
- User selects provider during onboarding
- OpenRouter default model should be FREE (e.g., qwen/qwen3-coder)
- Easy to switch via `/settings`

### 2. Self-Onboarding Flow 🆕
- Bot guides user through EVERYTHING
- No manual configuration needed
- Instructions for getting API keys
- Test API key before accepting
- Encrypted storage of keys

### 3. Strategy-Driven Support Mode 🆕
- NOT just draft generation — full closing STRATEGY
- Include engagement tactics (LinkedIn likes, comments)
- Support image uploads (LinkedIn screenshots)
- Multi-part structured output

### 4. Never-Repeat Training (/train) 🆕
- Random scenario selection from pool
- Track which scenarios each user has seen
- Never repeat until ALL scenarios exhausted
- Reset with notification when pool depleted

### 5. Real Playbook Integration
- Playbook content loaded and used in prompts
- NOT just "pretending" — actual content matching
- Playbook sections referenced in output

### 6. Specific Scoring Feedback
- Scores reference specific phrases from user's response
- NOT generic "good job" — specific "You said X but missed Y"
- Compare against ideal response for gap analysis

### 7. Conversation State Management
- Use aiogram FSM properly
- User can be in: onboarding, support, learning, training
- Handle unexpected inputs gracefully

---

## Definition of Done

The bot is complete when:

**Onboarding:**
- [ ] `/start` guides new user through provider selection
- [ ] User can paste API key and bot validates it
- [ ] API keys encrypted in database
- [ ] `/settings` allows switching providers

**Support Mode:**
- [ ] `/support` accepts text context
- [ ] `/support` accepts image uploads (LinkedIn screenshots)
- [ ] Output includes: Analysis + Strategy + Engagement Tactics + Draft
- [ ] Regenerate/Shorter/Aggressive buttons work
- [ ] "Generate Comment" button works

**Learning Mode:**
- [ ] `/learn` shows Track 1 progress
- [ ] All 4 levels in Track 1 playable
- [ ] Scoring returns specific, actionable feedback
- [ ] XP accumulates and persists

**Training Mode:**
- [ ] `/train` selects random scenario
- [ ] Scenarios NEVER repeat until all exhausted
- [ ] User notified when pool resets
- [ ] 20+ scenarios in pool

**Infrastructure:**
- [ ] Works with BOTH Claude API and OpenRouter
- [ ] Free OpenRouter model (Qwen3) is default
- [ ] Bot deployed on Railway
- [ ] Response time < 15 seconds
- [ ] Errors don't crash the bot
- [ ] README explains setup

---

## Acceptance Criteria

1. **New user** can self-onboard with just an OpenRouter API key (free) in <3 minutes
2. **Partnership manager** gets full closing STRATEGY, not just a draft
3. **Random training** (`/train`) never repeats scenarios
4. **Scoring** feels fair — users understand why they got their score
5. **Progress persists** — closing Telegram and reopening shows same XP
6. **Bot costs nearly $0** — free OpenRouter models work well
7. **Bot recovers** from errors without needing restart

---

## Points to Emphasize

- **Strategy over drafts** — Support mode is a CLOSING ASSISTANT, not just a draft generator
- **Self-onboarding** — User should need ZERO external documentation
- **Cost optimization** — Default to FREE models, premium is opt-in
- **Never-repeat training** — This is the "case interview" experience
- **Scoring must be specific** — Generic feedback defeats the purpose
- **Mobile-first UX** — Telegram messages should be readable on phone

---

## Anti-Patterns to Avoid

❌ **Don't add these in MVP:**
- Leaderboards (needs more DB work)
- Badges (nice but not core)
- Multiple tracks (just Track 1)
- Vector database (playbook fits in context)
- Admin dashboard (edit files directly)
- Voice input (future)

❌ **Don't over-engineer:**
- No need for Docker (Railway handles it)
- No need for Redis/caching
- No need for complex config service
- No need for multiple encryption schemes

---

## Research Requirements

**⚠️ CRITICAL: RESEARCH BEFORE CODING — DO NOT HALLUCINATE**

**Claude Code MUST web search for CURRENT January 2026 best practices before implementing ANYTHING.** Libraries, APIs, and best practices change rapidly. The documentation you were trained on may be outdated.

### The 2026 Research Mandate

**BEFORE writing ANY code for a feature, Claude Code MUST:**

1. **Web search** for "[library/tool name] 2025 2026 best practices"
2. **Verify** the latest version numbers and API patterns
3. **Check** for breaking changes from previous versions
4. **Find** the cheapest/free alternatives that meet requirements
5. **Document** what you learned in code comments

**Example research workflow:**
```
Task: Implement Telegram bot with aiogram
Step 1: Search "aiogram 3.x tutorial 2025 2026"
Step 2: Search "aiogram FSM conversation handler 2025"
Step 3: Search "aiogram 3 vs aiogram 2 migration breaking changes"
Step 4: Verify Router patterns (aiogram 3 uses Router, not Dispatcher for handlers)
Step 5: Implement based on CURRENT documentation
```

### Mandatory Research Topics

1. **aiogram 3.x** — Library changed SIGNIFICANTLY from v2. Get CURRENT patterns (2025+).
   - Search: "aiogram 3 router handlers 2025 2026"
   - Key changes: Router replaces some Dispatcher usage, new FSM API
2. **aiogram FSM** — Finite State Machine for multi-step conversations
   - Search: "aiogram 3 FSM StatesGroup 2025"
3. **OpenRouter API 2026** — How to call, authentication, FREE models
   - Search: "OpenRouter API python 2025 2026 free models"
   - Verify: Which models are currently FREE (changes frequently)
4. **OpenRouter free models January 2026** — Which FREE models work best for:
   - Search: "OpenRouter free tier models list 2026"
   - Current free options may include: Qwen3, DeepSeek, Gemini Flash, Llama
   - **DO NOT ASSUME** — verify current free tier
5. **Telegram image handling** — How to receive and process photos in aiogram 3.x
   - Search: "aiogram 3 photo handler download image 2025"
6. **cryptography library** — Fernet encryption for API key storage
   - Search: "python fernet encryption best practices 2025"
7. **Railway Python deployment 2026** — Current best practices, free tier limits
   - Search: "Railway python deployment 2025 2026 free tier"
   - Verify current free tier limits (may have changed)
8. **ChromaDB (for future)** — If vector search ever needed
   - Search: "ChromaDB python 2025 2026 embedded local"
   - 2025 Rust rewrite made it 4x faster

### Cost-First Decision Framework

**Before choosing ANY tool/library, Claude Code must ask:**
1. Is there a FREE alternative that works?
2. Is there an open-source option I can self-host?
3. What are the free tier limits?
4. What's the cost if we exceed free tier?

**Prioritize in this order:**
1. 🆓 **FREE** (no cost ever)
2. 💚 **Open source** (self-hostable)
3. 💛 **Generous free tier** (won't hit limits easily)
4. 💰 **Paid** (only if no alternative)

### Free Tools to Prioritize

| Category | FREE Option | Notes | Alternative |
|----------|-------------|-------|-------------|
| **LLM** | OpenRouter (Qwen3, DeepSeek) | Completely free | Gemini Flash free tier |
| **Database** | SQLite | Zero cost, embedded, async via aiosqlite | - |
| **Hosting** | Railway free tier | 500 hours/month (verify current) | Render free tier |
| **Vector DB** | ChromaDB | Local, 4x faster (2025 Rust rewrite) | LanceDB, Qdrant self-hosted |
| **Image OCR** | Tesseract | Open source | Claude Vision (paid) |
| **Encryption** | cryptography (Fernet) | Standard Python library | - |
| **HTTP Client** | httpx | Async, built-in | aiohttp |

### Cost-First Decision Framework

**Before choosing ANY tool/library, Claude Code must ask:**
1. Is there a **FREE** alternative that works? → Use it
2. Is there an **open-source** option I can self-host? → Consider it
3. What are the **free tier limits**? → Will we hit them?
4. What's the **cost if we exceed** free tier? → Is it acceptable?
5. Has this tool been **updated recently** (2025-2026)? → Avoid abandoned projects

**ALWAYS verify via web search:**
- Current free tier limits (they change!)
- Current API patterns (libraries update!)
- Current pricing (costs change!)

**Prioritize in this order:**
1. 🆓 **FREE forever** (no cost ever, no limits)
2. 💚 **Open source** (self-hostable, community maintained)
3. 💛 **Generous free tier** (won't hit limits with our usage)
4. 💰 **Paid** (only if no viable alternative)

---

## Final Deliverables

1. **Working Telegram bot** — Responds to all commands
2. **Multi-provider LLM** — Works with Claude AND OpenRouter
3. **Self-onboarding** — New users set up in <3 minutes
4. **SQLite database** — Schema implemented, data persists
5. **Knowledge base loading** — Both playbook.md and company_knowledge.md
6. **Railway deployment** — Bot runs in production
7. **README.md** — Setup instructions (for developers, not users)
8. **requirements.txt** — All dependencies listed

---

## Timeline Guidance

| Phase | Hours | Deliverable |
|-------|-------|-------------|
| Foundation + Onboarding | 3-4 | Bot skeleton, DB, `/start` with API key flow |
| LLM Router | 2 | Multi-provider abstraction (Claude + OpenRouter) |
| Support Mode | 3-4 | Strategy-driven `/support` with image support |
| Learning Mode | 2-3 | Track 1 with 4 levels |
| Training Mode | 2-3 | Random encounters with never-repeat |
| Polish + Deploy | 1-2 | Error handling, Railway, README |
| **Total** | **13-18** | **Production MVP** |

---

## Cost Analysis

| Provider | Model | Cost per 1K tokens | Quality |
|----------|-------|-------------------|---------|
| OpenRouter | qwen/qwen3-coder | **FREE** | Good |
| OpenRouter | deepseek/deepseek-r1 | **FREE** | Good |
| OpenRouter | google/gemini-flash | **FREE (limited)** | Good |
| OpenRouter | anthropic/claude-3-haiku | $0.00025 | Great |
| Claude API | claude-sonnet-4-20250514 | $0.003 | Excellent |

**Recommendation:** Default to FREE Qwen3 model. Users can upgrade via `/settings`.

---

*Task Brief Version: 3.0*
*Major Changes: Strategy-driven support, /train mode, multi-provider LLM, self-onboarding*
*Sprint Owner: Founder*
*Build Tool: Claude Code*
