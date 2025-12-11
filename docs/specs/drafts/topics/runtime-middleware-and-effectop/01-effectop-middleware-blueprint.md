---
title: EffectOp-Based Middleware Pipeline Blueprint
status: draft
version: 0.1.0
value: core
priority: now
related:
  - ./README.md
  - ../runtime-observability/README.md
  - ../runtime-readiness/README.md
  - ../../runtime-logix/core/03-logic-and-flow.md
  - ../../runtime-logix/core/04-logic-middleware.md
---

# EffectOp-Based Middleware Pipeline Blueprint

> 设计目标：在不依赖既有实现的前提下，基于 Effect 提出一套统一的 Runtime 中间件总线：  
> - 用一个核心抽象 `EffectOp` 描述“在 Logix 边界上一段要执行的 Effect”；  
> - 用一个统一接口 `Middleware` 负责所有边界上的拦截与组合；  
> - 在其之上分层定义 Observer / Runner / Guard 三种角色，并映射到 Action / Flow / State / Lifecycle / CrossModule / Service 六类边界。

本草案是 Logix Runtime 中间件体系的蓝图，旨在为 v3/v4 的正式规范与实现提供骨架。

---

## 1. 背景与问题陈述

### 1.1 现状问题（抽象层面，而非针对现有代码）

从 Runtime 视角看，Logix 涉及多类“边界事件”：

- 从外部进入 Runtime：Action / Intent / 外部事件；  
- Runtime 内部的流程：Flow 执行、状态迁移、跨模块联动；  
- 从 Runtime 出去：Service 调用、外部系统交互；  
- 生命周期：模块实例创建/销毁/挂起/恢复/重置。

这些边界上往往需要挂载各种横切能力：

- 调试 & 观测：日志、Trace、Metrics、Debug 事件流；  
- 运行策略：节流、防抖、并发模型、重试、超时、熔断；  
- 业务策略：鉴权、风控、合规、配额、feature flag。

若没有统一的抽象，很容易出现：

- 各处临时的“包一层”实现（例如不同 API 自己定义 middleware / wrapper）；  
- 观测逻辑与业务逻辑交织，难以迁移到 Effect 原生的 Tracer / Supervisor 模型；  
- 无法清晰区分“只观测”与“改变业务语义”的行为，增加 Debug 与演进成本。

### 1.2 设计目标

本草案希望一次性回答三个问题：

1. 能否用 **一个核心抽象** 一致描述所有这些边界上的“要执行的一次逻辑”？  
2. 能否用 **一个统一的中间件接口** 承载所有横切能力，再通过语义约束分化 Observer / Runner / Guard？  
3. 能否在 **Runtime / Module / Flow** 三个维度上以配置化方式挂载这些能力，而业务代码只通过规范 API 即可获得收益？

答案即是本草案提出的 `EffectOp` + `Middleware` + 三角色（Observer / Runner / Guard）+ 六边界模型。

---

## 2. 核心抽象：EffectOp 与 Middleware

### 2.1 EffectOp / EffectOpMeta

我们将“在某个 Runtime 边界上要执行的一次逻辑”抽象为：

- 一个 Effect：`Effect.Effect<A, E, R>`；  
- 一组关于这次执行的上下文信息：模块、操作名、边界类型、payload、状态快照等。

概念性的类型定义：

```ts
type EffectOpKind =
  | "action"
  | "flow"
  | "state"
  | "lifecycle"
  | "crossModule"
  | "service"

interface EffectOpMeta {
  readonly kind: EffectOpKind
  readonly name: string            // 业务操作名 / Flow 名 / Hook 名
  readonly moduleId?: string
  readonly tags?: readonly string[]
  readonly payload?: unknown       // Action / Intent / Service 请求体等
  readonly stateBefore?: unknown   // State 边界：变更前快照（可选）
  // 可扩展：traceId / tenantId / requestId 等
}

interface EffectOp<A, E, R> {
  readonly meta: EffectOpMeta
  readonly effect: Effect.Effect<A, E, R>
}
```

这里的 `EffectOp` 是整个中间件体系的“货物单位”：所有边界上的操作都被规约成“带 meta 的 Effect”。

### 2.2 Middleware 接口（单一总线）

所有中间件遵循统一的签名：

```ts
type Middleware<A, E, R> = (
  op: EffectOp<A, E, R>,
  next: (op: EffectOp<A, E, R>) => Effect.Effect<A, E, R>,
) => Effect.Effect<A, E, R>
```

组合器：

```ts
const composeMiddleware = <A, E, R>(
  ...mws: ReadonlyArray<Middleware<A, E, R>>,
): (op: EffectOp<A, E, R>) => Effect.Effect<A, E, R> =>
  mws.reduceRight(
    (next, mw) => (op) => mw(op, next),
    (op) => op.effect,
  )
```

设计要点：

- 所有 Observer / Runner / Guard 最终都以 `Middleware` 形式参与组合，保证“单一总线”；  
- `next` 代表“交给下游中间件或原始逻辑”；  
- 中间件可以在调用 `next` 前后做工作，也可以决定不调用（例如 Guard 的拒绝路径）。

---

## 3. 三类角色：Observer / Runner / Guard

在统一的 `Middleware` 抽象之上，我们通过行为约束与工厂函数划分三类角色。  
**重要：在实现层，这三类角色最终都只是 `Middleware`，Runtime 不维护三张独立的列表，只维护一条按顺序组合的 `Middleware[]` 链；角色划分主要用于规范语义和提供 helper。**

### 3.1 Observer：观测者（只看不改）

职责：只负责观测与记录，不改变业务语义。

约束：

- 必须恰好调用一次 `next(op)`；  
- 不修改 `op.meta` 与 `op.effect`；  
- 不吞掉错误（可以记录后重新抛出）。

示意接口：

```ts
interface Observer<R = never> {
  onOp(op: EffectOp<any, any, R>): Effect.Effect<void, never, R>
}

const asObserverMiddleware =
  <R>(observer: Observer<R>): Middleware<any, any, R> =>
  (op, next) =>
    observer.onOp(op).pipe(
      Effect.zipRight(next(op)),
    )
```

典型实现：

- 日志记录、Debug 事件推送、Metrics 上报、Tracing span 注入；  
- DebugSink / TraceBus 订阅器。

### 3.2 Runner：运行策略（改“怎么跑”，不改单次语义）

职责：控制“何时执行、执行几次、按什么节奏执行”，但单次执行的业务语义不变。

约束：

- 可以决定是否/何时调用 `next`；  
- 不改变单次执行的逻辑含义（例如某次调用的结果与“直接执行 op.effect”等价）。

示意接口：

```ts
interface Runner<R = never> {
  run<A, E>(
    op: EffectOp<A, E, R>,
    next: (op: EffectOp<A, E, R>) => Effect.Effect<A, E, R>,
  ): Effect.Effect<A, E, R>
}

const asRunnerMiddleware =
  <R>(runner: Runner<R>): Middleware<any, any, R> =>
  (op, next) =>
    runner.run(op, next)
```

典型实现：

- Action 级：节流、防抖、防重复提交；  
- Flow 级：latest / exhaust / queue / 并发池；  
- Service 级：重试、超时、熔断。

### 3.3 Guard：业务 / 策略守卫（可以改业务语义）

职责：根据上下文做“允许/拒绝/改写”的决策，是 Domain/Policy 的一部分。

约束：

- 只允许挂在约定的策略边界（Action 入口、敏感 Flow 入口、Service 调用入口等）；  
- 决策逻辑应来源于领域模型（例如 Policy Service），而非 ad‑hoc if 判断。

示意接口：

```ts
interface GuardDecision<A, E, R> {
  readonly allow: boolean
  readonly overrideOp?: EffectOp<A, E, R>
  readonly failEffect?: Effect.Effect<A, E, R> // 比如直接 fail 出领域错误
}

interface Guard<R = never> {
  decide<A, E>(
    op: EffectOp<A, E, R>,
  ): Effect.Effect<GuardDecision<A, E, R>, never, R>
}

const asGuardMiddleware =
  <R>(guard: Guard<R>): Middleware<any, any, R> =>
  (op, next) =>
    Effect.gen(function* () {
      const decision = yield* guard.decide(op)
      if (!decision.allow && decision.failEffect) {
        return yield* decision.failEffect
      }
      const finalOp = decision.overrideOp ?? op
      return yield* next(finalOp)
    })
```

典型实现：

- Action / Flow：鉴权、租户隔离、业务状态约束、feature flag / A/B 分流；  
- State：不变量检查（例如状态机非法迁移）；  
- Service：风控、额度控制、合规审查。

---

## 4. 六类边界：每个边界上中间件“能做什么”

在 `EffectOpKind` 中，我们统一枚举 Runtime 中关心的六类边界：

- `"action"`：从外部进入 Runtime 的 Intent / Action；  
- `"flow"`：Runtime 内部的逻辑流程与 watcher；  
- `"state"`：Store/Module 状态的变更；  
- `"lifecycle"`：模块实例的生命周期事件；  
- `"crossModule"`：模块之间的读取、监听与联动；  
- `"service"`：对外部系统的调用（HTTP/DB/MQ 等）。

下文按边界说明三角色可以做什么，以及从用户视角带来的价值。

> 💡 与 Trait / StateTrait 的关系（高层对齐）
>
> - Trait（如 `StateTrait` / `ActionTrait` / `FlowTrait` 等）关注的是 **Module 图纸层的“能力声明”**：  
>   - 模块作者在 `state / actions / flows / traits` 等槽位中，用 DSL 写出“哪些 Subject 需要哪些能力”；  
>   - Trait 引擎负责将这些声明 `build` 成 Program（含 StateGraph 等结构 IR），再由 `mount($, program)` 连接到 Runtime。  
> - 本 Topic 中的 EffectOp/Middleware 则关注 **Runtime 层的“能力执行管道”**：  
>   - 所有边界上的一次逻辑执行都被规约为 `EffectOp<A, E, R>`；  
>   - 所有横切能力（日志 / 观测 / 策略 / 重试 / 超时 / 熔断等）都通过 `Middleware` 组合在 Effect 管道中执行。  
> - 两者的典型协作模式是：  
>   - Trait Program 中描述“在某个 Subject 上需要哪些策略/观测/守卫”；  
>   - 在 `mount($, program)` 阶段，将这些需求翻译为具体的 `Middleware` / EffectOp 组合，挂载到对应边界上。  
> - 这样可以保持：  
>   - **图纸层（Trait）**：贴近 Module / Intent / 平台 DSL，易于 diff、可视化与 Codegen；  
>   - **执行层（EffectOp/Middleware）**：完全 Effect‑Native，可独立于 Trait 系统在低层复用，不与 Schema / Runtime 其它部分产生耦合。

### 4.1 Action / Intent 入口

事件：用户或系统 dispatch 一条 Intent / Action。

- Observer：
  - 记录用户行为（点击/输入/提交）；  
  - 把 Intent → Flow 的关系打到 Debug 事件流里。
- Runner：
  - 对高频 Action 做节流、防抖、防重复提交；  
  - 合并/重排 Action，减轻后端压力或避免闪烁。
- Guard：
  - 鉴权 / 租户隔离（当前用户是否允许触发这个 Intent）；  
  - feature flag / 实验策略（将 Action 引导到不同 Flow）。

用户视角：

- “正常 dispatch，就能自动享受合理的 UX 策略和埋点”；  
- 敏感入口（如删除/退款）通过配置指定 Guard，而不是在每个逻辑里手写权限判断。

### 4.2 Flow 执行

事件：某条 Flow / 逻辑单元的启动/结束/失败。

- Observer：
  - 记录 Flow 时间线与耗时；  
  - 为 DevTools 绘制 Flow 级 trace。
- Runner：
  - 控制并发模型：latest/exhaust/parallel/queue；  
  - 决定是否自动重试、超时等。
- Guard：
  - 限制在特定状态下禁止某些 Flow；  
  - 强制二次确认流程（如需要先完成一个“确认 Intent”）。

用户视角：

- Flow 编写者只声明“逻辑”，并通过少量选项选择并发/重试策略；  
- 观测与策略不再散落在 Flow 内部的 try/catch 与 if 逻辑中。

### 4.3 State 变更

事件：Store / Module 的 state 从 S1 → S2。

- Observer：
  - 记录 state diff，用于时间旅行、审计与回放；  
  - 把变更 push 给 DebugSink / DevTools。
- Runner：
  - 可以做批量写入（coalesce 多次变更）；  
  - 根据场景延迟或合并变更。
- Guard：
  - 校验不变量（例如订单状态机非法回退）；  
  - 数据域隔离（防止跨租户写入）。

用户视角：

- 使用 `$.state.update/mutate` 等 API 即可自动获得审计和不变量检查能力；  
- 大部分场景无需手写“打印日志 + assert”，只需在配置层声明哪些 Store 属于敏感数据。

### 4.4 CrossModule（跨模块协作）

事件：模块之间的读取、监听与联动（Link / useRemote / ModuleHandle）。

- Observer：
  - 记录依赖边：谁在监听谁、谁影响谁；  
  - 为 DevTools/Studio 提供实时架构图。
- Runner：
  - 对跨模块事件做去抖、合并或限流；  
  - 控制跨模块联动的节奏，避免抖动和性能问题。
- Guard：
  - 防止越权写入（例如某些模块不能直接写其他模块的关键状态）；  
  - 限制依赖方向，减少环形依赖。

用户视角：

- 普通开发只管写跨模块逻辑，DevTools 提供真实依赖图与警告；  
- 架构师可以用 Guard 限制模块之间的交互边界。

### 4.5 Lifecycle（模块生命周期）

事件：模块的 init / destroy / suspend / resume / reset 等。

- Observer：
  - 统计模块活跃度、泄漏风险、初始化失败率；  
  - 帮助定位“某 bug 只在特定页面/生命周期触发”的问题。
- Runner：
  - 控制初始化与销毁策略（懒加载、预热、多实例池）；  
  - 在特定环境中改变生命周期节奏（如 SSR）。
- Guard：
  - 决定某些模块在当前用户/环境下是否允许初始化；  
  - 控制 reset 行为（比如保留某些缓存数据）。

用户视角：

- 通过 `$.lifecycle.*` 声明逻辑，平台自动帮忙监控与治理模块生命周期；  
- 避免“谁在创建很多 runtime 却不销毁”的隐形问题。

### 4.6 Service（外部服务调用）

事件：Runtime 内的 Effect 调用 HTTP/DB/MQ 等外部系统。

- Observer：
  - 记录请求/响应/耗时/错误；  
  - 为全链路 Trace/metrics 提供基础数据。
- Runner：
  - 重试、超时、熔断、退避策略；  
  - 并发控制与连接池。
- Guard：
  - 环境隔离（测试环境禁止调用真实支付接口）；  
  - 风控与合规（敏感操作需要额外审查）。

用户视角：

- Flow 中只写 `yield* HttpClient.request(...)`，运行策略与 Guard 由平台统一配置；  
- 修改可靠性策略只需调整 Runner / Guard 配置，无需重写业务 Flow。

---

## 5. 注册与拼装：Runtime / Module / Flow 三层

为了让这套中间件体系在实现上可维护、在使用上可配置，本草案建议在三个层级上管理中间件：

1. Runtime 级：应用启动时配置全局默认 Observer / Runner / Guard 与 registry（必须有）；  
2. Module 级：Module 声明自己需要哪些“组”（group），不直接绑函数（v1 就要实现）；  
3. Flow / Intent / Service 级：在定义处进行精细 override（**可以作为后续演进项，在遇到“模块级粒度不够”的具体场景时再补充实现**）。

### 5.1 Runtime 级：全局默认与 registry

概念性配置结构：

```ts
interface RuntimeMiddlewareRegistry<R = never> {
  observers: Record<string, Observer<R>>
  runners: Record<string, Runner<R>>
  guards: Record<string, Guard<R>>
}

interface RuntimeMiddlewareDefaults {
  byKind: {
    [K in EffectOpKind]?: {
      observers?: string[]
      runners?: string[]
      guards?: string[]
    }
  }
}

interface RuntimeConfig<R = never> {
  middleware: {
    registry: RuntimeMiddlewareRegistry<R>
    defaults: RuntimeMiddlewareDefaults
  }
}
```

含义：

- registry：把字符串 key 映射到 Observer/Runner/Guard 实现；  
- defaults：声明每一种 `EffectOpKind` 的默认中间件组，例如：  
  - 所有 `"service"` op 默认挂 `["trace:service", "runner:http-retry"]`；  
  - 所有 `"action"` 默认挂 `["observer:log-action", "runner:ui-debounce"]`。

#### 5.1.1 Key 的命名与定义位置

- Key 视为中间件实现的 **稳定 ID**：一旦发布，不应在不同语义间复用；  
- 官方/内置中间件建议使用带命名空间的 key，例如：  
  - `"logix/devtools/basic"`、`"logix/persist/localStorage"`；  
- 三方包建议使用包名作为前缀，例如：  
  - `"@acme/logger/basic"`、`"@foo/persist/indexedDB"`。

Key 的定义权在 **runtime / 中间件包侧**，而非业务 Module：

```ts
// runtime/middlewareRegistry.ts
export const observerKeys = {
  devtoolsBasic: "logix/devtools/basic",
  persistLocalStorage: "logix/persist/localStorage",
} as const

export type ObserverKey = (typeof observerKeys)[keyof typeof observerKeys]

export const registry: RuntimeMiddlewareRegistry = {
  observers: {
    [observerKeys.devtoolsBasic]: makeDevtoolsObserver(...),
    [observerKeys.persistLocalStorage]: makePersistObserver(...),
  },
  runners: { /* ... */ },
  guards: { /* ... */ },
}
```

Module / Flow 侧只通过导出的常量引用这些 key，而不手写裸字符串。

#### 5.1.2 Registry 构建与 key 冲突检测

为避免“后注册的实现静默覆盖先前实现”，需要在构建 registry 时做 key 冲突检测。  
具体实现有两种可选层次：

- **v1 最小实现**：  
  - 直接构造 `Record<string, ...>` 形式的 registry；  
  - 在 Runtime 启动阶段对 `observers/runners/guards` 的所有 key 做一次去重检查，如发现重复在 dev 模式抛错、在 prod 至少发出强提示日志。
- **后续可选增强（Builder API）**：  
  - 提供 `RuntimeMiddlewareRegistry.empty().addObserver(...).addRunner(...).addGuard(...)` 风格的构建器；  
  - 行为约定为：`add*` 遇到已有同名 key 直接报错，只有显式的 `override*` API 才允许覆盖，并要求调用方承担语义风险。

三方中间件包可以暴露自己的 key 常量与注册辅助函数，例如：

```ts
export const LOGIX_LOGGER_OBSERVER_KEY = "logix/logger/basic" as const

export const registerLogger = (reg: RuntimeMiddlewareRegistry) => ({
  ...reg,
  observers: {
    ...reg.observers,
    [LOGIX_LOGGER_OBSERVER_KEY]: makeLoggerObserver(...),
  },
})
```

应用方通过合并多个 `registerXxx(registry)` 调用来构造最终 registry，并在启动时统一做冲突检查。

### 5.2 Module 级：元数据声明

Module 只声明“想要的组”，例如：

```ts
interface ModuleMiddlewareGroups {
  action?: {
    observers?: string[]
    runners?: string[]
    guards?: string[]
  }
  flow?: { /* 同上 */ }
  state?: { /* 同上 */ }
  lifecycle?: { /* 同上 */ }
  crossModule?: { /* 同上 */ }
  service?: { /* 同上 */ }
}

interface ModuleMeta {
  // ...
  middleware?: ModuleMiddlewareGroups
}
```

- Module 不直接引用具体 Observer/Runner/Guard 函数；  
- 平台与 Codegen 可以读 `ModuleMeta.middleware`，生成合适的逻辑代码或配置；  
- Module 仅通过导入的 key 常量引用中间件，例如：`observers: [observerKeys.devtoolsBasic]`，不直接拼接字符串。

### 5.3 Flow / Intent / Service 级：精细 override

在具体 Flow/Intent/Service 定义处，允许更细粒度控制，例如：

- 增加额外中间件组；  
- 禁用某些上层默认中间件组。

示意：

```ts
interface FlowMiddlewareOverride {
  add?: {
    observers?: string[]
    runners?: string[]
    guards?: string[]
  }
  disable?: {
    observers?: string[]
    runners?: string[]
    guards?: string[]
  }
}

interface FlowOptions {
  // 业务相关选项...
  middleware?: FlowMiddlewareOverride
}
```

> **实现优先级说明**：  
> - v1 实现可以只支持 Runtime.defaults.byKind + ModuleMeta.middleware 两层组合；  
> - FlowOptions.middleware 作为“细粒度 override” 的接口预留在规范中，但具体实现可以在后续迭代中按需补充；  
> - 组合规则统一为：Runtime 默认 → Module 默认 → 局部 override（如有），最终折叠为一条 `Middleware[]`。

### 5.4 “共享 vs 专属” 中间件语义

本设计中不再区分“Runtime 中间件”和“Module 中间件”的类型，所有中间件最终都降级为同一套 `Observer` / `Runner` / `Guard` / `Middleware`；所谓“专属 vs 共享”的差异体现在配置与依赖注入上：

- **默认：共享实现、按配置决定生效范围**  
  - Registry 中每个 key 对应一个中间件实现实例，由 Runtime 统一维护；  
  - Module/Flow 通过 `ModuleMeta.middleware` / `FlowOptions.middleware` 决定自己“挂不挂、挂哪几个 key”；  
  - 多个 Module 使用同一个 key 时，意味着“共享同一份实现逻辑”，但执行粒度仍是 **每个 EffectOp 一次**。

- **专属行为：通过配置与 Env 表达，而非新类型**  
  - 某中间件只对特定 Module 生效：只在该 Module 的 `middleware` 中引用对应 key；  
  - 某 Module 需要不同参数：在 Env 层提供 Module 专属的配置/Service，middleware 从 Env 读取上下文（例如根据 `op.meta.moduleId` 选择不同策略）。

- **确实需要“每 Module 一份状态”的极端场景**  
  - 可通过工厂函数为每个 Module 生成独立的 Observer/Runner/Guard 实例，并在 registry 中用不同 key 注册，例如：  
    - `"order/policy"`、`"cart/policy"` 分别对应不同 Guard 实例；  
  - 这种场景属于高级用法，接口上仍然只是 `Middleware`，不会引入新的“ModuleMiddleware” 概念。

当同一个 key 在多个 Module 上被引用时：

- 每次边界触发产生一个独立的 `EffectOp`，中间件对每个 `EffectOp` 分别执行，不会“自动混在一起”；  
- 只有在中间件内部显式使用共享 Env/状态（例如全局 RateLimiter）时，多 Module 才会产生有意的联动。

---

## 6. 边界包装：如何在实现中使用 EffectOp 总线

所有边界包装函数都遵循同一模式：

1. 构造 `EffectOpMeta`（填好 kind/name/moduleId 等）；  
2. 构造 `EffectOp<A,E,R>`；  
3. 根据 Runtime / Module / Flow 配置构建 `Middleware<A,E,R>[]`；  
4. 使用 `composeMiddleware` 执行。

示意几个核心边界的包装形态。

### 6.1 Action 入口包装

```ts
function runActionWithMiddlewares<A, E, R>(
  action: unknown,
  baseEffect: Effect.Effect<A, E, R>,
  meta: Omit<EffectOpMeta, "kind" | "payload"> & { name: string },
  middlewares: ReadonlyArray<Middleware<A, E, R>>,
): Effect.Effect<A, E, R> {
  const op: EffectOp<A, E, R> = {
    meta: { ...meta, kind: "action", payload: action },
    effect: baseEffect,
  }
  return composeMiddleware<A, E, R>(...middlewares)(op)
}
```

Bound API 中的 `$.actions.xxx` / `dispatch` 可以统一落到该包装函数上。

### 6.2 Flow 执行包装

```ts
function runFlowWithMiddlewares<A, E, R>(
  effect: Effect.Effect<A, E, R>,
  meta: Omit<EffectOpMeta, "kind">,
  middlewares: ReadonlyArray<Middleware<A, E, R>>,
): Effect.Effect<A, E, R> {
  const op: EffectOp<A, E, R> = {
    meta: { ...meta, kind: "flow" },
    effect,
  }
  return composeMiddleware<A, E, R>(...middlewares)(op)
}
```

`$.onAction().run*` / `runFork` / `runParallel*` 等 API 都可以通过不同 Runner 策略 + 相同 Flow 包装实现。

### 6.3 State 变更包装

```ts
function runStateChangeWithMiddlewares<S, A, E, R>(
  prev: S,
  next: S,
  setStateEffect: Effect.Effect<A, E, R>,
  meta: Omit<EffectOpMeta, "kind" | "stateBefore">,
  middlewares: ReadonlyArray<Middleware<A, E, R>>,
): Effect.Effect<A, E, R> {
  const op: EffectOp<A, E, R> = {
    meta: { ...meta, kind: "state", stateBefore: prev },
    effect: setStateEffect,
  }
  return composeMiddleware<A, E, R>(...middlewares)(op)
}
```

`$.state.update/mutate/reducer` 都可以通过该包装统一纳入审计、不变量检查与 Debug 事件流。

其他边界（Lifecycle / CrossModule / Service）也是同样模式，此处不再赘述。

---

## 7. 与 Observability / DebugSink 的关系

在本设计下，Observability Topic 中的核心能力可以被重塑为 Observer 族：

- Runtime 内核通过 EffectOp 事件向 Observer 广播：  
  - Action/Flow/State/Lifecycle/CrossModule/Service 的 start/end/error；  
  - State diff / 依赖边 / 生命周期事件等。
- DebugSink 成为一个或多个 Observer 的组合：  
  - 把 EffectOp 事件映射为 DebugEvent，推送给 DevTools/Studio；  
  - 不再单独维护一套与 Runtime 解耦的事件模型。
- Track/Debug 插件（CapabilityPlugin）成为 Observer 上层的“Interpretation 层”：  
  - 从 EffectOp 事件推导业务 Track 事件；  
  - 提供 `$track` / `$debug` API 往 TraceBus 追加自定义事件。

这样可以保证：

- 即便没有任何插件，基础观测事件仍然存在（内核级 Observer）；  
- 插件只负责“订阅/转码/输出”，不会重新定义 Runtime 边界；  
- DebugSink / TraceBus 的实现可以在不破坏 Middleware 总线的情况下逐步演进。

---

## 8. 开放问题与后续工作

本草案还没有完全收敛，至少存在以下待决点：

1. **EffectOpMeta 字段集**  
   - 目前只列出最基本字段（kind/name/moduleId/tags/payload/stateBefore）；  
   - 需要结合 `runtime-logix/core/09-debugging.md` 与 Observability Topic，确定 traceId/tenantId/requestId 等字段的归属与生成方式。

2. **类型层面的 A/E/R 约束**  
   - 是否需要对 Middleware 在泛型层面做更严格的 Endomorphism 约束；  
   - Guard/Runner 在改变错误类型或环境 R 时的类型表达方式（AdvancedMiddleware？）。

3. **与 Bound API / Flow DSL 的映射**  
   - 需要在 `runtime-logix/core/03-logic-and-flow.md` 中明确 `$.onAction().run*` / `$.state.*` / `$.lifecycle.*` 等 API 与 EffectOp 包装的关系；  
   - 确保 DSL 对业务开发者仍然简洁，不暴露 `EffectOp` 细节。

4. **与现有实现的迁移路径**  
   - 如何将旧有 `Logic.secure` 与 DebugSink 的使用点迁移到 EffectOp 总线；  
   - 是否需要在一段时间内提供兼容层（例如将旧 API 映射为 Observer/Runner/Guard）；

5. **中间件顺序与角色优先级**  
   - 当前组合器仅按数组顺序 `reduceRight` 组合；  
   - 需要在规范中固定一个推荐顺序（例如：先 Guard 决定能否执行，再 Runner 决定如何执行，最外层是 Observer 负责观测结果）；  
   - 拼装时可按角色重排，避免配置顺序导致语义混乱。

6. **性能与开销**  
   - 多层 Middleware 组合带来的开销评估；  
   - 对高频边界（如 Action/State）的优化策略（例如静态拼装、局部关闭某些 Observer）。

后续工作：

- 在 `runtime-logix/core/04-logic-middleware.md` 中抽象出与本草案一致的规范性描述；  
- 在 `docs/specs/runtime-logix/impl/README.md` 中固化实现约束；  
- 在 `topics/runtime-observability` 中对 DebugSink / TraceBus 与 EffectOp 的集成细化事件模型；  
- 在本 Topic 下补充配置与 registry 细节：定义 `RuntimeMiddlewareRegistry` / `RuntimeMiddlewareDefaults` / `ModuleMiddlewareGroups` / `FlowMiddlewareOverride` 的最终形状与使用示例；  
- 在本 Topic 下补充典型组合示例：例如 `devtools + persist` 套餐中间件（见 `02-devtools-and-persist-example.md`），验证第三方中间件包和预设的设计 ergonomics；  
- 结合实际 PoC 验证本设计在典型场景（搜索、下单、跨模块协作、复杂表单）下的可用性和可观测性。
