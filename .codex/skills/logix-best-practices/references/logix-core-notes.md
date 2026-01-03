---
title: Logix Core 注意事项（业务开发）
---

# Logix Core 注意事项（业务开发）

本文件聚焦业务开发最常踩坑的运行时语义：`ModuleDef.logic` 的两阶段（setup/run）、Phase Guard、以及 Service/Env 泛型的写法约束。

## 1) `ModuleDef.logic`：两阶段（setup / run）是硬约束

心智模型：

- `SomeDef.logic(($) => ({ setup, run }))` 的 builder 闭包会被执行一次，产出 `LogicPlan = { setup, run }`。
- builder return 前的“同步注册调用”归入 `setup`；return 的 Effect 归入 `run`。
- 旧写法 `SomeDef.logic(($) => Effect.gen(...))` 等价于“只有 run 段”（`setup = Effect.void`）。

### 1.1 setup 段（只做声明/注册）

setup 约束（必须遵守）：

- 不访问 Env/Service（禁止 `$.use(...)`）。
- 不挂 watcher/flow（禁止 `$.onAction* / $.onState* / $.flow.from*`）。
- 不做 IO；不在 builder 顶层执行 `Effect.run*`。
- 保持幂等（React StrictMode/热重载可能导致重复装配；幂等可减少诊断噪声）。

setup 里允许做什么（示例）：

- 注册/声明类能力：`$.lifecycle.*`、`$.reducer(...)`、`$.traits.declare(...)`（注意：`$.traits.declare` **仅允许在 setup**）。

### 1.2 run 段（挂 watcher/flow + 访问 Env）

run 里才允许：

- `yield* $.use(Tag)` 读取 Service；
- `yield* $.onAction(...).run* / $.onState(...).run*` 挂载 watcher；
- `yield* $.flow.from*`、IntentBuilder 的 `.run* / .run*Task / .update / .mutate / .andThen` 等“会产生运行时行为”的 API。

### 1.3 最小模板（推荐显式写 setup/run）

```ts
export const SomeLogic = SomeDef.logic<MyServiceTag>(($) => ({
  setup: Effect.void, // 或 Effect.sync(() => $.traits.declare(...))
  run: Effect.gen(function* () {
    const svc = yield* $.use(MyServiceTag)
    // 在这里挂 watcher/flow 并 yield* 它们
  }),
}))
```

## 2) Phase Guard：常见报错与修复

### 2.1 `LogicPhaseError(kind="use_in_setup")`

触发原因：在 setup（或 builder 顶层）调用了 run-only 能力，例如：

- `$.use(...)`
- `$.onAction* / $.onState*`
- `$.flow.from*`
- IntentBuilder 的 `.run* / .run*Task / .update / .mutate / .andThen`

修复：把该调用移动到 `run` 段（或旧写法的 Effect 主体）中。

### 2.2 `LogicPhaseError(kind="traits_declare_in_run")`

触发原因：在 `run` 里调用了 `$.traits.declare(...)`（traits 在 setup 后被冻结）。

修复：把 `$.traits.declare(...)` 移到 `setup` 段。

### 2.3 仅在生产构建/打包后触发（dev 正常）

如果 **dev server 正常**，但在 **生产构建产物**里一运行就报 `LogicPhaseError(kind="use_in_setup")`（例如 `$.use is not allowed in setup phase`），不要只盯“业务写法”，优先按两类排查：

- **写法**：`$.use` / `$.onAction*` / `$.onState*` 是否误写在 builder 顶层或 `setup` 段（见 1.1/1.2）。
- **运行时相位传递（版本/打包形态差异）**：当 Logic 以“Effect 返回 `{ setup, run }`”的形态存在时，若运行时在解析/执行 plan 时相位上下文传递出错，run 段会“看起来像在 setup”。这通常不是业务代码问题：优先升级 `@logix/core`（或回退到已知稳定版本），并在问题单里附上最小复现与上述错误码。

## 3) Env/Service 泛型：写 Tag 类型本身，不要写 `typeof`

在 `SomeDef.logic<R>` / `SomeDef.implement<R>` 里，`R` 填 **Tag 类型本身**：

- ✅ `SomeDef.logic<MyServiceTag>(...)`
- ❌ `SomeDef.logic<typeof MyServiceTag>(...)`

同理，Service 实现通过 Layer/提供者注入（而不是在 Logic/Pattern 内“偷偷 provide”）。

## 4) 长运行 watcher：不要在一个 `Effect.gen` 里顺序 `yield*` 多条 `.run*`

`$.onAction / $.onState / $.on` 的链尾 `.run / .runLatest / .runExhaust / .runParallel / .update / .mutate / .run*Task` 都会返回**长运行**的 Effect（生命周期绑定 ModuleRuntime 的 Scope，通常不会自行结束）。

常见误区：

- 在一个 `Effect.gen(function*(){ ... })` 里顺序 `yield*` 多条 watcher，会导致**只有第一条** watcher 真正启动，后面的代码永远到不了。

推荐写法：把多条 watcher 放进 `Effect.all` 并行启动：

```ts
run: Effect.gen(function* () {
  yield* Effect.all(
    [
      $.onAction('A').run(() => Effect.void),
      $.onState((s) => s.count).runLatest(() => Effect.void),
    ],
    { concurrency: 'unbounded' },
  )
})
```

## 5) 状态写入：优先 `mutate` / `immerReducers`，避免 `update` 触发 dirtyAll 退化

运行时需要“字段级 dirty-set 证据”来做增量派生/校验与可解释诊断；缺失时会退化为 `path="*"`，并在 dev/test 下给出：

- `state_transaction::dirty_all_fallback`（warning）

建议：

- 高频、局部字段更新：优先 `$.state.mutate((draft) => { ... })`
- Action → State 的纯同步更新：优先 `Module.make(..., { immerReducers: { ... } })`（或 `$.reducer(tag, Logix.ModuleTag.Reducer.mutate(...))`）
- 只有在你确实要“整棵替换”时才用 `$.state.update((prev) => next)`（会更容易触发 dirtyAll）

补充（067 action surface）：

- `immerReducers` / `Reducer.mutate(mutator)` 的 **mutator 回调**是 payload-first：`(draft, payload) => void`（不要写 `(draft, action) => ...`）。
- `mutate` 返回的 reducer 仍然按 `(state, action, sink?) => state` 的形态运行：运行时会从 action 上提取 payload 并按需记录 patchPaths。

## 6) 长链路（pending → IO → writeback）：优先用 `run*Task`

当你需要「先写入 loading → 做 IO → 成功/失败写回」并且希望并发语义清晰（latest/exhaust/parallel/task），推荐用 `runTask / runLatestTask / runExhaustTask / runParallelTask`：

- `pending`：作为**独立事务入口**执行（只做同步写入）
- `effect`：在**事务窗口之外**执行（可以 `yield* $.use(...)` 调服务）
- `success/failure`：IO 完成后作为**独立事务入口**写回
- `failure` 入参是 `Cause<E>`（可用 `Cause.failureOption` 提取领域错误）

注意：

- `run*Task` **禁止**在同步事务 body 内调用（如 reducer / `IntentBuilder.update/mutate` 的同步写入体内），会触发 `logic::invalid_usage` 并被 no-op。
- 同步事务窗口内 **禁止** `dispatch/setState`（例如在 reducer、或 `IntentBuilder.update/mutate` 的同步写入体内触发 `$.dispatch/$.dispatchers/*`）。这会触发 `state_transaction::enqueue_in_transaction` 并直接失败；把 dispatch 移到事务外（或改成 multi-entry：pending → IO → writeback）。
