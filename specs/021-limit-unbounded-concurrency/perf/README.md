# 021 Perf Evidence（复用 014 Runner）

> 目标：为 021 的“并发护栏/默认并发收敛/背压分层”提供可复现的 Before/After 证据，
> 并把判定口径固化到 `specs/021-limit-unbounded-concurrency/perf.md`，避免性能争议与口径漂移。

## 产物约定

- `before.*.json`：改动前基线（Before）。
- `after.*.json`：改动后样本（After）。
- `diff.*.json`：Before/After 对比结果（PerfDiff）。

命名建议沿用 014：`<os>-<arch>.<cpu>.<browser>.<headless>` 作为 `envId`（详见 `specs/014-browser-perf-boundaries/perf.md`）。

## 运行入口（命令模板）

### 1) Before（建议在 Phase 2 前采集）

- diagnostics=off（默认跑道，覆盖 014 的主链路 suite）：
  - `pnpm perf collect:quick -- --out specs/021-limit-unbounded-concurrency/perf/before.worktree.quick.off.json`

### 2) After（改动完成后）

- `pnpm perf collect:quick -- --out specs/021-limit-unbounded-concurrency/perf/after.worktree.quick.off.json`

### 3) Diff（同口径对比）

- `pnpm perf diff -- --before specs/021-limit-unbounded-concurrency/perf/before.worktree.quick.off.json --after specs/021-limit-unbounded-concurrency/perf/after.worktree.quick.off.json --out specs/021-limit-unbounded-concurrency/perf/diff.worktree.off.json`

## Success Criteria ↔ Suite 映射（用于 perf.md 判定）

- NFR-001（diagnostics off ≤2%）：以 014 的 P1/P2 suite diff 为主口径，关注 `thresholdDeltas` 与 `budgetViolations`。
