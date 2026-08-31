# 架构

## 当前结构

```text
React / Vinext UI
  → ContentOpsService
    → LocalContentOpsService
      → five-agent workflow events
        → workspaceReducer
          → localStorage lumaflow-workspace-v5
          → JSON backup / restore
+```
+
+`frontend/lib/content-ops-types.ts` 定义产品知识、BOM、工艺、运营指标、模型评测、Prompt 契约、运行 lineage、资产版本和备份合同。
+
+`workspace-data.ts` 管理受控业务记录；`content-ops-state.ts` 管理门禁、分数、版本、迁移和备份；`content-ops-service.ts` 实现本地工作流和未来 HTTP 适配器；`export-utils.ts` 从已保存资产生成三种格式。
+
+## 服务适配
+
+公开应用默认使用本地工作流。HTTP 适配器保留 `/api/v2` 方法表面，可在未来接入服务端任务运行、事件流、审核决定、批准与导出。
+
+Python 目录 `services/lumaflow-agent-workflow/` 提供与前端一致的任务顺序、结构化输出、一次有界重试和人工门禁合同，运行时不访问网络。
+
+## 视觉与发布
+
+- 深绿代表治理与工作空间，黄铜代表材质与表面工艺。
+- 产品主图使用本地版本化图片；BOM、工艺与 lineage 使用代码原生信息图。
+- `.openai/hosting.json` 绑定现有 Sites 项目。
+- 私人总册 `00_项目设定总册.md` 被 Git 忽略，不进入仓库和发布包。
