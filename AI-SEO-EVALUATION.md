# AI SEO Evaluation: SEO Crew Agent Project

> **评估框架**: [marketing-skills/ai-seo](https://github.com/coreyhaines31/marketingskills) v2.0.1
> **评估日期**: 2026-05-27
> **评估对象**: `F:\求职\seo-crew-agent\` — 基于 CrewAI 的 B2B SEO 文章自动化流水线
> **样本文章**: `output/article_20260527_020642.md` — "Custom Marathon Medals" (评分 52/70, 1轮通过)

---

## 总体评分

| 领域 | 得分 | 说明 |
|------|:----:|------|
| **Pillar 1: Structure (可提取性)** | **7/10** | 内容结构扎实，但缺少 Schema markup 和 `llms.txt` |
| **Pillar 2: Authority (可引用性)** | **6/10** | 数据引用有行业规范支撑，但无作者署名和专家背书 |
| **Pillar 3: Presence (AI 可见度)** | **2/10** | 完全缺失——无 robots.txt 配置、无第三方存在、无监控 |
| **综合 AI SEO 成熟度** | **5/10** | 基础扎实但停留在"传统 SEO 内容生产"阶段 |

---

## Pillar 1: Structure — 让内容可被 AI 提取

### 1.1 Content Block Patterns

`ai-seo` skill 定义了 6 种 AI 友好内容块。对照样本文章：

| 内容块类型 | Skill 要求 | 项目实际 | 状态 |
|-----------|-----------|---------|:----:|
| Definition blocks | First paragraph 直接回答核心问题 | ✅ Opening 58 words, answers "what to look for in a quality supplier" | PASS |
| Step-by-step blocks | Numbered lists for "How to X" | ✅ "How to Evaluate Medal Quality" = 5步编号列表 | PASS |
| Comparison tables | Table for "X vs Y" | ✅ "Custom vs Stock Medals" = 5行对比表 | PASS |
| Pros/cons blocks | 评估类查询 | ⚠️ 未使用独立 Pros/Cons 格式 | GAP |
| FAQ blocks | 自然语言问答 | ✅ 5个FAQ，每个以 `###` 标题呈现 | PASS |
| Statistic blocks | 引用数据+来源 | ⚠️ 有数据但缺少来源引用 | GAP |

### 1.2 Structural Rules Compliance

| 规则 | Skill 标准 | 项目实际 | 状态 |
|------|-----------|---------|:----:|
| 每段以直接答案开头 | "Lead every section with a direct answer" | ✅ 每段H2以core_answer开头 | PASS |
| 答案段落40-60词 | "Optimal for snippet extraction" | ✅ Opening 58 words, FAQ answers roughly in range | PASS |
| H2/H3匹配查询措辞 | "Match how people phrase queries" | ✅ "How to Evaluate Medal Quality" 等 | PASS |
| 表格 > 散文（对比内容） | "Tables beat prose for comparison" | ✅ Custom vs Stock 用表格 | PASS |
| 编号列表 > 段落（流程内容） | "Numbered lists beat paragraphs" | ✅ 质量检查清单用编号列表 | PASS |
| 每段一个清晰想法 | "One clear idea per paragraph" | ✅ 文章段落结构清晰 | PASS |
| **图片 alt 文本** | 自然语言, ≤125 chars, 含关键词 | ✅ 4张图都有规范的 alt + webp | **PASS** |
| **JSON-LD Schema** | ImageObject schema | ✅ 文章末尾包含 ImageObject schema | PASS |
| **FAQ Schema** | FAQPage structured data | ❌ 有FAQ内容但**无FAQ Schema markup** | **GAP** |
| **Article Schema** | Article/BlogPosting schema | ❌ 无Article或BlogPosting schema | **GAP** |
| **Product Schema** | Product schema for product info | ❌ 无Product schema | **GAP** |

### 1.3 Header Content Boundaries (项目特有)

项目内置的 **H2/FAQ 内容禁令**（禁止 MOQ/Pricing/Lead Time 等术语出现在标题中）与 `ai-seo` skill 的核心理念高度一致——"Don't write for AI, write for people"。这项设计本身就是一种 guardrail，防止文章退化为低质量商业广告。

**评价**: 这部分是项目**超出** `ai-seo` skill 框架的创新点。

### 1.4 Machine-Readable Files

| 文件 | Skill 要求 | 项目状态 |
|------|-----------|:--------:|
| `/llms.txt` | AI 系统上下文文件 | ❌ 未生成 |
| `/pricing.md` | AI Agent 可解析的定价 | ❌ 不在范围内（非产品页） |
| `AGENTS.md` | Agent 能力声明 | ❌ 未生成 |
| `robots.txt` | AI crawler 访问控制 | ❌ 未涉及 |

---

## Pillar 2: Authority — 让内容被 AI 引用

### 2.1 Princeton GEO 9 方法对照

| 方法 | 可见性提升 | 项目现状 | 说明 |
|------|:---------:|---------|------|
| **Cite sources** | +40% | ❌ **缺失** | 文章引用了数据（如锌合金密度 6.6 g/cm³）但未标注来源 |
| **Add statistics** | +37% | ⚠️ 部分 | 有量化数据（密度、公差、厚度）但缺少来源 |
| **Add quotations** | +30% | ❌ **缺失** | 无专家引用 |
| **Authoritative tone** | +25% | ✅ 强项 | B2B 专业术语正确，"which means..."桥梁写法 |
| **Improve clarity** | +20% | ✅ 强项 | 主动语态，一段一意 |
| **Technical terms** | +18% | ✅ 强项 | die-casting, electroplating, tolerances, microns |
| **Unique vocabulary** | +15% | ✅ 良好 | 词汇多样，非模板化 |
| **Fluency optimization** | +15-30% | ✅ 良好 | 可读性高，无 Chinglish |
| ~~Keyword stuffing~~ | **-10%** | ✅ 已规避 | 无堆砌 |

**GEO 总分**: 约 3/9 方法实现。最大缺口是**引用来源**和**统计数据来源化**——这是提升 AI 可见性最高效的两个杠杆（分别 +40% 和 +37%）。

### 2.2 Expert Attribution

| 要素 | Skill 要求 | 项目现状 |
|------|-----------|:--------:|
| 署名作者 + 资质 | "Named authors with credentials" | ❌ 无 |
| 专家引用 | "Expert quotes with titles and organizations" | ❌ 无 |
| "According to [Source]" 框架 | "Framing for claims" | ❌ 无 |
| 作者简介 | "Author bios with relevant expertise" | ❌ 无 |

### 2.3 Freshness Signals

| 信号 | 状态 |
|------|:----:|
| "Last updated: [date]" | ❌ 无更新时间戳 |
| 定期内容刷新 | ❌ 系统不支持增量更新 |
| 当前年份引用 | ⚠️ 未明确标注统计年份 |

### 2.4 E-E-A-T 落地情况（项目特有）

项目在 Reviewer 的 `eeat_trust` 维度中内建了 EEAT 检测，这是独特的质量设计：

| E-E-A-T 要素 | 落地方式 |
|-------------|---------|
| **Experience** | Researcher backstory 设定"10 年外贸经验" |
| **Expertise** | Writer prompt 要求正确使用 B2B 术语 |
| **Authoritativeness** | Writer prompt 要求至少 1 条行业数据 |
| **Trustworthiness** | Reviewer eeat_trust 维度：编造数据 = 0 分 = 一票否决 |

---

## Pillar 3: Presence — 在 AI 出现的地方存在

### 3.1 Third-Party Presence

`ai-seo` skill 强调：AI 引用第三方来源（Wikipedia 7.8%, Reddit 1.8%）比引用你的网站更多。品牌通过第三方被引用的概率是自有域名的 **6.5 倍**。

| 渠道 | 项目现状 |
|------|:--------:|
| Wikipedia | ❌ 未涉及 |
| Reddit | ❌ 未涉及 |
| Industry publications | ❌ 未涉及 |
| Review sites (G2, Capterra) | ❌ 不在范围内 |
| YouTube | ❌ 未涉及 |
| Quora | ❌ 未涉及 |

**评价**: 这个 Pillar 主要面向真实运营中的网站而非内容生产工具。但对于项目本身，如果产出的文章未来要发布，必须考虑第三方存在问题。

### 3.2 AI Crawler Access

| Bot | 用途 | 项目配置 |
|-----|------|:--------:|
| GPTBot + ChatGPT-User | OpenAI (ChatGPT) | ❌ 未配置 |
| PerplexityBot | Perplexity | ❌ 未配置 |
| ClaudeBot + anthropic-ai | Anthropic (Claude) | ❌ 未配置 |
| Google-Extended | Google Gemini + AI Overviews | ❌ 未配置 |
| Bingbot | Microsoft Copilot | ❌ 未配置 |

### 3.3 AI Visibility Monitoring

| 指标 | Skill 要求 | 项目现状 |
|------|-----------|:--------:|
| AI Overview presence | 手动检查或 Semrush/Ahrefs | ❌ 无 |
| Brand citation rate | AI visibility tools | ❌ 无 |
| Share of AI voice | Peec AI, Otterly, ZipTie | ❌ 无 |
| Citation sentiment | Manual review | ❌ 无 |
| Source attribution tracking | Referral traffic from AI | ❌ 无 |

---

## 项目独有优势（超出 ai-seo skill 框架的创新）

### 1. 自适应质量闭环

`ai-seo` skill 教你"怎么写出 AI 喜欢的内容"，但**不告诉你"写完了怎么验证"**。项目的 7 维评分 + fix_suggestions + 自适应修改循环填补了这个空白。这是从"内容规范"到"质量保证"的跨越。

### 2. Prompt Guardrails（内容禁令）

H2/H3 标题中禁止 MOQ/Pricing/Lead Time 等交易术语——这个设计在 `ai-seo` skill 中没有直接对应，但和 "Don't write separate content for AI" 原则高度一致。它是防止文章被搜索引擎判定为商业垃圾内容的硬护栏。

### 3. Multi-Agent 关注点分离

4 个独立 Agent 各有分工，每个只负责一件事——研究/策划/写作/评审。这比一个"全能的 SEO writer prompt"更可靠，因为可以独立调试每个环节。

### 4. 图片 SEO 全流程

从视觉模型分析产品图片 → alt 文本生成 → webp 格式推荐 → JSON-LD ImageObject schema，形成完整的图片 SEO 链路。这是 `ai-seo` skill 提到但未详细展开的领域。

---

## 差距分析 (Gap Analysis)

### 严重缺失 (P0)

| # | 问题 | 影响 | 修复方向 |
|---|------|------|---------|
| 1 | **统计数据无来源引用** | GEO 可见性 -37% | Writer prompt 增加 "cite source for every statistic" 规则 |
| 2 | **无作者/专家署名** | Authority -25% | 文章模板增加 author block（姓名+行业经验年限） |
| 3 | **无 Schema markup（除 ImageObject）** | AI 提取效率降低 | Writer 输出要求增加 FAQ/Article/Product schema |
| 4 | **无 `llms.txt` 生成** | AI Agent 无法理解站点结构 | Writing task 增加 Step 4: 生成 llms.txt |

### 重要缺失 (P1)

| # | 问题 | 影响 | 修复方向 |
|---|------|------|---------|
| 5 | **无机器人配置** | AI crawler 可能被阻断 | 文档化 robots.txt 最佳实践 |
| 6 | **无更新时间戳** | AI 权重 recency 信号缺失 | 文章头部增加 `Last updated` 字段 |
| 7 | **Reviewer 不检查 AI 可引用性** | 虽然有 ai_citability 维度但未对照 GEO 9 方法 | 在 Reviewer prompt 中增加 GEO checklist |
| 8 | **无引用/引述格式** | 数据可信度无法最大化 | Writer prompt 增加 "According to [source]" 框架 |

### 改进建议 (P2)

| # | 建议 | 说明 |
|---|------|------|
| 9 | AI visibility 监控 | 跑 10 篇文章 → 实际查 ChatGPT/Perplexity 是否引用 → 计算 citation rate |
| 10 | Content freshness 自动化 | 记录每篇文章的生成日期，超过 6 个月自动标记 "needs refresh" |
| 11 | 对比测试 | 同关键词跑两个版本（有来源引用 vs 无引用），对比 AI 评分 |
| 12 | Wikipedia/Reddit 策略 | 为产出文章的关键实体建立 Wikipedia 条目和 Reddit 社区参与 |

---

## 与 ai-seo Skill 的内容类型对齐

依据 `ai-seo` skill 的 "Content Types That Get Cited Most" 分析：

| 内容类型 | 引用占比 | 项目覆盖 | 评价 |
|---------|:-------:|:--------:|------|
| Comparison articles | ~33% | ✅ Custom vs Stock 对比表 | 高价值类型 |
| Definitive guides | ~15% | ✅ 完整的"如何选择马拉松奖牌供应商" | 定位准确 |
| Original research/data | ~12% | ⚠️ 有数据但非原创研究 | 待加强 |
| Best-of/listicles | ~10% | ❌ 未覆盖 | 可扩展 |
| Product pages | ~10% | ❌ 非产品页定位 | N/A |
| How-to guides | ~8% | ✅ "How to Evaluate Medal Quality" | 覆盖到位 |
| Opinion/analysis | ~10% | ❌ 未覆盖 | 可扩展 |

---

## 行动建议：按优先级排序

### 立即 (本周)

1. **Writer prompt 增加来源引用规则**: "Every statistic must cite its source: e.g., 'According to ASTM B86 standards, zinc alloy density is 6.6 g/cm³'"
2. **Writer prompt 增加 Author block**: 文章末尾加 `**About the Author**: [N] years in B2B promotional gift industry`
3. **Writer Step 3 增加 Schema 要求**: 除 ImageObject 外，增加 FAQ Schema 和 Article Schema

### 短期 (本月)

4. **Writer 增加 Step 4**: 生成配套的 `llms.txt` 文件
5. **Reviewer 增加 GEO checklist**: 检查统计来源、作者署名、引用格式
6. **建立引用格式标准**: "According to [source] ([year])" 作为数据引用的强制格式

### 中期 (下季度)

7. **跑 20 篇文章的 AI visibility 测试**: 发布到测试站点 → 检查 ChatGPT/Perplexity 引用率
8. **A/B 测试**: 有引用 vs 无引用 → 量化评分差异
9. **构建行业数据集**: 为 medal/badge/coin 品类积累可引用的公开数据源

---

## 一句话总结

> 这个项目做对了一件核心的事：**把 SEO 内容生产从"人写→人审"变成了"Agent写→Agent审→Agent改"的自动化闭环**。但它目前产出的内容仍然是"传统 SEO 友好"而非"AI 引用友好"——缺少来源引用、专家署名、Schema markup 和 `llms.txt` 这些 AI 搜索引擎最看重的信号。补齐这些后，这个系统产出的内容将在 ChatGPT、Perplexity 和 Google AI Overviews 中获得显著的引用率提升。

---

*评估依据: [marketing-skills/ai-seo SKILL.md v2.0.1](https://github.com/coreyhaines31/marketingskills/blob/main/skills/ai-seo/SKILL.md)*
*评估人: Claude Code (powered by deepseek-v4-pro)*
