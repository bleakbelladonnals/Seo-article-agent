"""Typed contracts shared by the LumaFlow agent tasks."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping


@dataclass(frozen=True)
class PromptContract:
    task_id: str
    prompt_version: str
    model_route: str
    input_keys: tuple[str, ...]
    output_keys: tuple[str, ...]


@dataclass(frozen=True)
class AgentResult:
    task_id: str
    prompt_version: str
    model_route: str
    evidence_ids: tuple[str, ...]
    output: Mapping[str, Any]
    attempt: int


@dataclass(frozen=True)
class ReviewFinding:
    finding_id: str
    severity: str
    dimension: str
    message: str


@dataclass(frozen=True)
class WorkflowResult:
    status: str
    task_order: tuple[str, ...]
    results: tuple[AgentResult, ...]
    findings: tuple[ReviewFinding, ...]
    revised_article: str | None
    geo_score: int
    approved_by: str | None
    retry_count: int
