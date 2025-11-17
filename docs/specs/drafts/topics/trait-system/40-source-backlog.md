---
title: Trait System · Trait.source Backlog（保留项）
status: draft
version: 2025-12-22
value: core
priority: next
related:
  - packages/logix-core/src/StateTrait.ts
  - packages/logix-core/src/internal/runtime/BoundApiRuntime.ts
  - packages/logix-core/src/internal/state-trait/source.ts
  - packages/logix-core/src/internal/trait-lifecycle/index.ts
  - docs/specs/drafts/topics/trait-system/01-current-coverage.md
---

# Trait System · Trait.source Backlog（保留项）

## 概述

只保留 `Trait.source` 仍值得继续做的缺口与决策点；已实现的部分不再用旧草案叙事重复描述。

范围：`Trait.source` 的运行时语义（refresh / keyHash gate / 并发 / 回放 / list.item）。

不讨论 `@logix/query` 的完整设计；这里只关心 source 作为“资源快照写回”的底座能力。

## 已落地事实（不要再写成 TODO）

当前实现已经具备（作为硬事实源）：

- `source.refresh(fieldPath)`：可在事务内执行，也可作为独立事务入口（`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`）。
- keyHash gate：key 不变不刷新；in-flight/旧结果不会覆盖新 key（`packages/logix-core/src/internal/state-trait/source.ts`）。
- 并发：`switch` / `exhaust-trailing`。
- key 失效（undefined）：同一次可观察提交内写回 clean idle。
- list.item：RowId 门控，避免数组结构变更导致写错行。
- dev-mode deps mismatch：对 key 的实际读取与声明 deps 不一致会出诊断，但不改变语义。

## 仍需补齐的能力

### P1 · Force Refresh / Retry（必须保留）

**问题**：当前 refresh 会被 keyHash gate 短路：参数未变时无法“强制重试”（例如上次 error 后点重试）。

**最小改动方案**（推荐）：

1. 将 API 扩展为：
   - `traits.source.refresh(fieldPath, options?: { force?: boolean })`
2. 在 source handler 内：
   - `force=true` 时跳过 “current.keyHash === h” 的短路；
   - 仍然保留 keyHash gate 用于“旧结果写回丢弃”（避免竞态覆盖）。

落点候选：

- 类型：`packages/logix-core/src/internal/runtime/core/module.ts`（BoundApi.traits.source.refresh 签名）
- 实现：`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`
- 内核：`packages/logix-core/src/internal/state-trait/source.ts`
- 桥接协议：可考虑同步扩展 `TraitLifecycle.scopedExecute` 的 `source:refresh` 请求形态（可选）。

### P2 · Source Key 的 deps-as-args（需要裁决）

当前 `source.key` 形态：

- root：`key: (state) => unknown`
- list.item：`key: (item) => unknown`

并且有两个“守卫”：

- build 阶段强制 `deps` 显式声明；
- dev-mode 通过 DepsTrace 给出 deps mismatch 诊断。

**需要裁决的问题**：是否仍要把 `key` 升级为 `(...depsValues) => key`（像 `computed.get` 一样）？

- 倾向保留（理由）：把 deps 从“约定+诊断”升级为“编译期物理约束”，减少 stale key 风险。
- 倾向暂缓（理由）：当前已经强制 deps + mismatch 诊断；升级会带来类型推导与迁移成本，且 list.item 还需要同时处理 “按行注入 depsValues”。

建议：在完成 `P1 force refresh` 与 `P0 list.item derived 执行` 之后再决定，避免同时引入两次结构性变更。
