# 2026-03-20 · React controlplane phase-machine Stage B（neutralLane 最小行为切换）

## 结论类型

- `docs/perf`
- `stage-b implementation evidence`

## 目标与边界

本次只执行 Stage B 的最小行为切换：

- 仅切 `neutralLane` 的 phase-machine 执行权。
- `configLane` 保持原有执行路径与行为语义。
- 不改 public API，不重做旧 singleflight 切口，不把 configLane 一并切走。

## 实施摘要

### RuntimeProvider 切换点

在 `packages/logix-react/src/internal/provider/RuntimeProvider.tsx` 内新增最小 neutralLane phase-machine 决策 helper：

- `decideNeutralLanePhaseMachine(...)` 统一裁决 neutralLane `boot-confirm / ready-confirm`。
- async confirm 主 `useEffect` 中，先判定 `configLane` 旧路径条件。
- 命中 `configLane` 时继续走旧裁决分支，未改真实行为。
- 未命中时进入 neutralLane phase-machine 分支，生成 neutral token 并执行已有 async resolve executor。
- 追加 `trace:react.runtime.controlplane.phase-machine` 诊断事件，仅用于 neutralLane 可观察性。
- 影子 trace 事件 `trace:react.runtime.controlplane.shadow` 在 neutralLane 请求事件中补充 `executor: "phase-machine"` 标记。

### 测试最小增量

`runtime-bootresolve-phase-trace` 追加 neutralLane 断言，覆盖两件事：

- neutralLane `request-start` 事件标记为 `executor=phase-machine`。
- 存在 neutralLane 的 `trace:react.runtime.controlplane.phase-machine` `action=run` 事件。

并保持：

- 不出现 `runtime.layer-bound` async snapshot（env-only 用例）。
- shadow invariant 事件计数维持 0。

## 变更文件

- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- `packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`
- `docs/perf/archive/2026-03/2026-03-20-react-controlplane-phase-machine-stage-b.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-react-controlplane-phase-machine-stage-b.react-controlplane-validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-react-controlplane-phase-machine-stage-b.probe-next-blocker.json`

## 最小验证

1. `pnpm --filter @logixjs/react typecheck:test`：passed  
2. `pnpm --filter @logixjs/react exec vitest run test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx --pool forks`：passed（`2 passed, 0 failed`）  
3. `python3 fabfile.py probe_next_blocker --json`：passed（`status=clear`, `blocker=null`, `executed=3`）

## 结论

Stage B 的 neutralLane 最小行为切换已落地，configLane 未发生执行路径改造。当前证据下未新增 blocker。
