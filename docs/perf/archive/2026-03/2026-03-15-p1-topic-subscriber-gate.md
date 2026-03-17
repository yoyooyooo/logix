# 2026-03-15 · P1 topic subscriber gate

## 这刀做了什么

本刀只做第一阶段最小切口：

- 在 [`TickScheduler.ts`](/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.topic-plane/packages/logix-core/src/internal/runtime/core/TickScheduler.ts) 的入口处增加无订阅 topic 门控
- `module topic` 无订阅时，不再 `markTopicDirty`
- `readQuery topic` 无订阅时，不再 `markTopicDirty`

本刀没有做：

- 完整 `topicId` 重构
- `RuntimeStore` topic 平面改造
- `RuntimeExternalStore` 调度器收敛

## 为什么先做这刀

`P1-4` 的完整版本会同时碰 `RuntimeStore / TickScheduler / RuntimeExternalStore`，改动面偏大。

先把“无订阅 topic 不入队”切出来，有三个好处：

1. 改动只落在 `TickScheduler` 入口
2. 不改公开语义
3. 很容易写出可证伪测试

## 证据

### 结构性证据

新增两条测试：

- `should skip module topic bump when module topic has no subscribers`
- `should skip selector topic bump when selector topic has no subscribers`

它们确认：

- `tickSeq` 仍然推进
- `moduleState` 仍然更新
- 无订阅时 `topicVersion` 保持 `0`

### 轻量 bench

本地 `tsx` bench，`iter=2000`，`rounds=4`，先 warmup 再测。

结果摘要：

- `moduleNoSub.version=0`
- `moduleSub.version=2300`
- `selectorNoSub.moduleVersion=0`
- `selectorNoSub.selectorVersion=0`
- `selectorSub.moduleVersion=2300`
- `selectorSub.selectorVersion=2300`

时间样本：

- `moduleNoSub`: `40.71 / 24.24 / 23.41 / 22.94 ms`
- `moduleSub`: `33.70 / 27.07 / 25.26 / 23.33 ms`
- `selectorNoSub`: `26.19 / 26.34 / 24.14 / 22.59 ms`
- `selectorSub`: `30.75 / 28.90 / 27.68 / 27.89 ms`

解释：

- `module` 路径在本轮 bench 里主要体现为“version churn 被消掉”，时间差不够稳定，不下硬结论
- `selector` 路径在 4 轮里都比有订阅版本更低，方向为正
- 这说明这刀至少已经把“无订阅仍做 topic bump / listener 路径工作”的纯开销切掉了

## 验证

已通过：

```bash
pnpm --dir packages/logix-core test -- --run test/internal/Runtime/TickScheduler.topic-classification.test.ts
pnpm --dir packages/logix-core test -- --run test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts test/internal/Runtime/TickScheduler.diag-gate.test.ts
pnpm --dir packages/logix-core typecheck:test
pnpm exec tsx -e '<topic subscriber gate micro bench>'
```

## 裁决

结论：保留。

原因：

1. 语义安全，`moduleState` 与 `tickSeq` 不受影响
2. 新增测试直接锁住了“无订阅 topic 不 bump version”
3. 轻量 bench 对 selector 路径给出正向趋势

## 当前还剩什么

`P1-4` 这一大方向还没做完，后续仍可继续试：

1. `topic plane ID` 化
2. `RuntimeStore.commitTick` 的 listener fanout 继续剥离
3. `RuntimeExternalStore` 的 runtime 级通知调度器

这三条应另开刀，不和本刀混做。
