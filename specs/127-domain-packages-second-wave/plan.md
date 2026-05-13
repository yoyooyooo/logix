# Implementation Plan: Domain Packages Second Wave

**Branch**: `127-domain-packages-second-wave` | **Date**: 2026-04-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/127-domain-packages-second-wave/spec.md`

## Summary

本计划把 domain package 的第二波收敛拆成三块：

1. existing package role ledger
2. helper / facade / command boundary ledger
3. future domain package admission ledger

## Technical Context

**Language/Version**: TypeScript、Markdown
**Primary Dependencies**: `docs/ssot/runtime/08-domain-packages.md`, `packages/logix-query/**`, `packages/i18n/**`, `packages/domain/**`, `packages/logix-form/**`, `specs/117/**`, `specs/122/**`, `specs/124/**`
**Testing**: role audit、helper boundary audit、admission rule audit
**Constraints**: 只允许 `service-first / program-first`；不允许第二 runtime / DI / 事务面

## Project Structure

```text
specs/127-domain-packages-second-wave/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/README.md
├── inventory/
│   ├── package-role-ledger.md
│   ├── helper-boundary.md
│   ├── admission-matrix.md
│   └── future-package-template.md
└── tasks.md
```
