# 2026-03-19 · D-4 no-trackBy commit-time updateAll gate 收紧

## 目标

- 只做 Top1：把 no-trackBy 在 commit-time 的 `updateAll` 触发面从“路径重叠”收紧到“结构变化证据明确”。
- 不触碰 Top2 traversal plan cache。

## 代码改动

落点：

- `packages/logix-core/src/internal/state-trait/rowid.ts`

核心裁决：

1. `shouldReconcileListConfigsByDirtyEvidence(...)` 中 no-trackBy 分支改为仅在 `isPrefixPath(dirtyRoot, listPath)` 时触发。
2. 含义是“dirty root 位于 listPath 本身或祖先路径”，视为结构变化证据明确。
3. `dirtyRoot` 位于 `listPath` 之下的字段更新，不再触发 commit-time `updateAll`。
4. `trackBy` 分支维持原口径，仍按 `trackByPath` overlap 判定 identity 变化。

## 测试与边界

测试落点：

- `packages/logix-core/test/internal/StateTrait/RowId.UpdateGate.test.ts`
- `packages/logix-core/test/internal/StateTrait/RowId.NoTrackByGate.test.ts`
- `packages/logix-core/test/internal/StateTrait/StateTrait.NestedList.RowId.Stability.test.ts`

新增/调整重点：

1. no-trackBy nested dirty root 在 update gate 下应返回 `false`。
2. no-trackBy dirty root 命中 listPath 本身时应返回 `true`。
3. duplicated listConfigs + no-trackBy nested dirty root 的结果保持稳定且为 `false`。
4. no-trackBy 在 txn 证据未知且结构变化时，`canSkipNoTrackByListReconcile(...)` 仍为 `false`。
5. nested list rowId 在字段更新场景保持稳定。

## 验证摘要

执行命令：

```bash
pnpm -C packages/logix-core test -- test/internal/StateTrait/RowId.UpdateGate.test.ts test/internal/StateTrait/RowId.NoTrackByGate.test.ts test/internal/StateTrait/StateTrait.NestedList.RowId.Stability.test.ts
python3 fabfile.py probe_next_blocker --json
```

结果：

1. rowid/list 贴边测试：`3 files / 22 tests` 全部通过。
2. `probe_next_blocker`：返回 `blocked`，阻塞点是 `externalStore.ingest.tickNotify` 的 `full/off<=1.25` 阈值在 `watchers=256` 处超限（`first_fail_level=256`, `max_level=128`）。

## 母线集成补充（stage-closeout）

母线回收提交：

- `523eff72` `perf(rowid): tighten no-trackby commit-time updateAll gate`

集成后验证：

1. 语义守门
   - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-v4-perf-stage-closeout.rowid-validation.txt`
   - `4 files / 23 tests` 全部通过。
2. focused rowid perf
   - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-v4-perf-stage-closeout.rowid-perf.txt`
   - `ModuleRuntime.transaction.listConfigsGuard` 的 no-overlap fast path：
     - `legacy.p50=9.512ms`
     - `guarded.p50=0.065ms`
     - `speedup=147.00x`
   - `no-trackby-rowid-gate validate`：
     - `rows=100`：`p95 0.078ms -> 0.044ms`
     - `rows=300`：`p95 0.094ms -> 0.024ms`
     - `rows=1000`：`p95 0.246ms -> 0.081ms`
3. motherline probe
   - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-v4-perf-stage-closeout.probe-next-blocker.json`
     - 单次 captured run 为 `blocked`
     - blocker 仍是 `externalStore.ingest.tickNotify / full/off<=1.25`
   - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-v4-perf-stage-closeout.probe-r1.json`
   - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-v4-perf-stage-closeout.probe-r2.json`
   - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-v4-perf-stage-closeout.probe-r3.json`
     - 3 轮连续 `clear`

判定：

- `D-4` 自身目标路径证据成立，按 `accepted_with_evidence` 收口。
- current-head 的 residual gate 仍有 clear/blocked 摆动，继续归到 `externalStore` edge gate noise，不把它记成 D-4 回归。

## 本刀结论

- D-4 目标已实现：no-trackBy commit-time `updateAll` 触发面已按“结构变化证据明确”收紧。
- Top2 traversal plan cache 未改。
- focused rowid perf 与语义守门已补齐，当前按 `accepted_with_evidence` 计入正式吸收。
- `probe_next_blocker` 的 residual 摆动继续单独归到 `externalStore`，本刀不扩线处理无关 blocker。
