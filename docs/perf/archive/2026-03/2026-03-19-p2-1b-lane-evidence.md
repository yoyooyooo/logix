# 2026-03-19 · P2-1B lane evidence / 序列语义重映射

## 范围

- 仅补 `P2-1B`：continuation 下的 lane evidence / `txnSeq` / `opSeq` / replay 语义重映射。
- 以前提为准：`P2-1A deferred converge continuation handle` 已在母线吸收。
- 明确不做：
  - 任何新的 converge 优化；
  - `process/**`、`logix-react/src/internal/**`、perf matrix 口径改动。

## 实现

### 1) continuation 序列锚点（lane evidence）

文件：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`

- 在 `runDeferredConvergeFlush(...)` 引入 continuation 序列状态读取与回写：
  - continuation 首个 slice 固化 anchor：`anchorTxnSeq/anchorTxnId/anchorOpSeq`；
  - 每个 slice 记录：`continuationSliceSeq`、`continuationSliceTxnSeq/TxnId/OpSeq`。
- lane evidence anchor 改为 continuation 语义：
  - continuation 存在 anchor 时，`trace:txn-lane` 统一使用该 anchor；
  - slice 级 txn/op 序列保留在 `origin.details`，用于解释链路与 replay 重映射。

### 2) replay 事件重映射（state:update）

文件：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`

- 扩展 continuation handle 序列载体：`RunWithStateTransactionContinuationSequence`。
- 新增 deferred continuation 细节解析与 replay 重映射：
  - 从 `origin.details` 读取 continuation anchor / slice 元数据；
  - 在 `state:update` 提交前对 `replayEvent` 做重映射：
    - 顶层 `txnSeq/txnId` 对齐 continuation anchor；
    - 保留 `continuation.slice` 与 `continuation.sliceWindow` 作为片段级证据。

## 贴边证据

证据文件：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-1b-lane-evidence.before.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-1b-lane-evidence.after.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-1b-lane-evidence.diff.json`

结论摘要：

- `trace:txn-lane` 在 continuation 内保持稳定 anchor（`txnSeq/opSeq`）；
- slice 粒度序列保留且可追溯，不丢证据；
- `state:update.replayEvent` 获得 continuation 级别的 anchor + slice 双层语义。

## 验证

已执行：

1. `pnpm -C packages/logix-core typecheck:test`
2. `pnpm -C packages/logix-core exec vitest run test/internal/observability/TxnLaneEvidence.Schema.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts test/StateTrait/StateTrait.ReplayEventBridge.test.ts`
3. `python3 fabfile.py probe_next_blocker --json`

结果：

- 贴边 lane/replay 用例全绿；
- `probe_next_blocker` 返回 `status: "clear"`，未打红 current probe 队列。

