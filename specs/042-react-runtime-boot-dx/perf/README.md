# Perf Evidence（042）

## 结论（当前）

- `converge.txnCommit`：`soak` 下 before/after **无回归**（`meta.comparability.comparable=true`，0 regressions / 0 improvements）。
- `react.bootResolve`（策略 A/B，同一代码）：`default` 下点位均为 `ok`（无超时）；相对预算均通过（`yieldStrategy=microtask` 相对 `none`、`keyMode=auto` 相对 `explicit`）。同口径下 `sync` 的 readiness p95 约 `8ms`、`suspend` 的 readiness p95 约 `308ms`（属于策略语义差异：`suspend` 以“让出关键路径 + 允许等待/挂起”换取非阻塞，而不是追求与 `sync` 同量级的就绪耗时）。

## 证据文件

- `converge.txnCommit`（before/after + diff）
  - `specs/042-react-runtime-boot-dx/perf/converge.txnCommit/diff.before.a5fd2ea7.soak.m6ba91af1__after.worktree.soak.m6ba91af1.json`
- `react.bootResolve`（after，含策略矩阵点位与阈值）
  - `specs/042-react-runtime-boot-dx/perf/react.bootResolve/after.worktree.darwin-arm64.m2max.chromium.headless.default.m6ba91af1.json`
