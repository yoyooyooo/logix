# Perf: 024 Root Runtime Runner（启动耗时基线）

> 目标：为 `Runtime.runProgram/openProgram` 提供可复现的启动耗时基线证据，验证新增入口相对手写启动（`Runtime.make + runPromise + dispose`）的额外启动耗时预算 ≤ 5%（同机同 Node 版本、取中位数）。
> 运行脚本：`pnpm perf bench:024:boot`

## 运行方式

- 默认：`pnpm perf bench:024:boot`
- 调整迭代次数（建议最少 3 次取中位数）：`ITERS=5000 pnpm perf bench:024:boot`
- 指定输出（推荐）：`pnpm perf bench:024:boot -- --out specs/024-root-runtime-runner/perf/after.worktree.json`

## 证据落点（固定）

- Raw JSON：`specs/024-root-runtime-runner/perf/*.json`
- 解释与对照：本文件（`specs/024-root-runtime-runner/perf.md`）

## 统一口径（必须固定，避免不可对比）

- 对照对象（同负载）：
  - manual：手写 `Runtime.make + runPromise + dispose`
  - new API：`Runtime.runProgram`（以及/或 `Runtime.openProgram` + 手动 close）
- 指标：每次迭代的 wall time（ms）/ nsPerOp（若脚本输出）；同机同 Node 版本对比。
- 输出 JSON 至少包含：
  - `meta.node`、`meta.platform`、`meta.iters`（以及可选 `meta.warmupDiscard`）
  - `results.manual`、`results.runProgram`（每项至少含 `totalMs` 与 `nsPerOp` 或等价字段）

## Baseline（Before / After）

> 本特性每次采集都会在同一份 JSON 内同时输出 `manual` 与 `runProgram`（同负载对照），因此不再强制维护两份“before/after”文件。

### Latest（PASS）

- Raw JSON：`specs/024-root-runtime-runner/perf/after.worktree.json`
- 结论：`runProgram` 相对 `manual` 的额外启动耗时预算 ≤ 5% ✅
  - Node：`v22.21.1`（darwin/arm64）
  - manual：`nsPerOp=1185619.3084`
  - runProgram：`nsPerOp=1187287.4584`
  - overhead：约 `+0.14%`

### Notes

- Bench 需串行执行（避免两个 benchmark 并发互相干扰，导致结果不可复现）。
