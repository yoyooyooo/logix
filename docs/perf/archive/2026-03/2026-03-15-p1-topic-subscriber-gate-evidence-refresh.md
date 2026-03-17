# 2026-03-15 · P1 topic subscriber gate evidence refresh

## 目标

本轮不改实现，只补一条更贴边的硬证据，判断已合入 `v4-perf` 的 `topic subscriber gate` 是否还能继续维持 `provisional`，还是可以升级。

参考实现提交：

- `cc971c7a perf(topic-plane): gate unsubscribed topics`

## 证据命令

### 1. 回归测试

```bash
pnpm --dir packages/logix-core test -- --run test/internal/Runtime/TickScheduler.topic-classification.test.ts
pnpm --dir packages/logix-core test -- --run test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts test/internal/Runtime/TickScheduler.diag-gate.test.ts
```

### 2. 类型检查

```bash
pnpm --dir packages/logix-core typecheck:test
```

### 3. 贴边 micro-bench

```bash
pnpm exec tsx packages/logix-core/test/internal/Runtime/TickScheduler.topic-subscriber-gate.microbench.ts
```

## 结果

### 回归测试

全部通过。

### 类型检查

通过。

### micro-bench 设计

这次把证据拆成两层：

1. `current`
- 走当前公开入口
- `module` 用 `scheduler.onModuleCommit`
- `selector` 用 `scheduler.onSelectorChanged`

2. `baseline`
- 在同一份代码下，用旧行为等价仿真
- 直接向 `queue` 注入 `dirtyTopics`
- 用它隔离“如果没有 gate，本轮 tick 仍会处理 topic churn”这笔成本

同时再加一层更贴边的隔离基准：

- `commitTickModuleCurrent/Baseline`
- `commitTickSelectorCurrent/Baseline`

这里直接比较 `RuntimeStore.commitTick` 在：

- `dirtyTopics = empty`
- `dirtyTopics = one topic`

两种情况下的成本差异。

## micro-bench 输出摘要

参数：

- `iterations = 4000`
- `warmupIterations = 400`
- `rounds = 6`

### 入口级样本

`moduleCurrent`

- mean: `25.47ms`
- version: `0`

`moduleBaseline`

- mean: `8.06ms`
- version: `4400`

`selectorCurrent`

- mean: `23.61ms`
- selectorVersion: `0`

`selectorBaseline`

- mean: `25.15ms`
- selectorVersion: `4400`

解释：

- `module` 入口级对比不适合直接下结论，因为 `current` 走 `scheduler.onModuleCommit`，`baseline` 是旧行为等价仿真，入口壳不完全对称
- 这里能稳定证明的只有一件事：gate 成功消掉了 version churn
- `selector` 入口级对比是正向的，但差距仍偏小

### `commitTick` 隔离样本

`commitTickModuleCurrent`

- mean: `1.226ms`
- moduleVersion: `0`

`commitTickModuleBaseline`

- mean: `2.035ms`
- moduleVersion: `4400`

`commitTickSelectorCurrent`

- mean: `0.192ms`
- selectorVersion: `0`

`commitTickSelectorBaseline`

- mean: `0.476ms`
- selectorVersion: `4400`

解释：

1. 这组数据直接打在 gate 真正想省掉的那一段
- 无订阅时，不再做 topic bump / topic priority / listener snapshot 路径

2. `module` 隔离样本的 mean 从 `2.035ms` 降到 `1.226ms`
- 降幅约 `39.8%`

3. `selector` 隔离样本的 mean 从 `0.476ms` 降到 `0.192ms`
- 降幅约 `59.6%`

4. 两组样本都同时满足：
- `version` 归零
- 时间下降

这说明 gate 在它本来瞄准的路径上，收益是成立的。

## 结论

结论：`accepted_with_evidence`

但范围要收紧成下面这句：

- `topic subscriber gate` 已被证实能稳定消掉无订阅 topic 的 version churn，并降低 `commitTick/topic path` 的纯开销

当前还不能扩大成下面这句：

- “整个 module commit 端到端路径已经稳定更快”

原因：

- `onModuleCommit` 入口还夹着其它固定壳，module 入口级样本不够干净
- 这轮证据足以证明 gate 本身是正收益
- 还不足以把更大的 `topic plane` 路线一并宣称完成

## 后续含义

1. 这条已合入实现不再需要继续维持 `merged_but_provisional`
2. `P1-4` 整个大方向仍未完成
3. 后续如果继续做：
- `topic plane ID` 化
- `listener fanout` 继续剥离
- `RuntimeExternalStore` runtime 级调度器

应另开新刀，不和本轮 gate 证据混在一起
