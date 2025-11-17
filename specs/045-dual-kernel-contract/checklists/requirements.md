# Specification Quality Checklist: Dual Kernel Contract（可替换内核契约：当前内核 + core-ng 并行）

**Purpose**: 在进入规划（plan/tasks）之前，校验规格是否可验收、无明显歧义  
**Created**: 2025-12-27  
**Feature**: `specs/045-dual-kernel-contract/spec.md`

## Content Quality

- [x] 无实现细节泄漏（仅描述 WHAT/WHY，不绑定具体代码结构/语言/框架）
- [x] 聚焦用户价值：上层生态可独立演进、内核可并行重写且风险可拦截
- [x] 术语与边界清晰（当前内核 vs core-ng；Kernel Contract；统一最小 IR）
- [x] 章节完整（用户场景/需求/成功指标/边界情况/假设）

## Requirement Completeness

- [x] 无 `[NEEDS CLARIFICATION]` 占位
- [x] FR/NFR 可测试、可验收、无明显歧义
- [x] Success Criteria 可度量（含一致性、可导出证据、性能门槛、隔离性）
- [x] Edge cases 已识别（协议演进、诊断档位、事务边界、并行隔离）
- [x] Scope 明确（先建可替换地基，不要求一次性替换；未覆盖能力不得静默漂移）

## Feature Readiness

- [x] 用户场景覆盖主路径（上层不被拖慢 / core-ng 并行与切换 / 多内核共存）
- [x] 证据与可解释链路被纳入硬约束（统一最小 IR + 稳定锚点 + 结构化差异）
- [x] 性能与诊断要求有明确门槛（诊断 off 近零成本；默认路径不回归）

## Notes

- 下一步建议进入 `$speckit plan`：把 Kernel Contract 的最小闭环、契约一致性验证、证据/性能跑道与切换门槛拆成可执行方案与阶段交付。
