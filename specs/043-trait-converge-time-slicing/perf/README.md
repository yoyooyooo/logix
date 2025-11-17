# 043 Trait 收敛 time-slicing · Perf Evidence

本目录用于存放本特性的性能证据工件（`collect`/`diff` 产物），以便对比、回归与交接。

## 基准入口

- Browser perf-boundary：`packages/logix-react/test/browser/perf-boundaries/converge-time-slicing.test.tsx`

## 采集与对比（建议流程）

> 说明：具体 profile/envId/out 文件命名以实际采集环境为准；原则是 **before/after 同环境、同 profile、同采样参数**。

- 采集 before：`pnpm perf collect -- --profile default --out specs/043-trait-converge-time-slicing/perf/before.<worktree>.<envId>.default.json --files packages/logix-react/test/browser/perf-boundaries/*time-slicing*`
- 采集 after：`pnpm perf collect -- --profile default --out specs/043-trait-converge-time-slicing/perf/after.<worktree>.<envId>.default.json --files packages/logix-react/test/browser/perf-boundaries/*time-slicing*`
- 生成 diff：`pnpm perf diff -- --before <before.json> --after <after.json> --out specs/043-trait-converge-time-slicing/perf/diff.<before>__<after>.json`

## 关键指标

- `runtime.txnCommitMs`：单次操作窗口提交耗时（p95），用于对比 time-slicing `on/off` 的收益与是否出现长尾回归。

