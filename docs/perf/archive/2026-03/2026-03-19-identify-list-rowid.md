# 2026-03-19 · list/rowid residual 只读识别（基于已吸收 P1-2 / P1-1.1 / no-trackBy rowid gate）

## 2026-03-19 收口更新

- Top1 `D-4 no-trackBy commit-time updateAll gate 收紧` 已通过 `523eff72` 吸收到母线。
- focused evidence 见：
  - `docs/perf/archive/2026-03/2026-03-19-list-rowid-gate.md`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-v4-perf-stage-closeout.rowid-validation.txt`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-v4-perf-stage-closeout.rowid-perf.txt`
- 本文保留为识别记录，不再作为“待开线建议”执行。

## 输入与边界

- 本文只做 read-only 识别，不改代码。
- 已吸收基线：
  - `P1-2`（whole-state fallback 首刀，含后续 v2 收紧）
  - `P1-1.1`（externalStore single-field producer-side FieldPathId 预取）
  - `D-3 no-trackBy rowid gate`（仅 `validate/source` 窗口）
- 目标：重新识别 list/rowid 仍可推进的 future-only 候选。

## 现状压缩

1. `no-trackBy` 的重复 reconcile 已在 `validate/source` 窗口被切掉，结论稳定。
2. `commit-time rowIdStore.updateAll(...)` 在 D-3 明确保留 legacy 口径，当前仍是 residual 主要承压面。
3. `current-head` 当前按 `clear_unstable` 解读，默认不存在新的 runtime 主线；后续只看 future-only 且风险可控的切口。

## 剩余 future-only 候选

### Top1：RowId `updateAll` 遍历计划缓存（list-config traversal plan cache）

切口：
- `RowIdStore.updateAll(...)` 每次调用都会重建 `cfgByPath/pathSet/parentByPath/suffixByPath/childrenByParent` 并排序 roots/children。
- 提供基于 `listConfigs` 引用稳定性的 traversal plan 缓存，复用构图结果，仅保留 state 读取与 reconcile 本体。

正面收益：
- 在必须执行 `updateAll` 的事务里压缩固定壳税，降低 overlap 路径额外开销。
- 与现有 `listConfigDirtyMatchPlanCache` 方向一致，改动局部、可回滚。

反面风险：
- 若调用方未来在原数组上原地改写 `listConfigs`，缓存会失真。
- 需加守卫，确保 cache key 假设与 runtime 行为一致。

API 变动：
- 无公开 API 变动，内部性能实现细化。

最小验证命令：

```bash
pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.ListConfigsGuard.Perf.off.test.ts
pnpm -C packages/logix-core exec vitest run test/internal/StateTrait/StateTrait.RowIdMatrix.test.ts test/internal/StateTrait/StateTrait.NestedList.RowId.Stability.test.ts
python3 fabfile.py probe_next_blocker --json
```

## 当前收口状态

- `D-4` 已完成并吸收到母线。
- 剩余 watchlist 只保留 `updateAll` 遍历计划缓存。
- 基于本文，若未来要重开 list/rowid，只建议围绕这一个剩余切口开线。
