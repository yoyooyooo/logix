# Specification Quality Checklist: 切默认到 core-ng（迁移与回退口径）

**Purpose**: 在进入规划（plan/tasks）之前，校验规格是否可验收、无明显歧义  
**Created**: 2025-12-27  
**Feature**: `specs/048-core-ng-default-switch-migration/spec.md`

## Content Quality

- [x] 聚焦“切默认 + 回退口径 + 证据落盘”，不混入 core-ng 优化细节
- [x] 术语与边界清晰（默认内核/切默认/回退/Full Cutover Gate）
- [x] 明确依赖：必须先通过 047（Full Cutover Gate），并复用 045 契约跑道
- [x] 上层依赖边界清晰（consumer 仍只依赖 `@logixjs/core`）

## Requirement Completeness

- [x] 无 `[NEEDS CLARIFICATION]` 占位
- [x] FR/NFR 可测试、可验收、无明显歧义
- [x] Success Criteria 可度量（默认选择 + 显式回退 + Node+Browser 证据门槛）
- [x] Edge cases 覆盖“未达 gate 仍尝试切默认”等风险

## Feature Readiness

- [x] 证据门禁绑定 `$logix-perf-evidence`（Node + ≥1 headless browser）
- [x] 与宪法对齐（统一最小 IR、稳定锚点、事务窗口禁 IO、off 近零成本）
- [x] 明确“禁止隐式 fallback”，回退只能显式且证据化

## Notes

- 下一步进入 `$speckit plan`：把默认选择落点、回退机制、迁移 playbook 与证据落盘拆成可执行 tasks。

