# 3. `ModuleDef.logic(($)=>Effect)`：逻辑程序入口

## 3.1 基本形态

`ModuleDef.logic`（以及带 `.impl` 的 `Module.logic`）是“在该领域上挂载一段 Logic 程序”的入口：

```ts
export const CounterLogic = CounterDef.logic(($) =>
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

- 由 ModuleDef 注入一个 Bound API `$`（见第 4 节），Env 类型自动推导为 `Logic.Env<Sh,R>`；
- 返回值就是一段 Logic 程序（`Logic.Of<Sh,R>`），可以在 `ModuleDef.live` 中挂载，或作为 Pattern/模板返回值复用；
- 一个 ModuleDef 可以有多段 Logic（多次 `.logic` 调用），但通常约定在 Module 定义文件导出一个“主逻辑”，其余作为 Pattern/插件逻辑组合到 `.live` 中。

## 3.2 组合多个 Logic 程序

ModuleDef 本身不限制 Logic 的个数，`ModuleDef.live` 会将它们统一挂在该 Module 对应的 `Logix.ModuleRuntime` 上：

```ts
export const AuditLogic = CounterDef.logic($ => /* ... */);
export const MetricsLogic = CounterDef.logic($ => /* ... */);

export const CounterLive = CounterDef.live(
  { count: 0 },
  CounterLogic,   // 主逻辑
  AuditLogic,     // 审计插件
  MetricsLogic,   // 监控插件
);
```

## 3.3 两阶段写法与约束（setup / run）

- **心智模型**：builder 闭包的一次性执行产出 `LogicPlan = { setup, run }`：return 前的同步调用归入 setup（注册 reducer / lifecycle / Debug/Devtools hook），return 的 Effect 归入 run（长逻辑、Env 访问、Watcher/Flow）。旧写法 `ModuleDef.logic(($)=>Effect.gen(...))` 等价于仅含 run 段。
- **约束**：setup 段不访问 Env/Service，不做 IO，保持幂等；在 setup 段调用 `$.use/$.onAction/$.onState` 等 run-only 能力，或在 builder 顶层执行 `Effect.run*`，会被 Runtime 转为 `diagnostic(error)`（`logic::invalid_phase` / `logic::setup_unsafe_effect`）。
- **推荐顺序**：return 前先注册 `$.lifecycle.onError/onInit`，再注册动态 `$.reducer`，最后在 return 的 Effect 内挂载 Watcher/Flow；详见 `03-logic-and-flow.md#logic-书写顺序（best-practice-·-两阶段心智）`。

### 3.3.1 最小模板（推荐）

建议显式使用 `{ setup, run }` 形态，避免把 “run-only 的 `$` 能力” 误放到 setup：

```ts
export const SomeLogic = SomeDef.logic<MyService>(($) => ({
  setup: Effect.void, // 或 Effect.sync(() => $.traits.declare(...))
  run: Effect.gen(function* () {
    const svc = yield* $.use(MyService)
    // 在这里挂 watcher/flow 并 yield* 它们
  }),
}))
```

常见踩坑：

- `setup: Effect.gen(function* () { yield* $.use(MyService) })` → `LogicPhaseError(kind="use_in_setup")`（把 `$.use` 移到 `run`）。
- `SomeDef.logic<typeof MyService>(...)` / `SomeDef.implement<typeof MyService>(...)` → Env/Tag 推导错误：`R` 应填写 **Tag 类型本身**（`MyService`），不要写 `typeof`。

## 3.4 Phase Guard 与诊断（API 行为矩阵）

- **LogicPlan 统一形态**：Logic 写法始终被归一为 `LogicPlan<Sh,R,E> = { setup: Effect<void, E, Env>; run: Effect<void, E, Env> }`，运行时在解析逻辑时自动注入 `phaseRef`，保证 setup/run 两段可观测。旧写法自动折叠为 `setup = Effect.void / run = 原逻辑`。
- **Phase Guard 规则**：下列 API 视为 run-only，若在 setup 段调用会抛出 `LogicPhaseError(kind=\"use_in_setup\", api=...)` 并被转换为 `diagnostic code=logic::invalid_phase severity=error`：`$.use / $.onAction* / $.onState* / $.flow.from*` 及基于 IntentBuilder 的 `.run* / .run*Task / .update / .mutate`。
- **Setup-only（023）**：`$.traits.declare(traits)` 只允许在 setup 段调用；在 run 段调用会抛出 `LogicPhaseError(kind=\"traits_declare_in_run\", api=\"$.traits.declare\")`，并被转换为 `diagnostic code=logic::invalid_phase severity=error`（提示“traits 已冻结”）。
- **诊断字段**：`LogicPhaseError` 暴露 `kind/api/phase/moduleId`，DevTools 与平台可直接依赖结构化字段，无需字符串解析；其他诊断同样通过 `DebugSink` 以 `logic::* / reducer::* / lifecycle::*` code 形式对外广播。
- **Env 缺失与 runSync 不变量**：Logic 构造阶段的错误（含 phase 违规）统一被收敛为诊断，不会破坏 `ModuleDef.live` / `Runtime.make` 的同步构造路径；只有在 Env 铺满后仍发生的 `Service not found` 才被视为硬错误。

## 3.5 Field Capabilities 与 State Graph（StateTrait / `@logix/core` 的角色）

> 更新说明（2025-12-10）：早期草案中，字段能力与 State Graph 曾规划由独立包 `@logix/data` 承载。  
> 随着 `specs/007-unify-trait-system` 设计收敛，当前主线改为由 `@logix/core` 内部的 StateTrait 模块统一承载字段能力与派生收敛；早期以独立 Topic 讨论“字段能力/State Graph”的文档仅作为历史参考，已不再维护。

在当前模型中，字段层的响应式与联动能力（例如 Computed 字段、从外部资源加载的 Source 字段、跨字段 Link 字段）统一收敛到 `@logix/core` 内部的 StateTrait 实现。整体边界大致如下：

- **Schema / Traits 层（Layer 1）**：
  - Module 的 State Schema 使用 Effect 的 Schema 定义字段结构，computed / source / link 等能力通过 StateTrait DSL 声明，例如：
    - `StateTrait.computed({ deps, get, equals? })`
    - `StateTrait.source({ deps, resource, key })`
    - `StateTrait.link({ from })`
  - 这些声明被统一收集为 `StateTraitSpec`，并在 build 阶段生成 `StateTraitProgram`，其中包含 StateTraitGraph（字段与能力拓扑）与 StateTraitPlan（运行计划）。
- **Runtime 层（Layer 2）**：
  - 运行时需要在初始化阶段调用 `StateTrait.install($, program)` 才会激活 Trait 行为（并将 Program 注册到 Runtime 内核以便在事务窗口内 converge）；当前实现中：带 `traits` 的 ModuleDef 在 `ModuleDef.implement` 路径会自动注入安装逻辑；若使用 `ModuleDef.live` 直出 Layer，则需显式在 logics 中调用 `StateTrait.install`（或改用 `ModuleDef.implement`）。
  - **023：Logic setup traits**：除 Module-level `traits` 外，Logic 也可以在 `LogicPlan.setup` 中通过 `$.traits.declare(StateTraitSpec)` 贡献 traits；Runtime 会在初始化阶段收集 module/logic 的 contributions，完成确定性合并与一致性校验（`requires/excludes`），随后冻结并在 finalize 阶段一次性 build/install Program。
  - 安装后，Logix ModuleRuntime 会在事务提交前基于 StateTraitPlan 执行派生收敛（如“哪些字段依赖哪些字段”“哪些字段由外部资源驱动”），并通过 Bound API `$` 与 EffectOp/Middleware 暴露标准入口与诊断事件。
  - 长期目标是让典型的 Computed / Source / Link 写法都通过 StateTrait Program 驱动，而不是在每个 Module 中手写胶水逻辑。
- **DevTools / 平台层**：
  - StateTraitProgram 提供的 StateTraitGraph（`GraphNode` / `GraphEdge` 等）作为 State Graph 事实源，Logix Runtime 和 DevTools 可以基于这份图结构：
    - 可视化字段与能力之间的依赖关系；
    - 对比两个版本模块的字段与依赖变更。

> 注意：关于 Trait/StateTrait 与事务内收敛、回放与诊断口径的更详细数据模型与契约，请参考：
>
> - `specs/007-unify-trait-system/spec.md`
> - `docs/specs/drafts/topics/trait-system/*`（仅保留“残渣/场景清单”，不作为规范裁决）

## 3.6 StateTrait.source 与 Resource / Query 的运行时接缝（概览）

> 详细数据模型与契约见：`specs/007-unify-trait-system/contracts/query.md` 与 `../runtime/05-runtime-implementation.md`。本节只在「Module / Logic API」视角补充资源相关术语的上下文。

- **Module 图纸层**
  - Module 作者在 `traits` 槽位只需要写：

  ```ts
  const UserProfileResource = {
    id: "user/profile",
    meta: { label: "用户资料" },
  } as const

  traits: StateTrait.from(StateSchema)({
    profileResource: StateTrait.source({
      deps: ["profile.id"],
      // 推荐：复用 ResourceRef（或 ResourceRef.id），避免散落字符串常量
      resource: UserProfileResource.id,
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
    2. 构造一条 `EffectOp(kind = "trait-source", name = resourceId, meta.resourceId = resourceId, meta.key = key, meta.fieldPath = targetFieldPath)`；
    3. 将该 EffectOp 交给当前 Env 中配置的 EffectOp MiddlewareStack 执行。
  - Resource 模块负责在 Env 中注册逻辑资源规格：
    - `Logix.Resource.make({...})` 定义 ResourceSpec；
    - `Logix.Resource.layer([specA, specB, ...])` 在某个 Runtime 范围内注册资源表；
    - Resource 中间件（未来的实现）根据 `resourceId + key` 选择并调用对应 ResourceSpec.load。
  - Query 中间件（可选）在上层包裹 source-load 类 EffectOp：
    - `Query.Engine.layer(engine)` 在 Runtime scope 内注入外部查询引擎（默认推荐 `Query.TanStack.*` 适配）；
    - `Query.Engine.middleware(config)` 订阅 `kind = "trait-source"` 的 EffectOp，并在配置命中时将 `ResourceSpec.load` 的执行委托给外部引擎（缓存/in-flight 去重/失效）。

- **DevTools / 平台层**
  - DevTools 可以同时依赖：
    - StateTraitGraph：看“哪些字段依赖哪些资源”；
    - EffectOp Timeline：看“哪些 source-refresh / service 调用何时发生、由哪个 Module/字段触发”；
  - 平台视角下，StateTrait.source 与 Resource/Query 的职责边界为：
    - StateTrait/source：声明“字段依赖的逻辑资源及 key 规则”；
    - Resource/Query：提供该资源的实现与访问策略；
    - EffectOp/Middleware：承载实际调用链与横切能力（日志/缓存/重试/熔断等）。

## 3.7 TraitLifecycle：领域包（Form/Query/…）统一下沉协议

> 目标：让业务侧尽量只接触“领域 API”（Form/Query/…），但底层仍能统一降解到同一套 Trait/事务/回放/诊断语义。  
> 结论：领域包与内核之间通过 `Logix.TraitLifecycle` 交换 **可序列化、可比较** 的请求，而不是让每个领域包各自直连 Runtime 私有实现。

TraitLifecycle 的定位：

- **向上**：被领域包（`@logix/form`、`@logix/query` 等）用于表达“校验/刷新/清理/失效”等高层意图；
- **向下**：在 Runtime 内部被解释为对 `StateTraitProgram` / `StateTransaction` / `ReplayLog` 的标准操作序列。

核心 API（概览）：

- `TraitLifecycle.Ref.*`：构造 FieldRef（字段引用），用于稳定定位“要操作的目标”。
- `TraitLifecycle.scopedValidate(bound, request)`：提交一次 scoped validate 请求（会被挂到当前事务并在提交前 flush）。
- `TraitLifecycle.cleanup(bound, request)`：结构变更下的确定性清理（典型：清理 `errors/ui` 子树）。
- `TraitLifecycle.scopedExecute(bound, request)`：领域动作的统一执行入口（Phase 2 中先固化失效请求的记录与回放口径）。

与 `ModuleDef.logic` / StateTransaction 的关系：

- TraitLifecycle 的调用应当发生在 **run 段**（Watcher/Flow/事件处理）中；setup 段只做注册，不直接触发校验/刷新等动作。
- 当调用发生在“已开启的事务窗口”内时，TraitLifecycle 会将请求 **挂到当前事务**（避免额外 commit）；
- 当调用发生在事务窗口之外时，TraitLifecycle 会通过 Runtime 的统一入口 **开启一笔新事务** 来执行请求，从而保持“每次入口 = 一笔事务”的不变式。

> 参考：TraitLifecycle 的请求结构与 FieldRef 语义见 `@logix/core` 导出 `TraitLifecycle`（以及 `specs/007-unify-trait-system` 的术语与约束）；其在提交前 flush 的执行顺序见 `../runtime/05-runtime-implementation.01-module-runtime-make.md#15-statetransaction-与状态提交路径`。

---
