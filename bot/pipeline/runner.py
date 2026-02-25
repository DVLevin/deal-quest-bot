"""Pipeline runner — executes agent pipelines with sequential, parallel, and background modes."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from bot.agents.base import AgentInput, AgentOutput, BaseAgent
from bot.agents.registry import AgentRegistry
from bot.pipeline.config_loader import PipelineConfig, StepConfig
from bot.pipeline.context import PipelineContext
from bot.services.llm_router import LLMProvider
from bot.task_utils import create_background_task

logger = logging.getLogger(__name__)


class PipelineRunner:
    """Execute YAML-defined agent pipelines."""

    def __init__(self, registry: AgentRegistry) -> None:
        self.registry = registry

    async def run(self, config: PipelineConfig, ctx: PipelineContext) -> dict[str, Any]:
        """Run a pipeline and return all agent results."""
        logger.info("Running pipeline: %s (%d steps)", config.name, len(config.steps))

        # Group steps by execution mode
        i = 0
        while i < len(config.steps):
            step = config.steps[i]

            if step.mode == "sequential":
                await self._run_step(step, ctx)
                i += 1

            elif step.mode == "parallel":
                # Collect consecutive parallel steps
                parallel_steps = [step]
                j = i + 1
                while j < len(config.steps) and config.steps[j].mode == "parallel":
                    parallel_steps.append(config.steps[j])
                    j += 1
                await self._run_parallel(parallel_steps, ctx)
                i = j

            elif step.mode == "background":
                self._run_background(step, ctx)
                i += 1

            else:
                logger.warning("Unknown step mode: %s, running sequentially", step.mode)
                await self._run_step(step, ctx)
                i += 1

        return ctx.results

    async def _run_step(self, step: StepConfig, ctx: PipelineContext) -> AgentOutput:
        """Execute a single agent step with per-agent model resolution."""
        agent = self.registry.get(step.agent)
        agent_input = self._build_input(step, ctx)

        logger.info("Running agent: %s (sequential)", step.agent)

        # Resolve per-agent model override
        original_llm = ctx.default_llm
        try:
            override_llm = await ctx.get_llm_for_agent(step.agent)
            ctx.default_llm = override_llm  # Temporarily swap so agent sees override via ctx.llm

            output = await agent.run(agent_input, ctx)
            ctx.set_result(step.agent, output)
            logger.info("Agent %s completed: success=%s", step.agent, output.success)
            return output
        except Exception as e:
            logger.error("Agent %s failed: %s", step.agent, e)
            error_output = AgentOutput(success=False, error=str(e))
            ctx.set_result(step.agent, error_output)
            return error_output
        finally:
            ctx.default_llm = original_llm  # Restore default

    async def _run_parallel(self, steps: list[StepConfig], ctx: PipelineContext) -> None:
        """Execute multiple agents concurrently with per-agent model resolution."""
        logger.info("Running %d agents in parallel", len(steps))

        # Pre-resolve per-agent overrides before launching tasks
        agent_llms: dict[str, LLMProvider] = {}
        for step in steps:
            agent_llms[step.agent] = await ctx.get_llm_for_agent(step.agent)

        async def _run_one(step: StepConfig) -> tuple[str, AgentOutput]:
            agent = self.registry.get(step.agent)
            agent_input = self._build_input(step, ctx)

            # Each parallel task uses its own resolved LLM
            original_llm = ctx.default_llm
            try:
                ctx.default_llm = agent_llms[step.agent]
                output = await agent.run(agent_input, ctx)
                return step.agent, output
            except Exception as e:
                logger.error("Parallel agent %s failed: %s", step.agent, e)
                return step.agent, AgentOutput(success=False, error=str(e))
            finally:
                ctx.default_llm = original_llm

        results = await asyncio.gather(*[_run_one(s) for s in steps])
        for agent_name, output in results:
            ctx.set_result(agent_name, output)

    def _run_background(self, step: StepConfig, ctx: PipelineContext) -> None:
        """Fire-and-forget an agent as a background task with per-agent model resolution."""
        logger.info("Starting background agent: %s", step.agent)

        async def _bg_task() -> None:
            # Resolve per-agent model override
            original_llm = ctx.default_llm
            try:
                override_llm = await ctx.get_llm_for_agent(step.agent)
                ctx.default_llm = override_llm

                agent = self.registry.get(step.agent)
                agent_input = self._build_input(step, ctx)
                output = await agent.run(agent_input, ctx)
                ctx.set_result(step.agent, output)
                logger.info("Background agent %s completed", step.agent)
            except Exception as e:
                logger.error("Background agent %s failed: %s", step.agent, e)
            finally:
                ctx.default_llm = original_llm

        create_background_task(_bg_task(), name=f"bg_agent_{step.agent}")

    def _build_input(self, step: StepConfig, ctx: PipelineContext) -> AgentInput:
        """Build agent input from step config and pipeline context."""
        context_data: dict[str, Any] = {}

        for target_key, source in step.input_mapping.items():
            if source.startswith("ctx."):
                attr = source[4:]
                context_data[target_key] = getattr(ctx, attr, None)
            elif source.startswith("result."):
                agent_name = source[7:]
                context_data[target_key] = ctx.get_result(agent_name)
            else:
                context_data[target_key] = source

        return AgentInput(
            user_message=ctx.user_message,
            context=context_data,
        )
