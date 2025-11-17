# Perf Evidence: 009 事务 IR + Patch/Dirty-set

> 记录 009 变更前后（Before/After）的可复现性能证据与环境元信息。
> 统计口径：每场景运行 30 次、丢弃前 5 次 warmup，报告中位数与 p95。

## 环境元信息（必填）

- Date: 2025-12-16 17:03:38 +0800
- Git branch / commit: 011-upgrade-lifecycle / 402f93d23b571b214c89d672f2fc43c82e9c3948
- OS: macOS 15.6.1 (24G90)
- CPU: Apple M2 Max
- Memory: 64GB
- Node.js: v22.21.1
- pnpm: 9.15.9
- Notes (电源模式/后台负载/浏览器版本等): `NODE_ENV=production`；`INSTRUMENTATION=off`；`RUNS=30`；`WARMUP_DISCARD=5`

## 脚本与场景

- Script: `pnpm perf bench:009:txn-dirtyset`
- Typical scenario: `typical.single-root`（`STEPS=200`，dirtyRoots=1）
- Extreme scenario: `extreme.many-roots`（`STEPS=200`，`EXTREME_DIRTY_ROOTS=40`）

## Before（基线）

| Scenario | Runs | Warmup discard | Median (ms) | P95 (ms) | Notes                |
| -------- | ---: | -------------: | ----------: | -------: | -------------------- |
| Typical  |   30 |              5 |       2.013 |    3.229 | `CONVERGE_MODE=full` |
| Extreme  |   30 |              5 |       3.543 |    4.011 | `CONVERGE_MODE=full` |

## After（对比）

| Scenario | Runs | Warmup discard | Median (ms) | P95 (ms) | Notes                                         |
| -------- | ---: | -------------: | ----------: | -------: | --------------------------------------------- |
| Typical  |   30 |              5 |       0.783 |    1.192 | `CONVERGE_MODE=dirty`                         |
| Extreme  |   30 |              5 |       4.091 |    5.140 | `CONVERGE_MODE=dirty`（触发 `dirtyAll` 降级） |

## 判定与结论

- Regression budget（默认）：关闭诊断（`off`）相对 Before 回归不超过 15%（见 `spec.md`）。
- 如果波动过大不可判定：附加更高 warmup/重复次数的一组补充数据，并记录原因。
