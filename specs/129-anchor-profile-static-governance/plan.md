# Implementation Plan: Anchor Profile Static Governance

**Branch**: `129-anchor-profile-static-governance` | **Date**: 2026-04-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/129-anchor-profile-static-governance/spec.md`

## Summary

本计划把 anchor / static profile 的第二波收敛拆成三块：

1. static role 保留条件
2. instantiation boundary 与 public mainline 的关系
3. structure owner 与 naming bucket 的分工

## Technical Context

**Language/Version**: Markdown、TypeScript
**Primary Dependencies**: `docs/ssot/platform/02-anchor-profile-and-instantiation.md`, `docs/standards/logix-api-next-postponed-naming-items.md`, `docs/ssot/runtime/01-public-api-spine.md`, `specs/122/**`, `specs/128/**`
**Testing**: static role audit、naming bucket audit、reopen criteria audit
**Constraints**: 只有带 identity / 验证 / 诊断收益的静态角色才可保留；命名后置不替代结构裁决

## Project Structure

```text
specs/129-anchor-profile-static-governance/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/README.md
├── inventory/
│   ├── static-role-ledger.md
│   ├── instantiation-boundary.md
│   ├── naming-bucket-map.md
│   └── reopen-criteria.md
└── tasks.md
```
