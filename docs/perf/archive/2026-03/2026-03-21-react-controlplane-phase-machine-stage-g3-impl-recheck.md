# 2026-03-21 · React controlplane phase-machine Stage G3 实施复核（env blocked）

## 结论类型

- `docs/perf`
- `docs/evidence-only`
- `implementation recheck`

## 目标与边界

唯一目标：基于 Stage G3 设计包，在不改 public API、不触 `packages/logix-core/**` 的前提下评估最小代码切口是否可落地并达成 `accepted_with_evidence`。

固定边界：

- 不重做失败切口：
  - `boot-epoch config singleflight`
  - `owner-conflict` 小修补
  - Stage A-F 回退
- 仅允许 write scope：
  - `packages/logix-react/src/internal/provider/**`
  - `packages/logix-react/test/RuntimeProvider/**`
  - `docs/perf/**`
  - `specs/103-effect-v4-forward-cutover/perf/**`

## 执行记录

最小验证命令：

1. `pnpm --filter @logixjs/react typecheck:test`
2. `pnpm --filter @logixjs/react exec vitest run test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx --pool forks`
3. `python3 fabfile.py probe_next_blocker --json`

结果：

- 命令 1：失败，`failure_kind=environment`（`tsc: command not found`）
- 命令 2：失败，`failure_kind=environment`（`vitest: command not found`）
- 命令 3：`status=blocked`，blocker `failure_kind=environment`（`node_modules` 缺失）

证据文件：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-react-controlplane-phase-machine-stage-g3-impl-recheck.react-controlplane-validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-react-controlplane-phase-machine-stage-g3-impl-recheck.probe-next-blocker.json`

## 裁决

- 本轮不保留代码改动。
- 原因：当前环境无法给出最小验证闭环，不能满足“若保留代码，必须 accepted_with_evidence”。
- 路由：`docs/evidence-only` 收口，等待环境可执行后再开 G3 实施线。

## G3 trigger / G4 boundary（当前有效口径）

`G3` trigger：

1. `probe_next_blocker` 至少一次给出可比结论（`clear`，或 `blocked` 且 `failure_kind` 非 `environment`）。
2. 出现跨 lane contract 漂移信号，或新增场景要求同时改多条 lane 决策链才能通过。
3. 仍处于“不改 public API”窗口。

`G4` boundary：

- 仅在 `G3 accepted_with_evidence` 后，才讨论 `configLane ready` executor 收敛。
- 若涉及 public API 变更，独立 proposal 分线，不与 G3 混线。
