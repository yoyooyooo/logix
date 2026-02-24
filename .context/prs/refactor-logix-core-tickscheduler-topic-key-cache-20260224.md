# TickScheduler topicKey 解析缓存

## Branch
- refactor/logix-core-perf-pr7-tickscheduler-topickey-cache
- PR: 待创建

## 核心改动
- 在 `TickScheduler` 增加有界缓存：`topicKey -> moduleInstanceKey`（含 `null` 负缓存），避免同一 topicKey 在 tick 分流阶段重复解析。
- 保持原有 topic 分类语义不变：`module::instance` 与 `module::instance::rq:*` 继续按模块归类；不可解析 topic 继续忽略；未知模块 topic 继续走保守 accepted 路径。
- 新增并补强回归测试 `TickScheduler.topic-classification.test.ts`：覆盖 accepted/deferred 模块+selector 主题，以及 unknown/non-parsable topic 在缓存命中后的语义一致性。

## 验证
- pnpm typecheck
- pnpm test:turbo

## 独立审查
- 结论：approve（本轮关注点是“仅性能优化、不改分类语义”，回归覆盖已补齐）

## 机器人评论处理
- 待 PR 创建后补充 CodeRabbit / 其他机器人评论结论。
