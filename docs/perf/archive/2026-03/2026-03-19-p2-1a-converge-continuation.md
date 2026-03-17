# 2026-03-19 · P2-1A deferred converge continuation handle

## 范围

- 仅实现 `P2-1A deferred converge continuation handle`。
- 目标：在 deferred converge 分片路径复用 transaction prelude 的热上下文，减少每个 slice 重复入壳的固定税。
- 明确不做：
  - `P2-1B` 的 lane evidence 语义重映射；
  - `txnSeq/opSeq/replay` 粒度改写；
  - `SelectorGraph`、`process/**`、`logix-react internal` 相关改动。

## 实现

### 1) transaction continuation handle（核心）

文件：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`

- 新增 `RunWithStateTransactionContinuationHandle`，包含：
  - `id`
  - `phaseDiagnosticsLevel`
  - `txnEntryHotContext`
- 新增：
  - `createRunWithStateTransactionContinuationHandle()`
  - `runWithStateTransactionWithContinuationHandle(...)`
- `runWithStateTransaction` 保持原入口不变，内部收敛到 `runWithStateTransactionInternal(...)`。
- continuation handle 启用时复用 `captureTxnEntryHotContext(...)` 的结果，避免 deferred 多 slice 重复做热上下文捕获。

### 2) deferred flush 接线

文件：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`

- `runDeferredConvergeFlush(...)` 新增 `continuationHandle` 可选参数。
- 在 `origin.details` 增加 `continuationId`，用于后续排查与证据串联。
- 在 `txnLanes.enabled` 的 deferred slicing 分支中：
  - 每轮 flush 创建一次 continuation handle；
  - 每个 slice 调用 `runWithStateTransactionWithContinuationHandle(...)`，复用同一个 handle。
- 增加实验开关：`LOGIX_DEFERRED_CONVERGE_CONTINUATION=0` 可关闭 continuation，便于同分支 A/B 取证。

## 贴边证据

证据文件：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-1a-converge-continuation.before.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-1a-converge-continuation.after.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-1a-converge-continuation.diff.json`

采集口径：

- 同一条 core microbench：
  - `test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.HotSnapshot.Perf.off.test.ts`
- before：`LOGIX_DEFERRED_CONVERGE_CONTINUATION=0`
- after：默认开启 continuation
- 参数一致：`LOGIX_PERF_ITERS=160 LOGIX_PERF_WARMUP=30`

结果摘要：

- 正向：
  - `settle.avg: 5.329ms -> 4.512ms`（`-0.817ms`, ratio `0.8467`）
  - `settle.p95: 6.138ms -> 5.392ms`（`-0.746ms`, ratio `0.8785`）
- 负向：
  - `return.avg/p95` 在该 quick 样本有轻微回升（见 diff 文件）。

结论：

- 该切口具备可证伪证据，且存在明确正向收益点（deferred backlog settle）。
- 收益呈混合态，后续可在 `P2-1B` 或下一刀补 lane evidence 与 replay 语义后再做更严口径复测。

## 验证

已执行：

1. `pnpm -C packages/logix-core typecheck:test`
2. `pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts test/internal/observability/TxnLaneEvidence.Schema.test.ts`
3. `LOGIX_DEFERRED_CONVERGE_CONTINUATION=0 LOGIX_PERF_ITERS=160 LOGIX_PERF_WARMUP=30 pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.HotSnapshot.Perf.off.test.ts`
4. `LOGIX_PERF_ITERS=160 LOGIX_PERF_WARMUP=30 pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.HotSnapshot.Perf.off.test.ts`

待最终门禁：

- `python3 fabfile.py probe_next_blocker --json`
