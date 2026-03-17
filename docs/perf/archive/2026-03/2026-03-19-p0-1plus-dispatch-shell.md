# 2026-03-19 · P0-1+ dispatch/txn outer-shell residual cut

## 本刀范围

- 目标：继续压 `dispatch -> enqueueTransaction` 外层组合壳税。
- 不触碰方向：
  - state write
  - React controlplane
  - selector-process
- 代码改动仅在：
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`

## 改动点

在 `ModuleRuntime.impl.ts` 的 `enqueueTransaction` 包装层新增“无 post-commit 观察者时的直通快路径”：

1. 新增 `shouldCaptureTickSchedulerAtEnqueue()`：
- 仅在 `selectorGraph.hasAnyEntries()` 或 `runtimeStore` 已有模块订阅者时，才需要在 enqueue 外层做 TickScheduler 捕获。

2. 调整 `enqueueTransaction` 包装：
- `tickSchedulerCached` 已存在，或当前没有 post-commit 观察者时，直接委托 `enqueueTransactionBase`。
- 只有需要捕获 TickScheduler 的场景，才进入 `Effect.gen` 做 env/root lookup。

结果是把“每次 dispatch 都进一层 enqueue 外壳查找”的固定税，从无观察者主路径上移除。

## 贴边证据

### dispatch shell micro-bench（同命令、同机、同参数）

命令：

```bash
pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts
```

before（改动前）：

- `dispatch.p50=0.107ms`
- `dispatch.p95=0.268ms`
- `residual.avg=0.086ms`
- `bodyShell.avg=0.025ms`

after（改动后，2026-03-19 10:22 +08:00 复测）：

- `dispatch.p50=0.086ms`
- `dispatch.p95=0.154ms`
- `residual.avg=0.063ms`
- `bodyShell.avg=0.016ms`

delta（after - before）：

- `dispatch.p50: -0.021ms`
- `dispatch.p95: -0.114ms`
- `residual.avg: -0.023ms`
- `bodyShell.avg: -0.009ms`

证据文件：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p0-1plus-dispatch-shell.before.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p0-1plus-dispatch-shell.after.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p0-1plus-dispatch-shell.diff.json`

### 当前 probe 队列

命令：

```bash
python3 fabfile.py probe_next_blocker --json
```

当前可复现状态（2026-03-19 10:22 +08:00 复测）：`clear`（命令返回码 `0`）。

同日同分支早一轮（2026-03-19 10:18 +08:00）曾出现一次 threshold 阻塞：

- suite: `externalStore.ingest.tickNotify`
- gate: `残余复核门`
- failure kind: `threshold`
- budget: `full/off<=1.25`
- `first_fail_level=256`
- `max_level=128`

结论：当前口径为 clear，但该阈值门存在边界抖动历史，需要在回母线后继续观察。

## 最小验证

已执行并通过：

```bash
pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts
pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts
pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.postCommitSlim.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.onCommitSchedulerEnvelope.test.ts
pnpm -C packages/logix-core typecheck:test
```

已执行，状态为 blocked（阈值门拦截）：

```bash
python3 fabfile.py probe_next_blocker --json
```

已执行并 clear（最新）：

```bash
python3 fabfile.py probe_next_blocker --json
```

## 裁决

- 分类：`accepted_with_evidence_probe_clear`
- 原因：贴边指标（`dispatch.p95` 与 `residual.avg`）同步下降，代码收益成立；最新 probe 队列为 clear，同时保留同日一次 externalStore threshold 阻塞记录以供后续稳定性跟踪。
