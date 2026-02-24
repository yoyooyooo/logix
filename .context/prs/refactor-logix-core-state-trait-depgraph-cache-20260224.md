# StateTrait dependency graph 缓存（PR12）

## Branch
- `refactor/logix-core-perf-pr12-state-trait-depgraph-cache`
- PR: #79 (https://github.com/yoyooyooo/logix/pull/79)
- CI watcher: `.context/pr-ci-watch/pr-79-20260224-185448.log`

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
- 独立只读审查结论：无 blocker。
- non-blocker 建议：可后续加强 `edges` 同引用原地变更场景约束（补测试或 build 阶段冻结）。

## 机器人评论消化
- CodeRabbit：当前为 rate-limit 提示（无有效语义评论）。
- `logix-perf (quick)`：已完成且 `status: ok`。
- Vercel：免费额度限制失败（非代码语义问题）。
