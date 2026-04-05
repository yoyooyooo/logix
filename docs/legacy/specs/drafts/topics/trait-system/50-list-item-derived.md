---
title: Trait System · list.item 派生执行缺口（items[].x）
status: draft
version: 2025-12-22
value: core
priority: next
related:
  - packages/logix-core/src/internal/state-trait/model.ts
  - packages/logix-core/src/internal/state-trait/converge.ts
  - packages/logix-core/src/internal/state-trait/source.ts
  - packages/logix-core/src/internal/state-trait/rowid.ts
  - packages/logix-core/test/StateTrait.Computed.DepsAsArgs.test.ts
  - docs/specs/drafts/topics/trait-system/01-current-coverage.md
---

# Trait System · list.item 派生执行缺口（items[].x）

## 概述

明确指出当前 `items[].x`（list.item scope）在 **Static IR 已存在但运行期未执行** 的缺口，并给出最小可落地方案。

范围：仅针对 `computed/link` 的 list.item 执行；`source` 的 list.item 已实现（RowId 门控 + 写回）。

不在这里设计“DynamicList helper”；先把 Trait 原语补齐到可用闭环。

## 现状事实

1) list.item 的 spec/IR 已完备：

- `StateTrait.list({ item: node(...) })` 会归一化出 `fieldPath = \"items[].sum\"`，并把 deps 前缀化为 `items[].x` / `items[].y`（`packages/logix-core/src/internal/state-trait/model.ts`，且有测试覆盖）。

2) 事务内 converge 当前只支持“普通字段路径”：

- converge 的 get/set 只按 `fieldPath.split('.')` 走对象路径；
- `items[].sum` 并不是可写的真实路径（真实路径应为 `items.0.sum` / `items.1.sum` …）；
- 因此 list.item 的 computed/link **不会被正确执行与写回**（`packages/logix-core/src/internal/state-trait/converge.ts`）。

## 最小落地方案

### P0-A：按 index 展开执行（先跑通闭环）

原则：把 `items[].sum` 当作“pattern”，在 converge 时展开为对每个 index 的写回。

执行策略（事务窗口内）：

1. 识别 `fieldPath` 含 `[]` 的 writer（computed/link）；解析得到：
   - `listPath = \"items\"`
   - `itemField = \"sum\"`
2. 读取当前 draft 的 `items` 数组长度；
3. 对每个 `i`：
   - 以 `{ ...item }` 或直接基于 item 视图计算 next（computed 的 `derive` 当前签名是 `(state)=>value`，这需要补一层“对 item 运行 derive”或引入 list.item 专用 derive 形态）；
   - 写回到 `items.${i}.sum`；
   - 记录 patch（必须是 concrete path，不能再记录 pattern path）。

收益：最快把 list.item computed/link 从“只能建图”补到“可运行”。

### P0-B：接入 RowId 门控（把写回归属做稳）

在 P0-A 之后，再对齐 source 的 list.item 口径：

- 使用 `RowIdStore` 把“in-flight/缓存归属”稳定到 rowId，而不是 index；
- 在 reorder/insert/remove 下，保证写回不会错行；
- 诊断事件应能解释“为什么丢弃某次写回”（rowId/keyHash/generation）。

落点可复用：`packages/logix-core/src/internal/state-trait/source.ts` 的 list.item 门控实现。

## 交付验收（回归样本）

- 新增一个最小模块：`items[].sum = x+y`（list.item computed）；
- 覆盖 insert/remove/reorder：sum 仍对应正确行；
- 事务层面：仍保持单入口 0/1 commit，patch/dirtyPaths 可解释。
