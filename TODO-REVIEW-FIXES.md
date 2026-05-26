# SEO Crew Agent — 待修复清单

> 基于 CODE-REVIEW.html 评审报告提取，按优先级排序

---

## 高危（立即修）

- [ ] **1. 修订轮上下文丢失**
  - 文件：`crew.py:286-291`、`tasks.py:179`
  - 问题：修订轮 Crew 只含 [writer, reviewer]，但 writing_task 声明了 `context=[research_task, planning_task]`，Research/Planning 输出无法解析
  - 修法：将首轮 research_output + planning_output 显式注入修订轮的 inputs 字典；或创建专用 `revision_writing_task` 去掉 context 依赖

- [ ] **2. API 调用加固**
  - 文件：`config.py:12-18`、`crew.py:67-68`
  - 问题：OpenAI client 无 timeout/max_retries；API Key 缺失时静默变 None；网络抖动或 429 直接崩
  - 修法：client 加 `timeout=60, max_retries=3`；config.py 启动时校验必填 Key，缺失抛明确错误

## 中危（本周修）

- [ ] **3. `_extract_scorecard()` JSON 提取改为括号深度计数器**
  - 文件：`crew.py:342-361`
  - 修法：用计数器逐字符扫描 `{` `}` 配对，替代 `rfind("}")`

- [ ] **4. `_extract_image_seo()` 段落解析改用精确标题匹配**
  - 文件：`crew.py:376-397`
  - 修法：精确匹配 `## Image SEO Data` 标题，解析到下一个 `## ` 标题为止

- [ ] **5. `_build_fix_text()` 阈值与 QUALITY_THRESHOLD 对齐**
  - 文件：`crew.py:364-373`
  - 修正：将 `score < 6` 改为基于 QUALITY_THRESHOLD/7 的动态阈值，或接收 threshold 参数

- [ ] **6. 引入 logging 模块替换 print()**
  - 文件：`crew.py`、`main.py` 全部 print() 调用
  - 修法：标准 logging 模块 + 轮转文件 handler + 每轮 Token 用量统计

- [ ] **7. 补齐核心函数的单元测试**
  - 文件：新建 `tests/` 目录
  - 范围：`_extract_scorecard`、`_build_fix_text`、`_retrieve_keywords`、`_extract_image_seo`
  - 用 fixture 数据（模拟各种 LLM 输出格式），mock API 调用

## 低危（有空修）

- [ ] **8. CLI 加 `--images` 参数**
  - 文件：`main.py:70-73`
  - 修法：`parser.add_argument("--images", nargs="*", default=[])`

- [ ] **9. 重命名 `--type` 为 `--customer-type`**
  - 文件：`main.py:72, 80`
  - 修法：改参数名，去掉 `getattr(args, "type", "")` 迂回

- [ ] **10. `tasks.py:211` `.format()` 与模板变量共存加注释警告**
  - 文件：`tasks.py:105, 211`

- [ ] **11. Schema 改为 Python 构造函数**
  - 文件：`crew.py` 新增 `build_article_schema()` / `build_faq_schema()` 函数
  - 替代 LLM 直出 JSON-LD
