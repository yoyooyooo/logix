# 2026-03-20 · React controlplane phase-machine Stage G3（owner-lane phase contract normalization）

## 结论类型

- `docs/perf`
- `docs/evidence-only`
- `implementation-ready design package`

## 目标与边界

唯一目标：在 `G2` 之后继续统一 owner-lane 语义，定位到“phase-machine contract 层”的最小切口，不触 public API。

边界：

- 不改 public API。
- 不触 `packages/logix-core/**`。
- 不重做失败切口：
  - `boot-epoch config singleflight`
  - `owner-conflict` 小修补
  - Stage A-F 回退

## G2 后的剩余分叉（证据）

从 `RuntimeProvider.tsx` 可见，`owner-lane registry/cancelBoundary` 已统一，但 phase-machine 语义仍分散在三条 lane 决策链：

- `decideNeutralLanePhaseMachine`
- `decideConfigLanePhaseMachine`
- `decidePreloadLanePhaseMachine`

分叉点在于：

1. 三 lane 事件都输出到 `trace:react.runtime.controlplane.phase-machine`，但 contract 字段由两段执行路径拼装，维护成本继续增长。
2. `configLane ready` 仍是 `legacy-control` executor，当前可以保留，仍缺“与 neutral/preload 共用同一 contract 归约层”的内部锚点。
3. 现有测试覆盖了 ownerKey/cancelBoundary 的关键路径，缺“同 owner-lane contract 一致性”的统一断言组。

## Stage G3 最小可实施切口

切口命名：`G3 owner-lane phase contract normalization`

实现范围（仅内部）：

- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- `packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`

最小动作：

1. 在 `RuntimeProvider` 内引入统一的 owner-lane phase contract 归约层，收敛三 lane 共享字段：
   - `ownerKey/lane/phase/action/reason/executor/cancelBoundary`
2. 保持现有行为不变，只把 contract 组装逻辑集中，避免 lane-specific 拼接分散。
3. 在 phase-trace 增加 contract 一致性断言，覆盖：
   - `config ready`
   - `neutral ready`
   - `preload reuse-inflight`

非目标：

- 不切换 `configLane ready` executor。
- 不调整 preload 调度算法。
- 不新增 policy 字段或 public API。

## 触发器与 G4 边界

`G3` 触发器：

1. `probe_next_blocker` 可运行并给出可比结论（`clear`，或 `blocked` 且 `failure_kind` 非 `environment`）。
2. 出现跨 lane contract 漂移信号，或新增场景要求同时改多条 lane 决策链才可通过。
3. 仍在“不改 public API”的窗口内。

`G4` 边界：

- `G4` 才讨论 executor 收敛，例如 `configLane ready` 从 `legacy-control` 过渡到 phase-machine。
- `G4` 入场前提：
  - `G3` 已 `accepted_with_evidence`
  - 有独立收益证据证明 executor 双轨仍是主要税点
- 若 `G4` 触及 public API，转入独立 proposal 线。

## 本 worktree 验证与裁决

最小验证命令：

- `python3 fabfile.py probe_next_blocker --json`

结果：

- `status=blocked`
- `failure_kind=environment`
- 原因：`node_modules` 缺失，`vitest: command not found`

本轮裁决：

- 分类：`discarded_or_pending`（仅针对“当前 worktree 直接实施 G3 代码”）。
- 输出：`implementation-ready`（可开下线的最小切口、trigger、G4 边界已固化）。
- 路由：当前保持 `docs/evidence-only`，等待触发器满足后再实施。
