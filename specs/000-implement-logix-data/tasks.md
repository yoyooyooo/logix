---

description: "Task list for implementing @logix/data 字段能力核心包"
---

# Tasks: 实现 `@logix/data` 字段能力核心包

**Input**: Design documents from `/specs/001-implement-logix-data/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 本特性开发过程中推荐编写测试，但由于规范未强制 TDD，本任务清单中仅在关键路径上包含测试任务，其他测试可在实现过程中视需要补充。

**Organization**: 任务按 User Story 分组，以支持每个故事独立实现与测试。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可以与其他任务并行（不同文件、无前置依赖）
- **[Story]**: 任务所属用户故事（US1 / US2 / US3）
- 描述中必须包含精确文件路径

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 为 `packages/logix-data` 建立基础包结构与脚手架

- [x] T001 创建 `packages/logix-data` 子包目录结构（src/computed, src/source, src/link, src/internal, test/）  
- [x] T002 初始化 `packages/logix-data/package.json` 与构建配置（参考 logix-core，接入 pnpm workspace）  
- [x] T003 [P] 在 `packages/logix-data/tsconfig.json` 中配置 TypeScript 编译目标与路径别名  
- [x] T004 [P] 在 `packages/logix-data` 下配置 Vitest 测试脚本与基础测试环境（使用现有根级 vitest 配置）  
- [x] T005 [P] 将 `packages/logix-data` 接入根级脚本（在根 `package.json` 或 pnpm-workspace 配置中添加 build/test/typecheck 钩子）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 建立字段与字段能力的数据模型，以及 State Graph 的基础结构，为各用户故事提供统一基石  
**⚠️ CRITICAL**: 所有用户故事开始前必须完成本阶段

- [x] T006 在 `packages/logix-data/src/internal/model/field.ts` 中定义 `Field` 数据结构（包含 id/path/valueType/metadata 等）  
- [x] T007 在 `packages/logix-data/src/internal/model/capability.ts` 中定义 `FieldCapability` 数据结构（kind/deps/direction/resource/statusModel 等）  
- [x] T008 在 `packages/logix-data/src/internal/model/resource.ts` 中定义 `ResourceMetadata` 数据结构（resourceKind/identifier/relation/lifecycle 等）  
- [x] T009 在 `packages/logix-data/src/internal/model/state-graph.ts` 中定义 `StateGraph`、`GraphNode`、`GraphEdge` 数据结构  
- [x] T010 [P] 在 `packages/logix-data/test/model.test.ts` 中为 Field/FieldCapability/StateGraph 基础行为编写单元测试  
- [x] T011 在 `packages/logix-data/src/internal/schema/blueprint.ts` 中定义从 Schema CapabilityMeta → Field/FieldCapability 集合的抽象接口（不依赖具体 runtime 实现）  

**Checkpoint**: 字段能力核心数据模型与 State Graph 结构已稳定，可支撑 Computed/Source/Link 三类能力实现。

---

## Phase 3: User Story 1 - 统一字段能力定义（Computed / Source / Link） (Priority: P1) 🎯 MVP

**Goal**: 为 Logix 场景包维护者提供统一的 Computed / Source / Link 字段能力定义方式，并在一个示例模块中验证其行为稳定。

**Independent Test**: 仅依赖 `@logix/data` 与现有 Runtime，在示例模块中声明并使用 Computed/Source/Link 字段后，可以通过测试验证：  
- 至少一个 Computed 字段会随依赖字段变化自动更新；  
- 至少一个 Source 字段能正确反映加载中/成功/失败状态；  
- 至少一个 Link 字段能随源模块字段变化同步更新。

### Implementation for User Story 1

- [x] T012 [P] [US1] 在 `packages/logix-data/src/computed/schema.ts` 中实现 Computed 能力的 Schema 工厂 API（例如 `Computed.for(...)`），返回 CapabilityMeta  
- [x] T013 [P] [US1] 在 `packages/logix-data/src/source/schema.ts` 中实现 Source 能力的 Schema 工厂 API（例如 `Source.field(...)`），封装资源类型与状态模型元信息  
- [x] T014 [P] [US1] 在 `packages/logix-data/src/link/schema.ts` 中实现 Link 能力的 Schema 工厂 API（例如 `Link.to(...)`），支持跨字段/跨模块引用  
- [x] T015 [US1] 在 `packages/logix-data/src/internal/schema/scan-capabilities.ts` 中实现：从模块 State Schema 中扫描 CapabilityMeta，并生成统一的 Field/FieldCapability 集合  
- [x] T016 [P] [US1] 在 `packages/logix-data/src/internal/index.ts` 中整理对外内部入口（统一导出模型与扫描函数，供 Runtime 消费）  
- [x] T017 [P] [US1] 在 `packages/logix-data/src/index.ts` 中导出对外命名空间：`Computed`、`Source`、`Link`，并整理公共类型导出  
- [x] T018 [US1] 在 `packages/logix-data/test/computed.capability.test.ts` 中为 Computed 能力的元信息生成与依赖收集编写测试（不涉及运行时执行，仅验证能力描述）  
- [x] T019 [US1] 在 `packages/logix-data/test/source.capability.test.ts` 中为 Source 能力的资源类型与状态模型元信息编写测试  
- [x] T020 [US1] 在 `packages/logix-data/test/link.capability.test.ts` 中为 Link 能力的依赖字段与方向配置编写测试  

**Checkpoint**: 能在不关心具体执行流程的前提下，通过数据模型与测试验证 Computed/Source/Link 的能力描述是统一且一致的。

---

## Phase 4: User Story 2 - 模块作者可以声明式配置字段能力 (Priority: P2)

**Goal**: 让模块作者可以在状态模型（Schema 层）中声明字段能力（含嵌套对象与列表项），Runtime 能根据这些声明自动挂接逻辑，无需在业务代码中手工维护依赖关系与更新顺序。

**Independent Test**: 在一个示例模块中，仅通过 Schema + `@logix/data` 能力声明（不修改现有逻辑流程），即可实现基础字段与计算字段之间的依赖、Source 字段的加载行为以及 Link 字段的跨模块联动。

### Implementation for User Story 2

- [x] T021 [P] [US2] 在 `packages/logix-data/src/internal/runtime/attach-computed.ts` 中实现：基于 FieldCapability(kind=Computed) 生成对应的描述性运行时计划，用于后续自动更新计算字段  
- [x] T022 [P] [US2] 在 `packages/logix-data/src/internal/runtime/attach-source.ts` 中实现：基于 FieldCapability(kind=Source) 生成资源字段的运行时计划（不绑定具体 query/AI 客户端）  
- [x] T023 [P] [US2] 在 `packages/logix-data/src/internal/runtime/attach-link.ts` 中实现：基于 FieldCapability(kind=Link) 建立跨字段/跨模块联动的运行时计划  
- [x] T024 [US2] 在 `packages/logix-data/src/internal/runtime/attach-all.ts` 中实现统一入口：基于能力集合构建模块级运行时计划，供 Module live 阶段使用  
- [x] T025 [US2] 在 `packages/logix-data/test/runtime.computed.integration.test.ts` 中编写集成测试：验证 Schema → scanModuleSchema → Computed 运行时计划的链路，确认依赖关系正确  
- [x] T026 [US2] 在 `packages/logix-data/test/runtime.source.integration.test.ts` 中编写集成测试：验证 Schema → scanModuleSchema → Source 运行时计划，确认资源元信息正确  
- [x] T027 [US2] 在 `packages/logix-data/test/runtime.link.integration.test.ts` 中编写集成测试：验证 Schema → scanModuleSchema → Link 运行时计划，确认跨字段依赖与方向配置正确  
- [x] T028 [US2] 在 `packages/logix-data/test/runtime.nested-and-list.test.ts` 中编写测试：覆盖嵌套对象与动态列表项中的 Computed 能力声明与运行时计划生成  

**Checkpoint**: 模块作者可以只在 Schema 中声明字段能力，Runtime 可自动挂接 Computed/Source/Link 的执行流，示例模块在 Node/测试环境下按预期工作。

---

## Phase 5: User Story 3 - 平台与工具可以构建统一的 State Graph 视图 (Priority: P3)

**Goal**: 为平台与 DevTools 提供统一的 State Graph 构建与对比能力，基于 `@logix/data` 的字段能力信息生成字段/能力节点与依赖边。

**Independent Test**: 在至少两个不同版本的示例模块中，调用 State Graph 构建与 diff 功能，可以准确识别字段新增/删除、能力变化与依赖边变化。

### Implementation for User Story 3

- [x] T029 [P] [US3] 在 `packages/logix-data/src/internal/graph/build-graph.ts` 中实现：从 Field/FieldCapability 集合构建 StateGraph（nodes/edges）  
- [x] T030 [P] [US3] 在 `packages/logix-data/src/internal/graph/diff-graph.ts` 中实现：两个 StateGraph 之间的节点与边差异对比（added/removed）  
- [x] T031 [US3] 在 `packages/logix-data/src/graph.ts` 中导出对外 graph API（例如 `makeStateGraph`、`diffGraphs`），供 DevTools 与平台使用  
- [x] T032 [P] [US3] 在 `packages/logix-data/test/graph.build.test.ts` 中编写测试：验证构建出的 StateGraph 与规范中的字段/能力关系一致  
- [x] T033 [P] [US3] 在 `packages/logix-data/test/graph.diff.test.ts` 中编写测试：验证对比结果能正确识别字段和依赖变化  
- [x] T034 [US3] 在 `specs/001-implement-logix-data/contracts/openapi.yaml` 基础上，对照当前实现审视是否需要调整字段命名或结构（当前实现与契约一致，无需调整，仅记录审查结果）  

**Checkpoint**: 工具与平台可以通过纯数据 API 获取模块的 State Graph，并对比不同版本的能力变化，为后续可视化与出码提供基础。

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: 覆盖多个用户故事的收尾与优化工作

- [x] T035 [P] 审查并更新 `docs/specs/drafts/topics/state-graph-and-capabilities/01-field-capabilities-overview.md`，确保描述与 `@logix/data` 现实现状一致  
- [x] T036 [P] 在 `docs/specs/runtime-logix/core` 中补充一小节说明字段能力与 State Graph 的 Runtime 契约（必要时新增或更新现有章节）  
- [x] T037 在 `packages/logix-data` 中进行代码清理与内部 API 命名统一（例如 ensure `*.make` / `*.from` 等命名约定一致）  
- [x] T038 [P] 在 `packages/logix-data` 内增加针对边界场景的补充测试（依赖环检测、Source 长期失败降级策略等）  
- [x] T039 更新 `specs/001-implement-logix-data/quickstart.md`，加入一两个基于实际 API 的简单示例片段  
- [x] T040 在仓库根目录运行 `pnpm typecheck`、`pnpm lint`、`pnpm test`，确认引入 `@logix/data` 后不会破坏现有包的类型和测试（当前状态：`pnpm typecheck` 全仓通过；`pnpm lint` 能正常运行但暴露出 examples / logix-test / scripts 等历史 lint 问题，本特性未新增新的 lint 报错热点；`pnpm test` 下 @logix/data 相关用例全部通过，仍有 2 个与 Debug 与 Devtools 集成相关的既有失败用例，需在后续专门的质量债务清理任务中处理）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖，可立即开始。  
- **Foundational (Phase 2)**: 依赖 Phase 1 完成，阻塞所有用户故事。  
- **User Stories (Phase 3–5)**: 依赖 Foundational 完成后可按优先级或团队资源并行推进：  
  - US1（P1）是整个 feature 的 MVP，建议优先完成；  
  - US2、US3 在 Foundational 完成后可以并行，但在测试与集成时需注意依赖 US1 的基础能力。  
- **Polish (Final Phase)**: 依赖所有预期完成的用户故事。

### User Story Dependencies

- **User Story 1 (P1)**: 仅依赖 Foundational，提供 Computed/Source/Link 能力描述的统一基础，是后续故事的前提。  
- **User Story 2 (P2)**: 依赖 US1 提供的能力描述结构，在此基础上实现 Runtime 挂接；可在 US1 能力描述稳定后开始。  
- **User Story 3 (P3)**: 依赖 US1（能力描述）与 Foundational（状态图模型），对 Runtime 挂接无强依赖，可与 US2 并行推进。

### Within Each User Story

- 优先完成数据结构与对外 API 设计，再实现内部逻辑。  
- 测试任务（尤其是集成与图构建测试）应在核心能力实现后尽早补齐，用于回归与重构安全网。  
- 同一 Story 内标记为 [P] 的任务一般可以由不同人并行完成（如不同子模块或不同测试文件）。

### Parallel Opportunities

- Phase 1 中 T003/T004/T005 可在目录结构与 package 初始化完成后并行。  
- Phase 2 中模型定义文件（T006–T009）与测试文件（T010）可由不同人并行编写。  
- Phase 3–5 中所有标记为 [P] 的任务在文件层面解耦良好，可在 Story 内部分配给不同开发者并行推进。  
- 不同 User Story 在 Foundational 完成后也可以并行，只需约定好对公共内部模块（如 internal/runtime）修改的顺序与责任人。

---

## Implementation Strategy

### MVP First（User Story 1 Only）

1. 完成 Phase 1: Setup。  
2. 完成 Phase 2: Foundational（字段能力与 State Graph 模型）。  
3. 完成 Phase 3: User Story 1（统一字段能力定义）。  
4. 停下来用示例模块 + 测试验证 `@logix/data` 的能力描述是否好用、是否符合 v3 文档预期。  

### Incremental Delivery

1. 在 US1 完成并验证后，再进入 US2，实现 Runtime 挂接与实际行为。  
2. 在 US2 基础上，进入 US3，提供 State Graph 视图与 diff 能力，为 DevTools 与平台准备数据接口。  
3. 最后执行 Polish 阶段，补全文档、边界测试与规范回写。
