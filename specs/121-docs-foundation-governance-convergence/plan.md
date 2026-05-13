# Implementation Plan: Docs Foundation Governance Convergence

**Branch**: `121-docs-foundation-governance-convergence` | **Date**: 2026-04-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/121-docs-foundation-governance-convergence/spec.md`

## Summary

本计划把 docs foundation 收成唯一治理入口：

1. 先固定根入口与子树 README 的角色网格
2. 再固定 promotion lane、proposal/next 元数据和去向规则
3. 最后把新增 docs cluster 的回写动作与根导航、owner 路由同步规则写清

## Technical Context

**Language/Version**: Markdown、docs governance 文档
**Primary Dependencies**: `docs/README.md`, `docs/ssot/README.md`, `docs/ssot/runtime/README.md`, `docs/ssot/platform/README.md`, `docs/adr/README.md`, `docs/standards/README.md`, `docs/next/README.md`, `docs/proposals/README.md`, `docs/standards/docs-governance.md`, `docs/next/2026-04-05-runtime-docs-followups.md`, `specs/113-docs-runtime-cutover/**`, `specs/120-docs-full-coverage-roadmap/spec-registry.json`, `specs/120-docs-full-coverage-roadmap/spec-registry.md`
**Testing**: root routing audit、promotion lane audit、owner/writeback rule audit
**Target Platform**: docs root governance
**Project Type**: docs planning 特性
**Constraints**: foundation 只承接路由和治理，不替代 leaf SSoT

## Constitution Check

- **Docs-first & SSoT**: PASS。直接承接 docs 根层治理。
- **Quality gates**: PASS。foundation role matrix、promotion lane ledger、writeback rule 是硬门。

## Project Structure

```text
specs/121-docs-foundation-governance-convergence/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── README.md
├── inventory/
│   ├── root-routing-matrix.md
│   ├── promotion-lane-ledger.md
│   └── writeback-rules.md
└── tasks.md
```

## Phase Design

### Deliverable A: Root Routing Matrix

- 根入口角色
- 子树入口角色
- 最短跳转关系
- runtime / platform 子树 owner 路由

### Deliverable B: Promotion Lane Ledger

- proposal / next / ssot / adr / standards 的门槛
- active proposal / next topic 元数据
- 去向说明与当前批次

### Deliverable C: Writeback Rules

- 新增 docs cluster 的回写文件范围
- root/readme/governance 的同步规则
- coverage registry 与 group checklist 的同步规则

## Verification Plan

```bash
rg -n '当前角色|当前入口|当前状态|当前一句话结论|升格门槛|回写动作|owner|target|last-updated|去向' docs/README.md docs/ssot/README.md docs/ssot/runtime/README.md docs/ssot/platform/README.md docs/adr/README.md docs/standards/README.md docs/next/README.md docs/proposals/README.md docs/standards/docs-governance.md docs/next/2026-04-05-runtime-docs-followups.md
```

## Completion Rule

1. foundation 入口矩阵稳定
2. promotion lane 规则稳定
3. writeback rule 稳定
