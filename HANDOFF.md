# SEO Crew Agent — 项目交接文档

> **最后更新**: 2026-05-27
> **用途**: 新对话窗口快速恢复上下文，无需重读所有文件

---

## 一、项目是什么

基于 CrewAI 的 B2B SEO 文章自动化流水线。输入关键词+产品品类+材质，4 个 AI Agent 协作完成：研究关键词 → 策划大纲 → 写文章（含 Schema/图片SEO/llms.txt） → 7维评分 → 不通过自动修改。

**核心卖点（面试用）**:
- 自适应质量闭环：Write → Review → Fix → Re-review，无人干预
- AI SEO 优化：Schema Markup、llms.txt、来源引用、作者署名
- 图片 SEO 全流程：视觉分析 → alt文本 → webp → ImageObject Schema
- H2 内容禁令：防止文章退化为商业垃圾
- E-E-A-T 内建检测：编造数据直接 0 分

---

## 二、文件结构（6 个文件 + 1 个数据目录）

```
seo-crew-agent/
├── .env                    # API Keys（已配置）
├── .env.example            # 配置模板
├── config.py               # 全局配置（模型/阈值/路径）
├── agents.py               # 4 个 Agent 定义（角色+backstory）
├── tasks.py                # 4 个 Task 定义（prompt指令+context依赖链）
├── crew.py                 # 核心编排（图片分析/知识库检索/修改循环/保存）
├── main.py                 # 入口（CLI + 交互式两种模式）
├── knowledge/
│   └── keywords.json       # 关键词知识库（5个品类+Volume/KD+材质工艺数据）
└── output/
    └── article_*.md        # 生成的文章输出
```

### 各文件关键内容

**config.py**
- 主模型: `deepseek/deepseek-v4-pro`（通过 `LLM()` 对象，provider前缀格式）
- 视觉模型: `qwen3-VL` (阿里云 DashScope)，用于图片分析
- 阈值: MAX_REVISION_ROUNDS=5, QUALITY_THRESHOLD=48, EEAT_MIN_SCORE=1

**agents.py**
- `researcher`: B2B SEO Research Specialist, 10年外贸经验
- `planner`: B2B SEO Content Strategist, 负责 H2 结构+内容禁令
- `writer`: B2B SEO Content Writer, "which means..." 桥梁写法
- `reviewer`: B2B SEO Quality Reviewer, 7维评分，极度严格
- 所有 Agent 使用 `LLM_CONFIG`（同一个模型），`allow_delegation=False`

**tasks.py**
- `research_task`: Step 0 读图片分析 → Step 1 建 product_info → Step 2 用知识库关键词 → Step 3 扩展4级关键词矩阵
- `planning_task`: 依赖 research_task，输出 SEO Content Brief（H2结构/FAQ/标题选项），含 H2 内容禁令
- `writing_task`: 依赖 research+planning，Step 1 大纲 → Step 2 写文章 → Step 3 图片SEO数据 → Step 4 Schema+llms.txt
- `review_task`: 依赖 writing_task，7维评分（search_intent_match/structure/eeat_trust/so_what_test/specificity/ai_citability/clarity_readability）
- **Task context 链**: review_task.context=[writing_task] → writing_task.context=[research_task, planning_task] → planning_task.context=[research_task]

**crew.py** (最核心，~350行)
- `_analyze_images()`: base64编码图片 → 调视觉模型 → 返回产品JSON
- `_retrieve_keywords()`: 从 knowledge/keywords.json 按品类检索关键词数据（精确匹配+模糊匹配）
- `run_seo_pipeline()`: 主流程
  1. Step 0: 图片分析（可选）
  2. Step 0.5: 知识库检索（从图片结果提取category → 匹配关键词库）
  3. 首轮: Crew(4 agents) sequential
  4. 提取 article_text = tasks_output[2].raw (writer), review_text = tasks_output[3].raw (reviewer)
  5. `_extract_scorecard()`: 从 review 文本中提取 JSON（处理markdown fence）
  6. 修改循环: while not pass and round < MAX_REVISION_ROUNDS:
     - `_build_fix_text()`: 收集 score<6 的维度的 fix_suggestions
     - 只重跑 Writer+Reviewer (2 agents)
     - 注意: 此时 tasks_output 只有 2 个，[0]=writer, [1]=reviewer
  7. `_extract_image_seo()`: 从文章解析图片SEO表格
  8. 保存到 output/article_YYYYMMDD_HHMMSS.md
- 已知问题: CrewAI v1.x 的 `{ }` 模板变量语法与 `{{ }}` 冲突，task描述中用了 `[...]` 替代

**main.py**
- 交互模式: `python main.py` → 逐步输入 keyword/type/material/图片路径
- CLI 模式: `python main.py --keyword "xxx" --type "xxx" --material "xxx"`
- CLI 模式目前没有 `--images` 参数（需补充）

---

## 三、当前配置状态

| 配置项 | 值 | 状态 |
|--------|-----|:----:|
| 主模型 | deepseek/deepseek-v4-pro | 已配置 |
| DeepSeek API Key | sk-f7743fd... | 已配置 |
| DeepSeek Base URL | https://api.deepseek.com/v1 | 已配置 |
| 视觉模型 | qwen3-VL | 已配置 |
| 视觉 API Key | sk-f72c4983... | 已配置 |
| 视觉 Base URL | https://dashscope.aliyuncs.com/compatible-mode/v1 | 已配置 |

---

## 四、如何运行

```bash
cd F:\求职\seo-crew-agent

# CLI 模式（推荐）
python main.py --keyword "custom marathon medals" --type "corporate" --material "zinc alloy"

# 交互模式（逐项输入）
python main.py
```

依赖: `crewai`, `openai`, `python-dotenv`（pip install 即可）

---

## 五、本次对话新增/修改

1. **知识库检索**（新增）
   - 新建 `knowledge/keywords.json`（5个品类+10个主力词/品类+6类扩展词+材质工艺数据）
   - `crew.py` 新增 `_retrieve_keywords()` 函数
   - 集成到 `run_seo_pipeline()`：图片分析后自动检索，结果注入 Researcher 上下文
   - `tasks.py` 更新 Step 2，Researcher 优先使用知识库数据

2. **模型切换**: `.env` 中 `MODEL_NAME` 改为 `deepseek-v4-pro`

3. **HTML 文档**（之前生成）
   - `AI-SEO-GLOSSARY.html` — AI SEO 术语解释 + 图片SEO模块剖析 + 面试模拟
   - `AI-SEO-EVALUATION.md` — 基于 ai-seo skill 的项目评估报告（总分 5/10）

---

## 六、当前链路（9步）

```
用户输入 keyword, type, material, [图片路径]
  ↓
Step 0:   图片分析（视觉模型 → 提取 category/color/material/style...）
  ↓
Step 0.5: 知识库检索（用 category 匹配 knowledge/keywords.json → 真实 Volume/KD）
  ↓
Step 1:   Researcher（图片结果+关键词数据 → product_info + keyword_matrix）
  ↓
Step 2:   Planner（research输出 → SEO Content Brief + H2结构 + 内容禁令检查）
  ↓
Step 3:   Writer（research+planning输出 → 大纲 + 文章 + 图片SEO + Schema + llms.txt）
  ↓
Step 4:   Reviewer（7维评分 → pass/fail + fix_suggestions）
  ↓
Step 5:   pass=false → 提取fix_suggestions → 重跑Writer+Reviewer（最多5轮）
  ↓
Step 6:   保存 output/article_YYYYMMDD_HHMMSS.md
```

---

## 七、与 Dify 原版 (test1.yml) 的差异

| | Dify | CrewAI |
|------|------|--------|
| 知识库检索 | Dify 内置向量检索+Rerank | 本地 JSON 文件匹配 |
| 关键词扩展 | 独立 Agent | 合并进 Researcher |
| 图片 SEO | 独立 Agent | 合并进 Writer Step 3 |
| Schema/llms.txt | 无 | 新增（Writer Step 4） |
| 来源引用+作者署名 | 无 | 新增 |
| 固定块（MOQ/交期） | Python 代码自动拼接 | 已删除（H2禁令） |
| UI | Dify Web UI | 终端命令行 |
| 平台绑定 | 绑定 Dify 平台 | 纯 Python，无绑定 |

---

## 八、已知缺口（面试时可能被问到）

1. **Schema 是 LLM 生成的文本，不是代码拼接** — 可能输出非法 JSON。生产环境应改为 Python 构造 JSON-LD
2. **CLI 模式缺 `--images` 参数** — 交互模式支持图片，CLI 模式没传
3. **无 AI visibility 实测数据** — 需要跑 20 篇文章发布后手动查 ChatGPT/Perplexity 引用率
4. **知识库仅 5 个品类** — 需要持续扩充
5. **无增量更新机制** — 同一篇旧文章无法自动刷新，只能重新生成
6. **素材数据（keywords.json 中的材质/工艺）未被 Writer 强制引用** — 可以加一条 prompt 规则让 Writer 优先从知识库取数据而非凭记忆生成
