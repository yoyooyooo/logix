# 2026-03-16 · P1 Runtime-scoped notify scheduler failed

## 这刀做了什么

这条线尝试把 `RuntimeExternalStore.ts` 里“每个 store 自己维护一套通知调度状态”的实现，
收敛成“同一个 runtime 共享一套通知调度器”。

目标是减少以下重复状态：

- `notifyScheduled`
- `notifyScheduledLow`
- `delay / maxDelay` 定时器
- `raf` 对齐状态

本轮实现范围只限：

- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- 一个很小的 helper
- 配套内部测试

没有改：

- `RuntimeStore.ts`
- `TickScheduler.ts`
- 任何 `logix-core` 文件

## 证据与验证

### 语义验证

通过：

```bash
vitest run packages/logix-react/test/internal/RuntimeExternalStore.lowPriority.test.ts
```

说明：

- 现有 `lowPriorityDelayMs / lowPriorityMaxDelayMs` 语义没有直接崩坏

### 贴边 micro-bench

场景：

- 同一 runtime 下 `32 / 128 / 512` 个 topic stores
- 分 `normal` / `low` 两类 priority
- 对比：
  - legacy per-store notify state
  - runtime-scoped scheduler

关键结果：

#### normal

- `stores=32`
  - `legacy.meanMs=5.677`
  - `shared.meanMs=5.568`
- `stores=128`
  - `legacy.meanMs=5.570`
  - `shared.meanMs=5.661`
- `stores=512`
  - `legacy.meanMs=5.599`
  - `shared.meanMs=5.459`

#### low

- `stores=32`
  - `legacy.meanMs=5.387`
  - `shared.meanMs=5.503`
- `stores=128`
  - `legacy.meanMs=5.245`
  - `shared.meanMs=5.338`
- `stores=512`
  - `legacy.meanMs=5.667`
  - `shared.meanMs=5.990`

#### 计数

- `normal` 路径下，shared 的 `microtasks` 从 `32/128/512` 收敛到 `1`
- `low` 路径下，shared 的 `timeouts/rafs` 也显著下降到 `1/1`

## 结论

当前不能合入。

原因：

1. 结构上，调度器共享是成立的
- 定时器和 microtask 数量显著下降

2. 证据上，耗时收益不稳定
- `normal` 只在部分档位略好
- `low` 在 `32/128/512` 三档都没有形成稳定正收益
- 尤其高 listener 数下，shared 版本并没有稳定更快

3. 按当前母线门槛，这条线缺少“明确且稳定正收益”

## 当前裁决

- 结果分类：`discarded_or_pending`
- 不保留实现代码
- 只保留 docs/evidence-only 结论

## 若后续重开

更值得尝试的不是“共享整个通知调度器”，而是：

1. 只共享 `normal` 路径的 microtask flush
2. `low` 路径继续保持 per-store 语义
3. 或先做更细的 hostScheduler 侧成本剖面，再决定是否值得重构
