# actionsByTag fallback 匹配快路径（PR13）

## Branch
- `refactor/logix-core-perf-pr13-actionsbytag-fallback-fastpath`
- PR: `#80` (https://github.com/yoyooyooo/logix/pull/80)

## 核心改动
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
  - 将 fallback 路径从 `actionTopicTagsOfUnknown(action).includes(tag)` 改为 `actionMatchesTopicTag(action, tag)`。
  - 避免每条 action 分配 tags 数组与 `includes` 扫描。
  - 保持 `_tag/type` OR 语义与 undeclared topic fallback 行为一致。

## 测试覆盖
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`
  - 新增非字符串 `_tag/type` 归一化优先级回归，锁定 fallback 匹配语义。

## 验证
- `pnpm typecheck`
- `pnpm test:turbo`

## 独立审查
- 审查 agent：`019c8f7b-901d-7c91-8f85-7de4198b63ff`（只读审查）
- 结论：`approve`，无阻塞问题（no blocking findings）
- 审查关注点：`ModuleRuntime.impl.ts` fallback 匹配语义 + `ModuleRuntime.test.ts` 回归覆盖
- open question：建议后续补充可复现 perf 基线链接（本 PR 尚未附性能报告）

## 机器人评论处理
- CodeRabbit：已拉取评论（2026-02-24 11:47 UTC），内容为 rate-limit 提示，无有效语义评论；本轮无需代码改动。
- `logix-perf (quick)`：已完成，`status: ok`，无回归。
- Vercel：部署额度限制失败（`api-deployments-free-per-day`），非代码质量问题。
