# Tasks: Logic Traits in Setup

**Input**: `specs/023-logic-traits-setup/spec.md`、`specs/023-logic-traits-setup/plan.md`、`specs/023-logic-traits-setup/research.md`、`specs/023-logic-traits-setup/data-model.md`、`specs/023-logic-traits-setup/contracts/*`、`specs/023-logic-traits-setup/quickstart.md`  
**Prerequisites**: `specs/023-logic-traits-setup/plan.md`（required）、`specs/023-logic-traits-setup/spec.md`（required）

**Tests**: 本特性主落点在 `packages/logix-core`（运行时内核），测试视为必选；并补齐最小性能基线（Diagnostics=off）与诊断/证据稳定性回归。

**Organization**: 任务按用户故事分组，便于独立实现与独立验收；US2/US3 依赖 US1 的基础表面积（`$.traits.declare` 与 provenance 采集）。

## Phase 1: Foundational（Blocking Prerequisites）

**Purpose**: 在进入任意用户故事实现前，先固化“组合/冲突/来源/冻结”的最小内核与公共落点。

- [X] T001 定义 `TraitId/TraitProvenance/ModuleTraitsSnapshot` 与稳定 digest 计算：`packages/logix-core/src/internal/runtime/core/ModuleTraits.ts`
- [X] T002 扩展内部契约（RuntimeInternals.traits）：增加“注册 traits 贡献/冻结/读取快照”的接口定义：`packages/logix-core/src/internal/runtime/core/RuntimeInternals.ts`
- [X] T003 实现 per-runtime 的 traits 贡献收集/冻结/快照存储（不得进程级全局）：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`
- [X] T004 扩展 `BoundApi.traits` 类型表面积（新增 setup-only `declare`）：`packages/logix-core/src/internal/runtime/core/module.ts`
- [X] T005 实现 `$.traits.declare`（setup-only；输入必须为纯数据声明，不得引入 IO/异步；默认使用 resolved `logicUnitId` 作为 provenance；未提供时降级为 derived origin）：`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`
- [X] T006 为 provenance 注入“当前逻辑单元”上下文（对齐 `022-module` 的 resolved `logicUnitId`）：新增 `LogicUnitServiceTag`（作用域=单个 logic 的 setup/run fiber；不得写入 runtime state），并在执行每个 mounted logic 时根据 `LOGIC_UNIT_META` 提供该 service：`packages/logix-core/src/internal/runtime/ModuleRuntime.logics.ts`、`packages/logix-core/src/Module.ts`、`packages/logix-core/src/internal/runtime/core/LogicDiagnostics.ts`
- [X] T007 将 Module-level traits 改为“贡献 + 最终一次性 build/install”管线：在 `ModuleTag.implement` 注入（1）module-level contribution logic（2）finalize+install logic（确保顺序：先收集再 finalize）：`packages/logix-core/src/ModuleTag.ts`

**Checkpoint**: 运行时具备“收集 traits 贡献→确定性合并→冲突硬失败→冻结→产出快照→安装 Program”的最小闭环。

---

## Phase 2: User Story 1 - 在 Logic setup 内声明 Traits 并随组合生效 (Priority: P1) 🎯 MVP

**Goal**: Logic 成为携带 traits 能力的最小可复用单元；traits 在 setup 后冻结；可枚举最终 traits 清单与来源（Module vs LogicUnit）。

**Independent Test**: 创建一个 Logic 在 setup 调用 `$.traits.declare`，把它挂载到 Module 后启动；断言最终 traits 清单包含该 trait 且来源为该 LogicUnit；移除该 Logic 后该 trait 不再出现。

### Tests for User Story 1

- [X] T010 [P] [US1] setup declare 生效 + provenance=logicUnitId：`packages/logix-core/test/LogicTraits.Setup.Declare.test.ts`
- [X] T011 [P] [US1] 移除 Logic 后 traits 不残留：`packages/logix-core/test/LogicTraits.Setup.RemoveLogic.test.ts`
- [X] T014 [P] [US1] 冻结/阶段约束：setup 结束后（run 段或 finalize 后）调用 `$.traits.declare` 必须失败且可定位原因：`packages/logix-core/test/LogicTraits.Setup.Freeze.test.ts`

### Implementation for User Story 1

- [X] T012 [US1] 提供“最终 traits 清单”对外枚举入口（用于测试/诊断；最小字段集：traitId + name + provenance（originType/originId/originLabel/originIdKind）+ description?；顺序确定）：`packages/logix-core/src/Debug.ts`（新增 API）+ `packages/logix-core/src/internal/runtime/core/ModuleTraits.ts`
- [X] T013 [P] [US1] Quickstart 落地为可运行示例（至少复用同一个带 traits 的 Logic 于 2 个 Module）：`examples/logix/src/patterns/traits-reuse.ts`（并在至少两个 scenario 引用）

---

## Phase 3: User Story 2 - Trait 合并确定性与冲突可定位 (Priority: P2)

**Goal**: 在相同输入下，traits 合并结果与输出顺序确定；冲突时进入运行前硬失败并列出所有冲突来源。

**Independent Test**: 相同一组 logics 用不同挂载顺序装配，最终 traits 清单完全一致；两个来源声明相同 traitId 时启动前失败，并在错误中列出 traitId + 所有来源。

### Tests for User Story 2

- [X] T020 [P] [US2] 确定性：不同挂载顺序 → 相同最终 traits 清单：`packages/logix-core/test/LogicTraits.DeterministicMerge.test.ts`
- [X] T021 [P] [US2] 冲突/一致性校验：重复 traitId / 互斥 / 前置条件缺失 → 启动前失败且列出所有来源/缺失项：`packages/logix-core/test/LogicTraits.Conflict.test.ts`

### Implementation for User Story 2

- [X] T022 [US2] 实现确定性合并（稳定排序：originType + originId + traitId）+ 一致性校验（互斥/前置条件）与冲突聚合错误（可定位到所有来源）：`packages/logix-core/src/internal/runtime/core/ModuleTraits.ts`
- [X] T023 [US2] 增补诊断事件：traits 合并/冲突/冻结的结构化事件（Slim/可序列化；Diagnostics=off 近零成本）：`packages/logix-core/src/internal/runtime/core/DebugSink.ts` + finalize logic（`packages/logix-core/src/ModuleTag.ts`）

---

## Phase 4: User Story 3 - 诊断/回放可解释 Trait 来源与影响 (Priority: P3)

**Goal**: 在诊断与回放中可解释“某 trait 来自哪里/为何生效”，并可跨运行稳定复现（无随机/时间漂移）。

**Independent Test**: 同一输入重复运行两次导出证据，trait 相关事件/标识/来源链路完全一致。

### Tests for User Story 3

- [X] T030 [P] [US3] 证据稳定性：同输入两次导出 → traits 事件一致：`packages/logix-core/test/LogicTraits.Evidence.Stability.test.ts`

### Implementation for User Story 3

- [X] T031 [US3] 将 traits 快照纳入可导出证据：在 finalize logic 产出并 emit `trace:module:traits`（payload=稳定 digest/count + 可选的最终 traits 列表与 provenanceIndex；必须 Slim/可序列化），供 EvidencePackage/Devtools 消费：`packages/logix-core/src/internal/runtime/core/DebugSink.ts` + finalize logic（`packages/logix-core/src/ModuleTag.ts`）
- [X] T032 [P] [US3] 在 `trace:module:descriptor` 中补充 traits 相关锚点（digest/count），便于 Devtools 关联：`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`

---

## Phase 5: Performance & Regression Defenses（Required）

**Purpose**: 触及模块构建/初始化路径，必须提供可复现基线与回归防线。

- [X] T040 [P] perf baseline（Diagnostics=off）：模块初始化 + traits 合并/安装 p95 基线：`packages/logix-core/test/LogicTraits.Setup.Perf.off.test.ts`
- [X] T041 在 `specs/023-logic-traits-setup/plan.md` 的 Constitution Check 下补齐“基线数据/预算对比/诊断开销说明”（或新增 `specs/023-logic-traits-setup/references/perf-baseline.md` 并在 plan 引用）

---

## Phase 6: Docs / SSoT Alignment（Required if API/diagnostics change）

- [X] T050 [P] 更新 runtime SSoT：Module/Logic API 中 `$.traits.declare` 的语义、冻结与 provenance：`docs/ssot/runtime/logix-core/api/02-module-and-logic-api.md`
- [X] T051 [P] 更新 runtime SSoT：traits 合并/冲突/证据事件的协议与字段：`docs/ssot/runtime/logix-core/observability/09-debugging.md`
- [X] T052 [P] 更新用户文档：补齐 `$.traits.declare` 的语义/边界/常见踩坑（setup-only、冻结、provenance 稳定策略）：`apps/docs/content/docs/api/core/bound-api.md`
- [X] T053 [P] 更新用户文档：补齐 traits 组合的成本模型与优化梯子（默认→观察→收窄写入→稳定标识→覆盖/调优→拆分/重构）：`apps/docs/content/docs/guide/advanced/performance-and-optimization.md`
- [X] T054 [P] 补齐 React 示例模块：在 `LogicPlan.setup` 内通过 `$.traits.declare(...)` 贡献 traits（不做页面集成，仅 module 文件）：`examples/logix-react/src/modules/traits-setup-declare.ts`

---

## Dependencies & Execution Order（简版）

- Phase 1（T001–T007）完成后，US1/US2/US3 才能并行推进。
- US2/US3 依赖 Phase 1 产出的 provenance 与冻结语义；US3 额外依赖 US2 的确定性输出（用于“无漂移”断言）。
