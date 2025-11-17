# Specification Quality Checklist: diagnostics=off 近零成本 Gate（回归防线）

**Purpose**: 在进入规划（plan/tasks）之前，校验规格是否可验收、无明显歧义  
**Created**: 2025-12-29  
**Feature**: `specs/052-core-ng-diagnostics-off-gate/spec.md`

## Content Quality

- [x] 聚焦“off 档位近零成本”的可验收 Gate（测试 + 证据），不引入语义变更
- [x] 与 039/044 的诊断闸门与采样策略对齐
- [x] 覆盖面明确：049/050/051（off 行为）

## Requirement Completeness

- [x] 无 `[NEEDS CLARIFICATION]` 占位
- [x] FR/NFR 可测试、可验收
- [x] Success Criteria 可度量（diagnostics overhead diff + 守护测试）

## Feature Readiness

- [x] 强制 `$logix-perf-evidence`（至少 Browser `diagnostics.overhead.e2e`）
- [x] 明确 off 的禁止项清单（steps/label/计时/mapping materialize）

