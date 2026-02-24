# ModuleRuntime time-slicing dirty paths 去快照分配（PR16）

## Branch
- `refactor/logix-core-perf-pr16-trait-timeslice-dirtypaths-no-array`
- PR: `#83` (https://github.com/yoyooyooo/logix/pull/83)

## 核心改动
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
  - 去掉 `Array.from(txnContext.current.dirtyPathIds)` 中间快照。
  - 改为基于 `dirtyPathIds.size` 判定并直接迭代集合写入 `backlogDirtyPaths`，减少高频事务内存分配。
  - 保持 dirtyAll 优先、deferred flush 入队条件与 degraded 分支行为不变。

## 验证
- `pnpm --filter @logixjs/core typecheck`
- `pnpm --filter @logixjs/core test`
- `pnpm test:turbo`

## 独立审查
- 审查 agent：`019c8fa1-e94b-7811-98c9-525a89544609`（只读）
- 结论：`no blocking findings`
- 非阻塞建议：补一条 field-level patch（非 dirtyAll）测试，直接命中 `dirtyPathIds` 直迭代分支
- open question：建议补充可复现 perf baseline/diff 链接

## 机器人评论处理
- CodeRabbit: 待 PR 创建后拉取评论并回填。
- Vercel: 仅部署额度提示（若出现）按非代码质量事件记录。
