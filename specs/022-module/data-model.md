# Data Model: Module（定义对象）+ ModuleTag（身份锚点）

**Date**: 2025-12-21  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/022-module/spec.md`

## 命名矩阵（本特性裁决）

- `ModuleDef`：`Logix.Module.make(...)` 返回；带 `.tag`；可 `.logic(...)` 产出逻辑值；`.implement(...)` 产出 `Module`；不带 `.impl`。
- `Module`：wrap module（通常由 `ModuleDef.implement(...)` 或领域工厂返回）；带 `.tag` + `.impl`；支持 `withLogic/withLayers`；`.logic(...)` 仍只产出逻辑值。
- `ModuleTag`：身份锚点（Context.Tag）；用于 Env 注入与“全局实例”解析。
- `ModuleImpl`：装配蓝图（`layer` + imports/processes 等）；用于创建局部实例。
- `ModuleRuntime`：运行时实例（真正的“实例”语义）。
- `ModuleHandle`：`yield* $.use(...)` 返回的只读句柄（可含 controller 等扩展）。
- `ModuleRef`：React `useModule(...)` 返回的 ref（含 state/actions/dispatch + 扩展）。

## Entities

### 1) Module（定义对象，领域模块统一形状）

表示“一个可被运行与消费的领域模块对象”，用于承载：

- 模块身份（复用既有 ModuleTag identity）
- 可装配蓝图（ModuleImpl）
- 可选领域扩展（例如 controller/policies/descriptor）
- fluent 组合能力（追加逻辑/注入依赖，且不可变返回新实例）

**Fields（概念性）**:

- `id`（string）
  - 语义：领域模块 id（例如 `"UserForm"` / `"OrderCrud"`），用于诊断与可读性。
- `tag`（ModuleTag）
  - 语义：复用既有模块身份锚点（Context.Tag）；用于 `$.use(...)` 与 Env 注入。
- `impl`（ModuleImpl）
  - 语义：可装配蓝图（Layer + imports/processes 等），供 React/Runtime 消费。
- `schemas`（可选）
  - 语义：显式 Schema 反射（reflection），用于 Studio/Devtools/脚本在运行时直接读取结构信息（免静态分析）。
  - 约束：必须是可安全导出/可控大小的结构；若需序列化，推荐由平台侧 loader 将其转换为 JSON Schema（不在运行时热路径中做重计算）。
- `meta`（可选）
  - 语义：SDD/研发链路追踪元数据（如 specId/scenarioId/version/generatedBy 等）。
  - 约束：slim、可序列化、可审计；不得携带闭包/大型对象图。
- `dev.source`（可选，仅 dev）
  - 语义：源码位置锚点（file/line/column），用于 Click-to-Code 或调试跳转。
  - 约束：仅 dev；不得参与运行时语义；预计由构建工具插件（vite/rsbuild/webpack）注入；本特性不实现自动注入（可手工填写）。
- `services`（可选）
  - 语义：对外暴露的依赖契约（ports/service tags）；业务侧用 `Layer` 提供实现。
- `controller`（可选）
  - 语义：领域专属操作投影（例如 Form 的 `validate/arrayAppend/...`、CRUD 的聚合操作等）。
  - 要求：逻辑侧与装配侧可见的入口一致（同一心智模型）。
- `actions`
  - 语义：不新增第二套同名 `actions`；`actions` 一词默认指底层 Module 的 action tags 与 `ModuleHandle.actions`（dispatchers）。
- `logics`（ReadonlyArray<LogicUnit>）
  - 语义：挂载到该 Module 的逻辑单元集合（包含领域默认逻辑与用户追加逻辑）。
- `withLogic/withLogics`
  - 语义：追加逻辑单元，返回新的 Module（不可变）。
- `withLayer/withLayers`
  - 语义：注入依赖能力，返回新的 Module（不可变）。

**Relationships**:

- `ModuleFactory` → 生成 `ModuleDef/Module`
- `Module` → 持有 `ModuleTag` 与 `ModuleImpl`
- `Module` → 生成“逻辑侧句柄”（通过 `$.use(module)`）
- `Module` → 统一消费入口做 unwrap：逻辑侧 `$.use(module)` 解析 `module.tag`；装配/运行侧 `Runtime.make(module)` 使用 `module.impl`；React `useModule(module)` 默认使用 `module.impl`（局部），全局实例显式用 `module.tag`（ModuleTag）；对 `ModuleDef`，React `useModule(moduleDef)` 等价于 `useModule(moduleDef.tag)`。

**Validation Rules**:

- `logic`（产出逻辑值）与 `withLogic`（挂载到可运行形态）必须语义分离。
- `withLogic/withLayers` 必须不可变：不得修改原实例，避免共享引用副作用。
- Module 的“拆壳协议”必须显式（可类型化），禁止依赖随机的 duck-typing/magic 字段。

### 2) ModuleHandle（逻辑侧句柄，可能含领域扩展）

表示 `yield* $.use(module)` 返回的逻辑侧句柄：在基础 `ModuleHandle` 能力上携带领域扩展（例如 controller）。

**Fields（概念性）**:

- `read/changes/dispatch/actions/actions$`：基础模块能力（只读 handle）。
- `controller`：领域扩展能力（例如 Form controller）。

**Notes**:

- 领域扩展（例如 controller）的注入应复用既有 handle extend 机制，避免第二真相源。
- `Module.logic(build, { id? })` 中提供 `$.self`：用于在本模块逻辑内直接获取该句柄（等价于 `yield* $.use(module)`），避免反复显式传入自身 module。

### 3) ModuleDescriptor（可序列化领域模块描述）

表示用于 Devtools/Sandbox/证据导出的最小可序列化描述，用于解释：

- “这个运行中的领域模块由哪些逻辑单元组成”
- “暴露了哪些 action tags（模块 actions）”
- “它对应哪个 moduleId/instanceId”

**Fields（建议）**:

- `id`（string）
- `moduleId`（string）
- `instanceId`（string，可选）
- `logicUnits[]`：逻辑单元摘要（name/phase 等）
- `logicUnits[].id`：逻辑单元的 slot key（用于 diff/回放/证据对齐与精确更新）；推荐显式提供；未提供时允许 derived（必须可复现；禁止随机/时间；禁止仅用数组 index）。
- `actionKeys[]`：action tags 的 key 列表（不携带函数本体）
- `schemaKeys[]`（可选）：该 Module 显式反射的 Schema key 列表（仅 keys，不携带 bodies）
- `meta`（可选）：链路追踪元数据（slim、可序列化）
- `source`（可选，仅 dev）：源码位置锚点（file/line/column）

**Validation Rules**:

- 载荷必须 slim、可序列化；禁止包含闭包/Effect/大型对象图。
- 必须可稳定关联到既有 identity 字段（moduleId/instanceId/txnSeq/opSeq）。
- `logicUnits[].id` 必须稳定且可复现（禁止随机/时间默认）；建议由领域工厂或逻辑定义处显式命名/编号。

### 4) ModuleFactory（领域工厂）

表示生成 Module 的工厂函数/构造器（例如 Form.make / CRUD.make）。

**Responsibilities**:

- 定义模块 actionMap（action tags）/固化可选 controller
- 固化领域默认逻辑（install / 策略）
- 暴露统一形状的 Module，供上层组合与消费
