# Implementation Plan: Runtime Public Authoring Convergence

**Branch**: `122-runtime-public-authoring-convergence` | **Date**: 2026-04-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/122-runtime-public-authoring-convergence/spec.md`

## Summary

本计划把公开主链与 canonical authoring 的第二波收敛拆成三块：

1. surviving / expert / legacy exit 分类
2. canonical authoring 与 logic composition 统一口径
3. SSoT、canonical examples、exports、generators 的公开叙事对齐

## Technical Context

**Language/Version**: TypeScript、Markdown、workspace packages
**Primary Dependencies**: `docs/ssot/runtime/01-public-api-spine.md`, `docs/ssot/runtime/03-canonical-authoring.md`, `docs/ssot/runtime/05-logic-composition-and-override.md`, `docs/adr/2026-04-04-logix-api-next-charter.md`, `docs/standards/logix-api-next-guardrails.md`, `packages/logix-core/**`, `examples/logix/**`, `examples/logix-react/**`
**Testing**: public surface audit、canonical examples audit、exports audit、generator/codegen route audit
**Constraints**: 不允许第二公开相位对象；`Program.make(Module, config)` 唯一；`process` 留在 expert family；`apps/docs/**` 本轮 deferred

## Constitution Check

- **Docs-first & SSoT**: PASS
- **Public submodules / decomposition**: PASS
- **Breaking changes**: PASS

## Project Structure

```text
specs/122-runtime-public-authoring-convergence/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/README.md
├── inventory/
│   ├── public-surface-ledger.md
│   ├── expert-surface-ledger.md
│   ├── legacy-exit-ledger.md
│   └── docs-examples-exports-matrix.md
└── tasks.md
```

## Verification Plan

```bash
rg -n 'Program\\.make|Runtime\\.make|logics: \\[\\]|process|expert|implement\\(' docs/ssot/runtime/01-public-api-spine.md docs/ssot/runtime/03-canonical-authoring.md docs/ssot/runtime/05-logic-composition-and-override.md docs/standards/logix-api-next-guardrails.md examples/logix examples/logix-react packages/logix-core/src
```
