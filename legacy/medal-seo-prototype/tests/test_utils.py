"""
单元测试 — 核心工具函数
用法: python tests/test_utils.py
"""
import json
import os
import sys
import types
import unittest
from unittest.mock import patch, mock_open

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("DEEPSEEK_API_KEY", "test-key")
os.environ.setdefault("MODEL_NAME", "deepseek-chat")

# ── 构造 mock 模块，避免导入链触发 LLM 初始化 ──

def _make_module(name, **attrs):
    mod = types.ModuleType(name)
    mod.__dict__.update(attrs)
    return mod

# config mock —— 最关键：agents.py 从这里导入 LLM_CONFIG
_config = _make_module("config",
    MAX_REVISION_ROUNDS=5,
    QUALITY_THRESHOLD=48,
    EEAT_MIN_SCORE=1,
    OUTPUT_DIR=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "output"),
    VISION_MODEL_NAME="mock-vision",
    VISION_API_KEY="mock-key",
    VISION_BASE_URL="https://mock.api/v1",
    LLM_CONFIG="deepseek/deepseek-chat",
)
os.makedirs(_config.OUTPUT_DIR, exist_ok=True)

# agents / tasks mock
_agents = _make_module("agents",
    researcher=None, planner=None, writer=None, reviewer=None,
)
_tasks = _make_module("tasks",
    research_task=None, planning_task=None, writing_task=None,
    review_task=None, revision_writing_task=None, revision_review_task=None,
    make_tasks=lambda: {
        "research_task": None,
        "planning_task": None,
        "writing_task": None,
        "review_task": None,
        "revision_writing_task": None,
        "revision_review_task": None,
    },
)

# crewai mock (crew.py: from crewai import Crew, Process)
class _Process:
    sequential = "sequential"

_crewai = _make_module("crewai",
    Crew=lambda *a, **kw: None,
    Process=_Process,
    Agent=lambda *a, **kw: None,
    Task=lambda *a, **kw: None,
)

# 注入到 sys.modules
for mod in ["crewai", "crewai.llm", "crewai.embeddings", "crewai.rag",
            "agents", "tasks", "config"]:
    saved = sys.modules.pop(mod, None)

sys.modules["crewai"] = _crewai
sys.modules["crewai.embeddings"] = _make_module("crewai.embeddings")
sys.modules["crewai.rag"] = _make_module("crewai.rag")
sys.modules["agents"] = _agents
sys.modules["tasks"] = _tasks
sys.modules["config"] = _config

# 安全导入
import crew
_fns = {
    "_extract_scorecard": crew._extract_scorecard,
    "_build_fix_text": crew._build_fix_text,
    "_extract_image_seo": crew._extract_image_seo,
    "_retrieve_keywords": crew._retrieve_keywords,
}


class TestExtractScorecard(unittest.TestCase):
    """_extract_scorecard: JSON 提取 + 括号深度计数器 + 类型校验"""

    def test_valid_scorecard(self):
        text = json.dumps({
            "total_score": 52,
            "pass": True,
            "dimensions": [
                {"name": "search_intent_match", "score": 8, "pass": True,
                 "issues": [], "fix_suggestions": []}
            ]
        })
        result = _fns["_extract_scorecard"](text)
        self.assertIsNotNone(result)
        self.assertEqual(result["total_score"], 52)
        self.assertTrue(result["pass"])

    def test_markdown_fence(self):
        text = '```json\n' + json.dumps({
            "total_score": 45,
            "pass": False,
            "dimensions": []
        }) + '\n```'
        result = _fns["_extract_scorecard"](text)
        self.assertIsNotNone(result)
        self.assertEqual(result["total_score"], 45)

    def test_bracket_depth_counter(self):
        text = (
            'prefix {\n'
            '"total_score": 50,\n'
            '"pass": true,\n'
            '"dimensions": [{"name": "x", "score": 7, "pass": true, '
            '"issues": [], "fix_suggestions": []}]\n'
            '} suffix'
        )
        result = _fns["_extract_scorecard"](text)
        self.assertIsNotNone(result)
        self.assertEqual(result["total_score"], 50)

    def test_type_validation_total_score_not_int(self):
        result = _fns["_extract_scorecard"](json.dumps({"total_score": "fifty", "pass": True}))
        self.assertIsNone(result)

    def test_type_validation_pass_not_bool(self):
        result = _fns["_extract_scorecard"](json.dumps({"total_score": 50, "pass": "yes"}))
        self.assertIsNone(result)

    def test_type_validation_dimensions_not_list(self):
        result = _fns["_extract_scorecard"](json.dumps({
            "total_score": 50, "pass": True, "dimensions": "not_a_list"
        }))
        self.assertIsNone(result)

    def test_type_validation_fix_suggestions_not_list(self):
        result = _fns["_extract_scorecard"](json.dumps({
            "total_score": 50, "pass": True,
            "dimensions": [{"name": "x", "score": 7, "pass": True,
                           "issues": [], "fix_suggestions": "should_be_list"}]
        }))
        self.assertIsNone(result)

    def test_dim_score_not_number(self):
        result = _fns["_extract_scorecard"](json.dumps({
            "total_score": 50, "pass": True,
            "dimensions": [{"name": "x", "score": "seven", "pass": True,
                           "issues": [], "fix_suggestions": []}]
        }))
        self.assertIsNone(result)

    def test_no_braces(self):
        self.assertIsNone(_fns["_extract_scorecard"]("no json here"))

    def test_empty_string(self):
        self.assertIsNone(_fns["_extract_scorecard"](""))


class TestBuildFixText(unittest.TestCase):
    """_build_fix_text: 阈值与 QUALITY_THRESHOLD 对齐"""

    def test_collects_below_threshold(self):
        scorecard = {
            "total_score": 42,
            "pass": False,
            "dimensions": [
                {"name": "specificity", "score": 5, "fix_suggestions": ["Fix A", "Fix B"]},
                {"name": "eeat_trust", "score": 8, "fix_suggestions": ["Ignore me"]},
            ]
        }
        result = _fns["_build_fix_text"](scorecard)
        self.assertIn("Fix A", result)
        self.assertIn("Fix B", result)
        self.assertNotIn("Ignore me", result)

    def test_all_above_threshold_returns_default(self):
        scorecard = {
            "total_score": 56,
            "pass": True,
            "dimensions": [
                {"name": "specificity", "score": 8, "fix_suggestions": ["Great"]},
            ]
        }
        result = _fns["_build_fix_text"](scorecard)
        self.assertEqual(result, "Please improve the article quality.")

    def test_empty_dimensions(self):
        result = _fns["_build_fix_text"]({"total_score": 0, "pass": False})
        self.assertEqual(result, "Please improve the article quality.")

    def test_string_fix_suggestions(self):
        scorecard = {
            "dimensions": [
                {"name": "s1", "score": 3, "fix_suggestions": "single string suggestion"}
            ]
        }
        result = _fns["_build_fix_text"](scorecard)
        self.assertIn("single string suggestion", result)


class TestExtractImageSeo(unittest.TestCase):
    """_extract_image_seo: 精确 ## 标题匹配"""

    def test_extract_valid_section(self):
        article = """
## Some Other Section
Some content here

## Image SEO Data
| View | Alt Text (≤125 chars) | Filename | Format |
|---|---|---|---|
| Front | Front view of medal | medal-custom-front.webp | webp |
| Back | Back view of medal | medal-custom-back.webp | webp |
| Side | Side view of medal | medal-custom-side.webp | webp |
| Detail | Detail view of medal | medal-custom-detail.webp | webp |

## Next Section
More content
"""
        result = _fns["_extract_image_seo"](article)
        self.assertEqual(len(result), 4)
        self.assertEqual(result[0]["view"], "Front")
        self.assertEqual(result[0]["alt_text"], "Front view of medal")

    def test_no_image_seo_section(self):
        result = _fns["_extract_image_seo"]("# Just an article\n\nNo image SEO here.")
        self.assertEqual(result, [])

    def test_stops_at_next_h2(self):
        article = """
## Image SEO Data
| View | Alt Text (≤125 chars) | Filename | Format |
|---|---|---|---|
| Front | Test alt | test.webp | webp |

## Unrelated Table
| Col1 | Col2 |
|---|---|
| A | B |
"""
        result = _fns["_extract_image_seo"](article)
        self.assertEqual(len(result), 1)


class TestRetrieveKeywords(unittest.TestCase):
    """_retrieve_keywords: 知识库匹配"""

    def test_exact_match(self):
        kb = {
            "categories": {
                "medal": {
                    "seed_keyword": "custom medals",
                    "main_keywords": [
                        {"keyword": "custom medals", "volume": 5000, "kd": 35}
                    ],
                    "informational_keywords": ["what is a custom medal"],
                    "commercial_keywords": ["best custom medals"],
                    "transactional_keywords": ["custom medals wholesale"],
                    "geo_keywords": ["custom medals china"],
                    "attribute_keywords": ["gold custom medals"],
                    "question_keywords": ["how to order custom medals"],
                }
            },
            "materials": {"zinc alloy": {"density": 6.6}},
            "processes": {"die casting": {}}
        }
        with patch("builtins.open", mock_open(read_data=json.dumps(kb))):
            with patch("os.path.exists", return_value=True):
                result = _fns["_retrieve_keywords"]("medal")
        self.assertIn("custom medals", result)
        self.assertIn("Volume: 5000", result)

    def test_fuzzy_match(self):
        kb = {
            "categories": {
                "medal": {
                    "seed_keyword": "custom medals",
                    "main_keywords": [],
                    "informational_keywords": [],
                    "commercial_keywords": [],
                    "transactional_keywords": [],
                    "geo_keywords": [],
                    "attribute_keywords": [],
                    "question_keywords": [],
                }
            },
            "materials": {},
            "processes": {}
        }
        with patch("builtins.open", mock_open(read_data=json.dumps(kb))):
            with patch("os.path.exists", return_value=True):
                result = _fns["_retrieve_keywords"]("custom medals for marathon")
        self.assertIn("custom medals", result)

    def test_no_match(self):
        kb = {"categories": {}, "materials": {}, "processes": {}}
        with patch("builtins.open", mock_open(read_data=json.dumps(kb))):
            with patch("os.path.exists", return_value=True):
                result = _fns["_retrieve_keywords"]("unknown")
        self.assertEqual(result, "")

    def test_missing_file(self):
        with patch("os.path.exists", return_value=False):
            result = _fns["_retrieve_keywords"]("medal")
        self.assertEqual(result, "")


if __name__ == "__main__":
    unittest.main()
