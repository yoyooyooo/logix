# Phase 0 Research: 设计 Module DSL 接入 `@logixjs/data`，让 `@logixjs/core` 可消费字段能力（隶属已归档 spec，仅供参考）

**Branch**: `002-logix-data-core-dsl`  
**Date**: 2025-12-09  
**Source Spec**: `specs/002-logix-data-core-dsl/spec.md`

> 提示：本文件隶属于已归档的 `specs/002-logix-data-core-dsl` 特性，记录的是早期「Module DSL ↔ `@logixjs/data` ↔ `@logixjs/core`」的决策草图。当前主线已改为 StateTrait / `@logixjs/core`，此处内容仅作为历史思路参考。

本文件汇总本特性在进入设计与 contracts 之前的关键技术决策与备选方案，对应 plan.md 中的 Technical Context 与后续 Phase 1 设计。

---

## 1. Module DSL 设计方向

### Decision

以「保持现有 `@logixjs/core` Module API 尽量稳定」为前提，采用**渐进增强式 DSL**：

- 继续使用 `Logix.Module.make` 作为模块定义入口；
- 在其配置对象中，为 state/logic 增加一层「字段能力声明」的可选扩展点（例如通过 capability-aware 的 state builder 或单独的 `data` 段）；
- 该扩展点负责构造 `@logixjs/data` 需要的 Schema/Blueprint，供扫描与 Plan 生成使用。

### Rationale

- 保持 Module 作者的心智负担最小：仍然以 `Module.make` 为中心，只是在定义 state 时多了一层“声明字段能力”的能力；
- 避免为 data 能力引入一套完全独立的 DSL，减少在文档与教学上的碎片化；
- 便于在当前 examples 与测试模块上进行逐步迁移，无需一次性重写所有 Module 定义。

### Alternatives considered

1. **替换 Module API**：设计全新的 `Logix.Module.withData(...)` 或完全不同的 Module 定义方法。  
   - 缺点：对现有文档与示例的破坏性过大，需要维护两套 Module 入口。
2. **完全在 `@logixjs/data` 内部提供独立 DSL**，再通过适配层注入 core。  
   - 缺点：模块作者需要同时理解两套 DSL，且 core 侧类型推导会更绕。

---

## 2. `@logixjs/core` 与 `@logixjs/data` 依赖关系

### Decision

维持「core 依赖 data，data 不依赖 core」的单向依赖关系：

- `@logixjs/core` 在编译期引用 `@logixjs/data` 的类型与 IR（Field / FieldCapability / RuntimePlan 等），并在 Runtime 中消费这些结构；
- `@logixjs/data` 仍然只是字段能力与状态图的描述层，不引入对 core 类型或 Runtime 的反向依赖。

### Rationale

- 符合之前在 field-capabilities 与 runtime-logix 文档中的角色划分：data 作为统一数据层，core 作为执行层；
- 避免形成难以拆解的循环依赖，保证未来可以独立演进 Devtools / 平台侧对 data IR 的消费方式。

### Alternatives considered

1. **双向依赖**：在 `@logixjs/data` 中直接引用 core 的 Module 类型以获取更强类型推导。  
   - 缺点：形成深耦合，未来迁移或拆包时代价高。
2. **完全解耦（core 不依赖 data）**：只在 Devtools 层使用 data。  
   - 缺点：无法实现“声明驱动 Runtime”的目标，字段能力难以影响实际执行行为。

---

## 3. Runtime 集成策略

### Decision

在 `@logixjs/core` 的 ModuleRuntime 构建流程中插入一个「字段能力挂载阶段」：

- 在模块初始化时，调用 `@logixjs/data` 的扫描与 Plan API，生成该模块的 `ModuleRuntimePlan`；
- 根据 Plan 中的 Computed / Source / Link 条目，构建对应的 Flow / Effect 程序，并注入到 Runtime；
- 保持该阶段对模块作者透明，作者只需要通过 DSL 声明能力。

### Rationale

- 将字段能力视为对 ModuleRuntime 构建流程的“编译扩展”，符合 runtime-logix 文档中 Capability Plugin 的思路；
- 便于在测试中隔离：可以针对 Plan → Flow 转换做单元测试，而不耦合上层 UI 或 Devtools。

### Alternatives considered

1. **按需手动挂载**：要求模块作者或平台方在单独文件中手动将 FieldCapability 映射到 Flow。  
   - 缺点：与「声明即配置」理念相悖，增加维护成本。
2. **在 Devtools 中反向推导 Runtime 行为**：不在 Runtime 中统一挂载，仅通过 Devtools 分析现有逻辑。  
   - 缺点：难以保证能力声明与实际行为一致，也无法驱动运行时逻辑。
