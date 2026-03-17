# 2026-03-20 · P2-1A continuation v3 re-validation

## 最终结论

- 结论：`merged_but_provisional`
- mergeToMain：否（本次仅 docs/evidence-only 收口）

## 结论依据

1. focused tests 已通过，`ModuleRuntime` continuation 相关核心不变量保持为绿：
   - `ModuleRuntime.TimeSlicing.Lanes`
   - `ModuleRuntime.TxnLanes.DefaultOn`
   - `TxnLaneEvidence.Schema`

2. `probe_next_blocker` 三轮结果为 `blocked -> blocked -> clear`，说明联合 gate 仍有摆动。
   - 两次 `blocked` 均命中 `externalStore.ingest.tickNotify` 的相对预算 `full/off<=1.25`
   - 一次 `clear` 时三条默认 probe suite 均通过

3. 本轮 probe 的阻塞形态与既有结论一致，归类为 residual gate noise，不构成新的 P2-1A blocker。
   - 既有口径参照：
     - `docs/perf/2026-03-19-current-probe-stability-v2.md`（`clear_unstable`）
     - `docs/perf/2026-03-19-externalstore-wave4-audit.md`（`edge_gate_noise`）
   - 本轮没有新增 continuation 代码改动，也没有出现新的 runtime core 路径退化证据

## 本次收口内容

- 仅保留 docs/evidence，不引入 runtime 代码变更
- 证据文件：
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1a-continuation-v3.evidence.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1a-continuation-v3.focused-tests.txt`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1a-continuation-v3.probe-next-blocker.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1a-continuation-v3.probe-next-blocker.r2.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1a-continuation-v3.probe-next-blocker.r3.json`

