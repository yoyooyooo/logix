# Feature Specification: Dual Kernel Contract（可替换内核契约：当前内核 + core-ng 并行）

**Feature Branch**: `[045-dual-kernel-contract]`  
**Created**: 2025-12-27  
**Status**: Done  
**Input**: User description: "打造可替换内核契约：现有 @logix/* 内核与 core-ng 并行；上层（Logix React/平台/Devtools/Sandbox）只依赖稳定的 Kernel Contract 与统一最小 IR；允许未来一次性切换内核；禁止使用历史版本号旧称；旧 specs 不改动，仅做关联引用。"

## Terminology

- **当前内核（Current Kernel）**：当前 `@logix/*` 体系所使用的内核实现（正式包的默认实现）。
- **core-ng**：下一代内核实现的代号；与当前内核并行演进，最终可切换为默认实现。
- **Kernel Contract**：上层（Logix React/平台/Devtools/Sandbox）与内核之间的稳定契约边界；上层只能依赖契约，不能穿透依赖内核内部结构。
- **统一最小 IR（Static IR + Dynamic Trace）**：所有诊断/证据/回放链路的唯一事实源；禁止新增并行真相源。
- **读状态车道（Read Lanes）**：对上层 selector 的执行形态做可解释分档（例如 `static` / `dynamic`），用于 Devtools 与 strict gate；与内核切换一样，必须可证据化且不允许黑盒默认。

## Related (read-only references)

- `specs/020-runtime-internals-contracts/`（内部契约化与可替换子系统）
- `specs/016-serializable-diagnostics-and-identity/`（可序列化诊断与稳定身份）
- `specs/005-unify-observability-protocol/`（统一观测协议与证据包）
- `specs/024-root-runtime-runner/`（根模块运行入口与试运行边界）
- `specs/039-trait-converge-int-exec-evidence/`（核心热路径证据达标：可作为契约验收集来源）
- `specs/057-core-ng-static-deps-without-proxy/`（读状态车道：ReadQuery/SelectorSpec + SelectorGraph）

## Clarifications

### Session 2025-12-27

- Q: core-ng 选择策略：允许与 builtin 混用还是必须全套切换？ → A: 仅在 `trial-run/test/dev` 允许按 `serviceId` 渐进替换（可混用 builtin，但必须记录并可对比）；当宣称“已切到 core-ng/准备切换默认实现”时，必须全套切换，否则视为未达标。
- Q: core/core-ng 的选择粒度：按 runtime / module / instance？ → A: 按 `ManagedRuntime`（一棵 DI 树）选择：同一棵 runtime 下所有 `ModuleRuntime` 共享同一 `kernelId`（`core`/`core-ng`）；仅在 `trial-run/test/dev` 才允许按 `serviceId` 细粒度混用并记录证据。
- Q: 是否允许引入新的对外概念/API 来控制切换与对照？ → A: 不新增面向业务的概念/API；切换仅发生在 runtime 装配阶段（`kernelId` 选择），并通过 `KernelImplementationRef + RuntimeServicesEvidence` 进入统一最小 IR/证据链路。
- Q: 选择证据在不同诊断档位的要求？ → A: 分档位：diagnostics=off 必须至少包含 `KernelImplementationRef` 的极小摘要；diagnostics=light/full 必须包含 `RuntimeServicesEvidence`（serviceId→implId 选择证据）。
- Q: `KernelImplementationRef.kernelId` 的语义：表示“请求的内核族”还是“实际全套生效的内核族”？ → A: 表示“请求的内核族”；即使部分 `serviceId` fallback 到 builtin，仍保持 `core-ng`。是否已达“全套切换/可作为默认实现”由 `RuntimeServicesEvidence`（及其 fallback 记录）判定。

### Session 2025-12-28

- AUTO: Q: 045 的 perf evidence 预算口径是什么？ → A: 以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为唯一 SSoT；交付结论必须 `profile=default`（或 `soak`）并满足 `pnpm perf diff` 输出 `meta.comparability.comparable=true` 且 `summary.regressions==0`；before/after 必须 `meta.matrixId/matrixHash` 一致。
- AUTO: Q: 045 的 perf evidence baseline 语义是什么？ → A: 代码前后：before=引入 Kernel Contract/装配点改动前，after=改动后（默认仍用当前内核 core）；用于证明“装配/契约层”不引入热路径回归。
- AUTO: Q: perf evidence 采集是否允许在混杂改动的 worktree 上完成？ → A: 不允许；代码前后对比必须在隔离 worktree/目录分别采 before/after（避免并行改动污染），否则只能作为线索不得宣称 Gate PASS。
- AUTO: Q: Perf Gate 必须覆盖哪些诊断档位？ → A: P1 suites 的 Gate baseline 以 `diagnostics=off` 为准；light/full 仅用于开销曲线与解释链路验证，不作为默认 Gate baseline。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 上层生态可独立演进（平台/Devtools/Sandbox 不被内核替换拖慢） (Priority: P1)

作为平台与工具链维护者，我希望 Logix React、平台侧编排、Devtools 与 Sandbox 只依赖一个稳定的 Kernel Contract，并基于统一最小 IR 做观测与对齐；这样即使内核进行大规模重构或替换（core-ng），上层生态也不需要同步大改，能持续向前演进。

**Why this priority**: 平台/工具链是生态地基。如果它们必须追随内核内部结构变化，上层建设会被反复打断，导致路径又长又苦。

**Independent Test**: 在允许上层做“轻量迁移”的前提下，通过切换内核实现来源（当前内核 ↔ core-ng），跑同一段代表性交互序列：对外可观察结果一致，且可导出的 IR/证据仍可被消费。

**Acceptance Scenarios**:

1. **Given** 一段既有的上层集成（含 Logix React + Devtools/Sandbox 连接），**When** 更换内核实现并进行必要的轻量迁移，**Then** 应用仍可运行且核心行为不变。
2. **Given** 同一份交互序列在两种内核实现下分别执行，**When** 导出统一最小 IR（静态摘要 + 动态事件序列），**Then** 上层消费方能稳定解析，且事件锚点可对齐到同一实例/事务/操作序列。
3. **Given** 内核实现选择发生变化，**When** 上层查看诊断与证据，**Then** 能解释“当前生效的内核实现是什么、来自哪里、为何如此选择”（可序列化、可裁剪、不开启诊断时近零成本）。

---

### User Story 2 - core-ng 可并行演进，且切换风险可量化/可拦截 (Priority: P1)

作为运行时维护者，我希望能在不阻塞平台与上层生态建设的情况下并行开发 core-ng，并通过“契约一致性 + 证据对比 + 性能门槛”把错误或负优化拦在合入/切换之前，从而让“重写内核”从高风险赌局变为可持续演进。

**Why this priority**: “半成品切换”会带来长期返工：要么行为漂移，要么负优化，要么诊断链路断裂。必须把风险显式化并前移。

**Independent Test**: 用同一套契约一致性验证分别驱动当前内核与 core-ng：若输出不一致，必须能生成结构化差异报告；若性能回归，必须被预算门槛拦截。

**Acceptance Scenarios**:

1. **Given** core-ng 尚未覆盖全部能力，**When** 运行契约验证，**Then** 不允许静默降级导致语义漂移；必须以结构化失败返回缺失点与最小上下文，便于补齐或显式推迟。
2. **Given** core-ng 与当前内核在同一交互序列下输出存在差异，**When** 生成差异结果，**Then** 差异必须可定位到稳定锚点（实例/事务/操作），并能以机器可读方式消费。
3. **Given** core-ng 的性能指标低于预算门槛，**When** 执行性能对比，**Then** 必须判定为失败并阻止切换为默认实现（允许继续并行演进，但不得“带病切换”）。

---

### User Story 3 - 多内核可共存：按 runtime 选择与隔离 (Priority: P2)

作为应用开发者（或平台实验维护者），我希望在同一宿主内并行运行多个 runtime（多棵 DI 树），并对每个 runtime 选择不同的内核实现（当前内核或 core-ng），用于灰度/对照/实验；同时它们必须严格隔离，互不串扰，且诊断证据能解释每个 runtime 用的是哪个内核。

**Why this priority**: 并行共存是“徐步推导重来”的关键：它允许平台继续使用当前内核，同时让 core-ng 在真实场景里逐步长大并被验证。

**Independent Test**: 在同一宿主内启动两个 runtime（一个使用当前内核，一个使用 core-ng），执行互不相关的交互序列：两者状态与证据不串扰，且可被分别导出/回放/对比。

**Acceptance Scenarios**:

1. **Given** 两个 runtime 并行运行且内核实现不同，**When** 同时产生事务与诊断事件，**Then** 事件流能稳定区分 runtime 与内核来源，不发生跨 runtime 污染。
2. **Given** 其中一个 runtime 被关闭/销毁，**When** 释放资源后继续运行另一个 runtime，**Then** 不发生隐式全局状态残留导致的行为漂移。

---

### Edge Cases

- **一致性边界**：两种内核在同一交互序列下，允许出现哪些“可接受差异”（例如仅影响诊断细节），哪些差异必须视为语义破坏？
- **证据/协议版本**：当内核实现升级导致 IR/证据字段演进时，消费侧如何保持“可理解/可降级/不崩溃”？
- **诊断档位**：在诊断关闭时如何保证近零额外开销？在诊断开启时如何保证事件 Slim、可序列化、且受预算闸门约束？
- **事务边界**：任何跨事务的写入逃逸、异步边界或隐式 IO 如何被禁止或显式失败？
- **并行会话隔离**：并行试运行/导出/回放时如何避免全局单例或进程级缓存造成跨会话串扰？

## Assumptions

- 用户侧/业务侧的写法与 API（`@logix/*` 面向使用者的表层能力）在可预见范围内保持稳定；本特性聚焦“内核契约与替换策略”。若确需调整表层 API，期望仅为轻量迁移（小范围、可一次性完成），且不引入长期兼容层。
- core-ng 的演进允许先覆盖核心闭环再扩面：在 `trial-run/test/dev` 允许按 `serviceId` 渐进替换（可混用 builtin，但必须记录并可对比）；当宣称“已切到 core-ng/准备切换默认实现”时，任何关键服务缺失/回退都必须视为失败（禁止静默漂移）。
- 本特性不以“一次性替换当前内核”为交付目标；目标是先建立可替换地基，使替换变成可选择、可验证、可回退的动作。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 定义并固化 Kernel Contract：明确上层可依赖的能力边界、输入输出、错误语义与可观测锚点；上层不得依赖内核内部结构。
- **FR-002**: 系统 MUST 提供“当前内核”的契约实现（作为默认实现），确保现有上层生态可继续工作（允许轻量迁移，但不得引入长期双栈兼容成本）。
- **FR-003**: 系统 MUST 支持接入 core-ng 作为契约的另一种实现，并允许上层在完成必要的轻量迁移后选择使用（默认仍可保持当前内核）；在 `trial-run/test/dev` 允许按 `serviceId` 渐进替换（混用需可证据化），但“切换为默认实现/宣称已切到 core-ng”必须全套切换。
- **FR-004**: 系统 MUST 提供契约一致性验证：同一组交互序列能分别驱动不同内核实现，并对“可观察结果 + 统一最小 IR”做可重复的对比验证。
- **FR-005**: 系统 MUST 统一并强制稳定标识：所有内核实现产出的 IR/证据必须使用确定性锚点（实例/事务/操作序列等），以支持解释、回放与 diff。
- **FR-006**: 系统 MUST 明确并强制“事务窗口边界”：事务窗口内禁止 IO/异步边界；不得提供绕过边界的写逃逸通道。
- **FR-007**: 系统 MUST 支持按 `ManagedRuntime`（一棵 DI 树）选择内核实现，并确保多 runtime 并行时严格隔离、互不串扰；内核选择与生效来源必须可诊断且可序列化。
- **FR-008**: 系统 MUST 定义不可接受差异的失败策略：当 core-ng 与当前内核的对比结果触发语义破坏或预算回归时，必须以结构化失败阻止切换为默认实现；且在“宣称已切到 core-ng/准备切换默认实现”时，出现关键服务缺失/回退（混用 builtin）同样属于不可接受差异。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 系统 MUST 为“契约适配层”定义可复现的性能基线与预算：以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为 SSoT；交付结论必须 `profile=default`（或 `soak`），且 before/after 必须满足 `meta.matrixId/matrixHash` 一致；`pnpm perf diff` 输出必须满足 `meta.comparability.comparable=true` 且 `summary.regressions==0`，否则不得宣称 Gate PASS。
- **NFR-002**: 系统 MUST 在诊断关闭时保持近零额外开销，且至少能导出 `KernelImplementationRef`（极小摘要）；在诊断开启（light/full）时提供 Slim 且可序列化的结构化证据（包含 `RuntimeServicesEvidence`），以支撑解释链路。
- **NFR-003**: 系统 MUST 使用确定性标识（实例/事务/操作等）作为证据锚点；不得默认使用随机数或时间作为主锚点来源。
- **NFR-004**: 系统 MUST 严格维护同步事务窗口边界：事务窗口内禁止 IO/async；不得提供写逃逸。
- **NFR-005**: 若本特性引入新的“内核选择/降级/回退”策略或改变性能边界，系统 MUST 提供稳定心智模型与可解释字段：用户能用不超过 5 个关键词理解“当前用了哪个内核/为何/代价是什么/如何排障与回退”（关键词：`kernelId(requested)`、`servicesEvidence(actual)`、`fallback`、`diagnosticsLevel`、`budget`）。其中 `lane` 属于 ReadQuery 的正交心智模型（见 057），不纳入本 5 关键词列表。
- **NFR-006**: 系统 MUST 避免进程/页面级全局单例成为正确性必需依赖；并行会话/试运行/导出必须隔离且结果可对比（无跨会话串扰）。

### Key Entities _(include if feature involves data)_

- **Kernel Contract**: 上层唯一可依赖的内核能力边界；定义输入输出、错误语义、可观测锚点与一致性判定口径。
- **Kernel Implementation**: 契约的一种实现（当前内核或 core-ng）。
- **KernelImplementationRef**: 统一最小 IR 中的“内核族引用”（高层摘要）；其 `kernelId` 表示“请求的内核族”，是否发生 fallback/混用需结合 `RuntimeServicesEvidence` 判定。
- **RuntimeServicesEvidence**: serviceId→implId 的细粒度选择证据（包含 scope/overridesApplied/fallback 解释线索）；用于解释与对照，不得成为隐式语义开关。
- **Static IR**: 可序列化、可对比的静态摘要工件（用于解释、对齐与漂移检测）。
- **Dynamic Trace**: 运行时事件序列（Slim、可序列化、可裁剪），用于回放/诊断/对比。
- **Evidence Package**: 统一最小 IR 的可导出载体（含版本信息与稳定锚点），用于跨宿主消费与协作审核。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 在允许上层做轻量迁移的前提下，同一组代表性交互序列可在“当前内核”与“core-ng”下分别运行，且对外可观察结果一致（或差异被明确归类为“允许差异”）。
- **SC-002**: 对同一交互序列，两种内核都能导出统一最小 IR（Static IR + Dynamic Trace），并可被 Devtools/Sandbox 稳定消费；导出载体可序列化且跨宿主可导入。
- **SC-003**: 提供一套可重复运行的契约一致性验证：任意内核实现接入后能被自动验证，并在失败时给出结构化差异报告（含稳定锚点）。
- **SC-004**: 多 runtime 并行运行时可按 runtime 选择内核实现，且隔离性得到验证：事件/状态/证据不串扰；runtime 关闭后无残留导致的漂移。
- **SC-005**: 契约适配层在默认配置下不引入显著性能回归（以预先定义的基线与预算门槛为准），且诊断关闭时额外开销接近零。
