# actionsByTag fallback 匹配快路径（PR13）

## Branch
- `refactor/logix-core-perf-pr13-actionsbytag-fallback-fastpath`
- PR: `TBD`

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
- 本 PR 由独立 worker subagent 在独立 worktree 实施并自验证后提交。

## 机器人评论处理
- CodeRabbit: 待 PR 创建后拉取评论并回填。
- Vercel: 仅部署额度提示（若出现）按非代码质量事件记录。
