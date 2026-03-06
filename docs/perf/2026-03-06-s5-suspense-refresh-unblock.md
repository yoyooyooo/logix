# 2026-03-06 · S-5：react.strictSuspenseJitter refresh unblock

本刀目标不是继续优化 React/Suspense runtime，而是验证 `react.strictSuspenseJitter` 现在是否仍然是 broad/full collect 的 live blocker。

## 结论

- 不是 live blocker。
- 在主分支环境下，`react.strictSuspenseJitter` 的 browser test 可以直接通过，并能正常产出 `LOGIX_PERF_REPORT`。
- 之前看到的 `Failed to fetch dynamically imported module`，更像是 worktree/browser 首轮依赖预热噪声，而不是当前仓库代码层面的稳定失败。

## 验证

主分支环境复核：
- `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/react-strict-suspense-jitter.test.tsx`
- 结果：通过。
- suite 产出的 `react.strictSuspenseJitter` 阈值全部在 `p95<=100ms` 门内。

补充判断：
- 这条线和 `S-4` 一样，不应再作为 current-head broad/full collect 的默认阻塞项。
- 如果未来再次在 clean/comparable 环境下稳定复现，再单独重开一刀；否则不继续消耗 runtime 改动预算。

## 为什么这次不保留配置改动

- 我曾试探性在 `packages/logix-react/vitest.config.ts` 中加入 `optimizeDeps.include`，用于消除 worktree 首轮依赖预热噪声。
- 但在当前结论下，这不构成仓库主线必须保留的修复：主分支环境已能直接跑通目标 suite。
- 因此该配置试探已回退，不纳入本刀提交。

## 收口

- `S-5` 以 docs/evidence-only 方式关闭。
- 后续 broad/full refresh 若再次阻塞，优先先判别是 worktree 环境噪声、browser 预热噪声，还是仓库代码问题，不要直接把它升级成 runtime 主线。 
