"""
Crew 编排 — Master-SubAgent 层级模式 + 评分→修改循环 + 图片分析
"""
import json
import os
import base64
from datetime import datetime
from crewai import Crew, Process
from agents import researcher, planner, writer, reviewer
from tasks import research_task, planning_task, writing_task, review_task
from config import (
    MAX_REVISION_ROUNDS, QUALITY_THRESHOLD, OUTPUT_DIR,
    VISION_ENABLED, VISION_MODEL_NAME, VISION_API_KEY, VISION_BASE_URL,
)


# ══════════════════════════════════════════════════════════════
# 图片分析 — 调用视觉模型提取产品信息
# ══════════════════════════════════════════════════════════════

def _analyze_images(image_paths: list[str]) -> str:
    """
    用视觉模型分析产品图片，返回结构化的产品信息 JSON 文本。
    如果视觉模型不可用，返回空字符串（Research Agent 会凭经验补全）。
    """
    if not image_paths or not VISION_ENABLED:
        return ""

    # 读取图片并编码为 base64 data URI
    images_b64 = []
    for path in image_paths:
        if not os.path.exists(path):
            print(f"  [WARN] Image not found: {path}")
            continue
        with open(path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
        ext = os.path.splitext(path)[1].lower()
        mime = "image/png" if ext == ".png" else "image/jpeg"
        images_b64.append({
            "type": "image_url",
            "image_url": {"url": f"data:{mime};base64,{b64}"}
        })

    if not images_b64:
        return ""

    print(f"\n  [Vision] Analyzing {len(images_b64)} product image(s) with {VISION_MODEL_NAME}...")

    prompt_text = (
        "You are a B2B promotional gift product analyst. Analyze the product image(s) and output ONLY valid JSON, "
        "no markdown, no explanation outside the JSON:\n"
        "{\n"
        '  "product_name": "2-6 Chinese characters",\n'
        '  "category": "e.g., medal, badge, coin, keychain, pin, trophy",\n'
        '  "color": "1-2 dominant colors",\n'
        '  "material": "e.g., zinc alloy, iron, brass, acrylic, enamel",\n'
        '  "style": "e.g., minimalist, vintage, modern, luxury, sporty",\n'
        '  "core_features": ["3-5 selling points in English"],\n'
        '  "target_audience": "one English sentence describing ideal buyer",\n'
        '  "use_scenes": ["2-3 usage scenarios in English"],\n'
        '  "image_notes": "brief observations about product craftsmanship visible in the photo"\n'
        "}"
    )

    try:
        from openai import OpenAI
        client = OpenAI(api_key=VISION_API_KEY, base_url=VISION_BASE_URL)
        response = client.chat.completions.create(
            model=VISION_MODEL_NAME,
            messages=[{
                "role": "user",
                "content": [{"type": "text", "text": prompt_text}] + images_b64
            }],
            temperature=0.3,
            max_tokens=1024,
        )
        result = response.choices[0].message.content.strip()
        # 剥离 Markdown 代码块
        if result.startswith("```"):
            nl = result.find("\n")
            if nl >= 0:
                result = result[nl + 1:]
            if result.endswith("```"):
                result = result[:-3].strip()
        print(f"  [Vision] Analysis complete ({len(result)} chars)")
        return result
    except Exception as e:
        print(f"  [Vision] Failed: {e}")
        return ""


# ══════════════════════════════════════════════════════════════
# 知识库检索 — 从本地 JSON 文件查关键词数据
# ══════════════════════════════════════════════════════════════

KNOWLEDGE_PATH = os.path.join(os.path.dirname(__file__), "knowledge", "keywords.json")


def _retrieve_keywords(category: str) -> str:
    """
    从 knowledge/keywords.json 中检索指定品类的关键词数据。
    匹配不到时返回空字符串（Researcher 会凭经验补全）。
    """
    if not os.path.exists(KNOWLEDGE_PATH):
        print("  [Knowledge] keywords.json not found, skipping retrieval.")
        return ""

    try:
        with open(KNOWLEDGE_PATH, "r", encoding="utf-8") as f:
            kb = json.load(f)
    except Exception as e:
        print(f"  [Knowledge] Failed to read keywords.json: {e}")
        return ""

    categories = kb.get("categories", {})
    # 精确匹配
    cat_data = categories.get(category.lower())
    # 模糊匹配：品类名包含在 key 中，或 key 包含在品类名中
    if not cat_data:
        for key in categories:
            if key in category.lower() or category.lower() in key:
                cat_data = categories[key]
                break

    if not cat_data:
        print(f"  [Knowledge] No keyword data for category '{category}'. Available: {list(categories.keys())}")
        return ""

    # 也附加材质和工艺数据
    materials = kb.get("materials", {})
    processes = kb.get("processes", {})

    # 整理 main_keywords 为可读文本
    main_kw_lines = []
    for kw in cat_data.get("main_keywords", []):
        main_kw_lines.append(
            f"- {kw['keyword']} | Volume: {kw['volume']} | KD: {kw['kd']}"
        )

    result = (
        f"**Seed Keyword**: {cat_data.get('seed_keyword', category)}\n\n"
        f"**Main Keywords (with Volume & KD)**:\n" + "\n".join(main_kw_lines) + "\n\n"
        f"**Informational Keywords**: {json.dumps(cat_data.get('informational_keywords', []))}\n"
        f"**Commercial Keywords**: {json.dumps(cat_data.get('commercial_keywords', []))}\n"
        f"**Transactional Keywords**: {json.dumps(cat_data.get('transactional_keywords', []))}\n"
        f"**GEO Keywords**: {json.dumps(cat_data.get('geo_keywords', []))}\n"
        f"**Attribute Keywords**: {json.dumps(cat_data.get('attribute_keywords', []))}\n"
        f"**Question Keywords**: {json.dumps(cat_data.get('question_keywords', []))}\n\n"
        f"**Available Materials Data**: {json.dumps(materials, indent=2)}\n\n"
        f"**Available Processes Data**: {json.dumps(processes, indent=2)}"
    )

    print(f"  [Knowledge] Retrieved keyword data for category '{category}' ({len(cat_data.get('main_keywords', []))} main keywords)")
    return result


# ══════════════════════════════════════════════════════════════
# 主流水线
# ══════════════════════════════════════════════════════════════

def run_seo_pipeline(
    product_image_paths: list[str] | None = None,
    seo_keyword: str = "",
    customer_type: str = "",
    material: str = "",
) -> dict:
    """
    主流程：Image Analysis → Research → Plan → Write → Review → (loop until pass)

    参数:
        product_image_paths: 产品图片文件路径列表（可选）
        seo_keyword: SEO 目标关键词
        customer_type: 客户类型
        material: 产品材质

    返回:
        dict: final_article, scorecard, rounds, history, output_path, image_seo_data
    """

    # ── Step 0: 图片分析（如果有图）──
    image_analysis = ""
    if product_image_paths:
        image_analysis = _analyze_images(product_image_paths)
        if not image_analysis and not VISION_ENABLED:
            print("\n  [INFO] No vision model configured. Skipping image analysis.")
            print("  [TIP] To enable: set VISION_MODEL_NAME in .env (e.g., gpt-4o or glm-4v)")

    # ── Step 0.5: 知识库检索 ────────────────
    # 尝试从图片分析结果提取品类，用于匹配关键词库
    detected_category = ""
    if image_analysis:
        try:
            vis_data = json.loads(image_analysis)
            detected_category = vis_data.get("category", "")
        except (json.JSONDecodeError, Exception):
            pass
    # 回退：从关键词中猜测品类
    if not detected_category:
        for cat in ["medal", "badge", "coin", "keychain", "pin", "trophy"]:
            if cat in seo_keyword.lower():
                detected_category = cat
                break

    keyword_data = _retrieve_keywords(detected_category) if detected_category else ""

    # ── 准备输入变量 ──────────────────────────
    if image_analysis:
        research_context = (
            f"The following product info was extracted from uploaded images via vision AI:\n"
            f"{image_analysis}\n\n"
            f"Use this as ground truth for Step 1. "
            f"The user's target SEO keyword is: {seo_keyword}. "
            f"Customer type: {customer_type}. Material override: {material}.\n"
        )
    else:
        research_context = (
            f"(No product images provided. In Step 1, infer product details from: "
            f"keyword='{seo_keyword}', customer_type='{customer_type}', material='{material}'.)\n\n"
            f"The user's target SEO keyword is: {seo_keyword}."
        )

    # 附加上下文：知识库检索结果
    if keyword_data:
        research_context += (
            f"\n\n**Keyword Knowledge Base Data** (from knowledge/keywords.json, "
            f"matched category '{detected_category}'):\n{keyword_data}\n\n"
            f"In Step 2, use the Volume and KD data above directly — do not estimate. "
            f"In Step 3, expand from these verified keywords."
        )
    else:
        research_context += (
            f"\n\n(No matching keyword data found in knowledge base for category "
            f"'{detected_category}'. In Step 2, estimate Volume and KD based on your expertise.)"
        )

    inputs = {
        "seo_keyword": seo_keyword,
        "customer_type": customer_type,
        "material": material,
        "image_analysis": research_context,
        "fix_suggestions": "",
    }

    # ── 第一轮：Research → Plan → Write → Review ──
    print("\n" + "=" * 60)
    print("  PHASE 1: Research + Planning + Writing")
    print("=" * 60 + "\n")

    crew = Crew(
        agents=[researcher, planner, writer, reviewer],
        tasks=[research_task, planning_task, writing_task, review_task],
        process=Process.sequential,
        verbose=True,
    )

    result = crew.kickoff(inputs=inputs)

    # 提取 Writer 产出的文章正文（第3个 task，index=2）
    article_text = ""
    review_text = ""
    if hasattr(result, "tasks_output") and len(result.tasks_output) >= 4:
        article_text = str(result.tasks_output[2].raw)  # writing_task
        review_text = str(result.tasks_output[3].raw)   # review_task
    else:
        article_text = str(result)
        review_text = str(result)

    scorecard = _extract_scorecard(review_text)

    # ── 循环修改：如果评分不通过，带着 fix_suggestions 重写 ──
    round_num = 1
    history = [scorecard] if scorecard else []

    while scorecard and not scorecard.get("pass", False) and round_num < MAX_REVISION_ROUNDS:
        round_num += 1
        fix_text = _build_fix_text(scorecard)

        print(f"\n{'=' * 60}")
        print(f"  REVISION ROUND {round_num}/{MAX_REVISION_ROUNDS}")
        print(f"  Previous score: {scorecard.get('total_score', '?')}/70")
        print(f"  Fixing: {fix_text[:200]}...")
        print(f"{'=' * 60}\n")

        # 只重跑 write_task + review_task
        inputs["fix_suggestions"] = fix_text
        revision_crew = Crew(
            agents=[writer, reviewer],
            tasks=[writing_task, review_task],
            process=Process.sequential,
            verbose=True,
        )
        result = revision_crew.kickoff(inputs=inputs)

        # 提取文章和评分（只有 2 个 task）
        if hasattr(result, "tasks_output") and len(result.tasks_output) >= 2:
            article_text = str(result.tasks_output[0].raw)
            review_text = str(result.tasks_output[1].raw)
        else:
            article_text = str(result)
            review_text = str(result)

        scorecard = _extract_scorecard(review_text)
        if scorecard:
            history.append(scorecard)

    # ── 提取图片 SEO 数据 ──────────────────────
    image_seo_data = _extract_image_seo(article_text)

    # ── 保存输出 ──────────────────────────────
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = os.path.join(OUTPUT_DIR, f"article_{timestamp}.md")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(article_text)
        f.write("\n\n---\n\n## Scorecard\n\n")
        if scorecard:
            f.write(f"- **Total Score**: {scorecard.get('total_score', '?')}/70\n")
            f.write(f"- **Pass**: {'YES' if scorecard.get('pass') else 'NO'}\n")
            f.write(f"- **Rounds**: {round_num}\n\n")
            f.write("| Dimension | Score |\n|---|---|\n")
            for dim in scorecard.get("dimensions", []):
                f.write(f"| {dim.get('name', '?')} | {dim.get('score', '?')}/10 |\n")
        else:
            f.write("(Scorecard extraction failed)\n")

    print(f"\n[OK] Article saved to: {output_path}")

    return {
        "final_article": article_text,
        "scorecard": history[-1] if history else None,
        "rounds": round_num,
        "history": history,
        "output_path": output_path,
        "image_seo_data": image_seo_data,
    }


# ══════════════════════════════════════════════════════════════
# 工具函数
# ══════════════════════════════════════════════════════════════

def _extract_scorecard(text: str) -> dict | None:
    """从 Crew 输出中尝试提取评分 JSON"""
    try:
        clean = text.strip()
        if clean.startswith("```"):
            first_nl = clean.find("\n")
            if first_nl >= 0:
                clean = clean[first_nl + 1:]
            if clean.endswith("```"):
                clean = clean[:-3].strip()
        start = clean.find("{")
        end = clean.rfind("}") + 1
        if start >= 0 and end > start:
            candidate = clean[start:end]
            data = json.loads(candidate)
            if "total_score" in data and "pass" in data:
                return data
    except (json.JSONDecodeError, Exception):
        pass
    return None


def _build_fix_text(scorecard: dict) -> str:
    """从评分结果中提取修改建议，拼接成 fix_suggestions 字符串"""
    lines = []
    for dim in scorecard.get("dimensions", []):
        score = dim.get("score", 10)
        if score < 6:
            name = dim.get("name", "unknown")
            for suggestion in dim.get("fix_suggestions", []):
                lines.append(f"[{name}] {suggestion}")
    return "\n".join(lines) if lines else "Please improve the article quality."


def _extract_image_seo(article_text: str) -> list[dict]:
    """从文章文本中提取图片 SEO 数据"""
    # 查找 writing_task Step 3 输出的图片 SEO 信息
    seo_data = []
    in_seo_section = False
    for line in article_text.split("\n"):
        stripped = line.strip()
        if "image seo" in stripped.lower() or "alt text" in stripped.lower():
            in_seo_section = True
            continue
        if in_seo_section and stripped.startswith("|") and "alt" not in stripped.lower():
            parts = [p.strip() for p in stripped.split("|") if p.strip()]
            if len(parts) >= 3:
                seo_data.append({
                    "view": parts[0] if len(parts) > 0 else "unknown",
                    "alt_text": parts[1] if len(parts) > 1 else "",
                    "filename": parts[2] if len(parts) > 2 else "",
                    "format": "webp",
                })
        if in_seo_section and stripped == "":
            in_seo_section = False
    return seo_data
