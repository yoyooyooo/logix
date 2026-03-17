# 2026-03-20 · P1-3R accessor reuse（batched writeback 去重复 path parse）

## 范围与约束

- worktree: `v4-perf.p1-3r-accessor-reuse`
- branch: `agent/v4-perf-p1-3r-accessor-reuse`
- 唯一实现触点：`packages/logix-core/src/internal/state-trait/external-store.ts`
- 禁止切口：`draft primitive`、`large-batch-only`、`raw direct fallback`、任何 batch-size 分叉路径

本次仅执行 `docs/perf/archive/2026-03/2026-03-19-p1-3r-reopen-plan.md` 的唯一允许假设：
在 batched writeback 热路复用 producer 侧 accessor，移除重复 path parse。

## 实现

文件：`packages/logix-core/src/internal/state-trait/external-store.ts`

- batched read：`RowId.getAtPath(prevState, req.fieldPath)` 改为 `req.accessor.get(prevState)`
- batched write：`RowId.setAtPathMutating(draft, request.fieldPath, request.nextValue)` 改为 `request.accessor.set(draft, request.nextValue)`
- 保持不变：`txn.runWithStateTransaction(...)` 边界、`recordStatePatch(...)`、无 batch-size 分叉

## Evidence

- 代码层证据：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-3r-accessor-reuse.evidence.json`
  - batched 每个 changed request 的热路 parse 次数对比：
    - before: `2`（read 1 + write 1）
    - after: `0`
    - delta: `-2 / changed request`
- probe 原始输出：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-3r-accessor-reuse.probe-next-blocker.json`
- 语义门执行摘要：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-3r-accessor-reuse.validation.json`

## Validation

最小门禁命令：

1. `pnpm -C packages/logix-core exec vitest run test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts test/internal/Runtime/ModuleAsSource.tick.test.ts`
2. `python3 fabfile.py probe_next_blocker --json`

门禁结果明细见：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-3r-accessor-reuse.validation.json`

## 结论

- 分类：`accepted`
- 依据：
  - 改动面严格命中唯一假设与 write scope
  - 两条最小语义门禁与 `probe_next_blocker` 全绿
  - batched 热路的重复 path parse 在代码路径上已被删除，存在可对比的结构性正收益
