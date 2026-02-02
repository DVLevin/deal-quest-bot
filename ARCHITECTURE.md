# 🏗️ Deal Quest v4: Multi-Agent Architecture

**Design Principles: Cost-Zero Operations + Evolving Intelligence**

*Version 4.0 | January 2026*

---

## 🎯 Core Architecture Philosophy

### The Problem with Pure LLM Approaches
1. **Every generation costs money** — Even with free models, there are rate limits
2. **No learning from experience** — Same question = same generation effort
3. **No personalization** — User asks same thing twice, bot doesn't remember
4. **Chunking sucks** — Vector DBs chunk documents, losing context

### Our Solution: Hybrid Intelligence
```
CONTEXT STUFFING (full docs, no chunking)
    +
MEMORY SYSTEM (user history, preferences)
    +
CASEBOOK (reusable generated responses)
    +
MULTI-AGENT (specialized agents for different tasks)
    +
OPTIONAL: WEAVIATE (hybrid search when needed, not vector-only)
```

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER (Telegram)                               │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         ROUTER / DISPATCHER                             │
│                                                                         │
│  Analyzes user intent → Routes to appropriate agent                     │
│  /support → Strategist Agent                                            │
│  /learn, /train → Trainer Agent                                         │
│  Background → Memory Agent (async)                                      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          ▼                          ▼                          ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ STRATEGIST AGENT │    │  TRAINER AGENT   │    │  MEMORY AGENT    │
│                  │    │                  │    │                  │
│ Purpose:         │    │ Purpose:         │    │ Purpose:         │
│ Real deal help   │    │ Learning/scoring │    │ Background ops   │
│                  │    │                  │    │                  │
│ Capabilities:    │    │ Capabilities:    │    │ Capabilities:    │
│ • Analyze        │    │ • Present        │    │ • Update user    │
│   prospect       │    │   scenarios      │    │   memory         │
│ • Generate       │    │ • Score          │    │ • Add to         │
│   strategy       │    │   responses      │    │   casebook       │
│ • Draft          │    │ • Give feedback  │    │ • Extract        │
│   outreach       │    │ • Track progress │    │   patterns       │
│ • Suggest        │    │ • XP system      │    │ • Summarize      │
│   engagement     │    │                  │    │   interactions   │
└────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        KNOWLEDGE LAYER                                  │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │
│  │ STATIC CONTEXT  │  │ DYNAMIC MEMORY  │  │ CASEBOOK (Reusable)     │ │
│  │                 │  │                 │  │                         │ │
│  │ • playbook.md   │  │ • user_memory/  │  │ • casebook.db           │ │
│  │ • company_kb.md │  │   {user_id}.yml │  │                         │ │
│  │ • scenarios.json│  │                 │  │ Stores:                 │ │
│  │                 │  │ Contains:       │  │ • Generated strategies  │ │
│  │ Loaded once     │  │ • Past queries  │  │ • Draft responses       │ │
│  │ ~20K tokens     │  │ • Preferences   │  │ • By persona type       │ │
│  │                 │  │ • Deal history  │  │                         │ │
│  │                 │  │ • Weak areas    │  │ Enables:                │ │
│  │                 │  │ • Strong areas  │  │ • "Show me example"     │ │
│  │                 │  │                 │  │ • Zero-cost retrieval   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        LLM ROUTER                                       │
│                                                                         │
│  User's choice: OpenRouter (FREE) or Claude API (Premium)               │
│  Automatically selects based on task complexity                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🧠 Memory System Design

### User Memory (`user_memory/{telegram_id}.yaml`)

Each user gets a YAML file that grows over time:

```yaml
# user_memory/123456789.yaml

user_info:
  telegram_id: 123456789
  name: "Alex"
  first_seen: "2026-01-20"
  total_sessions: 47
  
preferences:
  response_length: "concise"  # learned from feedback
  preferred_tone: "direct"
  communication_style: "linkedin"
  
learning_profile:
  current_track: 1
  current_level: 3
  total_xp: 847
  strongest_areas:
    - "corporate_positioning"
    - "success_fee_explanation"
  weakest_areas:
    - "pe_firm_objections"
    - "confidentiality_messaging"
  common_mistakes:
    - "saying 'fundraising' instead of 'M&A'"
    - "responses too long"

deal_history:
  - date: "2026-01-22"
    prospect_type: "corporate_vp"
    company: "Stripe"
    outcome: "meeting_booked"
    strategy_used: "peer_framing"
  - date: "2026-01-18"
    prospect_type: "pe_principal"
    company: "Vista"
    outcome: "no_response"
    strategy_used: "financial_metrics"

recent_interactions:
  - timestamp: "2026-01-23T14:30:00"
    mode: "support"
    query_summary: "VP Strategy at Stripe, pricing objection"
    response_quality: "positive"  # from user feedback
  - timestamp: "2026-01-23T10:15:00"
    mode: "train"
    scenario: "pe_cold_outreach"
    score: 78
    
patterns_noted:
  - "User often asks about PE firms"
  - "Prefers shorter responses"
  - "Usually active in afternoon"
```

### Memory Agent Responsibilities

The Memory Agent runs **asynchronously** after each interaction:

```python
class MemoryAgent:
    """
    Runs in background after user interactions.
    Updates user memory file with learned patterns.
    """
    
    async def process_interaction(self, user_id: int, interaction: dict):
        memory = self.load_user_memory(user_id)
        
        # Update based on interaction type
        if interaction['mode'] == 'support':
            await self.update_deal_history(memory, interaction)
            await self.extract_preferences(memory, interaction)
            await self.maybe_add_to_casebook(interaction)
            
        elif interaction['mode'] in ['learn', 'train']:
            await self.update_learning_profile(memory, interaction)
            await self.identify_weak_areas(memory, interaction)
        
        # Periodically summarize patterns (every 10 interactions)
        if memory['user_info']['total_sessions'] % 10 == 0:
            await self.summarize_patterns(memory)
        
        self.save_user_memory(user_id, memory)
    
    async def maybe_add_to_casebook(self, interaction: dict):
        """
        If response was high quality (user gave positive feedback),
        add to casebook for future reuse.
        """
        if interaction.get('user_feedback') == 'positive':
            casebook.add(
                persona_type=interaction['prospect_type'],
                scenario_key=self.generate_scenario_key(interaction),
                strategy=interaction['strategy_generated'],
                draft=interaction['draft_generated'],
                engagement_tactics=interaction['engagement_tactics']
            )
```

---

## 📚 Casebook System

### Purpose
Instead of generating new responses every time, store good responses and reuse them.

### Database Schema
```sql
-- Casebook for reusable responses
CREATE TABLE casebook (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Categorization (for matching)
    persona_type TEXT NOT NULL,      -- 'corporate_vp', 'pe_principal', 'founder_series_a'
    scenario_type TEXT NOT NULL,     -- 'cold_outreach', 'pricing_objection', 'follow_up'
    industry TEXT,                   -- 'fintech', 'healthcare', 'enterprise'
    seniority TEXT,                  -- 'c_level', 'vp', 'director', 'manager'
    
    -- The actual content
    prospect_analysis TEXT,
    closing_strategy TEXT,
    engagement_tactics TEXT,
    draft_response TEXT,
    playbook_references TEXT,
    
    -- Quality signals
    times_used INTEGER DEFAULT 0,
    positive_feedback INTEGER DEFAULT 0,
    negative_feedback INTEGER DEFAULT 0,
    quality_score REAL GENERATED ALWAYS AS (
        CASE WHEN times_used > 0 
        THEN (positive_feedback * 1.0 / times_used) 
        ELSE 0.5 END
    ) STORED,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user INTEGER,
    last_used TIMESTAMP
);

-- Index for fast lookups
CREATE INDEX idx_casebook_lookup ON casebook(persona_type, scenario_type, quality_score DESC);
```

### Casebook Retrieval Logic

```python
class CasebookService:
    
    async def find_similar_case(self, prospect_info: dict) -> Optional[dict]:
        """
        Try to find a reusable response before generating new one.
        Returns None if no good match found.
        """
        # Extract key attributes
        persona_type = self.classify_persona(prospect_info)
        scenario_type = self.classify_scenario(prospect_info)
        
        # Query for best match
        result = await self.db.execute("""
            SELECT * FROM casebook 
            WHERE persona_type = ? 
              AND scenario_type = ?
              AND quality_score >= 0.7
              AND times_used >= 2
            ORDER BY quality_score DESC, times_used DESC
            LIMIT 1
        """, (persona_type, scenario_type))
        
        case = result.fetchone()
        
        if case:
            # Update usage stats
            await self.db.execute(
                "UPDATE casebook SET times_used = times_used + 1, last_used = ? WHERE id = ?",
                (datetime.now(), case['id'])
            )
            return dict(case)
        
        return None  # No good match, need to generate
    
    async def get_or_generate(self, user, prospect_info: dict, llm_provider) -> dict:
        """
        Main entry point: try casebook first, generate only if needed.
        """
        # Step 1: Try casebook (FREE, instant)
        cached = await self.find_similar_case(prospect_info)
        if cached:
            return {
                'source': 'casebook',
                'cost': 0,
                **cached
            }
        
        # Step 2: Generate new (costs tokens)
        generated = await self.strategist_agent.generate(
            user, prospect_info, llm_provider
        )
        
        # Step 3: Queue for casebook addition (async)
        asyncio.create_task(
            self.memory_agent.maybe_add_to_casebook(generated)
        )
        
        return {
            'source': 'generated',
            'cost': generated['tokens_used'],
            **generated
        }
```

### User-Facing Casebook Features

```
User: /support
User: "Show me how to handle a VP of Strategy at a fintech"

Bot: 📚 CASEBOOK MATCH FOUND!
     
     Similar case: VP Strategy @ Stripe (Jan 22)
     Quality score: 92% (used 7 times, 6 positive)
     
     [👀 View This Example] [🆕 Generate Fresh Instead]

User: [clicks View This Example]

Bot: 📋 CASEBOOK EXAMPLE
     ━━━━━━━━━━━━━━━━━━━━━━━━
     
     ORIGINAL PROSPECT: Sarah Chen, VP Strategy @ Stripe
     
     🎯 STRATEGY USED:
     1. Frame as peer (she has M&A background)
     2. Lead with time savings, not cost
     3. Success-fee removes pricing objection
     
     💡 ENGAGEMENT:
     • Liked her AI strategy post
     • Commented on M&A trends post
     
     📝 DRAFT THAT WORKED:
     "Hi Sarah — with your Goldman background..."
     
     OUTCOME: Meeting booked ✅
     
     [✏️ Adapt This for My Prospect] [🆕 Generate New]
```

---

## 🤖 Multi-Agent System

### Agent 1: Strategist Agent

**Purpose:** Handle real deal support (`/support`)

**System Prompt Structure:**
```
You are the Strategist Agent for Deal Quest.

KNOWLEDGE BASE:
{playbook_content}
{company_knowledge}

USER CONTEXT:
{user_memory_yaml}

CASEBOOK EXAMPLES (similar prospects):
{relevant_casebook_entries}

YOUR TASK:
1. Analyze the prospect deeply
2. Generate a CLOSING STRATEGY (not just a message)
3. Suggest engagement tactics (LinkedIn, etc.)
4. Draft the outreach
5. Reference specific playbook sections

OUTPUT FORMAT:
[structured JSON for easy parsing]
```

### Agent 2: Trainer Agent

**Purpose:** Handle learning and scoring (`/learn`, `/train`)

**System Prompt Structure:**
```
You are the Trainer Agent for Deal Quest.

KNOWLEDGE BASE:
{playbook_content}
{company_knowledge}

LEARNER PROFILE:
{user_memory_yaml}
- Strongest areas: {strongest}
- Weakest areas: {weakest}
- Common mistakes: {mistakes}

CURRENT SCENARIO:
{scenario_details}

YOUR TASK (if scoring):
1. Score against rubric (0-100)
2. Reference SPECIFIC phrases from user's response
3. Compare to ideal response
4. Identify what they're learning vs still struggling with
5. Personalize feedback based on their history

OUTPUT FORMAT:
[structured JSON]
```

### Agent 3: Memory Agent

**Purpose:** Background operations, runs async

**Responsibilities:**
- Update user memory after each interaction
- Extract patterns from user behavior
- Add high-quality responses to casebook
- Identify learning gaps
- Summarize deal history periodically

**Does NOT require LLM for most operations** — just data processing.

**Uses LLM sparingly for:**
- Summarizing patterns (every 10 interactions)
- Extracting insights from deal outcomes
- Improving casebook categorization

---

## 🔮 Future: Weaviate (When Needed)

### Why Weaviate Over Pure Vector DBs

| Feature | ChromaDB | Weaviate |
|---------|----------|----------|
| Vector search | ✅ | ✅ |
| BM25 keyword search | ❌ | ✅ |
| Hybrid search | ❌ | ✅ |
| Store full objects | Limited | ✅ Full GraphQL |
| No chunking needed | ❌ Must chunk | ✅ Store full docs |
| Filtering | Basic | Advanced |
| Self-hosted | ✅ | ✅ |
| Cost | Free | Free (self-hosted) |

### When to Add Weaviate

**NOT for MVP.** Add when:
- Knowledge base > 50K tokens
- Need semantic + keyword search combined
- Want to search across casebook semantically
- Multiple playbooks/products

### Weaviate Architecture (Future)

```python
# FUTURE - Not for MVP

import weaviate

client = weaviate.Client("http://localhost:8080")

# Define schema (no chunking!)
client.schema.create_class({
    "class": "PlaybookSection",
    "vectorizer": "text2vec-transformers",
    "properties": [
        {"name": "title", "dataType": ["text"]},
        {"name": "content", "dataType": ["text"]},  # Full section, not chunks
        {"name": "section_type", "dataType": ["text"]},
        {"name": "buyer_type", "dataType": ["text"]},
    ]
})

# Hybrid search (vector + keyword)
result = client.query.get("PlaybookSection", ["title", "content"]) \
    .with_hybrid(
        query="handling pricing objections for PE firms",
        alpha=0.5  # Balance between vector and keyword
    ) \
    .with_limit(3) \
    .do()
```

---

## 📦 MVP Implementation Priority

### Phase 1: Core (MVP)
1. ✅ Context stuffing (playbook + company knowledge)
2. ✅ Basic user memory (YAML files)
3. ✅ Multi-agent structure (Strategist, Trainer)
4. ✅ Simple casebook (SQLite)

### Phase 2: Enhancement
1. Memory Agent (async background processing)
2. Casebook retrieval before generation
3. User feedback loop
4. Pattern extraction

### Phase 3: Scale (If Needed)
1. Weaviate for hybrid search
2. More sophisticated memory summarization
3. Cross-user pattern learning (anonymized)

---

## 💰 Cost Analysis

| Operation | Without Casebook | With Casebook |
|-----------|------------------|---------------|
| First /support query | ~2K tokens | ~2K tokens |
| Similar query (cached) | ~2K tokens | **0 tokens** |
| 10 similar queries | ~20K tokens | **~2K tokens** |
| Monthly (50 queries/user, 5 users) | ~500K tokens | **~50K tokens** |

**Casebook reduces LLM costs by ~90% for repeat patterns.**

---

## 🔧 Implementation Notes

### Memory File Management
```python
# Store in data/user_memory/{telegram_id}.yaml
# Load into context for each request
# Update async after interaction

USER_MEMORY_DIR = Path("data/user_memory")

def load_user_memory(telegram_id: int) -> dict:
    path = USER_MEMORY_DIR / f"{telegram_id}.yaml"
    if path.exists():
        return yaml.safe_load(path.read_text())
    return create_default_memory(telegram_id)

def save_user_memory(telegram_id: int, memory: dict):
    path = USER_MEMORY_DIR / f"{telegram_id}.yaml"
    path.write_text(yaml.safe_dump(memory, default_flow_style=False))
```

### Context Assembly
```python
def assemble_context(user_id: int) -> str:
    """
    Assemble full context for LLM call.
    All static knowledge + user-specific memory.
    """
    return f"""
=== GETDEAL.AI KNOWLEDGE BASE ===
{PLAYBOOK_CONTENT}

{COMPANY_KNOWLEDGE}

=== YOUR MEMORY OF THIS USER ===
{load_user_memory(user_id)}

=== RELEVANT CASEBOOK EXAMPLES ===
{get_relevant_casebook_examples(user_context)}
"""
```

---

*Architecture Version: 4.0*
*Key Innovation: Casebook + Memory = Near-Zero Marginal Cost*
