# 架构与开发交接

## 当前架构

```text
React/Vinext UI
  → ContentOpsService interface
    → deterministic mock adapter
      → reducer state machine
        → localStorage lumaflow-demo-v4
```

`frontend/lib/content-ops-types.ts` 定义产品知识、BOM、工艺、证据快照、模型评测、Prompt 契约、运行 lineage 和资产版本。`demo-data.ts` 是唯一固定业务 fixture。`content-ops-state.ts` 负责门禁、分数、版本和迁移；`export-utils.ts` 从已保存资产生成三种格式。

## 确定性异步

五个 Agent 使用可预测延迟与固定错误注入，不访问模型。服务层方法表面与 `/api/v2` 契约保持一致，以便未来替换适配器。Python `prototype/lumaflow-crew/` 是离线任务图参考，与前端不相互依赖。

## 生产路线图（未实现）

1. 服务端认证与角色权限。
2. 产品资料导入、版本化对象存储和结构化产品主数据。
3. 混合检索与事实级引用，但关键参数仍由结构化字段提供。
4. 模型网关、异步队列、可重复评测和成本/时延监控。
5. 审批审计、资产数据库和下游交付连接器。

这些是路线图，不属于当前演示能力；公开 README 和 UI 均保持这一边界。

## 视觉与部署

- 深绿为治理与品牌主色，黄铜用于材质/工艺语义。
- 产品主图和社交预览为生成的虚构演示资产；BOM、工艺和 lineage 使用代码原生图形。
- `.openai/hosting.json` 绑定现有 Sites 项目；发布前必须打包通过生产构建的同一源码状态。
- 私人总册 `00_项目设定总册.md` 被 Git 忽略，不能进入部署包。
