# RuntimeStore listener snapshot cache（PR14）

## Branch
- `refactor/logix-core-perf-pr14-runtime-store-listener-snapshot-cache`
- PR: `TBD`

## 核心改动
- `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
  - 在 `commitTick` 中新增单 topic 快路径：仅一个 dirty topic 时复用 `listenerSnapshot(topic)`，避免 `flatMap + Array.from` 扁平化分配。
  - 多 topic 仍保留原语义路径，保证同 tick 快照隔离与 flush 行为不变。

## 测试覆盖
- `packages/logix-core/test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts`
  - 覆盖单 topic 快路径与多 topic 合并路径，确认快照隔离与回调顺序语义保持。

## 验证
- `pnpm typecheck`
- `pnpm test:turbo`

## 独立审查
- 本 PR 由独立 worker subagent 在独立 worktree 实施并自验证后提交。

## 机器人评论处理
- CodeRabbit: 待 PR 创建后拉取评论并回填。
- Vercel: 仅部署额度提示（若出现）按非代码质量事件记录。
