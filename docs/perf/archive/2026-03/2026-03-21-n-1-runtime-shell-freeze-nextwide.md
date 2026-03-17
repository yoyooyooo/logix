# 2026-03-21 · N-1 runtime-shell.freeze nextwide（docs/evidence-only，实现已回滚）

## 结论类型

- `docs/perf`
- `docs/evidence-only`
- `implementation rollback`

## 任务目标与边界

- worktree：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.runtime-shell-freeze-nextwide`
- branch：`agent/v4-perf-runtime-shell-freeze-nextwide`
- 唯一目标：实施 `N-1 runtime-shell.freeze` 最小切口，优先迁出 resolver 壳税并收紧 `resolve-shell noSnapshot` 适用边界。
- 约束：
  - 不改 public API
  - 禁区不触碰：`packages/logix-react/**`、`StateTransaction.ts`、`RuntimeStore.ts`、`TickScheduler.ts`
  - 若无新增硬收益，必须回滚实现并按 docs/evidence-only 收口

## 实施试探与对照

本轮先完成一版实现试探，再做同机同命令对照：

- 试探实现 run（已回滚）：
  - `resolve-shell`：`noSnapshot.avg=0.784ms`，`snapshot.avg=0.280ms`
  - `dispatch-shell`：`dispatch.p95=0.277ms`，`residual.avg=0.079ms`
  - `operationRunner txn-hot-context`：`batch256 speedup=1.623x`，`batch1024 speedup=1.611x`
- 基线 run（同机、同命令、`v4-perf@1f53693f`）：
  - `resolve-shell`：`noSnapshot.avg=0.634ms`，`snapshot.avg=0.259ms`
  - `dispatch-shell`：`dispatch.p95=0.193ms`，`residual.avg=0.073ms`
  - `operationRunner txn-hot-context`：`batch256 speedup=1.855x`，`batch1024 speedup=1.612x`

对照结论：

- `resolve-shell noSnapshot` 与 `snapshot` 均未改善，且绝对耗时上升。
- `dispatch.p95` 与 `residual.avg` 发生回退。
- `operationRunner` 在 `batch=256` 出现明显回退，`batch=1024` 基本持平。
- 不满足“新增硬收益 + dispatch/residual 不恶化”的成功门。

## 回滚与最终验证

已执行实现回滚，代码文件恢复到基线，仅保留证据文档。

最终最小验证命令：

```bash
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.RuntimeSnapshot.ResolveShell.Perf.off.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.TransactionHotContext.Perf.off.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts
python3 fabfile.py probe_next_blocker --json
```

结果：

- typecheck：通过
- vitest：`Test Files 4 passed`，`Tests 4 passed`
- probe：`status=clear`，`threshold_anomalies=0`

## 证据文件

- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-n-1-runtime-shell-freeze-nextwide.validation.typecheck.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-n-1-runtime-shell-freeze-nextwide.validation.vitest.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-n-1-runtime-shell-freeze-nextwide.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-n-1-runtime-shell-freeze-nextwide.validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-n-1-runtime-shell-freeze-nextwide.evidence.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-n-1-runtime-shell-freeze-nextwide.summary.md`

## 裁决

- 结果分类：`docs/evidence-only`
- `accepted_with_evidence`：`false`
- 代码改动：`none`（实现试探已回滚）
