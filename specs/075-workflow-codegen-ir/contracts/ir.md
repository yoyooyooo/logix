# Contracts: IR（WorkflowStaticIr）

> 本文固化 Workflow 的 Static IR 口径；Dynamic Trace 只携带锚点与摘要（见 diagnostics）。

## 1) Static IR（V1）

- 必须 JSON 可序列化
- 必须带 `version` 与 `digest`
- 必须去随机化：`programId/nodeId` 不得依赖时间/随机默认
- 必须图结构：success/failure 分支必须显式映射为节点/边（不得依赖隐式约定）
- 可选 source 映射：允许在 node 上附带可序列化的 `source`（例如 fragmentId/stepKey），用于 Devtools 定位与组合溯源；不得携带闭包/函数/IR 全量

概念形态见 `specs/075-workflow-codegen-ir/data-model.md#workflow-static-ir`。

## 1.1 From Canonical AST → Static IR（规范化映射）

Static IR 是 Canonical AST 的可导出投影，必须满足“稳定可比对”。映射规则（v1）：

- `programId`：安装到 module 时派生（默认绑定 ModuleId），形如 `${moduleId}.${localId}`；跨 module 复用必须显式 rebind（不在 IR 中隐藏）。
- `nodes`：每个 trigger/step 生成一个 node；`call` 本身是 step node，`onSuccess/onFailure` 内的 step 仍各自生成独立 step node。
- `edges`：
  - 线性顺序用 `kind: 'next'`（或缺省 kind=next，保持兼容）；不得用“数组邻接”作为唯一真相源。
  - `call` 的 `onSuccess/onFailure` 必须映射为显式 `success/failure` 边。
- `source`：
  - `source.stepKey`：来自 Canonical AST 的 `step.key`（必须存在）
  - `source.fragmentId`：来自 build-time fragment（若存在）
  - `source` 只用于可读定位，不得承载语义
- `nodeId`：主锚点使用稳定 hash（推荐 `hash(programId + '/' + stepKey + '/' + kind + '/' + extra)`），禁止随机/时间与数组下标；可读性通过 `source.stepKey` 提供。
- `digest`：基于 Canonical AST 规范化后的 Stable JSON（字段排序/默认值落地/去掉非语义 meta）计算；同一语义必须产生同一 digest。

## 2) 扩展策略

- 同一 `version` 内只允许新增可选字段；解析器忽略未知字段（向前兼容解析）。
- 遇到未知 `version` 必须 fail-fast 并提示升级（避免静默误解释导致证据漂移）。
