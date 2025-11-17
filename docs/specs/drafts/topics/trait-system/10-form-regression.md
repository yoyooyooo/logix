---
title: Trait System · 表单回归样本（Dynamic List / Cascading / Cross-Row）
status: draft
version: 2025-12-22
value: core
priority: next
related:
  - specs/007-unify-trait-system/contracts/form.md
  - docs/specs/drafts/topics/trait-system/README.md
  - packages/form/src/form.ts
  - packages/form/src/logics/install.ts
  - packages/logix-core/src/internal/state-trait/source.ts
  - packages/logix-core/src/internal/state-trait/validate.ts
  - examples/logix-react/src/demos/form/cases/case11-dynamic-list-cascading-exclusion.tsx
---

# Trait System · 表单回归样本（Dynamic List / Cascading / Cross-Row）

## 概述

把“复杂动态列表表单”的高压组合场景收敛为一份**长期回归样本**，用于验证：

- 事务/派生/校验/异步 source 是否能稳定协作；
- 写法是否能保持唯一（避免 UI 侧散落 ad-hoc 联动与校验扫描）。

样本基线：

- `examples/logix-react/src/demos/form/cases/case11-dynamic-list-cascading-exclusion.tsx`

不引入 `DynamicList/Reactive` 等新 helper；仅允许在 `@logix/form` 现有 DSL 上迭代。

## 写法裁决（必须遵守）

### 1) 动态结构：必须稳定 identity

- 必须使用 `StateTrait.list({ identityHint: { trackBy } })` 或等价配置。
- 任何会影响“行归属”（insert/remove/reorder）的行为，都必须能在错误树与 source in-flight 门控中保持一致归属。

### 2) 异步 options：必须用 `Trait.source`

- options 必须建模为 `Trait.source` 快照（loading/success/error/idle），禁止在 UI 侧手写请求与竞态处理。
- key 为 `undefined` 时必须在同一次可观察提交内收敛为 clean idle（避免“key 空但 data 还在”的 tearing）。

### 3) 跨行互斥：必须用 list-scope check

- “跨行唯一性/互斥”必须建模为 list-scope check（输入是整张表），一次扫描写回 `errors.<list>.rows[i]`。
- 禁止在 item check 里通过“读取全表 state”做扫描（这会破坏 deps 口径与增量调度，且难以诊断）。

### 4) 触发策略：wiring 统一由 `@logix/form` 承担

- UI 侧只派发 action（setValue/blur/array*），不要用 `useEffect` 去触发 validate/refresh。
- validate 与 source refresh 的默认 wiring：`packages/form/src/logics/install.ts`

## 回归样本应覆盖的链路（实现侧）

### 1) Row 级级联 options（source）

样本必须覆盖：

- `items[]` 行内：country → province → city → warehouse 的级联 options；
- deps 变化触发 refresh（onValueChange），并发策略为 `switch`；
- key 未激活（`undefined`）时写回 clean idle。

现状写法基线：`case11-dynamic-list-cascading-exclusion.tsx` 中 `item.source.*Options`。

### 2) Row 级 required（item-scope check）

- required 属于“行内校验”，可以留在 item-scope check。
- `validateOn` 用于 onBlur/onChange 门控，但 submit 必须覆盖 root validate（由 `Form.install` 保证）。

### 3) 跨行 uniqueWarehouse（list-scope check）

- 必须是 list-scope check，且 deps 至少声明到 `warehouseId`。
- 输出必须写回到 `errors.items.rows[i].warehouseId`（同构树 + rows[]）。

### 4) 数组结构变更（append/remove/swap/move）

- 回归样本必须覆盖：增删改排序后，values / errors / ui 对齐不漂移；
- 如果存在 source in-flight，必须保证写回不会错行（RowId 门控）。

## Anti-Patterns（必须拒绝的写法）

- UI/组件层链式多次 `setValue` 实现级联清理（应由 trait/linkage/统一 reducer+wiring 负责）。
- item 校验里全表扫描（应迁到 list-scope check）。
- 为了“强制重试”往业务 values 写 `reloadTick`（应由 source.force refresh 解决；当前属于待办）。

## 回归检查清单（建议长期保持）

- [ ] 高速连续变更上游字段：旧请求结果不会覆盖新 key（keyHash gate）。
- [ ] key 变 `undefined`：options 同事务收敛为 clean idle（无残留 data/error）。
- [ ] 跨行互斥：改单行会影响另一行错误，且写回路径稳定（rows[i]）。
- [ ] insert/remove/reorder：errors/ui/source 快照归属不串行。
