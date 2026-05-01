# Contracts: Runtime Kernel Hotpath Convergence

## 1. Kernel Zone Contract

- kernel 主落点固定在 `packages/logix-core/src/internal/runtime/core/**`

## 2. Steady-State Contract

- runtime assembly / control plane / process / link 不进入 steady-state 热链路主清单

## 3. Evidence Contract

- hot-path 改动必须带 baseline 或 comparable evidence
- active 证据默认落在 `specs/<id>/perf/*.json`
- archive perf 只作背景入口，不单独支撑新结论
