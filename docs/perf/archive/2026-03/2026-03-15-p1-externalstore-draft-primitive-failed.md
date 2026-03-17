# 2026-03-15 · P1-3 externalStore draft primitive failed

## 这刀想做什么

目标是验证一个很窄的第一刀：

- 不动 coordinator
- 不动 `runWithStateTransaction(...)`
- 不动 tick / topic / React
- 只把 `externalStore` 写回里的整 draft 重建替成事务内 draft mutate primitive

## 这次试了什么

尝试路径：

1. 在 `StateTransaction.updateDraft(...)` 里引入内部 mutate 命令
2. 让 `external-store.ts` 的以下路径改走该命令
- `applyWritebackBatch(single)`
- `applyWritebackBatch(multi)`
- `module-as-source writeValue(...)`
- `raw store writeValueSync(...)`

实现后验证了两类证据：

1. 行为测试
- `test/internal/StateTrait/StateTrait.ExternalStoreTrait.TxnWindow.test.ts`

2. 贴边 micro-bench
- 直接对比 legacy `create(...) + updateDraft(nextDraft)` 与 mutate-command 两条路径
- 场景分成：
  - `single field`
  - `multi field(64 fields same txn)`

3. 邻近 targeted suite
- `test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts`
- `test/internal/ExternalStore/ExternalStore.RuntimeBoundary.test.ts`
- `test/internal/Runtime/ModuleAsSource.tick.test.ts`
- `packages/logix-react/test/browser/perf-boundaries/external-store-ingest.test.tsx`

## 证据

### 1. 贴边 micro-bench

输出：

- `single.legacy.p95=0.013ms`
- `single.optimized.p95=0.017ms`
- `single.p95.ratio=1.362`
- `multi.legacy.p95=0.024ms`
- `multi.optimized.p95=0.016ms`
- `multi.p95.ratio=0.674`

解释：

- `multi` 明显更快
- `single` 明显变差

这说明这刀当前不是“稳定正收益”，而是把收益集中到了 batch path，同时把 single-field path 拉慢了。

### 2. 邻近 suite

通过：

```bash
pnpm --dir packages/logix-core test -- --run test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts test/internal/ExternalStore/ExternalStore.RuntimeBoundary.test.ts test/internal/Runtime/ModuleAsSource.tick.test.ts
pnpm --dir packages/logix-react test -- --run test/browser/perf-boundaries/external-store-ingest.test.tsx
```

结果：

- 语义相关测试全绿
- browser externalStore ingest suite 没有出现回退到超预算

但这组证据只能说明“没有把整条链打坏”，不能覆盖掉 single-field 贴边基线的回退事实。

## 裁决

本刀当前不合入。

原因：

1. 目标路径证据是混合结果
- `multi` 正收益
- `single` 负收益

2. `externalStore` 的真实高频路径里，single-field 写回非常常见

3. 在没有更强证据证明真实 workload 主要受益于 `multi` 之前，这刀不满足“明确且稳定正收益”的合入门槛

## 当前状态

- 代码已回退到基线
- 只保留这份 evidence-only 结论

## 后续如果要重开

只建议按下面两个方向二选一：

1. 单独优化 `single field` 路径
- 允许 single 和 multi 走不同 primitive

2. 只在检测到 batch size >= 2 时启用 mutate primitive
- single 继续走旧路径

在这两个方向没分开前，不建议继续把它作为当前实现线推进。
