# 2026-03-20 · P2-1A continuation v5 re-validation

## 最终结论

- 结论：`accepted_with_evidence`
- mergeToMain：是

## v5 最小硬实现

- 实现文件：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- 切口内容：
  - 在 lane evidence 写出路径新增 `toTxnLaneEvidencePolicy(...)`。
  - `policy` 的可枚举字段改为 schema 接受的平铺口径：`enabled/configScope/budgetMs/debounceMs/maxLagMs/allowCoalesce`，并保留 `overrideMode/yieldStrategy/queueMode`。
  - `effective/explain/fingerprint` 保留为不可枚举属性，继续满足 `DefaultOn` 用例对 v2 字段的读取断言。
- 约束达成：
  - 未扩大 continuation 实现面。
  - 未回到 queue-side 微调。
  - 未改 public API。

## 验证结果

1. focused tests：通过
   - 命令：
     - `pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts test/internal/observability/TxnLaneEvidence.Schema.test.ts`
   - 结果：`3 passed`，`7 passed`
   - 证据：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1a-continuation-v5.focused-tests.txt`

2. probe 闭环：通过
   - 命令：`python3 fabfile.py probe_next_blocker --json`
   - 结果：`status=clear`，`blocker=null`，`executed=3`，`threshold_anomalies=[]`
   - 证据：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1a-continuation-v5.probe-next-blocker.json`

## 本轮落盘

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- `docs/perf/archive/2026-03/2026-03-20-p2-1a-continuation-v5.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1a-continuation-v5.focused-tests.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1a-continuation-v5.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1a-continuation-v5.evidence.json`
