---
phase: 03-agent-infrastructure
plan: 01
subsystem: agent
tags: [pydantic, yaml, tool-calling, openrouter, tracing, agents]

# Dependency graph
requires:
  - phase: 01-observability
    provides: traced_span decorator and tracing infrastructure used by all new agent methods
provides:
  - data/agents.yaml with defaults section and 4 placeholder agents (deal_agent, coach_agent, strategy_agent, orchestrator)
  - bot/agents/config.py with ToolParam, AgentConfig, AgentsConfig Pydantic models and load_agents_config()
  - complete_with_tools() on OpenRouterProvider returning TextResponse or ToolCallResponse
  - ToolUseAgent base class with run_tool_loop() for Phase 4+ specialist agents
affects:
  - 03-02 (conversation history manager builds on this agent infrastructure)
  - 04-deal-agent (DealAgent inherits from ToolUseAgent)
  - 05-orchestrator (OrchestratorAgent inherits from ToolUseAgent)
  - 06-coach-strategy (CoachAgent and StrategyAgent inherit from ToolUseAgent)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Config-driven agent definition: agents.yaml defaults merged into per-agent config via load_agents_config()"
    - "Tool-use loop: ToolUseAgent.run_tool_loop() iterates until TextResponse or max_iterations, dispatching ToolCallResponse via registered handlers"
    - "Separate class hierarchies: ToolUseAgent (v2.0) coexists with BaseAgent (v1.0) — no cross-contamination"

key-files:
  created:
    - data/agents.yaml
    - bot/agents/config.py
    - bot/agents/tool_use_agent.py
  modified:
    - bot/services/llm_router.py

key-decisions:
  - "ToolUseAgent is a separate hierarchy from v1.0 BaseAgent — both coexist, no inheritance link"
  - "complete_with_tools() on ClaudeProvider raises NotImplementedError — tool support deferred to future phase"
  - "Tool schemas built dynamically from AgentConfig.tools (list[ToolParam]) at loop entry — enables config-driven tool sets"
  - "Agent defaults merged at load time (not runtime) — single validated AgentConfig per agent"

patterns-established:
  - "complete_with_tools() signature: system_prompt, messages, tools, *, model=None, temperature, max_tokens — model override for per-agent config"
  - "ToolHandler = Callable[[dict[str, Any]], Awaitable[Any]] — registered by name via register_tool()"
  - "run_tool_loop() raises RuntimeError on max_iterations exceeded — callers handle timeout behavior"

requirements-completed:
  - NLR-03

# Metrics
duration: 3min
completed: 2026-02-25
---

# Phase 3 Plan 01: Agent Framework Summary

**YAML config-driven agent system with ToolParam/AgentConfig Pydantic models, OpenRouter tool-calling via complete_with_tools(), and ToolUseAgent base class with run_tool_loop() for Phase 4+ specialist agents**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-25T05:42:53Z
- **Completed:** 2026-02-25T05:45:38Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created data/agents.yaml with defaults section and 4 placeholder agents (deal_agent, coach_agent, strategy_agent, orchestrator) — agent-level values override global defaults
- Built Pydantic model layer (ToolParam, AgentConfig, AgentsConfig, load_agents_config()) with defaults merging at load time
- Extended OpenRouterProvider with complete_with_tools() using same retry loop as complete(), returning typed TextResponse or ToolCallResponse dataclasses
- Created ToolUseAgent base class with register_tool(), _build_tool_schemas(), _execute_tool(), and @traced_span-decorated run_tool_loop()
- All new code participates in existing traced_span tracing infrastructure from Phase 1

## Task Commits

Each task was committed atomically:

1. **Task 1: Create agents.yaml config system with Pydantic models** - `1b93c1c` (feat)
2. **Task 2: Add complete_with_tools() and ToolUseAgent base class** - `5a479ef` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `data/agents.yaml` - Agent config with defaults section and 4 placeholder agent entries
- `bot/agents/config.py` - ToolParam, AgentConfig, AgentsConfig models plus load_agents_config() loader
- `bot/agents/tool_use_agent.py` - ToolUseAgent base class with tool-use loop, handler registration, schema building
- `bot/services/llm_router.py` - Added TextResponse/ToolCallResponse dataclasses, complete_with_tools() on OpenRouterProvider, NotImplementedError stub on ClaudeProvider

## Decisions Made

- ToolUseAgent is a deliberately separate class hierarchy from v1.0 BaseAgent — they coexist in bot/agents/ with no inheritance link, keeping v1.0 pipeline agents unaffected
- ClaudeProvider.complete_with_tools() raises NotImplementedError — tool support for Claude deferred until needed
- Tool schemas built dynamically from AgentConfig.tools at each loop entry, allowing config-driven tool sets to evolve without code changes
- Defaults merged at config load time (not runtime) so each agent has a single fully-resolved AgentConfig

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Agent infrastructure complete: load_agents_config(), ToolUseAgent, complete_with_tools() are all ready
- Phase 4 DealAgent can inherit from ToolUseAgent, define tools in agents.yaml, register handlers
- Phase 5 Orchestrator can inherit from ToolUseAgent, set temperature=0.3 from agents.yaml
- Prompt files (prompts/deal_agent.md, etc.) are referenced in agents.yaml but not yet created — Phase 4+ creates them

## Self-Check: PASSED

- FOUND: data/agents.yaml
- FOUND: bot/agents/config.py
- FOUND: bot/agents/tool_use_agent.py
- FOUND: bot/services/llm_router.py
- FOUND commit: 1b93c1c (Task 1)
- FOUND commit: 5a479ef (Task 2)
- load_agents_config() returns 4 agents
- TextResponse, ToolCallResponse, ToolUseAgent import cleanly
- @traced_span present on run_tool_loop and complete_with_tools
- Existing v1.0 agents untouched

---
*Phase: 03-agent-infrastructure*
*Completed: 2026-02-25*
