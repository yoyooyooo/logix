# 2026-03-21 · N-2 runtime-shell.ledger 最小实现线（Node Vitest ledger 输出切口）

## 结论

- 已在 `packages/logix-core` 的 3 条 Node microbench 用例中接入 `runtime-shell.ledger v1` 落盘。
- ledger 只输出既有 suite 已在使用的聚合指标（summary），同时保留可复现的原始样本（NDJSON）用于离线重算与校验。
- 默认工件落在 `specs/103-effect-v4-forward-cutover/perf/.local/runtime-shell-ledger/`，该目录已通过 `specs/103-effect-v4-forward-cutover/perf/.gitignore` 忽略，避免常规开发把工作区弄脏。

## 运行与产物

最小命令（与验收门一致）：

- `pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts`
- `pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.RuntimeSnapshot.ResolveShell.Perf.off.test.ts`
- `pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.TransactionHotContext.Perf.off.test.ts`

默认输出目录：

- `specs/103-effect-v4-forward-cutover/perf/.local/runtime-shell-ledger/`

可选覆盖：

- `LOGIX_PERF_LEDGER_OUT_DIR=<abs-or-rel-path>`

## 段落对齐（segmentId -> suite）

- `dispatchShell.phases.light`
  - 对齐用例：`ModuleRuntime.dispatchShell.Phases.Perf.light`
  - summary 指标：`dispatch.p50.ms`、`dispatch.p95.ms`、`residual.avg.ms`
- `resolveShell.snapshot.off`
  - 对齐用例：`ModuleRuntime.RuntimeSnapshot.ResolveShell.Perf.off`
  - summary 指标：`noSnapshot.avg.ms`、`snapshot.avg.ms`、`speedup.x`
- `operationRunner.txnHotContext.off.batch{N}`
  - 对齐用例：`ModuleRuntime.operationRunner.TransactionHotContext.Perf.off`
  - summary 指标：`shared.avg.ms`、`fallback.avg.ms`、`speedup.x`

## 验收状态

- 当前裁决：`implementation-ready with evidence`
- 证据入口：`specs/103-effect-v4-forward-cutover/perf/2026-03-21-n-2-runtime-shell-ledger.validation.json`

