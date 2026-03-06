# 2026-03-06 · S-4：current-head full-matrix 刷新解锁

本刀目标不是继续猜测 `runtime store: multi-instance isolation (same moduleId, different instanceId)` 的实现问题，
而是先回答一个更硬的问题：它在 current-head 上是否还是 live blocker。

本轮结论：**当前 head 未复现该问题，S-4 以 evidence-only 方式关闭，不做 runtime 补丁。**

## 根因结论

这次没有拿到可比较的失败样本，因此不能把 `RuntimeStore` / `TickScheduler` 当成 live bug 热修。

当前更小、更可信的根因结论是：

- `S-4` 挂在 backlog 上，主要来自历史 triage 记忆，没有对应的 current-head clean failure 样本持续支撑。
- 当前实现链路里，多实例隔离仍然是按完整 `ModuleInstanceKey` 贯通的：
  - React external store 侧用 `${moduleId}::${instanceId}` 和 `${moduleInstanceKey}::rq:${selectorId}` 建 topic key。
  - `RuntimeStore.parseTopicKey()` 按 `moduleInstanceKey` 记账订阅数。
  - `TickScheduler.storeTopicToModuleInstanceKey()` 也按完整 `moduleInstanceKey` 回解 dirty topic。
- 在这条实现前提下，本轮实测没有发现“同 moduleId、不同 instanceId 被折叠成同一 topic / 同一订阅桶”的 live 证据。

因此，这一刀的真实问题不是“已经确认的 runtime 缺陷”，而是：
**current-head 的 backlog 真相源漂移，仍把一个未复现的历史 blocker 当作现行阻塞项。**

## 验证

1. 单测定向复核：
- `pnpm -C packages/logix-react exec vitest run --project browser test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx -t "runtime store: multi-instance isolation \(same moduleId, different instanceId\)"`
- 结果：通过。

2. 整个文件复核：
- `pnpm -C packages/logix-react exec vitest run --project browser test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
- 结果：3/3 通过。
- 同次运行内的 perf suite `runtimeStore.noTearing.tickNotify` 也通过，`watchers=128/256/512` 的 `off/full` 点位全部为绿。

3. 稳定性复核：
- 循环 40 次执行同一条 multi-instance 定向用例。
- 结果：`40/40` 全绿，没有出现一次 selector cross-wake。

## 为什么这次不改代码

- 没有 live failure，就不应该反向发明 core 补丁。
- 允许改动的核心文件只有 `RuntimeStore.ts` / `TickScheduler.ts`，但当前证据不足以证明问题就在这两处。
- 如果在没有失败样本的前提下去改 topic 解析、dirty-topic 回解或订阅计数，只会把 `S-4` 从“历史 blocker 漂移”升级成“猜测式改 runtime”。

## 收口

- `S-4` 从 backlog 中关闭，性质改为“已完成审计”。
- current-head 后续若要刷新 full-matrix，不再把这条当作默认阻塞项。
- 若未来再次复现，先补 clean/comparable failing capture，再决定是否需要最小 runtime 修复。

## 下一步

- 回到 `R-1` 主线，不继续在 `S-4` 上消耗 runtime 改动预算。
