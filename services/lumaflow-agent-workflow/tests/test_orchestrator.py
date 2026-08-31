import pathlib
import sys
import unittest


PACKAGE_ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PACKAGE_ROOT))

from lumaflow_workflow import WorkflowCoordinator  # noqa: E402


class WorkflowCoordinatorTests(unittest.TestCase):
    def test_runs_five_agents_in_contract_order(self):
        result = WorkflowCoordinator().run()

        self.assertEqual(
            result.task_order,
            ("product-parser", "seo-strategy", "content-writer", "visual-brief", "quality-review"),
        )
        self.assertEqual(len(result.results), 5)
        self.assertEqual(result.results[0].prompt_version, "product-parser@2.3")
        self.assertEqual(result.results[-1].prompt_version, "quality-review@2.6")

    def test_every_task_matches_its_structured_output_contract(self):
        result = WorkflowCoordinator().run()

        self.assertIn("evidence_map", result.results[0].output)
        self.assertIn("keyword_plan", result.results[1].output)
        self.assertIn("claim_map", result.results[2].output)
        self.assertIn("alt_texts", result.results[3].output)
        self.assertIn("findings", result.results[4].output)

    def test_failure_is_retried_once_without_network(self):
        result = WorkflowCoordinator().run(fail_once_at="content-writer")

        self.assertEqual(result.retry_count, 1)
        writer = next(item for item in result.results if item.task_id == "content-writer")
        self.assertEqual(writer.attempt, 2)

    def test_critical_findings_block_human_approval(self):
        result = WorkflowCoordinator().run(human_approver="Mia Chen")

        self.assertEqual(result.status, "awaiting_human_approval")
        self.assertIsNone(result.approved_by)
        self.assertEqual({item.finding_id for item in result.findings if item.severity == "critical"}, {"fact-material", "fact-scope"})

    def test_revisions_and_human_decision_create_approved_result(self):
        result = WorkflowCoordinator().run(
            apply_critical_revisions=True,
            accept_geo_recommendations=True,
            human_approver="Mia Chen",
        )

        self.assertEqual(result.status, "approved")
        self.assertEqual(result.geo_score, 86)
        self.assertIn("non-electrical", result.revised_article)
        self.assertEqual(result.approved_by, "Mia Chen")


if __name__ == "__main__":
    unittest.main()
