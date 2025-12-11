---
title: ModuleRuntime 实例与生命周期
---

这篇文档回答几个常见问题：

- “同一个模块在不同地方用，是不是同一个实例？”
- “`useModule(Impl)` 和在脚本里用 `Layer.build` 有什么区别？”
- “如果我只想构建一次 Env，然后到处复用，应该怎么做？”

我们会用三个概念来串起来：

- `Module`：蓝图，只描述 State/Action 形状；
- `ModuleImpl`：实装模块，描述“在某个 Env 下如何挂载这个 Module”；
- `ModuleRuntime`：运行时实例，也可以理解为“Store 的一棵 live 实例”。

## 1. 基本心智模型

```ts
// 蓝图：只描述数据和事件形状
export const RegionModule = Logix.Module.make("RegionModule", { state, actions })

// 逻辑：描述在这个蓝图上如何处理事件/状态
export const RegionLogic = RegionModule.logic<RegionService>(/* ... */)

// 实装模块：把蓝图和逻辑绑定在一起
export const RegionImpl = RegionModule.make<RegionService>({
  initial,
  logics: [RegionLogic],
})
```

- `RegionModule`：只描述 “Region 状态长什么样 / 有哪些 Action”；
- `RegionLogic`：描述“Region 的行为逻辑”；  
- `RegionImpl`：描述“在一个需要 `RegionService` 的环境里，这个模块如何挂到运行时上”——这里还没有具体实例；
- `ModuleRuntime`：真正的实例（可以 `getState` / `dispatch` 的那一棵）。

接下来所有例子，都围绕“如何构造 / 复用这棵 ModuleRuntime 实例”展开。

## 2. 脚本中：一次 Layer.build，多次使用 ModuleRuntime

在脚本或后台任务中，最直接的方式是：

```ts
const AppLayer = Layer.mergeAll(
  RegionServiceLive,     // 提供 Service 实现
  RegionImpl.layer,      // 模块实现 Layer
)

const main = Effect.scoped(
  Effect.gen(function* () {
    // 1) 在当前 Scope 上构建一次 Env（Layer.buildWithScope）
    const env = yield* Layer.buildWithScope(AppLayer, yield* Effect.scope)

    // 2) 用 module Tag 从同一个 Env 中拿到 runtime
    const region = Context.get(env, RegionImpl.module)

    // 3) 后续所有操作都复用这同一个 region 实例
    yield* region.dispatch({ _tag: "region/init", payload: undefined })
    const state1 = yield* region.getState
    const state2 = yield* region.getState
  }),
)

void Effect.runPromise(main)
```

要点：

- `Layer.buildWithScope(AppLayer, scope)` 只调用一次；
- 在这个 `env` 里，`Context.get(env, RegionImpl.module)` 每次拿到的都是同一个 `ModuleRuntime`；
- 后续只要复用这个 `env`，就是在操作同一棵实例。

如果你更习惯用 `ManagedRuntime`，可以这样封装：

```ts
const AppLayer = Layer.mergeAll(RegionServiceLive, RegionImpl.layer)
const runtime = ManagedRuntime.make(AppLayer)

const program = Effect.gen(function* () {
  const region = yield* RegionImpl.module
  // 这里的 region 就是 AppLayer 里那一棵 ModuleRuntime
})

void runtime.runPromise(program)
```

这里 `ManagedRuntime.make(AppLayer)` 内部会做一次 Layer.build，并托管 Scope；所有通过这个 runtime 跑的程序，都会共享同一组 ModuleRuntime 实例。

## 3. React 中的两类实例：全局 vs 局部

在 React 中，有两种常见用法：

### 3.1 全局实例：在 App 层构建 Env

如果你希望整个应用共享同一个 Region 实例，可以在 App 层组合 Layer：

```ts
const AppLayer = Layer.mergeAll(RegionServiceLive, RegionImpl.layer)
const appRuntime = ManagedRuntime.make(AppLayer)

root.render(
  <RuntimeProvider runtime={appRuntime}>
    <RegionPageUsingModuleTag />
  </RuntimeProvider>,
)

function RegionPageUsingModuleTag() {
  // 这里用的是 Module/Tag 形式
  const region = useModule(RegionModule)       // 或 RegionImpl.module
  const state = useSelector(region, (s) => s)
  // 所有使用 RegionModule 的地方，都会共享 appRuntime 里的那一棵实例
}
```

在这种模式下：

- `AppLayer` 只被构建一次；
- `RegionModule`/`RegionImpl.module` 都指向这个 env 中唯一的那棵 Region runtime；
- 所有 `useModule(RegionModule)`（Tag 模式）共享同一实例。

### 3.2 局部实例：用 ModuleImpl 在组件内构建局部 Scope

如果你希望**每个组件都有自己的 Region 实例**（类似组件局部 store），可以使用 ModuleImpl 形态：

```tsx
function RegionSection() {
  const region = useModule(RegionImpl)          // ModuleImpl
  const state = useSelector(region, (s) => s)
  // 这个 region 实例只属于当前组件
}
```

这条路径内部会：

1. 为当前组件创建一个局部 Scope；
2. 在这个 Scope 中对 `RegionImpl.layer` 进行一次 `Layer.build`；
3. 用 `RegionImpl.module` 从构建出的 Context 中拿到 runtime。

每个调用 `useModule(RegionImpl)` 的组件都会得到一棵独立的 ModuleRuntime 实例，与 App 层的全局实例互不影响。

## 4. 局部 Service + ModuleImpl：withLayer / withLayers

有时你想在局部区域直接绑定 Service 实现，而不依赖全局 `RuntimeProvider`。可以使用 `ModuleImpl.withLayer` / `withLayers`：

```ts
// Service Layer
const RegionServiceLive = Layer.succeed(RegionService, { /* ...实现... */ })
const LoggerServiceLive = Layer.succeed(LoggerService, { /* ...实现... */ })

// 1) 单棵 Layer：Impl.withLayer
export const RegionImplWithService = RegionImpl.withLayer(RegionServiceLive)

// 2) 多棵 Layer：Impl.withLayers（语法糖）
export const RegionImplWithMoreServices = RegionImpl.withLayers(
  RegionServiceLive,
  LoggerServiceLive,
)
```

在 React 中直接消费：

```tsx
function RegionSection() {
  // Impl 已经绑定好局部 Service Layer
  const region = useModule(RegionImplWithMoreServices)
  const state = useSelector(region, (s) => s)
}
```

这里的 Region 实例仍然是“每个组件一棵”，只是 Env 已经在 Impl 上预先提供好了。

## 5. 小结：什么时候是“同一个实例”？

可以这样记：

- **同一个 `Layer.build` + 同一个 `ModuleInstance`（Tag）** → 同一个 `ModuleRuntime` 实例；
- **不同的 `Layer.build`** → 不同实例，即使用的是同一个 `ModuleImpl`；
- **React 中：**
  - `useModule(RegionModule)`（Tag） + 全局 AppLayer → 共享 App 级实例；
  - `useModule(RegionImpl)` → 每个组件一个局部实例；
  - `useModule(RegionImplWithService)` → 每个组件一个局部实例，且 Impl 自带 Service Env；
  - 在同一 Runtime 链上嵌套多个 `RuntimeProvider layer={...}` 时，内层 Provider 的 `layer` 会在同名 Service Tag 上覆盖外层 Env（适合做“几乎相同但略有差异”的局部配置）。

推荐实践：

- 想要“页面级/应用级单例 Store”——用 Tag 形式 (`RegionModule` / `RegionImpl.module`) + App 级 Layer/Runtime。
- 想要“组件级局部 Store”——用 ModuleImpl 形态 (`useModule(RegionImpl)` / `RegionImpl.withLayer(...)`)。
