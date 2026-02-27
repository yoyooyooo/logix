# Migration Checklist: O-024 Txn Lane Policy Cache

**Purpose**: 高影响项时序变更迁移门禁  
**Created**: 2026-02-26  
**Feature**: [plan.md](../plan.md)

## Breaking Scope

- [ ] CHK001 是否明确“运行中 override 不再即时生效”的行为变化？ [Clarity]
- [ ] CHK002 是否列出受影响的控制面与测试写法？ [Coverage]

## Migration Readiness

- [ ] CHK003 是否给出 re-capture 的标准操作步骤？ [Completeness]
- [ ] CHK004 是否定义 override 失败时的降级与告警策略？ [Consistency]

## Runtime Quality

- [ ] CHK005 是否定义 `txn_lane_policy::resolved` 新旧字段映射？ [Traceability]
- [ ] CHK006 是否定义 merge 指标预算与复测门槛？ [Measurability]
