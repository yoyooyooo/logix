# Specification Quality Checklist: core-ng 全套切换达标门槛（无 fallback）

**Purpose**: 在进入规划（plan/tasks）之前，校验规格是否可验收、无明显歧义  
**Created**: 2025-12-27  
**Feature**: `specs/047-core-ng-full-cutover-gate/spec.md`

## Content Quality

- [x] 聚焦“可切默认”的判定与门槛（不是实现细节清单）
- [x] 术语清晰（Full Cutover / fallback / coverage matrix / 证据门禁）
- [x] 明确与 045/046/039 的边界与依赖（不引入并行真相源）
- [x] 用户场景以“可自动化验证”组织，能独立验收

## Requirement Completeness

- [x] 无 `[NEEDS CLARIFICATION]` 占位
- [x] FR/NFR 可测试、可验收、无明显歧义
- [x] Success Criteria 可度量（PASS/FAIL 可结构化复核；Node+Browser 证据门槛）
- [x] Edge cases 覆盖 fallback/语义差异/宿主差异/误判风险

## Feature Readiness

- [x] 证据门禁绑定 `$logix-perf-evidence`（Node + ≥1 条 headless browser）
- [x] 与宪法对齐（统一最小 IR、稳定锚点、事务窗口禁 IO、off 近零成本）
- [x] 明确“允许差异 vs 禁止差异”的失败策略（避免隐性漂移）

## Notes

- 下一步进入 `$speckit plan`：把 coverage matrix 的单一事实源、对照验证与证据落盘/预算门槛拆成可执行方案与 tasks。

