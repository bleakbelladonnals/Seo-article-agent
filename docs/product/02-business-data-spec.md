# 业务数据规范

## 知识来源

| 文件 | 类型 | 责任人 | 批准时间 | 主要用途 |
|---|---|---|---|---|
| `PHK-01_Product_Master_v4.xlsx` | 产品主数据 | Nina Zhou · 产品工程 | 2026-08-18 | 基材、尺寸与交付范围 |
| `PHK-01_Assembly_BOM_v3.pdf` | 套件 BOM | Leo Wang · 工艺工程 | 2026-08-16 | 套件层级与非电气范围 |
| `Antique_Brass_Finish_AB-07.pdf` | 表面效果色板 | Iris Liu · 质量管理 | 2026-08-15 | 钢基材上的 AB-07 外观控制 |
| `B2B_Content_Claims_Guide_v2.md` | 品牌与事实规范 | Mia Chen · 内容运营 | 2026-08-20 | 范围与性能声明规则 |

## Prompt 契约

| Agent | Prompt | 模型策略 | 输出 Schema |
|---|---|---|---|
| 产品资料解析 | `product-parser@2.3` | Qwen-Plus | `ProductEvidenceBundle@1.2` |
| SEO 策略 | `seo-strategy@1.8` | Qwen-Plus | `SeoBrief@1.4` |
| 文章生成 | `content-writer@3.1` | DeepSeek-V3-0324 | `DraftPackage@2.0` |
| 视觉创意 | `visual-brief@1.4` | Qwen-Plus | `VisualBrief@1.1` |
| 质量审核 | `quality-review@2.6` | GPT-4.1 | `ReviewReport@2.2` |

## 模型评测

权重为事实 30%、结构化输出 20%、检索与拒答 15%、中英文 10%、时延 10%、成本 10%、稳定性 5%。150 题业务评测的加权结果为 Qwen-Plus 89.1、DeepSeek-V3-0324 88.8、GPT-4.1 87.3。

## 数据不变量

- 文章事实必须引用冻结的知识版本、BOM 版本和色板版本。
- 表面效果不能改变基材定义。
- 非电气套件不能表述为可直接安装使用的完整吊灯。
- 盐雾性能只能在存在具体样品、方法、时长与报告时表述。
- 已批准资产保存独立 lineage，不随后续知识更新改变。

