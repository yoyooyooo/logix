# Logix.Module / Logic / Live / `$` API 总览

> **Status**: v3.1 Canonical (Module-First)
> **Scope**: Logix Engine — Public API Surface (Concept & Type Level)
> **Audience**: 以应用/业务开发者为主，库作者与架构师在此基础上进行二次封装。
> **StateTransaction 事务语义**：一次逻辑入口 = 一次 StateTransaction = 一次提交的约束，以及与 Devtools 事务视图的对齐方式，已在 `core/03-logic-and-flow.md#35-异步-flow-与-statetransaction-边界（长链路模式）` 与 `core/05-runtime-implementation.md#15-statetransaction-与状态提交路径（v3-内核）` 收敛；本文件作为 API 侧总览不再重复展开。

本篇作为 v3.1 之后的 **Module-First 编程模型总览与单一事实源**，集中说明：

- 如何使用 `Logix.Module` 定义领域模块（Module，纯定义，不含实例状态）；
- 如何在 Module 上通过 `Module.logic(($)=>Effect)` 编写逻辑程序；
- 如何用 `Module.live(initial, ...logics)` 生成可注入的运行时 Layer；
- 如何用 `Module.implement({ initial, logics, imports?, processes? })` 生成可复用的 **ModuleImpl 蓝图**，再通过 `withLayer/withLayers` 与 `Logix.Runtime.make(...)` 拼装到 Runtime 中；
- Bound API `$` 在业务代码中的推荐用法（特别是 `$.on*` 事件订阅）。

详细行为语义仍以：

- `core/03-logic-and-flow.md`（Logic / Flow / Control / Bound API `$`）
- `core/05-runtime-implementation.md` 与 `impl/*`（运行时/Scope 实现细节，仅架构师/引擎实现者关注）

为准，本文件只做 **业务向 API 视角的总览与汇总**。

### 0.0 API 分层速览

| 层级 | 面向角色 | 主要入口 | 说明 |
| :--- | :--- | :--- | :--- |
| 应用/业务开发者 | Feature/业务工程师 | `Logix.Module` / `Module.logic(($)=>...)` / `Module.live(...)` / Bound API `$`（`$.state / $.actions / $.on* / $.use`） | 日常开发只需这些入口即可完成绝大部分工作 |
| 组件 / 页面作者 | UI & 交互工程师 | `Module.implement({ initial, logics, imports?, processes? })` / `ModuleImpl.withLayer` / `Logix.Runtime.make(...)` / React `useModule(impl)` | 把“模块 + 初始状态 + 逻辑 + 依赖注入 + 进程”打包成可复用蓝图，在 Runtime / React 中复用 |
| 库作者 / Pattern 作者 | 复用逻辑、领域库作者 | `Flow.Api` / `Control.Api` / `Logic.of` / `$.flow.*` / Pattern 约定 | 用于封装可复用长逻辑、领域 Pattern 与 L3 Helper |
| 架构师 / 引擎实现者 | 平台/Runtime 实现 | 运行时容器实现、Module/Runtime 组合、Scope 管理（见 `core/05-runtime-implementation.md`、`impl/*`） | 负责内部运行时实现，业务代码不直接依赖 |

---

## 0. 快速总览（Trinity + `$`）

- `Logix.Module.make(id, { state, actions, reducers? })`
  - 定义「领域模块」，只负责 **身份 + 形状**；
  - 自身是一个 Tag，可被 `$.use(Module)` 消费；
  - 不包含任何运行时实例或状态。
- `Module.logic(($) => Effect.gen(...))`
  - 在该 Module 上编写一段 Logic 程序；
  - 返回值是一个可组合的 Logic 单元（Logic.Of），可以像普通值一样传递与复用。
- `Module.live(initialState, ...logics)`
  - 将 Module 定义 + 初始 State + 一组 Logic 程序组合成一个 Live Layer；
  - 每次调用都会生成一个新的 Layer，可在不同 Runtime/Scope 下多次注入；
  - 适合“一次性拼装 + 立即注入”的场景（如 CLI 脚本、单模块 PoC）。
- `Module.implement({ initial, logics, imports?, processes? })`
  - 在 `Module.live` 之上，进一步封装出一个 **ModuleImpl 蓝图**：
    - 记录该 Module 的初始 State 与 Logic 集合；
    - 暴露 `impl.layer`（`Layer<ModuleRuntime, never, any>`）、`impl.module` 以及可选的 `impl.processes`；
    - 支持通过 `impl.withLayer(...)` / `impl.withLayers(...)` 注入额外 Env（Service / 平台能力等）；
  - 典型使用场景：
    - React 中通过 `useModule(impl)` 直接消费配置好的模块实现；
    - 应用级 Runtime 中通过 `Logix.Runtime.make(rootImpl, { layer, onError })` 把某个 Root ModuleImpl 作为入口；
    - 平台/调试场景下可将这些 ModuleImpl 交给内部 AppRuntime 工具函数组装成可视化/调试用 Runtime（仅面向引擎实现与平台工具，不作为对外 API）。
- `$`（Bound API）
  - 业务开发几乎只需要记住的唯一入口；
  - 提供 `$.state / $.actions / $.flow / $.on* / $.use / $.lifecycle` 等能力；
  - 同时是 IntentRule Parser 的静态锚点。

---

## 1. `Logix.Module`：领域模块定义

在代码层，一个领域模块统一由 `Logix.Module` 表示：

```ts
import { Schema } from 'effect';
import * as Logix from '@logix/core';

export const CounterModule = Logix.Module.make('Counter', {
  state: Schema.Struct({
    count: Schema.Number,
  }),
  actions: {
    inc: Schema.Void,
    dec: Schema.Void,
  },
});
```

语义：

- `id: string`：领域模块的全局 Id，用于 Universe/Galaxy 拓扑和平台识别；
- `state` / `actions`：Effect.Schema 形式的 State / Action 形状；
- 可选的 `reducers`：为部分 Action Tag 声明 **primary reducers**（主 reducer）：
  - 形态：`{ [tag]: (state, { _tag, payload }) => nextState }`；
  - 语义：**Action → State 的权威路径**（主状态变更），在 `dispatch` 时由 Runtime 同步调用；
  - 实现：直接落到 `ModuleRuntime` 内部的 `_tag -> (state, action) => state` 跳表，不经过 watcher / Stream / Fiber。

示例（包含 primary reducer）：

```ts
export const CounterModule = Logix.Module.make('Counter', {
  state: CounterState,
  actions: CounterActions,
  reducers: {
    inc: (state, _action) => ({ ...state, count: state.count + 1 }),
    set: (state, action) => ({ ...state, count: action.payload }),
  },
});
```

对于需要 mutative 写法的主 reducer，可以使用运行时提供的 helper：

```ts
export const CounterModule = Logix.Module.make('Counter', {
  state: CounterState,
  actions: CounterActions,
  reducers: {
    inc: Logix.Module.Reducer.mutate((draft, _action) => {
      draft.count += 1;
    }),
    set: Logix.Module.Reducer.mutate((draft, action) => {
      draft.count = action.payload;
    }),
  },
});
```

- `Logix.Module.Reducer.mutate`：接受 `(draft, action) => void` 形式的 mutative 函数，内部基于 `mutative` 映射为不可变 `(state, action) => state`；
- 语义与 `$.state.mutate` 一致，只是多了 `action` 入参，适合在 primary reducer 中使用。

- `CounterModule` 本身同时是：
  - Module 定义（Intent 视角：领域资产）；
  - Runtime Tag（可被 `$.use(CounterModule)` 消费）；
  - Logic 入口（`CounterModule.logic` 的宿主）；
  - Live 工厂（`CounterModule.live` 的宿主）。

对应类型以 `@logix/core` 为准（公共出口：`packages/logix-core/src/index.ts`；Module 相关实现与类型在 `packages/logix-core/src/Module.ts` 与 `packages/logix-core/src/internal/module.ts`）。

---

## 2. `ModuleLogic` 与 `Logic.Of`

为了在类型上表达“在某一类 Module 上运行的一段逻辑程序”，v3.1 约定（以 `Logic.Of` 为主）：

```ts
import { Logic } from '@logix/core';
import * as Logix from '@logix/core';

export type ModuleLogic<Sh extends Logix.ModuleShape<any, any>, R = unknown, E = never> =
  Logic.Of<Sh, R, unknown, E>
```

含义：

- `Sh`：通过 Module 定义推导出的 `Logix.ModuleShape<stateSchema, actionSchema>`；
- `R`：Logic 依赖的额外环境（Services）；
- `E`：Logic 可能抛出的错误（通常为 never，内部消化）。

> 注：早期草案中曾设想过“基于 `Logic.Env<Sh,R>` + `Logic.RuntimeTag` 的 Bound API 工厂”，用于从环境中“隐式”获取 Runtime 并构造 `$`。该设想目前仅保留在 drafts 中，用于探索 Env-First 形态的可能性。  
> 当前 PoC 中，Pattern / Namespace 场景请直接使用 `Logix.Bound.make(shape, runtime)` 在实现层构造 `$`，业务代码推荐统一通过 `Module.logic(($)=>Effect.gen(...))` 返回 Logic 值。

---

## 3. `Module.logic(($)=>Effect)`：逻辑程序入口

### 3.1 基本形态

`Module.logic` 是“在该领域上挂载一段 Logic 程序”的入口：

```ts
export const CounterLogic = CounterModule.logic(($) =>
  Effect.gen(function* () {
    // Action → State
    yield* $.onAction(
      (a): a is { _tag: 'inc' } => a._tag === 'inc',
    ).update((prev) => ({ ...prev, count: prev.count + 1 }));

    // State → State
    yield* $.onState((s) => s.count).run(Effect.logInfo('Count changed'));
  }),
);
```

特征：

- 由 Module 注入一个 Bound API `$`（见第 4 节），Env 类型自动推导为 `Logic.Env<Sh,R>`；
- 返回值就是一段 Logic 程序（`Logic.Of<Sh,R>`），可以在 `Module.live` 中挂载，或作为 Pattern/模板返回值复用；
- 一个 Module 可以有多段 Logic（多次 `.logic` 调用），但通常约定在 Module 定义文件导出一个“主逻辑”，其余作为 Pattern/插件逻辑组合到 `.live` 中。

### 3.2 组合多个 Logic 程序

Module 本身不限制 Logic 的个数，`Module.live` 会将它们统一挂在该 Module 对应的 `Logix.ModuleRuntime` 上：

```ts
export const AuditLogic = CounterModule.logic($ => /* ... */);
export const MetricsLogic = CounterModule.logic($ => /* ... */);

export const CounterLive = CounterModule.live(
  { count: 0 },
  CounterLogic,   // 主逻辑
  AuditLogic,     // 审计插件
  MetricsLogic,   // 监控插件
);
```

### 3.3 两阶段写法与约束（setup / run）

- **心智模型**：builder 闭包的一次性执行产出 `LogicPlan = { setup, run }`：return 前的同步调用归入 setup（注册 reducer / lifecycle / Debug/Devtools hook），return 的 Effect 归入 run（长逻辑、Env 访问、Watcher/Flow）。旧写法 `Module.logic(($)=>Effect.gen(...))` 等价于仅含 run 段。  
- **约束**：setup 段不访问 Env/Service，不做 IO，保持幂等；在 setup 段调用 `$.use/$.onAction/$.onState` 等 run-only 能力，或在 builder 顶层执行 `Effect.run*`，会被 Runtime 转为 `diagnostic(error)`（`logic::invalid_phase` / `logic::setup_unsafe_effect`）。  
- **推荐顺序**：return 前先注册 `$.lifecycle.onError/onInit`，再注册动态 `$.reducer`，最后在 return 的 Effect 内挂载 Watcher/Flow；详见 `core/03-logic-and-flow.md#logic-书写顺序（best-practice-·-两阶段心智）`。

### 3.4 Phase Guard 与诊断（API 行为矩阵）

- **LogicPlan 统一形态**：Logic 写法始终被归一为 `LogicPlan<Sh,R,E> = { setup: Effect<void, E, Env>; run: Effect<void, E, Env> }`，运行时在解析逻辑时自动注入 `phaseRef`，保证 setup/run 两段可观测。旧写法自动折叠为 `setup = Effect.void / run = 原逻辑`。  
- **Phase Guard 规则**：下列 API 视为 run-only，若在 setup 段调用会抛出 `LogicPhaseError(kind=\"use_in_setup\", api=...)` 并被转换为 `diagnostic code=logic::invalid_phase severity=error`：`$.use / $.onAction* / $.onState* / $.flow.from*` 及基于 IntentBuilder 的 `.run* / .update / .mutate / .withContext / .runWithContext`。  
- **诊断字段**：`LogicPhaseError` 暴露 `kind/api/phase/moduleId`，DevTools 与平台可直接依赖结构化字段，无需字符串解析；其他诊断同样通过 `DebugSink` 以 `logic::* / reducer::* / lifecycle::*` code 形式对外广播。  
- **Env 缺失与 runSync 不变量**：Logic 构造阶段的错误（含 phase 违规）统一被收敛为诊断，不会破坏 `Module.live` / `Runtime.make` 的同步构造路径；只有在 Env 铺满后仍发生的 `Service not found` 才被视为硬错误。

### 3.5 Field Capabilities 与 State Graph（StateTrait / `@logix/core` 的角色）

> 更新说明（2025-12-10）：早期 v3 草案中，字段能力与 State Graph 曾规划由独立包 `@logix/data` 承载。  
> 随着 `specs/001a-module-traits-runtime` 设计收敛，当前主线改为由 `@logix/core` 内部的 StateTrait 模块统一承载字段能力与 State Graph，`@logix/data` 相关规范视为历史 PoC，仅供参考。

在当前模型中，字段层的响应式与联动能力（例如 Computed 字段、从外部资源加载的 Source 字段、跨字段 Link 字段）统一收敛到 `@logix/core` 内部的 StateTrait 实现。整体边界大致如下：

- **Schema / Traits 层（Layer 1）**：  
  - Module 的 State Schema 使用 Effect 的 Schema 定义字段结构，computed / source / link 等能力通过 StateTrait DSL 声明，例如：  
    - `StateTrait.computed((state) => ...)`  
    - `StateTrait.source({ resource, key })`  
    - `StateTrait.link({ from })`  
  - 这些声明被统一收集为 `StateTraitSpec`，并在 build 阶段生成 `StateTraitProgram`，其中包含 StateTraitGraph（字段与能力拓扑）与 StateTraitPlan（运行计划）。
- **Runtime 层（Layer 2）**：  
  - Logix ModuleRuntime 在 live 阶段基于 StateTraitPlan 构建模块级的运行时计划（如“哪些字段依赖哪些字段”“哪些字段由外部资源驱动”），再用 Bound API `$` 与 EffectOp/Middleware 将其编译为实际的 `($) => Effect` 程序；  
  - 长期目标是让典型的 Computed / Source / Link 写法都通过 StateTrait Program 驱动，而不是在每个 Module 中手写胶水逻辑。
- **DevTools / 平台层**：  
  - StateTraitProgram 提供的 StateTraitGraph（`GraphNode` / `GraphEdge` 等）作为 State Graph 事实源，Logix Runtime 和 DevTools 可以基于这份图结构：  
    - 可视化字段与能力之间的依赖关系；  
    - 对比两个版本模块的字段与依赖变更。  

> 注意：关于 StateTrait 与 State Graph 的更详细数据模型与 API 形状，请参考：  
> - `specs/001a-module-traits-runtime/spec.md`  
> - `docs/specs/drafts/topics/state-graph-and-capabilities/*`

### 3.6 StateTrait.source 与 Resource / Query 的运行时接缝（概览）

> 详细数据模型与 API 草图见：`specs/001a-module-traits-runtime/references/resource-and-query.md` 与 `runtime-logix/core/05-runtime-implementation.md`。本节只在「Module / Logic API」视角补充资源相关术语的上下文。

- **Module 图纸层**  
	  - Module 作者在 `traits` 槽位只需要写：  
	  ```ts
	  const UserProfileResource = {
	    id: "user/profile",
	    meta: { label: "用户资料" },
	  } as const
	  
	  traits: StateTrait.from(StateSchema)({
	    profileResource: StateTrait.source({
	      // 推荐：复用 ResourceRef（或 ResourceRef.id），避免散落字符串常量
	      resource: UserProfileResource,
	      key: (s) => ({ userId: s.profile.id }),
	    }),
	  })
	  ```  
	  - 这里的 `resource` 是逻辑资源 ID，`key(state)` 是访问该资源所需 key 的计算规则；Module 不关心 HTTP/DB/QueryClient 等具体实现。  
	  - `key(state)` 允许返回 `undefined` 表示“当前无有效 key / 禁用”，此时 Runtime 不触发 IO（不产生 Service 类 EffectOp），目标字段回到 idle 快照（具体快照形状由上层领域约定）。  
	  - 推荐在工程内维护一组 `ResourceRef` 常量（只包含 `id/meta`），并在 Module/Traits 图纸层引用它们；ResourceSpec 仍然可通过 `id: ResourceRef.id` 保持 id 的单一事实源。  
	  - Devtools 展示资源信息时：`ResourceRef.meta` 优先；缺失字段再 fallback 到 `ResourceSpec.meta` 的同名字段（例如 description）。该合并只用于展示，不影响运行时语义。
	  - 若同名展示字段（例如 description）同时存在且值不一致，dev 环境下 Devtools SHOULD 给出 warning（按 resourceId+字段去重），提示“展示元信息分叉”；展示仍以 ResourceRef 为准。
	  - `ResourceRef.meta.tags` 是展示侧“分类标签”，用于 Devtools 的过滤/分组/检索；Devtools 在展示与索引时 SHOULD 对 tags 去重并按字典序排序，保证稳定可对比。

- **StateTraitProgram / Plan 层**  
  - StateTrait.build 会在 Program/Graph/Plan 中把上述声明归一化为：  
    - 一条 `kind = "source"` 的字段能力记录（包含 resourceId 与 keySelector 标识）；  
    - 一条 `kind = "source-refresh"` 的 PlanStep，用于描述“刷新该字段时应触发一次服务调用”的指令；
  - 这些结构本身不涉及具体的调用策略，只为 Runtime 与 Middleware 提供稳定的事实源。

- **Runtime 层（Resource / Query / EffectOp 总线）**  
  - Runtime 在 StateTrait.install 中，会为 source 字段挂载标准入口（例如 `$.traits.source.refresh("profileResource")`），在显式调用时：  
    1. 从当前 State 计算 key；  
    2. 构造一条 `EffectOp(kind = "service", name = resourceId, meta.resourceId = resourceId, meta.key = key, meta.fieldPath = targetFieldPath)`；  
    3. 将该 EffectOp 交给当前 Env 中配置的 EffectOp MiddlewareStack 执行。  
  - Resource 模块负责在 Env 中注册逻辑资源规格：  
    - `Logix.Resource.make({...})` 定义 ResourceSpec；  
    - `Logix.Resource.layer([specA, specB, ...])` 在某个 Runtime 范围内注册资源表；  
    - Resource 中间件（未来的实现）根据 `resourceId + key` 选择并调用对应 ResourceSpec.load。  
  - Query 中间件（可选）在上层包裹 Service 类 EffectOp：  
    - `Query.layer(client)` 注册 QueryClient；  
    - `Query.middleware(config)` 订阅 `kind = "service"` 的 EffectOp，并在配置命中时用 QueryClient(resourceId, key, load) 替代直接调用 ResourceSpec.load。

- **DevTools / 平台层**  
  - DevTools 可以同时依赖：  
    - StateTraitGraph：看“哪些字段依赖哪些资源”；  
    - EffectOp Timeline：看“哪些 source-refresh / service 调用何时发生、由哪个 Module/字段触发”；  
  - 平台视角下，StateTrait.source 与 Resource/Query 的职责边界为：  
    - StateTrait/source：声明“字段依赖的逻辑资源及 key 规则”；  
    - Resource/Query：提供该资源的实现与访问策略；  
    - EffectOp/Middleware：承载实际调用链与横切能力（日志/缓存/重试/熔断等）。  

---

## 4. `Module.live(initial, ...logics)`：生成 Live Layer

`Module.live` 负责把 Module 定义 + 初始 State + 一组 Logic 程序组合成可注入的 Layer：

```ts
export const CounterLive = CounterModule.live(
  { count: 0 },
  CounterLogic,
);
```

语义：

- 内部会基于 Module 的 `stateSchema` / `actionSchema` 构造状态容器与 Action 流，并启动所有挂载的 Logic 程序；
- 在一个运行时 Scope 中启动所有传入的 Logic 程序（通过 `Effect.forkScoped` 等），并将相应的运行时实例注入 `Logic.RuntimeTag`；
- 对 React/应用 Shell 而言，只需把 `CounterLive` 提供给 Runtime（如 `RuntimeProvider` / 统一的模块 Hook），无需关心底层实现细节。
- `ModuleRuntime` 的具体实现与替换策略属于引擎实现层能力，如需自定义 Runtime，请参考 `core/05-runtime-implementation.md` 中的「1.3 扩展点：自定义 ModuleRuntime 的边界」约定。

---

## 5. Bound API `$`：业务作者的唯一入口

Bound API `$` 的完整说明见 `core/03-logic-and-flow.md`，这里只做概览。

在 Logic 程序内部，业务作者只需记住一个符号 `$`。当前 PoC 中，`$` 的**唯一正式入口**是 `Module.logic(($)=>Effect)`：

```ts
export const SomeLogic = SomeModule.logic(($) =>
  Effect.gen(function* () {
    // ...
  }),
);
```

> 说明：文档与示例中若提到“针对某个 Shape/Env 预绑定的 `$`”，均表示在 `Logic.Env<Sh,R>` 上预绑定同一类 `BoundApi<Sh,R>` 的 `$`。在当前实现中，请始终通过 `Module.logic(($)=>...)` 获取 `$`。

从心智模型上，可以把 `$` 理解为一个“宿主对象”，内部再按「感知 / 策略 / 行动 / 协作 / 结构 / 生命周期」六个子域划分：

- 感知（Perception）：`$.onState / $.onAction / $.on` —— Fluent Intent DSL，用于监听当前 Module 的 State / Action 或任意 Stream；
- 策略（Strategy）：`$.flow.*` —— Flow API，包含 `fromAction / fromState / debounce / throttle / filter / run / runLatest / runExhaust` 等算子，用来描述时间轴与并发语义；
- 行动（Actuation）：`$.state` / `$.actions` —— 读写当前 Store 状态（`read / update / mutate / ref`）与派发当前 Store 的 Action（`dispatch / actions$`）；selector 级 Ref 仍需结合 `$.onState` / Flow 或自定义封装；
- 协作（Collaboration）：`$.use` —— 依赖注入入口（`$.use(ModuleOrService)`），用于访问其他 Module 的只读句柄或外部 Service；
- 结构（Structure）：`$.match` —— 结构化分支与模式匹配（`match / matchTag` 等），配合 Effect 原语表达控制结构；
- 生命周期（Lifecycle）：`$.lifecycle` —— 生命周期钩子（`onInit / onDestroy` 等），与 Module Runtime 的 Scope 绑定。

### 5.1 生命周期 `$.lifecycle`

用于定义 Module 启动与销毁时的钩子逻辑。

- **`onInit` (Blocking)**: 模块初始化时执行。**默认阻塞**，即 `yield* onInit` 完成后，Runtime 才会被标记为 Ready。适用于加载配置、连接数据库等必须的前置操作。
- **`onDestroy`**: 模块销毁（Scope 关闭）时执行。用于清理资源。
- **`onError`**: 模块内任意 Logic Fiber 发生未捕获错误（Defect）时触发。
  - **时机**：错误传播到 Module Scope 时，在 Scope 关闭前触发。
  - **用途**：仅用于**最后的错误上报与日志记录**（Last-breath reporting），不用于错误恢复（恢复应在 Logic 内部处理）。
  - **注意**：触发 `onError` 意味着 Module 即将崩溃（Scope 关闭）。

```ts
// 示例：灵活组合多个生命周期与后台任务
const MyLogic = MyModule.logic(($) => Effect.gen(function*() {
  // 1. 第一步初始化 (阻塞)
  yield* $.lifecycle.onInit(Effect.log("Init Step 1: Config"))

  // 2. 启动第一个后台任务 (非阻塞)
  yield* Effect.fork(
    Stream.tick("1 second").pipe(
      Stream.tap(() => Effect.log("Heartbeat 1")),
      Stream.runDrain
    )
  )

  // 3. 第二步初始化 (阻塞)
  // 只有等 Step 1 完成后，才会执行到这里（如果 Step 1 失败，这里不会执行）
  yield* $.lifecycle.onInit(Effect.log("Init Step 2: DB"))

  // 4. 启动第二个后台任务
  yield* Effect.fork(
    Stream.make(1, 2, 3).pipe(
      Stream.runForEach(n => Effect.log(`Processing ${n}`))
    )
  )
}))
```

> **机制说明**：
> - `$.lifecycle.onInit` 只是**注册**初始化逻辑。
> - 运行时会收集所有注册的 `onInit` Effect，并在 Module 启动时按**注册顺序**依次执行（串行）。
> - `Effect.fork` 的后台任务会立即启动，不阻塞后续的 `onInit` 注册，也不阻塞 Module 的 Ready 状态。

### 5.2 平台级生命周期钩子（Platform Lifecycle）

以下钩子在 v3 中已经通过 `Logic.Platform` 提供统一接口，具体由各平台实现（例如 React 侧的 `ReactPlatformLayer`）按需驱动：

- **`onSuspend` / `onResume`**:
  - 面向 React `<Offscreen>` / KeepAlive 或移动端后台场景；
  - 用于在 UI 不可见时暂停高频任务（如 Polling），而不销毁状态；
  - 语义属于“平台级行为状态”，与 Module 的存在与否、ModuleCache 的内存保活策略解耦。
- **`onReset`**:
  - 面向业务逻辑的“软重置”（Soft Reset）；
  - 标准化 `Logout` / `Clear` 行为，重置状态但不销毁实例。

### 5.3 Module Lifecycle 与 Session（概念视图）

在 v3 的实现与实现草图中（参见 `runtime-logix/impl/module-lifecycle-and-scope.md`），我们将 Module 生命周期与 Session/ModuleCache 统一抽象为四个互相配合的维度：

- **数据 Scope（ModuleRuntime Scope）**：由 `ModuleRuntime` 的内部 Scope 承载，`$.lifecycle.onInit / onDestroy / onError` 与之绑定，决定“这棵 ModuleRuntime 是否存在，以及何时彻底关闭”；  
- **资源 Scope（ModuleCache Entry）**：由 React 侧的 `ModuleCache` 管理，决定“某个 ModuleRuntime 实例在内存中存活多久”（`Acquire → Retain → Release → GC`）；  
- **会话语义（Session Pattern）**：由调用方在 `useModule(Impl, { key, gcTime })` 中选择 `key + gcTime` 决定，是暴露给 React/业务开发者的“组件级 / 区域级 / 会话级”状态保持接口；  
- **行为状态（Platform Lifecycle）**：由 `$.lifecycle.onSuspend/onResume/onReset` + `Logic.Platform` 驱动，决定“在存在期间何时暂停/恢复/软重置行为”，不直接关闭 Scope。

抽象时间轴上，单个 Module 实例通常经历四个阶段：

1. **Construct（构建）**  
   - 触发：首次通过 ModuleImpl.layer 或 ModuleCache 创建某个 `ModuleRuntime`；  
   - 数据 Scope：打开根 Scope，注册所有 Logic，并串行执行已登记的 `onInit`；  
   - 资源 Scope：ModuleCache 中创建 Entry，`status = pending/success`；  
   - Session：若调用方传入显式 `key`，在该 Runtime 内认领一份“会话身份”，否则视为组件私有 Session。

2. **Active（活跃）**  
   - 数据 Scope：Scope 打开，Logic watcher 与进程运行中，可以持续读写 State / 派发 Action；  
   - 资源 Scope：Entry `refCount > 0`，至少有一个 UI 持有该实例；  
   - Session：业务视角下，可理解为“某个页面 / Tab / Widget 的会话正在进行”；  
   - Platform：可选择性注册 `onSuspend/onResume`，响应页面可见性 / 路由切换等行为事件。

3. **Idle（空闲/保活）**  
   - 数据 Scope：仍然打开，状态留在内存中，但暂时没有 UI 订阅者；  
   - 资源 Scope：`refCount` 回到 0，ModuleCache 启动基于 `gcTime` 的 Idle 计时；在计时窗口内如果有新组件重新 `retain`，视为“会话恢复”，取消 GC；  
   - Session：业务视角可理解为“会话被暂存”，例如 Tab 被关闭但允许短时间内恢复；  
   - Platform：可以通过 `onSuspend` 暂停高频行为（轮询等），但不销毁会话本身。

4. **Terminate（结束）**  
   - 数据 Scope：Idle 计时结束且 `refCount` 仍为 0 时，ModuleCache 触发 Scope 关闭，串行执行所有 `onDestroy`，随后删除 Entry；  
   - 资源 Scope：该实例彻底从缓存中移除，所有 watcher / 长逻辑停止；  
   - Session：会话结束，之后只能创建新的实例；  
   - Platform：若有需要，可通过 `onReset` 或显式清理逻辑在到期前主动结束会话。

在具体 API 层面的对应关系是：

- **Module 定义/Logic 层**：只关心 `$.lifecycle` 与 Platform lifecycle，以“模块是否存在、何时暂停/恢复/重置”的语义思考；  
- **React Adapter 层**：通过统一的 Resource Cache（`ModuleCache`）+ `useModule(Impl, { key, gcTime, suspend })` 将「Scope + Session + React 组件」绑定在一起；  
- **宿主应用/平台**：按需为 Runtime 提供 `Logic.Platform` 实现（例如 `ReactPlatformLayer`），并在合适的事件源（路由 / Page Visibility / App 前后台）上驱动 `onSuspend/onResume/onReset`。

> 心智模型可简化记忆为：**Session = ModuleRuntime 实例 + 稳定的 `key` + 一段 `gcTime` + 一套 Platform 行为策略**。  
> 文档层面将继续以此视图约束 React Adapter 与未来多端平台的实现。

Bound API 设计目标：

- 对业务代码：只需要记住 `$`，不直接接触 Store / Context / Layer；
- 对平台 Parser：`$` 是静态锚点，`$.on*().update/mutate/run*` 链是 IntentRule 的 IR 形态；
- 对运行时：`$` 只是 Env 的一层类型/语法封装，所有语义都可机械地翻译为 `Flow.Api` / `Control.Api` 组合。

---

## 6. 与运行时容器的关系

总结一下 Module / Logic / Live / ModuleImpl 与运行时容器之间的关系：

- 概念层：
  - Module = 领域模块定义（不含实例）；
  - Logic = 在该 Module 上运行的一段长逻辑程序；
  - Live = Module 的运行时 Layer（一次性、即可注入即可用）；
  - ModuleImpl = 带初始状态、逻辑、默认依赖（imports）与可选进程（processes）的模块实现蓝图，可在不同 Runtime / React Tree 中多次复用。
- 运行时层：
  - 每个 Module.live / ModuleImpl.layer 会构造一个与该 Module 绑定的运行时实例；
  - 所有挂在该 Module 上的 Logic 程序运行在同一个运行时实例上（共享 State / actions$ / changes$）；
  - 跨 Module 协作通过 `$.use(OtherModule)` / `$.useRemote(OtherModule)` + Fluent DSL 表达；
  - 在分形 Runtime 模型下：
    - 推荐通过 `Logix.Runtime.make(rootImpl, { layer, onError })` 以某个 Root ModuleImpl 为入口构造一颗 Runtime（App / Page / Feature 均视为“Root + Runtime”）；
    - Root ModuleImpl 可以通过 `imports` 引入子模块实现，通过 `processes` 声明长期进程（含 Link）；
    - 应用级 AppRuntime（基于 `LogixAppConfig` / `makeApp`）仅作为底层实现存在（基于 Layer 合成与 processes fork），主要服务于平台/运行时内部，不再建议业务直接调用。

对日常业务开发而言，只需通过 Module / Logic / Live / ModuleImpl / `$` 五个概念进行思考与编码。
需要深入运行时生命周期、Scope、调试等能力时，再参考 `core/05-runtime-implementation.md` 与 impl 系列文档。
