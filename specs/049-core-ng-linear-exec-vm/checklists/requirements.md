# Specification Quality Checklist: core-ng 线性执行 VM（Exec VM）

**Purpose**: 在进入规划（plan/tasks）之前，校验规格是否可验收、无明显歧义  
**Created**: 2025-12-27  
**Feature**: `specs/049-core-ng-linear-exec-vm/spec.md`

## Content Quality

- [x] 聚焦 runtime-only NG（JIT-style 构造期预编译），不绑定工具链
- [x] 明确“纯优化不改语义”的边界（事务窗口/稳定锚点/统一最小 IR）
- [x] 与 045/047/048/039 的关系清晰（复用契约与证据门禁）
- [x] 用户场景可独立验收（对照验证 + perf evidence）

## Requirement Completeness

- [x] 无 `[NEEDS CLARIFICATION]` 占位
- [x] FR/NFR 可测试、可验收、无明显歧义
- [x] Success Criteria 可度量（无回归门槛 + 至少 1 个可证据化收益）
- [x] Edge cases 覆盖降级/宿主差异/bitset 清零/诊断分配风险

## Feature Readiness

- [x] 强制 `$logix-perf-evidence`（Node + ≥1 headless browser）
- [x] 明确 off 近零成本与可解释链路（light/full）
- [x] 明确“不得隐式 fallback/半成品态默认化”

## Notes

- 下一步进入 `$speckit plan`：把 Exec VM 的工件形态、证据字段、perf suites 与实现落点拆成可执行 tasks。

