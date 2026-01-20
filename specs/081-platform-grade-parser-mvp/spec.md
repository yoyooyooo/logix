# Feature Specification: Platform-Grade Parser MVP（受限子集解析器：锚点索引）

**Feature Branch**: `081-platform-grade-parser-mvp`  
**Created**: 2026-01-09  
**Status**: Draft  
**Input**: 为“全双工前置”建立 Platform-Grade 子集的可解析能力：从源码识别关键声明点并产出可解释的锚点索引（AnchorIndex），用于可视化、lint、保守补全与回写的前置判定；对子集外形态必须显式降级。

## Context

平台侧要做到“可诊断/可回放/可回写”，不能只依赖运行期痕迹；必须有一套稳定的 **Platform-Grade 子集**：

- 子集内：平台能解析出结构与锚点定位，并可生成最小源码补丁；
- 子集外：平台只做展示/报告（Raw Mode），不尝试改写，避免 silent corruption。

本 spec 只解决“可解析识别”与“锚点索引输出”，不解决重写（见 `082`）与自动补全策略（见 `079`）。

## Clarifications

### Session 2026-01-09

- AUTO: Q: 子集外形态如何处理？→ A: 统一 Raw Mode（带 reason codes），宁可漏不乱补。
- AUTO: Q: 依赖使用点识别范围？→ A: MVP 只识别 `$.use(Tag)`；不把 `yield* Tag`（Effect Env 读取）当作服务依赖使用点。
- AUTO: 提示：若希望依赖使用点进入索引并参与后续 autofill/write-back，请使用 `$.use(Tag)`（或显式 `ModuleDef.services` 声明）；`yield* Tag` 将被视为子集外形态并进入 Raw Mode。
- AUTO: Q: AnchorIndex 是否包含耗时等非确定性字段？→ A: 默认不包含；如需性能摘要必须可配置关闭且不影响字节级确定性（推荐通过 CLI 单独输出）。

### Session 2026-01-19

- AUTO: Q: Platform-Grade WorkflowDef 的可解析形态（identity 与 service call）是什么？→ A: identity 字段必须为字符串字面量；Workflow 内的 service 调用必须以 `callById('<serviceId>')` 的字面量形态表达（在 `WorkflowDef` 中等价为 `kind: 'call'` + `serviceId: '<serviceId>'`）；`call(Tag)` 仅作为 TS sugar，不要求 Parser/Autofill 解析。

## Goals / Scope

### In Scope

- 定义 Platform-Grade 子集的最小可解析边界（按语法形态与约束而非业务语义）。
- 从源码中识别并索引以下类型的“锚点定义点/使用点”（至少）：
  - Module 定义点（例如 `Module.make(...)`）与其配置对象的稳定字段；
  - Logic 定义点（例如 `logic(($) => ...)`）与其结构单元边界；
  - 依赖使用点（例如 `$.use(Tag)`）的可枚举引用形态；
  - Workflow 定义点（例如 `Workflow.make({...})` / `Workflow.fromJSON({...})`）与其 `localId/trigger/steps[*].key` 等稳定锚点字段（用于后续 stepKey 门禁与保守补全）。
  - Workflow 内 `callById('<serviceId>')` 的可枚举使用点（仅字面量形态；用于后续保守补全与可解释展示）。
- 可回写锚点字段的缺口位置（用于 `079/082` 做“只改缺失字段”的最小补丁）。
- 输出结构化、可序列化、确定性的 AnchorIndex，并携带“降级/跳过原因”。

### Out of Scope

- 不承诺解析任意 TypeScript 代码（只覆盖 Platform-Grade 子集）。
- 不执行任何用户代码（解析期不产生副作用；无 Loader 执行）。
- 不负责对跨文件依赖做“语义求值”（例如运行 import 初始化以推断值）。

## Platform-Grade 子集边界（MVP：显式枚举）

本 Parser 只承诺识别与回写相关的“受限语法形态”。子集外必须进入 Raw Mode（显式 reason codes），宁可漏不乱补。

### ✅ 支持（MVP）

- Module 定义点：
  - `const X = Logix.Module.make('<moduleId>', { ... })`
  - `export const X = Logix.Module.make('<moduleId>', { ... })`
  - `export default Logix.Module.make('<moduleId>', { ... })`（允许无变量名；entryKey 仍以 moduleId 为主）
- 约束：
  - `moduleId` 必须为字符串字面量（非字面量一律 Raw Mode）
  - `def` 必须为“就地对象字面量”（非对象字面量或经变量中转一律 Raw Mode）

- Workflow 定义点（WorkflowDef in TS，Platform-Grade 子集）：
  - `const W = Workflow.make({ ... })`
  - `export const W = Workflow.fromJSON({ ... })`
- 约束：
  - def MUST 为“就地对象字面量”（非对象字面量/变量中转/spread/条件拼装一律 Raw Mode）
  - identity 字段必须为字符串字面量（非字面量一律 Raw Mode）：
    - `localId`
    - `trigger.actionTag`（当 `trigger.kind === 'action'`）
    - `steps[*].kind`（必须为 `dispatch|call|delay`）
    - `steps[*].key`（若缺失则输出 `missing.workflowStepKey` 供 079/082 回写；若存在则必须为字符串字面量）
    - `dispatch.actionTag`、`call.serviceId`（仅收录字面量 serviceId；对应 `callById('<serviceId>')`）

### ❌ 不支持（MVP，统一 Raw Mode）

- 变量中转/动态组合：`const def = {...}; Logix.Module.make(id, def)`、spread/条件拼装等
- re-export/barrel 的“导出链追踪”（Parser 只扫描定义文件；入口选择交给 CLI/平台）
- Service Use 的 `yield* Tag`（Effect Env 读取）：MVP 只识别 `$.use(Tag)` 形态（见 Q016）
- WorkflowDef 的动态组合/组合器：`Workflow.compose/fragment/withPolicy`、`Workflow.make(defFromFn())` 等（MVP 不尝试解出结构；统一 Raw Mode）

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 平台能构建仓库级 Platform-Grade 锚点索引（支持可视化与门禁） (Priority: P1)

作为平台/Devtools 维护者，我希望对一个业务仓库进行扫描后，能得到“可被平台消费”的锚点索引：哪些模块/逻辑属于 Platform-Grade 子集、它们的定义点在哪、可枚举哪些锚点字段；并对不可解析部分给出明确降级原因。

**Why this priority**: 没有可解释的锚点索引，平台只能依赖运行期痕迹或人工约定，无法做到极致诊断与可回写闭环。

**Independent Test**: 对同一仓库重复执行索引构建，输出保持一致（确定性）；索引输出可 JSON 序列化；对子集外形态不产生误识别。

**Acceptance Scenarios**:

1. **Given** 一个包含多个模块定义的仓库，**When** 执行索引构建，**Then** 输出包含模块清单与其锚点定位信息（文件/范围/类型），且整体可 JSON 序列化。
2. **Given** 某模块使用了子集外写法，**When** 执行索引构建，**Then** 该模块被标记为 Raw Mode，并给出可行动的降级原因（而不是给出错误锚点或空白）。

---

### User Story 2 - 为保守补全/回写提供“可定位缺口点”（只改缺失字段） (Priority: P1)

作为平台自动化工具维护者，我希望索引输出能明确指出“哪些锚点字段缺失、可写入的位置在哪里”，从而让后续能力只对缺失字段做最小补丁，避免扩散性改写与误伤。

**Why this priority**: 回写必须最小化改动面；解析阶段必须提供足够精确的定位信息，否则 rewriter 很难安全落笔。

**Independent Test**: 对一个缺少 `services`/定位元数据的模块，索引输出能指出缺口位置（可插入点），且在源码未变的情况下位置稳定。

**Acceptance Scenarios**:

1. **Given** 模块缺失某个可回写锚点字段，**When** 构建索引，**Then** 索引输出包含该缺口的“可插入点”定位，供 rewriter 生成补丁。

2. **Given** WorkflowDef 缺少 `steps[*].key`（stepKey）或存在重复，**When** 构建索引，**Then** 索引输出包含缺口/冲突的定位信息（以及 Raw Mode 降级原因），供 `079/082` 做保守补全/回写或报告门禁失败。

---

### User Story 3 - 依赖使用点可被枚举，但不做“语义推断”（宁可漏） (Priority: P2)

作为平台侧诊断能力维护者，我希望依赖使用点（如 `$.use(Tag)`）能被枚举并结构化输出；但当使用点处于动态/条件/黑盒形态时，系统必须宁可漏而不是猜测，避免产生错误依赖图。

**Why this priority**: 错误锚点比缺失锚点更危险，会让全链路解释/回放发生系统性漂移。

**Independent Test**: 对包含条件分支与动态组合的逻辑，索引输出只收录高置信度使用点；其它使用点必须以“不可确定”报告而非强行收录。

## Edge Cases

- 中转变量/动态组合导致无法判断是不是 `Module.make(...)`：必须降级为 Raw Mode。
- 同文件多次定义/同名覆盖：必须给出稳定的 disambiguation 规则或降级为 Raw Mode。
- 依赖使用点出现在条件/异常分支/闭包回调中：默认视为不确定，除非存在可解释的高置信度规则。
- 解析输出过大：必须有预算/截断策略，并且截断可解释（避免 silent drop）。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 明确 Platform-Grade 子集的可解析边界，并以“可解释的降级”处理子集外形态。
- **FR-002**: 系统 MUST 能产出可序列化、确定性的 AnchorIndex（稳定排序、稳定字段），并能在同一输入上重复得到一致结果。
- **FR-003**: AnchorIndex MUST 至少覆盖：Module 定义点、Logic 定义点、依赖使用点、以及可回写锚点字段的缺口定位信息。
- **FR-004**: AnchorIndex MUST 为每个降级/跳过项提供可枚举 reason code（或等价字段），用于 CI/Devtools 的可解释展示与门禁化。
- **FR-005**: 解析期 MUST 不执行用户代码，不产生任何副作用；其输入仅为源码文本与可选的解析配置。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: AnchorIndex 输出 MUST slim 且可序列化（JSON），不得包含不可序列化对象引用。
- **NFR-002**: 解析结果 MUST 可 diff：同一输入字节级一致；变更后的差异聚焦于结构变化而不是输出噪音。
- **NFR-003**: 解析性能 MUST 有上界并可度量：对仓库规模增长应可解释（至少提供总耗时与输入规模摘要）。

### Key Entities _(include if feature involves data)_

- **Platform-Grade 子集**: 平台承诺可解析/可回写的受限代码形态集合。
- **AnchorIndex**: 源码锚点索引（定义点/使用点/缺口点/降级原因），平台只读消费。
- **Workflow Anchors**: WorkflowDef 的稳定锚点字段（`localId/trigger/steps[*].key`）；其中 `stepKey` 是后续全双工/门禁化的核心地址。
- **Raw Mode**: 子集外的降级模式：可展示/可报告，但不参与回写与自动补全。

## Success Criteria _(mandatory)_

- **SC-001**: 对同一仓库重复构建 AnchorIndex，输出一致且可 JSON 序列化。
- **SC-002**: 对 Platform-Grade 子集内的代表性模块，索引能覆盖关键锚点（Module/Logic/依赖使用点/缺口点）；对子集外形态明确降级并可解释。
- **SC-003**: AnchorIndex 可直接用于后续 `082` 生成最小补丁（插入点定位稳定），并能用于 `079` 的“宁可漏不乱补”判定。
