# 2026-03-20 · React controlplane phase-machine Stage G1（owner-lane registry adapter）

## 结论类型

- `docs/perf`
- `stage-g1 implementation evidence`

## 目标与边界

本次唯一目标是落最小 `G1 owner-lane registry adapter` 切口：

- 把 `configLane/neutralLane` 的 token 生命周期统一挂到 owner-lane registry adapter。
- `preloadLane` 继续保留现有 executor，只桥接到同一 registry 载体。
- 保持边界约束不变：不改 public API，不触 `packages/logix-core/**`，不回到已失败的小切口。

## 实施摘要

### RuntimeProvider 收口

在 `packages/logix-react/src/internal/provider/RuntimeProvider.tsx` 落地：

- 新增共享 owner-lane registry entry，统一维护：
  - `latestToken`
  - `completedTokens`
  - `inFlight`
  - `retainedCancels`
  - `readiness`
- `configLane/neutralLane` 的 `inFlight/completed/latest` 迁到 registry adapter，保留 `configLane ready` 的 `legacy-control` executor 边界。
- `preloadLane` 改为读取同一 registry map，执行器与并发策略保持原逻辑，仅桥接 readiness 发布。
- `trace:react.runtime.controlplane.phase-machine` 与 `trace:react.runtime.config.snapshot` 为 `config/neutral` 补齐 `ownerKey` 字段，形成跨 lane 同源锚点。

### 测试增量

在 `runtime-bootresolve-phase-trace` 追加 Stage G1 断言：

- neutral lane 的 phase-machine 事件必须带 `ownerKey`，并与 shadow ownerKey 一致。
- config lane 的 boot phase-machine 事件必须带 `ownerKey`，并与 shadow ownerKey 一致。
- defer preload 场景下，neutral 与 preload lane 的 ownerId 必须一致，锁定跨 lane owner registry 口径。

## 变更文件

- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- `packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`
- `docs/perf/README.md`
- `docs/perf/2026-03-15-v4-perf-next-cut-candidates.md`
- `docs/perf/2026-03-19-identify-react-controlplane.md`
- `docs/perf/2026-03-20-react-controlplane-phase-machine.md`
- `docs/perf/archive/2026-03/2026-03-20-react-controlplane-phase-machine-stage-g1-owner-lane-registry-adapter.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-react-controlplane-phase-machine-stage-g1-owner-lane-registry-adapter.react-controlplane-validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-react-controlplane-phase-machine-stage-g1-owner-lane-registry-adapter.probe-next-blocker.json`

## 最小验证

1. `pnpm --filter @logixjs/react typecheck:test`：passed
2. `pnpm --filter @logixjs/react exec vitest run test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx --pool forks`：passed（`6 passed, 0 failed`）
3. `python3 fabfile.py probe_next_blocker --json`：passed（`status=clear`, `blocker=null`, `executed=3`）

## 证据判定

- 结果分类：`accepted_with_evidence`
- 判定依据：
  - G1 约束满足，`configLane ready` 的 executor 边界未漂移。
  - 跨 lane owner registry 一致性断言通过。
  - 最小验证命令全绿，`probe_next_blocker` 为 `clear`。
