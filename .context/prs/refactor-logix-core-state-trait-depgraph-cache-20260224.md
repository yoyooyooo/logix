# StateTrait dependency graph 缓存（PR12）

## Branch
- `refactor/logix-core-perf-pr12-state-trait-depgraph-cache`
- PR: `TBD`

## 核心改动
- `packages/logix-core/src/internal/state-trait/graph.ts`
  - 在 `buildDependencyGraph(program)` 增加 `WeakMap` 缓存（`program -> { edgesRef, graph }`）。
  - 当 `program.graph.edges` 引用稳定时复用 `reverseAdj`；引用变化时自动重建。

## 测试覆盖
- `packages/logix-core/test/internal/StateTrait/StateTrait.ScopedValidate.test.ts`
  - 新增缓存命中/失效回归：
    - edges 引用不变 -> 命中缓存；
    - 替换 edges 引用 -> 失效并重建。

## 验证
- `pnpm typecheck`
- `pnpm test:turbo`

## 独立审查
- 本 PR 由独立 worker subagent 在独立 worktree 实施并自验证后提交。
