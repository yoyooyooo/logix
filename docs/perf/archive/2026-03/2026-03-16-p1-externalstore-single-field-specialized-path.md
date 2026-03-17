# 2026-03-16 · P1 externalStore single-field specialized path

## 这刀做了什么

只针对 `externalStore` 的 `batch.length === 1` 高频路径收窄优化：

- 在 `packages/logix-core/src/internal/state-trait/external-store.ts` 预编译单字段 `fieldPath` 访问器
- 单字段写回与同步初始写回复用同一个 accessor，避免每次走 `RowId.getAtPath/setAtPathMutating` 的 `path.split('.')`
- 多字段分支保持原逻辑，不改 `TickScheduler.ts`、`RuntimeStore.ts`、`RuntimeExternalStore.ts`、`ModuleRuntime.txnQueue.ts`

## 语义守门

命令：

```bash
/Users/yoyo/Documents/code/personal/logix/node_modules/.bin/vitest run \
  packages/logix-core/test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts \
  packages/logix-core/test/internal/StateTrait/StateTrait.ExternalStoreTrait.SingleFieldFastPath.Perf.off.test.ts

/Users/yoyo/Documents/code/personal/logix/node_modules/.bin/vitest run \
  packages/logix-core/test/internal/StateTrait/StateTrait.ExternalStoreTrait.TxnWindow.test.ts \
  packages/logix-core/test/internal/Runtime/ModuleAsSource.tick.test.ts

pnpm -C packages/logix-core typecheck:test
```

结果：

- 单字段浅路径 runtime guard：通过
- 单字段深路径 same-value no-op guard：通过
- `TxnWindow`：通过
- `ModuleAsSource.tick`：通过
- `packages/logix-core` `typecheck:test`：通过

## 贴边 micro-bench

命令：

```bash
/Users/yoyo/Documents/code/personal/logix/node_modules/.bin/vitest run \
  packages/logix-core/test/internal/StateTrait/StateTrait.ExternalStoreTrait.SingleFieldFastPath.Perf.off.test.ts
```

输出：

- `single-shallow`
  - `legacy.p95=10.940541ms`
  - `optimized.p95=8.465958ms`
  - `ratio=0.7738`
- `single-deep`
  - `legacy.p95=31.361750ms`
  - `optimized.p95=28.340875ms`
  - `ratio=0.9037`
- `single-same-value-noop`
  - `legacy.p95=15.143750ms`
  - `optimized.p95=8.188083ms`
  - `ratio=0.5407`
- `multi-2`
  - `legacy.p95=13.860292ms`
  - `optimized.p95=13.800834ms`
  - `ratio=0.9957`
- `multi-8`
  - `legacy.p95=28.483167ms`
  - `optimized.p95=28.108500ms`
  - `ratio=0.9868`
- `multi-64`
  - `legacy.p95=57.725708ms`
  - `optimized.p95=57.450583ms`
  - `ratio=0.9952`

裁决：

- 单字段浅路径、深路径、same-value no-op 都有稳定正收益
- 2/8/64 fields 邻近对照保持平稳，没有把多字段路径拉坏

## externalStore targeted suite

命令：

```bash
pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/external-store-ingest.test.tsx
```

关键结果：

- `watchers=128/256/512` 下 `diagnosticsLevel=off/full` 全部 `status=ok`
- `p95<=3.00ms` 在 `off/full` 两组都通过到 `watchers=512`
- `full/off<=1.25` 的 `firstFailLevel=null`

关键点位：

- `watchers=256`
  - `off.p95=1.0999999ms`
  - `full.p95=1.3000001ms`
- `watchers=512`
  - `off.p95=0.8999999ms`
  - `full.p95=0.8999999ms`

## 结论

这刀值得保留。

理由：

1. 命中的就是 `single-field` 高频路径，且 runtime guard 已证明运行时不再重复解析 `fieldPath`
2. 贴边 micro-bench 在浅路径、深路径、same-value no-op 都拿到明确正收益
3. 2/8/64 fields 邻近对照稳定
4. browser externalStore targeted suite 的 `off/full` 没有回退
