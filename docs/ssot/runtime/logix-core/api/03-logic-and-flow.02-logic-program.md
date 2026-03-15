# 2. Logic (The Program)

Logic 是一段在 `Logic.Env<Sh,R>` 上运行的长生命周期 Effect 程序：

```ts
type Env<Sh, R> = Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>> & R;
type Fx<Sh, R, A, E> = Effect.Effect<A, E, Env<Sh, R>>;
```

## 2.1 Logic 程序（标准范式）

当前主线推荐的 Logic 形态是：在 `Logic.Env<Sh,R>` 上运行的一段 `Effect.gen` 程序，
通常通过 `ModuleDef.logic`（或带 `.impl` 的 `Module.logic`）注入 Bound API `$`：

在推荐范式下，Logic 作者通常通过 `ModuleDef.logic(($)=>Effect.gen(...))` 直接在回调中使用注入的 `$`；
对于 Pattern / Namespace 等二次封装场景，建议直接使用 `Logix.Bound.make(shape, runtime)` 在实现层构造 `$`，并让调用方显式注入 `$`。

## 2.2 两阶段 Logic Bootstrap（setup/run）

> 目标：消除初始化期的 “Service not found” 噪音，保证 Env 就绪后才运行需要依赖的逻辑；在不改变 `ModuleDef.logic(($)=>Effect)`（或带 `.impl` 的 `Module.logic(($)=>Effect)`）形态的前提下，明确 setup / run 分层语义。

- **builder 闭包的一次性执行 = 构造 LogicPlan**
  - 闭包体内的同步注册调用归入 **setup 段**：只允许注册 reducer、lifecycle、Debug/Devtools hook，不访问 Env/Service，不做 IO。
  - 闭包 `return` 的 Effect 归入 **run 段**：在「完全铺好 Env 的 runtime」上以长期 Fiber 运行，允许访问 `EnvTag`、挂载 `$.onAction / $.onState`、Flow/Process 等。
- **运行时时序**
  1. ModuleRuntime.make t=0：执行所有 Logic 的 setup，完成注册并保证幂等（StrictMode 下重复注册会触发诊断而非静默覆盖）。
  2. 必需初始化门禁：Runtime 在 fork run fibers 前，按注册顺序串行执行 `$.lifecycle.onInitRequired/onInit`（blocking）；全部成功后实例进入 `ready`，失败则本次初始化失败并进入 `failed`（对消费方可观测）。
  3. Env Ready：AppRuntime/RuntimeProvider 构建完 `envLayer` 后，统一 `forkScoped(plan.run)`；此后若出现 `Service not found` 即视为真实配置错误。
  4. 启动任务：实例进入 `ready` 后启动 `$.lifecycle.onStart`（non-blocking）；失败必须被上报，但默认不应影响实例可用性（除非策略显式选择 fatal）。
  5. 终止清理：实例终止/Scope 关闭时执行 `$.lifecycle.onDestroy`（LIFO + best-effort），并在必要时触发 `$.lifecycle.onError` 做最后上报。
- **非法用法矩阵（DEV 诊断）**
  - 在 setup 段调用 run-only 能力（`$.onAction/$.onState/$.use/$.root.resolve` 等） → `diagnostic(error) code=logic::invalid_phase kind=...`，提示将调用移至 run 段。
  - 在 builder 顶层直接执行 Effect（`Effect.run*` 等） → `diagnostic(error) code=logic::setup_unsafe_effect`，提示不要在 setup 阶段做 IO。
  - 重复注册 reducer / lifecycle → 诊断去重并提示 StrictMode 可能触发多次初始化。
    注：`ModuleDef.logic(($)=>Effect.gen(...))` 默认被解释为“仅含 run 段”；推荐写法是在 return 前完成注册，return 内部编写业务 Watcher/Flow。

**Phase Guard 行为矩阵（Bound API 视角）**

| API 分组                                                                                                                 | 允许阶段 | 违规时行为                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$.onAction*` / `$.onState*` / `$.flow.from*` / IntentBuilder `.run/.runLatest/.runParallel/.runExhaust/.update/.mutate` | run      | 在 setup 段调用 → 抛 `LogicPhaseError(kind=\"use_in_setup\", api=...)` → 记录 `diagnostic code=logic::invalid_phase severity=error`（Runtime 仍完成构造） |
| `$.use` / `$.root.resolve`                                                                                               | run      | 在 setup 段调用 → 同上；若 Env 未就绪还会额外发出 `logic::env_service_not_found`（warning/error）诊断                                                     |
| `$.lifecycle.*`（注册类 API）                                                                                            | setup    | 在 run 段调用 → 抛 `LogicPhaseError(kind=\"lifecycle_in_run\", api=...)` → 记录 `diagnostic code=logic::invalid_phase severity=error`，且该次注册不得生效 |
| `$.reducer` / Debug/Devtools 注册                                                                                        | setup    | 重复注册触发 `reducer::duplicate/late_registration` 等诊断，但不破坏构造                                                                                  |
| builder 顶层 `Effect.run*`                                                                                               | 都不允许 | 触发 `logic::setup_unsafe_effect` 诊断，提示将 IO 移至 run 段                                                                                             |

> 诊断字段结构化：`kind/api/phase/moduleId` 等字段可被 DevTools 与平台直接消费，无需字符串解析；所有诊断均通过 `DebugSink` 广播。

## 2.3 Logic.Env 与 Logic.Of

为了在 Pattern、Intent 等场景中精确表达上下文依赖，我们使用 `Logic.Of` 别名：

```ts
export type Env<Sh extends Logix.ModuleShape<any, any>, R = never> =
  Logix.ModuleTag<Sh> | R;

export type Of<Sh extends Logix.ModuleShape<any, any>, R = never, A = void, E = never> =
  Effect.Effect<A, E, Env<Sh, R>>;
```

约定：

- 所有依赖具体 Module 的长逻辑（包括 Namespace Pattern）都应使用 `Logic.Of<Sh,R>` 表达其上下文依赖；
- 这样可以在“跨 Module 复用 Pattern”时由类型系统兜底，避免把错误的 ModuleRuntime 注入给 Pattern。

要点：

- Bound API 的所有方法都在类型上显式依赖 `Logic.Env<Sh,R>`，不会“偷偷”通过 Tag 获取 Runtime；
- `$.flow` 的接口**严格对齐** `Flow.Api<Sh,R>`（见下一节），只是预先绑定了当前 Env，业务代码在绝大多数场景下应优先通过 Fluent DSL 使用这些能力；
- 跨 Module 协作场景中，可以通过显式传入 `Logix.ModuleTag<OtherShape>` 创建其他 Module 的访问器，但业务层推荐通过 `$.use(ModuleSpec)` + Fluent DSL（`$.on($Other.changes/...).run($SelfOrOther.dispatch)`）表达；`Intent.Coordinate` 仅在 IR 层用于标注语义。

> 说明：运行时不再提供 `andThen` 这类“同名多语义”的 DX sugar，以保证平台可解析子集稳定且可回写；请使用显式终端 `.update/.mutate/.run*`。如果想要“链式风格”，放到 `.run(...)` 的 handler 内用 `Effect.andThen/flatMap` 完成即可。

## 2.4 Logic.Env / R 的默认约定

当前主线中，`Logic.Of` 与 `ModuleLogic` 的 Env 泛型遵循以下约定：

```ts
// Logic.Env：默认只包含当前 ModuleRuntime + 平台服务
export type Env<Sh extends Logix.ModuleShape<any, any>, R = never> =
  Logix.ModuleTag<Sh> | Logix.Platform.Service | R

// Logic.Of：所有 Logic 程序的统一别名
export type Of<Sh extends Logix.ModuleShape<any, any>, R = never, A = void, E = never> =
  Effect.Effect<A, E, Env<Sh, R>>
```

- 默认情况下，所有通过 `ModuleDef.logic(($) => ...)` 定义的 Logic 都使用 `R = never`：
  - 即 Logic 只依赖当前模块的 `ModuleRuntime` 与平台层的 `Platform.Service`（由 `Runtime.make` / `ReactPlatformLayer` 等提供）；
  - 不会隐式引入额外的 service / Tag 依赖，便于在应用级 Runtime 上组合 Layer 并闭合 Env。
- 当 Logic 中需要额外的 Service / Tag / 其他 Module 时，**必须显式写出 `R`**，并在 Runtime 层通过 Layer 提供对应实现：

```ts
// 1) 定义依赖
class ToggleService extends Effect.Service<ToggleService>()("ToggleService", { /* ... */ }) {}

// 2) Logic 显式标注 Env
const ToggleLogic = ToggleModule.logic<ToggleService>(($) =>
  Effect.gen(function* () {
    const svc = yield* $.use(ToggleService)
    // ...
  }),
)

// 3) ModuleImpl 保留 Env 依赖
const ToggleImpl = ToggleModule.implement<ToggleService>({
  initial,
  logics: [ToggleLogic],
})

// 4) Runtime 侧通过 Layer 闭合 Env
const AppRuntime = Logix.Runtime.make(ToggleImpl, {
  layer: Layer.mergeAll(
    ToggleService.Live as Layer.Layer<ToggleService, never, never>,
    AppInfraLayer,
  ),
})
```

> 规则：\*\*没有额外依赖 → 用默认 `R = never` 即可；有额外依赖 → 在 `ModuleDef.logic<R>` 与 `ModuleDef.implement<R>` 上显式标出 Env，并在 Runtime 层通过 Layer 收敛到 `R = never` 后再交给 `Runtime.make` / `ManagedRuntime.make`。

## 2.5 `$.onAction / $.onState` 与 watcher 生命周期

`$.onAction / $.onState / $.flow.from*` 本质上都会返回一个长期存在的 **IntentBuilder**，在 run 段中挂载为 watcher。为了避免「主 Logic 永不返回」「Env 带入 Scope」等问题，本规范约束：

- 不允许直接 `yield* $.onAction(...).run(...)` 挂长期 watcher，必须通过以下两种方式之一：
  - 使用 `runFork / runParallelFork` 等封装过的 helper：
    ```ts
    yield* $.onAction("inc").runParallelFork(
      $.state.update((s) => ({ ...s, count: s.count + 1 })),
    )
    ```
    这在内部等价于 `Effect.forkScoped(flow.run(...))`，但会在类型上把 `Scope` 从 Env 中「吃掉」，避免污染 Logic 的 `R`。
  - 将若干 watcher 作为子任务挂在 `Effect.all([...])` 中：
    ```ts
    yield* Effect.all([
      $.onAction("start").runFork(handleStart),
      $.onAction("reset").run(handleReset),
    ])
    ```
    这里的主 Logic 在所有 watcher 启动后很快返回，长期工作都由 fork 出去的 Fiber 承担。
- 手写 `Effect.forkScoped($.onAction(...).run(...))` 的形式视为内部实现细节，推荐一律使用 `runFork / runParallelFork` 等 helper 代替。

> 实务建议：在 code review / Pattern 设计中，可以把「`yield* $.onAction` 后面是否跟了 `runFork/ParallelFork` 或包在 `Effect.all([...])` 里」当作一个 checklist，避免出现“Logic 主体永远挂起”或 Env 推导出 `Scope | ...` 之类噪音。

## 2.6 Logic 书写顺序（Best Practice · 两阶段心智）

为了减少时序相关的心智负担，推荐在单段 Logic 内遵循以下结构化顺序：

1. **setup 段：先注册生命周期与错误处理**
   ```ts
   $.lifecycle.onError((cause, context) => /* 统一兜底 */)
   // 如有需要，再注册 onInit / onDestroy 等
   ```
2. **setup 段：注册动态 Primary Reducer（如使用）**
   ```ts
   // 前提：该 Action 尚未被 dispatch 过
   yield* $.reducer("increment", (state, action) => nextState)
   ```
   对于必须从 t=0 就生效的主路径，推荐始终使用 `Module.make({ reducers })`，`$.reducer` 仅作为动态扩展入口。
3. **run 段：挂载 Watcher / Flow**
   ```ts
   yield* $.onAction("increment").runFork(/* 副作用或联动 */)
   yield* $.onState(selector).runFork(/* 派生更新 */)
   ```

Runtime 会在以下场景提供智能提示（通过 DebugSink 以 `diagnostic` 事件形式暴露）：

- 当某个 Action Tag 已经被 dispatch 之后才调用 `$.reducer(tag, ...)`，将触发 `reducer::late_registration` 诊断；
- 当发生 lifecycle 错误而当前 Module 尚未注册任何 `$.lifecycle.onError` 时，将触发 `lifecycle::missing_on_error` 诊断。

这些诊断不会改变运行语义，但会在开发阶段帮助你快速发现“声明过晚”或“错误阶段调用”一类时序问题。  
推荐将上述结构化顺序视为 Logic 的默认写法模板。
