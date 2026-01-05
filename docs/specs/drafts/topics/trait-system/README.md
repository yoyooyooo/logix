---
title: Trait System · Topic（以现状为准）
status: draft
version: 2025-12-22
value: core
priority: next
related:
  - specs/007-unify-trait-system/spec.md
  - packages/logix-core/src/StateTrait.ts
  - packages/logix-core/src/internal/runtime/ModuleRuntime.transaction.ts
  - packages/form/src/index.ts
---

# Trait System · Topic

> 本 Topic 只保留“仍值得继续做的缺口 + 回归样本”，并以**当前源码**为裁决。  
> 旧草案已按“删旧重写”策略清理，避免并行真相源漂移。

## 导航（合格版本）

- `01-current-coverage.md`：现状覆盖矩阵（Trait/Txn/Converge/Validate/Source/Form）
- `10-form-regression.md`：表单回归样本（Dynamic List / Cascading / Cross-Row）
- `30-cross-module-link.md`：跨模块派生心智模型（以 `Link.make` 为准）
- `40-source-backlog.md`：`Trait.source` 剩余缺口（Force Refresh / Key 注入决策）
- `50-list-item-derived.md`：list.item 派生执行缺口（`items[].x`）

## 写作约定

- 以现状为准：写清楚“现在是什么、代码在哪、如何验证”。  
- 不复刻旧草案：被源码覆盖的内容不再写成 TODO。  
- 避免并行真相源：需要新增约束/语义时，优先回写到 007 或 runtime SSoT，再在此处引用。  

## 仍值得做（保留项）

- P0：list.item scope 的 `computed/link` 需要“按行展开执行”（`items[].x` 不能只停留在 IR）。
- P1：`Trait.source.refresh` 需要支持 `force`（参数未变但要重试/手动刷新）。
- 已关闭：`Trait.source.key` 已升级为 **deps-as-args**（与 `computed.get` 对齐），并在 `@logix/query` 提供 builder 形态以避免类型推导退化。
