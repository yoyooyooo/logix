# 2026-03-21 · React controlplane phase-machine Stage G4 trigger 评估与最小落地（executor 收敛）

## 结论类型

- `accepted_with_evidence`

## 目标与边界

唯一目标：在不改 public API、不触 `packages/logix-core/**` 的前提下，完成 Stage G4 的最小切口，让 `configLane ready` 的 executor 与其它 lane 保持同一口径。

边界：

- 不回到 `boot-epoch config singleflight`。
- 不回到 `owner-conflict` 小修补。
- 不改变 `neutral-settled-refresh-allowed` 的裁决语义。

## G4 trigger 评估（2026-03-21）

前提成立：

- Stage G3 已 `accepted_with_evidence`，三 lane 的 `OwnerLanePhaseContract` 归约层已成为稳定锚点。

税点证据（维护税）：

- phase-trace 里 `configLane ready` 仍需要单独断言 `executor === "legacy-control"`，该差异不再表达真实执行路径差异，只保留了口径分叉。

裁决：

- trigger 成立，允许以最小切口收敛 executor 口径。

## 最小实现切口

写入范围限定：

- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- `packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`

最小动作：

1. `configLane ready` 的 phase-machine 决策改为 `executor: "phase-machine"`。
2. phase-trace 更新断言锚点，要求 `configLane ready` 的 phase-machine 事件统一显示 `executor: "phase-machine"`。

## 最小验证命令与结果

- `pnpm --filter @logixjs/react typecheck:test`：passed
- `pnpm --filter @logixjs/react exec vitest run test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx --pool forks`：passed
- `python3 fabfile.py probe_next_blocker --json`：passed（`status=clear`）

证据落点（fresh worktree 复核）：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-react-controlplane-phase-machine-stage-g4-env-ready-v2.validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-react-controlplane-phase-machine-stage-g4-env-ready-v2.focused-tests.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-react-controlplane-phase-machine-stage-g4-env-ready-v2.probe-next-blocker.json`

## G5 边界

- 本轮不扩展 `configLane ready` 的触发条件与语义，仅收敛 executor 口径并补齐 evidence。
- 本轮不做 controlplane kernel 抽取与模块重排，后续若进入 Stage G5，按独立切口与证据闭环推进。
- 本轮不引入 public API proposal，不引入 `packages/logix-core/**` 改动。
