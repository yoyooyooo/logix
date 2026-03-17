# 2026-03-19 · P2-1A deferred converge continuation v2（evidence-only）

## 裁决

- 结论：`hold`
- mergeToMain：否

不回母线原因（硬阻塞）：

- `packages/logix-react` 的 `vitest --project browser` 在导入阶段失败，`probe_next_blocker` 无法形成可复现的全链路 gate 证据。
- `packages/logix-core` 当前解析到 `effect@4`，core 单测在导入阶段失败（`FiberRef.unsafeMake` 缺失），无法复测本条断言。

## 范围

- 目标：验证 deferred converge flush 在开启 txn-lanes 的情况下，urgent txn 不应被 deferred flush 阻塞。
- 约束：不改 public API。
- 约束：本条仅保留 docs 与证据，不保留任何 runtime 代码改动。

## 保留证据

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-1a-continuation-v2.evidence.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-1a-continuation-v2.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-1a-continuation-v2.probe-next-blocker.r1.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-1a-continuation-v2.probe-next-blocker.r2.json`

## 复现命令（当前会失败）

core 断言复测：

```bash
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts \
  test/internal/observability/TxnLaneEvidence.Schema.test.ts
```

browser probe：

```bash
python3 fabfile.py probe_next_blocker --json
```

## 下一步条件

- 先把 `logix-react` browser suite 的 `effect` 导入故障清零，再补 targeted browser perf `collect` 并回到硬门裁决。
- core 侧恢复 `effect@3` 的解析一致性后，才能复测本条断言并决定是否回母线。
