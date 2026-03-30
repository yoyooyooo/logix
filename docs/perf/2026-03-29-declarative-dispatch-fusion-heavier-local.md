# 2026-03-29 · declarative dispatch fusion heavier local confirm

## 目标

用更重一点的本地采样确认 declarative dispatch batching 的 before / after 方向是否稳定。

## before / after

### baseline · `main@2175d0c3`

```json
{
  "fanout1": { "p95Ms": 0.271, "meanMs": 0.235 },
  "fanout8": { "p95Ms": 1.378, "meanMs": 0.681 },
  "fanout32": { "p95Ms": 3.051, "meanMs": 2.181 }
}
```

### after · declarative dispatch batching

```json
{
  "fanout1": { "p95Ms": 0.251, "meanMs": 0.223 },
  "fanout8": { "p95Ms": 0.302, "meanMs": 0.277 },
  "fanout32": { "p95Ms": 0.664, "meanMs": 0.473 }
}
```

## 本次裁决

- route classification: `heavier_local_positive_on_declarative_side`
- 子结论：`same_target_declarative_dispatch_fusion_survives_heavier_local`

## 解读

- `fanout1` 持平
- `fanout8` 与 `fanout32` 继续显著下降
- `fanout32.p95` 从 `3.051ms` 压到 `0.664ms`

这条 declarative side 线现在已经通过了 cheap / focused / heavier 三层本地门。

## 下一步

- 可以把 declarative dispatch fusion 作为第二条并行主线推进
- 仍先停在本地，不直接跳 PR / CI

## 验证命令

可选：

```sh
export WORKTREE_DIR="${WORKTREE_DIR:-../logix.worktrees}"
```

after：

```sh
git worktree add "${WORKTREE_DIR:-../logix.worktrees}/tmp.declarative-after-heavy" -b tmp.declarative-after-heavy agent/main-declarative-dispatch-fusion-v2-20260329
cd "${WORKTREE_DIR:-../logix.worktrees}/tmp.declarative-after-heavy"
pnpm install
LOGIX_PERF_ITERS=80 LOGIX_PERF_WARMUP=20 ./packages/logix-core/node_modules/.bin/vitest run --config packages/logix-core/vitest.perf.config.ts packages/logix-core/test/internal/Runtime/DeclarativeLinkRuntime.sameTargetDispatchBatchFusion.Perf.case.ts
```

baseline：

```sh
git worktree add "${WORKTREE_DIR:-../logix.worktrees}/tmp.declarative-before-heavy" -b tmp.declarative-before-heavy 2175d0c3
cd "${WORKTREE_DIR:-../logix.worktrees}/tmp.declarative-before-heavy"
pnpm install
LOGIX_PERF_ITERS=80 LOGIX_PERF_WARMUP=20 ./packages/logix-core/node_modules/.bin/vitest run --config packages/logix-core/vitest.perf.config.ts packages/logix-core/test/internal/Runtime/DeclarativeLinkRuntime.sameTargetDispatchBatchFusion.Perf.case.ts
```
