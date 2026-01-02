# Feature Specification: Action Surface（actions/dispatchers/reducers/effects）与 Manifest

**Feature Branch**: `[067-action-surface-manifest]`  
**Created**: 2026-01-01  
**Status**: Draft  
**Input**: User description: "为 SDD 平台的全双工链路提供 Action 级别的定义锚点与可序列化 Manifest（不依赖 AST）：Loader 能从模块反射中提取 action 列表/primary reducer 信息/源码锚点；Runtime → Studio 的事件可稳定指向 action 定义；并提供 token-first 的最小手写路径以获得 IDE 跳转与引用能力；同时把 action 的副作用面（effects）结构化为可治理的注册面。"

## Clarifications

### Session 2026-01-02

- AUTO: Q: `actionTag` 的权威来源是什么，是否允许与 `actions` 的 key 脱钩？ → A: `actionTag` MUST 等于 `actions` key（forward-only：rename 即协议变更）；本特性不提供独立 stable tag 字段。
- AUTO: Q: Primary reducer 与精确 action 监听（单 ActionToken）的回调入参是否 payload-first？ → A: 是；单 ActionToken 精确分支回调参数为 payload（非完整 action object）；primary reducer 的签名也以 payload 为第二入参。
- AUTO: Q: effects 的执行时序与并发语义是什么？ → A: effects MUST 在事务外（reducer 提交后）触发；同一 actionTag 允许多个 handler，默认并发执行且不承诺顺序；失败隔离并记录诊断。
- AUTO: Q: effects 的重复注册如何处理（执行/诊断）？ → A: 重复注册必须不会导致副作用翻倍；默认视为 no-op（保持一次执行），并产出结构化重复注册诊断。
- AUTO: Q: effects 的 `sourceKey` 是否需要用户显式提供？ → A: 不需要；系统 MUST 自动派生一个可序列化 `sourceKey`（用于去重与诊断），未来可由 codegen 提供更强的来源/跳转锚点。
- AUTO: Q: 哪些 effects 必须进入 manifest，run 动态注册的语义如何对齐？ → A: manifest MUST 至少包含 Module.make 声明的 effects；受控试运行可补齐 setup 注册的 effects（标记为 registered）；run 动态注册只对未来 action 生效且不要求进入 manifest，但必须在运行时诊断流可见（含 dynamic/late registration 提示）。

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

### User Story 2 - 平台可提取可序列化的 Module Manifest（免 AST） (Priority: P2)

作为平台工具链/CI/远程 Studio 的使用者，我希望能通过“运行时反射 + 受控试运行”的方式提取模块的 Manifest（即模块级 `ModuleManifest`），并以可序列化 JSON 输出（稳定排序、可 diff），从而支持远程展示、变更审计与合同守护。

**Why this priority**: 不依赖 AST 的 Loader Pattern 能显著降低平台解析成本与脆弱性；Module Manifest 是 Studio 不读源码、只读结构化 IR 的关键输入之一。

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

### User Story 4 - 副作用注册面可治理（effects/$.effect） (Priority: P2)

作为业务/运行时贡献者，我希望能把副作用从散落的 watcher 监听中“抽象为可治理的注册面”：允许同一 actionTag 绑定多个副作用 handler，并保证它们在事务外执行、失败隔离、可去重、可诊断，从而让 Devtools/Studio 能解释“某个 action 会触发哪些副作用（来源是什么）”，并减少样板代码。

**Why this priority**: 复杂业务中同一 action 往往需要并行触发埋点/日志/异步任务/同步外部等多个副作用；如果只能写成大量 `onAction(...).runFork(...)`，将难以做去重治理、来源溯源与诊断。

**Independent Test**: 在一个模块里为同一个 actionTag 注册多个 effects（含 Module.make 静态声明与运行时 setup 注册）；派发一次 action，验证多个 handler 均执行；重复注册同一来源的 effect 不会导致执行翻倍，并能在诊断中被识别；run 阶段动态注册的 effect 只对后续 action 生效并给出提示。

**Acceptance Scenarios**:

1. **Given** 同一 actionTag 注册了多个 effect handlers，**When** 派发该 action，**Then** 这些 effect handlers 必须各执行一次（默认不承诺顺序），且执行发生在事务外。
2. **Given** 同一个 effect 来源被重复注册，**When** 派发该 action，**Then** 重复注册必须被视为 no-op（副作用不得重复执行），并且系统必须产出可解释的重复注册诊断。
3. **Given** 在 run 阶段动态注册一个 effect，**When** 在注册前后分别派发该 action，**Then** effect 只对注册后的 action 生效，并有可解释的动态/晚注册诊断提示。
4. **Given** 某个 effect handler 执行失败，**When** 同一次 action 触发多个 handlers，**Then** 失败不得阻止其它 handlers 的执行，且失败必须被记录为结构化诊断。

---

### Edge Cases

- 同一模块 actions 数量很大时，manifest 必须仍然稳定排序且有明确的大小上界策略（例如截断/分片/摘要）。
- action payload 为 void 与非 void 两种形态必须一致支持（包括 manifest 摘要与运行时事件）。
- 当模块定义阶段无法提供 source 锚点（动态工厂、生成物隐藏、运行环境限制）时，系统必须提供可解释的降级展示。
- 当运行时派发“未声明 action”时，事件必须可记录但不得污染“已声明 action” 的对齐与统计。
- 扩展机制新增 actions/reducers 时，必须保证 action 引用规则与排序规则不发生不兼容漂移。
- 同一 actionTag 注册多个 effects 时必须有去重与诊断治理，避免副作用“无意翻倍”与难以排查。
- run 动态注册 effects 的语义必须明确（只对未来 action 生效），并提供可解释提示（例如 dynamic/late registration）。

## Requirements _(mandatory)_

### Scope & Non-goals

- 本特性聚焦在“Action Surface（actions/dispatchers/reducers/effects）+ Manifest + 运行时事件对齐”。
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
- **FR-007**: 系统 MUST 输出可序列化的 Module Manifest（JSON；`ModuleManifest`），适用于跨进程/跨线程传输与版本对比（稳定排序、去随机化、可控体积）。
- **FR-008**: 系统 MUST 支持一种无需 codegen 的“token-first”使用方式：开发者可以用值级 Action 符号定义 action，并在 dispatch 与 watcher/订阅处引用同一符号以获得 IDE 跳转与引用能力。
- **FR-009**: 系统 MUST 确保现有基于字符串 tag 的 action 派发/订阅在本特性引入后仍可工作（token-first 作为增量能力）。
- **FR-010**: 系统 MUST 为 manifest 与运行时事件提供一致的字段语义说明与对齐约束，避免平台/运行时/Devtools 形成多套“真相源”。
- **FR-011**: 系统 MUST 提供一等的副作用注册面（effects/`$.effect`）：允许同一 actionTag 绑定多个 effect handlers，且不得强迫用户把多个副作用揉进单个 handler。
- **FR-012**: 系统 MUST 明确并强制 effects 的执行语义：事务外执行（reducer 提交后触发），默认并发且不承诺顺序；effect handler 失败必须隔离且记录为结构化诊断。
- **FR-013**: 系统 MUST 对 effect 注册提供去重与诊断（至少能识别重复注册、晚注册与动态注册）；重复注册默认视为 no-op（不得导致副作用翻倍），并支持 setup 注册（推荐路径）与 run 动态注册（高级路径）。
- **FR-014**: 系统 MUST 在 manifest/诊断链路中提供 effects 的最小可解释信息（例如 actionTag + 来源键 sourceKey + 可选 source）；其中 `sourceKey` MUST 可由系统自动派生且可序列化，用户不必显式提供，以支持去重与排错。
- **FR-015**: 系统 MUST 将 `actionTag` 的权威来源定义为 action 定义的 key（`actions` map key），并明确 rename 视为协议变更（forward-only）；不得引入“独立 stable tag”的兼容层。
- **FR-016**: 系统 MUST 采用 payload-first 的处理契约：primary reducer 的第二入参为 payload；当以单 ActionToken 做精确监听时，回调入参为 payload（predicate/string 监听仍回调完整 action object 以便区分 `_tag`）。
- **FR-017**: 系统 MUST 明确 effects 的“静态摘要 vs 运行时事实”边界：manifest 至少包含模块声明的 effects（可选补齐 setup 注册的 effects）；run 动态注册的 effects 不要求进入 manifest，但必须对“未来 action”生效并在运行时诊断流中可见（含 dynamic/late registration 提示）。

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
- **Module Manifest（ModuleManifest）**: 本特性里的 “Manifest” 指模块级可序列化 JSON 工件（Static IR），包含 `actions[]`（以及可选 `effects[]`、`digest`、`meta` 等）供 Studio/CI/Agent 消费。
- **Action 派发事件（ActionDispatchEvent）**: 运行时产生的结构化事件，用于把行为映射回 ActionRef 并串起 Trace IR 因果链。
- **Effect 引用（EffectRef）**: 用于在 Devtools/诊断中稳定定位某个 effect handler 的引用（建议由 `moduleId + actionTag + sourceKey` 组成）。
- **Effect 定义摘要（EffectDescriptor）**: Manifest/诊断中的副作用摘要（用于展示与排错，不承载闭包/Effect 本体）。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 对同一模块在相同输入与环境下重复提取 Module Manifest，输出必须字节级一致（deterministic）。
- **SC-002**: 对已声明的 actions，Studio/Devtools 的“事件 → 定义锚点”映射命中率为 100%（无 missing mapping）；未声明 action 必须被稳定标记为 unknown/opaque。
- **SC-003**: 在 token-first 路径下，开发者可从 action 使用点通过 IDE “跳转到定义”定位到 action 定义符号，并且“查找引用/重命名”覆盖 dispatch 与 watcher/订阅两侧。
- **SC-004**: 运行时 action 派发热路径在默认关闭诊断/Devtools 时满足既定性能预算；相对基线回归（p95 时间与分配）≤ 2%（以同环境、同采样参数的证据为准）。
- **SC-005**: 运行时事件与 manifest 中使用的实例/事务/动作标识均为确定性来源（无随机/时间默认值），并能用于回放与对齐。
- **SC-006**: 单模块 Module Manifest（actions 清单 + 摘要部分）的输出大小 ≤ 64 KB（超出时必须有可解释的截断/摘要策略并可被验证）。
- **SC-007**: 同一 actionTag 注册多个 effect handlers 时，每次派发会触发对应数量的 handler 执行（K 次），且 handler 之间失败隔离。
- **SC-008**: 重复注册同一来源的 effect 不会导致副作用重复执行，并能在诊断/Devtools 中被识别（duplicate/dynamic/late registration）。
- **SC-009**: setup 注册路径下 effects 对第一次派发即生效；run 动态注册路径明确只对后续派发生效并有可解释提示。
