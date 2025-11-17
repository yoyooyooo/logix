---
title: Trait System · 现状覆盖矩阵（以源码为准）
status: draft
version: 2025-12-22
value: core
priority: next
related:
  - specs/007-unify-trait-system/spec.md
  - docs/specs/drafts/topics/trait-system/README.md
  - packages/logix-core/src/StateTrait.ts
  - packages/logix-core/src/internal/runtime/ModuleRuntime.transaction.ts
  - packages/logix-core/src/internal/state-trait/build.ts
  - packages/logix-core/src/internal/state-trait/install.ts
  - packages/logix-core/src/internal/state-trait/converge.ts
  - packages/logix-core/src/internal/state-trait/validate.ts
  - packages/logix-core/src/internal/state-trait/source.ts
  - packages/form/src/form.ts
---

# Trait System · 现状覆盖矩阵（以源码为准）

## 概述

本文只回答两个问题：

1. 现在的 `StateTrait` / 事务 / 表单 wiring **已经覆盖了哪些 007/Topic 草案诉求**；
2. 还剩下哪些是 **值得继续做** 的缺口（并给出可执行的落点）。

范围仅包含当前仓库的“可运行事实源”：

- `@logix/core`：`StateTrait`、事务（StateTransaction）、converge/validate/source、TraitLifecycle 桥接；
- `@logix/form`：表单 DSL、动态列表样本、默认 wiring（validate / source refresh）。

不在这里继续发明新的 Helper（例如 `@logix/reactive/DynamicList`）；若需要 sugar，只能以“可降解为 Trait + Logic”为前提。

## 关键约束（现状裁决）

- **单入口 = 单事务 = 0/1 次 commit**：事务窗口内聚合写入，提交前执行派生收敛与校验，commit 时只触发一次订阅通知（`packages/logix-core/src/internal/runtime/ModuleRuntime.transaction.ts`）。
- **事务窗口禁止 IO**：事务体逃逸会写诊断（`state_transaction::async_escape`），引导改用 task/source（同上）。
- **deps 是唯一依赖事实源**：`computed/source/check` 都要求显式 `deps`；dev-mode 提供 deps mismatch 诊断，但不改变语义（`packages/logix-core/src/internal/state-trait/build.ts`、`packages/logix-core/src/internal/state-trait/converge.ts`、`packages/logix-core/src/internal/state-trait/source.ts`）。
- **不引入第二套订阅通道**：订阅仍以 `ModuleRuntime.changes` 为准；“中间态观测”只能走 Debug/Devtools。

## 关键链路（代码落点）

### 1) Blueprint → Program/Graph/Plan（静态 IR）

- DSL 入口：`packages/logix-core/src/StateTrait.ts`
- 归一化（含 node/list/$root、`items[]` 前缀化 deps）：`packages/logix-core/src/internal/state-trait/model.ts`
- build 产物：
  - `StateTraitProgram.entries/graph/plan`
  - `convergeIr`（computed/link topo + 整数化 FieldPath 表）
  - 见 `packages/logix-core/src/internal/state-trait/build.ts`

### 2) 安装阶段（wiring）

- `StateTrait.install` 当前行为：
  - 把 Program 注册到 runtime internals（用于事务提交前 converge/validate/source idle 等）
  - install 阶段只保留 `source.refresh` 入口挂载（computed/link/check 由事务内核执行）
  - 见 `packages/logix-core/src/internal/state-trait/install.ts`

### 3) 运行阶段（事务窗口：converge → validate → commit）

- 事务入口：`runWithStateTransaction`（dispatch / source-refresh / TraitLifecycle.scopedValidate 等都走这里）
  - converge：`packages/logix-core/src/internal/state-trait/converge.ts`（目前覆盖 computed/link）
  - validate：`packages/logix-core/src/internal/state-trait/validate.ts`（覆盖 check，含 list-scope）
  - commit：发布一次 `commitHub` + `Debug.record(type=\"state:update\")`（`packages/logix-core/src/internal/runtime/ModuleRuntime.transaction.ts`）

### 4) Source（异步资源：keyHash gate + 并发策略 + 回放）

已覆盖能力（实现层面）：

- `source.refresh(fieldPath)`：既可在事务内触发，也可作为独立事务入口触发（`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`）。
- keyHash gate：避免 key 不变时的无意义刷新；并保证旧结果不会覆盖新 key（`packages/logix-core/src/internal/state-trait/source.ts`）。
- 并发：`switch` / `exhaust-trailing`（同上）。
- key 变 `undefined`：同一次可观察提交内同步回到 clean idle（同上）。
- 回放：记录/消费 `ReplayLog.ResourceSnapshot`（同上）。
- list.item scope：按 RowId 做 in-flight 门控，避免 insert/remove/reorder 写错行（同上）。

## 已覆盖结论（旧草案可删）

下列“诉求级结论”已被源码覆盖，旧草案应删除，改以本目录文档作为新事实源：

- `computed` 的 deps-as-args（已落地，且有测试覆盖）。
- 事务窗口内 converge + scoped validate（已落地，且有诊断事件与降级策略）。
- 动态列表（Form Array）的 list-scope check、RowId 归属与数组结构变更的默认 wiring（已在 `@logix/form` 中落地）。
- `Trait.source` 的并发/回放/keyHash gate/idle 收敛（已落地）。

## 仍值得做（保留项）

- P0：**list.item 的 computed/link 执行**（`items[].x` 目前只停留在 Program/Graph/IR，事务内 converge 未做按行展开执行）→ 见 `50-list-item-derived.md`。
- P1：**source.force refresh / retry**（key 不变但需要重试/手动刷新）→ 见 `40-source-backlog.md`。
- P2：评估 **source.key 的 deps-as-args** 是否仍有必要（当前已具备 deps mismatch 诊断；是否要把它升级为编译期硬约束需要裁决）→ 见 `40-source-backlog.md`。
