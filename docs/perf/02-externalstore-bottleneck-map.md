# 02 · externalStore 瓶颈地图（P1 主阻塞）

目标：把 `externalStore.ingest.tickNotify` 的性能问题拆到可执行级别，避免重复猜测。

## 当前已确认现象

证据锚点：
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw31.json`

结论：
- `p95<=3.00ms`（off/full）可以到 `watchers=512`。
- `full/off<=1.25` 不稳定，在 `watchers=256` 或 `512` 可能触发失败。

解释：
- 问题主因是 `diagnosticsLevel=full` 的额外成本与抖动，不是 ingest 基线吞吐不足。

## 热路径拆解（按调用顺序）

1. 外部输入触发：
- `manualStore.set(...)` -> trait externalStore listener
- 位置：`packages/logix-core/src/internal/state-trait/external-store.ts`

2. 每次回调开启 transaction：
- `internals.txn.runWithStateTransaction(...)`
- 位置：`packages/logix-core/src/internal/state-trait/external-store.ts:239`

3. 提交阶段发 `state:update` 诊断：
- full/light 都会走 `Debug.record(state:update)`
- 位置：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts:266`

4. full 诊断投影与 ring 写入：
- DevtoolsHub 对每事件做 `toRuntimeDebugEventRef(...)`
- 位置：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts:621`

5. onCommit -> TickScheduler -> RuntimeStore notify：
- 位置：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- 位置：`packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
- 位置：`packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`

## 已确认成本热点（确定性）

1. full 模式事件链是相对开销放大点：
- `state:update` 构造 + DevtoolsHub 投影 + ring 写入。

2. externalStore 的“每 callback 一笔 txn”会放大固定成本：
- 输入频率越高，per-txn 固定成本占比越高。

3. 当前问题不在监听器通知本身：
- `runtimeStore.noTearing.tickNotify` 已通过 `full/off<=1.25`，说明 notify 主干已被优化过一轮。

## 诊断与验证口径（固定）

1. 每次改造至少验证三组：
- `externalStore.ingest.tickNotify`
- `runtimeStore.noTearing.tickNotify`
- `form.listScopeCheck`

2. `externalStore` 判定以相对预算为主：
- `full/off<=1.25` 稳定通过（建议 3~5 轮 quick 中位数）

3. 任何“只提升 off，不改善 full”的方案不能算完成。

