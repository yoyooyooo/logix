# 2026-03-29 · non-React fanout fusion focused local compare

## 目标

在 same-target Module-as-Source probe 已证明 target commits 按 `1 / 8 / 32` 线性增长后，补一轮 focused local node compare，确认最小 module-side writeback fusion PoC 是否已经把 route-level 成本压平。

## 场景

- 单个 Source module
- 单个 Target module
- Target 上有 `fanout = 1 / 8 / 32` 个 `externalStore.fromModule(Source, ReadValue)` field
- 单次 `sourceRt.dispatch(set)` 后等待全部 field settle

基准文件：

- `packages/logix-core/test/internal/Runtime/DeclarativeLinkRuntime.sameTargetFanoutFusion.Perf.case.ts`

参数：

- `LOGIX_PERF_ITERS=30`
- `LOGIX_PERF_WARMUP=8`

## before / after

### baseline · `main@d26a8628`

```json
{
  "fanout1": { "p95Ms": 1.765, "meanMs": 1.226 },
  "fanout8": { "p95Ms": 2.383, "meanMs": 1.740 },
  "fanout32": { "p95Ms": 3.917, "meanMs": 3.241 }
}
```

### after · first run

```json
{
  "fanout1": { "p95Ms": 1.674, "meanMs": 1.352 },
  "fanout8": { "p95Ms": 3.117, "meanMs": 1.489 },
  "fanout32": { "p95Ms": 2.023, "meanMs": 1.320 }
}
```

### after · rerun

```json
{
  "fanout1": { "p95Ms": 1.630, "meanMs": 1.274 },
  "fanout8": { "p95Ms": 1.400, "meanMs": 1.153 },
  "fanout32": { "p95Ms": 1.292, "meanMs": 1.222 }
}
```

## 本次裁决

- route classification: `focused_local_positive_on_module_side`
- 子结论：`same_target_module_writeback_fusion_has_real_route_level_gain`

虽然 first run 的 `fanout8.p95` 仍有噪声，但：

- baseline 到 after 的 mean 已明显变平
- rerun 后 `fanout1 / 8 / 32` 的 p95 与 mean 都收敛到近常数
- cheap-local commit-count probe 已经证明这条线确实打掉了 `1 / 8 / 32` 的 target commit 数

所以当前可以把这条 module-side writeback fusion 线，从 `cheap_local_positive_on_module_side` 升到 `focused_local_positive_on_module_side`。

## 当前含义

这条线比 `selector_nonreact_plane_dedupe` 更接近真实 route-level 收益：

- dedupe selector eval 只能打掉一部分成本
- same-target module writeback fusion 直接命中了主导成本

## 下一步建议

- 当前可以把 `nonreact_fanout_writeback_fusion` 升成 post-merge 主实施线
- 下一步优先补 declarative-link side 的同类 cheap-local probe，确认是否需要单独再开一刀
- 在把这条线推进到 PR / CI 之前，仍先留在本地 focused local / heavier local

## 验证命令

after：

```sh
git worktree add ../logix.worktrees/tmp.same-target-after -b tmp.same-target-after agent/main-nonreact-fanout-fusion-probe-20260329
cd ../logix.worktrees/tmp.same-target-after
pnpm install
LOGIX_PERF_ITERS=30 LOGIX_PERF_WARMUP=8 ./packages/logix-core/node_modules/.bin/vitest run --config packages/logix-core/vitest.perf.config.ts packages/logix-core/test/internal/Runtime/DeclarativeLinkRuntime.sameTargetFanoutFusion.Perf.case.ts
```

baseline：

```sh
git worktree add ../logix.worktrees/tmp.same-target-before -b tmp.same-target-before d26a8628
cd ../logix.worktrees/tmp.same-target-before
pnpm install
LOGIX_PERF_ITERS=30 LOGIX_PERF_WARMUP=8 ./packages/logix-core/node_modules/.bin/vitest run --config packages/logix-core/vitest.perf.config.ts packages/logix-core/test/internal/Runtime/DeclarativeLinkRuntime.sameTargetFanoutFusion.Perf.case.ts
```
