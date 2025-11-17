# Data Model: Trait Derived Converge Perf & Diagnostics Hardening

**Feature**: `specs/039-trait-converge-int-exec-evidence/spec.md`  
**Date**: 2025-12-26

> 本文件描述的是“内核可解释的事实结构”（IR/证据/基线资产），不包含实现细节与具体代码组织。

## Entities

### Operation Window

一次同步事务窗口（一次用户动作/一次派发触发的状态变更窗口）。

- `instanceId`: 稳定实例标识
- `txnSeq`: 单调事务序号
- `txnId`: 可读事务锚点（可由 instanceId+txnSeq 构造）
- `origin`: 触发源（dispatch/source-refresh/devtools 等）

### State Patch (internal)

事务窗口内“状态写入”的最小事实条目（用于 dirty-set、证据与回放桥接）。

- `path`: `string | FieldPath`（默认偏向 `FieldPath`/数组段形态以避免 join/split 往返；仅在序列化/调试边界 materialize string）
- `from/to`: 可选前后值（是否携带由 instrumentation/diagnostics 决定）
- `reason`: 写入原因分类（reducer/trait/devtools 等）
- `stepId`: 内部 step 锚点（热路径以整型为主；对外仅在需要时 materialize string）

### Converge Static IR

收敛“结构信息”的最小静态 IR（generation 内稳定），用于解释与增量调度，不应包含闭包/Effect 等不可序列化实体。

- `generation`: 静态 IR 代数（结构变化触发失效）
- `fieldPaths`: canonical FieldPath 表（包含必要 prefix）
- `stepOutFieldPathIdByStepId`: stepId → outPathId
- `stepDepsFieldPathIdsByStepId`: stepId → depPathIds
- `topoOrder`: topo 排序后的 stepId 列表

### Converge Exec IR (internal)

仅用于热路径加速的 internal 执行 IR，在语义上完全可降解为 Static IR，不作为对外事实源。

- `stepOutPathId`: Int32Array（stepId → outPathId）
- `depPathIds`: Int32Array（扁平 deps 表）
- `depOffsets`: Int32Array（stepId → deps slice offset）
- `depSizes`: Int32Array（stepId → deps count）
- `pathSegmentsById`: FieldPath 表（复用 Static IR 的 `fieldPaths`）
- `pathAccessorsById`: 预编译访问器（至少是预分段 segments；可选更激进的 get/set accessor），用于在执行 loop 内避免 `path.split('.')` 与 id→string 往返
- `stepKind`: 紧凑表（computed/link）
- `stepFns`: computed 的 `derive/equals` 函数表（仅驻留内存，不进入证据）

### DirtyRootIds

一次窗口内“已知写入路径”的 canonical roots（或 dirtyAll）。

- `dirtyAll`: boolean
- `reason`: dirtyAll 的原因（unknownWrite/nonTrackablePatch/fallbackPolicy/customMutation）
- `rootIds`: 已知 roots 的 FieldPathId 列表（已排序）
- `keyHash/keySize`: 用于 planner cache 的稳定 key

### ConvergeDirtyInput (internal)

converge 入口可消费的“最小脏输入形态”，用于把 txn/patch 入口的脏信息直接收敛为稳定 id。

- `dirtyAll`: boolean
- `reason`: dirtyAll 的原因（同 DirtyRootIds/DirtySet）
- `rootIds`: Int32Array（canonical roots 的 FieldPathId 列表；升序、去重、prefix-free）
- `rootBitset`: 可选（dense id bitset，用于 driver loop 快速判定）
- `ingressKind`: `"txn.dirtyRootIds"` / `"txn.dirtyPaths"`（用于证据解释与回退归因）

### Converge Plan Cache Evidence

planner cache 的命中/失效/禁用证据，用于解释“为什么走 dirty/full”。

- `hit/missReason/keySize`
- `hits/misses/evicts/capacity/size`
- `disabled/disableReason`（命中率保护/抖动保护）

### Trait Converge Decision Evidence (`trait:converge`)

每次窗口的 converge 决策与执行摘要（必须 Slim 且可序列化），用于 Devtools/回放/对比。

核心字段（概念）：

- `requestedMode/executedMode/outcome/reasons`
- `decisionBudgetMs/decisionDurationMs/executionBudgetMs/executionDurationMs`
- `stepStats`（total/executed/skipped/changed/affected）
- `dirty`（dirtyAll/roots 摘要）
- `cache`（planner cache evidence）
- `generation/staticIrDigest/staticIr`（结构规模与代数）

### Performance Baseline Artifact

可复现的基线结果文件，用于回归与改进宣称。

- `meta`: 环境与运行元信息（runs/warmup/version/commit/dirty/host）
- `matrix`: 维度参数（scenario/scale/diagnosticsLevel/mode）
- `stats`: p50/p95 time、heap/alloc delta 等（按统一口径）

## Invariants

- Converge evidence 必须能通过稳定标识与 txn 锚点关联到同一条动态时间线。
- Static IR 与 Exec IR 必须 100% 可降解：Exec IR 只能是 Static IR 的加速视图，不能引入额外语义。
- 事务窗口内不得执行 IO/async；converge 的任何降级都不得产生“半成品可观察提交”。
- dirty roots 必须 canonical：去 index、排序稳定、prefix-free；任一入口无法保证该不变量时必须降级为 `dirtyAll` 并给出原因。
