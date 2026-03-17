# 2026-03-19 · P0-2+ hot context / snapshot 再下沉

## 本刀范围

- 目标：延续 `P0-2` 路径，把 transaction/operation hot context 再下沉一层，压 `dispatch -> runWithStateTransaction` 外层组合壳与 runtime 服务读取税。
- 不触碰方向：
  - state write fallback
  - selector/process
  - React controlplane
  - `ModuleRuntime.dispatch.ts`
- 代码改动仅在：
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.operation.ts`
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.traitConvergeConfig.ts`

## 改动点

1. transaction 入口合并捕获
- 新增 `captureTxnEntryHotContext(...)`，把 `TxnHotSnapshot` 与 `operationRuntimeServices` 合并在同一入口捕获。
- transaction active context 附带 `operationRuntimeHotContext`，供 operation runner 直接复用。

2. operation runner 复用热上下文
- 新增 `OperationRuntimeHotContext` 和 `captureOperationRuntimeHotContext(...)`，用 `WeakMap` 缓存同一 `OperationRuntimeServices` 的 fast-path 判定与 `opSeq` 分配器。
- `makeRunOperation(...)` 优先读取 transaction 上的 `operationRuntimeHotContext`，减少每次 operation 的动态拼装壳。

3. lane/converge resolver 缓存
- `makeResolveTxnLanePolicy(...)` 与 `makeResolveTraitConvergeConfig(...)` 新增 patch 指纹缓存。
- 语义优先级维持原样：`provider > runtime_module > runtime_default > builtin`，本刀只减少重复归一化与合成成本。

## blocking bug 修复（事务复用 hot context 泄漏）

- 现象：复用同一个 `txnContext` 连续调用 `beginTransaction` 两次时，第二个事务在未显式设置运行时服务的情况下，仍可能继承上个事务留下的 `operationRuntimeHotContext / operationRuntimeServices`，导致 `RunSession` 与 `opSeq allocator` 泄漏。
- 根因：`StateTransaction.beginTransaction` 复用 `ctx.scratch` 时会重置声明字段，但不会清理 transaction 期间挂在 scratch 上的运行时热字段。
- 修复：在 `beginTransaction` 中显式清理
  - `operationRuntimeServices`
  - `operationRuntimeHotContext`
- 回归测试：新增 `ModuleRuntime.operationRunner.FastPath.test.ts` 用例，覆盖“复用 txnContext 连续 beginTransaction 两次”路径，断言第二个事务不会继承第一个事务的 `opSeq` 分配能力。

## 贴边证据

### dispatch shell phase perf（同命令、同口径）

命令：

```bash
pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts
```

before（取自 `2026-03-19-p0-1plus-dispatch-shell.after.json`）：

- `dispatch.p50=0.086ms`
- `dispatch.p95=0.154ms`
- `txnPrelude.avg=0.011ms`
- `residual.avg=0.063ms`

after（本次，2026-03-19 11:04 +08:00）：

- `dispatch.p50=0.079ms`
- `dispatch.p95=0.132ms`
- `txnPrelude.avg=0.009ms`
- `residual.avg=0.060ms`

delta（after - before）：

- `dispatch.p50: -0.007ms`
- `dispatch.p95: -0.022ms`
- `txnPrelude.avg: -0.002ms`
- `residual.avg: -0.003ms`

### operation hot-context microbench（同次验证）

命令：

```bash
pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.TransactionHotContext.Perf.off.test.ts --testTimeout=20000
```

结果：

- `batch=256`: `shared.avg=0.745ms`, `fallback.avg=1.107ms`, `speedup=1.486x`, `saved=32.71%`
- `batch=1024`: `shared.avg=2.729ms`, `fallback.avg=4.056ms`, `speedup=1.486x`, `saved=32.71%`

证据文件：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p0-2plus-hot-context.before.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p0-2plus-hot-context.after.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p0-2plus-hot-context.diff.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p0-2plus-hot-context.probe-next-blocker.json`

## 最小验证

已执行并通过：

```bash
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.FastPath.test.ts \
  --testTimeout=20000
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.HotSnapshot.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.FastPath.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.TransactionHotContext.Perf.off.test.ts \
  --testTimeout=20000
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts
python3 fabfile.py probe_next_blocker --json
```

probe 结果：

- 当前 `status=clear`
- 三个 gate 均 `passed`
- `threshold_anomaly_count=0`

## 裁决

- 分类：`accepted_with_evidence_probe_clear`
- 原因：dispatch shell 外层关键指标继续下降，transaction/operation 热上下文路径保持正向，current probe 队列 clear。
