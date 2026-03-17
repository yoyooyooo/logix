# 02 · externalStore 瓶颈地图（历史主阻塞，当前已降级为 residual 复核项）

目标：把 `externalStore.ingest.tickNotify` 的性能问题拆到可执行级别，避免重复猜测。

## 当前状态（2026-03-06 更新）

- current-head broad matrix 曾在 `watchers=256` 出现一次 `full/off<=1.25` 失守。
- 但独立 worktree 内 5 轮 quick audit 全部通过到 `watchers=512`。
- 因此这条线当前应视为 **第二优先级 residual 复核项**，而不是继续优先砍的 runtime 主线。
- 证据见：`docs/perf/archive/2026-03/2026-03-06-s1-externalstore-residual-audit.md`。

## 当前已确认现象

证据锚点：
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw31.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw123.current-head.full-matrix.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw124.external-store-current.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.audit.external-store.current.quick.r1.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.audit.external-store.current.quick.r2.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.audit.external-store.current.quick.r3.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.audit.external-store.current.quick.r4.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.audit.external-store.current.quick.r5.json`

结论：
- `p95<=3.00ms`（off/full）可以到 `watchers=512`。
- broad/current-head 的 `watchers=256` 单点失守已被 `2026-03-06` 的 5 轮 clean targeted audit 复核为 residual/noise，不再视为 current-head 的活跃 runtime 问题。

解释：
- `diagnosticsLevel=full` 仍然是相对开销的主要放大点，但现阶段它没有把该 suite 稳定推到门外；当前更应该把这里当作“历史热路径地图 + 复开条件”，而不是继续追的主线瓶颈。

## S-1 residual audit（2026-03-06）

结论：
- 使用同 profile=`quick`、同 suite=`externalStore.ingest.tickNotify` 连续复跑 5 轮 targeted audit，全部 `maxLevel=512 / firstFailLevel=null`。
- `watchers=256` 的 `full/off` ratio 分别为 `0.83 / 1.00 / 0.92 / 1.00 / 0.91`。
- 因此 `ulw123` 在 broad/current-head 中的 `watchers=256` 单次 `ratio=1.30`，判定为 residual/noise，而不是真实残余 runtime 问题。

处理策略：
- 本线关闭为 docs/evidence-only 结案，不再继续做 runtime 热路径改造。
- 只有再次拿到 clean/comparable 口径下连续 3 轮以上稳定复现，才重新打开这条线。

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

4. full 与 off 的“commit 顺序差异”会放大方差（尤其在生产 trace 关闭时属于纯成本）：
- 现状：`diagnosticsLevel=off` 时 `onCommit` 早于 `Debug.record(state:update)`；但 `diagnosticsLevel=light/full` 时相反。
  - 位置：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`（commit ordering 注释段）
- 影响：TickScheduler 会强制跨一个 microtask 边界后才 flush（`scheduleTick` 的 `yieldMicrotask`），因此 `onCommit` 被推迟会直接推迟 notify 启动时间，进而放大 `full/off` 的相对预算与抖动。
- 关键前提：生产环境通常 `traceMode=off`，此时不存在“trace 因果链顺序”需求，顺序差异几乎只剩性能成本。

## 诊断与验证口径（固定）

1. 每次改造至少验证三组：
- `externalStore.ingest.tickNotify`
- `runtimeStore.noTearing.tickNotify`
- `form.listScopeCheck`

2. `externalStore` 判定以相对预算为主：
- `full/off<=1.25` 稳定通过（建议 3~5 轮 quick 中位数）
  - `2026-03-06` 已用 5 轮 clean targeted audit 完成一次 closing check，并判定 broad 单点红样本为 residual/noise。

3. 任何“只提升 off，不改善 full”的方案不能算完成。

## A-2（已完成）：在 `traceMode=off` 时提前 onCommit（对齐 off 的 notify 启动时机）

目标：
- 收敛 `externalStore.ingest.tickNotify` 的 `full/off<=1.25` 方差，至少在 `watchers=512` 处稳定过线（3~5 轮 quick 中位数）。

做法（最小语义改动）：
- 仅在 `traceMode=off` 时，把 `onCommit(...)` 移到 `Debug.record(state:update)` 之前（并确保只调用一次）。
- `traceMode=on` 保持现有顺序不变（继续保证 `txn → state:update → selector/trace → render` 的直觉链路）。

验收：
- `pnpm -C packages/logix-core test`
- `pnpm -C packages/logix-core typecheck:test`
- `pnpm perf collect:quick -- --files test/browser/perf-boundaries/external-store-ingest.test.tsx --out specs/103-effect-v4-forward-cutover/perf/<ulw>.json` ×3~5

证据：
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw52.diag-early-onCommit-trace-off.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw53.diag-early-onCommit-trace-off.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw54.diag-early-onCommit-trace-off.json`
