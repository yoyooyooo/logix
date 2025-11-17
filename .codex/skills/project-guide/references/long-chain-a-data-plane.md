---
title: 长链路实现笔记 · A｜状态数据面（Runtime Data Plane）
status: draft
version: 1
---

# 长链路实现笔记 · A｜状态数据面（Runtime Data Plane）

> **主产物**：`state`（对外可见的唯一事实源）+ `patch/dirty`（增量依据）+ `txn`（事务摘要/证据）。
>
> **冲突裁决**：`.codex/skills/project-guide/references/runtime-logix` + TypeScript 类型 > 本文。

## 目录

- 1. 三跳入口（public → internal → tests）
- 2. 事务窗口模型（begin/patch/converge/commit）
- 3. DirtyRoots/PlanCache/预算（为什么能增量、为什么不会负优化）
- 4. Validate（scoped / reverse closure）
- 5. 常见坑与排查
- 6. auggie 查询模板

## 1) 三跳入口（public → internal → tests）

- **public**
  - `packages/logix-core/src/StateTrait.ts`
  - `packages/logix-core/src/Module.ts`（reducers / stateTrait 语义入口）
- **internal（数据面内核）**
  - 事务：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
  - 队列/事务驱动：`packages/logix-core/src/internal/runtime/ModuleRuntime.txnQueue.ts`、`packages/logix-core/src/internal/runtime/ModuleRuntime.transaction.ts`
  - Trait：`packages/logix-core/src/internal/state-trait/build.ts`、`packages/logix-core/src/internal/state-trait/converge.ts`、`packages/logix-core/src/internal/state-trait/validate.ts`
  - 计划缓存/预算：`packages/logix-core/src/internal/state-trait/plan-cache.ts`
- **tests（先看这些能最快理解边界）**
  - 事务/可见性：`packages/logix-core/test/Runtime.OperationSemantics.test.ts`
  - Trait 正确性与预算：`packages/logix-core/test/StateTrait.ConvergeAuto.CorrectnessInvariants.test.ts`、`packages/logix-core/test/StateTrait.ConvergeBudgetConfig.test.ts`
  - DirtySet/增量：`packages/logix-core/test/StateTrait.ConvergeDirtySet.test.ts`、`packages/logix-core/test/StateTrait.Validate.Incremental.test.ts`

## 2) 事务窗口模型（begin/patch/converge/commit）

**最重要的“读代码姿势”**：把 `StateTransaction` 当作一个强约束的 state-machine，而不是工具函数集合。

- **begin**
  - 从 `SubscriptionRef` 读取当前 state 作为 base（对外可见的旧值）。
  - 创建 draft（仅事务内部可见）。
- **patch**
  - reducer / trait writer 只允许改 draft，并记录 patch/dirty。
  - dirty 的语义不是“变了哪些具体值”，而是“影响面种子”（供 converge/validate 决策）。
- **converge**
  - 在同一事务窗口内执行 computed/link/source-refresh/validate（取决于 config 与 dirty）。
  - 允许降级（例如预算 cut-off → full），但必须保持正确性。
- **commit**
  - **对外唯一可见点**：`SubscriptionRef.set(nextState)`（0/1 次）。
  - commit 后才允许发出“state 已更新”的对外通知（React/Devtools 订阅看到的是原子替换后的状态）。

## 3) DirtyRoots/PlanCache/预算（为什么能增量、为什么不会负优化）

把这三件事当作一组不可拆的约束：

- **DirtyRoots 归一化**：把“变化集合”规约成稳定 key（同类修改聚合、前缀收敛、`dirtyAll` 兜底）。
  - 位置：`packages/logix-core/src/internal/state-trait/field-path.ts`、`packages/logix-core/src/internal/state-trait/meta.ts`
- **PlanCache（Dirty Pattern → Plan）**：第一次算计划可能昂贵，但同 pattern 反复出现时必须 O(1) 复用。
  - 位置：`packages/logix-core/src/internal/state-trait/plan-cache.ts`
- **预算 cut-off**：一旦“决策增量计划”超过预算，立刻回退 full，保证性能下界（避免负优化）。
  - 位置：`packages/logix-core/src/internal/state-trait/converge.ts`（决策与降级路径）

读 converge 时优先确认三件事是否同时成立：

1. 计划 key 是否稳定（排序/归一化一致）
2. cache 是否有保护（避免爆炸/污染）
3. 超预算回退是否严格（不会出现“半算增量”导致卡顿）

## 4) Validate（scoped / reverse closure）

Validate 的难点不在“写校验”，而在**控制范围**：

- **scoped validate**：只校验受影响闭包（而不是全量）。
- **reverse closure**：从 dirty seeds 沿“反向邻接表”做 BFS，得到影响闭包。
  - 入口：`packages/logix-core/src/internal/state-trait/reverse-closure.ts`
  - 图构建：`packages/logix-core/src/internal/state-trait/graph.ts`

把 validate 当作数据面的“第二类 writer”：

- 它可能写入错误/诊断结构（但仍必须在事务窗口内遵守单次 commit）。
- 它必须和 converge 的 dirty/plan 共享同一套“影响面”事实源。

## 5) 常见坑与排查

- **误把事务窗口当成可 await 的地方**：事务内做 IO 会破坏“单次提交 + 可诊断”的假设；优先把 IO 放到 B 执行面（run 段 Fiber）里，完成后 `dispatch` 回写。
- **dirtyAll 滥用导致全量重算**：先确认 dirty roots 是否被正确归一化；再确认 trait writers 是否提供了可识别的 path。
- **计划缓存看似没生效**：先查 budget 是否过小导致频繁降级；再查 pattern key 是否不稳定（顺序/归一化漂移）。
- **validate 范围过大**：优先查 reverse closure 输入 seeds 是否被“结构化聚合”正确压缩。

## 6) auggie 查询模板

- “`StateTransaction` 的 begin/patch/converge/commit 分别在哪个文件/函数？commit 的唯一对外可见点是哪一行语义？”
- “`DirtyRoots` 如何归一化？结构化聚合/前缀收敛/dirtyAll 兜底的实现点在哪？”
- “`plan-cache` 以什么 key 缓存？cache 保护策略（容量/失效）在哪里？”
- “预算 cut-off 的判断与降级路径在哪？降级后仍如何保证正确性？”
- “`validate` 如何做 scoped？reverse closure 的 BFS 从哪开始，依赖图从哪构建？”
