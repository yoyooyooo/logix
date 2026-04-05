# StateTransaction / RuntimeDebugEvent / Devtools 契约（实现备忘）

> 本节补充记录 003-trait-txn-lifecycle 特性在 `docs/ssot/runtime` 实现侧的关键技术点，方便后续维护与排查。规范性描述以 `../runtime/05-runtime-implementation.md` 与 `../observability/09-debugging.md` 为准，此处强调实现细节与风险。

## 0. 边界与外链（避免重复叙述）

- 事务窗口/逻辑入口/operation window 的语义口径：`../concepts/10-runtime-glossary.06-statetransaction-entry.md`
- 收敛阶段（StateTrait converge）、预算/降级、time-slicing 的语义口径：`../runtime/05-runtime-implementation.01-module-runtime-make.md`（`1.5.*`）
- 事务窗口禁止 IO/等待（硬约束）：`docs/ssot/platform/contracts/00-execution-model.md`
- Devtools 事件种类与可导出裁剪规则：`../observability/09-debugging.02-eventref.md`

## 1. StateTransaction 与观测策略

- Runtime 内部统一通过 `StateTransaction.StateTxnContext` 管理状态写入：
  - 任何进入 ModuleRuntime 的状态写入路径（reducer / Trait / middleware / Devtools 操作）都必须在 `runWithStateTransaction(origin, fn)` 包装下执行；
  - `StateTransaction.commit` 负责单次 `SubscriptionRef.set` 与 Debug 事件派发，是“单入口 = 单事务 = 单次提交”的唯一落点。
- 观测策略实现要点：
  - `StateTransactionInstrumentation = "full" | "light"` 定义在 `packages/logix-core/src/internal/runtime/core/env.ts` 中，`makeContext` 在构造时解析：
    - `"full"`：构建 Patch 列表与 initial/final 快照，并在 Debug 事件中携带 `patchCount` / `originKind`；
    - `"light"`：跳过 Patch 与快照，仅在 commit 时写入最终状态；
  - 默认观测级别：
    - `getDefaultStateTxnInstrumentation()` 基于 `NODE_ENV` 选择 dev/test 下 `"full"`、production 下 `"light"`；
    - Runtime.make 的 `options.stateTransaction` 会注入 `StateTransactionConfigTag`（service 类型 `StateTransactionRuntimeConfig`）作为 runtime_default；ModuleImpl / ModuleRuntimeOptions 的显式配置覆盖默认值；
  - 实现层避免把 Instrumentation 细节泄漏到业务层 API，只在 `RuntimeOptions` / `Module.implement` 上暴露最小的 `{ instrumentation?: "full" | "light" }` 选项。

### 1.1 065：txn dirty-set / patch recording 的 id-first（FieldPathId/StepId）

- Dirty-set 对外形态（Debug `state:update` / Devtools 消费侧只认这个，不读运行时内部对象图）：
  - `dirtyAll=true`：必须给出稳定 `DirtyAllReason`，且 `rootIds=[]`；
  - `dirtyAll=false`：输出 `rootIds`（`FieldPathId`，Static IR table index）+ `rootCount/keyHash/keySize` 摘要；消费侧可按 `staticIrDigest` 反解为可读路径。
- `DirtyAllReason` / `PatchReason`：
  - 必须是稳定枚举；任一不可追踪写入都必须显式降级为 `dirtyAll=true`（禁止“在 roots 存在时忽略 *”）。
  - 归一化逻辑集中在 `packages/logix-core/src/internal/field-path.ts`（`normalizePatchReason` / dirty-set downgrade rules）。
- `FieldPathIdRegistry`：
  - 来源：StateTrait build 期产出的 Static IR table（`ConvergeStaticIrExport.fieldPaths`）。
  - 作用域：必须按 runtime instance 隔离（txn 内通过 `getFieldPathIdRegistry()` 注入），禁止进程级单例（避免多实例/多 session 串扰）。
- Patch recording（full/light 双轨）：
  - `light`：只维护 `patchCount + dirtyPathIds`（不保留 patch 列表），避免分配；
  - `full`：记录 `TxnPatchRecord(opSeq/pathId/reason/stepId/traitNodeId/from/to)`，默认最多 256 条；超限只标记 `patchesTruncated=true`（并给出可解释原因码）。
- `staticIrDigest` gate（消费侧硬门）：
  - `state:update` 必带 `staticIrDigest`（当前口径升级为 `converge_ir_v2:`，包含 fieldPaths table key）；  
  - 当 digest 缺失或不匹配时，Devtools 必须禁止 `rootIds → rootPaths` 反解，仅展示 id 与摘要（避免展示错误信息）。

## 2. 事务历史与 dev-only 时间旅行

- ModuleRuntime 在 dev/test 环境下为每个实例维护事务 ring buffer：
  - `maxTxnHistory` 当前固定为 500；当长度超过上限时按 FIFO 丢弃最旧事务；
  - 使用 `txnById: Map<string, StateTransaction<S>>` 支持 O(1) 按 `txnId` 查找；
  - 存储结构仅驻留内存，不做持久化。
- 时间旅行实现关键点：
  - 在 `ModuleRuntime.make` 中为 runtime 挂载内部方法 `__applyTransactionSnapshot(txnId, mode)`（非公共 API）；
  - 实现逻辑：
    - 非 dev 环境直接返回 no-op；
    - 未找到事务或事务未记录快照时返回 no-op；
    - 根据 `mode` 选择 `initialStateSnapshot` / `finalStateSnapshot`，通过 `StateTransaction.updateDraft` 写入草稿并 commit；
    - 为该操作创建新的 StateTransaction，`origin.kind = "devtools"`，从而在 Debug 侧留下完整轨迹。
  - 公共入口 `Logix.Runtime.applyTransactionSnapshot` 只是查找对应 ModuleRuntime，并调用其 `__applyTransactionSnapshot`，自身不再涉足具体逻辑。
- 风险与注意事项：
  - 所有 dev-only 字段（事务历史、`__applyTransactionSnapshot`）必须在生产构建中保持“冷路径”：
    - 访问前先通过 `isDevEnv()` 守卫；
    - 不在生产环境分支上产生额外对象分配或大型数组。
  - 时间旅行必须保证“不重放外部 IO”：回放只修改本地状态与派生 Trait，不重新执行 HTTP 请求或写入外部存储。

## 3. DebugSink → RuntimeDebugEventRef 映射

- `packages/logix-core/src/internal/runtime/core/DebugSink.ts` 是 Debug 事件聚合的唯一事实源：
  - `DebugSink.Event` 中的 `state:update` 事件必须在 Runtime 层填充 `txnId` / `patchCount` / `originKind`，否则 Devtools 无法构建完整的事务视图；
  - `toRuntimeDebugEventRef(event)` 负责：
    - 为每条事件分配单调递增的 `eventId` 与 `timestamp`；
    - 将 `trace:react-render` 映射为 `kind = "react-render"`；若缺少 `txnId` 则不补造稳定键（Devtools 允许做时间邻近的 UI 辅助关联，但不作为协议保证与回放依据）；
    - 将 `trace:effectop` 映射为 `"service"` / `"trait-*"` 等类别，并透传 EffectOp 的 `meta` 信息；
    - 其余 `trace:*` 统一归类为 `kind = "devtools"`。
- 浏览器环境下的 Debug 行为需要额外注意噪音控制：
  - `browserConsoleLayer` 默认只对 `lifecycle:error` / `diagnostic` 做带样式的 console 输出，其余事件通过自定义 DebugSink 或 Node 环境下的 `consoleLayer` 观察；
  - 为避免 React StrictMode 导致重复日志，引擎在浏览器侧对 lifecycle / diagnostic 事件做了简单去重（moduleId + payload）。

## 4. DevtoolsHub（全局聚合）与 RuntimeOptions.devtools（一键启用）

- DevtoolsHub 是进程/页面级全局单例：
  - 维护 `instances`（runtimeLabel::moduleId 计数）、`events`（ring buffer）、`latestStates`（runtimeLabel::moduleId::instanceId → 最近 state:update）。
  - 通过 `Debug.devtoolsHubLayer({ bufferSize? })` 以“追加 sinks”的方式挂入 Debug sinks 集合；不会覆盖调用方已有 sinks。
  - 对外暴露 `Debug.getDevtoolsSnapshot / subscribeDevtoolsSnapshot / clearDevtoolsEvents` 等只读 API，供 Devtools UI 订阅与派生视图模型。

- `RuntimeOptions.devtools` 作为“显式 override”的一键入口：
  - 在 `Runtime.make` 中自动 merge `Debug.devtoolsHubLayer({ bufferSize })`；
  - 自动对 `options.middleware ?? []` 追加 DebugObserver（`Middleware.withDebug(..., { logger: false, observer })`），确保产生 `trace:effectop` 且携带 txnId；
  - 由于该开关代表“明确开启 Devtools”，因此不受 `isDevEnv()` 裁剪。

- React 渲染事件的 gating：
  - `@logixjs/react` 的 `trace:react-render` 采集应满足：`isDevEnv() || Debug.isDevtoolsEnabled()`；
  - 这样在生产环境也可以在“业务显式开启 Devtools”时开启渲染观测，并保持默认情况下的开销可控。

这一节的目标是帮助后续维护者在阅读 `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`、`packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts` 与 `packages/logix-core/src/internal/runtime/core/DebugSink.ts` 时快速对齐设计意图，并在扩展 Devtools 契约（例如步级 time-travel、事务录制导出）时避免破坏现有不变量。
