---
title: Scope 与资源生命周期
description: 用可推导的心智模型理解 Effect / Logix 里“逻辑何时生效、何时被中断、何时触发清理”。
---

很多“诡异问题”其实只有一个根因：

> 你以为某段逻辑挂在 A 的生命周期里，实际它挂在 B 的 `Scope` 上。

一旦你把 `Scope` 讲清楚，`onDestroy`、取消、中断、`finalizer`、React 严格模式下的重复挂载，都能用同一套模型解释。

## 1) `Scope` 到底是什么？

在 Effect 里，`Scope` 可以理解为**一块资源挂载点**：

- 资源在某个 `Scope` 上“注册”（连接、订阅、后台 Fiber、注册表条目…）；
- `Scope` 关闭时：
  - 该 `Scope` 上挂出的长生命周期 Fiber 会被中断；
  - 在这个 `Scope` 上注册的 `finalizer` 会执行（用于清理）。

## 2) 4 个你必须会对号入座的 API

下面四个 API 组成了“资源生命周期”的最小语法：

1. `Effect.scoped(effect)`：打开一个临时 Scope，运行 `effect`，结束时自动关闭 Scope。
2. `Layer.scoped(Tag, effect)`：把一个“带生命周期的服务”挂到当前 Scope；Scope 关闭时服务随之释放。
3. `Effect.forkScoped(effect)`：把一个 Fiber 挂到当前 Scope；Scope 关闭时 Fiber 会被中断。
4. `Effect.addFinalizer(cleanup)`：把清理逻辑注册到当前 Scope；Scope 关闭时触发。

> 关键点：`Effect.addFinalizer(...)` 的触发条件是“当前 Scope 关闭”，不是“当前 Fiber 结束”。
> 如果你需要“这段 Effect 结束就清理”，用 `Effect.acquireRelease` / `Effect.ensuring`。

## 3) 三问法：判断你的逻辑挂在哪个 Scope

当你想知道“什么时候会被掐断/什么时候会触发清理”，只问三个问题：

1. **当前 Scope 是谁创建的？**（`Effect.scoped` / `Layer.buildWithScope` / React Hook / 你的宿主代码）
2. **谁负责关闭它？**（`runtime.dispose()` / `Scope.close(...)` / React 卸载 / key 变更 / GC）
3. **关闭时会影响哪些东西？**（哪些 Fiber 是 `forkScoped` 出去的、哪些 cleanup 是 `addFinalizer` 注册的）

## 4) Logix 里最常见的 Scope 边界（你需要能背出来）

Logix 把很多生命周期“产品化”了，本质仍然是 Scope：

### 4.1 Runtime Scope（全局）

- 由 `Logix.Runtime.make(...)` 构造的 Runtime 持有。
- 典型关闭方式：
  - 宿主显式调用 `runtime.dispose()`；
  - Node/CLI 用 `Runtime.runProgram/openProgram`，在结束/收到信号时关闭 `ctx.scope`（从而触发释放）。
- React：`RuntimeProvider` **不会**自动调用 `runtime.dispose()`（runtime 可能被多处共享）。因此：
  - 普通 SPA：把 runtime 做成模块级单例（不要在 render 里 new），通常无需显式 dispose；
  - 微前端/重复 mount-unmount/测试：在“创建 runtime 的宿主边界”调用 `runtime.dispose()`（例如微前端 `unmount()`、或 React root 的 teardown）。
- 影响：全局模块（`useModule(Tag)` 解析到的实例）会在这里触发 `onDestroy`。

### 4.2 局部模块 Scope（Local Module / 多实例）

- 由 `useModule(Impl)` / `useLocalModule(Module)` / `ModuleScope` 创建并管理（通常带缓存与 `gcTime`）。
- 典型关闭方式：最后一个持有者卸载后（可能延迟一段 `gcTime`）关闭。
- 影响：局部模块的 `onDestroy` 不等于“某个组件卸载”，而等于“这个实例的 Scope 关闭”。

### 4.3 `RuntimeProvider.layer` Scope（局部 Env）

- 每个 `RuntimeProvider.layer` 都会创建一个独立 Scope 来构建 `Layer`。
- 典型关闭方式：Provider 卸载，或 `layer` 引用发生变化触发重建。
- 影响：只影响该子树下的 Env 覆盖（服务/Logger/Debug sinks 等），不等价于 `runtime.dispose()`。

## 5) `addFinalizer` vs `ensuring/acquireRelease`：别用错

### 5.1 你想要“随 Scope 关闭而清理” → 用 `addFinalizer`

典型场景：注册/反注册、订阅/退订、把某个句柄挂到全局表里等。

```ts
const Logic = M.logic(($) =>
  Effect.gen(function* () {
    const unsubscribe = subscribeSomething()
    yield* Effect.addFinalizer(() => Effect.sync(() => unsubscribe()))
  }),
)
```

### 5.2 你想要“这段 Effect 结束就清理” → 用 `ensuring/acquireRelease`

典型场景：打开资源 → 使用 → 关闭资源；即使中断/失败也必须关。

```ts
const program = Effect.acquireRelease(
  Effect.sync(() => openResource()),
  (res) => Effect.sync(() => closeResource(res)),
).pipe(Effect.flatMap((res) => useResource(res)))
```

## 6) 常见踩坑清单（最值得在 Code Review 里查）

- 把 `useModule(Tag)` 当成“随组件卸载就销毁”的局部状态：错。它是 Runtime 级实例，生命周期取决于 `runtime.dispose()`。
- 在 `RuntimeProvider` 里每次 render 都创建新 `Layer`/新数组：会导致 Provider layer Scope 频繁重建、产生抖动；用 `useMemo` 固定引用。
- 在 `logic()` 的 setup 段做 IO 或读取 Env：容易触发 `logic::invalid_phase` / `logic::setup_unsafe_effect`；把 IO 放到 `onInitRequired/onStart` 或 run 阶段的 Watcher 里。
- 在 Watcher 里期待 `addFinalizer` “任务结束就触发”：错。`addFinalizer` 跟着 Scope；任务级清理用 `ensuring/acquireRelease`。

## 下一步

- Watcher 如何挂载/停止：见 [生命周期与 Watcher 模式](../learn/lifecycle-and-watchers)。
- 需要“真正取消网络请求”：见 [可中断 IO（取消与超时）](./resource-cancellation)。
