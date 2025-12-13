# Contracts: 007 Trait 系统统一

**Branch**: `007-unify-trait-system`  
**Source Spec**: `specs/007-unify-trait-system/spec.md`  
**Source Data Model**: `specs/007-unify-trait-system/data-model.md`

> 本目录用于固化“对外可依赖的契约”（API/协议/事件口径），作为实现与测试的共同裁决来源。

## 内容索引

- `specs/007-unify-trait-system/contracts/state-trait.md`：StateTrait（DSL→IR→install）与 deps/graph/validate/cleanup 契约
- `specs/007-unify-trait-system/contracts/trait-lifecycle.md`：TraitLifecycle（install/ref/scoped validate/execute/cleanup）统一桥接契约（Form/Query 共用）
- `specs/007-unify-trait-system/contracts/form.md`：`@logix/form` Blueprint/Controller/Errors/UIState/ValidateRequest 契约
- `specs/007-unify-trait-system/contracts/query.md`：`@logix/query` Blueprint/Controller/Triggers/Invalidate/外部查询引擎边界 契约
- `specs/007-unify-trait-system/contracts/replay-and-diagnostics.md`：回放（re-emit）与诊断（txn 聚合/成本/原因）契约
