# Tasks: Field 系统统一（Form 形状 × Kernel 性能 × 可回放）

**Input**: `specs/007-unify-field-system/spec.md`、`specs/007-unify-field-system/plan.md`、`specs/007-unify-field-system/research.md`、`specs/007-unify-field-system/data-model.md`、`specs/007-unify-field-system/contracts/*`、`specs/007-unify-field-system/quickstart.md`
**Prerequisites**: `specs/007-unify-field-system/plan.md`（required）、`specs/007-unify-field-system/spec.md`（required）

**Tests**: 本特性主落点在 `packages/logix-core`（运行时内核），测试视为必选；领域包（`packages/logix-form`、`packages/logix-query`）与 Devtools（`packages/logix-devtools-react`）新增能力也应有最小覆盖。

**Organization**: 任务按用户故事分组，便于独立实现与独立验收；但 US1/US4 会依赖 US2 的内核能力（见文末依赖图）。

## Phase 1: Setup（Shared Infrastructure）

**Purpose**: 为 Form/Query 领域包与后续测试准备最小工程骨架（不包含业务实现）

- [x] T001 创建 `packages/logix-form/package.json` 与 `packages/logix-query/package.json`（新增目录 `packages/logix-query/`）
- [x] T002 [P] 创建 `packages/logix-form/tsconfig.json`、`packages/logix-form/tsconfig.test.json`、`packages/logix-query/tsconfig.json`、`packages/logix-query/tsconfig.test.json`
- [x] T003 [P] 创建入口文件 `packages/logix-form/src/index.ts`、`packages/logix-query/src/index.ts`
- [x] T004 [P] 创建 React 薄适配入口 `packages/logix-form/src/react/index.ts`、`packages/logix-query/src/react/index.ts`
- [x] T005 [P] 初始化测试目录 `packages/logix-form/test/` 与 `packages/logix-query/test/`（并在对应 package.json 添加 `test`/`typecheck` 脚本）

---

## Phase 2: Foundational（Blocking Prerequisites）

**Purpose**: 全链路共享的内核抽象与“可被领域包依赖”的最小公共契约（在进入 US1/US2/US4 前必须具备）

**⚠️ CRITICAL**: 该阶段未完成前，任何 Form/Query 的默认逻辑都无法稳定落到同一条内核运行语义。

- [x] T006 新增 FieldLifecycle 公共入口 `packages/logix-core/src/FieldLifecycle.ts` 并在 `packages/logix-core/src/index.ts` 导出
- [x] T007 [P] 定义 FieldLifecycle 数据模型（FieldRef/ValidateRequest/ExecuteRequest/CleanupRequest）于 `packages/logix-core/src/internal/field-lifecycle/model.ts`
- [x] T008 实现 FieldLifecycle 基础壳（install/ref/scoped validate/execute/cleanup 的最小可调用形状）于 `packages/logix-core/src/internal/field-lifecycle/index.ts`
- [x] T009 更新 FieldKernel 对外 DSL 入口 `packages/logix-core/src/FieldKernel.ts`：补齐 `node/list/$root/check` 的最小表面积（先类型/结构对齐 contracts）
- [x] T010 更新 FieldKernel 核心模型 `packages/logix-core/src/internal/state-field/model.ts`：引入显式 `deps`（computed/source/check）与“错误树写回（check）”的 IR 形状（先结构，再行为）
- [x] T011 [P] 新增依赖图与计划模块骨架 `packages/logix-core/src/internal/state-field/graph.ts`、`packages/logix-core/src/internal/state-field/plan.ts`、`packages/logix-core/src/internal/state-field/reverse-closure.ts`
- [x] T012 [P] 在 Debug 事件模型中预留“Field 收敛摘要/回放事件”字段，更新 `packages/logix-core/src/internal/runtime/core/DebugSink.ts`

**Checkpoint**: `@logixjs/core` 能暴露 FieldLifecycle/FieldKernel 的“可编译可引用”公共契约，领域包可以开始实现 Blueprint/Controller 的静态结构与 action 约定。

---

## Phase 3: User Story 1 - 复杂表单在规模与联动下仍可用 (Priority: P1) 🎯

**Goal**: 业务侧以 Form-first 写法（Blueprint/Controller + imports 同源）构建复杂表单：数组/校验/交互态全双工/异步约束，不引入第二套状态事实源。

**Independent Test**: 在 `packages/logix-form/test/*` 或 `examples/logix-react/*` 里跑一个固定输入脚本（含数组增删/插入/重排、联动、异步 key 变空），断言错误树/交互态/资源快照结果稳定且可回放。

### Implementation for User Story 1

- [x] T013 [P] [US1] 实现 Form 领域 DSL 基础：`packages/logix-form/src/dsl/node.ts`、`packages/logix-form/src/dsl/list.ts`、`packages/logix-form/src/dsl/fields.ts`
- [x] T014 [P] [US1] 实现 `Form.Rule.make` 与规则组合能力：`packages/logix-form/src/rule.ts`
- [x] T015 [P] [US1] 实现 `Form.Error.*`（同构错误树/列表与行级错误封装）：`packages/logix-form/src/error.ts`
- [x] T016 [P] [US1] 实现默认 Schema Path Mapping（覆盖常见 rename/结构映射/数组内对齐）与 errorMap 逃生舱：`packages/logix-form/src/schema-path-mapping.ts`
- [x] T017 [US1] 实现 `Form.make`（Blueprint/Controller/Program/logics 骨架）并从 `packages/logix-form/src/index.ts` 导出
- [x] T018 [US1] 将 Form 默认 logics 绑定到 FieldLifecycle：`packages/logix-form/src/logics/install.ts`（依赖 T006~T008）
- [x] T019 [P] [US1] 实现 React 薄投影：`packages/logix-form/src/react/useForm.ts`、`packages/logix-form/src/react/useField.ts`、`packages/logix-form/src/react/useFieldArray.ts`

### Tests for User Story 1

- [x] T020 [P] [US1] 新增 Blueprint 基础测试（Blueprint→Module→Runtime 可跑通）：`packages/logix-form/test/FormBlueprint.basic.test.ts`
- [x] T021 [P] [US1] 新增数组行为测试（append/prepend/remove/move/swap + 错误同构对齐）：`packages/logix-form/test/FormBlueprint.array.test.ts`
- [x] T022 [P] [US1] 新增“异步 key 变空同步 idle 清空”测试样例：`packages/logix-form/test/FormBlueprint.resource-idle.test.ts`

### Demo / Quickstart Alignment

- [x] T023 [US1] 增补/更新复杂表单 Demo（Form-first 写法）：`examples/logix-react/src/demos/ComplexFieldFormDemoLayout.tsx`

**Checkpoint**: 业务开发者仅使用 `@logixjs/form` 即可写出复杂表单；UI 层不维护第二套 touched/dirty/errors；表单可通过 Root `imports` 同源组合。

---

## Phase 4: User Story 2 - 单次操作窗口内派生收敛且可解释 (Priority: P1)

**Goal**: Field 派生/校验/资源写回在 Operation Window 内收敛并 0/1 次可观察提交；依赖图驱动最小触发与 Reverse Closure scoped validate；配置错误硬失败、超预算/运行时错误软降级；诊断默认可用且可复现。

**Independent Test**: `packages/logix-core/test/*` 中可独立断言：0/1 commit、Reverse Closure 的最小执行范围、冲突/循环诊断、超预算软降级、以及诊断摘要可对比。

### Tests for User Story 2

- [x] T024 [P] [US2] 新增 Reverse Closure scoped validate 测试：`packages/logix-core/test/FieldKernel.ScopedValidate.test.ts`
- [x] T025 [P] [US2] 新增“单次 dispatch 0/1 次可观察提交 + txnId 一致”回归：`packages/logix-core/test/Runtime.OperationSemantics.test.ts`
- [x] T026 [P] [US2] 新增“冲突写回/循环依赖硬失败（阻止提交）”回归：`packages/logix-core/test/FieldKernel.ConfigErrors.test.ts`
- [x] T027 [P] [US2] 新增“超预算/运行时错误软降级（提交基础字段、派生冻结）”回归：`packages/logix-core/test/FieldKernel.Degrade.test.ts`
- [x] T028 [P] [US2] 新增 RowID 映射 + cleanup + in-flight 门控的测试矩阵：`packages/logix-core/test/FieldKernel.RowIdMatrix.test.ts`
- [x] T029 [P] [US2] 新增 dev-mode deps 一致性诊断测试：`packages/logix-core/test/FieldKernel.DepsDiagnostics.test.ts`

### Implementation for User Story 2

- [x] T030 [US2] 强制显式 deps：在 `FieldKernel.build` 中对缺失 deps 失败并给出可定位诊断：`packages/logix-core/src/internal/state-field/build.ts`
- [x] T031 [P] [US2] 构建 DependencyGraph（含 reverse adjacency）并产出 Plan：`packages/logix-core/src/internal/state-field/graph.ts`、`packages/logix-core/src/internal/state-field/plan.ts`
- [x] T032 [P] [US2] 实现 ReverseClosure 计算：`packages/logix-core/src/internal/state-field/reverse-closure.ts`
- [x] T033 [US2] 实现 scoped validate（按 ReverseClosure 最小集合执行 check 并写回错误树）：`packages/logix-core/src/internal/state-field/validate.ts`（新增文件）
- [x] T034 [US2] 实现事务内收敛引擎（脏集传播 + 等价跳过 + fixed point）：`packages/logix-core/src/internal/state-field/converge.ts`（新增文件）
- [x] T035 [US2] 将收敛引擎接入 Operation Window（reducer → converge → commit 0/1）：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`
- [x] T036 [US2] 调整 `FieldKernel.install`：computed/link 不再安装 watcher；改为注册 Program 给 runtime；保留 source 的显式 refresh 入口：`packages/logix-core/src/internal/state-field/install.ts`
- [x] T037 [US2] 实现 ResourceSnapshot 状态机 + keyHash 门控 + 并发策略（switch / exhaust-trailing）：`packages/logix-core/src/Resource.ts`、`packages/logix-core/src/internal/state-field/source.ts`（新增文件）
- [x] T038 [P] [US2] 实现 dev-mode deps 运行时侦测（Proxy 追踪读取路径）与差异报警：`packages/logix-core/src/internal/state-field/deps-trace.ts`（新增文件）
- [x] T039 [US2] 将 deps mismatch/最小触发/Top3 成本摘要写入诊断事件：`packages/logix-core/src/internal/runtime/core/DebugSink.ts`、`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
- [x] T040 [US2] 实现 RowID 虚拟身份层与 mapping 更新：`packages/logix-core/src/internal/state-field/rowid.ts`（新增文件）并接入 list 相关路径解析与 cleanup

### Devtools Alignment（最小可用）

- [x] T041 [P] [US2] Devtools 展示“窗口级 Field 收敛摘要/Top3 成本/降级原因”：`packages/logix-devtools-react/src/ui/summary/OperationSummaryBar.tsx`
- [x] T042 [P] [US2] Devtools 展示 deps mismatch 警告与定位信息：`packages/logix-devtools-react/src/ui/inspector/Inspector.tsx`
- [x] T043 [P] [US2] 更新 Devtools 回归用例：`packages/logix-devtools-react/test/OverviewStrip.test.tsx`、`packages/logix-devtools-react/test/TimeTravel.test.tsx`

**Checkpoint**: 内核兑现 0/1 commit、最小触发、可解释诊断与分级失败语义；RowID 机制在强测试矩阵下稳定。

---

## Phase 5: User Story 3 - 回放可复现 + Schema 错误归属可控 (Priority: P2)

**Goal**: Replay Mode 不发真实网络请求，基于事件日志重赛资源/查询结果；Schema 解码错误默认可自动归属到 View 层路径（覆盖大多数常见映射），复杂场景可用 errorMap 兜底。

**Independent Test**: 用录制事件驱动一次回放：验证资源状态变化序列与 payload 一致；并验证 Schema 错误在“自动归属/手动 errorMap”两条路径下都稳定写入错误树。

### Implementation for User Story 3

- [x] T044 [P] [US3] 定义 ReplayLog 与事件模型存储：`packages/logix-core/src/internal/runtime/core/ReplayLog.ts`（新增文件）
- [x] T045 [US3] 记录资源快照事件（loading/success/error）并写入 ReplayLog：`packages/logix-core/src/internal/state-field/source.ts`
- [x] T046 [US3] 记录 Query invalidate 事件并写入 ReplayLog：`packages/logix-core/src/internal/field-lifecycle/index.ts`
- [x] T047 [US3] 增加 Replay Mode 开关（Tag/Layer）并在 source 执行路径切换为 re-emit：`packages/logix-core/src/internal/runtime/core/env.ts`、`packages/logix-core/src/internal/state-field/source.ts`
- [x] T048 [US3] 将回放事件与诊断事件字段对齐（resourceId/keyHash/txnId/trigger）：`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [x] T049 [US3] 补齐“Schema Path Mapping → ErrorTree 写回”的集成入口：`packages/logix-form/src/schema-error-mapping.ts`（新增文件）

### Tests for User Story 3

- [x] T050 [P] [US3] 回放模式不触发真实请求的回归测试：`packages/logix-core/test/ReplayMode.Resource.test.ts`
- [x] T051 [P] [US3] 回放模式下重赛顺序与 payload 一致性的回归测试：`packages/logix-core/test/ReplayMode.Sequence.test.ts`
- [x] T052 [P] [US3] Schema Path Mapping 覆盖 rename/flatten/array 的单测：`packages/logix-form/test/SchemaPathMapping.test.ts`
- [x] T053 [P] [US3] Schema 错误“自动归属 vs errorMap 兜底”一致性的单测：`packages/logix-form/test/SchemaErrorMapping.test.ts`

**Checkpoint**: Replay Mode 可复现资源/查询结果演进且不打真实网络；Schema 错误归属在绝大多数常见映射下无需手写 errorMap。

---

## Phase 6: User Story 4 - 查询场景的自动触发与缓存复用 (Priority: P2)

**Goal**: Query 作为对照领域：支持 `autoRefresh`（onMount/onDepsChange + debounce）与 `autoRefresh=false`（仅显式 refresh）、switch/exhaust(trailing) 并发语义、缓存复用与 in-flight 去重（委托外部引擎），并通过 `Query.Engine` + `Query.Engine.layer()` 以 DI 注入（以 `Query.Engine.middleware()` 作为引擎接管点）。

**Independent Test**: 在 `packages/logix-query/test/*` 中跑“10 次快速参数变更 + 10 次重复参数触发”的基准：旧结果覆盖次数=0，重复 loading 次数≤1，并能解释触发来源与复用原因。

### Implementation for User Story 4

- [x] T054 [P] [US4] 实现 `Query.Engine` 与 `Query.Engine.layer`：`packages/logix-query/src/engine.ts`
- [x] T055 [P] [US4] 实现 QueryBlueprint（make/impl/initial/logics/controller）骨架：`packages/logix-query/src/query.ts`
- [x] T056 [P] [US4] 实现 Query DSL（queries/autoRefresh/concurrency/deps）降解到 FieldKernelSpec：`packages/logix-query/src/fields.ts`
- [x] T057 [US4] 实现 TanStack QueryObserver 集成（scope 内订阅/cleanup）：`packages/logix-query/src/tanstack/observer.ts`
- [x] T058 [US4] 实现自动触发（onMount/onDepsChange + debounce）与 `autoRefresh=false`（仅显式 refresh）语义：`packages/logix-query/src/internal/logics/auto-trigger.ts`
- [x] T059 [US4] 实现 invalidate/refresh 的事件化（FieldLifecycle.execute + ReplayLog 记录）：`packages/logix-query/src/logics/invalidate.ts`

### Tests for User Story 4

- [x] T060 [P] [US4] 竞态正确性回归（10 次快速变更，旧结果覆盖次数=0）：`packages/logix-query/test/Query.Race.test.ts`
- [x] T061 [P] [US4] 缓存复用回归（重复触发相同参数，loading 次数≤1）：`packages/logix-query/test/Query.CacheReuse.test.ts`
- [x] T062 [P] [US4] 失效/刷新回归（invalidate 进入事件日志，触发后续刷新）：`packages/logix-query/test/Query.Invalidate.test.ts`
- [x] T063 [P] [US4] 缺失 `Query.Engine` 注入视为配置错误的回归：`packages/logix-query/test/Query.MissingClient.test.ts`

### Demo / Quickstart Alignment

- [x] T064 [US4] 增补查询对照 Demo（搜索 + 详情联动）：`examples/logix-react/src/demos/QuerySearchDemoLayout.tsx`

**Checkpoint**: Query 领域在不引入第二套事实源的前提下，具备自动触发、缓存复用、竞态门控、失效与回放口径。

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: SSoT 回写、用户文档体验、以及 SHOULD 项（非阻塞）

- [x] T065 [P] 更新 runtime SSoT（事务内收敛、deps/graph、预算/降级）：`docs/ssot/runtime/logix-core/runtime/05-runtime-implementation.md`
- [x] T066 [P] 更新 runtime SSoT（诊断/txn 聚合/回放口径）：`docs/ssot/runtime/logix-core/observability/09-debugging.md`
- [x] T067 [P] 更新 runtime SSoT（FieldLifecycle 与 ModuleLogic 关系）：`docs/ssot/runtime/logix-core/api/02-module-and-logic-api.md`
- [x] T068 [P] 同步术语表（FieldRef/Reverse Closure/Replay Log 等）：`docs/ssot/runtime/logix-core/concepts/10-runtime-glossary.md`
- [x] T069 [P] 用户文档补齐 Form/Query 同源 imports 的指南：`apps/docs/content/docs/guide/learn/deep-dive.md`
- [x] T070 [P] 用户文档补齐性能与优化指南（Field/事务/诊断）：`apps/docs/content/docs/guide/advanced/performance-and-optimization.md`

### Optional（SHOULD，非阻塞）

- [x] T071 [P] 最小可用 codegen（生成 Form/Query 骨架 + deps 模板）：`scripts/logix-codegen.ts`
- [x] T072 [P] 元信息白名单 + canonical 选择规则（规则/资源/领域声明）：`packages/logix-core/src/internal/state-field/meta.ts`（新增文件）
- [x] T073 [P] Devtools 展示元信息（label/tags 等）与冲突提示：`packages/logix-devtools-react/src/ui/graph/FieldGraphView.tsx`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 可立即开始
- **Foundational (Phase 2)**: 依赖 Setup 完成，且阻塞所有用户故事（提供公共契约）
- **US1/US4**: 依赖 Foundational；其“最终验收”依赖 US2 的内核语义落地
- **US2**: 依赖 Foundational；是 US1/US4 的内核前置
- **US3**: 依赖 US2（事件/资源执行链路稳定）与 US1（Schema 错误写回入口）
- **Polish (Phase 7)**: 依赖已完成的用户故事（按需要选择完成范围）

### User Story Dependencies

- **US1 (P1)**: 结构实现可并行推进，但验收依赖 US2（0/1 commit、最小触发、清理与门控）
- **US2 (P1)**: 核心引擎与诊断能力，建议优先落地
- **US3 (P2)**: 依赖 US2 的 replay/事件口径；Schema path mapping 的测试可并行推进
- **US4 (P2)**: 依赖 US2 的 source/keyHash 门控；Query 包骨架与 DI 可提前并行

---

## Parallel Examples

### US1 并行示例

```text
Task: "实现 Form DSL：packages/logix-form/src/dsl/*"
Task: "实现 Rule/Error：packages/logix-form/src/rule.ts + packages/logix-form/src/error.ts"
Task: "实现 React 薄投影：packages/logix-form/src/react/*"
```

### US2 并行示例

```text
Task: "实现 graph/plan/reverse-closure：packages/logix-core/src/internal/state-field/{graph,plan,reverse-closure}.ts"
Task: "实现 converge/validate：packages/logix-core/src/internal/state-field/{converge,validate}.ts"
Task: "实现 deps-trace：packages/logix-core/src/internal/state-field/deps-trace.ts"
```

---

## Implementation Strategy

### MVP（优先闭环）

1. 完成 Phase 1~2（公共契约与工程骨架）
2. 优先完成 US2 的最小内核闭环（deps→graph→converge→0/1 commit + 最小诊断）
3. 完成 US1（Form-first 复杂表单 Demo + 测试）
4. **停止并验收**：对照 SC-001~SC-006 与 US1/US2 的 Independent Test

### 增量交付

1. 在 US1/US2 稳定后推进 US3（Replay + Schema error mapping）
2. 最后推进 US4（Query 对照组），并补齐缓存复用/失效/回放口径
3. Phase 7 的 docs 与 SHOULD 项按收益择机推进
