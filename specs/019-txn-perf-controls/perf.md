# Perf Evidence: 事务性能控制（019）

> 记录 019 的性能基线（Before）与对比样本（After），用于实现过程中的回归判定与交接。
> 本特性默认复用 014 的采集/对比协议与脚本：`PerfReport` / `PerfDiff`。

## 环境元信息（必填）

- Date: 2025-12-21
- Git branch / commit: `019-txn-perf-controls` / `534dfd33408e18194be65e58c38d8daebb01369a`（worktree: dirty）
- OS / arch: macOS 15.6.1 / Darwin arm64
- CPU / Memory: Apple M2 Max / 64GB
- Node.js: v22.21.1
- pnpm: 9.15.9
- Browser（如适用）: chromium（headless=true, playwright=1.57.0）
- Notes（后台负载/电源模式/浏览器版本锁定/是否切换 tab 等）: N/A

## 运行入口（固定）

- 采集（After）：`pnpm perf collect -- --out specs/019-txn-perf-controls/perf/after.worktree.json`（快速口径：`pnpm perf collect:quick -- --out specs/019-txn-perf-controls/perf/after.worktree.quick.json`）
  - 自定义输出：`pnpm perf collect -- --out specs/019-txn-perf-controls/perf/after.<gitSha>.<envId>.json`
- diff：`pnpm perf diff -- --before <before.json> --after <after.json>`
  - 自定义输出：`pnpm perf diff -- --before <before.json> --after <after.json> --out specs/019-txn-perf-controls/perf/diff.<before>__<after>.json`

> 说明：本特性复用 014 的 collect/diff 脚本；通过 `--out` 把证据落盘到本目录。需要只跑子集时用 `--files <path>`。

## Raw Evidence（固化文件）

- `specs/019-txn-perf-controls/perf/README.md`（SC 映射与命令模板）
- Before: `specs/019-txn-perf-controls/perf/before.402f93d2.darwin-arm64.m2max.chromium.headless.json`（复用 014 基线）
- After: `specs/019-txn-perf-controls/perf/after.worktree.quick.json`
- Diff: `specs/019-txn-perf-controls/perf/diff.before.402f93d2__after.worktree.quick.json`

> 命名建议：envId 参考 `specs/014-browser-perf-boundaries/perf.md`；同一份 Before/After 对照必须同机同配置（同 envId）。

## Diff Summary（quick）

- summary: regressions=2, improvements=17, budgetViolations=0
- 主要改进：`converge.txnCommit`（before 的 `convergeMode=auto` 为未实现 → after 已实现，且多处阈值上界提升）
- 主要回退：`watchers.clickToPaint` 的 `p95<=16ms` 边界（maxLevel 下降；详见 diff 文件中的 `thresholdDeltas`）

## 质量门（交接必填）

- `pnpm typecheck`: PASS（scoped: `@logix/core` + `@logix/react`）@ 2025-12-21 12:48 +0800
  - `pnpm -C packages/logix-core typecheck:test` ✅
  - `pnpm -C packages/logix-react typecheck` ✅
- `pnpm lint`: PASS（scoped: `@logix/react`）@ 2025-12-21 12:48 +0800
  - `pnpm -C packages/logix-react lint` ✅
- `pnpm test`: PASS（scoped: `@logix/core` + `@logix/react`）@ 2025-12-21 12:48 +0800
  - `pnpm -C packages/logix-core test` ✅
  - `pnpm -C packages/logix-react test -- --project unit` ✅
  - `pnpm -C packages/logix-react test -- --project browser` ✅

> 说明：根级 `pnpm typecheck/lint/test` 会被 examples/并行实验分支的非 019 改动噪声影响；本次按 019 主线交付范围仅对核心链路包执行质量门。
