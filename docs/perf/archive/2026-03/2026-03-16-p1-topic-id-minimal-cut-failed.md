# 2026-03-16 · P1 topicId minimal cut 失败结论

## 这刀尝试了什么

本次尝试的最小切面是：

- 在 `RuntimeStore` 内部把 `topicKey` 字符串平面拆成稳定 `topicId`
- `TickScheduler` 只做薄接线
- 不动 `RuntimeExternalStore`
- 不动公开 API

试探实现包括：

- 在 `RuntimeStore.ts` 内增加内部 `topicDescriptor/topicId` 缓存层
- 把 `topicVersions/topicPriorities/listeners` 改成按内部 id 存储
- 给 `TickScheduler` 增加从 store 读取 `moduleInstanceKey` 的薄接线
- 补了一条最小 RED，验证同一 `topicKey` 会复用 stable topic id

## 证据

### RED / 语义

最小 RED：

- `RuntimeStore.topicId.test.ts`
- 初始失败点：`store.debugGetTopicId is not a function`

说明：

- 这条 RED 只证明实现切面存在，不代表收益已经成立

### 贴边 perf 证据

尝试过两条 bench：

1. `RuntimeStore.commitTick` 贴边 micro-bench
- `dirtyTopicCount=256`
- 结果：
  - `current.meanMs=0.02799`
  - `legacy.meanMs=0.00745`

2. `TickScheduler` 邻近 topic 解析 bench
- `topicKeyCount=256`
- `iterations=2000`
- 结果：
  - `current.meanMs=17.639`
  - `legacy.meanMs=5.311`

### 结论

- `commitTick` 路径明显更慢
- `TickScheduler` 邻近 topic 解析路径也明显更慢
- 当前这版 `topicId` 最小切面没有带来正收益

## 裁决

结果分类：

- `discarded_or_pending`

当前结论：

1. 这版最小切面不应合入 `v4-perf`
2. 已经把代码和测试全部回退
3. 只保留 docs/evidence-only 结论

## 学到什么

当前这版失败的关键点是：

1. 在 JS 里多一层 `topicKey -> descriptor -> id` 的 Map 跳转，常数税比预期大
2. 对当前 `RuntimeStore.commitTick` 这类短热路径来说，简单字符串 Map 未必是瓶颈
3. 若未来重开，应该换切面，不该继续沿这版内部 id 缓存硬推

## 若未来重开，建议换切面

比这版更值得试的方向有两个：

1. 只在更上游做 `topicKey` 生成压缩
- 例如 queue / accepted drain 进入 store 之前，减少字符串构造与复制

2. 配合更大一刀一起做
- 例如 `RuntimeStore + TickScheduler + RuntimeExternalStore` 的统一 topic plane 重构
- 那时再一起评估 `topicId` 是否值得引入
