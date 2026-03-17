# 2026-03-21 · React controlplane phase-machine Stage G5 kernel v0（stranded recovery，后续已升级）

## 结论

- 结果类型：`docs/perf`
- 初次分类：`merged_but_provisional`
- 当前分类：`accepted_with_evidence`
- 后续更新：同日独立 worktree 复验全绿，升级记录见 `docs/perf/2026-03-21-react-controlplane-phase-machine-stage-g5-kernel-v0-evidence.md`。

## 恢复背景

- 母线工作区直接出现以下实现残留：
  - `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
  - `packages/logix-react/src/internal/provider/ControlplaneKernel.ts`
  - `packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`
- 该实现对应 `G5 controlplane kernel v0 (neutral-settle no-refresh)`：
  - 在 `neutral settle` 发生后，对同 `ownerKey` 的 `configLane ready` refresh 做 fingerprint 去重
  - 用 `ticket` 守住 async confirm 的回写有效性

## 初次恢复验证（历史留档）

执行命令：

```bash
pnpm --filter @logixjs/react typecheck:test
pnpm --filter @logixjs/react exec vitest run test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx --pool forks
python3 fabfile.py probe_next_blocker --json
```

结果：

1. `typecheck:test`：通过
   - 工件：`specs/103-effect-v4-forward-cutover/perf/2026-03-21-react-controlplane-stage-g5-kernel-v0.validation.typecheck.txt`
2. `runtime-bootresolve-phase-trace`：通过（`7 passed`）
   - 工件：`specs/103-effect-v4-forward-cutover/perf/2026-03-21-react-controlplane-stage-g5-kernel-v0.validation.vitest.txt`
3. `probe_next_blocker --json`：当时记录为 `blocked`
   - 工件：`specs/103-effect-v4-forward-cutover/perf/2026-03-21-react-controlplane-stage-g5-kernel-v0.probe-next-blocker.json`

## 初次裁决（历史留档）

- 本实现的 React 层局部正确性已被最小测试证明。
- 当时 `probe_next_blocker` 未给出 `clear`，因此先不计入正式 `accepted_with_evidence` 清单。
- 为了保持母线 clean，本轮采用 stranded recovery 方式记录并保留实现。

## 后续复验与升级

独立 worktree（`agent/v4-perf-react-controlplane-stage-g5-evidence`）补齐同口径复验后，以下条件全部满足：

1. 同口径 React 最小验证继续全绿。
2. `python3 fabfile.py probe_next_blocker --json` 给出 `status=clear`，`threshold_anomalies=[]`。

升级工件：

- `docs/perf/2026-03-21-react-controlplane-phase-machine-stage-g5-kernel-v0-evidence.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-react-controlplane-stage-g5-kernel-v0-evidence.summary.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-react-controlplane-stage-g5-kernel-v0-evidence.evidence.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-react-controlplane-stage-g5-kernel-v0-evidence.validation.typecheck.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-react-controlplane-stage-g5-kernel-v0-evidence.validation.vitest.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-react-controlplane-stage-g5-kernel-v0-evidence.probe-next-blocker.json`
