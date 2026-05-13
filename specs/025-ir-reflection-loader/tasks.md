# Tasks: IR Reflection Loader（IR 反射与试运行提取）

**Input**: `specs/025-ir-reflection-loader/spec.md`、`specs/025-ir-reflection-loader/plan.md`、`specs/025-ir-reflection-loader/research.md`、`specs/025-ir-reflection-loader/data-model.md`、`specs/025-ir-reflection-loader/contracts/*`、`specs/025-ir-reflection-loader/quickstart.md`
**Prerequisites**: `specs/025-ir-reflection-loader/plan.md`（required）、`specs/025-ir-reflection-loader/spec.md`（required）

**Tests**: 本特性落点在 `packages/logix-core`（Reflection/Observability/BuildEnv/ConstructionGuard），测试为必选；并补齐最小“试跑开销”基线证据，避免把 IR 能力意外拖进热路径。

**Organization**: 任务按用户故事分组；US2（trial run）依赖 US1 的 manifest/static IR 输出形态；POC/可视化可并行，但以 US1/US2 的最终契约为准收口。

**Traceability**: 每条任务末尾必须标注 `Refs:`，引用本 feature 的 `FR-*`/`NFR-*`/`SC-*`；如仅为文档/载体任务，则写 `Refs: —` 并注明原因。

## Phase 0: Planning Artifacts（Already Done）

**Purpose**: 确认规划产物齐全，避免实现阶段反复改文档骨架。

- [x] P000 spec/plan/research/data-model/contracts/quickstart 已生成并能相互引用 （Refs: —，规划产物检查）

---

## Phase 1: Foundational（Blocking Prerequisites）

**Purpose**: 在进入实现前固化“对外契约 + 错误分类 + 预算/确定性约束 + 证据口径复用”。

- [x] T001 固化对外 API 契约（命名允许微调但语义与确定性约束不得变）：`specs/025-ir-reflection-loader/contracts/api.md` （Refs: FR-001, FR-005, FR-009, FR-010, NFR-002, NFR-005）
- [x] T002 固化数据结构与 JSON Schema（Manifest/StaticIR/EnvironmentIR/TrialRunReport；ModuleManifest 字段名/语义与 `ModuleDescriptor` 对齐，避免映射漂移）：`specs/025-ir-reflection-loader/contracts/schemas/*` （Refs: FR-001, FR-002, FR-006, FR-010, NFR-002）
- [x] T003 明确 trial run 错误分类与可行动提示（MissingDependency/TrialRunTimeout/DisposeTimeout/Oversized/RuntimeFailure；ConstructionViolation/IO guard 作为后续扩展）：`specs/025-ir-reflection-loader/contracts/api.md` （Refs: FR-005, FR-007, NFR-003, NFR-005, SC-003, SC-004）
- [x] T004 明确“确定性”口径与 diff 基线（runId 必须显式注入；排序稳定；digest 仅由结构决定）：`specs/025-ir-reflection-loader/research.md` （Refs: FR-003, NFR-002, SC-001）

**Checkpoint**: contracts 与 schema 可作为实现/测试的唯一裁决基线。

---

## Phase 2: User Story 1 - 导出 Manifest IR（供 Studio/CI/Agent 消费） (Priority: P1) 🎯 MVP

**Goal**: 提供 `CoreReflection.extractManifest(...)`（可选内嵌 StaticIR），输出 deterministic JSON（可 stringify、可 diff）。

**Independent Test**: 同一个 module 输入重复提取，输出一致；当结构变化时（schemaKeys/slots/meta/source 等）能稳定体现差异。

### Tests for User Story 1（先写测试，确保失败后再实现）

- [x] T010 [P] [US1] `extractManifest`：输出可 stringify 且字段顺序稳定（deterministic）：`packages/logix-core/test/CoreReflection.extractManifest.deterministic.test.ts` （Refs: FR-001, FR-003, SC-001）
- [x] T011 [P] [US1] `extractManifest`：预算裁剪生效（maxBytes），超限时降级/标注而非 silent 失败：`packages/logix-core/test/CoreReflection.extractManifest.budgets.test.ts` （Refs: FR-001, NFR-003）
- [x] T012 [P] [US1] `extractManifest`：不依赖 AST；工厂/field 组合生成的最终对象也可提取：`packages/logix-core/test/CoreReflection.extractManifest.composedModule.test.ts` （Refs: FR-004, SC-001）
- [x] T013 [P] [US1] `exportStaticIr`：具备 FieldKernel 关系时导出稳定 StaticIR；无 fields 时返回空/undefined：`packages/logix-core/test/CoreReflection.exportStaticIr.basic.test.ts` （Refs: FR-010, SC-006）
- [x] T014 [P] [US1] `extractManifest({ includeStaticIr: true })`：StaticIR 以可 diff 的摘要方式内嵌（不引入闭包/Schema 对象）：`packages/logix-core/test/CoreReflection.extractManifest.includeStaticIr.test.ts` （Refs: FR-001, FR-010, SC-006）

### Implementation for User Story 1

- [x] T015 [US1] 新增 `Logix.Reflection` 公共入口（导出 extractManifest/exportStaticIr/types）：`packages/logix-core/src/internal/reflection-api.ts`、`packages/logix-core/src/index.ts` （Refs: FR-001, FR-010）
- [x] T016 [US1] 实现 manifest 投影：只输出 schemaKeys/meta/source/slots 摘要与稳定 digest；禁止导出 Schema/闭包/Effect：`packages/logix-core/src/internal/reflection/*` （Refs: FR-001, FR-002, FR-003, NFR-002）
- [x] T017 [US1] 复用 `FieldKernel.exportStaticIr` 作为 canonical StaticIR，并保持 JsonValue 可序列化：`packages/logix-core/src/internal/reflection/*` （Refs: FR-010, NFR-002, SC-006）

### Contract Guard（CI Diff，属于 US1 的验收场景 2）

- [x] T030 [P] [US1] `diffManifest(a, b)`：结构化输出 + 回归测试（CI 可机器解析）：`packages/logix-core/test/CoreReflection.diffManifest.test.ts` （Refs: FR-009, SC-002）
- [x] T031 [US1] 实现 diff（至少覆盖 schemaKeys/slots/meta/source/staticIr.digest 的 breaking 维度）：`packages/logix-core/src/internal/reflection/diff.ts`、`packages/logix-core/src/internal/reflection-api.ts` （Refs: FR-009, SC-002）

---

## Phase 3: User Story 2 - 受控试运行提取 IR（Environment/Runtime IR，用于合规与编排） (Priority: P2)

**Goal**: 提供 `Logix.Runtime.trial(...)`：在 BuildEnv 中受控试跑模块装配阶段，导出 `TrialRunReport`（含 Environment IR + 控制面证据 + EvidencePackage 子集）。

**Independent Test**: 缺失服务时能给出可行动失败并导出 Environment IR；成功路径能导出 `RuntimeServicesEvidence`（复用 020 schema）；并且 scope 关闭后无悬挂资源。

### Tests for User Story 2（先写测试，确保失败后再实现）

- [x] T020 [P] [US2] `trialRunModule`：缺失服务时失败并输出 missingServices（ConstructionGuardError）：`packages/logix-core/test/Runtime.trial.missingService.test.ts` （Refs: FR-007, SC-003, SC-004）
- [x] T021 [P] [US2] `trialRunModule`：runId 显式注入可回放/可对比（不依赖默认 Date.now）：`packages/logix-core/test/Runtime.trial.runId.test.ts` （Refs: FR-005, FR-003, NFR-002）
- [x] T022 [P] [US2] `trialRunModule`：scope close 生效（可观测 finalizer 被调用；无 dangling fibers）：`packages/logix-core/test/Runtime.trial.scopeDispose.test.ts` （Refs: FR-005, NFR-004）
- [x] T023 [P] [US2] `trialRunModule`：导出 summary.runtime.services（RuntimeServicesEvidence）且口径与 020 schema 对齐：`packages/logix-core/test/Runtime.trial.runtimeServicesEvidence.test.ts` （Refs: FR-005, FR-006, NFR-005）
  - 额外断言：`bindings` 至少包含 `serviceId/scope/overridden`，并在存在覆写时体现 `overridesApplied`（为 P3 控制面解释器提供最小可用信息）。
- [x] T0231 [P] [US2] `trialRunModule`：缺失 config 时失败并输出 missingConfigKeys（hard fail + 可行动摘要）：`packages/logix-core/test/Runtime.trial.missingConfig.test.ts` （Refs: FR-007, SC-003, SC-004）
- [x] T0232 [P] [US2] `trialRunModule`：试跑窗口超时分类为 TrialRunTimeout（trialRunTimeoutMs 生效）：`packages/logix-core/test/Runtime.trial.trialRunTimeout.test.ts` （Refs: FR-005, NFR-003）
- [x] T0233 [P] [US2] `trialRunModule`：释放收束超时分类为 DisposeTimeout（closeScopeTimeout 语义复用 024）：`packages/logix-core/test/Runtime.trial.disposeTimeout.test.ts` （Refs: NFR-003, NFR-004）
- [x] T0234 [P] [US2] `trialRunModule`：并行 RunSession 隔离（runId/layer/evidence/environment 互不串扰）：`packages/logix-core/test/Runtime.trial.runSessionIsolation.test.ts` （Refs: NFR-002, NFR-005）

### Implementation for User Story 2

- [x] T024 [US2] 在 `Logix.Observability` 上新增 `trialRunModule`（对齐 trialRun options + buildEnv/layer/预算）：`packages/logix-core/src/internal/evidence-api.ts`、`packages/logix-core/src/internal/observability/trialRunModule.ts` （Refs: FR-005）
- [x] T025 [US2] 试跑窗口 + 资源收束：复用 024 的 closeScopeTimeout 语义；BuildEnv 仅提供 runtimeHost/configProvider；导出 Environment IR（tagIds/configKeys/missingServices/missingConfigKeys）与结构化错误分类（MissingDependency/TrialRunTimeout/DisposeTimeout/RuntimeFailure）：`packages/logix-core/src/internal/observability/trialRunModule.ts`、`packages/logix-core/src/Runtime.ts` （Refs: FR-006, FR-007, NFR-005, SC-003, SC-004）
- [x] T026 [US2] 复用 EvidenceCollector 写入控制面证据与 converge 静态 IR 摘要（不改协议，只补齐试跑入口编排）：`packages/logix-core/src/internal/observability/evidenceCollector.ts`、`packages/logix-core/src/internal/runtime/ModuleRuntime.ts` （Refs: FR-005, NFR-002, NFR-005）

---

## Phase 4: User Story 3 - 内核提前支撑（性能 & 确定性） (Priority: P3)

**Goal**: 确保 IR 反射/试跑能力不把额外开销拖进热路径，并把“确定性/可解释/可序列化”的口径固化成可复现的回归防线（FR-008/NFR-001/SC-005）。

**Independent Test**: 未启用任何 IR 提取/试跑时，既有运行时路径行为与性能不回退；启用导出时，在不同进程/机器上对同一输入产物可复现（排序/digest 不依赖随机/时间）。

- [x] T032 [P] [US3] 提供 `scripts/ir/inspect-module.ts`：对 program module 产出 manifest/trial-run-report 工件，并支持重复运行比对（跨进程确定性 smoke，用于 CI）：`scripts/ir/inspect-module.ts` （Refs: FR-003, NFR-002, SC-001）
- [x] T033 [P] [US3] N/A（本特性未触及 `BoundApi.$.use` 等热路径）：暂不需要额外运行 `pnpm perf bench:useModule`；若后续改动 `$.use` 再补齐基线与对比写入 `specs/025-ir-reflection-loader/perf.md`。 （Refs: FR-008, NFR-001, SC-005）

---

## Phase 5: POC - IR 平台可视化载体（以 024 program module 为入口） (High-RIO)

**Goal**: 用 `examples/logix-sandbox-mvp` 做第一版 IR 可视化路由/Tab，按 ROI 优先级交付：

- P0: ModuleManifest 结构面板 + 版本 diff/Breaking 检测（CI Contract Guard 直接复用）
- P1: StaticIR（FieldKernel）依赖图可视化（DAG + 冲突/成本提示）
- P2: TrialRunReport 预检报告（missing services/configKeys/违规分类 + 一键重跑）
- P3: RuntimeServicesEvidence 控制面覆写解释器（解释“为什么选了这个 impl”）
- P4: Evidence session 时间线（事件裁剪 + staticIrDigest/converge digest 定位）

> 交互与组件拆解（小而美、可复用）：`specs/025-ir-reflection-loader/poc-visualization.md`

### UI Skeleton（先搭载体，后接数据源）

- [x] T040 [P] [POC] 新增 `/ir` 路由或同页 Tab：Manifest / StaticIR / TrialRunReport / ControlPlane / Timeline：`examples/logix-sandbox-mvp/src/App.tsx` （Refs: FR-001, FR-005, FR-010, NFR-005）
- [x] T0401 [P] [POC] 集成 `shadcn/ui` 到 `examples/logix-sandbox-mvp/`（统一组件来源与样式基座，后续 P0–P4 视图优先使用）：`examples/logix-sandbox-mvp/*` （Refs: —，POC UI 基座）
- [x] T041 [P] [POC] Artifact 输入：Preset Runner（sandbox provider）+ Import（粘贴/上传 JSON）；统一落为 `ArtifactBundle` 并驱动 P0–P4 视图：`examples/logix-sandbox-mvp/src/*` （Refs: NFR-002, NFR-005）
- [x] T0411 [P] [POC] 内置 5 个 presets（p0–p4），覆盖成功/失败/裁剪/冲突/覆写链路，并在 UI 做最小自检提示：`examples/logix-sandbox-mvp/src/*`、`packages/logix-sandbox/*`（按需） （Refs: NFR-003, NFR-005）

### P0：ModuleManifest 面板 + diff/Breaking

- [x] T042 [P] [POC-P0] Manifest 结构面板（schemaKeys/actions/slots/meta/source）与 digest 展示：`examples/logix-sandbox-mvp/src/*` （Refs: FR-001, FR-002, SC-001, NFR-005）
- [x] T043 [P] [POC-P0] Manifest diff/Breaking 面板：复用 025 的 `diffManifest` 输出结构（或以 schema 约束的等价结构），保证与 CI 口径一致：`examples/logix-sandbox-mvp/src/*` （Refs: FR-009, SC-002）

### P1：StaticIR DAG

- [x] T044 [P] [POC-P1] StaticIR DAG 视图：computed/link/source/check 依赖图；标注 reads/writes、cycle/multi-writer 与 digest；并支持“传递依赖（Impact/Dependency）”高亮与影响清单导出：`examples/logix-sandbox-mvp/src/*` （Refs: FR-010, SC-006）
- [x] T045 [P] [POC-P1] 提供从 manifest.staticIr.digest 跳转定位 StaticIR 视图的交互：`examples/logix-sandbox-mvp/src/*` （Refs: FR-003, FR-010, NFR-002）

### P2：TrialRunReport 预检 + 一键重跑

- [x] T046 [P] [POC-P2] TrialRunReport 面板：missing services/missing config keys/tagIds/configKeys/违规分类/可行动提示；展示 budgets 与裁剪信息（默认 maxEvents=1000）：`examples/logix-sandbox-mvp/src/*` （Refs: FR-006, FR-007, NFR-005, SC-003, SC-004）
- [x] T047 [P] [POC-P2] 一键重跑：显式 runId + 可配置 budgets（timeout/maxBytes/maxEvents，默认 maxEvents=1000）；数据源先以 Node 脚本或 sandbox 试跑为准：`examples/logix-sandbox-mvp/src/*` （Refs: FR-005, FR-003, NFR-003）

### P3：RuntimeServicesEvidence 覆写解释器

- [x] T048 [P] [POC-P3] 按 scope 展示 bindings/overridesApplied/fallback 原因（解释“为什么选了这个 impl”）：`examples/logix-sandbox-mvp/src/*` （Refs: FR-005, NFR-005）

### P4：Evidence Timeline（次高）

- [x] T049 [P] [POC-P4] Evidence session 时间线：按 type 过滤/搜索；能跳转到 staticIrDigest/converge digest 的结构视图；默认 maxEvents=1000 并显式提示裁剪：`examples/logix-sandbox-mvp/src/*` （Refs: NFR-003, NFR-005）

### Data source（可选：顺带疏通 sandbox 链路）

- [x] T055 [P] [POC] 在 sandbox 链路中接入 trialRun/report/evidence 作为数据源（仅用于 demo；不得影响 core 契约）：`packages/logix-sandbox/*`（按需） （Refs: FR-005, NFR-005）

---

## Phase N: Polish & Regression Defenses（Required）

- [x] T050 增加“试跑开销”基线脚本与证据落点（N 次 trialRunModule + scope close，记录 wall time/事件数）：`pnpm perf bench:025:trialRunModule`、`specs/025-ir-reflection-loader/perf.md`、`specs/025-ir-reflection-loader/perf/` （Refs: NFR-001, SC-005）
- [x] T051 [P] 同步 runtime SSoT（Reflection/TrialRunReport/Environment IR/控制面证据口径）：`docs/ssot/runtime/logix-core/*` （Refs: FR-001, FR-005, FR-009, FR-010, NFR-005）
- [x] T052 [P] 同步用户文档（apps/docs）：说明 manifest/试跑产物与“为什么必须显式 runId/Scope close”（避免平台内部术语泄漏）：`apps/docs/content/docs/*` （Refs: NFR-005, SC-001, SC-003）
- [x] T053 [P] 更新 `specs/025-ir-reflection-loader/quickstart.md`：确保示例与最终 API/字段一致 （Refs: FR-001, FR-005, SC-001, SC-003）
- [x] T054 [P] 补齐 `specs/025-ir-reflection-loader/handoff.md`：记录最终裁决、非目标、迁移与下一步 （Refs: —，交接记录）

---

## Dependencies & Execution Order（简版）

- Phase 1 完成后才进入 US1/US2/US3 的实现与收口（contracts/schema 先裁决）。
- US2 依赖 US1 的输出形态（manifest/static IR）与确定性约束。
- POC 可与 core 并行，但必须在 core 契约最终确定后收口（避免 UI 反向绑死数据结构）。

---

## Acceptance Follow-ups（Post-acceptance）

> 来自 `$speckit acceptance 024 025` 的漂移/缺口项；用于消除长期漂移风险并恢复质量门。

- [x] T060 [P] [Acceptance] 消除 `Runtime.trial` 的 boot 内核漂移：抽出 024 ProgramRunner 的共享 boot/Scope/identity 内核，并由 025 的 trial run 复用（避免复制装配逻辑导致长期漂移）。Refs: FR-005
