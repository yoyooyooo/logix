当前仓库正在开发期，可以不计成本的改造，不需要考虑兼容。

## 仓库愿景与决策原则（v2 阶段）

- 北极星目标：面向真实业务仓库，跑通一条「Intent → Flow/Effect → 代码 → 产品上线与长期演进」的稳定链路；所有规划与实现，默认以“能否支撑最终产品形态上线并可持续演进”为核心评判标准。
- 产品形态：默认最终承载是 Web 平台（Intent/Flow/Code Studio + 控制台），CLI/库/PoC 视为引擎与开发工具层；所有新能力在设计时都要预留“平台上的交互与多角色协作”落点。
- LLM 一等公民：平台长远目标是「平台内集成 LLM」，通过稳定的任务 API 协同完成生成/改写/迁移；在 DSL/schema/配置设计时优先考虑“LLM 易生成、易校验、易对比”，而不是手写配置的体验。
- 全配置化、不吝惜配置成本：Intent/Flow/Constraint/运行时相关配置可以追求表达力和覆盖度，不必为减少字段或层级牺牲信息量；默认假设主要维护者是 LLM + 工具链，人类只负责审阅、少量 override 与决策。
- 持续对齐 LLM 能力上限：每轮演进时优先评估“当前或下一代 LLM 能自动完成哪些步骤”，平台更偏向提供约束、事实源与审核视图，而不是自己接管可自动化的细节；新设计要尽量把重复性、样板化工作外移给 LLM。
- 引擎优先：在 docs/specs 与运行时层面，优先把 Intent/Flow/Effect 契约与幂等出码引擎打磨稳定，再考虑 Studio/画布等交互体验；遇到冲突时，一律先保证引擎正确、可回放、可追踪。
- 架构与技术选型：平台与业务仓库的架构和技术选型由团队统一决策，可以反向由平台规定“出码栈”；在当前阶段大胆将 `effect-ts` + 约定目录结构视为首选出码标准，业务项目优先向这套标准对齐。
- Effect 作为统一运行时：暂时认定 `effect`（effect-ts v3 系列）是 Behavior & Flow Intent 的统一运行时内核，所有“出码后的业务流程执行”都应以 `.flow.ts` + Effect 程序为最终落点；如果要尝试其他运行时，只作为 PoC/对比实验，而不是第二套正式栈。
- 优先做“可落地的最小闭环”：新想法优先以「小范围、端到端」的 PoC 验证——至少能从某个 Intent/Flow 出发，跑到真实代码与运行时行为；避免只停留在 schema/文档层不落地。
- 不为学习曲线让路：在不牺牲产品可维护性的前提下，可优先选择更利于运行时一致性、可推理性和可组合性的方案（例如更 FP/Effect 化的写法、清晰但略复杂的 Env/Layer 拆分），不刻意为新人学习曲线简化核心契约。
- 以真实场景倒推设计：所有新增约束、Flow 步骤、Env 服务、Schema 字段，优先从 IMD/best-practice 中挑选真实 ToB 场景倒推；如果暂时找不到对应场景，则标记为实验性能力，避免进入“默认契约”。
- 文档优先于代码拍板：任何会影响 Intent 模型、Flow DSL、Effect 运行时契约的决定，应优先在 `docs/specs/intent-driven-ai-coding/v2` 中更新并达成稳定说法，再在 PoC/子包中实现，避免“代码先跑偏、文档跟不上的事实源漂移”。

# Agent Context for `intent-flow`

- 仓库定位：意图驱动 + Effect 运行时 PoC 实验场，用于在平台化之前把 **Intent 模型 / Flow DSL / effect 运行时 / ToB 典型场景** 练透。
- 上游依赖（只读）：
  - IMD 组件库：`/Users/yoyo/projj/git.imile.com/ux/imd`（UI/Pro Pattern 与 registry）；
  - best-practice 仓库：`/Users/yoyo/projj/git.imile.com/ux/best-practice`（文件/状态/服务层规范与代码片段）。
- 本仓库结构：
  - `docs/specs/intent-driven-ai-coding/v1`：早期方案与 PoC；
  - `docs/specs/intent-driven-ai-coding/v2`：当前主线（六层 Intent 模型 + schema + UX + effect-runtime 设计）；
  - `docs/specs/intent-driven-ai-coding/v2/effect-poc`：概念级场景 PoC（简化版 Effect + Env/Flow 草图）；
  - `packages/effect-runtime-poc`：真实依赖 `effect` 的运行时子包，按场景拆分 Env/Flow。
- `effect` 相关约定（基于 v3.19.x 官方文档与 d.ts，避免踩坑，优先以实际类型提示为准）：
  - 知识源与冲突处理：
    - 当模型固有知识与当前项目的类型错误 / TS 提示冲突时，一律以本地 `effect` d.ts 和编译器为准。
    - 如有不确定或发现“看起来对但 TS 报错”的用法，优先通过 context7 / 官方源码确认最新写法，并将关键差异沉淀回本段认知（必要时补充到仓库文档）。
  - Effect 核心签名与别名：
    - 固定认知：`Effect.Effect<A, E = never, R = never>` 三个泛型依次表示 **成功值 / 业务错误类型 / 依赖环境**，不得调换；本仓所有代码都按这个顺序理解和书写。
    - 自定义别名可以使用 `Fx<R, E, A>` 这种调用方顺序，但底层始终是 `Effect.Effect<A, E, R>`，例如：`type Fx<R, E, A> = Effect.Effect<A, E, R>`；禁止把 `R` 放到第一个泛型位置传给 `Effect.Effect`。
    - 设计公共 Flow 时，推荐签名形态为 `<R>() => Effect.Effect<A, E, R>`，由调用方通过 Layer 扩展环境。
  - 依赖环境 `R` 与 Tag 模式：
    - 把 `R` 理解为「按需注入的服务集合」，在类型层面是 **逆变位**：需要更少依赖的 Effect 可以赋给需要更多依赖的地方，反之不行。
    - 在本仓定义服务时统一使用 Tag class 模式：`class X extends Context.Tag("X")<X, Service>() {}`；不要再新写 `Context.GenericTag`。
    - 一个 Tag 本身就是 `Effect.Effect<Service, never, Id>`，可以在 `Effect.gen` 中通过 `const svc = yield* ServiceTag` 直接取到实现；实际提供通过 `Layer.succeed(ServiceTag, impl)` 或 `Effect.provideService` 完成。
  - 环境读取与 Context：
    - 允许在运行时内核 / 中间件层（例如实现约束管道、调试工具）使用 `Effect.context<R>()` 及相关 API 操作上下文。
    - 在业务 Flow / Service 层，**不要**构造或操作「胖 Context 对象」，也不要在日常逻辑中显式传递 `Context.Context`；一律通过 Tag 按需取服务：`yield* LoggerTag`、`yield* RegionService` 等。
  - 超时与重试 API（以 v3 签名为准）：
    - `Effect.timeoutFail` 使用对象参数 + `pipe`：`effect.pipe(Effect.timeoutFail({ duration, onTimeout }))`；不要再使用旧版 `timeoutFail(effect, onTimeout, duration)` 三参数风格。
    - `Effect.retry` 接受配置对象（如 `{ times: 3 }`），不会改变环境类型 `R`；在本仓倾向在通用约束层统一包装，而不是在各个 Flow 内随意散布重试逻辑。
  - Promise 集成与错误语义：
    - `Effect.promise(evaluate)` 的错误通道类型为 `never`，Promise reject 会被视为 defect；当需要显式业务错误通道时，应使用 `Effect.tryPromise` 并在 `catch` 中构造领域错误。
    - Flow 层中 `E` 应尽量是语义化错误（领域 / 校验 / 可透出给上层），不要把 `unknown` 或裸 `Error` 直接冒泡；如果下层是 `unknown` / `any`，优先在 Flow 内收敛并包装。
  - 运行入口与 Layer 组合：
    - 默认假设：`Effect.runPromise` 等运行入口期望的环境为 `never`；带依赖的 Flow 必须经由 `Effect.provide(effect, layer)` 或 `Effect.provideService` 注入完整 Layer 后再运行，不得直接对仍有非 `never` 环境的 Effect 调用 `runPromise`。
    - Layer 组合在本仓的基准策略：用 `Layer.succeed(Tag, impl)` 提供实现，用 `Layer.mergeAll(...)` 或 `pipe(layer, Layer.provide(...))` 组合，最终聚合为一个 `RuntimeLayer` 提供给运行时，保证平台运行时与出码运行时只在 Layer 实现上有差异，而共享同一批 FlowDescriptor 与约束管道。
    - 对 `ManagedRuntime.make` 的认知：签名是 `make<R, E>(layer: Layer.Layer<R, E, never>)`，即 Layer 的第三个泛型（入参环境）必须为 `never`；组合应用层环境时，要从最内层有依赖的 Layer 开始，逐步 `Layer.provide` 依赖，而不是把仍带依赖的 Layer 直接交给 `ManagedRuntime.make`。
  - Cache / 环境泛型的解读：
    - 像 `Cache.make<Key, Value, Error = never, Environment = never>` 这类构造器，其 `Environment` 表示 **在 lookup 过程中额外需要的环境**；通常通过闭包捕获 Service 时，应保持为 `never`，而不是写成 `typeof SomeService`。
    - 若 `Value` 的错误类型是领域错误（如 `ApiError`），而上层 UI / Store 希望对外暴露「永不失败」的数据流，应在边界统一使用 `Effect.catchAll(() => Effect.succeed(default))` 收敛错误，再对外暴露 `Stream<_, never, _>`。
  - SubscriptionRef v3 用法：
    - 认知为一个「可订阅 Ref」：写入和读取变化一律通过模块函数，而不是实例方法。
    - 写入：`yield* SubscriptionRef.set(ref, value)` 或 `SubscriptionRef.update(ref, f)`；订阅变化：`ref.changes`；不要假设存在 `ref.set` / `ref.get`。
  - Effect.gen 推荐写法：
    - 在业务 Flow 中统一使用 **Tag 形式的 `yield*`**：`Effect.gen(function* () { const svc = yield* ServiceTag; ... })`。
    - 不再使用 `_` 适配器等「`yield* _(Tag)`」风格，这样可以配合 Tag class 的统一推导得到最干净的 `R`，避免出现不必要的 `unknown` / `never` 交互。
  - Schema 与 Config 使用约定：
    - 新增 Schema 统一从 `effect` 导入：`import { Schema } from "effect"`，而不是再新引 `@effect/schema`；`@effect/platform` 的 Schema 相关 API（例如 `schemaBodyJson`）默认配合的是 `effect/Schema`。
    - 领域模型（如 `RegionSchema`）推荐写法：`const RegionSchema = Schema.Struct({ ... })`，对应类型通过 `Schema.Schema.Type<typeof RegionSchema>` 或 `typeof RegionSchema.Type` 推导，保证「Schema 定义」和「Type 推导」来自同一套 API。
    - Config 读取：使用 `Config.xxx("KEY").pipe(Config.withDefault(...))`，并在 `Effect.gen` 中通过 `const value = yield* Config.xxx(...)` 获取结果；不要假定存在 `Effect.config(...)` 这种旧式入口。
  - HTTP 客户端与 Schema 解码：
    - 使用 `@effect/platform` 的 `HttpClientResponse.schemaBodyJson` 等 API 时，优先基于 `effect/Schema` 定义请求 / 响应结构，例如：`HttpClientResponse.schemaBodyJson(Schema.Array(RegionSchema))`。
    - `Schema.Array(RegionSchema)` 推导出的数组是只读数组（`ReadonlyArray`）；如果 Service 契约或 Store 需要 `Array<T>`，要显式通过 `Array.from` 或类似方式拷贝，例如：`Effect.map((regions) => Array.from(regions))`。
    - Service Tag 上声明的方法签名要和实现保持完全一致（包括数组是否只读），避免在 Layer 组合或下游消费时因元素只读性不一致触发二次的类型错误。
  - 常见错误模式（在本仓视为禁止）：
    - 把 `Effect.Effect` 的泛型顺序写成 `Effect.Effect<R, E, A>`，或据此设计别名。
    - 在业务层直接操作 `Context.Context` 构造「胖 Env 对象」，而不是通过 Tag 抽象服务。
    - 使用旧版 API 形式（如 `Effect.timeoutFail(effect, ...)`、`Effect.config(...)`），或假定 Promise reject 会自动走业务错误通道。
    - 在 `@effect/platform` 的 HTTP 解码场景中混用 `@effect/schema` 与 `effect/Schema`，或直接将 `ReadonlyArray` 赋给 `Array` 类型而不做显式转换。
    - 定义 Service Tag 时，契约和实现返回的结构（尤其是数组可变性、错误类型和环境类型）不一致。
- 关键设计原则：
  - Intent 只表达业务/交互/信息结构的 **What**，不写组件/API/文件级 **How**；
  - Flow/Effect 层负责“步骤链 + 服务调用 + 质量约束”，领域算法细节保留在自定义服务实现里；
  - 平台 UI/CLI/Studio 是未来消费者，本仓库优先保证运行时契约与典型场景写法清晰可用。

- 常用脚本与质量基线：
  - 根目录脚本：
    - `pnpm build`：递归调用各子包的 `build` 脚本，用于构建运行时 / React 包等。
    - `pnpm typecheck`：递归执行 `typecheck`，以 TypeScript 类型检查为准做第一道防线。
    - `pnpm lint`：运行 ESLint（基于 `eslint.config.mjs`），集成 `@eslint/js`、`typescript-eslint` 与 `@effect/eslint-plugin`，覆盖 Effect import 规范等。
    - `pnpm lint:fix` / `pnpm format`：在 `lint` 基础上尝试自动修复（含格式与部分 Effect/TS 规则）。
  - 约定流程：每次进行「大模块改造」（如重构 Flow/Env、重排 React feature 目录、引入新运行时能力）后，至少需要：
    - 先跑 `pnpm typecheck`，确认类型层面无红线；
    - 再跑 `pnpm lint`，确认 ESLint（含 Effect 规则）无新告警或告警在可接受范围内，再交接到后续任务。

<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to use skills:

- Invoke: Bash("openskills read <skill-name>")
- The skill content will load with detailed instructions on how to complete the task
- Base directory provided in output for resolving bundled resources (references/, scripts/, assets/)

Usage notes:

- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already loaded in your context
- Each skill invocation is stateless
  </usage>

<available_skills>

<skill>
<name>project-guide</name>
<description>当在 intent-flow 仓库内进行架构设计、Flow/Effect 运行时演进、典型场景 PoC 或日常功能开发时，加载本 skill 以获得“单一事实源”（SSoT）级的项目指南、目录索引与施工流程。</description>
<location>project</location>
</skill>

<skill>
<name>skill-creator</name>
<description>Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Claude's capabilities with specialized knowledge, workflows, or tool integrations.</description>
<location>project</location>
</skill>

</available_skills>

<!-- SKILLS_TABLE_END -->

</skills_system>
