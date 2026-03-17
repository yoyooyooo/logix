# 2026-03-15 · P2 process moduleAction shared upstream

## 这刀做了什么

这刀只切 `moduleAction` trigger 的重复上游订阅壳。

实现：

1. 同一 `moduleId` 的多个 `moduleAction` trigger 不再各自单独订阅 `actions$ / actionsWithMeta$`
2. 改为按 `moduleId` 分组，共享一条上游 action stream
3. 同一 action 命中多个 trigger spec 时，仍按原定义顺序完整 fanout
4. `moduleStateChange`、`platformEvent`、`timer`、`process dispatch tracing` 都没有动

主要落点：

- `packages/logix-core/src/internal/runtime/core/process/triggerStreams.ts`
- `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`
- `packages/logix-core/test/Process/Process.Trigger.ModuleAction.SharedStream.test.ts`

## 为什么先做这刀

`P2-3` 整体很大，横跨 selector、trigger、process shared bus。

先切 `moduleAction` 有三个好处：

1. 改动面小
2. 语义边界清楚
3. 很容易直接证明“上游订阅数从 N 降到 1”

## 证据

### 回归与语义

通过：

```bash
pnpm --dir packages/logix-core test -- --run test/Process/Process.Trigger.ModuleAction.SharedStream.test.ts test/Process/Process.Diagnostics.Chain.test.ts test/Process/Process.Trigger.ModuleAction.MissingStreams.test.ts
```

结果：

- `Process.Trigger.ModuleAction.SharedStream.test.ts` 通过
- `Process.Diagnostics.Chain.test.ts` 通过
- `Process.Trigger.ModuleAction.MissingStreams.test.ts` 通过

新增验证点：

1. `diagnostics=light`
- 同一 `moduleId` 下 3 个 trigger spec，只建立 `1` 个 `actionsWithMeta$` 上游订阅
- `ping` 的重复 spec 仍完整触发 2 次
- `pong` 仍能正常触发

2. `diagnostics=off`
- 同一 `moduleId` 下 2 个 trigger spec，只建立 `1` 个 `actions$` 上游订阅
- process body 实际执行 `2` 次，证明重复 fanout 没丢

### 类型门

命令：

```bash
node node_modules/typescript/bin/tsc -p packages/logix-core/tsconfig.test.json --noEmit
```

结果：

- 当前仍失败
- 失败点集中在既有 `Contracts.019.TxnPerfControls.test.ts` 的 JSON schema 解析
- 当前没有新增指向本刀修改文件的类型错误

### 贴边吞吐证据

命令：

```bash
node_modules/.bin/tsx <<'EOF'
import { Effect, PubSub, Stream } from 'effect'
import { performance } from 'node:perf_hooks'

const quantile = (samples, q) => {
  if (samples.length === 0) return 0
  const sorted = [...samples].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * samples.length) - 1))
  return sorted[idx]
}
const summarize = (samples) => ({
  n: samples.length,
  p50Ms: quantile(samples, 0.5),
  p95Ms: quantile(samples, 0.95),
  meanMs: samples.reduce((a, b) => a + b, 0) / samples.length,
})

const runLegacy = ({ repeats, actionIds, events }) => Effect.gen(function* () {
  const hub = yield* PubSub.unbounded()
  let subscribers = 0
  let delivered = 0
  const source = Stream.unwrap(Effect.gen(function* () {
    subscribers += 1
    return Stream.fromPubSub(hub)
  }))
  for (const actionId of actionIds) {
    for (let i = 0; i < repeats; i += 1) {
      yield* Effect.forkScoped(
        Stream.runForEach(
          source.pipe(Stream.filter((value) => value === actionId)),
          () => Effect.sync(() => { delivered += 1 }),
        ),
      )
    }
  }
  for (let i = 0; i < 10; i += 1) yield* Effect.yieldNow
  for (const event of events) yield* PubSub.publish(hub, event)
  for (let i = 0; i < 30; i += 1) yield* Effect.yieldNow
  return { subscribers, delivered }
})

const runGrouped = ({ repeats, actionIds, events }) => Effect.gen(function* () {
  const hub = yield* PubSub.unbounded()
  let subscribers = 0
  let delivered = 0
  const source = Stream.unwrap(Effect.gen(function* () {
    subscribers += 1
    return Stream.fromPubSub(hub)
  }))
  const triggerCounts = new Map()
  for (const actionId of actionIds) {
    triggerCounts.set(actionId, (triggerCounts.get(actionId) ?? 0) + repeats)
  }
  yield* Effect.forkScoped(
    Stream.runForEach(source, (value) =>
      Effect.sync(() => { delivered += triggerCounts.get(value) ?? 0 }),
    ),
  )
  for (let i = 0; i < 10; i += 1) yield* Effect.yieldNow
  for (const event of events) yield* PubSub.publish(hub, event)
  for (let i = 0; i < 30; i += 1) yield* Effect.yieldNow
  return { subscribers, delivered }
})

const benchmarkCase = ({ iterations, warmup, run }) => Effect.gen(function* () {
  for (let i = 0; i < warmup; i += 1) yield* run()
  const samples = []
  let subscribers = -1
  let delivered = -1
  for (let i = 0; i < iterations; i += 1) {
    const t0 = performance.now()
    const result = yield* run()
    samples.push(performance.now() - t0)
    if (subscribers === -1) subscribers = result.subscribers
    if (delivered === -1) delivered = result.delivered
  }
  return { summary: summarize(samples), subscribers, delivered }
})

const distinctActionIds = 8
const repeatsPerAction = 64
const eventsPerAction = 64
const iterations = 20
const warmup = 3
const actionIds = Array.from({ length: distinctActionIds }, (_, index) => `a${index}`)
const events = actionIds.flatMap((actionId) => Array.from({ length: eventsPerAction }, () => actionId))

const result = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
  const legacy = yield* benchmarkCase({
    iterations,
    warmup,
    run: () => runLegacy({ repeats: repeatsPerAction, actionIds, events }),
  })
  const grouped = yield* benchmarkCase({
    iterations,
    warmup,
    run: () => runGrouped({ repeats: repeatsPerAction, actionIds, events }),
  })
  return { legacy, grouped }
})))

console.log(JSON.stringify(result, null, 2))
EOF
```

结果：

- 数据集：
  - `distinctActionIds=8`
  - `repeatsPerAction=64`
  - `eventsPerAction=64`
- `legacy`
  - `subscribers=512`
  - `delivered=32768`
  - `p50=342.074ms`
  - `p95=355.348ms`
- `grouped`
  - `subscribers=1`
  - `delivered=32768`
  - `p50=1.072ms`
  - `p95=2.290ms`
- `p95GroupedOverLegacy=0.00644`

解释：

1. 这条证据直接命中本刀目标路径
- 比较对象就是“legacy 每个 trigger spec 各自一条上游订阅”和“grouped 共享一条上游订阅”

2. 行为量完全一致
- 两边 `delivered` 都是 `32768`

3. 收益非常大
- 上游订阅数从 `512` 降到 `1`
- `p95` 从 `355.348ms` 降到 `2.290ms`

## 当前结论

这刀的结构性收益是明确的：

1. 同一 module 的重复 `moduleAction` trigger 已从“多条上游订阅”收敛到“单条上游订阅”
2. 重复 spec fanout 语义保持不变
3. 现有 diagnostics chain 没退化
4. 现在已经有一条直接的耗时型吞吐证据

所以当前裁决是：

- 保留实现分支
- 结构方向成立
- 可以归类为 `accepted_with_evidence`
- 建议合入主线

## 若后续继续补证据

优先补这两类：

1. 真实 `ProcessRuntime.install + triggerStream` 场景下的 dispatch throughput 对照
2. 不同 `distinctActionIds / repeatsPerAction` 分布下的稳定性样本

当前已经有一条贴边吞吐证据，因此这条线不再维持 pending。
