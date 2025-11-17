---
title: "20. Reactivity Graph IR"
status: draft
version: 2025-12-29
value: vision
priority: next
---

# 20. Reactivity Graph IR（从 Svelte Runes 吸收）

> 目标：把“细粒度响应式图谱”的收益吸收进 Logix：**编译期建图**、运行期只消费静态表与整型句柄，并且能完全降解到统一最小 IR（Static IR + Dynamic Trace）。

本篇聚焦 “Graph/表结构/registry”的静态化；关于“动态闭包税、C0/C1/C2 分类，以及 B 极致 + A 走远（AST lift + Builder 合流）”的执行/编译策略，见：

- `docs/specs/drafts/topics/logix-wasm-endgame/25-closure-taxonomy-and-compilation.md`

## 1) 直觉对齐：Svelte Runes vs Logix

Svelte 的核心启发点不是“signals”，而是：

- **编译期做依赖分析**（谁依赖谁）
- 生成 **细粒度函数引用链/更新计划**
- runtime 只做很薄的一层调度

Logix 的对应物可以是：

- **Static IR**：FieldPathId/StepId/ReasonCode 的 registry + graph tables + topo order + exec plan
- **Dynamic Trace**：txnSeq/opSeq + stepId/pathId 的执行时间线与证据锚点

## 2) Graph 的最小模型（面向 WASM）

面向 WASM，Graph 需要满足：

- 节点/边都可用整型句柄表达（StepId/FieldPathId）
- 所有表都可以序列化为 TypedArray（或 WASM linear memory）
- off 下不 materialize labels/mapping；light/full 才能映射回可读信息

一个可行的最小表集合（示意）：

- `fieldPathIdRegistry`: FieldPathId → segments（仅 light/full 可导出）
- `stepOutFieldPathIdByStepId`: StepId → FieldPathId（每个 step 写回的目标）
- `depsBitsetByStepId` 或 `depsAdjacency`: step 依赖的 FieldPathId 集合
- `topoOrder`: StepId 的拓扑序数组
- `watchersByFieldPathId` / `affectedStepsByFieldPathId`: 反向索引（写入某路径会影响哪些 steps）

这些表的基本形态已经在 converge IR registry 里出现了（后续应统一到 049/050/045 的落点）。

## 2.1 建议的 TypedArray 表结构（最小 SoA / CSR 形态）

为了同时满足 “线性内存友好” 与 “Planner 常数跨边界”，建议 Graph 表尽量采用：

- **SoA（struct-of-arrays）**：避免对象数组；
- **CSR（compressed sparse row）**：用 `offsets + values` 表示变长邻接表。

一个可直接喂给 Planner 的最小 schema（示意）：

- Step 维度（长度 `stepCount`）：
  - `stepOutPathIdU32[stepCount]`：StepId → 写回目标 FieldPathId
  - `stepLaneU8[stepCount]`：`0=host` / `1=wasm`（用于 plan 分段与 L3 扩展）
  - `stepFlagsU32[stepCount]`（可选）：例如 “hasBytecode / hasEquals / requiresValidate”
- Topo（长度 `stepCount`）：
  - `topoStepIdU32[stepCount]`：拓扑序（plan 产出可直接按 topo 扫描）
- Watchers（CSR；FieldPathId 维度，长度 `pathCount+1` / `edgeCount`）：
  - `watcherOffsetsU32[pathCount + 1]`
  - `watcherStepIdsU32[edgeCount]`

Planner 的最小工作集就可以是：`dirtyRootsPathIdsU32[]` + `watcherOffsetsU32` + `watcherStepIdsU32` + `topoStepIdU32`。

> 备注：是否需要 `stepDeps`（step → deps adjacency）取决于诊断/解释链路与 build 阶段能力；对纯 Planner 并非硬必须。

## 3) 编译阶段要做的“重活”

为了实现“一次 txn 一次调用”，重活必须前移：

- graph 构建/拓扑排序
- path normalize / registry 分配
- watcher 反向索引生成
- 生成线性 Exec Plan（49）

运行时只允许：

- 输入 dirty roots（整型）
- 扫表得到受影响集合/plan
- 执行（JS 或 WASM）

## 4) Open Questions

- 在 Logix 里，“可编译逻辑”的边界是什么？哪些 reducers/computed 可以被限制成表达式 IR？
- 对 lists/rowId/动态集合，Graph 表如何保持可控（避免动态建图落回 runtime）？
