# Quickstart: Runtime Kernel Hotpath Convergence

## 1. 先看哪些路径

- `docs/ssot/runtime/02-hot-path-direction.md`
- `packages/logix-core/src/internal/runtime/core/**`
- `docs/archive/perf/**`
- `specs/115-core-kernel-extraction/perf/*.json`

## 2. 先回答哪些问题

1. 这条变更是否命中 steady-state
2. 它属于 kernel、shell 还是 control plane
3. 需要哪类 perf evidence
