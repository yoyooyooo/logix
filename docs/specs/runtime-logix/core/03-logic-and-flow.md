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
export const Counter = Logix.Module('Counter', {
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
对于 Pattern / Namespace 等二次封装场景，当前 PoC 建议直接使用 `Logix.BoundApi.make(shape, runtime)` 在实现层构造 `$`，并让调用方显式注入 `$`。

### 2.2 Logic.Env 与 Logic.Of

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

export const Counter = Logix.Module('Counter', {
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
