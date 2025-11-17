# Acceptance: 030 · Packages 对外子模块裁决与结构治理

**Feature**: `specs/030-packages-public-submodules/spec.md`  
**Date**: 2025-12-25  
**Result**: PASS

## Checklist Gate

- `specs/030-packages-public-submodules/checklists/requirements.md`：PASS（16/16）

## Quality Gates

- PASS：`pnpm typecheck`
- PASS：`pnpm lint`
- PASS：`pnpm verify:public-submodules`
- PASS：`pnpm test`

## Coded Points Inventory

- 19 个编码点（definitions）：8×FR、6×NFR、5×SC
- 无重复定义、无孤儿引用

## Acceptance Matrix（按 spec.md 编码点逐条对照）

### Functional Requirements

- **FR-001** PASS  
  Evidence：`specs/030-packages-public-submodules/contracts/public-submodules.md`
- **FR-002** PASS  
  Evidence：`specs/030-packages-public-submodules/contracts/public-submodules.md`、`specs/030-packages-public-submodules/contracts/exports-policy.md`、`specs/030-packages-public-submodules/contracts/internal-structure.md`、`scripts/public-submodules/verify.ts`
- **FR-003** PASS  
  Evidence：`specs/030-packages-public-submodules/contracts/gap-report.md`
- **FR-004** PASS  
  Evidence：`specs/030-packages-public-submodules/contracts/migration.md`、`specs/030-packages-public-submodules/tasks.md`
- **FR-005** PASS  
  Evidence：`scripts/public-submodules/verify.ts`、`scripts/public-submodules/verify.test.ts`、`package.json`
- **FR-006** PASS  
  Evidence：`specs/030-packages-public-submodules/contracts/public-submodules.md`
- **FR-007** PASS  
  Evidence：`specs/030-packages-public-submodules/contracts/public-submodules.md`、`scripts/public-submodules/verify.ts`
- **FR-008** PASS  
  Evidence：`specs/030-packages-public-submodules/contracts/exports-policy.md`、`scripts/public-submodules/verify.ts`

### Non-Functional Requirements

- **NFR-001** PASS（guardrail）  
  Evidence：`specs/030-packages-public-submodules/plan.md`（本次为结构/导出面治理，未引入新的运行时语义；仅当触及核心热路径逻辑才要求补 perf evidence）
- **NFR-002** PASS  
  Evidence：`specs/030-packages-public-submodules/contracts/public-submodules.md`
- **NFR-003** PASS（not in scope）  
  Evidence：`specs/030-packages-public-submodules/plan.md`
- **NFR-004** PASS（not in scope）  
  Evidence：`specs/030-packages-public-submodules/plan.md`
- **NFR-005** PASS  
  Evidence：`apps/docs/content/docs/guide/recipes/public-submodules.md`、`apps/docs/content/docs/guide/recipes/meta.json`
- **NFR-006** PASS（not in scope）  
  Evidence：`specs/030-packages-public-submodules/contracts/collaboration-protocol.md`

### Success Criteria

- **SC-001** PASS  
  Evidence：`specs/030-packages-public-submodules/contracts/public-submodules.md`
- **SC-002** PASS  
  Evidence：`specs/030-packages-public-submodules/contracts/public-submodules.md`、`specs/030-packages-public-submodules/contracts/gap-report.md`
- **SC-003** PASS  
  Evidence：`specs/030-packages-public-submodules/contracts/public-submodules.md`、`.codex/skills/project-guide/references/public-submodules.md`
- **SC-004** PASS  
  Evidence：`specs/030-packages-public-submodules/contracts/gap-report.md`、`specs/030-packages-public-submodules/contracts/migration.md`
- **SC-005** PASS（guardrail）  
  Evidence：`specs/030-packages-public-submodules/plan.md`

## Notes

- 本特性为“结构治理 + 对外边界收口”，不引入新的运行时语义；涉及核心路径的要求以 `plan.md` 的 guardrail 执行。
- 若后续新增/调整子路径入口或对外概念入口，优先更新：`specs/030-packages-public-submodules/contracts/public-submodules.md`，并确保 `pnpm verify:public-submodules` 通过。
