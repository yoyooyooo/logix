# Feature Specification: Module↔Service 关系纳入 Manifest IR（平台可诊断/可回放）

**Feature Branch**: `078-module-service-manifest`  
**Created**: 2026-01-09  
**Status**: Draft  
**Input**: 补齐平台终态 IR/反射：将 Module 与 Service 的关系纳入可序列化 Manifest/IR，用于试运行、Devtools 诊断与可回放

## Context

平台侧要做到“可诊断、可回放”的终态，需要把系统从“只能看运行期事件”推进到“既有静态结构，又有动态证据”的统一最小 IR（Static IR + Dynamic Trace）：

- **平台试运行（Trial Run）**：在不深入执行业务交互的情况下，能判断一个 Module（或一组 Modules）运行所需的输入依赖是否齐全，并给出可解释的缺失/冲突诊断。
- **Devtools 解释链路**：能回答“这个模块为什么需要这个服务”“缺的是哪一个服务端口”“冲突的服务由谁提供”，并且信息可稳定复现、可序列化、可 diff。
- **可回放（Replay）**：回放不只需要记录事件，还需要能对齐“运行时环境提供了什么、模块声明需要什么”，否则无法做到 deterministic 的解释与门禁。

当前 Module 与 Service 的关系仍存在“反射/IR 缺口”：缺少一份平台可消费的、可枚举的 Module↔Service 关系描述，导致平台只能依赖运行时痕迹或人工约定，无法做到稳定对齐与极致诊断。

## Clarifications

### Session 2026-01-09

- AUTO: Q: `servicePorts` 的权威来源是什么？→ A: 只来自源码显式声明（`ModuleDef.services`），不做 AST 推断或运行期推断。
- AUTO: Q: 若 Tag 无法得到稳定 `ServiceId` 怎么办？→ A: 视为契约违规：对显式声明的 `services` 必须 fail-fast（在模块构造/导出 Manifest 前）并给出可行动错误；禁止生成不可信 `ServiceId` 进入 IR。
- AUTO: Q: `optional=true` 的语义是什么？→ A: optional 缺失不得导致试运行/对齐 hard-fail，但必须可解释可定位；required 缺失/冲突默认 hard-fail。

## Goals / Scope

### In Scope

- 定义并固化“模块输入服务依赖”的可枚举表示（命名端口 + 稳定服务标识），并纳入平台可消费的 Manifest/IR。
- 让平台能够构建 Module↔Service 关系视图，并用于试运行、诊断与回放对齐（含差异报告）。
- 让服务关系的变化可以被稳定 diff 与门禁捕获（避免“隐式变更导致回放/诊断漂移”）。

### Out of Scope

- 自动从代码推断服务依赖（本特性以显式声明为准，不做反编译/静态分析推断）。
- 为历史形态保留兼容层或弃用期（forward-only evolution）。

## Assumptions & Dependencies

### Assumptions

- 模块与服务都具备稳定的标识，可在不同运行/不同进程中一致对齐（去随机化）。
- 平台侧需要的是“可序列化、可 diff”的 IR，而不是运行时对象引用。

### Dependencies

- 依赖统一最小 IR 的裁决与证据链路口径（Static IR + Dynamic Trace）。
- 依赖诊断事件/报告“Slim 且可序列化”的全局约束（避免把不可回放对象写进证据）。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 平台可枚举模块依赖的服务端口（Manifest IR） (Priority: P1)

作为平台/工具链开发者，我希望从一个模块产物中直接得到“该模块依赖哪些服务”的结构化清单，并能据此构建 Module↔Service 关系图谱与索引。

**Why this priority**: 没有可枚举的静态关系，平台只能依赖运行时痕迹“猜依赖”，无法做稳定对齐与极致诊断。

**Independent Test**: 对任意模块产物执行 Manifest 提取，断言输出包含模块标识与服务端口清单，且结果可 JSON 序列化并稳定 diff。

**Acceptance Scenarios**:

1. **Given** 一个模块声明了若干服务端口，**When** 平台导出该模块的 Manifest，**Then** Manifest 中包含 `moduleId` 与 `servicePorts`（端口名 + 稳定服务标识），且整体可 JSON 序列化。
2. **Given** 两个模块分别用不同端口名指向同一服务标识，**When** 平台构建关系视图，**Then** 能按服务标识聚合 consumer，并保留各模块的端口名用于解释与定位。

---

### User Story 2 - 试运行/回放的环境完整性诊断（缺失/冲突可解释） (Priority: P1)

作为平台/Devtools 用户，我希望在试运行或回放时，一旦运行时环境缺失所需服务或存在服务冲突，系统能给出可解释、可机器解析且跨运行稳定的诊断报告。

**Why this priority**: “缺服务/服务冲突”是平台试运行与回放对齐最常见的失败原因；如果不能准确定位到模块与端口，诊断成本会指数级上升。

**Independent Test**: 构造一个缺失服务/冲突服务的环境，启动试运行或对齐检查，断言能得到结构化诊断报告（含 moduleId + 端口名 + 服务标识）。

**Acceptance Scenarios**:

1. **Given** 环境缺失某模块所需服务，**When** 发起试运行或回放对齐检查，**Then** 失败并产出结构化报告，包含缺失项的 `moduleId`、端口名与服务标识。
2. **Given** 环境中对同一服务标识存在多份候选导致歧义/覆盖风险，**When** 发起试运行或回放对齐检查，**Then** 失败并产出结构化报告，包含冲突服务标识与候选来源信息。

---

### User Story 3 - 服务关系变更可被 Diff/门禁捕获 (Priority: P2)

作为 Runtime/平台维护者，我希望服务端口关系的变化（新增/删除/改服务标识/改端口名）都能被稳定 diff 捕获，并可作为 CI/门禁条件，避免“无意的隐式变更”破坏诊断与回放链路。

**Why this priority**: 一旦服务关系漂移，Devtools 与回放会出现“表面还能跑、但解释链断裂”的隐性故障，修复代价高且难回溯。

**Independent Test**: 对两份模块产物导出 Manifest 并做 diff，断言能稳定产出差异摘要，并可据此判定门禁通过/失败。

**Acceptance Scenarios**:

1. **Given** 两份模块产物的服务端口集合不同，**When** 平台对 Manifest 做 diff，**Then** 产出稳定差异结果，明确指出新增/删除/变更项。

### Edge Cases

- 端口名变更但服务标识不变：diff 能解释为“端口名变更”，而不是不可理解的噪声。
- 同一模块声明两个端口指向同一服务标识：允许但必须可解释；端口名冲突必须失败并给出诊断。
- 声明了服务但运行时从未使用 / 运行时使用了未声明的服务：必须能诊断并支持门禁化策略。
- 环境中同一服务标识出现多份候选：必须能诊断并支持升级为失败。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 支持模块以“端口名 → 服务标识（ServiceId）”的形式声明其输入服务依赖，并能被平台/Devtools 枚举。
- **FR-002**: 系统 MUST 为每个依赖服务提供稳定、确定性的 `ServiceId`（可序列化为字符串；同一服务跨进程/跨运行一致）。
- **FR-003**: 系统 MUST 能导出模块的 Manifest IR，并在其中包含 `moduleId` 与 `servicePorts`（端口名 + ServiceId）；该 IR 必须完全 JSON 可序列化且稳定可 diff。
- **FR-004**: 系统 MUST 支持平台侧构建 Module↔Service 关系视图：按 `moduleId` 查询其全部 `servicePorts`，按 `ServiceId` 查询所有 consumer 模块。
- **FR-005**: 当试运行/回放环境缺失模块所需服务时，系统 MUST 产出结构化诊断报告，至少包含 `moduleId`、端口名与 `ServiceId`。
- **FR-006**: 当运行时环境对同一 `ServiceId` 出现多份候选导致冲突/覆盖风险时，系统 MUST 产出结构化诊断报告，至少包含冲突的 `ServiceId` 与候选来源信息。
- **FR-007**: 系统 MUST 支持“静态声明（Manifest）↔ 实际运行时环境（Evidence）”的对齐检查，并能导出可序列化的差异结果用于门禁与 Devtools 展示。
- **FR-008**: 系统 MUST 支持显式声明“可选服务依赖”（optional=true）：缺失可选依赖不得导致试运行/对齐 hard-fail，但必须可解释可定位。
- **FR-009**: 系统 MUST 对显式声明的 `services` 做 `ServiceId` 稳定性校验：若无法得到稳定 `ServiceId` 必须失败并输出可行动诊断；不得把不稳定标识写入 IR。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: Manifest 提取、对齐检查与 diff MUST 是确定性的：同一输入产生同一输出；不得依赖当前时间、随机数或进程级可变全局状态。
- **NFR-002**: 默认运行档位下，新增的反射/索引信息 MUST 不引入可观测的常驻运行时成本；需要时再显式开启物化/导出。
- **NFR-003**: 所有诊断事件/报告/IR MUST 是 Slim 且可序列化（JSON），不得包含不可序列化对象引用或超大 payload。
- **NFR-004**: `moduleId`/`ServiceId`/端口名 MUST 使用稳定标识（去随机化），并能与回放/证据链统一锚点对齐。
- **NFR-005**: 任何破坏性变更（端口删除、ServiceId 迁移、对齐规则升级为失败）MUST 提供迁移说明，并遵循 forward-only（无兼容层/无弃用期）。
- **NFR-006**: 本特性引入的 IR/反射 MUST 与“统一最小 IR（Static IR + Dynamic Trace）”对齐，不得引入第二套并行真相源。
- **NFR-007**: 平台/Devtools 的消费模型 MUST 能解释“声明 vs 实际”差异的原因（例如条件依赖、可选依赖、动态分支），并支持将其门禁化。
- **NFR-008**: 若对齐检查涉及试运行执行，系统 MUST 保证试运行不产生对外 IO 副作用（或可通过策略显式禁止），且结果可稳定复现。

### Key Entities _(include if feature involves data)_

- **Module Manifest**: 平台可消费的模块静态描述（包含模块标识、Action/Schema/Logic 单元，以及本特性新增的 `servicePorts`）。
- **Service Port**: 模块声明的一项输入依赖，由“端口名 + ServiceId”组成。
- **ServiceId**: 服务的稳定字符串标识，用于跨运行/跨进程对齐与关系图构建。
- **Evidence（运行时环境快照）**: 用于回放/对齐的运行时可序列化证据，包含实际可用的服务集合与来源信息（若可用）。

## ServiceId 规范化（稳定性硬门）

- `ServiceId` 必须来自 Tag 的显式稳定字符串标识（推荐 `tag.key`），并满足跨进程/跨运行一致。
- `tag.toString()` 仅允许用于 dev 错误信息/诊断展示，不得作为 `ServiceId` 的来源（无法可靠证明稳定性）。
- 若无法获得稳定字符串标识，则该 Tag 视为契约违规：Manifest/对齐检查必须以“可解释降级或失败”处理，禁止生成不可信的 `ServiceId`。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 给定任意模块产物，平台能稳定导出包含 `servicePorts` 的 Manifest，并可通过 JSON 序列化/反序列化保持等价。
- **SC-002**: Devtools 能展示 Module↔Service 关系（按模块与按服务双向索引），并能在缺失/冲突时定位到 `moduleId + 端口名 + ServiceId`。
- **SC-003**: 试运行/回放在缺失或冲突时会产生结构化、可机器解析且跨运行稳定的诊断报告（字段齐全、无随机锚点）。
- **SC-004**: 两份 Manifest 之间若发生 `servicePorts` 变化（新增/删除/ServiceId 变更/端口名变更），diff 能稳定捕获并可作为门禁条件。
