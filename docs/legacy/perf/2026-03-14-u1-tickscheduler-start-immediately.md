# 2026-03-14 · U-1：TickScheduler scheduleTick immediate start

## 目标问题

在连续否掉：

- `D-4 raw direct writeback fallback`
- `T-1 txn-phase default gate`

之后，`externalStore.ingest.tickNotify` 仍表现为明显固定税：

- `watchers=128/256/512` 都稳定在 `~5ms ~ 6ms`
- 形态不随 watcher 数量明显放大
- 更像 `onCommit -> scheduleTick -> 实际开始 flush` 之间的调度壳延迟

与 `main` 的关键实现差异里，`scheduleTick()` 的 detached fiber 启动方式最可疑：

- 当前分支：`Effect.forkDetach()` 默认启动
- 历史 `main`：更接近 daemon 立即启动语义

## 切口

文件：

- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`

改动：

- 只把 `scheduleTick()` 末尾的 detached fiber 改成：
  - `Effect.forkDetach({ startImmediately: true })`

不改：

- `flushTick()` 内部逻辑
- budget / cycle / drain fast path
- `RuntimeStore` / `RuntimeExternalStore`
- `external-store` writeback 路径

## 验证

### 1. 邻近 tests

命令：

```sh
PATH=/opt/homebrew/bin:/usr/bin:/bin /opt/homebrew/bin/node packages/logix-core/node_modules/vitest/vitest.mjs run packages/logix-core/test/internal/Runtime/TickScheduler.fixpoint.test.ts packages/logix-core/test/internal/Runtime/TickScheduler.starvation.test.ts packages/logix-core/test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts packages/logix-core/test/internal/StateTrait/StateTrait.ExternalStoreTrait.TxnWindow.test.ts
```

结果：

- `Test Files  4 passed (4)`
- `Tests  17 passed (17)`

### 2. 类型门

包内：

```sh
PATH=/opt/homebrew/bin:/usr/bin:/bin /opt/homebrew/bin/node packages/logix-core/node_modules/typescript/bin/tsc -p packages/logix-core/tsconfig.test.json --noEmit
```

Workspace：

```sh
pnpm typecheck
```

结果：

- 包内类型检查通过
- workspace `typecheck` 全部通过

### 3. browser targeted

命令：

```sh
pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/external-store-ingest.test.tsx -t "perf: externalStore ingest"
```

结果：

- `off / 128 = 0.9ms`
- `off / 256 = 0.8ms`
- `off / 512 = 1.3ms`
- `full / 128 = 1.2ms`
- `full / 256 = 1.2ms`
- `full / 512 = 0.8ms`

裁决：

- `p95<=3ms` 全部通过
- 这次 targeted 里 `full/off<=1.25` 仍在低档位失守
- 因此还需要 soak 复核

### 4. browser soak

命令：

```sh
pnpm perf collect -- --profile soak --files test/browser/perf-boundaries/external-store-ingest.test.tsx --out specs/103-effect-v4-forward-cutover/perf/after.local.tickscheduler-start-immediately.soak.json
```

结果：

- `off / 128 = 0.9ms`
- `off / 256 = 0.8ms`
- `off / 512 = 0.8ms`
- `full / 128 = 1.1ms`
- `full / 256 = 0.8ms`
- `full / 512 = 0.8ms`

soak 阈值：

- `p95<=3ms`：`off/full` 全部通过到 `watchers=512`
- `full/off<=1.25`：也通过到 `watchers=512`

证据：

- `specs/103-effect-v4-forward-cutover/perf/after.local.tickscheduler-start-immediately.soak.json`

## 对比

### 对旧 `effect-v4 r3`

diff：

- `specs/103-effect-v4-forward-cutover/perf/diff.local.effect-v4-r3__tickscheduler-start-immediately.soak.json`

代表性改善：

- `off / 128`: `5.9ms -> 0.9ms`
- `off / 256`: `5.2ms -> 0.8ms`
- `off / 512`: `5.5ms -> 0.8ms`
- `full / 256`: `6.0ms -> 0.8ms`
- `full / 512`: `6.0ms -> 0.8ms`

解释：

- 这是稳定的大幅改善，不是抖动
- 主税点确实落在 `scheduleTick` 的 detached 启动壳

### 对 `main r3`

triage diff：

- `specs/103-effect-v4-forward-cutover/perf/diff.local.main-r3__tickscheduler-start-immediately.soak.json`

注意：

- 该 diff 有 `matrixHash` 漂移，不能下硬结论
- 但在现有 triage 口径里，`after` 对比 `main r3` 仍呈现多点改善

这是基于 triage diff 的推断，不是硬结论：

- `off / 128`: `2.4ms -> 0.9ms`
- `off / 256`: `1.1ms -> 0.8ms`
- `off / 512`: `1.3ms -> 0.8ms`

## 结论

- 这刀保留
- `externalStore.ingest.tickNotify` 的绝对预算债已收口
- soak 下 `full/off` 相对预算也一起收口
- 当前不再把 `externalStore.ingest.tickNotify` 视为默认 blocker

## 当前裁决

- 保留 runtime 改动
- 当前 `externalStore` 主线关闭
- 若后续仍要继续 perf 主线，默认转去剩余的 `react.bootResolve.sync` 小固定税，或等待新的 browser 真实阻塞证据
