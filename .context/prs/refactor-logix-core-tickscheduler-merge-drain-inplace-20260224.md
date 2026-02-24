# TickScheduler mergeDrain 原地合并（PR15）

## Branch
- `refactor/logix-core-perf-pr15-tickscheduler-merge-drain-inplace`
- PR: `#82` (https://github.com/yoyooyooo/logix/pull/82)

## 核心改动
- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
  - 将 `mergeDrain` 改为原地合并，避免每轮 fixpoint capture 都 `new Map(base.*)` 复制。
  - 首轮空基线且 `next` 为原生 `Map` 时直接接管引用，减少首轮逐项 `set` 开销。
  - 保持 `priority` 合并策略（`maxPriority`）与 budget/cycle 语义不变。

## 验证
- `pnpm typecheck`
- `pnpm test:turbo`

## 独立审查
- 审查 agent：`019c8fa1-e91c-7e13-8a18-deac6b9dbf64`（只读）
- 结论：`no blocking findings`，建议通过
- open question：建议补充可复现 perf baseline/diff 链接

## 机器人评论处理
- CodeRabbit: 待 PR 创建后拉取评论并回填。
- Vercel: 仅部署额度提示（若出现）按非代码质量事件记录。
