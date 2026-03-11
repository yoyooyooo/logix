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

## 第三轮跟进：trace 读数修正 + outer shell 复测

后续在 `effect-v4` current-head 上又做了三件事：

1. 修正 `trace:txn-phase` 里的 dispatch 计数丢失：
   - 原因是 `StateTransaction.commitWithState(...)` 会先清空 `txnContext.current`，导致 `dispatchActionCount / dispatchActionRecordMs / dispatchActionCommitHubMs` 在 trace 投影时回读成 `0`。
   - 现已改成 commit 前先抓快照，再写 trace。
2. 给 `runOperation` 热路径做两处小收敛：
   - 不再每次都先 `Effect.services()` 扫全 Context 再解 middleware/runSession。
   - `runtimeLabel` 改成构造期下沉到闭包，不再在每个 operation 上重复读一次。
3. 把 `workflow.timer` 的 override 从公共 `dispatch` 热路径里挪到 internal fast-path：
   - 普通 `runtime.dispatch(...)` 不再为 `TxnOriginOverride` 做 env lookup。
   - workflow timer 仍保持 `originKind='workflow.timer'` 语义，并已由 `WorkflowRuntime.075` 回归锁住。

本地 `soak` 复测结论：

- `dispatchActionCount` 现已稳定为 `1`
- `dispatchActionRecordMs ≈ 0`
- `dispatchActionCommitHubMs ≈ 0`
- 新增的 `txnPreludeMs / queueContextLookupMs / queueResolvePolicyMs` 在 browser trace 下基本都量化成 `0`

这说明：

- 先前 “dispatch 内部 timing 一直是 0” 的读数有一部分是 trace 取值 bug
- bug 修完后，`action:dispatch` 记录与 `actionCommitHub` 仍然不是 residual 主因
- browser `performance.now()` 的粒度已经不够再拆更小的 sub-phase

## 第四轮跟进：Node 微基线确认 residual 位置

为避开 browser 时钟分辨率地板，新增 Node 侧微基线：

- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts`

当前分支本地样本：

- `dispatch.p50 ≈ 0.091ms`
- `dispatch.p95 ≈ 0.137ms`
- `txnPrelude.avg ≈ 0.002ms`
- `queueContext.avg ≈ 0.003ms`
- `queueResolve.avg ≈ 0.003ms`
- `bodyShell.avg ≈ 0.013ms`
- `commit.avg ≈ 0.013ms`
- `dispatchRecord.avg ≈ 0.002ms`
- `dispatchCommitHub.avg ≈ 0.001ms`
- `residual.avg ≈ 0.068ms`

对比 `ab135e74` 基线，同口径 Node 微基线的变化大致是：

- `dispatch.p50` 基本持平
- `dispatch.p95` 小幅下降，约 `-0.002ms`
- `residual.avg` 从约 `0.074ms` 降到约 `0.068ms`

结论更新：

1. 当前这轮代码级 hot-path 收敛只收回了大约 `0.006ms` 量级的 residual
2. 已可明确排除：
   - `dispatchActionRecord`
   - `dispatchActionCommitHub`
   - `txnPrelude`
   - `queue resolvePolicy`
3. 剩余主要税点仍落在 trace 外层，最像：
   - `enqueueTransaction(...)` 返回前的外层 await 壳
   - queue finalizer / release 之后的 Effect runtime 解释器成本
   - 公共 `dispatch` 外层组合壳

### 失败试探

尝试把 `enqueueTransaction` 的 `Effect.ensuring(...)` 改写成显式 `exit -> advanceQueue/release -> done(exit)` 后，
Node 微基线出现明显负优化：

- `dispatch.p95` 从约 `0.137ms` 升到约 `0.213ms`
- `residual.avg` 从约 `0.068ms` 升到约 `0.082ms`

该试探已当场回退，没有继续叠加。
