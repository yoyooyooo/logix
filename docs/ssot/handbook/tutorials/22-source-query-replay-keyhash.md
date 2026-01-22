---
title: Source 深水区：keyHash gating / replay / query engine 接线教程 · 剧本集
status: draft
version: 1
---

# Source 深水区：keyHash gating / replay / query engine 接线教程 · 剧本集

> **定位**：这是 `docs/ssot/handbook/` 的“维护者教程/剧本集”（how-to），用于新成员上手、老成员回味：把 `StateTrait.source` 的两阶段提交、`keyHash gate` 防竞态覆盖、并发策略（switch / exhaust-trailing）、list.item RowId 绑定、以及 Replay Mode（re-emit，不 re-fetch）和 Query engine 接线方式讲透。  
> **重要**：本文不是裁决来源；凡涉及 MUST/协议/边界的最终口径以 SSoT 为准（`docs/ssot/platform/**` 与 `docs/ssot/runtime/**`）。

---

## 0. 最短阅读路径（10–20 分钟先抓住“为什么要这么复杂”）

1. Source 的裁决口径（两阶段/竞态门控/回放）：`docs/ssot/runtime/logix-core/runtime/05-runtime-implementation.01-module-runtime-make.md`
2. ReplayLog 与 replay 语义（re-emit，不 re-fetch）：`docs/ssot/runtime/logix-core/observability/09-debugging.06-replay.md`
3. Source 在 Module/Logic API 视角的接缝：`docs/ssot/runtime/logix-core/api/02-module-and-logic-api.03-module-logic.md`
4. 代码实现入口：`packages/logix-core/src/internal/state-trait/source.impl.ts`
5. 回归用例（建议新成员跑一遍）：`packages/logix-core/test/internal/ReplayMode.Resource.test.ts`

---

## 1. 心智模型：Source 是“可回放的异步状态机”，不是“在 selector 里发请求”

把 `StateTrait.source` 当成一条“受控 IO 管道”会更准确：

- **对外（状态图）**：它把一个字段变成 `ResourceSnapshot`（`idle/loading/success/error`）的状态机；
- **对内（运行时）**：它把一次 refresh 拆成「事务窗口内的同步阶段」+「事务窗口外的 IO 阶段」，并在写回时用 `keyHash gate` 做竞态门控；
- **对回放/诊断**：它会把 snapshot 变化记录成 `ReplayLog.ResourceSnapshot` 事件（live），并在 replay 模式下“消费事件重赛”（re-emit），而不是重发真实请求（re-fetch）。

如果你只记住一句话：

> **Source 的复杂性不是为了写法炫技，而是为了保证：事务窗口禁 IO + 竞态不覆盖 + 可回放 + 可解释。**

---

## 2. 核心链路（从 0 到 1）：source-refresh 的两阶段提交

### 2.1 DSL 与 Plan：deps-as-args（把“依赖”变成硬事实源）

对外 DSL：`packages/logix-core/src/StateTrait.ts`

`StateTrait.source({ deps, resource, key, ... })` 的关键点是 **deps-as-args**：

- `key(...depsValues)` 不再是 `key(state)`；
- 这结构性地避免了“key 偷偷读了 deps 之外的字段”（否则增量调度与诊断会失真）。

build 后会产出 `StateTraitPlanStep(kind="source-refresh")`，install 时注册 refresh handler。

### 2.2 事务内阶段（Phase 1）：同步写入 loading / idle（禁止 IO）

SSoT 裁决（建议先读）：`docs/ssot/runtime/logix-core/runtime/05-runtime-implementation.01-module-runtime-make.md`

核心语义：

1. 在事务窗口内计算 key（只允许依赖 deps）
2. 计算 `keyHash = Resource.keyHash(key)`（稳定可比较）
3. 若 key 变为 `undefined`：必须同步写回 `idle`（清空 data/error，避免视图读到非法中间态）
4. 若 key 非空：同步写回 `loading({ keyHash })`（两阶段提交的第一阶段）

实现入口（含 idle 同步）：`packages/logix-core/src/internal/state-trait/source.impl.ts`

### 2.3 事务外阶段（Phase 2）：fork IO fiber，写回 success/error（带 keyHash gate）

在后台 fiber 中执行实际资源调用（或 replay 消费），完成后写回：

- 写回必须经过 `keyHash gate`：只有当“当前字段仍然是这个 keyHash”时，才允许写回 success/error；
- 旧结果不会覆盖新 key：就算你没正确取消 fiber，gate 仍能保证正确性（取消只是 best-effort）。

关键写回 helper（注意它只在 keyHash 匹配时写）：`writebackIfCurrentKeyHash`（同文件）。

---

## 3. 并发策略：switch vs exhaust-trailing（为什么需要两套）

SSoT 口径：`docs/ssot/runtime/logix-core/runtime/05-runtime-implementation.01-module-runtime-make.md`

### 3.1 `switch`（默认）：新 key 到来时让旧请求“自然过期”

直觉：只要 key 变了，旧结果就应该被丢弃。

实现要点：

- 新 refresh 会写入新的 loading(keyHash)；
- 旧 fiber 即便完成，也会因为 gate 不匹配而写回失败（不覆盖）。

### 3.2 `exhaust-trailing`：忙碌时记录 trailing，in-flight 完成后补跑一次

适用场景：你不想频繁取消/重开，而是想“忙的时候只保留最新一个 trailing”。

实现要点（可对照源码）：

- in-flight 存在时把最新 key 存为 trailing，并把字段立即更新到最新 loading（保证 UI 看到的是最新 key 的 loading）；
- in-flight 结束后，如果 trailing 还在，则补跑一次 trailing fetch。

---

## 4. list.item RowId：把“写回定位”从 index 提升为稳定身份

当 source 字段在 list.item 作用域下（例如 `items[].profileResource`），正确性最容易被数组 insert/remove/reorder 破坏：

- 仅靠 index 会写错行；
- 行移除后若不清理，会出现内存泄漏或“旧行 fiber 写回到新行”。

RowId 的作用是：把 IO in-flight 与 writeback 绑定到稳定身份上。

SSoT 对 RowId 的收益总结：`docs/ssot/runtime/logix-core/runtime/05-runtime-implementation.01-module-runtime-make.md`

实现锚点：

- RowId store + removed hook：`packages/logix-core/src/internal/state-trait/source.impl.ts`
- 行移除时清理 `inFlight/trailing`，避免错误归因与泄漏。

---

## 5. Replay Mode：re-emit，不 re-fetch

Replay 的目标不是“重跑网络”，而是“重赛当时发生过的事件时间线”。

### 5.1 ReplayLog：顺序消费模型（cursor）

实现入口：`packages/logix-core/src/internal/runtime/core/ReplayLog.ts`

- live：只追加记录；
- replay：按 predicate 消费下一条事件，cursor 前进；
- 缺失事件：停在当前可见状态，用于暴露“事实不完整”，而不是偷偷降级去发真实请求。

### 5.2 Source 在 replay 模式下的行为

实现入口：`packages/logix-core/src/internal/state-trait/source.impl.ts`

- 写入 loading：优先从 ReplayLog 消费 `phase=loading` 的事件（若存在）
- 写入 success/error：继续消费对应 phase 的事件并写回（同样受 keyHash gate 保护）
- 不调用 `ResourceSpec.load`

回归用例：

- `packages/logix-core/test/internal/ReplayMode.Resource.test.ts`（验证 replay 模式不触发 load）

---

## 6. Query engine 接线：把缓存/去重/重试下沉到 EffectOp middleware

Source 的正确姿势是：**source 只声明“要什么资源+key”，调用策略放在 middleware/engine**。

当前主线里，source-refresh 会构造一个 `EffectOp`（kind 通常为 `trait-source`），并通过 middleware stack 执行：

- EffectOp 对外 facade：`packages/logix-core/src/EffectOp.ts`
- middleware 组合与 linkId：`packages/logix-core/src/internal/runtime/core/EffectOpCore.ts`

你可以在 middleware 中实现：

- 资源缓存 / in-flight 去重；
- 重试 / 超时 / 熔断；
- query engine（如 TanStack Query）的委托执行；
- 观测（日志、指标、trace）与诊断增强。

反过来，千万不要把这些策略写进 selector 或 reducers（那会让事务窗口禁 IO 与回放语义全崩）。

---

## 7. 剧本集（用例驱动）

### 7.1 从 0 到 1：定义 ResourceSpec + 安装 program + 手动 refresh

最短可运行用例（建议直接读代码）：`packages/logix-core/test/internal/StateTrait/StateTrait.SourceRuntime.test.ts`

你会看到：

- `Resource.layer([spec])` 提供 `ResourceRegistry`；
- `StateTrait.install(bound, program)` 安装 refresh handler；
- `$.traits.source.refresh(fieldPath)` 触发一次 source-refresh；
- 最终 state 从 `idle → loading → success`，并可通过 link 把 data 派生到业务字段。

### 7.2 回放闭环：record 一次，再 replay 一次

参考用例：`packages/logix-core/test/internal/ReplayMode.Resource.test.ts`

它验证了关键不变量：

- record 模式会调用 `load` 并记录事件；
- replay 模式不调用 `load`，但最终 state 仍能收敛到同样的 success/data。

### 7.3 Devtools 解释链：把 ReplayEvent 挂到 state:update

参考用例：`packages/logix-core/test/StateTrait/StateTrait.ReplayEventBridge.test.ts`

它验证：写回 success/error 时，runtime 会把最后一次 `ResourceSnapshot` 作为 `state:update.replayEvent` 挂到 Debug 事件上，便于 Devtools 在事务视图解释“这次写回来自哪个资源事件”。

---

## 8. 代码锚点（Code Anchors）

- `packages/logix-core/src/StateTrait.ts`（source DSL）
- `packages/logix-core/src/Resource.ts`、`packages/logix-core/src/internal/resource.ts`（ResourceSpec/Registry/keyHash/Snapshot）
- `packages/logix-core/src/internal/state-trait/source.impl.ts`（两阶段提交、并发、RowId、replay）
- `packages/logix-core/src/internal/runtime/core/ReplayLog.ts`（ReplayLog 事件事实源）
- `packages/logix-core/src/EffectOp.ts`、`packages/logix-core/src/internal/runtime/core/EffectOpCore.ts`（middleware 接线）

回归测试：

- `packages/logix-core/test/internal/StateTrait/StateTrait.SourceRuntime.test.ts`
- `packages/logix-core/test/internal/ReplayMode.Resource.test.ts`
- `packages/logix-core/test/StateTrait/StateTrait.ReplayEventBridge.test.ts`

---

## 9. 常见坑（Anti-patterns）

1. **把 IO 塞进 selector/reducer/txn window**：Source 的 IO 必须在 txn 外；txn 内只做 loading/idle 的同步写回与收敛。
2. **不理解 keyHash gate，手动取消当成正确性依赖**：取消是 best-effort；正确性依赖 gate。
3. **list.item 不做 RowId 绑定**：写回会错行；行移除会泄漏；这类 bug 通常极难回放与解释。
4. **replay 模式偷偷 re-fetch**：会破坏“时间旅行=事实重赛”的一切假设；缺事件就应该暴露缺口，而不是静默降级。
5. **把 query/caching 策略写死在 source 或业务逻辑里**：策略应在 EffectOp middleware / engine 层实现，保证可替换与可诊断。

