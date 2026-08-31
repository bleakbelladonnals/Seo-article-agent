# Mock 数据与证据规范

## 固定知识来源

四个文件名均为脱敏虚构资料：

- `PHK-01_Product_Master_v4.xlsx`
- `PHK-01_Assembly_BOM_v3.pdf`
- `Antique_Brass_Finish_AB-07.pdf`
- `B2B_Content_Claims_Guide_v2.md`

每条关键事实都引用来源 ID 和版本。运行与资产保存知识快照、Prompt 快照和模型路由，不读取会变化的“最新知识”。

## 固定 Prompt 契约

| Agent | Prompt | 主路由 | 结构化输出 |
|---|---|---|---|
| 产品资料解析 | `product-parser@2.3` | Qwen-Plus | normalized product / scope / evidence map |
| SEO 策略 | `seo-strategy@1.8` | Qwen-Plus | intent / outline / keyword plan |
| 文章生成 | `content-writer@3.1` | DeepSeek-V3-0324 | article / claim map |
| 视觉创意 | `visual-brief@1.4` | Qwen-Plus | visual brief / alt text |
| 质量审核 | `quality-review@2.6` | GPT-4.1 | findings / quality / GEO |

## 150 题模型评测快照

权重：事实 30%、结构化输出 20%、RAG/拒答 15%、中英文 10%、时延 10%、成本 10%、稳定性 5%。加权结果固定为 Qwen-Plus 89.1、DeepSeek-V3-0324 88.8、GPT-4.1 87.3。展示重点是按任务路由，而非单模型包办。

## 脱敏历史复盘快照

| 指标 | 展示值与样本 |
|---|---|
| 初稿耗时 | 中位数 150→30 分钟；前后各 40 篇；下降 80% |
| 月均能力 | 三个月均值 72→126 篇；提升 75%；年化 1,512 篇 |
| 一次审核通过率 | 64/100→85/100 |
| 参数冲突识别率 | 46/50，92% |
| 来源可追溯率 | 191/200，95.5% |
| 核心任务完成率 | 三轮 UAT 合计 56/60，93.3% |
| 审核耗时 | 中位数 40→20 分钟；前后各 30 篇；下降 50% |
| 资产复用率 | 最近 30 个任务复用 18 次，60% |

所有指标必须同时显示分子、分母或样本范围，并标为脱敏复盘，不能伪装为当前站点遥测。
