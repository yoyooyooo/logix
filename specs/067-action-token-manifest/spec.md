# Feature Specification: Action 级别定义锚点（ActionToken-ready Manifest）

**Feature Branch**: `[067-action-token-manifest]`  
**Created**: 2026-01-01  
**Status**: Draft  
**Input**: User description: "为 SDD 平台的全双工链路提供 Action 级别的定义锚点与可序列化 Manifest（不依赖 AST）：Loader 能从模块反射中提取 action 列表/primary reducer 信息/源码锚点；Runtime → Studio 的事件可稳定指向 action 定义；并提供 token-first 的最小手写路径以获得 IDE 跳转与引用能力。"

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

### User Story 1 - 运行时事件可回链到 Action 定义（Studio/Devtools） (Priority: P1)

作为 Studio/Devtools 的使用者（开发者/审阅者），我希望在运行时看到的每一次 Action 派发都能稳定映射到“Action 定义锚点”（包含可读的 action 标识与可选源码位置），从而在时间线/活图中完成解释、定位与回放对齐。

**Why this priority**: 全双工的 Runtime → Studio 链路依赖“可解释的事件 → 可定位的定义锚点”；如果 Action 仍停留在纯字符串/动态属性，平台难以建立稳定 deep-link 与 Trace IR 因果链。

**Independent Test**: 选取一个包含多个 actions（含 void/非 void payload、含/不含主 reducer）的模块；运行一次可控的交互脚本触发 actions；验证事件流中每个 action 都能映射到 manifest 中对应条目，并能拿到可展示的定义锚点信息。

**Acceptance Scenarios**:

1. **Given** 一个模块声明了 actions，**When** 运行时派发其中任意一个 action，**Then** 产出的结构化事件必须包含稳定的 action 引用（可用于反查定义），并携带实例/事务锚点（若存在）。
2. **Given** Studio/Devtools 已加载该模块的 action manifest，**When** 用户在时间线中选择某条 action 事件，**Then** 系统能定位到该 action 的定义锚点并展示其摘要（例如 payload 形态、是否存在主 reducer、source 信息是否可用）。
3. **Given** 运行时派发了一个未在 manifest 中声明的 action，**When** 事件被记录/传输，**Then** 该事件必须被标记为“无定义锚点/未知”，并且不会破坏后续事件的对齐与展示。

---

### User Story 2 - 平台可提取可序列化的 Action Manifest（免 AST） (Priority: P2)

作为平台工具链/CI/远程 Studio 的使用者，我希望能通过“运行时反射 + 受控试运行”的方式提取模块的 Action Manifest，并以可序列化 JSON 输出（稳定排序、可 diff），从而支持远程展示、变更审计与合同守护。

**Why this priority**: 不依赖 AST 的 Loader Pattern 能显著降低平台解析成本与脆弱性；Action Manifest 是 Studio 不读源码、只读结构化 IR 的关键输入之一。

**Independent Test**: 对同一模块在相同输入下重复运行元数据提取，输出 JSON 必须字节级一致；对模块做一次“新增 action/新增主 reducer/变更 payload 形态”的变更后，manifest diff 必须可预测且可解释。

**Acceptance Scenarios**:

1. **Given** 模块已按约定暴露反射信息，**When** 平台执行一次元数据提取，**Then** 输出必须包含该模块完整的 actions 清单与必要摘要，并且输出为可序列化 JSON。
2. **Given** 对同一模块重复执行元数据提取，**When** 外部环境与输入不变，**Then** manifest 输出必须 deterministic（稳定排序、无随机/时间字段）。
3. **Given** 模块通过扩展机制新增 action（或覆盖/新增主 reducer），**When** 提取 manifest，**Then** manifest 必须反映出变更且仍保持一致的 action 引用规则与排序规则。

---

### User Story 3 - 开发者可选用 token-first 获得 IDE 跳转/引用（不依赖 codegen） (Priority: P3)

作为业务/运行时贡献者，我希望在不依赖 codegen 的情况下，通过“值级 Action 符号（ActionToken）”定义并使用 action，从而在 IDE 中获得跳转定义、查找引用与安全重命名，同时运行时与平台的 manifest/事件对齐不被破坏。

**Why this priority**: 仅靠动态 actions 属性很难获得 IDE 级别的符号体验；token-first 提供了可渐进采用的 DX 升级路径，也为后续 codegen 的 golden path 预热。

**Independent Test**: 在一个示例模块中以 token-first 定义 2 个 action（含/不含主 reducer），并在 UI/Logic 中引用；验证 IDE 能从使用点跳转到 token 定义，并且运行时事件仍可映射到同一 action 引用。

**Acceptance Scenarios**:

1. **Given** 开发者以值级 Action 符号定义 action，**When** 在 dispatch 与 watcher/订阅处引用同一符号，**Then** IDE 的“跳转到定义/查找引用/重命名”能够工作且不依赖额外插件。
2. **Given** token-first 定义的 action 被派发，**When** 产出运行时事件与 manifest，**Then** 两者使用同一套稳定 action 引用规则，Studio/Devtools 可正常对齐与展示。

---

### Edge Cases

- 同一模块 actions 数量很大时，manifest 必须仍然稳定排序且有明确的大小上界策略（例如截断/分片/摘要）。
- action payload 为 void 与非 void 两种形态必须一致支持（包括 manifest 摘要与运行时事件）。
- 当模块定义阶段无法提供 source 锚点（动态工厂、生成物隐藏、运行环境限制）时，系统必须提供可解释的降级展示。
- 当运行时派发“未声明 action”时，事件必须可记录但不得污染“已声明 action” 的对齐与统计。
- 扩展机制新增 actions/reducers 时，必须保证 action 引用规则与排序规则不发生不兼容漂移。

## Requirements _(mandatory)_

### Scope & Non-goals

- 本特性聚焦在“Action 定义锚点 + Manifest + 运行时事件对齐”。
- 不包含自动 codegen（design → generated）的完整链路；token-first 仅要求手写可用。
- 不要求解析或可视化任意命令式业务逻辑细节；仅保证 action 级别的定义对齐与可解释性。

### Assumptions & Dependencies

- 平台具备一个“元数据提取/Loader”执行环境，可在受控条件下加载模块定义并投影为 JSON。
- 目标模块在定义阶段遵守“构建态无 IO/可试运行”的约束（必要依赖通过可注入的构建态环境提供或被 mock）。
- Studio/Devtools 已有（或将提供）消费结构化事件与 manifest 的接入点，用于高亮/定位/回放对齐。

### Functional Requirements

- **FR-001**: 系统 MUST 定义并统一一套“Action 引用”规则，用于在 Code/Studio/Runtime 三侧识别同一 action（至少基于 `moduleId + actionTag`，并具备可扩展空间）。
- **FR-002**: 系统 MUST 从模块定义中提取声明的 actions 清单，并对每个 action 给出最小可展示摘要（至少包括 payload 形态：void/非 void）。
- **FR-003**: 系统 MUST 能标注每个 action 是否存在同步主 reducer（primary reducer）并在 manifest 中体现。
- **FR-004**: 系统 MUST 支持为 action 提供“定义锚点”信息（例如 source 是否可用、可读标识等），并在 Studio/Devtools 中可被展示与 deep-link。
- **FR-005**: 系统 MUST 在运行时对每次 action 派发产出结构化事件，并包含 action 引用与稳定实例/事务锚点信息，以支持 Trace IR 的因果链拼装与回放对齐。
- **FR-006**: 系统 MUST 在 action 未声明或无定义锚点时提供一致的降级语义（标记为 unknown/opaque），且不得破坏已声明 action 的对齐与统计。
- **FR-007**: 系统 MUST 输出可序列化的 Action Manifest（JSON），适用于跨进程/跨线程传输与版本对比（稳定排序、去随机化、可控体积）。
- **FR-008**: 系统 MUST 支持一种无需 codegen 的“token-first”使用方式：开发者可以用值级 Action 符号定义 action，并在 dispatch 与 watcher/订阅处引用同一符号以获得 IDE 跳转与引用能力。
- **FR-009**: 系统 MUST 确保现有基于字符串 tag 的 action 派发/订阅在本特性引入后仍可工作（token-first 作为增量能力）。
- **FR-010**: 系统 MUST 为 manifest 与运行时事件提供一致的字段语义说明与对齐约束，避免平台/运行时/Devtools 形成多套“真相源”。

### Non-Functional Requirements (Performance & Diagnosability)

<!--
  If this feature touches Logix runtime hot paths, treat performance and
  diagnosability as first-class requirements:
  - Define budgets (time/alloc/memory) and how they are measured
  - Define what diagnostic events/Devtools surfaces exist and their overhead
-->

- **NFR-001**: System MUST define performance budgets for the affected hot paths
  and record a measurable baseline (benchmark/profile) before implementation.
- **NFR-002**: System MUST provide structured diagnostic signals for key state /
  flow transitions, and diagnostics MUST have near-zero overhead when disabled.
- **NFR-003**: System MUST use deterministic identifiers for instances/transactions
  in diagnostic and replay surfaces (no random/time defaults).
- **NFR-004**: System MUST enforce a synchronous transaction boundary: no IO/async
  work inside a transaction window, and no out-of-transaction write escape hatches.
- **NFR-005**: If this feature changes runtime performance boundaries or introduces
  an automatic policy, the project MUST update user-facing documentation to provide
  a stable mental model: (≤5 keywords), a coarse cost model, and an “optimization ladder”
  (default → observe → narrow writes → stable rowId → module/provider override & tuning → split/refactor).
  Vocabulary MUST stay aligned across docs, benchmarks, and diagnostic evidence fields.
- **NFR-006**: If this feature relies on internal hooks or cross-module collaboration
  protocols, the system MUST encapsulate them as explicit injectable contracts
  (Runtime Services) that are mockable per instance/session, and MUST support exporting
  slim, serializable evidence/IR for a controlled trial run in Node.js or browsers
  without relying on process-global singletons.
- **NFR-007**: If this feature introduces breaking changes, the project MUST provide a
  migration note (plan.md / PR) and MUST NOT keep compatibility layers or a deprecation
  period (forward-only evolution).

### Key Entities _(include if feature involves data)_

- **Action 引用（ActionRef）**: 用于跨 Code/Studio/Runtime 指向同一 action 的稳定标识（至少由 moduleId 与 actionTag 组成）。
- **Action 定义锚点（ActionAnchor）**: ActionRef 的可展示补充信息（例如可读名称、source 是否可用、定位信息摘要）。
- **Action Manifest（ModuleManifest.Actions）**: 模块级可序列化结构化输出，包含 actions 清单与摘要，用于 Studio/CI/Agent 消费。
- **Action 派发事件（ActionDispatchEvent）**: 运行时产生的结构化事件，用于把行为映射回 ActionRef 并串起 Trace IR 因果链。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 对同一模块在相同输入与环境下重复提取 Action Manifest，输出必须字节级一致（deterministic）。
- **SC-002**: 对已声明的 actions，Studio/Devtools 的“事件 → 定义锚点”映射命中率为 100%（无 missing mapping）；未声明 action 必须被稳定标记为 unknown/opaque。
- **SC-003**: 在 token-first 路径下，开发者可从 action 使用点通过 IDE “跳转到定义”定位到 action 定义符号，并且“查找引用/重命名”覆盖 dispatch 与 watcher/订阅两侧。
- **SC-004**: 运行时 action 派发热路径在默认关闭诊断/Devtools 时满足既定性能预算；相对基线回归（p95 时间与分配）≤ 2%（以同环境、同采样参数的证据为准）。
- **SC-005**: 运行时事件与 manifest 中使用的实例/事务/动作标识均为确定性来源（无随机/时间默认值），并能用于回放与对齐。
- **SC-006**: 单模块 Action Manifest（actions 清单 + 摘要部分）的输出大小 ≤ 64 KB（超出时必须有可解释的截断/摘要策略并可被验证）。
