# Spec Group: Full-Duplex Prelude（全双工前置：统一最小 IR + Platform-Grade 锚点 + 保守回写）

**Feature Branch**: `080-full-duplex-prelude`  
**Created**: 2026-01-09  
**Status**: Done  
**Input**: 以 `080` 作为 `$speckit group` 总控：把全双工前置中“理论可行且值得先做”的 IR/反射/锚点/回写能力统一规格化；对实现难度异常大的项显式标记，但先把规划到位。

## Why: 为什么要有一个 Group Spec

全双工（Code ↔ Graph ↔ Runtime）不是单点能力，而是一组“互相咬合的契约”：

- 没有 **稳定锚点**（instanceId/txnSeq/opSeq/serviceId…），就无法可回放/可对齐；
- 没有 **可序列化 IR**（Manifest/Static IR/Artifacts），平台只能看运行期痕迹，难以做门禁与解释；
- 没有 **Platform-Grade 子集的可回写能力**（Parser/Rewriter），就无法把“看见的问题”闭环回写到源码，长期演进会形成并行真相源。

我们已经有大量相关 spec 分散在 `specs/*` 与 `docs/specs/sdd-platform/*`。缺少总控会导致：术语漂移、锚点口径不一致、平台侧链路“能跑但不可解释”。

因此需要一个单入口：

- 只负责：**成员关系、依赖顺序、里程碑门槛、证据回写口径**；
- 不复制成员 spec 的实现 tasks（避免并行真相源）。

## Prelude 的定义（本 group 的边界）

Prelude = 为下一阶段“试跑 + 可视化 + 可回写”打通的最小基建组合，强调：

- **结构可见（Structure Awareness）**：模块/动作/服务/端口/类型等关系可枚举；
- **可解释（Explainable）**：差异、缺失、冲突都能定位到稳定锚点；
- **可回写（Write-Back）**：对 Platform-Grade 子集内的“声明缺口”能保守补全并写回源码；
- **宁可错过不可乱补**：不确定即跳过，输出 reason codes 和可行动建议。

本 group 不承诺“对任意 TypeScript 代码无损 roundtrip”；仅推进 Platform-Grade 子集（见 `docs/ssot/platform/ir/00-codegen-and-parser.md`）的最小可逆闭环。

## Clarifications

### Session 2026-01-09

- AUTO: Q: M2 与 M3 的硬前置关系？→ A: **M2 是 M3 的硬前置**；在回写闭环（081/082/079/085）达标前，M3（Slots/Spy）只允许 report/手写探索，禁止提出“需要大规模自动回写/迁移”的落地策略。
- AUTO: Q: Node-only 工具链与 runtime 的边界？→ A: `ts-morph/swc` 等仅允许出现在 Node-only（`packages/logix-anchor-engine`/`packages/logix-cli`）；`packages/logix-core` 禁止依赖。

### Session 2026-01-12

- Q: `061/086` 在 `080` 中是否计入里程碑门槛？→ A: 两者属于可选增强/消费者回归面，**不计入** `M0–M3` 门槛；其中 `061` 已实施完成（见其 `tasks.md` 全勾）。
- Q: `spec-registry.json` 的 `status` 是否必须与实际实现进度一致？→ A: 是；`status` 作为 group 调度与看板事实源，需持续维护并与落地进度一致（例如 `061` 应标为 `done`）。
- Q: `080`（本 group spec）的 “done” 口径是什么？→ A: 只对 group 自身产物负责：registry/checklists/统一裁决一致性达标即可；不阻塞成员 specs 的实现完成。
- Q: member 的 `status=done` 证据门槛是什么？→ A: 必须同时满足：`tasks.md` 全勾 + `$speckit acceptance <id>` 通过。
- Q: 成员 `spec.md` 顶部的 `**Status**` 是否必须与 registry 同步？→ A: 仅在成员 `status` 为 `done/frozen` 时强制同步（其余可延后）。

## Non-Negotiable Principles（强约束）

- **单一真相源**：权威永远是源码中的显式锚点声明；TrialRun/Loader/Spy 只作证据与校验输入。
- **稳定标识去随机化**：所有锚点必须稳定、可序列化、可 diff；禁止随机/时间戳作为默认锚点来源。
- **Workflow 锚点必须可回写**：任何进入 `Π` 的 Workflow 都必须具备稳定锚点（至少 `programId + stepKey`），并能进入 Platform-Grade 子集的 Parser/Autofill/Rewriter 闭环；否则 Workflow 永远停留在 Raw/Gray Box，无法门禁化与全双工回写。
- **诊断事件 Slim 且可序列化**：平台/Devtools 只消费 JSON-safe 负载；超限必须可解释降级。
- **事务窗口禁止 IO**：任何 IO 必须事务外执行；试跑也必须可控、副作用可治理。

## Members（本 group 调度的 specs）

关系 SSoT：`specs/080-full-duplex-prelude/spec-registry.json`（机器可读）。  
人读阐述：`specs/080-full-duplex-prelude/spec-registry.md`（含 Hard/Spike 标记与里程碑门槛）。

- 统一观测协议（证据包/跨宿主硬门）：`specs/005-unify-observability-protocol/`
- 基础锚点与可序列化诊断：`specs/016-serializable-diagnostics-and-identity/`
- 反射与试跑（Manifest/EnvironmentIR/TrialRunReport）：`specs/025-ir-reflection-loader/`
- TrialRun artifacts 槽位（补充 Static IR）：`specs/031-trialrun-artifacts/`
- 模块引用空间事实源（PortSpec/TypeIR + CodeAsset）：`specs/035-module-reference-space/`
- SchemaAST 分层与 registry（解释/校验底座）：`specs/040-schemaast-layered-upgrade/`
- Playground Editor Intellisense（可选增强，不计入里程碑门槛）：`specs/061-playground-editor-intellisense/`
- Action Surface manifest（动作锚点）：`specs/067-action-surface-manifest/`
- Workflow/Π surface（WorkflowDef → Π slice）：`specs/075-workflow-codegen-ir/`
- Module↔Service（servicePorts）纳入 Manifest：`specs/078-module-service-manifest/`
- 保守自动补全锚点声明（回写源码）：`specs/079-platform-anchor-autofill/`
- Platform Visualization Lab（可选增强，不计入里程碑门槛）：`specs/086-platform-visualization-lab/`
- Platform-Grade Parser MVP（Hard）：`specs/081-platform-grade-parser-mvp/`
- Platform-Grade Rewriter MVP（Hard）：`specs/082-platform-grade-rewriter-mvp/`
- Logix CLI（Node-only 基础能力入口）：`specs/085-logix-cli-node-only/`
- Named Logic Slots（语义插槽，Medium→Hard）：`specs/083-named-logic-slots/`
- Loader Spy 依赖采集（Hard/Spike；证据不作权威）：`specs/084-loader-spy-dep-capture/`

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 平台可枚举并解释 Module 的关键关系（无 AST、可序列化） (Priority: P1)

作为平台/Devtools 维护者，我希望只通过模块导出对象与受控试跑（而非读取源码 AST），就能拿到可序列化、可 diff 的最小 IR（Manifest + Static IR + Artifacts + TrialRunReport 摘要），并据此解释模块的 actions、servicePorts、ports/typeIR 等关键关系。

**Why this priority**: 这是“试跑 + 可视化”的前置：没有可枚举的结构与稳定锚点，平台无法形成可解释的图谱与门禁。

**Independent Test**: 对同一模块入口重复导出 IR/报告，结果确定性一致，且能在缺失/冲突时定位到稳定锚点字段（moduleId/serviceId/port/instanceId/txnSeq/opSeq）。

**Acceptance Scenarios**:

1. **Given** 一个模块入口，**When** 导出最小 IR 与 TrialRunReport，**Then** 输出可 JSON 序列化且可稳定 diff。
2. **Given** 环境缺失服务或冲突，**When** 试跑/对齐检查，**Then** 报告能定位到 `moduleId + port + serviceId`（或等价稳定锚点）并给出可行动提示。

---

### User Story 2 - 缺失的 Platform-Grade 声明可被保守补全并回写源码（单一真相源） (Priority: P1)

作为业务模块作者/平台使用者，我希望当模块缺失关键锚点声明（例如未声明 `services`、缺少 `dev.source`），且该缺口在 Platform-Grade 子集内可被高置信度确定时，系统能自动补齐并回写源码；若不确定则明确跳过并解释原因（宁可错过不可乱补）。

**Why this priority**: 只有把缺口回写到源码，平台才能长期稳定；否则会产生“运行期证据”与“平台缓存”两套真相源。

**Independent Test**: 对一个缺失锚点声明的模块运行补全：只写回缺失字段、不覆盖已有声明；重复运行幂等；不确定项全部跳过并在报告中给出 reason codes。

**Acceptance Scenarios**:

1. **Given** 模块缺失 `services` 且存在可确定的依赖使用点，**When** 运行补全，**Then** 源码被更新为显式声明且幂等。
2. **Given** 依赖出现在条件分支或动态路径，**When** 运行补全，**Then** 不写回并报告为“不确定/需显式声明”。

---

### User Story 3 - Platform-Grade 子集具备最小可逆闭环（Parser→IR→Rewriter） (Priority: P2)

作为平台开发者，我希望对 Platform-Grade 子集能建立“可解析 + 可重写”的最小闭环，使平台能把“结构差异/缺口”转换为最小源码补丁，并可在冲突/歧义时显式失败而非 silent corruption。

**Why this priority**: 这是全双工从“只读索引”迈向“可控回写”的分水岭。

**Independent Test**: 对同一输入源码，Parser 导出结构化节点（锚点定位）并可生成补丁写回；对不可解析形态显式降级或失败。

**Acceptance Scenarios**:

1. **Given** 符合 Platform-Grade 子集的 `Module.make(...)` 定义，**When** 解析并生成补丁，**Then** 可稳定写回新增字段且不破坏其它代码。
2. **Given** 代码形态超出子集（中转变量/动态组合），**When** 解析，**Then** 显式降级为 Raw Mode（只报告不回写）。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 本 group MUST 维护成员关系的单一事实源：`spec-registry.json`（机器可读）+ `spec-registry.md`（人读阐述），并能生成 group 执行清单（checklists）。
- **FR-002**: 本 group MUST 明确依赖顺序与里程碑门槛，使“试跑 + 可视化 + 可回写”的前置能力可被阶段性签收。
- **FR-003**: 本 group MUST 强制“单一真相源”：任何自动补全只针对未声明字段，且必须回写源码；TrialRun/Spy 只作为证据输入，不得成为长期权威。
- **FR-004**: 本 group MUST 强制“宁可错过不可乱补”：不确定时不写回，并输出结构化原因与可行动建议。
- **FR-005**: 当需要自动补全 `services` 时，端口命名 MUST 采用确定性策略：默认 `port = serviceId`；仅在需要更强解释时由作者显式提供业务别名端口名。
- **FR-006**: 本 group MUST 将 `spec-registry.json.status` 作为进度事实源并持续维护，使其与实际落地进度一致（例如 tasks 完成后标为 `done`）。
- **FR-007**: 本 group 的完成口径 MUST 仅覆盖 group 自身产物（registry/checklists/统一裁决一致性），不得把成员 specs 的实现完成作为阻塞条件（成员验收以各自 spec 为准）。
- **FR-008**: 本 group MUST 定义成员 `status=done` 的证据门槛：`tasks.md` 全勾且 `$speckit acceptance <id>` 通过后才允许标为 `done`。
- **FR-009**: 当成员 `spec-registry.json.status` 为 `done/frozen` 时，本 group MUST 同步维护其 `spec.md` 顶部的 `**Status**` 字段，避免 status 口径分裂。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 所有 IR/报告/诊断输出 MUST 确定性且可序列化；禁止随机/时间戳/机器特异信息作为默认来源。
- **NFR-002**: 输出 MUST slim 且有预算/截断语义；超限必须可解释降级而非 silent drop。
- **NFR-003**: Prelude 能力 MUST 不引入运行时常驻成本；它们的效果通过“源码显式锚点”与“按需导出/试跑”体现。
- **NFR-004**: Node-only 工具链 MUST 与 runtime 严格隔离：`packages/logix-core` 严禁依赖 `typescript/ts-morph/swc`；Parser/Rewriter/Write-back 只存在于 Node-only 包。
- **NFR-005**: 工具链 MUST 控制 install/cold-start 代价：对不需要解析的命令必须避免加载 `ts-morph`；浏览器侧不得打包 Node-only 工具链依赖。

## Milestones（组内门槛与前置约束）

- **M2（可回写闭环）是 M3 的硬前置**：在 M2 跑通（Parser/Rewriter/Autofill/CLI 可逆闭环）之前，禁止推动任何需要“大规模自动回写/迁移”的语义特性落地策略（避免“坑挖了填不上”）。

## Success Criteria _(mandatory)_

- **SC-001**: `080` 具备可用的 group registry，并能生成 `checklists/group.registry.md` 作为单入口执行索引清单（不复制成员 tasks）。
- **SC-002**: 该 group 覆盖的关键能力缺口都以独立 member spec 固化（无“脑内规划”），且对 Hard/Spike 项显式标注（见 `spec-registry.md`）。
- **SC-003**: 成员 specs 的共同裁决（单一真相源/宁可错过/稳定锚点/可序列化）在各 spec 中不互相矛盾，避免并行口径。
