"""ToolUseAgent — base class for v2.0 agents that execute a tool-use loop.

Phase 4+ specialist agents (DealAgent, CoachAgent, StrategyAgent, Orchestrator)
inherit from this class. It is deliberately separate from the v1.0 BaseAgent hierarchy.
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Any

from bot.agents.config import AgentConfig, ToolParam
from bot.tracing import traced_span

logger = logging.getLogger(__name__)

# Callable type for a tool handler: receives parsed tool args, returns any serializable result
ToolHandler = Callable[[dict[str, Any]], Awaitable[Any]]


class ToolUseAgent:
    """Base class for agents that execute tool-use loops.

    Subclasses register tool handlers via register_tool() and invoke run_tool_loop().
    Phase 4+ specialist agents inherit from this.

    The v1.0 BaseAgent hierarchy (StrategistAgent, TrainerAgent, MemoryAgent) is
    entirely unaffected — both hierarchies coexist in bot/agents/.
    """

    def __init__(self, config: AgentConfig) -> None:
        self._config = config
        self._tool_handlers: dict[str, ToolHandler] = {}

        # Load system prompt from prompt_file if the file exists
        self._system_prompt: str = ""
        if config.prompt_file:
            prompt_path = Path(config.prompt_file)
            if not prompt_path.is_absolute():
                # Resolve relative to repo root (two parents above bot/agents/)
                prompt_path = Path(__file__).resolve().parent.parent.parent / config.prompt_file
            if prompt_path.exists():
                self._system_prompt = prompt_path.read_text(encoding="utf-8")
                logger.debug("Loaded system prompt for agent %s from %s", config.name, prompt_path)
            else:
                logger.warning(
                    "Prompt file not found for agent %s: %s", config.name, prompt_path
                )

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def name(self) -> str:
        """Agent name from config."""
        return self._config.name

    @property
    def config(self) -> AgentConfig:
        """The agent's full config."""
        return self._config

    # ------------------------------------------------------------------
    # Tool registration
    # ------------------------------------------------------------------

    def register_tool(self, name: str, handler: ToolHandler) -> None:
        """Register an async callable as the handler for a named tool."""
        self._tool_handlers[name] = handler
        logger.debug("Registered tool handler '%s' for agent %s", name, self.name)

    # ------------------------------------------------------------------
    # Schema building
    # ------------------------------------------------------------------

    def _build_tool_schemas(self) -> list[dict[str, Any]]:
        """Convert config.tools (list[ToolParam]) to OpenAI-format tool definitions."""
        schemas: list[dict[str, Any]] = []
        for t in self._config.tools:
            schemas.append({
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.parameters,
                },
            })
        return schemas

    # ------------------------------------------------------------------
    # Tool execution
    # ------------------------------------------------------------------

    async def _execute_tool(self, tool_call: Any) -> Any:
        """Dispatch a tool call to its registered handler.

        Returns the result on success, or an error string if the handler is
        missing or raises an exception.
        """
        handler = self._tool_handlers.get(tool_call.tool_name)
        if handler is None:
            error_msg = f"No handler registered for tool '{tool_call.tool_name}'"
            logger.warning("Agent %s: %s", self.name, error_msg)
            return error_msg

        try:
            return await handler(tool_call.tool_args)
        except Exception as exc:
            error_msg = f"Tool '{tool_call.tool_name}' raised an error: {exc}"
            logger.error("Agent %s: %s", self.name, error_msg)
            return error_msg

    # ------------------------------------------------------------------
    # Core tool-use loop
    # ------------------------------------------------------------------

    @traced_span("agent:tool_use_loop")
    async def run_tool_loop(
        self,
        messages: list[dict[str, Any]],  # conversation history as OpenAI messages
        llm_provider: Any,               # OpenRouterProvider with complete_with_tools()
        *,
        system_prompt: str | None = None,  # override for the loaded file prompt
    ) -> str:
        """Iterate the LLM tool-use loop until a text reply or max_iterations is hit.

        Returns the final text content from the LLM.
        Raises RuntimeError if max_iterations is exceeded without a text response.
        """
        from bot.services.llm_router import TextResponse, ToolCallResponse

        effective_prompt = system_prompt if system_prompt is not None else self._system_prompt
        tool_schemas = self._build_tool_schemas()

        # Work on a local copy of the message history
        history = list(messages)

        for iteration in range(self._config.max_iterations):
            logger.debug(
                "Agent %s: tool-use iteration %d/%d",
                self.name, iteration + 1, self._config.max_iterations,
            )
            result = await llm_provider.complete_with_tools(
                effective_prompt,
                history,
                tool_schemas,
                model=self._config.model,
                temperature=self._config.temperature,
            )

            if isinstance(result, TextResponse):
                logger.debug("Agent %s: received text response after %d iteration(s)", self.name, iteration + 1)
                return result.content

            if isinstance(result, ToolCallResponse):
                # Append the assistant's raw tool-call message to history
                history.append(result.raw_message)

                # Execute the tool and collect the result
                tool_result = await self._execute_tool(result)

                # Append tool result message for the next iteration
                history.append({
                    "role": "tool",
                    "tool_call_id": result.tool_call_id,
                    "content": str(tool_result),
                })

        # Exceeded max_iterations without a text response
        logger.warning(
            "Agent %s exceeded max_iterations=%d without a text response",
            self.name, self._config.max_iterations,
        )
        raise RuntimeError(
            f"Agent {self.name} exceeded max_iterations={self._config.max_iterations}"
        )
