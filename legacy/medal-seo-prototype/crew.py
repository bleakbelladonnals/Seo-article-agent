"""
Crew 编排 — Master-SubAgent 层级模式 + 评分→修改循环 + 图片分析
"""
import json
import os
import re
import base64
import time
import uuid
import logging
from datetime import datetime
from crewai import Crew, Process
from agents import researcher, planner, writer, reviewer
from tasks import make_tasks
from config import (
    MAX_REVISION_ROUNDS, QUALITY_THRESHOLD, EEAT_MIN_SCORE, OUTPUT_DIR,
    VISION_MODEL_NAME, VISION_API_KEY, VISION_BASE_URL,
)

# ── Logging 配置 ──────────────────────────────
logger = logging.getLogger("seo_crew")
logger.setLevel(logging.DEBUG)
if not logger.handlers:
    fh = logging.FileHandler(
        os.path.join(os.path.dirname(__file__), "crew.log"),
        encoding="utf-8",
    )
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(logging.Formatter(
        "%(asctime)s | %(levelname)-7s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    ))
    logger.addHandler(fh)
    # Also log rotation: keep last 5 logs, 1MB each
    try:
        from logging.handlers import RotatingFileHandler
        rh = RotatingFileHandler(
            os.path.join(os.path.dirname(__file__), "crew.log"),
            maxBytes=1_000_000, backupCount=5, encoding="utf-8",
        )
        rh.setLevel(logging.DEBUG)
        rh.setFormatter(logging.Formatter(
            "%(asctime)s | %(levelname)-7s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        ))
        logger.handlers.clear()
        logger.addHandler(rh)
    except Exception:
        pass  # fall back to basic file handler already added

AGENT_ROLE_MAP = {
    "B2B SEO Research Specialist": "research",
    "B2B SEO Content Strategist": "planning",
    "B2B SEO Content Writer": "writer",
    "B2B SEO Quality Reviewer": "reviewer",
}


def _get_output_by_role(tasks_output: list, role: str) -> str:
    """按 Agent 角色名提取 task 输出，避免硬编码索引。"""
    for to in (tasks_output or []):
        if hasattr(to, "agent") and to.agent == role:
            return str(to.raw)
    return ""


def _log_token_usage(result, label: str = ""):
    """记录每轮 Token 用量（如果 CrewAI 返回了 usage 信息）。"""
    try:
        usage = getattr(result, "token_usage", None) if result else None
        if usage:
            total = getattr(usage, "total_tokens", 0) or 0
            prompt = getattr(usage, "prompt_tokens", 0) or 0
            completion = getattr(usage, "completion_tokens", 0) or 0
            logger.info("%s Token usage — total: %s, prompt: %s, completion: %s",
                         label, total, prompt, completion)
    except Exception:
        pass


# ══════════════════════════════════════════════════════════════
# 图片分析 — 调用视觉模型提取产品信息
# ══════════════════════════════════════════════════════════════

def _analyze_images(image_paths: list[str]) -> tuple[str, list[dict], int]:
    """
    用视觉模型分析产品图片，返回 (产品信息 JSON, 每张图的 SEO alt text 列表)。
    每张图生成 SEO 级别的 alt text（≤125 chars，自然语言，含产品特征）。
    如果视觉模型不可用，返回空（Research Agent 会凭经验补全）。
    """
    if not image_paths:
        return "", [], 0

    # 读取图片并编码为 base64 data URI
    images_b64 = []
    for path in image_paths:
        if not os.path.exists(path):
            logger.warning("Image not found: %s", path)
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
        return "", [], 0

    logger.info("Analyzing %d product image(s) with %s", len(images_b64), VISION_MODEL_NAME)
    print(f"\n  [Vision] Analyzing {len(images_b64)} product image(s) with {VISION_MODEL_NAME}...")

    view_labels = ["front", "back", "side", "detail"][:len(images_b64)]
    prompt_text = (
        "You are a B2B promotional gift product analyst. Analyze the product image(s) and output ONLY valid JSON, "
        "no markdown, no explanation outside the JSON:\n"
        "{\n"
        '  "product_name": "2-6 English words",\n'
        '  "category": "e.g., medal, badge, coin, keychain, pin, trophy",\n'
        '  "color": "1-2 dominant colors",\n'
        '  "material": "e.g., zinc alloy, iron, brass, acrylic, enamel",\n'
        '  "style": "e.g., minimalist, vintage, modern, luxury, sporty",\n'
        '  "core_features": ["3-5 selling points in English"],\n'
        '  "target_audience": "one English sentence describing ideal buyer",\n'
        '  "use_scenes": ["2-3 usage scenarios in English"],\n'
        '  "image_seo": [\n'
        '    {\n'
        f'      "view": "{view_labels[0] if len(view_labels) > 0 else "front"}",\n'
        '      "alt_text": "SEO alt text ≤125 chars, natural English, describe what is VISIBLE in THIS image: material, color, finish, key design elements. Include primary keyword.",\n'
        '      "filename": "product-keyword-view.webp"\n'
        '    },\n'
        + ('' if len(images_b64) <= 1 else
        '    ...\n'
        f'  ],\n'
        f'  "image_notes": "brief observations about product craftsmanship visible in the photos"\n')
        + "}\n\n"
        f"IMPORTANT: The 'image_seo' array MUST contain exactly {len(images_b64)} entries — one per image uploaded. "
        f"Assign views in this order: {', '.join(view_labels)}. "
        "Each alt_text must describe what is ACTUALLY visible in that specific image — do NOT copy-paste identical alt texts across views. "
        "Filenames must end with .webp and use lowercase-hyphenated format."
    )

    try:
        from openai import OpenAI
        client = OpenAI(
            api_key=VISION_API_KEY,
            base_url=VISION_BASE_URL,
            timeout=60,
            max_retries=3,
        )
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
        vision_tokens = 0
        if hasattr(response, "usage") and response.usage:
            vision_tokens = getattr(response.usage, "total_tokens", 0) or 0
            logger.info("Vision token usage: %d total tokens", vision_tokens)
        # 剥离 Markdown 代码块
        if result.startswith("```"):
            nl = result.find("\n")
            if nl >= 0:
                result = result[nl + 1:]
            if result.endswith("```"):
                result = result[:-3].strip()

        # 提取 image_seo 数组（alt text + filename）
        image_seo_data = []
        try:
            data = json.loads(result)
            raw_seo = data.get("image_seo", [])
            for i, entry in enumerate(raw_seo):
                image_seo_data.append({
                    "view": entry.get("view", f"view_{i}"),
                    "alt_text": str(entry.get("alt_text", ""))[:125],
                    "filename": entry.get("filename", f"product-view-{i}.webp"),
                    "format": "webp",
                })
            logger.info("Vision extracted %d image SEO entries", len(image_seo_data))
        except (json.JSONDecodeError, Exception):
            logger.warning("Failed to parse image_seo from vision output")
            image_seo_data = []

        logger.info("Vision analysis complete (%d chars, %d alt texts, %d vision tokens)",
                     len(result), len(image_seo_data), vision_tokens)
        print(f"  [Vision] Analysis complete ({len(result)} chars, {len(image_seo_data)} alt texts, {vision_tokens} vision tokens)")
        return result, image_seo_data, vision_tokens
    except Exception as e:
        logger.error("Vision API call failed: %s", e)
        print(f"  [Vision] Failed: {e}")
        print(f"  [Vision] Hint: check VISION_API_KEY, VISION_BASE_URL, and network connectivity")
        return "", [], 0


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
        logger.warning("keywords.json not found at %s", KNOWLEDGE_PATH)
        print("  [Knowledge] keywords.json not found, skipping retrieval.")
        return ""

    try:
        with open(KNOWLEDGE_PATH, "r", encoding="utf-8") as f:
            kb = json.load(f)
    except Exception as e:
        logger.error("Failed to read keywords.json: %s", e)
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
        logger.info("No keyword data for category '%s'. Available: %s",
                     category, list(categories.keys()))
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

    logger.info("Retrieved keyword data for '%s' (%d main keywords)",
                category, len(cat_data.get("main_keywords", [])))
    print(f"  [Knowledge] Retrieved keyword data for category '{category}' ({len(cat_data.get('main_keywords', []))} main keywords)")
    return result


# ══════════════════════════════════════════════════════════════
# 主流水线
# ══════════════════════════════════════════════════════════════

def _kickoff_with_retry(crew: Crew, inputs: dict, max_retries: int = 3, label: str = "") -> object:
    """带重试的 kickoff 调用，处理 DeepSeek API 间歇性空响应。"""
    last_error = None
    for attempt in range(1, max_retries + 1):
        try:
            result = crew.kickoff(inputs=inputs)
            tasks_output = getattr(result, "tasks_output", [])
            if tasks_output:
                return result
            if attempt < max_retries:
                wait = attempt * 3
                logger.warning("%s returned empty tasks_output, retrying in %ds (attempt %d/%d)",
                               label, wait, attempt, max_retries)
                print(f"  [Retry] {label} empty response, retrying in {wait}s (attempt {attempt}/{max_retries})...")
                time.sleep(wait)
        except Exception as e:
            last_error = e
            if attempt < max_retries:
                wait = attempt * 3
                logger.warning("%s failed: %s, retrying in %ds (attempt %d/%d)",
                               label, e, wait, attempt, max_retries)
                print(f"  [Retry] {label} failed: {e}, retrying in {wait}s (attempt {attempt}/{max_retries})...")
                time.sleep(wait)
    if last_error:
        raise last_error
    raise RuntimeError(
        f"{label} failed to return valid tasks_output after {max_retries} retries"
    )


def run_seo_pipeline(
    product_image_paths: list[str],
    seo_keyword: str = "",
    customer_type: str = "",
    material: str = "",
    notes: str = "",
    on_progress=None,
) -> dict:
    """
    主流程：Image Analysis → Research → Plan → Write → Review → (loop until pass)

    参数:
        product_image_paths: 产品图片文件路径列表（必填）
        seo_keyword: SEO 目标关键词
        customer_type: 客户类型
        material: 产品材质
        notes: 用户补充信息（可选）
        on_progress: 进度回调 callable({stage, detail, ts}) 或 None

    返回:
        dict: final_article, scorecard, rounds, history, output_path, image_seo_data
    """
    run_start_time = time.time()
    run_id = datetime.now().strftime("%Y%m%d_%H%M%S") + "_" + uuid.uuid4().hex[:8]

    def notify(stage: str, detail: str = ""):
        if on_progress:
            on_progress({"stage": stage, "detail": detail, "ts": time.time()})

    # ── Step 0: 图片分析 + WebP 转换（必填项）──
    notify("vision", "Analyzing product images...")
    if not product_image_paths:
        raise ValueError("product_image_paths is required but empty")
    image_analysis, vision_alt_texts, vision_tokens = _analyze_images(product_image_paths)
    if not image_analysis:
        raise RuntimeError("Vision analysis failed — cannot proceed without product image data")

    webp_filenames = [a.get("filename", f"product-view-{i}") for i, a in enumerate(vision_alt_texts)]
    webp_paths = _convert_to_webp(product_image_paths, OUTPUT_DIR, webp_filenames, run_id=run_id)
    notify("vision", f"Image analysis complete ({len(vision_alt_texts)} views)")

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
    research_context = (
        f"The following product info was extracted from uploaded images via vision AI:\n"
        f"{image_analysis}\n\n"
        f"Use this as ground truth for Step 1. "
        f"The user's target SEO keyword is: {seo_keyword}. "
        f"Customer type: {customer_type}. Material override: {material}."
    )
    if notes:
        research_context += (
            f"\n\n**Supplementary Notes from User** (incorporate these into the article, "
            f"but prioritize vision-extracted product data):\n{notes}"
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

    # 附加上下文：视觉模型生成的图片 SEO 数据（真实 alt text，非 LLM 编造）
    if vision_alt_texts:
        alt_lines = ["**Vision-Generated Image SEO Data** (use these EXACT alt texts, do NOT invent new ones):"]
        for i, entry in enumerate(vision_alt_texts):
            alt_lines.append(
                f"| {entry.get('view', f'view_{i}')} "
                f"| {entry.get('alt_text', '')} "
                f"| {entry.get('filename', '')} "
                f"| {entry.get('format', 'webp')} |"
            )
        alt_lines.append("\nIn Step 3, copy this table into the ## Image SEO Data section — do NOT modify the alt texts.")
        research_context += "\n\n" + "\n".join(alt_lines)

    inputs = {
        "seo_keyword": seo_keyword,
        "customer_type": customer_type,
        "material": material,
        "image_analysis": research_context,
        "notes": notes,
        "fix_suggestions": "",
        "research_planning_context": "",
        "current_article": "",
    }
    task_graph = make_tasks()
    research_task = task_graph["research_task"]
    planning_task = task_graph["planning_task"]
    writing_task = task_graph["writing_task"]
    review_task = task_graph["review_task"]
    revision_writing_task = task_graph["revision_writing_task"]
    revision_review_task = task_graph["revision_review_task"]

    # ── 第一轮：Research → Plan → Write → Review ──
    logger.info("PHASE 1: Research + Planning + Writing (keyword=%s)", seo_keyword)
    notify("research", "Building keyword matrix...")
    print("\n" + "=" * 60)
    print("  PHASE 1: Research + Planning + Writing")
    print("=" * 60 + "\n")

    crew = Crew(
        agents=[researcher, planner, writer, reviewer],
        tasks=[research_task, planning_task, writing_task, review_task],
        process=Process.sequential,
        verbose=True,
    )

    result = _kickoff_with_retry(crew, inputs, label="Phase 1")
    _log_token_usage(result, "Round 1")
    notify("review", "Phase 1 complete — extracting scorecard...")

    # 按 Agent 角色提取输出
    tasks_output = getattr(result, "tasks_output", [])
    research_raw = _get_output_by_role(tasks_output, "B2B SEO Research Specialist")
    planning_raw = _get_output_by_role(tasks_output, "B2B SEO Content Strategist")
    article_text = _get_output_by_role(tasks_output, "B2B SEO Content Writer")
    review_text = _get_output_by_role(tasks_output, "B2B SEO Quality Reviewer")

    if not article_text:
        article_text = str(result)
    if not review_text:
        review_text = str(result)

    # ── 护栏 1：文章长度保护 ──
    article_text, was_truncated = _guard_article_length(article_text)
    if was_truncated:
        logger.warning("Article truncated from %d to %d chars (exceeded %d char limit)",
                       len(str(result)), len(article_text), MAX_ARTICLE_CHARS)
        print(f"  [GUARD] Article truncated: {len(str(result))} → {len(article_text)} chars")

    # ── 护栏 2：单轮 completion 异常检测 ──
    round1_usage = getattr(result, "token_usage", None)
    if round1_usage:
        r1_completion = getattr(round1_usage, "completion_tokens", 0) or 0
        if r1_completion > MAX_COMPLETION_TOKENS:
            logger.error(
                "Phase 1 completion tokens %d exceeded safety limit %d — output may be corrupted",
                r1_completion, MAX_COMPLETION_TOKENS,
            )
            print(f"  [GUARD] Phase 1 completion tokens ({r1_completion}) exceeded limit ({MAX_COMPLETION_TOKENS})! Output may be abnormal.")

    scorecard = _extract_scorecard(review_text)
    if not scorecard:
        _dump_debug("phase1_review_raw", review_text)

    # ── 循环修改：如果评分不通过，带着 fix_suggestions 重写 ──
    round_num = 1
    history = [scorecard] if scorecard else []

    # 最佳版本追踪（防止评分震荡时保存最差版本）
    best_article = article_text
    best_score = scorecard.get("total_score", 0) if scorecard else 0

    # 收敛检测：追踪最近两次分数变化幅度
    recent_deltas = []

    # ── 护栏 3：全流程 token 预算追踪 ──
    total_prompt_tokens = 0
    total_completion_tokens = 0
    total_vision_tokens = vision_tokens
    if round1_usage:
        total_prompt_tokens += getattr(round1_usage, "prompt_tokens", 0) or 0
        total_completion_tokens += getattr(round1_usage, "completion_tokens", 0) or 0

    while (
        scorecard
        and not _check_pass(scorecard)
        and round_num < MAX_REVISION_ROUNDS
    ):
        round_num += 1
        prev_score = scorecard.get("total_score", 0)
        prev_article = article_text
        fix_text = _build_fix_text(scorecard)

        logger.info("REVISION ROUND %d/%d — previous score: %s",
                     round_num, MAX_REVISION_ROUNDS, prev_score)
        notify("revision", f"Revision round {round_num}/{MAX_REVISION_ROUNDS} (score: {prev_score}/70)")
        print(f"\n{'=' * 60}")
        print(f"  REVISION ROUND {round_num}/{MAX_REVISION_ROUNDS}")
        print(f"  Previous score: {prev_score}/70")
        print(f"  Fixing: {fix_text[:200]}...")
        print(f"{'=' * 60}\n")

        # 注入首轮 Research + Planning 摘要，解决修订轮上下文丢失
        # 只传关键数据，避免每轮上下文膨胀（原方案每轮 ~260K tokens）
        if research_raw or planning_raw:
            context_parts = []
            if research_raw:
                research_summary = _summarize_for_revision(research_raw, "research")
                context_parts.append(research_summary)
            if planning_raw:
                planning_summary = _summarize_for_revision(planning_raw, "planning")
                context_parts.append(planning_summary)
            inputs["research_planning_context"] = "\n\n".join(context_parts) if context_parts else ""

        inputs["fix_suggestions"] = fix_text
        inputs["current_article"] = prev_article
        revision_crew = Crew(
            agents=[writer, reviewer],
            tasks=[revision_writing_task, revision_review_task],
            process=Process.sequential,
            verbose=True,
        )
        # ── 护栏 3：token 预算熔断检查 ──
        if not _check_token_budget(total_prompt_tokens, total_completion_tokens):
            logger.error("Token budget exhausted (%d total) — stopping revisions", total_prompt_tokens + total_completion_tokens)
            print(f"  [GUARD] Token budget exhausted ({total_prompt_tokens + total_completion_tokens} total)! Using best version so far.")
            break

        result = _kickoff_with_retry(revision_crew, inputs, label=f"Revision round {round_num}")
        _log_token_usage(result, f"Revision round {round_num}")

        # ── 护栏 2：累积 token 用量，检测单轮异常 ──
        rev_usage = getattr(result, "token_usage", None)
        if rev_usage:
            rev_prompt = getattr(rev_usage, "prompt_tokens", 0) or 0
            rev_completion = getattr(rev_usage, "completion_tokens", 0) or 0
            total_prompt_tokens += rev_prompt
            total_completion_tokens += rev_completion
            if rev_completion > MAX_COMPLETION_TOKENS:
                logger.error(
                    "Revision round %d completion tokens %d exceeded safety limit %d",
                    round_num, rev_completion, MAX_COMPLETION_TOKENS,
                )
                print(f"  [GUARD] Round {round_num} completion ({rev_completion}) exceeded limit! Skipping this round.")

        # 按角色提取（修订轮只有 2 个 task）
        tasks_output = getattr(result, "tasks_output", [])
        article_text = _get_output_by_role(tasks_output, "B2B SEO Content Writer")
        review_text = _get_output_by_role(tasks_output, "B2B SEO Quality Reviewer")

        if not article_text:
            logger.warning("Failed to extract article text in revision round %d", round_num)
            article_text = str(result)
        if not review_text:
            logger.warning("Failed to extract review text in revision round %d", round_num)
            review_text = str(result)

        # ── 护栏 1：修订轮文章长度保护 ──
        article_text, was_truncated = _guard_article_length(article_text)
        if was_truncated:
            logger.warning("Revision round %d article truncated to %d chars", round_num, len(article_text))
            print(f"  [GUARD] Round {round_num} article truncated to {len(article_text)} chars")

        new_scorecard = _extract_scorecard(review_text)
        if new_scorecard:
            new_score = new_scorecard.get("total_score", 0)
            delta = new_score - prev_score

            # 回退保护：分数骤降 > 15 → 丢弃本轮，沿用上一版
            if delta < -15:
                logger.warning(
                    "Score regressed by %d pts (%d → %d) in round %d — reverting article",
                    abs(delta), prev_score, new_score, round_num,
                )
                print(f"  [WARN] Score regressed {abs(delta)} pts ({prev_score} → {new_score}) — reverting to previous version")
                article_text = prev_article
                history.append({"round": round_num, "score": new_score, "discarded": True, "reason": f"regression ({abs(delta)} pts)"})
                continue  # 不更新 scorecard，下轮用旧分 + 旧文重新出 fix_suggestions

            scorecard = new_scorecard
            history.append(scorecard)

            # 最佳版本保留
            if new_score > best_score:
                best_score = new_score
                best_article = article_text

            # 收敛检测：连续两次分数变化均 < 3 → 继续改也没意义
            recent_deltas.append(abs(delta))
            if len(recent_deltas) > 2:
                recent_deltas.pop(0)
            if len(recent_deltas) >= 2 and all(d < 3 for d in recent_deltas):
                logger.info(
                    "Convergence detected after %d rounds (last 2 deltas: %s) — stopping revisions",
                    round_num, recent_deltas,
                )
                print(f"  [INFO] Converged — last 2 score changes were {recent_deltas}, < 3 pts each. Stopping.")
                break
        else:
            logger.warning("Scorecard extraction failed in revision round %d — reusing previous", round_num)
            _dump_debug(f"revision_r{round_num}_review_raw", review_text)

    # 最终使用历史最佳版本
    if best_score > (scorecard.get("total_score", 0) if scorecard else 0):
        logger.info("Using best version (score=%s) over final version", best_score)
        print(f"  [INFO] Using best version (score={best_score}) over final round")
        article_text = best_article

    # ── 提取图片 SEO 数据 ──────────────────────
    image_seo_data = _extract_image_seo(article_text)

    _meta_desc = ""
    if article_text:
        _lines = article_text.splitlines()
        _in_body = False
        for _line in _lines:
            _stripped = _line.strip()
            if _stripped.startswith("# ") and not _stripped.startswith("## "):
                _in_body = True
                continue
            if _in_body and _stripped and not _stripped.startswith("#"):
                _meta_desc = _stripped[:160]
                break
        if not _meta_desc:
            _meta_desc = article_text[:160]

    # ── 构建 Schema（Python 构造，非 LLM 直出） ─
    article_schema = build_article_schema(
        headline=seo_keyword,
        description=_meta_desc,
        date_published=datetime.now().strftime("%Y-%m-%d"),
        author_name="B2B Promotional Gift Specialist",
    )
    faq_schema = build_faq_schema(article_text)

    # ── 保存输出 ──────────────────────────────
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    uid = uuid.uuid4().hex[:8]
    output_path = os.path.join(OUTPUT_DIR, f"article_{timestamp}_{uid}.md")

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
        # 附加 Python 构造的 Schema
        if article_schema or faq_schema:
            f.write("\n\n## Verified JSON-LD (Python-generated)\n\n")
            if article_schema:
                f.write("### Article Schema\n```json\n")
                f.write(json.dumps(article_schema, indent=2, ensure_ascii=False))
                f.write("\n```\n\n")
            if faq_schema:
                f.write("### FAQ Schema\n```json\n")
                f.write(json.dumps(faq_schema, indent=2, ensure_ascii=False))
                f.write("\n```\n")

    logger.info("Article saved to: %s (rounds=%d, score=%s)",
                 output_path, round_num, scorecard.get("total_score", "?") if scorecard else "?")
    print(f"\n[OK] Article saved to: {output_path}")
    notify("done", f"Article saved (score: {scorecard.get('total_score', '?') if scorecard else '?'}/70, rounds: {round_num})")

    # ── 结构化运行日志 (2.3) ──────────────────
    duration_sec = round(time.time() - run_start_time, 1)
    _save_run_log(
        run_id=run_id,
        keyword=seo_keyword,
        customer_type=customer_type,
        material=material,
        notes=notes,
        image_count=len(product_image_paths),
        status="done",
        duration_sec=duration_sec,
        rounds_history=history,
        final_score=scorecard.get("total_score", 0) if scorecard else 0,
        total_prompt_tokens=total_prompt_tokens,
        total_completion_tokens=total_completion_tokens,
        total_vision_tokens=total_vision_tokens,
        output_path=output_path,
    )

    return {
        "final_article": article_text,
        "scorecard": history[-1] if history else None,
        "rounds": round_num,
        "history": history,
        "output_path": output_path,
        "image_seo_data": image_seo_data,
        "vision_alt_texts": vision_alt_texts,  # 视觉模型生成的真实 alt text
        "tokens_vision": total_vision_tokens,
        "webp_paths": webp_paths,              # 转换后的 WebP 文件路径
    }


# ══════════════════════════════════════════════════════════════
# 工具函数
# ══════════════════════════════════════════════════════════════

def _summarize_for_revision(raw_text: str, source_type: str) -> str:
    """Extract key data points from raw research/planning output for revision rounds.
    Cuts ~260K token context down to ~2K by keeping only structured fields.
    When JSON parsing fails, uses regex to pull out key fields before falling back to truncation."""
    try:
        clean = raw_text.strip()
        if clean.startswith("```"):
            nl = clean.find("\n")
            if nl >= 0:
                clean = clean[nl + 1:]
            if clean.endswith("```"):
                clean = clean[:-3].strip()
        data = json.loads(clean)
    except (json.JSONDecodeError, Exception):
        # JSON parse failed — try regex extraction of key fields
        extracted = _regex_extract_fields(raw_text, source_type)
        if extracted:
            return extracted
        return f"**{source_type.title()} Context** (truncated):\n{raw_text[:2000]}"

    if source_type == "research":
        lines = ["**Research Summary** (key data only):"]
        pi = data.get("product_info", {})
        if pi:
            lines.append(f"- Product: {pi.get('product_name', 'N/A')} | {pi.get('category', '')} | {pi.get('material', '')}")
            lines.append(f"- Audience: {pi.get('target_audience', 'N/A')}")
        km = data.get("keyword_matrix", {})
        if km:
            lines.append(f"- Primary KW: {km.get('recommended_primary', 'N/A')}")
            secondary = km.get("recommended_secondary", [])
            if secondary:
                lines.append(f"- Secondary KWs: {', '.join(secondary[:3])}")
        return "\n".join(lines)

    elif source_type == "planning":
        lines = ["**Planning Summary** (key data only):"]
        lines.append(f"- Primary KW: {data.get('primary_keyword', 'N/A')}")
        lines.append(f"- Search Intent: {data.get('search_intent', 'N/A')}")
        lines.append(f"- Core Question: {data.get('core_question', 'N/A')}")
        h2s = data.get("h2_structure", [])
        if h2s:
            lines.append(f"- H2 Structure ({len(h2s)} sections):")
            for h2 in h2s[:7]:
                lines.append(f"  - {h2.get('h2_title', '?')} | KW: {h2.get('target_keyword', '?')} | ~{h2.get('suggested_word_count', '?')} words")
        faqs = data.get("faq_questions", [])
        if faqs:
            lines.append(f"- FAQ questions: {len(faqs)} items")
        avoid = data.get("content_to_avoid", [])
        if avoid:
            lines.append(f"- Content to avoid: {len(avoid)} items")
        return "\n".join(lines)

    return f"**{source_type.title()} Context**:\n{raw_text[:2000]}"


def _regex_extract_fields(raw_text: str, source_type: str) -> str | None:
    """When the LLM output isn't valid JSON, use regex to pull out key fields.
    Returns formatted summary string, or None if nothing was found."""
    lines = []
    if source_type == "research":
        # Try to find product_name, category, material, recommended_primary
        product_match = re.search(r'"product_name"\s*:\s*"([^"]+)"', raw_text)
        category_match = re.search(r'"category"\s*:\s*"([^"]+)"', raw_text)
        material_match = re.search(r'"material"\s*:\s*"([^"]+)"', raw_text)
        primary_match = re.search(r'"recommended_primary"\s*:\s*"([^"]+)"', raw_text)
        secondary_match = re.findall(r'"recommended_secondary"\s*:\s*\[(.*?)\]', raw_text, re.DOTALL)
        if any([product_match, category_match, primary_match]):
            lines = ["**Research Summary** (regex-extracted):"]
            if product_match:
                lines.append(f"- Product: {product_match.group(1)} | {category_match.group(1) if category_match else '?'} | {material_match.group(1) if material_match else '?'}")
            if primary_match:
                lines.append(f"- Primary KW: {primary_match.group(1)}")
            if secondary_match:
                kws = re.findall(r'"([^"]+)"', secondary_match[0])
                if kws:
                    lines.append(f"- Secondary KWs: {', '.join(kws[:3])}")
        else:
            return None
    elif source_type == "planning":
        primary_match = re.search(r'"primary_keyword"\s*:\s*"([^"]+)"', raw_text)
        intent_match = re.search(r'"search_intent"\s*:\s*"([^"]+)"', raw_text)
        question_match = re.search(r'"core_question"\s*:\s*"([^"]+)"', raw_text)
        h2_match = re.findall(r'"h2_title"\s*:\s*"([^"]+)"', raw_text)
        if any([primary_match, intent_match]):
            lines = ["**Planning Summary** (regex-extracted):"]
            if primary_match:
                lines.append(f"- Primary KW: {primary_match.group(1)}")
            if intent_match:
                lines.append(f"- Intent: {intent_match.group(1)}")
            if question_match:
                lines.append(f"- Core Q: {question_match.group(1)}")
            if h2_match:
                lines.append(f"- H2s ({len(h2_match)}): {', '.join(h2_match[:5])}")
        else:
            return None
    return "\n".join(lines) if lines else None


# ══════════════════════════════════════════════════════════════
# 图片处理 — WebP 转换 + SEO alt text
# ══════════════════════════════════════════════════════════════

def _convert_to_webp(image_paths: list[str], output_dir: str, filenames: list[str], run_id: str = "") -> list[str]:
    """将上传的图片转为 WebP 格式，保存到 output_dir。
    返回 webp 文件的绝对路径列表。"""
    webp_paths = []
    try:
        from PIL import Image
    except ImportError:
        logger.warning("Pillow not installed — skipping WebP conversion")
        print("  [WebP] Pillow not installed, skipping conversion")
        return []

    for i, path in enumerate(image_paths):
        if not os.path.exists(path):
            continue
        try:
            img = Image.open(path)
            # 取原文件名（不含扩展）+ 视图名
            safe_name = filenames[i] if i < len(filenames) else f"product-view-{i}"
            safe_name = safe_name.replace(".webp", "")  # 去掉可能已有的扩展名
            prefix = f"{run_id[:8]}_" if run_id else ""
            webp_name = f"{prefix}{safe_name}.webp"
            webp_path = os.path.join(output_dir, webp_name)

            # 转 RGB（RGBA 需先合成为白底，PNG 透明通道同理）
            if img.mode in ("RGBA", "P"):
                rgb_img = Image.new("RGB", img.size, (255, 255, 255))
                rgb_img.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
                img = rgb_img
            elif img.mode != "RGB":
                img = img.convert("RGB")

            img.save(webp_path, "WEBP", quality=85, method=6)
            webp_paths.append(webp_path)
            logger.info("WebP converted: %s → %s (%dx%d)", os.path.basename(path), webp_name, img.width, img.height)
            print(f"  [WebP] {os.path.basename(path)} → {webp_name} ({img.width}x{img.height})")
        except Exception as e:
            logger.error("WebP conversion failed for %s: %s", path, e)
            print(f"  [WebP] Failed: {path} → {e}")

    return webp_paths


# ══════════════════════════════════════════════════════════════
# 安全护栏 — 防止 Token 爆炸 & 上下文滚雪球
# ══════════════════════════════════════════════════════════════

MAX_ARTICLE_CHARS = 25_000        # 文章超过此长度 → 截断保护
MAX_COMPLETION_TOKENS = 120_000   # 单轮 completion 超过此值 → 判定异常
MAX_TOTAL_TOKENS = 500_000        # 全流程 token 总预算


def _guard_article_length(text: str, max_chars: int = MAX_ARTICLE_CHARS) -> tuple[str, bool]:
    """若文章超长，截断到最后一个完整 H2 段落，返回 (safe_text, was_truncated)。"""
    if len(text) <= max_chars:
        return text, False
    # 找到最后一个完整的 ## 标题作为截断点
    h2_positions = [m.start() for m in re.finditer(r"^##\s", text[max_chars // 2:], re.MULTILINE)]
    if h2_positions:
        cutoff = max_chars // 2 + h2_positions[-1]
        if cutoff > max_chars // 2 and cutoff < len(text):
            return text[:cutoff].rstrip(), True
    return text[:max_chars].rstrip(), True


def _check_token_budget(total_prompt: int, total_completion: int) -> bool:
    """累计 token 预算是否已耗尽。返回 True = 可继续，False = 熔断。"""
    return (total_prompt + total_completion) < MAX_TOTAL_TOKENS


def _check_pass(scorecard: dict) -> bool:
    """Python-side pass/fail — does NOT rely on LLM's boolean.
    Pass requires: total_score >= QUALITY_THRESHOLD, every dimension >= 6,
    and EEAT dimension >= EEAT_MIN_SCORE (may be lower than 6 per config)."""
    if scorecard.get("total_score", 0) < QUALITY_THRESHOLD:
        return False
    for dim in scorecard.get("dimensions", []):
        name = dim.get("name", "").lower()
        threshold = EEAT_MIN_SCORE if "eeat" in name else 6
        if dim.get("score", 0) < threshold:
            return False
    return True


def _dump_debug(label: str, text: str):
    """Save raw text to a debug file when extraction fails, for post-mortem."""
    debug_path = os.path.join(OUTPUT_DIR, f"_debug_{label}.txt")
    try:
        with open(debug_path, "w", encoding="utf-8") as f:
            f.write(f"# {label} ({len(text)} chars)\n\n")
            f.write(text)
        logger.info("Debug dump saved to %s", debug_path)
        print(f"  [DEBUG] Raw text saved to {debug_path} for diagnosis")
    except Exception:
        pass


def _extract_scorecard(text: str) -> dict | None:
    """从 Crew 输出中提取评分 JSON，使用括号深度计数器 + 类型校验。
    如果 JSON 被 LLM 截断，尝试自动修复（补全缺失的括号/引号）。"""
    try:
        clean = text.strip()
        if clean.startswith("```"):
            first_nl = clean.find("\n")
            if first_nl >= 0:
                clean = clean[first_nl + 1:]
            if clean.endswith("```"):
                clean = clean[:-3].strip()

        start = clean.find("{")
        if start < 0:
            return None

        # 括号深度计数器
        depth = 0
        end = start
        for i in range(start, len(clean)):
            if clean[i] == "{":
                depth += 1
            elif clean[i] == "}":
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break

        # 如果没有找到完整的 JSON 块（LLM 截断），尝试自动修复
        if end <= start or depth != 0:
            truncated = clean[start:]
            salvaged = _salvage_truncated_json(truncated)
            if salvaged is None:
                return None
            data = salvaged
        else:
            candidate = clean[start:end]
            try:
                data = json.loads(candidate)
            except json.JSONDecodeError:
                # 括号完整但内容非法 → 也尝试修复
                truncated = clean[start:]
                salvaged = _salvage_truncated_json(truncated)
                if salvaged is None:
                    return None
                data = salvaged

        # 类型校验
        if "total_score" not in data or "pass" not in data:
            return None
        if not isinstance(data["total_score"], (int, float)):
            return None
        if not isinstance(data["pass"], bool):
            return None
        if "dimensions" in data:
            if not isinstance(data["dimensions"], list):
                return None
            for dim in data["dimensions"]:
                if not isinstance(dim, dict):
                    return None
                if "score" in dim and not isinstance(dim["score"], (int, float)):
                    return None
                if "fix_suggestions" in dim and not isinstance(dim["fix_suggestions"], list):
                    return None

        return data
    except (json.JSONDecodeError, Exception):
        return None


def _salvage_truncated_json(text: str) -> dict | None:
    """Try to recover a truncated JSON by progressively trimming to the last
    valid structural boundary, then closing any unclosed brackets/strings."""
    if not text.startswith("{"):
        return None

    # Strategy 1: Walk backward from end, find the last valid JSON token
    # (closing bracket, closing quote, digit, or keyword), trim there,
    # add missing closing brackets.
    for trim_at in range(len(text), max(len(text) - 500, 0), -1):
        fragment = text[:trim_at].rstrip()
        if not fragment:
            continue

        # Count open/close brackets in the fragment
        open_braces = fragment.count("{")
        close_braces = fragment.count("}")
        open_brackets = fragment.count("[")
        close_brackets = fragment.count("]")

        needed_braces = open_braces - close_braces
        needed_brackets = open_brackets - close_brackets

        # Also handle unclosed string: if fragment ends with an odd number of
        # unescaped quotes, try closing the string
        if needed_braces < 0 or needed_brackets < 0:
            continue  # Can't fix over-closed brackets

        fix = fragment

        # Close any unclosed string (simple heuristic: last significant char)
        stripped = fix.rstrip()
        if stripped and stripped[-1] == '"' and not fix.rstrip().endswith('\\"'):
            pass  # Looks closed
        elif stripped and stripped[-1] in (',', ':'):
            # Trailing comma/colon — trim it
            fix = fix.rstrip().rstrip(',').rstrip(':')

        # Append needed closing brackets
        if needed_brackets > 0:
            fix += "]" * needed_brackets
        if needed_braces > 0:
            fix += "}" * needed_braces

        try:
            data = json.loads(fix)
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError:
            continue

    return None


def _build_fix_text(scorecard: dict) -> str:
    """从评分结果中提取修改建议，阈值与 _check_pass() 对齐（每维 >= 6 通过）。"""
    PER_DIM_THRESHOLD = 6
    lines = []
    for dim in scorecard.get("dimensions", []):
        score = dim.get("score", 10)
        if score < PER_DIM_THRESHOLD:
            name = dim.get("name", "unknown")
            suggestions = dim.get("fix_suggestions", [])
            if isinstance(suggestions, list):
                for suggestion in suggestions:
                    lines.append(f"[{name}] {suggestion}")
            elif isinstance(suggestions, str):
                lines.append(f"[{name}] {suggestions}")
    return "\n".join(lines) if lines else "Please improve the article quality."


def _extract_image_seo(article_text: str) -> list[dict]:
    """精确匹配 ## Image SEO Data 标题，解析到下一个 ## 标题为止。"""
    pattern = r"##\s*Image SEO Data\s*\n(.*?)(?=\n##\s|\Z)"
    match = re.search(pattern, article_text, re.DOTALL | re.IGNORECASE)
    if not match:
        return []

    section = match.group(1)
    seo_data = []
    for line in section.split("\n"):
        stripped = line.strip()
        if not stripped or not stripped.startswith("|"):
            continue
        if "---|---" in stripped or "alt text" in stripped.lower():
            continue
        parts = [p.strip() for p in stripped.split("|") if p.strip()]
        if len(parts) >= 3:
            seo_data.append({
                "view": parts[0],
                "alt_text": parts[1],
                "filename": parts[2],
                "format": "webp",
            })
    return seo_data


# ══════════════════════════════════════════════════════════════
# Schema 构造函数（Python 代码，非 LLM 直出）
# ══════════════════════════════════════════════════════════════

def build_article_schema(
    headline: str,
    description: str,
    date_published: str,
    author_name: str = "B2B Promotional Gift Specialist",
) -> dict:
    """构造 Article JSON-LD Schema。"""
    return {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": headline,
        "description": description,
        "datePublished": date_published,
        "author": {
            "@type": "Person",
            "name": author_name,
        },
    }


def build_faq_schema(article_text: str) -> dict | None:
    """从文章文本中解析 FAQ 区域，构造 FAQPage JSON-LD Schema。"""
    # 匹配 ## FAQ 或 ## Frequently Asked Questions 区域中的每个问答对
    faq_section_pattern = r"##\s*(?:FAQ|Frequently Asked Questions)\s*\n(.*?)(?=\n##\s|\Z)"
    faq_match = re.search(faq_section_pattern, article_text, re.DOTALL | re.IGNORECASE)
    if not faq_match:
        return None

    faq_section = faq_match.group(1)
    # 匹配每个 ### Question 开头的问答对
    qa_pattern = r"###\s*(.+?)\n(.*?)(?=\n###\s|\Z)"
    qa_matches = re.findall(qa_pattern, faq_section, re.DOTALL)

    if not qa_matches:
        return None

    main_entity = []
    for question, answer in qa_matches:
        main_entity.append({
            "@type": "Question",
            "name": question.strip(),
            "acceptedAnswer": {
                "@type": "Answer",
                "text": answer.strip(),
            },
        })

    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": main_entity,
    }


# ══════════════════════════════════════════════════════════════
# 2.3 — 结构化运行日志
# ══════════════════════════════════════════════════════════════

def analyze_passage_citability(article_text: str) -> dict:
    """Score whether article paragraphs fit the 134-167 word AI citation window.

    Returns: {passages, avg_score, optimal_pct, total_paragraphs}
    """
    if not article_text:
        return {"passages": [], "avg_score": 0.0, "optimal_pct": 0.0, "total_paragraphs": 0}

    paragraphs = []
    for p in article_text.split("\n\n"):
        stripped = p.strip()
        if not stripped:
            continue
        if stripped.startswith(("#", "|", "```", "---")):
            continue
        if len(stripped.split()) >= 20:
            paragraphs.append(stripped)

    if not paragraphs:
        return {"passages": [], "avg_score": 0.0, "optimal_pct": 0.0, "total_paragraphs": 0}

    results = []
    for p in paragraphs:
        wc = len(p.split())
        if 134 <= wc <= 167:
            score, zone = 1.0, "optimal"
        elif 100 <= wc < 134 or 167 < wc <= 220:
            score, zone = 0.7, "good"
        elif 50 <= wc < 100 or 220 < wc <= 300:
            score, zone = 0.4, "fair"
        else:
            score, zone = 0.2, "poor"
        results.append({
            "word_count": wc,
            "score": score,
            "zone": zone,
            "preview": p[:80] + ("..." if len(p) > 80 else ""),
        })

    avg_score = sum(r["score"] for r in results) / len(results)
    optimal_count = sum(1 for r in results if r["zone"] == "optimal")
    return {
        "passages": results,
        "avg_score": round(avg_score, 2),
        "optimal_pct": round(optimal_count / len(results) * 100, 1),
        "total_paragraphs": len(results),
    }


def _save_run_log(
    run_id: str,
    keyword: str,
    customer_type: str,
    material: str,
    notes: str,
    image_count: int,
    status: str,
    duration_sec: float,
    rounds_history: list,
    final_score: float,
    total_prompt_tokens: int,
    total_completion_tokens: int,
    total_vision_tokens: int = 0,
    output_path: str = "",
):
    """保存结构化运行日志到 output/runs/run_{run_id}.json。"""
    runs_dir = os.path.join(OUTPUT_DIR, "runs")
    os.makedirs(runs_dir, exist_ok=True)

    rounds = []
    for i, h in enumerate(rounds_history):
        if isinstance(h, dict) and h.get("discarded"):
            rounds.append({
                "round": i + 1,
                "score": h.get("score", 0),
                "discarded": True,
                "reason": h.get("reason", ""),
            })
        elif isinstance(h, dict):
            rounds.append({
                "round": i + 1,
                "score": h.get("total_score", 0),
                "passed": h.get("pass", False),
            })

    log = {
        "run_id": run_id,
        "keyword": keyword,
        "customer_type": customer_type,
        "material": material,
        "has_notes": bool(notes),
        "image_count": image_count,
        "status": status,
        "created_at": datetime.now().isoformat(),
        "duration_sec": duration_sec,
        "rounds": rounds,
        "final_score": final_score,
        "total_tokens": total_prompt_tokens + total_completion_tokens,
        "tokens_prompt": total_prompt_tokens,
        "tokens_completion": total_completion_tokens,
        "tokens_vision": total_vision_tokens,
        "output_path": output_path,
    }

    log_path = os.path.join(runs_dir, f"run_{run_id}.json")
    try:
        with open(log_path, "w", encoding="utf-8") as f:
            json.dump(log, f, ensure_ascii=False, indent=2)
        logger.info("Run log saved to %s", log_path)
    except Exception as e:
        logger.error("Run log save FAILED for %s: %s - stats data will be incomplete", run_id, e)
