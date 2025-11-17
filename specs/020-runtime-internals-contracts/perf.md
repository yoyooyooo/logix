# Perf Evidence: Runtime Internals Contracts（020）

> 记录 020 的性能基线（Before）与对比样本（After），用于实现过程中的回归判定与交接。
> 本特性默认复用 014 的采集/对比协议与脚本：`PerfReport` / `PerfDiff`（见 `specs/020-runtime-internals-contracts/perf/README.md`）。

## 环境元信息（必填）

- Date: 2025-12-21
- Git branch / commit: `dev` / `b1babae23eb3bf93c83dfcf55daf79af8d3d68bb`（worktree: dirty）
- OS / arch: darwin / arm64
- CPU / Memory: Apple M2 Max / 64GB
- Node.js: v22.21.1
- pnpm: 9.15.9
- Browser（如适用）: chromium（headless=true）
- Notes（后台负载/电源模式/浏览器版本锁定/是否切换 tab 等）: `VITE_LOGIX_PERF_PROFILE=quick`（runs=10 / warmupDiscard=2 / timeoutMs=8000）

## 运行入口（固定）

- 采集（Before/After）：`pnpm perf collect`（或 `pnpm perf collect:quick`）
  - 自定义输出：`pnpm perf collect -- --out specs/020-runtime-internals-contracts/perf/after.<gitSha>.<envId>.json`
  - 只跑 diagnostics：`pnpm perf collect -- --files test/browser/perf-boundaries/diagnostics-overhead.test.tsx --out ...`
- diff：`pnpm perf diff -- --before <before.json> --after <after.json> --out <diff.json>`

## Raw Evidence（固化文件）

- `specs/020-runtime-internals-contracts/perf/README.md`（命令模板与 SC 映射）
- Before（diagnostics=off）: `specs/020-runtime-internals-contracts/perf/before.worktree.quick.off.json`
- Before（diagnostics=on）: `specs/020-runtime-internals-contracts/perf/before.worktree.quick.on.json`
- After（diagnostics=off）: `specs/020-runtime-internals-contracts/perf/after.worktree.quick.off.json`
- After（diagnostics=on）: `specs/020-runtime-internals-contracts/perf/after.worktree.quick.on.json`
- Diff（diagnostics=off）: `specs/020-runtime-internals-contracts/perf/diff.before.worktree.quick.off__after.worktree.quick.off.json`
- Diff（diagnostics=on）: `specs/020-runtime-internals-contracts/perf/diff.before.worktree.quick.on__after.worktree.quick.on.json`

## Baseline Summary（quick）

- SC-004（性能不回退）：以 `watchers.clickToPaint`（p95<=50ms）与 `converge.txnCommit`（commit.p95<=50ms、auto<=full*1.05）为主判定口径。
  - `watchers.clickToPaint`：p95<=50ms 的 `maxLevel=256`（strictMode=true/false）。
  - `converge.txnCommit`：`auto<=full*1.05` 的 `maxLevel=2000`（矩阵中的各 dirtyRootsRatio）。
- SC-006（试跑证据/IR 导出可解释）：以 `diagnostics.overhead.e2e` 的 comparison 作为诊断开销参考（full/off p95 ratio ≈ 0.886）。

## Diff Summary（待填：改动完成后补齐）

- diagnostics=off: regressions=1, improvements=0, budgetViolations=0
- diagnostics=on: regressions=0, improvements=0, budgetViolations=0
