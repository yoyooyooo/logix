# 2026-03-05 · D-2：TxnDirtyEvidenceSnapshot（commit 热路径去 DirtySet rootIds）

本刀目标很窄：不改变对外 API，只砍 runtime 核心 commit 热路径里 `DirtySet(rootIds/roots)` 的构造成本，并把 SelectorGraph / RowId / Devtools 的 dirty 消费口径收敛到 **id-first + lazy materialization**。

## 结论（可复现证据）

- 证据（quick comparable，before/after 同 matrix 与 config）：
  - PerfReport (before): `specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.ulw64.d2-dirtyevidence-snapshot.clean.json`
  - PerfReport (after): `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw65.d2-dirtyevidence-snapshot.clean.json`
  - PerfDiff: `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw64-to-ulw65.d2-dirtyevidence-snapshot.clean.json`
- 结论（budget）：
  - `externalStore.ingest.tickNotify`：`watchers<=512` 下 `p95<=3ms` 与 `full/off<=1.25` 均通过。
  - `runtimeStore.noTearing.tickNotify`：`watchers<=512` 下 `p95<=0.30ms` 与 `full/off<=1.25` 均通过。
  - `form.listScopeCheck`：`rows<=300` 下 `auto<=full*1.05`（off/light/full）均通过。

注：更早的 `ULW63(d1)` 与 `ULW65(d2)` 因 quick profile 的采样参数漂移不可直接 `PerfDiff`，本刀补跑 `ULW64` 作为可比 before。

## 改了什么（实现点）

1. committed txn 的 dirty 证据变为不可变快照：`TxnDirtyEvidenceSnapshot`
   - `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
   - commit-time 一次性拷贝 `dirtyPathIds(Array)` + `dirtyPathsKeyHash/keySize` + `dirtyAllReason`，避免后续消费者强制构造 `DirtySet(rootIds)`。
   - 当缺少 `FieldPathIdRegistry` 时保守降级到 `dirtyAll`（保持旧的 fallback policy，不用“不完整 evidence”误导增量路径）。

2. SelectorGraph commit 消费收敛到 snapshot（不再依赖 DirtySet roots）
   - `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
   - 直接遍历 `dirty.dirtyPathIds`，按 `rootKey` 分桶；用 `upsertDirtyRoot` 做前缀最小化（不排序）。

3. RowId reconcile gate 同口径消费 snapshot
   - `packages/logix-core/src/internal/state-trait/rowid.ts`
   - `shouldReconcileListConfigsByDirtyEvidence` 用 `dirtyPathIds` 做 per-rootKey 的 dirtyRoot 最小化（不排序），并保持 “结构变化/trackBy 变化必 reconcile” 的语义门。

4. `state:update` 的 dirtySet 证据改为 TopK payload + diff anchors（不再强制 roots/rootPaths）
   - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
   - 事件结构对齐 `specs/019-txn-perf-controls/contracts/schemas/dirty-set-v2.schema.json`：
     - `dirtyAll/reason`
     - `pathIds`（TopK，可截断）
     - `pathCount/keySize/keyHash`（完整集合的 diff anchor）

5. Devtools 侧“消费时物化 rootPaths”，避免 runtime 侧热路径做映射/排序
   - `packages/logix-devtools-react/src/internal/state/logic.ts`
   - 对 `state:update.meta.dirtySet`：优先读 `pathIds`，必要时回落 `rootIds`，并仅在命中 `summary.converge.staticIrByDigest[*].fieldPaths` 时把 ids 映射为 `rootPaths`（UI 解释用途）。

6. 文档与协议对齐
   - `docs/ssot/runtime/logix-core/observability/09-debugging.02-eventref.md`：明确 dirtySet 是 id-first，且 `pathIds` 仅为 TopK payload。
   - `specs/019-txn-perf-controls/contracts/schemas/dirty-set-v2.schema.json`：补齐 `pathCount/keySize/keyHash/pathIdsTruncated` 等字段约束。

## 为什么有用（机制解释）

- 旧路径的问题：commit 热路径里为了给多个消费者（SelectorGraph / RowId / Devtools）提供 roots 语义，被迫在提交点做：
  - `pathId -> FieldPath` 映射；
  - roots 排序与前缀消除（prefix-minimization）；
  - 并且不同子系统还会重复做一遍。
- D-2 的核心转向：把 runtime 侧证据固化为 **cheap 的、可复用的快照（id-first）**，把 “映射/最小化/解释” 推迟到：
  - 需要语义过滤的消费者（SelectorGraph / RowId）用 O(k) 的 `upsertDirtyRoot` 做最小化；
  - 需要可视化解释的消费者（Devtools）在命中 static IR digest 时才物化 `rootPaths`。

## 剩余问题 / 下一刀候选

- 仍存在 `state_transaction::dirty_all_fallback`（`setState/Reducer writeback` 未提供 patchPaths）时会退化到 `dirtyAll`，从而扩大 converge/selector 的工作集。
  - 若继续“不计代价”压榨，下一刀应提高 field-level dirty evidence 覆盖率：让写入 API 进入 “必须提供 pathId/patchPath” 的强约束面（或把 `update` 收敛到 `mutate`/Reducer.mutate 形态）。
