# Perf Evidence: Limit Unbounded Concurrency（021）

> 记录 021 的性能基线（Before）与对比样本（After），用于实现过程中的回归判定与交接。
> 本特性默认复用 014 的采集/对比协议与脚本：`PerfReport` / `PerfDiff`（见 `specs/021-limit-unbounded-concurrency/perf/README.md`）。

## 环境元信息（必填）

- Date: 2025-12-22 15:22:59 +0800
- Git branch / commit: `dev` / `c8c182f98a2118cd3c76937baeb41c714ab18abc`（worktree dirty）
  - Before 采样使用 git worktree：`/Users/yoyo/Documents/code/personal/intent-flow-perf-before`（detached HEAD 同 commit）
- OS / arch: Darwin 24.6.0 / arm64
- CPU / Memory: Apple M2 Max / 64GB
- Node.js: v22.21.1
- pnpm: 9.15.9
- Browser（如适用）: Chromium（Playwright 1.57.0，headless）
- Notes（后台负载/电源模式/是否切换 tab 等）: `VITE_LOGIX_PERF_PROFILE=quick` + `NODE_ENV=production`

## 运行入口（固定）

- 采集（Before/After）：`pnpm perf collect -- --out specs/021-limit-unbounded-concurrency/perf/after.worktree.off.json`（快速口径：`pnpm perf collect:quick -- --out specs/021-limit-unbounded-concurrency/perf/after.worktree.quick.off.json`）
  - 自定义输出：`pnpm perf collect:quick -- --out specs/021-limit-unbounded-concurrency/perf/after.<gitSha>.<envId>.json`
- diff：`pnpm perf diff -- --before <before.json> --after <after.json> --out specs/021-limit-unbounded-concurrency/perf/diff.worktree.off.json`

## Raw Evidence（固化文件）

- `specs/021-limit-unbounded-concurrency/perf/README.md`（命令模板与判定口径）
- Before（diagnostics=off）: `specs/021-limit-unbounded-concurrency/perf/before.worktree.quick.off.json`
- After（diagnostics=off）: `specs/021-limit-unbounded-concurrency/perf/after.worktree.quick.off.json`
- Diff（diagnostics=off）: `specs/021-limit-unbounded-concurrency/perf/diff.worktree.off.json`

## Budget Summary（quick）

- NFR-001：diagnostics off 增量开销 ≤ 2%（以 014 diff 的 regressions/budgetViolations 与关键 suite 为准）
  - `diff.summary`: regressions=0 / improvements=7 / budgetViolations=0

## Quality Gates（完成后填写）

- typecheck: PASS（`pnpm -C packages/logix-core typecheck:test`）
- lint: PASS（`pnpm lint`）
- test: PASS（`pnpm -C packages/logix-core test`）
