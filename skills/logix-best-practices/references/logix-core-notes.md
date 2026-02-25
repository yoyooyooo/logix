---
title: Logix Core 注意事项（业务与核心边界）
---

# Logix Core 注意事项（业务与核心边界）

## 1) API 命名约定：`*.make`

- 当前实践对外构造语义以 `*.make` 为主（如 `Logix.Module.make`）。
- 技术决策与文档示例都应避免回到 `*.define` 风格。

## 2) `ModuleDef.logic` 两阶段是硬约束

- `setup`：只做声明/注册；禁止 `$.use`、禁止 watcher/flow、禁止 IO。
- `run`：才允许 `$.use`、`$.onAction`、`$.onState`、`$.flow`、`run*Task`。
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

## 7) 跨模块协作：`linkDeclarative` vs `link`

- 能静态表达 `read -> dispatch`：默认 `Process.linkDeclarative`。
- 需要 async/external bridge：使用 `Process.link`，并接受 best-effort 语义。
- 选择协作方式时，要优先保证同 tick 收敛与 IR 可解释性。

## 8) 锚点与诊断

- 关键链路应能回读 `instanceId/txnSeq/opSeq`。
- 事件导出必须保持 Slim + JsonValue，不能塞入不可序列化对象。

## 9) 延伸阅读（Skill 内）

- `references/llms/02-module-api-basics.md`
- `references/llms/03-flow-process-basics.md`
- `references/llms/04-runtime-transaction-rules.md`
- `references/llms/06-diagnostics-perf-basics.md`
- `references/llms/99-project-anchor-template.md`（可选）
