# Specification Quality Checklist: core-ng 整型桥（Integer Bridge）

**Purpose**: 在进入规划（plan/tasks）之前，校验规格是否可验收、无明显歧义  
**Created**: 2025-12-27  
**Feature**: `specs/050-core-ng-integer-bridge/spec.md`

## Content Quality

- [x] 聚焦“全链路整型闭环 + 不往返 + 不半成品默认化”
- [x] 与 039 guardrails 对齐（split/join 禁区、argument-based recording、pathAsArray 透传）
- [x] 与 045/046/统一最小 IR 对齐（稳定锚点、证据门禁）
- [x] 不引入业务对外新概念（对外仍用既有证据/诊断档位语义）

## Requirement Completeness

- [x] 无 `[NEEDS CLARIFICATION]` 占位
- [x] FR/NFR 可测试、可验收、无明显歧义
- [x] Success Criteria 可度量（去 split/join 热点 + Node+Browser 证据 + off 近零成本）
- [x] Edge cases 覆盖稀疏/大 N/动态路径/bitset 清零成本等风险

## Feature Readiness

- [x] 强制 `$logix-perf-evidence`（Node + ≥1 headless browser）
- [x] 明确“半成品态禁止默认化”的 guardrails（阶段性落地策略）
- [x] 诊断与可解释链路可裁剪且可序列化

## Notes

- 下一步进入 `$speckit plan`：把 id registry/事务契约放宽/recordPatch 零分配/执行链路改造拆成可执行 tasks。

