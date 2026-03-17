# 2026-03-14 · D-4：externalStore raw direct writeback fallback 试探失败

## 目标

针对 `externalStore.ingest.tickNotify` 的绝对预算债，验证当前分支相对 `main` 的固定税是否主要来自
`packages/logix-core/src/internal/state-trait/external-store.ts`
里的 raw external-store writeback coordinator。

试探假设：

- 当前 benchmark 的 `moduleCount=10`
- 每个 module 每轮基本只有一次单字段写回
- 若 coordinator 固定税是主因，把 raw path 暂时退回 `main` 风格的 direct writeback + microtask coalescing，应当能把 `watchers=128/256/512` 的绝对 `p95` 明显压回

## 试探内容

只动 raw external-store 路径，不碰 `module-as-source`、`RuntimeExternalStore`、`TickScheduler`、Vitest browser 配置。

临时 runtime patch：

- raw external-store 写回从 `enqueueWriteValue -> coordinator.enqueue(...)`
- 改为更接近 `main` 的 `writeValue(...)` 直接事务写回
- 恢复 writeback loop 里的 microtask coalescing

最终裁决后，runtime / test 改动已全部回退；当前工作树只保留证据与文档。

## 验证

### 1. 邻近 tests

命令：

```sh
PATH=/opt/homebrew/bin:/usr/bin:/bin /opt/homebrew/bin/node packages/logix-core/node_modules/vitest/vitest.mjs run packages/logix-core/test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts packages/logix-core/test/internal/StateTrait/StateTrait.ExternalStoreTrait.TxnWindow.test.ts
```

结果：

- `Test Files  2 passed (2)`
- `Tests  11 passed (11)`

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
- `off / 256 = 5.6ms`
- `off / 512 = 5.6ms`
- `full / 128 = 5.9ms`
- `full / 256 = 6.1ms`
- `full / 512 = 5.7ms`

裁决：

- targeted 没有把任何档位压回 `p95<=3ms`
- 也没有形成相对当前 head 的稳定净收益

### 4. browser soak

命令：

```sh
pnpm perf collect -- --profile soak --files test/browser/perf-boundaries/external-store-ingest.test.tsx --out specs/103-effect-v4-forward-cutover/perf/after.local.external-store-raw-direct.soak.json
```

证据：

- `specs/103-effect-v4-forward-cutover/perf/after.local.external-store-raw-direct.soak.json`
- `specs/103-effect-v4-forward-cutover/perf/diff.local.effect-v4-r3__external-store-raw-direct.soak.json`
- 对照基线：`/tmp/logix-perf-sweeps-20260313-r3/effect-v4.external-store.r3.soak.json`

关键对比：

- `off / 128`: `5.9ms -> 6.1ms`
- `off / 256`: `5.2ms -> 6.1ms`
- `off / 512`: `5.5ms -> 6.0ms`
- `full / 128`: `6.1ms -> 6.2ms`
- `full / 256`: `6.0ms -> 6.2ms`
- `full / 512`: `6.0ms -> 5.4ms`

结论：

- 只有 `full / 512` 单点改善
- 其余关键档位持平或更差
- 绝对预算仍全线失守

## 结论

- 这刀不保留
- raw external-store 回退到 direct writeback 不是当前主因
- 当前不应继续沿着“回退/重做 raw path coordinator”这条线叠 tweak
- runtime / test 改动已回退，只保留 evidence-only 收口

## 下一步建议

`externalStore.ingest.tickNotify` 仍未收口，但下一刀应转向更像固定税的另一层：

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- 把事务相位采样与 `txn-phase` 组装从默认 `diagnosticsLevel !== 'off'` 收紧到更窄门
- 前提仍是只做一刀，并继续用 browser targeted + soak 验收
