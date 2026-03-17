# 2026-03-20 · React controlplane phase-machine Stage G2（cancel boundary isomorphic merge）

## 结论类型

- `docs/perf`
- `stage-g2 implementation evidence`

## 目标与边界

本次唯一目标是把 preload `retainedCancels` 与 config/neutral cancel boundary 做同构合并：

- 不改 public API。
- 不触 `packages/logix-core/**`。
- 不重做历史失败切口：
  - `boot-epoch config singleflight`
  - `owner-conflict` 小修补
  - Stage A-F 小切口回退

## 实施摘要

### RuntimeProvider 收口

在 `packages/logix-react/src/internal/provider/RuntimeProvider.tsx` 落地：

- 新增 `OwnerLaneCancelBoundary`，统一承载 cancel 回调与取消状态。
- `config/neutral` 的 async resolve 改为复用 owner-lane boundary 生命周期：
  - token mismatch 前置 cancel
  - stale drop 支持 `owner-lane-cancelled` 原因
  - boundary 生命周期结束后清理 retained 引用
- preload 保留原有 executor 与并发策略，只把 retained holder release 改成复用同一 boundary helper。
- `trace:react.runtime.controlplane.phase-machine` 为三 lane 统一输出 `cancelBoundary: "owner-lane"`。

### 测试增量

在 `runtime-bootresolve-phase-trace` 追加 G2 断言：

- neutral/config/preload 的 phase-machine 事件都带 `cancelBoundary: owner-lane`。
- preload `reuse-inflight` 事件同样落在统一 boundary 字段。

## 变更文件

- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- `packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`
- `docs/perf/README.md`
- `docs/perf/2026-03-15-v4-perf-next-cut-candidates.md`
- `docs/perf/2026-03-19-identify-react-controlplane.md`
- `docs/perf/2026-03-20-react-controlplane-phase-machine.md`
- `docs/perf/archive/2026-03/2026-03-20-react-controlplane-phase-machine-stage-g2-cancel-boundary-isomorphic.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-react-controlplane-phase-machine-stage-g2-cancel-boundary-isomorphic.react-controlplane-validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-react-controlplane-phase-machine-stage-g2-cancel-boundary-isomorphic.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-react-controlplane-phase-machine-stage-g2-cancel-boundary-isomorphic.summary.md`

## 最小验证

1. `pnpm --filter @logixjs/react typecheck:test`：passed
2. `pnpm --filter @logixjs/react exec vitest run test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx --pool forks`：passed（`6 passed, 0 failed`）
3. `python3 fabfile.py probe_next_blocker --json`：passed（`status=clear`, `blocker=null`, `executed=3`）

## 证据判定

- 结果分类：`accepted_with_evidence`
- 判定依据：
  - G2 仅在 provider 内部完成 cancel boundary 同构合并，executor 边界与 public API 均保持不变。
  - phase-trace 断言覆盖三 lane，同构字段稳定可观测。
  - 最小验证命令全绿，`probe_next_blocker` 最终复核为 `clear`。
