"""Load YAML pipeline definitions."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel

logger = logging.getLogger(__name__)

_PIPELINES_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "pipelines"


class StepConfig(BaseModel):
    """Single step in a pipeline."""
    agent: str
    mode: str = "sequential"  # sequential | parallel | background
    input_mapping: dict[str, str] = {}


class PipelineConfig(BaseModel):
    """Full pipeline definition."""
    name: str
    description: str = ""
    steps: list[StepConfig]


def load_pipeline(name: str) -> PipelineConfig:
    """Load a pipeline YAML by name."""
    path = _PIPELINES_DIR / f"{name}.yaml"
    if not path.exists():
        raise FileNotFoundError(f"Pipeline config not found: {path}")

    with open(path, encoding="utf-8") as f:
        data = yaml.safe_load(f)

    return PipelineConfig(**data)


def load_all_pipelines() -> dict[str, PipelineConfig]:
    """Load all pipeline configs from the pipelines directory."""
    pipelines: dict[str, PipelineConfig] = {}
    if not _PIPELINES_DIR.exists():
        logger.warning("Pipelines directory not found: %s", _PIPELINES_DIR)
        return pipelines

    for path in _PIPELINES_DIR.glob("*.yaml"):
        try:
            with open(path, encoding="utf-8") as f:
                data = yaml.safe_load(f)
            config = PipelineConfig(**data)
            pipelines[config.name] = config
            logger.info("Loaded pipeline: %s", config.name)
        except Exception as e:
            logger.error("Failed to load pipeline %s: %s", path.name, e)

    return pipelines
