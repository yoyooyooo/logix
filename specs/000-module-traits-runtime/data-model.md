# Data Model: StateTrait / StateTraitProgram / Resource / Query

> 作用：本文件从“概念实体 + 关系”的角度，把本特性引入的核心数据结构梳理清楚，作为 `@logix/core` 内部实现与 Devtools / 平台对接的共享蓝图。  
> 优先面向：`@logix/core` 实现者、Runtime 维护者、Devtools / Studio 维护者。

> 相关 reference：
> - StateTrait Core API 与 Program/Graph/Plan 入口：`references/state-trait-core.md`  
> - EffectOp 总线与 Middleware 集成：`references/effectop-and-middleware.md`  
> - Resource / Query 命名空间与 StateTrait.source：`references/resource-and-query.md`  
> - Devtools / Debug 在 Graph + EffectOp 上的视图：`references/devtools-and-debug.md`  
> - Parser / Studio 如何消费 Module 图纸与 StateTraitProgram：`references/parser-and-studio.md`

---

## 1. 总览：从图纸到 Program

从 Module 图纸到运行时的主链路可以抽象为：

```text
Module 图纸
  state: StateSchema
  actions: ActionsSchema
  traits: StateTraitSpec<State>
       │
       ▼
StateTrait.build
       │
       ▼
StateTraitProgram<State>
  - stateSchema
  - spec: StateTraitSpec<State>
  - graph: StateTraitGraph
  - plan: StateTraitPlan
       │
       ▼
StateTrait.install($, program)
       │
       ▼
EffectOp + Middleware + Resource / Query
```

本文件围绕以下几个核心实体展开：

- `StateFieldPath<S>` / `StateAtPath<S, P>`：字段路径与字段类型的类型级工具；
- `StateTraitSpec<S>` / `StateTraitEntry<S, P>`：模块图纸中的字段能力声明；
- `StateTraitField` / `StateTraitFieldTrait` / `StateTraitResource`：字段与 Trait 的结构化描述；
- `StateTraitGraph`：字段能力与依赖关系的图结构 IR；
- `StateTraitPlan` / `StateTraitPlanStep`：供 Runtime / Middleware 使用的执行计划；
- `StateTraitProgram<S>`：StateTrait 引擎的 Program 输出；
- `ResourceSpec`（概念）与 Resource / Query 命名空间的挂载信息。

---

## 2. 字段路径与字段类型：StateFieldPath / StateAtPath

### 2.1 StateFieldPath<S>

**角色**：在类型层反映 State 上所有可被 Trait 标注的字段路径。

概念定义：

- 对任意 State 类型 `S`，`StateFieldPath<S>` 是一个**字符串字面量联合类型**，枚举所有可访问字段路径；
- 嵌套对象通过 `"parent.child"` 的形式展开，嵌套多层则 `"a.b.c"` 依次展开；
- 对于数组字段，`StateFieldPath<S>` 必须把“数组本身”与“数组元素”都纳入可标注/可依赖的路径模型：  
  - 到数组本身的路径（如 `"items"`、`"sections.items"`），用于在 DSL 层挂载 `StateTrait.list(...)`；  
  - 到元素/子字段的路径（如 `"items[].amount"`、`"sections[].items[].name"`），用于 perItem/perList 内部的依赖推导与 Devtools 展示。  
  约定 `[]` 段仅表示“任意 index 的元素”，元素身份在语义上仍按 index 理解（与 RHF/004 spec 对齐）。  
  其它复杂结构（Map/Set 等）在本轮仍可先整体视为叶子字段，后续如有领域需求再扩展。

示例：

```ts
type State = {
  profile: {
    id: string
    name: string
  }
  count: number
}

// 概念上：
type StateFieldPath<State> =
  | "profile"
  | "profile.id"
  | "profile.name"
  | "count"
```

### 2.2 StateAtPath<S, P>

**角色**：给定 State 类型 `S` 与路径 `P extends StateFieldPath<S>`，推导该路径对应的字段类型。

示例：

- `StateAtPath<State, "profile">` → `{ id: string; name: string }`  
- `StateAtPath<State, "profile.name">` → `string`  
- `StateAtPath<State, "count">` → `number`

用途：

- 为 `StateTraitEntry<S, P>` 提供字段类型信息；
- 约束 `StateTrait.computed` 的 `derive` 函数返回值类型；
- 约束 `StateTrait.link` 的源/目标字段类型是否兼容；
- 为 Devtools / Graph 提供字段类型展示与校验信息。

---

## 3. 字段能力 Spec：StateTraitSpec / StateTraitEntry

### 3.1 StateTraitSpec<S>

**角色**：Module 图纸中 `traits` 槽位的标准形态，是从字段路径到 TraitEntry 的映射。

概念定义：

```ts
type StateTraitSpec<S> = {
  [Path in StateFieldPath<S>]?: StateTraitEntry<S, Path>
}
```

特点：

- key 受 `StateFieldPath<S>` 约束：写错路径在类型层直接报错；
- 值为该路径对应的 TraitEntry，描述该字段具有什么能力（computed / source / link）。

### 3.2 StateTraitEntry<S, P>

**角色**：描述某个字段路径上的具体 Trait 配置。

核心字段：

- `fieldPath: string`  
  - 与 `P` 一致的运行时路径表示，例如 `"profile.name"`；
- `kind: "computed" | "source" | "link"`  
  - 字段能力类型；
- `meta: StateTraitEntryMeta<S, P>`  
  - 按 kind 分派的配置对象。

`meta` 拆分：

- `kind = "computed"`：

  ```ts
  type ComputedMeta<S, P> = {
    derive: (state: Readonly<S>) => unknown // 实现层可以收紧为 StateAtPath<S, P>
  }
  ```

- `kind = "source"`：

  ```ts
  type SourceMeta<S, P> = {
    resourceId: string // 内部对应 StateTrait.source 的 resource
    key: (state: Readonly<S>) => unknown
  }
  ```

- `kind = "link"`：

  ```ts
  type LinkMeta<S, P> = {
    from: string // 源字段路径，同样受 StateFieldPath<S> 约束
  }
  ```

---

## 4. 字段与 Trait 的结构模型

从 Program 与 Graph 的角度看，每个 State 字段会被投影到统一的结构实体上。

### 4.1 StateTraitField

**角色**：代表模块 State 中的一个字段节点（不论是否挂 Trait）。

核心字段：

- `id: string`  
  - 字段在本模块中的唯一标识，例如 `"profile.name"`；
- `path: string`  
  - 等同于 `id` 或按段存储（如 `["profile", "name"]`），用于运行时访问；
- `displayName?: string`  
  - 人类可读名称，用于 Devtools 展示；
- `valueType?: string`  
  - 字段类型的字符串化描述（例如 `"string" | "number" | "Profile"`），来源于 Schema；
- `traits: ReadonlyArray<StateTraitFieldTrait>`  
  - 挂在该字段上的 Trait 列表（通常 0..1）。

### 4.2 StateTraitFieldTrait

**角色**：字段上的某一项 Trait（computed / source / link）。

核心字段：

- `fieldId: string`  
  - 对应 `StateTraitField.id`；
- `kind: "computed" | "source" | "link"`；
- `meta: { ... }`  
  - 与 StateTraitEntry.meta 一致，但已经经过 build 阶段规范化，适合 Graph / Plan 使用；
- `deps: ReadonlyArray<string>`  
  - 该 Trait 所依赖的字段路径列表，例如：
    - computed：依赖的字段路径集合；
    - source：依赖 key 所需字段，例如 `"profile.id"`；
    - link：源字段路径（`from`）。

### 4.3 StateTraitResource

**角色**：描述 source 型 Trait 所依赖的逻辑资源信息。

核心字段：

- `resourceId: string`  
  - 逻辑资源 ID，例如 `"user/profile"`；
- `keySelector: string`  
  - “如何从 State 计算 key”的标识，可以是字段路径集合或一个可读字符串形式；
- `keyExample?: unknown`  
  - 可选的 sample，用于 Devtools 展示；
- `ownerFields: ReadonlyArray<string>`  
  - 哪些字段的 Trait 引用了该 resource（反向索引）。

备注：

- 在实现中，ResourceSpec 的更丰富信息（key Schema、load 函数等）由 Resource 命名空间维护，StateTraitResource 只存放 Trait 视角所需的“依赖信息”。

---

## 5. Graph：StateTraitGraph / Node / Edge

### 5.1 StateTraitGraphNode

**角色**：Graph 中的节点，通常对应一个 State 字段。

核心字段：

- `id: string`  
  - 节点 ID，通常与 `StateTraitField.id` 一致；
- `field: StateTraitField`  
  - 字段基础信息；
- `traits: ReadonlyArray<StateTraitFieldTrait>`  
  - 该字段上的 Trait 列表；
- `meta?: Record<string, unknown>`  
  - Devtools / Debug 用的附加信息，如最近更新时间、示例值等（非 StateTrait 核心范畴，可选）。

### 5.2 StateTraitGraphEdge

**角色**：Graph 中的边，表示字段间的依赖关系或资源依赖。

核心字段：

- `id: string`  
  - 边 ID；
- `from: string`  
- `to: string`  
  - 源/目标节点 ID（字段路径）；
- `kind: "computed" | "link" | "source-dep"`  
  - 边的语义类型：
    - `"computed"`：表示某字段的值依赖另一个字段；
    - `"link"`：表示 link 同步方向（从源字段到目标字段）；
    - `"source-dep"`：表示 source 的 key 依赖某字段。

### 5.3 StateTraitGraph

**角色**：整张 Graph 的集合视图。

核心字段：

- `nodes: ReadonlyArray<StateTraitGraphNode>`  
- `edges: ReadonlyArray<StateTraitGraphEdge>`  
- `meta?: { moduleId?: string; version?: string; }`  
  - 图的元信息，便于 Devtools 与 Runtime 关联。

用途：

- Devtools 画拓扑图、做结构 diff；
- Runtime 做静态检查（例如 link 循环检测）。

---

## 6. Plan：StateTraitPlan / StateTraitPlanStep

### 6.1 StateTraitPlanStep

**角色**：供 `StateTrait.install` 和 Middleware 使用的一条最小执行指令。

核心字段：

- `id: string`  
  - 步骤 ID；
- `kind: "computed-update" | "link-propagate" | "source-refresh"`；
- `targetFieldPath?: string`  
  - 本步骤要更新/触发的目标字段路径；
- `sourceFieldPaths?: ReadonlyArray<string>`  
  - 触发本步骤的源字段路径集合；
- `resourceId?: string`  
  - 当 kind 为 `"source-refresh"` 时的 resourceId；
- `keySelectorId?: string`  
  - 标识 key 计算规则（与 StateTraitResource 中的 keySelector 对应）；
- `debugInfo?: { graphNodeId?: string; graphEdgeId?: string }`  
  - 与 Graph 节点/边的关联信息，便于 Debug/Devtools 对应结构与事件。

### 6.2 StateTraitPlan

**角色**：汇总某模块所有 Trait 行为的运行计划。

核心字段：

- `moduleId?: string`  
  - 可选，用于跨模块识别；
- `steps: ReadonlyArray<StateTraitPlanStep>`；
- `meta?: Record<string, unknown>`  
  - 扩展字段，供 Middleware 或 Runtime 使用。

用途：

- 在 `StateTrait.install($, program)` 中，根据 Plan 生成 watcher / Flow / EffectOp 调用；
- 在 Middleware 层，作为策略配置的输入（例如按 kind / resourceId / fieldPath 做分组处理）。

> v001 约束：`"source-refresh"` 步骤本身只描述“一次刷新该字段”所需的信息（resourceId、keySelector 等），实际执行时机由 Bound API / Runtime 提供的显式入口（如 `$.traits.source.refresh(field)`）控制，不在 Plan 中编码 onMount / onKeyChange 等隐式触发策略。

---

## 7. Program：StateTraitProgram<S>

### 7.1 StateTraitProgram<S>

**角色**：StateTrait 引擎从「State Schema + StateTraitSpec」中 build 出来的 Program，是 Runtime 与 Devtools 的统一入口。

核心字段：

- `stateSchema: unknown`  
  - 对应 Module 图纸中的 State Schema（概念上是 `Schema.Schema<S, any>`）；
- `spec: StateTraitSpec<S>`  
  - 原始 Trait Spec，便于回溯与 diff；
- `graph: StateTraitGraph`  
  - 字段能力与依赖结构的 Graph 视图；
- `plan: StateTraitPlan`  
  - Runtime / Middleware 使用的执行计划；
- `meta?: { moduleId?: string; version?: string }`  
  - Program 元信息。

关系：

- Runtime 在初始化 ModuleRuntime 时调用 `StateTrait.install($, program)`，消费 Program；
- Devtools / Studio 通过约定接口获取 Program，用于渲染 Graph 与调试信息；
- Debug / Observer 中间件可以在 EffectOp 流中附带 Program / Graph 中的元信息，增强诊断能力。

---

## 8. ResourceSpec 与 Resource / Query 命名空间（概念对齐）

> 详尽行为在 Resource / Query 实现文档中描述，这里只从 StateTrait 视角标记关键字段与关系。

### 8.1 ResourceSpec（概念）

**角色**：由 Resource 命名空间定义的逻辑资源规格，用于在 Runtime 中注册外部资源访问能力。

典型字段：

- `id: string`  
  - 逻辑资源 ID（与 StateTraitResource.resourceId 对齐）；
- `keySchema: unknown`  
  - 用于描述 key 的 Schema（服务查询引擎与 Devtools）；
- `load: (key: any) => Effect<any, any, any>`  
  - 资源访问实现（通常基于 Service Tag 与 Layer 提供）；
- `meta?: Record<string, unknown>`  
  - 例如 cacheGroup、重试策略 hint 等。

### 8.2 Resource / Query 与 StateTrait 的关系

- StateTraitProgram 只关心：
  - `resourceId`（字符串）；
  - “如何从 State 计算 key”的规则（keySelector）；
- Resource 命名空间负责在 RuntimeProvider 范围内将 `resourceId` 映射到 ResourceSpec，并在 dev 模式下检测 id 冲突；
- Query 命名空间（及其中间件）负责基于 `EffectOp(kind = "service") + resourceId + key` 决定是否通过 queryClient 等机制执行。

在数据模型层面，这意味着：

- StateTraitProgram 和 StateTraitGraph 不直接引用 ResourceSpec 类型，只存放 resourceId 与 Trait 侧需要的依赖信息；
- Resource / Query 相关的 Layer 与 Middleware 可以根据 `resourceId + key` 将 Runtime 行为映射到具体 ResourceSpec 上；
- Devtools 可以通过「StateTraitGraph + ResourceSpecRegistry」组合视图呈现“模块依赖了哪些资源，这些资源由哪些实现提供”。

---

## 9. 小结

本数据模型确保：

- Module 图纸中的 `state + traits` 可以被稳定地编译为 StateTraitProgram（含 Graph 与 Plan）；
- Runtime 与 Middleware 只依赖 Program / Plan，不需要回到 Module 定义解析字符串路径；
- Devtools 与 Debug 可以以 Graph 与 EffectOp 为事实源，构建统一的结构视图与时间线视图；
- Resource / Query 集成在数据模型层面只通过 `resourceId + key` 与 StateTraitProgram 相连，保持 Trait 协议的纯度。

后续在实现 `@logix/core` 的 StateTrait 内核时，应以本文件为数据/结构层的 SSoT，如需调整字段或实体关系，请先更新本文件与 `spec.md` / `research.md` 中对应描述。
