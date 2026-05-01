# Tasks: 013 Auto Converge Planner（无视场景的及格线）

**Input**: Design documents from `/specs/013-auto-converge-planner/`
**Prerequisites**: `specs/013-auto-converge-planner/plan.md`, `specs/013-auto-converge-planner/spec.md`, `specs/013-auto-converge-planner/research.md`, `specs/013-auto-converge-planner/data-model.md`, `specs/013-auto-converge-planner/contracts/`, `specs/013-auto-converge-planner/quickstart.md`

**Note**:

- `plan.md` 的 Phase 0/1/2 是 research/design/impl planning；本 `tasks.md` 仅覆盖实现执行阶段（Implementation tasks），因此从 Phase 1 开始。
- `traitConvergeMode` 是对外配置键名；若测试夹具/runner 内部使用 `convergeMode` 等局部字段，必须在边界处显式映射并写清。
- 与 016/011 的关系：涉及 `instanceId` 单锚点、可序列化导出边界（JsonValue/错误摘要/降级）、以及 lifecycle setup-only 等横切整改，需对齐 `specs/016-serializable-diagnostics-and-identity/*` 与 `specs/011-upgrade-lifecycle/*` 的裁决源与任务拆解；如有冲突，以 contracts/SSoT 的裁决源为准。
- **实施 gate**：凡是触及 Debug/DevtoolsHub/导出边界的任务（例如新增 `field:converge` 事件位、验证 `JsonValue` 约束、off 档位近零成本）必须在 016 的 **Foundational（Phase 2）** 完成后再开始（避免 `unknown/cause/state` 对象图污染导出链路）。

## Format: `- [ ] T### [P?] [US?] Description with file path`

- **[P]**: 可并行（不同文件、无未完成依赖）
- **[US]**: 归属 User Story（仅在 US Phase 中出现：`[US1]`/`[US2]`/`[US3]`）
- 每条任务必须包含明确文件路径

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 为 converge-auto 的单测/压测提供可复用脚手架（不改语义）

- [x] T001 新增 converge-auto 共享测试夹具（构造 steps/写入分布、采集 DynamicTrace 事件）在 `packages/logix-core/test/FieldKernel.ConvergeAuto.fixtures.ts`
- [x] T002 [P] 新增 contracts 形状漂移守卫测试（reason 枚举/required 字段含 `configScope` / additionalProperties）在 `packages/logix-core/test/FieldKernel.ConvergeAuto.ContractsShape.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 所有 US 都依赖的运行时契约与管线打底

**⚠️ CRITICAL**: 未完成本阶段不得开始任何 User Story

- [x] T003 扩展 Runtime 配置类型：支持 `traitConvergeMode: "full"|"dirty"|"auto"`、`traitConvergeDecisionBudgetMs`、以及按 `moduleId` 覆盖（用于止血）；并新增一个 Provider override 的便捷 Layer 构造器（例如 `Runtime.stateTransactionOverridesLayer(...)`）在 `packages/logix-core/src/Runtime.ts`
- [x] T004 [P] 扩展 StateTransactionConfig/Env：新增 `traitConvergeDecisionBudgetMs` 与 `"auto"` 模式的内部配置形态，并定义 Provider 范围覆盖用的 `StateTransactionOverridesTag`（差量 patch/override），支持“继承全局 runtime 再叠加差量覆盖”在 `packages/logix-core/src/internal/runtime/core/env.ts`
- [x] T005 将 ModuleRuntime 的 converge 配置解析改为默认 `auto`，并实现覆盖优先级（Provider override > runtime moduleId override > runtime default > builtin）；把 resolved config 与 `configScope` 注入 converge 上下文（切换下一笔事务生效）在 `packages/logix-core/src/internal/runtime/ModuleRuntime.ts`
- [x] T006 [P] 为 DebugSink 增加可导出的 converge 事件位：新增 `kind: "field:converge"`（含 `txnId` 与 `data`，对齐 contracts；锚点必须满足 009/016：仅以 `instanceId` 作为唯一实例锚点，`moduleId+instanceId` 必填；禁止出现“第二锚点字段”，不得作为 key/引用且不得进入新导出 payload；`data/meta` 必须可 JsonValue 序列化）在 `packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [x] T007 [P] 确认 DynamicTrace 导出会保留 `kind="field:converge"` 的事件并正确裁剪/预算（不误删、不污染 off 档）在 `packages/logix-core/src/internal/debug-api.ts`
- [x] T008 定义/整理 converge 的内部类型与证据结构（requestedMode/executedMode、configScope、CacheGeneration、CacheEvidence、DecisionSummary）并对齐 `specs/013-auto-converge-planner/contracts/schemas/*.schema.json` 在 `packages/logix-core/src/internal/state-field/model.ts`
- [x] T009 在 converge 执行入口增加 requested/executed 分离的占位形态（执行层仍仅 `full|dirty`），并让 `field:converge` 事件 data 对齐 `field-converge-data.schema.json`（含 `configScope`）在 `packages/logix-core/src/internal/state-field/converge.ts`
- [x] T010 新增 converge-auto 配置裁决测试（默认值/优先级/Provider override/无效值归一化）在 `packages/logix-core/test/FieldKernel.ConvergeAuto.Config.test.ts`

**Checkpoint**: Foundation ready（类型/管线/事件位齐全）→ 可以进入 US 实现

---

## Phase 3: User Story 1 - “Auto” 模式在任何场景不低于 full（Priority: P1) 🎯 MVP

**Goal**: 默认 `auto` 在任何矩阵点不劣于 `full`，稀疏写入显著加速，并能在 trace 中解释“为何走增量”

**Independent Test**: 复用 `specs/014-browser-perf-boundaries` 跑道，对同一输入对比 `full` vs `auto`（p50/p95），断言 `auto <= full * 1.05`（硬 gate 默认在 `Diagnostics Level=off` 下跑；`light|full` 仅记录 overhead）；并在报告中记录稀疏点收益（目标 `auto <= full * 0.70`，非阻塞）

### Tests for User Story 1

- [x] T011 [P] [US1] 新增单测：冷启动第 1 笔事务必 full（cold_start）、稀疏写入下 auto 选择增量、接近全量/unknown_write 下 auto 回退 full（断言 executedMode 与 reasons）在 `packages/logix-core/test/FieldKernel.ConvergeAuto.BasicDecision.test.ts`
- [x] T012 [P] [US1] 新增单测：产出 `field:converge` 事件且 `JSON.stringify` 不失败（light/full）并携带必要锚点字段在 `packages/logix-core/test/FieldKernel.ConvergeAuto.TraceEvent.test.ts`
- [x] T013 [P] [US1] 扩展 browser perf runtime：支持 `traitConvergeMode: "auto"`（若 runner 内部仍叫 convergeMode，需显式映射）并能跑同一矩阵输入在 `packages/logix-react/test/browser/perf-boundaries/converge-runtime.ts`
- [x] T014 [US1] 扩展 converge perf matrix：覆盖 steps 规模与写入分布，增加 `auto/full <= 1.05` 断言；硬门槛绑定 014 的 `metricCategories.category=runtime`（`category=e2e` 仅记录），且默认用 `Diagnostics Level=off` 跑硬 gate（`light|full` 仅记录 overhead）在 `packages/logix-react/test/browser/perf-boundaries/converge-steps.test.tsx`
- [x] T015 [US1] 将 013 converge-auto 场景纳入 perf matrix 与报告口径：明确 `auto/full <= 1.05` gate 属于 `category=runtime`，且默认以 `Diagnostics Level=off` 作为硬 gate 环境（`light|full` 仅记录 overhead）在 `@logixjs/perf-evidence/assets/matrix.json` 与 `specs/014-browser-perf-boundaries/perf.md`

### Implementation for User Story 1

- [x] T016 [US1] 在 build/加载阶段构建 generation 内的整型映射与 topo 顺序（FieldPathId/StepId/TopoOrder），并以 Module 级注册表形式暴露（hot: path→id；cold: id→path 仅 debug/导出；导出时 FieldPath 采用 `specs/009-txn-patch-dirtyset/contracts/schemas/field-path.schema.json` 的段数组口径；`StepId -> output FieldPathId` 采用 `stepOutFieldPathIdByStepId` 紧凑数组）供 converge 热路径复用在 `packages/logix-core/src/internal/state-field/build.ts` 与 `packages/logix-core/src/internal/runtime/ModuleRuntime.ts`
- [x] T017 [US1] 实现 “Dirty Pattern canonical key = 归一化 roots → FieldPathId[]” 的纯整数化 key（避免字符串拼接 key）在 `packages/logix-core/src/internal/field-path.ts`
- [x] T018 [US1] 在 converge 内引入最小 `ConvergePolicy`：`requestedMode=auto` 时只在“确定更快”时走 dirty，否则回退 full；并保证执行层仍仅 `full|dirty` 在 `packages/logix-core/src/internal/state-field/converge.ts`
- [x] T019 [US1] 增加最小 Execution Plan Cache（命中复用 plan，miss 走保守路径），并在 evidence 中输出 hit/miss/size/evict 基础字段在 `packages/logix-core/src/internal/state-field/converge.ts`
- [x] T020 [US1] 写入 `field:converge` 事件（kind 固定、data 对齐 contracts，含 `configScope` 与 `staticIrDigest=instanceId+\":\"+generation`），并确保 `off|light|full` 分档下字段裁剪与近零成本：`off` 不产出任何可导出的 `field:converge` 事件/摘要；`light` 下 `data.dirty` 仅允许 `dirtyAll`（不输出 `roots/rootIds`）；`full` 下 `data.dirty` 允许输出受控的 roots 摘要：`rootCount` + `rootIds` 前 K 个（默认 K=3）+ `rootIdsTruncated=true|false`（禁止全量 `rootIds` 列表；`rootIds` 为 `FieldPathId` 样本，应可通过 `ConvergeStaticIR.fieldPaths`（`FieldPath[]`，复用 009 schema）映射回可读路径）；同时 `full` 必须确保 EvidencePackage 内按 `staticIrDigest` 去重导出对应的 `ConvergeStaticIR` 到 `EvidencePackage.summary.converge.staticIrByDigest` 供离线解释/回放；并保持 `state:update.fieldSummary.converge` 与该事件同口径在 `packages/logix-core/src/internal/runtime/ModuleRuntime.ts` 与 `packages/logix-core/src/internal/runtime/core/DebugSink.ts`

**Checkpoint**: US1 可独立验收（014 跑道达标 + trace 可解释）

---

## Phase 4: User Story 2 - 决策可解释、可调参、可回退（Priority: P2)

**Goal**: 每笔事务都能解释选择依据；覆盖/回退遵循“更局部赢”（Provider override > runtime moduleId override）；对外文档形成稳定心智模型（注意：Devtools 的 converge performance pane / Audits 属于后续独立 spec，不在 013 实现任务内）

**Independent Test**: 单测构造写入分布，断言摘要字段齐全且可 JSON 序列化；模块级覆盖后下一笔事务立即生效且不污染其他模块/实例

### Tests for User Story 2

- [x] T021 [P] [US2] 新增单测：覆盖优先级（Provider override > runtime moduleId override > runtime default）与热切换下一笔事务生效（验证 `configScope`）在 `packages/logix-core/test/FieldKernel.ConvergeAuto.ModuleOverride.test.ts`
- [x] T022 [P] [US2] 新增单测：evidence 字段覆盖（requested/executed/configScope/reasons/stepStats/cache/generation/`staticIrDigest=instanceId+\":\"+generation`；`full` 时 EvidencePackage 按 digest 去重导出 `ConvergeStaticIR` 到 `EvidencePackage.summary.converge.staticIrByDigest`；`light` 仅 digest）并可 `JSON.stringify` 在 `packages/logix-core/test/FieldKernel.ConvergeAuto.EvidenceShape.test.ts`
- [x] T023 [P] [US2] 新增单测：`off|light|full` 分档下事件存在性与字段裁剪（`off` 不产生任何可导出的 `field:converge` 事件/摘要；`light` 最小且 `data.dirty` 仅 `dirtyAll`；`full` 仅允许 roots 摘要：`rootCount` + `rootIds` 前 K 个（默认 K=3）+ `rootIdsTruncated`）在 `packages/logix-core/test/FieldKernel.ConvergeAuto.DiagnosticsLevels.test.ts`

### Implementation for User Story 2

- [x] T024 [US2] 落地覆盖载体：runtime 的按 `moduleId` 覆盖（可更新、可观测；下一笔事务读取最新值）+ Provider override 的差量覆盖（Layer/Tag，不新建 runtime 复制 middleware/layer）在 `packages/logix-core/src/internal/runtime/core/env.ts`、`packages/logix-core/src/internal/runtime/ModuleRuntime.ts` 与 `packages/logix-core/src/Runtime.ts`
- [x] T025 [US2] 扩展 `Planner Evidence`：把“本次使用的阈值/预算/触发原因/配置来源（`configScope`）”写入 evidence（覆盖导致模式变化时含 `module_override` reason）在 `packages/logix-core/src/internal/state-field/converge.ts`
- [x] T026 [P] [US2] 更新 Runtime SSoT：补齐 converge 的 `auto` 语义口径（requested/executed、下界、止损、缓存证据）在 `docs/ssot/runtime/logix-core/runtime/05-runtime-implementation.md`
- [x] T027 [P] [US2] 更新 Debug 协议 SSoT：固化 `field:converge` 事件/`fieldSummary.converge` 摘要的最小可用结构与分档裁剪规则在 `docs/ssot/runtime/logix-core/observability/09-debugging.md`
- [x] T028 [P] [US2] 更新用户文档：默认 auto、Provider/module 覆盖优先级与作用域、如何读证据字段、以及如何从证据推导“止血→纳入边界地图→回收覆盖”的闭环在 `apps/docs/content/docs/guide/advanced/debugging-and-devtools.md`

**Checkpoint**: US2 可独立验收（解释/回退/文档齐备）

---

## Phase 5: User Story 3 - 负优化被系统性遏制（Priority: P3)

**Goal**: 决策开销有硬上界（超时止损回退 full）；缓存有上界与低命中自保；generation 变化严格失效且抖动可解释

**Independent Test**: 构造性单测覆盖 cold-start / near-full / budget cut-off / 高基数低命中 / generation bump；证据字段可证明“止损生效、无界增长不发生”

### Tests for User Story 3

- [x] T029 [P] [US3] 新增单测：决策超出 `traitConvergeDecisionBudgetMs` 触发 `budget_cutoff` 并回退 full 在 `packages/logix-core/test/FieldKernel.ConvergeAuto.DecisionBudget.test.ts`
- [x] T029a [P] [US3] 增加一组 “小 steps / 简单列表” 的对抗性样例：验证决策开销不会把 auto 逼到长期回退 full（必要时触发 `budget_cutoff` 且 evidence 可解释），作为 010 场景的前置压力测试（不引入 form 语义/特判）在 `packages/logix-core/test/FieldKernel.ConvergeAuto.DecisionBudget.SmallSteps.test.ts`
- [x] T030 [P] [US3] 新增单测：缓存容量上界与逐出统计 + 低命中率自我保护（disabled/disableReason）在 `packages/logix-core/test/FieldKernel.ConvergeAuto.PlanCacheProtection.test.ts`
- [x] T031 [P] [US3] 新增单测：generation bump 导致缓存严格失效（missReason/generation_bumped）且高频抖动触发保守策略在 `packages/logix-core/test/FieldKernel.ConvergeAuto.GenerationInvalidation.test.ts`
- [x] T032 [P] [US3] 新增 CI 约束门：auto 决策路径不得引入 `Promise`/`Effect.async`/`Effect.promise`/`Effect.tryPromise`（静态扫描/单测断言）在 `packages/logix-core/test/FieldKernel.ConvergeAuto.NoAsyncGuard.test.ts`

### Implementation for User Story 3

- [x] T033 [US3] 落地决策预算止损：测量/采样 `decisionDurationMs`，超预算立刻终止并回退 full（写入 evidence）在 `packages/logix-core/src/internal/state-field/converge.ts`
- [x] T034 [US3] 抽出 Execution Plan Cache 为可复用组件（LRU/容量/统计/自保）并与 converge 集成在 `packages/logix-core/src/internal/state-field/plan-cache.ts` 与 `packages/logix-core/src/internal/state-field/converge.ts`
- [x] T035 [US3] 引入 Cache Generation：generation++ 触发源有限枚举、整体失效、证据字段可观测（lastBumpReason/bumpCount）在 `packages/logix-core/src/internal/state-field/install.ts` 与 `packages/logix-core/src/internal/state-field/build.ts`
- [x] T036 [US3] 在 generation 高频抖动/高基数低命中时触发断路器策略（优先回退 full 或暂时禁用复用）并写入 evidence 在 `packages/logix-core/src/internal/state-field/converge.ts`
- [x] T037 [P] [US3] 扩展 014 对抗性边界用例：高基数低命中/重复命中/列表归一化/失效路径可对比在 `packages/logix-react/test/browser/perf-boundaries/negative-dirty-pattern.test.tsx`

**Checkpoint**: US3 可独立验收（对抗性场景不放大风险）

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 收尾迁移说明、历史文档漂移修复、证据固化

- [x] T038 [P] 标注/更新历史 spec 默认口径（`full|dirty` → 013 引入 `auto` 默认）在 `specs/007-unify-field-system/review.md`
- [x] T039 [P] 记录 breaking change 与迁移路径（默认 auto、回退 full、证据字段/事件）在 `docs/ssot/handbook/reading-room/reviews/99-roadmap-and-breaking-changes.md`
- [x] T040 [P] 对齐并补充 quickstart 示例（覆盖 Provider override + moduleId override + `configScope` 等 evidence 字段）在 `specs/013-auto-converge-planner/quickstart.md`
- [x] T041 固化 014 跑道证据包（更新 after 报告并保证可复现口径）在 `specs/014-browser-perf-boundaries/perf/after.worktree.json`
- [x] T042 [P] 回归确认 SlimOp 截断/预算（NFR-009）：加固断言（full 档位 payload/meta 截断、事件预算上界、可 JSON.stringify）在 `packages/logix-core/test/Middleware.DebugObserver.test.ts` 与 `packages/logix-core/test/Debug.test.ts`
- [x] T043 [P] 执行质量门并记录结果：`pnpm typecheck`/`pnpm lint`/`pnpm test` + 014 浏览器压测子集在 `specs/013-auto-converge-planner/checklists/quality-gates.md`
- [x] T044 [P] 回归正确性语义（FR-007）：cycle/multi-writer/unknown-write 在 `auto` 下仍硬失败或回退全量且可解释（不得被缓存/自保吞掉）在 `packages/logix-core/test/FieldKernel.ConvergeAuto.CorrectnessInvariants.test.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**：无依赖，可立即开始
- **Foundational (Phase 2)**：依赖 Phase 1；阻塞所有 User Story
- **User Stories (Phase 3–5)**：依赖 Phase 2；建议按 P1 → P2 → P3 逐步交付
- **Polish (Phase 6)**：依赖完成所需的 User Story（至少完成 US1/US2 后再写迁移与用户文档更稳）

### User Story Dependencies

- **US1 (P1)**：MVP，依赖 Foundational；其产出（auto 基线 + 014 门槛）会被 US2/US3 复用
- **US2 (P2)**：依赖 Foundational；建议在 US1 稳住后再做（避免 evidence/schema 反复改动）
- **US3 (P3)**：依赖 Foundational；与 US1/US2 共享 converge 内核，建议最后集中做对抗性与自保

---

## Parallel Example: User Story 1

```text
并行写法示例（不同文件）：

- [P] [US1] packages/logix-core/test/FieldKernel.ConvergeAuto.BasicDecision.test.ts
- [P] [US1] packages/logix-core/test/FieldKernel.ConvergeAuto.TraceEvent.test.ts
- [P] [US1] packages/logix-react/test/browser/perf-boundaries/converge-runtime.ts
```

---

## Parallel Example: User Story 2

```text
并行写法示例（不同文件）：

- [P] [US2] packages/logix-core/test/FieldKernel.ConvergeAuto.ModuleOverride.test.ts
- [P] [US2] docs/ssot/runtime/logix-core/runtime/05-runtime-implementation.md
- [P] [US2] apps/docs/content/docs/guide/advanced/debugging-and-devtools.md
```

---

## Parallel Example: User Story 3

```text
并行写法示例（不同文件）：

- [P] [US3] packages/logix-core/test/FieldKernel.ConvergeAuto.DecisionBudget.test.ts
- [P] [US3] packages/logix-core/test/FieldKernel.ConvergeAuto.NoAsyncGuard.test.ts
- [P] [US3] packages/logix-react/test/browser/perf-boundaries/negative-dirty-pattern.test.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 + Phase 2 → 先让类型/管线/事件位对齐
2. Phase 3（US1）→ 先用“保守可证明”的 auto 站稳 `auto <= full * 1.05`
3. 以 014 跑道验收并固化证据包，再进入 US2/US3

### Incremental Delivery

1. US1：下界 + 稀疏收益 + 可解释最小证据
2. US2：模块级覆盖/回退 + SSoT/用户文档对齐
3. US3：预算止损 + 缓存自保 + generation 失效/抖动保护 + 对抗性边界地图
