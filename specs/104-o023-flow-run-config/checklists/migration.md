# Migration Checklist: O-023 Flow run(config)

**Purpose**: 高影响项 run* 族迁移门禁  
**Created**: 2026-02-26  
**Feature**: [plan.md](../plan.md)

## API Breaking Scope

- [ ] CHK001 是否完整列出将被替换/删除的 `run*` 命名族？ [Completeness]
- [ ] CHK002 是否明确 `run(config)` 的配置字段、默认值与冲突处理？ [Clarity]

## Migration Execution

- [ ] CHK003 是否给出 alias 过渡到完全删除的阶段门槛？ [Coverage]
- [ ] CHK004 是否定义 lint/codemod 防回流策略？ [Consistency]

## Runtime Quality

- [ ] CHK005 是否声明并发语义矩阵与诊断事件映射验证项？ [Traceability]
- [ ] CHK006 是否声明性能预算与证据采集路径？ [Measurability]
