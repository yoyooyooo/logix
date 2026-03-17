# 2026-03-16 · P0-2 第二刀：transaction HotSnapshot

## 目标

只做 `P0-2` 的下一小刀：

- 把普通 transaction 热路径里反复读取的 runtime 服务收成一份 `TxnHotSnapshot`
- 优先覆盖：
  - `runtimeLabel`
  - `diagnosticsLevel`
  - `debugSinks`
  - `overrides`
  - `resolvedTxnLanePolicy`
- 让普通 transaction 与 deferred worker 继续复用同一套热上下文思路

本刀明确不碰：

- `txnQueue`
- `operationRunner`
- `RuntimeStore`
- `TickScheduler`
- 对外 API

## RED

新增测试：

- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.HotSnapshot.test.ts`

在当前 `HEAD` 上先跑 RED：

```bash
pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.HotSnapshot.test.ts
```

失败原因：

- `diagnosticsLevel` 在 `ModuleRuntime.transaction.ts` 内被读取了 `2` 次，断言期望 `1` 次
- 失败点说明普通 transaction 在把 deferred backlog 交给 worker 之前，确实重复读取了热服务

## 实现

代码落点：

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`

实现点：

1. 新增 `captureTxnHotSnapshot(...)`
   - 在 transaction 入口一次性捕获 `runtimeLabel / diagnosticsLevel / debugSinks / overrides / resolvedTxnLanePolicy`
2. `runPostCommitPhases(...)` 改为直接消费 `TxnHotSnapshot`
   - 不再在 post-commit 分支里再次读取 `currentDebugSinks`
   - `diagnosticsLevel` 直接复用 snapshot
3. deferred backlog handoff 直接复用同一份 `TxnHotSnapshot`
   - 不再在 deferred capture 分支里二次读取 `runtimeLabel / diagnosticsLevel / debugSinks / overrides`
   - `resolvedTxnLanePolicy` 也随 snapshot 一起复用

## 验证

通过：

```bash
pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts test/internal/observability/TxnLaneEvidence.Schema.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.HotSnapshot.test.ts
pnpm -C packages/logix-core typecheck:test
```

结果：

- `ModuleRuntime.transaction.HotSnapshot`
  - RED 由 `2 -> 1` 收敛
- `ModuleRuntime.TimeSlicing.Lanes`
  - 通过
- `ModuleRuntime.TxnLanes.Overrides`
  - 通过
- `TxnLaneEvidence.Schema`
  - 通过
- `typecheck:test`
  - 通过

## targeted perf

新增 harness：

- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.HotSnapshot.Perf.off.test.ts`

测量口径：

- 指标：单次 `runWithStateTransaction(... set a)` 从开始到**返回**的时延
- `settle.*` 只用于排空 deferred flush，防止下一轮样本串扰
- `diagnostics=off`
- `deferred=128`
- `traitConvergeTimeSlicing.enabled=true`
- `txnLanes.enabled=true`
- `debounceMs=0`

命令：

```bash
pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.HotSnapshot.Perf.off.test.ts
```

before：

- 基线：`HEAD` clean export `b3323140993afe7c9d4ccae69415f92be8214973`
- `return.avg=0.637ms`
- `return.p50=0.571ms`
- `return.p95=0.989ms`
- `settle.avg=4.842ms`
- `settle.p50=4.616ms`
- `settle.p95=6.079ms`

after：

- 当前 worktree
- `return.avg=0.565ms`
- `return.p50=0.539ms`
- `return.p95=0.689ms`
- `settle.avg=5.049ms`
- `settle.p50=4.880ms`
- `settle.p95=5.932ms`

对比：

- `return.avg`: `0.637ms -> 0.565ms`，下降约 `11.3%`
- `return.p50`: `0.571ms -> 0.539ms`，下降约 `5.6%`
- `return.p95`: `0.989ms -> 0.689ms`，下降约 `30.3%`
- `settle.*` 基本持平，带少量抖动
  - 本刀没有改 deferred worker 执行环
  - `settle` 主要受 worker flush 摊销和调度抖动影响
  - 本刀接受与否以 `return.*` 为主

## 结论

裁决：

- `accepted_with_evidence`

理由：

1. RED 先失败，失败点直接命中 transaction 内部重复服务读取
2. 新测试转绿，确认 transaction 文件内的热服务读取从重复收成单次
3. 指定相关回归与 `typecheck:test` 全绿
4. targeted perf 在 transaction 返回时延上是稳定正向

## 下一步

若继续沿 `P0-2` 往下砍，优先级建议：

1. 把同类 snapshot 思路继续压到 `runOperation` 的空默认壳
2. 再判断是否值得把 `TxnHotSnapshot` 下沉成更通用的 transaction hot context
