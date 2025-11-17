# Specification Quality Checklist: core-ng 事务零分配（txn zero-alloc）

**Purpose**: 在进入规划（plan/tasks）之前，校验规格是否可验收、无明显歧义  
**Created**: 2025-12-29  
**Feature**: `specs/051-core-ng-txn-zero-alloc/spec.md`

## Content Quality

- [x] 聚焦“txn/patch/dirtyset 的分配行为收口”，不引入对外新语义
- [x] 与 039 guardrails 对齐（argument-based recording、禁 rest、分支搬迁）
- [x] 与 050/052 的边界清晰（id 语义归 050；off 闸门归 052）

## Requirement Completeness

- [x] 无 `[NEEDS CLARIFICATION]` 占位
- [x] FR/NFR 可测试、可验收
- [x] Success Criteria 可度量（Node microbench + Browser P1 diff）

## Feature Readiness

- [x] 强制 `$logix-perf-evidence`（Node + ≥1 headless browser）
- [x] 明确“热循环/调用点”零分配的判定口径

