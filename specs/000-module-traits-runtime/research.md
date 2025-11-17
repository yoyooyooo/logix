# Research Notes: 统一 Module Traits（StateTrait）与 Runtime Middleware/EffectOp

**Branch**: `001-module-traits-runtime`  
**Spec**: `specs/000-module-traits-runtime/spec.md`  
**Scope (Phase 0)**: 本文档当前优先聚焦 Trait / StateTrait 相关决策，Middleware/EffectOp 只在与 Trait 接缝处简单标注。

> 相关 reference：
> - StateTrait 内核与 Program 结构：`references/state-trait-core.md`  
> - EffectOp 总线与 Middleware 设计：`references/effectop-and-middleware.md`  
> - Resource / Query 命名空间与 StateTrait.source 集成：`references/resource-and-query.md`  
> - Devtools / Debug 与 Graph + Timeline 视图：`references/devtools-and-debug.md`  
> - Parser / Studio 与 Module 图纸 / Trait IR 对齐：`references/parser-and-studio.md`

---

## 1. Trait 抽象与 StateTrait Engine 形态

### Decision 1.1 · Trait 生命周期与抽象层级

- **Decision**: Trait 的标准生命周期统一为：
  - `Spec`（Module 图纸中的声明，例如 `traits: StateTrait.from(StateSchema)({ ... })`）  
  - `build(Subject, Spec) -> Program`（编译到 IR）  
  - `install($, Program) -> Effect`（安装到 Runtime）
- **Rationale**:
  - 与 Effect / Layer 的“值 + 解释器 + run”心智一致；  
  - 便于后续为 ActionTrait / FlowTrait / ModuleTrait 复用同一套模式；  
  - 让 Module 图纸只承载 Spec，而 Program/Plan/Middleware 等细节隐藏在 core internal。
- **Alternatives considered**:
  - 暴露统一的 `RuntimeTraitEngine<Subject, Spec, Program>` 抽象作为 public API；  
    - 结论：保留为 internal 接口（`internal/state-trait/engine.ts`），对外只暴露 `StateTrait.build/install`，避免在 v1 就锁死过重的泛型抽象。

### Decision 1.2 · StateTraitProgram 的最小必要字段

- **Decision**: `StateTraitProgram<S>` 至少包含：
  - `stateSchema: Schema.Schema<S, any>`  
  - `spec: StateTraitSpec<S>`（Module 图纸中的 traits）  
  - `graph: StateTraitGraph`（字段 + Trait 的结构视图）  
  - `plan: StateTraitPlan`（内部执行计划，供 `install` 使用）
- **Rationale**:
  - `stateSchema` 与 `spec` 用于回溯和类型推导；  
  - `graph` 是 Devtools / Studio 的主入口（拓扑 / diff / 可视化）；  
  - `plan` 只在 internal runtime 使用，后续可部分降级为 Middleware 配置，不对外暴露细节结构。
- **Alternatives considered**:
  - 仅暴露 Graph，不定义 Plan：  
    - 这样 install 必须在每次运行时从 Graph 重新推导行为，复杂度较高，且难以表达诸如 watch/更新顺序等策略；  
    - 现阶段保留 Plan 有利于实现和调试，后续可在不破坏 Program 边界的前提下重构内部结构。

---

## 2. StateTraitSpec / Entry 类型边界

### Decision 2.1 · from + Spec 的基本形态

- **Decision**:
  - 对模块作者暴露的入口为：`StateTrait.from(StateSchema)(spec)`；  
  - `StateTraitSpec<S>` 的形态为：
    ```ts
    type StateTraitSpec<S> = {
      [Path in StateFieldPath<S>]?: StateTraitEntry<S, any>
    }
    ```
  - `StateTraitEntry<S, A>` 至少包含：
    - `kind: "computed" | "source" | "link"`  
    - `meta: unknown`（按 kind 分派具体结构）
- **Rationale**:
  - `from(schema)` 层负责收窄路径空间与 State 类型，用户不需要显式写泛型；  
  - Spec 是标准「路径 → Entry」的 map 形式，与 Module 图纸直观对应；  
  - Entry.kind 只收敛到三类（computed/source/link），后续扩展通过 meta 字段逐步演进。

### Decision 2.2 · 三类 Entry 的 meta 最小集合

- **Decision**:
  - `computed`：
    - `meta = { derive: (state: Readonly<S>) => A }`  
    - 不引入副作用（不得访问 Env/Service），纯函数，便于分析与测试。
  - `source`：
    - `meta = { resourceId: string; key: (state: Readonly<S>) => unknown }`  
    - resourceId 仅作为逻辑资源 ID，不嵌入 HTTP/DB 细节。
  - `link`：
    - `meta = { from: string }`（路径字符串）  
    - 首版只支持单向 link，不支持 map/双向；map 视为后续 spec。
- **Rationale**:
  - 保持 Entry.meta 尽可能轻量和可序列化，便于 Graph/Plan/Devtools 直接使用；  
  - 将副作用（source）与执行策略（middleware）推迟到 install + Service/Middleware 层处理。
- **Alternatives considered**:
  - 在 computed/link meta 中加入 map、条件、优先级等高级选项；  
    - 暂不纳入首版，避免 DSL 面过早复杂化；  
    - 后续可在 meta 中新增字段，并在 Plan/install 中调整行为。

### Decision 2.3 · 与 Trait 相关类型的命名规范

- **Decision**:
  - 所有代表 Trait 概念的核心类型名都显式带上 `Trait` 前缀/后缀，以便在代码阅读与 IDE 搜索中一眼识别其职责，例如：  
    - `StateTraitSpec` / `StateTraitEntry` / `StateTraitField` / `StateTraitFieldTrait` / `StateTraitResource`；  
    - 后续如引入 ActionTrait / FlowTrait 等，也沿用同一命名模式。  
  - 仅在 Module 图纸层保留无 Trait 前缀的简洁 API（例如 `traits: StateTrait.from(StateSchema)({...})`），internal 层尽量显式化。
- **Rationale**:
  - Trait 体系本身就是“为现有主体加能力标签”的元编程设施，命名中明确带上 `Trait` 有助于在引擎与业务代码之间划清边界；  
  - 方便未来在代码中快速按 `*Trait*` 聚合/检索相关实现，支撑长期演进与重构。
- **Alternatives considered**:
  - 采用更短的前缀（如 `ST*`）或不带前缀的通用名（如 `FieldSpec`）：  
    - 容易与非 Trait 概念混淆，且不利于跨 Trait 家族（State/Action/Flow）做统一认知；  
    - 因此明确选择在类型层面坚持 `Trait` 命名。 

### Decision 2.4 · StateFieldPath / StateAtPath 的类型推导

- **Decision**:
  - 引入辅助类型 `StateFieldPath<S>` 与 `StateAtPath<S, P>`，用于在 TS 层推导字段路径与对应字段类型：
    - `StateFieldPath<S>`：从 State 类型 `S` 推导出所有合法字段路径的联合类型，包括嵌套路径，例如：  
      - 对 `State = { profile: { id: string; name: string }; count: number }`，  
        `StateFieldPath<State> = "profile" | "profile.id" | "profile.name" | "count"`；  
    - `StateAtPath<S, P>`：给定 State 类型 `S` 与某个路径字面量 `P extends StateFieldPath<S>`，推导出该路径对应的字段类型，例如：  
      - `StateAtPath<State, "profile.name">` 推导为 `string`，`StateAtPath<State, "count">` 推导为 `number`。
  - `StateTraitSpec<S>` 形式为：
    ```ts
    type StateTraitSpec<S> = {
      [Path in StateFieldPath<S>]?: StateTraitEntry<S, Path>
    }
    ```
    这样在 `StateTrait.from(StateSchema)({ ... })` 字面量中书写 key 时，TS 会将 `"profile.name"` 等路径视为字面量类型并约束在 `StateFieldPath<S>` 内，写错路径（例如 `"profile.nam"`）会直接报类型错误。
  - `StateTraitEntry<S, P>` 中可以使用 `StateAtPath<S, P>` 约束 derive 函数与 link 的类型，例如：
    - `computed`：`derive: (state: Readonly<S>) => StateAtPath<S, P>`（或兼容更宽的返回类型）；  
    - `link`：`from` 字段同样受 `StateFieldPath<S>` 约束，源/目标字段类型通过 `StateAtPath` 校验是否兼容。
- **Rationale**:
  - 通过 StateFieldPath / StateAtPath，在类型层面同时保证：
    - 字段路径是“存在的路径”；  
    - 对应的字段类型在 computed / link 等场景下是可推导、可检查的；  
  - 让 `StateTrait.from(StateSchema)({...})` 成为 IDE 体验的核心入口：路径可补全、路径写错能报错、derive 函数参数和结果都有强类型约束。
- **Alternatives considered**:
  - 只用宽泛的 `string` 作为 key 类型，在运行时再做路径校验：  
    - 会失去 IDE 级别的自动补全与静态诊断，无法满足本特性中“通过图纸就能看清模块形状且类型安全”的目标；  
    - 因此明确选择在类型层投入必要的复杂度，使用 StateFieldPath / StateAtPath 这类辅助类型。

---

## 3. StateTraitGraph / Plan 与 Middleware/EffectOp 的接口

### Decision 3.1 · Graph 作为结构 IR，一等公民

- **Decision**:
  - Graph 是 StateTraitProgram 的一部分，类型为 `StateTraitGraph`，包含节点与边：  
    - 节点：State 字段 + 其挂载的 StateTraitFieldTrait；  
    - 边：依赖关系（computed/link/source → 依赖字段）。
  - Graph 是 Devtools / Studio 的主入口，对外文档应以 Graph 解释 Trait 结构。
- **Rationale**:
  - Graph 自然适合作拓扑可视化与 diff；  
  - 将 Graph 明确为 Program 的一部分，避免后续 Debug / Studio 再造自己的视图结构。

### Decision 3.2 · Plan 与 EffectOp 的关系（Trait install 接缝）

- **Decision**:
  - StateTraitPlan 主要用于 `StateTrait.install` 在 Bound API 上安装行为；  
  - Plan 中每个 `StateTraitPlanStep` 应具备构造 `EffectOp` 所需的最小上下文，例如：
    - `kind = "computed-update" | "link-propagate" | "source-refresh"`  
    - `sourceFieldPath/targetFieldPath` 或 `resourceId + keySelector`  
    - 可选溯源信息（GraphNode/Edge id）。
  - `StateTrait.install($, program)` 不直接跑副作用，而是：  
    - 从 Plan 构造 `EffectOp<A, E, R>`（`meta.kind = "state"` 或 `"service"`）；  
    - 将 `EffectOp` 交给 Middleware 总线（`composeMiddleware(...)(op)`）执行。
- **Rationale**:
  - 保证 Trait 层不依赖具体 Middleware 实现，只依赖 “有一条 EffectOp 总线”；  
  - 允许未来将 Plan 的某些部分完全下沉到 Middleware 配置，而不破坏 StateTrait API。
- **Alternatives considered**:
  - 在 Trait 层直接操作 Bound API，不经过 EffectOp；  
    - 这种做法会让 Trait 与 Middleware 形成两套独立的执行体系，不利于 Debug/可观测与策略统一；  
    - 因此统一要求 StateTrait.install 通过构造 EffectOp 交由总线执行。

---

## 4. StateTraitResource ↔ ResourceRegistry + Service Tag

### Decision 4.1 · resourceId 的语义与命名

- **Decision**:
  - StateTrait.source 中的 `resource` 字段在内部规范为 `resourceId: string`；  
  - resourceId 作为逻辑资源 ID，推荐采用 `"domain/name"` 或 `"domain/operation"` 形式，例如 `"user/profile"`, `"orders/list"`；  
  - resourceId 在整个应用内作为 ResourceRegistry 与 Devtools 的主 key。
- **Rationale**:
  - 统一命名有利于在 Devtools/平台中按资源纬度做视图和分析；  
  - 避免把 HTTP 路径或底层实现细节直接暴露为 resourceId。

### Decision 4.2 · ResourceRegistry + Service Tag 接线模型

- **Decision**:
  - Runtime 层通过 ResourceRegistry 将 `resourceId` 映射到某个 Service Tag 方法，例如：
    - `"user/profile" -> (key) => UserProfileService.fetch(key.userId)`；  
  - Service Tag 通过 Layer 提供实现，使同一 resourceId 可以在不同环境（mock/dev/prod）拥有不同实现；  
- 在 StateTraitPlan 中，source 型步骤只保留 resourceId 与 key 规则，`StateTrait.install` 根据 Plan 生成 `EffectOp(kind = "trait-source")` 并调用 ResourceRegistry。
- **Rationale**:
  - 保证 Module/Trait 只负责声明“要什么（resourceId + key）”，而不是“怎么拿”；  
  - 减少 DSL 与运行时实现的耦合，符合分形 Runtime + Tag/Layer 的设计。
- **Alternatives considered**:
  - ResourceRegistry 直接持有 `(key) => Effect` 的裸函数，不依赖 Service Tag；  
    - 这会弱化 Tag/Layer 在运行时的角色，与现有架构不一致；  
    - 最终选择以 Service Tag 作为资源能力的承载，让 ResourceRegistry 专注于路由。

### Decision 4.3 · key 函数的语义（类似 queryKey）

- **Decision**:
  - `StateTrait.source({ resource, key })` 中的 `key(state)` 是**资源标识 + 参数**的纯函数描述，语义类似“强类型的 queryKey”；  
  - 推荐返回结构化对象而不是裸数组/字符串，例如 `{ userId: s.profile.id }`，并在内部以只读、可比较的结构存储；  
  - StateTraitPlan 中保留的是 “如何从 State 计算 key” 的规则，`StateTrait.install` 在每次触发 source 时重新计算 key，并将其附带在 `EffectOp.meta` 或 payload 中；  
  - 集成查询引擎（例如 TanStack Query）时，可直接将该 key 作为 queryKey 使用，从而保证“State → key → 资源访问”链条可追踪、可复现。
- **Rationale**:
  - 把 key 提升为一等概念，能同时服务于：
    - 资源缓存 / 查询引擎（queryKey）；  
    - Debug / Devtools 中的资源依赖可视化；  
    - 日志和指标中的维度标签（例如 `resourceId + key` 组合）。
  - 要求 key 为纯函数输出，有利于做 replay 与时间旅行调试。
- **Alternatives considered**:
  - 让 key 返回任意值并在 Runtime 内部做序列化/哈希；  
    - 容易导致不同实现之间难以对齐，调试时 key 也不易阅读；  
    - 最终选择以“结构化对象 + 类型提示”为主心智。

### Decision 4.4 · Resource / Query 命名空间与 Tag 封装

- **Decision**:
  - 对外不直接暴露 ResourceRegistryTag / QueryClientTag（内部概念），而是通过命名空间封装：
    - `Resource.make({ id, keySchema, load })`：定义资源规格（ResourceSpec）；  
    - `Resource.layer([specA, specB, ...])`：返回 Layer，在内部注册到 ResourceRegistryTag；  
    - `Query.Engine.layer(engine)`：注册查询引擎实例（可由 `Query.TanStack.engine(queryClient)` 适配，也可自定义）；  
    - `Query.Engine.middleware(config)`：基于 `EffectOp(kind = "trait-source")` + `resourceId` + `keyHash` 决定哪些资源走查询引擎、如何做缓存/去重等策略。
  - Module/Trait 层只依赖 `resourceId + key` 的字面值与类型，完全不知道 Tag/Registry 的存在；  
  - Resource/Query 命名空间所在模块归属于 `@logix/core`，作为 Runtime 基础设施的一部分。
- **Rationale**:
  - 保持 Trait / Module 图纸层的 API 简洁、稳定，避免暴露内部 Tag/Registry 的实现细节；  
  - 让 Resource / Query 能够被 RuntimeProvider 在不同子树中灵活组合，同时不破坏 StateTrait 的“声明即事实源”属性；  
  - 通过 Middleware 统一对接查询引擎，使得是否使用 queryClient 成为 Runtime 配置，而非写死在 Trait 中。
- **Alternatives considered**:
  - 直接在 StateTrait.source 中加入 `driver: "query" | "direct"` 之类配置：  
    - 会把运行策略硬编码进 Trait Spec，削弱 RuntimeConfig/Middleware 的角色；  
    - 当前选择让驱动策略停留在 ResourceSpec/meta 与 `Query.Engine.middleware` 的组合里。

### Decision 4.5 · 资源作用域与 RuntimeProvider

- **Decision**:
  - ResourceSpec 的定义通常位于“应用 runtime 层”，但可以通过 RuntimeProvider 为某些路由/子树提供额外的 `Resource.layer([...])` 组合；  
  - 根 Runtime 只需要知道“全局必备资源”，而路由级别资源可以在对应子树的 RuntimeProvider 中追加注册，从而避免一个巨大且稀疏的全局 ResourceRegistry；  
  - Query 集成同样依赖 RuntimeProvider：在某个子树中装配 `Query.Engine.layer` + `Query.Engine.middleware`，就可以让该子树下的所有 source 以统一策略走 queryClient；移除该 Layer 即可恢复为直接调用 Service Tag 的模式。
- **Rationale**:
  - 贴合实际项目“路由/功能模块分区”的组织方式，避免所有外部调用都挤在单一根 Runtime 中；  
  - 让“是否使用 queryClient”成为 Runtime 范围（scope）的一部分，而不是 resourceId 自身的属性；  
  - 保证类型安全：不论是否启用 Query，中间链路始终以 `resourceId + key` 为主事实源。
- **Alternatives considered**:
  - 要求所有 ResourceSpec 在根 Runtime 一次性注册；  
    - 不利于大型应用的模块化与延迟加载，也难以在 Devtools 中按子系统过滤资源；  
    - 最终选择 RuntimeProvider 逐层叠加 Resource/Query Layer 的方式。

### Decision 4.6 · resourceId 冲突与重复检测

- **Decision**:
  - StateTrait 层不对 `resourceId` 做唯一性约束：同一逻辑资源（例如 `"user/profile"`）可以被多个模块、多个字段复用，这些引用在 StateTraitProgram / StateTraitGraph 中被视为“共享同一资源类型”的依赖；  
  - Resource 层负责在**单个 RuntimeProvider 作用域内**维护 resourceId 的一致性：
    - `Resource.layer([...])` 在 dev 模式下应检测重复 id：如果同一 `id` 对应的 `keySchema` 或 `load` 签名不一致，应当报错或至少发出强警告，避免无声覆盖；  
    - 允许在不同 RuntimeProvider 层级为同一 `id` 提供不同实现（例如 mock/dev/prod），但在同一作用域内只应存在一个规范的定义；
  - Devtools 可以基于 resourceId + Runtime scope 信息，展示“某个资源 id 在当前作用域由哪个 ResourceSpec 提供”以及“有哪些模块依赖该资源”。
- **Rationale**:
  - 将唯一性与冲突检测放在 Resource/Runtime 层，而不是 Trait 层，既允许不同模块共享资源定义，又能避免在同一作用域内出现难以察觉的实现冲突；  
  - TraitProgram 仍然可以把 `resourceId + key` 作为纯事实源输入，Middleware/Resource 层负责保证“同名资源”的语义一致性。
- **Alternatives considered**:
  - 在 StateTrait.build 阶段全局收集并检查 resourceId 唯一性：  
    - 不利于按 Runtime scope 做差异配置，也会把实现策略硬编码进 Trait 引擎；  
    - 当前选择让 Resource / RuntimeProvider 负责局部范围的冲突检测。

---

## 5. link 的语义与边界

### Decision 5.1 · 单向 link，源字段优先

- **Decision**:
  - 首版 link 仅支持单向同步：`link({ from })` 表示“目标字段由源字段驱动”；  
  - 源字段具有更高优先级：当 link 触发时，将源字段值覆盖写入目标字段；  
  - 目标字段的手动更新视为暂时状态，下一次 link 同步可能被覆盖。
- **Rationale**:
  - 单向、源字段优先的语义简单清晰，有利于静态分析与调试；  
  - 避免在首版引入“半隐式双向绑定”的复杂行为（易产生难以理解的状态抖动）。
- **Alternatives considered**:
  - 支持双向 link 或复杂的 merge 逻辑；  
    - 因易引入循环与隐式覆盖，目前限定为未来 spec 的议题，在本轮明确“不支持/不鼓励”。

### Decision 5.2 · 循环检测与错误表达

- **Decision**:
  - StateTrait.build 必须在构建 StateTraitGraph 时检测 link 组成的依赖环；  
  - 默认策略：检测到环则 build 失败，并在错误中给出相关字段路径列表，便于 Devtools 高亮；  
  - 若未来需要支持某种受控环路，另起 spec 设计显式语义。
- **Rationale**:
  - 避免在 Runtime 出现难以排查的无限联动；  
  - 将 link 的非法组合尽早暴露在编译/构建阶段。

### Decision 5.3 · Graph / Plan 中的 link 表达

- **Decision**:
  - 在 StateTraitGraph 中，link 表达为一条从源字段到目标字段的边（`kind = "link"` 或等价）；  
  - 在 StateTraitPlan 中，link 表达为 `kind = "link-propagate"` 的步骤，包含源/目标路径（或字段 id），`StateTrait.install` 基于此安装 watcher 与状态更新逻辑。
- **Rationale**:
  - Graph 上的 link 边便于 Devtools 做能力拓扑可视化；  
  - Plan 中的 link 步骤则为 `install` 提供了执行层面的最小信息，不需要查 Spec/Graph 两次。

---

## 6. Open Questions / Deferred Topics

> 以下议题在 Phase 0 中暂不决策，留待后续 spec 或实现验证时再展开。

- **OQ-1**: 是否需要在 StateTrait API 层对外暴露统一的 Trait 抽象（例如 `Trait.System` / `RuntimeTraitEngine`），供 ActionTrait / FlowTrait 等复用？  
  - 当前倾向：先让 StateTrait 独立跑通，抽象保留在 internal，等第二个 Trait 家族出现时再看是否值得对外稳定此抽象。

- **OQ-2**: StateTraitPlan 与 Middleware 配置的边界  
  - 当前假设：StateTraitPlan 主要描述“watch/更新”的结构，具体运行策略（节流/批处理等）通过 Middleware 配置实现；  
  - 后续是否需要在 Plan 中显式编码某些策略（例如 computed 批量更新）仍需实践验证。

- **OQ-3**: link 的 map/条件/优先级等高级能力  
  - 当前决定不在首版 DSL 中支持；  
  - 未来可以将其设计为 StateTraitEntry.meta 的扩展，并让 Plan/install 在保证可读性的前提下支持这些规则。 

---

## 7. Query 语法糖（后续阶段草案）

> 对应 spec 中的 User Story 8（P4），仅作为未来演进方向记录；本轮实现可以完全不落地。

### 7.1 设计目标与边界

- **目标**：
  - 在 StateTrait.source + Resource / Query + Middleware 主线稳定之后，为常见的远程资源场景提供一批轻量的语法糖（helpers），降低样板代码数量、增强可读性；  
  - 典型形式包括：`Query.source` / `Query.cachedSource` / `Query.sourceByPath` 等。
- **边界约束**：
  - 所有语法糖都必须在类型和 IR 上等价于某种 `StateTrait.source` 调用，即：
    - 不引入新的 Trait kind；  
    - 不改变 StateTraitProgram / StateTraitGraph 的结构；  
    - 不要求 StateTrait 引擎理解任何 Query 专有字段。
  - 所有与缓存 / 重试 / 失效策略 / queryClient 相关的行为，必须通过 `Query.Engine.layer` / `Query.Engine.middleware` 在 EffectOp 层实现，而不是写入 StateTrait.meta。

### 7.2 最小语法糖形态（示例）

- **Query.source 作为别名糖**：

  ```ts
  // Query.namespace 内部
  export const Query = {
    source: <S extends object, P extends StateTrait.StateFieldPath<S>>(options: {
      resource: string
      deps: ReadonlyArray<StateTrait.StateFieldPath<S>>
      key: (state: Readonly<S>) => unknown
    }) => StateTrait.source<S, P>(options),
  }
  ```

  - Module 侧可以写：

    ```ts
    profileResource: Query.source({
      resource: "user/profile",
      deps: ["profile.id"],
      key: (s) => ({ userId: s.profile.id }),
    })
    ```

  - 对 StateTraitProgram 而言，这与直接写 `StateTrait.source` 完全等价。

- **更高阶语法糖的约束**：
  - 类似 `Query.cachedSource`、`Query.sourceByPath` 等更高阶 helper，可以在内部完成：
    - key 推导（例如根据路径计算 key 函数）；  
    - 给 `Query.Engine.middleware` 填充额外的配置（例如在 ResourceSpec 或 QueryConfig 中登记 cacheGroup）；  
  - 但这些配置必须通过 ResourceSpec / QueryConfig / Middleware 传入，不允许直接修改 StateTraitEntry 的核心 meta 结构。

### 7.3 与 Middleware 的协同

- Middleware 仍是行为的唯一落点：
  - 对于由 Query 语法糖声明的 source 字段，最终在 Runtime 中观察到的，应是 `EffectOp(kind = "trait-source", meta.resourceId, meta.keyHash)`；  
  - `Query.Engine.middleware` 可以基于 resourceId + key + 自己的配置，决定是否走 queryClient、如何缓存/重试；  
  - DebugTraitObserver / Devtools 也只依赖 EffectOp + StateTraitGraph，无需理解语法糖的存在。

- 语法糖的**可撤销性**：
  - 即使完全移除 Query 相关 Layer/Middleware，使用 Query 语法糖定义的模块仍然必须作为“单纯的 StateTrait.source 模块”正常工作；  
  - 这条约束保证了 Trait 稳定性与 Query 集成的“可插拔”特性。
