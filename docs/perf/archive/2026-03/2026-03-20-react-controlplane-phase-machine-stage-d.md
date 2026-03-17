# 2026-03-20 · React controlplane phase-machine Stage D（preload/suspend 最小协同接线）

## 结论类型

- `docs/perf`
- `stage-d implementation evidence`

## 目标与边界

本次只执行 Stage D 的最小实现：

- 把 `preload/suspend` 的一小段调度裁决纳入 phase-machine。
- 保持 preload 执行器和现有 defer/suspend 行为语义不变，只做最小接线与可诊断化。
- 不改 public API，不扩展到全控制面重排，不回到旧 singleflight 切口。

## 实施摘要

### RuntimeProvider 最小接线

在 `packages/logix-react/src/internal/provider/RuntimeProvider.tsx` 落地 preload lane 的最小裁决函数：

- 新增 `decidePreloadLanePhaseMachine(...)`，统一表达 preload lane 的 `run/skip + reason`。
- 将原 defer preload effect 中分散的条件分支收敛为 phase-machine 决策消费。
- 对 `policy.mode=suspend` 明确输出 `skip` 原因码 `policy-mode-preload-disabled`，把 suspend 与 preload 的协同边界显式化。
- 对 `policy.mode=defer` 仅在可运行窗口输出 `run` 原因码 `defer-preload-dispatch`，执行器仍使用既有 preload 流程。
- 在 `trace:react.runtime.controlplane.phase-machine` 追加 `lane=preload` 事件，附带 `policyMode/preloadPlanCount/layerReady/configReady/syncWarmPreloadReady`。

### 测试最小增量

`runtime-bootresolve-phase-trace` 追加 Stage D 断言：

- `suspend` 下存在 preload lane phase-machine `skip` 事件，原因码为 `policy-mode-preload-disabled`。
- `defer + async preload handle` 下存在 preload lane phase-machine `run` 事件，原因码为 `defer-preload-dispatch`。
- 对应 `trace:react.module.preload` 事件可观测，确认执行仍由既有 preload 执行器承担。

## 变更文件

- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- `packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`
- `docs/perf/archive/2026-03/2026-03-20-react-controlplane-phase-machine-stage-d.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-react-controlplane-phase-machine-stage-d.react-controlplane-validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-react-controlplane-phase-machine-stage-d.probe-next-blocker.json`

## 最小验证

1. `pnpm --filter @logixjs/react typecheck:test`：passed
2. `pnpm --filter @logixjs/react exec vitest run test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx --pool forks`：passed（`5 passed, 0 failed`）
3. `python3 fabfile.py probe_next_blocker --json`：passed（`status=clear`, `blocker=null`, `executed=3`）

## 结论

Stage D 最小切口已落地：preload/suspend 协同裁决已进入 phase-machine，preload 执行器边界保持可控且未扩大改造面。
