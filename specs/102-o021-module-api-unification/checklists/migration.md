# Migration Checklist: O-021 Module 实例化 API 统一

**Purpose**: 作为高影响项迁移门禁，确保 API breaking 在 forward-only 模式下可控  
**Created**: 2026-02-26  
**Feature**: [plan.md](../plan.md)

## API Breaking Scope

- [x] CHK001 是否明确列出将删除/替换的 `live/implement/impl` 公开符号与影响面？ [Completeness]
- [x] CHK002 是否定义了统一入口的最终命名与参数契约，并给出唯一推荐写法？ [Clarity]

## Migration Readiness

- [x] CHK003 是否给出 examples/react/sandbox/runtime 的迁移顺序与阻塞条件？ [Coverage]
- [x] CHK004 是否定义了“旧入口完全移除”的门槛与时间点（无弃用期）？ [Consistency]

## Performance & Diagnostics Safeguards

- [x] CHK005 是否声明实例化热路径性能预算、采集方法与失败策略？ [Measurability]
- [x] CHK006 是否声明迁移前后诊断锚点一致性检查项（instanceId/txnSeq/opSeq）？ [Traceability]

## Notes

- 当前状态：`writeback`。legacy 公开面仍用于迁移盘点，`done` 门禁前必须按 `contracts/migration.md` 完成彻底移除与回流阻断。
