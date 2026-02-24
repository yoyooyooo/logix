# TickScheduler capture 合并原地化（PR9）

## Branch
- `refactor/logix-core-perf-pr9-tickscheduler-drain-inplace`
- PR: `TBD`

## 核心改动
- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
  - 将 capture 阶段 `mergeDrain` 由“返回新对象 + Map clone”改为 `mergeDrainInPlace` 原地合并。
  - 保持语义：同 `moduleInstanceKey` 仍以最新 commit 为主体，`priority` 仍按 `maxPriority` 提升。
  - 仅在需要提升 priority 时才新建 commit 对象，避免每次合并无意义分配。

## 测试覆盖
- `packages/logix-core/test/internal/Runtime/TickScheduler.fixpoint.test.ts`
  - 新增跨 drain rounds 同 key 合并语义回归：
    - state 取最新 commit；
    - topic priority 取最大值（`low + normal => normal`）。

## 验证
- `pnpm typecheck`
- `pnpm test:turbo`

## 独立审查
- 本 PR 由独立 worker subagent 在独立 worktree 实施并自验证后提交。
