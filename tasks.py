"""
Task 瀹氫箟 鈥?姣忎釜 Task 缁戝畾涓€涓?Agent锛屽畾涔夎緭鍏ャ€佹湡鏈涜緭鍑哄拰璇︾粏鎸囦护

鍏充簬 .format() 涓?CrewAI 妯℃澘鍙橀噺鍏卞瓨鐨勮鍛婏細
  CrewAI 浣跨敤 {variable_name} 璇硶娉ㄥ叆杩愯鏃跺彉閲忥紙濡?{seo_keyword}銆亄fix_suggestions}锛夈€?  task description 涓‖缂栫爜鐨?JSON 绀轰緥鑻ュ惈 { } 鍙兘琚瑙ｆ瀽銆?  褰撻渶瑕佸 description 璋冪敤 Python .format() 鏃讹紙濡?review_task 娉ㄥ叆 threshold锛夛紝
  鍔″繀纭繚 .format() 涓嶄細鎰忓鍚炴帀 CrewAI 鐨勬ā鏉垮彉閲?鈥斺€?鐢?{{ }} 杞箟闇€瑕佷繚鐣欑殑瀛楅潰鑺辨嫭鍙枫€?"""
from crewai import Task
from agents import researcher, planner, writer, reviewer
from config import QUALITY_THRESHOLD, EEAT_MIN_SCORE


def make_tasks() -> dict:
    """Create a fresh task graph for one pipeline run."""
    # 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲
    # Task 1: Research 鈥?鍥剧墖鍒嗘瀽 + 鍏抽敭璇嶆暟鎹簱妫€绱?+ 鍏抽敭璇嶆墿灞?# 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲

    research_task = Task(
        description=(
            "Perform complete research for the SEO article:\n\n"
            "**Step 0 鈥?Read image analysis results**\n"
            "{image_analysis}\n\n"
            "**Step 1 鈥?Build product_info**\n"
            "Use the vision AI output from Step 0 as ground truth for all product attributes. "
            "Do NOT invent or guess product details. Extract:\n"
            "- product_name (2-6 Chinese characters)\n"
            "- category (e.g., medal, badge, coin, keychain)\n"
            "- color (1-2 words)\n"
            "- material (e.g., zinc alloy, iron, acrylic)\n"
            "- style (e.g., minimalist, vintage, tech)\n"
            "- core_features (3-5 selling points)\n"
            "- target_audience (one sentence)\n"
            "- use_scenes (2-3 scenarios)\n\n"
            "**Step 2 鈥?Retrieve keyword data**\n"
            "The user has provided a target SEO keyword: {seo_keyword}.\n"
            "The image_analysis section above may contain pre-loaded keyword data from the "
            "knowledge base (knowledge/keywords.json) 鈥?if it does, USE those Volume and KD "
            "numbers directly, do NOT estimate or overwrite them.\n"
            "If no keyword data was provided, estimate Volume and KD based on your expertise.\n\n"
            "**Step 3 鈥?Expand keywords**\n"
            "Build a 4-level search-intent keyword matrix:\n"
            "- Informational (awareness: 'what is', 'how to', 'guide to')\n"
            "- Commercial (consideration: 'best', 'top', 'vs', 'comparison')\n"
            "- Transactional (decision: 'wholesale', 'supplier', 'factory', 'bulk', 'buy')\n"
            "- GEO (B2B trade: 'China supplier', 'OEM manufacturer')\n\n"
            "Also generate:\n"
            "- Attribute variations ({material} + [category], [style] + [category])\n"
            "- Question keywords (common buyer questions)\n"
            "- recommended_primary (highest Volume + lowest KD from main keywords)\n"
            "- recommended_secondary (2-3 keywords for H2 usage)\n\n"
            "**Step 0.5 鈥?Read user supplementary notes (if provided)**\n"
            "{notes}\n\n"
            "**IMPORTANT**: Output ONLY valid JSON. No markdown, no explanation outside the JSON."
        ),
        expected_output=(
            "A JSON object with these keys:\n"
            "product_info: { product_name, category, color, material, style, "
            "core_features[], target_audience, use_scenes[], image_notes },\n"
            "keyword_data: { seed_keyword, main_keywords[] },\n"
            "keyword_matrix: { informational[], commercial[], transactional[], "
            "geo[], attribute[], question[], recommended_primary, recommended_secondary[] }"
        ),
        agent=researcher,
    )

    # 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲
    # Task 2: Planning 鈥?鐢熸垚 SEO Content Brief
    # 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲

    planning_task = Task(
        description=(
            "Generate a comprehensive SEO Content Brief based on the research output.\n\n"
            "**What to produce:**\n"
            "1. primary_keyword: Use the recommended_primary from the keyword matrix.\n"
            "2. secondary_keywords: 2-3 keywords for H2 usage.\n"
            "3. search_intent: One of [informational, commercial, transactional, navigational].\n"
            "4. core_question: The ONE question this article must answer.\n"
            "5. target_reader: Who is reading this and what do they need?\n"
            "6. must_cover_entities: Key concepts the article must cover.\n"
            "7. suggested_titles: 3 title options (transactional / commercial / informational).\n"
            "8. h2_structure: 5-7 H2 sections. Each H2 must have:\n"
            "   - h2_title, target_keyword, purpose, suggested_word_count\n"
            "9. faq_questions: 3-5 questions with one-sentence answer points.\n"
            "10. content_to_avoid: Things NOT to include.\n\n"
            "**CRITICAL 鈥?H2/FAQ Content Boundaries:**\n"
            "The following terms MUST NOT appear in any H2 title, H3 title, or FAQ question:\n"
            "- MOQ / Minimum Order Quantity\n"
            "- Lead Time / Production Time / Delivery Time\n"
            "- Customization Process / Production Process / Step-by-Step Guide\n"
            "- Payment Terms / Payment Methods\n"
            "- Certification / ISO / SGS\n"
            "- Pricing / Cost per unit\n"
            "- Shipping / Freight / Logistics\n\n"
            "If a topic needs coverage, reframe it. Example:\n"
            "  BAD: 'Bulk Ordering Process and Production Lead Times'\n"
            "  GOOD: 'How to Evaluate Medal Quality Before Placing a Bulk Order'\n\n"
            "Output ONLY valid JSON."
        ),
        expected_output=(
            "A JSON object: primary_keyword, secondary_keywords[], search_intent, "
            "core_question, target_reader, must_cover_entities[], suggested_titles[], "
            "h2_structure[], faq_questions[], content_to_avoid[]"
        ),
        agent=planner,
        context=[research_task],  # 鈫?渚濊禆 research_task 鐨勮緭鍑?
    )

    # 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲
    # Task 3: Writing 鈥?鍐欏ぇ绾?+ 鍐欐枃绔?+ 鍥剧墖 SEO 鏁版嵁
    # 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲

    writing_task = Task(
        description=(
            "Write a complete SEO article with supporting assets.\n\n"
            "**Step 1 鈥?Generate outline**\n"
            "Expand the H2 structure from the Brief into a detailed outline.\n"
            "Each section must specify: h2_title, h3_subheadings, keyword_to_use, "
            "core_answer (one sentence), content_block_type (definition/comparison_table/"
            "step_list/faq/stat_block/pros_cons), suggested_word_count.\n\n"
            "**Step 2 鈥?Write the article**\n"
            "Write in professional B2B English. Follow these rules:\n"
            "- H1 = article_title from the Brief\n"
            "- Opening paragraph: 40-60 words, directly answers the core question\n"
            "- Each H2 opens with its core_answer\n"
            "- Feature + 'which means...' benefit bridge on every product feature\n"
            "- Use Markdown tables for comparisons, numbered lists for steps\n"
            "- Include at least 1 industry data reference (material density, plating "
            "thickness, process tolerance 鈥?no fabricated ROI or client names). "
            "CRITICAL: Every statistic MUST cite its source using 'According to [source]' "
            "or '[Source]:' format. Example: 'According to ASTM B86 standards, zinc alloy "
            "density is approximately 6.6 g/cm鲁'\n"
            "- FAQ section at the end, each question as ## heading\n"
            "- CTA at the end using natural B2B language (not aggressive sales)\n"
            "- Author block at the end: '**About the Author** | [N]+ years in B2B "
            "promotional gift manufacturing | Specializing in [material] product sourcing "
            "for [customer_type] clients.'\n\n"
            "**Step 3 鈥?Generate image SEO data (CRITICAL for SEO)**\n"
            "Create a dedicated '## Image SEO Data' section at the end of the article.\n"
            "For 4 standard product image views (front, back, side, detail-closeup), output a table:\n\n"
            "| View | Alt Text (鈮?25 chars) | Filename | Format |\n"
            "|---|---|---|---|\n"
            "| Front | ... | ... | webp |\n"
            "| Back | ... | ... | webp |\n"
            "| Side | ... | ... | webp |\n"
            "| Detail | ... | ... | webp |\n\n"
            "Rules:\n"
            "- alt_text: Natural English, 鈮?25 chars, describe what the image SHOWS "
            "specifically (colors, material texture, engraving detail). Include the primary "
            "keyword ONCE naturally. Example: 'Front view of custom marathon medal in gold "
            "zinc alloy with engraved race logo and red enamel accent on blue ribbon'\n"
            "- filename: lowercase-hyphenated, format [category]-[brand-name-or-keyword]-[view].webp\n"
            "  Example: medal-custom-marathon-finisher-front.webp\n"
            "- Format: Always 'webp' (Google recommends WebP for page speed)\n"
            "- Also include a JSON-LD ImageObject schema snippet for the primary product image\n\n"
            "**Step 4 鈥?Generate Schema markup and AI-readiness data (CRITICAL for AI SEO)**\n"
            "Add these sections after Image SEO Data:\n"
            "1. '## JSON-LD Structured Data' 鈥?Include ALL of these schema types:\n"
            "   - **Article schema**: headline, author, datePublished, description\n"
            "   - **FAQPage schema**: mainEntity array with all FAQ questions/answers\n"
            "   - **ImageObject schema**: the primary product image (already from Step 3)\n"
            "2. '## AI Engine Visibility' 鈥?A checklist table:\n"
            "   | Signal | Status | Detail |\n"
            "   |---|---|---|\n"
            "   | Statistics with sources cited | YES | [list sources used] |\n"
            "   | Author expertise disclosed | YES | [author name/title] |\n"
            "   | Last updated date | YES | [current date] |\n"
            "   | FAQ structured data | YES | FAQPage JSON-LD |\n"
            "   | Article structured data | YES | Article JSON-LD |\n"
            "   | Image SEO (alt+webp+schema) | YES | 4 views |\n"
            "3. '## /llms.txt' 鈥?A markdown code block containing the recommended llms.txt "
            "content for the site, summarizing what the site is about, key pages, and "
            "structured data availability.\n\n"
            "**Revision mode**: If fix_suggestions is provided by the reviewer, "
            "ONLY rewrite the indicated sections. Keep the rest unchanged.\n\n"
            "{fix_suggestions}\n\n"
            "Output the complete article in Markdown format."
        ),
        expected_output=(
            "A complete SEO article in Markdown with:\n"
            "1. Outline section (H2 structure with all metadata)\n"
            "2. Full article body (H1, opening, H2s, tables, FAQ, CTA)\n"
            "3. Image SEO data (alt texts, filenames, schema)\n"
            "All in a single, well-formatted Markdown document."
        ),
        agent=writer,
        context=[research_task, planning_task],  # 鈫?渚濊禆鍓嶉潰涓や釜 Task
    )

    # 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲
    # Task 4: Review 鈥?7 缁磋瘎鍒?# 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲

    review_task = Task(
        description=(
            "Score the article against 7 dimensions. Be strict and specific.\n\n"
            "**7 Dimensions (each scored 1-10):**\n\n"
            "1. search_intent_match: Does the article directly answer the core_question?\n"
            "2. structure: Are H2/H3 as planned? Does each H2 open with core_answer?\n"
            "3. eeat_trust: Are claims backed by evidence? Any fabricated data? "
            "B2B terminology used correctly? Are statistics cited with sources "
            "('According to...')? Is there an author block? (Score 0 if ANY fabrication detected)\n"
            "4. so_what_test: Does each feature have a 'which means...' benefit bridge?\n"
            "5. specificity: Vague adjectives ('fast', 'affordable', 'high quality') "
            "without quantification? Deduct 0.5 per occurrence.\n"
            "6. ai_citability: Can each key claim stand alone when extracted? Check: "
            "are statistics source-cited? Is there FAQPage + Article JSON-LD schema? "
            "Is there an /llms.txt block? Are author credentials present?\n"
            "7. clarity_readability: No Chinglish, active voice, one idea per sentence.\n\n"
            "**Pass criteria:**\n"
            "- Every dimension 鈮?6\n"
            "- Total score 鈮?{threshold}\n"
            "- EEAT score 鈮?{eeat_min}\n\n"
            "**For any failed dimension**, provide fix_suggestions that:\n"
            "- Specify exact paragraph location (e.g., 'H2-3 paragraph 2')\n"
            "- Give concrete rewrite direction\n"
            "- NEVER suggest adding: specific MOQ/price/delivery days/certification IDs/ROI data\n\n"
            "Output ONLY valid JSON."
        ).format(threshold=QUALITY_THRESHOLD, eeat_min=EEAT_MIN_SCORE),
        expected_output=(
            "A JSON object:\n"
            "total_score: number (max 70),\n"
            "pass: boolean,\n"
            "dimensions: [{ name, score, pass, issues[], fix_suggestions[] }],\n"
            "critical_issues: string[]"
        ),
        agent=reviewer,
        context=[writing_task],  # 鈫?渚濊禆 writing_task 鐨勮緭鍑?
    )


    # 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲
    # Task 3b: Revision Writing 鈥?淇杞笓鐢紝涓嶄緷璧?context 閾?# 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲

    revision_writing_task = Task(
        description=(
            "You are revising an SEO article based on reviewer feedback.\n\n"
            "**Research & Planning Summary** (if provided):\n"
            "{research_planning_context}\n\n"
            "**Reviewer Fix Suggestions** (fix ONLY these issues):\n"
            "{fix_suggestions}\n\n"
            "**IMPORTANT 鈥?Revision Rules:**\n"
            "1. Fix ONLY the sections indicated in the fix suggestions. Keep everything else EXACTLY as-is.\n"
            "2. If a fix says 'H2-3 paragraph 2 needs industry data citation', add a specific citation "
            "(e.g., 'According to ASTM B86...' or 'Per ISO 9001 manufacturing standards...') to that paragraph ONLY.\n"
            "3. If a fix says 'add benefit bridge', add 'which means...' after the feature description.\n"
            "4. Do NOT rewrite the entire article. Surgical fixes only.\n\n"
            "**Current article** (the reviewer scored this 鈥?your job is to fix the flagged issues):\n"
            "{current_article}\n\n"
            "Output ONLY the revised article in Markdown format 鈥?the complete article with all fixes applied."
        ),
        expected_output=(
            "The complete revised article in Markdown format with all fix suggestions applied."
        ),
        agent=writer,
    )

    # 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲
    # Task 4b: Revision Review 鈥?淇杞笓鐢紝context 缁戝畾 revision_writing_task
    # 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲

    revision_review_task = Task(
        description=(
            "Score the revised article against 7 dimensions. Be strict and specific.\n\n"
            "**7 Dimensions (each scored 1-10):**\n\n"
            "1. search_intent_match: Does the article directly answer the core_question?\n"
            "2. structure: Are H2/H3 as planned? Does each H2 open with core_answer?\n"
            "3. eeat_trust: Are claims backed by evidence? Any fabricated data? "
            "B2B terminology used correctly? Are statistics cited with sources "
            "('According to...')? Is there an author block? (Score 0 if ANY fabrication detected)\n"
            "4. so_what_test: Does each feature have a 'which means...' benefit bridge?\n"
            "5. specificity: Vague adjectives ('fast', 'affordable', 'high quality') "
            "without quantification? Deduct 0.5 per occurrence.\n"
            "6. ai_citability: Can each key claim stand alone when extracted? Check: "
            "are statistics source-cited? Is there FAQPage + Article JSON-LD schema? "
            "Is there an /llms.txt block? Are author credentials present?\n"
            "7. clarity_readability: No Chinglish, active voice, one idea per sentence.\n\n"
            "**Pass criteria:**\n"
            "- Every dimension >= 6\n"
            "- Total score >= {threshold}\n"
            "- EEAT score >= {eeat_min}\n\n"
            "**For any failed dimension**, provide fix_suggestions that:\n"
            "- Specify exact paragraph location (e.g., 'H2-3 paragraph 2')\n"
            "- Give concrete rewrite direction\n"
            "- NEVER suggest adding: specific MOQ/price/delivery days/certification IDs/ROI data\n\n"
            "Output ONLY valid JSON."
        ).format(threshold=QUALITY_THRESHOLD, eeat_min=EEAT_MIN_SCORE),
        expected_output=(
            "A JSON object:\n"
            "total_score: number (max 70),\n"
            "pass: boolean,\n"
            "dimensions: [{ name, score, pass, issues[], fix_suggestions[] }],\n"
            "critical_issues: string[]"
        ),
        agent=reviewer,
        context=[revision_writing_task],
    )
    return {
        "research_task": research_task,
        "planning_task": planning_task,
        "writing_task": writing_task,
        "review_task": review_task,
        "revision_writing_task": revision_writing_task,
        "revision_review_task": revision_review_task,
    }
