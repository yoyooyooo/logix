# Feature Specification: Platform Visualization Lab（Logix IR / Evidence / Gate 可视化 POC）

**Feature Branch**: `086-platform-visualization-lab`  
**Created**: 2026-01-10  
**Status**: Done  
**Input**: 在 `examples/logix-react` 提供“独立颗粒度”的平台侧可视化 POC：把 `@logixjs/core` 已有/将有的 IR 与证据（Manifest/ManifestDiff/TrialRun 等）做成可玩的独立路由；优先验证这些可视化单独存在是否有价值，未来平台再做组合与画布化编排。

## Context

`080`（Full‑Duplex Prelude）跑通后，平台侧将同时拥有：

- Static IR：`ModuleManifest`、`StaticIr`、`Artifacts`、（未来）`servicePorts`、`PortSpec/TypeIR`
- Static IR：`ModuleManifest`（含 `servicePorts`）、`StaticIr`、`Artifacts`、（未来）`PortSpec/TypeIR`
- Static IR（控制面）：`ControlSurfaceManifest`（Root IR）+ `workflowSurface`（Π slice；锚点为 `ControlSurfaceManifest.modules[*].workflowSurface.digest`）
- Dynamic Evidence：TrialRun / EvidencePackage、（未来）Spy evidence
- Platform‑Grade 工具链工件：`AnchorIndex@v1`、`PatchPlan@v1`、`WriteBackResult@v1`（Node-only 产出）

但“能导出”不等于“好用”。本特性要在平台落地前，先把最关键的可视化体验用最小成本做成独立页面，作为：

- 平台/Devtools 需求的前置 PoC（验证信息架构与解释粒度）
- 合同/工件的消费者回归面（字段变化会立刻在 UI 暴露）
- 未来平台组合形态（Canvas/Workbench）之前的可复用“能力块”

## Clarifications

### Session 2026-01-12

- AUTO: Q: `Manifest Diff Viewer` 的 before/after 输入来源选哪种？ → A: 同时支持两种：预置模块选择（内部 `extractManifest`）或粘贴 `ModuleManifest` JSON（两者都可作为 before/after）。
- AUTO: Q: `Manifest Inspector` 的输入来源选哪种？ → A: 仅支持选择预置模块（内部 `extractManifest`）；需要粘贴 JSON 的场景由 Diff Viewer 的 JSON 输入覆盖。
- AUTO: Q: `extractManifest` 的可调参数（`includeStaticIr` / `budgets.maxBytes`）怎么用？ → A: 两个页面都提供可选配置；默认 `includeStaticIr=off`、`maxBytes=off`；裁剪必须可解释（展示 `meta.__logix` 标记）。
- AUTO: Q: `Manifest Diff Viewer` 在“模块选择模式”下如何保持 before/after 可比？ → A: before/after 共用同一组选项（`includeStaticIr`/`maxBytes`），避免因参数不同导致噪音 diff。
- AUTO: Q: JSON 粘贴输入的校验与失败处理口径？ → A: 仅做最小字段校验；解析/校验失败时阻止计算并显示错误（不得崩溃/空白）。
- AUTO: Q: 缺失的未来字段（例如 `PortSpec/TypeIR`）如何提示？ → A: UI 固定展示 pending 清单（以 `080` 的 spec-registry 为准），并标注“当前 core `ModuleManifest.manifestVersion=083` 仍未包含”。
- AUTO: Q: Raw JSON 视图是否需要一键复制？ → A: 需要；提供一键复制 pretty JSON（2 spaces），并显示复制成功/失败反馈。

## Goals / Scope

### In Scope

- 在 `examples/logix-react` 新增 `/platform-viz/*` 路由组，每个页面只承载一个可视化能力：
  - Manifest Inspector（`Reflection.extractManifest`）
  - Manifest Diff Viewer（`Reflection.diffManifest`）
  - TrialRun Evidence Inspector（复用/包装现有 TrialRun 示例）
- UI 只消费 JSON-safe 的工件/输出；不引入 Node-only 依赖（`ts-morph/swc/fs` 等）。
- 为后续 `servicePorts` / `AnchorIndex` / `PatchPlan` 等工件预留“展示占位”与信息架构（但不要求本特性实现其生产链路）。
- 为后续 `workflowSurface`（Π slice）预留展示占位：Root IR 的 workflow slice 能被加载并在 UI 中可视化/定位（锚点为 `ControlSurfaceManifest.modules[*].workflowSurface.digest`；不要求本特性生产该 slice）。

### Out of Scope

- 不实现 `078/079/081/082/085` 的生产能力（Manifest 字段扩展、Parser/Rewriter/Autofill/CLI 等）；本特性只做消费者侧可视化与交互验证。
- 不实现“平台一体化画布/工作台”（组合/编排留到未来平台 spec）。
- 不在 `packages/logix-devtools-react` 内落地正式 Devtools 面板扩展（本特性先用 example 路由验证体验与粒度）。

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Manifest Inspector（单模块 IR 可解释） (Priority: P1)

作为平台/Devtools/运行时维护者，我希望打开一个独立页面，选择一个模块（ModuleDef/Module/ModuleImpl），并看到它的 `ModuleManifest`：

- 关键字段摘要（moduleId、digest、actionKeys、schemaKeys、logicUnits…）
- Raw JSON（便于拷贝、比对、作为回归基线）

**Why this priority**: 这是平台“结构可见”的最小闭环入口；一旦 Manifest 的字段/确定性发生漂移，页面能第一时间暴露问题。

**Independent Test**: 启动 `examples/logix-react`，访问 `/platform-viz/manifest`，选择不同模块对象，能稳定渲染 `Reflection.extractManifest` 输出。

**Acceptance Scenarios**:

1. **Given** 页面已打开，**When** 选择一个模块对象，**Then** 页面展示其 `ModuleManifest`（含 digest），并提供 Raw JSON 视图。
2. **Given** 模块缺少可选字段（例如未实现 `PortSpec/TypeIR`），**When** 渲染 Manifest，**Then** 页面以可解释的方式显示“字段缺失/未来可用”，而不是崩溃或空白。

---

### User Story 2 - Manifest Diff Viewer（门禁化差异可视化） (Priority: P1)

作为 CI/平台维护者，我希望选择两个 Manifest（before/after），并在一个独立页面中看到 `Reflection.diffManifest` 的结果：

- verdict（PASS/WARN/FAIL）与 summary（BREAKING/RISKY/INFO 计数）
- changes 列表（severity/code/pointer/message/details）
- before/after 的输入可来自：选择预置模块（内部 `extractManifest`）或粘贴 `ModuleManifest` JSON

**Why this priority**: 这直接对应平台门禁的可解释输出；比起看原始 JSON，用户更需要“哪些变更危险、为什么”。

**Independent Test**: 访问 `/platform-viz/manifest-diff`，选择两个不同来源的模块对象（例如 ModuleDef vs Module），能得到稳定 diff 并可读展示。

**Acceptance Scenarios**:

1. **Given** before/after 已选择，**When** 计算 diff，**Then** 页面展示 verdict、summary 与 changes 表格，并可查看 Raw JSON。
2. **Given** before/after 的 moduleId 不一致，**When** 计算 diff，**Then** 页面明确显示 `moduleId.changed` 等 BREAKING 变更，而不是静默忽略。
3. **Given** before/after 的输入来自不同来源（模块选择 vs JSON 粘贴），**When** 计算 diff，**Then** 页面行为一致且结果可复现（Raw JSON 可见）。

---

### User Story 3 - TrialRun Evidence Inspector（动态证据可视化） (Priority: P2)

作为平台/Devtools 用户，我希望在浏览器中运行一次受控 TrialRun，并看到导出的 Evidence summary（环境缺失/服务证据/静态 IR 摘要等），用来验证“动态证据是否足够解释”。

**Why this priority**: Prelude 的另一半是 Dynamic Evidence；没有可视化入口，证据字段会长期处于“能导出但没人用”的状态。

**Independent Test**: 访问 `/trial-run-evidence`（或在 `/platform-viz/*` 中提供直达入口），点击运行按钮，能稳定展示 Evidence summary JSON。

**Acceptance Scenarios**:

1. **Given** 页面已打开，**When** 运行一次 TrialRun，**Then** 展示 Evidence summary（JSON）且错误可见可解释。

---

### Edge Cases

- Manifest 超大：Raw JSON 必须可滚动且不阻塞主线程；必要时支持 `ExtractManifestOptions.budgets.maxBytes` 的裁剪演示。
- 可选字段缺失：例如 `servicePorts/staticIr/artifacts` 等尚未实现或未开启时，页面需明确提示“未提供/未开启”，避免误解为 bug。
- 不同输入形态：ModuleDef / Module / ModuleImpl 任选其一都应可展示（用于验证反射契约的鲁棒性）。
- JSON 粘贴失败：JSON parse/字段缺失/类型不符必须显式报错并阻止计算，不得崩溃或静默吞掉。

## Requirements _(mandatory)_

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: 系统 MUST 在 `examples/logix-react` 提供独立路由组：`/platform-viz/*`，并提供入口页（index）引导到各单项可视化页面。
- **FR-002**: `Manifest Inspector` 页面 MUST 调用 `Logix.Reflection.extractManifest` 并展示：
  - 摘要视图（moduleId、digest、counts）
  - Raw JSON 视图（pretty JSON + 一键复制）
  - 可选参数：`includeStaticIr`、`budgets.maxBytes`
- **FR-003**: `Manifest Diff Viewer` 页面 MUST 支持两类 before/after 输入：选择预置模块（内部 `extractManifest`）或粘贴 `ModuleManifest` JSON；页面 MUST 调用 `Logix.Reflection.diffManifest` 并展示 verdict/summary/changes，且 Raw JSON 可见。
- **FR-004**: 页面 MUST 对缺失的可选字段做显式提示（例如 `servicePorts` 未声明/`workflowSurface` 缺失等），不得静默吞掉或导致崩溃；并提供固定的“pending spec 清单”（以 `080` 的 spec-registry 为准）以避免误解为 bug。
- **FR-005**: 该特性 MUST NOT 引入 Node-only 依赖（`ts-morph/swc/fs` 等）进入浏览器 bundle；仅消费 `@logixjs/core`/`@logixjs/react`/`@logixjs/devtools-react` 的运行时 API 与 JSON 工件。

### Non-Functional Requirements (Performance & Diagnosability)

<!--
  If this feature touches Logix runtime hot paths, treat performance and
  diagnosability as first-class requirements:
  - Define budgets (time/alloc/memory) and how they are measured
  - Define what diagnostic events/Devtools surfaces exist and their overhead
-->
- **NFR-001**: 可视化输出 MUST 保持稳定排序（例如按 `actionKeys`/`schemaKeys`/`changes` 的既有排序），避免 UI 自己引入噪音 diff。
- **NFR-002**: Raw JSON 视图 MUST 可滚动、可复制，且对大对象不会导致页面明显卡顿（必要时用 budgets 裁剪演示）。
- **NFR-003**: 本特性不得修改 `@logixjs/core` 热路径；所有逻辑应局限在 example UI 层。

### Key Entities _(include if feature involves data)_

- **ModuleManifest**: `Reflection.extractManifest` 的输出（平台可消费 Static IR 的入口）。
- **ModuleManifestDiff**: `Reflection.diffManifest` 的输出（CI/门禁/解释链路的差异报告）。
- **TrialRun Evidence Summary**: `Observability.trialRun` 的 evidence.summary（平台可消费 Dynamic Evidence 的入口）。

## Success Criteria _(mandatory)_

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: `examples/logix-react` 新增 `/platform-viz` 入口页，以及至少两个独立页面：`/platform-viz/manifest`、`/platform-viz/manifest-diff`。
- **SC-002**: Manifest/Diff 页面输出稳定且可复现：同一模块对象在同一版本下重复刷新页面，展示内容一致（无 UI 侧随机字段）。
- **SC-003**: `TrialRun Evidence` 页面可在浏览器中运行并展示 evidence summary（错误可见可解释）。
