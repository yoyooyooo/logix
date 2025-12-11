# Phase 0 · Research for `@logix/data`

本文件汇总本特性在技术路线上的关键决策、依据与备选方案，用于支撑后续设计与实现规划。所有 NEEDS CLARIFICATION 已在本阶段收敛为明确选择或合理假设。

---

## 决策 1：技术栈与落点形态

**Decision**:  
`@logix/data` 实现为 monorepo 内的 TypeScript 库子包（ESM 输出），运行在 Logix Runtime 之上，不单独引入 CLI/服务端进程。

**Rationale**:  
- 仓库北极星是“Intent → Flow/Effect/Logix → 代码 → 上线与长期演进”，`@logix/data` 处在 Runtime/库层，天然适合作为可复用库，而不是独立服务。  
- 现有 runtime-logix / logix-core / logix-react 均为 TypeScript 库，保持一致能最大化复用既有测试与构建管线。  
- 文档中 Field Capabilities 与 Reactive Schema 的示例都是以 `($) => Effect` 的 Helper 与 Schema Metadata 形式出现，说明期望形态是“库 + 类型契约”，而非远程 API。

**Alternatives considered**:  
- 将字段能力抽象为独立服务（例如 State Graph Service，通过 HTTP/GraphQL 管理字段能力定义）：会引入进程间通信与部署复杂度，与当前 PoC 阶段“库优先”的定位不符。  
- 只在现有 `@logix/core` 中混入字段能力，而不单独拆包：会弱化 `@logix/data` 作为统一数据/字段能力层的角色，也不利于后续在平台侧单独演进 Data 视图。

---

## 决策 2：依赖边界与无 UI 依赖

**Decision**:  
`@logix/data` 仅依赖 `effect` v3 与 Logix Runtime 核心（`@logix/core` / `docs/specs/runtime-logix` 契约），不直接依赖 React、Router、Query 等上层框架。

**Rationale**:  
- `state-graph-and-capabilities` 中明确指出：`@logix/data` 是 State Graph / Field Capabilities 宿主，上层场景包（`@logix/form`、`@logix/query`、`@logix/router`、`@logix/ai-native-core` 等）只在内部复用字段能力，而不反向被依赖。  
- 去除 UI/Router 依赖可以让 `@logix/data` 被服务端 Flow、DevTools、平台出码链路共同使用，符合“Effect 作为统一运行时”的原则。  
- 依赖边界收紧后，更有利于在 `docs/specs/runtime-logix` 中将字段能力视为 Runtime 契约的一部分，而不是 UI 技术细节。

**Alternatives considered**:  
- 直接依赖 `@logix/react`，在字段能力层内提供 React hook 帮助函数：会导致 data 层与 UI 层耦合，违背“引擎优先”和“Effect 作为统一运行时”的约束。  
- 引入 `@tanstack/query` 等具体数据层库作为硬依赖：会把特定库固化进 core 层，与 ResourceField 追求的“统一数据平面、对外保持抽象”不符。

---

## 决策 3：字段能力建模方式（Computed / Source / Link）

**Decision**:  
将 Raw / Computed / Source / Link 抽象为“字段能力（Field Capability）”，在 Schema 层以能力元信息（CapabilityMeta）声明，在 Logic 层通过 Helper/Flow 实现，统一视为同一个 State Graph 上的不同节点与边类型。

**Rationale**:  
- Reactive Paradigm 文档强调：Reactive 不是魔法，而是标准 Bound Helper；`state-graph-and-capabilities` 也将 Computed/Source/Link 视为统一的字段能力族。  
- 通过 CapabilityMeta + Helper 的双层模式，可以支持“Schema 显性描述，Runtime 自动挂接 Helper”的路径，与当前 v3 写法和未来平台 IR → 代码生成链路对齐。  
- 将各种能力统一收敛到 Field Capability，有利于 DevTools 构建单一 State Graph 视图，实现“字段级视图 + 能力标注 + 依赖边”的可视化。

**Alternatives considered**:  
- 为 Computed / Source / Link 各自设计独立的插件系统和元信息格式：将显著增加认知成本，并让平台/工具在 State Graph 层做 N 套适配。  
- 只在 Logic 层通过 Helper 手写响应式流程，不在 Schema 中显式建模字段能力：短期可用，但会让平台出码与对比工具失去结构化输入。

---

## 决策 4：动态列表与嵌套字段的支持方式

**Decision**:  
`@logix/data` 必须支持在嵌套对象和列表项上应用字段能力（Computed / Source / Link），并在 State Graph 中正确呈现这些层级与依赖；动态列表的增删改与项级异步操作由上层 Helper（类似 DynamicList）封装，但基于同一字段能力与 State Graph 信息工作。

**Rationale**:  
- Dynamic List & Linkage 文档展示了简历教育经历、上传列表等真实场景，核心在于“列表项级别的响应式与联动”，而不是仅对顶层字段生效。  
- 如果字段能力只支持顶层字段，列表项内的计算/联动/资源字段将不得不通过 ad-hoc 逻辑实现，背离统一 State Graph 的目标。  
- 将“列表/嵌套字段也视为普通字段”并纳入 State Graph，可以保持概念统一，同时把列表操作的复杂性下沉到 Helper 层，避免数据层过重。

**Alternatives considered**:  
- 在 `@logix/data` 中直接实现完整的 DynamicList 引擎（含增删改、上传、校验）：会让 data 层过度承担 UI 模式细节；更适合由 `@logix/reactive` 等 Helper 包承担。  
- 完全忽略列表项能力，只支持标量字段：会让复杂表单/列表场景继续依赖散落的胶水代码，无法从 `@logix/data` 获益。

---

## 决策 5：ResourceField 与 Source 能力的关系

**Decision**:  
在 `@logix/data` 中将 Source 能力设计为 ResourceField 抽象的具体落点：  
每个 Source 字段具有资源类型（如 query/socket/storage/ai 等）与关联关系（relation/Schema Link）元信息，但 Runtime 只关心“字段值 + 状态 + 资源元信息”，与具体客户端库解耦。

**Rationale**:  
- Resource Field 草案将 Query/Socket/Storage/AI 等统一视为“字段由外部资源驱动”的特例，这与 Source 能力的目标高度一致。  
- 在 Source 字段元信息中引入资源类型与 relation 信息，可以让平台与 DevTools 在 State Graph 上精准区分不同来源，同时为跨模块数据流（Schema Link）提供可视化锚点。  
- 保持 Runtime 对外只暴露抽象 ResourceField，而不绑定具体客户端库，可以让 query-integration / ai-native-core 等 Topic 通过 adapter 的方式逐步接入。

**Alternatives considered**:  
- 只在 Source 字段上记录“是否远程/是否异步”，不区分资源类型：会削弱 State Graph 视角下对不同数据来源的洞察能力。  
- 在 `@logix/data` 中直接集成具体 Query/AI 客户端：会造成核心层绑定具体技术栈，降低长远演进空间。

---

## 决策 6：DevTools / 平台集成方式

**Decision**:  
`@logix/data` 通过可查询的字段能力元信息与 State Graph 构建 API 为 DevTools 与平台提供集成点，而不是直接暴露 Web UI 或特定协议；如何传输/展示由上层工具自行决定。

**Rationale**:  
- spec 中的成功标准聚焦于“State Graph 与规范描述一致”“可对比两版模块的字段与依赖变化”，这需要的是结构化数据，而不是特定 UI 实现。  
- 提供纯数据层的 State Graph 构建函数，可以被 CLI、浏览器 DevTools、平台服务端等多种消费者复用，符合“Effect 作为统一运行时”的方向。  
- 避免在 data 层引入 HTTP/GraphQL 细节，可以减少不必要的协议耦合，后续若需要远程访问，可以由工具层自行包装。

**Alternatives considered**:  
- 在 `@logix/data` 中直接提供内置 DevTools UI：会让包职责膨胀且难以在不同宿主环境复用。  
- 设计固定的 HTTP/GraphQL 接口并要求所有工具经由该接口访问：在当前 PoC 阶段约束过重，也与“库优先”方向不符。

---

## 决策 7：与 Effect/Runtime 契约的耦合程度

**Decision**:  
`@logix/data` 视自己为“Logix Runtime 的扩展层”，遵循 Effect-TS 与 runtime-logix 的既有契约，不重新发明 Env/Layer/Module 形态；所有字段能力最终都可以还原为 `($) => Effect` 的组合，以便在现有 Runtime 中执行。

**Rationale**:  
- Reactive Paradigm 与 Dynamic List 示例都强调：再复杂的模式，最终都是 `($) => Effect` 的 Helper；这一点是 v3 设计的关键自洽点。  
- 若 `@logix/data` 在 Env/Layer/Module 上另起一套约定，将导致 Runtime 内部出现两套平行世界，破坏“单一运行时”的目标。  
- 以 runtime-logix 文档为 SSoT，可以在 `docs/specs/runtime-logix/core` 中为字段能力扩展统一章节，保证文档与实现闭环。

**Alternatives considered**:  
- 在 `@logix/data` 中实现独立的 mini-runtime（独立的订阅系统、调度规则）：短期可能更自由，但长期会导致行为与核心 Runtime 不一致，增加维护成本。  
- 将字段能力完全脱离 Runtime，只作为“Schema 装饰器”存在：则无法自然地映射到 Effect/Flow 执行路径中，削弱表达力。

