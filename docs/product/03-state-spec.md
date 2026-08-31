# 状态与持久化规格

## 任务状态机

```text
idle → queued → analyzing → strategizing → writing → visualizing → reviewing
                                                                    ↓
                                                             needs_review
                                                                    ↓
                                                                approved
```

失败任务进入 `failed`，用户可从相同 Brief 重新运行新任务。

## 审核不变量

- `fact-material` 和 `fact-scope` 未解决时，`approveRun` 必须失败。
- `geo-answer` 与 `geo-source` 每项只增加一次 5 分，全部接受后为 86。
- 人工编辑只作用于目标 section。
- 批准保存文章、视觉、来源、发现、人工决定、知识、Prompt 和模型策略快照。

## 浏览器存储

- 当前键：`lumaflow-workspace-v5`
- v4 键会静默迁移，并保留任务、审核决定、PHK V2 与资产版本。
- 本地持久化不依赖当前页面或抽屉是否打开。

## 备份契约

```ts
WorkspaceBackup {
  schemaVersion: 5
  exportedAt: string
  workspace: {
    selectedProductId
    brief
    run
    assets
    workspaceUpdatedAt
  }
}
```

恢复限制为 5 MB，并校验 JSON、版本、产品选择、Brief 与资产数组。当前页面、抽屉、编辑状态和确认弹窗不进入备份。

