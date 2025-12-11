当前仓库仍处在积极演进阶段，可以不计成本地重构与试验，不需要考虑向历史版本兼容。

## Workflow

1. 任何和项目相关的任务优先执行 `openskills read project-guide`，并根据项目指南执行后续操作。
2. 当需要快速掌握已有仓库的一些泛化的信息的时候，优先使用 auggie 了解脉络，然后再深入查看。
3. 当做完一个特性时，需要跑通测试用例和所有类型检测，同时把变更内容消化后整合到 SSoT 文档和用户文档

## 规划对齐（简版）

- 平台主线：`intent-driven-ai-coding`，当前有效规范以 `docs/specs/intent-driven-ai-coding/v3` 为准；`v1`/`v2` 仅作为历史快照与对照材料，演进脉络见 `docs/specs/intent-driven-ai-coding/adr.md`。
  - 概念与术语层的单一事实源为：`docs/specs/intent-driven-ai-coding/v3/99-glossary-and-ssot.md`，所有「UI/Logic/Domain / Pattern / IntentRule / L0–L3」等术语以此为准，再向下映射到 runtime-logix 和 PoC。
- 运行时主线：`runtime-logix` 目录下的 **Logix Engine**，作为 Behavior & Flow Intent 的统一前端运行时 PoC；总览见 `docs/specs/runtime-logix/README.md`。
  - 运行时文档 SSoT：`apps/docs/content/docs`，所有 Logix 运行时相关的指南、API 文档以此为准。
    - `apps/docs` 要始终以「最终产品用户」视角编写，不要在文档正文中出现类似“v3/PoC 阶段/内部实现”等表述；这些信息只放在 `docs/specs` 与 ADR 中。
    - 作为 Agent 查阅 `apps/docs` 时，优先体验 API 是否易懂、易接入，把这里当作“未来官网文档”的预演；发现 API/文档体验问题时，再回流到 `docs/specs` 与代码中做结构性调整。
- 以上两条规划已经在 v3 / Logix 文档中收敛，任何新决策优先更新这些文档，再落到代码和 PoC。
- 当用户提及「草稿」、「draft」，都认为是在说 docs/specs/drafts，如果没有加载过 drafts-tiered-system skill，执行 `openskills read drafts-tiered-system` 加载

## 仓库愿景与决策原则（当前）

- **北极星**：面向真实业务仓库，跑通一条「Intent → Flow/Effect/Logix → 代码 → 上线与长期演进」的可回放链路，一切规划以能否支撑最终产品为准。
- **LLM 一等公民**：DSL / Schema / Flow / 配置的设计优先考虑“LLM 易生成、易校验、易对比”，假定主要维护者是 LLM + 工具链，人类只做审阅与少量 override。
- **引擎优先**：先把 Intent/Flow/Logix/Effect 的契约和幂等出码引擎打磨稳定，再考虑 Studio/画布等交互体验；遇到冲突，一律保证引擎正确、可回放、可追踪。
- **Effect 作为统一运行时**：默认使用 `effect`（effect-ts v3 系列）承载行为与流程执行，出码后的业务流程应以 `.flow.ts` + Effect/Logix 程序为落点；其他运行时只作为 PoC，而不是第二套正式栈。
- **文档先行**：任何会影响 Intent 模型、Flow DSL、Logix/Effect 契约的决定，应优先在 `docs/specs/intent-driven-ai-coding/v3` 与 `docs/specs/runtime-logix` 中拍板，再在子包中实现，避免“代码先跑偏、文档跟不上的事实源漂移”。
  - 对于已经确定、但实现细节容易跑偏的技术决策（例如 Store.Spec / Universal Bound API / Fluent DSL / Parser 约束），**需要同时在实现备忘中固化**：
    - 平台侧：`docs/specs/intent-driven-ai-coding/v3/platform/impl/README.md`；
    - runtime 侧：`docs/specs/runtime-logix/impl/README.md`。
  - 后续在实现阶段若遇到取舍冲突，优先回看上述两个 impl/README 中的约束说明，再决定是否调整规范或实现。

### logix-core 目录结构铁律（给 Agent 的简版）

在 `packages/logix-core/src` 内改动时，默认遵守：

- `src/*.ts` 直系文件是子模块（Module / Logic / Bound / Flow / Runtime / Link / Platform / Debug / MatchBuilder 等），**必须有实际实现代码**，不能只是纯 re-export。
- 子模块之间的共享实现（类型内核、Runtime 内核、MatchBuilder/Flow/Platform/Debug 等）统一放到 `src/internal/**`，再由子模块引入；**禁止**从 `src/internal/**` 反向 import 任意 `src/*.ts`。
- `src/internal/**` 内部再按「浅 → 深」分层：
  - 核心实现下沉到 `src/internal/runtime/core/**`（module / LogicMiddleware / FlowRuntime / Lifecycle / Platform / DebugSink / MatchBuilder 等）；
  - `src/internal/*.ts`、`src/internal/runtime/*.ts` 只通过 re-export 或薄适配依赖这些 core 文件，形成「浅层 API → 深层实现」的单向拓扑。
  - 日常自检：`rg "../" src/internal/runtime` 应为空（core 目录内除外），确保 deep internal 不回头依赖浅层。

# Agent Context for `intent-flow`

- 仓库定位：意图驱动 + Effect 运行时 PoC 实验场，用于在平台化之前把 **Intent 模型 / Flow DSL / effect 运行时 / ToB 典型场景** 练透。
- 上游依赖（只读）：
  - IMD 组件库：`/Users/yoyo/projj/git.imile.com/ux/imd`（UI/Pro Pattern 与 registry）；
  - best-practice 仓库：`/Users/yoyo/projj/git.imile.com/ux/best-practice`（文件/状态/服务层规范与代码片段）。
- 本仓库结构：
  - `docs/specs/intent-driven-ai-coding/v1`：早期方案与 PoC（已精简为历史快照，仅用于对照 v3）；
  - `docs/specs/intent-driven-ai-coding/v2`：六层 Intent 模型的快照与 ADR，对应 v2 阶段的设计记录；
  - `docs/specs/intent-driven-ai-coding/v3`：当前主线（UI/Logic/Domain 三位一体 + Flow/Logix 设计与运行时契约）；
  - `packages/effect-runtime-poc`：真实依赖 `effect` 的运行时子包，按场景拆分 Env/Flow。

## Effect-TS 使用与纠错模块（给模型/开发者的小抄）

> 本节专门收集 effect-ts 相关的“易错点与本仓约定”，方便人和 LLM 在写 Flow/Runtime 时快速对齐。
> 详细设计与最新约定以代码里的 d.ts / TS 提示为准，如有冲突一律以本地类型定义为主。

- **知识源与冲突处理**
  - 当固有认知与当前项目的类型错误 / TS 提示冲突时，一律以本地 `effect` d.ts 和编译器为准。
  - 如遇“看起来对但 TS 报错”的写法，优先查官方源码/文档，必要时把结论沉淀回本节。
  - 在本仓库内执行测试时，**禁止使用 watch 模式**（例如 `pnpm test -- <pattern>` 这种会退化为交互模式的调用）；优先使用包内的 `vitest run <pattern>` 或一次性 `pnpm test`（已配置为非 watch 模式），避免阻塞用户终端。

- **核心签名与别名**
  - 固定认知：`Effect.Effect<A, E = never, R = never>` 三个泛型依次是 **成功值 / 业务错误类型 / 依赖环境**，不得调换。
  - 自定义别名可以用调用方顺序：`type Fx<R, E, A> = Effect.Effect<A, E, R>`，但底层永远是 `Effect.Effect<A, E, R>`。
  - 设计公共 Flow 时，推荐签名 `<R>() => Effect.Effect<A, E, R>`，由调用方通过 Layer 扩展环境。

- **环境 `R` 与 Tag 模式**
  - 把 `R` 理解为“按需注入的服务集合”，在类型上是逆变位：依赖更少的 Effect 可以赋给依赖更多的地方，反之不行。
  - 本仓统一用 Tag class：`class X extends Context.Tag("X")<X, Service>() {}`，不要新写 `Context.GenericTag`。
  - Tag 本身就是 `Effect.Effect<Service, never, Id>`，可在 `Effect.gen` 中 `const svc = yield* ServiceTag` 取实现，实现通过 `Layer.succeed(ServiceTag, impl)` 或 `Effect.provideService` 提供。

- **Context / Env 使用边界**
  - 运行时内核 / 中间件层（约束管道、调试工具）可以用 `Effect.context<R>()` 操作上下文。
  - 业务 Flow / Service 层避免显式构造/传递 `Context.Context`，“胖 Env 对象”一律用 Tag 方式按需取服务：`yield* LoggerTag`、`yield* RegionService`。

- **超时与重试 API（以 v3 签名为准）**
  - 使用对象参数 + `pipe`：`effect.pipe(Effect.timeoutFail({ duration, onTimeout }))`，不要再用旧版三参数形式。
  - `Effect.retry` 接收配置对象（如 `{ times: 3 }`），不会改变环境类型 `R`，优先在通用约束层包装重试，而不是散落在每个 Flow 内。

- **Promise 集成与错误语义**
  - `Effect.promise(evaluate)` 的错误通道类型为 `never`，Promise reject 被视为 defect；需要业务错误通道时使用 `Effect.tryPromise` 并在 `catch` 中构造领域错误。
  - Flow 层的 `E` 应尽量是语义化错误（领域/校验/可透出给上层），不要直接冒泡 `unknown` 或裸 `Error`。

- **运行入口与 Layer 组合**
  - 默认假设：`Effect.runPromise` 等 run API 期望环境为 `never`；带依赖的 Flow 必须先通过 `Effect.provide` / `Effect.provideService` 注入完整 Layer，再运行。
  - Layer 组合：用 `Layer.succeed(Tag, impl)` 提供实现，`Layer.mergeAll(...)` / `pipe(layer, Layer.provide(...))` 组合，最终聚合为 `RuntimeLayer` 提供给运行时。
  - `ManagedRuntime.make` 签名：`make<R, E>(layer: Layer.Layer<R, E, never>)`，第三个泛型必须是 `never`，不要把仍带依赖的 Layer 直接交给它。

- **Cache / 环境泛型解读**
  - `Cache.make<Key, Value, Error = never, Environment = never>` 里的 `Environment` 表示 lookup 过程中额外需要的环境；通过闭包捕获 Service 时应保持为 `never`，不要写成 `typeof SomeService`。
  - 若 `Value` 的错误类型是领域错误（如 `ApiError`），而对外希望暴露“永不失败”的流，可在边界用 `Effect.catchAll(() => Effect.succeed(default))` 收敛错误，再对外暴露 `Stream<_, never, _>`。

- **SubscriptionRef v3 用法**
  - 认知为“可订阅 Ref”：读写都用模块函数，而不是实例方法。
  - 写入：`yield* SubscriptionRef.set(ref, value)` / `SubscriptionRef.update(ref, f)`；订阅变化：`ref.changes`，不要假设有 `ref.set` / `ref.get`。

- **Effect.gen 推荐写法**
  - 在业务 Flow 中统一用 Tag 形式 `yield*`：`Effect.gen(function* () { const svc = yield* ServiceTag; ... })`。
  - 不再使用 `_` 适配器等 `yield* _(Tag)` 风格，以获得更干净的 `R` 推导，避免不必要的 `unknown` / `never`。

- **Schema / Config / HTTP 解码**
  - Schema 一律从 `effect` 导入：`import { Schema } from "effect"`，搭配 `@effect/platform` 的 Schema API 使用。
  - 领域模型推荐：`const RegionSchema = Schema.Struct({ ... })`，类型通过 `Schema.Schema.Type<typeof RegionSchema>` 或 `typeof RegionSchema.Type` 推导。
  - Config 读取：`Config.xxx("KEY").pipe(Config.withDefault(...))`，在 `Effect.gen` 中 `const value = yield* Config.xxx(...)`，不要使用旧的 `Effect.config(...)`。
  - HTTP 解码时优先用 `HttpClientResponse.schemaBodyJson(effect/Schema)`；`Schema.Array(RegionSchema)` 返回 `ReadonlyArray`，如需 `Array<T>` 要显式 `Array.from`；Service Tag 方法签名与实现必须严格一致（含数组可变性）。

- **常见错误模式（本仓视为禁止）**
  - 把 `Effect.Effect` 泛型顺序写成 `Effect.Effect<R, E, A>`，或据此设计别名。
  - 在业务层直接操作 `Context.Context` 构造“胖 Env 对象”。
  - 使用旧版 API 形式（如 `Effect.timeoutFail(effect, ...)`、`Effect.config(...)`），或假定 Promise reject 会自动走业务错误通道。
  - 在 `@effect/platform` HTTP 解码场景中混用 `@effect/schema` 与 `effect/Schema`，或直接把 `ReadonlyArray` 赋给 `Array`。
  - 定义 Service Tag 时，契约和实现返回结构（尤其数组可变性、错误类型、环境类型）不一致。
- **API 命名约定 (v3)**
  - 全面拥抱 `*.make` 风格，强调运行时构造语义，废弃 `*.define`。
  - 标准范式：
    - `Store.make("id", { ... })`
    - `Pattern.make("id", { ... }, ($) => ...)`
- 关键设计原则：
  - Intent 只表达业务/交互/信息结构的 **What**，不写组件/API/文件级 **How**；
  - Flow/Effect 层负责“步骤链 + 服务调用 + 质量约束”，领域算法细节保留在自定义服务实现里；
  - 平台 UI/CLI/Studio 是未来消费者，本仓库优先保证运行时契约与典型场景写法清晰可用。

- 常用脚本与质量基线：
  - 根目录脚本：
    - `pnpm build`：递归调用各子包的 `build` 脚本，用于构建运行时 / React 包等。
    - `pnpm typecheck`：递归执行 `typecheck`，以 TypeScript 类型检查为准做第一道防线。
    - `pnpm typecheck:test`：递归执行 `typecheck:test`，对各包的 src + test 进行完整类型检查，作为回归测试前的类型兜底。
    - `pnpm lint`：运行 ESLint（基于 `eslint.config.mjs`），集成 `@eslint/js`、`typescript-eslint` 与 `@effect/eslint-plugin`，覆盖 Effect import 规范等。
    - `pnpm lint:fix` / `pnpm format`：在 `lint` 基础上尝试自动修复（含格式与部分 Effect/TS 规则）。
    - `pnpm test`：使用 Vitest 一次性运行（`vitest run`），**不会进入 watch 模式**。
  - 子包脚本（关键包）：
    - `packages/logix-core`：
      - `pnpm test`：等价于 `vitest run`，用于一次性跑完 core 的测试；
      - `pnpm test:watch`：进入 Vitest watch 模式，仅供人工本地调试使用，**Agent 禁止调用**。
      - `pnpm typecheck:test`：使用 `tsconfig.test.json` 对 src+test 做完整类型检查。
    - `packages/logix-react`：
      - `pnpm test`：等价于 `vitest run`，一次性跑 React 适配层测试；
      - `pnpm test -- --project browser`：只运行 Vitest browser 模式下的浏览器集成测试（匹配 `test/browser/**`），依赖 Playwright + `@vitest/browser-playwright`；
      - `pnpm test:watch`：仅本地人工调试使用，Agent 不得调用；
      - `pnpm typecheck:test`：检测 React 包的 src+test 类型。
  - 约定流程：每次进行「大模块改造」（如重构 Flow/Env、重排 React feature 目录、引入新运行时能力）后，至少需要：
    - 先跑 `pnpm typecheck`，确认类型层面无红线；
    - 再跑 `pnpm lint`，确认 ESLint（含 Effect 规则）无新告警或告警在可接受范围内，再交接到后续任务。

## 文档编写规范 （apps/docs）

- **渐进式示例展示 (Progressive Examples)**
  - 在编写场景化教程或示例时，应使用 Fumadocs Tabs 展示不同层次的实现，帮助用户理解本质：
    1.  **Logic DSL**: 推荐的高层声明式写法 (e.g., `$.onState`)。
    2.  **Flow API**: 底层流式写法 (e.g., `$.flow.fromState`)。
    3.  **Raw Effect**: 纯 Effect/Stream 实现 (Mental Model)。
  - Tab 标题应简洁，如 "Logic DSL", "Flow API", "Raw Effect"。

- **文档定位与分层 (SSoT vs User Docs)**
  - **内部规范 (SSoT)** -> `docs/specs/`:
    - 面向：架构师、核心贡献者、Agent。
    - 内容：架构决策、核心逻辑、设计约束、Drafts。
    - 风格：严谨、技术深度、包含 "v3/PoC" 等内部术语。
  - **用户文档 (User Docs)** -> `apps/docs/`:
    - 面向：最终产品用户、业务开发者。
    - 内容：使用指南、API 文档、教程、最佳实践。
    - 风格：易读、产品视角、**禁止**出现 "v3/PoC/内部实现" 等术语。

- **草稿体系 (Drafts System)**
  - 所有未定稿的方案、调研、灵感应存放在 `docs/specs/drafts`。
  - 遵循 `drafts-tiered-system` skill 管理 L1-L9 分级。
  - 成熟后分别归档到 `docs/specs` (规范) 或 `apps/docs` (文档)。

## 工具调用

1. 当你对 Effect-ts 的 api 有疑问时，优先考虑使用 context7 查询最新使用方式

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
<name>drafts-tiered-system</name>
<description>This skill should be used when managing the docs/specs/drafts L1–L9 tiered draft system in the intent-flow repository, including placing new drafts, refining and promoting drafts between levels, consolidating related drafts, and maintaining the drafts index.</description>
<location>project</location>
</skill>

<skill>
<name>project-guide</name>
<description>当在 intent-flow 仓库内进行架构设计、v3 Intent/Runtime/平台规划演进、典型场景 PoC 或日常功能开发时，加载本 skill 以获得“docs/specs 为主事实源”的项目导航、目录索引与施工流程。</description>
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
