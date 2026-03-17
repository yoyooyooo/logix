# 2026-03-20 · P2-1A continuation v4 re-validation

## 最终结论

- 结论：`docs_only_veto`
- mergeToMain：否（本轮仅 docs/evidence-only 否决）

## 结论依据

1. 最小验证命令中的 focused tests 未全部通过，失败门触发。
   - 命令：
     - `pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts test/internal/observability/TxnLaneEvidence.Schema.test.ts`
   - 结果：`3 files` 中 `1 failed | 2 passed`，失败点是 `TxnLaneEvidence.Schema`。
   - 失败信息：`TxnLaneEvidence.policy: unknown key "effective"`。

2. `probe_next_blocker` 本轮为 `clear`，但无法抵消 focused tests 失败。
   - 命令：`python3 fabfile.py probe_next_blocker --json`
   - 结果：`status=clear`，`blocker=null`，三条默认 probe suite 全通过。

3. 根据本轮门禁约束，任一条件不稳即直接 docs-only。
   - 当前不满足“focused 证据硬且 probe 闭环成立”的联合成功门。
   - 因此本轮执行 `B`，否决继续推进 `P2-1A` 实现线。

## 本次收口内容

- 不修改 `ModuleRuntime.impl.ts`，不扩大 continuation 实现面。
- 不回到 queue-side 微调，不改 public API。
- 仅落盘 docs/evidence：
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1a-continuation-v4.focused-tests.txt`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1a-continuation-v4.probe-next-blocker.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1a-continuation-v4.evidence.json`
