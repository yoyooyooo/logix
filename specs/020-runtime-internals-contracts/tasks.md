---
description: 'Task list for 020-runtime-internals-contracts'
---

# Tasks: Runtime Internals Contracts（Runtime Services + RuntimeInternals + RunSession 证据/IR + Reflection + 全链路迁移）

**Input**: Design documents from `specs/020-runtime-internals-contracts/`
**Prerequisites**: `specs/020-runtime-internals-contracts/plan.md`, `specs/020-runtime-internals-contracts/spec.md`

**Tests**: 本特性触及 `packages/logix-core` 核心路径与内部协议，测试与回归防线视为必需（含 contracts/schema 预检 + 基线对比 + 试跑隔离验证）。

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 为“重构不回退 + 证据可解释 + 可试运行”准备可复现产物落点与校验脚手架。

- [X] T001 创建 020 性能产物目录与说明：`specs/020-runtime-internals-contracts/perf/README.md`, `specs/020-runtime-internals-contracts/perf/.gitkeep`, `specs/020-runtime-internals-contracts/perf.md`
- [X] T002 [P] 复用 014 runner 固化 020 的 before/after/diff 命令模板与命名约定：`specs/020-runtime-internals-contracts/perf/README.md`（进入 Phase 2 前必须采集并落盘 before 基线：diagnostics=off 与 diagnostics=on 各一份；摘要写入 `specs/020-runtime-internals-contracts/perf.md`；将 SC-004/SC-006 映射到 suite/指标/证据字段/预算）
- [X] T003 [P] 增加 contracts 预检测试（020 schemas JSON 可解析 + 与 005/013 引用关系正确）：`packages/logix-core/test/Contracts.020.RuntimeInternalsContracts.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 先把“内部契约入口 + 证据/IR 导出底座 + shim 迁移策略”搭好，避免迁移期到处改到一半。

- [X] T004 定义内部契约总入口（RuntimeInternals Runtime Service）：`packages/logix-core/src/internal/runtime/core/RuntimeInternals.ts`（定义最小接口：lifecycle/txn/traits/imports/devtools）
- [X] T005 定义 InternalHooks 的统一 accessor：`packages/logix-core/src/internal/runtime/core/runtimeInternalsAccessor.ts`（提供 `getRuntimeInternals(runtime)`/`getBoundInternals(bound)`；包含 dev 断言与缺失诊断）
- [X] T006 将现有 `runtime.__*` 的写入点收敛到单一安装器：`packages/logix-core/src/internal/runtime/ModuleRuntime.internalHooks.ts`（内部先实现 Runtime Service 契约，再用 shim 填充 legacy 字段；禁止新增字段）
- [X] T007 [P] 为 “internal accessor 缺失/不一致” 增加回归测试：`packages/logix-core/test/Runtime.InternalContracts.Accessor.test.ts`
- [X] T008 定义 RunSession + EvidenceSink 领域模型：`packages/logix-core/src/internal/observability/runSession.ts`（runId/source、会话隔离、可裁剪导出）
- [X] T009 定义可注入 EvidenceCollector（per-session）并提供默认实现（仅采集/导出 API，不含 TrialRun 入口）：`packages/logix-core/src/internal/observability/evidenceCollector.ts`（收集 Debug events + converge static IR 摘要 + runtime services evidence）
- [X] T010 [P] 将 `specs/020-runtime-internals-contracts/contracts/schemas/runtime-evidence-package.schema.json` 的校验落到测试：`packages/logix-core/test/Observability.RuntimeEvidencePackage.test.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 对外 API/行为稳定不变（重构可安全迭代） (Priority: P1) 🎯 MVP

**Goal**: 在内部契约化与全链路迁移过程中，对外语义与默认行为保持不变，并具备可解释回归证据。

**Independent Test**: 运行代表性 runtime/trait 用例 + 示例场景；同时验证 diagnostics=off 与 on 的行为一致性（仅观测差异）。

- [X] T011 [P] [US1] 补齐“对外语义不变”回归用例（覆盖 dispatch/traits/source-refresh/生命周期；并覆盖事务窗口禁止 IO/async 边界的 guard/断言）：`packages/logix-core/test/Runtime.PublicSemantics.NoDrift.test.ts`
- [X] T012 [P] [US1] 补齐 “diagnostics=off 近零成本 + 不改变语义” 的回归断言：`packages/logix-core/test/Debug.OffSemantics.NoDrift.test.ts`

---

## Phase 4: User Story 2 - 内部子系统可替换/可扩展（支撑长期迭代） (Priority: P1)

**Goal**: 将 ModuleRuntime 核心能力拆为 Runtime Services，并支持按模块实例 scope 覆写（strict 默认、零泄漏），同时产出可解释的来源证据。

**Independent Test**: 同进程两个模块实例，其中一个覆写子系统实现并产生可观测差异；另一个保持默认且不受影响。

- [X] T013 [P] [US2] 定义 RuntimeKernel（单一装配点）与 Runtime Services：`packages/logix-core/src/internal/runtime/core/RuntimeKernel.ts`（解析一次服务并闭包捕获，避免热路径每次查找；实例级资源必须绑定 Effect Scope 并注册 finalizer，避免泄漏；Kernel 必须保持“薄”）
- [X] T014 [US2] 将 ModuleRuntime.dispatch/txnQueue/transaction/runOperation 迁入 Runtime Services 并由 Kernel 装配：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts` + `packages/logix-core/src/internal/runtime/ModuleRuntime.*.ts`（完成后在本 Phase 复测 014/019 口径基线，并把 before/after 摘要写入 `specs/020-runtime-internals-contracts/perf.md`）
- [X] T015 [US2] 实现 “按实例覆写” 的优先级与证据生成：`packages/logix-core/src/internal/runtime/core/RuntimeKernel.ts`（builtin < runtime_default < runtime_module < provider < instance）
- [X] T016 [P] [US2] 增加“覆写仅影响单实例”验证用例：`packages/logix-core/test/RuntimeKernel.InstanceOverrideIsolation.test.ts`
- [X] T017 [P] [US2] 增加 runtime services evidence（contracts 020）生成与校验用例：`packages/logix-core/test/RuntimeKernel.ServicesEvidence.test.ts`

---

## Phase 5: User Story 3 - 维护成本下降：依赖注入统一且职责边界清晰 (Priority: P2)

**Goal**: 全链路内部消费方统一迁移到 RuntimeInternals/RuntimeKernel，消灭散落 `__*` 读写与参数爆炸接线点。

**Independent Test**: 在不改对外行为的前提下，迁移 `BoundApiRuntime`/`trait-lifecycle`/`state-trait`/`@logixjs/react` 的内部依赖获取方式，并通过其各自回归用例。

- [X] T018 [US3] 迁移 BoundApiRuntime：用 internal accessor/RuntimeInternals 替代 `runtime.__runWithStateTransaction/__recordStatePatch/...` 直接读取：`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`
- [X] T019 [US3] 消灭进程级 `globalLogicPhaseRef` 作为默认行为依赖（改为实例级 phase 或显式注入）：`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`
- [X] T020 [US3] 迁移 trait-lifecycle：用 internal accessor 替代 `bound.__enqueueStateTraitValidateRequest/__runWithStateTransaction`：`packages/logix-core/src/internal/trait-lifecycle/index.ts`
- [X] T021 [US3] 迁移 state-trait.install：用 internal accessor 替代 `bound.__registerStateTraitProgram`：`packages/logix-core/src/internal/state-trait/install.ts`
- [X] T022 [US3] 迁移 state-trait.source：用 internal accessor 替代 `bound.__recordStatePatch/__recordReplayEvent` 等：`packages/logix-core/src/internal/state-trait/source.ts`
- [X] T023 [US3] 将 state-trait.source 的进程级 once/dedup 状态迁到 RunSession/实例作用域（避免跨会话污染）：`packages/logix-core/src/internal/state-trait/source.ts` + `packages/logix-core/src/internal/observability/runSession.ts`
- [X] T024 [US3] 将试跑可观测的 opSeq/eventSeq 分配器从进程级 Map 迁到 RunSession/实例作用域（支持并行会话可对比）：`packages/logix-core/src/EffectOp.ts` + `packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [X] T025 [US3] 迁移 `@logixjs/react` strict imports：用 internal accessor 替代 `parentRuntime.__importsScope`：`packages/logix-react/src/internal/resolveImportedModuleRef.ts`
- [X] T026 [P] [US3] 增加“全链路无 `__*` 直读” lint/回归脚本（只对新增路径强制）：`scripts/checks/no-internal-magic-fields.ts`（仅检查变更文件集/允许白名单 shim；建议 Phase 2 完成后即引入作为 CI 门禁）

---

## Phase 6: User Story 4 - 平台侧可试运行与证据/IR 导出（支持局部 Mock） (Priority: P2)

**Goal**: 支持 Node/浏览器环境的 RunSession 试跑：可注入 Mock/覆写、导出 EvidencePackage（含 runtime services evidence + converge static IR 摘要），并行会话隔离。

**Independent Test**: 同进程并行启动两个 RunSession，各自试跑并导出证据，断言 runId/事件序列/IR 摘要/服务绑定证据不串扰；同时提供最小浏览器侧验证。

- [X] T027 [US4] 提供 TrialRun 入口/编排（RunSession + 覆写注入 + EvidenceCollector 组装 + 导出 EvidencePackage），不依赖 DevtoolsHub 全局单例：`packages/logix-core/src/internal/observability/trialRun.ts`
- [X] T028 [US4] 将 converge static IR 的注册从 DevtoolsHub 全局 map 解耦为可注入采集路径（DevtoolsHub 仅作为 consumer）：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts` + `packages/logix-core/src/internal/runtime/ModuleRuntime.internalHooks.ts`
- [X] T029 [US4] 提供 Node 侧试跑样例（构造 runtime、注入覆写、导出证据并 schema 校验）：`examples/logix/src/scenarios/trialRunEvidence.ts`
- [X] T030 [US4] 提供浏览器侧最小试跑样例（复用现有 demo 或新增轻量页面）：`examples/logix-react/src/demos/TrialRunEvidenceDemo.tsx`
- [X] T031 [P] [US4] 增加并行 RunSession 隔离测试：`packages/logix-core/test/Observability.TrialRun.SessionIsolation.test.ts`（含 chaos：并行启动大量会话，验证 once 去重/序列号/IR 去重不串扰）

---

## Phase 7: User Story 5 - 构建态反射（Reflection）与 Build Env 约束 (Priority: P2)

**Goal**: 支持平台在受控 Build Env 中执行 Builder 一次导出静态 IR，并对“构建态依赖越界”给出可行动诊断；重复/并行执行无全局污染。

**Independent Test**: 同一进程内用两套 build 配置分别构建同一模块，导出静态 IR 并稳定对比；当 Builder 试图访问业务 Service 时快速失败并输出明确诊断。

- [X] T032 [US5] 定义 RuntimeHost/BuildEnv 最小契约（可 Mock）：`packages/logix-core/src/internal/platform/RuntimeHost.ts`
- [X] T033 [US5] 提供标准 Build Env Layer 工具（Config/RuntimeHost 可注入）：`packages/logix-core/src/internal/platform/BuildEnv.ts`
- [X] T034 [US5] 增加“构建态依赖越界”诊断与错误类型：`packages/logix-core/src/internal/platform/ConstructionGuard.ts`
- [X] T035 [US5] 处理构建期全局注册表污染（ModuleTraitsRegistry 等）：`packages/logix-core/src/internal/debug/ModuleTraitsRegistry.ts` + `packages/logix-core/src/Module.ts`（改为按会话/显式 consumer 注册或基于 digest 多版本存储）
- [X] T036 [P] [US5] 增加 Reflection 导出样例（导出 module topology + traits program/graph 摘要）：`examples/logix/src/scenarios/ir/reflectStaticIr.ts`
- [X] T037 [P] [US5] 增加 Reflection 回归测试（两套配置对比 + 越界依赖失败诊断）：`packages/logix-core/test/Platform.Reflection.BuildEnv.test.ts`
- [X] T038 [US5] 扩展 Exported Static IR 的 meta/注解（为 Phantom Source / Drift Detection 留锚点与稳定摘要）：`packages/logix-core/src/internal/state-trait/meta.ts` + `packages/logix-core/src/internal/state-trait/ir.ts`

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 文档与迁移说明、清理遗留 shim、以及性能/诊断门槛收口。

- [X] T039 迁移说明：校对并完善 `specs/020-runtime-internals-contracts/plan.md` 的 Migration Guide（结合实际落地代码，补齐迁移对照、白名单策略与常见坑）
- [X] T040 [P] 更新运行时 SSoT（内部契约/试跑证据导出/Reflection 基线）：`docs/ssot/runtime/logix-core/runtime/05-runtime-implementation.md`
- [X] T041 [P] 更新可观测性 SSoT（EvidencePackage.summary 约定、RunSession、Reflection IR 摘要）：`docs/ssot/runtime/logix-core/observability/09-debugging.md`
- [X] T042 [P] 用户文档补齐“高性能最佳实践：试跑证据/IR 的用法与解释口径”：`apps/docs/content/docs/guide/advanced/performance-and-optimization.md`
- [X] T043 清理迁移期 shim 的白名单与遗留 `__*` 字段（仅保留被证明仍必要的 debug-only 能力）：`packages/logix-core/src/internal/runtime/ModuleRuntime.internalHooks.ts` + `packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`
- [X] T044 [P] 更新示例索引（发现性）：在 `examples/logix/README.md` 补充 `trialRunEvidence.ts` / `reflectStaticIr.ts` 场景入口，并在 `examples/logix-react/src/App.tsx`（或等价 demo 路由入口）挂载 `TrialRunEvidenceDemo` 的访问入口
- [X] T045 [P] 消化并重写 Effect DI 重构教程（以 Logix 用户视角“先上手 Logix → 再理解 Effect DI”组织叙事，避免先验 Effect 知识假设），并纳入用户文档导航：`specs/020-runtime-internals-contracts/references/tutorial-effect-di-refactoring.md` → `apps/docs/content/docs/guide/learn/escape-hatches/effect-di-refactoring.md` + `apps/docs/content/docs/guide/learn/escape-hatches/meta.json`

---

## Phase 9: Post-020 Cleanup - 收口剩余 `__*` 访问点（Repo-wide）

**Purpose**: 将 020 之后仍残留的 “magic 字段协议/调试桥接” 收敛到：

- **020 内部契约入口**：`RuntimeInternals` / `runtimeInternalsAccessor` / `InternalContracts`（用于 runtime 实例级协作协议）
- **Symbol hidden slot / WeakMap**：用于模块定义侧/纯内部实现侧的标记与元信息（避免把实现细节升级为“运行时契约”）

- [X] T046 收敛 Module traits Program 槽位：用 Symbol hidden slot 替代 `__stateTraitProgram`，并更新 Debug/TraitLifecycle 读取链路：`packages/logix-core/src/internal/runtime/core/runtimeInternalsAccessor.ts` + `packages/logix-core/src/Module.ts` + `packages/logix-core/src/Debug.ts` + `packages/logix-core/src/internal/trait-lifecycle/index.ts`（含相关测试/脚本引用迁移）
- [X] T047 同步 Sandbox kernel bundle：重新打包 `packages/logix-sandbox/public/sandbox/logix-core.js`（避免 Sandbox 仍依赖已移除的 `__stateTraitProgram` 等字段），并在 `packages/logix-sandbox/scripts/bundle-kernel.mjs`/README 中补充生成说明与约束
- [X] T048 扩展 InternalContracts：为 repo 内集成方提供最小 txn/traits 辅助入口（`applyTransactionSnapshot`/`runWithStateTransaction`/`recordStatePatch`/`getRowIdStore`/`getStateTraitListConfigs`），并迁移以下直读点：`packages/logix-core/src/Runtime.ts` + `packages/logix-form/src/internal/rowid.ts` + `pnpm perf bench:009:txn-dirtyset` + `examples/logix-react/src/demos/PerfTuningLabLayout.tsx`
- [X] T049 收敛内部实现 marker：将 `__logicPlan/__phaseRef/__skipRun`、`__dirtyAllSetStateHint` 等内部标记迁到 Symbol hidden slot（或 WeakMap），避免在非 shim 文件继续依赖字符串字段：`packages/logix-core/src/internal/runtime/core/LogicPlanMarker.ts` + `packages/logix-core/src/internal/runtime/ModuleFactory.ts` + `packages/logix-core/src/internal/runtime/ModuleRuntime.logics.ts` + `packages/logix-core/src/internal/runtime/ModuleRuntime.transaction.ts`（并同步更新相关测试）
- [X] T050 Sandbox Worker 全局桥接 API 收口：将 `self.__logixSandboxUiIntent`/`self.__logixSandboxSpy` 改为显式 bridge（`globalThis.logixSandboxBridge` + `Symbol.for("@logixjs/sandbox/bridge")`），并给出迁移说明：`packages/logix-sandbox/src/worker/sandbox.worker.ts` + `packages/logix-sandbox/test/browser/sandbox-worker-observable.test.ts`

---

## Dependencies & Execution Order

- Phase 2 是阻塞项：必须先落地 RuntimeInternals/RunSession/EvidenceCollector 的底座，后续迁移才不会碎片化。
- US2/US3/US4 可以在 Phase 2 完成后按链路逐段推进，但每段迁移都必须带回归用例，避免“细碎迁移”引入隐性行为漂移。
- 性能门槛建议前置：每个 Phase 结束后复测 014/019 口径基线并追加记录到 `specs/020-runtime-internals-contracts/perf.md`，避免性能债累积到最后才暴雷。
- Phase 9 是 repo-wide 收口：建议在 Phase 8 文档/迁移说明收口后执行；其中 T050 涉及对外桥接 API，需要先裁决再落地。
