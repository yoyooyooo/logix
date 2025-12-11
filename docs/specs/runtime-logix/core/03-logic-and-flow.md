# Logic & Flow (The Tools)

> **Status**: Definitive (v3 Effect-Native · Context is World)
> **Scope**: Logix Core Primitives
> **Audience**: 应用/业务开发者（Bound API `$` + Fluent DSL + Flow API）、库作者（Flow/Control/L3 Helper）、架构师（Env/Runtime 细节）。

本节描述 Logix v3 中的 `Logic` / `Flow` / `Control` 原语，以及围绕 **Universal Bound API (`$`)** 的最终编程模型。
类型草案见 `v3/effect-poc/shared/logix-v3-core.ts`，本文件给出概念视图，实际签名以 PoC 为准。

## 1. Bound API：Context is World

在 v3 最终形态中，我们确立「**Context is World**」的心智模型：

- 业务作者无需显式感知 Store Runtime / Env 拓扑，只需通过一个统一入口 `$` 访问所有能力；
- 领域模块通过 `Logix.Module` 提供「身份 + 契约 + Runtime Tag」，Logic 则通过 `$` 在其上下文中编排行为。

标准 Logic 文件形态示例（概念性代码）：

```ts
// features/counter/module.ts
export const Counter = Logix.Module.make('Counter', {
  state: CounterStateSchema,
  actions: CounterActionSchema,
});

// features/counter/logic.ts
export const CounterLogic = Counter.logic(($) =>
  Effect.gen(function* () {
    // 1. 本地 State 编排（当前 Module）
    yield* $.onState((s) => s.count)
      .debounce(300)
      .mutate((draft) => {
          draft.status = 'idle';
        });

    // 2. 跨 Module 协作 / Service 调用通过 $.use 完成
    const $User = yield* $.use(UserModule);
    const api = yield* $.use(ApiService);

    // ...
  }),
);

// features/counter/live.ts
export const CounterLive = Counter.live(
  { count: 0, status: 'idle' },
  CounterLogic,
);
```

在这一模式下：

- **业务代码只需要记住 `$` 这一入口符号**：`$.state` / `$.actions` / `$.flow` / `$.use` / `$.on*` / `$.match`；
- Store/Logic/Env/Scope 等运行时细节对业务作者透明，由运行时实现承担复杂度。

### 1.1 `$` 作为静态锚点 (Static Anchor)

为了方便平台 Parser 构建 Logic Graph，需要遵守以下约定：

- `$` 必须是 **Logic 文件顶层绑定的常量**（通常来自 `Module.logic(($) => ...)` 的参数）；
- 不允许对 `$` 重新赋值；
- 不推荐将 `$` 作为普通函数参数层层传递——封装推荐使用 Pattern 或 `(input) => Effect` 形式；
- Parser 只对满足上述条件、且使用 **Fluent Intent API (`$.onState` / `$.onAction` / `$.on` + `.update/.mutate/.run*`)** 的代码做结构化解析，其余写法统一降级为 Gray/Black Box。

在 Bound API 模式下：

- 业务代码主要通过 `$.*` 进行编排；
- Intent 命名空间（`Intent.*`）退居 **IR / 平台协议层** 使用，业务代码不再直接依赖；
- 内核与 Pattern 可以使用 `Logic.RuntimeTag` / `Logix.ModuleTag<Sh>` 等底层设施，但对业务 Logic 隐藏这些细节。

> 心智模型回顾：在 `$` 内部，`$.on*` 承担“感知 (Perception)”，`$.flow.*` 承担“策略 (Strategy，时间轴与并发)”，`$.state / $.actions` 承担“行动 (Actuation)”——三者是一条链路的不同层面，而不是三套彼此独立的概念。

## 2. Logic (The Program)

Logic 是一段在 `Logic.Env<Sh,R>` 上运行的长生命周期 Effect 程序：

```ts
type Env<Sh, R> = Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>> & R;
type Fx<Sh, R, A, E> = Effect.Effect<A, E, Env<Sh, R>>;
```

### 2.1 Logic 程序（v3 标准范式）

v3 对外推荐的 Logic 形态是：在 `Logic.Env<Sh,R>` 上运行的一段 `Effect.gen` 程序，
通常通过 Module.logic 注入 Bound API `$`：

在推荐范式下，Logic 作者通常通过 `Module.logic(($)=>Effect.gen(...))` 直接在回调中使用注入的 `$`；
对于 Pattern / Namespace 等二次封装场景，当前 PoC 建议直接使用 `Logix.Bound.make(shape, runtime)` 在实现层构造 `$`，并让调用方显式注入 `$`。

### 2.2 两阶段 Logic Bootstrap（setup/run）

> 目标：消除初始化期的 “Service not found” 噪音，保证 Env 就绪后才运行需要依赖的逻辑；在不改变 `Module.logic(($)=>Effect)` 形态的前提下，明确 setup / run 分层语义。

- **builder 闭包的一次性执行 = 构造 LogicPlan**  
  - 闭包体内的同步注册调用归入 **setup 段**：只允许注册 reducer、lifecycle、Debug/Devtools hook，不访问 Env/Service，不做 IO。  
  - 闭包 `return` 的 Effect 归入 **run 段**：在「完全铺好 Env 的 runtime」上以长期 Fiber 运行，允许访问 `EnvTag`、挂载 `$.onAction / $.onState`、Flow/Process 等。
- **运行时时序**  
  1) ModuleRuntime.make t=0：执行所有 Logic 的 setup，完成注册并保证幂等（StrictMode 下重复注册会触发诊断而非静默覆盖）。  
  2) Env Ready：AppRuntime/RuntimeProvider 构建完 `envLayer` 后，统一 `forkScoped(plan.run)`；此后若出现 `Service not found` 即视为真实配置错误。  
  3) 生命周期绑定：`$.lifecycle.onInit/onDestroy` 在 run 段启动后与 ModuleRuntime Scope/宿主生命周期绑定，确保与 React mount/unmount 对齐。
- **非法用法矩阵（DEV 诊断）**  
  - 在 setup 段调用 run-only 能力（`$.onAction/$.onState/$.use` 等） → `diagnostic(error) code=logic::invalid_phase kind=...`，提示将调用移至 run 段。  
  - 在 builder 顶层直接执行 Effect（`Effect.run*` 等） → `diagnostic(error) code=logic::setup_unsafe_effect`，提示不要在 setup 阶段做 IO。  
  - 重复注册 reducer / lifecycle → 诊断去重并提示 StrictMode 可能触发多次初始化。
- **向后兼容**：`Module.logic(($)=>Effect.gen(...))` 被解释为仅含 run 段；旧代码无需改动即可受益于新的时序与诊断。推荐升级写法是在 return 前完成注册，return 内部编写业务 Watcher/Flow。

**Phase Guard 行为矩阵（Bound API 视角）**

| API 分组 | 允许阶段 | setup 触发时行为 |
| --- | --- | --- |
| `$.onAction*` / `$.onState*` / `$.flow.from*` / IntentBuilder `.run/.runLatest/.runParallel/.runExhaust/.update/.mutate` | run | 抛 `LogicPhaseError(kind=\"use_in_setup\", api=...)` → 记录 `diagnostic code=logic::invalid_phase severity=error`，Runtime 继续完成构造 |
| `$.use` | run | 同上；若 Env 未就绪还会额外发出 `logic::env_service_not_found`（warning/error）诊断 |
| `$.lifecycle.*` / `$.reducer` / Debug/Devtools 注册 | setup | 允许；重复注册触发 `reducer::duplicate/late_registration` 诊断但不破坏构造 |
| builder 顶层 `Effect.run*` | 都不允许 | 触发 `logic::setup_unsafe_effect` 诊断，提示将 IO 移至 run 段 |

> 诊断字段结构化：`kind/api/phase/moduleId` 等字段可被 DevTools 与平台直接消费，无需字符串解析；所有诊断均通过 `DebugSink` 广播。

### 2.3 Logic.Env 与 Logic.Of

为了在 Pattern、Intent 等场景中精确表达上下文依赖，v3 引入了 `Logic.Of` 别名：

```ts
export type Env<Sh extends Logix.ModuleShape<any, any>, R = never> =
  Logix.ModuleTag<Sh> | R;

export type Of<Sh extends Logix.ModuleShape<any, any>, R = never, A = void, E = never> =
  Effect.Effect<A, E, Env<Sh, R>>;
```

约定：

- 所有依赖具体 Store 的长逻辑（包括 Namespace Pattern）都应使用 `Logic.Of<Sh,R>` 表达其上下文依赖；
- 这样可以在“跨 Store 复用 Pattern”时由类型系统兜底，避免把错误的 Store Runtime 注入给 Pattern。

要点：

- Bound API 的所有方法都在类型上显式依赖 `Logic.Env<Sh,R>`，不会“偷偷”通过 Tag 获取 Runtime；
- `$.flow` 的接口**严格对齐** `Flow.Api<Sh,R>`（见下一节），只是预先绑定了当前 Env，业务代码在绝大多数场景下应优先通过 Fluent DSL 使用这些能力；
- 跨 Store 协作场景中，可以通过显式传入 `Logix.ModuleTag<OtherShape>` 创建其他 Store 的访问器，但业务层推荐通过 `$.use(ModuleSpec)` + Fluent DSL（`$.on($Other.changes/...).run($SelfOrOther.dispatch)`）表达；`Intent.Coordinate` 仅在 IR 层用于标注语义。

> 说明：在 Fluent DSL 之上，运行时可以选择性提供 `andThen` 之类的 DX sugar（例如 `$.onState(...).andThen(handler)`），用于简化手写业务逻辑或给 LLM 使用。此类 API 不属于 Fluent 白盒子集，平台默认将其视为 Gray/Black Box；如需参与 IR/可视化，应先通过 codemod/Agent 降级为规范的 `.update/.mutate/.run*` 形态。

### 2.4 Logic.Env / R 的默认约定

v3 PoC 中，`Logic.Of` 与 `ModuleLogic` 的 Env 泛型遵循以下约定：

```ts
// Logic.Env：默认只包含当前 ModuleRuntime + 平台服务
export type Env<Sh extends Logix.ModuleShape<any, any>, R = never> =
  Logix.ModuleTag<Sh> | Logix.Platform.Service | R

// Logic.Of：所有 Logic 程序的统一别名
export type Of<Sh extends Logix.ModuleShape<any, any>, R = never, A = void, E = never> =
  Effect.Effect<A, E, Env<Sh, R>>
```

- 默认情况下，所有通过 `Module.logic(($) => ...)` 定义的 Logic 都使用 `R = never`：  
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

> 规则：**没有额外依赖 → 用默认 `R = never` 即可；有额外依赖 → 在 `Module.logic<R>` 与 `Module.implement<R>` 上显式标出 Env，并在 Runtime 层通过 Layer 收敛到 `R = never` 后再交给 `Runtime.make` / `ManagedRuntime.make`。

### 2.5 `$.onAction / $.onState` 与 watcher 生命周期

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
- 手写 `Effect.forkScoped($.onAction(...).run(...))` 的形式在 PoC 阶段视为内部实现细节，推荐一律使用 `runFork / runParallelFork` 等 helper 代替。

> 实务建议：在 code review / Pattern 设计中，可以把「`yield* $.onAction` 后面是否跟了 `runFork/ParallelFork` 或包在 `Effect.all([...])` 里」当作一个 checklist，避免出现“Logic 主体永远挂起”或 Env 推导出 `Scope | ...` 之类噪音。

### 2.6 Logic 书写顺序（Best Practice · 两阶段心智）

为了减少时序相关的心智负担，推荐在单段 Logic 内遵循以下结构化顺序：

1. **setup 段：先注册生命周期与错误处理**  
   ```ts
   yield* $.lifecycle.onError((cause, context) => /* 统一兜底 */)
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

## 3. Flow (The Time & Concurrency Layer)

Flow 负责围绕领域模块的运行时容器构造时间轴与并发语义，其职责是回答：
**“什么时候触发？以何种并发语义执行？”**

在 v3 中：

- 业务代码优先使用 **`$.onState` / `$.onAction` / `$.on + .update/.mutate/.run*`** 这套 Fluent DSL；
- 底层库 / Pattern 内部可以直接使用 `Flow.*` 命名空间级 DSL 与 `Control.*` 组合，将 ModuleRuntime 暴露为 Stream 源；
- `$.flow.*` 主要作为 Bound API 上的逃生舱和高级用法入口，一般业务场景不推荐直接使用；其接口与 `Flow.Api` 一致，只是预绑定了当前 Env。

### 3.1 触发源 (Triggers)

```ts
// 从 Action 流中筛选某一类 Action（通常使用类型守卫）
$.flow.fromAction((a): a is SubmitAction => a._tag === "submit");

// 从 State 的某个 selector 构造变化流
$.flow.fromState(s => s.form.keyword);
```

### 3.2 变换与过滤 (Transformers)

```ts
$.flow.debounce(300);                     // 防抖
$.flow.throttle(500);                     // 节流
$.flow.filter(keyword => keyword !== ""); // 过滤
```

这些算子都是 `Stream -> Stream` 的变换，平台可以将它们渲染为中间处理节点（计时器、漏斗等）。

### 3.3 运行策略 (Runners)

```ts
// 串行：默认逐个处理事件（单 watcher 内顺序执行）
$.flow.run(effect);

// 并行：显式无界并发，适用于日志/打点等高吞吐副作用
$.flow.runParallel(effect);

// 最新：后触发的 Effect 会取消仍在执行的旧 Effect（典型搜索联动）
$.flow.runLatest(effect);

// 阻塞：当前 Effect 尚未完成时直接丢弃新的触发（防重复提交）
$.flow.runExhaust(effect);

// 串行：按触发顺序排队，一个完成后才执行下一个（默认语义）
$.flow.run(effect);
```

所有 `run*` 的类型形态统一为：

```ts
run*<A, E, R2>(
  eff: Effect.Effect<A, E, R2>,
): (stream: Stream.Stream<any>) => Effect.Effect<void, E, R2>;
```

即保留 Effect 的错误通道与环境类型，只改变其为“挂在某个流上的执行器”。

> 实现说明（与当前 PoC 对齐）
> - 在推荐实现中，`$.flow.run` 使用 `Stream.runForEach` 消费源流，保证同一条 watcher 内的 Effect 串行执行；
> - `$.flow.runParallel` 使用 `Stream.mapEffect(..., { concurrency: "unbounded" })` + `Stream.runDrain` 实现显式无界并发；
> - 其余 `run*` 变体通过内部状态（如 latest/exhaust/queue）控制在单 watcher 内的并发语义；
> - Fluent API（`$.onState / $.onAction / $.on`）上的 `.update/.mutate/.run*` 在语义上必须等价于“先通过 `$.flow.from*` 拿到源流，再串上相应的 `Flow.run*` 或直接进行 `Stream.runForEach + state.update`”，
> - **不要求机械地通过 Flow.Api 组合实现**，但要求错误语义、并发语义与上述 `Flow.run*` 描述保持一致，便于 Parser 与 DevTools 在这两层之间建立一一对应关系。

### 3.4 Watcher 数量与性能基线

在 v3 推荐的 Fluent 写法中，高频模式为：

- `$.onAction(predicate).update/mutate/run*`：在 Module 的 `actions$` 流上挂多条 watcher；
- `$.onState(selector).update/mutate/run*`：在 `changes(selector)` 产生的视图流上挂多条 watcher；
- `$.on(source).update/mutate/run*`：在任意 Stream 上挂多条 watcher。

心智模型：

- 每条 watcher 本质是一段长期运行的 Flow/Effect 程序，生命周期绑定在 ModuleRuntime 的 Scope 上；
- 对于某次 Action / State 变更，所有 watcher 都会各自“看一眼”事件（跑一遍 predicate/selector 与流式管道），再决定是否把事件交给 handler；
- 真正的性能成本主要来自 handler（例如 `state.update/mutate`、网络请求、复杂计算），而不是单次 selector 本身。

当前在 Chromium + Vitest Browser 模式下的测量（仅作量级参考）：

- 单个 Module 的单段 Logic 内，随着 `on*` watcher 数量从 1 → 128 增加，“一次点击 → DOM 更新”的平均延迟基本保持在 30ms 级别内；
- 当 watcher 数量提升到约 256 时，同一条轻量 handler 的 click→paint 延迟会上升到约 40ms；
- 在 512 条 watcher、且所有 watcher 都命中同一 Action 并执行轻量 handler 的极端场景下，click→paint 延迟会接近 60ms。

开发者建议（供设计与代码评审时参考）：

- **绿区**（推荐）：单段 Logic 内的 `on*` watcher 数量控制在 **≤ 128**。此时即便 handler 稍重，交互仍然稳定；
- **黄区**（警戒）：接近 **256** 条 watcher 时，应评估单个 Action 实际命中的 handler 数量，以及 handler 内是否存在高频重逻辑（大规模 state 更新 / IO 等），必要时拆分 Logic 或合并规则；
- **红区**（避免）：单段 Logic 内 **≥ 512** 条 watcher 通常只接受为 PoC 或特殊场景，正式业务建议通过拆 Module / 拆 Logic / 合并 Flow 来降低单点 fan-out。

更详细的实现链路与压测结论见 `impl/watcher-performance-and-flow.md`。

## 4. Intent (L1/L2 IR Semantics)

在 Flow / Control 之上，Logix 使用 **IntentRule IR** 承载高频业务联动模式（L1/L2）：
- 业务代码通过 Fluent DSL（`$.onState` / `$.onAction` / `$.on` + `$.state` / `StoreHandle.dispatch`）表达规则；
- 平台 Parser 将这些 Fluent 链还原为结构化的 IntentRule，不再需要独立的 `Intent.*` 运行时命名空间。

> 使用优先级（代码视角）
> - **首选**：`$`（Bound API，包括 `$.state` / `$.actions` / `$.use` / `$.on*` / `$.match`）；
> - 库 / Pattern 内部：`Flow.*` / `Control.*`（L3 Library）配合底层 `Logix.ModuleRuntime`；
> - IR / 平台协议：`IntentRule`（L1/L2 规则的统一表示，包含 source/pipeline/sink/kind 等字段），不再单独定义 `Intent.*` 命名空间。

### 4.1 L1：单 Store 内联动（IR 视角）

L1 IntentRule 负责抽象表达单 Store 内部的同步联动，其代码侧推荐写法是 Fluent DSL：

```ts
// 字段联动：State -> State（业务写法）
yield* $.onState<MyShape>((s) => s.country)
  .mutate((draft) => {
    draft.province = ""
  })
```

抽象语义不变：

- “监听某个 State 视图的变化，并在每次变化时更新当前 Store 的 State”。

### 4.2 L2：跨 Store 协作（Coordinate IntentRule）

L2 IntentRule（Coordinate）用于表达跨 Store 的标准协作模式，例如 Search → Detail。
代码侧推荐写法是通过 `$.use` 获取远端 StoreHandle + Fluent DSL：

```ts
// 业务代码（Fluent 写法）
const $Search = yield* $.use(Search)
const $Detail = yield* $.use(Detail)

yield* $.on($Search.changes((s) => s.results))
  .filter((results) => results.length > 0)
  .run(
    Effect.gen(function* () {
      yield* $Detail.dispatch({ _tag: "detail/initialize", payload: /* ... */ })
    })
  )
```

在 IR 中，这一规则会被归纳为一条 L2 IntentRule，`source.context = SearchStoreId`，`sink.context = DetailStoreId`，`pipeline/sink.handler` 分别反映 filter 与 dispatch 逻辑。

> 约定
> - v3 中不再定义单独的 `Intent` 运行时命名空间；
> - 业务代码一律通过 Fluent DSL（`$.onState` / `$.onAction` / `$.on` + `.update/.mutate/.run*`）表达规则，由 Parser 负责生成/更新对应的 IntentRule；
> - 平台/工具在 IR 层只操作 `IntentRule` 结构，而不是某个 `Intent.*` API。

### 4.3 Primary Reducer 与 `$.reducer`（语义补充）

在 v3 中，「状态主路径」与 watcher 明确分层：

- **Primary Reducer**：
  - 来自 `Logix.Module` 定义中的 `reducers` 字段，或在 Logic 中通过 `$.reducer` 注册；
  - 形态固定为同步纯函数：`(state, action) => nextState`；
  - 由 `ModuleRuntime.dispatch` 在发布 Action 之前同步应用，是 Action → State 的权威路径（State Intent）。
- **Watcher (`$.onAction / $.onState / $.on`)**：
  - 基于 `actions$ / changes(selector)` 的 Stream + Flow；
  - 承载联动、派生字段与副作用（Flow Intent），可以访问 Env、发起 IO 等。

运行时时序（简化）：

1. 调用 `dispatch(action)`；
2. 如果存在对应 `_tag` 的 primary reducer，先同步更新 State（`SubscriptionRef`）；
3. 记录一次 `action:dispatch` Debug 事件（`state:update` 事件由内部 `setState` 记录）；
4. 将 Action 广播到 `actions$`，触发所有 watcher。

Bound API 提供 `$.reducer` 作为在 Logic 中注册 primary reducer 的语法糖：

```ts
export const CounterLogic = Counter.logic(($) =>
  Effect.gen(function* () {
    // 1. 主路径：同步、纯状态变换
    yield* $.reducer(
      "set",
      Logix.Module.Reducer.mutate((draft, action) => {
        draft.count = action.payload;
      }),
    );

    // 2. watcher：派生字段 / 副作用
    yield* $.onState((s) => s.count)
      .run(($count) =>
        $.state.update((prev) => ({
          ...prev,
          isZero: $count === 0,
        })),
      );
  }),
);
```

约束与实践建议：

- primary reducer 不访问 Env，不做 IO，不再 dispatch，只负责「当前 Action 对 State 的主效果」；
- watcher 则专注「在 State / Action 变化之后需要发生的联动与副作用」；
- `Logix.Module.Reducer.mutate` 提供与 `$.state.mutate` 一致的 mutative 写法，内部通过 `mutative` 映射为不可变更新。

### 4.4 Watcher handler 上下文：`IntentContext` 与 `runWithContext`

默认形态下，Fluent DSL 的 watcher handler 一律以 **payload 优先** 作为第一参数：

- `$.onAction(predicate).run((payload) => ...)` 中的 `payload` 始终代表触发源本身：  
  - 对 Action watcher：`payload = ActionOf<Sh>`（例如 `{ _tag: "inc"; payload: void }`）；  
  - 对 State watcher：`payload = selector(state)` 的返回值。
- 这一写法不携带额外上下文（如 `state`、`env`），便于与 IntentRule 中的“source → pipeline → sink(handler)” 一一对应。

为了在 handler 内稳定访问当前 State（以及未来可能的 Env/Actions），v3 在 DSL 层补充了一等上下文形态：

```ts
interface IntentContext<Sh extends Logix.AnyModuleShape, Payload> {
  readonly payload: Payload
  readonly state: Logix.StateOf<Sh>
  // 预留：后续可扩展 actions / env / trace 等字段
}
```

在保持 `.run(payload => ...)` 不变的前提下，Bound API 至少提供一个**核心变体**：

```ts
$.onAction("inc").runWithContext((ctx) =>
  $.state.update((prev) => ({
    ...prev,
    count: prev.count + 1,
  })),
)
```

- 语义：每次触发时，先读取当前模块的 State，再将 `{ payload, state }` 作为 `IntentContext` 传给 handler；  
- 性能：只有显式使用 `runWithContext` 的 watcher 才会在每次事件上读取一次 State，payload‑only 的 `.run` 不引入额外开销。

在此基础上，Runtime 可以选择性提供链式语法糖：

```ts
$.onAction("inc")
  .withContext() // :: IntentBuilder<IntentContext<Sh, Action>, Sh, R>
  .run((ctx) =>
    $.state.update((prev) => ({
      ...prev,
      count: prev.count + 1,
    })),
  )
```

- 语义：`withContext()` 将内部流从 `Payload` 提升为 `IntentContext<Sh, Payload>`，末端的 `.run(handler)` 与 `runWithContext(handler)` 在语义上等价；  
- 规范要求：若实现该语法糖，其行为必须与 `runWithContext` 等价，不得引入额外语义或性能差异。

Phase Guard 与 Diagnostics 约束：

- `.runWithContext` 与 `.withContext().run` 均属于 **run‑only 能力**，在 setup 段调用时必须遵守上文 Phase Guard 矩阵；  
- 在 setup 段触发时，Runtime 会产生 `LogicPhaseError(kind="use_in_setup", api="$.onAction.runWithContext/withContext.run")`，并通过 `logic::invalid_phase` 诊断暴露，避免影响 `ModuleRuntime.make` 的同步构造路径。

## 5. Control (The Structure Layer)

v3 **不再提供** 专门的 `$.control` 命名空间。
我们认为 Effect 原生算子 + `$.match` 语法糖已经足够表达所有结构化逻辑，平台 Parser 将直接识别这些原生模式：

### 5.1 分支 (Branching)

使用 `$.match` / `$.matchTag` (Fluent Match)：

```ts
yield* $.match(isValid)
  .when(true, () => doSomething)
  .tag("cancel", (a) => handleCancel(a))
  .exhaustive();
```

> **Best Practice**: 为了充分利用 `$.matchTag` 的类型收窄能力，推荐将 Action 定义为 **Tagged Union** (即包含 `_tag` 判别字段的联合类型)。这不仅符合 Effect 生态惯例，也能获得最佳的 IDE 补全体验。

平台会将上述 `$.match` 链式结构识别为 **Switch/Case 分支节点**。

### 5.2 错误边界 (Error Boundaries)

直接使用 `Effect.catch*` 系列算子：

```ts
yield* runApprovalFlow.pipe(
  Effect.catchTag("ApprovalError", (err) =>
    $.state.update(s => ({ ...s, error: err.message }))
  )
);
```

平台将识别 `Effect.catch*` 为 **Error Boundary 节点**。

### 5.3 并发 (Concurrency)

直接使用 `Effect.all`：

```ts
yield* Effect.all([taskA, taskB], { concurrency: "unbounded" });
```

平台将识别 `Effect.all` 为 **Parallel Group 节点**。

## 6. 长逻辑与 Scope（简要约定）

在 `Logic` 中启动长逻辑时，推荐显式考虑它应当与哪一层生命周期绑定：

- `forkScoped(longTask)`：
  - 适合与当前 Store / 页面同生命周期的 UI 逻辑（例如轮询当前视图、监听当前页面状态变化）；
  - 依赖 `Store` / 页面 Scope，被视为“前台任务”，Store Scope 关闭时自动终止。

- `fork(longTask)` 或交给上层 Runtime：
  - 适合与具体页面解耦的后台任务（例如全局 Job 轮询、缓存刷新）；
  - 依赖更高层的 Runtime Scope，不随单个 Store / 页面销毁自动结束。

实践上建议：

- 页面 / 组件级 Store：Logic 内长逻辑默认使用 `forkScoped`，避免“页面关闭但任务仍然持有过期状态”；
- 全局 Store 或专门的后台 Runtime：需要长期运行的任务显式使用 `fork` 或在单独的后台 Scope 中管理。

## 7. 与原生 Effect 的关系

- 对开发者而言，`$.flow.*` 只是围绕 Effect / Stream 封装的一组“语义化标准算子”，用来承载：
  - Trigger / 时间 / 并发策略（Flow）；
  - 分支 / 错误边界 / 并行结构（Control）。
- 任何细节性的逻辑（`map / flatMap / zip / forEach / race` 等）仍然鼓励直接使用 `Effect.* / Stream.*`，平台在静态分析时会将这部分视为 Gray/Black Box。
- 对平台而言，这些算子提供了稳定的 AST 锚点，可以在不执行代码的前提下构建 Logic Graph。

## 8. Fluent DSL 的 Hard Constraints（Parser 保障子集）

为了保证平台解析的鲁棒性，v3 对 Fluent DSL 制定了明确的“白盒子集”约束：

1.  **触发 API 分拆**
    -   本地 State：使用 `$.onState(selector)`，语义等价于 `$.flow.fromState(selector)`；
    -   本地 Action：使用 `$.onAction(predicate)`，语义等价于 `$.flow.fromAction(predicate)`；
    -   任意 Stream（含跨 Store）：使用 `$.on(stream)`，典型用法是 `$.on($Other.changes(...))`。
    现在通过 `$.onState` / `$.onAction` / `$.on` 三个独立API明确区分，Parser 无需推断参数类型。

2.  **StoreHandle 能力边界**
    -   `$.use(ModuleSpec)` 返回的句柄仅暴露：`read(selector?)` / `changes(selector)` / `dispatch(action)`；
    -   `mutate` / `update` 等写接口只存在于 **当前 Store 的 `$.state`** 中；
    -   任何跨 Store 直接写入他库 State 的行为在 v3 中被视为违反运行时契约。

3.  **白盒模式的结构约束**
    -   Parser 只对形如 `yield* $.onState(...).op1().op2().update/mutate/run*(...)` / `yield* $.onAction(...).op().update/mutate/run*(...)` / `yield* $.on(stream).op().run*(...)` 的 **单语句直接调用** 提供结构化解析；
    -   一旦将 Fluent 链拆解为中间变量或闭包包装（例如 `const flow = $.onState(...).op(); yield* flow.run(effect)`），该段代码即被视为 Raw Mode（黑盒）。

4.  **Intent.IR 的生成路径**
    -   白盒 Fluent 规则会被映射为 IntentRule IR（包括 L1/L2 等规则形态），Intent 不再以单独命名空间形式出现；
    -   Raw Mode（裸 `flow.pipe` / 复杂 `Effect.gen`）不会强行还原为 IntentRule，而是以 Code Block 形式出现在 Logic Graph 中。

上述约束是 v3 的“编译期契约”：
- 业务层若遵守这些写法，可以获得稳定的类型推导与平台可视化支持；
- runtime-logix 与平台实现则可以在这些 Hard Constraints 基础上简化实现，并在违反约束时给出清晰的诊断提示。

## 9. 从 Module 到 IntentRule：一条标准链路（体验视角）

为了帮助使用者快速建立整体心智，可以将 Logix v3 的“主链路”理解为：

> **定义 Module → 编写 Logic（`Module.logic(($)=>...)` + Fluent DSL）→ 在其他 Logic 中通过 `$.use(Module)` 协作 → 平台从 Fluent 链生成 IntentRule。**

一个典型的最小示例：

```ts
// 1. 定义领域模块（Module）
const CounterState = Schema.Struct({ count: Schema.Number });
const CounterAction = {
  inc: Schema.Void,
  dec: Schema.Void,
};

export const Counter = Logix.Module.make('Counter', {
  state: CounterState,
  actions: {
    inc: Schema.Void,
    dec: Schema.Void,
  },
});

// 2. 在 Module 上编写 Logic（通过 Module.logic 注入 $）
export const CounterLogic = Counter.logic(($) =>
  Effect.gen(function* () {
    // Action → State：基于 Action 更新 count
    yield* $.onAction(
      (a): a is { _tag: 'inc' } => a._tag === 'inc',
    ).update((prev) => ({ ...prev, count: prev.count + 1 }));

    // State → State：基于 count 变化派生 hasPositive（示意）
    yield* $.onState((s) => s.count).update((prev) => ({
      ...prev,
      hasPositive: prev.count > 0,
    }));
  }),
);

// 3. 在其他 Logic 中通过 $.use(Counter) 协作（跨 Module）
export const SomeOtherLogic = OtherModule.logic(($) =>
  Effect.gen(function* () {
    const $Counter = yield* $.use(Counter); // 领域只读句柄

    yield* $.on($Counter.changes((s) => s.count))
      .filter((count) => count > 10)
      .update((prev) => ({ ...prev, showCongrats: true }));
  }),
);
```

在这一模式下：

- **Module** 是领域世界的“定义根”：统一承载 Id / Schema / Runtime Tag / Logic 入口；
- 所有业务 Logic 都通过 `Module.logic(($)=>Effect.gen(...))` 注入 `$`，形成统一的编程体验；
- 跨 Module 协作统一通过 `$.use(Module)` 获取只读句柄，再配合 Fluent DSL 表达规则；
- 平台只需识别 `Module` + Fluent 链，即可恢复 L1 / L2 IntentRule——开发者不需要关心 IntentRule 结构细节，也不需要操心 Tag/Env 的细节。
