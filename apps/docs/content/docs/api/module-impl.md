---
title: ModuleImpl 与 React 集成
---

`ModuleImpl` 是 Logix 运行时里的“实装模块单元”：在某个 Env 下，如何挂载这个 Module 的初始状态和逻辑。它是 React / App 组装的主要落点。

## 1. 核心类型与 API

在 `@logix/core` 中，`ModuleImpl` 的定义简化如下：

```ts
interface ModuleImpl<Id extends string, Sh extends AnyModuleShape, REnv = never> {
  readonly _tag: "ModuleImpl"
  readonly module: ModuleInstance<Id, Sh>
  readonly layer: Layer.Layer<
    ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>,
    never,
    REnv
  >

  // 在当前 Impl 基础上附加一棵额外的 Layer，返回新的 Impl。
  readonly withLayer: <R2>(
    layer: Layer.Layer<REnv, never, R2>
  ) => ModuleImpl<Id, Sh, R2>
}

interface ModuleInstance<Id extends string, Sh extends AnyModuleShape> {
  make<R = never>(config: {
    initial: StateOf<Sh>
    logics?: Array<ModuleLogic<Sh, R, never>>
  }): ModuleImpl<Id, Sh, R>
}
```

- `module`：Module 蓝图（Tag），用于从 Context 中取出对应的 `ModuleRuntime`；
- `layer`：挂好 Logic 的 Layer，Env 类型为 `REnv`；
- `withLayer`：在当前 Impl 的基础上叠加一棵额外的 Layer（通常是 Service 实现），生成新的 Impl。

## 2. 基本用法：从 Module 到 ModuleImpl

从业务视角，推荐写法是：

```ts
// 1. 定义 Module（Shape + Logic）
export const RegionModule = Logix.Module("RegionModule", { state, actions })

export const RegionLogic = RegionModule.logic<RegionService>(($) =>
  Effect.gen(function* () {
    // ...
  }),
)

// 2. 定义 ModuleImpl：选定 initial 与默认逻辑
export const RegionImpl = RegionModule.make<RegionService>({
  initial: {
    province: undefined,
    city: undefined,
    district: undefined,
    provinceOptions: [],
    cityOptions: [],
    districtOptions: [],
    isLoading: false,
  },
  logics: [RegionLogic],
})
```

此时：

- `RegionImpl` 表示“在某个 Env 下，这个 Region 模块如何挂载”；
- `RegionImpl.layer`：依赖 `RegionService` 的 Layer；
- `RegionImpl.module`：可以作为 Tag，从 Context 中拿到对应的 `ModuleRuntime`。

## 3. React 中消费 ModuleImpl

在 `@logix/react` 中，可以直接通过统一的 `useModule(handle)` 消费 ModuleImpl：

```tsx
function RegionPage() {
  const region = useModule(RegionImpl)            // ModuleImpl
  const state = useSelector(region, (s) => s)     // 读取 state
  // ...
}
```

`useModule` 会在组件级 Scope 内：

1. 使用 `RegionImpl.layer` 构造 `ModuleRuntime`；
2. 在卸载时关闭 Scope，释放资源。

> 注意：`RegionImpl.layer` 的 Env 类型为 `RegionService`，因此需要在上层 Runtime 中提供对应的 Service 实现。

典型的 Service Layer 提供方式：

```ts
export const RegionServiceLive = Layer.succeed(RegionService, {
  getProvinces: () => Effect.succeed([...]),
  getCities:    (code: string) => Effect.succeed([...]),
  getDistricts: (code: string) => Effect.succeed([...]),
})
```

在 React 根部可以通过 `RuntimeProvider` 注入（推荐使用 `runtime` + 根 Layer 的组合）：

```tsx
const appRuntime = ManagedRuntime.make(RegionServiceLive)

root.render(
  <RuntimeProvider runtime={appRuntime}>
    <RegionPage />
  </RuntimeProvider>
)
```

## 4. Impl.withLayer：生成带 Service 的 Impl

在某些场景下，你希望某个 Impl 在**局部区域**直接绑上 Service 实现，不依赖外层的 `RuntimeProvider`。可以使用 `ModuleImpl.withLayer`：

```ts
// 基于 RegionImpl 生成“带 Service 的 Impl”
export const RegionImplWithService = RegionImpl.withLayer(RegionServiceLive)
// 类型：ModuleImpl<"RegionModule", RegionShape, never>
```

在 React 组件中直接消费：

```tsx
function RegionSection() {
  // 不需要额外 provide，Impl 自己已经带上 Service Layer
  const region = useModule(RegionImplWithService)
  const state = useSelector(region, (s) => s)
  // ...
}
```

如果有多棵 Service Layer，可以使用 `withLayers` 语法糖：

```ts
const RegionImplWithMoreServices = RegionImpl.withLayers(
  RegionServiceLive,
  LoggerServiceLive,
  // ...
)
```

等价于：

```ts
RegionImpl.withLayer(
  Layer.mergeAll(RegionServiceLive, LoggerServiceLive /* ... */),
)
```

在 Node / CLI 中也可以这样使用：

```ts
const main = Effect.gen(function* () {
  // build Impl 的 Layer，拿到 Context
  const ctx = yield* RegionImplWithService.layer.pipe(
    Layer.build,
    Effect.scoped,
  )

  // 用 module Tag 取出 runtime
  const region = Context.get(ctx, RegionImplWithService.module)

  yield* region.dispatch({ _tag: "region/init", payload: undefined })
  const state = yield* region.getState
  console.log("region state:", state)
})
```

## 5. 与 Runtime 的装配

`ModuleImpl` 通常作为 Root Module 的实现蓝图，配合 `LogixRuntime.make` 构建应用级 Runtime：

```ts
import { Logix, LogixRuntime } from "@logix/core"
import { Layer } from "effect"

export const RegionModule = Logix.Module("RegionModule", { state, actions })
export const RegionImpl = RegionModule.make({
  initial: { /* ... */ },
  logics: [RegionLogic],
  imports: [RegionServiceLive],
  processes: [/* 与 Region Feature 相关的长期进程（含 Link） */],
})

export const RegionRuntime = LogixRuntime.make(RegionImpl, {
  layer: Layer.empty, // 或叠加 AppInfra / ReactPlatformLayer 等
})
```

在 React 中：

```tsx
<RuntimeProvider runtime={RegionRuntime}>
  <App />
</RuntimeProvider>
```

## 6. 示例与进阶阅读

- 你可以在仓库的 `examples/logix-react` 中看到完整的 React 集成示例：
  - `modules/counter.ts` / `modules/counterAll.ts`：分别展示 `runFork` 与 `Effect.all + run` 两种 watcher 写法；
  - `modules/counterMulti.ts` + `App.tsx`：对比 Tag 模式（全局实例共享）与 ModuleImpl 模式（组件局部实例）。
- 关于 watcher 写法与 Scope / 生命周期的详细讨论，可以参考文档《Watcher 模式与生命周期》（高级章节）。
