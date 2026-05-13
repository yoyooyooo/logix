# Implementation Plan: Platform Layered Map Convergence

**Branch**: `128-platform-layered-map-convergence` | **Date**: 2026-04-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/128-platform-layered-map-convergence/spec.md`

## Summary

本计划把 layered map 第二波收敛拆成三块：

1. layer → code roots → spec owner 的映射
2. implementation / governance / host projection 三条链边界
3. 层级抬升门槛与拒绝条件

## Technical Context

**Language/Version**: Markdown、TypeScript
**Primary Dependencies**: `docs/ssot/platform/01-layered-map.md`, `docs/ssot/platform/README.md`, `specs/122/**`, `specs/123/**`, `specs/124/**`, `packages/logix-core/**`, `packages/logix-react/**`, `packages/logix-form/**`
**Testing**: layer-code-map audit、chain boundary audit、uplift gate audit
**Constraints**: 层级不能为平台叙事抬升；每层必须有代码落点

## Project Structure

```text
specs/128-platform-layered-map-convergence/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/README.md
├── inventory/
│   ├── layer-code-map.md
│   ├── chain-boundaries.md
│   ├── uplift-gate.md
│   └── code-roots.md
└── tasks.md
```
