"""
全局配置 — 模型、路径、参数集中管理
"""
import os
from dotenv import load_dotenv
from crewai import LLM

load_dotenv()

# ── LLM 配置 ──────────────────────────────────
# 主模型（用于 Researcher / Planner / Writer / Reviewer）
LLM_CONFIG = LLM(
    model=f"deepseek/{os.getenv('MODEL_NAME', 'deepseek-chat')}",
    base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1"),
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    temperature=0.7,
    max_tokens=4096,
)

# ── 视觉模型（用于图片分析，需支持多模态） ────
# DeepSeek 不支持图片分析，需要换一个视觉模型。
# 推荐：gpt-4o / gpt-4o-mini / glm-4v / qwen-vl-plus
VISION_MODEL_NAME = os.getenv("VISION_MODEL_NAME", "")
VISION_API_KEY = os.getenv("VISION_API_KEY", "") or os.getenv("DEEPSEEK_API_KEY", "")
VISION_BASE_URL = os.getenv("VISION_BASE_URL", "") or os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
VISION_ENABLED = bool(VISION_MODEL_NAME)

# ── Agent 迭代控制 ────────────────────────────
MAX_REVISION_ROUNDS = 5      # 最多修改 5 轮
QUALITY_THRESHOLD = 48       # 7 维总分 ≥ 48 才算通过
EEAT_MIN_SCORE = 1           # EEAT 维度最低分

# ── 输出路径 ──────────────────────────────────
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)
