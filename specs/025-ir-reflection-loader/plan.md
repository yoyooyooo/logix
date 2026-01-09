# Implementation Plan: IR Reflection Loader（IR 反射与试运行提取）

**Branch**: `025-ir-reflection-loader` | **Date**: 2025-12-24 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/Users/yoyo/Documents/code/personal/intent-flow/specs/025-ir-reflection-loader/spec.md`

## Summary

本特性把“平台/CI/Agent 可消费的 IR”落到一条可复现、可对比、可解释的链路上，交付三类最小产物：

1. **Manifest IR（ModuleManifest）**：从用户导出的 `Module` 对象直接提取结构摘要（不依赖源码 AST），输出为 **deterministic JSON**，用于 Studio 画布渲染、CI 契约防腐、Agent 工具注册。
2. **Trial Run IR（TrialRunReport / EvidencePackage 子集）**：在“受控副作用”的 Build Env 中试跑一次（可配置窗口/超时/诊断等级），导出可序列化证据：
   - 复用现有 **控制面证据** `RuntimeServicesEvidence`（scope=builtin/runtime_default/runtime_module/provider/instance）作为“运行时控制面契约”的一部分；
   - 复用现有 **Static IR/Evidence Package** 导出链路（RunSession + EvidenceCollector），为后续 Runtime IR / Trace IR 演进预留一致的 on-wire 形态；
   - 对“构建态缺失依赖（Service/Config）”给出可行动错误（复用 `ConstructionGuardError` 等机制），并在失败时尽可能携带 `environment/manifest` 等可解释 IR（提取不到则省略）。
3. **Contract Guard（diffManifest）**：对比两份 `ModuleManifest`（可选含 StaticIR digest）并输出可机器消费的差异摘要，用于 CI 阻断或告警（与 POC 的 diff 视图复用同一口径；输出 schema 固化到 `specs/025-ir-reflection-loader/contracts/schemas/module-manifest-diff.schema.json`）。

首个落地载体（first consumer）是 024 的 **program module**：即会被 `Runtime.runProgram/openProgram` 运行的模块入口；平台/CI 以该入口为单位产出 `ModuleManifest/StaticIR/TrialRunReport` 工件并做契约防腐与可视化。

为避免 024 Runner 与 025 Trial Run 的生命周期语义漂移：025 的 Trial Run MUST 复用 024 的 `openProgram/boot` 内核（共享实现），只在其上叠加试跑窗口策略（超时/证据导出/诊断等级/受控副作用）。

> “内核提前支撑”与现有“控制面”属于同一条路：**不再造一套依赖/覆写/证据模型**；025 只做最小必要补齐（Manifest 投影、Build Env 试跑窗口、可序列化证据落点），并把未来平台化（15 草案）所需的扩展点留在“可注入、可隔离、可导出证据”的内核协议里。

## Technical Context

**Language/Version**: TypeScript 5.8.2 + Node.js 22.21.1  
**Primary Dependencies**: effect v3 (`effect@^3.19.8`) + `@logixjs/core`（含 Observability/TrialRun/Evidence）  
**Storage**: N/A（不引入持久化存储）  
**Testing**: Vitest (`vitest run`) + `@effect/vitest`（Effect-heavy 场景）  
**Target Platform**: Node.js（CI/脚本/Studio Loader），并保持可在浏览器侧（Sandbox/Devtools）复用证据协议  
**Project Type**: pnpm workspace（`packages/*` + `apps/*` + `examples/*`）  
**Performance Goals**:

- **默认近零开销**：未启用 trial run / 诊断导出时，运行时热路径不应新增额外分配或 O(n) 扫描；若需触及 `$.use` 等高频入口，必须沿用“diagnostics=off 的零额外开销”门槛（参考 022/BoundApi 的现有做法）。
- **受控试跑开销可预算**：trial run 的时间/事件/输出体积必须可配置且可裁剪（maxEvents、输出大小上界），并在超限时以结构化错误失败。
- **度量方式**：针对“仅启用 trial run 的启动+释放”提供可复跑基线（重复 N 次 trialRun + Scope close，记录 wall time/事件数），证据写入本 feature 的计划或后续 perf 产物。
  **Constraints**:
- **控制面口径复用**：Environment/Runtime 相关证据必须复用 `RuntimeServicesEvidence` 与其 scope 枚举；不得平台侧再造一套“覆写来源/优先级/作用域”概念。
- **确定性**：Manifest/TrialRun 输出中用于对齐的标识、集合排序必须稳定；CI 场景必须显式注入 `runId`（禁止默认 Date.now 导致不可对比）。
- **标识分层（runId vs instanceId）**：`runId` 是 Trial Run / RunSession 的会话标识；runtime `instanceId` 仍是运行时实例标识（默认可稳定如 `i1`）。对外导出的 TrialRunReport/Evidence 对齐键至少携带 `runId + moduleId + instanceId`，不得混用或强行相等。
- **EnvironmentIR 口径**：EnvironmentIR 是试跑期间的“观测集合（best-effort）”，不承诺穷尽；必须同时输出缺失依赖摘要（`missingServices/missingConfigKeys`）以保证可行动性。
- **Manifest meta/digest 口径**：
  - `ModuleManifest.meta` 只允许稳定、可复现元信息（禁止时间戳/随机/机器特异信息）。
  - `ModuleManifest.digest` 只由结构字段决定（不包含 meta/source），减少 CI diff 噪音。
- **Contract Guard 口径**：`diffManifest` 的 meta 变化默认归类为 RISKY（可通过 allowlist 降噪），不得作为 breaking；source 变化默认 INFO。
- **IR 字段对齐**：`ModuleManifest` 是 `ModuleDescriptor` 的可序列化投影，字段名/语义与其对齐（`moduleId/actionKeys/logicUnits/schemaKeys/meta/source`），避免平台/CI 侧引入映射层导致漂移。
- **试跑窗口禁止“隐式保活”**：trial run 不能依赖常驻逻辑自动退出；必须通过 Scope close / 超时策略强制收束，并明确报告“未完成/被取消”的原因。
- **超时模型与分类**：Trial Run 采用两段超时：`trialRunTimeoutMs`（试跑窗口）+ `closeScopeTimeout`（释放收束，复用 024 `closeScopeTimeout`）；窗口超时归类为 TrialRunTimeout，释放超时归类为 DisposeTimeout（必要时可同时记录）。
- **缺失依赖可行动失败（Trap/Mock）**：trial run 必须通过 `options.layer` 注入 Trap/Mock Layer（复用 `Runtime.make(..., { layer })` 的装配能力），把“构造/装配阶段访问缺失 Service/Config”收敛为可序列化的 hard fail（missing 清单 + 阶段/标识），而不是崩溃或静默跳过。
- **证据 Slim & 可序列化**：summary/events 只能包含 JsonValue；禁止导出闭包/Effect 本体/大型对象图。
- **不引入 boot-only/dryRun**：本期 Trial Run 仍按 full boot 启动（不执行 `main`）；“受控副作用”依赖 BuildEnv/ConstructionGuard + Trap/Mock + budgets/timeout 收束，避免另起一套 boot 协议导致 024/025 漂移。
  **Scale/Scope**:
- 本 feature 不直接交付 Studio/HMR/数字孪生/Trace IR/Intent IR；但必须确保现有 EvidencePackage 协议与 manifest 形态不阻塞它们的演进。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- Answer the following BEFORE starting research, and re-check after Phase 1:
  - How does this feature map to the
    `Intent → Flow/Logix → Code → Runtime` chain?
  - Which `docs/specs/*` specs does it depend on or modify, and are they
    updated first (docs-first & SSoT)?
  - Does it introduce or change any Effect/Logix contracts? If yes, which
    `.codex/skills/project-guide/references/runtime-logix/*` docs capture the new contract?
  - IR & anchors: does it change the unified minimal IR or the Platform-Grade
    subset/anchors; are parser/codegen + docs updated together (no drift)?
  - Deterministic identity: are instance/txn/op IDs stable and reproducible
    (no random/time defaults); is the identity model documented?
  - Transaction boundary: is any IO/async work occurring inside a transaction
    window; are write-escape hatches (writable refs) prevented and diagnosed?
  - Internal contracts & trial runs: does this feature introduce/modify internal
    hooks or implicit collaboration protocols; are they encapsulated as explicit
    injectable Runtime Services (no magic fields / parameter explosion), mockable
    per instance/session, and able to export evidence/IR without relying on
    process-global singletons?
  - Performance budget: which hot paths are touched, what metrics/baselines
    exist, and how will regressions be prevented?
  - Diagnosability & explainability: what diagnostic events/Devtools surfaces
    are added or changed, and what is the cost when diagnostics are enabled?
  - User-facing performance mental model: if this changes runtime performance
    boundaries or an automatic policy, are the (≤5) keywords, coarse cost model,
    and “optimization ladder” documented and aligned across docs/benchmarks/diagnostics?
  - Breaking changes: does this change any public API/behavior/event protocol;
    where is the migration note documented (no compatibility layer)?
  - What quality gates (typecheck / lint / test) will be run before merge,
    and what counts as “pass” for this feature?

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- `Intent → Flow/Logix → Code → Runtime`：本特性位于 “Code → Runtime（可试跑导出证据）” 与 “Code → Platform（Manifest）” 的交界：通过动态 import + 反射/试跑，把运行时代码的“最终对象形状”投影成平台可消费 IR。
- Docs-first & SSoT：平台侧思路参考 `docs/specs/sdd-platform/workbench/15-module-runtime-reflection-loader.md`；本特性的对外契约与证据协议必须与 `specs/020-runtime-internals-contracts/*` 对齐（schema/口径复用），必要时先更新 SSoT 再落代码。
- Effect/Logix contracts：优先复用 `@logixjs/core/Observability.trialRun` + EvidencePackage；若新增 `ModuleManifest` 导出或“依赖收集器”协议，必须同步更新 `.codex/skills/project-guide/references/runtime-logix/logix-core/*`（runtime 侧 SSoT）与 `apps/docs`（用户文档，避免平台内部术语泄漏）。
- IR & anchors：Manifest IR 是对 `ModuleDescriptor`/Module 反射字段的 **静态投影**（不引入新的并行真相源）；TrialRun IR 复用 EvidencePackage 的 `summary.runtime.services`（`RuntimeServicesEvidence`）与 `summary.converge`（如存在），保持最小 IR 口径一致。
- Deterministic identity：CI/平台场景必须显式提供 `runId`（Trial Run / RunSession 会话），不得依赖 RunSession 默认 `Date.now()`/进程序号作为对比锚点；`runId` 与 runtime `instanceId` 分离，导出对齐键至少携带 `runId + moduleId + instanceId`。实例/txn/op 等稳定标识仍由既有 Runtime Identity Model 提供（本 feature 不引入新的随机 id）。
- Transaction boundary：trial run/manifest 提取不在事务窗口内执行 IO；任何“构建态副作用/违规访问”属于违规并应可解释失败（本期以缺失服务为主信号；通用 IO 禁止策略作为后续扩展，不作为 025 验收项）。
- Internal contracts & trial runs：新增任何“收集/导出”能力都必须是显式 Runtime Service（Tag）或 Observability API，并可按 session/instance 注入与隔离；禁止进程级单例写入与隐式魔法字段。
- Performance budget：可能触及的高频入口是 `BoundApi.$.use` 的“可选依赖采集”（如要覆盖 serviceTag/moduleTag 使用）；必须延续现有 `diagnostics=off` 的零额外开销策略（缓存 diagnosticsLevel、off 分支不做 tap/descriptor）。
- Diagnosability & explainability：TrialRun 失败必须分类（缺失依赖/构建态违规/超时/运行期失败），且超时需要区分 TrialRunTimeout（窗口）与 DisposeTimeout（释放收束）；并可通过 EvidencePackage（summary + 可选 events）还原发生了什么；诊断开启成本必须可被裁剪（maxEvents/level）。
- User-facing mental model（≤5 关键词）：Manifest / TrialRun / Evidence / Scope / Deterministic。
- Breaking changes：优先新增 API 与 schema；若需要调整既有 EvidencePackage/Debug 事件协议，必须同步迁移说明（docs/specs + apps/docs），不保留兼容层。
- Quality gates：`pnpm typecheck`、`pnpm lint`、`pnpm test`（最小回归至少覆盖 core 的 trialRun/evidence 导出用例）。

**Re-check (post Phase 1 design)**: PASS（2025-12-24）

## Project Structure

### Documentation (this feature)

```text
specs/025-ir-reflection-loader/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
├── checklists/
├── perf.md
├── perf/
├── handoff.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/src/
├── Module.ts                                 # 复用/投影 ModuleDescriptor（Manifest IR 的字段来源之一）
├── Debug.ts                                  # diagnostics level/事件管道（试跑导出时复用）
├── Observability.ts                          # Observability 公共入口（trialRun / trialRunModule）
├── Reflection.ts                             # 025：Manifest/Static IR 提取公共入口（拟新增）
└── internal/
   ├── observability/
   │  ├── trialRun.ts                          # 已存在：TrialRun + Scope close + EvidencePackage 导出
   │  ├── evidenceCollector.ts                 # 已存在：收集 converge static IR + runtime services evidence
   │  └── runSession.ts                        # 已存在：RunSession（runId 可注入；CI/平台必须显式注入）
   ├── reflection/                            # 025：Manifest/StaticIR/EnvironmentIR 提取实现（拟新增）
   ├── platform/
   │  ├── BuildEnv.ts                          # 已存在：Build Env（ConfigProvider/RuntimeHost）
   │  └── ConstructionGuard.ts                 # 已存在：缺失服务 → 可行动错误
   └── runtime/
      └── core/RuntimeKernel.ts                # 已存在：控制面覆写与 RuntimeServicesEvidence（scope 口径）

specs/020-runtime-internals-contracts/
└── contracts/schemas/runtime-services-evidence.schema.json  # 控制面证据 schema（025 复用）

docs/specs/sdd-platform/workbench/
└── 15-module-runtime-reflection-loader.md     # 平台侧草案（025 吸收其 Loader 思路并落到 runtime 可导出协议）

examples/logix/src/scenarios/
└── trialRunEvidence.ts                         # 已存在：trialRun 导出 + schema 校验示例（可作为回归基线）

examples/logix-react/src/demos/
└── TrialRunEvidenceDemo.tsx                     # 已存在：浏览器侧 trialRun evidence 演示（作为契约对齐参照）

examples/logix-sandbox-mvp/
└── src/App.tsx                                  # 可选：作为 POC 增加 IR 可视化路由（对齐 sandbox 链路）
```

**Structure Decision**:

- Manifest/TrialRun 能力属于运行时“可诊断/可导出协议”，核心落点在 `@logixjs/core`（Observability/BuildEnv/RuntimeKernel）。
- 平台/Studio 的 Loader Script 属于消费方，可先以脚本/CLI 形式在外部实现；本仓只需提供稳定 API + schema + quickstart。

## POC: IR 平台可视化（ROI 优先级）

> 目标：用一个最小“可视化载体”验证 IR 的可解释性与可复用性，并让同一套视图同时服务 Studio/CI/Agent。  
> POC 选择：优先落在 `examples/logix-sandbox-mvp/`（路由/Tab），作为“运行时对齐实验室”里 IR 视角的补全。
>
> 详细拆解（展现形式/交互/复用契约）：见 `specs/025-ir-reflection-loader/poc-visualization.md`。

### 前端选型（POC 基座，面向可复用组件）

- Host：React + Vite（`examples/logix-sandbox-mvp/`）+ `react-router-dom`；IR 视图只依赖 JSON 工件，不依赖 runtime 内部对象图。
- UI 基座：优先 `shadcn/ui`（与 `apps/studio-fe` 同风格），用于 Tabs/Card/Badge/Alert/Dialog/Sheet/Table/ScrollArea 等通用组件；避免再造第二套交互与样式体系。
- JSON/Graph：JSON viewer 选用轻量组件；DAG 选用“可交互画布 + 可确定布局”的组合（具体包与结构见 `poc-visualization.md`）。
- 性能护栏：默认 `maxEvents=1000` + 视图懒加载（P1/P4）+ 大列表虚拟滚动（Timeline）。

### P0（最高 ROI）：ModuleManifest 结构面板 + 版本 diff/Breaking 检测

- 结构面板：模块身份、schemaKeys、actions、slots/logics 摘要、meta/source（若存在）。
- diff/Breaking：直接复用/对齐 CI 的 Contract Guard（同一套 diff 规则产出机器可消费结果 + 人类可读解释）。

### P1：StaticIR（StateTrait）依赖图可视化

- 展示 computed/link/source/check 的 DAG（或等价表示），并标注 reads/writes、digest、冲突（cycle/multi-writer）。
- 视图应支持从 manifest/staticIrDigest 快速跳转定位。

### P2：TrialRunReport 预检报告面板（可一键重跑）

- 展示：missing services、configKeys、违规阶段分类、可行动修复提示（例如“提供某 Tag 的 Layer”）。
- 一键重跑：要求显式 `runId`（保证可对比），并允许配置 budgets（timeout/maxBytes/maxEvents）。

### P3：RuntimeServicesEvidence 控制面覆写解释器

- 按 scope 展示选择链路、overridesApplied、fallback 原因（回答“为什么选了这个 impl”）。
- 口径必须复用 `RuntimeServicesEvidence`（020 schema），避免平台侧再造解释模型。

### P4（次高）：Evidence Session 时间线 + 静态 IR digest 引用定位

- 时间线展示关键事件序列（可裁剪），并能跳转到对应的 staticIrDigest / converge digest 的结构视图。
- 作为“发生了什么”的可分享诊断入口（后续可演进为回放/重放）。

### POC 约束（避免把 UI 绑死在内部实现）

- 只消费 **JSON schema** 定义的载荷（`contracts/schemas/*`）；不得直接依赖运行时内部对象图。
- runId 必须可注入且稳定；排序/digest 必须确定性（可 diff）。
- 默认只消费 summary（Slim）；全量 events 作为可选开关（受 maxEvents/budgets 约束）。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

- 性能证据落点：`specs/025-ir-reflection-loader/perf.md`（由 `tasks.md` 的 Phase N 产出）。
- 若实现触及 `BoundApi.$.use` 等热路径：复用 `pnpm perf bench:useModule` 记录可复现基线与变更后对比（至少时间/分配之一），并在 perf.md 写明预算阈值与回归防线。
