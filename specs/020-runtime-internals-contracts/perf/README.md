# 020 Perf Evidence（复用 014 Runner）

> 目标：为 020 的“Runtime Internals Contracts / Runtime Services 重构”提供可复现的 Before/After 证据，
> 并把判定口径固化到 `specs/020-runtime-internals-contracts/perf.md`，避免性能争议与口径漂移。

## 产物约定

- `before.*.json`：改动前基线（Before）。
- `after.*.json`：改动后样本（After）。
- `diff.*.json`：Before/After 对比结果（PerfDiff）。

命名建议沿用 014：`<os>-<arch>.<cpu>.<browser>.<headless>` 作为 `envId`（详见 `specs/014-browser-perf-boundaries/perf.md`）。

## 运行入口（命令模板）

### 1) Before（进入 Phase 2 前必做）

- diagnostics=off（默认跑道，覆盖 014 的主链路 suite）：
  - `pnpm perf collect:quick -- --out specs/020-runtime-internals-contracts/perf/before.worktree.quick.off.json`
- diagnostics=on（量化诊断开销曲线，聚焦 `diagnostics.overhead.e2e`）：
  - `pnpm perf collect:quick -- --files test/browser/perf-boundaries/diagnostics-overhead.test.tsx --out specs/020-runtime-internals-contracts/perf/before.worktree.quick.on.json`

> 说明：`--files` 路径以 `packages/logix-react/` 为根（与 014 collect 脚本一致）。

### 2) After（改动完成后）

- `pnpm perf collect:quick -- --out specs/020-runtime-internals-contracts/perf/after.worktree.quick.off.json`
- `pnpm perf collect:quick -- --files test/browser/perf-boundaries/diagnostics-overhead.test.tsx --out specs/020-runtime-internals-contracts/perf/after.worktree.quick.on.json`

### 3) Diff（同口径对比）

- `pnpm perf diff -- --before specs/020-runtime-internals-contracts/perf/before.worktree.quick.off.json --after specs/020-runtime-internals-contracts/perf/after.worktree.quick.off.json --out specs/020-runtime-internals-contracts/perf/diff.before.worktree.quick.off__after.worktree.quick.off.json`
- `pnpm perf diff -- --before specs/020-runtime-internals-contracts/perf/before.worktree.quick.on.json --after specs/020-runtime-internals-contracts/perf/after.worktree.quick.on.json --out specs/020-runtime-internals-contracts/perf/diff.before.worktree.quick.on__after.worktree.quick.on.json`

## Success Criteria ↔ Suite 映射（用于 perf.md 判定）

- SC-004（性能不回退，p95/分配/内存预算）：优先看 014 的 P1/P2 suite（如 `watchers.clickToPaint`、`converge.*` 等）在 diff 中的 `thresholdDeltas` 与 `budgetViolations`。
- SC-006（试跑证据/IR 导出可复现且诊断开销可解释）：以 `diagnostics.overhead.e2e` 的对比结果作为“diagnostics=on”成本参考，并在后续 TrialRun 落地后补齐对应 suite/证据字段。
