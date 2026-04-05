# 5. Global Module 的生命周期（AppRuntime 路径）

Global Module 的 Scope 由 **AppRuntime 根 Scope** 管理。本节结合 AppRuntime 的实现，说明全局模块如何挂载与销毁。

## 5.1 AppRuntime 与 AppDefinition

在 runtime 层，AppRuntime 的定义集中在 `AppRuntime.ts` 中：

```ts
export interface AppModuleEntry {
  readonly module: ModuleTag<any, any>
  readonly layer: Layer.Layer<any, any, any>
  /**
   * 可选：显式声明“该模块 layer 提供的 ServiceTag 列表”，仅用于 App 装配期的 tag collision 检测与拓扑分析。
   * 不影响运行时行为；缺省则视为“未声明任何 service tags”。
   */
  readonly serviceTags?: ReadonlyArray<Context.Tag<any, any>>
}

export interface LogixAppConfig<R> {
  readonly layer: Layer.Layer<R, never, never> // App 级基础 Env
  readonly modules: ReadonlyArray<AppModuleEntry> // 全局模块列表
  readonly processes: ReadonlyArray<Effect.Effect<void, any, any>> // 长生命周期进程（Process/Link 或 raw Effect fallback）
  readonly onError?: (cause: import('effect').Cause.Cause<unknown>) => Effect.Effect<void>
  readonly stateTransaction?: StateTransactionRuntimeConfig
  readonly concurrencyPolicy?: ConcurrencyPolicy
  readonly readQueryStrictGate?: ReadQueryStrictGateRuntimeConfig
}

export interface AppDefinition<R> {
  readonly definition: LogixAppConfig<R>
  readonly layer: Layer.Layer<R, never, never>                // 聚合后的 App Layer
  readonly makeRuntime: () => ManagedRuntime.ManagedRuntime<R, never>
}
```

`makeApp` 的核心流程（简化且与实现一致）：

1. 校验 `modules[].module.id` 唯一性（重复直接抛错）。
2. `validateTags(config.modules)`：
   - 总是记录每个模块的 ModuleTag 自身；
   - 若 entry 携带 `serviceTags`，则也参与 collision 检测（仅元信息，不影响运行时行为）；
   - 跨模块 key 冲突则抛 `TagCollisionError`（禁止依赖 Layer merge 顺序静默覆盖）。
3. 构造 `baseLayer`：合并 `config.layer` + runtime_default 配置服务（StateTransaction / ConcurrencyPolicy / ReadQueryStrictGate）+ `ProcessRuntime.layer()` + `RootContextTag`。
4. 构造 `moduleLayers`：对每个 entry 执行 `Layer.provide(entry.layer, baseLayer)`，避免模块初始化期缺失 App 级 Env。
5. 构造 `envLayer`：`Layer.mergeAll(baseLayer, ...moduleLayers)`。
6. 在 `Layer.unwrapScoped(...)` 中：
   - `Layer.buildWithScope(envLayer, scope)` 并 `Effect.diffFiberRefs(...)` 回灌 FiberRef patch；
   - 完成 `RootContext.ready`（root provider 的单一事实源）；
   - 启动 `config.processes`：优先 `ProcessRuntime.install(...)`，raw Effect 作为 fallback 仍会被 `forkScoped`。
7. 返回 `finalLayer` 并用 `ManagedRuntime.make(finalLayer)` 持有 App Scope。

**关键点：**

- 所有 `modules[].layer` 会挂在 **同一棵 App Scope** 下；当 AppRuntime `dispose()` 时，Scope 关闭，所有全局 ModuleRuntime 与 app-scope processes 统一销毁。
- Root provider（`Root.resolve` 等）以 `RootContextTag` 为单一事实源：Env 完全构建后才会 `Deferred.succeed(ready, env)` 解除阻塞，避免初始化阶段“服务缺失噪音”。

## 5.2 AppRuntime.provide 与 ModuleImpl

为了方便把模块挂到 App 上，AppRuntime 的 `provide` 帮助函数提供了两种调用方式：

```ts
// 1. 显式指定 ModuleTag + Layer/Runtime（适合高级用法）
AppRuntime.provide(
  SomeDef.tag,
  SomeDef.live(initial, ...logics) // 或已经构造好的 ModuleRuntime
)

// 2. 通过 program module 取 layer（常见）
const SomeModule = SomeDef.implement({ initial, logics: [...] })
AppRuntime.provide(SomeDef.tag, SomeModule.impl.layer)
```

在 App 级 Runtime 中，可以抽象为“Root ModuleImpl + AppInfraLayer” 的组合（由 `Logix.Runtime.make` 封装）。在 React 场景下，典型用法是：

```tsx
// CounterDef = Logix.Module.make(...)
const CounterModule = CounterDef.implement({ initial: { count: 0 }, logics: [CounterLogic] })

const appRuntime = Logix.Runtime.make(CounterModule, {
  layer: AppInfraLayer,
})

function Root() {
  return (
    <RuntimeProvider runtime={appRuntime}>
      <App />
    </RuntimeProvider>
  )
}

function CounterView() {
  const runtime = useModule(CounterDef) // ModuleDef（全局实例）
  const count = useSelector(runtime, (s) => s.count)
  const dispatch = useDispatch(runtime)
  // ...
}
```

- `useModule(Tag)` 使用当前 AppRuntime 运行 Tag Effect：
  - 本质是 `ManagedRuntime.runSync(Tag)`，从 App 级 Env 中取出对应的 `ModuleRuntime` 实例；
  - 所有使用同一个 Tag 的组件共享这棵 ModuleRuntime（「全局模块」语义）。
- 当宿主显式调用 `ManagedRuntime.dispose()`（当前实现中通常在应用卸载时处理）时，App Scope 被关闭：
  - 所有通过 `modules[].layer` 创建的 ModuleRuntime 会统一触发 `onDestroy`；
  - 所有通过 `processes` 启动的协调器/长期任务也会一起终止。

## 5.4 Global vs Local 的对比视角

- Global Module（通过 AppRuntime 挂载）：
  - ModuleRuntime 的 Scope 挂在 AppRuntime 根 Scope 上；
  - `useModule(Tag)` 只能看到这棵全局实例；
  - 适合 Auth、全局配置、跨页面共享的 Domain 模块。

- Local Module（通过 `ModuleImpl + useModule(Impl)` 挂载）：
  - ModuleRuntime 的 Scope 由 React 侧资源缓存（ModuleCache）托管：按 key 复用/保活/GC；
  - 适合页面/组件局部状态，不需要注册到 App 层。

这两种模式在实现层共用同一套 `ModuleRuntime.make` / Layer 机制，只是 **Scope 的挂载点不同**：

- Global Module：挂在应用级 Runtime Scope；
- Local Module：挂在 React 组件局部 Scope。
