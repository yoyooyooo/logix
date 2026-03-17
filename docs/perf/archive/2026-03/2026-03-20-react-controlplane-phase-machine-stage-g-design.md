# 2026-03-20 · React controlplane phase-machine Stage G（owner registry / cancel / readiness 统一桥接设计）

## 结论类型

- `docs/perf`
- `docs/evidence-only`
- `implementation-ready design package`

## 目标与边界

本轮唯一目标是定义 Stage G 的最小可实施切口，优先方向是把 `configLane / neutralLane / preloadLane` 的 owner registry 与 cancel / readiness 统一到同一口径。

边界：

- 不改 public API。
- 不触 `packages/logix-core/**`。
- 不重做历史失败切口：
  - `boot-epoch config singleflight`
  - `owner-conflict` 小修补
  - Stage A-F 已收口的小切口

## Stage F 后的现状证据

代码现状（`RuntimeProvider.tsx`）：

- `configLane/neutralLane` 主状态仍是 `configResolveInFlightRef/configResolveCompletedRef/configResolveLatestTokenRef`。
- `preloadLane` 主状态已经是 `preloadLaneRegistryRef`，并带 `retainedCancels` 生命周期。
- `configLane ready` 仍以 `legacy-control` 执行边界输出原因码 `neutral-settled-refresh-allowed`。

测试现状（`runtime-bootresolve-phase-trace.test.tsx`）：

- 已覆盖 Stage A-F 的 lane 级事件断言。
- 还缺“跨三 lane 的 owner registry/cancel/readiness 同源断言”。

验证现状（本 worktree）：

- `python3 fabfile.py probe_next_blocker --json` 当前被环境阻塞（`node_modules` 缺失，`vitest: command not found`）。
- 结论是“此轮不做实现线”，先做 implementation-ready 设计包并落路由。

## Stage G 最小可实施切口

### 切口命名

- `G1 owner-lane registry adapter`

### 设计要点

1. 新增共享 owner-lane registry 适配层，只在 `RuntimeProvider` 内部使用。
2. `configLane/neutralLane` 把以下状态迁到适配层：
- latest token
- completed token set
- in-flight promise 与 cancel hook
- readiness 发布快照（config-ready / defer-ready）
3. `preloadLane` 本轮只接入统一适配层接口，保留现有 preload executor 与并发执行逻辑。
4. `configLane ready` 继续保留 `legacy-control` 执行器，避免 Stage G 与 executor 切换叠加成双变量。

### 非目标

- 不把 `configLane ready` executor 切到 phase-machine。
- 不改 preload 任务调度算法。
- 不引入新 public policy 字段。

## 实施路由

1. 先开 `G1` 实施线，修改范围限制在：
- `packages/logix-react/src/internal/provider/**`
- `packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`
2. 新增两类测试：
- 三 lane owner registry 一致性断言
- cancel boundary 触发后 readiness 发布一致性断言
3. 验证门固定为：
- `pnpm --filter @logixjs/react typecheck:test`
- `pnpm --filter @logixjs/react exec vitest run test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx --pool forks`
- `python3 fabfile.py probe_next_blocker --json`

## 本轮裁决

- 分类：`discarded_or_pending`（仅针对“直接实施 Stage G 代码”这件事）。
- 输出：`implementation-ready`。
- 路由：清晰，下一线唯一建议是 `G1 owner-lane registry adapter`。
