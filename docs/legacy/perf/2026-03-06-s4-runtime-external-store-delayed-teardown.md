# 2026-03-06 · S-4：RuntimeExternalStore delayed teardown 修复 multi-instance isolation flake

本刀目标是修掉 `runtime store: multi-instance isolation (same moduleId, different instanceId)` 在整文件/collect 场景下的低频 flake，恢复 `runtime-store-no-tearing` 作为 full-matrix 收口链路的一致性。

## 根因

这次不是 `RuntimeStore` topic key 折叠，也不是 `TickScheduler` 把第二个实例的 readQuery topic 错误 bump 成确定性 bug。

更可信的根因是：
- `RuntimeExternalStore` 在最后一个 listener 移除时立即 teardown / removeStore
- React/browser 在同一 tick 内出现 unsubscribe -> resubscribe 抖动时，会把同一个 topic 的 external store 拆掉又重建
- 对 readQuery topic 来说，这会让 selector snapshot 重新计算一次，从而让 `metrics.s2Runs` 偶发 `1 -> 2`
- 单独跑定向用例很难复现；整文件和 full collect 更容易踩到这一时序窗口

## 修复

文件：`packages/logix-react/src/internal/store/RuntimeExternalStore.ts`

核心做法：
- 移除 per-runtime 的 microtask notify 聚合队列
- 订阅侧改为 store-local 的直接 microtask flush
- 最关键的改动是：最后一个 listener 移除时，不立刻 teardown；而是把 teardown 延迟到一个 microtask，并允许同 tick 内 resubscribe 取消 teardown

结果：
- store 不会在同一浏览器 tick 内被拆掉又重建
- readQuery selector 的 snapshot 也不会因为这一类订阅抖动被多算一次

## 验证

1. 定向单测：
- `pnpm -C packages/logix-react exec vitest run --project browser test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx -t "multi-instance isolation"`
- 结果：通过

2. 整文件：
- `pnpm -C packages/logix-react exec vitest run --project browser test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
- 结果：通过

3. 稳定性复核：
- 整文件循环 20 次
- 结果：`20/20` 通过

## 收口

- 这条线不再按 evidence-only 关闭，而是升级成最小代码修复。
- 后续若 full collect 再次在 `runtime-store-no-tearing` 挂住，应优先怀疑新的时序窗口，而不是回到旧的 topic folding 假设。
