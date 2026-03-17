# 2026-03-04 · C-1 Ref.list 自动增量（txn evidence -> changedIndices）

目标：让 list-scope validate 即使由 `Ref.list(...)` 触发，也能从同一 transaction 的 dirty evidence 推导出 `changedIndices`，不再要求调用方拆成 `Ref.item(...)`。

## TL;DR（结论先行）

- 已完成：`StateTransaction.recordPatch(path:string)` 在 list traits 存在时记录 list-index evidence（`listInstanceKey -> changedIndices`），并把该 evidence 注入到 `validateInTransaction`。
- 关键行为变化：当 validate target 为 `list`（`Ref.list(...)`）时，list-scope rules 与 item-scope rules 都会优先吃到 txn evidence 推导出的 indices；遇到 dirtyAll / list root touched 则显式降级 full。
- 对外 API 不变，但写法负担下降：业务侧可以继续用 `Ref.list(...)`，不用为了性能手工拆 `Ref.item(...)`。

## 问题复盘（为什么之前做不到）

之前的 `DirtySet/patch` 证据只保留“字段路径（过滤掉 numeric segment）”，导致：
- transaction 内即使记录了 `items.10.warehouseId` 这类 valuePath，最终的 fieldPathId 仍会归一化为 `items.warehouseId`；
- validate 在 `Ref.list('items')` 场景下无法知道“具体哪些 index 变了”，只能降级成全量扫描（O(n)）。

这迫使调用方为了增量化被动采用「逐行 validate」的姿势（`Ref.item(...)`），对 DX 与可维护性都不友好。

## 方案（实现要点）

### 1) StateTransaction 新增 list-index evidence 通道（不依赖 diagnostics full）

代码落点：
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`

做法：
- 在 `StateTransaction.beginTransaction` 时，从 ModuleRuntime 侧注入并捕获 `listPathSet`（由 `RowId.collectListConfigs` 派生）；
- `recordPatch(path:string)` 检测 numeric segment / bracket index（例如 `items.10.x` / `items[10].x`）时，记录：
  - `indexBindings: Map<listInstanceKey, Set<index>>`
  - `rootTouched: Set<listInstanceKey>`：当 patch 命中 list root（结构可能变化）时，禁用该 list instance 的增量 hint
- 对没有 list traits 的 module，`listPathSet` 为 `undefined`，该通道为零开销（不引入额外分支/分配）。

### 2) validate 在 Ref.list 下从 txn evidence 推导 indices（正确性优先）

代码落点：
- `packages/logix-core/src/internal/state-trait/validate.impl.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`

做法：
- `ModuleRuntime.transaction` 在调用 `validateInTransaction` 时注入 `txnIndexEvidence=StateTransaction.readListIndexEvidence(txnContext)`；
- `validate.impl.ts`：
  - list-scope checks：`ctx.scope.changedIndices` 的来源从“仅 requests”扩展为“requests 优先，其次 txn evidence”；
  - item-scope checks：当 validate target 为 list 时，访问 indices 的来源同样扩展为 txn evidence；
  - 降级门：`dirtyAll` 或 `rootTouched` 命中时，显式回退到 full（不提供 changedIndices）。

## 验收与回归

新增核心用例（防未来回归）：
- `packages/logix-core/test/internal/StateTrait/StateTrait.RefList.ChangedIndicesFromTxnEvidence.test.ts`
  - 断言：`Ref.list('items')` 下仍能命中 `changedIndices=[1]`（否则规则会退化为 FULL 并导致用例失败）。

本次也跑过：
- `pnpm -C packages/logix-core typecheck:test`
- `pnpm -C packages/logix-core test`
- `pnpm -C packages/logix-react typecheck:test`
- `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/form-list-scope-check.test.tsx`

PerfReport/PerfDiff（quick，clean workspace）：
- PerfReport：
  - `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw59.c1-ref-list-auto-incremental.clean.json`
- PerfDiff（对比历史锚点；before 为 dirty 快照，仅作趋势参考）：
  - `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw51-to-ulw59.c1-ref-list-auto-incremental.clean.json`

## 下一刀（不计代价）

- D-1：DirtySet v2（把 index-level evidence 升级为统一协议，供 converge/validate/selectorGraph 共用），彻底去掉各处重复的路径解析与 hint 拼装。
