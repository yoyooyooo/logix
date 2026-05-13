# Perf README: Core Kernel Extraction

## Goal

为后续 `packages/logix-core` 与 `packages/logix-core-ng` 的实际 kernel 化改动提供可对比 perf evidence 路线。

## Baseline Rule

- before / after 必须在同一机器、同一 profile、同一采样参数下收集
- `comparable=false` 时禁止宣称 kernel 化收益

## Collect

```bash
pnpm perf collect -- --profile default --out specs/115-core-kernel-extraction/perf/before.<sha>.<envId>.default.json
pnpm perf collect -- --profile default --out specs/115-core-kernel-extraction/perf/after.<sha|worktree>.<envId>.default.json
```

## Diff

```bash
pnpm perf diff -- --before specs/115-core-kernel-extraction/perf/before...json --after specs/115-core-kernel-extraction/perf/after...json --out specs/115-core-kernel-extraction/perf/diff.before__after.json
```

## Focus

- `RuntimeKernel`
- `ModuleRuntime`
- `StateTransaction`
- `TaskRunner`
- `ProcessRuntime`
- trial / evidence 导出链路的额外税

## Failure Policy

- 若出现 `comparable=false`
- 或观测面字段漂移
- 或 profile / envId 不一致

则当前样本只保留为原始材料，不得作为结论证据。
