# 2026-03-11 · dispatch-shell 固定税探针

## 目标

用最小 browser perf suite 把 `converge` 规模因素剥离，直接观察 `dispatch -> txn shell` 的固定成本。

相关文件：

- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`

## 口径

- 单 reducer
- 单字段写入
- 零 trait
- 同一个 `runtime.runPromise(...)` 内批量跑 `SAMPLE_BATCH=50`
- 轴：
  - `stateWidth = [1, 8, 32, 128, 512, 1024]`
  - `entrypointMode = [reuseScope, resolveEach]`

这组口径用于回答两个问题：

1. 性能下降是否随 `stateWidth` 线性放大
2. 性能下降是否主要来自每次重新解析 module scope

## 证据

GitHub Actions run：

- `22951923562`
- base: `tmp-main-dispatch-shell-baseline-20260311@a91005db`
- head: `effect-v4@72bdc5c4`

从 raw report 直接计算 `runtime.txnCommitMs.p95`：

- `reuseScope` 6 个点全部变慢，`delta` 中位数约 `+3.96ms`
- `resolveEach` 6 个点全部变慢，`delta` 中位数约 `+3.99ms`
- `stateWidth=1..1024` 各档位都接近 `+3.9ms ~ +4.0ms`

代表性样本：

- `stateWidth=1, reuseScope`: `0.544ms -> 4.354ms`，`+3.81ms`
- `stateWidth=128, reuseScope`: `0.348ms -> 4.328ms`，`+3.98ms`
- `stateWidth=1024, reuseScope`: `0.466ms -> 4.390ms`，`+3.924ms`
- `stateWidth=128, resolveEach`: `0.306ms -> 4.332ms`，`+4.026ms`

## 结论

当前 slowdown 更像固定税，不像 `converge` 规模退化。

同时，`reuseScope` 和 `resolveEach` 的退化量几乎一致，说明主要问题不在 module scope 解析本身，怀疑点继续收敛到：

1. `ModuleRuntime.transaction.ts` 的事务壳
2. `ModuleRuntime.txnQueue.ts` 的 enqueue/handoff 壳
3. 事务提交后的 debug 或 publish 固定成本

## 后续

已补 `trace:txn-phase` 诊断事件，用于把以下阶段拆开：

- `txnQueue`
- `bodyShell`
- `asyncEscapeGuard`
- `traitConverge`
- `scopedValidate`
- `sourceSync`
- `commit`

## 第二刀结果

在 `effect-v4` 上继续用 `trace:txn-phase` 做 targeted collect 后，固定税主要落点已确认：

- `runtime.txnPhase.queue* ≈ 0`
- `runtime.txnPhase.commit* ≈ 0.04ms`
- `runtime.txnPhase.bodyShellMs ≈ 4.1ms`
- `runtime.txnPhase.asyncEscapeGuardMs ≈ 4.08ms`

因此真正的大头在事务体里的 async-escape guard。

随后将生产态路径改为 sync-first：

- `diagnostics=off` 下不再为每个 transaction 固定创建 child fiber 再 `poll/yield`
- 改为直接 `Effect.runSyncExit(body())`
- 仅在检测到 async escape 时记录诊断并中断逃逸 fiber

语义回归：

- `test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.AsyncEscapeGuard.Perf.off.test.ts`
- `test/Runtime/Runtime.PublicSemantics.NoDrift.test.ts`
- `test/StateTrait/StateTrait.ConvergeAuto.TransactionBoundary.test.ts`

这三条均已通过。

下一步继续收 `diagnostics=light/full` 的同类固定税。
