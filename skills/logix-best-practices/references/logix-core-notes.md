---
title: Logix Core 注意事项（业务与核心边界）
---

# Logix Core 注意事项（业务与核心边界）

## 1) 当前公开主链

```ts
Module.logic(...)
Program.make(Module, config)
Runtime.make(Program)
```

- `Module.logic(...)` 是 canonical logic authoring entry。
- `Program.make(Module, config)` 是公开装配入口。
- `Runtime.make(Program)` 是公开运行入口。

## 2) Logic phase 规则

- 声明期只做声明/注册，禁止 IO。
- 运行期才允许 watcher/flow、service 调用、`run*Task`。
- 如果在 setup 调用 run-only API，会触发 `logic::invalid_phase`。

## 3) 多 watcher 要并行挂载

- `.run/.runLatest/.runExhaust/.runParallel/.update/.mutate/.run*Task` 都是长运行 Effect。
- 不要在一个 `Effect.gen` 里顺序 `yield*` 多条 watcher。
- 用 `Effect.all([...], { concurrency: 'unbounded' })` 并行挂载。

## 4) 事务窗口约束（最关键）

- 同步事务体内禁止 IO/await/promise。
- 同步事务体内禁止 dispatch/setState（会触发 `state_transaction::enqueue_in_transaction`）。
- 同步事务体内禁止调用 `run*Task`（会触发 `logic::invalid_usage` 并 no-op）。
- async 逃逸会触发 `state_transaction::async_escape`。

推荐写法：multi-entry（pending → IO → writeback）。

## 5) 状态写入策略

- 高频局部更新：`$.state.mutate(...)`。
- Action → State 同步更新：优先 `immerReducers`（必要时 `ModuleTag.Reducer.mutate`）。
- 整棵替换/回滚才用 `$.state.update(...)`。

## 6) `SubscriptionRef` 写入边界

- `runtime.ref(selector)` 返回派生只读视图，写入会失败（`Cannot write to a derived ref`）。
- 业务逻辑不要用 `SubscriptionRef.set/update` 绕过事务入口写状态。
- 写入应通过 reducer / mutate / task writeback 等事务入口，保证 patch/dirty-set/诊断链路完整。

## 7) 跨模块协作：同 tick 收敛 vs bridge

- 能静态表达 `read -> dispatch`：优先收敛到可解释、可静态分析的协作 contract。
- 需要 async/external bridge：显式承认 best-effort 语义，并把边界写清楚。
- 选择协作方式时，要优先保证同 tick 收敛与 IR 可解释性。

## 8) 锚点与诊断

- 关键链路应能回读 `instanceId/txnSeq/opSeq`。
- 事件导出必须保持 Slim + JsonValue，不能塞入不可序列化对象。

## 9) 延伸阅读（Skill 内）

- `references/agent-first-api-generation.md`
- `references/llms/02-module-api-basics.md`
- `references/llms/03-long-running-coordination-basics.md`
- `references/llms/04-runtime-transaction-rules.md`
- `references/llms/06-diagnostics-perf-basics.md`
