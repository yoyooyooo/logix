# 诊断 / Devtools / 回放（Diagnostics & Devtools）

本报告聚焦“可诊断性是否足够”：

- 每次派生/刷新/丢弃是否提供：稳定标识、触发原因、输入快照、状态变更记录；
- 监听与触发范围是否能从依赖图收敛（支持性能与因果分析）；
- 是否能降解为统一最小 IR，并支持冲突检测与合并。

## 已有基础设施（方向正确）

- Debug 事件模型：`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
  - `module:init/destroy`、`action:dispatch`、`state:update`、`diagnostic`、`trace:*`
  - `txnId/originKind/originName/patchCount/replayEvent` 等字段已预留
- DevtoolsHub：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
  - 进程内 ring buffer + snapshot 订阅
- StateTransaction：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
  - txnId、origin、patches、dirtyPaths、快照采集（可选）
- EffectOp：`packages/logix-core/src/EffectOp.ts` + `internal/runtime/EffectOpCore.ts`
  - kind/name/payload/meta 的统一中间件总线
- ReplayLog：`packages/logix-core/src/internal/runtime/core/ReplayLog.ts`
  - 资源快照的时间线记录与 replay

## 已经具备的“闭环要素”（但尚未统一成协议）

### 1) 事务边界上的统一入口与 meta 补齐

`packages/logix-core/src/internal/runtime/ModuleRuntime.ts` 的 `runOperation(...)` 已经在每次边界操作上补齐：

- `moduleId/instanceId/runtimeLabel`
- `txnId`（若存在活跃事务）
- `linkId`（跨模块/跨层级复用 FiberRef，作为因果链的“父链路”）

这为“把所有东西串成一条可解释因果链”提供了很好的基础。

### 2) React 侧已经开始把渲染/选择器事件写回 DebugSink

`packages/logix-react/src/hooks/useSelector.ts` 在 dev/test（或 devtools enabled）下会发出 `trace:react-selector` Debug 事件，并尝试携带 selectorKey/fieldPaths 等信息。

`packages/logix-core/src/internal/runtime/core/DebugSink.ts` 里还存在 `lastTxnByInstance` 的兜底逻辑：用于在某些 trace 事件缺失 txnId 时，为其补齐最近一次 `state:update` 的 txnId，帮助 Devtools 对齐“事务 → 渲染”。

结论：React 1+1>2 所需的诊断基础已经出现雏形，但目前仍是“散点能力”，需要协议化（见下文 IR 提案）。

## 主要问题（需要收敛成“最小诊断 IR”）

### 1) “稳定标识”体系尚未统一

当前存在多种标识：

- Module：`moduleId`（来自 Module 定义）
- Instance：`instanceId`（稳定且可控；禁止默认随机/时间）
- Transaction：`txnId`（稳定：`${instanceId}::t${txnSeq}`；时间戳只作为 `startedAt` 字段）
- EffectOp：`linkId`（跨模块共享 FiberRef）
- Trait：`stepId` / `traitNodeId`（Graph/Plan 侧）
- Debug 事件自身：`eventId`（稳定：`${instanceId}::e${eventSeq}`；进程内自增序号）
- EffectOp：`op.id`（稳定：`${instanceId}::o${opSeq}`；默认单调序号）
- Form RowId：`rowId`（稳定：`${instanceId}::r${rowSeq}`；禁止随机/时间）

更重要的是：这些 id 不仅“不稳定”，还会直接影响**性能分析、回放对齐、冲突合并**三件事：

- 若标识依赖随机/时间，将难以在“同一份 IR 与同一条回放链路”里确定性对齐与重建；
- Devtools 不应靠“最佳努力推断”拼装因果链，协议层必须提供可锚定字段；
- Sandbox/跨宿主桥接需要可比较的稳定锚点，否则证据链会漂移。

建议：定义一个统一的 **Runtime Identity Model**：

- `moduleId`（稳定） + `instanceId`（稳定且可控）作为所有事件的主键；
- `txnId` 必须可追溯其 parent link（linkId）与 trigger；
- trait/source/task 的 id 必须能映射到 IR 节点（稳定、可序列化）。

补充：**“稳定”不是指跨进程全局唯一，而是指“在同一份 IR 与同一条回放链路中可确定重建”**。这对 AI 生成/比对/合并尤为关键。

现状（已按“不兼容”口径落地）：

- `ModuleRuntime.make`：`instanceId` 支持外部注入；默认兜底为进程内单调序号（非随机/非时间）。
- `StateTransaction`：`txnId=${instanceId}::t${txnSeq}`，时间戳只作为 `startedAt`。
- `EffectOp.make`：`op.id=${instanceId}::o${opSeq}`，并通过 FiberRef 传播 `linkId` 形成可对齐链路。

### 2) “触发原因（why）”还缺少标准化

目前：

- txn 有 `origin.kind/name/details`
- Debug 有 `originKind/originName`
- EffectOp 有 `kind/name/meta.trace/tags`

但缺少一个统一的因果链模型（例如：UI event → action dispatch → reducer → converge(step) → source(load) → writeback）。

建议：在 IR 层引入 `CauseChain`（可序列化），并强制所有入口落到同一结构中。

### 3) “输入快照 + 状态变更记录”粒度不一致

Patch 体系已经有字段级 patch 的结构（`path/from/to/reason/stepId`），但 runtime 大量写入仍是 `path="*"`，导致：

- 无法从 patch 推导 dirty-set；
- 无法做依赖图收敛；
- Devtools 只能展示“整棵 state”而缺少可解释的变更片段。

建议：把 patch 作为事务的第一公民（详见 `03-transactions-and-traits.md`）。

### 3.1) “快照”也需要分层：业务快照 vs 诊断快照

当前 Debug 事件与 transaction 快照都把 `state/action` 作为 `unknown` 原样挂上去。这会在真实业务中带来两个风险：

- **不可序列化/超大对象**：导致 Devtools snapshot 失真或拖垮内存；
- **敏感信息泄漏**：尤其是跨端/跨进程桥接（Sandbox/Extension）场景。

建议：定义“诊断快照”的可序列化白名单策略（Schema 驱动或可插拔 sanitizer），并把“业务数据”与“诊断数据”分离。

### 3.2) 目前的观测事件里混入了“不可序列化/高保留成本”的对象

一个非常具体且高风险的点（已收敛）：

- `trace:effectop` 事件只允许上报 **SlimOp**（`{id,kind,name,payload?,meta}`），严禁携带 `effect` 本体；
- DevtoolsHub 只存 `RuntimeDebugEventRef`（`meta` 走 `JsonValue` 投影 + 预算裁剪），避免 ring buffer 保留闭包/对象图导致 GC 与内存抖动。

### 4) 依赖图收敛目前仅在 Trait 层成立

Trait 图（deps/graph/reverse-closure）已经具备收敛条件，但 watcher/flow/task 等仍是运行时黑盒。

建议：将 watcher/flow/task 的“依赖与写入范围”也编译进 IR（至少声明它写哪些 fieldPath、读哪些 deps）。

## 建议的最小诊断 IR（提案）

> 目标：所有高层抽象 100% 降解到 IR；IR 可合并冲突；运行时与 Devtools 只理解 IR。

IR 最小字段集合（示意）：

- `id`：稳定节点 id
- `kind`：`action|reducer|trait.computed|trait.link|trait.source|task|effect|...`
- `reads`：deps（字段路径集合）
- `writes`：fieldPath 集合（或 patch 生成规则）
- `trigger`：上游触发（actionTag/fieldPath/resourceId…）
- `policy`：并发语义、预算、降级策略、观测级别
- `diagnostics`：可复用的错误码/告警码与建议

建议把 IR 拆成两类结构（避免把“静态图”与“动态事件”混成一锅）：

1. **Static IR（可编译、可合并、可冲突检测）**

- `nodes[]`：reducer/trait/source/task/watch 等“声明节点”（稳定 id、reads/writes/policy）
- `edges[]`：依赖边（deps、trigger、imports-scope）
- `conflicts[]`：路径重复定义/单写者冲突/Tag collision 等（可机器判定）

2. **Dynamic Trace（运行期时间线，完全由 Static IR 派生的 id 串起来）**

- `instances[]`：`moduleId + instanceId + runtimeLabel`
- `txns[]`：`txnId/origin/startedAt/duration/dirtyRoots/patchesSummary/degradeReason`
- `ops[]`：SlimOp（`opId/linkId/txnId/kind/name/start/end/status/meta`）
- `events[]`：diagnostic/react-render/source-snapshot/replay 等（都必须能挂到 `instanceId/txnId/opId/nodeId` 上）

这样 Devtools 才能做到：同一份 IR → 多次运行的 trace 可对齐、可 diff、可做因果与性能回归。

## 冲突检测与合并：需要统一落到 IR 层

当前冲突检测分散在多个点：

- ModuleRuntime reducer 重复/迟到注册诊断（`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`）
- Trait 多写者/环检测（`packages/logix-core/src/internal/state-trait/converge.ts`、`build.ts`）
- AppRuntime Tag collision（`packages/logix-core/src/internal/runtime/AppRuntime.ts`）

建议：把这些规则抽象成 IR-level 的通用冲突模型（路径重复定义、覆盖优先级、单写者规则），并保证所有 DSL 都先降解到同一个 IR 再做裁决。

## Devtools 的“必达体验”清单

- 单笔事务视图：why + 输入快照 + patch 列表 + topN cost + 关联的 EffectOp 链路
- 依赖图视图：dirtyRoots → 影响范围（reverse-closure）→ 实际执行 step
- 资源时间线：keyHash gate、并发策略、replay 对齐

## Devtools UI（`@logixjs/devtools-react`）对诊断契约的“真实依赖”

这是“以实现为准”的依赖事实（决定你后续 IR/协议怎么定）：

- DevtoolsHub 快照来源：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`（ring buffer + latestStates + instances）
- Devtools 计算：`packages/logix-devtools-react/src/state/compute.ts`
  - 使用 `Logix.Debug.internal.toRuntimeDebugEventRef(event)` 归一化事件，并按时间窗口聚合 operation summary；
  - 依赖 `state:update.traitSummary.converge` 里携带 `outcome/budgetMs/top3/...` 来做 trait 收敛窗口统计（该结构由 `ModuleRuntime.ts` 构造）。
- 时间旅行能力：`packages/logix-devtools-react/src/state/logic.ts`
  - 通过 `Logix.Runtime.applyTransactionSnapshot(moduleId, instanceId, txnId, mode)` 回放；
  - `@logixjs/core` 内部按 `${moduleId}::${instanceId}` 维度索引 ModuleRuntime，确保 time travel 可按实例锚点精确定位。

结论：

- Devtools UI 已经形成了“事实上的协议”：`state:update` 事件承载 state 快照、txnId、origin、traitSummary；
- 如果你要追求“可执行规范/可对齐回放”，应尽快把这份协议上收为 IR，而不是继续用 `unknown`/散点字段让 UI 反向推断。
