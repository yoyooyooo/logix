# Contract: Performance & Diagnostics（性能与诊断）

## Performance Budget

- 热路径：`changesReadQueryWithMeta` 的 selector 消费路径。
- 预算目标：默认 profile 下不得引入回归（以 `pnpm perf diff` 为准）。
- 结论硬门：`comparability.comparable=true` 才允许下结论。

## Diagnostics Cost

- `diagnostics=off` 时新增逻辑应接近零成本。
- `diagnostics=light/full` 输出必须 Slim 且可序列化。

## IR / Anchor Consistency

- 构建期报告与运行时 trace 必须对齐：
  - `selectorId`
  - `moduleId`
  - `instanceId`
  - `txnSeq`
- 禁止构建期与运行时出现并行锚点字典。
