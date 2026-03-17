# 2026-03-20 · React controlplane phase-machine Stage C（configLane 最小授权切换）

## 结论类型

- `docs/perf`
- `stage-c implementation evidence`

## 目标与边界

本次只执行 Stage C 的最小实现：

- 只把 `configLane` 的一小段执行权切给 phase-machine。
- 仅接管 `configLane boot` 的执行裁决，`configLane ready` 继续保留 legacy-control 边界。
- 显式化 lane 间协作信号 `neutralSettled`，并输出可诊断原因码。
- 不改 public API，不重做 preload/suspend，不回到旧 singleflight 条件分支堆叠。

## 实施摘要

### RuntimeProvider 最小切换点

在 `packages/logix-react/src/internal/provider/RuntimeProvider.tsx` 内新增 `configLane` 的最小 phase-machine 决策：

- 新增 `decideConfigLanePhaseMachine(...)`，输入为 `phase + bootConfigOwnerLocked + neutralSettled`。
- `configLane boot`：由 phase-machine 裁决为 `run`，原因码 `config-boot-owner-lock`，executor 标记为 `phase-machine`。
- `configLane ready`：保持可控边界，默认仍走 `legacy-control` 执行器，原因码 `neutral-settled-refresh-allowed`。
- 补充 `neutralSettled` 显式字段，统一写入 `trace:react.runtime.controlplane.phase-machine` 事件，避免 lane 协作语义隐式漂移。
- `trace:react.runtime.controlplane.shadow` 的 `executor` 字段改为跟随实际决策结果，保证 configLane 与 neutralLane 行为都可解释。

### 测试最小增量

`runtime-bootresolve-phase-trace` 新增 config-bearing 用例，验证：

- `runtime.layer-bound + config + boot` 的 async snapshot 仍为 1 次。
- `configLane boot` 的 `request-start` 事件 `executor=phase-machine`。
- 存在 `trace:react.runtime.controlplane.phase-machine` 的 configLane boot 事件，原因码为 `config-boot-owner-lock`。
- 若出现 configLane ready 事件，其 executor 必须保持 `legacy-control`。
- shadow invariant 维持 0。

## 变更文件

- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- `packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`
- `docs/perf/archive/2026-03/2026-03-20-react-controlplane-phase-machine-stage-c.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-react-controlplane-phase-machine-stage-c.react-controlplane-validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-react-controlplane-phase-machine-stage-c.probe-next-blocker.json`

## 最小验证

1. `pnpm --filter @logixjs/react typecheck:test`：passed
2. `pnpm --filter @logixjs/react exec vitest run test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx --pool forks`：passed（`3 passed, 0 failed`）
3. `python3 fabfile.py probe_next_blocker --json`：passed（`status=clear`, `blocker=null`, `executed=3`）

## 结论

Stage C 的最小授权切口已落地：`configLane boot` 已切到 phase-machine，`configLane ready` 仍保持 legacy-control 控制边界。当前证据下未新增 blocker，行为可解释链路保持完整。
