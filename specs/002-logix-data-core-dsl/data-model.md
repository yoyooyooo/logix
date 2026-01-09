# Data Model: 设计 Module DSL 接入 `@logixjs/data`，让 `@logixjs/core` 可消费字段能力（隶属已归档 spec，仅供参考）

**Branch**: `002-logix-data-core-dsl`  
**Source Spec**: `specs/002-logix-data-core-dsl/spec.md`  
**Source Research**: `specs/002-logix-data-core-dsl/research.md`

> 提示：本文件隶属于已归档的 `specs/002-logix-data-core-dsl` 特性，当前主线已由 `specs/000-module-traits-runtime` 收敛到 `@logixjs/core` 内部的 StateTrait 数据模型。此处内容只作为早期 Module DSL + `@logixjs/data` 协作模型的参考。

本文件只描述本特性引入或约束的「概念数据模型」，不涉及具体实现代码或存储结构。

---

## 1. Module DSL 定义

### Entity: Module DSL 定义

- **描述**：模块作者用来定义 Logix 模块的声明式入口，包含：状态结构、动作、字段能力声明等信息。  
- **关键属性**：
  - `moduleId`: 模块的唯一标识符（字符串），用于 Runtime 与 Devtools 唯一定位模块；
  - `stateSchema`: 描述模块 State 结构的 Schema 定义（例如使用 `Schema.Struct` 一类的声明式形式）；
  - `actions`: 模块支持的动作集合及其载荷 Schema；
  - `fieldCapabilities`: 针对某些字段附加的能力声明集合（Computed / Source / Link 等），从模块作者视角看是 DSL 片段，从运行时视角看是 `@logixjs/data` 的 Blueprint 输入；
  - `logic`: 模块逻辑定义（不在本特性中扩展，只要求与字段能力兼容）。

### 关系

- 一个 Module DSL 定义 **拥有 1 个** `stateSchema`；  
- 一个 Module DSL 定义 **拥有 0..N 个** `fieldCapabilities`；  
- Module DSL 定义是 Runtime 构建与 Devtools StateGraph 的共同起点。

---

## 2. Runtime Plan（运行时计划）

### Entity: ModuleRuntimePlan

- **描述**：由 `@logixjs/data` 从字段能力蓝图推导出的中间结构，描述在运行时应如何为模块字段挂载 Computed / Source / Link 行为。  
- **关键属性**：
  - `moduleId`: 与 Module DSL 定义中的 moduleId 对应；
  - `computedPlans`: 针对每个 Computed 字段的运行时计划集合（依赖字段列表、计算顺序等）；
  - `sourcePlans`: 针对每个 Source 字段的运行时计划集合（资源标识、状态模型等）；
  - `linkPlans`: 针对每个 Link 字段的运行时计划集合（源字段/模块引用等）。

### 关系

- 一个 Module DSL 定义 **对应 0..1 个** ModuleRuntimePlan（如果模块未使用任何字段能力，可以没有 Plan）；  
- 一个 ModuleRuntimePlan **依赖 1..N 个** Field / FieldCapability 实体（定义于 `@logixjs/data` 内部数据模型中）。

---

## 3. Devtools 视图模型

### Entity: Devtools 模块视图

- **描述**：为 Devtools 与平台构建的、基于字段能力与 StateGraph 的视图模型，用于展示模块内部字段与依赖关系。  
- **关键属性**：
  - `moduleId`: 模块标识；  
  - `fields`: 基于 `@logixjs/data` Field 实体的字段列表（包含路径、显示名、类型等元信息）；  
  - `capabilities`: 基于 `FieldCapability` 实体的能力列表；  
  - `stateGraph`: 基于 `StateGraph` 的节点与边集合，用于展示依赖关系与联动拓扑。

### 关系

- 一个 Devtools 模块视图 **对应 1 个** Module DSL 定义（通过 moduleId 关联）；  
- 一个 Devtools 模块视图 **聚合 1..N 个** Field 与 0..N 个 FieldCapability；  
- 一个 Devtools 模块视图 **包含 0..1 个** StateGraphDiff，用于对比不同版本的字段能力变更（在后续特性中扩展）。

---

## 4. 约束与规则（跨实体）

- Module DSL 定义中的 `fieldCapabilities` 必须能被 `@logixjs/data` 的扫描逻辑解析为合法的 `Field` 与 `FieldCapability` 实体，否则视为编译/构建期错误；  
- ModuleRuntimePlan 必须仅引用其所属模块的字段与能力，不跨模块“偷偷”引用未声明的资源；  
- Devtools 模块视图导出的数据必须与 Runtime 实际使用的 ModuleRuntimePlan 同源，避免出现“文档中的图与真正运行的代码不一致”的情况。 
