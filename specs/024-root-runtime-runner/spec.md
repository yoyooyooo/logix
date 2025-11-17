# Feature Specification: Root Runtime Runner（根模块运行入口）

**Feature Branch**: `024-root-runtime-runner`
**Created**: 2025-12-23
**Status**: Draft
**Input**: User description: "按这个思路先创建个 spec，编号 024, 另外这块可能要回头看看 @logix/test ，我希望互相对齐，@logix/test那边之前早期的设定可以随时推翻，以现在的视角审视"

## Clarifications

### Session 2025-12-24

- Q: 025 的 Trial Run 是否会执行 024 的 `main`？ → A: 不会；Trial Run 只复用 024 的 `openProgram/boot` 启动 program module，在受控窗口内采集证据/IR，然后关闭 scope 收束（不执行 `main`）。
- Q: 025 的 `runId` 与 runtime `instanceId` 的关系是什么？ → A: `runId` 是 Trial Run / RunSession 的会话标识；`instanceId` 仍是 runtime 实例标识（默认可稳定如 `i1`）。证据/IR 对齐时携带 `runId + moduleId + instanceId`，且 `runId` 与 `instanceId` 不应混用或强行相等。
- Q: 025 Trial Run 的超时模型如何定义（试跑窗口 vs 释放收束）？ → A: 两段超时：`trialRunTimeoutMs`（试跑窗口）+ `closeScopeTimeout`（释放收束，复用 024）；窗口超时归类为 TrialRunTimeout，释放超时归类为 DisposeTimeout（必要时可同时记录）。
- Q: 025 Trial Run 遇到缺失依赖（Service/Config）时，是失败还是 warnings？ → A: 必须失败（hard fail）；失败载荷必须携带缺失清单与最小上下文（阶段/入口/标识），供 CI/平台展示与修复。
- Q: 025 Trial Run 的启动范围是 build-only 还是 full boot？ → A: full boot：复用 024 的 `openProgram/boot` 完整启动（包含 logics/processes），但不执行 024 的 `main`；在受控窗口内采集证据/IR，然后关闭 scope 收束。

## Terminology

- **Root module / Program module**：作为“可运行程序”的根模块；运行时以它作为 runtime 树入口进行装配与启动。
- **Program（程序）**：`Runtime.runProgram(rootModule, main)` 这一对（root module + main 函数）共同构成一次可运行程序；root module 可以是“纯图纸”（无 logics），此时真正的 program 主要体现在 `main`（模块仅提供能力/运行环境）。
- **Trial Run（受控试运行，025）**：用于预检与 IR/证据提取的“受控窗口运行”；它复用 024 的 `openProgram/boot` 启动 program module，并在窗口内采集证据/IR，随后关闭 scope 收束；**不执行 024 的 `main`**。
- **runId（RunSession id）**：Trial Run / Evidence 导出的会话标识；用于跨进程/跨机器对比与并行会话隔离；它不等价于 runtime 实例 `instanceId`。
- **Program runner / 根模块运行入口**：`@logix/core` 提供的标准入口（`Runtime.runProgram` / `Runtime.openProgram`），负责 boot 与释放，但不做隐式保活。
- **Boot**：触发 root module 实例化与 logics/processes 启动。
- **Main program**：调用方提供的主流程；它显式表达退出条件（可以等待外部信号或观测条件）。
- **Isolation（隔离）**：不同 root 实例在同一进程内运行时，至少在 Scope/instanceId/注册表/状态 上相互隔离；不得依赖进程级全局单例解析。
- **Graceful shutdown（优雅退出）**：在 Node/CLI 场景捕获 SIGINT/SIGTERM 后，不调用 `process.exit`，而是触发 root scope 的关闭流程，让 finalizer 有机会执行（受 `closeScopeTimeout` 约束）。

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

### User Story 1 - 一键运行根模块（脚本/命令行友好） (Priority: P1)

作为开发者，我希望在脚本、demo 或命令行工具中用一个标准入口“运行根模块”，无需手写启动/保活/释放的样板代码，同时仍然能显式表达退出条件。

**Why this priority**: 这是最高频、最影响体验的入口；它直接决定 demo/脚本/CLI 的可交接性与一致性，也能反向约束运行时生命周期心智模型的正确传播。

**Independent Test**: 仅实现该能力即可用一个最小 root module 证明：调用入口后能启动根模块逻辑并执行用户主流程；主流程结束后不会留下未释放资源（进程可正常退出）。

**Acceptance Scenarios**:

1. **Given** 一个包含常驻逻辑（例如持续监听事件）的根模块，**When** 使用“根模块运行入口”执行一个会显式等待退出条件的主流程，**Then** 主流程能在条件满足时结束，并确保运行资源被释放。
2. **Given** 一个根模块在启动阶段发生装配错误（缺失依赖或非法组合），**When** 调用“根模块运行入口”，**Then** 调用方能得到稳定失败信号，并且不会遗留半初始化资源。
3. **Given** 同一进程内并行运行多个根模块实例，**When** 分别触发各自退出条件并结束主流程，**Then** 实例间不串扰且都能独立释放资源（不依赖进程级全局单例解析）。

---

### User Story 2 - 与测试运行时对齐（复用同一套心智模型） (Priority: P2)

作为测试作者/框架作者，我希望测试库（@logix/test）与“根模块运行入口”共享同一套生命周期语义（启动/退出/释放），并彻底切换到该模型：测试入口复用 `@logix/core` 的 `Runtime.openProgram/runProgram` 内核，在其之上叠加测试专用能力（观测、断言、TestClock 等），不再维护一套独立的 `TestProgram/Scenario` 生命周期模型。

**Why this priority**: 如果测试库与业务 demo 的运行语义不一致，最终会导致“测试通过但 demo/线上行为不同步”，成为长期维护成本与信任危机。

**Independent Test**: 选择一个同样的 root module，分别用 demo runner 与 test runner 运行，观测到的关键行为（状态变化/事件顺序）保持一致；测试库仍能提供额外的断言与可控时钟。

**Acceptance Scenarios**:

1. **Given** 一个包含子模块导入与扩展句柄的根模块，**When** 用测试运行入口运行并观测行为，**Then** 其启动/退出/释放语义与 demo/脚本入口一致，且测试库提供的观测能力不改变被测行为。

---

### User Story 3 - 统一心智模型与文档（解释“为何不会自动退出”） (Priority: P3)

作为使用者，我希望文档与示例能解释清楚：为什么“常驻逻辑/后台流程不会自动退出”，以及如何用标准入口表达退出条件，而不是在业务模块里嵌入保活机制。

**Why this priority**: 该心智模型是避免误用与泄漏的关键；没有统一解释，会导致不同团队各自发明 Host/Deferred 等变体，最终破坏可交接性。

**Independent Test**: 只更新文档与示例也应能独立验收：读者能够复述生命周期规则，并能把一个旧的“手动挡 Host/Deferred demo”改写为标准入口 + 明确退出条件。

**Acceptance Scenarios**:

1. **Given** 一段旧示例依赖“手动保活”的写法，**When** 按文档改写为标准入口 + 显式退出条件，**Then** 仍可正确运行且更少侵入业务模块定义。

---

### Edge Cases

- 根模块存在常驻逻辑/后台流程：主流程结束后必须确保资源释放，否则会造成进程无法退出或泄漏。
- 根模块启动阶段失败：需要稳定失败信号，并避免“半启动”资源残留。
- 主流程执行失败（抛错/失败）：必须释放资源，并把失败传播给调用方。
- 退出信号在启动尚未完成时触发：系统应能安全退出，不进入僵尸状态。
- 同进程并行运行多个根模块实例：彼此隔离，不共享隐式的进程级单例状态。
- 需要访问“模块句柄扩展”（例如 controller）：脚本/测试入口应提供与逻辑/React 一致的扩展可用性。

## Requirements _(mandatory)_

### Functional Requirements

> 对外 API 形态与 options 默认值以 `contracts/api.md` 为准；本段聚焦语义与验收口径。

- **FR-001**: 核心运行时库 MUST 提供一个标准化的“运行根模块”的入口，面向脚本/demo/CLI 使用场景。
- **FR-002**: 该入口 MUST 自动完成根模块的启动（包括模块逻辑初始化与长驻流程启动），调用方不需要额外“触碰/预热”动作才能进入主流程。
- **FR-003**: 该入口 MUST 自动管理生命周期：无论主流程成功或失败，最终都能释放运行资源；调用方不需要手写“显式释放样板”作为必要条件。
- **FR-004**: 该入口 MUST 采用 “Program Module + MainFn 分离” 的调用形态（`Runtime.runProgram(rootModule, main, ...)`）：调用方无需侵入业务模块定义即可表达退出条件；默认以 `main` 结束为退出；也支持在 `main` 中通过外部信号或观测条件收敛退出。
- **FR-005**: 该入口 MUST 向调用方提供一个最小且稳定的运行上下文（例如 `ProgramRunContext`），至少包含 root scope（`ctx.scope`）、root runtime、root `ModuleRuntime`，以及可复用的 Bound API（`ctx.$`）以统一访问模块句柄并合并 handle-extend（例如 controller）；并且该上下文在交付给调用方时必须已完成 boot（可立即交互使用，无需额外“预热/触碰”）。
- **FR-006**: 该入口 MUST 支持同一进程内并行运行多个根模块实例且相互隔离（独立 Scope/instanceId/注册表/状态），不依赖也不得静默回退到进程级全局单例解析来定位模块实例。
- **FR-007**: 该入口 MUST 不引入任何隐式保活或自动推断退出时机；生命周期管理仅限 boot/释放，退出策略完全由 `main` 显式表达（见 FR-004）。
- **FR-008**: 测试库（@logix/test）MUST 彻底对齐并复用该入口的生命周期内核：复用点 MUST 是 `@logix/core` 的 `Runtime.openProgram/runProgram`（或其内部实现），禁止在 `@logix/test` 内自建 Scope/boot/释放逻辑；允许直接删除/重写旧的 `TestProgram/Scenario` 外表，并同步更新仓库内所有用例/示例（不提供兼容层）。
- **FR-009**: 该入口 MUST 允许调用方配置顶级错误上报钩子，用于脚本/CLI 集成日志与监控；上报行为不得隐式改变退出策略。
- **FR-010**: `Runtime.runProgram` MUST 支持可配置的 `closeScopeTimeout`（默认 1 秒）：主流程结束后在该窗口内完成 scope close/释放；若超时则以结构化的 DisposeTimeout 失败，并通过 `RuntimeOptions.onError` 发出告警（不改变退出策略）。
- **FR-011**: 在 Node.js 场景下，`Runtime.runProgram` SHOULD 支持可选的信号处理（SIGINT/SIGTERM，`handleSignals: boolean`，默认 `true`）：当信号到达时，不调用 `process.exit`，而是触发 `ctx.scope` 的关闭流程以进行 graceful shutdown（并确保监听器在结束后被移除，避免泄漏/串扰）。
- **FR-012**: `Runtime.runProgram` SHOULD 支持为 `main` 注入结构化参数（typed args），避免 `process.argv` 等全局读取导致的不可测与漂移：`main(ctx, args)`。
- **FR-013**: 在 CLI 场景下，runner SHOULD 支持“结构化退出码 + 错误输出策略”（仅在显式启用 `exitCode` 时生效）：
  - 允许 `main` 以成功通道返回 `void | number`，并在启用时将其映射为 `process.exitCode`（`void` 视为 0）；
  - 失败路径默认映射为非 0（默认 1；也允许可配置/可解释的映射策略）；
  - 支持 `reportError` 开关控制默认错误输出（默认 `true`），或完全交给调用方/`onError` 接管。

### Non-Functional Requirements (Performance & Diagnosability)

<!--
  If this feature touches Logix runtime hot paths, treat performance and
  diagnosability as first-class requirements:
  - Define budgets (time/alloc/memory) and how they are measured
  - Define what diagnostic events/Devtools surfaces exist and their overhead
-->

- **NFR-001**: 新增入口 MUST 遵守 Strict by Default：跨模块解析基于显式 Scope/imports；不得新增或依赖进程级全局 registry fallback。若存在 `mode:"global"` 等显式全局语义，默认必须为 strict，且 global 行为必须可诊断（包含 mode/来源范围等最小字段）。
- **NFR-002**: 新增入口 MUST 具有可诊断性：当启动/装配/运行/释放失败时，能提供结构化信息帮助定位“缺失提供者/错误装配 vs 主流程失败 vs 释放超时”，并提供退出策略相关提示字段（便于判断退出策略配置/表达是否合理）。
- **NFR-003**: 新增入口的诊断信息 MUST 复用稳定标识（至少可关联 `moduleId + instanceId`，并与既有 txn/op 等可确定重建的序列兼容），禁止默认随机/时间作为 identity 锚点。若在 Trial Run / RunSession 中导出证据，输出 MUST 额外携带可注入的 `runId`，且 `runId` 与 `instanceId` 必须分离（不得默认混用）。
- **NFR-004**: 新增入口 MUST 不改变既有事务边界约束：事务窗口内无 IO/async；入口自身不应引入越界写入通道。
- **NFR-005**: 本特性 MUST 更新用户文档与 SSoT：用不超过 5 个关键词解释心智模型（“启动/退出/释放/显式条件/作用域”），并说明常驻逻辑为何不会自动退出。
- **NFR-006**: 与 `@logix/test` 共享 runner 语义时，复用点 MUST 是 `@logix/core` 的 `Runtime.openProgram/runProgram`（或其内部实现），测试库不得复制 boot/释放 逻辑。若确需共享更深的内部协作协议（例如 Trial Run 的证据导出、可控时钟/trace 注入点），这些协作点 MUST 以可注入契约（Tag/Layer）表达，并支持按实例 Scope 隔离与 Mock。
- **NFR-007**: 本特性 MUST 提供可复跑的“启动耗时”基线与证据落点（manual vs new API），并以 ≤5% 预算进行对比校验（证据可被 CI/人工复现）。

### Assumptions & Scope Boundaries

- 允许并鼓励对 `@logix/test` 的早期设定做破坏性调整：直接删除旧的 `TestProgram/Scenario` 生命周期模型，统一复用 `@logix/core` 的 `Runtime.openProgram/runProgram` 内核；仓库内调用点同步更新，不提供兼容层（要点记入 `handoff.md`）。
- 本特性不试图“自动推断退出时机”；退出策略由调用方显式提供（通过主流程结束、外部信号或观测条件）。
- 与 025 的边界：025 的 Trial Run 不执行 024 的 `main`；Trial Run 仅复用 `openProgram/boot` 启动与 scope 收束，负责在受控窗口内提取 IR/证据并可靠释放资源。
- 与 025 的超时口径：025 Trial Run 的试跑窗口超时（TrialRunTimeout）与 scope 释放收束超时（DisposeTimeout / `closeScopeTimeout`）是两类独立失败；释放收束超时语义复用 024 的 DisposeTimeout。
- 与 025 的缺失依赖策略：Trial Run 若检测到缺失依赖（Service/Config），必须 hard fail，并在失败载荷中携带缺失清单与最小上下文字段（便于 CI/平台给出行动建议）。
- 与 025 的启动范围：Trial Run 复用 024 的 `openProgram/boot` full boot 语义（包含 logics/processes 启动）；不执行脚本级 `main`；以 `trialRunTimeoutMs + closeScopeTimeout` 受控收束并输出可解释分类。
- 依赖：现有的“模块句柄扩展”（例如 controller）在不同宿主下需要保持一致的可用性与语义。

## Success Criteria _(mandatory)_

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 在仓库内用标准入口运行一个“包含常驻逻辑”的根模块 demo，不需要额外手写保活机制，且主流程在退出条件满足后能正常结束。
- **SC-002**: 主流程成功/失败两种情况下，运行资源都能被释放；主流程结束后在 `closeScopeTimeout`（默认 1 秒）内完成释放，不再需要额外保活即可自然退出（无资源泄漏导致的悬挂）。
- **SC-003**: 同一根模块在 demo/脚本入口与测试入口下运行，其关键可观测行为（状态变化/事件顺序）保持一致。
- **SC-004**: 测试库与核心入口不再存在两套相互冲突的生命周期语义；仓库内所有用例/示例已迁移到新模型（不提供兼容层）。
- **SC-005**: 新增入口不会引入可观测的运行时性能回退（相对同等工作负载，额外启动耗时不超过 5%）。
- **SC-006**: 当启动/装配/运行失败时，调用方可以从失败信息中明确定位到“装配错误 vs 主流程错误”，并能从提示字段中判断是否涉及退出策略问题。
- **SC-007**: 同一进程内并行运行两个根模块实例，状态/事件时间线互不串扰，且两者均能独立释放并自然退出。
- **SC-008**: 当 finalizer 卡住导致释放超过 `closeScopeTimeout` 时，入口能在超时后以 DisposeTimeout 失败并提供可序列化的可行动提示（包含 `timeoutMs/elapsedMs/moduleId/instanceId` 等最小字段），并通过 `RuntimeOptions.onError` 发出告警；此类失败被视为“可解释的无法自然退出”。
- **SC-009**: 在 Node/CLI 场景按下 Ctrl+C（SIGINT）时，runner 能触发 graceful shutdown：资源释放逻辑可执行（finalizer 有机会运行），并在 `closeScopeTimeout` 约束下可解释地结束（成功释放或 DisposeTimeout）。
- **SC-010**: 在 CLI mode 启用结构化退出码时：`main` 返回 `void` 可映射到 `process.exitCode=0`，返回 `number` 可映射到对应 exit code；失败路径可稳定映射为非 0，并与错误分类/提示字段一致。
