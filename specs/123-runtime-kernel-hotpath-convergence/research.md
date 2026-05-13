# Research: Runtime Kernel Hotpath Convergence

## Decision 1: 第二波继续复用 `115` 的 kernel 边界

- `123` 不重开 kernel extraction
- `123` 负责把 hot-path 方向、steady-state exclusions 和 evidence 规则补齐

## Decision 2: archive perf 证据仍作为背景入口

- archive perf 不再做事实源
- 但仍是 hot-path reopen 判定的背景证据池

## Decision 3: active perf 证据落在 spec 自身 `perf/`

- 当前仓库没有 `docs/perf/**` 活跃事实源目录
- clean comparable baseline / diff 默认落在活跃 spec 的 `perf/*.json`
- `115/perf/*.json` 继续作为第二波 hot-path 收敛的可比起点
