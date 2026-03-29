# 2026-03-29 · declarative dispatch fusion focused local compare

## 目标

在 latest `main` 基线下，验证 same-target declarative dispatch batching 是否已经形成 route-level 正收益。

## before / after

### baseline · `main@2175d0c3`

```json
{
  "fanout1": { "p95Ms": 0.421, "meanMs": 0.282 },
  "fanout8": { "p95Ms": 1.827, "meanMs": 0.802 },
  "fanout32": { "p95Ms": 3.124, "meanMs": 2.500 }
}
```

### after · declarative dispatch batching

```json
{
  "fanout1": { "p95Ms": 0.476, "meanMs": 0.309 },
  "fanout8": { "p95Ms": 0.913, "meanMs": 0.351 },
  "fanout32": { "p95Ms": 0.615, "meanMs": 0.562 }
}
```

## 本次裁决

- route classification: `focused_local_positive_on_declarative_side`
- 子结论：`same_target_declarative_dispatch_fusion_has_real_route_level_gain`

## 解读

- `fanout1` 基本持平
- `fanout8` 与 `fanout32` 明显下降
- `fanout32.p95` 从 `3.124ms` 压到 `0.615ms`

这说明 declarative side 的主导成本确实是 per-target dispatch 壳。

## 验证命令

after：

```sh
git worktree add ../logix.worktrees/tmp.declarative-after -b tmp.declarative-after agent/main-declarative-dispatch-fusion-v2-20260329
cd ../logix.worktrees/tmp.declarative-after
pnpm install
LOGIX_PERF_ITERS=30 LOGIX_PERF_WARMUP=8 ./packages/logix-core/node_modules/.bin/vitest run --config packages/logix-core/vitest.perf.config.ts packages/logix-core/test/internal/Runtime/DeclarativeLinkRuntime.sameTargetDispatchBatchFusion.Perf.case.ts
```

baseline：

```sh
git worktree add ../logix.worktrees/tmp.declarative-before -b tmp.declarative-before 2175d0c3
cd ../logix.worktrees/tmp.declarative-before
pnpm install
LOGIX_PERF_ITERS=30 LOGIX_PERF_WARMUP=8 ./packages/logix-core/node_modules/.bin/vitest run --config packages/logix-core/vitest.perf.config.ts packages/logix-core/test/internal/Runtime/DeclarativeLinkRuntime.sameTargetDispatchBatchFusion.Perf.case.ts
```
