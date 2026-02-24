# TickScheduler topicKey 解析缓存

## Branch
- refactor/logix-core-perf-pr7-tickscheduler-topickey-cache
- PR: #74 (https://github.com/yoyooyooo/logix/pull/74)

## 核心改动
- 在 `TickScheduler` 增加有界缓存：`topicKey -> moduleInstanceKey`（含 `null` 负缓存），避免同一 topicKey 在 tick 分流阶段重复解析。
- 保持原有 topic 分类语义不变：`module::instance` 与 `module::instance::rq:*` 继续按模块归类；不可解析 topic 继续忽略；未知模块 topic 继续走保守 accepted 路径。
- 新增并补强回归测试 `TickScheduler.topic-classification.test.ts`：覆盖 accepted/deferred 模块+selector 主题，以及 unknown/non-parsable topic 在缓存命中后的语义一致性。

## 验证
- pnpm typecheck
- pnpm test:turbo

## 独立审查
- reviewer：subagent 只读审查（2026-02-24）
- 结论：`non-blocker`，无阻塞问题，可合并。
- non-blocker：
  - 目前缓存更接近 FIFO（命中不刷新新鲜度），在极高 topic 基数场景下命中率可能波动；
  - `topicKeyResolutionCacheLimit=1024` 为固定值，后续可补轻量命中/淘汰诊断计数。
- 测试覆盖：
  - 新增测试已覆盖 selector topic / module topic / unknown topic / non-parsable topic 的语义稳定；
  - 未覆盖容量上限与淘汰路径（>1024）的行为。

## 机器人评论处理（PR #74）
- CodeRabbit：`Rate limit exceeded`（未给出具体代码修复建议）。
- github-actions（logix-perf quick）：`status: ok`，`comparable=true`、`regressions=0`。
- Vercel：`api-deployments-free-per-day` 配额失败（外部资源限制，非代码语义问题）。

## CI watcher
- `.context/pr-ci-watch/pr-74-20260224-164046.log`
