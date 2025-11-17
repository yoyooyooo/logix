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
- **运行时相位传递**：当 Logic 以 LogicPlanEffect（Effect 返回 `{ setup, run }`）形式存在时，解析 plan 与执行 plan 的 phaseRef 必须保持一致；否则 run 段会“看起来像在 setup”。入口：`packages/logix-core/src/internal/runtime/ModuleFactory.ts`、`packages/logix-core/src/internal/runtime/core/ModuleRuntime.logics.ts`。

## 3) Env/Service 泛型：写 Tag 类型本身，不要写 `typeof`

在 `SomeDef.logic<R>` / `SomeDef.implement<R>` 里，`R` 填 **Tag 类型本身**：

- ✅ `SomeDef.logic<MyServiceTag>(...)`
- ❌ `SomeDef.logic<typeof MyServiceTag>(...)`

同理，Service 实现通过 Layer/提供者注入（而不是在 Logic/Pattern 内“偷偷 provide”）。
