"""Five-agent orchestration with structured outputs and an approval gate."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from .contracts import AgentResult, PromptContract, ReviewFinding, WorkflowResult
from .records import ARTICLE_WITH_KNOWN_ERRORS, BRIEF, CORRECTED_ARTICLE, PRODUCT


CONTRACTS = (
    PromptContract(
        "product-parser",
        "product-parser@2.3",
        "Qwen-Plus",
        ("product", "sources"),
        ("normalized_product", "scope", "evidence_map"),
    ),
    PromptContract(
        "seo-strategy",
        "seo-strategy@1.8",
        "Qwen-Plus",
        ("normalized_product", "brief"),
        ("search_intent", "outline", "keyword_plan"),
    ),
    PromptContract(
        "content-writer",
        "content-writer@3.1",
        "DeepSeek-V3-0324",
        ("evidence_map", "outline", "brand_rules"),
        ("article_markdown", "claim_map"),
    ),
    PromptContract(
        "visual-brief",
        "visual-brief@1.4",
        "Qwen-Plus",
        ("article_markdown", "product_assets"),
        ("visual_brief", "alt_texts"),
    ),
    PromptContract(
        "quality-review",
        "quality-review@2.6",
        "GPT-4.1",
        ("article_markdown", "evidence_map", "review_rubric"),
        ("findings", "quality_score", "geo_score"),
    ),
)


CRITICAL_FINDINGS = (
    ReviewFinding("fact-material", "critical", "fact", "Steel with AB-07 plating was described as solid brass."),
    ReviewFinding("fact-scope", "critical", "fact", "A non-electrical hardware kit was described as a complete light."),
)

OTHER_FINDINGS = (
    ReviewFinding("fact-salt", "warning", "fact", "The 500-hour salt-spray guarantee has no supporting source."),
    ReviewFinding("geo-answer", "suggestion", "geo", "Add a direct procurement answer block."),
    ReviewFinding("geo-source", "suggestion", "geo", "Expose source-backed scope and finish evidence."),
)


class WorkflowCoordinator:
    """Execute the workflow contract with one bounded retry.

    No code in this package opens a socket or reads API credentials. Task
    executors can be replaced behind the same contracts when a model gateway
    is introduced.
    """

    def __init__(self) -> None:
        self._executors: dict[str, Callable[[], dict[str, Any]]] = {
            "product-parser": self._parse_product,
            "seo-strategy": self._plan_seo,
            "content-writer": self._write_article,
            "visual-brief": self._prepare_visuals,
            "quality-review": self._review,
        }

    def run(
        self,
        *,
        fail_once_at: str | None = None,
        apply_critical_revisions: bool = False,
        accept_geo_recommendations: bool = False,
        human_approver: str | None = None,
    ) -> WorkflowResult:
        results: list[AgentResult] = []
        retries = 0
        failed_once = False

        for contract in CONTRACTS:
            for attempt in (1, 2):
                try:
                    if fail_once_at == contract.task_id and not failed_once:
                        failed_once = True
                        raise RuntimeError("controlled workflow failure")
                    output = self._executors[contract.task_id]()
                    self._validate_output(contract, output)
                    results.append(
                        AgentResult(
                            task_id=contract.task_id,
                            prompt_version=contract.prompt_version,
                            model_route=contract.model_route,
                            evidence_ids=tuple(PRODUCT["evidence_ids"]),
                            output=output,
                            attempt=attempt,
                        )
                    )
                    break
                except RuntimeError:
                    if attempt == 2:
                        raise
                    retries += 1

        unresolved = () if apply_critical_revisions else CRITICAL_FINDINGS
        findings = unresolved + OTHER_FINDINGS
        geo_score = 86 if accept_geo_recommendations else 76
        can_approve = apply_critical_revisions and human_approver is not None
        status = "approved" if can_approve else "awaiting_human_approval"

        return WorkflowResult(
            status=status,
            task_order=tuple(result.task_id for result in results),
            results=tuple(results),
            findings=findings,
            revised_article=CORRECTED_ARTICLE if apply_critical_revisions else None,
            geo_score=geo_score,
            approved_by=human_approver if can_approve else None,
            retry_count=retries,
        )

    @staticmethod
    def _validate_output(contract: PromptContract, output: dict[str, Any]) -> None:
        missing = set(contract.output_keys) - output.keys()
        if missing:
            raise RuntimeError(f"{contract.task_id} output is missing: {sorted(missing)}")

    @staticmethod
    def _parse_product() -> dict[str, Any]:
        return {
            "normalized_product": PRODUCT,
            "scope": {"included": PRODUCT["included"], "excluded": PRODUCT["excluded"]},
            "evidence_map": {"material": "finish-ab07", "scope": "assembly-bom-v3"},
        }

    @staticmethod
    def _plan_seo() -> dict[str, Any]:
        return {
            "search_intent": "OEM supplier evaluation",
            "outline": ["kit scope", "material and finish", "assembly and packaging"],
            "keyword_plan": BRIEF,
        }

    @staticmethod
    def _write_article() -> dict[str, Any]:
        return {
            "article_markdown": ARTICLE_WITH_KNOWN_ERRORS,
            "claim_map": {"material": "product-master-v4", "scope": "assembly-bom-v3"},
        }

    @staticmethod
    def _prepare_visuals() -> dict[str, Any]:
        return {
            "visual_brief": "Exploded non-electrical PHK-01 hardware kit on a neutral procurement surface.",
            "alt_texts": ["Aurelia PHK-01 antique brass pendant light hardware kit components"],
        }

    @staticmethod
    def _review() -> dict[str, Any]:
        return {
            "findings": [finding.finding_id for finding in CRITICAL_FINDINGS + OTHER_FINDINGS],
            "quality_score": 82,
            "geo_score": 76,
        }
