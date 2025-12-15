---
title: Trait System · Topic Overview
status: draft
version: 2025-12-14
value: core
priority: next
related:
  - ../../../runtime-logix/core/05-runtime-implementation.md
  - ../../../../specs/007-unify-trait-system/spec.md
---

# Trait System · Topic Overview

> 主题定位：在完成 `specs/007-unify-trait-system/` 之后，对历史草案做一次收敛。  
> 本 Topic 只保留“仍可能帮助我们验证/补齐 007 主线的残渣”，并把已被否决/取代的路线集中归档，避免在 drafts 里持续分叉。

## 现行主线（SSoT）

- Trait 主线规范：`specs/007-unify-trait-system/*`
- Runtime 承接与术语落点：`docs/specs/runtime-logix/core/*`（尤其 `core/05-runtime-implementation.md`）

## 本 Topic 文档

- `00-overview.md`：旧草案 → 007 的映射、已弃用路线清单、以及本 Topic 的收敛边界
- `10-scenarios-and-gaps.md`：仍建议保留为“回归样本/缺口清单”的场景集合
- `20-form-patterns.md`：从旧 drafts 提炼出的“Trait-first 表单模式”残渣（作为 007 Form 方向的验收样本）
- `21-dynamic-list-and-linkage.md`：动态列表与复杂联动的场景集（以 007 的数组/事务语义为裁决）
- `22-dynamic-list-cascading-exclusion.md`：动态列表 + 级联异步 options + 跨行互斥（落地复盘与 API 收敛建议）
- `30-link-mental-model.md`：跨模块派生（Link）的心智模型（已从旧 Schema Link 草案重写）
