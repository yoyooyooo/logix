# 2026-03-29 · non-React fanout fusion heavier local confirm

## 目标

在 same-target module-side writeback fusion 已拿到 focused local 正向后，用更重的本地采样再次确认 before / after 方向是否稳定。

## 参数

- `LOGIX_PERF_ITERS=80`
- `LOGIX_PERF_WARMUP=20`
- benchmark:
  - `packages/logix-core/test/internal/Runtime/DeclarativeLinkRuntime.sameTargetFanoutFusion.Perf.case.ts`

## before / after

### baseline · `main@d26a8628`

```json
{
  "fanout1": { "p95Ms": 1.528, "meanMs": 1.238 },
  "fanout8": { "p95Ms": 2.493, "meanMs": 1.896 },
  "fanout32": { "p95Ms": 5.005, "meanMs": 3.377 }
}
```

### after · module-side writeback fusion

```json
{
  "fanout1": { "p95Ms": 1.546, "meanMs": 1.267 },
  "fanout8": { "p95Ms": 2.027, "meanMs": 1.418 },
  "fanout32": { "p95Ms": 1.498, "meanMs": 1.291 }
}
```

## 本次裁决

- route classification: `heavier_local_positive_on_module_side`
- 子结论：`same_target_module_writeback_fusion_survives_heavier_local`

解释：

- `fanout1` 基本持平，说明 baseline latency 没被明显拉坏
- `fanout8` 与 `fanout32` 都明显下降
- 尤其 `fanout32` 的 `p95` 从 `5.005ms` 压到 `1.498ms`

所以这条线已经不只是 focused local 的噪声正向，而是通过了更重一点的本地确认。

## 当前含义

`nonreact_fanout_writeback_fusion` 现在是当前 post-merge 里最强的实施线：

- cheap local 正向
- focused local 正向
- heavier local 也正向

## 下一步建议

- 可以把这条线作为当前 post-merge 主实施线继续推进
- 仍先停在本地，不直接上 PR / CI
- 下一步更合适的是：
  - 补 declarative-link side 的 cheap / focused probe
  - 或开始考虑如何把当前这条线回收到主分支候选里

## 验证命令

after：

```sh
git worktree add ../logix.worktrees/tmp.same-target-after-heavy -b tmp.same-target-after-heavy agent/main-nonreact-fanout-fusion-probe-20260329
cd ../logix.worktrees/tmp.same-target-after-heavy
pnpm install
LOGIX_PERF_ITERS=80 LOGIX_PERF_WARMUP=20 ./packages/logix-core/node_modules/.bin/vitest run --config packages/logix-core/vitest.perf.config.ts packages/logix-core/test/internal/Runtime/DeclarativeLinkRuntime.sameTargetFanoutFusion.Perf.case.ts
```

baseline：

```sh
git worktree add ../logix.worktrees/tmp.same-target-before-heavy -b tmp.same-target-before-heavy d26a8628
cd ../logix.worktrees/tmp.same-target-before-heavy
pnpm install
LOGIX_PERF_ITERS=80 LOGIX_PERF_WARMUP=20 ./packages/logix-core/node_modules/.bin/vitest run --config packages/logix-core/vitest.perf.config.ts packages/logix-core/test/internal/Runtime/DeclarativeLinkRuntime.sameTargetFanoutFusion.Perf.case.ts
```
