# Implementation Plan: Host Scenario Patterns Convergence

**Branch**: `126-host-scenario-patterns-convergence` | **Date**: 2026-04-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/126-host-scenario-patterns-convergence/spec.md`

## Summary

本计划把 `07` 页面里的 host scenario 第二波收敛拆成三块：

1. scenario → primary example → verification mapping
2. host projection 与 verification subtree 的边界
3. local/session/suspend/process 安装点等宿主变体的归属

## Technical Context

**Language/Version**: TypeScript、React、Markdown
**Primary Dependencies**: `docs/ssot/runtime/07-standardized-scenario-patterns.md`, `packages/logix-react/**`, `packages/logix-sandbox/**`, `examples/logix-react/**`, `examples/logix/**`, `specs/116/**`, `specs/119/**`, `specs/124/**`, `specs/125/**`
**Testing**: scenario anchor audit、projection boundary audit、example-verification route audit
**Constraints**: host projection 不得长出第二真相源；scenario matrix 必须可直接检索

## Project Structure

```text
specs/126-host-scenario-patterns-convergence/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/README.md
├── inventory/
│   ├── scenario-anchor-map.md
│   ├── projection-boundary.md
│   ├── example-verification-routing.md
│   └── variant-ledger.md
└── tasks.md
```
