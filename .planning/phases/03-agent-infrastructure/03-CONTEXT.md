# Phase 3: Agent Infrastructure - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the foundation that all specialist agents depend on: ToolUseAgent base class, agents.yaml configuration, tool-use loops via OpenRouter complete_with_tools(), per-user conversation history with hybrid persistence, and agent context builder. This phase does NOT build any specialist agents — it builds what they all share.

</domain>

<decisions>
## Implementation Decisions

### Agent Config Model (agents.yaml)
- Single agents.yaml file for all agents (ClickUp pattern)
- Global defaults section — agents inherit and can override
- Extended fields beyond ClickUp base: model, prompt_file, tools, max_iterations, timeout_seconds, temperature, description, fallback_behavior, context_sources
- Model is configurable per-agent — default to one model but allow overrides (e.g., cheaper model for orchestrator routing, stronger for specialists)
- Tool schemas defined fully in YAML (name, description, parameters JSON Schema) — not just tool names
- Config loaded once at startup — no hot-reload (restart to pick up changes)
- context_sources field per agent controls what data each agent receives (e.g., ['deals', 'memory', 'knowledge', 'conversation_history'])
- Routing rules: auto-generated base routing table from agents.yaml agent descriptions, PLUS hand-written nuance/overrides in orchestrator.md prompt. Orchestrator can ask clarifying questions when intent is ambiguous.

### Tool-Use Loop Behavior
- Typing indicator + brief status message for operations >5s. Status message gets replaced by final answer.
- Show brief tool activity indicators during execution (e.g., '🔍 Searching deals...' '✅ Found 3 deals') — helps users understand what's happening AND helps debugging
- Max iterations failure → error signal back to orchestrator. Orchestrator decides: retry, try different agent, or answer directly from context.
- Direct agent-to-agent calls supported (agents have invoke_* tools for other specialists). Orchestrator as fallback. Orchestrator monitors for user frustration/confusion to intervene.
- Confirmation-first writes: short-circuit pattern (ClickUp proven). Agent returns confirmation payload immediately, handler renders inline keyboard, actual API call happens on 'Confirm' tap — outside the loop.
- Per-user processing lock with latest-wins queueing. If user sends another message while processing, keep the latest, drop intermediate ones. Prevents race conditions.
- Streaming: Claude's discretion (decide based on OpenRouter + aiogram practicality)

### Conversation History
- Configurable sliding window size (default 20 messages, tunable in config)
- Hybrid persistence: in-memory dict[user_id, deque] for speed + async background flush to InsForge for durability. On restart, load last N turns from DB.
- Timestamps on every turn — stale context can be filtered. Messages from hours ago might not be relevant.
- Full turns stored: user message + tool calls + tool results + assistant response. Complete picture of what happened.
- Time-based sessions: after N hours of inactivity, detect new session. Offer: "Last time we discussed [summary]. Continue or start fresh?" User taps button or sends /clear. If continue → previous context appended.

### Agent Prompt Design
- Distinct personas per agent (not named characters, but different personality/tone): Coach is encouraging, Strategy is analytical, Deal Agent is efficient. User notices different "moods" but it's the same bot brand.
- Knowledge handling and prompt templating: Claude's discretion. Key constraint: don't stuff 70K playbook into every agent — use context_sources to control who gets what.
- Routing table: auto-generated base from agents.yaml descriptions + handwritten nuance in orchestrator.md. Combined approach — best of both.

### Claude's Discretion
- Prompt file location (data/ vs bot/agents/config/ — pick based on project structure)
- Agent naming convention in YAML (snake_case keys, etc.)
- Prompt templating approach ({{token}} vs Jinja2 vs f-strings)
- Streaming vs complete response
- Knowledge distribution across agents (which agent gets playbook, company knowledge, etc.)
- Error handling in tool execution (retry strategy, circuit breaking)
- Token budget management

</decisions>

<specifics>
## Specific Ideas

- "I want it like the ClickUp MCP bot" — multi-agent orchestrator with tool-use loops, confirmation-first CRM writes, agents.yaml config. Reference: /Users/dmytrolevin/Desktop/clickup mcp/
- Orchestrator should be smart enough to ask clarifying questions when intent is unclear, not just guess the wrong specialist
- The system should help users AND developers understand what's happening — show tool activity, support debugging through transparency
- Session continuity: "Last time we discussed [summary]. Continue or start fresh?" is a key UX moment
- Time-based session detection with summary bridges the gap between stateless and fully persistent conversations

</specifics>

<deferred>
## Deferred Ideas

- Token budget per agent turn (cost explosion prevention) — consider for Phase 5 (Orchestrator) or Phase 9 (Admin)
- Error handling and circuit breaker patterns for tool execution — can address during specialist agent phases (4-6)
- Agent hot-reload for development iteration — revisit if restart frequency becomes painful

</deferred>

---

*Phase: 03-agent-infrastructure*
*Context gathered: 2026-02-25*
