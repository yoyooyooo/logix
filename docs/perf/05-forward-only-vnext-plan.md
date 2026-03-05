# 05 · Forward-Only vNext 方案（零存量用户）

本文件在“当前项目没有任何存量用户”前提下生效，作为后续性能推进的唯一主线。

## 0. 裁决前提

1. 无存量用户、无兼容包袱。
2. 目标优先级：性能上限 > 可诊断性 > API 清晰度 > 兼容性。
3. 允许破坏式 API 调整；不提供兼容层，不保留弃用期。

## 0.1 执行清单（按刀提交）

约束：每一刀必须独立提交，并在本文件与相关专题里把对应条目标记为已完成。

- [x] A-1：Devtools full 懒构造（lazy materialization）+ Trace gate（`traceMode`）的最小闭环（含回归与 perf 证据）。
- [x] A-2：externalStore full/off 方差收敛：在 `traceMode=off` 时提前 `onCommit`（避免 full 延迟 notify）。
- [x] B-1：externalStore 写回批处理（in-flight window），把 “每 callback 一笔 txn” 改为同 module 的窗口合并。
- [x] C-1：`Ref.list(...)` 默认自动增量化（从 txn evidence 推导 `changedIndices`），业务侧不再要求拆 `Ref.item(...)`。
- [x] D-1：DirtySet v2（root-level + index-level evidence 统一协议），converge/validate/selector 共用。
- [x] D-2：SelectorGraph/Converge 统一消费 `TxnDirtyEvidenceSnapshot`（删除重复路径解析与重复 dirty 缓存口径）。
- [x] E-1：mutative patchPaths 保留索引证据（array path -> listIndexEvidence；提升 `Ref.list(...)` 增量覆盖率）。
- [x] F-1：DevtoolsHub 事件窗口 O(1) ring buffer（去 `splice` trimming 抖动；full 诊断更稳）。
- [x] G-1：整状态替换推导 dirty evidence（`setState/state.update`/reducer 无 patchPaths 不再立刻 dirtyAll；commit-time best-effort diff 推导顶层 key/list evidence）。
- [x] G-2：整状态替换推导 if_empty（当 txn 已有精确 dirty evidence 时跳过推导，避免 perf harness 纯 overhead）。
- [x] H-1：converge(off-fast-path) perf hint 保留 + 冷启动样本隔离（负优化边界专项；fast_full guard 尝试已回滚并保留证据）。
- [x] H-2：negativeBoundaries.dirtyPattern 增加 `minDeltaMs=0.1`（sub-ms 相对预算地板），让 gate 可复测可执行。

## 1. 目标状态（一次性收敛）

1. `externalStore.ingest.tickNotify` 的 `full/off<=1.25` 稳定通过到 `watchers=512`。
2. list/form 默认增量化，不依赖业务层手工拆分 `Ref.item(...)`。
3. full 诊断成本受控：事件默认 `lazy materialization`，热路径只保留 slim anchor。
4. Runtime 配置语义去重：诊断配置单一入口，不再分散在多处。

## 2. API vNext（直接替换，不兼容旧形态）

### 2.1 Runtime

现状问题：
- `devtools.diagnosticsLevel` 与 `stateTransaction.instrumentation` 存在语义重叠。

vNext：
- 引入统一 `observability`。
- 删除/收敛旧的重叠配置入口。

```ts
Runtime.make(root, {
  observability: {
    level: 'off' | 'light' | 'full',
    materialization: 'lazy' | 'eager', // 默认 lazy
    bufferSize?: number,
    observer?: false | { ... },
    traitConvergeSampling?: { ... },
  },
})
```

### 2.2 StateTrait.externalStore

现状问题：
- `coalesceWindowMs` 语义弱，无法表达批处理策略。

vNext：
- 用 `writeback` 策略对象替代 `coalesceWindowMs`。
- 默认 `batched + microtask`。

```ts
StateTrait.externalStore({
  store,
  select,
  equals,
  writeback: {
    mode: 'sync' | 'batched',
    window: 'microtask' | { budgetMs: number },
    priority: 'normal' | 'low',
  },
})
```

### 2.3 TraitLifecycle.scopedValidate

现状问题：
- `Ref.list(...)` 增量化能力依赖调用方姿势。

vNext：
- 增加增量策略语义，并由内核默认自动推导。

```ts
TraitLifecycle.scopedValidate($, {
  mode: 'valueChange',
  target: TraitLifecycle.Ref.list('items'),
  incremental: 'auto' | 'forceFull', // 默认 auto
})
```

## 3. 内核改造波次（执行顺序）

### Wave A（P0）：诊断懒构造

目标：
- `full` 下 `state:update` 只产出轻锚点；重 payload 按需生成。

落点：
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
- `packages/logix-core/src/Runtime.ts`（新 `observability` 配置接线）

状态：
- [x] A-1 已完成：引入 `diagnosticsMaterialization=eager/lazy` 与 `traceMode=on/off`，并在 production + full 下默认 `lazy + trace off`；证据见 `docs/perf/2026-03-04-s2-kernel-perf-cuts.md` 的“切刀 #7”。
- [x] A-2 已完成：在 `traceMode=off` 时把 `onCommit` 提前到 `state:update` 之前以尽早 schedule tick flush；证据见 `docs/perf/2026-03-04-s2-kernel-perf-cuts.md` 的“切刀 #8”（ULW52/53/54）。

### Wave B（P0）：externalStore 批处理写回

目标：
- 同窗口多次 external callback 合并为一次 transaction + 一次 notify。

落点：
- `packages/logix-core/src/internal/state-trait/external-store.ts`
- （可选后续刀）`packages/logix-core/src/StateTrait.ts`（vNext `writeback` API）

状态：
- [x] 已完成（内核实现）：引入 per-module writeback coordinator（同 module 同时最多一个 writeback txn in-flight），burst 更新在 in-flight window 内合并写回；证据见 `docs/perf/2026-03-04-b1-externalStore-batched-writeback.md`。

### Wave C（P1）：Ref.list 自动增量

目标：
- transaction 内沉淀 index hint，validate 直接消费。

落点：
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- `packages/logix-core/src/internal/state-trait/validate.impl.ts`
- `packages/logix-core/src/internal/trait-lifecycle/index.ts`

状态：
- [x] 已完成：StateTransaction 记录 list-index evidence，validate 在 `Ref.list(...)` 下从 txn evidence 推导 `changedIndices`；证据见 `docs/perf/2026-03-04-c1-ref-list-auto-incremental.md`。

实现细化（裁决版）：
- `StateTransaction.recordPatch(path:string)` 记录 list-index evidence（`listInstanceKey -> changedIndices`），并记录 list root touched 作为降级门。
- list validate（`Ref.list(...)`）默认从 txn evidence 推导 `changedIndices`；无法推导则显式 full。

### Wave D（P1/P2）：DirtySet v2 统一协议

目标：
- root-level dirtySet + index-level evidence 双通道统一，供 converge/validate/selector 共用。

落点：
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `packages/logix-core/src/internal/state-trait/*`
- （D-2）`packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`

状态：
- [x] 已完成（D-1）：引入 `TxnDirtyEvidence` 并把 validate/rowId 的证据消费口径统一；证据见 `docs/perf/2026-03-05-d1-dirtyset-v2.md`。
- [x] 已完成（D-2）：commit 热路径不再构造 `DirtySet(rootIds)`；SelectorGraph/RowId 统一消费 `TxnDirtyEvidenceSnapshot`；`state:update.dirtySet` 改为 `pathIdsTopK + diff anchors`；证据见 `docs/perf/2026-03-05-d2-dirtyevidence-snapshot.md`。

实现细化（裁决版）：
1. 事务窗口统一证据对象：`TxnDirtyEvidence`
   - root-level：沿用 `dirtyPathIds`（Set）与 `dirtyPathsKeyHash/keySize`（converge 热路径微缓存），并保留 `dirtyAllReason`。
   - list-level：把 “changedIndices / rootTouched / itemTouched” 作为 list 子证据挂到同一对象上（仅事务窗口有效）。
2. validate 统一消费：
   - `ValidateContext` 的 txn 证据字段从 `txnIndexEvidence` 升级为 `txnDirtyEvidence`；
   - list-scope 规则读取 `changedIndices` 统一走 evidence（request-scoped 优先，txn-scoped 兜底）。
3. RowId reconcile 触发条件收敛（关键 perf 刀）：
   - 仅当 dirtyRoot 影响 list 结构或 trackBy 时才 `rowIdStore.updateAll`；
   - row edit（例如 `items.warehouseId`）不再触发全量 reconcile。
4. 兼容策略：
   - 不做兼容层：一次性替换内部接口与所有调用点；
   - 新增/调整回归测试锁定“非结构 list 子字段更新不触发 updateAll”的语义。

### Wave E（P1）：mutative patchPaths 的索引证据

目标：
- 让 `mutative` 的 patch path（含数组索引）也能产出 transaction 的 `listIndexEvidence`，减少 list validate 的 full 降级。

落点：
- `packages/logix-core/src/internal/runtime/core/mutativePatches.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- `packages/logix-core/test/internal/StateTrait/StateTrait.RefList.ChangedIndicesFromTxnEvidence.test.ts`

状态：
- [x] 已完成（E-1）：mutative patchPaths 保留索引段（`3 -> "3"`），并在 `StateTransaction.recordPatch` 对 array path 记录 listIndexEvidence（与 string path 同口径）；证据见 `docs/perf/2026-03-05-e1-mutative-index-evidence.md`。

### Wave F（P0）：DevtoolsHub 事件窗口 O(1) ring buffer

目标：
- 消灭 `DevtoolsHub` 的 `Array.splice` trimming（burst/strict shift）抖动，让 `full` 诊断在高频 `state:update` 下更稳定。

落点：
- `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`

状态：
- [x] 已完成（F-1）：用 O(1) ring storage 替换 `push+splice`，并把“有序 view 重建”推迟到 snapshot read/export；证据见 `docs/perf/2026-03-05-f1-devtools-ring-buffer.md`。

### Wave G（P1）：整状态替换推导 dirty evidence（replace -> inferred patch roots）

目标：
- 当出现 `path="*"`（`setState/state.update`/reducer 无 patchPaths）时，尽可能避免 txn 直接降级 `dirtyAll`；
- 在 commit-time 对 `baseState -> finalState` 做 best-effort diff，推导顶层 key（+ root list changedIndices）级别的 dirty evidence，提升增量路径覆盖面。

落点：
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`

状态：
- [x] 已完成（G-1）：`recordPatch('*', reason!=perf)` 改为“标记整状态替换→commit-time 推导证据”，并补齐 txn 内 `setState` 早退分支的推导接线；证据见 `docs/perf/2026-03-05-g1-infer-replace-patches.md`。
- [x] 已完成（G-2）：新增推导模式位 `inferReplaceEvidenceIfEmpty`，在 `setState/state.update` 场景下“已有精确 dirty evidence 则跳过推导”，避免 perf harness 纯 overhead；证据见 `docs/perf/2026-03-05-g2-infer-replace-if-empty.md`。

### Wave H（P2）：converge(off-fast-path) 负优化边界（perf hint 保留 + 冷启动样本隔离）

目标：
- 在 `diagnosticsLevel=off && middleware=empty` 的 ultra-fast 场景下，让 converge 的判定与缓存策略尽量稳定；
- 避免 generation bump 后重复冷启动导致误判（尤其是 adversarial dirty-pattern）。

落点：
- `packages/logix-core/src/internal/state-trait/converge-in-transaction.impl.ts`

状态：
- [x] 已完成（H-1）：generation bump 时携带 off-fast-path perf hint（stepCount 不变时），并跳过 `txnSeq===1` 的 off-fast-path full 样本更新；同时记录 fast_full guard 的失败尝试与回滚；证据见 `docs/perf/2026-03-05-h1-converge-offfast-perf-hints.md`。
- [x] 已完成（H-2）：negativeBoundaries.dirtyPattern 的 `auto<=full*1.05` 增加 `minDeltaMs=0.1`（与 converge.txnCommit 对齐），让 sub-ms 相对预算可执行；证据见 `docs/perf/2026-03-05-h2-negative-boundary-min-delta.md`。

## 4. 破坏式变更策略（必须执行）

1. 直接移除旧 API 字段（不做 alias）。
2. 同步更新测试与 perf 基准，不保留双写。
3. 所有文档以 vNext 为唯一真相源，旧接口只在历史记录中出现。

## 5. 验收门（每波必须满足）

1. 类型与回归：
- `pnpm -C packages/logix-core typecheck:test`
- `pnpm -C packages/logix-react typecheck:test`
- `pnpm -C packages/logix-core test`

2. Perf 主门：
- `externalStore.ingest.tickNotify`：`full/off<=1.25` 到 `watchers=512` 稳定通过（3~5 轮 quick 中位）。

3. Perf 防回归：
- `runtimeStore.noTearing.tickNotify` 继续通过。
- `form.listScopeCheck` 继续通过。

4. 语义硬门：
- 事务窗口禁 IO。
- `instanceId/txnSeq/opSeq` 稳定不漂移。
- 诊断事件 slim + 可序列化。

## 6. Agent 接力规则

1. 新会话先读本文件，再读 `04-agent-execution-playbook.md`。
2. 若实现与本文件冲突，以本文件为准并回写其它专题文档。
3. 每个 wave 完成后新增日期记录（改动/证据/结论/下一步）。
