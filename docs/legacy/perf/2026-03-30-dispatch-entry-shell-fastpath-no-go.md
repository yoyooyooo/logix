# 2026-03-30 · dispatch entry shell fast path no-go

## 目标

基于 `docs/perf/2026-03-30-latest-main-quick-identify-reading.md` 给出的 latest-main 结论，
尝试在 `ModuleRuntime.dispatch.ts` 内为 plain `dispatch` 增加 single-action publish fast path，
验证当前 `dispatch` 专属入口壳是否能用一条很小的实现线拿到稳定收益。

## 本次改动假设

- 不动 `ModuleRuntime.txnQueue.ts`
- 不动 `ModuleRuntime.operation.ts`
- 只收窄 `dispatch` / `dispatchLowPriority` 的单 action publish 路径
- 目标是绕开：
  - `[propagationEntry]` 数组分配
  - `publishActionPropagationBus(...)` 的 shared batch 壳
  - `resolveSharedActionTag(...)`
  - `groupTopicBatches(...)`

## 验证命令

可选：

```sh
export BASELINE_REPO_DIR="${BASELINE_REPO_DIR:-/path/to/logix}"
export AFTER_REPO_DIR="${AFTER_REPO_DIR:-/path/to/logix.worktrees/main.dispatch-entry-shell-cut}"
```

baseline:

```sh
cd "${BASELINE_REPO_DIR}"
LOGIX_PERF_ITERS=1200 LOGIX_PERF_WARMUP=240 pnpm exec vitest run \
  packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchOuterShell.Probe.test.ts
LOGIX_PERF_ITERS=1200 LOGIX_PERF_WARMUP=240 pnpm exec vitest run \
  packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts
```

after:

```sh
cd "${AFTER_REPO_DIR}"
LOGIX_PERF_ITERS=1200 LOGIX_PERF_WARMUP=240 pnpm exec vitest run \
  packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchOuterShell.Probe.test.ts
LOGIX_PERF_ITERS=1200 LOGIX_PERF_WARMUP=240 pnpm exec vitest run \
  packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts
pnpm exec vitest run packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts -t \
  "should publish actions to actionHub \\(dispatch path\\)|dispatchBatch should keep actionHub order and count consistent|trace:txn-phase should retain dispatch phase counters after commit"
```

## 读数

### baseline · `main@299dfafc`

outer probe:

```txt
dispatch.p50=0.068ms
dispatch.p95=0.159ms
queuedSetState.p50=0.050ms
queuedSetState.p95=0.122ms
directTxnSetState.p50=0.044ms
directTxnSetState.p95=0.083ms
dispatchMinusQueued.avg=0.020ms
queuedMinusDirect.avg=0.012ms
```

phase after:

```txt
dispatch.p50=0.087ms
dispatch.p95=0.197ms
residual.avg=0.068ms
```

### after · single-action publish fast path

outer probe:

```txt
dispatch.p50=0.067ms
dispatch.p95=0.166ms
queuedSetState.p50=0.049ms
queuedSetState.p95=0.115ms
directTxnSetState.p50=0.045ms
directTxnSetState.p95=0.099ms
dispatchMinusQueued.avg=0.022ms
queuedMinusDirect.avg=0.004ms
```

phase baseline:

```txt
dispatch.p50=0.085ms
dispatch.p95=0.192ms
residual.avg=0.065ms
```

## 本次裁决

- route classification: `no_go_under_current_boundary`
- 子结论：`dispatch_single_action_publish_fast_path_is_not_stably_positive`

## 原因

1. outer probe 没有给出稳定净收益：
   - `dispatch.p95` 没有持续优于 baseline
   - `dispatchMinusQueued.avg` 也没有形成稳定下降
2. phase baseline 只有很小的改善：
   - `dispatch.p95: 0.197ms -> 0.192ms`
   - `residual.avg: 0.068ms -> 0.065ms`
3. 这说明当前 cut 只拿到了很薄的微基线信号，不足以宣布 `dispatch` 入口壳已经被有效打中。

## 结论

- 这条 single-action publish fast path 不继续升级到 focused/heavier
- 当前实现已回退，不保留到后续分支
- `dispatch` 专属入口壳仍可作为方向保留，但下一轮需要换一个更贴近真实税点的假设

## 下一步建议

1. 若继续深挖 `dispatch` 入口壳，优先改测：
   - `applyPrimaryReducer`
   - `actionCommitHub`
   - topic fanout 是否真是主税
2. 若新的 cheap-local 仍只有这种量级的 mixed signal，直接切到次选：
   - `dirty-evidence coverage -> converge admission`
