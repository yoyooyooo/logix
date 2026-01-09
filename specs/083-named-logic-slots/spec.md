# Feature Specification: Named Logic Slots（具名逻辑插槽：从结构可见到语义可见）

**Feature Branch**: `083-named-logic-slots`  
**Created**: 2026-01-09  
**Status**: Draft  
**Input**: 在模块层引入“具名逻辑插槽（Named Logic Slots）”：平台不再只看到 `logics: []` 的黑盒数组，而能看到逻辑的坑位语义（required/unique/aspect…），从而支持可解释的组装、替换与治理；并为未来 AI 辅助编程提供更强的结构化语义资产。

## Context

当前平台侧能较好拿到 **结构信息**（actions/schema/servicePorts/ports/typeIR…），但对“逻辑意图”仍缺少足够的可枚举语义：

- 模块里有哪些逻辑单元（数组）可以看见，但“每个逻辑扮演什么角色”不可见；
- 平台无法做“把某个逻辑替换到某个坑位”的高置信度编辑，只能把逻辑当黑盒堆叠；
- AI/Agent 难以对齐“你想要的逻辑能力是什么”，只能从代码推断，风险高。

具名逻辑插槽的目标是把“语义坑位”显式化为可枚举、可治理的元数据，而不是靠 AST/LLM 去猜意图。

## Clarifications

### Session 2026-01-09

- AUTO: Q: Slot 填充关系的权威表达是什么？→ A: 以 `LogicUnitOptions.slotName?: string` 为唯一权威表达（配置对象→meta）；不引入 default slot。
- AUTO: Q: slotName 的命名约束？→ A: `/^[A-Za-z][A-Za-z0-9_]*$/`；非法必须结构化失败。
- AUTO: Q: required/unique 校验发生在何时？→ A: mount/implement 阶段校验；不在 `Module.make` 定义时即刻抛错。

## Goals / Scope

### In Scope

- 在 ModuleDef 上提供插槽定义（slots），描述坑位语义与约束（required/unique/kind 等）。
- 让平台能枚举插槽定义与当前逻辑填充情况（slot→logic），用于可视化、替换与门禁。
- 提供最小的约束语义：缺失 required、违反 unique、非法重复填充必须可解释并可门禁化。

### Out of Scope

- 不尝试从 Effect/Logic 代码里反射“业务规则意图”（Intent Rules），避免推断黑盒。
- 不把插槽系统扩展为通用插件系统或运行时动态装配框架（保持最小化元数据）。
- 不强制所有模块必须使用 slots；允许渐进采用。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 平台可枚举插槽语义并支持“像拼积木一样替换逻辑” (Priority: P1)

作为平台使用者，我希望在模块上看到清晰的逻辑坑位：哪些坑位必须填、哪些只能有一个、哪些是可叠加切面；并能把某个逻辑替换到指定坑位中，平台能够解释并阻止非法组合。

**Why this priority**: 这是“从结构到语义”的关键跨越，直接决定平台是否能安全地做可视化编辑与 AI 辅助组装。

**Independent Test**: 构造一个模块，声明 slots，并分别验证：缺失 required 会失败；重复填充 unique 会失败；aspect 可多选；平台能展示 slot→logic 映射并支持替换。

**Acceptance Scenarios**:

1. **Given** 一个模块声明 `slots`，**When** 平台加载该模块，**Then** 能枚举 slots 定义（含约束）与当前填充情况，并可 JSON 序列化/稳定 diff。
2. **Given** 一个 required+unique 的 slot 未被填充，**When** 进行检查/试跑前置校验，**Then** 失败并给出可解释错误（指出缺失 slot 名称与建议修复方式）。
3. **Given** 一个 unique slot 被填充了两个逻辑，**When** 检查/门禁运行，**Then** 失败并指出冲突 slot 与冲突逻辑来源。

---

### User Story 2 - 具名插槽成为全双工编辑的安全边界（子集内可回写） (Priority: P2)

作为平台/工具链维护者，我希望 slots 的声明与填充关系属于 Platform-Grade 子集：当平台需要做替换/插入/删除时，能在受限范围内生成最小补丁并回写源码；对子集外形态明确降级（只报告不回写）。

**Why this priority**: 不把“编辑边界”限制在插槽上，全双工回写会不可控，容易破坏业务语义。

**Independent Test**: 对 slots 的简单变更（替换一个 slot 的逻辑）可以生成最小回写补丁；复杂动态写法会被降级。

## Edge Cases

- slotName 字符集：`/^[A-Za-z][A-Za-z0-9_]*$/`；空串/非法字符必须失败并可解释。
- 插槽命名冲突/非法字符：必须失败并可解释。
- 插槽定义变更导致历史逻辑不再匹配：必须可 diff 并提供迁移提示（forward-only，无兼容层）。
- 逻辑同时声明多个 slot：MVP 直接禁止（一个逻辑单元最多属于一个 slotName）。
- 大量逻辑 + 大量 slot：平台展示与 diff 必须稳定，避免噪音。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 支持在模块定义中声明 `slots`（具名插槽），每个 slot 包含最小约束元数据（例如 required/unique/kind），且 slotName MUST 符合命名规范（见 Edge Cases）。
- **FR-002**: 系统 MUST 支持枚举“slot 定义 + 填充关系”的可序列化表示，并保证确定性与可 diff（稳定排序）。
- **FR-003**: 系统 MUST 提供可解释的校验：缺失 required、违反 unique、非法重复填充必须失败并给出结构化错误；校验在模块装配/检查路径执行（不在 `Module.make` 定义时即刻抛错）。
- **FR-004**: 系统 MUST 允许渐进采用：未声明 slots 的模块仍按现有方式工作，不强制改造。
- **FR-005**: slots 的声明与填充 MUST 可作为全双工编辑的安全边界：子集内可回写；子集外显式降级为 Raw Mode（只报告不回写）。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: slots 的反射/导出 MUST slim 且可序列化，且默认不引入运行时常驻成本（按需导出/检查路径）。
- **NFR-002**: slots 相关诊断 MUST 使用稳定锚点并可解释（slotName/logicRef/moduleId），避免随机/时间戳作为默认来源。
- **NFR-003**: 任何破坏性变化 MUST 给出迁移说明，遵循 forward-only（无兼容层/无弃用期）。

### Key Entities _(include if feature involves data)_

- **Slot Definition**: 具名逻辑插槽的定义（语义与约束）。
- **Slot Fill**: slot→logic 的填充关系（当前模块采用了哪些逻辑）。
- **Slot Diagnostics**: slots 校验失败的结构化错误/告警，用于平台门禁与解释链路。

## Success Criteria _(mandatory)_

- **SC-001**: 平台可枚举并展示 slots（定义+填充），并能在缺失/冲突时给出结构化、可行动的诊断。
- **SC-002**: slots 相关输出可稳定 diff：slot/logic 变化能被识别，避免噪音。
- **SC-003**: slots 可以作为全双工编辑的安全边界：简单变更可回写；复杂/动态形态明确降级而不误改。
