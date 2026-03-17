# 2026-03-20 · React controlplane phase-machine Stage F（preload owner registry / cancel boundary）

## 结论类型

- `docs/perf`
- `stage-f implementation evidence`

## 目标与边界

本次在 Stage E 基线上继续收口 preload lane：

- 把 preload lane 的运行态从分散 ref 合并到共享 owner registry。
- 把 preload lane 的取消路径统一到共享 cancel boundary，减少 lane-specific 分叉。
- 保持边界约束不变：不改 public API，不改 `packages/logix-core/**`。

## 实施摘要

### RuntimeProvider 收口

在 `packages/logix-react/src/internal/provider/RuntimeProvider.tsx` 落地：

- 新增按 `ownerKey` 索引的 preload registry entry，统一维护：
  - `latestToken`
  - `completedTokens`
  - `inFlight`
  - `retainedCancels`
- 新增共享 cancel helper，统一处理：
  - unmount cleanup
  - token mismatch cleanup
  - defer ready 后的 holder release
- preload lane `phase-machine` trace 追加 `ownerKey` 字段，保证 owner 语义链路可解释。

### 测试增量

在 `runtime-bootresolve-phase-trace` 追加 Stage F 断言：

- preload lane `run/skip` 事件都带 `ownerKey`。
- in-flight rerender 场景中，preload lane 事件保持单一 `ownerKey` 且符合 `runtime.base:preload`。

## 变更文件

- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- `packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`
- `docs/perf/2026-03-20-react-controlplane-phase-machine.md`
- `docs/perf/2026-03-19-identify-react-controlplane.md`
- `docs/perf/archive/2026-03/2026-03-20-react-controlplane-phase-machine-stage-f.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-react-controlplane-phase-machine-stage-f.react-controlplane-validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-react-controlplane-phase-machine-stage-f.probe-next-blocker.json`

## 最小验证

1. `pnpm --filter @logixjs/react typecheck:test`：passed
2. `pnpm --filter @logixjs/react exec vitest run test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx --pool forks`：passed（`6 passed, 0 failed`）
3. `python3 fabfile.py probe_next_blocker --json`：passed（`status=clear`, `blocker=null`, `executed=3`）

## 证据判定

- 结果分类：`accepted_with_evidence`
- 判定依据：
  - Stage E 的 preload dispatch/reuse 行为保持稳定。
  - preload lane 已收口到共享 owner registry/cancel boundary，控制面可解释性提升且未出现验证回归。
