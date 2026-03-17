# 2026-03-16 · D-3：no-trackBy list RowId gate

本刀只收一个点：

- 对没有 `trackBy` 的 list，`validate` / `source.refresh` 热路径里不再无条件跑 `rowIdStore.ensureList(...)`
- 仅在现有 RowId 映射可直接复用时跳过 O(n) reconcile
- commit 后的 `rowIdStore.updateAll(...)` 仍保持 D-1 的 legacy 口径，这一刀不改 post-commit gate

## 结论

保留代码。

当前母线裁决以本文为准。较早失败试探保留在 `2026-03-16-p1-rowid-no-trackby-gate-failed.md`，只作为历史试错记录。
原因：

- `validate` 热路径有明确硬收益
- `source-like` 热路径也有稳定正收益
- 语义边界收敛在“只跳过 validate/source 窗口内的重复 reconcile”，不扩大到 commit-time `updateAll`

## 做了什么

代码落点：

- `packages/logix-core/src/internal/state-trait/rowid.ts`
- `packages/logix-core/src/internal/state-trait/validate.impl.ts`
- `packages/logix-core/src/internal/state-trait/source.impl.ts`

核心做法：

1. 新增 `RowIdStore.canSkipNoTrackByListReconcile(...)`
   - 已有 `trackBy` 时一律不跳过
   - `items` 引用不变时直接跳过
   - 事务脏证据已明确“list root 未 touched / item 未 touched”时跳过
   - 没有 txn 证据时，回落到现有 reference-level 结构判断
2. `validate.impl.ts`
   - root list / nested list 两条 no-trackBy 路径先问 gate，再决定是否 `ensureList(...)`
3. `source.impl.ts`
   - list.item source refresh 先问 gate
   - 若跳过 reconcile，则改为按 index 读取既有 `rowId`

## 证据

命令：

```bash
pnpm -C packages/logix-core exec vitest run test/internal/StateTrait/StateTrait.NoTrackByRowIdGate.Perf.off.test.ts
```

本次工作区实测：

- `validate`
  - `rows=100`: `p50 0.041ms -> 0.020ms`，`p95 0.072ms -> 0.024ms`，约 `2.04x / 3.02x`
  - `rows=300`: `p50 0.060ms -> 0.022ms`，`p95 0.091ms -> 0.023ms`，约 `2.73x / 4.04x`
  - `rows=1000`: `p50 0.138ms -> 0.048ms`，`p95 0.179ms -> 0.061ms`，约 `2.89x / 2.94x`
- `source-like`
  - `rows=100`: `p50 0.012ms -> 0.010ms`，`p95 0.014ms -> 0.014ms`，约 `1.22x / 1.02x`
  - `rows=300`: `p50 0.028ms -> 0.021ms`，`p95 0.049ms -> 0.031ms`，约 `1.35x / 1.57x`
  - `rows=1000`: `p50 0.093ms -> 0.055ms`，`p95 0.106ms -> 0.069ms`，约 `1.69x / 1.55x`

同一条 perf 用例还锁了一个非时间语义：

- `legacy.ensureListCalls = warmup + iterations`
- `gated.ensureListCalls = 0`

也就是这刀确实把 no-trackBy row edit 的重复 reconcile 全部切掉了。

## 验证

行为/边界测试：

- `pnpm -C packages/logix-core exec vitest run test/internal/StateTrait/RowId.NoTrackByGate.test.ts`
- `pnpm -C packages/logix-core exec vitest run test/internal/StateTrait/RowId.UpdateGate.test.ts test/internal/StateTrait/StateTrait.RowIdMatrix.test.ts`
- `pnpm -C packages/logix-core exec vitest run test/internal/StateTrait/StateTrait.NestedList.RowId.Stability.test.ts test/internal/StateTrait/StateTrait.TraitCheckEvent.DiagnosticsLevels.test.ts`

质量门：

- `pnpm -C packages/logix-core typecheck:test` 通过
- `pnpm typecheck` 已执行，但被工作区现有问题阻塞：`apps/speckit-kanban-fe` 缺 `react` / JSX 类型
- `pnpm lint` 已执行，`oxlint` 通过；`eslint` 阶段被当前工作区依赖解析异常阻塞：`@typescript-eslint/utils` 无法解析
- `pnpm test:turbo` 已执行，但被无关包现有依赖缺口阻塞：`examples/effect-api` 缺 `pg`，`apps/logix-galaxy-api` 缺 `@effect/sql-pg` / `pg`
- `pnpm -C packages/logix-core test` 已执行；当前工作区仍有 6 个无关 suite 失败，集中在 `DeclarativeLinkIR`、`ModuleAsSource`、`WorkflowRuntime.075`、`StateTrait.ExternalStoreTrait.Runtime`、`ModuleRuntime.operationRunner.Perf`

## 裁决说明

这刀与 D-1 不冲突：

- D-1 解决的是 commit-time `rowIdStore.updateAll(...)` 何时触发
- D-3 解决的是 validate/source 窗口里，no-trackBy row edit 不要重复做同一轮 reconcile

当前保守边界：

- 不改 `updateAll` 的 no-trackBy legacy 触发条件
- 不改 RowId 的 reference-level 降级语义
- 只把“已能从现有映射读出稳定 rowId”的重复工作剔掉
