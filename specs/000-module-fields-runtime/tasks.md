---

description: "Task list for 000-module-fields-runtime (FieldKernel + EffectOp/Middleware)"
---

# Tasks: 统一 Module Fields（FieldKernel）与 Runtime Middleware/EffectOp

**Input**: Design documents from `specs/000-module-fields-runtime/`
**Prerequisites**: `plan.md`、`spec.md`（已就绪），`research.md`、`data-model.md`、`quickstart.md`、`references/*`

**Tests**: 本特性落在 `packages/logix-core` 等核心运行时包内，测试视为必选：每个 P1 User Story 至少需要一组类型测试 + 行为测试。
**组织方式**: 任务按 User Story 分组，每个故事可以独立实现与验证。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 任务可与其他任务并行（不同文件，或只依赖已完成的基础设施）
- **[Story]**: 所属 User Story（US1–US8），仅在 User Story 阶段任务中出现
- 描述中需包含精确文件路径

---

## Phase 1: Setup（特性级准备）

**Purpose**: 确认本特性文档与目录基础就绪，为后续实现提供稳定事实源。

- [X] T001 更新 spec/plan 中对 @logixjs/data 的定位说明（标明为 PoC/历史方案）并指向 000-module-fields-runtime：`specs/000-module-fields-runtime/spec.md`
- [X] T002 在 research/data-model 中补齐 FieldKernel / EffectOp / Resource / Query / Devtools / Parser 各部分的引用链接：`specs/000-module-fields-runtime/research.md`
- [X] T003 [P] 确认并微调 FieldKernel Core reference（API 列表与计划的 Phase 1 一致）：`specs/000-module-fields-runtime/references/field-kernel-core.md`
- [X] T004 [P] 确认并微调 EffectOp/Middleware reference（与 plan Phase 2 一致）：`specs/000-module-fields-runtime/references/effectop-and-middleware.md`
- [X] T005 [P] 填充并校对 Resource/Query reference（与 research 第 4/7 章对齐）：`specs/000-module-fields-runtime/references/resource-and-query.md`
- [X] T006 [P] 填充并校对 Devtools/Debug 与 Parser/Studio reference 的大纲与关键接口：`specs/000-module-fields-runtime/references/devtools-and-debug.md`

---

## Phase 2: Foundational（所有 User Story 共享的内核设施）

**Purpose**: 建立 FieldKernel / EffectOp / Middleware 的基础文件与导出结构，所有后续故事都依赖这层基础。

**⚠️ CRITICAL**: 完成本阶段前不得开始任何 User Story 具体实现。

- [X] T007 在 `packages/logix-core/src` 新增 `FieldKernel.ts` 文件并导出空的 `FieldKernel` 命名空间占位（仅 re-export internal 模块）：`packages/logix-core/src/FieldKernel.ts`
- [X] T008 在 `packages/logix-core/src/internal` 下新增 `state-field` 目录与基础文件：`packages/logix-core/src/internal/state-field/{model.ts,field-path.ts,build.ts,install.ts}`
- [X] T009 [P] 在 `FieldKernel.ts` 中接好对 internal/model/build/install/field-path 的导出结构（不实现具体逻辑，仅类型与函数签名）：`packages/logix-core/src/FieldKernel.ts`
- [X] T010 [P] 为 FieldKernel 内核新增测试文件骨架（不含具体断言，仅导入路径与 describe 块）：`packages/logix-core/test/FieldKernel.test.ts`
- [X] T011 在 `packages/logix-core/src` 新增 EffectOp 类型文件占位（或扩充现有文件），定义基础 `EffectOp` 接口与类型别名：`packages/logix-core/src/EffectOp.ts`
- [X] T012 [P] 在 `packages/logix-core/src/internal/runtime` 下新增 EffectOp 内核文件（例如 `EffectOpCore.ts`），预留 Middleware 管道类型与挂载点：`packages/logix-core/src/internal/runtime/EffectOpCore.ts`
- [X] T013 在 `packages/logix-core/src` 新建 `Middleware.ts` 入口文件，预留 Debug / Query 等中间件导出位：`packages/logix-core/src/Middleware.ts`
- [X] T014 [P] 在 `packages/logix-core/src/Runtime.ts` 中增加 EffectOp/Middleware 管道的占位集成点（不改变现有行为，只添加 TODO 注释与类型接口）：`packages/logix-core/src/Runtime.ts`
- [X] T015 [P] 运行 `pnpm typecheck` 与 `pnpm test --filter logix-core` 确认新增文件/导出不会破坏现有构建：`packages/logix-core`

**Checkpoint**: FieldKernel / EffectOp / Middleware 的基础文件和导出结构已就绪，可以在其上按 User Story 展开实现。

---

## Phase 3: User Story 1 - 模块作者用 `state + actions + fields` 定义完整图纸 (Priority: P1) 🎯 MVP

**Goal**: 为模块作者提供 `state + actions + fields` 图纸形态与 FieldKernel DSL（from/computed/source/link），并通过示例模块验证类型与心智。

**Independent Test**: 仅依赖 `@logixjs/core`，可在示例模块中：
- 用 `state` + `fields: FieldKernel.from(StateSchema)({...})` 声明 computed/link/source 字段；
- 在 IDE 中获得字段路径与 derive 函数的类型提示；
- 运行示例测试验证 computed/link 行为无需额外 glue code。

### Tests for User Story 1（必选）

- [X] T016 [P] [US1] 为 StateFieldPath/StateAtPath 添加类型层测试用例（例如通过 dtslint 或 TS 编译失败用例）以验证路径推导与错误提示：`packages/logix-core/test/FieldKernel.FieldPath.d.ts`
- [X] T017 [P] [US1] 新建基于 Vitest 的行为测试，验证简单 StateSchema 上 computed/link 的行为正确（不含 source）：`packages/logix-core/test/FieldKernel.ComputedLink.test.ts`
- [X] T018 [P] [US1] 在 quickstart 示例中添加一个 e2e 水平的使用说明测试（可在 test 中导入 quickstart 示例 Module 并验证基本行为）：`packages/logix-core/test/FieldKernel.QuickstartExample.test.ts`

### Implementation for User Story 1

- [X] T019 [P] [US1] 在 `internal/state-field/field-path.ts` 实现 `StateFieldPath<S>` 与 `StateAtPath<S, P>` 条件类型，支持嵌套 Struct 路径（如 `"profile.name"`）：`packages/logix-core/src/internal/state-field/field-path.ts`
- [X] T020 [P] [US1] 在 `internal/state-field/model.ts` 定义 `FieldKernelSpec<S>`、`FieldKernelEntry<S, P>`、`FieldProgram<S>`、`FieldGraph`、`FieldPlan` 等核心类型：`packages/logix-core/src/internal/state-field/model.ts`
- [X] T021 [P] [US1] 在 `FieldKernel.ts` 中实现 `FieldKernel.from(StateSchema)` 的泛型签名与返回值类型，确保在 IDE 中可根据 StateSchema 自动补全合法字段路径：`packages/logix-core/src/FieldKernel.ts`
- [X] T022 [P] [US1] 在 `FieldKernel.ts` 中实现 `FieldKernel.computed` / `FieldKernel.link` API 的类型签名与最小实现（只创建对应的 FieldKernelEntry，不做运行行为）：`packages/logix-core/src/FieldKernel.ts`
- [X] T023 [US1] 在 `internal/state-field/model.ts` 中实现从 spec 对象构建内部 entry 集合的辅助函数（例如 normalize/validate），为后续 build 阶段做准备：`packages/logix-core/src/internal/state-field/model.ts`
- [X] T024 [US1] 创建 quickstart 中使用的示例 Module（CounterWithProfile），确保示例模块路径与文档一致：`examples/logix-react/src/modules/counter-with-profile.ts`
- [X] T025 [US1] 在 quickstart 文档中校对示例代码与实际实现（import 路径、API 名称一致），并标注依赖的测试文件：`specs/000-module-fields-runtime/quickstart.md`
- [X] T026 [US1] 运行 `pnpm test --filter logix-core` 验证 US1 的类型与行为测试均能通过：`packages/logix-core`

**Checkpoint**: FieldKernel.from/computed/link 已可用于声明 Module 图纸中的字段能力，示例模块通过测试。

---

## Phase 4: User Story 2 - Runtime 维护者通过 FieldKernel Program 安装行为 (Priority: P1)

**Goal**: 让 Runtime 能够基于 `state + fields` 调用 FieldKernel.build 生成 Program，并在 ModuleRuntime 初始化时通过 `FieldKernel.install($, program)` 安装 computed/link/source 行为。

**Independent Test**: 在一个示例 Module 上，仅通过在图纸中添加 fields，即可让 Runtime 自动维护 computed/link/source 行为，且修改 fields 后只需重新 build+install，无需修改 Runtime 入口代码。

### Tests for User Story 2（必选）

- [X] T027 [P] [US2] 为 FieldKernel.build 添加单元测试，验证合法 spec 能生成预期 Program/Graph/Plan，非法 spec（错误字段路径/环路）能返回结构化错误：`packages/logix-core/test/FieldKernel.Build.test.ts`
- [X] T028 [P] [US2] 为 FieldKernel.install 添加集成测试，验证在 Bound API 上能根据 Plan 正确更新 computed/link 字段（使用内存 Runtime 实现）：`packages/logix-core/test/FieldKernel.Install.test.ts`
- [X] T029 [P] [US2] 为示例 Module（CounterWithProfile）添加运行时集成测试，验证在 Runtime.make 下通过 build+install 自动维护 sum/profile.name 行为：`packages/logix-core/test/FieldKernel.RuntimeIntegration.test.ts`

### Implementation for User Story 2

- [X] T030 [P] [US2] 在 `internal/state-field/build.ts` 实现 `FieldKernel.build(schema, spec)` 纯函数：校验 spec 与 schema 一致性、构建 Graph/Plan，并生成 FieldProgram：`packages/logix-core/src/internal/state-field/build.ts`
- [X] T031 [P] [US2] 在 `internal/state-field/build.ts` 中实现 Graph 构建逻辑：为 computed/link/source 建立节点与边，并检测环路/非法依赖：`packages/logix-core/src/internal/state-field/build.ts`
- [X] T032 [P] [US2] 在 `internal/state-field/build.ts` 中实现 Plan 生成逻辑：从 Graph 推导 PlanStep 执行顺序（computed-update / link-propagate / source-refresh）：`packages/logix-core/src/internal/state-field/build.ts`
- [X] T033 [US2] 在 `internal/state-field/install.ts` 实现最小版 `FieldKernel.install($, program)`：基于 Plan 在 Bound API 上注册 computed/link watcher，并为 source 类型的步骤预留入口（暂不接 EffectOp）：`packages/logix-core/src/internal/state-field/install.ts`
- [X] T034 [US2] 在 `FieldKernel.ts` 中导出 `FieldKernel.build` / `FieldKernel.install`，并补充 JSDoc 链接到 spec/references：`packages/logix-core/src/FieldKernel.ts`
- [X] T035 [US2] 修改 `packages/logix-core/src/Module.ts` 中的 Module 实现，使其在 `Module.make` 中识别 `fields` 槽位并在 Module 实例中持有 FieldProgram：`packages/logix-core/src/Module.ts`
- [X] T036 [US2] 修改 `packages/logix-core/src/internal/runtime/ModuleRuntime.ts` 和/或 `Runtime.ts`，在创建 ModuleRuntime 时调用 `FieldKernel.install($, program)` 挂载行为：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`
- [X] T037 [US2] 更新 quickstart 中 Runtime 初始化部分示例，展示 build+install 的接线方式：`specs/000-module-fields-runtime/quickstart.md`

**Checkpoint**: 任何带 fields 的 Module 都可以通过 Runtime 自动安装字段行为，US1+US2 闭环打通。

---

## Phase 5: User Story 4 - Runtime 维护者通过 EffectOp/Middleware 统一挂载横切能力 (Priority: P1)

**Goal**: 将 FieldPlan 映射到统一的 EffectOp 总线，使 computed/link/source 行为通过 Middleware 管道执行，为 Debug/Query 等横切能力提供挂载点。

**Independent Test**: 在示例 Module 中，所有由 fields 驱动的状态更新与外部调用都可以在 EffectOp 时间线上被观察到，并可通过 Middleware 配置行为（例如添加简单日志中间件）。

### Tests for User Story 4（必选）

- [X] T038 [P] [US4] 为 EffectOp 类型与 Middleware 管道添加单元测试，验证中间件组合顺序与错误传播符合预期：`packages/logix-core/test/EffectOp.Core.test.ts`
- [X] T039 [P] [US4] 为 FieldKernel.install 升级后的 EffectOp 集成添加测试，验证 PlanStep 会生成对应 EffectOp（kind/name/meta）并通过 Middleware 执行：`packages/logix-core/test/FieldKernel.EffectOpIntegration.test.ts`
- [X] T040 [P] [US4] 为一个简单 Middleware 示例（如日志中间件）添加测试，验证能正确观测 Field 触发的 EffectOp：`packages/logix-core/test/Middleware.DebugLogger.test.ts`

### Implementation for User Story 4

- [X] T041 [P] [US4] 在 `EffectOp.ts` 完成 EffectOp 接口与基础构造函数（例如 `EffectOp.make` / `EffectOp.withMeta`）的实现：`packages/logix-core/src/EffectOp.ts`
- [X] T042 [P] [US4] 在 `internal/runtime/EffectOpCore.ts` 实现 MiddlewareStack 类型与组合函数（compose），以及 Runtime 内部注册/调用中间件的入口：`packages/logix-core/src/internal/runtime/EffectOpCore.ts`
- [X] T043 [US4] 在 `internal/state-field/install.ts` 中升级安装逻辑：将 PlanStep 转译为 `EffectOp(kind="state" | "service", ...)`，并调用 EffectOpCore 执行，而不是直接触碰 Bound API：`packages/logix-core/src/internal/state-field/install.ts`
- [X] T044 [US4] 在 `Runtime.ts` 中将 State/Action/Flow 等边界统一接入 EffectOp 总线（至少为 FieldKernel 相关事件接入），并预留未来 Action/Flow 集成点：`packages/logix-core/src/Runtime.ts`
- [X] T045 [P] [US4] 在 `Middleware.ts` 中暴露注册中间件的公共 API（例如 `Middleware.applyDebug`），并添加一个简单日志中间件实现：`packages/logix-core/src/Middleware.ts`
- [X] T046 [US4] 更新 Devtools/Debug reference，描述 EffectOp 作为唯一事件事实源的约束与 Middleware 挂载模式：`specs/000-module-fields-runtime/references/effectop-and-middleware.md`
- [X] T047 [US4] 在 quickstart 文档中增加“EffectOp + Middleware”视角的补充说明，帮助用户理解从 fields 到事件流的映射：`specs/000-module-fields-runtime/quickstart.md`
- [X] T048 [US4] 运行 `pnpm test --filter logix-core` 与必要的 Devtools/Debug 集成测试（如有），确保引入 EffectOp 后原有行为不回归：`packages/logix-core`

**Checkpoint**: FieldKernel 行为已经完全通过 EffectOp/Middleware 总线执行，后续的 Query / Debug / Devtools 只需在总线上挂载。

---

## Phase 6: User Story 3 - Devtools / Studio 统一消费 FieldGraph 与 Field 家族 (Priority: P2)

> 本阶段更多偏设计与接口打通，实际 UI 可以按优先级分步实现。

**Goal**: 让 Devtools / Studio 能够通过约定接口获取 FieldProgram / Graph，并在内部构建统一的结构视图，预留与其他 Field 家族的扩展点。

**Independent Test**: 至少有一个 Devtools/脚本入口可以导出某 Module 的 FieldProgram/Graph，并生成简单的结构视图或 JSON，用于 diff 与诊断。

- [X] T049 [P] [US3] 在 `packages/logix-core/src/index.ts` 中导出获取 FieldProgram/Graph 的内部调试 API（仅供 Devtools/脚本使用），例如 `CoreDebug.getModuleFields(module)`：`packages/logix-core/src/index.ts`
- [X] T050 [P] [US3] 在 Devtools 包中新增一个简单视图组件/脚本，用于展示某 Module 的 FieldGraph（可先用 JSON tree 替代图形）：`packages/logix-devtools-react/src/ui/graph/FieldGraphView.tsx`
- [X] T051 [US3] 在 Devtools/Debug reference 中补充“数据入口与结构视图协议”小节，并描述未来 ActionTrait/FlowTrait/ModuleTrait 扩展的兼容性要求：`specs/000-module-fields-runtime/references/devtools-and-debug.md`

---

## Phase 7: User Story 5 - Runtime 维护者通过 Query 环境为 FieldKernel.source 提供统一查询能力 (Priority: P2)

**Goal**: 通过 Resource / Query 命名空间接入查询引擎（如 TanStack Query），让 FieldKernel.source 声明的资源字段可以按 runtime scope 选择性走 queryClient。

**Independent Test**: 在示例 Module 中，同一 FieldKernel.source 声明在不同 RuntimeProvider 范围下可以透明地切换“直接调用 Service Tag”与“通过 QueryClient 调用”，fields 声明保持不变。

- [X] T052 [P] [US5] 在 `packages/logix-core/src/Resource.ts` 中实现 Resource.make 与 Resource.layer，封装 ResourceRegistryTag 与 ResourceSpec 注册逻辑：`packages/logix-core/src/Resource.ts`
- [X] T053 [P] [US5] 在 `packages/logix-core/src/Middleware.Query.ts` 中实现 `Query.Engine.layer` 与 `Query.Engine.middleware`，基于 `EffectOp(kind="field-source") + resourceId + keyHash` 调用引擎或 ResourceSpec.load：`packages/logix-core/src/Middleware.Query.ts`
- [X] T054 [P] [US5] 为 Resource/Query 集成添加测试（含 RuntimeProvider 作用域切换）：`packages/logix-core/test/ResourceQuery.Integration.test.ts`
- [X] T055 [US5] 更新 quickstart 示例二中的 Resource / Query 代码，使其与最终实现 API 保持一致：`specs/000-module-fields-runtime/quickstart.md`

---

## Phase 8: User Story 6 - Debug / Devtools 统一建立在 Field + EffectOp 体系之上 (Priority: P2)

**Goal**: 以 EffectOp + FieldProgram / FieldGraph 为唯一事实源，重写并统一 Debug 运行时能力；现有 Debug 模块仅作为基于 EffectOp 的内部适配/一次性迁移工具存在，不再作为对外扩展点。

**Independent Test**: 原有 Debug 功能能够通过新的 EffectOp Observer 复现并在 Devtools 中被统一观测，且不存在新增代码直接依赖旧的 Debug 接口作为扩展点。

- [X] T056 [P] [US6] 梳理当前 Debug 模块（DebugSink 等）的入口与使用点，形成迁移动线草稿：`packages/logix-core/src/internal/debug-api.ts`
- [X] T057 [P] [US6] 在 `Middleware.ts` 中实现 DebugObserver 中间件，将所有 Debug 事件统一收口到 EffectOp Observer：`packages/logix-core/src/Middleware.ts`
- [X] T058 [US6] 调整旧 Debug 接口实现，使其转而通过 EffectOp Observer 工作（适配层），并保证原有测试通过：`packages/logix-core/src/internal/debug/DebugSink.ts`
- [X] T059 [US6] 更新 Devtools/Debug reference，记录旧 Debug 向 Field+EffectOp 迁移的完成状态与剩余 TODO：`specs/000-module-fields-runtime/references/devtools-and-debug.md`
- [X] T073 [US6] 补齐基于 EffectOp 的 Debug/Devtools 回归测试（覆盖 Action/Flow/State/Service/Lifecycle 事件与 FieldGraph 结构视图），确保新路径下的观测能力覆盖原有 Debug 功能：`packages/logix-core/test`
- [X] T074 [US6] 在确认新 Debug/Devtools 测试覆盖与行为等价后，删除旧 Debug 实现及其引用，仅保留基于 EffectOp 的路径，并确保构建与测试通过：`packages/logix-core/src/internal/debug`

---

## Phase 9: User Story 7 - Devtools 面板统一承载 Debug / Field / Middleware 视图 (Priority: P3)

**Goal**: 在 Devtools 面板中统一呈现 FieldGraph 结构视图、EffectOp 时间线视图以及 Debug/Middleware 信息，并支持基本联动。

**Independent Test**: 在 Devtools UI 中可以：选择某 Module → 看到其 FieldGraph → 点击节点看到相关 EffectOp 事件 → 观察 Debug/Middleware 参与情况。

- [X] T060 [P] [US7] 在 Devtools React 包中新增 Timeline 视图组件，消费 EffectOp 流并支持基础过滤：`packages/logix-devtools-react/src/ui/timeline/EffectOpTimelineView.tsx`
- [X] T061 [P] [US7] 将 FieldGraph 视图与 Timeline 视图通过 moduleId/fieldPath/resourceId 联动起来（点击 Graph 节点自动过滤 Timeline）：`packages/logix-devtools-react/src/ui/graph/FieldGraphView.tsx`
- [X] T062 [US7] 为 Devtools/Debug 页面添加入口导航与 UX 微调，使 Debug/Field/Middleware 信息集中在一个面板内展示：`packages/logix-devtools-react/src/ui/shell/LogixDevtools.tsx`
- [X] T073 [US7] 调整 EffectOp Timeline 视图交互逻辑，实现“默认不选中事件、无选中时展示最新事件详情、再次点击已选中事件取消选中”的行为：`packages/logix-devtools-react/src/ui/inspector/Inspector.tsx`
- [X] T074 [US7] 为 EffectOp Timeline 视图新增或更新交互测试用例，覆盖“默认展示最近一条事件详情 + 选中/取消选中事件时详情区域切换”的场景：`packages/logix-devtools-react/test/EffectOpTimelineView.test.tsx`

---

## Phase 10: User Story 8 - Query 语法糖扩展 FieldKernel.source (Priority: P4 / 后续阶段)

**Goal**: 在 FieldKernel.source + Resource/Query + Middleware 主线稳定后，提供纯语法糖级别的 Query helper（如 Query.source/cachedSource），不改变 Field IR。

**Independent Test**: 使用 Query 语法糖定义的 source 字段在编译生成的 FieldProgram/Graph 上与直接使用 FieldKernel.source 完全等价，且在移除 Query layer/middleware 后仍能正常工作。

- [X] T063 [P] [US8] 在 `Middleware.Query.ts` 或单独命名空间中实现 `Query.source` 语法糖，内部直接调用 FieldKernel.source：`packages/logix-core/src/Middleware.Query.ts`
- [X] T064 [P] [US8] 为 Query 语法糖新增测试，比较使用 Query.source 与 FieldKernel.source 的 Program/Graph 输出是否等价：`packages/logix-core/test/QuerySource.SyntaxSugar.test.ts`
- [X] T065 [US8] 在 quickstart 文档的“扩展预览：基于 Query 的语法糖”小节中更新为真实 API 形态，并标明其优先级与可撤销性：`specs/000-module-fields-runtime/quickstart.md`

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: 跨故事的收尾工作（文档、性能、命名、清理旧实现）。

- [X] T066 [P] 清理并标记 `packages/logix-data` 相关实现为 PoC/废弃状态，确保对外不再新增依赖：`packages/logix-data`
- [X] T067 [P] 对 `specs/001-implement-logix-data` 等旧 spec 做归档/注释更新，指向本特性作为主线：`specs/001-implement-logix-data`
- [X] T068 整理 `docs/ssot/runtime` 与 v3 SDD 文档中与 Field/Runtime/Middleware 相关的章节，使其与本特性最终实现保持对齐：`docs/ssot/runtime`
- [X] T069 [P] 对 `packages/logix-core` 做一次命名与 API 审视（含 FieldKernel/Resource/Query/Middleware），根据奥卡姆剃刀原则精简多余概念：`packages/logix-core/src`
- [X] T070 补足缺失的单元测试与类型测试（围绕高风险路径：Graph/Plan 构造、EffectOp 中间件组合、Resource/Query 集成）：`packages/logix-core/test`
- [X] T071 在 `specs/000-module-fields-runtime/checklists/requirements.md` 中逐项勾选并记录残余风险或 TODO：`specs/000-module-fields-runtime/checklists/requirements.md`
- [X] T072 依据 quickstart 文档跑一遍从 Module 图纸 → Runtime → Devtools 的端到端体验，记录改进建议：`specs/000-module-fields-runtime/quickstart.md`
---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup** → 无前置依赖，可立即进行。
- **Phase 2: Foundational** → 依赖 Phase 1，完成 FieldKernel/EffectOp/Middleware 的骨架后，所有 User Story 才能开始。
- **Phase 3–5 (US1/US2/US4, Priority P1)** → 依赖 Phase 2，可按优先级顺序或部分并行推进：
  - US1（FieldKernel DSL + 示例）通常先行；
  - US2（build/install 与 Runtime）依赖 US1 的 DSL 与类型；
  - US4（EffectOp/Middleware）可在 US2 基本可用后开始集成。
- **Phase 6–8 (US3/US5/US6, Priority P2)** → 依赖 US1/US2/US4 完成内核能力，可并行推进 Devtools 数据入口、Query 集成与 Debug/Devtools 一体化。
- **Phase 9 (US7, Priority P3)** → 依赖 Devtools 数据入口与时间线能力。
- **Phase 10 (US8, Priority P4)** → 依赖 FieldKernel.source + Resource/Query 主线稳定。
- **Polish Phase** → 依赖所有目标 User Story 完成。

### User Story Dependencies

- **US1 (P1)**：只依赖基础设施（Phase 2），不依赖其他故事。
- **US2 (P1)**：依赖 US1 的 DSL/类型定义；完成后 Runtime 可以消费 Program。
- **US4 (P1)**：依赖 US2 的 build/install；完成后 EffectOp/Middleware 成为统一执行路径。
- **US3 (P2)**：依赖 US1/US2/US4 提供的 Program/Graph 与 EffectOp 流。
- **US5 (P2)**：依赖 US4（EffectOp 总线）与 Resource 命名空间基础实现。
- **US6 (P2)**：依赖 US4 的 EffectOp，总线作为 Debug/Devtools 一体化的唯一运行时入口。
- **US7 (P3)**：依赖 US3/US6，基于已有数据接口与 Debug 能力做 UI 整合。
- **US8 (P4)**：依赖 US5 的 Resource/Query 主线，在其之上提供语法糖。

### Parallel Opportunities

- Phase 1/2 中标记为 [P] 的任务可以按文件维度并行执行，例如：
  - T003/T004/T005/T006（不同 reference 文档）；
  - T009/T010/T011/T012/T013/T014（不同 source/test 文件）。
- 在 Foundational 完成后：
  - US1 的类型/行为实现与测试（T016–T023）可与 US2 的 build/Plan 实现（T030–T032）平行推进，只需注意接口契约；
  - US4 的 EffectOp 核心实现（T041–T042）可在 US2 的基础上并行。
- P2/P3/P4 级故事之间（US3/US5/US6/US7/US8）可以由不同开发者并行推进，只要遵守依赖关系。

---

## Implementation Strategy

### MVP 优先（聚焦 Phase 3–5：US1/US2/US4）

1. 完成 Phase 1–2，确保 FieldKernel/EffectOp/Middleware 骨架无类型/构建问题。
2. 实现并测试 US1（Phase 3）：FieldKernel DSL + 示例 Module。
3. 实现并测试 US2（Phase 4）：FieldKernel.build/install 与 Runtime 集成。
4. 实现并测试 US4（Phase 5）：EffectOp 总线 + Middleware 接入 FieldKernel 行为。
5. **STOP & VALIDATE**：
   - 使用 quickstart + 测试验证“模块作者心智 + Runtime 自动安装 + EffectOp 事件流”闭环；
   - 如有必要，先在内部仓库中试用这套能力。

### Incremental Delivery（后续扩展）

1. 在内核稳定后，推进 US3/US5/US6：Devtools 数据入口、Resource/Query 集成、Debug/Devtools 一体化。
2. 再推进 US7：Devtools UI 联动视图。
3. 最后考虑 US8：Query 语法糖与更多 helper。

### Parallel Team Strategy

若多人并行：

- 一人主攻 FieldKernel 内核与 DSL（US1 + 部分 US2）；
- 一人主攻 Runtime 集成与 EffectOp 总线（US2/US4）；
- 第三人可在内核稳定后切入 Devtools/Query/Debug（US3/US5/US6），并提前思考 Studio/Parser 对齐（US5/US7/Phase 5）。

---

## Notes

- 所有任务行遵循 `- [ ] TXXX [P?] [US?] 描述 + 路径` 规范，便于 LLM 或人类逐项执行。
- `packages/logix-core` 相关任务默认需要配套测试，优先补齐高风险路径（Graph/Plan 构造、EffectOp/Middleware、Resource/Query）。
- 在每个 Phase 结束时建议更新 `specs/000-module-fields-runtime/checklists/requirements.md` 与 spec/research/references，保持文档为单一事实源。
- 任意时刻如发现 Field / Runtime 契约与 v3 / runtime SSoT 上游文档冲突，应先调整上游设计文档，再回改本特性实现与 spec。
