# 2026-03-17 · P1-4 normal notify shared microtask flush

## 问题

这条线是 `P1-4` 的更窄 retry，只尝试一件事：

- 只共享 `normal` 路径的 notify microtask flush
- `lowPriority` 路径继续保持 per-store 语义
- 不重做完整 `topicId`
- 不重写整个 `RuntimeExternalStore` 调度器

目标是验证：

- 同一 runtime 下，多 store 收到 `normal` topic notify 时，`scheduleMicrotask` 能否从每 store 一次收敛成每 runtime 一次
- 这种收敛是否能给出稳定的 wall-clock 正收益

## RED

source worktree 上新增的守门测试：

- `packages/logix-react/test/internal/RuntimeExternalStore.normalNotify.test.ts`

RED 失败点已被主会话独立复核：

- `shares one normal-priority microtask flush across module and readQuery stores in the same runtime`
- 预期 `microtaskCount = 1`
- 实际 `microtaskCount = 2`

这说明当前实现下，`module store` 与 `readQuery store` 在同一 runtime 里仍各自排了一次 normal-path microtask。

## GREEN

主会话已独立复核通过的阶段性 GREEN：

- `RuntimeExternalStore.normalNotify.test.ts`
- `RuntimeExternalStore.lowPriority.test.ts`
- `RuntimeExternalStore.idleTeardown.test.ts`
- `useSelector.sharedSubscription.test.tsx`
- `useSelector.readQueryRetainScope.test.tsx`
- `packages/logix-react typecheck:test`

GREEN 只说明语义层可以成立，不等于性能收益成立。

## Targeted Perf

targeted perf 口径：

- before：legacy per-store normal microtask
- after：shared normal microtask flush
- 场景：同一 runtime 下多 store normal notify

摘要：

### `storeCount = 8`

- microtasks：`8 -> 1`
- meanMs：`0.903 -> 0.956`

### `storeCount = 32`

- microtasks：`32 -> 1`
- meanMs：`1.296 -> 2.286`

### `storeCount = 128`

- microtasks：`128 -> 1`
- meanMs：`5.108 -> 10.232`

结论：

- `microtaskCount` 收敛非常明确
- wall-clock 没有形成正收益
- `32 / 128` stores 下，shared 版本明显更慢

因此这条线只能得出：

- “计数收敛成立”

不能得出：

- “性能收益成立”

## Routing 回写

这次失败不应只停留在单篇 note。

本次同时回写：

- `docs/perf/README.md`
- `docs/perf/2026-03-15-v4-perf-next-cut-candidates.md`
- `docs/perf/archive/2026-03/2026-03-17-v4-perf-next-cut-identification-p1-4-vs-p1-6-vs-p1-7.md`
- `docs/perf/archive/2026-03/2026-03-14-current-effective-conclusions.md`

统一口径：

- `P1-4` 的这条更窄切口已失败
- `normal-path shared microtask flush` 默认不再重开
- 如果未来还要回到 `P1-4`，只看更大的 cross-plane 收口，而不是回到这个 micro-slice

## 结果分类

`discarded_or_pending`

最终裁决：

- 只保留 docs/evidence-only
- 不保留实现代码
- 不保留临时测试与 microbench 文件
