# Implementation Plan: Form Field-Kernel Second Wave

**Branch**: `125-form-field-kernel-second-wave` | **Date**: 2026-04-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/125-form-field-kernel-second-wave/spec.md`

## Summary

本计划把 Form 第二波收敛拆成三块：

1. Form DSL 与 field-kernel 的能力边界账本
2. 顶层入口、commands、logic family、direct API 的分层账本
3. naming fallout 与 docs/examples/tests/package boundary 的统一口径

## Technical Context

**Language/Version**: TypeScript、React、Markdown
**Primary Dependencies**: `docs/ssot/runtime/06-form-field-kernel-boundary.md`, `packages/logix-form/**`, `packages/logix-core/**`, `packages/logix-react/**`, `examples/logix/**`, `examples/logix-react/**`, `specs/117-domain-package-rebootstrap/**`, `specs/122/**`, `specs/123/**`, `specs/124/**`
**Testing**: boundary audit、entry surface audit、naming fallout audit
**Constraints**: Form DSL 持续压缩；field-kernel 保持底层能力面；不让 `derived / rules` 顶层心智回流

## Project Structure

```text
specs/125-form-field-kernel-second-wave/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/README.md
├── inventory/
│   ├── boundary-map.md
│   ├── authoring-surface-matrix.md
│   ├── package-entry-ledger.md
│   └── naming-fallout.md
└── tasks.md
```
