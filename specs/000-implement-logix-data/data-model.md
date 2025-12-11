# Data Model · `@logix/data` 字段能力核心包（隶属已归档 spec，仅供参考）

> 提示：本文件隶属于已归档的 `specs/001-implement-logix-data` 特性，当前主线已由 `specs/001-module-traits-runtime` 收敛到 `@logix/core` 内部的 StateTrait 数据模型。此处内容只作为历史 IR 草图参考。

本文件从数据/结构角度描述 `@logix/data` 需要支持的核心实体、字段与关系，作为后续契约与实现的参考。所有描述保持技术栈无关，不依赖具体 TypeScript/Effect 细节。

---

## 1. 概览

`@logix/data` 的职责是为 Logix 模块中的“字段”提供统一的能力建模与状态图视图。核心数据模型可以粗分为三层：

1. **字段层（Field & FieldCapability）**：描述单个字段的基本信息与能力（Raw / Computed / Source / Link）。  
2. **模块层（Module & StateSchema）**：描述模块内所有字段及其层级结构（含嵌套对象与列表）。  
3. **图层（StateGraph）**：将字段与能力投影为图结构，供 DevTools 与平台消费。

---

## 2. 实体定义

### 2.1 Field（字段）

代表模块状态中的一个字段，可以是标量、对象或列表项。

- **字段**：`Field`
  - `id`: 字段在模块内的唯一标识（如逻辑路径 `"user.profile.name"` 或列表路径模式 `"educationList[*].degree"`）。  
  - `path`: 用于实际访问状态的路径结构（可分段存储，例如 `["educationList", "*", "degree"]`）。  
  - `displayName`: 人类可读名称（可选，用于 DevTools/平台展示）。  
  - `valueType`: 字段值的类型信息（字符串化表示，例如 `"string" | "number" | "boolean" | "object" | "array"`，以及必要的附加信息）。  
  - `capabilities`: 0..n 个 `FieldCapability` 记录（通常是 0..1，某些场景下可以组合能力）。  
  - `metadata`: 其他与字段相关的元信息（例如是否必填、默认值描述、标签等），不由本特性强制定义。  

### 2.2 FieldCapability（字段能力）

描述字段在数据层的角色及行为。

- **字段能力**：`FieldCapability`
  - `fieldId`: 关联的 `Field.id`。  
  - `kind`: 能力类型：`"Raw" | "Computed" | "Source" | "Link"`。  
  - `deps`: 对于 Computed/Link 能力，依赖字段的 `fieldId` 列表。  
  - `direction`: 对于 Link 能力，联动方向，如 `"one-way"` / `"two-way"` 等（可选）。  
  - `resource`: 对于 Source 能力，关联的 `ResourceMetadata`（见下）。  
  - `statusModel`: 对于 Source 能力，用于描述“未加载 / 加载中 / 成功 / 失败”等状态字段的约定（例如关联的状态字段 ID 列表或状态键名）。  
  - `constraints`: 与性能或一致性相关的附加约束（如是否去抖、是否只在特定条件下重算等），留给后续扩展。  

### 2.3 ResourceMetadata（资源元信息）

用于统一表示 Source 系字段背后外部资源的类型与关联关系。

- **资源元信息**：`ResourceMetadata`
  - `resourceKind`: 资源类型，如 `"query" | "socket" | "storage" | "ai" | "env" | ...`。  
  - `identifier`: 资源标识符（例如查询 key、订阅通道名、AI 模型名称等），格式留给上层约定。  
  - `relation`: 与其他模块状态或领域实体的关联信息（例如关联模块 ID 与字段路径，或领域实体名）。  
  - `lifecycle`: 可选，描述资源的生命周期策略（例如按视图/模块/应用生命周期管理）。  

### 2.4 Module & StateSchema（模块与状态 Schema）

描述模块内所有字段的结构与能力 Blueprint。

- **模块**：`Module`
  - `moduleId`: 模块标识。  
  - `schema`: `StateSchema` 实例，描述字段结构与基础类型。  
  - `fields`: 派生出的 `Field` 列表（含嵌套与列表项抽象）。  
  - `capabilities`: 模块内所有 `FieldCapability` 的集合。  

- **状态 Schema**：`StateSchema`
  - `rootType`: 根节点类型（对象/数组等）。  
  - `definitions`: 对所有子字段的 Schema 描述（包含类型、默认值等）。  
  - `capabilityBlueprints`: Schema 层声明的能力 Blueprint（例如 “fullName 是 computed，依赖 firstName/lastName”），由 Runtime 在 Module live 时扫描生成 `FieldCapability`。

### 2.5 StateGraph（状态图）

用于 DevTools 与平台分析的图结构视图。

- **状态图**：`StateGraph`
  - `nodes`: `GraphNode[]`，每个节点代表一个字段或字段的能力节点。  
  - `edges`: `GraphEdge[]`，每条边代表“依赖”或“联动”关系。  
  - `moduleId`: 关联模块 ID。  
  - `version`: 可选，用于表示图版本（用于对比两版模块时使用）。  

- **图节点**：`GraphNode`
  - `id`: 节点 ID（通常与 `Field.id` 或能力 ID 映射）。  
  - `type`: `"Field" | "Capability"`。  
  - `fieldId`: 若为能力节点，指向对应字段；若为字段节点，则等于自身 ID。  
  - `labels`: 用于可视化的标签集合（例如 `"Computed"`, `"Source:query"`, `"Link"` 等）。  

- **图边**：`GraphEdge`
  - `from`: 源节点 ID。  
  - `to`: 目标节点 ID。  
  - `relation`: 关系类型，如 `"depends-on" | "drives" | "links-to"`。  
  - `metadata`: 可选，用于记录条件、优先级等。

### 2.6 ScenarioPackage（场景包）

为表单、查询、AI 等场景复用字段能力与 State Graph 的上层概念。

- **场景包**：`ScenarioPackage`
  - `name`: 包名（如 `"form"`, `"query"`, `"ai"`）。  
  - `modules`: 使用该场景包的模块 ID 列表（用于统计/分析）。  
  - `capabilityExtensions`: 对基础 FieldCapability 的补充规则（例如表单错误模型、查询缓存策略），由场景包自身定义，不由 `@logix/data` 强制建模。

---

## 3. 关系与约束

- 一个 `Module` 拥有一个 `StateSchema`，并从中派生出 0..n 个 `Field`。  
- 每个 `Field` 可以拥有 0..n 个 `FieldCapability`，但在典型场景中，某一能力类型通常是 0..1（例如一个字段只会有一个主 Computed 能力）。  
- `FieldCapability.deps` 中引用的字段必须属于同一模块，或通过 Link 能力显式地链接到其他模块的 `Field`。  
- 每个 `FieldCapability` 的存在会在 `StateGraph` 中派生出至少一个节点与若干依赖边。  
- `ResourceMetadata` 只与 Source 能力相关，其 `resourceKind` 必须在一个有限的可扩展枚举中（以便 DevTools 做统一展示）。  
- `StateGraph` 必须避免环路或显式标记环路（例如 Computed 字段相互依赖）以便提前报错或提示。

---

## 4. 状态与生命周期（高层）

虽然 `@logix/data` 不直接定义运行时的 Effect/Stream 实现，但数据模型需要为以下状态变化提供空间：

1. **字段值变化**：  
   - 当基础字段值变化时，所有依赖该字段的 Computed / Link 能力都会在 State Graph 中形成“依赖传播”，由 Runtime 执行实际更新。  

2. **资源状态变化**：  
   - Source 字段的值与状态（未加载/加载中/成功/失败）会根据 ResourceMetadata 与 Runtime 决策变化，`statusModel` 字段记录这些变化的承载位置。  

3. **列表结构变化**：  
   - 当列表项被新增/删除/重排时，系统需要维护列表项相关 `Field` 与 `FieldCapability` 的一致性，并更新 State Graph（例如新增节点、删除边）。  

4. **模块演进**：  
   - 当模块版本升级（字段新增/删除/能力调整）时，可以通过生成两版 `StateGraph` 并对比节点/边变化，帮助回归与评审。

这些状态变化不直接在数据模型中编码具体算法，而是要求模型具备足够的表达力，让 Runtime/Helper 能在此基础上实现所需行为。

---

## 5. 总结

数据模型的目标是为 `@logix/data` 提供一个清晰的、平台友好的结构视图，使：

- 模块作者可以在状态层自然地声明字段能力；  
- Runtime 可以根据 Schema/Capability 元信息构建实际执行流；  
- DevTools 与平台可以基于 State Graph 进行可视化、对比与出码；  
- 上层场景包可以在不破坏这一模型的前提下扩展表单/查询/AI 等领域行为。
