# Feature Specification: Expression Asset Protocol（表达式/校验资产协议与 Sandbox 约束）

**Feature Branch**: `[034-expression-asset-protocol]`  
**Created**: 2025-12-25  
**Status**: Draft  
**Input**: 定义“code is truth”的表达式/validator 资产协议：编辑期强类型补全，保存期固化规范化 IR（显式 deps + 稳定 digest + 可序列化）；同时定义确定性与 sandbox 执行约束（能力分级、预算/超时、诊断证据），使平台可安全推导依赖、做 lint/diff，并为未来 agent 自动改写打基础。

## Assumptions

- 资产是长期演进的“可交付物”：必须可 diff、可审阅、可回放、可对照。
- 平台可以提供强交互编辑器，但运行时与工具链只认“规范化 IR + 显式依赖”这一层作为事实源。
- 默认只支持同步、确定性执行；异步/IO 能力作为后续扩展点进入自定义模块节点，不侵入同步 rules 主线。
- 本 spec 为 `033-module-stage-blueprints` 的 EdgeMapping/validator 提供统一资产协议；其“可引用空间 SSoT”依赖 `035-module-ports-typeir`，并通过 `031-trialrun-artifacts` 的 artifacts 链路做同源对照与验收。
- 平台需要“可解析子集”来支撑代码级双向编辑与自动改写：当资产不可解析或超出可解析子集时，必须显式标记为黑盒，并强制显式声明 deps/能力（禁止依赖隐式推导）。

## Motivation / Background

- 平台要做 n8n 式智能提示与依赖安全，必须能从表达式中可靠提取引用（上游端口、字段路径、服务依赖）。
- 如果表达式是任意代码且缺少规范化与依赖声明，平台无法保证：
  - 自动补全是安全的（不会引用不可达/未连线/未授权内容）；
  - scoped validate / 依赖图是可信的（deps 漏写会导致增量校验与解释链路失真）；
  - sandbox 预览是可控的（非确定性/无限循环/超大输出会破坏平台稳定性）。
- 因此需要一个资产协议：把“可编辑源码层”与“可验收事实层（IR）”分离，但保持同源可对照。

## Out of Scope

- 不定义某种具体 UI 编辑器实现；本特性只定义资产协议、约束与验收口径。
- 不交付异步/IO 规则执行能力；只定义未来扩展点应如何对接。
- 不要求平台在本阶段支持完整静态类型推导到每个表达式片段（可以分阶段演进），但必须保证引用与 deps 可确定提取。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 平台可安全编辑表达式并自动推导 deps (Priority: P1)

作为开发者，我希望在平台里编写表达式/校验逻辑时能获得强类型补全与安全引用：只能引用“可达的上游端口/自身状态/允许的服务”；平台能自动推导依赖并提示确认，保存后形成可 diff 的资产与显式 deps。

**Why this priority**: 这是平台编排效率与正确性的根；没有可靠 deps，后续增量校验/解释链路会系统性失真。

**Independent Test**: 写一个规则表达式引用若干字段与一个上游端口，保存后能得到稳定 digest 与显式 deps；在 lint 中可检测非法引用与 deps 漏写。

**Acceptance Scenarios**:

1. **Given** 一个表达式引用了若干字段路径与上游端口，**When** 保存资产，**Then** 平台生成并落盘规范化 IR，包含显式 deps（字段/端口/服务引用清单）与稳定 digest。
2. **Given** 表达式试图引用未连线的上游节点或越权服务，**When** 用户保存或运行 lint，**Then** 平台必须拒绝并给出可行动提示（如何连线/如何通过语义层暴露数据）。
3. **Given** 同一资产内容重复保存，**When** 生成 digest，**Then** digest 保持一致（确定性），且 diff 噪音可控。

---

### User Story 2 - Sandbox 可控预览：确定性、预算、可解释失败 (Priority: P2)

作为平台使用者，我希望在 sandbox 中预览表达式/校验逻辑：在可控预算内执行、结果确定性、失败可解释；即使用户写了死循环/超大输出/非确定性调用，也能被平台可靠拦截并给出结构化诊断。

**Why this priority**: 没有 sandbox 的确定性与预算约束，平台预览与 agent 改写会变成不可控的黑箱。

**Independent Test**: 用一组故意违规的表达式（非确定性、无限循环、超大对象）验证 sandbox 拦截、超时、截断与诊断输出。

**Acceptance Scenarios**:

1. **Given** 表达式包含非确定性来源（例如随机/时间/全局环境），**When** 在 sandbox 运行，**Then** 系统必须拒绝或要求改为显式注入的确定性来源，并输出可解释错误。
2. **Given** 表达式运行超时或输出超过预算，**When** 在 sandbox 运行，**Then** 系统必须在预算内停止并返回结构化错误或截断标记（包含预算与发生点摘要）。
3. **Given** 表达式依赖某个服务能力，**When** sandbox 未提供该服务，**Then** 运行必须失败并输出缺失依赖清单与可行动提示。

---

### User Story 3 - 资产可审阅、可 diff、可被 agent 自动改写 (Priority: P3)

作为团队维护者，我希望资产既可被人阅读和编辑，也可被 agent 稳定改写：保存时固化规范化 IR 与显式依赖，便于 diff/回放；同时保留可读源码层用于人审与升级。

**Why this priority**: 平台化的长期演进依赖“可审阅与可自动化”，否则规模扩大后无法治理。

**Independent Test**: 对同一资产做一次自动重写（等价变换），检查：语义不变、deps 不变或变更可解释、digest 变化可预期。

**Acceptance Scenarios**:

1. **Given** 一份资产被自动重写（例如重排条件、消除重复引用），**When** 保存，**Then** 规范化 IR 保持结构稳定，deps 变化必须显式可解释，diff 可审阅。
2. **Given** 资产版本升级，**When** 引用方使用版本化 ref，**Then** 可回滚到旧版本且不影响其它资产的稳定性与可重现性。

### Edge Cases

- 表达式引用动态列表行：必须通过 rowRef/稳定标识，不允许 index 语义渗漏。
- 规则/映射依赖循环：平台如何检测并给出可行动提示（拆分、引入中间字段、调整触发边）。
- 资产引用图过大：如何预算与截断以保持平台稳定（同时保留可解释摘要）。
- 部分推导失败（黑盒片段）：平台如何降级（要求显式声明 deps/能力）而不是静默通过。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 定义版本化的资产协议，至少覆盖：表达式资产（映射/条件）、校验资产（validator）；资产必须可引用、可审阅、可 diff。
- **FR-002**: 资产 MUST 同时具备“可编辑源码层”与“规范化 IR 层”；保存时规范化 IR 层必须生成并持久化，作为工具链与运行语义的事实源。
- **FR-003**: 规范化 IR MUST 显式包含依赖清单（deps）：字段路径、上游端口、服务能力等；平台可自动推导并提示确认，但最终必须显式固化。
- **FR-004**: 系统 MUST 为资产生成稳定 digest：同一规范化 IR 输入重复生成一致；digest 作为缓存、diff 与版本引用锚点。
- **FR-005**: 系统 MUST 约束引用边界：表达式只能引用“可达且已授权”的输入（自身公开状态、已连线的上游端口、允许的服务）；越界引用必须被拒绝并给出可行动提示。
- **FR-006**: 系统 MUST 支持 sandbox 执行资产，并提供预算/超时/输出大小上界；超限必须以结构化错误或截断标记收束。
- **FR-007**: 系统 MUST 强制确定性：禁止默认使用随机/时间/机器环境作为语义输入；若需要相关能力，必须通过显式注入并可在 sandbox 中复现。
- **FR-008**: 系统 MUST 支持能力分级：资产声明其所需服务能力；默认只允许同步、确定性、可 stub 的服务；缺失能力必须以可行动错误失败。
- **FR-009**: 资产协议 MUST 支撑与 IR/检查链路对照验收：平台能将资产引用与显式 deps 映射到导出的 RulesManifest/Static IR/端口信息，解释“为什么触发该规则/映射”。
- **FR-010**: 资产 MUST 支持可逆溯源锚点（Reversibility Anchor）：在不影响运行语义的前提下，保留可序列化的意图/来源元信息（例如人类可读描述、上游 Spec/Block 稳定锚点、生成指纹摘要），用于 agent 重生成、反向语义提取与 drift detection。
- **FR-011**: 平台 MUST 区分“可解析资产”与“黑盒资产”：当资产为黑盒或推导不完整时，必须强制显式声明 deps/能力/预算；平台仍可展示与运行（在受控 sandbox 内），但不得对其进行细粒度结构编辑或自动重写。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 在正常运行路径中，本特性 MUST 不引入额外解释器开销；资产以出码后代码执行为主，检查/sandbox 属于按需路径。
- **NFR-002**: 资产/IR/诊断输出 MUST slim 且可序列化，具备预算与截断语义；默认不会引入大体积与不可控嵌套。
- **NFR-003**: 失败必须可解释：至少包含缺失依赖、越界引用、超时/超预算、非确定性违规等分类与最小上下文。

### Key Entities *(include if feature involves data)*

- **ExpressionAsset**: 条件/映射等表达式资产（可编辑源码 + 规范化 IR + deps + digest）。
- **ValidatorAsset**: 校验资产（同上），用于 form rules 或其它模块的 check traits。
- **Normalized IR**: 规范化后的、可序列化的事实层表示，用于 lint/diff/试运行/回放对照。
- **Capabilities / Budgets**: 服务能力声明与预算（时间/输出大小）约束，用于 sandbox 与治理。
- **Reversibility Anchor**: 资产的可序列化溯源锚点与意图摘要，用于跨越 IR 与代码的语义鸿沟（支持重生成与 drift detection）。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 平台可对表达式/校验资产自动推导并固化显式 deps；越界引用会被拒绝并给出可行动提示。
- **SC-002**: 同一资产重复保存生成的规范化 IR 与 digest 一致（确定性），diff 噪音可控。
- **SC-003**: sandbox 能在预算内执行资产，并对超时/超预算/缺失依赖/非确定性违规给出结构化错误或截断标记。
- **SC-004**: 资产可被 agent 自动改写并保持可审阅：变更点在 diff 中清晰可见，deps 变化显式可解释。
- **SC-005**: 黑盒资产在缺少显式 deps/能力声明时会被拒绝保存或拒绝运行；当声明齐全时可在受控 sandbox 内运行并给出可解释失败；同时资产保留可逆溯源锚点以支持语义级重生成。
