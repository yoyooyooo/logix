# 2026-03-26 v4 state-txn minimal closeout manifest

## 最小提交面

代码：

- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`

patch 工件：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-26-state-transaction-closeout.patch`

当前 patch 规模：

- `1 file changed, 95 insertions(+), 31 deletions(-)`

## 必带 dated docs / evidence

- `specs/103-effect-v4-forward-cutover/perf/2026-03-26-v4-state-txn-cut-reading.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-26-v4-state-txn-soak-win-reading.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-26-v4-state-txn-push-closeout.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-26-v4-state-txn-minimal-closeout-manifest.md`

支撑工件：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-26-converge-steps.after.debug-state-txn-snapshot-reuse.local.darwin-arm64.soak.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-26-converge-steps.main-vs-debug-state-txn-snapshot-reuse.local.darwin-arm64.soak.same-matrix.diff.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-26-converge-steps.v4currentbest-rerun-vs-debug-state-txn-snapshot-reuse.local.darwin-arm64.soak.diff.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-26-traitConverge-node.band-075-080.before.main.quick.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-26-traitConverge-node.band-075-080.after.state-txn-snapshot-reuse.local.quick.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-26-traitConverge-node.band-075-080.clean-v4perf-vs-state-txn-snapshot-reuse.local.quick.diff.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-26-traitConverge-node.band-075-080.after.state-txn-snapshot-reuse-rerun.local.quick.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-26-traitConverge-node.band-075-080.clean-v4perf-vs-state-txn-snapshot-reuse-rerun.local.quick.diff.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-26-traitConverge-node.1600-080.single.before.clean-v4perf.quick.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-26-traitConverge-node.1600-080.single.after.local.quick.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-26-traitConverge-node.1600-080.single.clean-v4perf-vs-local.quick.diff.json`

## 当前不纳入最小提交面

以下文件仍然在 debug worktree 中保留 active diff，但当前没有被证明必须随 closeout 一起提交：

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`
- `packages/logix-core/src/internal/state-trait/converge-in-transaction.impl.ts`

控制面文档：

- `docs/perf/README.md`
- `docs/perf/07-optimization-backlog-and-routing.md`

说明：

- 这 5 个文件当前属于“可选跟随项 / 待单独裁决项”
- push 前若要追求最小提交面，应优先只带 `StateTransaction.ts + dated docs/evidence`

## 本轮边界复核

本轮边界复核只取最小必要集合：

1. focused node
2. 已完成的 targeted soak

focused node 命令：

- `pnpm -C .codex/skills/logix-perf-evidence bench:traitConverge:node -- --matrix specs/103-effect-v4-forward-cutover/perf/2026-03-26-converge-band-075-080.node-matrix.json --profile quick --out specs/103-effect-v4-forward-cutover/perf/2026-03-26-traitConverge-node.band-075-080.after.state-txn-snapshot-reuse.local.quick.json`

targeted soak 工件：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-26-converge-steps.after.debug-state-txn-snapshot-reuse.local.darwin-arm64.soak.json`

当前边界复核结论：

- focused node 相对 clean `v4-perf` baseline 已基本贴平
- targeted soak 相对 `main` 已 `regressions=0`

fresh 复核补充：

- focused node rerun 仍保持大体贴平
- 单点 `1600 @ 0.8` 再拆单点矩阵后恢复稳定：
  - `full p95 1.310 -> 1.013`
  - `auto p95 1.026 -> 1.038`
  - 单点 diff `summary.regressions=0`
