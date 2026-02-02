# 🎮 DEAL QUEST MVP v3: Enhanced Product Vision

**GetDeal.ai Sales Academy — Smart, Free, Self-Deploying**

*Version 3.0 | January 2026*
*For: Claude Code Engineering Sprint*

---

## 📋 What Changed From v2

| Aspect | v2 (Old) | v3 (New) | Why |
|--------|----------|----------|-----|
| Support Mode | Draft generator only | **Strategy + Engagement + Draft** | Full closing workflow |
| Input Types | Text only | **Text + Images (LinkedIn, websites)** | Real-world use case |
| Learning | `/learn` only | **`/learn` + `/train`** split | Structured vs Random |
| LLM Provider | Claude only | **Claude + OpenRouter** (switchable) | Cost optimization |
| Deployment | Manual setup | **Self-onboarding flow** | Zero-friction for users |
| Cost | Pay per API call | **Almost free** (free models option) | Sustainable |

---

## 🎯 Core Product Philosophy

### The Insight
> **Deal Quest is a CLOSING MACHINE, not a chatbot.**

It doesn't just answer questions — it:
1. Analyzes prospects (from text OR screenshots)
2. Generates **strategy** to close (not just a message)
3. Suggests engagement tactics (LinkedIn likes, comment prompts)
4. Then drafts the outreach

### The Training Analogy
> **Like case interviews for management consulting, but for sales.**

- `/learn` = Structured curriculum (tracks, levels, lessons)
- `/train` = Random scenarios that NEVER repeat, scored like case interviews

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      TELEGRAM USER                              │
│                                                                 │
│  Commands:                                                      │
│  /start    → Onboarding + API key setup                        │
│  /support  → Strategy + Draft for real prospects               │
│  /learn    → Structured track progression                       │
│  /train    → Random encounter (never repeats)                   │
│  /stats    → Progress + scores                                  │
│  /settings → Switch LLM provider, manage keys                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DEAL QUEST BOT (Python)                      │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ ONBOARDING   │  │ SUPPORT      │  │ LEARNING              │ │
│  │ FLOW         │  │ ENGINE       │  │ ENGINE                │ │
│  │              │  │              │  │                       │ │
│  │ • BotFather  │  │ • Image OCR  │  │ • /learn (tracks)     │ │
│  │   guide      │  │ • Strategy   │  │ • /train (random)     │ │
│  │ • API key    │  │   generator  │  │ • Scoring             │ │
│  │   storage    │  │ • Engagement │  │ • Never-repeat logic  │ │
│  │ • Provider   │  │   planner    │  │ • XP system           │ │
│  │   selection  │  │ • Draft      │  │                       │ │
│  └──────────────┘  └──────────────┘  └───────────────────────┘ │
│                            │                                    │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              LLM ROUTER (Provider Agnostic)              │  │
│  │                                                          │  │
│  │  ┌─────────────────┐    ┌─────────────────────────────┐ │  │
│  │  │ CLAUDE API      │    │ OPENROUTER API              │ │  │
│  │  │ (Direct)        │    │ (320+ models)               │ │  │
│  │  │                 │    │                             │ │  │
│  │  │ • Sonnet 4.5    │    │ FREE:                       │ │  │
│  │  │ • Haiku 4.5     │    │ • Qwen3 Coder               │ │  │
│  │  │                 │    │ • DeepSeek R1               │ │  │
│  │  │                 │    │ • Gemini Flash (free tier)  │ │  │
│  │  │                 │    │                             │ │  │
│  │  │                 │    │ PAID (cheap):               │ │  │
│  │  │                 │    │ • Claude via OpenRouter     │ │  │
│  │  │                 │    │ • GPT-4o-mini               │ │  │
│  │  └─────────────────┘    └─────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    SQLITE DATABASE                       │  │
│  │  • users (telegram_id, api_keys, provider_preference)   │  │
│  │  • progress (track, level, xp, scenarios_seen)          │  │
│  │  • attempts (scenario_id, response, score, feedback)    │  │
│  │  • support_sessions (context, strategy, draft)          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📝 Feature Specifications (Detailed)

---

### Feature 1: Self-Onboarding Flow (`/start`)

**Purpose:** Zero-friction setup — bot guides user through everything

**User Flow:**
```
User: /start

Bot: 🎮 WELCOME TO DEAL QUEST!
     GetDeal.ai Sales Academy
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     
     Let's get you set up in 2 minutes.
     
     STEP 1 OF 3: Choose Your AI Provider
     
     Which would you like to use?
     
     [🆓 OpenRouter (Free models available)]
     [💎 Claude API (Best quality)]
     [⚙️ I'll configure later]

User: [clicks 🆓 OpenRouter]

Bot: Great choice! OpenRouter gives you access to 
     FREE models like Qwen3 and DeepSeek.
     
     STEP 2 OF 3: Get Your API Key
     
     1. Go to: openrouter.ai/keys
     2. Sign up (free)
     3. Create a new API key
     4. Copy and paste it here 👇
     
     [📋 I have my key ready]

User: sk-or-v1-abc123xyz...

Bot: ✅ API key saved securely!
     
     Testing connection... 
     ✅ Connected to OpenRouter successfully!
     
     STEP 3 OF 3: Quick Tour
     
     Here's what you can do:
     
     💼 /support — Get strategy + drafts for real deals
     🎓 /learn — Structured training (tracks & levels)  
     🎲 /train — Random scenario practice
     📊 /stats — See your progress
     
     Ready to start?
     
     [🎓 Start Learning] [💼 I have a deal to work on]

User: [clicks 🎓 Start Learning]
Bot: [Enters /learn flow]
```

**For Claude API option:**
```
Bot: You chose Claude API — excellent for best quality!
     
     STEP 2 OF 3: Get Your API Key
     
     1. Go to: console.anthropic.com
     2. Create account or sign in
     3. Go to API Keys → Create Key
     4. Copy and paste it here 👇
     
     ⚠️ Note: Claude API requires payment. 
     Average cost: ~$0.01-0.05 per interaction.
```

**Key Implementation Details:**
- API keys encrypted before storage (use `cryptography` library)
- Support switching providers later via `/settings`
- Test API key before accepting (make small test call)

---

### Feature 2: Support Mode (`/support`) — ENHANCED

**Purpose:** Full closing strategy, not just draft generation

**Capabilities:**
1. Accept text context OR image uploads
2. Analyze prospect (type, concerns, stage)
3. Generate STRATEGY to close
4. Suggest engagement tactics (LinkedIn likes, comments)
5. Draft outreach message

**User Flow — Text Input:**
```
User: /support

Bot: 💼 SUPPORT MODE — Deal Closing Assistant
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     
     Share your prospect context:
     
     📝 Paste text (message, email, notes)
     — OR —
     📸 Send a screenshot (LinkedIn profile, website)
     
     The more context, the better my strategy!

User: "LinkedIn message from Sarah Chen, VP Strategy 
      at Stripe. She asked about our fees and process. 
      Seems interested but price-sensitive. Her profile 
      shows she's been at Stripe 4 years, previously 
      did M&A at Goldman."

Bot: 🔍 ANALYZING...
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

     📊 PROSPECT ANALYSIS
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     Type: Corporate (Strategic Buyer)
     Seniority: VP-level decision maker
     Background: M&A experience (Goldman) ← LEVERAGE THIS
     Stage: Early Interest → Discovery
     Key Concern: Pricing/value justification
     Buying Signal: ⚡ HIGH — asking about process
     
     🎯 CLOSING STRATEGY
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     
     1. FRAME AS PEER, NOT VENDOR
        She has M&A background — speak her language.
        Don't oversell; be direct and analytical.
     
     2. LEAD WITH TIME SAVINGS, NOT COST
        Corporate M&A teams burn 200+ hours on DD.
        Our value = their team's time, not our fee.
     
     3. SUCCESS-FEE REFRAME
        "You pay nothing unless we help you close"
        removes her pricing objection entirely.
     
     4. CREATE URGENCY
        Mention we have relevant AI assets in pipeline
        that match Stripe's likely acquisition criteria.
     
     💡 ENGAGEMENT TACTICS (Before Replying)
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     
     🔘 Like her 2 most recent LinkedIn posts
     🔘 If she posted about M&A/AI — comment:
        "[Smart observation about her post]. 
        This aligns with what we're seeing in 
        AI acquisition trends."
     
     This creates touchpoints before your reply lands.
     
     📝 DRAFT RESPONSE (LinkedIn)
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     
     Hi Sarah — with your Goldman M&A background, 
     you'll appreciate the model: success-fee only.
     You pay nothing unless we help Stripe close.
     
     The real value isn't our fee — it's saving your 
     team 200+ hours in technical DD. We pre-vet AI 
     targets against your specific criteria before 
     you spend time on calls.
     
     Actually have a few relevant AI assets in 
     payments/fintech infrastructure right now.
     
     Worth 20 mins to show you how we'd filter 
     for Stripe specifically?
     
     📚 PLAYBOOK REFERENCE
     • Corporate Value Prop (Section 3B)
     • Strategic Buyer Objections (Section 4)
     
     [🔄 Regenerate] [📝 Shorter] [🎯 More Aggressive]
     [💬 Generate Comment for Her Post]
```

**User Flow — Image Input:**
```
User: /support
User: [uploads screenshot of LinkedIn profile]

Bot: 🔍 ANALYZING IMAGE...
     
     I can see this is a LinkedIn profile for:
     
     📋 EXTRACTED INFO
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     Name: James Whitfield
     Title: Head of Corporate Development
     Company: Meridian Financial Systems
     
     Key Details Spotted:
     • 8 years at company
     • Previously: Strategy Consulting (McKinsey)
     • Recent activity: Posted about "AI transformation"
     • Connections: 2 mutual (from your network)
     
     What's your situation with James?
     
     [📨 Cold outreach] [💬 He messaged me] 
     [🔄 Following up] [❓ Other]

User: [clicks 📨 Cold outreach]

Bot: [Generates full strategy + draft for cold outreach]
```

---

### Feature 3: Learning Mode (`/learn`) — Structured Tracks

**Purpose:** Guided curriculum with progression

**Same as v2, but clarified:**
- 5 tracks total (MVP = Track 1 only)
- Each track has 4-5 levels
- Each level: Lesson → Scenario → Score → Feedback
- Must complete in order
- XP earned per level

```
User: /learn

Bot: 🎓 DEAL QUEST ACADEMY
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     
     TRACK 1: FOUNDATIONS ✅ Available
     ████████████████████ 3/4 complete
     
     TRACK 2: THE HUNT 🔒 Locked
     Complete Track 1 to unlock
     
     TRACK 3: THE NETWORK 🔒 Locked
     TRACK 4: THE MATCH 🔒 Locked
     TRACK 5: GTM OPS 🔒 Locked
     
     Your Progress:
     🎮 Level: Associate (520 XP)
     🔥 Streak: 3 days
     
     [▶️ Continue Level 1.4] [📊 See All Scores]
```

---

### Feature 4: Training Mode (`/train`) — Random Encounters 🆕

**Purpose:** Case interview-style practice with random scenarios

**Key Differentiator:** Scenarios NEVER repeat until all are exhausted

**User Flow:**
```
User: /train

Bot: 🎲 RANDOM ENCOUNTER MODE
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     
     A wild prospect appears!
     
     ⚡ SCENARIO #47 (You've completed 46/100)
     Difficulty: ⭐⭐⭐ Medium
     
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     
     PERSONA: David Kim
     Managing Director @ Vista Equity Partners
     (PE firm, $50B AUM, enterprise software focus)
     
     CONTEXT: Tech conference, cocktail hour.
     You've been introduced by a mutual contact.
     
     DAVID SAYS:
     "GetDeal.ai... I've heard the name. But honestly, 
     we have our own deal sourcing team and relationships 
     with every major tech banker. We see 500 deals a 
     year. What could you possibly show us that we 
     haven't already seen?"
     
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     
     YOUR MOVE:
     Reply to David. You have ~60 seconds in real life.
     
     ⏱️ Type your response:

User: [types response]

Bot: 🎯 SCORING YOUR RESPONSE
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     
     SCORE: 78/100 ⭐⭐⭐
     
     ✅ WHAT YOU NAILED:
     • Acknowledged their deal flow strength (+10)
       "You said 'I'm sure you see great deals...'"
     • Positioned as complement, not replacement (+15)
     • Mentioned AI-specific vetting (+12)
     • Kept it concise — under 45 seconds (+8)
     
     ⚠️ WHAT YOU MISSED:
     • Didn't mention "off-market" — key for PE (-8)
     • Could've referenced specific add-on potential (-7)
     • No concrete CTA (-7)
     
     📝 PLAYBOOK-PERFECT RESPONSE:
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     "That's exactly why we'd be valuable to you. 
     You see 500 deals — but how many are off-market 
     AI companies that haven't hired a banker yet?
     
     We specialize in AI assets specifically. Our 
     vetting process handles the technical DD that 
     usually burns your team's time — real AI vs 
     wrapper, data moat assessment, IP review.
     
     For a firm doing platform builds in enterprise 
     software, we could surface AI add-on targets 
     your traditional channels won't show you.
     
     Worth a 20-minute call to show you what's 
     currently in our pipeline?"
     
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     
     +78 XP earned! (Total: 598 XP)
     
     [🎲 Next Random Scenario] [📊 My Stats]
     [💡 Why This Matters] [📖 Related Playbook Section]
```

**Never-Repeat Logic:**
```python
# Database tracks which scenarios user has seen
scenarios_seen = get_user_scenarios(user_id)
all_scenarios = load_all_scenarios()

# Filter to unseen only
available = [s for s in all_scenarios if s.id not in scenarios_seen]

if not available:
    # User has seen everything — reset with notice
    reset_user_scenarios(user_id)
    available = all_scenarios
    notify_user("🎉 You've completed all scenarios! Starting fresh...")

# Random selection from available
scenario = random.choice(available)
mark_scenario_seen(user_id, scenario.id)
```

---

### Feature 5: Settings & Provider Management (`/settings`)

**Purpose:** Switch LLM providers, manage API keys, cost control

```
User: /settings

Bot: ⚙️ SETTINGS
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     
     🤖 AI PROVIDER
     Currently: OpenRouter (Qwen3)
     
     [Switch to Claude API]
     [Change OpenRouter Model]
     [Update API Key]
     
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     
     📊 USAGE THIS MONTH
     • API calls: 47
     • Estimated cost: $0.00 (free model)
     
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     
     🔧 OTHER SETTINGS
     [Reset Progress] [Export My Data] [Delete Account]
```

**Model Selection (OpenRouter):**
```
Bot: 🤖 SELECT OPENROUTER MODEL
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     
     🆓 FREE MODELS:
     • Qwen3 Coder — Fast, good for most tasks
     • DeepSeek R1 — Strong reasoning
     • Gemini Flash — Google's free tier
     
     💰 PAID (Cheap):
     • Claude Sonnet via OpenRouter — $0.003/1K tokens
     • GPT-4o-mini — $0.00015/1K tokens
     
     💎 PREMIUM:
     • Claude Opus — Best quality
     • GPT-4o — OpenAI flagship
     
     Current: Qwen3 Coder (Free)
     
     [Select Model]
```

---

## 🗄️ Database Schema (Enhanced)

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

-- Support sessions with full context
CREATE TABLE support_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    
    -- Input
    input_type TEXT NOT NULL,  -- 'text' | 'image'
    context_text TEXT,
    image_analysis TEXT,  -- If image was processed
    
    -- Output
    prospect_analysis TEXT,
    closing_strategy TEXT,
    engagement_tactics TEXT,
    draft_response TEXT,
    playbook_references TEXT,
    
    -- Metadata
    llm_provider TEXT,
    llm_model TEXT,
    tokens_used INTEGER,
    
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

---

## 🤖 LLM Router Implementation

**Key Principle:** Abstract the LLM provider so bot code doesn't care

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
    def __init__(self, api_key: str):
        self.client = anthropic.AsyncAnthropic(api_key=api_key)
    
    async def complete(self, system: str, user: str, max_tokens: int = 1500) -> str:
        response = await self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}]
        )
        return response.content[0].text

class OpenRouterProvider(LLMProvider):
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
                }
            )
            return response.json()["choices"][0]["message"]["content"]

def get_provider(user) -> LLMProvider:
    """Factory function to get appropriate provider for user"""
    if user.llm_provider == "claude":
        return ClaudeProvider(decrypt(user.claude_key_encrypted))
    else:
        return OpenRouterProvider(
            decrypt(user.openrouter_key_encrypted),
            user.openrouter_model
        )
```

---

## 📚 Knowledge Base Architecture

### Why Two Knowledge Files

The bot needs TWO types of knowledge to be effective:

| File | Purpose | Content | Why Needed |
|------|---------|---------|------------|
| `playbook.md` | HOW to sell | Tactics, processes, templates | Generic M&A skills |
| `company_knowledge.md` | WHAT we're selling | Company story, founders, proof | GetDeal-specific responses |

**Without company knowledge**, the bot can only say generic things like "We offer success-fee pricing."

**With company knowledge**, the bot can say things like:
- "Our founder Alex spent 10 years in M&A at Goldman, so he understands..."
- "We've helped companies like [Customer] achieve..."
- "Unlike traditional bankers, we specifically focus on AI companies because..."

### Context Stuffing (MVP Approach)

**No vector DB needed** — both files fit easily in context:
- `playbook.md`: ~8K tokens
- `company_knowledge.md`: ~10K tokens  
- **Total: ~18K tokens** (Claude has 200K context window)

### Knowledge File Specifications

**`data/playbook.md`** — Sales Playbook
```
Source: Convert the PDF playbook to markdown
Content:
- Platform positioning
- Seller acquisition steps
- Buyer acquisition steps (by type)
- GTM execution steps
- Objection handling (generic)
- Outreach templates
Size: ~8K tokens
```

**`data/company_knowledge.md`** — Company Knowledge
```
Source: User provides (via research request)
Content:
- Company identity (name, founding date, mission)
- Founding team (names, backgrounds, "why GetDeal")
- Product & platform (features, AI capabilities, user journeys)
- Market positioning (target market, competitors, unique value)
- Proof points (traction, case studies, testimonials)
- Objection handling (company-specific responses)
- Brand voice (tone, words to use/avoid)
Size: ~10K tokens
```

### Loading Knowledge in Prompts

```python
# bot/services/knowledge.py

from pathlib import Path

def load_knowledge_base() -> str:
    """
    Load all knowledge files for context stuffing.
    Called once at startup, cached for performance.
    """
    playbook_path = Path("data/playbook.md")
    company_path = Path("data/company_knowledge.md")
    
    playbook = playbook_path.read_text() if playbook_path.exists() else ""
    company = company_path.read_text() if company_path.exists() else ""
    
    return f"""
=== GETDEAL.AI COMPANY KNOWLEDGE ===
{company}

=== SALES PLAYBOOK & TACTICS ===
{playbook}
"""

# Cache at module level
KNOWLEDGE_BASE = load_knowledge_base()

# Use in prompts
SUPPORT_SYSTEM_PROMPT = f"""
You are Deal Quest, GetDeal.ai's strategic sales assistant.

{KNOWLEDGE_BASE}

WHEN ANALYZING A PROSPECT, YOU MUST:
1. Use company-specific proof points when building credibility
2. Reference founder expertise when relevant to the prospect's background
3. Apply playbook tactics appropriate to the prospect type
4. Match GetDeal's brand voice (confident but not arrogant)
5. Suggest engagement tactics before drafting outreach

[Rest of prompt...]
"""
```

### Future: Vector DB (Not MVP)

**When to add ChromaDB:**
- Knowledge base grows beyond 50K tokens
- Need semantic search ("find objection about pricing")
- Multiple playbooks for different products/regions

**ChromaDB is FREE, local, and fast (2025 Rust rewrite):**
```python
# FUTURE - Not for MVP
import chromadb

client = chromadb.Client()
collection = client.create_collection("getdeal_kb")

# Add sections of playbook
collection.add(
    documents=["Seller objection: pricing...", "Buyer objection: quality..."],
    metadatas=[{"type": "objection", "audience": "seller"}],
    ids=["obj_1", "obj_2"]
)

# Semantic search
results = collection.query(
    query_texts=["how to handle fee concerns"],
    n_results=3
)
```

---

## 🚀 Claude Code Build Iterations

### Iteration 1: Foundation + Onboarding (3-4 hours)

```markdown
# Task: Bot Foundation with Self-Onboarding

## Deliverables
1. Telegram bot skeleton (aiogram 3.x)
2. SQLite database with schema
3. /start command with full onboarding flow:
   - Provider selection (OpenRouter vs Claude)
   - API key collection and validation
   - Key encryption and storage
   - Connection test
4. /settings command for changing provider
5. LLM router abstraction layer

## Research Required
- aiogram 3.x FSM for multi-step onboarding
- cryptography library for API key encryption
- OpenRouter API authentication
- Anthropic Python SDK

## Definition of Done
- New user can complete onboarding in <2 minutes
- API keys are encrypted in database
- Bot can make test calls to verify keys work
- /settings allows switching providers
```

### Iteration 2: Support Mode with Strategy (3-4 hours)

```markdown
# Task: Support Mode — Full Closing Strategy

## Deliverables
1. /support command entry
2. Accept text OR image input
3. Image processing (extract text from LinkedIn screenshots)
4. Generate structured output:
   - Prospect Analysis
   - Closing Strategy (not just draft)
   - Engagement Tactics (likes, comment prompts)
   - Draft Response
   - Playbook References
5. Regenerate/Shorter/More Aggressive buttons
6. "Generate Comment" button for engagement
7. Session saved to database

## Research Required
- Telegram image handling in aiogram
- Image OCR options (Claude vision, or simpler)
- Prompt engineering for strategy generation

## Definition of Done
- Can paste text and get full strategy
- Can upload LinkedIn screenshot, bot extracts info
- Strategy includes engagement tactics, not just draft
- Regenerate produces meaningfully different output
```

### Iteration 3: Learning Mode — /learn (2-3 hours)

```markdown
# Task: Structured Learning Tracks

## Deliverables
1. /learn command showing track progress
2. Track 1: Foundations (4 levels)
3. Level flow: Lesson → Scenario → Score → Feedback
4. XP accumulation
5. Progress persistence
6. Locked tracks (visual only for MVP)

## Definition of Done
- User can complete all 4 levels of Track 1
- Scores are specific, reference user's actual words
- XP accumulates correctly
- /stats shows accurate progress
```

### Iteration 4: Training Mode — /train (2-3 hours)

```markdown
# Task: Random Encounter Mode (Never Repeats)

## Deliverables
1. /train command
2. Random scenario selection from pool
3. Never-repeat logic (track seen scenarios)
4. Reset when all scenarios exhausted
5. Same scoring system as /learn
6. "Why This Matters" explanation button
7. "Related Playbook Section" button

## Definition of Done
- Scenarios never repeat until all seen
- User notified when resetting
- 20+ scenarios in initial pool
- Each scenario has difficulty rating
```

### Iteration 5: Polish + Deploy (1-2 hours)

```markdown
# Task: Production Readiness

## Deliverables
1. Error handling (API failures, timeouts)
2. Loading indicators ("Thinking...")
3. Rate limiting
4. Railway deployment
5. README with setup instructions
6. .env.example

## Definition of Done
- Bot runs on Railway
- New user can self-onboard without documentation
- Errors don't crash the bot
- Response time < 15 seconds
```

---

## 💰 Cost Analysis

### OpenRouter Free Models
| Model | Quality | Speed | Cost |
|-------|---------|-------|------|
| Qwen3 Coder | Good | Fast | **FREE** |
| DeepSeek R1 | Good | Medium | **FREE** |
| Gemini Flash | Good | Fast | **FREE** (limited) |

### Estimated Monthly Cost (Team of 5)
| Usage Pattern | OpenRouter (Free) | Claude Direct |
|---------------|-------------------|---------------|
| 50 support uses | $0.00 | ~$2.50 |
| 100 training scenarios | $0.00 | ~$5.00 |
| 50 learn sessions | $0.00 | ~$2.50 |
| **Total** | **$0.00** | **~$10/month** |

**Recommendation:** Start with free OpenRouter models. Upgrade to Claude for users who want premium quality.

---

## ✅ MVP Success Criteria

The MVP is done when:

- [ ] New user can self-onboard in <2 minutes
- [ ] `/support` generates full closing strategy (not just draft)
- [ ] `/support` can process LinkedIn screenshots
- [ ] `/learn` has Track 1 (4 levels) fully working
- [ ] `/train` has 20+ scenarios that never repeat
- [ ] Scoring is specific and actionable
- [ ] Works with both OpenRouter (free) and Claude API
- [ ] Deployed on Railway
- [ ] One team member has used it for a real deal

---

## 📋 Quick Command Reference

```
/start    - Onboarding + API setup
/support  - Full closing strategy for real prospects
/learn    - Structured track progression
/train    - Random scenario practice (never repeats)
/stats    - Progress, XP, scores
/settings - Change provider, update keys
/help     - Command list
```

---

*Document Version: 3.0*
*Major Changes: Support as strategy, /train mode, multi-provider LLM, self-onboarding*
*Build Target: 12-15 hours*
