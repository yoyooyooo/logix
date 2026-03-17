# 2026-03-23 · N-3 runtime-shell attribution contract（implementation line）

## 目标与边界

- worktree：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.n-3-runtime-shell-impl-20260323`
- branch：`agent/v4-perf-n-3-runtime-shell-impl-20260323`
- 唯一目标：按 `docs/perf/2026-03-22-n-3-contract-freeze.md` 为 runtime-shell ledger 增加统一 boundary decision 合同与 attribution summary。
- 写入范围：
  - `packages/logix-core/src/internal/runtime/core/RuntimeShellBoundary.ts`
  - `packages/logix-core/test/internal/Runtime/_perf/runtimeShellLedger.v1.ts`
  - `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.RuntimeSnapshot.ResolveShell.Perf.off.test.ts`
  - `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.TransactionHotContext.Perf.off.test.ts`
  - `specs/103-effect-v4-forward-cutover/perf/runtime-shell.ledger.schema.v1.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-21-n-2-runtime-shell-ledger.example.*`
  - `docs/perf/**`
  - `specs/103-effect-v4-forward-cutover/perf/**`
- 禁区：
  - 不改 public API
  - 不改 `packages/logix-react/**`

## 本轮实现

1. 新增统一内部合同 `RuntimeShellBoundaryDecision`。
- 文件：`packages/logix-core/src/internal/runtime/core/RuntimeShellBoundary.ts`
- 冻结字段：
  - `mode`
  - `reasonCode`
  - `boundaryClass`
  - `reuseKeyHash`
  - `shellRef`
  - `shellSource`

2. 为 ledger summary 增加 attribution 派生层。
- 文件：`packages/logix-core/test/internal/Runtime/_perf/runtimeShellLedger.v1.ts`
- 新增：
  - `summarizeRuntimeShellBoundaryDecisions(...)`
  - `mergeRuntimeShellAttributionMetrics(...)`
- summary 现在可输出：
  - `attribution.reasonShare`
  - `attribution.boundaryClassShare`
  - `attribution.noSnapshotTopReason`

3. `resolveShell.snapshot.off` 样本接入统一 decision。
- `noSnapshot` 样本落 `snapshot_missing + snapshot_blocked + resolveShell.noSnapshot`

4. `operationRunner.txnHotContext.off` 样本接入统一 decision。
- `fallback` 样本落 `middleware_env_mismatch + policy_fallback + operationRunner.fallback`

5. schema 与 example 更新到同一口径。
- `runtime-shell.ledger.schema.v1.json`
- `2026-03-21-n-2-runtime-shell-ledger.example.ledger.v1.ndjson`
- `2026-03-21-n-2-runtime-shell-ledger.example.ledger.summary.v1.json`

## 验证

以下工件已落盘：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-23-n-3-runtime-shell-impl.validation.typecheck.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-23-n-3-runtime-shell-impl.validation.vitest.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-23-n-3-runtime-shell-impl.probe-next-blocker.json`

验证结果：

1. `pnpm -C packages/logix-core typecheck:test`：通过
2. `pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.RuntimeSnapshot.ResolveShell.Perf.off.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.TransactionHotContext.Perf.off.test.ts`：通过
3. `python3 fabfile.py probe_next_blocker --json`：`status=clear`
- 保留既有 soft watch：`externalStore.ingest.tickNotify / full/off<=1.25`
- 未出现新的 hard blocker

## 工件确认

生成的 ledger summary 已包含 attribution：

- `resolveShell.snapshot.off`：
  - `reasonShare.snapshot_missing = 1`
  - `boundaryClassShare.snapshot_blocked = 1`
  - `noSnapshotTopReason = snapshot_missing`
- `operationRunner.txnHotContext.off.batch256`：
  - `reasonShare.middleware_env_mismatch = 1`
  - `boundaryClassShare.policy_fallback = 1`
  - `noSnapshotTopReason = middleware_env_mismatch`

## 结果分类

- `accepted_with_evidence`

理由：

- `N-3` freeze 要求的 boundary decision 合同、reason taxonomy、summary attribution 已实际进入工件链
- schema、example、真实 `.local` ledger summary 三处口径一致
- 最小验证链路与 probe 全绿

## 当前还剩什么

1. 回收到母线时，把 `docs/perf/README.md` 与 `docs/perf/07-optimization-backlog-and-routing.md` 中 `N-3` 更新为 `accepted_with_evidence`。
2. 后续若要继续 runtime-shell 方向，应基于新的 `reasonShare` 决定唯一 nextcut。
