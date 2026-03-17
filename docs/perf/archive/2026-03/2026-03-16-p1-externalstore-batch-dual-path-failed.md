# 2026-03-16 · P1 externalStore batch-size-aware dual path failed

## 这刀想做什么

目标是把上一轮失败的 `externalStore draft primitive` 收窄成更小的双路径：

- `batch.length === 1` 保持 legacy 路径
- `batch.length >= 2` 才启用事务内 draft mutate primitive

预期收益是：

- 避开 `single field` 的明显回退
- 保留 `multi field` 的潜在正收益

## 尝试内容

尝试过的最小切面：

1. 在 `StateTransaction.ts` 增加批量 path/value 更新 helper
2. 在 `external-store.ts` 的 `applyWritebackBatch(...)` 多字段分支接入 helper
3. `single field` 路径完全保留 legacy

本次没有修改：

- `TickScheduler.ts`
- `RuntimeStore.ts`
- `RuntimeExternalStore.ts`
- `ModuleRuntime.txnQueue.ts`

## 验证

### 语义守门

通过：

```bash
NODE_PATH=/Users/yoyo/Documents/code/personal/logix/node_modules \
node /Users/yoyo/Documents/code/personal/logix/node_modules/.pnpm/vitest@4.0.15_@types+node@22.19.1_@vitest+browser-playwright@4.0.15_happy-dom@20.0.11_jiti@2._2ometoz6dovmrspipohi7nyte4/node_modules/vitest/vitest.mjs \
run \
packages/logix-core/test/internal/StateTrait/StateTrait.ExternalStoreTrait.TxnWindow.test.ts \
packages/logix-core/test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts \
packages/logix-core/test/internal/Runtime/ModuleAsSource.tick.test.ts
```

结果：

- `StateTrait.ExternalStoreTrait.TxnWindow.test.ts` 通过
- `StateTrait.ExternalStoreTrait.Runtime.test.ts` 通过
- `ModuleAsSource.tick.test.ts` 通过

说明：

- 语义没有明显漂移
- raw externalStore / module-as-source / txn-window discipline 仍然成立

### 贴边 micro-bench

第一版小样本结果：

- `single`
  - `legacy.p95=0.007ms`
  - `dual.p95=0.008ms`
- `two`
  - `legacy.p95=0.007ms`
  - `dual.p95=0.009ms`
- `eight`
  - `legacy.p95=0.012ms`
  - `dual.p95=0.006ms`
- `many`
  - `legacy.p95=0.008ms`
  - `dual.p95=0.006ms`

这个口径太快，噪声过大，因此又放大成批量样本。

第二版放大样本：

- `single batch=256`
  - `legacy.p95=1.742ms`
  - `dual.p95=1.582ms`
- `two batch=256`
  - `legacy.p95=1.787ms`
  - `dual.p95=2.653ms`
- `eight batch=256`
  - `legacy.p95=2.547ms`
  - `dual.p95=2.630ms`

`many` 案例在当前测试超时前未跑完，但前 3 组已经足够说明问题：

- `single` 只有轻微正向
- `two` 明显回退
- `eight` 也没有稳定正收益

### targeted suite

尝试过：

```bash
NODE_PATH=/Users/yoyo/Documents/code/personal/logix/node_modules \
pnpm --dir packages/logix-react test -- --project browser test/browser/perf-boundaries/external-store-ingest.test.tsx
```

结果：

- 当前 worktree 下 browser 依赖解析失败
- 缺少 `vitest-browser-react` / `effect` 的 browser 侧解析链路
- 因此这次没有拿到可用的 browser targeted 证据

这部分按“环境不成立”记账，不把它伪装成通过。

## 结论

这条线当前应判定为失败。

原因：

1. 双路径门控没有换来稳定收益
2. `two` 和 `eight` 都没有达到“明确且稳定正收益”门槛
3. 现阶段不值得把这条实现继续保留在母线候选里

## 收口

已做动作：

- 代码全部回退
- 临时测试全部删除
- 只保留本文档作为 docs/evidence-only 失败结论

## 后续若重开

只建议两种新切面：

1. `single field` 专门路径
- 只针对 `batch.length === 1` 做更窄的优化

2. `large batch only`
- 把门槛继续上调到 `batch.length >= 8` 或更高，再重新验证

在没有新的贴边证据前，不建议继续沿当前双路径实现推进。
