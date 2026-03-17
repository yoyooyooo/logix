# 2026-03-04 · S2 内核性能切刀记录（不计代价压榨版）

本文件用于把“这波已经做的”性能改动与证据路标落盘，方便后续反复压榨时回看与继续下刀。

## TL;DR（当前状态）

以以下证据为锚（Browser / `profile=quick` / dirty workspace 快照）：
- `form.listScopeCheck`：`specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw51.form-list-scope-check.json`
- `externalStore.ingest.tickNotify`：`specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw52.diag-early-onCommit-trace-off.json`（以及 ULW53/54）
- `runtimeStore.noTearing.tickNotify`：仍以 `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw31.json` 作为历史锚点（本轮也已单跑回归通过，见下方“验证”）

- ✅ `form.listScopeCheck`：`auto<=full*1.05` 在 `diagnosticsLevel=off/light/full` 全部 **通过**（`maxLevel=300`，`firstFailLevel=null`）。
- ✅ `runtimeStore.noTearing.tickNotify`：`full/off<=1.25` **通过**（`maxLevel=512`，`firstFailLevel=null`）。
- ✅ `externalStore.ingest.tickNotify`：`full/off<=1.25` **已稳定通过到 `watchers=512`**（ULW52/53/54 三轮 targeted quick 均通过）。

结论：S2 三大 perf-boundaries 均已过线；下一阶段转入 “进一步抬高上限 + 默认增量化能力收口”（B/C/D）。

补充（同日后续切刀，externalStore 单项 quick 复测）：

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw40.diag-lazy-materialization.json`：
  - `externalStore.ingest.tickNotify` 的 `full/off<=1.25` **可通过到 `watchers=512`**。
  - 但仍有方差：`ulw38/ulw39` 在 `512` 处复发（见下方“证据路标 #4”）。
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw52.diag-early-onCommit-trace-off.json`（以及 ULW53/54）：
  - 通过“`traceMode=off` 时提前 onCommit”把方差收敛到可复现的稳定通过（见下方“证据路标 #5 / 切刀 #8”）。

## 证据路标（PerfReport）

### 1) ULW31：当前快照（S2 全量 quick）

- PerfReport：
  - `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw31.json`
- 关键阈值（从 report 的 `suites[].thresholds[]` 摘要）：
  - `form.listScopeCheck`：
    - `auto<=full*1.05 {off/light/full}`：`firstFailLevel=null`（`maxLevel=300`）
  - `runtimeStore.noTearing.tickNotify`：
    - `full/off<=1.25`：`firstFailLevel=null`（`maxLevel=512`）
  - `externalStore.ingest.tickNotify`：
    - `full/off<=1.25`：该轮 `firstFailLevel=256`

### 2) form.listScopeCheck 单项复测（用于确认规则增量化生效）

- PerfReport：
  - `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw51.form-list-scope-check.json`
- 关键阈值：
  - `auto<=full*1.05 {off/light/full}`：`firstFailLevel=null`（`maxLevel=300`）

### 3) ULW7/ULW8：上一阶段“externalStore 打穿”的证据入口

- 汇总文档（包含 ULW7/ULW8 的变更点与趋势判读）：
  - `specs/103-effect-v4-forward-cutover/perf/s2.local.strict.summary.md`
- 该阶段的关键改动（见下方“切刀 #1/#2”）：
  - tiny-graph auto→full 提前切换
  - form perf 观测对齐（full/auto 同 capture sink）

### 4) ULW38/ULW39/ULW40：externalStore 单项 quick（diagnostics lazy materialization）

说明：这是“只跑 `externalStore.ingest.tickNotify`”的 targeted quick 证据，用于判断 full 诊断开销是否收敛。

- PerfReport：
  - `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw38.diag-lazy-materialization.json`
  - `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw39.diag-lazy-materialization.json`
  - `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw40.diag-lazy-materialization.json`
- PerfDiff：
  - `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw39-to-ulw40.diag-lazy-materialization.json`
- 关键阈值：
  - `ulw38/ulw39`：`full/off<=1.25` 在 `watchers=512` 处失败（通过到 `256`）
  - `ulw40`：`full/off<=1.25` 通过到 `watchers=512`

### 5) ULW52/ULW53/ULW54：externalStore 单项 quick（traceMode=off 提前 onCommit）

说明：这是“只跑 `externalStore.ingest.tickNotify`”的 targeted quick 证据，用于验证 full/off 方差是否被收敛。

- PerfReport：
  - `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw52.diag-early-onCommit-trace-off.json`
  - `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw53.diag-early-onCommit-trace-off.json`
  - `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw54.diag-early-onCommit-trace-off.json`
- PerfDiff（注意：before 文件的 profile 标记有漂移告警，仅作趋势参考）：
  - `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw39-to-ulw52.diag-early-onCommit-trace-off.json`
- 关键阈值：
  - 三轮均：`full/off<=1.25` 通过到 `watchers=512`

## 这波切刀（做了什么，落点在哪）

### 切刀 #1：tiny-graph（scopeStepCount<=2）直接把 auto 提前切 full

目的：小图上 `auto` 决策的固定开销占比过高，砍掉小图 `auto` 选择路径，直接走 `full`，用“确定性 + 少分支 + 少诊断开销”换取更稳定的吞吐。

- 代码落点：
  - `packages/logix-core/src/internal/state-trait/converge-in-transaction.impl.ts`

### 切刀 #2：perf 观测对齐（避免 auto/full 观测不对称导致比值被放大）

目的：perf 边界里 full/auto 走不同 capture sink 会制造“测量偏差”，放大/缩小 auto/full 比值，导致假回归或假优化。

- 代码落点：
  - `packages/logix-react/test/browser/perf-boundaries/form-list-scope-check.test.tsx`

### 切刀 #3：list-scope 规则执行链增量化（changedIndices + rowIdAt，避免 O(n) rowIds 构造）

目的：把 `form.listScopeCheck` 从“每次变更都全量扫列表 + 构造 rowIds 数组”改为“按变更行增量更新”，并让规则能拿到稳定 `$rowId` 与变更索引提示。

关键决策：

- `RuleContext.scope`：从 `rowIds?: string[]` 改为 `rowIdAt?: (index:number)=>string`。
  - 避免为了提示/诊断而构造整段 rowIds 数组（尤其大 list）。
- `changedIndices`：不仅从 `target.kind==='item'`，也从 `target.kind==='field'` 的 `valuePath`（如 `items.10.warehouseId`）推导 list index 绑定，让真实 onChange 形态也能命中增量路径。
- 正确性兜底：无 `trackBy` 的 list 仍需在 validate 窗口内 `ensureList`，否则 reorder 下 nested list 的 `$rowId` 绑定会漂移（之前为极致性能去掉会导致用例失败，已恢复）。

- 代码落点：
  - `packages/logix-core/src/internal/state-trait/validate.impl.ts`

### 切刀 #4：perf workload（uniqueWarehouse）改为真正可增量

目的：perf 场景里的“跨行唯一性校验”必须能吃到 `changedIndices`，否则即使内核提供增量 hint，规则仍可能在自身实现里退化为全量。

实现要点：

- per list instance cache：`valueByRowId` / `indicesByValue`。
- 优先用 `ctx.scope.changedIndices + ctx.scope.rowIdAt` 增量更新；遇到结构变化、rowId drift、缺 hint 时 full rebuild（正确性优先）。

- 代码落点：
  - `packages/logix-react/src/internal/store/perfWorkloads.ts`

### 切刀 #5：让 perf 基准触发方式对齐真实 onChange（保证 changedIndices 生效）

目的：原 perf harness 若用“整段 items patch / list scopedValidate”触发，会让内核无法推导具体变更行，导致增量化能力实际不生效。

- 改动点：
  - `recordStatePatch`：从写 `items` 改为逐行逐字段：`items.${idx}.warehouseId`
  - `scopedValidate`：从 `Ref.list('items')` 改为逐变更行循环：`Ref.item('items', idx, { field: 'warehouseId' })`

- 代码落点：
  - `packages/logix-react/test/browser/perf-boundaries/form-list-scope-check.test.tsx`

### 切刀 #6：txnHistory 淘汰 O(1)（ring buffer 替代 push+shift）

目的：`runtimeStore.noTearing.tickNotify` 的 full/off 相对预算被 txnHistory 的 `shift()`（O(n)）拖垮；改为固定容量 ring buffer，淘汰为 O(1)。

- 代码落点：
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`

### 切刀 #7：Devtools full 懒构造 + Trace gate（降低 full 相对开销）

目标：继续打 `externalStore.ingest.tickNotify` 的 `full/off<=1.25`，把 `diagnosticsLevel=full` 在热路径里的“额外 work”压到最低。

做法（核心点）：

- 新增 `diagnostics materialization` 旋钮（`eager/lazy`）：
  - full + lazy 时，`state:update` 不再在提交时投影/导出“重 payload”（如 `state` 快照、`traitSummary`、`replayEvent`），只保留 slim anchors（dirtySet/txn 锚点/patchCount 等）。
- 新增 `trace gate`（`traceMode on/off`）：
  - 在 `Debug.record` 边界对 `trace:*` 做开关；`off` 时直接丢弃 trace 事件，避免热路径里“观测噪音”的固定成本。
- 对齐 DevtoolsHub 投影：
  - Hub 在 `toRuntimeDebugEventRef` 时显式传入 `materialization`，保证 exportable event refs 的成本可控且语义一致。

代码落点：

- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`
  - FiberRef：`currentDiagnosticsMaterialization` / `currentTraceMode`
  - `record()`：对 `trace:*` 做 gate
  - `toRuntimeDebugEventRef()`：`state:update` 在 `lazy` 下只导出 slim meta（不再 `projectJsonValue(state)`）
- `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
  - Hub sink 在投影时传入 `materialization`
- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
  - `shouldEmitTrace` 改为依赖 `Debug.currentTraceMode`（解除对 `DevtoolsHub.isDevtoolsEnabled()` 的耦合）
- `packages/logix-core/src/Debug.ts`
  - `Debug.devtoolsHubLayer` 支持 `materialization/traceMode`，并给出 production 默认策略：
    - `diagnosticsLevel=full` 且 `NODE_ENV=production` 默认 `materialization=lazy`
    - `NODE_ENV=production` 默认 `traceMode=off`

### 切刀 #8：`traceMode=off` 时提前 onCommit（对齐 notify 启动时机，收敛 full/off 方差）

目标：把 `externalStore.ingest.tickNotify` 的 `full/off<=1.25` 从“偶发复发”收敛成“可复现稳定通过”。

做法：

- 在 commit 阶段引入新的顺序判定：
  - `diagnosticsLevel=off`：保持既有策略（`onCommit` 早于 `state:update`）。
  - `diagnosticsLevel!=off` 且 `traceMode=off`：同样把 `onCommit` 提前到 `state:update` 之前（尽早 schedule tick flush 的 microtask 边界）。
  - `traceMode=on`：保持原顺序（继续保证 selector/trace 因果链在 `state:update` 之后）。

代码落点：

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`

证据：

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw52.diag-early-onCommit-trace-off.json`（以及 ULW53/54）

## 为什么这次有用（本质原因）

- 把“每次变更都全量”的 rule 链路改成 “按变更行/变更字段增量”：
  - 规则执行复杂度从 O(n) 降到 O(k)（k=变更行数）。
  - 同时减少 rowId/路径解析等中间对象分配。
- 把“看似不大但处在高频热循环”的 O(n) 结构操作改成 O(1)：
  - txnHistory 的 `shift()` 在高频 tick 下会变成隐性瓶颈，ring buffer 直接砍掉该项。
- 观测对齐后，perf suite 反映的是“真实执行差异”，不是“测量装置差异”：
  - 否则会出现“auto/full 比值被 sink 差异放大”的假象，拖慢迭代。

## 验证（当时执行并通过的命令）

说明：以下为本轮改造完成时的验证清单（用于复现时照抄）。

- 类型检查：
  - `pnpm -C packages/logix-core typecheck:test`
  - `pnpm -C packages/logix-react typecheck:test`
- 回归测试：
  - `pnpm -C packages/logix-core test`（当时跑出 `279 files / 634 passed`）
  - `pnpm -C packages/logix-core typecheck:test`
- Browser perf 单跑（按需挑重点）：
  - `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/form-list-scope-check.test.tsx`
  - `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx -t "perf: runtimeStore tick"`
  - `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/external-store-ingest.test.tsx -t "perf: externalStore ingest"`

## 剩余问题与下一刀（继续不计代价压榨）

### 1) externalStore.ingest.tickNotify：`full/off<=1.25` 已稳定过线（A-2 完成）

证据：

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw52.diag-early-onCommit-trace-off.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw53.diag-early-onCommit-trace-off.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw54.diag-early-onCommit-trace-off.json`

下一刀（建议优先级从高到低）：

- B-1：externalStore 批处理写回（窗口合并 txn），继续抬高上限并降低高频输入下的 txn 数量与抖动。
- C-1：`Ref.list(...)` 自动增量（txn evidence -> `changedIndices`），把增量化从“调用方配合”升级到“内核默认能力”。

### 2) 证据层面：把 externalStore 的不稳定性从“感觉”变成“可解释”

- 建议固定 3~5 轮重复采集（同 profile/同参数），对 `full/off` 产出中位数结论；
- 需要时输出更细的分解指标（例如 full 模式额外事件数、事件体积、每 tick 构造对象数），避免只盯最终 ms。
