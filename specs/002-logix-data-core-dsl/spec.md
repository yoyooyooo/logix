# Feature Specification: 设计 Module Traits DSL（StateTrait）接入 `@logix/data` / `@logix/state`，让 `@logix/core` 可消费字段能力（已废弃 / 仅供参考）

> ⚠️ **状态说明（2025-12-10 更新）**  
> 本规范基于「`@logix/data` / `@logix/state` 作为字段能力宿主、`@logix/core` 作为消费者」的早期设想。  
> 当前主线已经由 `specs/001-module-traits-runtime` 收敛到：字段能力与 State Graph 由 `@logix/core` 内部的 StateTrait 实现与承载，`@logix/data` 不再作为独立发布包规划。  
> 因此，本文件仅作为历史 DSL / IR 方案参考，不再作为实现或使用的事实源。最新方案请参考：`specs/001-module-traits-runtime/spec.md`。

**Feature Branch**: `002-logix-data-core-dsl`  
**Created**: 2025-12-09  
**Status**: Archived (superseded by 001-module-traits-runtime)  
**Input**: User description: "设计一下 Module DSL 接入 @logix/data ，和 @logix/core 接轨"

## Clarifications

### Session 2025-12-09

- Q: 本轮设计优先从哪一类用户的视角来描述 `@logix/data` 与 `@logix/core` 的结合？ → A: 模块作者 / 业务开发
- Q: Computed 字段在本特性中被视为怎样的状态？ → A: 视为 State 的正式字段，必须在 State Schema 中显式声明，由字段能力仅补充其「如何被维护」的行为语义
- Q: 字段能力 DSL 应该落在 Module 图纸还是 Logic Helper？ → A: 优先落在 Module 图纸（`state / actions / traits` 三个槽位），Logic 只消费已经具备能力的 State，不再充当字段能力声明入口

## User Scenarios & Testing *(mandatory)*

本特性优先关注的用户角色为「模块作者 / 业务开发者」，Runtime 维护者与 Devtools / 平台开发者作为后续扩展的次要受众。

### User Story 1 - 模块作者声明 Computed/Source/Link 能力 (Priority: P1)

作为 Logix 模块作者，我希望在定义模块时，能够在熟悉的 Module 编程模型（以 Module 图纸为核心）基础上：
- 在 `state` 槽位中，用标准 Effect Schema 清晰声明模块的状态结构（State Schema），包含需要作为正式状态存在的 Computed 字段；
- 在 `traits` 槽位中，通过一套统一的 StateTrait DSL（例如 `StateTrait.from(StateSchema)({ ... })` + `computed / source / link`）为这些已声明字段标注 Computed / Source / Link 能力；
并且全程保持完整的类型提示与约束，这样我可以在不关心底层 IR 细节和 Runtime 实现的前提下，仅通过 Module 图纸（state / actions / traits）就看清模块的状态形状与核心能力。

**Why this priority**: 这是字段能力体系与 `@logix/core` Module 图纸接轨的最小闭环。只有当模块作者可以在「Schema + Traits」两个静态槽位里完整表达状态结构与字段能力时，Module 图纸才足够独立，后续 Studio / 平台才能以图纸为中心做全双工编辑。优先打通它，可以尽快在 examples / PoC 中验证“写起来是否顺手、是否类型安全、是否一眼看清模块能力”。

**Independent Test**: 仅引入 `@logix/core` + `@logix/data` / `@logix/state`，定义一个示例模块，在 State Schema 中显式声明 Computed/Source/Link 目标字段，并通过 `traits: StateTrait.from(StateSchema)({ ... })` 为这些字段标注能力后：
- 开发者在编辑器里能获得正确的字段路径提示与类型推导（包括 Computed 字段本身的类型）；
- 运行示例时，模块行为符合 spec 中对 Computed / Source / Link 的约定；
- Devtools / StateGraph 视图能基于 StateTrait Program 正确显示该模块的字段与依赖关系。

**Acceptance Scenarios**:

1. **Given** 模块作者在项目中引入 `@logix/core` 与 `@logix/data` / `@logix/state`，**When** 在 State Schema 中声明字段并在 Module 定义的 `traits` 槽位中通过 StateTrait DSL 为这些字段声明 Computed / Source / Link 语义时，IDE 能对字段路径和依赖字段给出类型安全的提示，**Then** 作者无需查阅底层 IR 或手写字符串路径即可完成能力声明。
2. **Given** 使用 StateTrait 为某模块字段声明了 Computed 能力，**When** 在运行时更新其依赖字段，**Then** 模块行为中该字段会按预期重新计算，并在基于 StateTrait Program 的 Devtools / StateGraph 视图中体现正确的依赖边。

---

### User Story 2 - Runtime 自动识别并挂载字段能力 (Priority: P2)

作为 Runtime / 平台维护者，我希望在 Module Runtime 构建过程中，可以：
- 自动从模块定义（尤其是 `state` 与 `traits` 槽位）中提取字段与能力信息；
- 利用 `@logix/data` / `@logix/state` 提供的 StateTrait 引擎，将「State Schema + Traits Spec」`build` 成一份可执行的 Program（内部包含 StateGraph 等结构 IR）；
- 在 Runtime 初始化阶段，调用统一的 `StateTrait.mount($, program)` Helper，将 Program 编译为具体的 Flow / Effect 行为并挂到模块的 Bound API 上；
从而避免在多处重复编码 Computed / Source / Link 的运行逻辑，并保证 Runtime 行为始终由 Module 图纸与 StateTrait Program 驱动。

**Why this priority**: 在 US1 的 DSL 确立后，如果 Runtime 不能自动消费这些声明，能力仍然停留在“装饰性”层面。US2 确保 `@logix/core` Runtime 成为字段能力的唯一落点，为后续 Devtools 与平台扩展打基础。

**Independent Test**: 在不修改业务模块的 State Schema 与普通业务逻辑的前提下，仅通过 Runtime 对 StateTrait Program 的挂载机制（基于 Module `traits` 收集的能力声明）：
- 能够正确执行至少一个 Computed / Source / Link 场景；
- 当能力声明发生变化时，无需手动调整 Runtime 接线，行为随 IR 自动更新；
- 单元测试可在无 React / Router / Query 依赖的环境中完成。

**Acceptance Scenarios**:

1. **Given** 某模块在 State Schema 中声明了多个字段，并在 Module 定义中通过 `traits: StateTrait.from(StateSchema)({ ... })` 为这些字段标注了 Computed / Source / Link 能力，**When** Runtime 初始化模块实例时，**Then** 能够自动根据 StateTrait Program 为这些字段挂载对应的 Flow / Effect 行为，无需模块作者手写额外 glue code。
2. **Given** 模块作者仅修改了 `traits` 中的字段能力声明（例如调整 Computed 依赖或 Source 资源配置），**When** 重新运行模块，**Then** Runtime 在不修改任何 Runtime 配置代码的情况下，自动按最新声明更新执行计划与行为。

---

### User Story 3 - Devtools 与平台统一消费 FieldCapability / StateGraph (Priority: P3)

作为 Devtools / 平台开发者，我希望模块定义与 Runtime 在内部统一使用 `@logix/data` / `@logix/state` 的 Field / FieldCapability / StateGraph IR：
- 这样我可以通过一套接口获取任意模块的字段与依赖关系；
- 可以在 Devtools 面板中以图形化方式展示模块的字段能力拓扑；
- 可以在平台层做版本 diff 与变更审计。

**Why this priority**: 虽然 Devtools 与平台不是本阶段的直接实现目标，但在设计 DSL 与 Runtime 接驳方式时需要确保 IR 不会被 Runtime“吃掉”，而是被有意识地暴露出来，作为下游工具的契约，这会显著降低后续集成成本。

**Independent Test**: 在不引入新 UI 的前提下，仅通过程序化接口：
- 能从运行中的 Runtime 中导出某个模块的 Field / FieldCapability 集合以及基于 StateTrait Program 的 StateGraph；
- 能对比同一模块的两个版本，得到字段与依赖变更的结构化 diff；
- 这些数据结构与 `@logix/data` / `@logix/state` 现有契约保持一致。

**Acceptance Scenarios**:

1. **Given** 某模块已经通过 DSL 声明了字段能力并在 Runtime 中运行，**When** Devtools 调用约定的调试/诊断接口，**Then** 可以获取到该模块的 Field 列表、FieldCapability 集合和 StateGraph，并与 `@logix/data` 的 OpenAPI 契约对齐。
2. **Given** 同一模块在两个分支上使用不同的字段能力声明，**When** 使用 diff 能力对比它们的 StateGraph，**Then** 可以得到新增/移除字段与依赖边的清单，为后续可视化与代码审查提供输入。

### Edge Cases

- 当模块 State 过于庞大（例如深度嵌套或包含大量动态列表）时，DSL 与类型系统是否仍然保持可用性与性能（编辑器无明显卡顿，类型推导可在合理时间内完成）。
- 当能力声明与实际运行逻辑不一致（例如字段类型变更但能力未更新）时，系统如何在开发阶段给出清晰的错误提示，避免悄悄失败。
- 当一个模块在不同 Runtime 上下文下被以不同配置多次挂载时，字段能力 IR 和 StateGraph 的导出是否能够区分不同实例，避免诊断信息混淆。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 平台必须在现有 Module 编程模型之上收敛出统一的「Module 图纸」形态，使模块作者可以仅通过 `state`（Effect Schema）、`actions`、`traits` 三个槽位完成模块的状态结构与字段能力声明：在 State Schema 中声明所有正式字段（含 Computed 字段），并在 `traits: StateTrait.from(StateSchema)({ ... })` 中为这些字段标注 Computed / Source / Link 能力，同时保持完整的类型推导与 IDE 提示。
- **FR-002**: Runtime 必须能够基于模块的 State Schema 与 `traits` 收集到的字段能力 Spec，使用 `@logix/data` / `@logix/state` 提供的 StateTrait 引擎，将其 `build` 成模块级 Program，并在 Module Runtime 初始化阶段通过统一的 `StateTrait.mount($, program)` 接口挂载到 Bound API 上，无需业务方手写映射逻辑。
- **FR-003**: 系统必须保证字段能力声明的变更在不修改 Runtime 配置代码的前提下即可生效，开发者只需修改 State Schema 与 `traits` 中的字段能力声明，即可驱动运行时行为与 StateGraph 的更新。
- **FR-004**: 系统必须提供面向 Devtools / 平台的接口，允许在运行时基于 StateTrait Program 导出每个模块的 Field / FieldCapability 集合及 StateGraph，用于调试和可视化。
- **FR-005**: 系统必须在类型层面阻止常见错误用法（例如引用不存在的字段、错误的依赖路径），在编译期或编辑阶段给出明确提示（包括对 `traits` 中字段路径和 derive 函数签名的校验）。
- **FR-006**: 系统必须允许按模块或按能力粒度地启用/禁用字段能力（例如在某些场景中仅启用 Computed 而关闭 Source），以便在 PoC 与生产环境间灵活切换行为策略；该开关应基于 StateTrait Program，而不是散落在业务逻辑中的条件判断。
- **FR-007**: StateTrait 必须被设计为 Trait 体系的首个实例，其生命周期遵循统一模式：模块定义阶段只出现 Spec（`traits`），内部通过 `StateTrait.build` 生成 Program（包含 StateGraph 等结构 IR），Runtime 通过 `StateTrait.mount` 消费 Program 挂载行为，为后续 ActionTrait / FlowTrait 等扩展保留一致的演进路径。

### Key Entities *(include if feature involves data)*

- **Module 图纸与字段能力声明**：由模块作者通过 Module 定义中的 `state`（State Schema）与 `traits`（StateTrait Spec）共同完成。前者负责描述 State 的正式字段集合（包含 Computed 字段），后者负责为其中部分字段标注 Computed / Source / Link 行为，二者合在一起作为 StateTrait 引擎 `build` 的输入。
- **StateTrait Program（字段能力程序）**：由 `@logix/data` / `@logix/state` 的 StateTrait 引擎从「State Schema + Traits Spec」中推导出的中间结构，对外表现为 Program，对内包含 StateGraph 等结构 IR，以及供 Runtime 挂载用的执行计划；Runtime 通过 `StateTrait.mount` 消费 Program，将字段能力编译为具体 Flow / Effect 行为。
- **Devtools 视图模型**：基于 Field / FieldCapability / StateGraph 构建的可视化与诊断数据结构，为后续 Devtools 面板与平台审计提供输入。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 至少 2 个示例模块可以仅通过 Module DSL 完成字段能力声明，并在不查阅内部 IR 的前提下被新手开发者独立实现，说明 DSL 可理解且可上手。
- **SC-002**: 在集成示例中，修改字段能力声明后，无需修改任何 Runtime 配置代码即可完成行为更新，完整修改路径不超过 3 处文件，验证“声明驱动运行时”的设计目标。
- **SC-003**: 使用 IDE（如 VS Code）编辑典型模块时，字段能力相关的类型检查与提示响应时间在 1 秒内，且不会出现大规模 `any` 泄漏，确保类型系统实际可用。
- **SC-004**: Devtools 或调试脚本可以在运行中的应用中正确导出至少 1 个模块的 Field / FieldCapability / StateGraph，并实现一次成功的版本 diff，用于展示字段能力变更的影响范围。
