# 2026-03-20 · P2-1 next-stage 接手收口（docs/evidence-only）

## 最终结论

- 结论：`discarded_or_pending`
- mergeToMain：否（仅 docs/evidence-only）
- accepted_with_evidence：`false`

## 接手背景

- worktree：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.p2-1-next-stage`
- branch：`agent/v4-perf-p2-1-next-stage`
- 接手时残留未提交改动：
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
  - `packages/logix-core/test/internal/observability/TxnLaneEvidence.Schema.test.ts`

## 对残留实现的裁决

残留改动仅包含：

1. continuation + `budgetMs<=1` 时把 `initialChunkSize` 从 `1` 调整到 `16`
2. 在 schema test 增加 `laneEvents.length < DEFERRED` 的断言

本轮判定不收代码，原因：

- 这两处改动没有给出可归因的硬收益证据链。
- 新断言无法单独证明性能收益，属于弱结构约束。
- `probe_next_blocker` 仍为 `blocked`，当前主 blocker 未被改善。

按失败门执行，已清掉上述半成品实现。

## 最小验证

1. focused tests：通过
   - 命令：
     - `pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts test/internal/observability/TxnLaneEvidence.Schema.test.ts`
   - 结果：`Test Files 3 passed`，`Tests 9 passed`
   - 证据：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1-next-stage.focused-tests.txt`

2. probe：阻塞
   - 命令：
     - `python3 fabfile.py probe_next_blocker --json`
   - 结果：`status=blocked`，`blocker=externalStore.ingest.tickNotify`，`budget=full/off<=1.25`
   - 证据：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1-next-stage.probe-next-blocker.json`

## 本轮落盘

- `docs/perf/archive/2026-03/2026-03-20-p2-1-next-stage-evidence-only.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1-next-stage.focused-tests.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1-next-stage.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1-next-stage.evidence.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1-next-stage.validation.json`
