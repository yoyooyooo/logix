# Data Model: 013 Auto Converge Planner（Converge Static IR + Decision Summary）

> 本文定义 013 的数据形状与字段语义，作为 `specs/009-txn-patch-dirtyset` 统一最小 IR（Static IR + Dynamic Trace）的 **converge 扩展**备忘。对外协议以本特性的 `contracts/*` 为准。

## 1) 基础概念

### 1.1 Requested Mode vs Executed Mode

- `requestedMode: "auto" | "full" | "dirty"`：调用方请求的策略（未配置时默认 `auto`）。
- `executedMode: "full" | "dirty"`：本次事务实际执行路径；`auto` 不进入该枚举。
- `dirtyAll: boolean`：执行模式为 `dirty` 时是否禁用过滤（等价于 full 调度），用于表达“过滤本身可能负优化”的显式降级。

### 1.2 Cache Generation（代际/版本）

- `generation: number`：Converge Static IR 与 Execution Plan Cache 的版本号；generation++ 时整体失效重建。
- `lastBumpReason: string`：最近一次 generation++ 的原因（有限枚举，见 contracts）。
- `generationBumpCount: number`：累计 bump 次数（用于识别高频抖动）。

> 约束：generation 的变更必须可观测、可回归测试覆盖；高频抖动必须触发自我保护（优先回退 full/禁用复用）。

### 1.3 Static IR Digest（事件 → Static IR 的稳定引用）

- `staticIrDigest: string`：用于将 `trait:converge` 事件与其对应的 `ConvergeStaticIR`（EvidencePackage 内去重导出）关联起来的引用标识。
- 定义：`staticIrDigest = instanceId + ":" + generation`。

> 说明：digest 本身不承诺跨 run 稳定（因为包含 `instanceId`）；但在同一 EvidencePackage 内必须稳定且可用作去重 key。

### 1.4 FieldPathId / StepId（仅 generation 内稳定）

- `FieldPathId: number`：build/加载阶段为 canonical `FieldPath` 分配的整型 ID，仅在同一 generation 内稳定。
- `StepId / StepIndex: number`：build/加载阶段为 converge step 分配的整型 ID/索引，仅在同一 generation 内稳定。

> `FieldPathId/StepId` 只用于内核加速与缓存 key；对外证据链的稳定锚点仍以 009 的 `instanceId/txnSeq/opSeq/eventSeq` 为准。

## 2) Converge Static IR（内核态，热路径索引）

### Entity: ConvergeStaticIR

ConvergeStaticIR 在 build/加载阶段生成；在 `Diagnostics Level=full` 下会作为 EvidencePackage 的“去重导出索引”被导出（每个 `staticIrDigest` 只导出一次），供离线解释/回放。

典型字段（实现可按需调整内存布局，但语义必须等价；导出与运行时内核可共享同一份数据结构或做投影）：

- `staticIrDigest: string`：见 1.3。
- `generation: number`
- `fieldPathCount: number`
- `stepCount: number`
- `fieldPaths: ReadonlyArray<FieldPath>`：长度 = `fieldPathCount`，用于 `FieldPathId -> FieldPath` 的可读映射；复用 009 的 `FieldPath` 约束（段数组、无索引）。
- `stepOutFieldPathIdByStepId: Int32Array`：长度 = `stepCount`，用于 `StepId -> output FieldPathId` 的映射（固定 1:1）。
- `topoOrder: Int32Array`：长度 = `stepCount`，full 调度必须复用该顺序（同 generation 内不重复计算）。
- `adjacency: Int32Array` / `offsets: Int32Array`：邻接表紧凑表示（可选，供 planner/影响面计算使用）。
- `buildDurationMs: number`：本次 generation 构建耗时（用于 014 报告与掉帧评估）。

约束：

- 多写者/环必须硬失败（不得被 auto 掩盖）。
- 只允许整数化接口：planner 的输入输出不得依赖字符串 path 参与匹配。

## 3) Dirty Pattern（缓存 key 与可解释映射）

### Entity: DirtyPatternKey（缓存 key，仅内核使用）

- `rootIds: ReadonlyArray<number>`：canonical key（排序去重后的完整 `FieldPathId[]`，纯整数，generation 内有效）。
- `keySize: number`：`rootIds.length`（便于在摘要中快速展示，不必重复输出大数组）。

约束：

- 列表索引不得进入 root；允许因此产生 over-execution，但必须守住下界门槛。
- `rootIds` 不可跨 generation 复用；必须与 `generation` 同时输出以避免误读。

### Entity: DirtyRootsSummary（导出证据，受控体积）

在 `trait:converge.data.dirty` 中导出的受控摘要：

- `dirtyAll: boolean`
- `rootCount?: number`：本次 canonical roots 的总数（full）。
- `rootIds?: ReadonlyArray<number>`：`FieldPathId` 的样本（full；仅前 K 个，默认 K=3，可配置；硬上界 16）。
- `rootIdsTruncated?: boolean`：是否发生截断（full）。

> 说明：`rootIds` 是样本而不是完整 key；可通过 `ConvergeStaticIR.fieldPaths` 映射为可读路径。

## 4) Execution Plan（planner 输出，可缓存复用）

### Entity: ExecutionPlan

- `stepIds: ReadonlyArray<number>`：需要执行的 step 列表（优先 generation 内的 `StepId/StepIndex`）。
- `stepCount: number`

约束：

- 必须是纯数据（不得包含闭包/Effect/业务对象引用）。
- 内核实现可用 `Int32Array` 存储，但对外证据必须可 JSON 序列化（通常转为 number[]）。

## 5) Execution Plan Cache（容量上界与自我保护证据）

### Entity: ExecutionPlanCacheEvidence

- `capacity: number`
- `size: number`
- `hits: number`
- `misses: number`
- `evicts: number`
- `hit: boolean`：本次事务是否命中
- `missReason?: string`：未命中原因（如 `cold_start` / `generation_bumped` / `not_cached`）
- `disabled?: boolean`：是否处于自我保护禁用期
- `disableReason?: string`：禁用原因（如 `low_hit_rate` / `generation_thrash`）

> 说明：命中率自我保护是“刹车片”的一部分；在对抗性场景下允许“更保守但不更慢”。

## 6) Converge Decision Summary（对外证据，Slim & 可序列化）

### Entity: ConvergeDecisionSummary

最小必备字段（light/full 都应可用；off 不得保留任何额外数据）：

- `requestedMode: "auto" | "full" | "dirty"`
- `executedMode: "full" | "dirty"`
- `outcome: "Converged" | "Noop" | "Degraded"`
- `staticIrDigest: string`（`instanceId + ":" + generation`）
- `executionBudgetMs: number`
- `executionDurationMs: number`
- `decisionBudgetMs?: number` / `decisionDurationMs?: number`（requestedMode=auto 时推荐提供）
- `reasons: ReadonlyArray<string>`：稳定、有限的原因码（例如 `cold_start`/`cache_hit`/`budget_cutoff`/`near_full`/`dirty_all`/`unknown_write`/`low_hit_rate_protection`）。
- `stepStats: { totalSteps: number; executedSteps: number; skippedSteps: number; changedSteps: number; affectedSteps?: number }`
- `generation?: { generation: number; generationBumpCount?: number; lastBumpReason?: string }`
- `dirty?: DirtyRootsSummary`（可裁剪：light 仅允许 `dirtyAll`；full 允许 `rootCount` + `rootIds`（前 K）+ `rootIdsTruncated`）
- `cache?: ExecutionPlanCacheEvidence`
- `staticIr?: { fieldPathCount: number; stepCount: number; buildDurationMs?: number }`

可选字段（仅 full/采样）：

- `thresholds?: { floorRatio?: number; decisionBudgetMs?: number; cacheCapacity?: number }`
- `top3?: ReadonlyArray<{ kind?: string; stepId: number; outFieldPathId?: number; durationMs: number; changed: boolean }>`

## 7) Dynamic Trace 扩展事件（Spec 009）

### TraceEvent kind: `trait:converge`

013 以“事件扩展 schema”的形式交付 converge 证据：

- 事件外壳复用 009 的 `DynamicTrace.events[*]`（稳定锚点仍由 `eventSeq/eventId/txnId` 提供）。
- 当 `kind="trait:converge"` 时，`data` 的 schema 固化为 `ConvergeDecisionSummary`（见 `contracts/schemas/*`）。
- `Diagnostics Level=off` 下不得产出任何可导出的 `trait:converge` 事件/摘要；仅 `light|full` 允许导出。

## 8) EvidencePackage（Spec 005）导出约定（converge 扩展）

- `Diagnostics Level=light`：仅在每条 `trait:converge` 事件中输出 `staticIrDigest`（不导出 `ConvergeStaticIR`）。
- `Diagnostics Level=full`：除 `staticIrDigest` 外，EvidencePackage 内必须按 `staticIrDigest` 去重导出对应的 `ConvergeStaticIR`（同一 `instanceId:generation` 只出一次），用于离线解释/回放；导出位置约定为 `EvidencePackage.summary.converge.staticIrByDigest`（见 `contracts/schemas/converge-evidence-package-summary.schema.json`）。
