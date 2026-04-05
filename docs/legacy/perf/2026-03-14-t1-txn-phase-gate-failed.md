# 2026-03-14 · T-1：txn-phase 默认采样门收紧试探失败

## 目标

针对 `externalStore.ingest.tickNotify` 的剩余固定税，验证
`packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
与
`packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`
里的事务相位采样，是否在 `traceMode=off` 的默认 browser perf 场景里带来了不必要的固定成本。

试探假设：

- 当前默认门是 `diagnosticsLevel !== 'off'`
- 若把 `txn-phase` 采样和阶段对象组装收紧到 `diagnosticsLevel !== 'off' && traceMode === 'on'`
- 应该优先改善 `full` 档位，并有机会把 `watchers=128/256/512` 重新压回 `p95<=3ms`

## 试探内容

只动默认采样门，不改：

- `state:update` 正常 diagnostics
- `onCommit` / `state:update` 顺序
- `TickScheduler` / `RuntimeStore` / `RuntimeExternalStore`
- `external-store` writeback 路径

临时 runtime patch：

- `ModuleRuntime.txnQueue.ts`：
  - `phaseTimingEnabled` 从 `diagnosticsLevel !== 'off'`
  - 改为 `diagnosticsLevel !== 'off' && traceMode === 'on'`
- `ModuleRuntime.transaction.ts`：
  - 同步把 `txn-phase` 组装、`queuePhaseTiming` 读取、`dispatchPhaseTimingEnabled` 都挂到相同门下

最终裁决后，runtime 改动已全部回退；当前工作树只保留 evidence-only 证据与文档。

## 验证

### 1. 邻近 tests

命令：

```sh
PATH=/opt/homebrew/bin:/usr/bin:/bin /opt/homebrew/bin/node packages/logix-core/node_modules/vitest/vitest.mjs run packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts packages/logix-core/test/Debug/Debug.RuntimeDebugEventRef.Serialization.test.ts packages/logix-core/test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts packages/logix-core/test/internal/StateTrait/StateTrait.ExternalStoreTrait.TxnWindow.test.ts
```

结果：

- `Test Files  5 passed (5)`
- `Tests  61 passed (61)`

### 2. typecheck

命令：

```sh
PATH=/opt/homebrew/bin:/usr/bin:/bin /opt/homebrew/bin/node packages/logix-core/node_modules/typescript/bin/tsc -p packages/logix-core/tsconfig.test.json --noEmit
```

结果：

- 成功退出
- 无 TS 错误

### 3. browser targeted

命令：

```sh
pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/external-store-ingest.test.tsx -t "perf: externalStore ingest"
```

结果摘要：

- `off / 128 = 6.0ms`
- `off / 256 = 5.7ms`
- `off / 512 = 6.1ms`
- `full / 128 = 5.3ms`
- `full / 256 = 5.9ms`
- `full / 512 = 6.3ms`

结论：

- `full / 128` 有改善
- 绝对预算仍全线失守
- `off` 档位没有形成稳定收益

### 4. browser soak

命令：

```sh
pnpm perf collect -- --profile soak --files test/browser/perf-boundaries/external-store-ingest.test.tsx --out specs/103-effect-v4-forward-cutover/perf/after.local.txn-phase-gate.soak.json
pnpm perf diff:triage -- --before /tmp/logix-perf-sweeps-20260313-r3/effect-v4.external-store.r3.soak.json --after specs/103-effect-v4-forward-cutover/perf/after.local.txn-phase-gate.soak.json --out specs/103-effect-v4-forward-cutover/perf/diff.local.effect-v4-r3__txn-phase-gate.soak.json
```

证据：

- `specs/103-effect-v4-forward-cutover/perf/after.local.txn-phase-gate.soak.json`
- `specs/103-effect-v4-forward-cutover/perf/diff.local.effect-v4-r3__txn-phase-gate.soak.json`

对照基线：

- `/tmp/logix-perf-sweeps-20260313-r3/effect-v4.external-store.r3.soak.json`

关键对比：

- `off / 128`: `5.9ms -> 6.0ms`
- `off / 256`: `5.2ms -> 6.1ms`
- `off / 512`: `5.5ms -> 5.9ms`
- `full / 128`: `6.1ms -> 6.1ms`
- `full / 256`: `6.0ms -> 5.6ms`
- `full / 512`: `6.0ms -> 5.9ms`

读法：

- `full` 档位有局部改善
- `off` 档位整体持平或更差
- diff 总结没有给出稳定 improvement/regression 结论，但关键绝对预算仍全红

## 结论

- 这刀不保留
- 默认 `txn-phase` 采样门收紧只能压掉部分 `full` 税
- `externalStore.ingest.tickNotify` 当前主税点不在这层默认采样门
- 当前不应继续沿着 `txn-phase` gate tweak 叠更多小改动

## 当前裁决

- `externalStore` 这条线已经连续否掉：
  - `D-4 raw direct writeback fallback`
  - `T-1 txn-phase default gate`
- 当前最清楚的事实只有一个：
  - `off` 模式仍然高，说明主税点仍落在非 trace、非 full-only 的路径上

下一步若要继续开刀，应重新回到 browser 结果做 fresh compare，再决定唯一下一刀；当前文档先不预设下一个实现方向。
