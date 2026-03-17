# 2026-03-15 · P0-1 第一刀：off 模式 idle txn direct fast path

## 目标

验证一个更窄的第一刀：

- 只在 `diagnostics=off`
- 且当前 queue 完全空闲
- 且没有任何已排队 waiter

时，让 `enqueueTransaction(...)` 直接执行事务体，跳过：

- `resolveConcurrencyPolicy`
- `acquireBacklogSlot`
- `Deferred.start`
- `enqueueAndMaybeStart`
- `Deferred.await(start)`

这层 queue shell。

## 改动

代码落点：

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`

测试落点：

- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`

实现要点：

1. 新增 `diagnostics=off` 且 queue 空闲时的 direct path。
2. direct path 仍保持 `linkId` 传递与 `currentTxnQueuePhaseTiming` 兼容。
3. 为避免破坏 `losslessBackpressureCapacity` 语义，单独引入 `directExecutionLane`，让同 lane 的 blocked acquire 仍把当前 direct execution 计入占用。
4. direct path 完成后会显式唤醒同 lane 的 backpressure waiter，再继续正常 baton 流程。
5. `light/full` 路径不命中 direct path，维持现有诊断链路。

## RED

新增失败用例：

- `should skip policy resolution for uncontended idle executions when diagnostics are off`

初始失败现象：

- 空闲 `urgent + nonUrgent` 两次调用都会各自触发 `resolveConcurrencyPolicy`
- `resolveCalls = 2`

## 验证

### 1. 语义测试

命令：

```bash
pnpm test -- --run test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.TransactionOverrides.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.LinkIdFallback.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.DiagnosticsScopePropagation.test.ts
```

结果：

- 4 个文件全部通过
- 9 个测试全部通过

### 2. 类型门

命令：

```bash
pnpm typecheck:test
```

结果：

- 当前 worktree 无法作为有效门禁
- 失败主因是仓库级依赖链接与跨包现有类型噪声
- 包含 `effect` / `node:*` 解析缺失与多个既有类型错误
- 这次失败没有指向本刀新增代码

### 3. targeted perf（light 守门）

命令：

```bash
pnpm test -- --run test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts
pnpm test -- --run test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts
```

样本 1：

- `dispatch.p50=0.100ms`
- `dispatch.p95=0.159ms`
- `residual.avg=0.065ms`

样本 2：

- `dispatch.p50=0.087ms`
- `dispatch.p95=0.154ms`
- `residual.avg=0.070ms`

对照：

- `docs/perf/archive/2026-03/2026-03-11-dispatch-shell-fixed-tax-probe.md` 中的同口径历史样本约为：
  - `dispatch.p95 ≈ 0.137ms`
  - `residual.avg ≈ 0.068ms`

### 4. clean/comparable 的 `off` 模式 targeted perf

口径：

- 当前实现：`HEAD=3ce6d2a1`
- 对照基线：`HEAD^=e2194b8f`
- 基线通过 `git archive e2194b8f | tar -x` 在当前 worktree 内导出临时快照
- 两边共用同一台机器、同一份依赖链接、同一份 ad-hoc 脚本
- 指标：单 reducer、单字段写入、`diagnostics=off`、纯 `runtime.dispatch(...)`
- 每边各跑 5 轮：`iterations=800`，`warmup=120`

命令：

```bash
mkdir -p .tmp-baseline-e2194b8f
git archive e2194b8f | tar -x -C .tmp-baseline-e2194b8f
ln -s "$PWD/node_modules" .tmp-baseline-e2194b8f/node_modules
ln -s "$PWD/packages/logix-core/node_modules" .tmp-baseline-e2194b8f/packages/logix-core/node_modules
```

```bash
for i in 1 2 3 4 5; do
  cd packages/logix-core
  ../../node_modules/.bin/tsx <<'EOF'
import { Effect, Layer, Schema } from 'effect'
import * as Debug from './src/Debug.js'
import * as Logix from './src/index.js'
const now = () => {
  const perf = globalThis.performance
  return perf && typeof perf.now === 'function' ? perf.now() : Date.now()
}
const quantile = (samples, q) => {
  const sorted = [...samples].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))
  return sorted[idx] ?? 0
}
const average = (samples) => samples.length === 0 ? 0 : samples.reduce((s, v) => s + v, 0) / samples.length
const prevNodeEnv = process.env.NODE_ENV
process.env.NODE_ENV = 'production'
try {
  const iterations = 800
  const warmup = 120
  const M = Logix.Module.make('TxnFastpath.OffDispatchPerf', {
    state: Schema.Struct({ count: Schema.Number }),
    actions: { bump: Schema.Void },
    reducers: {
      bump: Logix.Module.Reducer.mutate((draft) => {
        draft.count += 1
      }),
    },
  })
  const impl = M.implement({ initial: { count: 0 }, logics: [] })
  const silentSink = { record: () => Effect.void }
  const runtime = Logix.Runtime.make(impl, {
    layer: Layer.mergeAll(
      Debug.diagnosticsLevel('off'),
      Debug.replace([silentSink]),
    ),
  })
  const samples = await runtime.runPromise(Effect.gen(function* () {
    const rt = yield* Effect.service(M.tag).pipe(Effect.orDie)
    for (let i = 0; i < warmup; i += 1) {
      yield* rt.dispatch({ _tag: 'bump' })
    }
    const out = []
    for (let i = 0; i < iterations; i += 1) {
      const t0 = now()
      yield* rt.dispatch({ _tag: 'bump' })
      out.push(now() - t0)
    }
    return out
  }))
  await runtime.dispose()
  console.log(JSON.stringify({
    p50: Number(quantile(samples, 0.5).toFixed(3)),
    p95: Number(quantile(samples, 0.95).toFixed(3)),
    avg: Number(average(samples).toFixed(3)),
  }))
} finally {
  if (prevNodeEnv == null) delete process.env.NODE_ENV
  else process.env.NODE_ENV = prevNodeEnv
}
EOF
  cd ../..
done
```

当前实现 `HEAD=3ce6d2a1`：

- run1: `p50=0.065ms`, `p95=0.136ms`, `avg=0.081ms`
- run2: `p50=0.062ms`, `p95=0.103ms`, `avg=0.073ms`
- run3: `p50=0.063ms`, `p95=0.109ms`, `avg=0.078ms`
- run4: `p50=0.062ms`, `p95=0.107ms`, `avg=0.073ms`
- run5: `p50=0.064ms`, `p95=0.114ms`, `avg=0.077ms`

对照基线 `HEAD^=e2194b8f`：

- run1: `p50=0.072ms`, `p95=0.120ms`, `avg=0.085ms`
- run2: `p50=0.072ms`, `p95=0.129ms`, `avg=0.085ms`
- run3: `p50=0.073ms`, `p95=0.120ms`, `avg=0.085ms`
- run4: `p50=0.072ms`, `p95=0.126ms`, `avg=0.084ms`
- run5: `p50=0.063ms`, `p95=0.102ms`, `avg=0.074ms`

5 轮中位：

- 当前实现：`p50=0.063ms`, `p95=0.109ms`, `avg=0.077ms`
- 对照基线：`p50=0.072ms`, `p95=0.120ms`, `avg=0.085ms`

相对变化：

- `p50`: 约 `-0.009ms`
- `p95`: 约 `-0.011ms`
- `avg`: 约 `-0.008ms`

## 结论

当前可以确认三点：

1. 语义上，这条 direct path 成立。
- queue 相关回归测试都通过。
- 新增 RED 用例已转绿。

2. `light` 路径没有出现明显灾难性回退。
- 两轮样本都在同量级。

3. clean/comparable 的 `off` 模式 targeted perf 给出正向结果。
- 5 轮中位 `p50 / p95 / avg` 都优于 `HEAD^`
- 波动存在，但方向一致
- 当前足以支持“这刀值得进入合流审查”

## 当前裁决

- 保留这条实现分支，建议合入 `v4-perf`
- 现阶段仍不把它升级成 `03/05` 的正式收口结论
- 原因是证据已足够支持合流，但还没有扩展到 browser 侧或更广泛 suite

## 后续

若主会话决定继续验证，应优先补：

1. browser / runtime 侧最小 `off` targeted evidence
2. direct path 是否还值得进一步下沉到更早的 boundary shell
3. 是否需要把相同模式扩到更多 boundary 入口
