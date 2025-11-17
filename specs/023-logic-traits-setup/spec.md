# Feature Specification: Logic Traits in Setup

**Feature Branch**: `[023-logic-traits-setup]`  
**Created**: 2025-12-22  
**Status**: Draft  
**Input**: User description: "允许在 logic setup 阶段声明并组合 traits，使 logic 成为可复用的 trait 能力单元"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 在 Logic setup 内声明 Traits 并随组合生效 (Priority: P1)

作为模块作者/框架作者，我希望把一组可复用能力（traits）封装进一个 Logic 的 setup 阶段。这样 Logic 作为被组合的最小复用单元时，能力也能一起复用，而不必每次在 Module 层重复声明。

**Why this priority**: 这是“最大化复用与组合性”的基础能力；没有它，traits 只能停留在 Module 层，无法随 Logic 复用而复用。

**Independent Test**: 仅实现本故事即可交付 MVP：创建一个在 setup 阶段声明 trait 的 Logic，把它加入到 Module 后能枚举到该 trait（含来源=该 Logic）；移除该 Logic 后该 trait 不再出现。

**Acceptance Scenarios**:

1. **Given** 一个 Module 仅由不声明 traits 的 Logic 组成，**When** 加入一个在 setup 阶段声明 trait 的 Logic，**Then** 该 Module 的“最终 trait 清单”包含该 trait 且标注来源为该 Logic
2. **Given** 一个 Module 的最终 trait 清单包含来自某个 Logic 的 trait，**When** 从该 Module 中移除该 Logic，**Then** 最终 trait 清单不再包含该 trait，且不会残留来源记录

---

### User Story 2 - Trait 合并确定性与冲突可定位 (Priority: P2)

作为模块作者/框架作者，我希望当多个 Logic/Module 同时声明 traits 时，系统能给出确定性的合并结果，并在发生冲突时提供可直接定位到“冲突来源”的诊断信息，避免出现“运行时默默覆盖/行为不稳定”的风险。

**Why this priority**: 一旦 traits 进入 Logic 级别，组合将更频繁；没有确定性与冲突定位，组合性会转化为不稳定性与排障成本。

**Independent Test**: 仅实现本故事即可：对同一组 Logic 以不同顺序组装 Module，最终 trait 清单一致；对包含冲突 traitId 的组合，系统在进入运行前拒绝并报告所有冲突来源。

**Acceptance Scenarios**:

1. **Given** 两次构建使用相同的一组 Logic 与 Module-level traits 但组合顺序不同，**When** 生成最终 trait 清单，**Then** 两次结果完全一致（相同 traitId 集合与相同来源映射）
2. **Given** 两个不同来源（Module 或不同 Logic）声明了相同 traitId，**When** 生成最终 trait 清单，**Then** 系统在进入运行前失败并在错误信息中列出该 traitId 与所有冲突来源

---

### User Story 3 - 诊断/回放可解释 Trait 来源与影响 (Priority: P3)

作为排障者/平台开发者，我希望在诊断与回放中能清晰看到：某个 trait 为什么会生效、来自哪里、对行为产生了哪些可观察的约束/扩展，并且这些证据可以跨机器/跨进程稳定复现。

**Why this priority**: traits 会影响运行时边界与行为解释。只有把“来源与因果链路”外显，组合性才能真正可用。

**Independent Test**: 仅实现本故事即可：对一个包含多个 traits 的 Module 导出一份可序列化证据，证据中能枚举 trait 清单+来源+稳定标识；同一输入重复导出，证据对比无漂移。

**Acceptance Scenarios**:

1. **Given** 一个 Module 的 traits 同时来自 Module 与多个 Logic，**When** 导出诊断证据/回放输入，**Then** 证据中包含最终 trait 清单与每个 trait 的来源链路
2. **Given** 两次运行使用相同输入与相同组合，**When** 对比两次导出的证据，**Then** trait 相关标识与来源链路保持稳定一致（无随机/时间导致的漂移）

---

### Edge Cases

- 同一 Module 内重复引入同一个 Logic（或等价 Logic）时，traits 是否会重复声明或触发冲突
- traits 声明依赖某些前置能力但未满足时，系统如何失败并给出缺失项
- traits 声明中包含不确定因素（随机/时间/外部 IO）导致最终 trait 清单不可预测时，系统如何约束与诊断
- traits 数量/组合规模显著增大时，最终 trait 合并与枚举是否仍然可控且有明确性能预算

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统必须允许在 Logic 的 setup 阶段声明 traits，使 Logic 成为携带 trait 能力的可复用单元
- **FR-002**: 系统必须将来自 Module 声明与各 Logic setup 声明的 traits 合并为“模块最终 trait 集”，并保证合并结果确定性（在相同输入下不因组合顺序而变化）
- **FR-003**: 每个 trait 必须具有稳定标识（traitId）用于冲突检测与诊断引用；在相同输入下 traitId 与来源映射必须保持稳定
- **FR-004**: 当同一 Module 内出现相同 traitId 的重复声明时，系统必须在进入运行前失败，并在错误信息中列出该 traitId 与所有冲突来源（至少包含 Module/Logic 名称）
- **FR-005**: 系统必须提供对外可枚举的“最终 trait 清单”能力，至少包含 traitId、名称、来源（provenance）与（可选）简短描述，以支持测试与诊断
- **FR-006**: 系统必须保留并暴露 trait 的来源链路（provenance），使排障者可以回答“某个 trait 为什么会生效/来自哪里”
- **FR-007**: 系统必须支持对 trait 组合的基础一致性校验：当 traits 声明了互斥或前置条件且不满足时，系统必须明确失败并报告原因（不允许静默降级）
- **FR-008**: 最终 trait 集在 setup 完成后必须冻结；业务运行期不得通过可变状态修改最终 trait 集（避免行为漂移）
- **FR-009**: 系统必须支持导出最小可回放证据：至少包含静态的最终 trait 集+来源，以及动态 trace 中可引用的稳定标识

### Assumptions

- **A-001**: trait 作为“可组合能力/约束单元”的概念已存在；本需求只扩展其声明位置与组合语义，不改变 trait 的业务含义本身
- **A-002**: 系统存在明确的“进入运行前”阶段，可在该阶段完成最终 trait 集生成与一致性校验
- **A-003**: 系统已有基础诊断/回放能力可承载“可序列化证据”的导出；本需求要求 trait 信息被纳入该证据
- **A-004**: 本特性复用并对齐 `022-module` 的“Logic Unit（逻辑单元）+ logicUnitId（slot key）”模型：trait provenance 的来源标识以 resolved `logicUnitId` 为主（避免匿名 Logic 漂移）；调用方应优先显式提供 id（跨组合/diff/replay 稳定），未提供时允许 derived id（不承诺跨重排稳定）

### Dependencies

- **D-001**: 依赖现有 traits 机制与模块组合能力（包含 Module-level traits 的现有使用方式）
- **D-002**: 依赖诊断系统能够记录结构化事件，并支持导出可序列化证据
- **D-003**: 依赖稳定标识策略（实例/事务/操作序列）在诊断与回放中可用
- **D-004**: 依赖 `022-module` 的 `logicUnitId` 确定性裁决与 `trace:module:descriptor`/`module_logic::override` 诊断口径（作为 provenance 的稳定来源锚点）

### Traceability (FR ↔ Scenarios)

Notation: US{N}-AS{M} 表示 User Story N 的 Acceptance Scenario M。

- **FR-001 / FR-005 / FR-006 / FR-008**: US1-AS1, US1-AS2
- **FR-002 / FR-003**: US2-AS1
- **FR-004 / FR-007**: US2-AS2
- **FR-009**: US3-AS1, US3-AS2

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 系统必须为“模块构建/初始化”与“运行时核心路径”定义性能预算，并在实现前记录可复现的基线（基准/剖析）
- **NFR-002**: 系统必须提供结构化诊断信号覆盖：trait 声明、合并、冲突、校验与生效结果；当诊断默认关闭时，其额外开销必须接近零
- **NFR-003**: 系统必须在诊断与回放中使用确定性标识（实例/事务/操作序列），禁止随机/时间默认值导致证据漂移
- **NFR-004**: 系统必须维持同步事务边界：事务窗口内不得引入 IO/异步工作；不得提供“事务外写入”逃逸口破坏一致性
- **NFR-005**: 若本特性改变运行时边界或引入自动策略，项目必须同步更新用户文档，提供稳定心智模型（≤5 关键词）、粗粒度成本模型与优化阶梯（默认 → 观察 → 收窄写入 → 稳定标识 → 覆盖/调优 → 拆分/重构）
- **NFR-006**: 若本特性依赖内部 hooks 或跨模块协作协议，系统必须将其封装为显式可注入契约，并支持导出 slim、可序列化证据/IR，以便在受控环境复现（避免进程级单例依赖）

### Key Entities *(include if feature involves data)*

- **Trait**: 可组合的能力/约束单元，具备稳定标识（traitId）、名称、可选描述与可诊断的来源信息
- **Logic**: 可被组合的复用单元，允许在 setup 阶段声明自身附带的 traits
- **Module**: 可运行的组合单元，由多个 Logic 与模块级声明组成，并产出最终 trait 集
- **Trait Conflict**: 在同一 Module 内出现重复 traitId 或不兼容组合时的失败事件，必须可定位来源并可被诊断系统记录
- **Diagnostic Evidence**: 可序列化的最小证据载体，用于解释与回放（至少包含最终 trait 集、来源链路与稳定标识）

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 在至少 3 个代表性组合场景中（单 Logic、多个 Logic、包含模块级声明），相同输入下重复构建 100 次，最终 trait 清单与来源映射保持 100% 一致
- **SC-002**: 对包含冲突 traitId 或不满足互斥/前置条件的组合，系统在进入运行前 100% 拒绝并给出可行动错误信息（至少包含：traitId 与所有冲突来源）
- **SC-003**: 在既定性能基线下，引入本特性后不突破预算；默认关闭诊断时，核心路径性能回归不超过 1%（以基线对比为准）
- **SC-004**: 对任意一个生效 trait，诊断/回放导出证据中都能展示并导出其 traitId、名称、来源链路与稳定标识；跨环境回放对比差异为 0
- **SC-005**: 至少沉淀 1 个“带 traits 的可复用 Logic”并在 2 个以上 Module 中复用，复用行为一致（验证通过率 100%）
