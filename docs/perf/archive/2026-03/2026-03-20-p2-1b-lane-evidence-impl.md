# 2026-03-20 · P2-1B lane evidence implementation

## 最终结论

- 结论：`accepted_with_evidence`
- mergeToMain：是

## 本轮实现范围

- 目标：落实 continuation 下 `trace:txn-lane` / `replayEvent` 的 anchor + slice 双层语义，保持与 `P2-1A v5` 兼容。
- 保持约束：
  - 未回到 queue-side 微调。
  - 未修改 public API。
  - 未扩展到 preload / suspend。

## 代码改动

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
  - continuation 场景下写入 `origin.details.continuationSliceWindow`（`{start,end}`）。
  - 维持既有 `sliceStart/sliceEnd/sliceTotal` 字段，保证 v5 兼容。
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
  - `remapReplayEventForDeferredContinuation` 改为“必需字段齐备才重映射”。
  - continuation replay 结构补齐 `slice.seq`，并输出 `sliceWindow{start,end}`。
  - 保留 `kind/continuationId/sliceSeq` 字段以兼容既有消费方。
- `packages/logix-core/test/internal/observability/TxnLaneEvidence.Schema.test.ts`
  - 增加 continuation / no-continuation 回归断言，覆盖 replay continuation 语义与无 continuation 回归行为。

## 最小验证

1. focused tests：通过
   - 命令：
     - `pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts test/internal/observability/TxnLaneEvidence.Schema.test.ts`
   - 结果：`Test Files 2 passed`，`Tests 5 passed`
   - 证据：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1b-lane-evidence-impl.focused-tests.txt`

2. probe：通过
   - 命令：
     - `python3 fabfile.py probe_next_blocker --json`
   - 结果：`status=clear`，`blocker=null`，`executed=3`，`threshold_anomalies=[]`
   - 证据：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1b-lane-evidence-impl.probe-next-blocker.json`

## 本轮落盘

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `packages/logix-core/test/internal/observability/TxnLaneEvidence.Schema.test.ts`
- `docs/perf/archive/2026-03/2026-03-20-p2-1b-lane-evidence-impl.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1b-lane-evidence-impl.focused-tests.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1b-lane-evidence-impl.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1b-lane-evidence-impl.validation.json`
