# Perf Evidence: 011 Lifecycle 全面升级

> 记录 011 变更前后（Before/After）的可复现性能证据与环境元信息。
> 统计口径：每场景运行 50 次、丢弃前 10 次 warmup，报告中位数与 p95。
> 运行脚本：`pnpm perf bench:011:lifecycle`（会写入证据文件，并在门槛不通过时退出失败）。

## 环境元信息（必填）

- Date: 2025-12-16T17:49:11+08:00
- Git branch / commit: 011-upgrade-lifecycle / 402f93d2（含未提交本地改动）
- OS: macOS 15.6.1 (24G90) / darwin arm64
- CPU: Apple M2 Max
- Memory: 64 GB
- Node.js: v22.21.1
- pnpm: 9.15.9
- Notes (电源模式/后台负载/浏览器版本等):

## 脚本与场景

- Script: `pnpm perf bench:011:lifecycle`
- Raw evidence（由脚本写入）: `specs/011-upgrade-lifecycle/perf/after.worktree.json`
  - `modes[].mode=off|on`：
    - `off`：不启用 DevtoolsHub（最小观测开销）
    - `on`：启用 DevtoolsHub(diagnosticsLevel=light)（代表“诊断开启”）
  - 关注指标：
    - `createInitMs`: “构造 + init 门禁完成”耗时
    - `destroyMs`: “dispose + destroy 清理”耗时
  - Gate：脚本内置 off/on 两档门槛断言，详见 `after.worktree.json.meta.budgets` 与 `gate.*`。

## Before（基线）

> 旧版 lifecycle 语义与 011 不可直接对比：旧实现中 `$.lifecycle.onInit` 属于 run-only 且在 run fiber 中执行，
> 不会阻塞 “yield* Module” 的返回；011 把 `onInit` 改为 setup-only 注册 + 由 ModuleRuntime 在 init 门禁中执行（blocking）。
> 因此同一脚本在旧实现上无法给出等价口径的 create+init 数据，这里保留空表位以避免误读。

| Scenario | Runs | Warmup discard | Create+Init Median (ms) | Create+Init P95 (ms) | Destroy Median (ms) | Destroy P95 (ms) | Notes |
|---|---:|---:|---:|---:|---:|---:|---|
| empty | 50 | 10 |  |  |  |  |  |
| init+destroy(light) | 50 | 10 |  |  |  |  |  |
| init+destroy(medium) | 50 | 10 |  |  |  |  |  |

## After（同机对照：off vs on）

> 数据来源：`specs/011-upgrade-lifecycle/perf/after.worktree.json`（由脚本写入）。

| Mode | Scenario | Runs | Warmup discard | Create+Init Median (ms) | Create+Init P95 (ms) | Destroy Median (ms) | Destroy P95 (ms) | Notes |
|---|---|---:|---:|---:|---:|---:|---:|---|
| off | empty | 50 | 10 | 4.165 | 5.969 | 3.834 | 5.964 |  |
| off | init+destroy(light) | 50 | 10 | 5.075 | 6.885 | 3.427 | 4.937 |  |
| off | init+destroy(medium) | 50 | 10 | 6.025 | 7.489 | 3.206 | 4.992 |  |
| on | empty | 50 | 10 | 5.499 | 7.345 | 4.422 | 7.262 |  |
| on | init+destroy(light) | 50 | 10 | 5.928 | 7.752 | 4.191 | 6.739 |  |
| on | init+destroy(medium) | 50 | 10 | 6.954 | 8.958 | 3.712 | 6.159 |  |

## 判定与结论

- Gate（默认）：off/on 两档门槛（可通过环境变量覆盖，见脚本顶部的 `*_MAX_MS` / `*_RATIO_MAX`）。
- Regression budget（补充说明）：跨版本 Before/After 的可比口径需要单独建立基线；本文件先以“同机同脚本”的 off/on 两档门槛作为回归防线。
- 如果波动过大不可判定：附加更高 warmup/重复次数的一组补充数据，并记录原因。
