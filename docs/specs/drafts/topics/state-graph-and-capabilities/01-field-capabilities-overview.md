---
title: Field Capabilities & State Graph · Overview
status: draft
version: 0.1.0
value: core
priority: next
related:
  - ../../runtime-logix/core/03-logic-and-flow.md
  - ../../runtime-logix/core/08-usage-guidelines.md
  - ../reactive-and-linkage/01-reactive-paradigm.md
  - ../query-integration/06-unified-data-vision.md
  - ../capability-plugin-system/01-capability-plugin-blueprint.md
---

# Field Capabilities & State Graph · Overview

> 统一视角：字段不仅有「形状 (Shape)」，还应有「来源 (Source)」与「关系 (Relation)」。  
> Field Capabilities = 在 Schema 上声明这些来源/关系，由 Runtime 在 `Module.live` 阶段编译为 Logic / Flow。

## 1. 三类字段能力 (Field Capabilities)

在 v3 的 State Graph 心智下，一个字段可以归入三类之一：

1. **Computed（内部计算）**
   - 定义：字段值是当前 Module 其他字段的纯函数。
   - 典型 API 草图：
     - Schema：`Computed.field({ deps: (s) => [...], derive: (...) => A })`
     - Helper：`Reactive.computed($, { target, deps, derive })`
   - 运行时语义：
     - 只允许同步纯函数（或等价的 `Effect.sync`），不发起 I/O；
     - 在一次 dispatch / 逻辑流的「稳定结束点」上，必须满足 `computed === derive(deps)`；
     - 实现侧可通过「primary reducer → Computed Phase → 其他 watcher」的顺序保证对外快照的一致性。

2. **Source（外部数据源）**
   - 定义：字段值来自 Module 外部的某个 Resource（HTTP/DB、Socket、Storage、Env、AI 等）。
   - 典型 API 草图：
     - Schema：`Query.field(...) / Socket.field(...) / Storage.field(...) / ResourceField.field(...)`
   - 运行时语义：
     - ModuleRuntime 只持有 JSON State，真实的 Fetch/订阅由 Resource 能力在 `Module.live` 时注册为 Flow；
     - Source 字段天然是异步/可能失败的，需要与 Error/Loading 等状态搭配建模。

3. **Link（跨 Module 关联）**
   - 定义：字段值由其他 Module 的 State 推导而来，类似于「Join / Resolver」。
   - 典型 API 草图：
     - Schema：`Link.to(OtherModule, { key, resolve })`
     - Logic：内部通过 `$Other.changes(...)` + `$.state.mutate` 实现。
   - 运行时语义：
     - Link 不直接跨模块写 State，而是通过订阅 +本 Module 内部更新来保持一致性；
     - 在 Data Graph 视角下，Link 是边 (Edge)，Computed/Source 是节点上的本地规则。

## 2. Capability Plugin 协议（元数据与 Factory）

上述三类能力通过统一的 Capability 插件协议接入 Schema 与 Runtime：

- Schema 侧：
  - 字段通过 `Schema.annotations({ [CapabilityMeta]: { kind, priority, factory } })` 携带能力元数据；
  - 例如 `Computed.field` / `Query.field` / `Link.to` 都只是对这一注解协议的不同封装。
- Runtime 侧：
  - `Module.live` 在构造 ModuleRuntime 时，扫描 Schema 上的 `CapabilityMeta`；
  - 按 `priority`（以及 Phase）顺序调用 `factory($, fieldName, config)`，在 Logic 层挂载对应的 Flow / Link；
  - 由此形成「Schema Blueprint → Logic Program」的编译过程。

这使得：

- runtime-logix/core 专注定义 `$` / Flow / ModuleRuntime 等底层原语；
- 各种字段能力可以作为插件按需扩展，而不污染核心 API；
- DevTools / Intent IR 只需要理解 CapabilityMeta + Logic Graph，就可以还原出 State Graph。

## 3. 与现有规范的映射关系

为了避免重复设计，本节给出现有规范/草稿之间的对应关系：

- `docs/specs/runtime-logix/core/03-logic-and-flow.md`
  - 已经定义了 `$.onState(selector).update/mutate(...)` 作为「监听某个 State 视图并维护派生字段」的 L1 标准模式；
  - 在本模型下，可视为未显式命名的 Computed 能力（直接以 Fluent DSL 方式书写）。
- `docs/specs/runtime-logix/core/08-usage-guidelines.md`
  - 表格中 L1/L2 联动的推荐原语（`$.onState`、`$.onAction`、`$.use + $Other.changes`）分别对应：
    - L1 State→State：Computed；
    - L2 Cross-Module：Link；
    - L2/L3 外部服务调用：Source + 过程型 Flow。
- `docs/specs/drafts/topics/reactive-and-linkage/01-reactive-paradigm.md`
  - 给出了 `Reactive.computed($, ...)` / Reactive Schema 的 Helper 与 Schema 形态；
  - 可以直接视为 Computed 能力的 Layer 2/Layer 1 草案。
- `docs/specs/drafts/topics/query-integration/06-unified-data-vision.md`
  - 提出了 `Computed.field / Query.field / Link.to` 等 API 草图，并以 Data Graph 视角统一这三类字段；
  - 是 State Graph 心智的主要来源。
- `docs/specs/drafts/topics/reactive-and-linkage/03-unified-resource-field.md`
  - 将 Query/Socket/Storage/AI 等 Source 字段收敛为更抽象的 `ResourceField`；
  - 在本模型下，可以视为「Source 系 Field Capabilities」的统一壳。
- `docs/specs/drafts/topics/capability-plugin-system/01-capability-plugin-blueprint.md`
  - 定义 `CapabilityMeta` 符号与 `factory($, fieldName)` 约定，是三类字段能力插件的共同基础。

## 4. Schema-First API 形态与类型权衡

在「Schema 先定义，再挂 Field Capabilities」的场景下，TypeScript 的推导能力会直接影响 API 形态。这里记录一组推荐心智，而不强求“完美”：

1. **Logic-First：类型最强，但不走 Schema 元信息**
   - 只在 Logic 中使用 Helper：`Reactive.computed($, { target, deps, derive })` / `Query.query($, cfg)` / `Link.helper($, cfg)`；
   - `deps` 与 `derive` 的类型从 `BoundApi<S, R>` 推导，完全绑定在 `StateOf<S>` 上，类型安全由 Helper 层兜底；
   - 不依赖 Schema 注解，但 DevTools / State Graph 只能从 Logic 解析信息。

2. **Schema-First（强类型版本）：接受少量显式类型**
   - 通过「两步 Schema」模式：先定义 Struct，再基于完整 State 类型挂能力：
     - 形态 A（在调用处显式给 State 泛型）：
       - `UserState.pipe(Computed.for<Schema.Schema.Type<typeof UserState>>({ ... }))`；
     - 形态 B（先吃 schema，再吃 config）：
       - `Computed.for(UserState, { fullName: { deps, derive } })` 或 `UserState.pipe(schema => Computed.for(schema, {...}))`；
   - 这类 API 中，能力 Helper 可以在内部通过 `Schema.Schema.Type<S>` 拿到完整 State 类型，对 `deps/derive` 做严格约束。

3. **Schema-First（一步到位版本）：优雅但类型上“略放松”**
   - 最符合直觉的写法是：
     - `const UserStateWithComputed = UserState.pipe(Computed.for({ fullName: { deps: (s) => [...], derive: ... } }))`；
   - 由于 `Computed.for({ ... })` 调用时尚未见到 `UserState`，TS 无法自动将 `s` 推导为 `Schema.Type<typeof UserState>`；
   - 在不引入显式泛型的前提下，可以接受：
     - Schema 侧的校验稍弱（更多视为「蓝图 + 配置」），
     - 真正的强类型约束留给 Logic/Helper 层的 `Reactive.computed($, ...)` / `Query.query($, ...)` 来完成。
   - 本文档视这一写法为「体验优先」的折中：允许在 Schema-first 路径下使用，但在需要极致类型安全时，推荐回到前两种模式。

## 5. 渐进式落地路线（提纲）

建议的实现与规范演进顺序：

1. **统一术语与映射**
   - 在 runtime-logix/core 中补充一个「Field Capabilities」小节，用 `Computed / Source / Link` 为现有 L1/L2 行为正名；
   - 在各 Topic 文档的 frontmatter / 说明中指明它们在本模型中的角色（已通过 `related` 字段初步标注）。
2. **以 Computed 为首个正式插件**
   - 实现最小可用版 `Computed.field` + `Reactive.computed`，仅支持同步纯函数；
   - 在 Runtime 中引入「Computed Phase」概念，并明确其与 primary reducer / 其他 watcher 的执行顺序。
3. **收敛 Source & Link**
   - 将现有 `Query.field` / `Link.to` 等能力迁移到统一的 CapabilityMeta 协议下（可先以 alias 形式兼容旧写法）；
   - ResourceField 草案可以作为 Source 系的一致抽象层，用于 Query/Socket/AI 等能力的统一配置。
4. **工具链与 IR 对齐**
   - 在 Intent IR 与 DevTools 侧，将 Field Capabilities 纳入 State Graph 视图：每个字段都带有 `kind: Raw | Computed | Source | Link` 等元信息；
   - 代码生成/对比工具以此为输入，避免再对各插件做分散适配。

本文件仅作为总览与 Mapping，后续的细节（执行阶段划分、错误语义、与 React/Query 具体集成等）建议在各子 Topic 内分章节展开，并在需要时提升到 runtime-logix/core 规范中。

## 6. `@logix/data` 作为 Field Capabilities 宿主（早期草案 / 已被 StateTrait 替代）

> 说明：本节描述的是早期「由独立包 `@logix/data` 承载字段能力」的设想。  
> 当前主线已经由 `specs/001-module-traits-runtime` 收敛到：字段能力与 State Graph 由 `@logix/core` 内部的 StateTrait 模块统一承载。  
> 因此，本节内容仅作为历史设计参考；新的实现与文档应以 StateTrait 为准。

从包结构视角，推荐以一个统一的数据/响应式核心包承载三类字段能力：

- **包定位**
  - 包名：`@logix/data`（暂定）。
  - 角色：State Graph / Field Capabilities 的实现宿主，向外暴露 `Computed / Source / Link` 三个命名空间，以及对应的 Schema 工厂与用于 Runtime 编排的 Field/Capability/StateGraph 数据模型。
  - 关系：
    - runtime-logix/core：定义 `$` / Flow / ModuleRuntime 等内核原语；
    - `@logix/data`：基于这些原语实现字段能力插件；
    - 上层场景包（`@logix/form`、`@logix/query`、`@logix/router`、`@logix/ai-native-core` 等）在内部复用 Field Capabilities，而不重复造一套。

- **对外 API（草图）**
  - 概念命名空间：
    - `import { Computed, Source, Link } from "@logix/data"`
    - Schema 侧：
      - `Computed.for(...)` / `Source.field(...)` / `Link.to(...)`
    - Logic 侧（可选别名）：
      - `Computed.helper($, ...)` / `Source.helper.*($, ...)` / `Link.helper.to($, ...)`（由 runtime-logix 或上层场景包基于 @logix/data 暴露）
  - 实现命名空间（内部）：
    - 允许在包内使用单一实现命名空间（例如 `Reactive`）承载所有 Helper 实现，再通过 `Computed/Source/Link` 进行语义化 re-export。

- **演进约束**
  - `@logix/data` 不直接依赖 React/Router 等上层框架，仅依赖 runtime-logix/core 与 effect；
  - Field Capabilities 的语义（Computed/Source/Link）以本文件为 SSoT，包内的实现命名空间与具体组织方式可以演进，但对外概念命名空间应保持稳定；
  - 其他场景包若需要扩展字段能力，应优先通过扩展 `Source`/`Link` 族能力，而不是引入新的平行概念名词。
