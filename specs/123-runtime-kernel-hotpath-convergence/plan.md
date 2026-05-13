# Implementation Plan: Runtime Kernel Hotpath Convergence

**Branch**: `123-runtime-kernel-hotpath-convergence` | **Date**: 2026-04-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/123-runtime-kernel-hotpath-convergence/spec.md`

## Summary

本计划把 hot-path 第二波收敛拆成三块：

1. kernel / shell / control plane 边界账本
2. steady-state exclusions 与 reopen / evidence 规则
3. docs、perf evidence、code roots 的单一回写口径

## Technical Context

**Language/Version**: TypeScript、Markdown、perf evidence json
**Primary Dependencies**: `docs/ssot/runtime/02-hot-path-direction.md`, `packages/logix-core/src/internal/runtime/core/**`, `docs/archive/perf/**`, `specs/115-core-kernel-extraction/**`, `specs/115-core-kernel-extraction/perf/*.json`
**Testing**: kernel boundary audit、perf evidence routing audit、steady-state exclusion audit
**Constraints**: 不新开第二 kernel 目录；证据必须 clean comparable；当前仓库没有 `docs/perf/**` 活跃目录，active 证据默认落在 `specs/<id>/perf/*.json`

## Project Structure

```text
specs/123-runtime-kernel-hotpath-convergence/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/README.md
├── inventory/
│   ├── kernel-zone-map.md
│   ├── steady-state-exclusions.md
│   ├── evidence-routing.md
│   └── reopen-triggers.md
└── tasks.md
```
