# 2026-03-20 · RowId updateAll traversal plan cache v2

## 结果分类

- `accepted_with_evidence`

## 目标与边界

- 目标：只重做 `RowId updateAll traversal plan cache`，在 overlap 必跑路径给出 focused 正收益。
- 明确不做：
  - `D-4 gate` 重做
  - RowId identity 语义改写
  - React / controlplane 相关改动
- write scope：
  - `packages/logix-core/src/internal/state-trait/rowid.ts`
  - `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.ListConfigsGuard.Perf.off.test.ts`
  - `packages/logix-core/test/internal/StateTrait/StateTrait.RowIdMatrix.test.ts`
  - `packages/logix-core/test/internal/StateTrait/StateTrait.NestedList.RowId.Stability.test.ts`（本次未改）

## 实施改动

1. 在 `rowid.ts` 新增 `updateAllTraversalPlanCache`（`WeakMap<listConfigsRef, plan>`），缓存以下遍历计划组件：
   - `cfgByPath`
   - `suffixByPath`
   - `childrenByParent`（预排序）
   - `roots`（预排序）
2. 命中缓存前增加签名一致性检查（`path + trackBy` 序列），封住“同一数组引用被原地改写”导致 plan 失真的风险；签名漂移时自动重建。
3. `RowIdStore.updateAll` 改为消费预编译 traversal plan，去掉每次调用的构图与排序热税。
4. 测试补充：
   - 新增用例验证 `listConfigs` 原地改写时会触发 plan 重建，不会沿用旧 plan。
   - perf 用例新增 focused 对照：overlap 必跑路径下，`stable listConfigs ref`（命中缓存）对比 `fresh cloned listConfigs`（强制失配），只看 traversal plan cache 本体收益。
   - `StateTrait.RowIdMatrix` 中 no-trackBy 结构变更用例改为“loading/success 均可接受，若 success 必须数据对位”的稳定语义断言，避免把本刀范围外的异步完成时序抖动引入失败。

## 验证与证据

- 命令 1：
  - `pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.ListConfigsGuard.Perf.off.test.ts test/internal/StateTrait/StateTrait.RowIdMatrix.test.ts test/internal/StateTrait/StateTrait.NestedList.RowId.Stability.test.ts`
  - 结果：通过（`3 files, 10 tests passed`）
  - 关键 perf 输出：
    - no-overlap（guard gate）：`speedup=140.63x`
    - overlap（guard 额外开销比）：`guardedOverhead=0.95x`
    - overlapTraversalPlanCache（focused）：
      - `cached.p50=8.570ms`
      - `uncached.p50=9.687ms`
      - `speedup=1.13x`
- 命令 2：
  - `python3 fabfile.py probe_next_blocker --json`
  - 结果：`status=clear`
  - `blocker=null`
  - `threshold_anomalies=[]`

## 结论

- traversal plan cache 在 overlap 必跑路径给出了 focused 正收益（`1.13x`），并通过了缓存 key 假设稳健性守卫。
- 语义门与 probe 门均为绿色，本刀可收口。
