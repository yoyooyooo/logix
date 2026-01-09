# Feature Specification: Runtime Internals Contracts（运行时内部契约化：Kernel/Runtime Services + TrialRun/Reflection）

**Feature Branch**: `[020-runtime-internals-contracts]`  
**Created**: 2025-12-21  
**Status**: Draft  
**Input**: User description: "我们创建个新 spec 去做这个改造"

## User Scenarios & Testing *(mandatory)*

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

### User Story 1 - 对外 API/行为稳定不变（重构可安全迭代） (Priority: P1)

作为运行时使用者（业务开发者/平台集成方），我希望在内部大改造后，已有模块/逻辑/集成不需要任何代码改动即可继续工作，且默认行为、错误语义、诊断事件形状保持稳定，从而让内部重构具备可持续迭代的安全边界。

**Why this priority**: 这是所有“内部架构升级”的前置门槛：只要对外语义发生漂移，就会把改造成本转嫁给调用方，阻断后续持续演进。

**Independent Test**: 在不修改任何调用方代码的前提下，运行仓库内代表性的运行时回归用例与示例场景，验证输出行为与诊断证据一致且无破坏性变更。

**Acceptance Scenarios**:

1. **Given** 一段既有模块实现与其调用方代码，**When** 切换到重构后的内部实现并执行相同交互序列，**Then** 对外可观察的状态更新/行为结果一致，且不需要调用方改动。
2. **Given** 诊断关闭与开启两种运行配置，**When** 执行同一组交互序列，**Then** 诊断开启时可产生结构化事件，诊断关闭时不引入可观察的语义差异。

---

### User Story 2 - 内部子系统可替换/可扩展（支撑长期迭代） (Priority: P1)

作为运行时维护者，我希望能在不“穿透式修改”全链路的前提下新增/替换一项内部子系统能力（例如事务调度、提交策略、收敛/校验调度、诊断采样），并能把该能力的影响域严格限制在单个模块实例或受控范围内，从而在保持默认语义稳定的同时持续演进。

**Why this priority**: 目前内部模块之间通过大量显式入参耦合，导致每次新增能力都要改很多文件并引入“参数爆炸”；可替换的子系统边界能把迭代成本从 O(全局) 降到 O(局部)。

**Independent Test**: 提供一个最小的“替换子系统”示例/测试：在单个模块实例上启用非默认策略并验证行为差异，同时另一个实例保持默认行为不受影响。

**Acceptance Scenarios**:

1. **Given** 两个相互独立的模块实例，**When** 仅对其中一个实例启用某内部子系统的替换实现，**Then** 该实例行为按替换实现生效，另一个实例保持默认行为。
2. **Given** 默认实现与替换实现都存在，**When** 同一功能通过“默认路径”和“替换路径”分别运行，**Then** 两者对外契约一致（除被明确允许变化的内部调度/诊断细节外），且可由诊断证据解释当前生效的配置来源。

---

### User Story 3 - 维护成本下降：依赖注入统一且职责边界清晰 (Priority: P2)

作为运行时贡献者，我希望能在几分钟内定位“某一能力应该改哪里”，并且新增能力时不需要扩散修改大量无关模块或在多处重复接线；每个内部子模块只承担单一职责，且通过统一的依赖注入方式获取共享依赖，从而让代码结构天然可读、可测试、可替换。

**Why this priority**: 这是长期可维护性的决定因素：当架构边界清晰时，review/定位/变更都更可控，避免“强心拆文件但思路不变”导致的复杂度迁移。

**Independent Test**: 新增一个“仅影响单一子系统”的内部改动，应能在不修改其他子系统实现细节的前提下完成，并通过该子系统的独立测试与全量回归用例验证。

**Acceptance Scenarios**:

1. **Given** 需要新增/替换某个内部子系统的能力，**When** 只修改该子系统及统一装配点的最小必要部分，**Then** 其他子系统无需为“传参/接线”做同步改动。
2. **Given** 一个子系统需要使用共享能力（如事务上下文/诊断/配置/队列），**When** 该子系统被单独测试或替换，**Then** 共享能力可由统一依赖注入机制提供或覆写，而不需要调用方手动拼接大量依赖参数。

---

### User Story 4 - 平台侧可试运行与证据/IR 导出（支持局部 Mock） (Priority: P2)

作为平台集成方（或对齐实验维护者），我希望能在浏览器或 Node.js 环境中，通过受控的依赖覆写/Mock 把某个模块实例“试运行一次”，并导出可机器处理的证据（包含子系统选择与关键 IR 摘要），从而支撑离线校验/对比、自动化回归与上层编排的静态分析。

**Why this priority**: 平台侧要做“跑一次拿到结构化信息”的能力时，最怕链路上到处是隐式全局状态与不可替换依赖；在本次内部服务化改造中同步打好底子，可以显著降低未来平台工程成本与风险。

**Independent Test**: 提供一个最小“试运行”样例：在同一进程内创建两个模块实例，对其中一个注入 Mock/覆写并执行一次受控交互，导出证据/IR；另一个实例保持默认行为并且证据不串扰。

**Acceptance Scenarios**:

1. **Given** 一个模块实例启用受控覆写/Mock，**When** 执行一次试运行并导出证据，**Then** 证据中包含稳定的实例锚点（如 instanceId）与可序列化的子系统绑定摘要，且在可用时包含关键 IR 摘要。
2. **Given** 同一进程内并行执行两个试运行会话，**When** 两者分别导出证据，**Then** 证据不互相污染（绑定来源/事件序列/IR 摘要不串扰），且可被稳定地对比与回放解释。
3. **Given** 一个模块由“构建脚本/Builder（可能依赖配置/环境）”动态生成 traits/topology，**When** 平台在受控构建环境中运行一次构建并导出静态 IR，**Then** 可以在不执行真实业务依赖的前提下获得可比较的结构化 IR（例如 traits 图/依赖/资源元信息）。

---

### Edge Cases

- 当某个内部子系统依赖缺失/配置无效时，应快速失败并提供可定位的结构化诊断（而不是静默降级到不可解释状态）。
- 当启用“局部覆写”时，覆写不得泄漏到其他模块实例；实例销毁后不得残留全局引用导致内存泄漏。
- 当诊断关闭时，不得因重构引入新的默认开销；该开销必须满足 NFR-001/NFR-002 的预算门槛，并不得引入与 state/traits/graph 规模成比例的隐式扫描/序列化（预算口径详见 `specs/020-runtime-internals-contracts/plan.md` 的 Performance Goals）。诊断开启时应提供足够证据解释“当前策略为何生效”。
- 当存在“试运行会话”并行或高频创建/销毁时，应保证会话级别与实例级别隔离清晰，避免跨会话串扰与长期引用悬挂。
- 当同一进程内存在多个 ManagedRuntime / 多个 Root Provider 并存时，内部子系统绑定、证据导出与调试能力不得互相污染或产生隐式全局兜底依赖。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 保持对外 API、类型与默认行为不变；调用方无需改动即可获得等价语义（重构仅改变内部结构与可扩展性）。
- **FR-002**: 系统 MUST 明确内部“子系统边界”（可替换契约），并支持在受控范围内替换实现以支撑实验/测试/演进。
- **FR-003**: 系统 MUST 提供统一的内部依赖注入机制，子系统获取共享依赖不依赖“跨文件长参数列表传递”；装配点应作为单一事实源。
- **FR-004**: 系统 MUST 支持“按模块实例维度”的内部子系统覆写（默认不影响其他实例），并定义清晰的覆写优先级与作用域边界。
- **FR-005**: 系统 MUST 保持内部资源生命周期可管理：实例销毁时自动释放队列/注册表/缓存等资源，避免跨实例泄漏与长期引用悬挂（机制与约束详见 `specs/020-runtime-internals-contracts/plan.md` 的 Constraints）。
- **FR-006**: 系统 MUST 为内部子系统覆写与关键策略选择提供结构化、可序列化的诊断证据，使 Devtools 能解释“当前为何使用该策略/来源是什么”。
- **FR-007**: 系统 MUST 提供清晰的内部迁移说明：从旧的“隐式耦合/参数传递”模式迁移到新的“统一注入/可替换子系统”模式，避免贡献者在改造期间迷失。
- **FR-008**: 系统 MUST 将“内部 hooks/内部协作协议”封装为明确的内部契约与访问入口，避免仓库内集成方依赖隐式的 magic 字段或散落的私有约定。
- **FR-009**: 系统 MUST 支持平台侧的“受控试运行”能力：允许在会话/实例范围内注入 Mock/覆写并导出可机器处理的证据与关键 IR 摘要，用于对比、回放与自动化校验。
- **FR-010**: 系统 MUST 覆盖运行时全链路的内部契约化改造范围：Runtime 组装（Runtime.make/AppRuntime）、模块实例构建（ModuleFactory）、Bound API 与 Traits/生命周期等内部消费方，都应通过同一套可注入契约获取所需能力，避免形成“只改 ModuleRuntime 但其他链路仍靠 magic 字段”的半吊子结构。
- **FR-011**: 系统 MUST 将“证据导出/IR 摘要采集”从 Devtools 全局单例中解耦出来，支持按 RunSession/Scope 注入证据采集器，并保证并行试运行时证据隔离；DevtoolsHub 仅作为可选 consumer，不得成为试运行导出的必要依赖。
- **FR-012**: 系统 MUST 将仓库内对 internal hooks 的访问收敛到统一入口（例如 internal accessor/RuntimeInternals），并逐步迁移 `@logixjs/react` 的 imports 解析、trait-lifecycle、state-trait 等内部模块，避免在多个包里散落对 `runtime.__*` / `bound.__*` 的直接读取。
- **FR-013**: 系统 MUST 支持“构建态反射（Reflection）”：在受控构建环境中运行一次 Builder，导出静态 IR（如 traits 结构/依赖/资源元信息与模块拓扑摘要），用于平台侧的可逆工程与漂移检测底座。
- **FR-014**: 系统 MUST 定义并强制“构建态依赖约束”：构建阶段只能依赖少量可 Mock 的基础能力（例如配置/平台信息/文件系统），禁止在构建阶段隐式依赖任意业务 Service；若违反必须快速失败并给出可行动诊断。
- **FR-015**: 系统 MUST 在导出的 Static IR / Evidence Summary 中携带并保留可扩展的“语义锚点/注解”（例如 trait meta 的 label/description/tags/docsUrl 等），用于支撑未来的 Phantom Source、语义压缩与漂移检测；该锚点/注解必须 Slim、可序列化且可裁剪。
- **FR-016**: 系统 MUST 保证试运行（Trial Run）与反射构建（Reflection）的导出产物可复现、可对比：任何会影响导出内容的去重/once/序列号分配/缓存状态不得是进程级全局（避免跨会话污染导致“证据缺失/序列漂移/不可解释差异”）。

### Non-Functional Requirements (Performance & Diagnosability)

<!--
  If this feature touches Logix runtime hot paths, treat performance and
  diagnosability as first-class requirements:
  - Define budgets (time/alloc/memory) and how they are measured
  - Define what diagnostic events/Devtools surfaces exist and their overhead
-->

- **NFR-001**: 系统 MUST 在改造前记录受影响热路径的可复现性能基线，并定义预算；改造后不得出现显著回归（以预算为门槛）。
- **NFR-002**: 系统 MUST 在诊断关闭时保持近零额外开销；在诊断开启时提供结构化、可序列化的关键事件与证据字段，以支撑解释链路。
- **NFR-003**: 系统 MUST 使用确定性标识（实例/事务/操作等）用于诊断与回放面；不得默认使用随机数或时间戳作为隐式标识来源。
- **NFR-004**: 系统 MUST 严格维护同步事务窗口边界：事务窗口内禁止 IO/异步边界；不得提供可绕过该边界的隐式写逃逸。
- **NFR-005**: 若本改造引入新的默认策略或改变性能边界/优化阶梯，系统 MUST 同步更新用户文档与诊断术语，确保心智模型与证据字段一致且可操作。
- **NFR-006**: “受控试运行” MUST 是显式 opt-in 能力：在默认运行（非试跑且 diagnostics=off）下不得引入与 state/traits/graph 规模成比例的隐式扫描/序列化；其热路径额外开销必须满足 NFR-001 的预算门槛（默认 p95 延迟/分配/内存 ≤ 5% 回归）。证据/IR 导出应可裁剪、可序列化、且在并行会话场景下保持隔离与可解释性。
- **NFR-007**: 系统 MUST 避免把进程/页面级全局单例作为运行正确性或平台试跑的必需依赖；如存在全局聚合器（例如 DevtoolsHub），其影响域与生命周期必须显式、可隔离，并提供等价的 per-session 采集路径。
- **NFR-008**: 反射构建（Reflection）与试运行（Trial Run） MUST 支持在同一进程内重复/并行执行且结果可对比；不得因全局缓存/全局注册表/进程级 once 去重/序列号分配器导致“跨会话污染”或非确定性漂移。

### Assumptions

- 本改造允许对内部文件结构做大幅调整，但对外导出与默认行为必须稳定。
- 内部扩展点默认仅面向仓库内部/高级使用者；不承诺历史内部实现细节兼容，但必须提供迁移说明以支撑并行开发。
- 依赖项：需要一套可复现的性能基线与关键回归用例集，用于证明“重构不回退”并为后续优化提供对比依据。
- 证据与 IR 摘要遵循仓库“统一最小 IR（Static IR + Dynamic Trace）”原则，避免引入第二套并行真相源。
- 技术栈与版本基线以 `specs/020-runtime-internals-contracts/plan.md` 的 Technical Context 为准；本 spec 不重复列出版本号与工具链细节。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 在不修改任何调用方代码的前提下，仓库内既有的代表性运行时用例与示例场景通过率为 100%（对外语义无破坏性变化）。
- **SC-002**: 至少对两个内部子系统提供“可替换实现”的验证用例：同一进程内两个模块实例，其中一个启用覆写后行为发生预期变化，另一个保持默认行为。
- **SC-003**: 内部子系统依赖接入从“多处显式传参”收敛到“单一装配点 + 统一注入机制”，新增子系统能力不需要在多处重复接线或扩散修改无关模块。
- **SC-004**: 性能：在定义的基线与预算下，热路径指标（延迟/分配/内存）无显著回归；诊断关闭时的额外开销保持在预算内。
- **SC-005**: 可诊断性：当启用覆写或策略选择发生变化时，诊断事件能明确解释“生效策略/来源/关键参数”，并且事件可序列化、体积受控。
- **SC-006**: 提供可复现的“受控试运行”验证：在浏览器与 Node.js 环境各跑一次同构试运行，导出证据与关键 IR 摘要，并能进行稳定对比（无跨会话串扰）。
- **SC-007**: 运行时全链路内部 hooks 的访问点从“散落的 magic 字段/参数接线”收敛到“统一内部契约入口”，仓库内新增能力不再需要在多个包中同步修改接线路径。
- **SC-008**: 提供可复现的“构建态反射”验证：在 Node.js 环境中对同一模块以两套不同构建配置各运行一次 Builder，导出静态 IR，并能稳定对比（差异可解释且无跨会话污染）。
