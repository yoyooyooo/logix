# ModuleRuntime.effects 单 handler 快路径（PR19）

## Branch
- `refactor/logix-core-perf-pr19-effects-single-handler-fastpath`
- PR: `#86` (https://github.com/yoyooyooo/logix/pull/86)

## 核心改动
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.effects.ts`
  - 抽取 `dispatchEntry`，统一 handler 执行与失败诊断逻辑。
  - 当 `entries.length === 1` 时直接 `forkScoped(dispatchEntry(...))`，避免走 `Effect.forEach` 集合调度。
  - 多 handler 仍保留 `Effect.forEach` 路径，语义不变。

## 验证
- `pnpm typecheck`
- `pnpm test:turbo`

## 独立审查
- 审查 agent：`019c8fd7-8499-7f80-859b-1b32a098405f`（只读）
- 结论：`no blocking findings`
- open question：建议补充可复现 perf baseline/diff 链接

## 机器人评论处理
- CodeRabbit: 待 PR 创建后拉取评论并回填。
- Vercel: 仅部署额度提示（若出现）按非代码质量事件记录。
