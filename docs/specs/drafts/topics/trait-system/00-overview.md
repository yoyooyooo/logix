---
title: Trait System · 收敛总览
status: draft
version: 2025-12-14
value: core
priority: next
related:
  - ../../../../specs/007-unify-trait-system/spec.md
  - ../../../../specs/007-unify-trait-system/contracts/trait-lifecycle.md
  - ../../../../specs/007-unify-trait-system/contracts/form.md
  - ../../../../specs/007-unify-trait-system/contracts/query.md
  - ../../../runtime-logix/core/05-runtime-implementation.md
---

# Trait System · 收敛总览

## 1) 为什么要收敛

在 007 之后，“Trait / StateTrait / TraitLifecycle / 回放与诊断”已经成为唯一主线。此前散落在 drafts 里的若干路线（尤其是基于 `CapabilityMeta`/Schema 扫描的插件体系与 Schema sugar）会持续制造分叉心智与错误引用，因此需要：

- **明确弃用**：把已否决的路线集中归档/删除，避免“看起来还能用”；
- **保留残渣**：仅保留仍能帮助我们检验 007 的场景与约束（而不是保留另一套架构）。

## 2) 已弃用路线（删除/不再维护）

以下路线在 007 之后不再作为主线维护（原因：与 007 的“Trait 为内核事实源”冲突，或会引入第二套不可回放事实源）：

- `CapabilityMeta`/Schema 扫描 → `Module.live` 自动编译 Logic 的路线（SCD/Capability Plugin System）
- “Query.field / Reactive Schema / Schema Link”等以 Schema annotation 作为行为事实源的路线
- “Field Capabilities / State Graph”作为独立 Topic 的叙事（已被 007 的 Trait/Program/Graph/Plan 统一吸收）

## 3) 旧草案 → 007 的映射（保留的只剩“场景与缺口”）

历史上几个高度重叠的 Topic，大致可以被 007 统一重述为：

- “字段能力/状态图/响应式/联动” → 统一落到 `StateTrait`（以及其 build 出来的 `Program/Graph/Plan`）与事务内收敛
- “Query 集成” → 统一落到 007 的 `Query` contract（resourceId + key + 竞态/回放/诊断口径）
- “Form 模式” → 统一落到 007 的 `Form` contract（数组语义、错误树、交互态、validate/cleanup、回放与诊断）

因此，本 Topic 只保留三个方向的残渣：

1. 高 Trait 密度表单：作为 007 的验收样本与 Devtools/回放压力测试基准
2. 动态数组与复杂联动：用来验证 `trackBy`/FieldRef/局部执行范围与诊断口径
3. 跨模块派生（Link）：用来验证跨模块订阅、事务边界与回放一致性

## 4) 下一步（建议）

- 把 `10-scenarios-and-gaps.md` 当作回归样本列表：后续任何 Trait/事务/诊断改动都至少命中其中 2–3 个样本
- 当某条残渣形成稳定结论：迁移到 `specs/007-unify-trait-system/*` 或 `docs/specs/runtime-logix/core/*`，本 Topic 只保留“演进记录”

