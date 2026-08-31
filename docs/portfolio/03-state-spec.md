# 状态与持久化规格

## 状态机

```text
idle → running → completed → in_review → approved
          └→ failed → retrying ─┘
```

`ContentOpsService` 保留 `startRun`、`retryRun`、`applyFinding`、`dismissFinding`、`saveManualEdit`、`approveRun` 和导出表面。公开站点只使用 typed mock；`/api/v2` 是未来适配器契约。

## 不变量

- `fact-material` 和 `fact-scope` 未解决时，`approveRun` 必须失败。
- `geo-answer` 与 `geo-source` 每项只增加一次 5 分，全部接受后为 86。
- 审核修改只作用于目标 section，不进行不可解释的整篇重写。
- 批准保存实际文章、视觉资产、来源、发现、人工决定、知识快照、Prompt 快照和模型路由。
- 已批准的 V2 lineage 对后续知识或 Prompt 数据变化保持不可变。

## 浏览器存储

- 当前键：`lumaflow-demo-v4`
- 旧键包含：`lumaflow-demo-v3` 和历史案例键
- 发现旧状态时不尝试混用字段，直接建立新的 PHK-01 V4 初始状态并展示升级提示。
- 重置会清理当前键和历史版本键，再恢复确定性初始数据。
